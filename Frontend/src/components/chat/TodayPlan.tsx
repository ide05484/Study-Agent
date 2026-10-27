import { useState } from 'react'
import { Link } from 'react-router'
import { useTodayTasks } from '../../hooks/useTodayTasks.ts'
import type { DailyTaskWithBook } from '../../interfaces/study.ts'
import { SUBJECT_LABELS } from '../../libs/subjects.ts'
import { chevronClass } from '../ui/classes.ts'

function pagesLabel(task: DailyTaskWithBook): string {
  return task.start_page === task.end_page ? `${task.start_page}쪽` : `${task.start_page}–${task.end_page}쪽`
}

// 오늘 채팅방 상단에 고정되는 오늘의 분량. 채팅을 가리지 않도록 기본은 한 줄로 접혀 있고,
// 접힌 상태에서도 아직 안 한 첫 분량을 형광펜으로 보여준다
export default function TodayPlan({ date }: { date: string }) {
  const { tasks, error } = useTodayTasks(date)
  const [open, setOpen] = useState(false)

  if (error) return <p className="border-b border-line px-4 py-2.5 text-sm text-danger">오늘의 분량을 불러오지 못했어요.</p>
  if (!tasks) return null

  if (tasks.length === 0) {
    return (
      <p className="flex min-h-11 items-center justify-between gap-2 border-b border-line px-4 text-sm text-muted">
        오늘 배정된 분량이 없어요.
        <Link to="/settings" className="font-semibold text-accent">
          교재 추가하기
        </Link>
      </p>
    )
  }

  const done = tasks.filter((t) => t.status === 'done').length
  const next = tasks.find((t) => t.status !== 'done')

  return (
    <section className="border-b border-line">
      <button
        type="button"
        className="flex min-h-11 w-full items-center gap-3 px-4 text-left"
        aria-expanded={open}
        aria-controls="today-plan"
        onClick={() => setOpen(!open)}
      >
        <span className="shrink-0 text-sm font-bold">오늘의 분량</span>
        <span className="min-w-0 flex-1 truncate text-sm">
          {next ? (
            <>
              <span className="marker">
                {SUBJECT_LABELS[next.book.subject]} {pagesLabel(next)}
              </span>
              {tasks.length - done > 1 && <span className="text-muted"> 외 {tasks.length - done - 1}개</span>}
            </>
          ) : (
            <span className="text-muted">모두 끝냈어요</span>
          )}
        </span>
        <span className="shrink-0 text-xs text-muted tabular-nums">
          {done}/{tasks.length}
        </span>
        <span className={`${chevronClass} ${open ? '-rotate-135' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <ul id="today-plan" className="max-h-[40dvh] overflow-y-auto px-4 pb-3">
          {tasks.map((task) => {
            const finished = task.status === 'done'
            return (
              <li key={task.id} className="grid grid-cols-[64px_1fr_auto] items-baseline gap-2 py-1 text-sm">
                <span className="text-muted">{SUBJECT_LABELS[task.book.subject]}</span>
                <span className={`truncate ${finished ? 'text-muted line-through' : ''}`}>{task.book.title}</span>
                <span className={`tabular-nums ${finished ? 'text-muted line-through' : 'marker'}`}>
                  {pagesLabel(task)}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
