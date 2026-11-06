// [plan-generator] 교재 추가·삭제, 시험일 변경 후 프론트엔드가 호출한다.
// 오늘부터의 미진행(pending) daily_tasks를 지우고, 교재별 남은 페이지를 시험 전날까지 날짜별로 고르게 다시 나눈다.
// 이미 진행한 계획(done/partial)과 지난 날짜의 계획은 그대로 둔다.
// 응답 형식은 Frontend/src/interfaces/plan.ts의 `PlanResponse`를 따른다.

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { addDays, diffDays, toDateKey } from "../_shared/date.ts";

const INSERT_CHUNK_SIZE = 500;

interface BookRow {
  id: string;
  total_pages: number;
  current_page: number;
}

interface PageRange {
  day: number; // 오늘부터 며칠째 (0 = 오늘)
  start: number;
  end: number;
}

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
      .select("id, total_pages, current_page");
    if (booksError) return errorResponse(booksError.message);

    const rows = (books as BookRow[]).flatMap((book) =>
      splitPages(book, days).map((range) => ({
        user_id: userId,
        book_id: book.id,
        task_date: addDays(today, range.day),
        start_page: range.start,
        end_page: range.end,
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

// 남은 페이지(current_page + 1 ~ total_pages)를 days일에 고르게 나눈다. 분량이 0인 날은 건너뛴다
function splitPages(book: BookRow, days: number): PageRange[] {
  const first = book.current_page + 1;
  const remaining = book.total_pages - book.current_page;
  const ranges: PageRange[] = [];
  for (let day = 0; day < days; day++) {
    const start = first + Math.floor((day * remaining) / days);
    const end = first + Math.floor(((day + 1) * remaining) / days) - 1;
    if (end >= start) ranges.push({ day, start, end });
  }
  return ranges;
}

function errorResponse(message: string): Response {
  return Response.json({ error: message }, { status: 500 });
}

/* 로컬 호출 (로그인한 사용자의 access token 필요):

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/plan-generator' \
    --header 'Authorization: Bearer <access_token>'

*/
