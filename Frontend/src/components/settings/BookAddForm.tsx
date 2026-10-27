import { useState, type FormEvent } from 'react'
import type { NewBook } from '../../interfaces/study.ts'
import type { Subject } from '../../interfaces/subject.ts'
import { SUBJECT_LABELS, SUBJECTS } from '../../libs/subjects.ts'
import { buttonClass, fieldClass, ghostButtonClass } from '../ui/classes.ts'

interface BookAddFormProps {
  onAdd: (input: NewBook) => Promise<boolean>
  onCancel: () => void
}

// 교재 분량은 페이지 기준. 회차·Chapter 단위는 교재 DB를 쌓은 뒤 도입한다
export default function BookAddForm({ onAdd, onCancel }: BookAddFormProps) {
  const [subject, setSubject] = useState<Subject>('korean')
  const [title, setTitle] = useState('')
  const [totalPages, setTotalPages] = useState('')
  const [saving, setSaving] = useState(false)
  const pages = Number(totalPages)
  const valid = title.trim() !== '' && Number.isInteger(pages) && pages > 0

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!valid) return
    setSaving(true)
    const added = await onAdd({ subject, title: title.trim(), total_pages: pages })
    setSaving(false)
    if (added) onCancel()
  }

  return (
    <form className="mt-3 grid gap-2" onSubmit={handleSubmit}>
      <select
        className={fieldClass}
        value={subject}
        onChange={(e) => setSubject(e.target.value as Subject)}
        aria-label="과목"
      >
        {SUBJECTS.map((s) => (
          <option key={s} value={s}>
            {SUBJECT_LABELS[s]}
          </option>
        ))}
      </select>
      <input
        className={fieldClass}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="교재명 (예: 봉투모의고사)"
        aria-label="교재명"
      />
      <input
        className={fieldClass}
        type="number"
        inputMode="numeric"
        min={1}
        value={totalPages}
        onChange={(e) => setTotalPages(e.target.value)}
        placeholder="총 페이지"
        aria-label="총 페이지"
      />
      <div className="flex justify-end gap-2">
        <button type="button" className={ghostButtonClass} onClick={onCancel}>
          취소
        </button>
        <button type="submit" className={buttonClass} disabled={!valid || saving}>
          추가
        </button>
      </div>
    </form>
  )
}
