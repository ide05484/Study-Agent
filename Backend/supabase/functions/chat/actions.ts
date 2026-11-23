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
export type ConfirmAction = BookAddAction & { step: "confirm" } | WrapUpAction;

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
