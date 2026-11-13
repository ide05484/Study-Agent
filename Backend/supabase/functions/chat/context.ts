import { diffDays } from "../_shared/date.ts";
import { completedUnits } from "../_shared/plan.ts";
import { type Subject, SUBJECT_LABELS } from "../_shared/subjects.ts";
import {
  type BookUnit,
  progressLabel,
  rangeLabel,
  taskRangeLabel,
} from "../_shared/units.ts";

// 코치 답변에 넘길 공부 현황. OpenAI·Supabase를 import하지 않는 순수 모듈이다.

export type TaskStatus = "pending" | "done" | "partial" | "skipped";

export interface CoachContext {
  today: string;
  examDate: string | null;
  books: {
    subject: Subject;
    title: string;
    unit: BookUnit;
    total_units: number;
    current_round: number;
    current_unit: number;
    target_rounds: number;
  }[];
  todayTasks: {
    subject: Subject;
    title: string;
    unit: BookUnit;
    target_rounds: number;
    round: number;
    start_unit: number;
    end_unit: number;
    status: TaskStatus;
  }[];
  // 최근 7일
  recentLogs: {
    study_date: string;
    subject: Subject;
    title: string | null;
    unit: BookUnit | null;
    start_unit: number | null;
    end_unit: number | null;
    questions_solved: number | null;
    questions_wrong: number | null;
  }[];
  // 최근 3회
  mockExams: {
    name: string;
    taken_on: string;
    scores: Partial<Record<Subject, number>>;
  }[];
}

const SUBJECTS = Object.keys(SUBJECT_LABELS) as Subject[];
const MAX_LOG_LINES = 10;
const NONE = "없음";

const STATUS_LABELS: Record<TaskStatus, string> = {
  done: "완료",
  partial: "일부",
  pending: "남음",
  skipped: "건너뜀",
};

// 과목별 round(Σ완료 / Σ(목표 회독 × 총량) × 100). 교재 없는 과목은 키가 없다
export function subjectPercents(
  books: CoachContext["books"],
): Partial<Record<Subject, number>> {
  const sums: Partial<Record<Subject, { done: number; total: number }>> = {};
  for (const book of books) {
    const sum = sums[book.subject] ?? { done: 0, total: 0 };
    sum.done += completedUnits(book);
    sum.total += book.target_rounds * book.total_units;
    sums[book.subject] = sum;
  }
  const percents: Partial<Record<Subject, number>> = {};
  for (const subject of SUBJECTS) {
    const sum = sums[subject];
    if (sum && sum.total > 0) {
      percents[subject] = Math.round((sum.done / sum.total) * 100);
    }
  }
  return percents;
}

function joinOrNone(parts: string[]): string {
  return parts.length > 0 ? parts.join(", ") : NONE;
}

function logLine(log: CoachContext["recentLogs"][number]): string {
  const parts = [log.study_date.slice(5), SUBJECT_LABELS[log.subject]];
  if (log.title) parts.push(log.title);
  if (log.unit && log.start_unit !== null && log.end_unit !== null) {
    parts.push(rangeLabel(log.unit, log.start_unit, log.end_unit));
  }
  if (log.questions_solved !== null) {
    parts.push(
      log.questions_wrong !== null
        ? `기출 ${log.questions_solved}문제 중 ${log.questions_wrong}개 틀림`
        : `기출 ${log.questions_solved}문제`,
    );
  }
  return parts.join(" ");
}

export function formatCoachContext(ctx: CoachContext): string {
  const exam = ctx.examDate
    ? `시험까지 ${diffDays(ctx.today, ctx.examDate)}일`
    : "시험일 미입력";

  const percents = subjectPercents(ctx.books);
  const progress = SUBJECTS.filter((s) => percents[s] !== undefined).map(
    (s) => `${SUBJECT_LABELS[s]} ${percents[s]}%`,
  );

  const books = ctx.books.map(
    (b) => `${SUBJECT_LABELS[b.subject]} ${b.title} ${progressLabel(b)}`,
  );

  const tasks = ctx.todayTasks.map(
    (t) =>
      `${SUBJECT_LABELS[t.subject]} ${t.title} ${
        taskRangeLabel(
          t.target_rounds,
          t.round,
          t.unit,
          t.start_unit,
          t.end_unit,
        )
      }(${STATUS_LABELS[t.status]})`,
  );

  const logs = ctx.recentLogs.slice(0, MAX_LOG_LINES).map(logLine);

  const exams = ctx.mockExams.map((m) => {
    const scores = SUBJECTS.filter((s) => m.scores[s] !== undefined).map(
      (s) => `${SUBJECT_LABELS[s]} ${m.scores[s]}`,
    );
    return [`${m.name}(${m.taken_on})`, ...scores].join(" ");
  });

  return [
    `오늘: ${ctx.today} (${exam})`,
    `과목별 진도: ${joinOrNone(progress)}`,
    `교재: ${joinOrNone(books)}`,
    `오늘 분량: ${joinOrNone(tasks)}`,
    `최근 7일 기록: ${joinOrNone(logs)}`,
    `최근 모의고사: ${joinOrNone(exams)}`,
  ].join("\n");
}
