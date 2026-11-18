import { assertEquals } from "jsr:@std/assert";
import {
  type CoachContext,
  formatCoachContext,
  subjectPercents,
} from "./context.ts";

const ctx: CoachContext = {
  today: "2026-11-13",
  examDate: "2027-02-27",
  books: [
    {
      subject: "health_admin",
      title: "기본서",
      unit: "session",
      total_units: 60,
      current_round: 1,
      current_unit: 15,
      target_rounds: 2,
    },
    {
      subject: "english",
      title: "단어",
      unit: "day",
      total_units: 60,
      current_round: 1,
      current_unit: 12,
      target_rounds: 1,
    },
  ],
  todayTasks: [
    {
      subject: "health_admin",
      title: "기본서",
      unit: "session",
      target_rounds: 2,
      round: 1,
      start_unit: 16,
      end_unit: 18,
      status: "done",
    },
    {
      subject: "english",
      title: "단어",
      unit: "day",
      target_rounds: 1,
      round: 1,
      start_unit: 13,
      end_unit: 13,
      status: "pending",
    },
  ],
  recentLogs: [
    {
      study_date: "2026-11-13",
      subject: "health_admin",
      title: "기본서",
      unit: "session",
      start_unit: 15,
      end_unit: 17,
      questions_solved: 20,
      questions_wrong: 5,
    },
    {
      study_date: "2026-11-12",
      subject: "korean",
      title: null,
      unit: null,
      start_unit: null,
      end_unit: null,
      questions_solved: null,
      questions_wrong: null,
    },
  ],
  mockExams: [
    {
      name: "10월 모의",
      taken_on: "2026-10-20",
      scores: { korean: 80, english: 65 },
    },
  ],
};

const empty: CoachContext = {
  today: "2026-11-13",
  examDate: null,
  books: [],
  todayTasks: [],
  recentLogs: [],
  mockExams: [],
};

Deno.test("subjectPercents: 교재 합계와 회독을 포함하고 교재 없는 과목은 키가 없다", () => {
  const books: CoachContext["books"] = [
    ...ctx.books,
    {
      subject: "english",
      title: "문법",
      unit: "chapter",
      total_units: 20,
      current_round: 1,
      current_unit: 8,
      target_rounds: 1,
    },
  ];
  // 보건행정 15/120 = 12.5 → 13, 영어 (12+8)/(60+20) = 25
  assertEquals(subjectPercents(books), { health_admin: 13, english: 25 });
});

Deno.test("formatCoachContext: 예시 줄", () => {
  const lines = formatCoachContext(ctx).split("\n");
  assertEquals(lines[0], "오늘: 2026-11-13 (시험까지 106일)");
  assertEquals(lines[1], "과목별 진도: 영어 20%, 보건행정 13%");
  assertEquals(
    lines[2],
    "교재: 보건행정 기본서 1/2회독 15/60회, 영어 단어 Day 12/60",
  );
  assertEquals(
    lines[3],
    "오늘 분량: 보건행정 기본서 1회독 16–18회(완료), 영어 단어 Day 13(남음)",
  );
  assertEquals(
    lines[4],
    "최근 7일 기록: 11-13 보건행정 기본서 15–17회 기출 20문제 중 5개 틀림, 11-12 국어",
  );
  assertEquals(
    lines[5],
    "최근 모의고사: 10월 모의(2026-10-20) 국어 80 영어 65",
  );
});

Deno.test("formatCoachContext: 데이터가 없으면 없음", () => {
  const lines = formatCoachContext(empty).split("\n");
  assertEquals(lines[0], "오늘: 2026-11-13 (시험일 미입력)");
  assertEquals(lines[1], "과목별 진도: 없음");
  assertEquals(lines[2], "교재: 없음");
  assertEquals(lines[3], "오늘 분량: 없음");
  assertEquals(lines[4], "최근 7일 기록: 없음");
  assertEquals(lines[5], "최근 모의고사: 없음");
});
