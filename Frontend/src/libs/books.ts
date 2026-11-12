import type { Book, BookUnit } from '../interfaces/study.ts'

export const UNIT_LABELS: Record<BookUnit, string> = { day: 'Day', chapter: '챕터', session: '회차' }

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
