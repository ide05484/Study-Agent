import { useState, type FormEvent } from 'react'
import type { NewBook } from '../../interfaces/study.ts'
import type { Subject } from '../../interfaces/subject.ts'
import { SUBJECT_LABELS, SUBJECTS } from '../../libs/subjects.ts'

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
    <form className="book-form" onSubmit={handleSubmit}>
      <select className="field" value={subject} onChange={(e) => setSubject(e.target.value as Subject)} aria-label="과목">
        {SUBJECTS.map((s) => (
          <option key={s} value={s}>
            {SUBJECT_LABELS[s]}
          </option>
        ))}
      </select>
      <input
        className="field"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="교재명 (예: 봉투모의고사)"
        aria-label="교재명"
      />
      <input
        className="field"
        type="number"
        inputMode="numeric"
        min={1}
        value={totalPages}
        onChange={(e) => setTotalPages(e.target.value)}
        placeholder="총 페이지"
        aria-label="총 페이지"
      />
      <div className="form-actions">
        <button type="button" className="button button--ghost" onClick={onCancel}>
          취소
        </button>
        <button type="submit" className="button" disabled={!valid || saving}>
          추가
        </button>
      </div>
    </form>
  )
}
