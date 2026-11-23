// 공부 마무리 문구. OpenAI·Supabase를 import하지 않는 순수 모듈이다.
import { formatMinutes } from "../_shared/units.ts";
import type { StudyTimeAskAction, WrapUpAction } from "./actions.ts";
import type { Intent } from "./analysis.ts";

export const WRAP_UP_QUESTION = "오늘은 여기서 마무리할까요?";
export const WRAP_UP_NO_TEXT = "좋아요, 조금만 더 해 봐요. 화이팅!";
export const WRAP_UP_ACTION: WrapUpAction = {
  kind: "wrap_up",
  step: "confirm",
};

export function appendWrapUp(text: string): string {
  return `${text}\n\n${WRAP_UP_QUESTION}`;
}

// 교재 추가·사용법 답과, 순공시간을 되묻는 답에는 마무리를 묻지 않는다
export function shouldAskWrapUp(
  p: { wrapUp: boolean; intent: Intent; studyTimeAsk: boolean },
): boolean {
  if (!p.wrapUp || p.studyTimeAsk) return false;
  return p.intent !== "book_add" && p.intent !== "usage";
}

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
