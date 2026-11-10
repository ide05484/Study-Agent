import { useState, type FormEvent } from 'react'
import type { ExamKind, MockExamScore, NewMockExam } from '../../interfaces/mockExam.ts'
import type { Subject } from '../../interfaces/subject.ts'
import { EXAM_KIND_LABELS, isScoreText } from '../../libs/exams.ts'
import { SUBJECT_LABELS, SUBJECTS } from '../../libs/subjects.ts'
import Button from '../ui/Button.tsx'
import DatePicker from '../ui/DatePicker.tsx'
import Select from '../ui/Select.tsx'
import TextField from '../ui/TextField.tsx'

interface ExamScoreFormProps {
  onAdd: (input: NewMockExam) => Promise<boolean>
  onCancel: () => void
}

type ScoreTexts = Record<Subject, string>

const EMPTY_SCORES: ScoreTexts = { korean: '', english: '', public_health: '', health_admin: '' }

// 구분, 시험 이름, 응시일, 과목별 점수. 빈 칸 과목은 저장하지 않는다
export default function ExamScoreForm({ onAdd, onCancel }: ExamScoreFormProps) {
  const [kind, setKind] = useState<ExamKind>('mock')
  const [name, setName] = useState('')
  const [takenOn, setTakenOn] = useState('')
  const [texts, setTexts] = useState<ScoreTexts>(EMPTY_SCORES)
  const [saving, setSaving] = useState(false)
  const filled = SUBJECTS.filter((s) => texts[s].trim() !== '')
  const valid = name.trim() !== '' && takenOn !== '' && filled.length > 0 && filled.every((s) => isScoreText(texts[s]))

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!valid || saving) return
    const scores: MockExamScore[] = filled.map((subject) => ({ subject, score: Number(texts[subject]) }))
    setSaving(true)
    const added = await onAdd({ kind, name: name.trim(), taken_on: takenOn, scores })
    setSaving(false)
    if (added) onCancel()
  }

  return (
    <form className="mt-3 grid gap-2" onSubmit={handleSubmit}>
      <Select value={kind} onChange={(e) => setKind(e.target.value as ExamKind)} aria-label="구분">
        <option value="mock">{EXAM_KIND_LABELS.mock}</option>
        <option value="official">{EXAM_KIND_LABELS.official}</option>
      </Select>
      <TextField
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="시험 이름 (예: 해커스 모의고사)"
        aria-label="시험 이름"
      />
      <DatePicker id="exam-taken-on" label="응시일" value={takenOn} onChange={setTakenOn} />
      <div className="grid grid-cols-2 gap-2">
        {SUBJECTS.map((subject) => (
          <TextField
            key={subject}
            inputMode="decimal"
            value={texts[subject]}
            onChange={(e) => setTexts((prev) => ({ ...prev, [subject]: e.target.value }))}
            placeholder={SUBJECT_LABELS[subject]}
            aria-label={`${SUBJECT_LABELS[subject]} 점수`}
          />
        ))}
      </div>
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
