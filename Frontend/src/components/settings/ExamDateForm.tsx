import { useState, type FormEvent } from 'react'
import { addDays, todayKey } from '../../libs/date.ts'
import { toErrorMessage } from '../../libs/errors.ts'
import Button from '../ui/Button.tsx'
import DatePicker from '../ui/DatePicker.tsx'
import Notice from '../ui/Notice.tsx'

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
    <form className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2" onSubmit={handleSubmit}>
      <label className="text-sm font-semibold" htmlFor="exam-date">
        시험일
      </label>
      <DatePicker
        id="exam-date"
        label="시험일 고르기"
        value={draft}
        minDate={addDays(todayKey(), 1)}
        disabled={disabled}
        onChange={setDraft}
      />
      <Button type="submit" disabled={disabled || saving || draft === (examDate ?? '')}>
        저장
      </Button>
      {disabled && (
        <div className="col-span-full">
          <Notice>로그인 후 설정할 수 있어요.</Notice>
        </div>
      )}
      {notice && (
        <div className="col-span-full">
          <Notice>{notice}</Notice>
        </div>
      )}
      {error && (
        <div className="col-span-full">
          <Notice tone="error">{error}</Notice>
        </div>
      )}
    </form>
  )
}
