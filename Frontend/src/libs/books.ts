import type { Book, BookUnit } from '../interfaces/study.ts'
import { addDays, formatMonthDay } from './date.ts'

export const UNIT_LABELS: Record<BookUnit, string> = { day: 'Day', chapter: '챕터', session: '회차' }

// 교재 폼의 오류 문구
export const REQUIRED_MESSAGE = '필수 항목이에요.'
export const TARGETS_INVALID_MESSAGE = '목표일은 오늘부터 시험 전날 사이에서 회독 순서대로 골라 주세요.'

// 정수 칸의 오류 문구. 비었으면 required일 때만 필수 안내, 범위 밖이면 범위 안내, 맞으면 null
export function integerFieldError(text: string, min: number, max: number, required: boolean): string | null {
  if (text.trim() === '') return required ? REQUIRED_MESSAGE : null
  if (isIntegerInRange(text, min, max)) return null
  return max === Infinity ? `${min} 이상의 정수로 적어 주세요.` : `${min}~${max} 사이의 정수로 적어 주세요.`
}

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

// 입력 칸 문자열이 min~max의 정수인지(빈 칸·소수는 false). max를 생략하면 상한이 없다
export function isIntegerInRange(text: string, min: number, max = Infinity): boolean {
  const value = Number(text)
  return text.trim() !== '' && Number.isInteger(value) && value >= min && value <= max
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
