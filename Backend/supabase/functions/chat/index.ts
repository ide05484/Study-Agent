// [chat] 프론트엔드 채팅 화면이 메시지를 보낼 때 부르는 단일 엔드포인트.
// LLM으로 메시지를 분석해(analysis.ts가 검증) 학습 기록은 study_logs와 report_progress로, 순공시간은 record_study_time으로,
// 잘 맞은 방법은 study_tips로 저장하고 코치 말투로 답한다.
// 질문 답변에는 필요한 공부법(study_methods)과 잘 맞은 방법을 넣는다.
// 사용법·순공시간만·하루 상한은 답변 호출 없이 정해진 문구로 답한다. 학습 기록으로는 계획을 다시 나누지 않는다.
// 교재 추가는 정해진 문구로 되묻고 확인 칩(응/아니)을 받은 뒤에만 books에 저장하며, 저장하면 바로 계획을 다시 나눈다(_shared/replan.ts).
// 답을 기다리는 동안 연달아 보낸 글은 처리 안 한 메시지로 묶어 한 번에 분석하고, 더 새 글이 온 요청은 저장·답변 없이 끝낸다(superseded).
// 응답 형식은 Frontend/src/interfaces/chat.ts의 `ChatRequest`/`ChatResponse`를 따른다.

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DAILY_LIMIT_REPLY,
  DAILY_MESSAGE_LIMIT,
  STUDY_TIME_ASK,
  USAGE_GUIDE,
} from "../_shared/coach.ts";
import { addDays, studyTimeDate, toDateKey } from "../_shared/date.ts";
import { replan, type ReplanResult } from "../_shared/replan.ts";
import type { ChatAction } from "./actions.ts";
import type { Analysis, BookRef, StudyTip } from "./analysis.ts";
import type { AskedAbout } from "./analysisPrompt.ts";
import {
  askText,
  type BookAddAction,
  CHOICE_EXPIRED_TEXT,
  completeDraft,
  confirmAnswer,
  confirmText,
  EDIT_TEXT,
  EMPTY_DRAFT,
  isDuplicateTitle,
  mergeDraft,
  missingFields,
  savedText,
  type SaveOutcome,
} from "./bookDraft.ts";
import type { CoachContext } from "./context.ts";
import {
  type ChatMessageRow,
  claimUserMessages,
  countTodayUserMessages,
  discardUserMessage,
  hasMissedTasks,
  insertBook,
  insertFirstMessage,
  insertMessage,
  insertStudyTip,
  loadCoachContext,
  loadKnowledge,
  loadLastCoachMessage,
  loadProfileAndBooks,
  loadRecentMessages,
  loadTodayHistory,
  loadTodayTasks,
  loadUnhandledUserMessages,
  recordStudyLogs,
  saveStudyTime,
  setMessageSubject,
} from "./db.ts";
import {
  formatKnowledge,
  knowledgeTopics,
  loadsTips,
  withoutSavedTip,
} from "./knowledge.ts";
import { analyzeMessage, generateReply } from "./llm.ts";
import { type ChatRequest, parseChatRequest } from "./request.ts";
import { welcomeText } from "./welcome.ts";
import {
  fallbackReply,
  type RecordedLog,
  savedStudyTimeLabel,
  studyTimeReply,
  tipSavedReply,
} from "./reply.ts";

const MAX_CONTENT_LENGTH = 1000;

// 코치 답변과 붙일 동작(칩). action이 있으면 받아 둔 초안이 다음 요청으로 이어진다
interface Reply {
  text: string;
  action: ChatAction | null;
}

export default {
  // 사용자 JWT 필수. ctx.supabase는 RLS가 적용되어 본인 데이터만 다룬다
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    const request = await readRequest(req);
    if (request === null) {
      return Response.json({ error: "invalid_content" }, { status: 400 });
    }
    const userId = ctx.userClaims?.id;
    if (!userId) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }

    try {
      if ("open" in request) return await handleOpen(ctx.supabase);
      return await handleMessage(ctx.supabase, userId, request);
    } catch (e) {
      // DB 오류 원문은 로그에만 남기고 응답에는 고정 코드만 보낸다
      console.error(JSON.stringify({ call: "handle", error: String(e) }));
      return errorResponse("server_error");
    }
  }),
};

async function readRequest(req: Request): Promise<ChatRequest | null> {
  try {
    return parseChatRequest(await req.json(), MAX_CONTENT_LENGTH);
  } catch {
    return null;
  }
}

// 채팅 화면을 열 때 하루 첫 메시지를 넣는다. 하루 상한을 보지 않고 GPT를 부르지 않는다
async function handleOpen(sb: SupabaseClient): Promise<Response> {
  const { profile } = await loadProfileAndBooks(sb);
  const timezone = profile.timezone;
  const today = toDateKey(new Date(), timezone);

  // 오늘 메시지가 이미 있으면 아무것도 하지 않는다
  const [existing] = await loadRecentMessages(sb, today, timezone, 1);
  if (existing) return Response.json(openResult([]));

  // 화면 useCarryOver와 같은 이월 조건. 실패해도 지금 계획으로 첫 메시지를 저장한다
  let planChanged = false;
  let replanFailed = false;
  const examDate = profile.exam_date;
  if (
    examDate !== null && addDays(examDate, -1) >= today &&
    await hasMissedTasks(sb, today)
  ) {
    try {
      await replan(sb);
      planChanged = true;
    } catch (e) {
      console.error(JSON.stringify({ call: "open_replan", error: String(e) }));
      replanFailed = true;
    }
  }

  const tasks = await loadTodayTasks(sb, today);
  const { text, action } = welcomeText({ today, examDate, tasks });
  // 그사이 다른 요청이 먼저 넣었으면 null이다
  const row = await insertFirstMessage(sb, today, timezone, text, action);
  return Response.json(
    openResult(row ? [row] : [], { planChanged, replanFailed }),
  );
}

function openResult(
  messages: ChatMessageRow[],
  flags: { planChanged: boolean; replanFailed: boolean } = {
    planChanged: false,
    replanFailed: false,
  },
) {
  return { messages, logged: false, ...flags, superseded: false };
}

async function handleMessage(
  sb: SupabaseClient,
  userId: string,
  request: Exclude<ChatRequest, { open: true }>,
): Promise<Response> {
  const { profile, books } = await loadProfileAndBooks(sb);
  const now = new Date();
  const timezone = profile.timezone;
  const today = toDateKey(now, timezone);

  // 칩·확답 글은 오늘의 마지막 메시지(사용자·코치 무관)가 확인 메시지일 때만 처리한다.
  // 글 분석에 넘길 받아 둔 초안과 직전 질문은 마지막 코치 메시지에서 읽는다(그 뒤에 처리 안 한 사용자 메시지가 있어도 이어진다).
  // 하루 상한 확인용 개수도 함께 읽는다(칩·확답 경로에서는 쓰지 않는다)
  const [[last = null], sentToday, lastCoach] = await Promise.all([
    loadRecentMessages(sb, today, timezone, 1),
    countTodayUserMessages(sb, today, timezone),
    loadLastCoachMessage(sb, today, timezone),
  ]);
  const pending: BookAddAction | null =
    last?.role === "assistant" && last.action?.kind === "book_add"
      ? last.action
      : null;

  // 확인 칩 요청, 또는 확인 단계에서 확답 목록의 말로 보낸 글은 분석 없이 처리한다(하루 상한도 보지 않는다)
  const confirm = (answer: "yes" | "no", userText: string, valid: boolean) =>
    answerConfirm({
      sb,
      userId,
      today,
      timezone,
      last,
      pending: valid ? pending : null,
      answer,
      userText,
    });

  if ("choice" in request) {
    const { choice } = request;
    return await confirm(
      choice.answer,
      choice.answer === "yes" ? "응" : "아니",
      pending?.step === "confirm" && last?.id === choice.message_id,
    );
  }
  const content = request.content;
  if (pending?.step === "confirm") {
    const answer = confirmAnswer(content);
    if (answer !== null) return await confirm(answer, content, true);
  }

  // 하루 상한을 넘으면 GPT를 부르지 않는다. 이 메시지는 처리한 것으로 넣어 묶음에 섞이지 않게 한다
  if (sentToday >= DAILY_MESSAGE_LIMIT) {
    const user = await insertMessage(
      sb,
      userId,
      "user",
      content,
      null,
      null,
      true,
    );
    const assistant = await insertMessage(
      sb,
      userId,
      "assistant",
      DAILY_LIMIT_REPLY,
      null,
    );
    return Response.json({
      messages: [user, assistant],
      logged: false,
      planChanged: false,
      replanFailed: false,
      superseded: false,
    });
  }

  // 사용자 메시지를 먼저 저장하고(과목은 분석 뒤에 채운다), 앞서 보내 아직 처리 안 한 메시지와 묶어 분석한다
  const inserted = await insertMessage(sb, userId, "user", content, null);
  // 여기부터 claim 결과가 나오기 전까지 실패하면 failBeforeClaim이 이 메시지를 지울지 남길지 정한다
  const failBefore = (failure: Response) =>
    failBeforeClaim(sb, inserted, today, timezone, failure);

  let bundle: { id: string; content: string }[];
  try {
    const unhandled = await loadUnhandledUserMessages(sb, today, timezone);
    // 이 메시지 뒤에 온 글은 그 요청이 묶는다. 자정을 넘겨 저장돼 오늘 범위에 없으면 이 메시지만 분석한다
    const end = unhandled.findIndex((m) => m.id === inserted.id);
    bundle = end < 0
      ? [{ id: inserted.id, content }]
      : unhandled.slice(0, end + 1);
  } catch (e) {
    console.error(JSON.stringify({ call: "load_bundle", error: String(e) }));
    return await failBefore(errorResponse("server_error"));
  }

  const coachAction = lastCoach?.action ?? null;
  const held: BookAddAction | null = coachAction?.kind === "book_add"
    ? coachAction
    : null;
  const asked: AskedAbout = coachAction?.kind === "study_time_ask"
    ? "study_time"
    : coachAction?.kind === "time_available_ask"
    ? "time_available"
    : null;

  let analysis: Analysis;
  try {
    analysis = await analyzeMessage(
      bundle.map((m) => m.content),
      books,
      today,
      held?.draft ?? null,
      asked,
    );
  } catch (e) {
    console.error(JSON.stringify({ call: "analyze", error: String(e) }));
    return await failBefore(
      Response.json({ error: "analysis_failed" }, { status: 502 }),
    );
  }

  let claimed: boolean;
  try {
    claimed = await claimUserMessages(sb, inserted.id, today, timezone);
  } catch (e) {
    console.error(JSON.stringify({ call: "claim", error: String(e) }));
    return await failBefore(errorResponse("server_error"));
  }
  // 분석하는 동안 더 새 글이 왔으면 그 요청이 이 메시지까지 묶어 답한다. 여기서는 아무것도 저장하지 않는다
  if (!claimed) return Response.json(supersededResult(inserted));

  // 처리 표시를 했으면 답변까지 끝까지 간다(다시 확인하지 않는다)
  await setMessageSubject(sb, inserted.id, analysis.subject);
  const user: ChatMessageRow = { ...inserted, subject: analysis.subject };

  // 분석이 남긴 entry는 의도와 상관없이 학습 기록이다. 출처는 묶음의 마지막(이 메시지)이다
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

  const reply = await buildReply({
    sb,
    content: bundle.map((m) => m.content).join("\n"),
    analysis,
    recorded,
    savedTime,
    studyTimeInvalid,
    savedTip,
    today,
    timezone,
    examDate: profile.exam_date,
    books,
    bundleIds: bundle.map((m) => m.id),
    pending: held,
  });
  if (recorded.length > 0 && studyTimeInvalid) {
    reply.text = `${reply.text}\n${STUDY_TIME_ASK}`;
  }

  const assistant = await insertMessage(
    sb,
    userId,
    "assistant",
    reply.text,
    analysis.subject,
    reply.action,
  );
  return Response.json({
    messages: [user, assistant],
    logged: recorded.length > 0,
    planChanged: false,
    replanFailed: false,
    superseded: false,
  });
}

// 더 새 요청이 묶어 답하는 요청. 저장한 사용자 메시지만 돌려준다
function supersededResult(user: ChatMessageRow) {
  return {
    messages: [user],
    logged: false,
    planChanged: false,
    replanFailed: false,
    superseded: true,
  };
}

// 사용자 메시지를 저장한 뒤 claim 결과가 나오기 전에 실패했을 때.
// 더 새 처리 안 한 글이 없으면 이 메시지를 지우고 원래 오류를 돌려준다(화면이 입력 글을 되돌려 다시 보낸다).
// 더 새 글이 있거나 이미 처리됐으면 그 요청이 이 메시지까지 묶어 처리하므로 남기고 밀림으로 끝낸다
// (지우고 다시 보내게 하면 같은 기록이 두 번 저장된다). 정리 자체가 실패하면 로그만 남기고 원래 오류를 돌려준다
async function failBeforeClaim(
  sb: SupabaseClient,
  inserted: ChatMessageRow,
  today: string,
  timezone: string,
  failure: Response,
): Promise<Response> {
  try {
    if (!await discardUserMessage(sb, inserted.id, today, timezone)) {
      return Response.json(supersededResult(inserted));
    }
  } catch (e) {
    console.error(JSON.stringify({ call: "discard", error: String(e) }));
  }
  return failure;
}

// 확인 칩(또는 같은 뜻의 글)을 처리한다. GPT를 부르지 않는다.
// 이 경로의 사용자 메시지는 처리한 것으로 넣어 묶음에 섞이지 않게 한다.
// pending은 칩이 유효하고 확인 단계일 때만 값이 있다
async function answerConfirm(p: {
  sb: SupabaseClient;
  userId: string;
  today: string;
  timezone: string;
  last: ChatMessageRow | null;
  pending: BookAddAction | null;
  answer: "yes" | "no";
  userText: string;
}): Promise<Response> {
  const { sb, userId, pending } = p;
  const user = await insertMessage(
    sb,
    userId,
    "user",
    p.userText,
    pending?.draft.subject ?? null,
    null,
    true,
  );

  // 같은 칩을 거의 동시에 두 번 보내도 한쪽만 통하게, 방금 넣은 메시지 바로 앞이 확인 메시지인지 다시 본다
  const complete = pending ? completeDraft(pending.draft) : null;
  const [first, second] = await loadRecentMessages(sb, p.today, p.timezone, 2);
  const fresh = pending !== null && p.last !== null && first?.id === user.id &&
    second?.id === p.last.id;

  let text = CHOICE_EXPIRED_TEXT;
  let action: ChatAction | null = null;
  let planChanged = false;
  let replanFailed = false;

  if (fresh && pending && complete) {
    if (p.answer === "no") {
      text = EDIT_TEXT;
      action = { kind: "book_add", step: "edit", draft: pending.draft };
    } else {
      const book = await insertBook(sb, userId, complete);
      // 교재는 남기고 재분배 실패는 화면이 다시 시도하게 알린다
      let result: ReplanResult | null = null;
      try {
        result = await replan(sb);
      } catch (e) {
        console.error(JSON.stringify({ call: "replan", error: String(e) }));
      }
      let outcome: SaveOutcome;
      if (!result) {
        outcome = { kind: "failed" };
        replanFailed = true;
      } else if (result.skipped) {
        outcome = result.skipped === "exam_passed"
          ? { kind: "exam_passed" }
          : { kind: "no_exam" };
        planChanged = true;
      } else {
        const line = result.tasks.find((t) =>
          t.book_id === book.id && t.task_date === p.today
        );
        outcome = {
          kind: "planned",
          today: line
            ? { start_unit: line.start_unit, end_unit: line.end_unit }
            : null,
        };
        planChanged = true;
      }
      text = savedText(complete, outcome);
    }
  }

  const assistant = await insertMessage(
    sb,
    userId,
    "assistant",
    text,
    null,
    action,
  );
  return Response.json({
    messages: [user, assistant],
    logged: false,
    planChanged,
    replanFailed,
    superseded: false,
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
  // 이번에 답하는 묶음의 메시지 id. 대화 이력에서 뺀다(content에 이미 들어 있다)
  bundleIds: string[];
  pending: BookAddAction | null;
}): Promise<Reply> {
  const { intent, subject, knowledge } = p.analysis;
  const hasLogs = p.recorded.length > 0;
  // 정해진 문구로 답할 때도 이번에 저장한 잘 맞은 방법은 알린다
  const fixed = (text: string, action: ChatAction | null = null): Reply => ({
    text: p.savedTip ? `${text}\n${tipSavedReply(p.savedTip.subject)}` : text,
    action,
  });

  // 순공시간을 저장하지 못한 메시지는 의도보다 먼저 다시 묻는다(기록이 있으면 답 끝에 붙인다)
  if (!hasLogs && p.studyTimeInvalid) return fixed(STUDY_TIME_ASK);
  if (intent === "usage") return fixed(USAGE_GUIDE);
  if (intent === "book_add") {
    // 받아 둔 초안에 이번 말을 합치고, 빠진 게 있으면 묻고 다 있으면 확인 칩을 띄운다
    const draft = mergeDraft(p.pending?.draft ?? EMPTY_DRAFT, p.analysis.book);
    const missing = missingFields(draft);
    const complete = missing.length === 0 ? completeDraft(draft) : null;
    if (!complete) {
      return fixed(askText(draft, missing), {
        kind: "book_add",
        step: "ask",
        draft,
      });
    }
    return fixed(confirmText(complete, isDuplicateTitle(complete, p.books)), {
      kind: "book_add",
      step: "confirm",
      draft,
    });
  }
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
      loadTodayHistory(p.sb, p.today, p.timezone, p.bundleIds),
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
    const tips = withoutSavedTip(known.tips, p.savedTip);
    const text = await generateReply({
      content: p.content,
      intent: replyIntent,
      ctx,
      history,
      knowledge: formatKnowledge(known.sections, tips),
      options: {
        savedStudyTime: p.savedTime
          ? savedStudyTimeLabel(p.savedTime.total, p.savedTime.date, p.today)
          : null,
        hasKnowledge: known.sections.length > 0,
        hasTips: tips.length > 0,
        hardTimes: knowledge.includes("mental"),
        savedTip: p.savedTip,
        closingQuestion: false,
      },
    });
    return { text, action: null };
  } catch (e) {
    console.error(JSON.stringify({ call: "reply", error: String(e) }));
    return {
      text: fallbackReply(p.recorded, ctx, p.savedTime, p.savedTip),
      action: null,
    };
  }
}

function errorResponse(message: string): Response {
  return Response.json({ error: message }, { status: 500 });
}

/* 호출 (로그인한 사용자의 access token 필요):

  curl -i --location --request POST 'https://<project-ref>.supabase.co/functions/v1/chat' \
    --header 'Authorization: Bearer <access_token>' \
    --data '{"content":"보건행정 기본서 15~17강, 기출 20문제 중 5개 틀림"}'

  확인 칩: --data '{"choice":{"message_id":"<확인 메시지 id>","answer":"yes"}}'

*/
