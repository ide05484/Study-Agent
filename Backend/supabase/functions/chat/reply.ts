import {
  COACH_TONE_INSTRUCTIONS,
  HARD_TIMES_INSTRUCTIONS,
} from "../_shared/coach.ts";
import { type Subject, SUBJECT_LABELS } from "../_shared/subjects.ts";
import { formatMinutes } from "../_shared/units.ts";
import type { Intent, StudyTip } from "./analysis.ts";
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
  book_add:
    "교재 추가는 정해진 문구(되묻기·확인 칩)로 처리한다. 이 지침이 쓰이면 교재를 추가하려면 과목, 교재명, 단위와 총량을 말해 달라고 안내한다.",
  usage: "채팅 사용법을 짧게 안내한다.",
};

export interface ReplyOptions {
  savedStudyTime: string | null;
  hasKnowledge: boolean;
  hasTips: boolean;
  hardTimes: boolean;
  savedTip: StudyTip | null;
}

export function replyInstructions(
  intent: Intent,
  options: ReplyOptions,
): string {
  const parts = [COACH_TONE_INSTRUCTIONS, INTENT_INSTRUCTIONS[intent]];
  if (options.savedStudyTime) {
    parts.push(
      `이번 메시지로 순공시간을 적어 뒀다(${options.savedStudyTime}). 한 문장으로 알려 준다. 다른 날과 비교하지 않는다.`,
    );
  }
  if (options.hasKnowledge) {
    parts.push(
      "아래 공부법은 참고 자료다. 질문에 맞는 것 1~2개만 고르고, 통째로 옮기지 않는다. 출처나 강사 이름을 말하지 않는다.",
    );
  }
  if (options.hasTips) {
    parts.push(
      "이 수험생에게 잘 맞았던 방법이다. 맞으면 먼저 이걸 살려서 제안한다.",
    );
  }
  if (options.hardTimes) parts.push(HARD_TIMES_INSTRUCTIONS);
  if (options.savedTip) {
    parts.push(
      `이번 메시지의 방법을 '${
        tipPlace(options.savedTip.subject)
      }'에 적어 뒀다. 한 문장으로 알려 준다.`,
    );
  }
  return parts.join("\n\n");
}

// 잘 맞은 방법이 저장된 곳 이름. 과목이 없으면 그냥 "공부법"
function tipPlace(subject: Subject | null): string {
  return subject ? `${SUBJECT_LABELS[subject]} 공부법` : "공부법";
}

// 잘 맞은 방법을 저장했다는 정해진 문구
export function tipSavedReply(subject: Subject | null): string {
  return `잘 맞은 방법은 ${tipPlace(subject)}에 적어 뒀어요.`;
}

// "2026-11-13" → "11월 13일"
function monthDayLabel(date: string): string {
  const [, month, day] = date.split("-").map(Number);
  return `${month}월 ${day}일`;
}

// 답변 지침에 넘길 저장된 순공시간. 그날 합계라서 날짜를 함께 적는다("오늘 합계 4시간 20분")
export function savedStudyTimeLabel(
  totalMinutes: number,
  date: string,
  today: string,
): string {
  const day = date === today ? "오늘" : monthDayLabel(date);
  return `${day} 합계 ${formatMinutes(totalMinutes)}`;
}

// 답변 호출이 실패했을 때 쓰는 문구. 저장한 순공시간이 있으면 알려서 다시 보내지 않게 한다
// ("더"로 보낸 순공시간을 다시 보내면 두 번 더해진다)
export function fallbackReply(
  recorded: RecordedLog[],
  ctx: CoachContext,
  savedTime: { total: number; date: string } | null = null,
  savedTip: StudyTip | null = null,
): string {
  const tipNote = savedTip ? ` ${tipSavedReply(savedTip.subject)}` : "";
  if (recorded.length === 0) {
    if (savedTime || savedTip) {
      const saved = savedTime
        ? `${
          studyTimeReply(savedTime.total, savedTime.date, ctx.today)
        }${tipNote}`
        : tipSavedReply(savedTip!.subject);
      return `${saved} 질문 답변은 지금 만들지 못했어요. 잠시 후 다시 물어봐 주세요.`;
    }
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
  // 순공시간도 저장했으면 인사가 두 번 나오지 않게 한 문장으로 합친다
  if (savedTime) {
    const day = savedTime.date === ctx.today
      ? "오늘"
      : monthDayLabel(savedTime.date);
    progress.push(
      `${day} 순공 ${formatMinutes(savedTime.total)}도 적어 뒀어요`,
    );
  }
  return `기록했어요. ${progress.join(", ")}. 오늘도 수고했어요.${tipNote}`;
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
  const day = monthDayLabel(date);
  return `${day} 순공 ${time}으로 적어 뒀어요. 수고 많으셨어요.`;
}
