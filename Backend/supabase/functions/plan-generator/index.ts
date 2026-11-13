// [plan-generator] 교재 추가·삭제, 진도·시험일 변경 후 프론트엔드가 호출한다.
// 오늘부터의 미진행(pending) daily_tasks를 지우고, 교재별 남은 분량(목표 회독까지)을 시험 전날까지 날짜별로 다시 나눈다.
// 지우기·넣기는 DB 함수 replace_daily_tasks가 한 트랜잭션으로 하고, 사용자별 잠금으로 겹친 호출을 순서대로 처리한다.
// 나누는 규칙은 _shared/plan.ts의 planBook을 따른다(회독별 목표일, 하루 최소 분량, 마지막 주 상한).
// 이미 진행한 계획(done/partial)은 그대로 두고, 지난 날짜의 미진행 계획은 skipped(못 해서 뒤로 넘김)로 바꾼다.
// 오늘 이미 분량을 끝낸(done/partial) 교재는 내일부터 나눈다(planBookFromTomorrow). 오늘 분량이 또 생기지 않게 한다.
// 응답 형식은 Frontend/src/interfaces/plan.ts의 `PlanResponse`를 따른다.

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { addDays, diffDays, toDateKey } from "../_shared/date.ts";
import {
  LAST_WEEK_DAYS,
  type PlanBook,
  planBook,
  planBookFromTomorrow,
} from "../_shared/plan.ts";

interface BookRow extends PlanBook {
  round_targets: (string | null)[]; // 회독별 목표일, null은 목표일 없음
}

interface D8Row {
  book_id: string;
  start_unit: number;
  end_unit: number;
}

export default {
  // 사용자 JWT 필수. ctx.supabase는 RLS가 적용되어 본인 데이터만 다룬다
  fetch: withSupabase({ auth: "user" }, async (_req, ctx) => {
    const { supabase } = ctx;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("exam_date, timezone")
      .single();
    if (profileError) return errorResponse(profileError.message);

    const today = toDateKey(new Date(), profile.timezone);

    // 시험일이 없거나 지났으면 오늘부터의 미진행 계획만 지운다(빈 배열로 교체)
    if (!profile.exam_date) {
      const result = await replaceTasks(supabase, today, []);
      if ("error" in result) return errorResponse(result.error);
      return Response.json({ generated: 0, days: 0, skipped: "no_exam_date" });
    }
    // 시험 당일은 비우고 전날까지 공부한다
    const days = diffDays(today, profile.exam_date);
    if (days <= 0) {
      const result = await replaceTasks(supabase, today, []);
      if ("error" in result) return errorResponse(result.error);
      return Response.json({ generated: 0, days: 0, skipped: "exam_passed" });
    }

    // 교재는 잠금 밖에서 읽는다. 두 탭에서 거의 동시에 부르면 먼저 읽은 쪽이 나중에 교체해 낡은 계획이 남을 수 있지만
    // (같은 줄이 두 번 생기지는 않는다), 다음 저장 때 다시 나눠져 맞춰진다. 한 화면 안의 교재 변경은 useBooks가 순서대로 부른다
    // 오늘 끝낸 교재의 오늘 줄은 replace_daily_tasks가 잠금 안에서 한 번 더 거른다

    const { data: books, error: booksError } = await supabase
      .from("books")
      .select(
        "id, total_units, current_unit, current_round, target_rounds, daily_amount, round_targets",
      );
    if (booksError) return errorResponse(booksError.message);

    // 마지막 주(D-7 이후)에는 교재별 D-8 분량을 하루 상한으로 넘긴다. D-8은 지난 날이라 계획이 지워지지 않고 남아 있다
    const caps = new Map<string, number>();
    if (days <= LAST_WEEK_DAYS) {
      const { data: d8, error: d8Error } = await supabase
        .from("daily_tasks")
        .select("book_id, start_unit, end_unit")
        .eq("task_date", addDays(profile.exam_date, -(LAST_WEEK_DAYS + 1)));
      if (d8Error) return errorResponse(d8Error.message);
      for (const row of d8 as D8Row[]) {
        const amount = row.end_unit - row.start_unit + 1;
        caps.set(row.book_id, (caps.get(row.book_id) ?? 0) + amount);
      }
    }

    // 오늘 이미 끝낸(done/partial) 분량이 있는 교재
    const { data: doneToday, error: doneError } = await supabase
      .from("daily_tasks")
      .select("book_id")
      .eq("task_date", today)
      .in("status", ["done", "partial"]);
    if (doneError) return errorResponse(doneError.message);
    const doneBookIds = new Set(
      (doneToday as { book_id: string }[]).map((row) => row.book_id),
    );

    const tasks = (books as BookRow[]).flatMap((book) =>
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

    const result = await replaceTasks(supabase, today, tasks);
    if ("error" in result) return errorResponse(result.error);

    // 도중에 지워진 교재의 줄은 DB가 넣지 않으므로, 실제로 넣은 줄 수를 돌려준다
    return Response.json({ generated: result.inserted, days });
  }),
};

interface TaskRow {
  book_id: string;
  task_date: string;
  round: number;
  start_unit: number;
  end_unit: number;
}

// 지우기와 넣기를 DB 함수 replace_daily_tasks 한 번(한 트랜잭션, 사용자별 잠금)으로 한다.
// 성공하면 DB가 넣은 줄 수, 실패하면 오류 문구
async function replaceTasks(
  supabase: RpcClient,
  from: string,
  tasks: TaskRow[],
): Promise<{ inserted: number } | { error: string }> {
  const { data, error } = await supabase.rpc("replace_daily_tasks", {
    p_from: from,
    p_tasks: tasks,
  });
  if (error) return { error: error.message };
  return { inserted: typeof data === "number" ? data : tasks.length };
}

// ctx.supabase는 DB 타입 없이 만들어지므로 rpc 모양만 적어 둔다
interface RpcClient {
  rpc(
    fn: "replace_daily_tasks",
    args: { p_from: string; p_tasks: TaskRow[] },
  ): PromiseLike<{ data: unknown; error: { message: string } | null }>;
}

function errorResponse(message: string): Response {
  return Response.json({ error: message }, { status: 500 });
}

/* 로컬 호출 (로그인한 사용자의 access token 필요):

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/plan-generator' \
    --header 'Authorization: Bearer <access_token>'

*/
