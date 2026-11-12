// [plan-generator] 교재 추가·삭제, 진도·시험일 변경 후 프론트엔드가 호출한다.
// 오늘부터의 미진행(pending) daily_tasks를 지우고, 교재별 남은 분량(목표 회독까지)을 시험 전날까지 날짜별로 다시 나눈다.
// 지우기·넣기는 DB 함수 replace_daily_tasks가 한 트랜잭션으로 하고, 사용자별 잠금으로 겹친 호출을 순서대로 처리한다.
// 나누는 규칙은 _shared/plan.ts의 planBook을 따른다.
// 이미 진행한 계획(done/partial)과 지난 날짜의 계획은 그대로 둔다.
// 응답 형식은 Frontend/src/interfaces/plan.ts의 `PlanResponse`를 따른다.

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { addDays, diffDays, toDateKey } from "../_shared/date.ts";
import { type PlanBook, planBook } from "../_shared/plan.ts";

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
      const error = await replaceTasks(supabase, today, []);
      if (error) return errorResponse(error);
      return Response.json({ generated: 0, days: 0, skipped: "no_exam_date" });
    }
    // 시험 당일은 비우고 전날까지 공부한다
    const days = diffDays(today, profile.exam_date);
    if (days <= 0) {
      const error = await replaceTasks(supabase, today, []);
      if (error) return errorResponse(error);
      return Response.json({ generated: 0, days: 0, skipped: "exam_passed" });
    }

    const { data: books, error: booksError } = await supabase
      .from("books")
      .select(
        "id, total_pages, current_page, current_round, target_rounds, daily_amount",
      );
    if (booksError) return errorResponse(booksError.message);

    const tasks = (books as PlanBook[]).flatMap((book) =>
      planBook(book, days).map((task) => ({
        book_id: task.book_id,
        task_date: addDays(today, task.day),
        round: task.round,
        start_page: task.start_page,
        end_page: task.end_page,
      }))
    );

    const error = await replaceTasks(supabase, today, tasks);
    if (error) return errorResponse(error);

    return Response.json({ generated: tasks.length, days });
  }),
};

interface TaskRow {
  book_id: string;
  task_date: string;
  round: number;
  start_page: number;
  end_page: number;
}

// 지우기와 넣기를 DB 함수 replace_daily_tasks 한 번(한 트랜잭션, 사용자별 잠금)으로 한다. 실패하면 오류 문구
async function replaceTasks(
  supabase: RpcClient,
  from: string,
  tasks: TaskRow[],
): Promise<string | null> {
  const { error } = await supabase.rpc("replace_daily_tasks", {
    p_from: from,
    p_tasks: tasks,
  });
  return error ? error.message : null;
}

interface RpcClient {
  rpc(
    fn: string,
    args: Record<string, unknown>,
  ): PromiseLike<{ error: { message: string } | null }>;
}

function errorResponse(message: string): Response {
  return Response.json({ error: message }, { status: 500 });
}

/* 로컬 호출 (로그인한 사용자의 access token 필요):

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/plan-generator' \
    --header 'Authorization: Bearer <access_token>'

*/
