import { assertEquals } from "jsr:@std/assert";
import { type BookRef, parseAnalysis, type StudyEntry } from "./analysis.ts";
import { advance, resolvePosition } from "./progress.ts";

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
    resolvePosition(
      { ...book, current_unit: 60 },
      entry({ start_unit: 1, end_unit: 3 }),
    ),
    { round: 2, end_unit: 3 },
  ));
Deno.test("회독을 끝낸 뒤 55~58 복습은 진도를 바꾸지 않는다", () =>
  assertEquals(
    resolvePosition(
      { ...book, current_unit: 60 },
      entry({ start_unit: 55, end_unit: 58 }),
    ),
    null,
  ));
Deno.test("회독을 끝낸 뒤 시작 없이 '3강까지'는 진도를 바꾸지 않는다", () =>
  assertEquals(
    resolvePosition({ ...book, current_unit: 60 }, entry({ end_unit: 3 })),
    null,
  ));
Deno.test("마지막 회독까지 끝냈으면 진도를 바꾸지 않는다", () =>
  assertEquals(
    resolvePosition(
      { ...book, current_round: 2, current_unit: 60 },
      entry({ start_unit: 1, end_unit: 3 }),
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
Deno.test("목표 밖 회독을 말하면 진도를 바꾸지 않는다", () => {
  // "3회독 17강"(목표 2): 분석 검증을 거쳐도 회독이 남아 지금 회독 17로 반영되지 않는다
  const [parsed] = parseAnalysis({
    intent: "study_log",
    subject: "public_health",
    entries: [entry({ round: 3, end_unit: 17 })],
    study_time: null,
  }, [book]).entries;
  assertEquals(resolvePosition(book, parsed), null);
});

Deno.test("advance: 보고 위치가 지금보다 뒤면 그 위치로 옮긴다", () =>
  assertEquals(advance(book, { round: 1, end_unit: 17 }), {
    ...book,
    current_round: 1,
    current_unit: 17,
  }));
Deno.test("advance: 회독을 막 끝내면 그 회독의 끝에 둔다", () =>
  assertEquals(advance(book, { round: 1, end_unit: 60 }), {
    ...book,
    current_round: 1,
    current_unit: 60,
  }));
Deno.test("advance: 다음 회독 보고는 다음 회독으로 옮긴다", () =>
  assertEquals(
    advance({ ...book, current_unit: 60 }, { round: 2, end_unit: 2 }),
    { ...book, current_round: 2, current_unit: 2 },
  ));
Deno.test("advance: 지금보다 앞 위치는 진도를 되돌리지 않는다", () =>
  assertEquals(advance(book, { round: 1, end_unit: 10 }), book));
Deno.test("advance: 목표 회독 × 총량을 넘지 않는다", () =>
  assertEquals(advance(book, { round: 3, end_unit: 5 }), {
    ...book,
    current_round: 2,
    current_unit: 60,
  }));
Deno.test("한 메시지의 두 보고는 앞 보고로 옮긴 진도로 판단한다", () => {
  // "59~60강 끝내고 1~2강도 했어"
  let current: BookRef = { ...book, current_unit: 58 };
  const positions = [
    entry({ start_unit: 59, end_unit: 60 }),
    entry({ start_unit: 1, end_unit: 2 }),
  ].map((e) => {
    const position = resolvePosition(current, e);
    if (position) current = advance(current, position);
    return position;
  });
  assertEquals(positions, [
    { round: 1, end_unit: 60 },
    { round: 2, end_unit: 2 },
  ]);
  assertEquals([current.current_round, current.current_unit], [2, 2]);
});
