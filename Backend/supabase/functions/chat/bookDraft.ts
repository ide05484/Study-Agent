// 교재 추가 초안의 순수 로직. OpenAI·Supabase를 import하지 않는다.
import { type Subject, SUBJECT_LABELS } from "../_shared/subjects.ts";
import {
  BOOK_UNITS,
  type BookUnit,
  rangeLabel,
  withUnit,
} from "../_shared/units.ts";
import type { BookRef } from "./analysis.ts";

export const MAX_CHAT_TOTAL_UNITS = 1000;
export const MAX_TITLE_LENGTH = 20;
export const MAX_TARGET_ROUNDS = 10;

export interface BookDraft {
  subject: Subject | null;
  title: string | null;
  unit: BookUnit | null;
  total_units: number | null;
  target_rounds: number;
}

// 분석이 돌려주는 모양. 말하지 않은 것은 null
export type BookPatch = { [K in keyof BookDraft]: BookDraft[K] | null };

export interface CompleteDraft {
  subject: Subject;
  title: string;
  unit: BookUnit;
  total_units: number;
  target_rounds: number;
}

export type BookAddStep = "ask" | "confirm" | "edit";

export interface BookAddAction {
  kind: "book_add";
  step: BookAddStep;
  draft: BookDraft;
}

// amount는 단위나 총량이 빠졌다는 뜻
export type MissingField = "subject" | "title" | "amount";

export type SaveOutcome =
  | {
    kind: "planned";
    today: { start_unit: number; end_unit: number } | null;
  }
  | { kind: "no_exam" }
  | { kind: "failed" };

export const EMPTY_DRAFT: BookDraft = {
  subject: null,
  title: null,
  unit: null,
  total_units: null,
  target_rounds: 1,
};

const STEPS: readonly BookAddStep[] = ["ask", "confirm", "edit"];

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function toSubject(v: unknown): Subject | null {
  return typeof v === "string" && Object.hasOwn(SUBJECT_LABELS, v)
    ? (v as Subject)
    : null;
}

export function toUnit(v: unknown): BookUnit | null {
  return BOOK_UNITS.find((u) => u === v) ?? null;
}

export function toTitle(v: unknown): string | null {
  if (typeof v !== "string") return null;
  // 안의 공백·줄바꿈도 한 칸으로 줄여 분석 지침과 books.title에 줄바꿈이 들어가지 않게 한다
  const t = v.replace(/\s+/g, " ").trim();
  return t.length >= 1 && t.length <= MAX_TITLE_LENGTH ? t : null;
}

export function toTotalUnits(v: unknown): number | null {
  return typeof v === "number" && Number.isInteger(v) && v >= 1 &&
      v <= MAX_CHAT_TOTAL_UNITS
    ? v
    : null;
}

export function toRounds(v: unknown): number | null {
  return typeof v === "number" && Number.isInteger(v) && v >= 1 &&
      v <= MAX_TARGET_ROUNDS
    ? v
    : null;
}

export function mergeDraft(
  base: BookDraft,
  patch: BookPatch | null,
): BookDraft {
  if (!patch) return { ...base };
  return {
    subject: patch.subject ?? base.subject,
    title: patch.title ?? base.title,
    unit: patch.unit ?? base.unit,
    total_units: patch.total_units ?? base.total_units,
    target_rounds: patch.target_rounds ?? base.target_rounds,
  };
}

export function missingFields(d: BookDraft): MissingField[] {
  const missing: MissingField[] = [];
  // completeDraft와 같은 검증기를 쓴다. 범위 밖 값은 빠진 것으로 보고 다시 묻는다
  if (!toSubject(d.subject)) missing.push("subject");
  if (!toTitle(d.title)) missing.push("title");
  if (!toUnit(d.unit) || toTotalUnits(d.total_units) === null) {
    missing.push("amount");
  }
  return missing;
}

export function completeDraft(d: BookDraft): CompleteDraft | null {
  const title = toTitle(d.title);
  const total_units = toTotalUnits(d.total_units);
  // 회독은 묻지 않는 항목이라 범위 밖이면 1로 본다
  const target_rounds = toRounds(d.target_rounds) ?? 1;
  const subject = toSubject(d.subject);
  const unit = toUnit(d.unit);
  if (!subject || !title || !unit || total_units === null) return null;
  return { subject, title, unit, total_units, target_rounds };
}

// DB jsonb는 믿지 않는다. 틀린 항목은 null(회독은 1)로 돌린다
export function parseBookAddAction(v: unknown): BookAddAction | null {
  if (!isRecord(v) || v.kind !== "book_add") return null;
  const step = STEPS.find((s) => s === v.step);
  if (!step) return null;
  const d = isRecord(v.draft) ? v.draft : {};
  return {
    kind: "book_add",
    step,
    draft: {
      subject: toSubject(d.subject),
      title: toTitle(d.title),
      unit: toUnit(d.unit),
      total_units: toTotalUnits(d.total_units),
      target_rounds: toRounds(d.target_rounds) ?? 1,
    },
  };
}

const YES_WORDS = new Set([
  "응",
  "어",
  "네",
  "넵",
  "예",
  "그래",
  "좋아",
  "맞아",
  "ㅇㅇ",
  "ㅇㅋ",
  "오케이",
  "추가해줘",
  "네추가해줘",
  "응추가해줘",
]);
const NO_WORDS = new Set(["아니", "아니요", "아니야", "아뇨", "노", "ㄴㄴ"]);

// 공백과 문장부호를 지우고 확답 목록과 정확히 같을 때만 답으로 본다
export function confirmAnswer(text: string): "yes" | "no" | null {
  const t = text.replace(/[\s.,!?~…]/g, "");
  if (YES_WORDS.has(t)) return "yes";
  if (NO_WORDS.has(t)) return "no";
  return null;
}

export function isDuplicateTitle(d: CompleteDraft, books: BookRef[]): boolean {
  const title = d.title.trim();
  return books.some((b) => b.subject === d.subject && b.title.trim() === title);
}

const ASK_LINES: Record<MissingField, string> = {
  subject: "어느 과목 교재인가요?",
  title:
    `교재 이름을 ${MAX_TITLE_LENGTH}자 안으로 알려 주세요. 예) 보건행정 기본서`,
  amount: "어떤 단위로 모두 몇 개인지 알려 주세요. 예) 20회분, 12챕터, Day 30",
};

export function askText(d: BookDraft, missing: MissingField[]): string {
  let first = "교재를 추가할게요.";
  if (d.title) {
    const label = d.subject ? `${SUBJECT_LABELS[d.subject]} ` : "";
    first = `${label}「${d.title}」 교재를 추가할게요.`;
  }
  return `${first}\n\n${missing.map((m) => ASK_LINES[m]).join("\n")}`;
}

export function confirmText(d: CompleteDraft, duplicate: boolean): string {
  const text = `이렇게 추가할까요?\n${
    SUBJECT_LABELS[d.subject]
  } · ${d.title} · ${withUnit(d.unit, d.total_units)} · ${d.target_rounds}회독`;
  return duplicate ? `${text}\n같은 이름의 교재가 이미 있어요.` : text;
}

export const EDIT_TEXT = "어떤 걸 고칠까요? 예) 3회독이야, 30회분이야";

export const CHOICE_EXPIRED_TEXT =
  "이 확인은 끝났어요. 추가할 교재를 다시 말해 주세요.";

export function savedText(d: CompleteDraft, outcome: SaveOutcome): string {
  const first = `${SUBJECT_LABELS[d.subject]} 「${d.title}」 ${
    withUnit(d.unit, d.total_units)
  }, ${d.target_rounds}회독을 추가했어요.`;
  switch (outcome.kind) {
    case "planned": {
      const base = "시험 전날까지 분량을 다시 나눴어요.";
      const second = outcome.today
        ? `${base} 오늘은 ${
          rangeLabel(d.unit, outcome.today.start_unit, outcome.today.end_unit)
        }예요.`
        : base;
      return `${first}\n\n${second}`;
    }
    case "no_exam":
      return `${first}\n\n시험일을 정하면 분량을 나눠 드려요. 메뉴의 '공부 설정 변경'에서 정할 수 있어요.`;
    case "failed":
      return first;
  }
}
