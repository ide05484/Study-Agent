import { assertEquals } from "jsr:@std/assert";
import { type PlanBook, planBook, type PlanOptions } from "./plan.ts";

const book = (o: Partial<PlanBook>): PlanBook => ({
  id: "b",
  total_units: 10,
  current_unit: 0,
  current_round: 1,
  target_rounds: 1,
  daily_amount: null,
  ...o,
});
const opts = (
  days: number,
  targetDays: (number | null)[] = [],
  lastWeekCap: number | null = null,
): PlanOptions => ({ days, targetDays, lastWeekCap });
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
  assertEquals(planBook(book({}), opts(3)), [
    t(0, 1, 1, 3),
    t(1, 1, 4, 6),
    t(2, 1, 7, 10),
  ]);
});

Deno.test("목표일·최소 분량이 없으면 지금과 같다", () => {
  assertEquals(planBook(book({ total_units: 10 }), opts(4)), [
    t(0, 1, 1, 2),
    t(1, 1, 3, 5),
    t(2, 1, 6, 7),
    t(3, 1, 8, 10),
  ]);
});

Deno.test("회독 경계에 걸친 날은 두 줄로 나눈다", () => {
  assertEquals(
    planBook(book({ current_unit: 8, target_rounds: 2 }), opts(2)),
    [
      t(0, 1, 9, 10),
      t(0, 2, 1, 4),
      t(1, 2, 5, 10),
    ],
  );
});

Deno.test("회독 끝에 있으면 다음 회독 1부터", () => {
  assertEquals(
    planBook(book({ current_unit: 10, target_rounds: 2 }), opts(1)),
    [
      t(0, 2, 1, 10),
    ],
  );
});

Deno.test("목표 회독을 다 했으면 계획이 없다", () => {
  assertEquals(
    planBook(
      book({ current_unit: 10, current_round: 2, target_rounds: 2 }),
      opts(5),
    ),
    [],
  );
});

Deno.test("남은 분량이 날짜보다 적으면 빈 날은 건너뛴다", () => {
  assertEquals(
    planBook(book({ total_units: 2 }), opts(4)).map((x) => x.day),
    [1, 3],
  );
});

Deno.test("하루 최소 분량만큼 나누고, 끝나면 멈춘다", () => {
  assertEquals(
    planBook(
      book({ total_units: 3, target_rounds: 2, daily_amount: 2 }),
      opts(10),
    ),
    [
      t(0, 1, 1, 2),
      t(1, 1, 3, 3),
      t(1, 2, 1, 1),
      t(2, 2, 2, 3),
    ],
  );
});

Deno.test("날짜 수가 0이면 계획이 없다", () => {
  assertEquals(planBook(book({}), opts(0)), []);
});

Deno.test("1회독 목표일까지 1회독, 나머지는 시험 전날까지", () => {
  assertEquals(
    planBook(book({ total_units: 10, target_rounds: 2 }), opts(6, [1, null])),
    [
      t(0, 1, 1, 5),
      t(1, 1, 6, 10),
      t(2, 2, 1, 2),
      t(3, 2, 3, 5),
      t(4, 2, 6, 7),
      t(5, 2, 8, 10),
    ],
  );
});

Deno.test("목표일 없는 회독은 다음 목표일 구간에 합친다", () => {
  assertEquals(
    planBook(
      book({ total_units: 10, target_rounds: 3 }),
      opts(6, [null, 3, null]),
    ),
    [
      t(0, 1, 1, 5),
      t(1, 1, 6, 10),
      t(2, 2, 1, 5),
      t(3, 2, 6, 10),
      t(4, 3, 1, 5),
      t(5, 3, 6, 10),
    ],
  );
});

Deno.test("최소 분량이 크면 일찍 끝내고 다음 회독으로", () => {
  assertEquals(
    planBook(
      book({ total_units: 10, target_rounds: 2, daily_amount: 4 }),
      opts(10),
    ),
    [
      t(0, 1, 1, 4),
      t(1, 1, 5, 8),
      t(2, 1, 9, 10),
      t(2, 2, 1, 2),
      t(3, 2, 3, 6),
      t(4, 2, 7, 10),
    ],
  );
});

Deno.test("지난 목표일은 오늘 + 14일로 본다", () => {
  const tasks = planBook(book({ total_units: 30 }), opts(30, [-3]));
  assertEquals(tasks.length, 15);
  assertEquals(tasks.at(-1), t(14, 1, 29, 30));
});

Deno.test("시험 이후 목표일은 시험 전날로", () => {
  assertEquals(planBook(book({ total_units: 10 }), opts(4, [100])), [
    t(0, 1, 1, 2),
    t(1, 1, 3, 5),
    t(2, 1, 6, 7),
    t(3, 1, 8, 10),
  ]);
});

Deno.test("앞 회독보다 이른 목표일은 앞 목표일로 올린다", () => {
  assertEquals(
    planBook(book({ total_units: 10, target_rounds: 2 }), opts(6, [3, 1])),
    [
      t(0, 1, 1, 5),
      t(1, 1, 6, 10),
      t(2, 2, 1, 5),
      t(3, 2, 6, 10),
    ],
  );
});

Deno.test("마지막 주에는 상한을 넘지 않고 남긴다", () => {
  const tasks = planBook(
    book({ total_units: 100, current_unit: 20 }),
    opts(7, [], 10),
  );
  assertEquals(tasks.length, 7);
  assertEquals(tasks[0], t(0, 1, 21, 30));
  assertEquals(tasks.at(-1), t(6, 1, 81, 90));
});

Deno.test("상한은 마지막 7일에만", () => {
  const amounts = planBook(book({ total_units: 20 }), opts(10, [], 1)).map((
    x,
  ) => x.end_unit - x.start_unit + 1);
  assertEquals(amounts, [2, 2, 2, 1, 1, 1, 1, 1, 1, 1]);
});

Deno.test("상한이 없으면 마지막 주도 고르게 끝낸다", () => {
  assertEquals(
    planBook(book({ total_units: 100, current_unit: 20 }), opts(7)).at(-1)
      ?.end_unit,
    100,
  );
});

Deno.test("현재 회독이 2 이상이면 그 회독의 목표일을 본다", () => {
  assertEquals(
    planBook(
      book({ total_units: 10, current_round: 2, target_rounds: 3 }),
      opts(6, [-5, 2, null]),
    ).filter((x) => x.round === 2),
    [t(0, 2, 1, 3), t(1, 2, 4, 6), t(2, 2, 7, 10)],
  );
});

Deno.test("마지막 주 상한 때문에 목표일을 못 맞추면 그 뒤로 이어 간다", () => {
  const tasks = planBook(
    book({ total_units: 10, target_rounds: 2 }),
    opts(7, [2, null], 3),
  );
  const amounts = tasks.reduce<number[]>((acc, x) => {
    acc[x.day] = (acc[x.day] ?? 0) + x.end_unit - x.start_unit + 1;
    return acc;
  }, []);
  assertEquals(amounts.every((a) => a <= 3), true);
  assertEquals(tasks.find((x) => x.round === 1 && x.end_unit === 10)?.day, 3);
});

Deno.test("최소 분량과 마지막 주 상한이 같이 걸리면 상한이 이긴다", () => {
  const amounts = planBook(
    book({ total_units: 100, daily_amount: 5 }),
    opts(7, [], 2),
  ).map((x) => x.end_unit - x.start_unit + 1);
  assertEquals(amounts, [2, 2, 2, 2, 2, 2, 2]);
});

Deno.test("목표일이 오늘이면 그 회독의 남은 분량을 오늘에 넣는다", () => {
  assertEquals(
    planBook(
      book({ total_units: 10, current_unit: 4, target_rounds: 2 }),
      opts(4, [0, null]),
    )[0],
    t(0, 1, 5, 10),
  );
});
