-- 순공시간(하루 합계)과 채팅 진도 반영 함수.
-- 설계: docs/superpowers/specs/2026-11-13-study-time-heatmap-design.md (C2), 계획: docs/superpowers/plans/2026-11-13-chat-and-study-time.md

-- 순공시간: 채팅으로 보고한 하루 순수 공부 시간(분). 사용자·날짜마다 한 줄
create table public.study_time (
  user_id uuid not null references auth.users (id) on delete cascade,
  study_date date not null,
  minutes integer not null check (minutes between 1 and 1080),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, study_date)
);

comment on table public.study_time is '순공시간. 사용자·날짜(사용자 시간대)마다 하루 합계(분, 1~1080)';

alter table public.study_time enable row level security;
create policy "own rows" on public.study_time
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- 순공시간 저장: p_add = false면 그날 합계를 p_minutes로 바꾸고, true면 더한다(없으면 넣는다).
-- 한 문장(insert … on conflict)이라 더하기가 겹쳐도 맞다. 결과가 1~1080분을 벗어나면 22023으로 저장하지 않는다.
-- 돌려주는 값: 저장된 그날 합계
create function public.record_study_time(p_date date, p_minutes integer, p_add boolean)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_total integer;
begin
  if v_user_id is null then
    raise exception '로그인한 사용자만 계획을 바꿀 수 있어요.' using errcode = '42501';
  end if;

  begin
    insert into public.study_time as s (user_id, study_date, minutes)
    values (v_user_id, p_date, p_minutes)
    on conflict (user_id, study_date) do update
      set minutes = case when p_add then s.minutes + excluded.minutes else excluded.minutes end,
          updated_at = now()
    returning s.minutes into v_total;
  exception
    when check_violation or not_null_violation then
      raise exception '순공시간은 하루 1분부터 18시간까지 적을 수 있어요.' using errcode = '22023';
  end;

  return v_total;
end;
$$;

comment on function public.record_study_time(date, integer, boolean) is
  '순공시간 저장. p_add=false면 그날 합계를 바꾸고 true면 더한다. 1~1080분 밖이면 22023. 저장된 합계를 돌려준다';

revoke execute on function public.record_study_time(date, integer, boolean) from public, anon;
grant execute on function public.record_study_time(date, integer, boolean) to authenticated;

-- 채팅 진도 반영: "보건행정 기본서 15~17강"처럼 보고한 끝 위치(p_round회독 p_end_unit)까지 진도를 올린다.
-- 체크(set_task_done)와 같은 사용자별 잠금과 같은 위치 계산(회독을 이어 붙인 위치)을 쓴다.
-- 새 완료 N = max(지금 완료, 보고 위치)(목표 회독 × 총량 이하). 진도는 앞으로만 간다.
-- p_date 날짜의 같은 교재 분량을 다시 매긴다: 분량 끝 E ≤ N이고 pending·partial이면 done,
-- 분량 앞 S < N < E이고 pending이면 partial. 그 밖은 그대로 둔다(채팅 보고로 완료를 풀지 않는다).
-- 계획은 다시 나누지 않는다(묶음 C 설계 C1).
create function public.report_progress(p_book_id uuid, p_round integer, p_end_unit integer, p_date date)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_total integer;
  v_target integer;
  v_done integer;
  v_new integer;
  v_round integer;
begin
  if v_user_id is null then
    raise exception '로그인한 사용자만 계획을 바꿀 수 있어요.' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('replace_daily_tasks:' || v_user_id::text, 0)
  );

  select b.total_units, b.target_rounds, (b.current_round - 1) * b.total_units + b.current_unit
  into v_total, v_target, v_done
  from public.books b
  where b.id = p_book_id
  for update;

  if not found then
    raise exception '이 교재를 찾지 못했어요.' using errcode = 'P0002';
  end if;

  if p_round is null or p_end_unit is null
    or p_round < 1 or p_round > v_target
    or p_end_unit < 1 or p_end_unit > v_total then
    raise exception '보고한 범위가 교재 분량을 벗어나요.' using errcode = '22023';
  end if;

  v_new := least(greatest(v_done, (p_round - 1) * v_total + p_end_unit), v_target * v_total);

  if v_new > v_done then
    v_round := (v_new - 1) / v_total + 1; -- ceil(v_new / v_total)
    update public.books
    set current_round = v_round,
        current_unit = v_new - (v_round - 1) * v_total
    where id = p_book_id;
  end if;

  update public.daily_tasks t
  set status = case
    when (t.round - 1) * v_total + t.end_unit <= v_new then 'done'::public.task_status
    else 'partial'::public.task_status
  end
  where t.user_id = v_user_id
    and t.book_id = p_book_id
    and t.task_date = p_date
    and (
      ((t.round - 1) * v_total + t.end_unit <= v_new and t.status in ('pending', 'partial'))
      or (
        (t.round - 1) * v_total + t.start_unit - 1 < v_new
        and (t.round - 1) * v_total + t.end_unit > v_new
        and t.status = 'pending'
      )
    );
end;
$$;

comment on function public.report_progress(uuid, integer, integer, date) is
  '채팅 진도 반영. p_round회독 p_end_unit까지 진도를 올리고(뒤로 가지 않음) p_date의 그 교재 분량을 done·partial로 다시 매긴다';

revoke execute on function public.report_progress(uuid, integer, integer, date) from public, anon;
grant execute on function public.report_progress(uuid, integer, integer, date) to authenticated;
