import { COACH_TONE_INSTRUCTIONS } from "../_shared/coach.ts";
import { type Subject, SUBJECT_LABELS } from "../_shared/subjects.ts";
import { formatMinutes } from "../_shared/units.ts";
import type { Intent } from "./analysis.ts";
import { type CoachContext, subjectPercents } from "./context.ts";

// 답변 지침과 정해진 문구. OpenAI·Supabase를 import하지 않는 순수 모듈이다.

export interface RecordedLog {
  subject: Subject;
  title: string | null;
}

const INTENT_INSTRUCTIONS: Record<Intent, string> = {
  study_log:
    "방금 저장한 학습 기록을 확인해 주고, 그 과목의 진도율과 과목 간 균형을 한 번 짚는다. 계획을 다시 나눴다고 말하지 않는다.",
  schedule:
    "분량 조정은 아직 할 수 없으니 오늘 분량 중 먼저 할 것만 제안하고, 조정했다고 말하지 않는다.",
  question:
    "과목과 고민을 짚고, 컨텍스트의 기록과 점수를 근거로 공부법 1~2개와 멘탈 케어를 함께 준다.",
  // 아래 intent는 답변 호출 없이 정해진 문구로 답하지만, 타입을 채우려고 둔다
  study_time: "순공시간을 적어 뒀다고 알려 주고 짧게 격려한다.",
  book_add: "교재 추가는 공부 설정 변경 메뉴에서 할 수 있다고 안내한다.",
  usage: "채팅 사용법을 짧게 안내한다.",
};

export function replyInstructions(
  intent: Intent,
  savedStudyTime: string | null,
): string {
  const parts = [COACH_TONE_INSTRUCTIONS, INTENT_INSTRUCTIONS[intent]];
  if (savedStudyTime) {
    parts.push(
      `이번 메시지의 순공시간 ${savedStudyTime}을 적어 뒀다고 한 문장으로 알려 준다. 다른 날과 비교하지 않는다.`,
    );
  }
  return parts.join("\n\n");
}

// 답변 호출이 실패했을 때 쓰는 문구
export function fallbackReply(
  recorded: RecordedLog[],
  ctx: CoachContext,
): string {
  if (recorded.length === 0) {
    return "지금은 답변을 만들지 못했어요. 잠시 후 다시 보내주세요.";
  }
  const percents = subjectPercents(ctx.books);
  const subjects = [...new Set(recorded.map((r) => r.subject))];
  const progress = subjects.map((s) => {
    const percent = percents[s];
    return percent === undefined
      ? SUBJECT_LABELS[s]
      : `${SUBJECT_LABELS[s]} 진도 ${percent}%`;
  });
  return `기록했어요. ${progress.join(", ")}. 오늘도 수고했어요.`;
}

// 순공시간만 보낸 메시지에 대한 정해진 답
export function studyTimeReply(
  totalMinutes: number,
  date: string,
  today: string,
): string {
  const time = formatMinutes(totalMinutes);
  if (date === today) {
    return `오늘 순공 ${time}으로 적어 뒀어요. 오늘도 수고 많으셨어요.`;
  }
  const [, month, day] = date.split("-").map(Number);
  return `${month}월 ${day}일 순공 ${time}으로 적어 뒀어요. 수고 많으셨어요.`;
}
