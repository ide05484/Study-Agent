import type { DailyTaskWithBook } from '../../interfaces/study.ts'
import Chevron from '../ui/Chevron.tsx'

interface TodayPlanButtonProps {
  tasks: DailyTaskWithBook[] | null
  error: string | null
  onOpen: () => void
  onRetry: () => void
}

// 입력창 위에 떠 있는 오늘의 분량 버튼. 불러오는 중(tasks가 null이고 오류 없음)에는 그리지 않는다
export default function TodayPlanButton({ tasks, error, onOpen, onRetry }: TodayPlanButtonProps) {
  if (tasks === null && !error) return null

  let content
  if (tasks === null) {
    content = <span className="text-danger">오늘의 분량을 불러오지 못했어요</span>
  } else if (tasks.length === 0) {
    content = <span className="text-muted">오늘 배정된 분량이 없어요</span>
  } else {
    const done = tasks.filter((t) => t.status === 'done').length
    content =
      done === tasks.length ? (
        <span>오늘의 분량 다 했어요 ✓</span>
      ) : (
        <span>
          오늘의 분량{' '}
          <span className="marker font-bold tabular-nums">
            {done}/{tasks.length}
          </span>
        </span>
      )
  }

  return (
    <button
      type="button"
      className="flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm"
      onClick={tasks === null ? onRetry : onOpen}
    >
      {content}
      {tasks !== null && <Chevron direction="right" />}
    </button>
  )
}
