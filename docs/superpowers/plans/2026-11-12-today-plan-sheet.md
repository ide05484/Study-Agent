# 오늘의 분량 시트와 체크 (묶음 B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 채팅 입력창 위 버튼으로 오늘의 분량을 아래 시트에 크게 열고, 체크하면 분량 상태와 교재 진도가 함께 바뀌며, 못 끝낸 분량은 다음에 앱을 열 때 남은 날로 다시 나뉜다.

**Architecture:**
- DB 함수 `set_task_done`이 분량 상태와 진도를 한 트랜잭션에서 바꾼다(채팅 요구사항 C도 같은 함수를 쓴다). `replace_daily_tasks`는 지난 `pending`을 `skipped`로 바꾼 뒤 교체한다.
- `plan-generator`는 오늘 이미 끝낸(`done`·`partial`) 교재를 내일부터 나눈다. 나누는 규칙은 계속 `_shared/plan.ts`의 순수 함수다.
- 화면은 공용 `Modal`에 시트 모양을 더하고, 그 위에 오늘의 분량 버튼·시트를 올린다. 앱을 열 때 이월은 `AppLayout`의 훅이 한다. 재분배가 끝나면 `libs/planEvents.ts` 알림으로 오늘의 분량을 다시 불러온다.

**Tech Stack:** Supabase(Postgres + RLS, Edge Functions/Deno), Deno test, React 19 + Tailwind v4. Frontend 테스트 도구는 없다.

**Spec:** [2026-11-12-today-plan-sheet-design.md](../specs/2026-11-12-today-plan-sheet-design.md)

## 이 계획에서 정한 것 (설계에 없던 것)

| 항목 | 결정 | 출처 |
|---|---|---|
| 내일부터 나누기 | `_shared/plan.ts`에 `planBookFromTomorrow` 래퍼를 둔다. 하루 수와 목표일 날짜 수를 1씩 줄여 `planBook`을 부르고 날짜를 1 민다. **목표일이 오늘인 회독**은 그래서 "지난 목표일"이 되어 14일 유예(최대 시험 전날)를 받는다. 앱이 같은 날 목표일 지남 창으로 다음 목표일을 묻는 것과 같은 결과다 | 진행자 제안 |
| 체크 뒤 화면 | `set_task_done`은 아무것도 돌려주지 않는다. 화면은 누른 줄만 먼저 바꾸고(낙관적), 저장이 끝나면 오늘 분량을 다시 불러 같은 교재 다른 줄(회독 경계)의 상태를 맞춘다 | 진행자 제안 |
| 재분배 알림 | `regeneratePlan`이 성공하면 `emitPlanChanged()`를 부르고, `useTodayTasks`가 `onPlanChanged`로 다시 불러온다. 교재 수정·시험일 저장·목표일 창·이월 어디서 다시 나눠도 채팅의 분량이 맞춰진다 | 진행자 제안 |
| 시트 닫기 | 바깥(`bg-scrim`) 누르기로 닫히는 것은 `variant="sheet"`일 때만. 가운데 창은 지금처럼 바깥으로 닫히지 않는다. 열고 닫는 움직임(슬라이드)은 넣지 않는다 | 진행자 제안 |
| `IconButton` | 시트 ✕를 위해 `icon="close"`를 더한다 | 진행자 제안 |
| SQL 확인 스크립트 | 사용자 UUID가 들어가므로 커밋하지 않고 스크래치패드에 두고 `db query --linked -f`로 돌린다 | 진행자 제안 |

## Global Constraints

- 화면 문구(그대로 쓴다):
  - 버튼: `오늘의 분량 {끝낸 수}/{전체 수}` + 오른쪽 `Chevron direction="right"`, 다 끝내면 `오늘의 분량 다 했어요 ✓`, 없으면 `오늘 배정된 분량이 없어요`, 실패하면 `오늘의 분량을 불러오지 못했어요`
  - 시트: 제목 `오늘의 분량` + 옆에 `{끝낸 수}/{전체 수}`(muted), 저장 실패 `저장하지 못했어요. 다시 눌러 주세요.`, 일부 `일부`, 빈 시트 `오늘 배정된 분량이 없어요.` + 링크 `교재 추가하기`(`/settings`)
  - DB 오류: 로그인 없음 `로그인한 사용자만 계획을 바꿀 수 있어요.`(42501), 분량 없음 `이 분량을 찾지 못했어요. 계획이 다시 나뉘었을 수 있어요.`(P0002)
- 완료 분량 = `(current_round − 1) × total_units + current_unit`. 회독을 막 끝내면 그 회독의 `total_units`로 둔다(다음 회독 0으로 넘기지 않는다). 목표 회독 × 총량을 넘지 않는다.
- 범위 표기는 `libs/books.ts`의 `rangeLabel`. 목표 2회독 이상이면 앞에 `{round}회독 `.
- 시트 줄 최소 높이 56px, 교재명 16px, 체크박스 24px(`<input type="checkbox">` + `<label>`). 버튼 높이 44px 이상.
- 해요체, 재촉하는 문구 금지. CONVENTIONS.md, DESIGN.md 토큰·전체 이름 매핑 규칙. 팝업만 `shadow-lg`.
- ☁️ 단계는 개발 프로젝트(`ishtebcswgyagbbaakpx`)에만. 이미 반영된 마이그레이션은 고치지 않는다. CLI는 `Backend/`가 link돼 있다. MCP는 delete를 받지 않는다.
- 사용자 UUID·실제 점수는 커밋·History에 적지 않는다.
- Task마다 `feature/study_screen_and_data`에 경로 지정 커밋, push 안 함, 커밋에 Claude 표시 줄 없음, History 기록(메인 세션).

## Review Focus

1. **체크한 뒤 같은 날 재분배하면 끝낸 교재에 오늘 분량이 또 생김** → Task 2 테스트 "내일부터 나누면 오늘(0일째) 분량이 없다"
2. **회독 경계 날 두 줄의 체크·해제 순서가 어긋남** — 뒤 줄 체크 → 앞 줄도 완료, 앞 줄 해제 → 뒤 줄도 해제 → Task 1 SQL 확인 2·3·4
3. **앱을 열 때마다 재분배가 반복됨** — 한 번 이월하면 지난 `pending`이 `skipped`가 되어 다음에는 부르지 않아야 한다 → Task 1 SQL 확인 9, Task 5 Step 3
4. **시험 전날 오늘 분량을 끝낸 뒤 재분배** — 내일이 시험일이라 나눌 날이 없다. 빈 배열이어야 하고 오류가 나면 안 된다 → Task 2 테스트 "남은 날이 오늘뿐이면 빈 배열"
5. **체크 저장 실패·연타** — 실패하면 되돌리고 문구를 띄운다. 저장 중인 줄은 다시 누를 수 없다 → Task 4 Step 4(DevTools 오프라인)

## 실행 방식

| Task | 방식 | 이유 |
|---|---|---|
| 1~2 | Native | ☁️ 반영·배포가 있고, SQL 확인과 Deno 테스트로 확인한다 |
| 3~4 | Subagent + 리뷰 | 화면 작업. Task 3의 `Modal` 계약을 Task 4가 쓴다 |
| 5 | Native | 훅 하나와 문서. Task 1·4의 계약만 쓴다 |
| 끝 | 이 계획 범위 리뷰(task-reviewer + code-reviewer, 같은 diff) | |

---

### Task 1: `set_task_done`과 지난 분량 `skipped` (Native, ☁️)

**Files:**
- Create: `Backend/supabase/migrations/<타임스탬프>_set_task_done.sql` (`npx supabase migration new set_task_done`)
- Modify: `Frontend/src/interfaces/database.ts`(`npm run gen:types`로 생성)
- 커밋 안 함: `<스크래치패드>/set_task_done_check.sql`

**Interfaces:**
- Produces:
  - `public.set_task_done(p_task_id uuid, p_done boolean) returns void` — `security invoker`, `set search_path = ''`, `authenticated`에만 실행 권한
  - `public.replace_daily_tasks(p_from date, p_tasks jsonb) returns integer` — 시그니처는 그대로, 맨 앞에서 지난 `pending`을 `skipped`로

- [ ] **Step 1: 확인 SQL 쓰기**

`begin; … rollback;` 한 파일. 맨 앞에서 `set local role authenticated;`, `select set_config('request.jwt.claims', json_build_object('sub', '<USER_ID>', 'role', 'authenticated')::text, true);`로 사용자를 흉내 낸다(USER_ID는 개발 DB의 카카오 계정. 대화에서 받는다). 테스트 교재와 분량은 그 뒤에 `user_id = '<USER_ID>'`로 넣는다(제목 `확인용 교재`, total 60, target 2, 진도 1회독째 57). 같은 날짜 D(= `current_date`)에 A: 1회독 58–60, B: 2회독 1–2. 각 경우는 `do $$ … assert … $$`로 확인하고, 마지막 줄은 `select 'ok';`.

| # | 상황 | 부르기 | 기대 |
|---|---|---|---|
| 1 | 1/57 | `set_task_done(A, true)` | 진도 1/60, A `done`, B `pending` |
| 2 | 이어서 | `set_task_done(B, true)` | 진도 2/2, A·B `done` |
| 3 | 이어서 | `set_task_done(A, false)` | 진도 1/57, A·B `pending` |
| 4 | 1/57 | `set_task_done(B, true)` | 진도 2/2, A·B `done`(앞 줄도 완료) |
| 5 | 진도를 2/10, 상태를 모두 `pending`으로 되돌린 뒤 | `set_task_done(A, true)` | 진도 2/10 그대로, A·B `done` |
| 6 | 목표 1회독·총 60·진도 1/59인 둘째 교재, 59–60 분량 | 체크 | 진도 1/60(2회독째 0이 아님) |
| 7 | 진도 1/2, 1–2 분량 | 해제 | 진도 1/0 |
| 8 | 없는 id(`gen_random_uuid()`), 다른 사용자의 분량 id(있으면) | 체크 | 둘 다 SQLSTATE `P0002` |
| 9 | D−1에 `pending` 한 줄, D에 `done` 한 줄 | `replace_daily_tasks(D, '[]')` | D−1 줄 `skipped`, D의 `done` 줄 그대로 |

다른 사용자 분량 id는 역할을 바꾸기 전에 `set_config('test.other_task', …, true)`로 담아 둔다.

- [ ] **Step 2: 실패 확인**

Run: `cd Backend; npx supabase db query --linked -f <스크래치패드>/set_task_done_check.sql`
Expected: FAIL `function public.set_task_done(uuid, boolean) does not exist`

- [ ] **Step 3: 마이그레이션 쓰기**

`set_task_done`:
1. `auth.uid()`가 없으면 42501. `replace_daily_tasks`와 같은 잠금 키(`'replace_daily_tasks:' || uid`)로 `pg_advisory_xact_lock`.
2. `daily_tasks` ⨝ `books`에서 그 분량과 교재(`total_units`, `current_round`, `current_unit`, `target_rounds`)를 `for update of b`로 읽는다(RLS가 자기 것만 보여 준다). 없으면 P0002.
3. 완료 `C`, 분량 끝 `E = (round − 1) × total + end_unit`, 분량 앞 `S = (round − 1) × total + start_unit − 1`. 체크면 `N = least(greatest(C, E), target_rounds × total)`, 해제면 `N = least(C, S)`.
4. `N = 0`이면 1회독째 0, 아니면 `current_round = ceil(N / total)`, `current_unit = N − (current_round − 1) × total`로 `books`를 고친다.
5. 같은 교재·같은 날짜 분량: `(round − 1) × total + end_unit ≤ N`이면 `done`, 아니고 `done`이었으면 `pending`, 그 밖은 그대로.

`replace_daily_tasks`: `create or replace`로 같은 본문에, 잠금 뒤 delete 전에 `update public.daily_tasks set status = 'skipped' where user_id = v_user_id and task_date < p_from and status = 'pending'`을 더한다. 두 함수 모두 `revoke … from public, anon; grant … to authenticated;`. 함수마다 한국어 `comment on function`.

- [ ] **Step 4: ☁️ 반영과 통과 확인**

Run: `npx supabase db push --dry-run` → 이 파일 하나. `npx supabase db push --yes`. 다시 Step 2의 명령.
Expected: 오류 없이 `ok`. `get_advisors`(security)에 새 경고 없음.

- [ ] **Step 5: 타입 생성과 커밋**

Run: `npm run gen:types` → `database.ts`에 `set_task_done` 생김. `cd ../Frontend; npm run build` 통과.

```bash
git add Backend/supabase/migrations/<타임스탬프>_set_task_done.sql Frontend/src/interfaces/database.ts
git commit -m "feat: 분량 체크 DB 함수 set_task_done, 재분배 때 지난 분량 skipped"
```

---

### Task 2: 오늘 끝낸 교재는 내일부터 나누기 (Native, ☁️)

**Files:**
- Modify: `Backend/supabase/functions/_shared/plan.ts`, `Backend/supabase/functions/_shared/plan_test.ts`, `Backend/supabase/functions/plan-generator/index.ts`
- Modify: `SERVICE_FLOW.md`("계획 분배 규칙")

**Interfaces:**
- Produces: `export function planBookFromTomorrow(book: PlanBook, options: PlanOptions): PlannedTask[]` — `options.days <= 1`이면 `[]`, 아니면 `planBook(book, { days: days − 1, targetDays: targetDays.map((t) => t === null ? null : t − 1), lastWeekCap })`의 `day`를 1씩 더해 돌려준다.

- [ ] **Step 1: 실패하는 테스트**

```ts
const book: PlanBook = { id: "b", total_units: 60, current_unit: 0, current_round: 1, target_rounds: 1, daily_amount: null };

Deno.test("내일부터 나누면 오늘(0일째) 분량이 없다", () => {
  const tasks = planBookFromTomorrow(book, { days: 30, targetDays: [], lastWeekCap: null });
  assert(tasks.length > 0 && tasks.every((t) => t.day >= 1));
  assertEquals(sumUnits(tasks), 60); // 남은 분량은 그대로 다 나눈다
});
Deno.test("남은 날이 오늘뿐이면 빈 배열", () => {
  assertEquals(planBookFromTomorrow(book, { days: 1, targetDays: [], lastWeekCap: null }), []);
});
Deno.test("내일부터 나눠도 마지막 주 상한은 같은 날짜에 걸린다", () => {
  // days 10, lastWeekCap 1, 남은 30 → day 3 이후(D-7부터)는 하루 1 이하
});
Deno.test("목표일 날짜도 하루 당겨 계산한다", () => {
  // targetDays [10] → 1회독은 day 10까지 끝난다
});
```
`sumUnits`는 테스트 파일 안의 작은 함수(`end_unit − start_unit + 1`의 합). 위 두 테스트의 본문은 같은 식으로 채운다.

- [ ] **Step 2: 실패 확인** — Run: `cd Backend; npm test` → FAIL `planBookFromTomorrow` 없음

- [ ] **Step 3: `planBookFromTomorrow` 구현, `plan-generator` 연결**

`plan-generator`: 교재를 읽은 뒤 `daily_tasks`에서 `task_date = today`이고 `status in ('done', 'partial')`인 `book_id`를 읽어 `Set`으로 둔다. 그 교재는 `planBookFromTomorrow`, 나머지는 `planBook`. 파일 맨 위 주석에 규칙 한 줄을 더한다. SERVICE_FLOW "계획 분배 규칙"에 두 줄: 지난 날짜의 미진행(`pending`)은 `skipped`(못 해서 뒤로 넘김)로 바꾼다, 오늘 이미 끝낸 교재는 내일부터 나눈다.

- [ ] **Step 4: 통과 확인** — Run: `npm test` → 모두 passed(21 + 4)

- [ ] **Step 5: ☁️ 배포와 커밋**

Run: `npx supabase functions deploy plan-generator --project-ref ishtebcswgyagbbaakpx --use-api`

```bash
git add Backend/supabase/functions/_shared/plan.ts Backend/supabase/functions/_shared/plan_test.ts Backend/supabase/functions/plan-generator/index.ts SERVICE_FLOW.md
git commit -m "feat: 오늘 끝낸 교재는 내일부터 다시 나누기"
```

---

### Task 3: 공용 Modal 시트 모양 (Subagent + 리뷰)

**Files:**
- Modify: `Frontend/src/components/ui/Modal.tsx`, `Frontend/src/components/ui/IconButton.tsx`, `Frontend/src/pages/UiCatalogPage.tsx`, `DESIGN.md`(Modal·IconButton 항목)

**Interfaces:**
- Produces:
  - `Modal` props 추가: `variant?: 'dialog' | 'sheet'`(기본 `dialog`, 지금과 같음), `titleAside?: ReactNode`(제목 오른쪽, 예: `1/4`)
  - `variant="sheet"`: 아래에 붙고 폭 100%·최대 480px(앱 칸), 최대 높이 `85dvh`, 위 모서리만 `rounded-t-2xl`, 아래 테두리 없음. 제목 줄 = 제목 + `titleAside`(`text-muted`) + 오른쪽 끝 `IconButton icon="close" label="닫기"`(누르면 `onClose`). 본문은 시트 안에서 `overflow-y-auto`. 바깥(`<dialog>` 자신을 누른 경우, `e.target === dialog`)을 누르면 `onClose`
  - `IconButton`의 `icon`에 `'close'`(✕ 선 아이콘, 다른 아이콘과 같은 크기·선 굵기)

- [ ] **Step 1: 구현** — 위 계약대로. 가운데 창의 동작(Esc만 닫힘, 바깥 무시)은 바꾸지 않는다. 클래스는 `variant`별 전체 이름 매핑.
- [ ] **Step 2: `/ui` 예시** — Modal 영역에 `시트 열기` 버튼과 줄 6개짜리 예시 시트(긴 목록 스크롤 확인용).
- [ ] **Step 3: 확인** — Run: `cd Frontend; npm run format; npm run build; npm run lint` → 통과. 브라우저 `/ui`: 360px·데스크톱에서 시트가 아래에 붙고, ✕·Esc·바깥으로 닫히고, 가운데 창은 바깥을 눌러도 안 닫힘.
- [ ] **Step 4: 커밋**

```bash
git add Frontend/src/components/ui/Modal.tsx Frontend/src/components/ui/IconButton.tsx Frontend/src/pages/UiCatalogPage.tsx DESIGN.md
git commit -m "feat: Modal 시트 모양과 닫기 아이콘"
```

---

### Task 4: 오늘의 분량 버튼·시트와 체크 (Subagent + 리뷰)

**Files:**
- Create: `Frontend/src/components/chat/TodayPlanButton.tsx`, `Frontend/src/components/chat/TodayPlanSheet.tsx`, `Frontend/src/libs/planEvents.ts`
- Delete: `Frontend/src/components/chat/TodayPlan.tsx`
- Modify: `Frontend/src/api/study.ts`, `Frontend/src/api/plan.ts`, `Frontend/src/hooks/useTodayTasks.ts`, `Frontend/src/libs/books.ts`, `Frontend/src/pages/ChatPage.tsx`, `DESIGN.md`(채팅 와이어프레임·오늘의 분량 항목)

**Interfaces:**
- Consumes: Task 1 `set_task_done`, Task 3 `Modal variant="sheet"`·`titleAside`
- Produces:
  - `api/study.ts`: `setTaskDone(taskId: string, done: boolean): Promise<void>`(rpc `set_task_done`)
  - `libs/planEvents.ts`: `emitPlanChanged(): void`, `onPlanChanged(listener: () => void): () => void`(해제 함수). `window`의 `CustomEvent('plan-changed')`로 구현
  - `api/plan.ts`: `regeneratePlan` 성공 뒤 `emitPlanChanged()`
  - `libs/books.ts`: `taskLabel(task: DailyTaskWithBook): string`(지금 `TodayPlan`의 `unitsLabel`을 옮김)
  - `useTodayTasks(date)` → `{ tasks: DailyTaskWithBook[] | null; error: string | null; reload: () => void; toggle: (taskId: string, done: boolean) => Promise<void>; savingIds: ReadonlySet<string>; toggleError: string | null }`
    - `toggle`: 그 줄 상태를 먼저 바꾸고 `savingIds`에 넣는다 → `setTaskDone` → 성공하면 `reload()`, 실패하면 원래 상태로 되돌리고 `toggleError` = 저장 실패 문구
    - `onPlanChanged`를 구독해 `reload()`

- [ ] **Step 1: api·이벤트·훅** — 위 계약대로. `toggle`은 이미 `savingIds`에 있는 줄이면 아무것도 하지 않는다.
- [ ] **Step 2: 버튼과 시트**
  - `TodayPlanButton({ tasks, error, onOpen, onRetry })`: Global Constraints 문구. 오류면 누를 때 `onRetry`, 그 밖은 `onOpen`. `tasks === null`(불러오는 중)이면 그리지 않는다. `rounded-full border border-line bg-surface`, 44px 이상, 끝낸 수는 `tabular-nums`, 남은 분량이 있으면 `marker`로 수를 칠한다.
  - `TodayPlanSheet({ open, onClose, tasks, savingIds, toggleError, onToggle })`: `Modal variant="sheet"`, 제목 `오늘의 분량`, `titleAside` = `끝낸/전체`. 맨 위에 `toggleError`면 `Notice tone="error"`. 줄은 Global Constraints 크기로 `[체크박스] 과목(작게)/교재명 … 범위`(`taskLabel`). 안 했으면 범위 굵게 + `marker`, `done`이면 `text-muted line-through`, `partial`이면 범위 뒤 `일부`(`text-xs text-muted`). 저장 중인 줄은 체크박스 `disabled`. 과목 순서는 훅이 정렬한 그대로. 비면 빈 시트 문구 + 링크(누르면 시트 닫고 이동).
- [ ] **Step 3: 채팅 화면**
  - `ChatPage`의 `TodayPlan`을 지운다. 읽기 전용이 아니면 입력 줄 위 오른쪽에 버튼을 띄운다(입력 `form`을 `relative` 줄로 감싸고 버튼은 `absolute bottom-full right-3 mb-2`). 메시지 목록에 버튼 높이만큼 아래 여백(`pb-16`).
  - `TodayPlan.tsx`를 지우고 쓰던 곳이 없는지 grep.
  - DESIGN.md: 채팅 와이어프레임의 위쪽 한 줄 막대 → 입력창 위 버튼과 시트, "오늘의 분량" 항목을 새 규칙으로.
- [ ] **Step 4: 확인**
  - Run: `cd Frontend; npm run format; npm run build; npm run lint` → 통과
  - 브라우저(360px·데스크톱):
    - 버튼이 마지막 말풍선을 가리지 않는다
    - 시트에서 체크하면 바로 바뀌고, 새로고침해도 남는다. 공부 설정의 그 교재 진도가 따라 바뀐다
    - DevTools 오프라인에서 체크하면 되돌아가고 `저장하지 못했어요. 다시 눌러 주세요.`가 뜬다
    - 공부 설정에서 시험일을 저장한 뒤 채팅으로 돌아오면 분량이 새로 보인다
- [ ] **Step 5: 커밋**

```bash
git add Frontend/src/components/chat Frontend/src/libs/planEvents.ts Frontend/src/libs/books.ts Frontend/src/api/study.ts Frontend/src/api/plan.ts Frontend/src/hooks/useTodayTasks.ts Frontend/src/pages/ChatPage.tsx DESIGN.md
git commit -m "feat: 채팅 오늘의 분량 버튼과 시트, 체크로 진도 반영"
```

---

### Task 5: 앱을 열 때 못 끝낸 분량 이월 (Native)

**Files:**
- Create: `Frontend/src/hooks/useCarryOver.ts`
- Modify: `Frontend/src/api/study.ts`, `Frontend/src/components/layout/AppLayout.tsx`, `SERVICE_FLOW.md`(4·5장), `docs/superpowers/plans/2026-10-27-chat-connection.md`(요구사항 C), `docs/superpowers/plans/2026-10-27-roadmap.md`

**Interfaces:**
- Consumes: Task 1(`skipped` 처리), Task 4(`regeneratePlan` → `emitPlanChanged`)
- Produces:
  - `api/study.ts`: `hasMissedTasks(before: string): Promise<boolean>` — `task_date < before`, `status = 'pending'`인 줄이 하나라도 있는지(`limit 1`)
  - `useCarryOver(examDate: string | null): void` — 앱을 연 뒤 시험일을 처음 알게 됐을 때 한 번(`checkedRef`). 시험 전날이 이미 지났으면 하지 않는다. 있으면 `regeneratePlan()`. 실패는 조용히 넘긴다(다음에 앱을 열 때 다시)

- [ ] **Step 1: 구현** — 위 계약대로. `AppLayout`에서 `OverdueTargetsModal` 옆에서 부른다.
- [ ] **Step 2: 문서** — SERVICE_FLOW 4장(오늘 일정 체크)에 시트 체크와 이월, 5장에 "체크와 채팅 보고는 같은 DB 함수 `set_task_done`". 채팅 연결 계획 요구사항 C에 함수 이름과 인자. 로드맵 묶음 B 줄에 이 계획 링크.
- [ ] **Step 3: 확인**
  - Run: `cd Frontend; npm run build; npm run lint` → 통과
  - 개발 DB에서 어제 날짜 `pending` 분량이 있는 상태로 앱을 연다 → Network 탭에 `plan-generator` 한 번, 조회하면 어제 분량은 `skipped`, 오늘 분량이 다시 나뉨. 앱을 새로 열면 `plan-generator`를 부르지 않는다.
- [ ] **Step 4: 커밋**

```bash
git add Frontend/src/hooks/useCarryOver.ts Frontend/src/api/study.ts Frontend/src/components/layout/AppLayout.tsx SERVICE_FLOW.md docs/superpowers/plans/2026-10-27-chat-connection.md docs/superpowers/plans/2026-10-27-roadmap.md
git commit -m "feat: 앱을 열 때 못 끝낸 분량을 남은 날로 다시 나누기"
```

---

### 끝

- 이 계획 범위(Task 1 시작 전 커밋 `..HEAD`, 생성 파일 `database.ts` 제외)를 task-reviewer와 code-reviewer에게 같은 diff로 맡긴다. 위 Review Focus를 함께 넘긴다.
- Critical·Important는 고치고 다시 확인한다. History에 Task별 기록과 리뷰 결과를 남긴다.
- 사용자 확인: 폰에서 시트 글씨 크기·체크 감각, 내일 아침 앱을 열 때 어제 못 한 분량이 이월되는지.
