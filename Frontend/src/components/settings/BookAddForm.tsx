import { useState, type FormEvent } from 'react'
import type { BookUnit, NewBook } from '../../interfaces/study.ts'
import type { Subject } from '../../interfaces/subject.ts'
import { isIntegerInRange, UNIT_LABELS } from '../../libs/books.ts'
import { SUBJECT_LABELS, SUBJECTS } from '../../libs/subjects.ts'
import Button from '../ui/Button.tsx'
import Select from '../ui/Select.tsx'
import TextField from '../ui/TextField.tsx'

interface BookAddFormProps {
  id?: string // 제목 줄 + 버튼의 aria-controls 대상
  onAdd: (input: NewBook) => Promise<boolean>
  onCancel: () => void
}

// 영역 제목 바로 아래에 열린다. 분량 단위는 Day·챕터·회차. 하루 최소 분량을 비우면 시험일까지 고르게 나눈다
export default function BookAddForm({ id, onAdd, onCancel }: BookAddFormProps) {
  const [subject, setSubject] = useState<Subject>('korean')
  const [title, setTitle] = useState('')
  const [unit, setUnit] = useState<BookUnit>('session')
  const [totalPages, setTotalPages] = useState('')
  const [targetRounds, setTargetRounds] = useState('1')
  const [dailyAmount, setDailyAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const valid =
    title.trim() !== '' &&
    isIntegerInRange(totalPages, 1) &&
    isIntegerInRange(targetRounds, 1, 10) &&
    (dailyAmount.trim() === '' || isIntegerInRange(dailyAmount, 1))

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!valid) return
    setSaving(true)
    const added = await onAdd({
      subject,
      title: title.trim(),
      total_units: Number(totalPages),
      unit,
      target_rounds: Number(targetRounds),
      daily_amount: dailyAmount.trim() === '' ? null : Number(dailyAmount),
      round_targets: [],
    })
    setSaving(false)
    if (added) onCancel()
  }

  return (
    <form id={id} className="mb-4 grid gap-2" aria-label="교재 추가" onSubmit={handleSubmit}>
      <Select value={subject} onChange={(e) => setSubject(e.target.value as Subject)} aria-label="과목">
        {SUBJECTS.map((s) => (
          <option key={s} value={s}>
            {SUBJECT_LABELS[s]}
          </option>
        ))}
      </Select>
      <TextField
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="교재명 (예: 봉투모의고사)"
        aria-label="교재명"
      />
      <Select value={unit} onChange={(e) => setUnit(e.target.value as BookUnit)} aria-label="단위">
        <option value="day">{UNIT_LABELS.day}</option>
        <option value="chapter">{UNIT_LABELS.chapter}</option>
        <option value="session">{UNIT_LABELS.session}</option>
      </Select>
      <TextField
        type="number"
        inputMode="numeric"
        min={1}
        value={totalPages}
        onChange={(e) => setTotalPages(e.target.value)}
        placeholder={`총 ${UNIT_LABELS[unit]} 수`}
        aria-label={`총 ${UNIT_LABELS[unit]} 수`}
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
      <TextField
        type="number"
        inputMode="numeric"
        min={1}
        value={dailyAmount}
        onChange={(e) => setDailyAmount(e.target.value)}
        placeholder="하루 최소 분량 (비우면 시험일까지 고르게)"
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
