import { assertEquals } from "jsr:@std/assert";
import type { Intent } from "./analysis.ts";
import type { AskedAbout } from "./analysisPrompt.ts";
import { CHOICE_EXPIRED_TEXT } from "./bookDraft.ts";
import {
  appendWrapUp,
  expiredConfirmText,
  isWrapUpAsked,
  WRAP_UP_EXPIRED_TEXT,
  wrapUpYesText,
} from "./wrapUp.ts";

Deno.test("끝난 마무리 확인 문구", () => {
  assertEquals(WRAP_UP_EXPIRED_TEXT, "이 확인은 끝났어요.");
});

Deno.test("expiredConfirmText는 교재 칩만 교재 문구, 나머지는 공통 문구", () => {
  assertEquals(expiredConfirmText("book_add"), CHOICE_EXPIRED_TEXT);
  assertEquals(expiredConfirmText("wrap_up"), WRAP_UP_EXPIRED_TEXT);
  assertEquals(expiredConfirmText("study_time_ask"), WRAP_UP_EXPIRED_TEXT);
  assertEquals(expiredConfirmText(null), WRAP_UP_EXPIRED_TEXT);
});

Deno.test("isWrapUpAsked 진리표", () => {
  const ask = (
    wrapUp: boolean,
    intent: Intent,
    studyTimeAsk = false,
    asked: AskedAbout = null,
  ) => isWrapUpAsked({ wrapUp, intent, studyTimeAsk, asked });
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

Deno.test("isWrapUpAsked: 순공시간을 물은 데 답한 말에는 다시 묻지 않는다", () => {
  const ask = (intent: Intent, asked: AskedAbout) =>
    isWrapUpAsked({ wrapUp: true, intent, studyTimeAsk: false, asked });
  assertEquals(ask("study_time", "study_time"), false);
  assertEquals(ask("study_log", "study_time"), false);
  assertEquals(ask("study_time", "time_available"), true);
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
