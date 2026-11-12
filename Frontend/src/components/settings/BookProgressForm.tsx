import { useState, type FormEvent } from 'react'
import { useProfileContext } from '../../hooks/useProfile.ts'
import type { Book, BookPlanUpdate } from '../../interfaces/study.ts'
import {
  integerFieldError,
  isIntegerInRange,
  isRoundTargetsValid,
  TARGETS_INVALID_MESSAGE,
  UNIT_LABELS,
  withUnit,
} from '../../libs/books.ts'
import { todayKey } from '../../libs/date.ts'
import Button from '../ui/Button.tsx'
import FormField from '../ui/FormField.tsx'
import TextField from '../ui/TextField.tsx'
import RoundTargetFields from './RoundTargetFields.tsx'

interface BookProgressFormProps {
  book: Book
  onSave: (input: BookPlanUpdate) => Promise<boolean>
  onCancel: () => void
}

// 교재의 현재 회독·어디까지·목표 회독·회독별 목표일·하루 최소 분량을 고친다. 저장 규칙은 DB check와 같다.
// 저장 버튼은 늘 누를 수 있고, 잘못된 칸은 누른 뒤 라벨 옆 붉은 글씨와 흔들림으로 알린다
export default function BookProgressForm({ book, onSave, onCancel }: BookProgressFormProps) {
  const { profile } = useProfileContext()
  const [currentRound, setCurrentRound] = useState(String(book.current_round))
  const [currentUnit, setCurrentUnit] = useState(String(book.current_unit))
  const [targetRounds, setTargetRounds] = useState(String(book.target_rounds))
  const [roundTargets, setRoundTargets] = useState<(string | null)[]>(book.round_targets)
  const [dailyAmount, setDailyAmount] = useState(book.daily_amount === null ? '' : String(book.daily_amount))
  const [saving, setSaving] = useState(false)
  const [shake, setShake] = useState(0)
  const today = todayKey()
  const examDate = profile?.exam_date ?? null
  const roundsCount = isIntegerInRange(targetRounds, 1, 10) ? Number(targetRounds) : 0
  // 끝낸 회독의 목표일은 늘 과거라 검사하지 않는다. 현재 회독부터 보고, 그 회독을 끝냈으면 다음 회독부터 본다.
  // 마지막 회독까지 끝냈으면 목표 회독 + 1이 되어 검사할 회독이 없다(모든 목표일 줄이 잠긴다)
  const roundFinished = isIntegerInRange(currentUnit, 0) && Number(currentUnit) === book.total_units
  const fromRound = isIntegerInRange(currentRound, 1)
    ? Math.min(Number(currentRound) + (roundFinished ? 1 : 0), Math.max(roundsCount, 1) + 1)
    : 1

  const errors = {
    round: integerFieldError(currentRound, 1, Math.max(roundsCount, 1), true),
    unit: integerFieldError(currentUnit, 0, book.total_units, true),
    rounds: integerFieldError(targetRounds, 1, 10, true),
    targets: isRoundTargetsValid(roundTargets.slice(0, roundsCount), fromRound, today, examDate)
      ? null
      : TARGETS_INVALID_MESSAGE,
    daily: integerFieldError(dailyAmount, 1, Infinity, false),
  }
  const valid = Object.values(errors).every((error) => error === null)
  const shown = shake > 0 ? errors : null
  const fieldId = `book-edit-${book.id}`

  // 목표 회독을 줄이면 넘치는 목표일은 지운다(DB check: 목표일 수 ≤ 목표 회독)
  function handleTargetRoundsChange(text: string) {
    setTargetRounds(text)
    if (isIntegerInRange(text, 1, 10)) setRoundTargets((prev) => prev.slice(0, Number(text)))
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (saving) return
    if (!valid) {
      setShake((n) => n + 1)
      return
    }
    setSaving(true)
    const saved = await onSave({
      current_round: Number(currentRound),
      current_unit: Number(currentUnit),
      target_rounds: roundsCount,
      daily_amount: dailyAmount.trim() === '' ? null : Number(dailyAmount),
      round_targets: roundTargets.slice(0, roundsCount),
    })
    setSaving(false)
    if (saved) onCancel()
  }

  return (
    <form className="grid gap-5 pt-2 pb-4" noValidate onSubmit={handleSubmit}>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="현재 회독" htmlFor={`${fieldId}-round`} required error={shown?.round} shake={shake}>
          <TextField
            id={`${fieldId}-round`}
            type="number"
            inputMode="numeric"
            min={1}
            max={roundsCount || undefined}
            value={currentRound}
            onChange={(e) => setCurrentRound(e.target.value)}
            suffix="회독째"
            invalid={!!shown?.round}
          />
        </FormField>
        <FormField label="어디까지" htmlFor={`${fieldId}-unit`} required error={shown?.unit} shake={shake}>
          <TextField
            id={`${fieldId}-unit`}
            type="number"
            inputMode="numeric"
            min={0}
            max={book.total_units}
            value={currentUnit}
            onChange={(e) => setCurrentUnit(e.target.value)}
            suffix={`/ ${withUnit(book.unit, book.total_units)}`}
            invalid={!!shown?.unit}
          />
        </FormField>
      </div>
      <FormField label="목표 회독" htmlFor={`${fieldId}-rounds`} required error={shown?.rounds} shake={shake}>
        <TextField
          id={`${fieldId}-rounds`}
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
            idPrefix={`${fieldId}-target`}
            rounds={roundsCount}
            value={roundTargets}
            fromRound={fromRound}
            today={today}
            examDate={examDate}
            onChange={setRoundTargets}
          />
        </FormField>
      )}
      <FormField label="하루 최소 분량" htmlFor={`${fieldId}-daily`} error={shown?.daily} shake={shake}>
        <TextField
          id={`${fieldId}-daily`}
          type="number"
          inputMode="numeric"
          min={1}
          value={dailyAmount}
          onChange={(e) => setDailyAmount(e.target.value)}
          placeholder="비우면 목표일까지 고르게"
          suffix={UNIT_LABELS[book.unit]}
          invalid={!!shown?.daily}
        />
      </FormField>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          취소
        </Button>
        <Button type="submit" disabled={saving}>
          저장
        </Button>
      </div>
    </form>
  )
}
