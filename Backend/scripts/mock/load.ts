// Mock JSON을 읽고 DB 제약과 같은 규칙으로 검사한다.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SUBJECT_LABELS } from "../../supabase/functions/_shared/subjects.ts";
import type { StudyMock } from "./types.ts";

const MOCK_DIR = dirname(fileURLToPath(import.meta.url));
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const BOOK_UNITS = ["day", "chapter", "session"];
const EXAM_KINDS = ["mock", "official"];

// 경로를 주지 않으면 study-mock.json(실제 값, git 제외), 없으면 예시 파일
export function resolveMockPath(path?: string): string {
  if (path) return path;
  const real = join(MOCK_DIR, "study-mock.json");
  return existsSync(real) ? real : join(MOCK_DIR, "study-mock.example.json");
}

// 정수이고 min 이상 max 이하인지. 숫자 자리에 문자열이 오면 SQL에 그대로 들어가므로 typeof까지 본다
function isIntIn(value: unknown, min: number, max: number): boolean {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}

export function loadMock(path: string): StudyMock {
  const mock = JSON.parse(readFileSync(path, "utf8")) as StudyMock;
  if (!DATE_KEY.test(mock.exam_date)) throw new Error(`exam_date 형식 오류: ${mock.exam_date}`);
  for (const b of mock.books) {
    const ok = b.subject in SUBJECT_LABELS && BOOK_UNITS.includes(b.unit) &&
      typeof b.title === "string" && b.title.length > 0 &&
      isIntIn(b.total_units, 1, Infinity) &&
      isIntIn(b.target_rounds, 1, 10) &&
      isIntIn(b.current_round, 1, b.target_rounds) &&
      isIntIn(b.current_unit, 0, b.total_units) &&
      (b.daily_amount === null || isIntIn(b.daily_amount, 1, Infinity));
    if (!ok) throw new Error(`교재 값 오류: ${b.title}`);
  }
  for (const e of mock.exams) {
    const ok = EXAM_KINDS.includes(e.kind) && typeof e.name === "string" && e.name.length > 0 &&
      DATE_KEY.test(e.taken_on) &&
      Object.entries(e.scores).every(([subject, score]) =>
        subject in SUBJECT_LABELS && typeof score === "number" && score >= 0 && score <= 100
      );
    if (!ok) throw new Error(`시험 값 오류: ${e.name}`);
  }
  return mock;
}
