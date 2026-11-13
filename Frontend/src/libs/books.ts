import type { Book, BookUnit, DailyTaskWithBook } from '../interfaces/study.ts'
import { addDays, formatMonthDay } from './date.ts'

export const UNIT_LABELS: Record<BookUnit, string> = { day: 'Day', chapter: '챕터', session: '회차' }

// 교재명 최대 글자 수. DB check(books_title_length)와 같다
export const TITLE_MAX_LENGTH = 20

// 교재 폼의 목표일 오류 문구
export const TARGETS_INVALID_MESSAGE = '목표일은 오늘부터 시험 전날 사이에서 회독 순서대로 골라 주세요.'

// 지금까지 끝낸 분량. 앞선 회독은 통째로 센다
export function completedUnits(book: Pick<Book, 'total_units' | 'current_round' | 'current_unit'>): number {
  return (book.current_round - 1) * book.total_units + book.current_unit
}

export function isBookFinished(book: Book): boolean {
  return completedUnits(book) >= book.target_rounds * book.total_units
}

// 숫자(또는 범위)에 단위를 붙인다. Day는 앞(Day 3), 챕터·회차는 뒤(3챕터, 12회)
export function withUnit(unit: BookUnit, value: string | number): string {
  if (unit === 'day') return `Day ${value}`
  return unit === 'chapter' ? `${value}챕터` : `${value}회`
}

// Day 3–4, 3–4챕터, 12–14회
export function rangeLabel(unit: BookUnit, start: number, end: number): string {
  return withUnit(unit, start === end ? `${start}` : `${start}–${end}`)
}

// 분량 한 줄의 범위. 목표가 2회독 이상인 교재만 몇 회독째인지 앞에 붙인다
export function taskLabel(task: DailyTaskWithBook): string {
  const range = rangeLabel(task.book.unit, task.start_unit, task.end_unit)
  return task.book.target_rounds >= 2 ? `${task.round}회독 ${range}` : range
}

// 12/30회, Day 12/60, 3/20챕터. 목표가 2회독 이상이면 앞에 2/3회독을 붙인다
export function progressLabel(book: Book): string {
  const position = withUnit(book.unit, `${book.current_unit}/${book.total_units}`)
  return book.target_rounds >= 2 ? `${book.current_round}/${book.target_rounds}회독 ${position}` : position
}

// 지금 회독의 목표일. 정하지 않았으면 null
export function currentTarget(book: Book): string | null {
  return book.round_targets[book.current_round - 1] ?? null
}

// 지금 회독의 목표일이 지났는데 그 회독을 아직 못 끝냈다
export function isTargetOverdue(book: Book, today: string): boolean {
  const target = currentTarget(book)
  return target !== null && target < today && book.current_unit < book.total_units
}

// 2회독 목표 12월 31일, 1회독 목표일 지남. 목표일이 없거나 그 회독을 끝냈으면 null
export function targetLabel(book: Book, today: string): string | null {
  const target = currentTarget(book)
  if (target === null || book.current_unit >= book.total_units) return null
  if (isTargetOverdue(book, today)) return `${book.current_round}회독 목표일 지남`
  return `${book.current_round}회독 목표 ${formatMonthDay(target)}`
}

// index번째(0부터) 회독 목표일을 고를 수 있는 범위. fromRound(1부터) 앞 회독은 이미 지난 값이라 따지지 않는다
// min: 오늘과 앞 회독 중 마지막으로 채운 목표일 중 늦은 날, max: 시험 전날(시험일이 없으면 없음)
export function roundTargetBounds(
  targets: (string | null)[],
  index: number,
  fromRound: number,
  today: string,
  examDate: string | null,
): { min: string; max: string | undefined } {
  let min = today
  for (const target of targets.slice(fromRound - 1, index)) {
    if (target !== null && target > min) min = target
  }
  return { min, max: examDate ? addDays(examDate, -1) : undefined }
}

// fromRound 이상 회독의 채운 목표일이 오늘 이상, 시험일 미만이고 순서대로 줄지 않는지. 앞 회독 값은 검사하지 않는다
export function isRoundTargetsValid(
  targets: (string | null)[],
  fromRound: number,
  today: string,
  examDate: string | null,
): boolean {
  let previous = today
  for (const target of targets.slice(fromRound - 1)) {
    if (target === null) continue
    if (target < previous || (examDate !== null && target >= examDate)) return false
    previous = target
  }
  return true
}
