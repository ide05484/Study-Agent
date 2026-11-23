-- claim_user_messages 보완: 이미 처리 표시된 메시지는 다시 처리하지 않는다.
-- 겹친 두 요청 중 뒤 요청이 앞 메시지까지 묶어 처리 표시한 뒤, 앞 요청의 claim이 true가 되어
-- 기록과 답을 한 번 더 남기던 틈을 막는다(자기 메시지가 이미 처리됐으면 false = 밀림).
-- 이미 반영된 20261123070231_chat_polish.sql은 고치지 않고 함수만 다시 만든다.

create or replace function public.claim_user_messages(
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
    and m.role = 'user'
    and m.handled_at is null;
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
  '묶음 확인. p_message_id가 이미 처리됐거나 그보다 새 처리 안 한 사용자 메시지가 있으면 false(아무것도 바꾸지 않음), 없으면 p_message_id 이하의 처리 안 한 사용자 메시지를 모두 처리 표시하고 true';
