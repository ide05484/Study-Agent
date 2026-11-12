import { useState, type FormEvent } from 'react'
import { useProfileContext } from '../../hooks/useProfile.ts'
import type { BookUnit, NewBook } from '../../interfaces/study.ts'
import type { Subject } from '../../interfaces/subject.ts'
import {
  integerFieldError,
  isRoundTargetsValid,
  REQUIRED_MESSAGE,
  TARGETS_INVALID_MESSAGE,
  UNIT_LABELS,
} from '../../libs/books.ts'
import { todayKey } from '../../libs/date.ts'
import { SUBJECT_LABELS, SUBJECTS } from '../../libs/subjects.ts'
import Button from '../ui/Button.tsx'
import ChipGroup, { type ChipOption } from '../ui/ChipGroup.tsx'
import FormField from '../ui/FormField.tsx'
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

// 영역 제목 바로 아래에 열린다. 분량 단위는 Day·챕터·회차. 회독별 목표일과 하루 최소 분량은 비워도 된다.
// 추가 버튼은 늘 누를 수 있고, 빠진 칸은 누른 뒤 라벨 옆 붉은 글씨와 흔들림으로 알린다
export default function BookAddForm({ id, onAdd, onCancel }: BookAddFormProps) {
  const { profile } = useProfileContext()
  const [subject, setSubject] = useState<Subject>('korean')
  const [title, setTitle] = useState('')
  const [unit, setUnit] = useState<BookUnit>('session')
  const [totalUnits, setTotalUnits] = useState('')
  const [targetRounds, setTargetRounds] = useState('1')
  const [roundTargets, setRoundTargets] = useState<(string | null)[]>([])
  const [dailyAmount, setDailyAmount] = useState('')
  const [saving, setSaving] = useState(false)
  // 추가를 한 번 누른 뒤부터 오류를 보여 주고, 누를 때마다 오류 칸을 흔든다
  const [shake, setShake] = useState(0)
  const today = todayKey()
  const examDate = profile?.exam_date ?? null
  const roundsCount = integerFieldError(targetRounds, 1, 10, true) === null ? Number(targetRounds) : 0
  const unitLabel = UNIT_LABELS[unit]

  const errors = {
    title: title.trim() === '' ? REQUIRED_MESSAGE : null,
    total: integerFieldError(totalUnits, 1, Infinity, true),
    rounds: integerFieldError(targetRounds, 1, 10, true),
    targets: isRoundTargetsValid(roundTargets.slice(0, roundsCount), 1, today, examDate)
      ? null
      : TARGETS_INVALID_MESSAGE,
    daily: integerFieldError(dailyAmount, 1, Infinity, false),
  }
  const valid = Object.values(errors).every((error) => error === null)
  const shown = shake > 0 ? errors : null

  // 목표 회독을 줄이면 넘치는 목표일은 지운다
  function handleTargetRoundsChange(text: string) {
    setTargetRounds(text)
    if (integerFieldError(text, 1, 10, true) === null) setRoundTargets((prev) => prev.slice(0, Number(text)))
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (saving) return
    if (!valid) {
      setShake((n) => n + 1)
      return
    }
    setSaving(true)
    const added = await onAdd({
      subject,
      title: title.trim(),
      total_units: Number(totalUnits),
      unit,
      target_rounds: roundsCount,
      daily_amount: dailyAmount.trim() === '' ? null : Number(dailyAmount),
      round_targets: roundTargets.slice(0, roundsCount),
    })
    setSaving(false)
    if (added) onCancel()
  }

  return (
    <form id={id} className="mb-4 grid gap-5" aria-label="교재 추가" noValidate onSubmit={handleSubmit}>
      <FormField label="과목" required>
        <ChipGroup label="과목" options={SUBJECT_OPTIONS} value={subject} onChange={setSubject} />
      </FormField>
      <FormField label="교재명" htmlFor="book-add-title" required error={shown?.title} shake={shake}>
        <TextField
          id="book-add-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 봉투모의고사"
          invalid={!!shown?.title}
        />
      </FormField>
      <FormField label="단위" required>
        <ChipGroup label="단위" options={UNIT_OPTIONS} value={unit} onChange={setUnit} />
      </FormField>
      <FormField label="총량" htmlFor="book-add-total" required error={shown?.total} shake={shake}>
        <TextField
          id="book-add-total"
          type="number"
          inputMode="numeric"
          min={1}
          value={totalUnits}
          onChange={(e) => setTotalUnits(e.target.value)}
          placeholder="예: 60"
          suffix={unitLabel}
          invalid={!!shown?.total}
        />
      </FormField>
      <FormField label="목표 회독" htmlFor="book-add-rounds" required error={shown?.rounds} shake={shake}>
        <TextField
          id="book-add-rounds"
          type="number"
          inputMode="numeric"
          min={1}
          max={10}
          value={targetRounds}
          onChange={(e) => handleTargetRoundsChange(e.target.value)}
          suffix="회독"
          invalid={!!shown?.rounds}
        />
      </FormField>
      {roundsCount > 0 && (
        <FormField label="회독별 목표일" error={shown?.targets} shake={shake}>
          <RoundTargetFields
            idPrefix="book-add-target"
            rounds={roundsCount}
            value={roundTargets}
            fromRound={1}
            today={today}
            examDate={examDate}
            onChange={setRoundTargets}
          />
        </FormField>
      )}
      <FormField label="하루 최소 분량" htmlFor="book-add-daily" error={shown?.daily} shake={shake}>
        <TextField
          id="book-add-daily"
          type="number"
          inputMode="numeric"
          min={1}
          value={dailyAmount}
          onChange={(e) => setDailyAmount(e.target.value)}
          placeholder="비우면 목표일까지 고르게"
          suffix={unitLabel}
          invalid={!!shown?.daily}
        />
      </FormField>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          취소
        </Button>
        <Button type="submit" disabled={saving}>
          추가
        </Button>
      </div>
    </form>
  )
}
