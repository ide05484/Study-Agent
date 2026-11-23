-- 공부법 내용(모든 사용자 공통)과 사용자별 잘 맞은 방법.
-- 설계: docs/superpowers/specs/2026-11-18-study-methods-db-design.md, 계획: docs/superpowers/plans/2026-11-18-study-methods.md

-- 공부법 내용: docs/study-methods 문서의 섹션 하나가 한 줄
create table public.study_methods (
  topic text not null check (topic in ('korean', 'english', 'public_health', 'health_admin', 'mental', 'time')),
  position smallint not null check (position > 0),
  heading text not null check (char_length(heading) between 1 and 100),
  kind text not null check (kind in ('list', 'pairs')),
  items jsonb not null check (jsonb_typeof(items) = 'array'),
  primary key (topic, position)
);

comment on table public.study_methods is
  '공부법 내용(과목 4개·멘탈관리·시간관리). 원본은 docs/study-methods 문서. 쓰기는 npm run methods:migration이 만든 마이그레이션으로만';

alter table public.study_methods enable row level security;
create policy "read for signed in" on public.study_methods
  for select to authenticated using (true);

revoke all on table public.study_methods from anon;
revoke insert, update, delete, truncate on table public.study_methods from authenticated;

-- 잘 맞은 방법: 채팅에서 수험생이 말한 자기에게 맞았던 공부 방식(한 문장)
create table public.study_tips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject public.subject,
  content text not null check (char_length(content) between 1 and 200),
  source_message_id uuid references public.chat_messages (id) on delete set null,
  created_at timestamptz not null default now(),
  unique nulls not distinct (user_id, subject, content)
);

comment on table public.study_tips is
  '잘 맞은 방법. 채팅에서 저장한 사용자별 공부 방식(1~200자). 과목이 없는 방법은 subject null. 같은 사용자·과목·내용은 한 번만';

create index study_tips_user_subject_created_idx
  on public.study_tips (user_id, subject, created_at desc);

alter table public.study_tips enable row level security;
create policy "own rows" on public.study_tips
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
