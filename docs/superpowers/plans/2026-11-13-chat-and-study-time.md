# 채팅 연결과 순공시간 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 오늘 채팅방에서 메시지를 보내면 `chat` 함수가 학습 기록(진도·오늘 분량 상태)과 순공시간을 저장하고 코치 말투로 답하며, 대시보드 공부 잔디는 순공시간으로 칠한다.

**Architecture:**
- `chat`은 LLM으로 메시지를 분석하고(의도, 학습 기록, 순공시간), 결정적 코드와 DB 함수로 저장한 뒤, DB에서 모은 코치 컨텍스트로 답을 만든다. 순수 로직(분석 검증, 회독 판단, 날짜, 표기, 컨텍스트 문장, 대체 답변)은 OpenAI·Supabase를 import하지 않는 파일에 두고 `deno test`로 확인한다.
- 진도 반영은 새 DB 함수 `report_progress`, 순공시간은 `record_study_time`이 한 트랜잭션으로 한다. 채팅 보고는 계획을 다시 나누지 않는다.
- 화면은 `useChat`에 낙관적 표시를 더하고, 기록이 저장되면 `emitPlanChanged()`로 오늘의 분량을 다시 불러온다. 잔디는 `study_time`을 읽어 칸을 채우거나 점을 찍는다.

**Tech Stack:** Supabase(Postgres + RLS, Edge Functions/Deno, `@supabase/server`), OpenAI Responses API(`text.format` json_schema), React 19 + Tailwind v4, Deno test. Frontend 테스트 도구는 없다.

**Spec:**
- [묶음 C 설계](../specs/2026-11-13-study-time-heatmap-design.md) (C2 전체, C1의 "채팅 보고는 진도만")
- [SERVICE_FLOW.md](../../../SERVICE_FLOW.md) (2.1, 3, 5, 7, chat 의도별 처리), [coach-tone](../../coach/coach-tone.md)
- [채팅 연결 계획](2026-10-27-chat-connection.md)의 요구사항 C와 "2단계 반영" 표. 그 계획의 Task 3~7은 이 계획으로 대체한다.

## 이 계획에서 정한 것 (설계에 없던 것)

| 항목 | 결정 | 출처 |
|---|---|---|
| 채팅 진도 반영 함수 | 새 DB 함수 `report_progress(p_book_id, p_round, p_end_unit, p_date)`. 진도는 `max(지금, 보고 위치)`(목표 회독 × 총량 이하)로만 가고, 그날 그 교재 분량을 `done`·`partial`로 다시 매긴다. 체크(`set_task_done`)는 그대로 둔다. 요구사항 C의 "체크와 같은 함수"는 같은 잠금·같은 위치 계산으로 지킨다. 분량 끝을 넘는 보고, 분량 일부만 한 보고, 계획 밖 공부를 한 번에 처리하려면 `set_task_done`만으로는 모자라서다 | 진행자 제안 |
| 회독 판단 | LLM이 회독을 말했으면 그 회독. 아니면 `end_unit > current_unit`이면 지금 회독, 지금 회독을 다 끝냈고(`current_unit = total_units`) 다음 회독이 있으면 다음 회독, 그 밖(지금 진도보다 앞부분 = 복습)은 진도를 바꾸지 않고 기록만 | 진행자 제안 |
| 분석 결과 | `intent`와 따로 `study_time`(없으면 null)을 받는다. "15강까지 했고 순공 4시간"처럼 섞인 메시지를 함께 처리한다. 순공시간만 보낸 메시지는 LLM 답변 없이 정해진 문구로 답한다 | 진행자 제안 |
| 새벽 0~4시 규칙 | 순공시간에만 쓴다. 학습 기록 날짜는 지금처럼 그날(사용자 시간대) | 설계 C2 |
| 기록 뒤 화면 | 응답의 `logged`가 true면 `emitPlanChanged()`. 오늘의 분량 시트가 이미 구독하고 있다 | 진행자 제안 |
| 실제 호출 확인 | 카카오 로그인이 되므로 테스트 계정 curl 대신 브라우저에서 사용자가 확인한다(Task 6). DB 함수는 SQL로 확인한다 | 진행자 제안 |

## Global Constraints

- 문서·화면 문구·프롬프트는 한국어, 해요체([coach-tone](../../coach/coach-tone.md)). 재촉·비교 문구 금지.
- 과목 값은 `korean`, `english`, `public_health`, `health_admin`. 단위는 `day`·`chapter`·`session`.
- 표기(Frontend `libs/books.ts`와 같게): 범위 `Day 3–4`·`3–4챕터`·`12–14회`(같으면 `Day 3`·`3챕터`·`12회`), 진도 `Day 12/60`·`3/20챕터`·`12/30회`, 목표 2회독 이상이면 앞에 `{round}회독 `(분량) / `{current}/{target}회독 `(진도).
- 완료 분량 = `(current_round − 1) × total_units + current_unit`. 진도는 목표 회독 × 총량을 넘지 않는다. 회독을 막 끝내면 그 회독의 `total_units`로 둔다.
- 순공시간: 1~1080분. 잔디 단계 120분 미만 1, 120~239분 2, 240~359분 3, 360분 이상 4. 사용자 시간대로 0~3시 59분에 "오늘"이라고 보낸 순공시간은 전날.
- 날짜 키는 `profiles.timezone` 기준 `YYYY-MM-DD`. `study_logs.study_date`는 항상 명시한다.
- 채팅 보고는 계획을 다시 나누지 않는다(`plan-generator`를 부르지 않는다).
- LLM 모델은 `_shared/openai.ts`의 `MODEL = "gpt-5.6"` 하나로.
- Frontend 의존 방향 `pages → hooks → api → libs`. DESIGN.md 토큰만, 클래스는 전체 이름 매핑. 새 색 토큰은 만들지 않는다.
- ☁️ 단계는 개발 프로젝트(`ishtebcswgyagbbaakpx`)에만. 이미 반영된 마이그레이션은 고치지 않는다. 사용자 UUID와 API 키는 파일·커밋·History에 적지 않는다.
- Task마다 `feature/chat_connect`에 경로 지정 커밋, push 안 함, 커밋에 Claude 표시 줄 없음, History 기록(메인 세션, Task마다 바로 커밋).
- 범위 밖: 일정 기반 분량 조정, 채팅으로 교재 추가, 지난 날짜 학습 기록, 순공시간 화면 입력, 새벽 재분배(C1).

## Review Focus

1. **같은 기록을 두 번 보냄** — 진도와 오늘 분량 상태는 그대로(`study_logs` 줄 중복은 허용) → Task 1 SQL 확인 3
2. **지금 진도보다 앞부분을 보고(복습)** — 진도가 뒤로 가거나 다음 회독으로 뛰지 않는다 → Task 3 `resolvePosition` 테스트
3. **새벽 1시에 "오늘 순공 5시간"** — 전날로 저장. 새벽 4시 정각은 그날 → Task 3 `studyTimeDate` 테스트
4. **"순공 30시간", "1시간 더"로 18시간 넘김** — 저장하지 않고 다시 묻는다 → Task 1 SQL 확인 8, Task 2 테스트
5. **같은 과목에 교재가 여러 권인데 교재명 없이 보고** — 엉뚱한 교재 진도를 올리지 않고 기록만 → Task 2 테스트

## 실행 방식

| Task | 방식 | 이유 |
|---|---|---|
| 1 | Native | ☁️ DB 반영과 SQL 확인 |
| 2~4 | Subagent + 리뷰 | 순수 로직, 지시서의 테스트로 확인된다 |
| 5 | Native | 2~4를 묶고 ☁️ 비밀 값·배포가 있다 |
| 6~7 | Subagent + 리뷰 | 화면 작업 |
| 끝 | 이 계획 범위 리뷰(task-reviewer + code-reviewer, 같은 diff) | |

---

### Task 1: `study_time`, `record_study_time`, `report_progress` (Native, ☁️)

**Files:**
- Create: `Backend/supabase/migrations/<타임스탬프>_study_time_and_report_progress.sql` (`npx supabase migration new study_time_and_report_progress`)
- Modify: `Frontend/src/interfaces/database.ts` (`npm run gen:types`)
- 커밋 안 함: `<스크래치패드>/chat_db_check.sql`

**Interfaces:**
- Produces:
  - 테이블 `public.study_time(user_id uuid, study_date date, minutes integer, created_at, updated_at)`, 기본 키 `(user_id, study_date)`, `minutes between 1 and 1080`, RLS `own rows`(`user_id = auth.uid()`)
  - `public.record_study_time(p_date date, p_minutes integer, p_add boolean) returns integer` — 저장된 그날 합계
  - `public.report_progress(p_book_id uuid, p_round integer, p_end_unit integer, p_date date) returns void`
  - 두 함수 모두 `security invoker`, `set search_path = ''`, `authenticated`에만 실행 권한, 한국어 `comment on function`. 로그인 없으면 42501(`로그인한 사용자만 계획을 바꿀 수 있어요.`)

- [ ] **Step 1: 확인 SQL 쓰기** — 묶음 B의 `set_task_done_check.sql`과 같은 틀(`begin; … rollback;`, `set local role authenticated`, `request.jwt.claims`, 경우마다 `do $$ … assert … $$`, 마지막 `select 'ok';`). 사용자 UUID는 묶음 B와 같다(대화에서 받은 값). 교재: 총 60, 목표 2회독, 진도 1회독째 50. 같은 날짜 D에 분량 A: 1회독 51–55, B: 1회독 56–60.

| # | 부르기 | 기대 |
|---|---|---|
| 1 | `report_progress(book, 1, 53, D)` | 진도 1/53, A `partial`, B `pending` |
| 2 | 이어서 `report_progress(book, 1, 58, D)` | 진도 1/58, A `done`, B `partial` |
| 3 | 이어서 같은 호출 한 번 더 | 진도·상태 그대로 |
| 4 | 이어서 `report_progress(book, 1, 40, D)` | 진도 1/58 그대로(뒤로 가지 않음) |
| 5 | 이어서 `report_progress(book, 2, 5, D)` | 진도 2/5, A·B `done` |
| 6 | `report_progress(book, 3, 1, D)` · `(book, 1, 61, D)` | 둘 다 SQLSTATE `22023` |
| 7 | `record_study_time(D, 200, false)` → `(D, 40, true)` → `(D, 100, false)` | 반환 200 → 240 → 100, 줄 하나 |
| 8 | `record_study_time(D, 0, false)` · `(D, 1081, false)` · 1000분 저장 뒤 `(D, 100, true)` | 셋 다 `22023`, 합계 1000 그대로 |
| 9 | 다른 사용자 교재 id로 `report_progress` (묶음 B처럼 롤백 안에서 가짜 사용자) | `P0002`, 남의 진도 그대로 |

- [ ] **Step 2: 실패 확인** — Run: `cd Backend; npx supabase db query --linked -f <스크래치패드>/chat_db_check.sql` → FAIL `function public.report_progress(...) does not exist`

- [ ] **Step 3: 마이그레이션 쓰기**

`report_progress`:
1. 42501 확인, `pg_advisory_xact_lock(hashtextextended('replace_daily_tasks:' || uid, 0))`(체크·재분배와 같은 키).
2. 교재를 `for update`로 읽는다(RLS). 없으면 P0002(`이 교재를 찾지 못했어요.`). `p_round`가 1~`target_rounds`, `p_end_unit`이 1~`total_units`가 아니면 22023(`보고한 범위가 교재 분량을 벗어나요.`).
3. 위치 `P = (p_round − 1) × total + p_end_unit`, 새 완료 `N = least(greatest(C, P), target_rounds × total)`. `N > C`면 `set_task_done`과 같은 식으로 `books`를 고친다.
4. 같은 교재·`task_date = p_date` 분량: `E ≤ N`이고 `pending`·`partial`이면 `done`. `S < N < E`이고 `pending`이면 `partial`(`S`, `E`는 `set_task_done`과 같은 정의). 그 밖은 그대로(해제하지 않는다).

`record_study_time`: 42501 확인. `insert … values (auth.uid(), p_date, p_minutes) on conflict (user_id, study_date) do update set minutes = case when p_add then study_time.minutes + excluded.minutes else excluded.minutes end, updated_at = now() returning minutes`. 넣을 값이나 결과가 1~1080을 벗어나면 22023(`순공시간은 하루 1분부터 18시간까지 적을 수 있어요.`) — check 제약 위반을 22023으로 바꿔 올린다.

- [ ] **Step 4: ☁️ 반영과 통과 확인** — `npx supabase db push --dry-run`(이 파일 하나) → `db push --yes` → Step 2 명령 → `ok`. `get_advisors`(security) 새 경고 없음.

- [ ] **Step 5: 타입과 커밋** — `npm run gen:types`, `cd ../Frontend; npm run build`.

```bash
git add Backend/supabase/migrations/<타임스탬프>_study_time_and_report_progress.sql Frontend/src/interfaces/database.ts
git commit -m "feat: 순공시간 테이블과 채팅 진도 반영 DB 함수"
```

---

### Task 2: 메시지 분석 결과 검증 (Subagent + 리뷰)

**Files:**
- Create: `Backend/supabase/functions/_shared/units.ts`, `Backend/supabase/functions/chat/analysis.ts`, `Backend/supabase/functions/chat/analysis_test.ts`

**Interfaces:**
- Consumes: `_shared/subjects.ts`의 `Subject`, `SUBJECT_LABELS`
- Produces:
  - `_shared/units.ts`: `export type BookUnit = "day" | "chapter" | "session"` (Task 3이 표기 함수를 더한다)
  - `chat/analysis.ts` (OpenAI·Supabase import 금지):
    ```ts
    export const INTENTS = ["study_log", "study_time", "schedule", "book_add", "question", "usage"] as const;
    export type Intent = typeof INTENTS[number];
    export interface BookRef { id: string; subject: Subject; title: string; unit: BookUnit;
      total_units: number; current_round: number; current_unit: number; target_rounds: number }
    export interface StudyEntry { subject: Subject; book_id: string | null; round: number | null;
      start_unit: number | null; end_unit: number | null;
      questions_solved: number | null; questions_wrong: number | null }
    export interface StudyTimeReport { minutes: number; add: boolean; day: "today" | "yesterday" }
    export interface Analysis { intent: Intent; subject: Subject | null; entries: StudyEntry[];
      studyTime: StudyTimeReport | null; studyTimeInvalid: boolean }
    export const ANALYSIS_SCHEMA: Record<string, unknown>; // strict json_schema
    export function parseAnalysis(raw: unknown, books: BookRef[]): Analysis;
    ```

`ANALYSIS_SCHEMA`: strict 규칙(모든 속성 required, `additionalProperties: false`, 비어 있을 수 있는 값은 `[type, "null"]`). 최상위 `intent`(enum `INTENTS`), `subject`, `entries`(`StudyEntry` 배열), `study_time`(`{ minutes, add, day }` 또는 null, `day`는 enum `today`·`yesterday`).

`parseAnalysis` 규칙(LLM 출력을 믿지 않는다):
- `intent`가 `INTENTS`에 없으면 `"question"`. `subject`가 과목 값이 아니면 `null`. 과목이 틀린 entry는 버린다.
- `book_id`가 `books`에 없거나 다른 과목이면 `null`. `null`이고 그 과목 교재가 정확히 1권이면 그 교재.
- 단위 수·문제 수는 정수만(단위 수 1 이상, 문제 수 0 이상), 아니면 `null`. `start_unit > end_unit`이면 바꾼다. 교재가 정해졌고 단위 수가 `total_units`보다 크면 `null`.
- `round`는 교재가 정해졌고 1~`target_rounds`일 때만, 아니면 `null`.
- `questions_wrong > questions_solved`면 `questions_wrong = null`. 단위 수와 문제 수가 모두 `null`인 entry는 버린다.
- `study_time`이 있고 `minutes`가 정수 1~1080이면 `studyTime`(`day`가 enum 밖이면 `"today"`, `add`가 boolean이 아니면 `false`). 있는데 그 밖이면 `studyTime = null`, `studyTimeInvalid = true`.
- `intent`가 `"study_log"`인데 entry가 없으면: `studyTime`이 있으면 `"study_time"`, 없으면 `"question"`. `intent`가 `"study_time"`인데 `study_time`이 null이면 `studyTimeInvalid = true`.

- [ ] **Step 1: 실패하는 테스트** (`jsr:@std/assert`). 교재: `b-admin`(보건행정 기본서, session, 60, 2회독 목표, 1회독째 15), `b-ko1`·`b-ko2`(국어 2권), `b-en`(영어 단어, day, 60).

| 테스트 이름 | 입력 → 기대 |
|---|---|
| 교재가 1권뿐인 과목은 book_id를 채운다 | 보건행정 15–17 → `book_id: "b-admin"` |
| 같은 과목 교재가 여러 권이고 교재를 모르면 book_id는 null | 국어 1–10 → `null` |
| 목록에 없거나 과목이 다른 book_id는 버린다 | 국어 entry에 `b-admin` → `null` |
| 뒤집힌 범위는 바꾸고 틀린 수가 푼 수보다 크면 버린다 | 17–15, 5문제 9틀림 → 15–17, wrong `null` |
| 총량을 넘는 단위 수와 목표 밖 회독은 버린다 | `b-admin` end 70, round 3 → end `null`, round `null` |
| 기록할 내용이 없는 study_log는 question으로 바꾼다 | 단위·문제 모두 null → `["question", 0]` |
| 순공시간만 있는 study_log는 study_time으로 | entries 비고 `{200, false, "today"}` → `"study_time"` |
| 기록과 순공시간을 함께 받는다 | 보건행정 15–17 + `{240, false, "today"}` → entry 1개, `studyTime.minutes` 240 |
| 범위 밖 순공시간은 저장하지 않고 다시 묻게 한다 | `{1800, false, "today"}` → `studyTime: null`, `studyTimeInvalid: true` |
| 알 수 없는 intent와 과목은 기본값으로 | `"chitchat"`, `"math"` → `["question", null, 0]` |

- [ ] **Step 2: 실패 확인** — `cd Backend; npm test` → `analysis.ts` 없음
- [ ] **Step 3: `_shared/units.ts`(타입), `chat/analysis.ts` 구현**
- [ ] **Step 4: 통과 확인** — `npm test` → 25 + 10 passed, `deno.lock`이 생기지 않음
- [ ] **Step 5: 커밋** — `git add Backend/supabase/functions/_shared/units.ts Backend/supabase/functions/chat/analysis.ts Backend/supabase/functions/chat/analysis_test.ts` / `feat: chat 메시지 분석 결과 검증(학습 기록·순공시간)`

---

### Task 3: 회독 판단, 날짜, 표기 (Subagent + 리뷰)

**Files:**
- Create: `Backend/supabase/functions/chat/progress.ts`, `Backend/supabase/functions/chat/progress_test.ts`, `Backend/supabase/functions/_shared/date_test.ts`, `Backend/supabase/functions/_shared/units_test.ts`
- Modify: `Backend/supabase/functions/_shared/date.ts`, `Backend/supabase/functions/_shared/units.ts`

**Interfaces:**
- Consumes: Task 2 `BookRef`, `StudyEntry`, `BookUnit`
- Produces:
  - `chat/progress.ts`: `resolvePosition(book: BookRef, entry: StudyEntry): { round: number; end_unit: number } | null`
  - `_shared/date.ts`: `localHour(date: Date, timeZone: string): number`(0~23), `studyTimeDate(now: Date, timeZone: string, day: "today" | "yesterday"): string`
  - `_shared/units.ts`: `withUnit(unit, value)`, `rangeLabel(unit, start, end)`, `progressLabel(book)`, `taskRangeLabel(targetRounds, round, unit, start, end)`, `formatMinutes(minutes): string` — 표기는 Global Constraints. `formatMinutes`: `200` → `3시간 20분`, `180` → `3시간`, `40` → `40분`

`resolvePosition`: `entry.book_id`나 `end_unit`이 없으면 `null`. `entry.round`가 있으면 그 회독. 없으면 `end_unit > current_unit` → 지금 회독, `current_unit === total_units`이고 `current_round < target_rounds` → 다음 회독, 그 밖 → `null`.

`studyTimeDate`: `today = toDateKey(now, tz)`. `"yesterday"`면 `today − 1`. `"today"`이고 `localHour < 4`면 `today − 1`, 아니면 `today`.

- [ ] **Step 1: 실패하는 테스트**

```ts
// progress_test.ts — book: session, total 60, target 2, 1회독째 15
Deno.test("지금 진도보다 뒤를 보고하면 지금 회독", () => assertEquals(resolvePosition(book, entry({ end_unit: 17 })), { round: 1, end_unit: 17 }));
Deno.test("지금 진도보다 앞부분은 복습이라 진도를 바꾸지 않는다", () => assertEquals(resolvePosition(book, entry({ end_unit: 10 })), null));
Deno.test("회독을 다 끝냈으면 다음 회독 앞부분", () => assertEquals(resolvePosition({ ...book, current_unit: 60 }, entry({ end_unit: 3 })), { round: 2, end_unit: 3 }));
Deno.test("마지막 회독까지 끝냈으면 진도를 바꾸지 않는다", () => assertEquals(resolvePosition({ ...book, current_round: 2, current_unit: 60 }, entry({ end_unit: 3 })), null));
Deno.test("회독을 말했으면 그 회독", () => assertEquals(resolvePosition(book, entry({ round: 2, end_unit: 3 })), { round: 2, end_unit: 3 }));
Deno.test("교재나 끝 단위가 없으면 null", () => assertEquals(resolvePosition(book, entry({ book_id: null, end_unit: 17 })), null));

// date_test.ts (Asia/Seoul)
Deno.test("한국 0~9시는 UTC 전날이어도 한국 날짜", () => assertEquals(toDateKey(new Date("2026-10-26T15:30:00Z"), "Asia/Seoul"), "2026-10-27"));
Deno.test("새벽 1시의 오늘 순공은 전날", () => assertEquals(studyTimeDate(new Date("2026-11-13T16:00:00Z"), "Asia/Seoul", "today"), "2026-11-13"));
Deno.test("새벽 4시 정각부터는 그날", () => assertEquals(studyTimeDate(new Date("2026-11-13T19:00:00Z"), "Asia/Seoul", "today"), "2026-11-14"));
Deno.test("어제는 하루 전", () => assertEquals(studyTimeDate(new Date("2026-11-14T03:00:00Z"), "Asia/Seoul", "yesterday"), "2026-11-13"));

// units_test.ts
Deno.test("범위 표기", () => assertEquals([rangeLabel("day", 3, 4), rangeLabel("chapter", 3, 3), rangeLabel("session", 12, 14)], ["Day 3–4", "3챕터", "12–14회"]));
Deno.test("진도 표기", () => assertEquals([progressLabel({ unit: "day", total_units: 60, current_unit: 12, current_round: 1, target_rounds: 1 }), progressLabel({ unit: "session", total_units: 60, current_unit: 21, current_round: 1, target_rounds: 3 })], ["Day 12/60", "1/3회독 21/60회"]));
Deno.test("분 표기", () => assertEquals([formatMinutes(200), formatMinutes(180), formatMinutes(40)], ["3시간 20분", "3시간", "40분"]));
```

- [ ] **Step 2: 실패 확인** — `npm test` → 모듈·함수 없음
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과 확인** — `npm test` 모두 passed
- [ ] **Step 5: 커밋** — 위 Files 경로 / `feat: 채팅 보고의 회독 판단, 순공 날짜, 단위 표기`

---

### Task 4: 코치 컨텍스트와 답변 문구 (Subagent + 리뷰)

**Files:**
- Create: `Backend/supabase/functions/_shared/coach.ts`, `Backend/supabase/functions/chat/context.ts`, `Backend/supabase/functions/chat/context_test.ts`, `Backend/supabase/functions/chat/reply.ts`, `Backend/supabase/functions/chat/reply_test.ts`

**Interfaces:**
- Consumes: `Subject`, `SUBJECT_LABELS`, `diffDays`, `completedUnits`(`_shared/plan.ts`), Task 2 `Intent`, Task 3 표기 함수
- Produces:
  - `_shared/coach.ts`: `COACH_TONE_INSTRUCTIONS`, `USAGE_GUIDE`, `BOOK_ADD_PENDING`, `STUDY_TIME_ASK` (string)
  - `chat/context.ts`:
    ```ts
    export type TaskStatus = "pending" | "done" | "partial" | "skipped";
    export interface CoachContext {
      today: string; examDate: string | null;
      books: { subject: Subject; title: string; unit: BookUnit; total_units: number;
        current_round: number; current_unit: number; target_rounds: number }[];
      todayTasks: { subject: Subject; title: string; unit: BookUnit; target_rounds: number; round: number;
        start_unit: number; end_unit: number; status: TaskStatus }[];
      recentLogs: { study_date: string; subject: Subject; title: string | null; unit: BookUnit | null;
        start_unit: number | null; end_unit: number | null;
        questions_solved: number | null; questions_wrong: number | null }[]; // 최근 7일
      mockExams: { name: string; taken_on: string; scores: Partial<Record<Subject, number>> }[]; // 최근 3회
    }
    export function subjectPercents(books: CoachContext["books"]): Partial<Record<Subject, number>>;
    export function formatCoachContext(ctx: CoachContext): string;
    ```
  - `chat/reply.ts`: `export interface RecordedLog { subject: Subject; title: string | null }`, `replyInstructions(intent: Intent, savedStudyTime: string | null): string`, `fallbackReply(recorded: RecordedLog[], ctx: CoachContext): string`, `studyTimeReply(totalMinutes: number, date: string, today: string): string`

값과 문구:
- `subjectPercents`: 과목별 `round(Σ완료 / Σ(target_rounds × total_units) × 100)`, 교재 없는 과목은 키 없음.
- `formatCoachContext` 줄(이 순서, 없으면 `없음`):
  ```
  오늘: 2026-11-13 (시험까지 106일)          ← 시험일 없으면 "(시험일 미입력)"
  과목별 진도: 국어 45%, 보건행정 13%        ← SUBJECT_LABELS 순
  교재: 보건행정 기본서 1/2회독 15/60회, 영어 단어 Day 12/60
  오늘 분량: 보건행정 기본서 1회독 16–18회(완료), ...   ← 완료/일부/남음/건너뜀
  최근 7일 기록: 11-13 보건행정 기본서 15–17회 기출 20문제 중 5개 틀림, ...
  최근 모의고사: 10월 모의(2026-10-20) 국어 80 영어 65, ...
  ```
- `COACH_TONE_INSTRUCTIONS`: coach-tone.md 요약. 반드시: 해요체, 3~5문장, 제안 1~2개, 이모지 0~1개, 컨텍스트에 있는 수치만 말하고 없으면 묻는다, 합격 가능성 단정·남과 비교·죄책감 금지, 밤샘 권유 금지, 다른 날과 비교해 재촉하지 않는다.
- `USAGE_GUIDE`:
  ```
  이렇게 써 보세요.
  - 공부를 마치면 한 분량을 채팅으로 보내 주세요. 예) 보건행정 기본서 15~17강, 기출 20문제 중 5개 틀림
  - 오늘 순공시간도 알려 주세요. 예) 오늘 순공 3시간 20분
  - 오늘의 분량은 입력창 위 버튼을 눌러 체크할 수 있어요.
  - 공부법이나 성적 고민도 편하게 물어보세요.
  - 교재와 시험일은 메뉴의 '공부 설정 변경'에서 바꿀 수 있어요.
  ```
- `BOOK_ADD_PENDING`: `교재 추가는 지금은 메뉴의 '공부 설정 변경'에서 할 수 있어요. 과목, 교재명, 단위와 총량을 넣으면 시험일까지 분량을 다시 나눠 드려요.`
- `STUDY_TIME_ASK`: `순공시간을 다시 알려 주세요. 하루 1분부터 18시간까지 적을 수 있어요. 예) 오늘 순공 3시간 20분`
- `studyTimeReply`: 날짜가 오늘이면 `오늘 순공 {formatMinutes}으로 적어 뒀어요. 오늘도 수고 많으셨어요.`, 아니면 `{M월 D일} 순공 {formatMinutes}으로 적어 뒀어요. 수고 많으셨어요.`
- `replyInstructions(intent, savedStudyTime)` = `COACH_TONE_INSTRUCTIONS` + intent별 한 문단 + (`savedStudyTime`이 있으면) `이번 메시지의 순공시간 {savedStudyTime}을 적어 뒀다고 한 문장으로 알려 준다. 다른 날과 비교하지 않는다.`
  - `study_log`: 방금 저장한 기록을 확인하고, 그 과목 진도율과 과목 간 균형을 한 번 짚는다. 계획을 다시 나눴다고 말하지 않는다.
  - `schedule`: 분량 조정은 아직 할 수 없으니 오늘 분량 중 먼저 할 것만 제안하고, 조정했다고 말하지 않는다.
  - `question`: 과목과 고민을 짚고 컨텍스트의 기록·점수를 근거로 공부법 1~2개와 멘탈 케어를 함께 준다.
- `fallbackReply`: 기록이 있으면 `기록했어요. ` + 기록한 과목마다 `{과목} 진도 {n}%`를 `, `로 이은 것 + `. 오늘도 수고했어요.`, 없으면 `지금은 답변을 만들지 못했어요. 잠시 후 다시 보내주세요.`

- [ ] **Step 1: 실패하는 테스트** — `context_test.ts`: 진도율(교재 합계, 회독 포함), 위 예시의 `오늘:`·`과목별 진도:`·`교재:`·`오늘 분량:` 줄, 데이터가 없을 때 `(시험일 미입력)`·`최근 7일 기록: 없음`·`최근 모의고사: 없음`. `reply_test.ts`: `fallbackReply` 두 경우(문구 그대로), `studyTimeReply` 오늘·다른 날, `replyInstructions("schedule", null)`에 `조정했다고 말하지 않는다`, `replyInstructions("study_log", "4시간")`에 `순공시간 4시간`.
- [ ] **Step 2: 실패 확인** — `npm test` → 모듈 없음
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과 확인** — `npm test` 모두 passed
- [ ] **Step 5: 커밋** — 위 Files 경로 / `feat: 코치 컨텍스트와 답변 문구(순공시간 포함)`

---

### Task 5: `chat` Edge Function 연결과 배포 (Native, ☁️)

**Files:**
- Create: `Backend/supabase/functions/chat/llm.ts`, `Backend/supabase/functions/chat/db.ts`
- Modify: `Backend/supabase/functions/chat/index.ts`(템플릿 전부 교체), `Backend/supabase/functions/chat/deno.json`, `Backend/supabase/functions/_shared/openai.ts`, `Frontend/src/interfaces/chat.ts`, `CLAUDE.md`, `SERVICE_FLOW.md`

**Interfaces:**
- Consumes: Task 1 DB 함수, Task 2~4 전부
- Produces:
  - `_shared/openai.ts`: `export const MODEL = "gpt-5.6"`
  - `chat/llm.ts`(chat에서 OpenAI를 import하는 유일한 파일): `analyzeMessage(content: string, books: BookRef[], today: string): Promise<Analysis>` — `responses.create`에 `text: { format: { type: "json_schema", name: "chat_analysis", strict: true, schema: ANALYSIS_SCHEMA } }`, instructions에 교재 목록(id·과목·제목·`progressLabel`)과 규칙("15~17강"→ start 15·end 17, "Day 12까지"→ end 12, 회독은 말했을 때만, 순공시간은 분으로, "더"·"추가"면 add)을 넣고 `parseAnalysis`로 검증. `generateReply({ content, intent, ctx, history, savedStudyTime }): Promise<string>`
  - `chat/db.ts`(`deno.json` imports에 `"@supabase/supabase-js": "npm:@supabase/supabase-js@^2"`, 타입 import만): `loadProfileAndBooks(sb)`, `insertMessage(sb, userId, role, content, subject)`, `recordStudyLogs(sb, userId, today, messageId, entries, books): RecordedLog[]`(`study_logs` insert는 `study_date: today`, `resolvePosition`이 값을 주면 `rpc("report_progress", { p_book_id, p_round, p_end_unit, p_date: today })`), `saveStudyTime(sb, date, report): number | null`(`rpc("record_study_time")`, SQLSTATE `22023`이면 `null`), `loadCoachContext(sb, today, examDate)`, `loadTodayHistory(sb, today, timezone, limit = 10)`
  - `interfaces/chat.ts` `ChatResponse`에 `logged: boolean`(진도·학습 기록을 저장했으면 true)

처리 순서(`withSupabase({ auth: "user" })`):
1. `content` trim, 비었거나 1000자 초과 → 400 `{ error: "invalid_content" }`.
2. `loadProfileAndBooks` → `now = new Date()`, `today = toDateKey(now, timezone)`.
3. `analyzeMessage` 실패 → 502 `{ error: "analysis_failed" }`. 여기까지는 아무것도 저장하지 않는다.
4. 사용자 메시지 저장(`subject` = 분석 결과).
5. entry가 있으면 `recordStudyLogs`.
6. `studyTime`이 있으면 `saveStudyTime(studyTimeDate(now, timezone, day), …)`. `null`이면 `studyTimeInvalid`로 본다.
7. 답변: `usage` → `USAGE_GUIDE`, `book_add` → `BOOK_ADD_PENDING`, entry가 없고 순공시간만(또는 `studyTimeInvalid`) → `studyTimeReply` / `STUDY_TIME_ASK`, 그 외 → `generateReply`(저장 뒤 `loadCoachContext`, `loadTodayHistory`, 저장한 순공시간 `formatMinutes`). 실패하면 `fallbackReply`. entry도 있는데 순공시간이 `studyTimeInvalid`면 답 끝에 줄을 바꿔 `STUDY_TIME_ASK`를 붙인다.
8. 코치 메시지 저장 → `{ messages: [user, assistant], logged }`. DB 오류는 500 `{ error }`.

- [ ] **Step 1: 구현과 정적 확인** — `npx deno check --no-lock --config supabase/functions/chat/deno.json supabase/functions/chat/index.ts`, `npm test` → 오류 0, 모두 passed
- [ ] **Step 2: ☁️ 비밀 값** — 사용자가 `supabase/functions/.env`에 새 `OPENAI_API_KEY`를 넣었는지 확인(값은 읽지 않는다, `grep -c '^OPENAI_API_KEY=.\+'`) → `npm run secrets:set`
- [ ] **Step 3: ☁️ 배포** — `npx supabase functions deploy chat --project-ref ishtebcswgyagbbaakpx --use-api`
- [ ] **Step 4: 문서** — CLAUDE.md "아직 골격 단계다…" 문단을 지금 상태로("`chat`은 학습 기록·순공시간·질문·사용법을 처리한다. 일정 조정과 채팅 교재 추가는 안내만 한다"), `chat` 설명에 `report_progress`·`record_study_time`. SERVICE_FLOW 5장에 순공시간 보고(설계 C2 규칙 요약), chat 의도별 처리 표에 `study_time` 줄, "구현 전 결정할 것"의 "분량↔시간 환산"에 `예상 소요 시간은 만들지 않기로 함(2026-11-13)`, "기본 메시지 문구" 항목 삭제.
- [ ] **Step 5: 커밋** — `git add Backend/supabase/functions/chat Backend/supabase/functions/_shared/openai.ts Frontend/src/interfaces/chat.ts CLAUDE.md SERVICE_FLOW.md` / `feat: chat 함수 의도 분류·학습 기록·순공시간·코치 답변`

---

### Task 6: 채팅 화면 연결 (Subagent + 리뷰)

**Files:**
- Modify: `Frontend/src/api/chat.ts`, `Frontend/src/hooks/useChat.ts`, `Frontend/src/pages/ChatPage.tsx`, `README.md`

**Interfaces:**
- Consumes: Task 5 `ChatResponse { messages; logged }`, `libs/planEvents.ts`의 `emitPlanChanged`, `api/auth.ts`의 `signOut`
- Produces: `sendChatMessage(content: string): Promise<ChatResponse>`, `useChat(date)` → `{ messages, sending, error, send }`, `send(content: string): Promise<boolean>`

동작:
- 보내면 바로 사용자 말풍선(임시 id `pending-${Date.now()}`)과 `text-muted` 코치 말풍선 `답변을 쓰고 있어요…`를 붙인다.
- 성공: 임시 말풍선을 응답의 두 메시지로 바꾸고, `logged`면 `emitPlanChanged()`.
- 실패: 임시 말풍선을 지우고 `메시지를 보내지 못했어요. 잠시 후 다시 보내주세요.`를 보이고, `send`가 `false`면 `ChatRoom`이 입력창에 내용을 되돌린다.
- 응답이 401이면 `signOut()`(세션 가드가 `/login`으로 보낸다).

- [ ] **Step 1: 구현** — 위대로. `api/chat.ts`에서 `emitPlanChanged`를 부른다(재분배 알림과 같은 자리).
- [ ] **Step 2: 확인** — `cd Frontend; npm run format; npm run build; npm run lint` → 통과
- [ ] **Step 3: 브라우저(사용자, 카카오 로그인)**
  1. "이거 어떻게 써?" → 사용법 안내
  2. "보건행정 기본서 15~17강, 기출 20문제 중 5개 틀림" → 진도율이 들어간 답, 오늘의 분량 버튼 수가 바뀜, 공부 설정 진도 바뀜
  3. "오늘 순공 3시간 20분" → `오늘 순공 3시간 20분으로 적어 뒀어요. 오늘도 수고 많으셨어요.`, "1시간 더 했어" → 4시간 20분
  4. "순공 30시간" → `STUDY_TIME_ASK`
  5. "영어 성적이 안 올라" → 컨텍스트에 없는 점수를 지어내지 않음
  6. 새로고침 → 대화 유지, Offline 전송 → 오류 문구·입력 복원, 로컬 스토리지 `sb-…-auth-token` 지우고 전송 → `/login`
  7. 버튼이 마지막 말풍선을 가리지 않음(묶음 B에서 미룬 확인)
- [ ] **Step 4: README** — 주요 기능 표 "🗣 말로 하는 학습 기록" ✅, "🧑‍🏫 과목별 AI 코치" 🚧 유지
- [ ] **Step 5: 커밋** — `git add Frontend/src/api/chat.ts Frontend/src/hooks/useChat.ts Frontend/src/pages/ChatPage.tsx README.md` / `feat: 채팅 화면을 chat 함수에 연결`

---

### Task 7: 순공시간 공부 잔디 (Subagent + 리뷰)

**Files:**
- Create: `Frontend/src/libs/studyTime.ts`
- Modify: `Frontend/src/api/study.ts`, `Frontend/src/hooks/useDashboard.ts`, `Frontend/src/components/dashboard/StudyHeatmap.tsx`, `Frontend/src/pages/UiCatalogPage.tsx`, `DESIGN.md`

**Interfaces:**
- Consumes: Task 1 `study_time`
- Produces:
  - `api/study.ts`: `fetchStudyTime(from: string, to: string): Promise<{ study_date: string; minutes: number }[]>`
  - `libs/studyTime.ts`: `STUDY_TIME_LEVEL_MINUTES = [120, 240, 360] as const`, `studyTimeLevel(minutes: number): 1 | 2 | 3 | 4`, `formatMinutes(minutes: number): string`(Backend와 같은 표기)
  - `hooks/useDashboard.ts`:
    ```ts
    export type HeatDay =
      | { date: string; kind: "future" }
      | { date: string; kind: "empty" }
      | { date: string; kind: "time"; minutes: number; level: 1 | 2 | 3 | 4 }
      | { date: string; kind: "dot"; percent: number | null } // null = 분량 진행 없이 공부 기록만
    ```

규칙(설계 C2 "공부 잔디"):
- 순공시간이 있으면 `time`. 없으면 진행률(`done` 1, `partial` 0.5, 그날 분량 수로 나눔)이 0보다 크면 `dot`(`percent` = 반올림 %), 진행률 0이어도 `study_logs`가 있으면 `dot`(`percent: null`), 그 밖 `empty`. 오늘 이후는 `future`.
- 연속 공부: `time`·`dot`인 날을 센다. 오늘이 `empty`면 어제부터.
- 칸: `time`은 `bg-heat-{level}`, `dot`·`empty`는 `bg-heat-0`, `dot`은 가운데 `bg-accent` 원(칸의 약 40%).
- `title`·`aria-label`(`formatMonthDay`): `11월 13일 · 순공 3시간 20분` / `11월 13일 · 순공시간 안 적음, 분량 75%` / `11월 13일 · 순공시간 안 적음, 공부 기록 있음` / `11월 13일 · 기록 없음`.
- 범례: `적음 ~ 많음`(heat-0~4) 아래 줄에 점 하나 + `순공시간 안 적은 날`.

- [ ] **Step 1: 구현** — 위대로. `/ui` 잔디 예시에 `time` 네 단계, `dot` 두 종류, `empty`를 넣는다.
- [ ] **Step 2: DESIGN.md** — 잔디 설명·"공부 잔디 단계" 표 제목(`0 = 기록 없음, 1~4 = 순공시간`)·구현 메모의 잔디 단계와 연속 공부 기준을 이 규칙으로.
- [ ] **Step 3: 확인** — `npm run format; npm run build; npm run lint` → 통과. 브라우저 `/ui`와 대시보드(사용자): 점이 360px에서 보이는지, 라이트·다크.
- [ ] **Step 4: 커밋** — 위 Files 경로 / `feat: 공부 잔디를 순공시간으로, 안 적은 날은 점`

---

### 끝

- 이 계획 범위(Task 1 시작 전 커밋 `..HEAD`, `database.ts` 제외)를 task-reviewer와 code-reviewer에게 같은 diff와 Review Focus로 맡긴다. Critical·Important는 고치고 다시 확인한다.
- [채팅 연결 계획](2026-10-27-chat-connection.md) Task 3 위에 "Task 3~7은 [이 계획](2026-11-13-chat-and-study-time.md)으로 대체(2026-11-13)"를 적고, 로드맵 "1 (이어서)" 줄에 이 계획 링크.
- History에 Task별 기록과 리뷰 결과.
