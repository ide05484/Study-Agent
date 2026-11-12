import { useState, type FormEvent } from 'react'
import { useProfileContext } from '../../hooks/useProfile.ts'
import type { Book, BookPlanUpdate } from '../../interfaces/study.ts'
import { isIntegerInRange, isRoundTargetsValid, UNIT_LABELS } from '../../libs/books.ts'
import { todayKey } from '../../libs/date.ts'
import Button from '../ui/Button.tsx'
import TextField from '../ui/TextField.tsx'
import RoundTargetFields from './RoundTargetFields.tsx'

interface BookProgressFormProps {
  book: Book
  onSave: (input: BookPlanUpdate) => Promise<boolean>
  onCancel: () => void
}

// 교재의 현재 회독·어디까지·목표 회독·회독별 목표일·하루 최소 분량을 고친다. 저장 규칙은 DB check와 같다
export default function BookProgressForm({ book, onSave, onCancel }: BookProgressFormProps) {
  const { profile } = useProfileContext()
  const [currentRound, setCurrentRound] = useState(String(book.current_round))
  const [currentPage, setCurrentPage] = useState(String(book.current_unit))
  const [targetRounds, setTargetRounds] = useState(String(book.target_rounds))
  const [roundTargets, setRoundTargets] = useState<(string | null)[]>(book.round_targets)
  const [dailyAmount, setDailyAmount] = useState(book.daily_amount === null ? '' : String(book.daily_amount))
  const [saving, setSaving] = useState(false)
  const unitLabel = UNIT_LABELS[book.unit]
  const today = todayKey()
  const examDate = profile?.exam_date ?? null
  const roundsCount = isIntegerInRange(targetRounds, 1, 10) ? Number(targetRounds) : 0
  // 끝낸 회독의 목표일은 늘 과거라 검사하지 않는다. 현재 회독부터만 본다
  const fromRound = isIntegerInRange(currentRound, 1) ? Number(currentRound) : 1
  const valid =
    isIntegerInRange(targetRounds, 1, 10) &&
    isIntegerInRange(currentRound, 1, Number(targetRounds)) &&
    isIntegerInRange(currentPage, 0, book.total_units) &&
    isRoundTargetsValid(roundTargets.slice(0, roundsCount), fromRound, today, examDate) &&
    (dailyAmount.trim() === '' || isIntegerInRange(dailyAmount, 1))

  // 목표 회독을 줄이면 넘치는 목표일은 지운다(DB check: 목표일 수 ≤ 목표 회독)
  function handleTargetRoundsChange(text: string) {
    setTargetRounds(text)
    if (isIntegerInRange(text, 1, 10)) setRoundTargets((prev) => prev.slice(0, Number(text)))
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!valid) return
    setSaving(true)
    const saved = await onSave({
      current_round: Number(currentRound),
      current_unit: Number(currentPage),
      target_rounds: roundsCount,
      daily_amount: dailyAmount.trim() === '' ? null : Number(dailyAmount),
      round_targets: roundTargets.slice(0, roundsCount),
    })
    setSaving(false)
    if (saved) onCancel()
  }

  return (
    <form className="grid gap-3 pb-3" onSubmit={handleSubmit}>
      <TextField
        type="number"
        inputMode="numeric"
        min={1}
        max={Number(targetRounds) || undefined}
        value={currentRound}
        onChange={(e) => setCurrentRound(e.target.value)}
        placeholder="현재 회독"
        aria-label="현재 회독"
      />
      <TextField
        type="number"
        inputMode="numeric"
        min={0}
        max={book.total_units}
        value={currentPage}
        onChange={(e) => setCurrentPage(e.target.value)}
        placeholder={unitLabel}
        aria-label="어디까지"
      />
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
        idPrefix={`book-edit-target-${book.id}`}
        rounds={roundsCount}
        value={roundTargets}
        fromRound={fromRound}
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
          저장
        </Button>
      </div>
    </form>
  )
}
