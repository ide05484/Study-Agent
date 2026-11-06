-- 보건직 공무원 시험 관리 Agent 초기 스키마 (초안)
-- 모든 사용자 데이터 테이블은 user_id = auth.uid() 기준 RLS로 본인 데이터만 접근한다.

create type public.subject as enum ('korean', 'english', 'public_health', 'health_admin');
create type public.notify_channel as enum ('pwa', 'kakao');
create type public.goal_kind as enum ('final', 'short_term');
create type public.task_status as enum ('pending', 'done', 'partial', 'skipped');
create type public.chat_role as enum ('user', 'assistant');

-- 사용자 프로필: 시험일, 목표 점수, 알림 설정
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  exam_date date,
  target_total_score integer,
  notify_time time not null default '09:00',
  notify_channel public.notify_channel not null default 'pwa',
  timezone text not null default 'Asia/Seoul',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 보유 교재: 시험일까지 분량을 나누는 기준
create table public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject public.subject not null,
  title text not null,
  total_pages integer not null check (total_pages > 0),
  current_page integer not null default 0 check (current_page >= 0),
  created_at timestamptz not null default now()
);

-- 목표: 최종 목표(합격) 1개 + 단기 목표 여러 개
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind public.goal_kind not null,
  title text not null,
  subject public.subject,
  target_score integer,
  due_date date,
  achieved_at timestamptz,
  created_at timestamptz not null default now()
);

-- 일별 학습 계획: plan-generator가 교재 분량을 날짜별로 분배해 생성
create table public.daily_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  task_date date not null,
  start_page integer not null,
  end_page integer not null check (end_page >= start_page),
  status public.task_status not null default 'pending',
  created_at timestamptz not null default now()
);
create index daily_tasks_user_date_idx on public.daily_tasks (user_id, task_date);

-- 채팅 메시지: 코치 QnA와 학습 기록 보고를 모두 담는다
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.chat_role not null,
  content text not null,
  subject public.subject,
  created_at timestamptz not null default now()
);
create index chat_messages_user_created_idx on public.chat_messages (user_id, created_at);

-- 실제 학습 기록: 채팅으로 보낸 내용을 LLM이 구조화해 저장
create table public.study_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  book_id uuid references public.books (id) on delete set null,
  subject public.subject not null,
  study_date date not null default current_date,
  start_page integer,
  end_page integer,
  questions_solved integer,
  questions_wrong integer,
  source_message_id uuid references public.chat_messages (id) on delete set null,
  created_at timestamptz not null default now()
);
create index study_logs_user_date_idx on public.study_logs (user_id, study_date);

-- 모의고사: 회차 + 과목별 점수
create table public.mock_exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  taken_on date not null,
  created_at timestamptz not null default now()
);

create table public.mock_exam_scores (
  mock_exam_id uuid not null references public.mock_exams (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  subject public.subject not null,
  score numeric(5, 2) not null check (score >= 0 and score <= 100),
  primary key (mock_exam_id, subject)
);

-- PWA Web Push 구독 정보
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.profiles enable row level security;
create policy "own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

do $$
declare
  t text;
begin
  foreach t in array array[
    'books', 'goals', 'daily_tasks', 'chat_messages', 'study_logs',
    'mock_exams', 'mock_exam_scores', 'push_subscriptions'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "own rows" on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t
    );
  end loop;
end $$;

-- 회원가입 시 프로필 자동 생성
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
