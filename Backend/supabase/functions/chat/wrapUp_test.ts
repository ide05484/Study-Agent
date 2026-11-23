import { assertEquals } from "jsr:@std/assert";
import type { Intent } from "./analysis.ts";
import { appendWrapUp, shouldAskWrapUp, wrapUpYesText } from "./wrapUp.ts";

Deno.test("shouldAskWrapUp 진리표", () => {
  const ask = (wrapUp: boolean, intent: Intent, studyTimeAsk = false) =>
    shouldAskWrapUp({ wrapUp, intent, studyTimeAsk });
  assertEquals(ask(false, "study_log"), false);
  assertEquals(ask(true, "book_add"), false);
  assertEquals(ask(true, "usage"), false);
  assertEquals(ask(true, "study_log", true), false);
  for (
    const i of ["study_log", "question", "study_time", "schedule"] as const
  ) {
    assertEquals(ask(true, i), true);
  }
});

Deno.test("appendWrapUp은 빈 줄 뒤에 질문을 붙인다", () => {
  assertEquals(appendWrapUp("a"), "a\n\n오늘은 여기서 마무리할까요?");
});

Deno.test("wrapUpYesText", () => {
  assertEquals(wrapUpYesText({ minutes: 240, done: 3, total: 3 }), {
    text: "오늘 순공 4시간, 분량 3개 중 3개 끝냈어요. 푹 쉬고 내일 봐요.",
    action: null,
  });
  assertEquals(wrapUpYesText({ minutes: 240, done: 0, total: 0 }), {
    text: "오늘 순공 4시간. 푹 쉬고 내일 봐요.",
    action: null,
  });
  assertEquals(wrapUpYesText({ minutes: null, done: 0, total: 0 }), {
    text: "오늘도 수고했어요.\n\n오늘 순공시간은 얼마나 됐나요?",
    action: { kind: "study_time_ask" },
  });
});
