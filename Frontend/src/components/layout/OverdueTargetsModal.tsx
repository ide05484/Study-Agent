import { useState } from 'react'
import { useOverdueTargets } from '../../hooks/useOverdueTargets.ts'
import { addDays, todayKey } from '../../libs/date.ts'
import Button from '../ui/Button.tsx'
import DatePicker from '../ui/DatePicker.tsx'
import Modal from '../ui/Modal.tsx'
import Notice from '../ui/Notice.tsx'

interface OverdueTargetsModalProps {
  examDate: string | null
}

// 지금 회독의 목표일이 지난 교재가 있으면 앱을 열 때 다음 목표일을 묻는다. DialogProvider 안에 둔다
export default function OverdueTargetsModal({ examDate }: OverdueTargetsModalProps) {
  const { items, error, save, postpone } = useOverdueTargets(examDate)
  // 사용자가 고른 날짜(교재 id → 날짜). 고르지 않은 줄은 기본 목표일을 보인다
  const [picked, setPicked] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const dates = Object.fromEntries(items.map((item) => [item.book.id, picked[item.book.id] ?? item.defaultDate]))
  const hasEmptyDate = Object.values(dates).some((date) => date === '')

  async function run(action: () => Promise<boolean>) {
    setSaving(true)
    try {
      await action()
    } finally {
      setSaving(false)
    }
  }

  function handleClose() {
    if (!saving) void run(postpone)
  }

  return (
    <Modal
      open={items.length > 0}
      title="목표일이 지났어요"
      onClose={handleClose}
      actions={
        <>
          <Button type="button" variant="ghost" disabled={saving} onClick={handleClose}>
            나중에
          </Button>
          <Button type="button" disabled={saving || hasEmptyDate} onClick={() => void run(() => save(dates))}>
            저장
          </Button>
        </>
      }
    >
      <p className="text-muted">다음 목표일을 정하면 계획을 다시 나눠 드려요.</p>
      <ul className="mt-4 flex flex-col gap-4">
        {items.map(({ book, round }) => (
          <li key={book.id}>
            <label htmlFor={`overdue-${book.id}`} className="mb-1 block text-sm font-semibold">
              {book.title} · {round}회독
            </label>
            <DatePicker
              id={`overdue-${book.id}`}
              label={`${book.title} ${round}회독 목표일`}
              value={dates[book.id]}
              minDate={todayKey()}
              maxDate={examDate ? addDays(examDate, -1) : undefined}
              disabled={saving}
              onChange={(value) => setPicked({ ...picked, [book.id]: value })}
            />
          </li>
        ))}
      </ul>
      {error && (
        <div className="mt-3">
          <Notice tone="error">{error}</Notice>
        </div>
      )}
    </Modal>
  )
}
