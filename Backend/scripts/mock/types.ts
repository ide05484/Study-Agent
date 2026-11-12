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
  // 하루 최소 분량. null이면 목표일(없으면 시험 전날)까지 고르게 나눈다
  daily_amount: number | null;
  // 회독별 목표일(YYYY-MM-DD). n번째 값이 n회독 목표일, null은 목표일 없음. 생략하면 []
  round_targets?: (string | null)[];
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
