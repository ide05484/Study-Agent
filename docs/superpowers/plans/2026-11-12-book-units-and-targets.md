# 교재 단위·회독별 목표일 (묶음 A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 교재를 Day·챕터·회차 단위로 등록하고 회독마다 목표일과 하루 최소 분량을 정하면, 계획이 목표일에 맞춰 나뉘고 마지막 주에는 분량이 늘지 않는다.

**Architecture:**
- 새 마이그레이션 하나로 enum(`day`·`chapter`·`session`), 칸 이름(`*_page` → `*_unit`), `books.round_targets date[]`, `replace_daily_tasks`를 바꾼다. 칸 이름이 바뀌면 배포된 함수·화면이 바로 깨지므로 Task 1에서 이름 변경을 한 번에 끝내고 함수를 다시 배포한다.
- 나누는 규칙은 계속 `_shared/plan.ts`의 순수 함수다. 날짜 계산(목표일 → 며칠째, D-8 분량)은 `plan-generator`와 미리보기 스크립트가 해서 넘긴다.
- 화면은 디자인 시스템 공용 컴포넌트(`ChipGroup`, `Modal`, 확인·알림)를 먼저 만들고, 그 위에 교재 폼·행과 목표일 지남 모달을 올린다.

**Tech Stack:** Supabase(Postgres + RLS, Edge Functions/Deno), Deno test, Node `tsx` 스크립트, React 19 + Tailwind v4. Frontend 테스트 도구는 없다.

**Spec:** [2026-11-12-book-units-and-targets-design.md](../specs/2026-11-12-book-units-and-targets-design.md)

## 이 계획에서 정한 것 (설계에 없던 것)

| 항목 | 결정 | 출처 |
|---|---|---|
| 이번주 목표량(대시보드) | 쪽이 없어지므로 과목마다 단위별 합계를 이어 쓴다. 예: `국어 12회`, `영어 10회 · Day 7`. Day 교재도 센다 | 진행자 제안 |
| `Select` 컴포넌트 | 쓰는 곳이 없어지므로 지운다(`/ui`, DESIGN.md에서도) | 진행자 제안 |
| `BookProgress` 타입 | 진도와 계획 설정을 함께 고치므로 `BookPlanUpdate`로 이름을 바꾼다. api `updateBookProgress` → `updateBook`, 훅 `updateProgress` → `update` | 진행자 제안 |
| `DatePicker` | 목표일 상한(시험 전날)을 위해 `maxDate`를 더한다 | 진행자 제안 |
| Mock 다시 넣기 | `npx supabase db query --linked`로 `mock:sql` 결과를 실행한다(MCP는 delete를 받지 않음) | 진행자 제안 |

## Global Constraints

- 단위: `public.book_unit` = `day`, `chapter`, `session`. 화면 이름 `Day`·`챕터`·`회차`. 범위 표기 `Day 3–4`, `3–4챕터`, `12–14회`(en dash). 진도 `Day 12/60`, `3/20챕터`, `12/30회`, 목표 2회독 이상이면 앞에 `2/3회독 `.
- 칸 이름: `books.total_units`, `books.current_unit`, `books.round_targets`(`date[]`, n번째 = n회독 목표일, null = 없음), `daily_tasks.start_unit`·`end_unit`, `study_logs.start_unit`·`end_unit`. `books.daily_amount` = 하루 **최소** 분량.
- 목표 회독 1~10, 현재 회독 1~목표 회독, 현재 위치 0~총량, `cardinality(round_targets) <= target_rounds`.
- 마지막 주 = 시험 전날부터 거꾸로 7일(D-7 ~ D-1). 상한 = 그 교재의 D-8 계획 분량 합. 지난 목표일의 기본값 = 오늘 + 14일, 최대 시험 전날.
- 화면 문구(그대로 쓴다): `목표일이 지났어요`, `다음 목표일을 정하면 계획을 다시 나눠 드려요.`, `나중에`, `저장`, `목표일 지남`, `N회독 목표 M월 D일`(예: `2회독 목표 12월 31일`), `N회독 목표일 지남`. 해요체, 재촉하는 문구 금지.
- 화면에 `<select>`와 `window.confirm`/`window.alert`가 남지 않는다.
- CONVENTIONS.md, DESIGN.md 토큰·전체 이름 매핑 규칙. 팝업(Menu, DatePicker, Modal)만 `shadow-lg`.
- ☁️ 단계는 개발 프로젝트(`ishtebcswgyagbbaakpx`)에만. 이미 반영된 마이그레이션은 고치지 않는다. CLI는 `Backend/`가 link돼 있다.
- 실제 점수·개인 정보는 커밋·History에 적지 않는다(`study-mock.json`은 git 제외 그대로).
- Task마다 `feature/study_screen_and_data`에 경로 지정 커밋, push 안 함, 커밋에 Claude 표시 줄 없음, History 기록(메인 세션).

## Review Focus

1. **목표일이 없는 교재의 계획이 바뀜** — 목표일·최소 분량이 없으면 지금(2·3·2·3)과 같아야 한다. → Task 2 테스트 "목표일·최소 분량이 없으면 지금과 같다"
2. **마지막 주에 분량이 늘어남** — D-7 이후 재분배에서 하루 분량이 D-8보다 커지면 안 된다. → Task 2 테스트 "마지막 주에는 상한을 넘지 않고 남긴다", "상한은 마지막 7일에만"
3. **지난 목표일 모달에서 `나중에`를 눌렀는데 다음에 또 뜸** — 기본값을 저장해 다시 뜨지 않아야 한다. → Task 6 Step 3 수동 확인
4. **칸 이름 변경이 빠진 곳** — 옛 이름이 코드에 남으면 런타임에 조용히 `undefined`가 된다. → Task 1 Step 5 grep 0건
5. **시험일을 앞당겨 목표일이 시험일 이후가 됨** — 계획은 시험 전날로 줄여 쓰고, 수정 폼은 그 목표일을 보여 주되 저장 전에 고치게 한다. → Task 2 테스트 "시험 이후 목표일은 시험 전날로", Task 5 Step 3

## 실행 방식

| Task | 방식 | 이유 |
|---|---|---|
| 1~3 | Native | ☁️ 반영·배포가 이어지고, 이름 변경이 끝나기 전에는 빌드가 깨진다 |
| 4~6 | Subagent + 리뷰 | 화면 작업. Task 4의 공용 컴포넌트 계약만 이어 쓴다 |
| 끝 | 브랜치 전체 리뷰(task-reviewer + code-reviewer) | |

---

### Task 1: 단위·칸 이름 마이그레이션과 이름 일괄 변경 (Native, ☁️)

**Files:**
- Create: `Backend/supabase/migrations/<타임스탬프>_book_units_and_round_targets.sql` (`npx supabase migration new book_units_and_round_targets`)
- Modify: `Frontend/src/interfaces/database.ts`(생성), `interfaces/study.ts`, `api/study.ts`, `libs/books.ts`, `hooks/useBooks.ts`, `hooks/useDashboard.ts`, `pages/DashboardPage.tsx`, `components/chat/TodayPlan.tsx`, `components/settings/BookAddForm.tsx`, `components/settings/BookProgressForm.tsx`, `pages/SettingsPage.tsx`
- Modify: `Backend/supabase/functions/_shared/plan.ts`, `_shared/plan_test.ts`, `plan-generator/index.ts`, `Backend/scripts/mock/types.ts`, `mock/load.ts`, `mock-sql.ts`, `plan-preview.ts`, `mock/study-mock.example.json`, `mock/study-mock.json`(git 제외, 로컬만)
- Modify: `README.md`(ER 다이어그램), `CONVENTIONS.md`(예시 `total_pages` → `total_units`), `DESIGN.md`(이번주 목표량: "쪽 단위 교재의 계획만" → 단위별 합계 `10회 · Day 7`, 교재 행 표기 예시)

**Interfaces:**
- Produces (Frontend `interfaces/study.ts`):
  - `type BookUnit = 'day' | 'chapter' | 'session'`
  - `Book { id; subject; title; unit: BookUnit; total_units; current_unit; target_rounds; current_round; daily_amount: number | null; round_targets: (string | null)[] }`
  - `NewBook = Pick<Book, 'subject' | 'title' | 'unit' | 'total_units' | 'target_rounds' | 'daily_amount' | 'round_targets'>`
  - `BookPlanUpdate = Pick<Book, 'current_round' | 'current_unit' | 'target_rounds' | 'daily_amount' | 'round_targets'>`
  - `DailyTask.start_unit`·`end_unit`, `StudyLog.start_unit`·`end_unit`
- Produces (api/훅): `updateBook(id: string, input: BookPlanUpdate): Promise<Book>`, `BooksState.update(id, input: BookPlanUpdate): Promise<boolean>`
- Produces (Backend): `PlanBook`·`PlannedTask`의 필드가 `total_units`·`current_unit`·`start_unit`·`end_unit`. 동작은 이 Task에서 바꾸지 않는다.

- [ ] **Step 1: 마이그레이션 작성**

순서: (1) `book_unit`을 `book_unit_old`로 이름 바꾸기 → 새 `public.book_unit ('day','chapter','session')` → `books.unit`을 `using (case when unit::text = 'page' then 'session' else unit::text end)::public.book_unit`로 옮기고 기본값 `'session'` → `book_unit_old` drop. (2) `rename column` 6개와 제약 `books_current_page_max` → `books_current_unit_max`. (3) `books.round_targets date[] not null default '{}'` + check `books_round_targets_len check (cardinality(round_targets) <= target_rounds)`. (4) `comment on column public.books.daily_amount is '하루 최소 분량. null이면 목표일(없으면 시험 전날)까지 고르게'`. (5) `replace_daily_tasks`를 `create or replace`로 다시 정의(본문의 `start_page`·`end_page`만 `start_unit`·`end_unit`, 나머지는 `20261112011647`과 같음). 권한 문장은 `create or replace`가 유지하지만 같은 revoke/grant를 다시 적는다.

- [ ] **Step 2: Backend 이름 변경**

`plan.ts`·`plan_test.ts`·`plan-generator`·스크립트 4개·예시 JSON·로컬 JSON에서 이름만 바꾼다. Mock `unit`의 `"page"`는 이 Task에서 `"session"`으로만 바꾼다(값은 Task 3). `load.ts`의 단위 허용 값 목록도 `day`·`chapter`·`session`.

Run: `cd Backend; npm test` → `ok | 8 passed | 0 failed`. 함수 폴더에서 `npx deno check --no-lock index.ts` → 통과. `npm run plan:preview -- --today 2026-11-12` → 오류 없이 표 출력.

- [ ] **Step 3: ☁️ 반영과 배포**

`npx supabase db push --dry-run`(이 파일 하나) → `db push` → `npm run gen:types` → **바로** `npx supabase functions deploy plan-generator --project-ref ishtebcswgyagbbaakpx --use-api`(옛 함수는 `start_page`를 넣으므로 반영과 배포 사이에 재분배하지 않는다). MCP `execute_sql`(읽기)로 `replace_daily_tasks`의 `prosecdef`·`search_path`·anon/authenticated 실행 권한이 이전과 같은지, `get_advisors(security)`에 새 경고가 없는지 확인한다.

- [ ] **Step 4: Frontend 이름 변경**

인터페이스(위 Produces), `BOOK_COLUMNS`에 `round_targets`, `fetchDailyTasks` select 칸, `libs/books.ts`(`UNIT_LABELS = { day: 'Day', chapter: '챕터', session: '회차' }`, `rangeLabel`·`progressLabel`을 Global Constraints 표기로), 폼 두 개는 칸 이름과 단위 선택지(`<Select>`는 Task 5에서 칩으로 바꾸므로 이 Task에서는 선택지 값만)만, `updateBook`·`update`로 이름 변경. 대시보드 이번주 목표량은 `WeeklyGoal { subject; amounts: { unit: BookUnit; amount: number }[] }`로 바꾸고 `DashboardPage`는 `amounts`를 `rangeLabel`과 같은 단위 표기로 ` · `로 이어 쓴다(예: `10회 · Day 7`).

- [ ] **Step 5: 옛 이름이 남지 않았는지 확인**

Run: `git grep -nE "total_pages|current_page|start_page|end_page|'page'|\"page\"|BookProgress|updateBookProgress" -- Frontend/src Backend/supabase/functions Backend/scripts ':!*database.ts'`
Expected: 0건. Frontend `npm run format`·`build`·`lint` 통과.

- [ ] **Step 6: 확인과 커밋**

브라우저: 공부 설정 교재 목록이 `21/60회`가 아니라 지금 숫자 그대로 `회` 표기로 나오고(값은 Task 3에서 바꿈), 오늘의 분량이 `409–413회`처럼 보이면 된다. `git add`(위 파일, `study-mock.json` 제외) → `git commit -m "feat: 교재 단위를 Day·챕터·회차로, 칸 이름을 unit으로"`.

### Task 2: 회독별 목표일·최소 분량·마지막 주 규칙 (Native, ☁️)

**Files:**
- Modify: `Backend/supabase/functions/_shared/plan.ts`, `_shared/plan_test.ts`, `plan-generator/index.ts`
- Modify: `SERVICE_FLOW.md`(계획 분배 규칙, 6.1), `CLAUDE.md`(plan-generator 설명 한 줄)

**Interfaces:**
- Consumes: Task 1의 `PlanBook`·`PlannedTask` 필드 이름
- Produces:
  ```ts
  export interface PlanOptions {
    days: number; // 오늘(0)부터 시험 전날까지의 날 수
    targetDays: (number | null)[]; // n번째 = n회독 목표일이 오늘부터 며칠째(음수 = 지남), null = 없음
    lastWeekCap: number | null; // 마지막 7일의 하루 상한(D-8 분량). 없으면 null
  }
  export const OVERDUE_GRACE_DAYS = 14;
  export const LAST_WEEK_DAYS = 7;
  export function completedUnits(book: Pick<PlanBook, "total_units" | "current_round" | "current_unit">): number;
  export function planBook(book: PlanBook, options: PlanOptions): PlannedTask[];
  ```

- [ ] **Step 1: 테스트 고치기와 추가**

기존 테스트 8개를 `planBook(book, { days, targetDays: [], lastWeekCap: null })`로 바꾸고, "하루 고정 분량…" 두 개는 아래로 대체한다. 도우미 `t(day, round, start_unit, end_unit)`. 모두 `book_id: "b"`.

```ts
Deno.test("목표일·최소 분량이 없으면 지금과 같다", () => {
  assertEquals(planBook(book({ total_units: 10 }), opts(4)), [t(0,1,1,2), t(1,1,3,5), t(2,1,6,7), t(3,1,8,10)]);
});
Deno.test("1회독 목표일까지 1회독, 나머지는 시험 전날까지", () => {
  assertEquals(planBook(book({ total_units: 10, target_rounds: 2 }), opts(6, [1, null])),
    [t(0,1,1,5), t(1,1,6,10), t(2,2,1,2), t(3,2,3,5), t(4,2,6,7), t(5,2,8,10)]);
});
Deno.test("목표일 없는 회독은 다음 목표일 구간에 합친다", () => {
  assertEquals(planBook(book({ total_units: 10, target_rounds: 3 }), opts(6, [null, 3, null])),
    [t(0,1,1,5), t(1,1,6,10), t(2,2,1,5), t(3,2,6,10), t(4,3,1,5), t(5,3,6,10)]);
});
Deno.test("최소 분량이 크면 일찍 끝내고 다음 회독으로", () => {
  assertEquals(planBook(book({ total_units: 10, target_rounds: 2, daily_amount: 4 }), opts(10)),
    [t(0,1,1,4), t(1,1,5,8), t(2,1,9,10), t(2,2,1,2), t(3,2,3,6), t(4,2,7,10)]);
});
Deno.test("지난 목표일은 오늘 + 14일로 본다", () => {
  const tasks = planBook(book({ total_units: 30 }), opts(30, [-3]));
  assertEquals(tasks.length, 15);
  assertEquals(tasks.at(-1), t(14, 1, 29, 30));
});
Deno.test("시험 이후 목표일은 시험 전날로", () => {
  assertEquals(planBook(book({ total_units: 10 }), opts(4, [100])), [t(0,1,1,2), t(1,1,3,5), t(2,1,6,7), t(3,1,8,10)]);
});
Deno.test("앞 회독보다 이른 목표일은 앞 목표일로 올린다", () => {
  assertEquals(planBook(book({ total_units: 10, target_rounds: 2 }), opts(6, [3, 1])),
    [t(0,1,1,5), t(1,1,6,10), t(2,2,1,5), t(3,2,6,10)]);
});
Deno.test("마지막 주에는 상한을 넘지 않고 남긴다", () => {
  const tasks = planBook(book({ total_units: 100, current_unit: 20 }), opts(7, [], 10));
  assertEquals(tasks.length, 7);
  assertEquals(tasks[0], t(0, 1, 21, 30));
  assertEquals(tasks.at(-1), t(6, 1, 81, 90));
});
Deno.test("상한은 마지막 7일에만", () => {
  const amounts = planBook(book({ total_units: 20 }), opts(10, [], 1)).map((x) => x.end_unit - x.start_unit + 1);
  assertEquals(amounts, [2, 2, 2, 1, 1, 1, 1, 1, 1, 1]);
});
Deno.test("상한이 없으면 마지막 주도 고르게 끝낸다", () => {
  assertEquals(planBook(book({ total_units: 100, current_unit: 20 }), opts(7)).at(-1)?.end_unit, 100);
});
```
`opts(days, targetDays = [], lastWeekCap = null)`는 테스트 도우미.

- [ ] **Step 2: 실패 확인**

Run: `cd Backend; npm test` → 새 테스트가 FAIL(시그니처 불일치 또는 기대값 다름).

- [ ] **Step 3: `planBook(book, options)` 구현**

기한 목록을 먼저 만든다: 지금 회독 r(≥ `current_round`)부터 R까지 `targetDays[r-1]`이 있으면 `{ end: r × U, day }`, day는 (음수면 `min(14, days-1)`) → `min(day, days-1)` → 앞 기한 day 이상으로 올림. 마지막에 `{ end: R × U, day: days-1 }`를 붙이고, end가 지금 위치 이하인 기한은 버린다. day가 앞 기한과 같은 기한은 앞 기한에 합친다(end는 큰 쪽). 그래서 기한의 day는 엄격히 늘어난다. 구간 날 수 L은 최소 1로 둔다(최소 분량·상한 때문에 기한 뒤에 구간이 시작해도 0으로 나누지 않는다). 날마다:
```
구간이 바뀌거나(지금 위치 ≥ 구간 end) 처음이면: p0 = pos, s = d, A = 구간 end - pos, L = 구간 day - d + 1
even = p0 + floor((d - s + 1) × A / L)
amount = max(even - pos, daily_amount ?? 0)
if lastWeekCap !== null && d >= days - LAST_WEEK_DAYS: amount = min(amount, lastWeekCap)
amount = min(amount, R × U - pos)
```
amount > 0이면 지금처럼 회독 경계에서 끊어 줄을 만든다. 최소 분량·상한 때문에 pos가 even과 달라지면, 다음 구간은 그 pos에서 새로 시작한다(구간 안에서는 다시 앵커하지 않는다).

- [ ] **Step 4: 통과 확인**

Run: `npm test` → 전부 PASS. `npx deno fmt supabase/functions/_shared`.

- [ ] **Step 5: `plan-generator`**

`books` select에 `round_targets`. `targetDays = book.round_targets.map((d) => d ? diffDays(today, d) : null)`. `days <= LAST_WEEK_DAYS`면 `daily_tasks`에서 `task_date = addDays(exam_date, -8)`인 줄을 한 번 읽어 `book_id`별 `end_unit - start_unit + 1` 합을 `lastWeekCap`으로(없는 교재는 null). 함수 폴더에서 `deno check --no-lock` 통과.

- [ ] **Step 6: ☁️ 배포와 확인**

`functions deploy plan-generator`. 사용자가 화면에서 진도를 한 번 저장 → 함수 로그(MCP `query_logs`)로 200과 실행 시간 확인.

- [ ] **Step 7: 문서와 커밋**

SERVICE_FLOW.md 분배 규칙(목표일 구간, 최소 분량, 마지막 주 상한, 지난 목표일 14일)과 6.1, CLAUDE.md 한 줄. `git commit -m "feat: 회독별 목표일·최소 분량·마지막 주 상한으로 계획 나누기"`.

### Task 3: Mock 데이터와 계획 미리보기 (Native, ☁️)

**Files:**
- Modify: `Backend/scripts/mock/types.ts`(`round_targets?: (string | null)[]`), `mock/load.ts`(목표일 형식·순서·개수 검사), `mock-sql.ts`(`round_targets` insert), `plan-preview.ts`, `mock/study-mock.example.json`, `mock/study-mock.json`(로컬), `LOCAL_DEV.md`("Mock 공부 데이터"에 `db query` 실행법)

**Interfaces:**
- Consumes: Task 2 `planBook(book, PlanOptions)`, `LAST_WEEK_DAYS`

- [ ] **Step 1: Mock 값**

| 교재 | unit | total | 진도(회독/위치) | 목표 회독 | 최소 | 목표일 |
|---|---|---|---|---|---|---|
| 국어 올인원 기본서 | session | 60 | 1 / 57 | 3 | – | 1회독 2026-11-30 |
| 쉬운국어 | session | 30 | 1 / 0 | 1 | – | – |
| 영어 올인원 기본서 | session | 60 | 1 / 21 | 3 | – | 1회독 2027-01-31 |
| 비비안 하프모의고사 | session | 20 | 1 / 0 | 1 | – | – |
| 영어 단어(1·2권) | day | 60 | 1 / 0 | 4 | 1 | – |
| 공중보건 기본서 | session | 60 | 1 / 24 | 3 | – | – |
| 공중보건 실전동형 | session | 15 | 1 / 0 | 1 | – | – |
| 보건행정 기본서 | session | 60 | 1 / 15 | 3 | – | – |
| 보건행정 실전동형 | session | 15 | 1 / 0 | 1 | – | – |

예시 JSON은 같은 교재·값(점수만 가짜 그대로).

- [ ] **Step 2: 미리보기**

`plan-preview.ts`는 `--today`의 남은 날로 `planBook`을 부르고, 교재마다 회독별 `목표일 / 끝나는 날`(목표일 없으면 `–`), 못 끝낸 분량을 출력한다. `--today`가 D-7 이후면 같은 교재를 D-8 기준으로 한 번 계획해 D-8 분량을 상한으로 쓴다.
Run: `npm run plan:preview -- --today 2026-11-12` → 국어 기본서 1회독 끝나는 날 ≤ 2026-11-30, 영어 기본서 1회독 ≤ 2027-01-31, 못 끝낸 분량 없음. `--today 2027-06-14`(D-5) → 오류 없이 출력.

- [ ] **Step 3: ☁️ 개발 DB에 다시 넣기**

`npm run mock:sql -- <카카오 계정 USER_ID>`를 스크래치패드 파일로 → `npx supabase db query --linked -f <파일>`(플래그는 `--help`로 확인). 끝의 확인 select가 교재 9 · 시험 3 · 점수 12, `exam_date` 있음. 사용자가 공부 설정에서 시험일을 다시 저장해 재분배 → 오늘 `daily_tasks`를 미리보기 첫날과 대조.

- [ ] **Step 4: 커밋**

`git commit -m "chore: Mock 교재를 회차·목표일로, 미리보기에 목표일 표시"`(로컬 `study-mock.json` 제외).

### Task 4: 공용 ChipGroup·Modal·확인/알림 (Subagent + 리뷰)

**Files:**
- Create: `Frontend/src/components/ui/ChipGroup.tsx`, `components/ui/Modal.tsx`, `components/ui/DialogProvider.tsx`, `hooks/useDialog.ts`
- Modify: `components/ui/DatePicker.tsx`(`maxDate?: string`), `components/layout/AppLayout.tsx`(DialogProvider), `pages/SettingsPage.tsx`(`window.confirm` 두 곳), `pages/UiCatalogPage.tsx`, `DESIGN.md`(원칙의 팝업 예외에 Modal, 컴포넌트 목록·설명, 터치 영역)

**Interfaces:**
- Produces:
  ```ts
  // ChipGroup.tsx
  interface ChipOption<T extends string> { value: T; label: string }
  interface ChipGroupProps<T extends string> { label: string; options: ChipOption<T>[]; value: T; onChange: (value: T) => void; disabled?: boolean }
  // Modal.tsx
  interface ModalProps { open: boolean; title: string; onClose: () => void; children: ReactNode; actions?: ReactNode }
  // useDialog.ts
  interface ConfirmOptions { title: string; message: string; confirmLabel?: string; tone?: 'default' | 'danger' }
  interface AlertOptions { title: string; message: string }
  export function useConfirm(): (options: ConfirmOptions) => Promise<boolean>
  export function useAlert(): (options: AlertOptions) => Promise<void>
  ```

- [ ] **Step 1: ChipGroup**

`role="radiogroup"` + `aria-label={label}`, 칩 `role="radio"`·`aria-checked`, roving tabindex, ←·→로 이동하며 바로 선택. 칩 `min-h-11 rounded-xl border px-3`, 고른 칩 `border-accent bg-accent-soft font-bold text-fg`, 나머지 `border-line text-muted`, `flex flex-wrap gap-2`. 클래스는 전체 이름 매핑.

- [ ] **Step 2: Modal**

`<dialog>`를 `open`에 따라 `showModal()`/`close()`. 닫기 이벤트(Esc 포함)에 `onClose`. 바깥(::backdrop) `bg-scrim`, 창 `w-[calc(100%-32px)] max-w-[448px] rounded-2xl border border-line bg-bg p-5 shadow-lg`, 제목 `text-[17px] font-bold`, `actions`는 아래 오른쪽 정렬 버튼 줄. 바깥을 눌러 닫기는 하지 않는다(입력 중 실수 방지).

- [ ] **Step 3: 확인·알림**

`DialogProvider`가 대기 중인 요청 하나를 들고 Modal을 그린다. 확인: `취소`(ghost) + `confirmLabel ?? '확인'`(primary, `tone: 'danger'`면 `bg-danger text-on-accent`), Esc·취소는 false. 알림: `확인` 하나. `AppLayout`의 `<Outlet>`을 감싼다. SettingsPage 두 곳을 `await confirm({ title: '교재 삭제', message: \`'${title}'을(를) 삭제할까요?\`, confirmLabel: '삭제', tone: 'danger' })`, 선택 삭제는 `message: \`교재 ${n}권을 삭제할까요?\``로.

- [ ] **Step 4: DatePicker `maxDate`**

`maxDate`보다 뒤는 고를 수 없다(`minDate`와 같은 방식).

- [ ] **Step 5: 카탈로그·문서·확인**

`/ui`에 ChipGroup(3개, 비활성), Modal 열기 버튼, 확인·알림 버튼. DESIGN.md 갱신. `npm run format`·`build`·`lint` 통과. 브라우저: `/ui` 라이트·다크, 폰 폭(360px), Esc로 닫힘, Tab이 모달 밖으로 나가지 않음. 교재 삭제 확인 창.

- [ ] **Step 6: 커밋**

`git commit -m "feat: 공용 ChipGroup·Modal과 확인·알림 창"`

### Task 5: 교재 폼·행 (Subagent + 리뷰)

**Files:**
- Create: `Frontend/src/components/settings/RoundTargetFields.tsx`(회독별 목표일 줄들)
- Modify: `components/settings/BookAddForm.tsx`, `components/settings/BookProgressForm.tsx`, `components/settings/ExamScoreForm.tsx`, `pages/SettingsPage.tsx`, `libs/books.ts`, `pages/UiCatalogPage.tsx`, `DESIGN.md`("3. 공부 설정 변경" 와이어프레임·교재 행·교재 추가 칸·수정, 컴포넌트 목록)
- Delete: `components/ui/Select.tsx`

**Interfaces:**
- Consumes: Task 1 `NewBook`, `BookPlanUpdate`, `useBooks().update`; Task 4 `ChipGroup`, `DatePicker.maxDate`
- Produces (`libs/books.ts`):
  ```ts
  export function currentTarget(book: Book): string | null; // 지금 회독 목표일
  export function isTargetOverdue(book: Book, today: string): boolean; // 목표일 < today 이고 지금 회독 미완
  export function targetLabel(book: Book, today: string): string | null; // '2회독 목표 12월 31일' | '1회독 목표일 지남' | null
  export function roundTargetBounds(targets: (string | null)[], index: number, today: string, examDate: string | null): { min: string; max: string | undefined };
  export function isRoundTargetsValid(targets: (string | null)[], today: string, examDate: string | null): boolean;
  ```
  `RoundTargetFields` props: `{ idPrefix: string; rounds: number; value: (string | null)[]; today: string; examDate: string | null; onChange: (value: (string | null)[]) => void }`

- [ ] **Step 1: libs**

`roundTargetBounds`: min = 앞 회독들 중 마지막 목표일과 오늘 중 늦은 날, max = 시험 전날(시험일 없으면 undefined). `isRoundTargetsValid`: 채운 값이 오늘 이상, 시험일 미만, 회독 순서대로 줄지 않음. 지난 목표일(저장된 값)은 수정 폼에서만 그대로 보이고 이 검사에서 거짓이다. 날짜 산술은 `libs/date.ts`만.

- [ ] **Step 2: 폼**

추가 폼 순서: 과목 ChipGroup(4) → 교재명 → 단위 ChipGroup(`Day`·`챕터`·`회차`, 기본 `회차`) → 총량(`총` + 숫자 + 단위 이름) → 목표 회독(1~10) → `RoundTargetFields`(목표 회독 수만큼 `N회독 목표일` + DatePicker, 비워도 됨) → 하루 최소 분량(선택). 목표 회독을 줄이면 배열을 그 길이로 자른다. 수정 폼: 현재 회독, 어디까지, 목표 회독, `RoundTargetFields`, 하루 최소 분량 → `update`. 시험 점수 폼 구분도 ChipGroup. `Select` 파일·카탈로그 항목 삭제. 프로필의 `exam_date`는 `useProfileContext()`에서, 오늘은 `todayKey()`.

- [ ] **Step 3: 교재 행**

진도 오른쪽은 그대로, 행 아래 `targetLabel`(있을 때) — 지남이면 `text-xs text-danger`, 아니면 `text-xs text-muted`. 수동 확인: 시험일을 목표일보다 앞으로 옮긴 뒤 수정 폼을 열면 그 목표일이 보이고 `저장`이 비활성.

- [ ] **Step 4: 확인과 커밋**

`git grep -n "<select\|Select\b\|window\.confirm\|window\.alert" -- Frontend/src` → 0건. `format`·`build`·`lint`. 브라우저(360px·데스크톱): 칩이 앱 칸 안에서 줄바꿈, 목표 회독 3 → 목표일 줄 3개, 1회독보다 이른 2회독 날 비활성. `git commit -m "feat: 교재 폼에 단위 칩·회독별 목표일·최소 분량"`

### Task 6: 목표일 지남 모달 (Subagent + 리뷰)

**Files:**
- Create: `Frontend/src/components/layout/OverdueTargetsModal.tsx`, `hooks/useOverdueTargets.ts`
- Modify: `components/layout/AppLayout.tsx`, `DESIGN.md`(모달 설명)

**Interfaces:**
- Consumes: Task 1 `fetchBooks`, `updateBook`, `regeneratePlan`; Task 4 `Modal`, `DatePicker.maxDate`; Task 5 `isTargetOverdue`, `currentTarget`
- Produces: `useOverdueTargets(examDate: string | null): { items: OverdueItem[]; save: (dates: Record<string, string>) => Promise<boolean>; postpone: () => Promise<boolean> }`, `OverdueItem { book: Book; round: number; defaultDate: string }`

- [ ] **Step 1: 훅**

`examDate`가 있을 때만 `fetchBooks` → `isTargetOverdue(book, todayKey())`인 교재. `defaultDate` = min(오늘 + 14일, 시험 전날). `save`: 교재마다 `round_targets[round-1]`만 바꿔 `updateBook` → 모두 끝나면 `regeneratePlan()` 한 번 → `items` 비움. `postpone` = 모든 항목을 `defaultDate`로 `save`.

- [ ] **Step 2: 모달**

`AppLayout`에서 `items.length > 0`이면 연다. 제목 `목표일이 지났어요`, 문구 `다음 목표일을 정하면 계획을 다시 나눠 드려요.`, 줄마다 `{교재명} · {N}회독` + DatePicker(min 오늘, max 시험 전날, 기본 `defaultDate`), 버튼 `나중에`(ghost) · `저장`(primary). 저장 중 버튼 비활성, 실패는 모달 안 `Notice tone="error"`. Esc로 닫으면 `나중에`와 같다.

- [ ] **Step 3: 확인과 커밋**

개발 DB에서 국어 기본서 1회독 목표일을 어제로 바꾸고(MCP `execute_sql` update) 앱 새로고침 → 모달. `나중에` → 새로고침해도 다시 안 뜨고 목표일이 오늘 + 14일. 다시 어제로 → 날짜 골라 `저장` → 교재 행에 새 목표일, 재분배 1회(함수 로그). `format`·`build`·`lint`. `git commit -m "feat: 목표일이 지나면 다음 목표일을 묻는 모달"`

### 끝

- 채팅 연결 계획(`2026-10-27-chat-connection.md`) "2단계 반영" 표에 칸 이름 변경(`*_unit`)과 요구사항 C(채팅 완료 보고 → 진도·다른 계획 반영), 로드맵에 B(오늘의 분량 모달·체크, 다음), D(시험 한 달 전 응원 메시지)를 적는다.
- 브랜치 전체 리뷰(task-reviewer + code-reviewer 동시), History 기록, 사용자 브라우저 확인.
