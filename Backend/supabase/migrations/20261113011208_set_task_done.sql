-- 오늘의 분량 체크: 분량 상태와 교재 진도를 한 트랜잭션에서 바꾼다(시트 체크와 채팅 완료 보고가 함께 쓴다).
-- 계획 교체: 지우고 넣기 전에 지난 날짜의 미진행(pending)을 skipped(못 해서 뒤로 넘김)로 바꾼다.
-- 두 함수 모두 security invoker라 daily_tasks·books의 RLS(user_id = auth.uid())가 그대로 적용되고,
-- 같은 사용자별 advisory lock을 잡아 체크와 재분배가 겹치면 순서대로 돈다.

-- 완료 분량은 목표 회독을 이어 붙인 위치로 비교한다: 완료 = (current_round − 1) × total_units + current_unit,
-- 분량 끝 E = (round − 1) × total_units + end_unit, 분량 앞 S = (round − 1) × total_units + start_unit − 1.
-- 체크면 새 완료 = max(완료, E)(목표 회독 × 총량 이하), 해제면 min(완료, S). 진도는 체크로 뒤로 가지 않는다.
-- 새 완료를 진도로 바꾸고(회독을 막 끝내면 그 회독의 total_units), 같은 교재·같은 날짜 분량의 상태를 다시 매긴다:
-- E ≤ 새 완료이면 done, 아니고 done이었으면 pending, 그 밖(partial·skipped·pending)은 그대로.
create function public.set_task_done(p_task_id uuid, p_done boolean)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_book_id uuid;
  v_task_date date;
  v_total integer;
  v_finish integer; -- 목표 회독 × 총량
  v_done integer;   -- 지금 완료 분량
  v_start integer;  -- 분량 앞 S
  v_end integer;    -- 분량 끝 E
  v_new integer;
  v_round integer;
begin
  if v_user_id is null then
    raise exception '로그인한 사용자만 계획을 바꿀 수 있어요.' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('replace_daily_tasks:' || v_user_id::text, 0)
  );

  select
    t.book_id,
    t.task_date,
    b.total_units,
    b.target_rounds * b.total_units,
    (b.current_round - 1) * b.total_units + b.current_unit,
    (t.round - 1) * b.total_units + t.start_unit - 1,
    (t.round - 1) * b.total_units + t.end_unit
  into v_book_id, v_task_date, v_total, v_finish, v_done, v_start, v_end
  from public.daily_tasks t
  join public.books b on b.id = t.book_id
  where t.id = p_task_id
  for update of b;

  if not found then
    raise exception '이 분량을 찾지 못했어요. 계획이 다시 나뉘었을 수 있어요.' using errcode = 'P0002';
  end if;

  if p_done then
    v_new := least(greatest(v_done, v_end), v_finish);
  else
    v_new := least(v_done, v_start);
  end if;

  if v_new <> v_done then
    if v_new = 0 then
      v_round := 1;
    else
      v_round := (v_new - 1) / v_total + 1; -- ceil(v_new / v_total)
    end if;
    update public.books
    set current_round = v_round,
        current_unit = v_new - (v_round - 1) * v_total
    where id = v_book_id;
  end if;

  update public.daily_tasks t
  set status = case
    when (t.round - 1) * v_total + t.end_unit <= v_new then 'done'::public.task_status
    else 'pending'::public.task_status
  end
  where t.user_id = v_user_id
    and t.task_date = v_task_date
    and t.book_id = v_book_id
    and (
      ((t.round - 1) * v_total + t.end_unit <= v_new and t.status <> 'done')
      or ((t.round - 1) * v_total + t.end_unit > v_new and t.status = 'done')
    );
end;
$$;

comment on function public.set_task_done(uuid, boolean) is
  '오늘의 분량 체크(p_done=true)·해제(false). 분량 상태와 교재 진도를 함께 바꾼다. 없는 분량은 P0002';

revoke execute on function public.set_task_done(uuid, boolean) from public, anon;
grant execute on function public.set_task_done(uuid, boolean) to authenticated;

-- 계획 교체: plan-generator가 부른다. p_from 이전 날짜의 pending을 skipped로 바꾸고(다음에 같은 분량으로 다시 이월하지 않게),
-- p_from부터의 미진행(pending) 계획을 지우고 p_tasks를 넣는다. 나머지(잠금·RLS·권한)는 20261112045648과 같다.
-- p_tasks: [{ book_id, task_date, round, start_unit, end_unit }]. 본인 교재가 아닌 줄(도중에 지워진 교재 등)은 넣지 않는다.
-- 돌려주는 값: 넣은 줄 수
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
  join public.books b on b.id = t.book_id;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

comment on function public.replace_daily_tasks(date, jsonb) is
  '계획 교체. p_from 이전의 pending은 skipped로, p_from부터의 pending은 지우고 p_tasks를 넣는다. 넣은 줄 수를 돌려준다';

revoke execute on function public.replace_daily_tasks(date, jsonb) from public, anon;
grant execute on function public.replace_daily_tasks(date, jsonb) to authenticated;
