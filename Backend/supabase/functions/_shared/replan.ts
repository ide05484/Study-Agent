// 계획 재분배 공용 모듈. plan-generator(프론트 호출)와 chat(채팅으로 교재 추가)이 함께 쓴다.
// 오늘부터의 미진행(pending) daily_tasks를 지우고, 교재별 남은 분량(목표 회독까지)을 시험 전날까지 날짜별로 다시 나눈다.
// 지우기·넣기는 DB 함수 replace_daily_tasks가 한 트랜잭션으로 하고, 사용자별 잠금으로 겹친 호출을 순서대로 처리한다.
// 나누는 규칙은 plan.ts의 planBook을 따른다(회독별 목표일, 하루 최소 분량, 마지막 주 상한).
// 이미 진행한 계획(done/partial)은 그대로 두고, 지난 날짜의 미진행 계획은 skipped(못 해서 뒤로 넘김)로 바꾼다.
// 오늘 이미 분량을 끝낸(done/partial) 교재는 내일부터 나눈다(planBookFromTomorrow). 오늘 분량이 또 생기지 않게 한다.
// 오류는 Error를 던진다.

import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, diffDays, studyDayKey } from "./date.ts";
import {
  LAST_WEEK_DAYS,
  type PlanBook,
  planBook,
  planBookFromTomorrow,
} from "./plan.ts";

export interface PlannedTask {
  book_id: string;
  task_date: string; // YYYY-MM-DD
  round: number;
  start_unit: number;
  end_unit: number;
}

export interface ReplanResult {
  generated: number;
  days: number;
  skipped?: "no_exam_date" | "exam_passed";
  tasks: PlannedTask[]; // 새로 나눈 줄. skipped이면 빈 배열
}

interface BookRow extends PlanBook {
  round_targets: (string | null)[]; // 회독별 목표일, null은 목표일 없음
}

interface D8Row {
  book_id: string;
  start_unit: number;
  end_unit: number;
}

export async function replan(sb: SupabaseClient): Promise<ReplanResult> {
  const { data: profile, error: profileError } = await sb
    .from("profiles")
    .select("exam_date, timezone")
    .single();
  if (profileError) throw new Error(profileError.message);

  // 공부 날짜 기준(새벽 2시 전이면 전날). 그 전에 고쳐도 전날 분량을 지난 날로 보지 않는다
  const today = studyDayKey(new Date(), profile.timezone);

  // 시험일이 없거나 지났으면 오늘부터의 미진행 계획만 지운다(빈 배열로 교체)
  if (!profile.exam_date) {
    await replaceTasks(sb, today, []);
    return { generated: 0, days: 0, skipped: "no_exam_date", tasks: [] };
  }
  // 시험 당일은 비우고 전날까지 공부한다
  const days = diffDays(today, profile.exam_date);
  if (days <= 0) {
    await replaceTasks(sb, today, []);
    return { generated: 0, days: 0, skipped: "exam_passed", tasks: [] };
  }

  // 교재는 잠금 밖에서 읽는다. 두 탭에서 거의 동시에 부르면 먼저 읽은 쪽이 나중에 교체해 낡은 계획이 남을 수 있지만
  // (같은 줄이 두 번 생기지는 않는다), 다음 저장 때 다시 나눠져 맞춰진다. 한 화면 안의 교재 변경은 useBooks가 순서대로 부른다
  // 오늘 끝낸 교재의 오늘 줄은 replace_daily_tasks가 잠금 안에서 한 번 더 거른다

  const { data: books, error: booksError } = await sb
    .from("books")
    .select(
      "id, total_units, current_unit, current_round, target_rounds, daily_amount, round_targets",
    );
  if (booksError) throw new Error(booksError.message);

  // 마지막 주(D-7 이후)에는 교재별 D-8 분량을 하루 상한으로 넘긴다. D-8은 지난 날이라 계획이 지워지지 않고 남아 있다
  const caps = new Map<string, number>();
  if (days <= LAST_WEEK_DAYS) {
    const { data: d8, error: d8Error } = await sb
      .from("daily_tasks")
      .select("book_id, start_unit, end_unit")
      .eq("task_date", addDays(profile.exam_date, -(LAST_WEEK_DAYS + 1)));
    if (d8Error) throw new Error(d8Error.message);
    for (const row of d8 as D8Row[]) {
      const amount = row.end_unit - row.start_unit + 1;
      caps.set(row.book_id, (caps.get(row.book_id) ?? 0) + amount);
    }
  }

  // 오늘 이미 끝낸(done/partial) 분량이 있는 교재
  const { data: doneToday, error: doneError } = await sb
    .from("daily_tasks")
    .select("book_id")
    .eq("task_date", today)
    .in("status", ["done", "partial"]);
  if (doneError) throw new Error(doneError.message);
  const doneBookIds = new Set(
    (doneToday as { book_id: string }[]).map((row) => row.book_id),
  );

  const tasks: PlannedTask[] = (books as BookRow[]).flatMap((book) =>
    (doneBookIds.has(book.id) ? planBookFromTomorrow : planBook)(book, {
      days,
      targetDays: book.round_targets.map((date) =>
        date ? diffDays(today, date) : null
      ),
      lastWeekCap: caps.get(book.id) ?? null,
    }).map((task) => ({
      book_id: task.book_id,
      task_date: addDays(today, task.day),
      round: task.round,
      start_unit: task.start_unit,
      end_unit: task.end_unit,
    }))
  );

  const inserted = await replaceTasks(sb, today, tasks);

  // 도중에 지워진 교재의 줄은 DB가 넣지 않으므로, 실제로 넣은 줄 수를 돌려준다
  return { generated: inserted, days, tasks };
}

// 지우기와 넣기를 DB 함수 replace_daily_tasks 한 번(한 트랜잭션, 사용자별 잠금)으로 한다.
// 성공하면 DB가 넣은 줄 수, 실패하면 Error
async function replaceTasks(
  sb: SupabaseClient,
  from: string,
  tasks: PlannedTask[],
): Promise<number> {
  const { data, error } = await sb.rpc("replace_daily_tasks", {
    p_from: from,
    p_tasks: tasks,
  });
  if (error) throw new Error(error.message);
  return typeof data === "number" ? data : tasks.length;
}
