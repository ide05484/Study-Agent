-- 채팅으로 교재 추가: 코치 메시지에 받아 둔 교재 초안과 단계(ask/confirm/edit)를 붙인다.
-- 모양은 chat 함수(chat/bookDraft.ts의 parseAction)가 검증하고, DB는 객체인지만 막는다.
-- RLS는 기존 "own rows" 정책을 그대로 쓴다.

alter table public.chat_messages
  add column action jsonb,
  add constraint chat_messages_action_object
    check (action is null or jsonb_typeof(action) = 'object');

comment on column public.chat_messages.action is
  '메시지에 달린 동작. 교재 추가 초안과 단계(ask/confirm/edit). 모양은 chat 함수가 검증한다';
