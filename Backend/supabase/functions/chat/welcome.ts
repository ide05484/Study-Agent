// 하루 첫 메시지 문구. OpenAI·Supabase를 import하지 않는 순수 모듈이다.
import { diffDays } from "../_shared/date.ts";
import { taskRangeLabel } from "../_shared/units.ts";
import type { TimeAvailableAskAction } from "./actions.ts";
import type { TodayTaskLine } from "./context.ts";

export const TIME_AVAILABLE_QUESTION =
  "오늘 공부할 수 있는 시간이 얼마나 되나요?";

// 날짜로 하나를 고른다. 같은 날은 같은 문장이고 하루씩 돌아간다
export const CHEERS: readonly string[] = [
  "하나씩 끝내고 알려 주세요. 오늘도 같이 가요!",
  "어제의 기록이 쌓여 있어요. 오늘도 한 칸만 더 채워 봐요.",
  "완벽한 하루보다 이어 가는 하루가 더 힘이 세요.",
  "처음 한 페이지만 펴 봐요. 시작하면 흐름이 따라와요.",
  "오늘 분량을 끝내는 것만으로 충분히 앞서가고 있어요.",
  "쉬는 시간도 계획에 넣고, 집중할 때는 확실하게 해 봐요.",
  "꾸준함이 쌓이고 있어요. 오늘도 옆에서 같이 볼게요.",
];

// 한 번에 보여 줄 분량 수. 넘으면 " 외 k개"
export const MAX_LISTED_TASKS = 4;

const NO_EXAM_DATE =
  "시험일을 정하면 오늘 분량을 나눠 드려요. 메뉴의 '공부 설정 변경'에서 정할 수 있어요.";
const AFTER_EXAM =
  "시험을 치르느라 정말 수고했어요. 이제 마음 편히 쉬어도 돼요.";
const EXAM_DAY =
  "드디어 시험 날이에요. 지금까지 쌓은 걸 믿고 차분하게 풀고 와요.";
const REST_OK = "오늘은 쉬어도 괜찮아요. 푹 쉬고 내일 또 봐요.";

export interface WelcomeInput {
  today: string;
  examDate: string | null;
  tasks: TodayTaskLine[];
}

function cheerOf(today: string): string {
  const index = diffDays("2000-01-01", today) % CHEERS.length;
  return CHEERS[(index + CHEERS.length) % CHEERS.length];
}

function taskLine(tasks: TodayTaskLine[]): string {
  const listed = tasks.slice(0, MAX_LISTED_TASKS).map((t) =>
    `${t.title} ${
      taskRangeLabel(t.target_rounds, t.round, t.unit, t.start_unit, t.end_unit)
    }`
  ).join(", ");
  const rest = tasks.length - MAX_LISTED_TASKS;
  return rest > 0 ? `${listed} 외 ${rest}개` : listed;
}

export function welcomeText(
  i: WelcomeInput,
): { text: string; action: TimeAvailableAskAction | null } {
  const cheer = cheerOf(i.today);
  if (i.examDate === null) {
    return { text: `${NO_EXAM_DATE}\n\n${cheer}`, action: null };
  }
  const n = diffDays(i.today, i.examDate);
  if (n < 0) return { text: AFTER_EXAM, action: null };
  if (n === 0) return { text: EXAM_DAY, action: null };
  const head = `시험까지 ${n}일 남았어요.`;
  if (i.tasks.length === 0) {
    return {
      text: `${head} 오늘은 배정된 분량이 없어요.\n\n${REST_OK}`,
      action: null,
    };
  }
  return {
    text: `${head} 오늘 분량이에요: ${
      taskLine(i.tasks)
    }.\n\n${cheer}\n\n${TIME_AVAILABLE_QUESTION}`,
    action: { kind: "time_available_ask" },
  };
}
