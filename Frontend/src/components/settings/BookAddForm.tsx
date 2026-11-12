import { useState, type FormEvent } from 'react'
import { useProfileContext } from '../../hooks/useProfile.ts'
import type { BookUnit, NewBook } from '../../interfaces/study.ts'
import type { Subject } from '../../interfaces/subject.ts'
import { isIntegerInRange, isRoundTargetsValid, UNIT_LABELS } from '../../libs/books.ts'
import { todayKey } from '../../libs/date.ts'
import { SUBJECT_LABELS, SUBJECTS } from '../../libs/subjects.ts'
import Button from '../ui/Button.tsx'
import ChipGroup, { type ChipOption } from '../ui/ChipGroup.tsx'
import TextField from '../ui/TextField.tsx'
import RoundTargetFields from './RoundTargetFields.tsx'

interface BookAddFormProps {
  id?: string // 제목 줄 + 버튼의 aria-controls 대상
  onAdd: (input: NewBook) => Promise<boolean>
  onCancel: () => void
}

const SUBJECT_OPTIONS: ChipOption<Subject>[] = SUBJECTS.map((s) => ({ value: s, label: SUBJECT_LABELS[s] }))
const UNIT_OPTIONS: ChipOption<BookUnit>[] = [
  { value: 'day', label: UNIT_LABELS.day },
  { value: 'chapter', label: UNIT_LABELS.chapter },
  { value: 'session', label: UNIT_LABELS.session },
]

// 영역 제목 바로 아래에 열린다. 분량 단위는 Day·챕터·회차. 회독별 목표일과 하루 최소 분량은 비워도 된다
export default function BookAddForm({ id, onAdd, onCancel }: BookAddFormProps) {
  const { profile } = useProfileContext()
  const [subject, setSubject] = useState<Subject>('korean')
  const [title, setTitle] = useState('')
  const [unit, setUnit] = useState<BookUnit>('session')
  const [totalPages, setTotalPages] = useState('')
  const [targetRounds, setTargetRounds] = useState('1')
  const [roundTargets, setRoundTargets] = useState<(string | null)[]>([])
  const [dailyAmount, setDailyAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const today = todayKey()
  const examDate = profile?.exam_date ?? null
  const roundsCount = isIntegerInRange(targetRounds, 1, 10) ? Number(targetRounds) : 0
  const valid =
    title.trim() !== '' &&
    isIntegerInRange(totalPages, 1) &&
    roundsCount > 0 &&
    isRoundTargetsValid(roundTargets.slice(0, roundsCount), 1, today, examDate) &&
    (dailyAmount.trim() === '' || isIntegerInRange(dailyAmount, 1))

  // 목표 회독을 줄이면 넘치는 목표일은 지운다
  function handleTargetRoundsChange(text: string) {
    setTargetRounds(text)
    if (isIntegerInRange(text, 1, 10)) setRoundTargets((prev) => prev.slice(0, Number(text)))
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!valid) return
    setSaving(true)
    const added = await onAdd({
      subject,
      title: title.trim(),
      total_units: Number(totalPages),
      unit,
      target_rounds: roundsCount,
      daily_amount: dailyAmount.trim() === '' ? null : Number(dailyAmount),
      round_targets: roundTargets.slice(0, roundsCount),
    })
    setSaving(false)
    if (added) onCancel()
  }

  return (
    <form id={id} className="mb-4 grid gap-3" aria-label="교재 추가" onSubmit={handleSubmit}>
      <div className="grid gap-1">
        <p className="text-sm text-muted">과목</p>
        <ChipGroup label="과목" options={SUBJECT_OPTIONS} value={subject} onChange={setSubject} />
      </div>
      <TextField
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="교재명 (예: 봉투모의고사)"
        aria-label="교재명"
      />
      <div className="grid gap-1">
        <p className="text-sm text-muted">단위</p>
        <ChipGroup label="단위" options={UNIT_OPTIONS} value={unit} onChange={setUnit} />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-muted">총</span>
        <div className="min-w-0 flex-1">
          <TextField
            type="number"
            inputMode="numeric"
            min={1}
            value={totalPages}
            onChange={(e) => setTotalPages(e.target.value)}
            placeholder={`총 ${UNIT_LABELS[unit]} 수`}
            aria-label={`총 ${UNIT_LABELS[unit]} 수`}
          />
        </div>
        <span className="text-muted">{UNIT_LABELS[unit]}</span>
      </div>
      <TextField
        type="number"
        inputMode="numeric"
        min={1}
        max={10}
        value={targetRounds}
        onChange={(e) => handleTargetRoundsChange(e.target.value)}
        placeholder="목표 회독"
        aria-label="목표 회독"
      />
      <RoundTargetFields
        idPrefix="book-add-target"
        rounds={roundsCount}
        value={roundTargets}
        fromRound={1}
        today={today}
        examDate={examDate}
        onChange={setRoundTargets}
      />
      <TextField
        type="number"
        inputMode="numeric"
        min={1}
        value={dailyAmount}
        onChange={(e) => setDailyAmount(e.target.value)}
        placeholder="하루 최소 분량 (선택)"
        aria-label="하루 최소 분량"
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          취소
        </Button>
        <Button type="submit" disabled={!valid || saving}>
          추가
        </Button>
      </div>
    </form>
  )
}
