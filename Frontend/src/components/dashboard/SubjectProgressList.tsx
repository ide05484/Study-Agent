import { useState } from 'react'
import type { SubjectProgress } from '../../hooks/useDashboard.ts'
import type { Subject } from '../../interfaces/subject.ts'
import { SUBJECT_LABELS } from '../../libs/subjects.ts'

// 과목별 가로 진도율 막대. 누르면 아코디언으로 남은 교재 목록이 펼쳐지며, 한 번에 한 과목만 연다
export default function SubjectProgressList({ items }: { items: SubjectProgress[] }) {
  const [openSubject, setOpenSubject] = useState<Subject | null>(null)

  return (
    <ul className="progress-list">
      {items.map((item) => {
        const open = openSubject === item.subject
        const label = SUBJECT_LABELS[item.subject]
        return (
          <li key={item.subject} className="progress-item">
            <button
              type="button"
              className="progress-row"
              aria-expanded={open}
              aria-controls={`progress-${item.subject}`}
              onClick={() => setOpenSubject(open ? null : item.subject)}
            >
              <span className="progress-label">{label}</span>
              <span
                className="progress-bar"
                role="progressbar"
                aria-label={`${label} 진도율`}
                aria-valuenow={item.percent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span className="progress-fill" style={{ width: `${item.percent}%` }} />
              </span>
              <span className="progress-percent">{item.percent}%</span>
              <span className={`chevron${open ? ' is-open' : ''}`} aria-hidden="true" />
            </button>
            {open && (
              <ul id={`progress-${item.subject}`} className="progress-detail">
                {item.remaining.map((book) => (
                  <li key={book.id}>
                    <span>{book.title}</span>
                    <span className="muted">
                      {book.current_page}/{book.total_pages}p
                    </span>
                  </li>
                ))}
                {item.remaining.length === 0 && (
                  <li className="muted">{item.hasBooks ? '남은 교재가 없어요. 잘하셨어요!' : '등록된 교재가 없어요.'}</li>
                )}
              </ul>
            )}
          </li>
        )
      })}
    </ul>
  )
}
