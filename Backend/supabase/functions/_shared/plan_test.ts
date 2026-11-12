import { assertEquals } from "jsr:@std/assert";
import { type PlanBook, planBook } from "./plan.ts";

const book = (o: Partial<PlanBook>): PlanBook => ({
  id: "b",
  total_units: 10,
  current_unit: 0,
  current_round: 1,
  target_rounds: 1,
  daily_amount: null,
  ...o,
});
const t = (
  day: number,
  round: number,
  start_unit: number,
  end_unit: number,
) => ({
  book_id: "b",
  day,
  round,
  start_unit,
  end_unit,
});

Deno.test("1회독 교재는 지금과 같게 나눈다", () => {
  assertEquals(planBook(book({}), 3), [
    t(0, 1, 1, 3),
    t(1, 1, 4, 6),
    t(2, 1, 7, 10),
  ]);
});

Deno.test("회독 경계에 걸친 날은 두 줄로 나눈다", () => {
  assertEquals(planBook(book({ current_unit: 8, target_rounds: 2 }), 2), [
    t(0, 1, 9, 10),
    t(0, 2, 1, 4),
    t(1, 2, 5, 10),
  ]);
});

Deno.test("회독 끝에 있으면 다음 회독 1부터", () => {
  assertEquals(planBook(book({ current_unit: 10, target_rounds: 2 }), 1), [
    t(0, 2, 1, 10),
  ]);
});

Deno.test("목표 회독을 다 했으면 계획이 없다", () => {
  assertEquals(
    planBook(book({ current_unit: 10, current_round: 2, target_rounds: 2 }), 5),
    [],
  );
});

Deno.test("남은 분량이 날짜보다 적으면 빈 날은 건너뛴다", () => {
  assertEquals(planBook(book({ total_units: 2 }), 4).map((x) => x.day), [1, 3]);
});

Deno.test("하루 고정 분량은 그 양만큼 나누고, 끝나면 멈춘다", () => {
  assertEquals(
    planBook(book({ total_units: 3, target_rounds: 2, daily_amount: 2 }), 10),
    [
      t(0, 1, 1, 2),
      t(1, 1, 3, 3),
      t(1, 2, 1, 1),
      t(2, 2, 2, 3),
    ],
  );
});

Deno.test("고정 분량이 시험 전날까지 끝나지 않으면 거기서 자른다", () => {
  const tasks = planBook(book({ total_units: 100, daily_amount: 1 }), 5);
  assertEquals([tasks.length, tasks[4]], [5, t(4, 1, 5, 5)]);
});

Deno.test("날짜 수가 0이면 계획이 없다", () => {
  assertEquals(planBook(book({}), 0), []);
});
