// chat의 DB 읽기·쓰기. 모두 사용자 클라이언트(RLS)로 하고, 실패하면 Error를 던진다(index.ts가 500으로 바꾼다).
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, dayStartUtc } from "../_shared/date.ts";
import type { Subject } from "../_shared/subjects.ts";
import type { BookUnit } from "../_shared/units.ts";
import type { BookRef, StudyEntry, StudyTimeReport } from "./analysis.ts";
import type { CoachContext, TaskStatus } from "./context.ts";
import type { HistoryMessage } from "./llm.ts";
import { resolvePosition } from "./progress.ts";
import type { RecordedLog } from "./reply.ts";

type Client = SupabaseClient;

const RECENT_LOG_DAYS = 7;
const RECENT_LOG_LIMIT = 10;
const MOCK_EXAM_LIMIT = 3;
// record_study_time이 범위 밖 순공시간에 내는 SQLSTATE
const INVALID_PARAMETER = "22023";

// Frontend interfaces/chat.ts의 ChatMessage와 같은 모양
export interface ChatMessageRow {
  id: string;
  role: "user" | "assistant";
  content: string;
  subject: Subject | null;
  created_at: string;
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
const MESSAGE_COLUMNS = "id, role, content, subject, created_at";

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
): Promise<ChatMessageRow> {
  const { data, error } = await sb
    .from("chat_messages")
    .insert({ user_id: userId, role, content, subject })
    .select(MESSAGE_COLUMNS)
    .single();
  fail(error);
  return data as ChatMessageRow;
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

  // 같은 교재 보고가 여러 개면 DB 함수가 max로 모으므로 순서대로 부른다
  for (const entry of entries) {
    const book = books.find((b) => b.id === entry.book_id);
    const position = book ? resolvePosition(book, entry) : null;
    if (!position) continue;
    const { error: rpcError } = await sb.rpc("report_progress", {
      p_book_id: entry.book_id,
      p_round: position.round,
      p_end_unit: position.end_unit,
      p_date: today,
    });
    fail(rpcError);
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

// 코치 답변에 넘길 공부 현황. 학습 기록을 저장한 뒤 불러 바뀐 진도를 담는다
export async function loadCoachContext(
  sb: Client,
  today: string,
  examDate: string | null,
): Promise<CoachContext> {
  const [booksResult, tasksResult, logsResult, examsResult] = await Promise.all(
    [
      sb.from("books").select(BOOK_COLUMNS).order("created_at"),
      sb
        .from("daily_tasks")
        .select(
          "round, start_unit, end_unit, status, books(subject, title, unit, target_rounds)",
        )
        .eq("task_date", today)
        .order("created_at"),
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
  fail(tasksResult.error);
  fail(logsResult.error);
  fail(examsResult.error);

  const todayTasks = (tasksResult.data as unknown as TaskRow[]).flatMap((t) =>
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

// 오늘 대화의 최근 메시지(오래된 것부터). 방금 저장한 메시지는 excludeId로 뺀다
export async function loadTodayHistory(
  sb: Client,
  today: string,
  timezone: string,
  excludeId: string,
  limit = 6,
): Promise<HistoryMessage[]> {
  const { data, error } = await sb
    .from("chat_messages")
    .select("role, content")
    .gte("created_at", dayStartUtc(today, timezone))
    .lt("created_at", dayStartUtc(addDays(today, 1), timezone))
    .neq("id", excludeId)
    .order("created_at", { ascending: false })
    .limit(limit);
  fail(error);
  return (data as HistoryMessage[]).reverse();
}
