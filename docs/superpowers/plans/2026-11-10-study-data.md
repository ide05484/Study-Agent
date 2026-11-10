# 2단계 공부 데이터 채우기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 교재별 회독 목표·하루 고정 분량(Day 단위)과 실제 시험/모의고사 점수를 담을 수 있게 하고, Mock 데이터를 넣어 시험 전날까지의 계획이 그럴듯하게 나뉘는지 확인한다.

**Architecture:**
- `books`에 단위(쪽/Day)·목표 회독·현재 회독·하루 고정 분량을 더하고, `daily_tasks`에 회독 번호를, `mock_exams`에 구분(모의고사/실제 시험)을 더한다(새 마이그레이션).
- 분배 로직은 OpenAI·Supabase를 import하지 않는 `_shared/plan.ts`로 옮겨 Deno 테스트로 검증한다. `plan-generator`와 Node 스크립트(계획 미리보기)가 같은 함수를 쓴다.
- Mock 데이터는 JSON 파일 하나를 원본으로 두고, 스크립트가 (1) DB에 넣을 SQL과 (2) 계획 미리보기 표를 만든다.
- 화면은 공부 설정에서 회독·진도를 고치고, 점수를 넣고 지울 수 있게 한다. 오늘의 분량·대시보드는 회독과 Day 단위를 표시한다.

**Tech Stack:** Supabase(Postgres + RLS, Edge Functions/Deno), Deno test(npm `deno` 패키지), Node `tsx` 스크립트, React 19 + Tailwind v4. Frontend 테스트 도구는 없다(Vitest는 3단계).

**Spec:**
- [로드맵 2단계](2026-10-27-roadmap.md#2-공부-데이터-채우기)
- [SERVICE_FLOW.md](../../../SERVICE_FLOW.md) "6. 교재 추가", "계획 분배 규칙"
- [DESIGN.md](../../../DESIGN.md) "3. 공부 설정 변경", "2. 현재 공부상태"
- 2026-11-10 사용자 입력: [History](../../../History/2026-11-10-공부-데이터-채우기.md)

## 이 계획에서 정한 것

| 항목 | 결정 | 출처 |
|---|---|---|
| 범위 | 채팅으로 교재 추가·점수 입력, 지난 날짜 기록은 1단계 Task 3~7 뒤로 미룬다 | 진행자 제안 |
| 기본서 구분 | 교재 종류 값 없이 교재별 목표 회독 수만 둔다. 기본서 3회독, 나머지 1회독 | 사용자 |
| 진도 입력 | "몇 회독째 + 그 회독에서 몇 쪽(Day)까지" | 진행자 제안 |
| 영어 단어 1·2권 | 한 행(합계 Day 수), 단위 Day, 하루 고정 1 Day | 사용자(하루 Day 1개) |
| 점수 입력 경로 | 공부 설정 화면 폼 | 진행자 제안 |
| 한국사 | 저장하지 않는다(2026년부터 시험 과목에서 빠짐). 과목 enum은 4개 그대로 | 진행자 제안 |
| 처음 데이터 | Mock 데이터 스크립트로 넣는다. 실제 사용자 데이터는 나중에 카카오 로그인 계정에서 화면으로 넣는다 | 사용자 |
| 실제 점수 보관 | Mock 원본 JSON은 git에 올리지 않는다(저장소가 공개). 가짜 값의 예시 파일만 커밋한다 | 진행자 제안 |

## Global Constraints

- 과목 값은 `korean`, `english`, `public_health`, `health_admin`만 쓴다.
- 날짜 키는 `YYYY-MM-DD`, 기준 시간대는 `profiles.timezone`(기본 `Asia/Seoul`). 날짜 산술은 `_shared/date.ts`·`libs/date.ts`만 쓴다.
- 새 enum 값: `public.book_unit` = `page`, `day` / `public.exam_kind` = `mock`, `official`. Frontend 타입과 일치시킨다.
- 화면 단위 표기: `page` → `쪽`(숫자 뒤), `day` → `Day`(숫자 앞, 예: `Day 12`). 구분 표기: `mock` → `모의고사`, `official` → `실제 시험`.
- 목표 회독은 1~10. 현재 회독은 1~목표 회독. 현재 쪽은 0~총 분량. DB `check`로도 막는다.
- CONVENTIONS.md를 따른다. 화면 문구는 해요체이고, 이 계획의 문구를 그대로 쓴다.
- 클라우드를 바꾸는 단계(☁️)는 사용자 승인 뒤 실행한다. Supabase CLI 명령은 PowerShell에서 `--project-ref ishtebcswgyagbbaakpx`(개발 프로젝트)로 실행한다. MCP는 사용자가 `/mcp`에서 인증한 경우에만 쓴다.
- Mock SQL은 **개발 프로젝트에서만** 실행한다. 그 사용자의 교재·계획·시험 기록을 지우고 다시 넣는다.
- 실제 점수와 개인 정보는 커밋·History에 적지 않는다.
- 각 Task 끝에서 `feature/study_Mockdata`에 커밋한다. push는 하지 않는다. 스테이징된 사용자 변경(`Backend/package.json`의 `@supabase/server`, `package-lock.json`)은 Task 2 전에 처리 방법을 사용자에게 묻는다.
- Task가 끝날 때마다 History 규칙대로 기록한다(메인 세션).

## Review Focus

1. **회독 경계에 걸친 날** — 1회독 마지막 쪽과 2회독 첫 쪽이 같은 날이면 두 줄로 나뉘고, 오늘의 분량에 "2회독"이 붙는다. → Task 2 테스트 "회독 경계에 걸친 날은 두 줄로 나눈다"
2. **회독의 끝 쪽에 멈춘 교재**(1회독 456/456, 목표 3) — 다음 계획은 2회독 1쪽부터다. 1회독을 다시 나누지 않는다. → Task 2 테스트 "회독 끝 쪽에 있으면 다음 회독 1쪽부터"
3. **고정 분량이 시험 전날까지 끝나지 않음** — 시험 전날에서 자르고, 미리보기가 못 끝낸 분량을 보여 준다. → Task 2 테스트, Task 3 Step 2
4. **목표 회독을 현재 회독보다 낮게 고침**(3회독째인데 목표를 2로) — 저장 버튼이 비활성이고, DB도 거부한다. → Task 1 마이그레이션 `check`, Task 4 Step 3 수동 확인
5. **같은 과목에 쪽 교재와 Day 교재가 섞임**(영어 기본서 + 영어 단어) — 이번주 목표량의 쪽수에 Day가 더해지지 않는다. → Task 4 Step 2

---

## 실행 방식

| Task | 방식 | 이유 |
|---|---|---|
| 1 | Native | ☁️ DB 반영과 타입 생성이 있다 |
| 2 | Native | Task 1 컬럼을 쓰고 ☁️ 함수 배포가 있다 |
| 3 | Native | 사용자가 준 실제 값을 다루고 ☁️ SQL 실행이 있다 |
| 4 | Subagent + 리뷰 | 프론트엔드만 바꾸고, Task 1의 타입만 쓴다 |
| 5 | Subagent + 리뷰 | 프론트엔드만 바꾸고, Task 1의 타입만 쓴다. Task 4와 같은 파일(`SettingsPage.tsx`, DESIGN.md)을 고치므로 Task 4 뒤에 한다 |
| 끝 | 전체 브랜치 리뷰(task-reviewer + code-reviewer) | |

---

### Task 1: 회독·단위·시험 구분 마이그레이션과 타입

**Files:**
- Create: `Backend/supabase/migrations/<타임스탬프>_study_rounds_and_exam_kind.sql`
- Modify: `Frontend/src/interfaces/database.ts`(생성), `Frontend/src/interfaces/study.ts`, `Frontend/src/interfaces/mockExam.ts`, `Frontend/src/api/study.ts`

**Interfaces:**
- Produces (DB):
  - `books.unit book_unit not null default 'page'`, `books.target_rounds integer not null default 1`(1~10), `books.current_round integer not null default 1`(1~`target_rounds`), `books.daily_amount integer null`(> 0, null = 시험 전날까지 고르게), `books.current_page <= total_pages`
  - `daily_tasks.round integer not null default 1`(≥ 1)
  - `mock_exams.kind exam_kind not null default 'mock'`
- Produces (`interfaces/study.ts`):
  ```ts
  export type BookUnit = 'page' | 'day'
  export interface Book { id; subject; title; total_pages; current_page; unit: BookUnit; target_rounds: number; current_round: number; daily_amount: number | null }
  export type NewBook = Pick<Book, 'subject' | 'title' | 'total_pages'> & Partial<Pick<Book, 'unit' | 'target_rounds' | 'daily_amount'>>
  export type BookProgress = Pick<Book, 'current_round' | 'current_page' | 'target_rounds'>
  export interface DailyTask { ...기존; round: number }
  export interface DailyTaskWithBook extends DailyTask { book: Pick<Book, 'subject' | 'title' | 'unit' | 'target_rounds'> }
  ```
- Produces (`interfaces/mockExam.ts`): `export type ExamKind = 'mock' | 'official'`, `MockExam`에 `kind: ExamKind`, `export interface NewMockExam { kind: ExamKind; name: string; taken_on: string; scores: MockExamScore[] }`
- `api/study.ts`의 books select는 `id, subject, title, total_pages, current_page, unit, target_rounds, current_round, daily_amount`, daily_tasks select는 `round`와 `book:books(subject, title, unit, target_rounds)`를 더한다.

- [ ] **Step 1: 마이그레이션 파일 만들기**

Run (`Backend/`): `npx supabase migration new study_rounds_and_exam_kind`
내용: enum 두 개(`book_unit`, `exam_kind`) 생성, 위 컬럼 추가. 제약 이름은 `books_target_rounds_range`, `books_current_round_range`(`current_round between 1 and target_rounds`), `books_current_page_max`, `books_daily_amount_positive`, `daily_tasks_round_positive`. 파일 맨 위에 `-- 교재 회독·단위·고정 분량, 계획의 회독 번호, 시험 구분` 주석.

- [ ] **Step 2: ☁️ 개발 프로젝트에 반영**

MCP가 인증되어 있으면 `apply_migration` 후 `execute_sql`로 이력 버전을 파일 타임스탬프로 맞춘다(1단계 Task 1과 같은 방식). 아니면 사용자가 `npx supabase link --project-ref ishtebcswgyagbbaakpx`를 한 뒤 `npm run db:push`.
Expected: 기존 교재 8권(검증용 계정)이 `unit = page`, `target_rounds = 1`, `current_round = 1`로 채워진다. 보안 어드바이저 경고 0건(MCP일 때).

- [ ] **Step 3: DB 타입 생성**

Run (`Backend/`, PowerShell): `npx supabase gen types typescript --project-id ishtebcswgyagbbaakpx > ../Frontend/src/interfaces/database.ts`
Expected: `book_unit`, `exam_kind`가 `Enums`에 있다.

- [ ] **Step 4: interfaces·api 갱신, 빌드 확인**

Run (`Frontend/`): `npm run format`, `npm run build`, `npm run lint` → 오류 0. 화면 동작은 아직 바뀌지 않는다.

- [ ] **Step 5: Commit**

```bash
git add Backend/supabase/migrations Frontend/src/interfaces Frontend/src/api/study.ts
git commit -m "feat: 교재 회독·단위와 시험 구분 컬럼 추가"
```

---

### Task 2: 회독을 포함한 계획 분배 (`_shared/plan.ts`, Deno 테스트)

**Files:**
- Create: `Backend/supabase/functions/_shared/plan.ts`, `Backend/supabase/functions/_shared/plan_test.ts`
- Modify: `Backend/supabase/functions/plan-generator/index.ts`, `Backend/package.json`(devDependency `deno`, 스크립트 `test`), `CLAUDE.md`(명령어·테스트 문장), `SERVICE_FLOW.md`("계획 분배 규칙", 6.1)

**Interfaces:**
- Consumes: Task 1의 `books`·`daily_tasks` 컬럼.
- Produces (`_shared/plan.ts`, import 없음 — Node `tsx`에서도 불러온다):
  ```ts
  export interface PlanBook { id: string; total_pages: number; current_page: number; current_round: number; target_rounds: number; daily_amount: number | null }
  export interface PlannedTask { book_id: string; day: number; round: number; start_page: number; end_page: number } // day: 오늘부터 며칠째(0 = 오늘)
  export function completedUnits(book: PlanBook): number // (current_round - 1) × total_pages + current_page
  export function planBook(book: PlanBook, days: number): PlannedTask[]
  ```

분배 규칙: 남은 분량 `R = target_rounds × total_pages − completedUnits`를 0부터 센 위치로 보고, 날짜 `d`(0 ≤ d < days)의 범위 `[a, b)`를 정한다.
- `daily_amount`가 null: `a = ⌊d·R/days⌋`, `b = ⌊(d+1)·R/days⌋` (지금 `splitPages`와 같은 식)
- `daily_amount = k`: `a = d·k`, `b = min(R, (d+1)·k)`. `a ≥ R`이면 그날부터 없음(시험 전날까지 못 끝내면 거기서 잘린다)
- 위치 `p`의 교재 기준 번호 `u = completedUnits + p` → `round = ⌊u / total⌋ + 1`, `page = u mod total + 1`. 범위가 회독 경계를 넘으면 회독마다 한 줄로 나눈다. `a = b`인 날은 건너뛴다.

- [ ] **Step 1: 테스트 도구 준비** (사용자가 스테이징된 `package.json` 처리 방법을 정한 뒤)

Run (`Backend/`): `npm i -D deno`. scripts에 `"test": "deno test --no-lock supabase/functions"`.
1단계 Task 3 Step 1과 같은 일이다. 1단계 계획의 그 Step에 "2단계 Task 2에서 함"이라고 적는다.

- [ ] **Step 2: 실패하는 테스트 작성** (`_shared/plan_test.ts`, `jsr:@std/assert`의 `assertEquals`)

```ts
const book = (o: Partial<PlanBook>): PlanBook => ({ id: "b", total_pages: 10, current_page: 0, current_round: 1,
  target_rounds: 1, daily_amount: null, ...o });
const t = (day: number, round: number, start_page: number, end_page: number) =>
  ({ book_id: "b", day, round, start_page, end_page });

Deno.test("1회독 교재는 지금과 같게 나눈다", () => {
  assertEquals(planBook(book({}), 3), [t(0, 1, 1, 3), t(1, 1, 4, 6), t(2, 1, 7, 10)]);
});
Deno.test("회독 경계에 걸친 날은 두 줄로 나눈다", () => {
  assertEquals(planBook(book({ current_page: 8, target_rounds: 2 }), 2), [t(0, 1, 9, 10), t(0, 2, 1, 4), t(1, 2, 5, 10)]);
});
Deno.test("회독 끝 쪽에 있으면 다음 회독 1쪽부터", () => {
  assertEquals(planBook(book({ current_page: 10, target_rounds: 2 }), 1), [t(0, 2, 1, 10)]);
});
Deno.test("목표 회독을 다 했으면 계획이 없다", () => {
  assertEquals(planBook(book({ current_page: 10, current_round: 2, target_rounds: 2 }), 5), []);
});
Deno.test("남은 분량이 날짜보다 적으면 빈 날은 건너뛴다", () => {
  assertEquals(planBook(book({ total_pages: 2 }), 4).map((x) => x.day), [1, 3]);
});
Deno.test("하루 고정 분량은 그 양만큼 나누고, 끝나면 멈춘다", () => {
  assertEquals(planBook(book({ total_pages: 3, target_rounds: 2, daily_amount: 2 }), 10),
    [t(0, 1, 1, 2), t(1, 1, 3, 3), t(1, 2, 1, 1), t(2, 2, 2, 3)]);
});
Deno.test("고정 분량이 시험 전날까지 끝나지 않으면 거기서 자른다", () => {
  const tasks = planBook(book({ total_pages: 100, daily_amount: 1 }), 5);
  assertEquals([tasks.length, tasks[4]], [5, t(4, 1, 5, 5)]);
});
Deno.test("날짜 수가 0이면 계획이 없다", () => {
  assertEquals(planBook(book({}), 0), []);
});
```

- [ ] **Step 3: 실패 확인** — Run (`Backend/`): `npm test` → FAIL, `plan.ts` 모듈 없음

- [ ] **Step 4: `_shared/plan.ts` 구현**

- [ ] **Step 5: 통과 확인** — Run: `npm test` → `ok | 8 passed | 0 failed`. `git status`에 `deno.lock`이 없다.

- [ ] **Step 6: `plan-generator`가 `planBook`을 쓰게 바꾸기**

books select에 `current_round, target_rounds, daily_amount`를 더하고, `splitPages`를 지운다. insert 행에 `round`를 넣는다. 응답(`PlanResponse`)은 그대로다.
Run (`Backend/`): `npx deno check --no-lock --config supabase/functions/plan-generator/deno.json supabase/functions/plan-generator/index.ts` → 오류 0

- [ ] **Step 7: ☁️ 배포**

Run (PowerShell, `Backend/`): `npx supabase functions deploy plan-generator --project-ref ishtebcswgyagbbaakpx --use-api`
Expected: `Deployed Functions on project ishtebcswgyagbbaakpx: plan-generator`

- [ ] **Step 8: 문서**

- CLAUDE.md 명령어에 `npm test  # Edge Function 순수 로직 테스트 (deno test)`. "테스트 프레임워크는 아직 없다"를 "Frontend 테스트 도구는 아직 없다. OpenAI·Supabase를 import하는 파일은 테스트에서 불러오지 않도록 순수 로직을 따로 둔다."로.
- SERVICE_FLOW.md "계획 분배 규칙": 남은 분량은 목표 회독까지 포함, 회독 경계에서 두 줄로 나눔, 하루 고정 분량 교재는 그 양씩 나누고 시험 전날에서 자름. 6.1에 "Day 단위(단어장 등)도 쓸 수 있다"를 더한다.

- [ ] **Step 9: Commit**

```bash
git add Backend/package.json Backend/package-lock.json Backend/supabase/functions/_shared/plan.ts Backend/supabase/functions/_shared/plan_test.ts Backend/supabase/functions/plan-generator/index.ts CLAUDE.md SERVICE_FLOW.md docs/superpowers/plans/2026-10-27-chat-connection.md
git commit -m "feat: 회독과 하루 고정 분량을 포함한 계획 분배"
```

---

### Task 3: Mock 데이터와 계획 미리보기

**Files:**
- Create: `Backend/scripts/mock/study-mock.example.json`(커밋, 가짜 점수), `Backend/scripts/mock/study-mock.json`(git 제외, 실제 값), `Backend/scripts/mock/types.ts`, `Backend/scripts/mock-sql.ts`, `Backend/scripts/plan-preview.ts`
- Modify: `Backend/.gitignore`(없으면 만든다: `scripts/mock/study-mock.json`), `Backend/package.json`(스크립트 `mock:sql`, `plan:preview`), `LOCAL_DEV.md`("Mock 데이터" 절)

**Interfaces:**
- Consumes: Task 2의 `planBook`, `completedUnits`, `_shared/date.ts`의 `addDays`, `diffDays`.
- Produces:
  ```ts
  // scripts/mock/types.ts
  export interface MockBook { subject: Subject; title: string; unit: "page" | "day"; total_pages: number;
    current_round: number; current_page: number; target_rounds: number; daily_amount: number | null }
  export interface MockExamInput { kind: "mock" | "official"; name: string; taken_on: string; scores: Partial<Record<Subject, number>> }
  export interface StudyMock { exam_date: string; books: MockBook[]; exams: MockExamInput[] }
  ```
  - `npm run mock:sql -- <USER_ID> [JSON 경로]`: SQL을 표준 출력으로 낸다. 한 트랜잭션에서 그 사용자의 `daily_tasks`·`books`·`mock_exams`를 지우고, 교재·시험·점수를 넣고, `profiles.exam_date`를 바꾼다. 시험 id는 스크립트가 `crypto.randomUUID()`로 만든다. `chat_messages`·`study_logs`는 건드리지 않는다. JSON 경로를 주지 않으면 `study-mock.json`, 없으면 예시 파일을 쓴다.
  - `npm run plan:preview -- [JSON 경로] [--today YYYY-MM-DD]`: DB 없이 `planBook`으로 계획을 계산해 출력한다. `--today`가 없으면 한국 날짜 오늘.

Mock 값 (교재 8권은 1단계 Task 1 Step 4.5의 제목·쪽수 그대로, 진도·회독은 사용자 설명을 바탕으로 정한 Mock):

| 과목 | 교재 | 단위·총량 | 목표 회독 | 현재 | 고정 분량 |
|---|---|---|---|---|---|
| 국어 | 2027 해커스공무원 국어 올인원 기본서 | 456쪽 | 3 | 1회독 430쪽 (거의 끝냄) | — |
| 국어 | 2027 해커스공무원 신민숙 쉬운국어 한 권으로 끝 | 260쪽 | 1 | 1회독 0쪽 | — |
| 영어 | 2027 해커스공무원 영어 올인원 기본서 (전3권) | 792쪽 | 3 | 1회독 277쪽 (35%) | — |
| 영어 | 2026 해커스공무원 비비안 영어 매일 하프모의고사 20회분 | 204쪽 | 1 | 1회독 0쪽 (아직 안 함) | — |
| 영어 | 해커스공무원 영어 단어 (1·2권) | 60 Day (Mock, 실제 Day 수 확인 필요) | 4 | 1회독 0 | 1 |
| 공중보건 | 해커스공무원 최성희 공중보건 기본서 (전2권) | 748쪽 | 3 | 1회독 299쪽 (40%) | — |
| 공중보건 | 2025 해커스공무원 최성희 공중보건 실전동형모의고사 | 128쪽 | 1 | 1회독 0쪽 | — |
| 보건행정 | 해커스공무원 최성희 보건행정 기본서 | 476쪽 | 3 | 1회독 119쪽 (25%) | — |
| 보건행정 | 2025 해커스공무원 최성희 보건행정 실전동형모의고사 | 128쪽 | 1 | 1회독 0쪽 | — |

- 시험일(Mock): `2027-06-19`
- 시험 3건: 실제 시험 2건(2024·2025 지방직 9급), 모의고사 1건(2026-10-09). 점수는 사용자가 대화로 준 값(2024는 "2025와 비슷"을 바탕으로 정한 Mock)이며 `study-mock.json`에만 적는다. 한국사는 넣지 않는다.

- [ ] **Step 1: 타입·예시 JSON·실제 JSON·두 스크립트 작성**

- [ ] **Step 2: 미리보기 확인**

Run (`Backend/`): `npm run plan:preview -- --today 2026-11-10`
Expected 출력 (값은 계산 결과):
```
기준일 2026-11-10 · 시험일 2027-06-19 · 공부 221일
[교재]  과목 | 교재 | 남은 분량 | 하루 평균 | 회독별 끝나는 날 | 못 끝낸 분량
[하루 총량] 쪽: 평균 31.7 · 최소 · 최대 / Day: 하루 1
[앞 4주 과목별 쪽수] 주 시작일 | 국어 | 영어 | 공중보건 | 보건행정
```
확인: 쪽 교재는 모두 3회독(또는 1회독)이 2027-06-18까지 끝나고, 영어 단어는 4회독 중 못 끝낸 Day 수가 나온다. 하루 총 쪽수가 30쪽 안팎이다. 결과 표를 History에 붙이고 사용자에게 보여 준다.

- [ ] **Step 3: SQL 만들기와 ☁️ 실행 (개발 프로젝트)**

Run: `npm run mock:sql -- <USER_ID> > <스크래치패드>/study-mock.sql` (저장소 밖)
대상 계정: 사용자 카카오 계정(개발 프로젝트, 화면 확인용)과 검증용 계정. `USER_ID`는 대시보드 Authentication → Users에서 사용자가 알려 주거나 MCP로 조회한다. 실행은 MCP `execute_sql` 또는 사용자가 SQL Editor에 붙여 넣는다.
Expected: 교재 9행, `mock_exams` 3행, `mock_exam_scores` 12행, `profiles.exam_date = 2027-06-19`.

- [ ] **Step 4: 계획 다시 나누기와 대조**

카카오 계정: 사용자가 공부 설정에서 시험일 저장 → "계획을 나눴어요" 안내. 그다음 오늘 `daily_tasks`의 교재별 범위가 Step 2 미리보기의 첫날과 같은지 SQL로 비교한다(`select b.title, t.round, t.start_page, t.end_page from daily_tasks t join books b on b.id = t.book_id where t.task_date = '<오늘>' and t.user_id = '<USER_ID>'`).

- [ ] **Step 5: LOCAL_DEV.md "Mock 데이터" 절** — 두 명령, JSON 위치와 git 제외 이유, "개발 프로젝트에서만 실행, 그 계정의 교재·계획·시험을 지운다" 경고.

- [ ] **Step 6: Commit** (`study-mock.json`이 `git status`에 보이지 않는지 먼저 확인)

```bash
git add Backend/.gitignore Backend/package.json Backend/scripts/mock/types.ts Backend/scripts/mock/study-mock.example.json Backend/scripts/mock-sql.ts Backend/scripts/plan-preview.ts LOCAL_DEV.md
git commit -m "feat: Mock 공부 데이터 SQL과 계획 미리보기 스크립트"
```

---

### Task 4: 공부 설정·오늘의 분량·대시보드에 회독과 Day 단위 표시

**Files:**
- Create: `Frontend/src/libs/books.ts`, `Frontend/src/components/settings/BookProgressForm.tsx`
- Modify: `Frontend/src/api/study.ts`, `Frontend/src/hooks/useBooks.ts`, `Frontend/src/components/settings/BookAddForm.tsx`, `Frontend/src/pages/SettingsPage.tsx`, `Frontend/src/components/chat/TodayPlan.tsx`, `Frontend/src/hooks/useDashboard.ts`, `Frontend/src/components/dashboard/SubjectProgressList.tsx`, `DESIGN.md`

**Interfaces:**
- Consumes: Task 1의 `Book`, `BookUnit`, `BookProgress`, `NewBook`, `DailyTaskWithBook`.
- Produces:
  ```ts
  // libs/books.ts
  export const UNIT_LABELS: Record<BookUnit, string> // { page: '쪽', day: 'Day' }
  export function completedUnits(book: Pick<Book, 'total_pages' | 'current_round' | 'current_page'>): number
  export function isBookFinished(book: Book): boolean // completedUnits ≥ target_rounds × total_pages
  export function rangeLabel(unit: BookUnit, start: number, end: number): string
  export function progressLabel(book: Book): string
  // api/study.ts
  export async function updateBookProgress(id: string, input: BookProgress): Promise<Book>
  // hooks/useBooks.ts — BooksState에 추가
  updateProgress: (id: string, input: BookProgress) => Promise<boolean> // 저장 후 계획 재분배
  ```

표기 (예시가 곧 기대값):
- `rangeLabel('page', 12, 12)` → `12쪽`, `('page', 12, 20)` → `12–20쪽`, `('day', 3, 3)` → `Day 3`, `('day', 3, 4)` → `Day 3–4`
- `progressLabel`: 목표 1회독이면 `120/456쪽`·`Day 12/60`, 2회독 이상이면 앞에 `1/3회독 `을 붙인다(`1/3회독 120/456쪽`)
- 오늘의 분량 범위: `rangeLabel` 앞에, 교재 목표 회독이 2 이상이면 `{round}회독 `을 붙인다(`2회독 1–4쪽`)

- [ ] **Step 1: `libs/books.ts`, `updateBookProgress`, `useBooks.updateProgress`**

`updateProgress`는 `add`와 같이 저장 후 `replan()`을 부르고, 실패 문구는 기존 `error`를 쓴다.

- [ ] **Step 2: 표시 바꾸기**

- `SettingsPage` 교재 행: 쪽수 자리에 `progressLabel(book)`. 삭제 버튼 앞에 `수정` 버튼(`variant="ghost"`, `aria-label={`${book.title} 진도 수정`}`). 누르면 그 행 아래에 `BookProgressForm`이 열린다(한 번에 한 교재).
- `TodayPlan`: `pagesLabel`을 위 표기로 바꾼다.
- `useDashboard.buildSubjects`: 진도율 = 과목의 Σ`completedUnits` / Σ(`target_rounds × total_pages`). `remaining`은 `!isBookFinished`. 쪽과 Day를 같은 단위로 더한다는 주석을 남긴다(영어 단어 60 Day는 영향이 작다).
- `useDashboard.buildWeekly`: `book.unit === 'page'`인 계획만 더한다(Review Focus 5).
- `SubjectProgressList`: 남은 교재 오른쪽에 `progressLabel(book)`.

- [ ] **Step 3: `BookProgressForm`과 `BookAddForm`**

`BookProgressForm({ book, onSave, onCancel })` — `onSave: (input: BookProgress) => Promise<boolean>`, 성공하면 닫힌다.

| 칸 | 종류 | 규칙 |
|---|---|---|
| 현재 회독 (`aria-label="현재 회독"`) | 숫자 | 1 ~ 목표 회독 |
| 어디까지 (`aria-label="어디까지"`, placeholder `쪽` 또는 `Day`) | 숫자 | 0 ~ 총량 |
| 목표 회독 (`aria-label="목표 회독"`) | 숫자 | 1 ~ 10 |

버튼 `취소`(ghost)·`저장`. 규칙을 하나라도 어기면 저장 비활성.

`BookAddForm`에 칸을 더한다: 단위 Select(`쪽`/`Day`, `aria-label="단위"`), 총량 placeholder는 단위에 따라 `총 페이지`/`총 Day 수`, `목표 회독`(기본 `1`, 1~10), `하루 고정 분량`(선택, placeholder `하루 고정 분량 (비우면 시험일까지 고르게)`, 1 이상 정수).

- [ ] **Step 4: 확인**

Run (`Frontend/`): `npm run format`, `npm run build`, `npm run lint` → 오류 0.
`/ui` 카탈로그에 새 컴포넌트를 넣지 않는다(공용 `ui/` 컴포넌트가 아니다).
브라우저(사용자, Task 3 Mock 데이터를 넣은 카카오 계정): 공부 설정에 `1/3회독 430/456쪽`, 영어 단어 `1/4회독 Day 0/60`. 영어 기본서를 `1회독 300쪽`으로 고치면 "계획을 나눴어요" 안내. 목표 회독을 현재 회독보다 낮게 넣으면 저장 비활성. 오늘의 분량에 `Day 1`이 보인다.

- [ ] **Step 5: DESIGN.md** — "3. 공부 설정 변경" 와이어프레임의 교재 행을 `기본서  1/3회독 100/500쪽  수정 ✕`로, 설명에 진도 수정과 추가 칸을 적는다. "2. 현재 공부상태"에 진도율이 목표 회독 기준이라는 것과 이번주 목표량은 쪽 교재만 센다는 것을 적는다.

- [ ] **Step 6: Commit**

```bash
git add Frontend/src DESIGN.md
git commit -m "feat: 교재 회독·진도 수정과 Day 단위 표시"
```

---

### Task 5: 시험 점수 입력 (공부 설정)

**Files:**
- Create: `Frontend/src/api/exams.ts`, `Frontend/src/hooks/useMockExams.ts`, `Frontend/src/libs/exams.ts`, `Frontend/src/components/settings/ExamScoreForm.tsx`, `Frontend/src/components/settings/ExamScoreList.tsx`
- Modify: `Frontend/src/pages/SettingsPage.tsx`, `DESIGN.md`

**Interfaces:**
- Consumes: Task 1의 `MockExam`, `NewMockExam`, `ExamKind`, `MockExamScore`.
- Produces:
  ```ts
  // libs/exams.ts
  export const EXAM_KIND_LABELS: Record<ExamKind, string> // { mock: '모의고사', official: '실제 시험' }
  // api/exams.ts
  export async function fetchMockExams(): Promise<MockExam[]> // 응시일 최신순, scores 조인 `mock_exam_scores(subject, score)`
  export async function addMockExam(input: NewMockExam): Promise<MockExam> // 시험 insert → 점수 insert. 점수 insert가 실패하면 방금 만든 시험을 지우고 오류를 던진다
  export async function deleteMockExam(id: string): Promise<void> // 점수는 on delete cascade
  // hooks/useMockExams.ts
  export interface MockExamsState { exams: MockExam[]; loading: boolean; error: string | null;
    add: (input: NewMockExam) => Promise<boolean>; remove: (id: string) => Promise<void> }
  ```
  점수를 바꿔도 계획은 다시 나누지 않는다.

- [ ] **Step 1: api·libs·훅**

- [ ] **Step 2: 화면**

`SettingsPage`에서 "D-Day까지 남은 공부 분량"과 "과목별 공부법" 사이에 `<Section title="시험 점수">`.

| 자리 | 내용 |
|---|---|
| 빈 상태 (`Notice`) | 등록된 점수가 없어요. 모의고사나 시험을 보면 점수를 넣어 주세요. |
| 행 첫 줄 | `{EXAM_KIND_LABELS[kind]} · {name}` (왼쪽), `formatFullDate(taken_on)` (오른쪽, `text-muted`) |
| 행 둘째 줄 (`text-sm`) | 과목 순서대로 `국어 84 · 영어 52 · 공중보건 80 · 보건행정 68`, 없는 과목은 뺀다 |
| 삭제 | ✕ 버튼 `aria-label={`${name} 삭제`}`, 확인 `'${name}' 점수를 삭제할까요?` |
| 추가 버튼 | `점수 추가` (ghost, block) |

`ExamScoreForm({ onAdd, onCancel })`: 구분 Select(`aria-label="구분"`, 기본 모의고사), 시험 이름 TextField(placeholder `시험 이름 (예: 해커스 모의고사)`), `DatePicker`(`id="exam-taken-on"`, `label="응시일"`, `minDate` 없음), 과목 4칸(`inputMode="decimal"`, `aria-label={`${과목} 점수`}`, placeholder 과목 이름), 버튼 `취소`·`추가`.
유효: 이름이 있고, 응시일이 있고, 점수 칸이 하나 이상 채워졌고, 채운 칸은 모두 0~100. 빈 칸 과목은 저장하지 않는다.

- [ ] **Step 3: 확인**

Run (`Frontend/`): `npm run format`, `npm run build`, `npm run lint` → 오류 0.
브라우저(사용자): Mock 데이터의 3건이 최신순으로 보인다. 영어만 넣은 모의고사를 추가하면 둘째 줄에 영어만 보인다. 삭제하면 목록에서 사라지고 새로고침해도 없다.

- [ ] **Step 4: DESIGN.md** — "3. 공부 설정 변경" 와이어프레임과 설명에 "시험 점수" 영역(위 표의 구성)을 넣는다. 점수 추이 차트는 3단계라고 적는다.

- [ ] **Step 5: Commit**

```bash
git add Frontend/src DESIGN.md
git commit -m "feat: 공부 설정에서 시험 점수 입력"
```

---

## 끝나고

- 전체 브랜치 리뷰(task-reviewer + code-reviewer).
- 로드맵 2단계 완료 기준 확인: Mock 데이터로 시험 전날까지 계획이 나뉘고, 공부 설정에서 회독·진도·점수를 넣고 고칠 수 있다.
- 1단계 Task 3~7 계획에 회독을 반영해야 할 곳을 History "남은 일"에 남긴다: Task 4 `nextCurrentPage`(회독 경계), Task 5 `subjectPercents`(목표 회독 기준), 채팅 교재 추가가 `NewBook`의 새 칸을 받는지.
