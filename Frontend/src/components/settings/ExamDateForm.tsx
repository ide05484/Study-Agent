import { useState, type FormEvent } from 'react'
import { useAlert, useProgress } from '../../hooks/useDialog.ts'
import { addDays, todayKey } from '../../libs/date.ts'
import { toErrorMessage } from '../../libs/errors.ts'
import Button from '../ui/Button.tsx'
import DatePicker from '../ui/DatePicker.tsx'
import Notice from '../ui/Notice.tsx'

interface ExamDateFormProps {
  examDate: string | null
  disabled: boolean
  // 저장하고 계획을 다시 나눈 뒤 결과 안내 문구를 돌려준다. 실패하면 오류를 던진다
  onSave: (examDate: string | null) => Promise<string>
}

// 시험일 저장은 계획 전체를 다시 나누므로 기다리는 동안 진행 창을 띄우고, 끝나면 결과 창으로 알린다
export default function ExamDateForm({ examDate, disabled, onSave }: ExamDateFormProps) {
  const [draft, setDraft] = useState(examDate ?? '')
  const [saving, setSaving] = useState(false)
  const progress = useProgress()
  const alert = useAlert()

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    try {
      const message = await progress(
        {
          title: '계획을 나누는 중이에요',
          message: '시험일에 맞춰 날짜별 분량을 다시 나누고 있어요. 잠시만 기다려 주세요.',
        },
        () => onSave(draft || null),
      )
      await alert({ title: '계획을 세웠어요', message })
    } catch (err) {
      await alert({ title: '계획을 세우지 못했어요', message: toErrorMessage(err) })
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
    </form>
  )
}
