-- 계획 교체: plan-generator가 부른다. p_from부터의 미진행(pending) 계획을 지우고 p_tasks를 넣는다.
-- 한 트랜잭션이라 중간에 실패하면 지운 계획도 되돌아간다.
-- 사용자별 advisory lock으로 재분배가 겹치면 순서대로 돈다. 함수 안의 문장마다 새 스냅샷을 보므로
-- 뒤에 도는 호출은 앞 호출이 넣은 계획까지 지운 뒤 넣어, 같은 계획이 두 줄 생기지 않는다.
-- security invoker라 daily_tasks·books의 RLS(user_id = auth.uid())가 그대로 적용된다.
-- p_tasks: [{ book_id, task_date, round, start_page, end_page }]. 본인 교재가 아닌 줄(도중에 지워진 교재 등)은 넣지 않는다.
-- 돌려주는 값: 넣은 줄 수
create function public.replace_daily_tasks(p_from date, p_tasks jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_inserted integer;
begin
  if v_user_id is null then
    raise exception '로그인한 사용자만 계획을 바꿀 수 있어요.' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('replace_daily_tasks:' || v_user_id::text, 0)
  );

  delete from public.daily_tasks
  where user_id = v_user_id
    and task_date >= p_from
    and status = 'pending';

  insert into public.daily_tasks (user_id, book_id, task_date, round, start_page, end_page)
  select v_user_id, t.book_id, t.task_date, t.round, t.start_page, t.end_page
  from pg_catalog.jsonb_to_recordset(coalesce(p_tasks, '[]'::jsonb)) as t (
    book_id uuid,
    task_date date,
    round integer,
    start_page integer,
    end_page integer
  )
  join public.books b on b.id = t.book_id;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

-- public 스키마 함수는 기본으로 anon도 실행할 수 있어 /rest/v1/rpc로 노출된다. 로그인한 사용자만 허용한다
revoke execute on function public.replace_daily_tasks(date, jsonb) from public, anon;
grant execute on function public.replace_daily_tasks(date, jsonb) to authenticated;
