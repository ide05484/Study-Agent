// Mock JSON을 읽고 DB 제약과 같은 규칙으로 검사한다.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { StudyMock } from "./types.ts";

const MOCK_DIR = dirname(fileURLToPath(import.meta.url));
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

// 경로를 주지 않으면 study-mock.json(실제 값, git 제외), 없으면 예시 파일
export function resolveMockPath(path?: string): string {
  if (path) return path;
  const real = join(MOCK_DIR, "study-mock.json");
  return existsSync(real) ? real : join(MOCK_DIR, "study-mock.example.json");
}

export function loadMock(path: string): StudyMock {
  const mock = JSON.parse(readFileSync(path, "utf8")) as StudyMock;
  if (!DATE_KEY.test(mock.exam_date)) throw new Error(`exam_date 형식 오류: ${mock.exam_date}`);
  for (const b of mock.books) {
    const ok = Number.isInteger(b.total_pages) && b.total_pages > 0 &&
      b.target_rounds >= 1 && b.target_rounds <= 10 &&
      b.current_round >= 1 && b.current_round <= b.target_rounds &&
      b.current_page >= 0 && b.current_page <= b.total_pages &&
      (b.daily_amount === null || b.daily_amount > 0);
    if (!ok) throw new Error(`교재 값 오류: ${b.title}`);
  }
  for (const e of mock.exams) {
    if (!DATE_KEY.test(e.taken_on)) throw new Error(`taken_on 형식 오류: ${e.name}`);
    for (const score of Object.values(e.scores)) {
      if (score < 0 || score > 100) throw new Error(`점수 범위 오류: ${e.name}`);
    }
  }
  return mock;
}
