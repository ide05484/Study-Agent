import type { ChatAction } from '../interfaces/chat.ts'
import { diffDays } from './date.ts'

// 하루 첫 메시지. 서버를 거치지 않고 화면이 시험일로 바로 만든다
export const TIME_AVAILABLE_QUESTION = '오늘 공부할 수 있는 시간이 얼마나 되나요?'

// 날짜로 하나를 고른다. 같은 날은 같은 문장이고 하루씩 돌아간다
const CHEERS: readonly string[] = [
  '오늘도 같이 가요. 막히는 게 있으면 언제든 물어봐요.',
  '어제의 기록이 쌓여 있어요. 오늘도 한 칸만 더 채워 봐요.',
  '완벽한 하루보다 이어 가는 하루가 더 힘이 세요.',
  '처음 한 페이지만 펴 봐요. 시작하면 흐름이 따라와요.',
  '작은 하루가 모여 합격이 돼요. 오늘도 차근차근 가 봐요.',
  '쉬는 시간도 계획에 넣고, 집중할 때는 확실하게 해 봐요.',
  '꾸준함이 쌓이고 있어요. 오늘도 옆에서 같이 볼게요.',
]

const NO_EXAM_DATE = "시험일을 정하면 오늘 분량을 나눠 드려요. 메뉴의 '공부 설정 변경'에서 정할 수 있어요."
const AFTER_EXAM = '시험을 치르느라 정말 수고했어요. 이제 마음 편히 쉬어도 돼요.'
const EXAM_DAY = '드디어 시험 날이에요. 지금까지 쌓은 걸 믿고 차분하게 풀고 와요.'

function cheerOf(today: string): string {
  const index = diffDays('2000-01-01', today) % CHEERS.length
  return CHEERS[(index + CHEERS.length) % CHEERS.length]
}

// 시험까지 남은 날 + 응원 + 공부 가능 시간 질문. 질문이 있을 때만 action을 달아
// 다음 답("6시간")을 순공시간으로 읽지 않게 한다
export function welcomeText(today: string, examDate: string | null): { content: string; action: ChatAction | null } {
  if (examDate === null) return { content: `${NO_EXAM_DATE}\n\n${cheerOf(today)}`, action: null }
  const days = diffDays(today, examDate)
  if (days < 0) return { content: AFTER_EXAM, action: null }
  if (days === 0) return { content: EXAM_DAY, action: null }
  return {
    content: `시험까지 ${days}일 남았어요.\n\n${cheerOf(today)}\n\n${TIME_AVAILABLE_QUESTION}`,
    action: { kind: 'time_available_ask' },
  }
}
