import { assertEquals } from "jsr:@std/assert";
import { ANALYSIS_SCHEMA, type BookRef, parseAnalysis } from "./analysis.ts";

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
  study_tip: null,
  knowledge: [],
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

Deno.test("book_add에서는 교재가 1권뿐인 과목이어도 book_id를 정하지 않는다", () => {
  const a = parseAnalysis(
    raw({
      intent: "book_add",
      entries: [entry({ end_unit: 20 })],
    }),
    books,
  );
  assertEquals(a.entries.length, 1);
  assertEquals(a.entries[0].book_id, null);
});

Deno.test("book_add에서도 목록에 있는 book_id를 말하면 그 교재에 붙는다", () => {
  const a = parseAnalysis(
    raw({
      intent: "book_add",
      entries: [entry({ book_id: "b-admin", end_unit: 20 })],
    }),
    books,
  );
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

Deno.test("총량을 넘는 단위 수는 버리고 목표 밖 회독은 남긴다", () => {
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
  // 범위 판정은 resolvePosition이 한다
  assertEquals(a.entries[0].round, 3);
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

Deno.test("study_tip: 과목과 내용", () => {
  const a = parseAnalysis(
    raw({
      study_tip: {
        subject: "public_health",
        content: " 기출 풀고 바로 백지 복기하기 ",
      },
    }),
    books,
  );
  assertEquals(a.studyTip, {
    subject: "public_health",
    content: "기출 풀고 바로 백지 복기하기",
  });
});

Deno.test("study_tip: 과목이 없으면 메시지 과목", () => {
  const tip = { subject: null, content: "소리 내어 읽기" };
  assertEquals(
    parseAnalysis(raw({ subject: "english", study_tip: tip }), books).studyTip
      ?.subject,
    "english",
  );
  assertEquals(
    parseAnalysis(raw({ study_tip: tip }), books).studyTip?.subject,
    null,
  );
});

Deno.test("study_tip: 잘못된 과목은 메시지 과목", () => {
  const a = parseAnalysis(
    raw({
      subject: "korean",
      study_tip: { subject: "math", content: "소리 내어 읽기" },
    }),
    books,
  );
  assertEquals(a.studyTip?.subject, "korean");
});

Deno.test("study_tip: 빈 내용·201자·객체 아님은 null", () => {
  const tipOf = (content: unknown) =>
    parseAnalysis(raw({ study_tip: { subject: null, content } }), books)
      .studyTip;
  assertEquals(tipOf("   "), null);
  assertEquals(tipOf("가".repeat(201)), null);
  assertEquals(
    parseAnalysis(raw({ study_tip: "문자열" }), books).studyTip,
    null,
  );
  assertEquals(tipOf("가".repeat(200))?.content, "가".repeat(200));
});

Deno.test("knowledge: 모르는 값 빼고 중복 없이 정해진 순서", () => {
  assertEquals(
    parseAnalysis(raw({ knowledge: ["time", "mental", "mental", "x"] }), books)
      .knowledge,
    ["mental", "time"],
  );
  assertEquals(
    parseAnalysis(raw({ knowledge: "mental" }), books).knowledge,
    [],
  );
  const noKnowledge = raw({});
  delete (noKnowledge as Record<string, unknown>).knowledge;
  assertEquals(parseAnalysis(noKnowledge, books).knowledge, []);
});

Deno.test("study_tip은 intent를 바꾸지 않는다", () => {
  const a = parseAnalysis(
    raw({
      intent: "study_log",
      entries: [entry({ start_unit: 1, end_unit: 2 })],
      study_tip: { subject: null, content: "소리 내어 읽기" },
    }),
    books,
  );
  assertEquals(a.intent, "study_log");
  assertEquals(a.entries.length, 1);
  assertEquals(a.studyTip?.content, "소리 내어 읽기");
});

const bookRaw = (o: Record<string, unknown>) => ({
  subject: "korean",
  title: "봉투모의고사",
  unit: "session",
  total_units: 20,
  target_rounds: null,
  ...o,
});

Deno.test("book: 제목을 다듬고 말한 항목을 그대로 받는다", () => {
  const a = parseAnalysis(
    raw({
      intent: "book_add",
      book: bookRaw({ title: " 봉투모의고사 " }),
    }),
    books,
  );
  assertEquals(a.book, {
    subject: "korean",
    title: "봉투모의고사",
    unit: "session",
    total_units: 20,
    target_rounds: null,
  });
});

Deno.test("book: 틀린 값은 그 항목만 null", () => {
  const book = (o: Record<string, unknown>) =>
    parseAnalysis(raw({ book: bookRaw(o) }), books).book;
  assertEquals(book({ title: "가".repeat(21) })?.title, null);
  assertEquals(book({ title: "가".repeat(20) })?.title, "가".repeat(20));
  for (const total of [0, 1001, 1.5]) {
    assertEquals(book({ total_units: total })?.total_units, null);
  }
  for (const rounds of [0, 11]) {
    assertEquals(book({ target_rounds: rounds })?.target_rounds, null);
  }
  assertEquals(book({ unit: "page" })?.unit, null);
  assertEquals(book({ subject: "math" })?.subject, null);
});

Deno.test("book: 모든 항목이 null이거나 없거나 객체가 아니면 null", () => {
  const allNull = {
    subject: null,
    title: null,
    unit: null,
    total_units: null,
    target_rounds: null,
  };
  assertEquals(parseAnalysis(raw({ book: allNull }), books).book, null);
  assertEquals(parseAnalysis(raw({ book: null }), books).book, null);
  assertEquals(parseAnalysis(raw({}), books).book, null);
  assertEquals(parseAnalysis(raw({ book: "x" }), books).book, null);
  assertEquals(
    parseAnalysis(
      raw({
        book: bookRaw({
          title: "가".repeat(21),
          subject: null,
          unit: null,
          total_units: null,
        }),
      }),
      books,
    ).book,
    null,
  );
});

Deno.test("parseAnalysis: wrap_up은 true일 때만 wrapUp", () => {
  assertEquals(parseAnalysis(raw({ wrap_up: true }), books).wrapUp, true);
  assertEquals(parseAnalysis(raw({ wrap_up: false }), books).wrapUp, false);
  assertEquals(parseAnalysis(raw({}), books).wrapUp, false);
  assertEquals(parseAnalysis(raw({ wrap_up: "true" }), books).wrapUp, false);
});

Deno.test("ANALYSIS_SCHEMA: wrap_up은 필수", () => {
  assertEquals(
    (ANALYSIS_SCHEMA.required as string[]).includes("wrap_up"),
    true,
  );
});
