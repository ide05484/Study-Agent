// 교재 분량을 시험 전날까지 날짜별로 나누는 순수 로직.
// plan-generator(Deno)와 Node 스크립트(계획 미리보기)가 함께 쓰므로 아무것도 import하지 않는다.
// 날짜 계산(목표일 → 며칠째, D-8 분량)은 호출자가 해서 PlanOptions로 넘긴다.

export interface PlanBook {
  id: string;
  total_units: number;
  current_unit: number;
  current_round: number;
  target_rounds: number;
  // 하루 최소 분량. null이면 목표일(없으면 시험 전날)까지 고르게 나눈다
  daily_amount: number | null;
}

export interface PlanOptions {
  days: number; // 오늘(0)부터 시험 전날까지의 날 수
  targetDays: (number | null)[]; // n번째 = n회독 목표일이 오늘부터 며칠째(음수 = 지남), null = 없음
  lastWeekCap: number | null; // 마지막 7일의 하루 상한(D-8 분량). 없으면 null
}

export interface PlannedTask {
  book_id: string;
  day: number; // 오늘부터 며칠째 (0 = 오늘)
  round: number;
  start_unit: number;
  end_unit: number;
}

// 목표일이 지났는데 그 회독을 못 끝냈으면 오늘부터 이만큼 뒤(최대 시험 전날)를 기한으로 본다
export const OVERDUE_GRACE_DAYS = 14;
// 시험 전날부터 거꾸로 이 날 수는 분량을 늘려 따라잡지 않는다
export const LAST_WEEK_DAYS = 7;

// 목표 회독을 이어 붙였을 때 지금까지 끝낸 분량
export function completedUnits(
  book: Pick<PlanBook, "total_units" | "current_round" | "current_unit">,
): number {
  return (book.current_round - 1) * book.total_units + book.current_unit;
}

// "누적 위치 end까지 day일째까지 끝낸다"
interface Deadline {
  end: number;
  day: number;
}

// 목표일이 있는 회독마다 기한을 만들고, 마지막은 늘 "목표 회독 끝, 시험 전날"이다.
// 지난 목표일은 오늘 + 14일, 시험 이후는 시험 전날로 보고, 앞 기한보다 이르면 앞 기한으로 올린다.
// 같은 날 기한은 하나로 합쳐 기한의 날이 엄격히 늘어나게 한다
function buildDeadlines(
  book: PlanBook,
  options: PlanOptions,
  done: number,
): Deadline[] {
  const lastDay = options.days - 1;
  const deadlines: Deadline[] = [];
  const push = (end: number, day: number) => {
    if (end <= done) return;
    const prev = deadlines.at(-1);
    if (prev) {
      day = Math.max(day, prev.day);
      if (day === prev.day) {
        prev.end = Math.max(prev.end, end);
        return;
      }
    }
    deadlines.push({ end, day });
  };

  for (let round = book.current_round; round <= book.target_rounds; round++) {
    const target = options.targetDays[round - 1];
    if (target === null || target === undefined) continue;
    const day = target < 0 ? OVERDUE_GRACE_DAYS : target;
    push(round * book.total_units, Math.min(day, lastDay));
  }
  push(book.target_rounds * book.total_units, lastDay);
  return deadlines;
}

// 남은 분량(목표 회독까지)을 기한 구간마다 고르게 나눈다. 하루 분량은 하루 최소 분량 이상이고,
// 마지막 7일은 lastWeekCap 이하라 못 끝낸 분량이 남을 수 있다.
// 하루 범위가 회독 경계를 넘으면 회독마다 한 줄로 나눈다. 분량이 0인 날은 건너뛴다.
export function planBook(book: PlanBook, options: PlanOptions): PlannedTask[] {
  const total = book.total_units;
  const done = completedUnits(book);
  const finish = book.target_rounds * total;
  const tasks: PlannedTask[] = [];
  if (finish - done <= 0 || options.days <= 0) return tasks;

  const deadlines = buildDeadlines(book, options, done);
  let index = 0;
  // 구간을 시작한 날 s, 그때 위치 p0, 구간 분량 a, 구간 날 수 l
  let segment: { s: number; p0: number; a: number; l: number } | null = null;
  let pos = done;

  for (let day = 0; day < options.days && pos < finish; day++) {
    while (pos >= deadlines[index].end) {
      index++;
      segment = null;
    }
    if (!segment) {
      const deadline = deadlines[index];
      segment = {
        s: day,
        p0: pos,
        a: deadline.end - pos,
        l: Math.max(1, deadline.day - day + 1),
      };
    }

    const even = segment.p0 +
      Math.floor(((day - segment.s + 1) * segment.a) / segment.l);
    let amount = Math.max(even - pos, book.daily_amount ?? 0);
    if (
      options.lastWeekCap !== null && day >= options.days - LAST_WEEK_DAYS
    ) {
      amount = Math.min(amount, options.lastWeekCap);
    }
    amount = Math.min(amount, finish - pos);
    if (amount <= 0) continue;

    // 교재 기준 위치(0부터)를 회독 경계에서 끊는다
    const end = pos + amount;
    let unit = pos;
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
    pos = end;
  }
  return tasks;
}
