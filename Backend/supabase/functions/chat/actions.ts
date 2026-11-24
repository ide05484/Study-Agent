// 코치 메시지에 붙는 action(칩·되묻기)의 타입과 검증. OpenAI·Supabase를 import하지 않는다.
import {
  type BookAddAction,
  isRecord,
  parseBookAddAction,
} from "./bookDraft.ts";

export interface WrapUpAction {
  kind: "wrap_up";
  step: "confirm";
}

export interface StudyTimeAskAction {
  kind: "study_time_ask";
}

export interface TimeAvailableAskAction {
  kind: "time_available_ask";
}

export type ChatAction =
  | BookAddAction
  | WrapUpAction
  | StudyTimeAskAction
  | TimeAvailableAskAction;

// 응/아니 칩으로 답하는 action
export type ConfirmAction =
  | (BookAddAction & { step: "confirm" })
  | WrapUpAction;

// DB jsonb는 믿지 않는다. 모르는 kind·틀린 모양은 null
export function parseAction(v: unknown): ChatAction | null {
  if (!isRecord(v)) return null;
  switch (v.kind) {
    case "book_add":
      return parseBookAddAction(v);
    case "wrap_up":
      return v.step === "confirm" ? { kind: "wrap_up", step: "confirm" } : null;
    case "study_time_ask":
      return { kind: "study_time_ask" };
    case "time_available_ask":
      return { kind: "time_available_ask" };
    default:
      return null;
  }
}

export function isConfirmAction(a: ChatAction | null): a is ConfirmAction {
  if (a === null) return false;
  return a.kind === "wrap_up" ||
    (a.kind === "book_add" && a.step === "confirm");
}

// 순공시간을 다시 묻는 답에 붙일 action. 초안이 없으면 숫자만 답해도 순공시간으로 읽게 되묻기를 붙인다.
// 받아 둔 교재 초안은 이어 가되, 확인 단계면 칩이 뜨지 않게 고치는 단계로 돌린다(응 한 번에 저장되지 않게)
export function studyTimeAskAction(held: BookAddAction | null): ChatAction {
  if (held === null) return { kind: "study_time_ask" };
  return held.step === "confirm" ? { ...held, step: "edit" } : held;
}
