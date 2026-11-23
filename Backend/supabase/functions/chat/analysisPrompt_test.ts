import { assertEquals, assertStringIncludes } from "jsr:@std/assert";
import { analysisInstructions, bundleInput } from "./analysisPrompt.ts";

Deno.test("bundleInput: 하나면 그대로, 둘 이상이면 번호를 붙인다", () => {
  assertEquals(bundleInput(["a"]), "a");
  assertEquals(
    bundleInput(["국어 2챕터", "아, 3개"]),
    "1. 국어 2챕터\n2. 아, 3개",
  );
});

Deno.test("bundleInput: 최근 10개까지만 쓴다", () => {
  const all = Array.from({ length: 11 }, (_, i) => `m${i + 1}`);
  const lines = bundleInput(all).split("\n");
  assertEquals(lines.length, 10);
  assertEquals(lines[0], "1. m2");
  assertEquals(lines[9], "10. m11");
});

Deno.test("bundleInput: 4000자를 넘으면 뒤에서부터 채워 앞 메시지가 빠진다", () => {
  const long = "가".repeat(2500);
  const out = bundleInput([long, "중간", long.slice(0, 1500)]);
  assertEquals(out.includes(long), false);
  assertStringIncludes(out, "중간");
  assertEquals(out.length <= 4000, true);
});

const args = ["2026-11-23", null] as const;

Deno.test("analysisInstructions: asked에 따라 직전 질문 지침", () => {
  const tA = analysisInstructions([], args[0], null, "time_available", false);
  assertStringIncludes(tA, "study_time이 아니다");
  assertEquals(tA.includes("순공시간이다"), false);
  const sT = analysisInstructions([], args[0], null, "study_time", false);
  assertStringIncludes(sT, "순공시간이다");
  assertEquals(sT.includes("study_time이 아니다"), false);
  const none = analysisInstructions([], args[0], null, null, false);
  assertEquals(none.includes("study_time이 아니다"), false);
  assertEquals(none.includes("순공시간이다"), false);
});

Deno.test("analysisInstructions: bundled일 때만 묶음 지침", () => {
  const on = analysisInstructions([], args[0], null, null, true);
  assertStringIncludes(on, "뒤 메시지가 앞 메시지를 고치거나 덧붙인다");
  const off = analysisInstructions([], args[0], null, null, false);
  assertEquals(
    off.includes("뒤 메시지가 앞 메시지를 고치거나 덧붙인다"),
    false,
  );
});

Deno.test("analysisInstructions: wrap_up 설명이 들어간다", () => {
  assertStringIncludes(
    analysisInstructions([], args[0], null, null, false),
    "wrap_up",
  );
});
