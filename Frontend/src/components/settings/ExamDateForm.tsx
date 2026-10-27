import { useState, type FormEvent } from 'react'
import { toErrorMessage } from '../../libs/errors.ts'

interface ExamDateFormProps {
  examDate: string | null
  disabled: boolean
  onSave: (examDate: string | null) => Promise<string>
}

export default function ExamDateForm({ examDate, disabled, onSave }: ExamDateFormProps) {
  const [draft, setDraft] = useState(examDate ?? '')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setNotice(null)
    setError(null)
    try {
      setNotice(await onSave(draft || null))
    } catch (err) {
      setError(toErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <label className="field-label" htmlFor="exam-date">
        시험일
      </label>
      <input
        id="exam-date"
        type="date"
        className="field"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        disabled={disabled}
      />
      <button type="submit" className="button" disabled={disabled || saving || draft === (examDate ?? '')}>
        저장
      </button>
      {disabled && <p className="muted full-row">로그인 후 설정할 수 있어요.</p>}
      {notice && <p className="muted full-row">{notice}</p>}
      {error && <p className="error-text full-row">{error}</p>}
    </form>
  )
}
