-- 채팅 다듬기: 연달아 보낸 메시지를 묶어 처리하고, 하루 첫 메시지를 중복 없이 남긴다.
-- RLS는 기존 "own rows" 정책을 그대로 쓰고, 함수는 security invoker라 본인 행만 다룬다.

-- 1. 처리함 표시: 사용자 메시지를 분석·답변에 반영했으면 시각을 남긴다. 코치 메시지는 쓰지 않는다(null).
alter table public.chat_messages
  add column handled_at timestamptz;

comment on column public.chat_messages.handled_at is
  '사용자 메시지를 분석·답변에 반영했으면 그 시각. 묶어 처리하려고 처리 안 한 메시지를 가려낸다. 코치 메시지는 null';

-- 이 기능 전의 사용자 메시지는 모두 처리한 것으로 본다
update public.chat_messages
set handled_at = created_at
where role = 'user';

-- 2. 묶음 확인: p_message_id(이 요청의 메시지)보다 새 처리 안 한 사용자 메시지가 있으면 false를 돌려주고 아무것도 바꾸지 않는다.
-- 없으면 p_message_id 이하(created_at, id 순)의 처리 안 한 사용자 메시지를 모두 처리 표시하고 true를 돌려준다.
-- 사용자별 advisory lock으로 확인과 표시를 한 번에 해서, 거의 같은 순간의 두 요청이 둘 다 통과하지 않는다.
create function public.claim_user_messages(
  p_message_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_created timestamptz;
begin
  if v_user_id is null then
    raise exception '로그인한 사용자만 메시지를 처리할 수 있어요.' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('claim_user_messages:' || v_user_id::text, 0)
  );

  select m.created_at into v_created
  from public.chat_messages m
  where m.id = p_message_id
    and m.user_id = v_user_id
    and m.role = 'user';
  if not found then
    return false;
  end if;

  if exists (
    select 1
    from public.chat_messages m
    where m.user_id = v_user_id
      and m.role = 'user'
      and m.handled_at is null
      and m.created_at >= p_from
      and m.created_at < p_to
      and (m.created_at, m.id) > (v_created, p_message_id)
  ) then
    return false;
  end if;

  update public.chat_messages m
  set handled_at = pg_catalog.now()
  where m.user_id = v_user_id
    and m.role = 'user'
    and m.handled_at is null
    and m.created_at >= p_from
    and m.created_at < p_to
    and (m.created_at, m.id) <= (v_created, p_message_id);

  return true;
end;
$$;

comment on function public.claim_user_messages(uuid, timestamptz, timestamptz) is
  '묶음 확인. p_message_id보다 새 처리 안 한 사용자 메시지가 있으면 false(아무것도 바꾸지 않음), 없으면 p_message_id 이하의 처리 안 한 사용자 메시지를 모두 처리 표시하고 true';

revoke execute on function public.claim_user_messages(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.claim_user_messages(uuid, timestamptz, timestamptz) to authenticated;

-- 3. 하루 첫 메시지: [p_from, p_to)에 메시지(사용자·코치 무관)가 하나라도 있으면 null, 없으면 코치 메시지를 넣고 id를 돌려준다.
-- 사용자별 advisory lock 안에서 확인하고 넣어 탭 두 개가 동시에 열어도 첫 메시지는 하나다.
create function public.insert_first_message(
  p_from timestamptz,
  p_to timestamptz,
  p_content text,
  p_action jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid;
begin
  if v_user_id is null then
    raise exception '로그인한 사용자만 메시지를 남길 수 있어요.' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('insert_first_message:' || v_user_id::text, 0)
  );

  if exists (
    select 1
    from public.chat_messages m
    where m.user_id = v_user_id
      and m.created_at >= p_from
      and m.created_at < p_to
  ) then
    return null;
  end if;

  insert into public.chat_messages (user_id, role, content, action, created_at)
  values (v_user_id, 'assistant', p_content, p_action, pg_catalog.clock_timestamp())
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.insert_first_message(timestamptz, timestamptz, text, jsonb) is
  '하루 첫 메시지. 그 범위에 메시지가 이미 있으면 null, 없으면 코치 메시지를 넣고 id를 돌려준다';

revoke execute on function public.insert_first_message(timestamptz, timestamptz, text, jsonb) from public, anon;
grant execute on function public.insert_first_message(timestamptz, timestamptz, text, jsonb) to authenticated;
