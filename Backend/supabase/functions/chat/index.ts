// [chat] 프론트엔드 채팅 화면이 메시지를 보낼 때 부르는 단일 엔드포인트.
// LLM으로 메시지를 분석해(analysis.ts가 검증) 학습 기록은 study_logs와 report_progress로, 순공시간은 record_study_time으로,
// 잘 맞은 방법은 study_tips로 저장하고 코치 말투로 답한다. 질문 답변에는 필요한 공부법(study_methods)과 잘 맞은 방법을 넣는다. 사용법·교재 추가·순공시간만·하루 상한은 답변 호출 없이 정해진 문구로 답한다. 계획은 다시 나누지 않는다.
// 응답 형식은 Frontend/src/interfaces/chat.ts의 `ChatRequest`/`ChatResponse`를 따른다.

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  BOOK_ADD_PENDING,
  DAILY_LIMIT_REPLY,
  DAILY_MESSAGE_LIMIT,
  STUDY_TIME_ASK,
  USAGE_GUIDE,
} from "../_shared/coach.ts";
import { studyTimeDate, toDateKey } from "../_shared/date.ts";
import type { Analysis, BookRef, StudyTip } from "./analysis.ts";
import type { CoachContext } from "./context.ts";
import {
  countTodayUserMessages,
  insertMessage,
  insertStudyTip,
  loadCoachContext,
  loadKnowledge,
  loadProfileAndBooks,
  loadTodayHistory,
  recordStudyLogs,
  saveStudyTime,
} from "./db.ts";
import { formatKnowledge, knowledgeTopics, loadsTips } from "./knowledge.ts";
import { analyzeMessage, generateReply } from "./llm.ts";
import {
  fallbackReply,
  type RecordedLog,
  savedStudyTimeLabel,
  studyTimeReply,
  tipSavedReply,
} from "./reply.ts";

const MAX_CONTENT_LENGTH = 1000;

export default {
  // 사용자 JWT 필수. ctx.supabase는 RLS가 적용되어 본인 데이터만 다룬다
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    const content = await readContent(req);
    if (content === null) {
      return Response.json({ error: "invalid_content" }, { status: 400 });
    }
    const userId = ctx.userClaims?.id;
    if (!userId) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }

    try {
      return await handleMessage(ctx.supabase, userId, content);
    } catch (e) {
      // DB 오류 원문은 로그에만 남기고 응답에는 고정 코드만 보낸다
      console.error(JSON.stringify({ call: "handle", error: String(e) }));
      return errorResponse("server_error");
    }
  }),
};

async function readContent(req: Request): Promise<string | null> {
  try {
    const body = await req.json();
    if (typeof body?.content !== "string") return null;
    const content = body.content.trim();
    return content.length > 0 && content.length <= MAX_CONTENT_LENGTH
      ? content
      : null;
  } catch {
    return null;
  }
}

async function handleMessage(
  sb: SupabaseClient,
  userId: string,
  content: string,
): Promise<Response> {
  const { profile, books } = await loadProfileAndBooks(sb);
  const now = new Date();
  const timezone = profile.timezone;
  const today = toDateKey(now, timezone);

  // 하루 상한을 넘으면 GPT를 부르지 않는다
  const sentToday = await countTodayUserMessages(sb, today, timezone);
  if (sentToday >= DAILY_MESSAGE_LIMIT) {
    const user = await insertMessage(sb, userId, "user", content, null);
    const assistant = await insertMessage(
      sb,
      userId,
      "assistant",
      DAILY_LIMIT_REPLY,
      null,
    );
    return Response.json({ messages: [user, assistant], logged: false });
  }

  // 분석이 실패하면 아무것도 저장하지 않는다
  let analysis: Analysis;
  try {
    analysis = await analyzeMessage(content, books, today);
  } catch (e) {
    console.error(JSON.stringify({ call: "analyze", error: String(e) }));
    return Response.json({ error: "analysis_failed" }, { status: 502 });
  }

  const user = await insertMessage(
    sb,
    userId,
    "user",
    content,
    analysis.subject,
  );

  // 분석이 남긴 entry는 의도와 상관없이 학습 기록이다
  const recorded = analysis.entries.length > 0
    ? await recordStudyLogs(
      sb,
      userId,
      today,
      user.id,
      analysis.entries,
      books,
    )
    : [];

  let savedTime: { total: number; date: string } | null = null;
  let studyTimeInvalid = analysis.studyTimeInvalid;
  if (analysis.studyTime) {
    const date = studyTimeDate(now, timezone, analysis.studyTime.day);
    const total = await saveStudyTime(sb, date, analysis.studyTime);
    if (total === null) studyTimeInvalid = true;
    else savedTime = { total, date };
  }

  // 잘 맞은 방법도 의도와 상관없이 저장한다. 실패하거나 이미 있으면 답변에서 적어 뒀다고 하지 않는다
  let savedTip: StudyTip | null = null;
  if (analysis.studyTip) {
    try {
      if (await insertStudyTip(sb, userId, analysis.studyTip, user.id)) {
        savedTip = analysis.studyTip;
      }
    } catch (e) {
      console.error(JSON.stringify({ call: "tip", error: String(e) }));
    }
  }

  let reply = await buildReply({
    sb,
    content,
    analysis,
    recorded,
    savedTime,
    studyTimeInvalid,
    savedTip,
    today,
    timezone,
    examDate: profile.exam_date,
    books,
    userMessageId: user.id,
  });
  if (recorded.length > 0 && studyTimeInvalid) {
    reply = `${reply}\n${STUDY_TIME_ASK}`;
  }

  const assistant = await insertMessage(
    sb,
    userId,
    "assistant",
    reply,
    analysis.subject,
  );
  return Response.json({
    messages: [user, assistant],
    logged: recorded.length > 0,
  });
}

async function buildReply(p: {
  sb: SupabaseClient;
  content: string;
  analysis: Analysis;
  recorded: RecordedLog[];
  savedTime: { total: number; date: string } | null;
  studyTimeInvalid: boolean;
  savedTip: StudyTip | null;
  today: string;
  timezone: string;
  examDate: string | null;
  books: BookRef[];
  userMessageId: string;
}): Promise<string> {
  const { intent, subject, knowledge } = p.analysis;
  const hasLogs = p.recorded.length > 0;
  // 정해진 문구로 답할 때도 이번에 저장한 잘 맞은 방법은 알린다
  const fixed = (text: string) =>
    p.savedTip ? `${text}\n${tipSavedReply(p.savedTip.subject)}` : text;

  // 순공시간을 저장하지 못한 메시지는 의도보다 먼저 다시 묻는다(기록이 있으면 답 끝에 붙인다)
  if (!hasLogs && p.studyTimeInvalid) return fixed(STUDY_TIME_ASK);
  if (intent === "usage") return fixed(USAGE_GUIDE);
  if (intent === "book_add") return fixed(BOOK_ADD_PENDING);
  if (!hasLogs && intent === "study_time" && p.savedTime) {
    return fixed(
      studyTimeReply(p.savedTime.total, p.savedTime.date, p.today),
    );
  }
  // 순공시간과 함께 보낸 학습 기록은 학습 기록 답변으로
  const replyIntent = hasLogs && intent === "study_time" ? "study_log" : intent;

  // 저장은 끝났으므로 현황 조회나 답변 호출이 실패해도 500 대신 대체 답변을 돌려준다.
  // 조회가 실패하면 처음에 읽은 교재만으로 대체 답변을 만든다
  let ctx: CoachContext = {
    today: p.today,
    examDate: p.examDate,
    books: p.books,
    todayTasks: [],
    recentLogs: [],
    mockExams: [],
  };
  try {
    const [loaded, history, known] = await Promise.all([
      loadCoachContext(p.sb, p.today, p.examDate),
      loadTodayHistory(p.sb, p.today, p.timezone, p.userMessageId),
      // 공부법을 읽지 못하면 지식 없이 답한다(대체 답변으로 가지 않는다)
      loadKnowledge(
        p.sb,
        knowledgeTopics(replyIntent, subject, knowledge),
        subject,
        loadsTips(replyIntent),
      ).catch((e) => {
        console.error(JSON.stringify({ call: "knowledge", error: String(e) }));
        return { sections: [], tips: [] };
      }),
    ]);
    ctx = loaded;
    return await generateReply({
      content: p.content,
      intent: replyIntent,
      ctx,
      history,
      knowledge: formatKnowledge(known.sections, known.tips),
      options: {
        savedStudyTime: p.savedTime
          ? savedStudyTimeLabel(p.savedTime.total, p.savedTime.date, p.today)
          : null,
        hasKnowledge: known.sections.length > 0,
        hasTips: known.tips.length > 0,
        hardTimes: knowledge.includes("mental"),
        savedTip: p.savedTip,
      },
    });
  } catch (e) {
    console.error(JSON.stringify({ call: "reply", error: String(e) }));
    return fallbackReply(p.recorded, ctx, p.savedTime, p.savedTip);
  }
}

function errorResponse(message: string): Response {
  return Response.json({ error: message }, { status: 500 });
}

/* 호출 (로그인한 사용자의 access token 필요):

  curl -i --location --request POST 'https://<project-ref>.supabase.co/functions/v1/chat' \
    --header 'Authorization: Bearer <access_token>' \
    --data '{"content":"보건행정 기본서 15~17강, 기출 20문제 중 5개 틀림"}'

*/
