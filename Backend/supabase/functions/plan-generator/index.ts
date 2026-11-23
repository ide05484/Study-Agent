// [plan-generator] 교재 추가·삭제, 진도·시험일 변경 후 프론트엔드가 호출한다.
// 나누는 일은 _shared/replan.ts가 한다(오늘부터의 미진행 계획을 지우고 시험 전날까지 다시 나눔, 규칙은 _shared/plan.ts).
// 이 함수는 사용자 JWT로 호출을 받아 replan을 부르고 결과 줄 수만 돌려준다.
// 응답 형식은 Frontend/src/interfaces/plan.ts의 `PlanResponse`를 따른다.

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { replan } from "../_shared/replan.ts";

export default {
  // 사용자 JWT 필수. ctx.supabase는 RLS가 적용되어 본인 데이터만 다룬다
  fetch: withSupabase({ auth: "user" }, async (_req, ctx) => {
    try {
      const { tasks: _tasks, ...response } = await replan(ctx.supabase);
      return Response.json(response);
    } catch (e) {
      return errorResponse(e instanceof Error ? e.message : String(e));
    }
  }),
};

function errorResponse(message: string): Response {
  return Response.json({ error: message }, { status: 500 });
}

/* 로컬 호출 (로그인한 사용자의 access token 필요):

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/plan-generator' \
    --header 'Authorization: Bearer <access_token>'

*/
