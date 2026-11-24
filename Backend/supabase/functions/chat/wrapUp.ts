// 공부 마무리 문구. OpenAI·Supabase를 import하지 않는 순수 모듈이다.
import { formatMinutes } from "../_shared/units.ts";
import type {
  ChatAction,
  StudyTimeAskAction,
  WrapUpAction,
} from "./actions.ts";
import type { Intent } from "./analysis.ts";
import type { AskedAbout } from "./analysisPrompt.ts";
import { CHOICE_EXPIRED_TEXT } from "./bookDraft.ts";

export const WRAP_UP_QUESTION = "오늘은 여기서 마무리할까요?";
export const WRAP_UP_NO_TEXT = "좋아요, 조금만 더 해 봐요. 화이팅!";
// 이미 답했거나 뒤에 다른 메시지가 온 마무리 칩
export const WRAP_UP_EXPIRED_TEXT = "이 확인은 끝났어요.";

// 끝난 칩의 문구. 교재 칩만 교재를 다시 말해 달라고 하고, 종류를 모르면 공통 문구다
export function expiredConfirmText(kind: ChatAction["kind"] | null): string {
  return kind === "book_add" ? CHOICE_EXPIRED_TEXT : WRAP_UP_EXPIRED_TEXT;
}
export const WRAP_UP_ACTION: WrapUpAction = {
  kind: "wrap_up",
  step: "confirm",
};

export function appendWrapUp(text: string): string {
  return `${text}\n\n${WRAP_UP_QUESTION}`;
}

// 교재 추가·사용법 답과, 순공시간을 되묻는 답에는 마무리를 묻지 않는다.
// 마무리 응 뒤 순공시간을 물은 데 답한 말(asked가 study_time)도 이미 마무리했으니 다시 묻지 않는다
export function isWrapUpAsked(
  p: {
    wrapUp: boolean;
    intent: Intent;
    studyTimeAsk: boolean;
    asked: AskedAbout;
  },
): boolean {
  if (!p.wrapUp || p.studyTimeAsk || p.asked === "study_time") return false;
  return p.intent !== "book_add" && p.intent !== "usage";
}

// total이 0이면 분량 문장을 뺀다(새벽에 전날을 마무리할 때도 0을 넘긴다)
export function wrapUpYesText(
  p: { minutes: number | null; done: number; total: number },
): { text: string; action: StudyTimeAskAction | null } {
  if (p.minutes === null) {
    return {
      text: "오늘도 수고했어요.\n\n오늘 순공시간은 얼마나 됐나요?",
      action: { kind: "study_time_ask" },
    };
  }
  const plan = p.total > 0 ? `, 분량 ${p.total}개 중 ${p.done}개 끝냈어요` : "";
  return {
    text: `오늘 순공 ${formatMinutes(p.minutes)}${plan}. 푹 쉬고 내일 봐요.`,
    action: null,
  };
}
