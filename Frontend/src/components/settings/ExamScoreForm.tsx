import { useState, type FormEvent } from 'react'
import type { ExamKind, MockExamScore, NewMockExam } from '../../interfaces/mockExam.ts'
import type { Subject } from '../../interfaces/subject.ts'
import { EXAM_KIND_LABELS, isScoreText } from '../../libs/exams.ts'
import { REQUIRED_MESSAGE } from '../../libs/forms.ts'
import { SUBJECT_LABELS, SUBJECTS } from '../../libs/subjects.ts'
import Button from '../ui/Button.tsx'
import ChipGroup, { type ChipOption } from '../ui/ChipGroup.tsx'
import DatePicker from '../ui/DatePicker.tsx'
import FormField from '../ui/FormField.tsx'
import TextField from '../ui/TextField.tsx'

interface ExamScoreFormProps {
  id?: string // 제목 줄 + 버튼의 aria-controls 대상
  onAdd: (input: NewMockExam) => Promise<boolean>
  onCancel: () => void
}

const KIND_OPTIONS: ChipOption<ExamKind>[] = [
  { value: 'mock', label: EXAM_KIND_LABELS.mock },
  { value: 'official', label: EXAM_KIND_LABELS.official },
]

type ScoreTexts = Record<Subject, string>

const EMPTY_SCORES: ScoreTexts = { korean: '', english: '', public_health: '', health_admin: '' }
const SCORES_EMPTY_MESSAGE = '한 과목 이상 적어 주세요.'
const SCORE_FORMAT_MESSAGE = '0~100, 소수는 둘째 자리까지 적어 주세요.'

// 영역 제목 바로 아래에 열린다. 구분, 시험 이름, 응시일, 과목별 점수. 빈 칸 과목은 저장하지 않는다.
// 추가 버튼은 늘 누를 수 있고, 빠진 칸은 누른 뒤 라벨 옆 붉은 글씨와 흔들림으로 알린다
export default function ExamScoreForm({ id, onAdd, onCancel }: ExamScoreFormProps) {
  const [kind, setKind] = useState<ExamKind>('mock')
  const [name, setName] = useState('')
  const [takenOn, setTakenOn] = useState('')
  const [texts, setTexts] = useState<ScoreTexts>(EMPTY_SCORES)
  const [saving, setSaving] = useState(false)
  const [shake, setShake] = useState(0)
  const filled = SUBJECTS.filter((s) => texts[s].trim() !== '')
  const badScores = filled.filter((s) => !isScoreText(texts[s]))

  const errors = {
    name: name.trim() === '' ? REQUIRED_MESSAGE : null,
    takenOn: takenOn === '' ? REQUIRED_MESSAGE : null,
    scores: filled.length === 0 ? SCORES_EMPTY_MESSAGE : badScores.length > 0 ? SCORE_FORMAT_MESSAGE : null,
  }
  const valid = Object.values(errors).every((error) => error === null)
  const shown = shake > 0 ? errors : null

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (saving) return
    if (!valid) {
      setShake((n) => n + 1)
      return
    }
    const scores: MockExamScore[] = filled.map((subject) => ({ subject, score: Number(texts[subject]) }))
    setSaving(true)
    const added = await onAdd({ kind, name: name.trim(), taken_on: takenOn, scores })
    setSaving(false)
    if (added) onCancel()
  }

  return (
    <form id={id} className="mb-4 grid gap-5" aria-label="점수 추가" noValidate onSubmit={handleSubmit}>
      <FormField label="구분" required>
        <ChipGroup label="구분" options={KIND_OPTIONS} value={kind} onChange={setKind} />
      </FormField>
      <FormField label="시험 이름" htmlFor="exam-name" required error={shown?.name} shake={shake}>
        <TextField
          id="exam-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 해커스 모의고사"
          invalid={!!shown?.name}
        />
      </FormField>
      <FormField label="응시일" htmlFor="exam-taken-on" required error={shown?.takenOn} shake={shake}>
        <DatePicker
          id="exam-taken-on"
          label="응시일"
          value={takenOn}
          invalid={!!shown?.takenOn}
          onChange={setTakenOn}
        />
      </FormField>
      <FormField label="과목별 점수" required error={shown?.scores} shake={shake}>
        <div className="grid grid-cols-2 gap-3">
          {SUBJECTS.map((subject) => (
            <div key={subject} className="grid gap-1">
              <label className="text-sm text-muted" htmlFor={`exam-score-${subject}`}>
                {SUBJECT_LABELS[subject]}
              </label>
              <TextField
                id={`exam-score-${subject}`}
                inputMode="decimal"
                value={texts[subject]}
                onChange={(e) => setTexts((prev) => ({ ...prev, [subject]: e.target.value }))}
                suffix="점"
                invalid={!!shown?.scores && (filled.length === 0 || badScores.includes(subject))}
              />
            </div>
          ))}
        </div>
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
