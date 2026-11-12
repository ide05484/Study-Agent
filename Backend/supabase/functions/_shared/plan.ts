// 교재 분량을 시험 전날까지 날짜별로 나누는 순수 로직.
// plan-generator(Deno)와 Node 스크립트(계획 미리보기)가 함께 쓰므로 아무것도 import하지 않는다.

export interface PlanBook {
  id: string;
  total_units: number;
  current_unit: number;
  current_round: number;
  target_rounds: number;
  // null이면 남은 분량을 날짜 수로 고르게 나눈다
  daily_amount: number | null;
}

export interface PlannedTask {
  book_id: string;
  day: number; // 오늘부터 며칠째 (0 = 오늘)
  round: number;
  start_unit: number;
  end_unit: number;
}

// 목표 회독을 이어 붙였을 때 지금까지 끝낸 분량
export function completedUnits(book: PlanBook): number {
  return (book.current_round - 1) * book.total_units + book.current_unit;
}

// 남은 분량(목표 회독까지)을 days일에 나눈다. 하루 범위가 회독 경계를 넘으면 회독마다 한 줄로 나눈다.
// 고정 분량이 days일 안에 끝나지 않으면 마지막 날에서 자른다. 분량이 0인 날은 건너뛴다.
export function planBook(book: PlanBook, days: number): PlannedTask[] {
  const total = book.total_units;
  const done = completedUnits(book);
  const remaining = book.target_rounds * total - done;
  const tasks: PlannedTask[] = [];
  if (remaining <= 0 || days <= 0) return tasks;

  for (let day = 0; day < days; day++) {
    let from: number;
    let to: number; // 남은 분량 안의 위치 [from, to)
    if (book.daily_amount === null) {
      from = Math.floor((day * remaining) / days);
      to = Math.floor(((day + 1) * remaining) / days);
    } else {
      from = day * book.daily_amount;
      if (from >= remaining) break;
      to = Math.min(remaining, (day + 1) * book.daily_amount);
    }

    // 교재 기준 위치 u(0부터)를 회독 경계에서 끊는다
    let unit = done + from;
    const end = done + to;
    while (unit < end) {
      const round = Math.floor(unit / total) + 1;
      const roundStart = (round - 1) * total;
      const segmentEnd = Math.min(end, round * total);
      tasks.push({
        book_id: book.id,
        day,
        round,
        start_unit: unit - roundStart + 1,
        end_unit: segmentEnd - roundStart,
      });
      unit = segmentEnd;
    }
  }
  return tasks;
}
