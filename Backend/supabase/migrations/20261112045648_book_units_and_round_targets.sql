-- 교재 단위를 Day·챕터·회차로 바꾸고(쪽 없앰), page가 들어간 칸 이름을 unit으로, 회독별 목표일을 더한다

-- 단위: page·day → day·chapter·session(회차). 기존 page 교재는 session으로 옮긴다(숫자는 그대로)
alter type public.book_unit rename to book_unit_old;
create type public.book_unit as enum ('day', 'chapter', 'session');
alter table public.books alter column unit drop default;
alter table public.books
  alter column unit type public.book_unit
  using (case when unit::text = 'page' then 'session' else unit::text end)::public.book_unit;
alter table public.books alter column unit set default 'session';
drop type public.book_unit_old;

-- 칸 이름: 쪽이 아니라 단위 수(Day·챕터·회차)
alter table public.books rename column total_pages to total_units;
alter table public.books rename column current_page to current_unit;
alter table public.books rename constraint books_total_pages_check to books_total_units_check;
alter table public.books rename constraint books_current_page_check to books_current_unit_check;
alter table public.books rename constraint books_current_page_max to books_current_unit_max;
alter table public.daily_tasks rename column start_page to start_unit;
alter table public.daily_tasks rename column end_page to end_unit;
alter table public.daily_tasks rename constraint daily_tasks_check to daily_tasks_unit_range;
alter table public.study_logs rename column start_page to start_unit;
alter table public.study_logs rename column end_page to end_unit;

-- 회독별 목표일: n번째 값이 n회독 목표일, null은 목표일 없음
alter table public.books
  add column round_targets date[] not null default '{}',
  add constraint books_round_targets_len check (cardinality(round_targets) <= target_rounds);

comment on column public.books.daily_amount is '하루 최소 분량. null이면 목표일(없으면 시험 전날)까지 고르게';
comment on column public.books.round_targets is '회독별 목표일. n번째 값이 n회독 목표일, null은 목표일 없음';

-- 계획 교체 함수: 칸 이름만 바뀌었다(잠금·RLS·권한은 20261112011647과 같다)
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

revoke execute on function public.replace_daily_tasks(date, jsonb) from public, anon;
grant execute on function public.replace_daily_tasks(date, jsonb) to authenticated;
