import type { BookRef, StudyEntry } from "./analysis.ts";

// 채팅 보고가 가리키는 회독과 끝 위치. 진도를 바꾸지 않을 보고(복습 등)는 null
export function resolvePosition(
  book: BookRef,
  entry: StudyEntry,
): { round: number; end_unit: number } | null {
  if (entry.book_id === null || entry.book_id !== book.id) return null;
  if (entry.end_unit === null) return null;
  const end_unit = entry.end_unit;
  if (entry.round !== null) {
    if (entry.round < 1 || entry.round > book.target_rounds) return null;
    return { round: entry.round, end_unit };
  }
  if (end_unit > book.current_unit) {
    return { round: book.current_round, end_unit };
  }
  if (
    book.current_unit === book.total_units &&
    book.current_round < book.target_rounds &&
    end_unit < book.total_units
  ) {
    return { round: book.current_round + 1, end_unit };
  }
  return null;
}
