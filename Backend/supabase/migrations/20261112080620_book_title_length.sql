-- 교재명은 화면(교재 행, 오늘의 분량)에서 두 줄 안에 보이도록 앞뒤 공백을 뺀 1~20자로 둔다.
-- 화면 입력 칸도 20자까지만 받고, 채팅으로 교재를 추가할 때도 이 규칙을 지킨다.
alter table public.books
  add constraint books_title_length check (char_length(btrim(title)) between 1 and 20);

comment on column public.books.title is '교재명, 앞뒤 공백을 뺀 1~20자 (예: 보건행정 기본서)';
