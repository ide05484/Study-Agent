// chat의 DB 읽기·쓰기. 모두 사용자 클라이언트(RLS)로 하고, 실패하면 Error를 던진다(index.ts가 500으로 바꾼다).
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, dayStartUtc } from "../_shared/date.ts";
import type { Subject } from "../_shared/subjects.ts";
import type { BookUnit } from "../_shared/units.ts";
import type { MethodTopic } from "../_shared/methods.ts";
import type {
  BookRef,
  StudyEntry,
  StudyTimeReport,
  StudyTip,
} from "./analysis.ts";
import { type ChatAction, parseAction } from "./actions.ts";
import type { CompleteDraft } from "./bookDraft.ts";
import type {
  CoachContext,
  HistoryMessage,
  TaskStatus,
  TodayTaskLine,
} from "./context.ts";
import { type KnowledgeSection, TIP_LIMIT } from "./knowledge.ts";
import { advance, resolvePosition } from "./progress.ts";
import type { RecordedLog } from "./reply.ts";

type Client = SupabaseClient;

const RECENT_LOG_DAYS = 7;
const RECENT_LOG_LIMIT = 10;
const MOCK_EXAM_LIMIT = 3;
// record_study_time이 범위 밖 순공시간에 내는 SQLSTATE
const INVALID_PARAMETER = "22023";
// study_tips에 같은 사용자·과목·내용이 이미 있을 때의 SQLSTATE
const UNIQUE_VIOLATION = "23505";

// Frontend interfaces/chat.ts의 ChatMessage와 같은 모양
export interface ChatMessageRow {
  id: string;
  role: "user" | "assistant";
  content: string;
  subject: Subject | null;
  created_at: string;
  action: ChatAction | null;
}

interface ProfileRow {
  exam_date: string | null;
  timezone: string;
}

interface TaskRow {
  round: number;
  start_unit: number;
  end_unit: number;
  status: TaskStatus;
  books: {
    subject: Subject;
    title: string;
    unit: BookUnit;
    target_rounds: number;
  } | null;
}

interface LogRow {
  study_date: string;
  subject: Subject;
  start_unit: number | null;
  end_unit: number | null;
  questions_solved: number | null;
  questions_wrong: number | null;
  books: { title: string; unit: BookUnit } | null;
}

interface MockExamRow {
  name: string;
  taken_on: string;
  mock_exam_scores: { subject: Subject; score: number }[];
}

const BOOK_COLUMNS =
  "id, subject, title, unit, total_units, current_round, current_unit, target_rounds";
const MESSAGE_COLUMNS = "id, role, content, subject, created_at, action";

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export async function loadProfileAndBooks(
  sb: Client,
): Promise<{ profile: ProfileRow; books: BookRef[] }> {
  const [profileResult, booksResult] = await Promise.all([
    sb.from("profiles").select("exam_date, timezone").single(),
    sb.from("books").select(BOOK_COLUMNS).order("created_at"),
  ]);
  fail(profileResult.error);
  fail(booksResult.error);
  return {
    profile: profileResult.data as ProfileRow,
    books: booksResult.data as BookRef[],
  };
}

// 사용자 시간대로 오늘 보낸 사용자 메시지 수
export async function countTodayUserMessages(
  sb: Client,
  today: string,
  timezone: string,
): Promise<number> {
  const { count, error } = await sb
    .from("chat_messages")
    .select("id", { count: "exact", head: true })
    .eq("role", "user")
    .gte("created_at", dayStartUtc(today, timezone))
    .lt("created_at", dayStartUtc(addDays(today, 1), timezone));
  fail(error);
  return count ?? 0;
}

export async function insertMessage(
  sb: Client,
  userId: string,
  role: "user" | "assistant",
  content: string,
  subject: Subject | null,
  action: ChatAction | null = null,
  handled = false,
): Promise<ChatMessageRow> {
  const { data, error } = await sb
    .from("chat_messages")
    .insert({
      user_id: userId,
      role,
      content,
      subject,
      action,
      ...(handled && role === "user"
        ? { handled_at: new Date().toISOString() }
        : {}),
    })
    .select(MESSAGE_COLUMNS)
    .single();
  fail(error);
  return toMessageRow(data);
}

// 오늘 분량 줄(교재 조인). 교재가 없는 행은 뺀다
export async function loadTodayTasks(
  sb: Client,
  today: string,
): Promise<TodayTaskLine[]> {
  const { data, error } = await sb
    .from("daily_tasks")
    .select(
      "round, start_unit, end_unit, status, books(subject, title, unit, target_rounds)",
    )
    .eq("task_date", today)
    .order("created_at");
  fail(error);
  return toTodayTasks(data as unknown as TaskRow[]);
}

function toTodayTasks(rows: TaskRow[]): TodayTaskLine[] {
  // 조인 결과 타입이 추론되지 않아 행 모양을 적어 둔다
  return rows.flatMap((t) =>
    t.books
      ? [{
        subject: t.books.subject,
        title: t.books.title,
        unit: t.books.unit,
        target_rounds: t.books.target_rounds,
        round: t.round,
        start_unit: t.start_unit,
        end_unit: t.end_unit,
        status: t.status,
      }]
      : []
  );
}

// DB jsonb는 믿지 않고 action을 다시 검증해 읽는다
function toMessageRow(data: unknown): ChatMessageRow {
  const row = data as ChatMessageRow;
  return { ...row, action: parseAction(row.action) };
}

// 오늘 채팅방의 최근 메시지(최신순)
export async function loadRecentMessages(
  sb: Client,
  today: string,
  timezone: string,
  limit: number,
): Promise<ChatMessageRow[]> {
  const { data, error } = await sb
    .from("chat_messages")
    .select(MESSAGE_COLUMNS)
    .gte("created_at", dayStartUtc(today, timezone))
    .lt("created_at", dayStartUtc(addDays(today, 1), timezone))
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  fail(error);
  return (data as unknown[]).map(toMessageRow);
}

// 한 메시지의 action(끝난 칩의 종류를 알 때 쓴다). 없거나 못 찾으면 null
export async function loadMessageAction(
  sb: Client,
  id: string,
): Promise<ChatAction | null> {
  const { data, error } = await sb
    .from("chat_messages")
    .select("action")
    .eq("id", id)
    .maybeSingle();
  fail(error);
  return data === null ? null : parseAction(data.action);
}

// 오늘의 마지막 코치 메시지. 받아 둔 교재 초안과 직전 질문 종류를 읽는다
export async function loadLastCoachMessage(
  sb: Client,
  today: string,
  timezone: string,
): Promise<ChatMessageRow | null> {
  const { data, error } = await sb
    .from("chat_messages")
    .select(MESSAGE_COLUMNS)
    .eq("role", "assistant")
    .gte("created_at", dayStartUtc(today, timezone))
    .lt("created_at", dayStartUtc(addDays(today, 1), timezone))
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  fail(error);
  return data === null ? null : toMessageRow(data);
}

// 오늘 아직 처리하지 않은 사용자 메시지(오래된 것부터). 연달아 보낸 글을 묶어 분석한다
export async function loadUnhandledUserMessages(
  sb: Client,
  today: string,
  timezone: string,
): Promise<{ id: string; content: string }[]> {
  const { data, error } = await sb
    .from("chat_messages")
    .select("id, content")
    .eq("role", "user")
    .is("handled_at", null)
    .gte("created_at", dayStartUtc(today, timezone))
    .lt("created_at", dayStartUtc(addDays(today, 1), timezone))
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  fail(error);
  return data as { id: string; content: string }[];
}

// 묶음 확인(claim_user_messages). 이 메시지보다 새 처리 안 한 사용자 메시지가 있으면 false(아무것도 바꾸지 않음),
// 없으면 이 메시지까지의 처리 안 한 사용자 메시지를 처리 표시하고 true
export async function claimUserMessages(
  sb: Client,
  messageId: string,
  today: string,
  timezone: string,
): Promise<boolean> {
  const { data, error } = await sb.rpc("claim_user_messages", {
    p_message_id: messageId,
    p_from: dayStartUtc(today, timezone),
    p_to: dayStartUtc(addDays(today, 1), timezone),
  });
  fail(error);
  return data === true;
}

// 실패한 요청의 사용자 메시지 정리(discard_user_message). 이 메시지보다 새 처리 안 한 사용자 메시지가 있거나
// 이미 처리됐으면 지우지 않고 false(더 새 요청이 묶어 처리한다), 없으면 지우고 true
export async function discardUserMessage(
  sb: Client,
  messageId: string,
  today: string,
  timezone: string,
): Promise<boolean> {
  const { data, error } = await sb.rpc("discard_user_message", {
    p_message_id: messageId,
    p_from: dayStartUtc(today, timezone),
    p_to: dayStartUtc(addDays(today, 1), timezone),
  });
  fail(error);
  return data === true;
}

// 먼저 저장한 사용자 메시지의 과목을 분석 결과로 고친다
export async function setMessageSubject(
  sb: Client,
  id: string,
  subject: Subject | null,
): Promise<void> {
  const { error } = await sb
    .from("chat_messages")
    .update({ subject })
    .eq("id", id);
  fail(error);
}

// 채팅으로 추가하는 교재. 나머지는 처음부터 시작하는 기본값이다
export async function insertBook(
  sb: Client,
  userId: string,
  d: CompleteDraft,
): Promise<{ id: string }> {
  const { data, error } = await sb
    .from("books")
    .insert({
      user_id: userId,
      subject: d.subject,
      title: d.title,
      unit: d.unit,
      total_units: d.total_units,
      target_rounds: d.target_rounds,
      current_round: 1,
      current_unit: 0,
      daily_amount: null,
      round_targets: [],
    })
    .select("id")
    .single();
  fail(error);
  return data as { id: string };
}

// 학습 기록을 그날 날짜로 남기고, 진도를 앞으로 옮길 보고는 report_progress로 반영한다.
// 복습처럼 진도를 바꾸지 않는 보고와 교재를 모르는 보고는 기록만 남는다
export async function recordStudyLogs(
  sb: Client,
  userId: string,
  today: string,
  messageId: string,
  entries: StudyEntry[],
  books: BookRef[],
): Promise<RecordedLog[]> {
  const { error } = await sb.from("study_logs").insert(
    entries.map((e) => ({
      user_id: userId,
      subject: e.subject,
      book_id: e.book_id,
      start_unit: e.start_unit,
      end_unit: e.end_unit,
      questions_solved: e.questions_solved,
      questions_wrong: e.questions_wrong,
      study_date: today,
      source_message_id: messageId,
    })),
  );
  fail(error);

  // 같은 교재 보고가 여러 개면 DB 함수가 max로 모으므로 순서대로 부른다.
  // 반영할 때마다 교재 진도 복사본도 DB와 같은 식으로 옮겨 다음 보고를 판단한다
  // ("59~60강 끝내고 1~2강도 했어"의 두 번째 보고는 다음 회독이다)
  const current = new Map(books.map((b) => [b.id, b]));
  for (const entry of entries) {
    const book = entry.book_id ? current.get(entry.book_id) : undefined;
    const position = book ? resolvePosition(book, entry) : null;
    if (!book || !position) continue;
    const { error: rpcError } = await sb.rpc("report_progress", {
      p_book_id: book.id,
      p_round: position.round,
      p_end_unit: position.end_unit,
      p_date: today,
    });
    fail(rpcError);
    current.set(book.id, advance(book, position));
  }

  return entries.map((e) => ({
    subject: e.subject,
    title: books.find((b) => b.id === e.book_id)?.title ?? null,
  }));
}

// 저장된 그날 합계(분). 범위를 벗어나 저장하지 않았으면 null
export async function saveStudyTime(
  sb: Client,
  date: string,
  report: StudyTimeReport,
): Promise<number | null> {
  const { data, error } = await sb.rpc("record_study_time", {
    p_date: date,
    p_minutes: report.minutes,
    p_add: report.add,
  });
  if (error?.code === INVALID_PARAMETER) return null;
  fail(error);
  return data as number;
}

// 그날 순공시간 합계(분). 아직 없으면 null
export async function loadStudyMinutes(
  sb: Client,
  date: string,
): Promise<number | null> {
  const { data, error } = await sb
    .from("study_time")
    .select("minutes")
    .eq("study_date", date)
    .maybeSingle();
  fail(error);
  return data === null ? null : (data as { minutes: number }).minutes;
}

// 잘 맞은 방법 저장. 같은 사용자·과목·내용이 이미 있으면 넣지 않고 false
export async function insertStudyTip(
  sb: Client,
  userId: string,
  tip: StudyTip,
  messageId: string,
): Promise<boolean> {
  const { error } = await sb.from("study_tips").insert({
    user_id: userId,
    subject: tip.subject,
    content: tip.content,
    source_message_id: messageId,
  });
  if (error?.code === UNIQUE_VIOLATION) return false;
  fail(error);
  return true;
}

// 답변에 넣을 공부법 섹션(topics 순서, 그 안은 position 순)과 잘 맞은 방법(그 과목 최근 TIP_LIMIT개).
// 팁은 프롬프트 목록 한 줄이 되도록 공백·줄바꿈을 한 칸으로 줄인다
export async function loadKnowledge(
  sb: Client,
  topics: MethodTopic[],
  tipSubject: Subject | null,
  withTips: boolean,
): Promise<{ sections: KnowledgeSection[]; tips: string[] }> {
  const [sectionsResult, tipsResult] = await Promise.all([
    topics.length > 0
      ? sb
        .from("study_methods")
        .select("topic, position, heading, kind, items")
        .in("topic", topics)
      : null,
    withTips
      ? (tipSubject === null
        ? sb.from("study_tips").select("content").is("subject", null)
        : sb.from("study_tips").select("content").eq("subject", tipSubject))
        .order("created_at", { ascending: false })
        .limit(TIP_LIMIT)
      : null,
  ]);
  fail(sectionsResult?.error ?? null);
  fail(tipsResult?.error ?? null);

  // jsonb items 타입이 추론되지 않아 행 모양을 적어 둔다
  const rows = (sectionsResult?.data ?? []) as unknown as (KnowledgeSection & {
    position: number;
  })[];
  const sections = rows.sort((a, b) =>
    topics.indexOf(a.topic) - topics.indexOf(b.topic) ||
    a.position - b.position
  );
  const tips = ((tipsResult?.data ?? []) as { content: string }[]).map((t) =>
    t.content.replace(/\s+/g, " ").trim()
  );
  return { sections, tips };
}

// 코치 답변에 넘길 공부 현황. 학습 기록을 저장한 뒤 불러 바뀐 진도를 담는다
export async function loadCoachContext(
  sb: Client,
  today: string,
  examDate: string | null,
): Promise<CoachContext> {
  const [booksResult, todayTasks, logsResult, examsResult] = await Promise.all(
    [
      sb.from("books").select(BOOK_COLUMNS).order("created_at"),
      loadTodayTasks(sb, today),
      sb
        .from("study_logs")
        .select(
          "study_date, subject, start_unit, end_unit, questions_solved, questions_wrong, books(title, unit)",
        )
        .gte("study_date", addDays(today, -(RECENT_LOG_DAYS - 1)))
        .lte("study_date", today)
        .order("study_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(RECENT_LOG_LIMIT),
      sb
        .from("mock_exams")
        .select("name, taken_on, mock_exam_scores(subject, score)")
        .order("taken_on", { ascending: false })
        .limit(MOCK_EXAM_LIMIT),
    ],
  );
  fail(booksResult.error);
  fail(logsResult.error);
  fail(examsResult.error);

  // 조인 결과 타입이 추론되지 않아 행 모양을 적어 둔다
  const recentLogs = (logsResult.data as unknown as LogRow[]).map((l) => ({
    study_date: l.study_date,
    subject: l.subject,
    title: l.books?.title ?? null,
    unit: l.books?.unit ?? null,
    start_unit: l.start_unit,
    end_unit: l.end_unit,
    questions_solved: l.questions_solved,
    questions_wrong: l.questions_wrong,
  }));

  // 조인 결과 타입이 추론되지 않아 행 모양을 적어 둔다
  const mockExams = (examsResult.data as unknown as MockExamRow[]).map((m) => ({
    name: m.name,
    taken_on: m.taken_on,
    scores: Object.fromEntries(
      m.mock_exam_scores.map((s) => [s.subject, s.score]),
    ) as Partial<Record<Subject, number>>,
  }));

  return {
    today,
    examDate,
    books: booksResult.data as BookRef[],
    todayTasks,
    recentLogs,
    mockExams,
  };
}

// 오늘 대화의 최근 메시지(오래된 것부터). 이번에 답하는 묶음의 메시지는 excludeIds로 뺀다
export async function loadTodayHistory(
  sb: Client,
  today: string,
  timezone: string,
  excludeIds: string[],
  limit = 6,
): Promise<HistoryMessage[]> {
  let query = sb
    .from("chat_messages")
    .select("role, content")
    .gte("created_at", dayStartUtc(today, timezone))
    .lt("created_at", dayStartUtc(addDays(today, 1), timezone));
  // id는 DB가 만든 uuid라 목록 문자열에 그대로 넣어도 된다
  if (excludeIds.length > 0) {
    query = query.not("id", "in", `(${excludeIds.join(",")})`);
  }
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  fail(error);
  return (data as HistoryMessage[]).reverse();
}
