import { assertEquals } from "jsr:@std/assert";
import {
  askText,
  type BookDraft,
  type CompleteDraft,
  completeDraft,
  confirmAnswer,
  confirmText,
  EDIT_TEXT,
  EMPTY_DRAFT,
  isDuplicateTitle,
  mergeDraft,
  missingFields,
  savedText,
  toTitle,
} from "./bookDraft.ts";
import type { BookRef } from "./analysis.ts";

const complete: CompleteDraft = {
  subject: "korean",
  title: "봉투모의고사",
  unit: "session",
  total_units: 20,
  target_rounds: 1,
};

Deno.test("mergeDraft: patch의 null 아닌 값만 덮어쓴다", () => {
  const base: BookDraft = {
    ...EMPTY_DRAFT,
    subject: "korean",
    title: "봉투모의고사",
  };
  const merged = mergeDraft(base, {
    subject: null,
    title: null,
    unit: "session",
    total_units: 20,
    target_rounds: null,
  });
  assertEquals(merged, {
    subject: "korean",
    title: "봉투모의고사",
    unit: "session",
    total_units: 20,
    target_rounds: 1,
  });
  assertEquals(mergeDraft(base, null), base);
});

Deno.test("missingFields: 순서와 amount", () => {
  assertEquals(missingFields(EMPTY_DRAFT), ["subject", "title", "amount"]);
  assertEquals(missingFields({ ...EMPTY_DRAFT, unit: "day" }), [
    "subject",
    "title",
    "amount",
  ]);
  assertEquals(
    missingFields({
      ...EMPTY_DRAFT,
      subject: "korean",
      title: "a",
      unit: "day",
      total_units: 3,
    }),
    [],
  );
});

Deno.test("completeDraft: 범위 밖이면 null", () => {
  assertEquals(completeDraft({ ...complete, title: "가".repeat(21) }), null);
  assertEquals(completeDraft({ ...complete, total_units: 1001 }), null);
  assertEquals(completeDraft({ ...complete, target_rounds: 11 }), {
    ...complete,
    target_rounds: 1,
  });
  assertEquals(completeDraft({ ...complete, subject: null } as never), null);
  assertEquals(completeDraft(complete), complete);
});

Deno.test("confirmAnswer", () => {
  for (const t of ["응", "네!", " 추가해 줘~ ", "ㅇㅇ"]) {
    assertEquals(confirmAnswer(t), "yes");
  }
  assertEquals(confirmAnswer("아니요."), "no");
  for (const t of ["아니 3회독이야", "응 근데 3회독", "좋아요 고마워"]) {
    assertEquals(confirmAnswer(t), null);
  }
});

Deno.test("askText", () => {
  assertEquals(
    askText({ ...EMPTY_DRAFT, subject: "korean", title: "봉투모의고사" }, [
      "amount",
    ]),
    "국어 「봉투모의고사」 교재를 추가할게요.\n\n어떤 단위로 모두 몇 개인지 알려 주세요. 예) 20회분, 12챕터, Day 30",
  );
  assertEquals(
    askText({ ...EMPTY_DRAFT, title: "봉투모의고사" }, ["subject"]),
    "「봉투모의고사」 교재를 추가할게요.\n\n어느 과목 교재인가요?",
  );
  assertEquals(
    askText(EMPTY_DRAFT, ["subject", "title", "amount"]),
    "교재를 추가할게요.\n\n어느 과목 교재인가요?\n교재 이름을 20자 안으로 알려 주세요. 예) 보건행정 기본서\n어떤 단위로 모두 몇 개인지 알려 주세요. 예) 20회분, 12챕터, Day 30",
  );
});

Deno.test("confirmText", () => {
  const base = "이렇게 추가할까요?\n국어 · 봉투모의고사 · 20회 · 1회독";
  assertEquals(confirmText(complete, false), base);
  assertEquals(
    confirmText(complete, true),
    base + "\n같은 이름의 교재가 이미 있어요.",
  );
  assertEquals(
    confirmText({ ...complete, unit: "day", total_units: 60 }, false),
    "이렇게 추가할까요?\n국어 · 봉투모의고사 · Day 60 · 1회독",
  );
});

Deno.test("고정 문구", () => {
  assertEquals(EDIT_TEXT, "어떤 걸 고칠까요? 예) 3회독이야, 30회분이야");
});

Deno.test("savedText", () => {
  const first = "국어 「봉투모의고사」 20회, 3회독을 추가했어요.";
  const d = { ...complete, target_rounds: 3 };
  assertEquals(
    savedText(d, { kind: "planned", today: { start_unit: 1, end_unit: 2 } }),
    first +
      "\n\n시험 전날까지 분량을 다시 나눴어요. 오늘은 1–2회예요.",
  );
  assertEquals(
    savedText(d, { kind: "planned", today: null }),
    first + "\n\n시험 전날까지 분량을 다시 나눴어요.",
  );
  assertEquals(
    savedText(d, { kind: "no_exam" }),
    first +
      "\n\n시험일을 정하면 분량을 나눠 드려요. 메뉴의 '공부 설정 변경'에서 정할 수 있어요.",
  );
  assertEquals(savedText(d, { kind: "failed" }), first);
});

Deno.test("isDuplicateTitle", () => {
  const books = [
    { subject: "korean", title: "봉투모의고사" },
  ] as BookRef[];
  assertEquals(
    isDuplicateTitle({ ...complete, title: " 봉투모의고사 " }, books),
    true,
  );
  assertEquals(
    isDuplicateTitle({ ...complete, subject: "english" }, books),
    false,
  );
});

Deno.test("missingFields: 범위 밖 값은 빠진 것, completeDraft와 어긋나지 않는다", () => {
  const long = { ...complete, title: "가".repeat(21) };
  assertEquals(missingFields(long), ["title"]);
  const many = { ...complete, total_units: 1500 };
  assertEquals(missingFields(many), ["amount"]);
  const rounds = { ...complete, target_rounds: 11 };
  assertEquals(missingFields(rounds), []);
  assertEquals(completeDraft(rounds)?.target_rounds, 1);
});

Deno.test("toTitle: 안의 공백·줄바꿈은 한 칸으로", () => {
  assertEquals(toTitle("봉투\n모의고사"), "봉투 모의고사");
  assertEquals(toTitle("  봉투 \t\n  모의고사 "), "봉투 모의고사");
  assertEquals(toTitle("  \n "), null);
});
