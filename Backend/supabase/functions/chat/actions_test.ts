import { assertEquals } from "jsr:@std/assert";
import { type ChatAction, isConfirmAction, parseAction } from "./actions.ts";

const draft = {
  subject: "korean",
  title: "봉투모의고사",
  unit: "session",
  total_units: 20,
  target_rounds: 3,
} as const;

Deno.test("parseAction: book_add 정상 값은 그대로", () => {
  const action = { kind: "book_add", step: "confirm", draft } as const;
  assertEquals(parseAction(action), action);
});

Deno.test("parseAction: wrap_up confirm·study_time_ask·time_available_ask", () => {
  assertEquals(parseAction({ kind: "wrap_up", step: "confirm" }), {
    kind: "wrap_up",
    step: "confirm",
  });
  assertEquals(parseAction({ kind: "study_time_ask" }), {
    kind: "study_time_ask",
  });
  assertEquals(parseAction({ kind: "time_available_ask" }), {
    kind: "time_available_ask",
  });
});

Deno.test("parseAction: 틀린 모양은 null", () => {
  assertEquals(
    parseAction({ kind: "book_add", step: "done", draft: {} }),
    null,
  );
  assertEquals(parseAction({ kind: "wrap_up", step: "ask" }), null);
  assertEquals(parseAction({ kind: "x", step: "ask", draft: {} }), null);
  assertEquals(parseAction({ kind: "x" }), null);
  assertEquals(parseAction([]), null);
  assertEquals(parseAction("x"), null);
  assertEquals(parseAction(null), null);
});

Deno.test("parseAction: 틀린 항목만 null, 회독은 1", () => {
  const parsed = parseAction({
    kind: "book_add",
    step: "ask",
    draft: {
      subject: "math",
      title: "a",
      unit: "session",
      total_units: 5000,
      target_rounds: 99,
    },
  });
  assertEquals(parsed?.kind === "book_add" ? parsed.draft : null, {
    subject: null,
    title: "a",
    unit: "session",
    total_units: null,
    target_rounds: 1,
  });
});

Deno.test("isConfirmAction", () => {
  const book = (step: "ask" | "confirm"): ChatAction => ({
    kind: "book_add",
    step,
    draft,
  });
  assertEquals(isConfirmAction(book("confirm")), true);
  assertEquals(isConfirmAction({ kind: "wrap_up", step: "confirm" }), true);
  assertEquals(isConfirmAction(book("ask")), false);
  assertEquals(isConfirmAction({ kind: "study_time_ask" }), false);
  assertEquals(isConfirmAction(null), false);
});
