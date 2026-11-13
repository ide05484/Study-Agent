import { type Subject, SUBJECT_LABELS } from "../_shared/subjects.ts";
import type { BookUnit } from "../_shared/units.ts";

// LLM 분석 결과를 믿지 않고 검증하는 순수 모듈. OpenAI·Supabase를 import하지 않는다.

export const INTENTS = [
  "study_log",
  "study_time",
  "schedule",
  "book_add",
  "question",
  "usage",
] as const;
export type Intent = typeof INTENTS[number];

export interface BookRef {
  id: string;
  subject: Subject;
  title: string;
  unit: BookUnit;
  total_units: number;
  current_round: number;
  current_unit: number;
  target_rounds: number;
}

export interface StudyEntry {
  subject: Subject;
  book_id: string | null;
  round: number | null;
  start_unit: number | null;
  end_unit: number | null;
  questions_solved: number | null;
  questions_wrong: number | null;
}

export interface StudyTimeReport {
  minutes: number;
  add: boolean;
  day: "today" | "yesterday";
}

export interface Analysis {
  intent: Intent;
  subject: Subject | null;
  entries: StudyEntry[];
  studyTime: StudyTimeReport | null;
  studyTimeInvalid: boolean;
}

const SUBJECTS = Object.keys(SUBJECT_LABELS) as Subject[];
const MIN_STUDY_MINUTES = 1;
const MAX_STUDY_MINUTES = 1080;

const nullable = (type: string) => ({ type: [type, "null"] });

const ENTRY_SCHEMA = {
  type: "object",
  properties: {
    subject: { type: "string", enum: SUBJECTS },
    book_id: nullable("string"),
    round: nullable("integer"),
    start_unit: nullable("integer"),
    end_unit: nullable("integer"),
    questions_solved: nullable("integer"),
    questions_wrong: nullable("integer"),
  },
  required: [
    "subject",
    "book_id",
    "round",
    "start_unit",
    "end_unit",
    "questions_solved",
    "questions_wrong",
  ],
  additionalProperties: false,
};

const STUDY_TIME_SCHEMA = {
  type: ["object", "null"],
  properties: {
    minutes: { type: "integer" },
    add: { type: "boolean" },
    day: { type: "string", enum: ["today", "yesterday"] },
  },
  required: ["minutes", "add", "day"],
  additionalProperties: false,
};

export const ANALYSIS_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    intent: { type: "string", enum: INTENTS },
    subject: { type: ["string", "null"], enum: [...SUBJECTS, null] },
    entries: { type: "array", items: ENTRY_SCHEMA },
    study_time: STUDY_TIME_SCHEMA,
  },
  required: ["intent", "subject", "entries", "study_time"],
  additionalProperties: false,
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const isSubject = (v: unknown): v is Subject =>
  typeof v === "string" && (SUBJECTS as string[]).includes(v);

const isIntent = (v: unknown): v is Intent =>
  typeof v === "string" && (INTENTS as readonly string[]).includes(v);

// min 이상 정수만, 아니면 null
const intAtLeast = (v: unknown, min: number): number | null =>
  typeof v === "number" && Number.isInteger(v) && v >= min ? v : null;

function parseEntry(v: unknown, books: BookRef[]): StudyEntry | null {
  if (!isRecord(v) || !isSubject(v.subject)) return null;
  const subject = v.subject;

  const sameSubject = books.filter((b) => b.subject === subject);
  let book: BookRef | null = typeof v.book_id === "string"
    ? sameSubject.find((b) => b.id === v.book_id) ?? null
    : null;
  if (!book && sameSubject.length === 1) book = sameSubject[0];

  let start = intAtLeast(v.start_unit, 1);
  let end = intAtLeast(v.end_unit, 1);
  if (start !== null && end !== null && start > end) [start, end] = [end, start];
  if (book) {
    if (start !== null && start > book.total_units) start = null;
    if (end !== null && end > book.total_units) end = null;
  }

  const round = book ? intAtLeast(v.round, 1) : null;

  const solved = intAtLeast(v.questions_solved, 0);
  let wrong = intAtLeast(v.questions_wrong, 0);
  if (wrong !== null && solved !== null && wrong > solved) wrong = null;

  if (start === null && end === null && solved === null && wrong === null) {
    return null;
  }
  return {
    subject,
    book_id: book?.id ?? null,
    round: book && round !== null && round <= book.target_rounds ? round : null,
    start_unit: start,
    end_unit: end,
    questions_solved: solved,
    questions_wrong: wrong,
  };
}

// study_time이 없으면 undefined, 범위 밖이면 null
function parseStudyTime(v: unknown): StudyTimeReport | null | undefined {
  if (v === null || v === undefined) return undefined;
  if (!isRecord(v)) return null;
  const { minutes } = v;
  if (
    typeof minutes !== "number" || !Number.isInteger(minutes) ||
    minutes < MIN_STUDY_MINUTES || minutes > MAX_STUDY_MINUTES
  ) return null;
  return {
    minutes,
    add: typeof v.add === "boolean" ? v.add : false,
    day: v.day === "yesterday" ? "yesterday" : "today",
  };
}

export function parseAnalysis(raw: unknown, books: BookRef[]): Analysis {
  const r = isRecord(raw) ? raw : {};
  let intent: Intent = isIntent(r.intent) ? r.intent : "question";
  const subject = isSubject(r.subject) ? r.subject : null;

  const entries = Array.isArray(r.entries)
    ? r.entries
      .map((e) => parseEntry(e, books))
      .filter((e): e is StudyEntry => e !== null)
    : [];

  const parsedTime = parseStudyTime(r.study_time);
  const studyTime = parsedTime ?? null;
  let studyTimeInvalid = parsedTime === null;

  if (intent === "study_log" && entries.length === 0) {
    intent = studyTime ? "study_time" : "question";
  }
  if (intent === "study_time" && parsedTime === undefined) {
    studyTimeInvalid = true;
  }

  return { intent, subject, entries, studyTime, studyTimeInvalid };
}
