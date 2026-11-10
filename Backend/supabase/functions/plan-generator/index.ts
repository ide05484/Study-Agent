// [plan-generator] 교재 추가·삭제, 진도·시험일 변경 후 프론트엔드가 호출한다.
// 오늘부터의 미진행(pending) daily_tasks를 지우고, 교재별 남은 분량(목표 회독까지)을 시험 전날까지 날짜별로 다시 나눈다.
// 나누는 규칙은 _shared/plan.ts의 planBook을 따른다.
// 이미 진행한 계획(done/partial)과 지난 날짜의 계획은 그대로 둔다.
// 응답 형식은 Frontend/src/interfaces/plan.ts의 `PlanResponse`를 따른다.

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { addDays, diffDays, toDateKey } from "../_shared/date.ts";
import { type PlanBook, planBook } from "../_shared/plan.ts";

const INSERT_CHUNK_SIZE = 500;

export default {
  // 사용자 JWT 필수. ctx.supabase는 RLS가 적용되어 본인 데이터만 다룬다
  fetch: withSupabase({ auth: "user" }, async (_req, ctx) => {
    const { supabase } = ctx;
    const userId = ctx.userClaims!.id;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("exam_date, timezone")
      .single();
    if (profileError) return errorResponse(profileError.message);

    const today = toDateKey(new Date(), profile.timezone);

    const { error: deleteError } = await supabase
      .from("daily_tasks")
      .delete()
      .gte("task_date", today)
      .eq("status", "pending");
    if (deleteError) return errorResponse(deleteError.message);

    if (!profile.exam_date) {
      return Response.json({ generated: 0, days: 0, skipped: "no_exam_date" });
    }
    // 시험 당일은 비우고 전날까지 공부한다
    const days = diffDays(today, profile.exam_date);
    if (days <= 0) {
      return Response.json({ generated: 0, days: 0, skipped: "exam_passed" });
    }

    const { data: books, error: booksError } = await supabase
      .from("books")
      .select(
        "id, total_pages, current_page, current_round, target_rounds, daily_amount",
      );
    if (booksError) return errorResponse(booksError.message);

    const rows = (books as PlanBook[]).flatMap((book) =>
      planBook(book, days).map((task) => ({
        user_id: userId,
        book_id: task.book_id,
        task_date: addDays(today, task.day),
        round: task.round,
        start_page: task.start_page,
        end_page: task.end_page,
      }))
    );

    for (let i = 0; i < rows.length; i += INSERT_CHUNK_SIZE) {
      const { error } = await supabase
        .from("daily_tasks")
        .insert(rows.slice(i, i + INSERT_CHUNK_SIZE));
      if (error) return errorResponse(error.message);
    }

    return Response.json({ generated: rows.length, days });
  }),
};

function errorResponse(message: string): Response {
  return Response.json({ error: message }, { status: 500 });
}

/* 로컬 호출 (로그인한 사용자의 access token 필요):

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/plan-generator' \
    --header 'Authorization: Bearer <access_token>'

*/
