import { useRef, type KeyboardEvent } from 'react'
import type { Subject } from '../../interfaces/subject.ts'
import { SUBJECT_LABELS, SUBJECTS } from '../../libs/subjects.ts'

// exams: 시험별 블록, 과목: 그 과목 점수 꺾은선
export type ScoreView = 'exams' | Subject

interface ScoreTabsProps {
  value: ScoreView
  onChange: (view: ScoreView) => void
  idPrefix: string // 탭 id는 `${idPrefix}-tab-${view}`, 패널 id는 `${idPrefix}-panel`
}

const VIEWS: ScoreView[] = ['exams', ...SUBJECTS]
const TAB_CLASS = {
  selected: 'border-accent font-bold text-fg',
  idle: 'border-transparent text-muted hover:text-fg',
} as const

function scoreViewLabel(view: ScoreView): string {
  return view === 'exams' ? '시험별' : SUBJECT_LABELS[view]
}

// 시험 점수 보기 탭. 고른 탭은 아래 accent 줄. 왼쪽·오른쪽 화살표, Home·End로 옮기면 바로 바뀐다
export default function ScoreTabs({ value, onChange, idPrefix }: ScoreTabsProps) {
  const listRef = useRef<HTMLDivElement>(null)

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const current = VIEWS.indexOf(value)
    let next: number
    if (e.key === 'ArrowRight') next = (current + 1) % VIEWS.length
    else if (e.key === 'ArrowLeft') next = (current - 1 + VIEWS.length) % VIEWS.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = VIEWS.length - 1
    else return
    e.preventDefault()
    onChange(VIEWS[next])
    listRef.current?.querySelector<HTMLButtonElement>(`#${idPrefix}-tab-${VIEWS[next]}`)?.focus()
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label="점수 보기"
      className="flex border-b border-line"
      onKeyDown={handleKeyDown}
    >
      {VIEWS.map((view) => {
        const selected = view === value
        return (
          <button
            key={view}
            id={`${idPrefix}-tab-${view}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel`}
            tabIndex={selected ? 0 : -1}
            className={`-mb-px min-h-11 flex-1 border-b-2 px-0.5 text-sm whitespace-nowrap ${TAB_CLASS[selected ? 'selected' : 'idle']}`}
            onClick={() => onChange(view)}
          >
            {scoreViewLabel(view)}
          </button>
        )
      })}
    </div>
  )
}
