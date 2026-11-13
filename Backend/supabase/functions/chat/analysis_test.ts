import { assertEquals } from "jsr:@std/assert";
import { type BookRef, parseAnalysis } from "./analysis.ts";

const books: BookRef[] = [
  {
    id: "b-admin",
    subject: "health_admin",
    title: "보건행정 기본서",
    unit: "session",
    total_units: 60,
    current_round: 1,
    current_unit: 15,
    target_rounds: 2,
  },
  {
    id: "b-ko1",
    subject: "korean",
    title: "국어 기본서",
    unit: "chapter",
    total_units: 20,
    current_round: 1,
    current_unit: 0,
    target_rounds: 1,
  },
  {
    id: "b-ko2",
    subject: "korean",
    title: "국어 문제집",
    unit: "chapter",
    total_units: 20,
    current_round: 1,
    current_unit: 0,
    target_rounds: 1,
  },
  {
    id: "b-en",
    subject: "english",
    title: "영어 단어",
    unit: "day",
    total_units: 60,
    current_round: 1,
    current_unit: 0,
    target_rounds: 1,
  },
];

const entry = (o: Record<string, unknown>) => ({
  subject: "health_admin",
  book_id: null,
  round: null,
  start_unit: null,
  end_unit: null,
  questions_solved: null,
  questions_wrong: null,
  ...o,
});

const raw = (o: Record<string, unknown>) => ({
  intent: "study_log",
  subject: null,
  entries: [],
  study_time: null,
  ...o,
});

Deno.test("교재가 1권뿐인 과목은 book_id를 채운다", () => {
  const a = parseAnalysis(
    raw({ entries: [entry({ start_unit: 15, end_unit: 17 })] }),
    books,
  );
  assertEquals(a.entries.length, 1);
  assertEquals(a.entries[0].book_id, "b-admin");
});

Deno.test("같은 과목 교재가 여러 권이고 교재를 모르면 book_id는 null", () => {
  const a = parseAnalysis(
    raw({
      entries: [entry({ subject: "korean", start_unit: 1, end_unit: 10 })],
    }),
    books,
  );
  assertEquals(a.entries[0].book_id, null);
});

Deno.test("목록에 없거나 과목이 다른 book_id는 버린다", () => {
  const a = parseAnalysis(
    raw({
      entries: [
        entry({
          subject: "korean",
          book_id: "b-admin",
          start_unit: 1,
          end_unit: 10,
        }),
      ],
    }),
    books,
  );
  assertEquals(a.entries[0].book_id, null);
});

Deno.test("뒤집힌 범위는 바꾸고 틀린 수가 푼 수보다 크면 버린다", () => {
  const a = parseAnalysis(
    raw({
      entries: [
        entry({
          start_unit: 17,
          end_unit: 15,
          questions_solved: 5,
          questions_wrong: 9,
        }),
      ],
    }),
    books,
  );
  assertEquals(a.entries[0].start_unit, 15);
  assertEquals(a.entries[0].end_unit, 17);
  assertEquals(a.entries[0].questions_wrong, null);
});

Deno.test("총량을 넘는 단위 수와 목표 밖 회독은 버린다", () => {
  const a = parseAnalysis(
    raw({
      entries: [
        entry({
          book_id: "b-admin",
          start_unit: 50,
          end_unit: 70,
          round: 3,
          questions_solved: 10,
        }),
      ],
    }),
    books,
  );
  assertEquals(a.entries[0].end_unit, null);
  assertEquals(a.entries[0].round, null);
});

Deno.test("기록할 내용이 없는 study_log는 question으로 바꾼다", () => {
  const a = parseAnalysis(raw({ entries: [entry({})] }), books);
  assertEquals([a.intent, a.entries.length], ["question", 0]);
});

Deno.test("순공시간만 있는 study_log는 study_time으로", () => {
  const a = parseAnalysis(
    raw({ study_time: { minutes: 200, add: false, day: "today" } }),
    books,
  );
  assertEquals(a.intent, "study_time");
  assertEquals(a.studyTime, { minutes: 200, add: false, day: "today" });
});

Deno.test("기록과 순공시간을 함께 받는다", () => {
  const a = parseAnalysis(
    raw({
      entries: [entry({ start_unit: 15, end_unit: 17 })],
      study_time: { minutes: 240, add: false, day: "today" },
    }),
    books,
  );
  assertEquals(a.entries.length, 1);
  assertEquals(a.studyTime?.minutes, 240);
});

Deno.test("범위 밖 순공시간은 저장하지 않고 다시 묻게 한다", () => {
  const a = parseAnalysis(
    raw({
      intent: "study_time",
      study_time: { minutes: 1800, add: false, day: "today" },
    }),
    books,
  );
  assertEquals(a.studyTime, null);
  assertEquals(a.studyTimeInvalid, true);
});

Deno.test("알 수 없는 intent와 과목은 기본값으로", () => {
  const a = parseAnalysis(
    raw({ intent: "chitchat", subject: "math" }),
    books,
  );
  assertEquals([a.intent, a.subject, a.entries.length], ["question", null, 0]);
});
