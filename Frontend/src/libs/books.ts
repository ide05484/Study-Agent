import type { Book, BookUnit } from '../interfaces/study.ts'

export const UNIT_LABELS: Record<BookUnit, string> = { page: '쪽', day: 'Day' }

// 지금까지 끝낸 분량. 앞선 회독은 통째로 센다
export function completedUnits(book: Pick<Book, 'total_pages' | 'current_round' | 'current_page'>): number {
  return (book.current_round - 1) * book.total_pages + book.current_page
}

export function isBookFinished(book: Book): boolean {
  return completedUnits(book) >= book.target_rounds * book.total_pages
}

// 쪽은 숫자 뒤(12–20쪽), Day는 숫자 앞(Day 3–4)에 단위를 붙인다
export function rangeLabel(unit: BookUnit, start: number, end: number): string {
  const range = start === end ? `${start}` : `${start}–${end}`
  return unit === 'day' ? `Day ${range}` : `${range}쪽`
}

// 입력 칸 문자열이 min~max의 정수인지(빈 칸·소수는 false). max를 생략하면 상한이 없다
export function isIntegerInRange(text: string, min: number, max = Infinity): boolean {
  const value = Number(text)
  return text.trim() !== '' && Number.isInteger(value) && value >= min && value <= max
}

// 120/456쪽, Day 12/60. 목표가 2회독 이상이면 앞에 1/3회독을 붙인다
export function progressLabel(book: Book): string {
  const position =
    book.unit === 'day' ? `Day ${book.current_page}/${book.total_pages}` : `${book.current_page}/${book.total_pages}쪽`
  return book.target_rounds >= 2 ? `${book.current_round}/${book.target_rounds}회독 ${position}` : position
}
