import type { MockExam } from '../../interfaces/mockExam.ts'
import { formatFullDate } from '../../libs/date.ts'
import { EXAM_KIND_LABELS, examTotal, subjectScores } from '../../libs/exams.ts'

interface ExamScoreListProps {
  exams: MockExam[]
}

// 시험 점수 블록 목록(두 열). 시험마다 이름·구분·응시일, 총점 원형 게이지, 과목별 점수 표를 둔다
export default function ExamScoreList({ exams }: ExamScoreListProps) {
  return (
    <ul className="grid grid-cols-2 gap-3">
      {exams.map((exam) => {
        const { total, max } = examTotal(exam.scores)
        return (
          <li
            key={exam.id}
            className="flex min-w-0 flex-col items-center rounded-2xl border border-line p-3 text-center"
          >
            <p className="w-full truncate font-bold">{exam.name}</p>
            <p className="text-xs text-muted">{EXAM_KIND_LABELS[exam.kind]}</p>
            <p className="text-xs text-muted tabular-nums">{formatFullDate(exam.taken_on)}</p>
            <ScoreRing total={total} max={max} />
            <p className="text-sm text-muted tabular-nums">
              {total} / {max}
            </p>
            <dl className="mt-2 grid w-full grid-cols-2 gap-x-3 gap-y-1 border-t border-line pt-2 text-sm">
              {subjectScores(exam.scores).map(({ subject, label, score }) => (
                <div key={subject} className="flex justify-between gap-1">
                  <dt className="text-muted">{label}</dt>
                  <dd className="font-semibold tabular-nums">{score ?? '–'}</dd>
                </div>
              ))}
            </dl>
          </li>
        )
      })}
    </ul>
  )
}

interface ScoreRingProps {
  total: number
  max: number
}

const RING_SIZE = 88
const RING_STROKE = 8
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2
const RING_LENGTH = 2 * Math.PI * RING_RADIUS

// 만점 대비 총점을 원 둘레로 칠하고 가운데에 총점을 크게 쓴다
function ScoreRing({ total, max }: ScoreRingProps) {
  const ratio = max > 0 ? Math.min(total / max, 1) : 0
  return (
    <div className="relative my-2 grid size-22 place-items-center">
      <svg
        className="absolute inset-0 -rotate-90"
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        fill="none"
        strokeWidth={RING_STROKE}
        aria-hidden="true"
      >
        <circle className="stroke-line" cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} />
        {/* 0점이면 둥근 끝이 점으로 남지 않도록 그리지 않는다 */}
        {ratio > 0 && (
          <circle
            className="stroke-accent"
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            strokeLinecap="round"
            strokeDasharray={`${RING_LENGTH * ratio} ${RING_LENGTH}`}
          />
        )}
      </svg>
      <span className="text-2xl font-bold tabular-nums">{total}</span>
    </div>
  )
}
