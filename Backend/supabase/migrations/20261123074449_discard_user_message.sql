-- 실패한 요청의 사용자 메시지 정리: 더 새 처리 안 한 사용자 메시지가 없을 때만 지운다.
-- 더 새 요청이 이 메시지를 묶음에 넣어 처리 중일 수 있으면 남겨 두어 그 요청이 처리 표시하게 한다
-- (지우고 화면이 같은 글을 다시 보내면 기록·순공시간이 두 번 저장되던 틈을 막는다).
-- claim_user_messages와 같은 advisory lock 키를 써서 확인과 삭제가 claim과 겹치지 않게 한다.

create function public.discard_user_message(
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
    raise exception '로그인한 사용자만 메시지를 지울 수 있어요.' using errcode = '42501';
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

  delete from public.chat_messages m
  where m.id = p_message_id
    and m.user_id = v_user_id;

  return true;
end;
$$;

comment on function public.discard_user_message(uuid, timestamptz, timestamptz) is
  '실패한 요청의 사용자 메시지 정리. p_message_id가 없거나 이미 처리됐거나 그보다 새 처리 안 한 사용자 메시지가 있으면 false(지우지 않음), 없으면 지우고 true';

revoke execute on function public.discard_user_message(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.discard_user_message(uuid, timestamptz, timestamptz) to authenticated;
