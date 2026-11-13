import { assertEquals } from "jsr:@std/assert";
import type { BookRef, StudyEntry } from "./analysis.ts";
import { resolvePosition } from "./progress.ts";

const book: BookRef = {
  id: "b1",
  subject: "public_health",
  title: "공중보건",
  unit: "session",
  total_units: 60,
  current_round: 1,
  current_unit: 15,
  target_rounds: 2,
};

const entry = (over: Partial<StudyEntry>): StudyEntry => ({
  subject: "public_health",
  book_id: "b1",
  round: null,
  start_unit: null,
  end_unit: null,
  questions_solved: null,
  questions_wrong: null,
  ...over,
});

Deno.test("지금 진도보다 뒤를 보고하면 지금 회독", () =>
  assertEquals(resolvePosition(book, entry({ end_unit: 17 })), {
    round: 1,
    end_unit: 17,
  }));
Deno.test("지금 진도보다 앞부분은 복습이라 진도를 바꾸지 않는다", () =>
  assertEquals(resolvePosition(book, entry({ end_unit: 10 })), null));
Deno.test("회독을 다 끝냈으면 다음 회독 앞부분", () =>
  assertEquals(
    resolvePosition({ ...book, current_unit: 60 }, entry({ end_unit: 3 })),
    { round: 2, end_unit: 3 },
  ));
Deno.test("마지막 회독까지 끝냈으면 진도를 바꾸지 않는다", () =>
  assertEquals(
    resolvePosition(
      { ...book, current_round: 2, current_unit: 60 },
      entry({ end_unit: 3 }),
    ),
    null,
  ));
Deno.test("회독을 말했으면 그 회독", () =>
  assertEquals(resolvePosition(book, entry({ round: 2, end_unit: 3 })), {
    round: 2,
    end_unit: 3,
  }));
Deno.test("교재나 끝 단위가 없으면 null", () =>
  assertEquals(
    resolvePosition(book, entry({ book_id: null, end_unit: 17 })),
    null,
  ));
Deno.test("회독을 막 끝낸 뒤 마지막 단위를 보고하면 진도를 바꾸지 않는다", () =>
  assertEquals(
    resolvePosition({ ...book, current_unit: 60 }, entry({ end_unit: 60 })),
    null,
  ));
Deno.test("목표 밖 회독은 진도를 바꾸지 않는다", () =>
  assertEquals(resolvePosition(book, entry({ round: 3, end_unit: 3 })), null));
