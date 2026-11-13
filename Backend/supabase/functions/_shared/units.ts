// DB enum `public.book_unit`과 값이 일치해야 한다
export type BookUnit = "day" | "chapter" | "session";

// Frontend `libs/books.ts`의 표기와 같게 맞춘다
export interface ProgressBook {
  unit: BookUnit;
  total_units: number;
  current_unit: number;
  current_round: number;
  target_rounds: number;
}

// 숫자(또는 범위)에 단위를 붙인다. Day는 앞(Day 3), 챕터·회차는 뒤(3챕터, 12회)
export function withUnit(unit: BookUnit, value: string | number): string {
  if (unit === "day") return `Day ${value}`;
  return unit === "chapter" ? `${value}챕터` : `${value}회`;
}

// Day 3–4, 3–4챕터, 12–14회
export function rangeLabel(
  unit: BookUnit,
  start: number,
  end: number,
): string {
  return withUnit(unit, start === end ? `${start}` : `${start}–${end}`);
}

// 분량의 범위. 목표가 2회독 이상이면 몇 회독째인지 앞에 붙인다
export function taskRangeLabel(
  targetRounds: number,
  round: number,
  unit: BookUnit,
  start: number,
  end: number,
): string {
  const range = rangeLabel(unit, start, end);
  return targetRounds >= 2 ? `${round}회독 ${range}` : range;
}

// 12/30회, Day 12/60, 3/20챕터. 목표가 2회독 이상이면 앞에 2/3회독을 붙인다
export function progressLabel(book: ProgressBook): string {
  const position = withUnit(
    book.unit,
    `${book.current_unit}/${book.total_units}`,
  );
  return book.target_rounds >= 2
    ? `${book.current_round}/${book.target_rounds}회독 ${position}`
    : position;
}

// 200 → 3시간 20분, 180 → 3시간, 40 → 40분
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}분`;
  return rest === 0 ? `${hours}시간` : `${hours}시간 ${rest}분`;
}
