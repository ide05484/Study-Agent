// Mock 공부 데이터(JSON)의 형식. mock-sql.ts와 plan-preview.ts가 함께 쓴다.
import type { Subject } from "../../supabase/functions/_shared/subjects.ts";

export interface MockBook {
  subject: Subject;
  title: string;
  unit: "day" | "chapter" | "session";
  // unit 단위의 총량(Day·챕터·회차 수)
  total_units: number;
  current_round: number;
  current_unit: number;
  target_rounds: number;
  // null이면 시험 전날까지 고르게 나눈다
  daily_amount: number | null;
}

export interface MockExamInput {
  kind: "mock" | "official";
  name: string;
  taken_on: string;
  scores: Partial<Record<Subject, number>>;
}

export interface StudyMock {
  exam_date: string;
  books: MockBook[];
  exams: MockExamInput[];
}
