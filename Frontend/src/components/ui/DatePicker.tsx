import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import Calendar, { type OnArgs, type TileArgs } from 'react-calendar'
import { formatFullDate, keyToLocalDate, localDateToKey, todayKey } from '../../libs/date.ts'

interface DatePickerProps {
  id: string
  label: string // 달력 창의 접근성 이름
  value: string // YYYY-MM-DD, 비어 있으면 ''
  minDate?: string // 이 날짜보다 앞은 고를 수 없다
  disabled?: boolean
  onChange: (value: string) => void
}

// react-calendar의 CSS는 쓰지 않는다. 칸 배치는 라이브러리의 인라인 스타일이 잡고, 모양은 Tailwind로만 입힌다.
// 요일 줄은 react-calendar가 <abbr title>로, 날짜 칸은 title 없는 <abbr>로 그려서 title로 구분한다.
const calendarClass =
  'w-[min(18rem,calc(100vw-7.5rem))] [&_abbr[title]]:block [&_abbr[title]]:py-1 [&_abbr[title]]:text-center [&_abbr[title]]:text-xs [&_abbr[title]]:text-muted [&_abbr[title]]:no-underline'

const tileBaseClass =
  'aspect-square rounded-full text-sm tabular-nums transition-colors disabled:cursor-default disabled:opacity-30'
const tileStateClass = {
  selected: 'bg-accent font-semibold text-on-accent',
  today: 'font-bold text-accent enabled:hover:bg-surface',
  neighbor: 'text-muted enabled:hover:bg-surface',
  normal: 'enabled:hover:bg-surface',
} as const

const navButtonClass = 'grid size-9 place-items-center rounded-full text-muted hover:bg-surface disabled:opacity-30'

function monthStart(key: string): Date {
  const date = keyToLocalDate(key)
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function shiftMonth(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1)
}

// 구글 캘린더의 작은 달력처럼 날짜 칸을 원으로 그리는 날짜 선택. 입력 칸을 누르면 아래에 달력이 열린다
export default function DatePicker({ id, label, value, minDate, disabled, onChange }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [viewMonth, setViewMonth] = useState(() => monthStart(value || todayKey()))
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dialogId = useId()

  // 열려 있을 때 바깥을 누르면 닫는다
  useEffect(() => {
    if (!open) return
    function handlePointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  function toggle() {
    if (!open) setViewMonth(monthStart(value || todayKey()))
    setOpen(!open)
  }

  function close() {
    setOpen(false)
    triggerRef.current?.focus()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (open && e.key === 'Escape') {
      e.stopPropagation()
      close()
    }
  }

  function select(key: string) {
    onChange(key)
    close()
  }

  const today = todayKey()
  const canGoPrev = !minDate || viewMonth > monthStart(minDate)

  function tileClassName({ date, view }: TileArgs): string[] | null {
    if (view !== 'month') return null
    const key = localDateToKey(date)
    let state: keyof typeof tileStateClass = 'normal'
    if (key === value) state = 'selected'
    else if (key === today) state = 'today'
    else if (date.getMonth() !== viewMonth.getMonth()) state = 'neighbor'
    return [tileBaseClass, tileStateClass[state]]
  }

  function handleActiveStartDateChange({ activeStartDate }: OnArgs) {
    if (activeStartDate) setViewMonth(activeStartDate)
  }

  return (
    <div ref={rootRef} className="relative" onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-line bg-bg px-3 py-2 text-left tabular-nums disabled:opacity-60"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={dialogId}
        disabled={disabled}
        onClick={toggle}
      >
        {value ? formatFullDate(value) : <span className="text-muted">날짜를 골라 주세요</span>}
        <CalendarIcon />
      </button>

      {open && (
        <div
          id={dialogId}
          role="dialog"
          aria-label={label}
          className="absolute top-full left-0 z-20 mt-2 rounded-2xl border border-line bg-bg p-3 shadow-lg"
        >
          <div className="mb-1 flex items-center justify-between">
            <p className="pl-2 font-semibold tabular-nums" aria-live="polite">
              {viewMonth.getFullYear()}년 {viewMonth.getMonth() + 1}월
            </p>
            <div className="flex">
              <button
                type="button"
                className={navButtonClass}
                aria-label="이전 달"
                disabled={!canGoPrev}
                onClick={() => setViewMonth(shiftMonth(viewMonth, -1))}
              >
                <ArrowIcon direction="prev" />
              </button>
              <button
                type="button"
                className={navButtonClass}
                aria-label="다음 달"
                onClick={() => setViewMonth(shiftMonth(viewMonth, 1))}
              >
                <ArrowIcon direction="next" />
              </button>
            </div>
          </div>

          <Calendar
            className={calendarClass}
            locale="ko-KR"
            calendarType="gregory"
            minDetail="month"
            showNavigation={false}
            showFixedNumberOfWeeks
            activeStartDate={viewMonth}
            onActiveStartDateChange={handleActiveStartDateChange}
            value={value ? keyToLocalDate(value) : null}
            minDate={minDate ? keyToLocalDate(minDate) : undefined}
            formatDay={(_locale, date) => String(date.getDate())}
            tileClassName={tileClassName}
            onClickDay={(date) => select(localDateToKey(date))}
          />

          {value && (
            <div className="mt-2 flex justify-end">
              <button type="button" className="min-h-11 px-2 text-sm text-muted" onClick={() => select('')}>
                날짜 지우기
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CalendarIcon() {
  return (
    <svg
      className="size-5 shrink-0 text-muted"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  )
}

interface ArrowIconProps {
  direction: 'prev' | 'next'
}

function ArrowIcon({ direction }: ArrowIconProps) {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d={direction === 'prev' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
