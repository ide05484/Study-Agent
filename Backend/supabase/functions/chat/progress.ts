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
  // 회독을 막 끝낸 교재는 1부터 시작하는 보고만 다음 회독으로 본다("1~3강").
  // 그 밖의 앞부분(복습, 시작 없는 "3강까지")은 기록만 남긴다
  if (
    book.current_unit === book.total_units &&
    book.current_round < book.target_rounds &&
    entry.start_unit === 1 &&
    end_unit < book.total_units
  ) {
    return { round: book.current_round + 1, end_unit };
  }
  return null;
}

// report_progress가 DB에서 하는 진도 계산과 같다. 한 메시지의 다음 보고를 판단할 때 쓴다.
// 새 완료 = max(지금, 보고 위치)(목표 회독 × 총량 이하). 회독을 막 끝내면 그 회독의 끝(total)에 둔다
export function advance(
  book: BookRef,
  position: { round: number; end_unit: number },
): BookRef {
  const total = book.total_units;
  const done = (book.current_round - 1) * total + book.current_unit;
  const reported = (position.round - 1) * total + position.end_unit;
  const next = Math.min(Math.max(done, reported), book.target_rounds * total);
  if (next <= done) return book;
  const round = Math.floor((next - 1) / total) + 1;
  return {
    ...book,
    current_round: round,
    current_unit: next - (round - 1) * total,
  };
}
