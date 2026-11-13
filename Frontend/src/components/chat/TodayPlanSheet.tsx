import { Link } from 'react-router'
import type { DailyTaskWithBook } from '../../interfaces/study.ts'
import { taskLabel } from '../../libs/books.ts'
import { SUBJECT_LABELS } from '../../libs/subjects.ts'
import Modal from '../ui/Modal.tsx'
import Notice from '../ui/Notice.tsx'

interface TodayPlanSheetProps {
  open: boolean
  onClose: () => void
  tasks: DailyTaskWithBook[]
  savingIds: ReadonlySet<string>
  toggleError: string | null
  onToggle: (taskId: string, done: boolean) => void
}

// 오늘의 분량 전체를 체크박스로 보여주는 아래 시트
export default function TodayPlanSheet({
  open,
  onClose,
  tasks,
  savingIds,
  toggleError,
  onToggle,
}: TodayPlanSheetProps) {
  const done = tasks.filter((t) => t.status === 'done').length

  return (
    <Modal
      open={open}
      onClose={onClose}
      variant="sheet"
      title="오늘의 분량"
      titleAside={
        <span className="tabular-nums">
          {done}/{tasks.length}
        </span>
      }
    >
      {toggleError && (
        <div className="pb-2">
          <Notice tone="error">{toggleError}</Notice>
        </div>
      )}
      {tasks.length === 0 ? (
        <div className="flex min-h-14 items-center justify-between gap-2">
          <Notice>오늘 배정된 분량이 없어요.</Notice>
          <Link to="/settings" className="font-semibold text-accent" onClick={onClose}>
            교재 추가하기
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {tasks.map((task) => {
            const finished = task.status === 'done'
            return (
              <li key={task.id}>
                <label className="flex min-h-14 items-center gap-3 py-2">
                  <input
                    type="checkbox"
                    className="size-6 shrink-0 accent-accent"
                    checked={finished}
                    disabled={savingIds.has(task.id)}
                    onChange={(e) => onToggle(task.id, e.target.checked)}
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-xs text-muted">{SUBJECT_LABELS[task.book.subject]}</span>
                    <span className={`truncate text-base ${finished ? 'text-muted line-through' : ''}`}>
                      {task.book.title}
                    </span>
                  </span>
                  <span className="shrink-0 text-right tabular-nums">
                    <span className={finished ? 'text-muted line-through' : 'marker font-bold'}>{taskLabel(task)}</span>
                    {task.status === 'partial' && <span className="ml-1 text-xs text-muted">일부</span>}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      )}
    </Modal>
  )
}
