import type { MockExam } from '../../interfaces/mockExam.ts'
import { formatFullDate } from '../../libs/date.ts'
import { EXAM_KIND_LABELS, scoresLabel } from '../../libs/exams.ts'

interface ExamScoreListProps {
  exams: MockExam[]
  onRemove: (id: string) => void
}

// 시험 점수 목록. 첫 줄은 구분·이름과 응시일, 둘째 줄은 과목별 점수
export default function ExamScoreList({ exams, onRemove }: ExamScoreListProps) {
  return (
    <ul className="divide-y divide-line">
      {exams.map((exam) => (
        <li key={exam.id} className="flex items-center gap-2 py-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="min-w-0 truncate">
                {EXAM_KIND_LABELS[exam.kind]} · {exam.name}
              </span>
              <span className="shrink-0 text-sm text-muted tabular-nums">{formatFullDate(exam.taken_on)}</span>
            </div>
            <p className="text-sm tabular-nums">{scoresLabel(exam.scores)}</p>
          </div>
          <button
            type="button"
            className="grid size-11 shrink-0 place-items-center rounded-xl text-muted"
            aria-label={`${exam.name} 삭제`}
            onClick={() => {
              if (window.confirm(`'${exam.name}' 점수를 삭제할까요?`)) onRemove(exam.id)
            }}
          >
            ✕
          </button>
        </li>
      ))}
    </ul>
  )
}
