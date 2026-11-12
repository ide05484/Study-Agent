import { useState, type FormEvent } from 'react'
import type { Book, BookPlanUpdate } from '../../interfaces/study.ts'
import { isIntegerInRange, UNIT_LABELS } from '../../libs/books.ts'
import Button from '../ui/Button.tsx'
import TextField from '../ui/TextField.tsx'

interface BookProgressFormProps {
  book: Book
  onSave: (input: BookPlanUpdate) => Promise<boolean>
  onCancel: () => void
}

// 교재의 현재 회독·어디까지·목표 회독을 고친다. 저장 규칙은 DB check와 같다
export default function BookProgressForm({ book, onSave, onCancel }: BookProgressFormProps) {
  const [currentRound, setCurrentRound] = useState(String(book.current_round))
  const [currentPage, setCurrentPage] = useState(String(book.current_unit))
  const [targetRounds, setTargetRounds] = useState(String(book.target_rounds))
  const [saving, setSaving] = useState(false)
  const unitLabel = UNIT_LABELS[book.unit]
  const valid =
    isIntegerInRange(targetRounds, 1, 10) &&
    isIntegerInRange(currentRound, 1, Number(targetRounds)) &&
    isIntegerInRange(currentPage, 0, book.total_units)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!valid) return
    setSaving(true)
    const rounds = Number(targetRounds)
    const saved = await onSave({
      current_round: Number(currentRound),
      current_unit: Number(currentPage),
      target_rounds: rounds,
      daily_amount: book.daily_amount,
      // 목표 회독을 줄이면 넘치는 목표일은 지운다(DB check: 목표일 수 ≤ 목표 회독)
      round_targets: book.round_targets.slice(0, rounds),
    })
    setSaving(false)
    if (saved) onCancel()
  }

  return (
    <form className="grid gap-2 pb-3" onSubmit={handleSubmit}>
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
        onChange={(e) => setTargetRounds(e.target.value)}
        placeholder="목표 회독"
        aria-label="목표 회독"
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
