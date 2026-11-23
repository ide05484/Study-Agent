# 채팅 다듬기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 오늘 채팅방을 처음 열면 코치가 오늘 분량 첫 메시지를 남기고, 답을 기다리는 동안 보낸 메시지를 묶어 한 번만 답하고, 오늘의 분량 버튼이 말풍선을 가리지 않고, 공부 마무리 질문에 응/아니 칩이 붙는다. 2.2 Minor 일부도 함께 고친다.

**Architecture:**
- 서버(`chat`)에 요청이 하나 늘어난다(`{ open: true }`). 첫 메시지는 이월(`_shared/replan.ts`) 뒤 정해진 문구로 만들어 DB 함수가 중복 없이 저장한다(GPT 없음).
- 연달아 보낸 글은 사용자 메시지에 "처리함" 표시(`handled_at`)를 두고, 분석은 처리 안 한 메시지를 묶어 받는다. 저장 직전 DB 함수 `claim_user_messages`가 "내 메시지보다 새 메시지가 없을 때만" 묶음을 처리 표시해, 마지막 요청만 답한다.
- 코치 메시지의 `action`을 종류 4개(`book_add`·`wrap_up`·`study_time_ask`·`time_available_ask`)로 넓힌다. 마무리 칩은 교재 확인 칩과 같은 컴포넌트·같은 칩 요청을 쓴다. 직전 코치 질문 종류는 분석 지침에 알려 짧은 답의 뜻을 맞춘다.

**Tech Stack:** Supabase(Postgres + RLS, Edge Functions/Deno), OpenAI Responses API(json_schema strict), React 19 + Tailwind v4, Deno test. Frontend 테스트 도구는 없다.

**Spec:** [채팅 다듬기 설계](../specs/2026-11-23-chat-polish-design.md)

## 이 계획에서 정한 것 (설계가 만드는 사람에게 맡긴 것)

| 항목 | 결정 |
|---|---|
| "처리함" 칸 | `chat_messages.handled_at timestamptz`. 사용자 메시지만 쓰고, 기존 사용자 메시지는 `created_at`으로 채운다. 코치 메시지는 null |
| 첫 메시지 중복 막기 | DB 함수 `insert_first_message`가 사용자별 advisory lock 안에서 "오늘 메시지 없음"을 확인하고 넣는다. 반환은 새 메시지 id 또는 null |
| 묶음 확인 | DB 함수 `claim_user_messages(p_message_id, p_from, p_to) returns boolean`. 사용자별 advisory lock 안에서 (a) `p_message_id`보다 새(`created_at, id` 순) 처리 안 한 사용자 메시지가 있으면 false, (b) 없으면 `p_message_id` 이하의 처리 안 한 사용자 메시지를 모두 처리 표시하고 true |
| 묶음 길이 상한 | 분석에 넣는 처리 안 한 메시지는 최근 10개, 글자 합 4000자 이하(뒤에서부터 채운다). 넘어서 빠진 앞 메시지도 claim이 처리 표시한다 |
| 분석 입력 모양 | 메시지가 하나면 지금처럼 그 글. 둘 이상이면 시간순 `1. 글\n2. 글`로 번호를 붙이고, 지침에 "뒤 메시지가 앞 메시지를 고치거나 덧붙인다. 고친 값만 남긴다"를 넣는다 |
| 사용자 메시지 `subject` | 저장 시점엔 모른다. claim 성공 뒤 분석 결과로 한 번 더 고친다(`setMessageSubject`) |
| 받아 둔 초안과 질문 종류의 출처 | 글 요청: 오늘의 **마지막 코치 메시지**의 `action`. 칩 요청·확답 글: 오늘의 **마지막 메시지**(사용자·코치 무관)가 그 확인 메시지일 때만 |
| H(다른 교재 말하기) | `mergeDraft`에서 새 `title`이 받아 둔 `title`과 다르고, 같은 patch에 `subject`·`unit`·`total_units` 중 하나라도 있으면(= 새 교재를 통째로 말함) 받아 둔 초안을 비우고 시작한다. 제목만 바꾸는 말은 제목 고치기로 본다(설계의 "제목이 바뀌면 새로 시작"을 편집 단계에서 다른 항목까지 날리지 않게 좁힌 것) |
| I(순공시간 오류와 초안) | `book_add`가 아닌 의도라도 받아 둔 초안이 있고 순공시간이 틀려 다시 묻는 답이면, 그 코치 메시지에 받아 둔 초안(`action`)을 그대로 붙인다. 초안은 다음 글로 이어진다 |
| 열기 요청의 이월 조건 | 화면 `useCarryOver`와 같다: 시험일이 있고, 시험 전날(`examDate - 1일`)이 오늘 이후이고, 오늘 이전 `daily_tasks`에 `pending`이 있을 때 `replan`. 성공하면 `planChanged`, 실패하면 `replanFailed`(첫 메시지는 지금 계획으로 저장) |
| 첫 메시지 문구 | 정확한 문장은 아래 Task 4 표. 조사가 받침에 따라 달라지는 곳(`D-2이에요`/`D-2예요` 문제)을 피해 조사가 필요 없는 문장으로 쓴다 |
| 응원 문장 | 7개를 `diffDays("2000-01-01", today) % 7`로 돌려 쓴다. 문장은 만드는 사람이 코치 톤으로 쓴다 |
| 마무리 판정 | 분석 스키마 `wrap_up: boolean`(required). 코치가 붙이는 칸이다. 의도가 `book_add`·`usage`이거나, 순공시간을 다시 묻는 답이거나, 날 상한 답이면 붙이지 않는다 |
| 칩 컴포넌트 | `ConfirmChips`는 그대로 쓰고 버튼 두 개를 배열로 그린다. 칩을 보일지는 `libs/chatAction.ts`의 `showsConfirmChips`가 판단한다 |
| 버튼 줄 높이 | 오늘의 분량 버튼 줄은 불러오는 동안에도 높이를 비워 둔다(`min-h-[3.25rem]`, 버튼 44px + 아래 여백 8px) |
| 임시 말풍선 | 보낸 글마다 `pending-<순번>`, 답변 대기 말풍선은 `pending-reply` 하나. 보낼 때마다 대기 말풍선을 맨 끝으로 옮긴다 |

## Global Constraints

- 문구는 한국어 해요체([coach-tone](../../coach/coach-tone.md)). 채팅 답변은 2~3문단, 문단 사이 빈 줄, 목록 기호·제목 없음. 정해진 문구의 원본은 Task 4 표와 `bookDraft.ts`다.
- 메시지당 GPT 호출은 분석 1번 + 답변 1번까지. 열기 요청·칩·확답 글은 GPT를 부르지 않는다. 밀려난 요청은 답변 호출을 하지 않는다. `reasoning: low`, 출력 상한(분석 1500·답변 2000), 재시도 없음 유지.
- "오늘"은 `chat`의 `toDateKey(now, timezone)`와 같다. 새벽 0~4시 규칙(`studyTimeDate`)은 순공시간 저장 날짜에만 쓴다.
- 칩·확답 글은 하루 메시지 상한(100개)을 확인하지 않는다. 열기 요청도 상한을 쓰지 않는다. 칩·상한 답 메시지는 사용자 메시지를 `handled_at`을 채워 넣는다.
- 첫 메시지와 마무리 칩의 정해진 문구는 GPT를 거치지 않는다. 첫 메시지에 `time_available_ask` 질문 답은 저장하지 않는다(순공시간으로도, 공부 기록으로도).
- `plan-generator` 동작·응답, 이미 배포된 마이그레이션 파일은 바뀌지 않는다.
- Frontend 의존 방향 `pages → hooks → api → libs`. DESIGN.md 토큰만 쓰고 새 색 토큰은 없다. 터치 영역 44px 이상.
- ☁️ 단계(`db push`, `gen:types`, `functions deploy`)는 개발 프로젝트에만, 실행 전에 사용자 승인. 사용자 UUID·키는 파일·커밋·History에 적지 않는다.
- Task마다 `fix/chat`에 경로를 지정해 커밋한다. push는 사용자가 요청할 때만. 커밋에 Claude 표시 줄을 넣지 않는다. History는 메인 세션이 [2026-11-23-채팅-다듬기.md](../../../History/2026-11-23-채팅-다듬기.md)에 Task별로 쌓는다.
- 범위 밖: 새벽 재분배 배치와 아침 알림, 답변 속도(C), 지난 날짜 학습 기록(F), 채팅 점수 입력(G), 마무리 외의 새 칩, 이미 저장된 진도를 뒤 메시지로 되돌리기.

## Review Focus

1. **탭 두 개·열기와 첫 글이 거의 동시** — 첫 메시지는 하루에 하나이고, 이미 대화가 있으면 열기는 아무것도 하지 않는다 → Task 6(DB 함수) + Task 11 채팅 확인 1
2. **"국어 2챕터" → 곧바로 "아, 3개" / "영어도 2챕터"** — 답은 한 번이고 진도가 2+3으로 저장되지 않는다 → Task 5 분석 지침 테스트 + Task 11 채팅 확인 2
3. **"6시간 정도 할 수 있어"(가용 시간 질문 뒤)** — 순공시간으로 저장되지 않는다 → Task 5 지침 테스트
4. **마무리 칩 "응"**: 순공시간 없음 → 되묻기, 있음 → 마무리 인사, 이미 끝난 확인(다른 탭에서 누름)에 다시 응 → 끝난 확인 문구 → Task 4 문구 테스트 + Task 8
5. **시험일 없음·지남·당일, 분량 없음의 첫 메시지** — 500이 아니고 질문(`action`)이 알맞게 붙거나 빠진다 → Task 4 `welcomeText` 테스트

## 실행 방식

| Task | 방식 | 이유 |
|---|---|---|
| 1 | Native | ☁️ DB 반영과 타입 생성 |
| 2~5 | Subagent + 리뷰 | 순수 로직, 테스트로 확인 |
| 6~8 | Subagent + 리뷰 | `chat` 흐름(`index.ts`·`db.ts`), 같은 파일을 차례로 고친다 |
| 9~10 | Subagent + 리뷰 | 화면 작업 |
| 11 | Native | ☁️ 배포, 실제 채팅 확인, 문서 |
| 끝 | 계획 범위 리뷰(task-reviewer + code-reviewer, 같은 diff), 로드맵·README 정리 | |

---

### Task 1: `handled_at` 칸과 DB 함수 두 개 (Native, ☁️)

**Files:**
- Create: `Backend/supabase/migrations/<타임스탬프>_chat_polish.sql` (`npx supabase migration new chat_polish`)
- Modify: `Frontend/src/interfaces/database.ts` (`npm run gen:types`)

**Interfaces:**
- Produces:
  - `public.chat_messages.handled_at timestamptz null`(한국어 `comment on column`: "사용자 메시지를 분석·답변에 반영했으면 시각. 묶어 처리하려고 처리 안 한 메시지를 가려낸다"), 기존 `role = 'user'` 행은 `handled_at = created_at`.
  - `public.claim_user_messages(p_message_id uuid, p_from timestamptz, p_to timestamptz) returns boolean`: 위 "이 계획에서 정한 것"의 규칙. `security invoker`, 사용자별 advisory lock(`'claim_user_messages:' || auth.uid()`), 자기 행이 아니거나 없으면 false.
  - `public.insert_first_message(p_from timestamptz, p_to timestamptz, p_content text, p_action jsonb) returns uuid`: 사용자별 advisory lock 안에서 `[p_from, p_to)`에 메시지(사용자·코치 무관)가 하나라도 있으면 null, 없으면 `role = 'assistant'` 메시지를 `created_at = clock_timestamp()`로 넣고 id 반환.

- [ ] **Step 1: 마이그레이션 작성** — 위 칸과 함수 둘. 권한 처리(`revoke`/`grant`)는 `20261113014124_replace_daily_tasks_skip_done_today.sql`을 그대로 따른다. 함수 위에 한국어 주석으로 규칙과 락 이유를 적는다.
- [ ] **Step 2: ☁️ 반영** (사용자 승인 후) — `cd Backend; npx supabase db push --dry-run`(이 파일 하나) → `npx supabase db push --yes`.
- [ ] **Step 3: 확인** — `npx supabase db query --linked`로 다음을 본다. ① `handled_at` 칸이 `timestamp with time zone`. ② `select count(*) from chat_messages where role = 'user' and handled_at is null` → 0. ③ 함수 두 개가 `information_schema.routines`에 있음. `get_advisors`(security) 새 경고 없음.
- [ ] **Step 4: 타입과 확인** — `npm run gen:types` 뒤 `chat_messages.Row`에 `handled_at: string | null`, `Functions`에 두 함수. `cd ../Frontend; npm run build` 통과.
- [ ] **Step 5: 커밋** — `feat: 채팅 메시지 처리 표시와 첫 메시지·묶음 확인 DB 함수`

---

### Task 2: `action`·요청 파싱 분리와 단위·날짜 정리 (Subagent + 리뷰)

동작은 바뀌지 않는 정리다. 이 Task 뒤에도 `npm test`는 전부 통과해야 한다.

**Files:**
- Create: `Backend/supabase/functions/chat/actions.ts`, `Backend/supabase/functions/chat/actions_test.ts`, `Backend/supabase/functions/chat/request.ts`, `Backend/supabase/functions/chat/request_test.ts`
- Modify: `chat/bookDraft.ts`(+ `_test`), `chat/db.ts`, `chat/index.ts`, `chat/reply.ts`(+ `_test`), `_shared/units.ts`(+ `_test`), `_shared/date.ts`(+ `_test`)

**Interfaces:**
- Produces:
  - `_shared/units.ts`: `export const BOOK_UNITS: readonly BookUnit[] = ["day", "chapter", "session"]`. `bookDraft.ts`의 `UNITS`를 이것으로 바꾼다(Minor 9).
  - `_shared/date.ts`: `export function monthDayLabel(date: string): string`(reply.ts의 것을 옮김), `export function dayLabel(date: string, today: string): string` — `date === today`이면 `"오늘"`, 아니면 `monthDayLabel`(Minor 20). reply.ts의 세 곳(`savedStudyTimeLabel`, `fallbackReply`, `studyTimeReply`)이 이것을 쓴다.
  - `chat/actions.ts`:
    - `export interface WrapUpAction { kind: "wrap_up"; step: "confirm" }`
    - `export interface StudyTimeAskAction { kind: "study_time_ask" }`
    - `export interface TimeAvailableAskAction { kind: "time_available_ask" }`
    - `export type ChatAction = BookAddAction | WrapUpAction | StudyTimeAskAction | TimeAvailableAskAction`(`BookAddAction`은 `bookDraft.ts`에서 가져온다)
    - `export function parseAction(v: unknown): ChatAction | null` — `kind`로 나눈다. `book_add`는 `bookDraft.ts`의 `parseBookAddAction`(기존 `parseAction`의 새 이름), `wrap_up`은 `step === "confirm"`일 때만, 나머지 둘은 `kind`만 맞으면 통과. 모르는 kind·모양 틀림은 null.
    - `export type ConfirmAction = BookAddAction & { step: "confirm" } | WrapUpAction`
    - `export function isConfirmAction(a: ChatAction | null): a is ConfirmAction`
  - `chat/request.ts`:
    - `export type ChatRequest = { content: string } | { choice: { message_id: string; answer: "yes" | "no" } } | { open: true }`
    - `export function parseChatRequest(body: unknown, maxLength: number): ChatRequest | null` — 기존 규칙 그대로 + `{ open: true }`만 있는 객체(다른 키 없음)를 통과. 둘 이상의 종류가 섞이면 null.
  - `bookDraft.ts`는 `ChatAction`·`ChatRequest`·`parseChatRequest`를 더 이상 내보내지 않는다.

- [ ] **Step 1: 실패하는 테스트** — `actions_test.ts`: `parseAction`이 `book_add`(기존 케이스 이동)·`wrap_up confirm`·`study_time_ask`·`time_available_ask`를 통과시키고, `wrap_up` + `step: "ask"`·`kind: "x"`·배열·null은 null. `isConfirmAction`은 `book_add confirm`·`wrap_up`에 true, `book_add ask`·`study_time_ask`·null에 false. `request_test.ts`: 기존 `parseChatRequest` 테스트를 옮기고 `{ open: true }` → 통과, `{ open: false }`·`{ open: true, content: "a" }`·`{ open: true, choice: {...} }` → null을 더한다. `units_test.ts`: `BOOK_UNITS`가 `["day","chapter","session"]`. `date_test.ts`: `dayLabel("2026-11-23","2026-11-23") === "오늘"`, `dayLabel("2026-11-13","2026-11-23") === "11월 13일"`.
- [ ] **Step 2: 실패 확인** — `cd Backend; npm test` → FAIL(없는 export).
- [ ] **Step 3: 구현** — 위 인터페이스대로. `bookDraft.ts`에서 옮긴 것은 테스트도 같은 이름으로 옮긴다. `index.ts`의 도달하지 않는 `throw new Error("unreachable request")`(Minor 10)는 `content` 요청을 따로 처리하는 구조로 바꿔 없앤다. `db.ts`의 `parseAction`·`ChatAction` import, `index.ts`의 import를 새 파일로 고친다. `index.ts`는 `open` 요청이 오면 지금은 `invalid_content`(400)와 같게 거절한다(Task 6이 처리를 붙인다).
- [ ] **Step 4: 통과 확인** — `npm test` 전부 통과, `deno check supabase/functions/chat/index.ts`.
- [ ] **Step 5: 커밋** — `refactor: chat action·요청 파싱 분리, 단위 목록과 날짜 표기 합치기`

---

### Task 3: 교재 초안 보완 — H, 시험일 지남 문구, 테스트 (Subagent + 리뷰)

**Files:**
- Modify: `Backend/supabase/functions/chat/bookDraft.ts`, `Backend/supabase/functions/chat/bookDraft_test.ts`

**Interfaces:**
- Consumes: Task 2의 `BOOK_UNITS`.
- Produces:
  - `mergeDraft(base, patch)`: 위 "H" 규칙을 따른다. 시그니처는 그대로.
  - `SaveOutcome`에 `| { kind: "exam_passed" }`를 더한다. `savedText`는 이 경우 첫 문단 뒤에 `시험일이 이미 지나서 분량은 나누지 않았어요. 시험일을 바꾸면 나눠 드려요. 메뉴의 '공부 설정 변경'에서 바꿀 수 있어요.`를 붙인다(기존 `no_exam` 문구는 그대로).
  - `isDuplicateTitle`의 중복 `trim`을 정리한다(Minor 12). 동작은 같다.

- [ ] **Step 1: 실패하는 테스트** — `mergeDraft`: ① base `{국어, "기출", session, 20, 3회독}` + patch `{영어, "단어장", day, 60, null}` → `{영어, "단어장", day, 60, 1}`(초안을 비우고 시작, 회독은 patch가 null이면 기본 1). ② base 같은 초안 + patch `{null, "기출 모의", null, null, null}`(제목만) → 나머지는 유지하고 제목만 바뀜. ③ base + patch `{null, null, null, null, 4}` → 회독만 4. `savedText`: `{ kind: "exam_passed" }` 문구에 "이미 지나서"가 들어가고 `no_exam` 문구와 다르다. 끝난 확인(Minor 16): `CHOICE_EXPIRED_TEXT`가 `"이 확인은 끝났어요. 추가할 교재를 다시 말해 주세요."`와 같다. 경계값(Minor 17): `completeDraft`가 `total_units` 1·1000, `target_rounds` 1·10에서 통과하고 0·1001·0·11은 null이다(회독은 11이면 1로 보는 기존 규칙에 맞춰 11 → 1회독 초안으로 통과임을 단언한다).
- [ ] **Step 2: 실패 확인** — `npm test` → FAIL.
- [ ] **Step 3: 구현** — `mergeDraft`의 새 규칙, `SaveOutcome`·`savedText` 갈래, trim 정리.
- [ ] **Step 4: 통과 확인** — `npm test` 전부 통과. 테스트 이름이 긴 것은 손대는 김에만 줄인다(Minor 19).
- [ ] **Step 5: 커밋** — `fix: 교재 추가 초안 보완(다른 교재 말하기, 시험일 지남 문구)과 테스트`

---

### Task 4: 첫 메시지와 마무리 문구 순수 모듈 (Subagent + 리뷰)

**Files:**
- Create: `Backend/supabase/functions/chat/welcome.ts`, `chat/welcome_test.ts`, `chat/wrapUp.ts`, `chat/wrapUp_test.ts`
- Modify: `Backend/supabase/functions/chat/context.ts`(`CoachContext["todayTasks"]`의 원소 타입을 `export interface TodayTaskLine`으로 꺼내 `CoachContext`가 그것을 쓰게 한다. 모양은 그대로)

**Interfaces:**
- Consumes: `taskRangeLabel`, `formatMinutes`(`_shared/units.ts`), `diffDays`(`_shared/date.ts`), `ChatAction` 종류(`chat/actions.ts`), `Intent`(`chat/analysis.ts`, 타입만), `CoachContext["todayTasks"]` 원소 타입(`chat/context.ts`, 타입만. 이름은 파일에서 확인해 `TodayTaskLine`으로 export해서 쓴다)
- Produces:
  - `welcome.ts`
    - `export const CHEERS: readonly string[]` — 7개
    - `export const MAX_LISTED_TASKS = 4`
    - `export interface WelcomeInput { today: string; examDate: string | null; tasks: TodayTaskLine[] }`
    - `export function welcomeText(i: WelcomeInput): { text: string; action: TimeAvailableAskAction | null }`
    - `export const TIME_AVAILABLE_QUESTION = "오늘 공부할 수 있는 시간이 얼마나 되나요?"`
  - `wrapUp.ts`
    - `export const WRAP_UP_QUESTION = "오늘은 여기서 마무리할까요?"`, `export const WRAP_UP_NO_TEXT = "좋아요, 조금만 더 해 봐요. 화이팅!"`
    - `export const WRAP_UP_ACTION: WrapUpAction`
    - `export function appendWrapUp(text: string): string` — `${text}\n\n${WRAP_UP_QUESTION}`
    - `export function shouldAskWrapUp(p: { wrapUp: boolean; intent: Intent; studyTimeAsk: boolean }): boolean` — `wrapUp`이 참이고 `intent`가 `book_add`·`usage`가 아니고 `studyTimeAsk`(순공시간을 다시 묻는 답)가 아닐 때만 true
    - `export function wrapUpYesText(p: { minutes: number | null; done: number; total: number }): { text: string; action: StudyTimeAskAction | null }`

`welcomeText` 문구(원본, `{n}`은 `diffDays(today, examDate)`, 분량 한 줄은 `{교재명} {taskRangeLabel(...)}`을 `, `로 이음. 조사가 받침으로 갈리는 말 뒤에는 쓰지 않는다):

| 상황 | 문구 |
|---|---|
| 시험일 없음 | `시험일을 정하면 오늘 분량을 나눠 드려요. 메뉴의 '공부 설정 변경'에서 정할 수 있어요.` + 빈 줄 + 응원 한 줄. `action` null |
| 시험일 지남(`n < 0`) | 시험을 마친 수험생에게 하는 수고의 인사 한두 문장. `action` null (정확한 문장은 만드는 사람이 코치 톤으로) |
| 시험 당일(`n === 0`) | 시험 당일 응원 한두 문장. `action` null |
| 분량 없음(`n > 0`) | `시험까지 {n}일 남았어요. 오늘은 배정된 분량이 없어요.` + 빈 줄 + 쉬어도 된다는 짧은 말. `action` null |
| 분량 있음(`n > 0`) | `시험까지 {n}일 남았어요. 오늘 분량이에요: {분량 한 줄}.` + 빈 줄 + 응원 한 줄 + 빈 줄 + `TIME_AVAILABLE_QUESTION`. `action`은 `{ kind: "time_available_ask" }`. 분량이 5개 이상이면 앞 4개 + ` 외 {k}개` |

`wrapUpYesText`: `minutes`가 숫자면 `오늘 순공 {formatMinutes(minutes)}` + (`total > 0`이면 `, 분량 {total}개 중 {done}개 끝냈어요`) + `. 푹 쉬고 내일 봐요.`, `action` null. `minutes`가 null이면 `오늘도 수고했어요.\n\n오늘 순공시간은 얼마나 됐나요?`, `action`은 `{ kind: "study_time_ask" }`.

- [ ] **Step 1: 실패하는 테스트** — `welcome_test.ts`: ① 분량 3개 → 첫 문단에 `시험까지 213일 남았어요.`와 세 교재 한 줄이 들어가고 `action`은 `{ kind: "time_available_ask" }`, 마지막 문단은 `TIME_AVAILABLE_QUESTION`. ② 분량 5개 → 앞 4개와 ` 외 1개`. ③ 목표 2회독 이상 교재는 `2회독 3–4챕터` 모양(`taskRangeLabel`). ④ 시험일 없음 → 정해진 문구로 시작하고 `action` null, 질문 없음. ⑤ 시험일 지남·당일·분량 없음은 각각 `action` null이고 질문이 없다. ⑥ 같은 입력은 같은 출력(응원 문장이 날짜로만 정해짐), `CHEERS.length === 7`, 서로 다른 날에 응원이 돌아간다(`today`가 7일 차이면 같고 1일 차이면 다르다). `wrapUp_test.ts`: ① `shouldAskWrapUp` 진리표(`wrapUp` false → false, `book_add`·`usage` → false, `studyTimeAsk` true → false, `study_log`·`question`·`study_time`·`schedule` + `wrapUp` true → true). ② `appendWrapUp("a")` → `"a\n\n오늘은 여기서 마무리할까요?"`. ③ `wrapUpYesText`: 순공 240분 · 3개 중 3개 → 정확히 `오늘 순공 4시간, 분량 3개 중 3개 끝냈어요. 푹 쉬고 내일 봐요.`, 분량 0개 → `오늘 순공 4시간. 푹 쉬고 내일 봐요.`, `minutes` null → `study_time_ask` action과 되묻기 문구.
- [ ] **Step 2: 실패 확인** — `cd Backend; npm test` → FAIL(모듈 없음)
- [ ] **Step 3: 구현** — `welcome.ts`·`wrapUp.ts`. 파일 맨 위 주석: "OpenAI·Supabase를 import하지 않는 순수 모듈". 응원 문장 7개는 coach-tone.md 말투로 쓴다(첫 문장은 `하나씩 끝내고 알려 주세요. 오늘도 같이 가요!`). 인덱스는 `diffDays("2000-01-01", today) % 7`.
- [ ] **Step 4: 통과 확인** — `npm test` 전부 통과.
- [ ] **Step 5: 커밋** — `feat: 하루 첫 메시지와 공부 마무리 문구 모듈`

---

### Task 5: 분석 — 마무리 판정, 묶음 입력, 직전 질문 (Subagent + 리뷰)

**Files:**
- Modify: `Backend/supabase/functions/chat/analysis.ts`(+ `_test`), `chat/llm.ts`, `chat/reply.ts`(+ `_test`)
- Test: `chat/analysis_test.ts`, `chat/llm_test.ts`(새 파일, 지침 문자열 검증), `chat/reply_test.ts`

**Interfaces:**
- Consumes: Task 2의 `ChatAction` 종류
- Produces:
  - `analysis.ts`: `Analysis`에 `wrapUp: boolean`을 더한다. `ANALYSIS_SCHEMA`에 `wrap_up: { type: "boolean" }`을 required로 더한다. `parseAnalysis`는 `wrap_up === true`일 때만 `wrapUp: true`(그 밖은 false).
  - `llm.ts`:
    - `export type AskedAbout = "study_time" | "time_available" | null`
    - `export function analysisInstructions(books: BookRef[], today: string, pending: BookDraft | null, asked: AskedAbout, bundled: boolean): string` — 지금 비공개 함수를 export하고 인자를 더한다.
    - `export function bundleInput(contents: string[]): string` — 하나면 그 글 그대로, 둘 이상이면 `1. 글\n2. 글`. 합이 4000자를 넘지 않게 뒤에서부터 채우고 최근 10개까지만 쓴다.
    - `analyzeMessage(contents: string[], books, today, pending, asked: AskedAbout): Promise<Analysis>` — 입력은 `bundleInput(contents)`.
  - `reply.ts`: `ReplyOptions`에 `closingQuestion: boolean`을 더한다. 참이면 `replyInstructions`가 "이번 답은 질문으로 끝내지 않는다. 마무리 질문은 따로 붙는다."를 더한다.

지침에 더할 문장(요지, 문장은 만드는 사람이 다듬는다):
- `wrap_up`: 수험생이 오늘 공부를 마치려는 말일 때만 true. 예: "오늘 분량 다 끝냈어", "오늘은 여기까지", "이제 잘게". 질문·일반 대화·분량 보고만 있는 말은 false.
- `bundled`가 참이면: 메시지가 번호순으로 여럿이다. 뒤 메시지가 앞 메시지를 고치거나 덧붙인다. "국어 2챕터" 뒤에 "아, 3개"가 오면 국어 3챕터 하나만 보고한 것이다. 고친 값만 남긴다.
- `asked === "study_time"`: 직전에 코치가 오늘 순공시간을 물었다. 시간만 와도 순공시간이다(intent는 `study_time`).
- `asked === "time_available"`: 직전에 코치가 오늘 공부할 수 있는 시간을 물었다. 앞으로 할 수 있는 시간("6시간 정도 할 수 있어")은 `study_time`이 아니다. 이미 공부한 시간을 분명히 말했을 때만 `study_time`을 채운다.

- [ ] **Step 1: 실패하는 테스트** — `analysis_test.ts`: `parseAnalysis`가 `wrap_up: true` → `wrapUp: true`, 없음·false·"true" → false. 스키마의 `required`에 `wrap_up`. `llm_test.ts`: ① `bundleInput(["a"]) === "a"`. ② `bundleInput(["국어 2챕터","아, 3개"]) === "1. 국어 2챕터\n2. 아, 3개"`. ③ 11개를 주면 마지막 10개만 번호 1~10으로. ④ 글자 합이 4000자를 넘으면 뒤에서부터 채워 앞 메시지가 빠진다. ⑤ `analysisInstructions(..., null, "time_available", false)`에 `study_time이 아니다`가 들어가고, `asked: "study_time"`이면 `순공시간이다`가, `asked: null`이면 둘 다 없다. ⑥ `bundled: true`일 때만 `뒤 메시지가 앞 메시지를 고치거나 덧붙인다`가 들어간다. `reply_test.ts`: `closingQuestion: true`일 때만 지침에 `질문으로 끝내지 않는다`가 들어간다.
- [ ] **Step 2: 실패 확인** — `npm test` → FAIL
- [ ] **Step 3: 구현** — 위 인터페이스대로. `index.ts`의 `analyzeMessage` 호출은 `analyzeMessage([content], books, today, pending?.draft ?? null, null)`로 임시로 맞춘다(Task 7·8이 바꾼다). `buildReply`의 `generateReply` 옵션에 `closingQuestion: false`를 임시로 넣는다.
- [ ] **Step 4: 통과 확인** — `npm test` 전부 통과, `deno check supabase/functions/chat/index.ts`.
- [ ] **Step 5: 커밋** — `feat: 분석에 마무리 판정, 묶음 입력, 직전 질문 지침`

---

### Task 6: 열기 요청 — 첫 메시지 흐름 (Subagent + 리뷰)

**Files:**
- Modify: `Backend/supabase/functions/chat/db.ts`, `chat/index.ts`

**Interfaces:**
- Consumes: Task 1의 DB 함수, Task 2의 `request.ts`·`actions.ts`, Task 4의 `welcomeText`, `_shared/replan.ts`의 `replan`
- Produces (`db.ts`):
  - `export async function loadTodayTasks(sb, today: string): Promise<TodayTaskLine[]>` — 지금 `loadCoachContext` 안의 `daily_tasks` 조회와 변환을 꺼낸 것. `loadCoachContext`도 이것을 쓴다(동작 불변).
  - `export async function hasMissedTasks(sb, today: string): Promise<boolean>` — `daily_tasks`에 `task_date < today`이고 `status = 'pending'`인 행이 있는지(화면 `api/study.ts`의 같은 이름 함수와 같은 조건).
  - `export async function insertFirstMessage(sb, today: string, timezone: string, text: string, action: ChatAction | null): Promise<ChatMessageRow | null>` — `insert_first_message` rpc(`p_from = dayStartUtc(today, tz)`, `p_to = dayStartUtc(addDays(today, 1), tz)`) → id가 null이면 null, 아니면 그 id로 메시지를 읽어 `toMessageRow`.
  - `insertMessage(sb, userId, role, content, subject, action = null, handled = false)` — 맨 끝 인자 `handled`가 참이고 `role === "user"`이면 `handled_at`을 지금으로 넣는다.
  - `loadRecentMessages`·`loadTodayHistory`의 정렬에 `.order("id", { ascending: false })`를 보조로 더한다(Minor 5).
- Produces (`index.ts`): `{ open: true }` 요청 처리 `handleOpen`.
- Produces (`ChatResponse`, 서버 쪽 형식과 Frontend `interfaces/chat.ts`): `superseded: boolean`을 더한다(Task 7이 채운다). 이 Task에서는 모든 응답에 `superseded: false`를 넣는다.

- [ ] **Step 1: `db.ts`** — 위 함수들과 `insertMessage` 인자, 정렬 보조 키. `ChatMessageRow`에 `handled_at`은 넣지 않는다(서버가 응답으로 돌려주지 않는다).
- [ ] **Step 2: `index.ts` `handleOpen`** — 순서: ① 프로필·교재를 읽고 오늘을 구한다. ② `loadRecentMessages(sb, today, tz, 1)`에 메시지가 있으면 `{ messages: [], logged: false, planChanged: false, replanFailed: false, superseded: false }`로 끝낸다. ③ 이월 조건(위 "열기 요청의 이월 조건")이 맞으면 `replan(sb)`를 부른다(성공 → `planChanged`, 던지면 `console.error(JSON.stringify({ call: "open_replan", error }))` 뒤 `replanFailed`). ④ `loadTodayTasks`로 오늘 분량을 읽는다. ⑤ `welcomeText({ today, examDate: profile.exam_date, tasks })`로 문구와 `action`을 만든다. ⑥ `insertFirstMessage`. null이면 `messages: []`, 아니면 `[row]`. 열기 요청은 하루 상한을 보지 않고 GPT를 부르지 않는다. `readRequest`가 `open`을 통과시키고, 글·칩 처리 전에 `handleOpen`으로 나눈다. DB 오류는 기존 `handle` catch가 500 `server_error`로 바꾼다.
- [ ] **Step 3: 확인** — `cd Backend; npm test`, `deno check supabase/functions/chat/index.ts` 통과. 보고서에 `handleOpen`의 분기마다(메시지 있음 / 이월 / 이월 실패 / 첫 메시지 중복) 어느 코드 줄이 처리하는지 적는다.
- [ ] **Step 4: 커밋** — `feat: chat 열기 요청으로 하루 첫 메시지(이월 포함) 저장`

---

### Task 7: 연달아 보낸 글 묶기 (Subagent + 리뷰)

**Files:**
- Modify: `Backend/supabase/functions/chat/db.ts`, `chat/index.ts`

**Interfaces:**
- Consumes: Task 1의 `claim_user_messages`, Task 5의 `analyzeMessage(contents, ...)`·`bundleInput`
- Produces (`db.ts`):
  - `export async function loadUnhandledUserMessages(sb, today, timezone): Promise<{ id: string; content: string }[]>` — 오늘 범위의 `role = 'user'`이고 `handled_at is null`인 메시지를 `created_at, id` 오름차순으로.
  - `export async function claimUserMessages(sb, messageId: string, today: string, timezone: string): Promise<boolean>` — `claim_user_messages` rpc.
  - `export async function deleteMessage(sb, id: string): Promise<void>` — 실패해도 던지지 않고 로그만.
  - `export async function setMessageSubject(sb, id: string, subject: Subject | null): Promise<void>`
  - `export async function loadLastCoachMessage(sb, today, timezone): Promise<ChatMessageRow | null>` — 오늘의 마지막 `role = 'assistant'` 메시지.
  - `loadTodayHistory`의 `excludeId: string`을 `excludeIds: string[]`로 바꾼다.

글 요청 흐름(칩·확답 글 분기는 지금과 같다. 칩 요청과 상한 답으로 넣는 사용자 메시지는 `handled`를 참으로 넣는다):

1. 요청 처음에 지금처럼 마지막 메시지(`last`)와 오늘 보낸 사용자 메시지 수를 읽고, 더해 `loadLastCoachMessage`를 읽는다.
2. 상한을 넘으면 지금처럼 정해진 답(사용자 메시지는 `handled`로).
3. 아니면 사용자 메시지를 **먼저** 저장한다(`subject` null, 처리 안 함). 그 뒤 `loadUnhandledUserMessages`로 묶음을 읽는다(방금 저장한 것 포함, 마지막 것이 이 메시지).
4. 받아 둔 초안은 `lastCoach?.action`이 `book_add`일 때 그 `draft`, 직전 질문 종류(`asked`)는 `lastCoach?.action.kind`가 `study_time_ask`면 `"study_time"`, `time_available_ask`면 `"time_available"`, 그 밖에는 null. `analyzeMessage(묶음 글들, books, today, 받아 둔 초안, asked)`.
5. 분석이 실패하면 **이 요청의 사용자 메시지를 `deleteMessage`로 지우고** 지금처럼 502 `analysis_failed`.
6. `claimUserMessages(sb, 이 메시지 id, ...)`가 false면 아무것도 저장하지 않고 `{ messages: [사용자 메시지], logged: false, planChanged: false, replanFailed: false, superseded: true }`로 끝낸다(답변 호출 없음).
7. true이면 `setMessageSubject`로 사용자 메시지의 과목을 분석 결과로 고치고, 기록·순공시간·잘 맞은 방법을 지금처럼 저장한다. `source_message_id`는 이 메시지(묶음의 마지막). `buildReply`의 `content`는 묶음 글을 `\n`으로 이은 것, 기록 저장·history 제외는 묶음 전체 id.
8. 확인 단계 확답 글("응")은 `last`가 확인 메시지일 때만 칩처럼 처리하므로, 처리 안 한 메시지가 앞에 있으면(= `last`가 사용자 메시지) 분석으로 간다(지금 구조 그대로 성립한다).

- [ ] **Step 1: `db.ts`** — 위 함수와 `loadTodayHistory` 인자 변경.
- [ ] **Step 2: `index.ts`** — 위 흐름. 받아 둔 초안의 출처를 `last`에서 `lastCoach`로 바꾸되, 칩 요청·확답 글은 `last`를 계속 쓴다. `analyzeMessage` 호출·`insertMessage` 호출 위치를 위 순서에 맞춘다. 요청 파싱 갈래는 Task 2의 구조를 쓴다.
- [ ] **Step 3: 확인** — `npm test`, `deno check supabase/functions/chat/index.ts` 통과. 보고서에 6단계의 claim 전후에 저장하는 것이 없음을(분석 실패·밀림 경로가 기록·순공·팁을 저장하지 않음) 코드 줄로 적는다.
- [ ] **Step 4: 커밋** — `feat: 연달아 보낸 글을 묶어 마지막 요청만 답하기`

---

### Task 8: 마무리 칩과 직전 질문 연결 (Subagent + 리뷰)

**Files:**
- Modify: `Backend/supabase/functions/chat/index.ts`, `chat/db.ts`, `chat/bookDraft.ts`(칩 처리 분기만, 필요하면)

**Interfaces:**
- Consumes: Task 4의 `wrapUp.ts`, Task 2의 `isConfirmAction`·`ChatAction`
- Produces (`db.ts`): `export async function loadStudyMinutes(sb, date: string): Promise<number | null>` — `study_time`의 그날 `minutes`, 없으면 null.

변경:
1. **칩·확답 글 분기 일반화** — `answerConfirm`를 `pending.kind`로 나눈다. `book_add`는 지금 그대로. `wrap_up`:
   - 두 요청이 겹쳐도 한쪽만 통하게 "방금 넣은 사용자 메시지 바로 앞이 그 확인 메시지인지" 다시 보는 지금 규칙을 그대로 쓴다(`loadRecentMessages(…, 2)`).
   - `fresh`가 아니면 끝난 확인 문구(`CHOICE_EXPIRED_TEXT`, 교재 문구 그대로)로 답한다. 교재 추가 문구이므로 마무리 칩에는 따로 `WRAP_UP_EXPIRED_TEXT = "이 확인은 끝났어요."`를 `wrapUp.ts`에 두고 쓴다.
   - `아니` → `WRAP_UP_NO_TEXT`, action null.
   - `응` → `loadStudyMinutes(sb, studyTimeDate(now, timezone, "today"))`와 `loadTodayTasks`로 `done`(`status === "done"`)·`total`을 세어 `wrapUpYesText`. 코치 메시지에 그 `action`(`study_time_ask` 또는 null)을 단다.
   - 사용자 메시지("응"/"아니")는 `handled`로 넣는다(Task 7과 같다).
2. **마무리 질문 붙이기** — `buildReply`의 끝에서 `shouldAskWrapUp({ wrapUp: analysis.wrapUp, intent: replyIntent, studyTimeAsk: studyTimeInvalid && !hasLogs })`이면 ① `generateReply` 옵션 `closingQuestion: true`, ② 답(대체 답변 포함)에 `appendWrapUp`, ③ `action = WRAP_UP_ACTION`. 순공시간만 보낸 정해진 답(`studyTimeReply`)에도 같이 붙인다. `fixed()` 경로(사용법·교재 추가·순공시간 되묻기)는 붙이지 않는다.
3. **I 고치기** — `buildReply`가 순공시간 되묻기(`STUDY_TIME_ASK`)로 답하고 받아 둔 교재 초안(`pending`)이 있으면 그 `action`을 코치 메시지에 그대로 붙인다.
4. **`study_time_ask`·`time_available_ask` 메시지 뒤의 글**은 Task 7의 `asked`로 이미 분석에 전달된다. 이 Task에서는 `asked`가 `study_time`이고 분석 의도가 `study_time`이면 기존 순공시간 저장·답 흐름을 타는지 확인만 한다.

- [ ] **Step 1: `db.ts`·`wrapUp.ts`** — `loadStudyMinutes`, `WRAP_UP_EXPIRED_TEXT`(테스트: `wrapUp_test.ts`에 문자열 단언 추가).
- [ ] **Step 2: `index.ts`** — 위 1~3. 칩 분기에서 `pending`의 `kind`를 좁히는 곳(`book_add`만 쓰던 코드)을 모두 확인한다.
- [ ] **Step 3: 확인** — `npm test`, `deno check supabase/functions/chat/index.ts` 통과. 보고서에 ① 칩 `응`/`아니`/끝난 확인 세 분기, ② 마무리 질문이 붙는 조건과 안 붙는 조건(교재 추가·사용법·순공시간 되묻기·분석 실패), ③ I 수정이 어느 줄인지 적는다.
- [ ] **Step 4: 커밋** — `feat: 공부 마무리 칩과 순공시간 되묻기`

---

### Task 9: 화면 계약, 칩 공용화, 버튼 줄 (Subagent + 리뷰)

**Files:**
- Create: `Frontend/src/libs/chatAction.ts`
- Modify: `Frontend/src/interfaces/chat.ts`, `Frontend/src/api/chat.ts`, `Frontend/src/components/chat/ConfirmChips.tsx`, `Frontend/src/pages/ChatPage.tsx`, `DESIGN.md`

**Interfaces:**
- Produces:
  - `interfaces/chat.ts`: `ChatAction`을 `BookAddAction | WrapUpAction | StudyTimeAskAction | TimeAvailableAskAction`으로(서버 `actions.ts`와 같은 모양). `ChatRequest`에 `| { open: true }`. `ChatResponse`에 `superseded: boolean`.
  - `api/chat.ts`: `export async function openChatRoom(): Promise<ChatResponse>` — `invokeChat({ open: true })`. `fetchChatMessages`의 정렬에 `.order('id', { ascending: true })`를 보조로 더한다.
  - `libs/chatAction.ts`: `export function showsConfirmChips(m: ChatMessage, isLast: boolean, readOnly: boolean): boolean` — 오늘 채팅방(`!readOnly`)이고 마지막 메시지이고 코치 메시지이고 `action`이 `step === 'confirm'`인 `book_add` 또는 `wrap_up`일 때만 true.
- Changes:
  - `ConfirmChips.tsx`: 버튼 둘을 `[{ answer: 'yes', label: '응' }, { answer: 'no', label: '아니' }]` 배열로 그린다(Minor 13). 모양·접근성 이름은 그대로.
  - `ChatPage.tsx`: 칩 조건을 `showsConfirmChips`로 바꾼다(Minor 14). **D**: 메시지 목록 칸에서 `pb-16`과 그 주석을 지우고, 목록 아래·입력 줄 위에 오른쪽 정렬한 별도 줄(`flex min-h-[3.25rem] justify-end px-3 pb-2`)을 두어 `TodayPlanDock`의 버튼을 그 안에 그린다(`absolute` 제거). 오늘 채팅방에서만 그 줄이 있고 지난 채팅방에는 없다. `TodayPlanSheet`는 그대로 `TodayPlanDock` 안에서 그린다.

- [ ] **Step 1: 계약과 api** — 인터페이스·`openChatRoom`·정렬 보조 키.
- [ ] **Step 2: `libs/chatAction.ts`, `ConfirmChips`** — 위대로.
- [ ] **Step 3: `ChatPage`** — 칩 조건 교체와 D 레이아웃.
- [ ] **Step 4: DESIGN.md** — 채팅 화면 그림(오늘의 분량이 입력창 위 별도 줄), "오늘의 분량" 설명의 "메시지 목록은 버튼 높이만큼 아래 여백…" 문장을 "목록은 버튼 줄 위에서 끝난다"로, 확인 칩 설명에 마무리 칩을 더한다.
- [ ] **Step 5: 확인** — `cd Frontend; npm run format; npm run lint; npm run build` 통과. 브라우저 확인은 Task 11.
- [ ] **Step 6: 커밋** — `feat: 오늘의 분량 버튼을 별도 줄로, 확인 칩 공용화`

---

### Task 10: `useChat` — 연속 전송과 첫 메시지 (Subagent + 리뷰)

**Files:**
- Modify: `Frontend/src/hooks/useChat.ts`, `Frontend/src/pages/ChatPage.tsx`, `DESIGN.md`

**Interfaces:**
- Consumes: Task 9의 `openChatRoom`, `ChatResponse.superseded`
- Produces: `ChatState`에 `loaded: boolean`(처음 메시지 조회가 끝남)과 `opening: boolean`(열기 요청이 진행 중)을 더하고, `sending`은 "답을 기다리는 요청이 하나라도 있음"의 뜻으로 바뀐다. `useChat(date: string, readOnly: boolean)`.

규칙:
- **연속 전송**: `send`는 `sending` 중에도 막지 않는다. 보낼 때마다 `pending-<순번>` 사용자 말풍선을 더하고, 답변 대기 말풍선(`pending-reply`)은 하나만 두며 매번 맨 끝으로 옮긴다. 응답이 오면 자기 임시 말풍선을 `response.messages` 중 사용자 메시지로 **제자리에서** 바꾼다. 코치 메시지가 있으면 그 사용자 메시지 바로 뒤에 넣는다. 대기 말풍선은 진행 중인 요청이 하나도 남지 않았을 때 지운다. `superseded` 응답은 사용자 메시지만 바꾸고 대기 말풍선은 건드리지 않는다(남은 요청이 있으면 남는다).
- **실패**: 그 요청의 임시 말풍선만 지우고 입력 글을 되돌린다(지금 `handleSubmit`의 동작). 남은 요청이 없으면 대기 말풍선도 지운다. `error`를 보인다.
- **칩**: `choose`도 같은 `deliver`를 쓴다. 칩 `disabled`는 `sending`이다(지금 그대로).
- **열기**: `readOnly`가 아니고 처음 조회가 빈 배열이면 `openChatRoom()`을 한 번 부른다. 응답 `messages`가 있으면 목록 맨 앞에 넣는다. 응답 `replanFailed`면 `regeneratePlan()`을 한 번 부른다(실패해도 대화는 그대로). 열기가 실패해도 오류 문구를 보이지 않고 넘어간다. 열기 중(`opening`)에는 보내기를 막는다.
- **첫 말풍선**: `loaded`가 되기 전에는 아무것도 그리지 않는다. `loaded && !opening`일 때 목록의 첫 메시지가 코치 메시지가 아니면(없거나 사용자 메시지) 지금의 고정 문구(`WELCOME_MESSAGE`)를 맨 위에 그린다.
- **보내기 버튼**: 비활성은 빈 글(`!draft.trim()`)이거나 `opening`일 때만. `handleSubmit`의 `sending` 조건을 뺀다.

- [ ] **Step 1: `useChat`** — 위 규칙. `deliver`에서 순번은 `useRef` 카운터, 진행 중 개수는 상태와 ref를 같이 갖는다(지연된 응답이 최신 개수를 읽도록).
- [ ] **Step 2: `ChatPage`** — `useChat(date, readOnly)`, `loaded`·`opening`, 첫 말풍선 조건, 보내기 버튼 조건.
- [ ] **Step 3: DESIGN.md** — 첫 메시지 항목("기본 메시지" 문장을 "첫 메시지는 서버가 만든 코치 메시지. 없을 때만 고정 문구")과 입력창 항목("전송 중이거나 비어 있으면 버튼 비활성" → "비어 있을 때만. 답을 기다리는 동안에도 보낼 수 있다").
- [ ] **Step 4: 확인** — `npm run format; npm run lint; npm run build` 통과. 코드로 따라가 보고서에 적는다: ① 두 글을 연달아 보내 첫 응답이 `superseded`, 둘째가 코치 답일 때의 말풍선 순서, ② 둘째가 실패할 때, ③ 열기 응답이 빈 배열일 때.
- [ ] **Step 5: 커밋** — `feat: 답을 기다리는 동안에도 보내기와 하루 첫 메시지`

---

### Task 11: 배포, 채팅 확인, 문서 (Native, ☁️)

**Files:**
- Modify: `SERVICE_FLOW.md`, `DESIGN.md`(남은 곳), `docs/coach/coach-tone.md`, `CLAUDE.md`, `History/2026-11-23-채팅-다듬기.md`, `docs/superpowers/plans/2026-10-27-roadmap.md`

- [ ] **Step 1: ☁️ 배포** (사용자 승인 후) — `cd Backend; npm test` 통과를 보고 `npx supabase functions deploy chat --use-api`. (마이그레이션은 Task 1에서 이미 반영.)
- [ ] **Step 2: 채팅 확인** (사용자가 브라우저 `npm run dev`에서, 진행자는 `function_logs`와 DB 조회로 확인. 확인 데이터는 끝나고 정리):
  1. 채팅 메시지가 없는 날 앱을 연다(이전 날 `pending` 분량이 있을 때와 없을 때). 코치 첫 메시지가 하나만 생기고 오늘의 분량 버튼 숫자와 맞는다. 탭 두 개로 동시에 열어도 하나다.
  2. "국어 챕터 2개 진행했어" 직후 "아, 3개 진행했어". 답이 한 번이고 국어 진도가 3챕터로만 올랐다. "국어 …" 직후 "영어도 …"는 둘 다 기록된다.
  3. 첫 메시지 질문에 "6시간 정도 할 수 있어"로 답하면 순공시간이 저장되지 않는다.
  4. "오늘 분량 다 끝냈어" → 마무리 질문과 칩. `응`(순공시간 없을 때·있을 때), `아니`. 같은 확인에 다른 탭에서 다시 `응` → 끝난 확인 문구.
  5. 채팅이 길어진 폰 폭(360px)에서 위로 스크롤해도 오늘의 분량 버튼이 말풍선을 가리지 않는다.
  6. 교재 추가(채팅): 확인 도중 다른 교재를 말해도 이전 값이 섞이지 않는다. 확인 도중 "순공 30시간"을 말해도 초안이 이어진다. 시험일이 지난 사용자의 확인 문구.
- [ ] **Step 3: 문서** — SERVICE_FLOW(2.1 첫 메시지, 2.2 알림이 같은 자리를 이어받음, 5장 연달아 보낸 글 묶기, 5.2 순공시간 되묻기·가용 시간 질문, 의도별 처리 표), coach-tone.md(첫 메시지·마무리 질문·칩 답 문구), CLAUDE.md `chat` 설명(열기 요청, 묶음 처리, 마무리 칩, `actions.ts`·`request.ts`·`welcome.ts`·`wrapUp.ts`), DESIGN.md 남은 곳, History(Task별 기록과 리뷰 결과), 로드맵 2.3 상태.
- [ ] **Step 4: 계획 범위 최종 리뷰** — task-reviewer와 code-reviewer에게 같은 diff(`develop..fix/chat`)를 동시에 맡긴다. 지적은 고치고 재리뷰한다.
- [ ] **Step 5: 커밋** — `docs: 채팅 다듬기 문서 반영`
