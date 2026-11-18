-- 계획 교체 보강: plan-generator는 교재 진도와 "오늘 끝낸 교재"를 DB 잠금 밖에서 읽고 이 함수로 교체한다.
-- 읽은 뒤 교체 전에 set_task_done(같은 잠금)이 커밋되면 옛 진도로 만든 오늘 줄이 들어가 오늘 done 줄 옆에
-- 같은 범위의 pending 줄이 하나 더 생길 수 있다. 그래서 잠금 안에서 한 번 더 거른다:
-- p_from 날짜 줄은 같은 사용자·같은 교재의 p_from 날짜에 done·partial 줄이 이미 있으면 넣지 않는다.
-- 나머지(잠금·skipped 처리·삭제·본인 교재 확인·권한)는 20261113011208_set_task_done과 같다.
create or replace function public.replace_daily_tasks(p_from date, p_tasks jsonb)
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

  update public.daily_tasks
  set status = 'skipped'
  where user_id = v_user_id
    and task_date < p_from
    and status = 'pending';

  delete from public.daily_tasks
  where user_id = v_user_id
    and task_date >= p_from
    and status = 'pending';

  insert into public.daily_tasks (user_id, book_id, task_date, round, start_unit, end_unit)
  select v_user_id, t.book_id, t.task_date, t.round, t.start_unit, t.end_unit
  from pg_catalog.jsonb_to_recordset(coalesce(p_tasks, '[]'::jsonb)) as t (
    book_id uuid,
    task_date date,
    round integer,
    start_unit integer,
    end_unit integer
  )
  join public.books b on b.id = t.book_id
  where not (
    t.task_date = p_from
    and exists (
      select 1
      from public.daily_tasks d
      where d.user_id = v_user_id
        and d.book_id = t.book_id
        and d.task_date = p_from
        and d.status in ('done', 'partial')
    )
  );

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

comment on function public.replace_daily_tasks(date, jsonb) is
  '계획 교체. p_from 이전의 pending은 skipped로, p_from부터의 pending은 지우고 p_tasks를 넣는다. p_from 날짜에 이미 done·partial 줄이 있는 교재의 p_from 줄은 넣지 않는다. 넣은 줄 수를 돌려준다';

revoke execute on function public.replace_daily_tasks(date, jsonb) from public, anon;
grant execute on function public.replace_daily_tasks(date, jsonb) to authenticated;
