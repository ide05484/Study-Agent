-- 교재 회독·단위·고정 분량, 계획의 회독 번호, 시험 구분

create type public.book_unit as enum ('page', 'day');
create type public.exam_kind as enum ('mock', 'official');

-- 교재: 단위(쪽/Day), 목표 회독, 현재 회독, 하루 고정 분량(null이면 시험 전날까지 고르게)
alter table public.books
  add column unit public.book_unit not null default 'page',
  add column target_rounds integer not null default 1,
  add column current_round integer not null default 1,
  add column daily_amount integer,
  add constraint books_target_rounds_range check (target_rounds between 1 and 10),
  add constraint books_current_round_range check (current_round between 1 and target_rounds),
  add constraint books_current_page_max check (current_page <= total_pages),
  add constraint books_daily_amount_positive check (daily_amount is null or daily_amount > 0);

-- 일별 계획: 그 범위가 몇 회독째인지
alter table public.daily_tasks
  add column round integer not null default 1,
  add constraint daily_tasks_round_positive check (round >= 1);

-- 시험 기록: 모의고사 / 실제 시험
alter table public.mock_exams
  add column kind public.exam_kind not null default 'mock';
