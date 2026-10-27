import { useState } from 'react'
import type { SubjectProgress } from '../../hooks/useDashboard.ts'
import type { Subject } from '../../interfaces/subject.ts'
import { SUBJECT_LABELS } from '../../libs/subjects.ts'
import { chevronClass } from '../ui/classes.ts'

// 과목별 가로 진도율 막대. 누르면 아코디언으로 남은 교재 목록이 펼쳐지며, 한 번에 한 과목만 연다
export default function SubjectProgressList({ items }: { items: SubjectProgress[] }) {
  const [openSubject, setOpenSubject] = useState<Subject | null>(null)

  return (
    <ul className="divide-y divide-line">
      {items.map((item) => {
        const open = openSubject === item.subject
        const label = SUBJECT_LABELS[item.subject]
        return (
          <li key={item.subject}>
            <button
              type="button"
              className="grid min-h-13 w-full grid-cols-[64px_1fr_40px_12px] items-center gap-3 px-1 text-left"
              aria-expanded={open}
              aria-controls={`progress-${item.subject}`}
              onClick={() => setOpenSubject(open ? null : item.subject)}
            >
              <span className="font-semibold">{label}</span>
              <span
                className="h-2 overflow-hidden rounded bg-line"
                role="progressbar"
                aria-label={`${label} 진도율`}
                aria-valuenow={item.percent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span className="block h-full rounded bg-accent" style={{ width: `${item.percent}%` }} />
              </span>
              <span className="text-right text-sm tabular-nums">{item.percent}%</span>
              <span className={`${chevronClass} ${open ? '-rotate-135' : ''}`} aria-hidden="true" />
            </button>
            {open && (
              <ul id={`progress-${item.subject}`} className="mb-3 ml-1 border-l-2 border-line pl-3">
                {item.remaining.map((book) => (
                  <li key={book.id} className="flex justify-between gap-2 py-1">
                    <span>{book.title}</span>
                    <span className="text-sm text-muted tabular-nums">
                      {book.current_page}/{book.total_pages}쪽
                    </span>
                  </li>
                ))}
                {item.remaining.length === 0 && (
                  <li className="py-1 text-sm text-muted">
                    {item.hasBooks ? '남은 교재가 없어요. 잘하셨어요!' : '등록된 교재가 없어요.'}
                  </li>
                )}
              </ul>
            )}
          </li>
        )
      })}
    </ul>
  )
}
