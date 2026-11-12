import { roundTargetBounds } from '../../libs/books.ts'
import DatePicker from '../ui/DatePicker.tsx'

interface RoundTargetFieldsProps {
  idPrefix: string
  rounds: number // 목표 회독 수만큼 줄을 그린다
  value: (string | null)[] // n번째 = n회독 목표일, null = 없음
  fromRound: number // 이 회독부터 고칠 수 있다. 앞 회독 줄은 날짜만 보여 준다
  today: string
  examDate: string | null
  onChange: (value: (string | null)[]) => void
}

// 회독마다 목표일 한 줄. 비워도 된다. 날짜는 오늘 ~ 시험 전날, 앞 회독 목표일보다 늦게만 고른다
export default function RoundTargetFields({
  idPrefix,
  rounds,
  value,
  fromRound,
  today,
  examDate,
  onChange,
}: RoundTargetFieldsProps) {
  if (rounds < 1) return null
  const targets = Array.from({ length: rounds }, (_, i) => value[i] ?? null)

  function handleChange(index: number, key: string) {
    onChange(targets.map((target, i) => (i === index ? key || null : target)))
  }

  return (
    <div className="grid gap-2">
      <p className="text-sm text-muted">목표일</p>
      {targets.map((target, index) => {
        const round = index + 1
        const { min, max } = roundTargetBounds(targets, index, fromRound, today, examDate)
        return (
          <div key={round} className="grid gap-1">
            <label className="text-sm text-muted" htmlFor={`${idPrefix}-${round}`}>
              {round}회독 목표일
            </label>
            <DatePicker
              id={`${idPrefix}-${round}`}
              label={`${round}회독 목표일`}
              value={target ?? ''}
              minDate={min}
              maxDate={max}
              disabled={round < fromRound}
              onChange={(key) => handleChange(index, key)}
            />
          </div>
        )
      })}
    </div>
  )
}
