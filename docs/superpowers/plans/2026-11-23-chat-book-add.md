# 채팅으로 교재 추가 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 채팅으로 과목·교재명·단위·총량(+목표 회독)을 받아, 응/아니 확인 칩을 거쳐 `books`에 저장하고 바로 시험일까지 분량을 다시 나눈다.

**Architecture:**
- 받아 둔 교재는 코치 메시지의 `chat_messages.action`(jsonb)에 붙인다. 오늘 채팅방의 마지막 메시지가 `action` 있는 코치 메시지일 때만 살아 있다.
- 초안 합치기·빠진 항목·정해진 문구·확답 글 판단·요청 검증은 순수 모듈 `chat/bookDraft.ts`가 한다. 분석은 `book` 항목을 더 돌려준다.
- 칩·확답 글은 GPT 없이 처리한다. 저장 뒤 재분배는 `plan-generator` 본문을 옮긴 `_shared/replan.ts`로 같은 요청 안에서 한다.

**Tech Stack:** Supabase(Postgres + RLS, Edge Functions/Deno), OpenAI Responses API(json_schema strict), React 19 + Tailwind v4, Deno test. Frontend 테스트 도구는 없다.

**Spec:** [채팅으로 교재 추가 설계](../specs/2026-11-23-chat-book-add-design.md)

## 이 계획에서 정한 것 (설계가 만드는 사람에게 맡긴 것)

| 항목 | 결정 |
|---|---|
| 분석 항목 이름 | `book: { subject, title, unit, total_units, target_rounds }`(모두 nullable) 또는 null |
| 두 요청이 거의 동시에 들어올 때 | 사용자 메시지("응")를 넣은 **뒤** 오늘 최근 메시지 2개를 다시 읽어 `[방금 넣은 사용자 메시지, 그 확인 메시지]`일 때만 저장한다. 아니면 끝난 확인 문구로 답한다. 동시에 들어온 두 요청은 둘 다 거절될 수 있지만 중복 저장은 생기지 않는다 |
| 칩 요청 오류 | 모양이 틀리면 400 `invalid_content`(지금 글 요청과 같은 코드). 끝난 확인이면 200 + 끝난 확인 문구 |
| 확답 글 비교 | 공백과 `.,!?~…`을 모두 지운 뒤 목록과 정확히 비교한다(그래서 "추가해 줘"와 "추가해줘"가 같다) |
| `replan` 결과 | 넣은 계획 줄도 돌려줘 `chat`이 새 교재의 오늘 분량을 찾는다. `plan-generator` 응답 모양은 그대로 |
| 칩 컴포넌트 | `components/chat/ConfirmChips.tsx`. 공용 `ui/`가 아니다(채팅에서만 쓴다) |

## Global Constraints

- 문구는 한국어 해요체([coach-tone](../../coach/coach-tone.md)). 정해진 문구는 아래 Task 3의 표가 원본이다.
- 초안 범위: 제목 앞뒤 공백 뺀 1~20자, `unit` ∈ `day`·`chapter`·`session`, `total_units` 1~1000 정수(채팅 전용), `target_rounds` 1~10 정수(기본 1). 저장 기본값: `current_round` 1, `current_unit` 0, `daily_amount` null, `round_targets` `{}`.
- GPT 비용 장치 유지: 메시지당 분석 1번 + 답변 1번까지, 다시 시도 없음, `reasoning: low`, 출력 상한 분석 1500·답변 2000. 교재 추가 흐름의 답은 모두 정해진 문구이고, 칩·확답 글은 분석도 하지 않는다.
- 칩·확답 글은 하루 메시지 상한(100개)을 확인하지 않는다. 남긴 사용자 메시지는 이후 글 메시지의 상한 계산에 들어간다.
- `plan-generator`의 동작과 응답(`{ generated, days }` / `{ generated: 0, days: 0, skipped }` / 오류 500 `{ error }`)은 바뀌지 않는다.
- Frontend 의존 방향 `pages → hooks → api → libs`. DESIGN.md 토큰만, 새 색 토큰 없음. 터치 영역 44px 이상.
- ☁️ 단계(`db push`, `gen:types`, `functions deploy`)는 개발 프로젝트에만, 실행 전에 사용자 승인. 이미 반영된 마이그레이션은 고치지 않는다. 사용자 UUID·키는 파일·커밋·History에 적지 않는다.
- Task마다 `feature/study_knowledge`에 경로 지정 커밋, push 안 함(2.2 끝난 뒤 사용자가 요청), 커밋에 Claude 표시 줄 없음. History는 메인 세션이 [2026-11-23-채팅-교재-추가.md](../../../History/2026-11-23-채팅-교재-추가.md)에 Task별로 쌓는다.
- 범위 밖: 채팅으로 회독별 목표일·하루 최소 분량·시작 진도 받기, 기존 교재 수정·삭제, 다른 예/아니오 칩, 하루 첫 메시지, 답을 기다리는 동안 보낸 메시지 처리(로드맵 2.3).

## Review Focus

1. **끝난 확인에 다시 응**(새로고침 전 화면, 다른 탭에서 이미 누름, 두 번 빠르게 누름) — 교재가 두 권 생기지 않고 끝난 확인 문구로 답한다 → Task 5 Step 1 흐름 + Task 7 채팅 확인 6
2. **칩 대신 글 확답**("네!", "추가해 줘", "ㅇㅇ") — 응 칩과 같다. "아니 3회독이야"는 확답이 아니라 분석으로 간다 → Task 3 `confirmAnswer` 테스트
3. **분석이 엉뚱한 값을 냄**(21자 제목, 20000회, 0회독, 모르는 단위) — 저장되지 않고 그 항목을 다시 묻는다 → Task 4 `parseAnalysis` 테스트
4. **사용자가 `action` jsonb를 직접 고침**(RLS로 자기 행 수정 가능) — 응을 누르면 서버가 초안을 다시 검증하고, 범위 밖이면 저장하지 않는다 → Task 3 `parseAction`·`completeDraft` 테스트
5. **시험일이 없거나 지난 사용자** — 교재는 저장되고 시험일을 정하라는 문구, 500이 아니다 → Task 3 `savedText` 테스트 + Task 7 채팅 확인 7

## 실행 방식

| Task | 방식 | 이유 |
|---|---|---|
| 1 | Native | ☁️ DB 반영과 타입 생성 |
| 2 | Subagent + 리뷰 | 코드 옮기기, 동작 불변 확인 |
| 3~4 | Subagent + 리뷰 | 순수 로직, 테스트로 확인 |
| 5 | Subagent + 리뷰 | `chat` 흐름 연결(타입 확인까지) |
| 6 | Subagent + 리뷰 | 화면 작업 |
| 7 | Native | ☁️ 배포, 실제 채팅 확인, 문서 |
| 끝 | 계획 범위 리뷰(task-reviewer + code-reviewer, 같은 diff), 로드맵·README 정리 | |

---

### Task 1: `chat_messages.action` 칸 (Native, ☁️)

**Files:**
- Create: `Backend/supabase/migrations/<타임스탬프>_chat_message_action.sql` (`npx supabase migration new chat_message_action`)
- Modify: `Frontend/src/interfaces/database.ts` (`npm run gen:types`)

**Interfaces:**
- Produces: `public.chat_messages.action jsonb null`, 제약 `chat_messages_action_object check (action is null or jsonb_typeof(action) = 'object')`, 한국어 `comment on column`("메시지에 달린 동작. 교재 추가 초안과 단계(ask/confirm/edit). 모양은 chat 함수가 검증한다").

- [ ] **Step 1: 마이그레이션 작성** — 위 칸·제약·주석. RLS·권한은 바꾸지 않는다(기존 "own rows").
- [ ] **Step 2: ☁️ 반영** (사용자 승인 후) — `cd Backend; npx supabase db push --dry-run`(이 파일 하나) → `npx supabase db push --yes` → `npx supabase db query --linked "select column_name, data_type from information_schema.columns where table_name = 'chat_messages' and column_name = 'action'"` → 한 줄 `jsonb`. `get_advisors`(security) 새 경고 없음.
- [ ] **Step 3: 타입과 확인** — `npm run gen:types` 뒤 `database.ts`의 `chat_messages.Row`에 `action: Json | null`. `cd ../Frontend; npm run build` 통과.
- [ ] **Step 4: 커밋** — `feat: chat_messages에 메시지 동작(action) 칸`

---

### Task 2: 재분배를 공용 모듈로 (Subagent + 리뷰)

**Files:**
- Create: `Backend/supabase/functions/_shared/replan.ts`
- Modify: `Backend/supabase/functions/plan-generator/index.ts`, `Backend/supabase/functions/plan-generator/deno.json`

**Interfaces:**
- Produces (`_shared/replan.ts`):
  - `export interface PlannedTask { book_id: string; task_date: string; round: number; start_unit: number; end_unit: number }`
  - `export interface ReplanResult { generated: number; days: number; skipped?: "no_exam_date" | "exam_passed"; tasks: PlannedTask[] }`
  - `export async function replan(sb: SupabaseClient): Promise<ReplanResult>` — 지금 `plan-generator/index.ts`의 `fetch` 본문 그대로(프로필·시험일, D-8 상한, 오늘 끝낸 교재, `planBook`/`planBookFromTomorrow`, `replace_daily_tasks`). 오류는 `throw new Error(message)`. `skipped`일 때 `tasks`는 `[]`.

- [ ] **Step 1: 옮기기** — 본문과 주석(잠금 밖 읽기, 마지막 주 상한 등)을 `replan.ts`로 옮긴다. `RpcClient` 인터페이스는 `SupabaseClient`로 바꾼다. `plan-generator/deno.json`에 `"@supabase/supabase-js": "npm:@supabase/supabase-js@^2"`를 더한다.
- [ ] **Step 2: `plan-generator/index.ts`** — `replan(ctx.supabase)`를 부르고 `tasks`를 뺀 `{ generated, days }` 또는 `{ generated: 0, days: 0, skipped }`를 돌려준다. catch하면 `errorResponse(String(e.message))`(500 `{ error }`). 맨 위 설명 주석은 "나누는 일은 `_shared/replan.ts`"로 고친다.
- [ ] **Step 3: 확인** — `cd Backend; npm test` 통과(기존 `plan_test.ts` 포함). `deno check supabase/functions/plan-generator/index.ts supabase/functions/_shared/replan.ts` 통과. 옮기기 전후 `plan-generator` 응답 모양이 같음을 diff로 확인해 보고서에 적는다.
- [ ] **Step 4: 커밋** — `refactor: 계획 재분배를 _shared/replan.ts로 옮기기`

---

### Task 3: 교재 초안 순수 모듈 (Subagent + 리뷰)

**Files:**
- Create: `Backend/supabase/functions/chat/bookDraft.ts`, `Backend/supabase/functions/chat/bookDraft_test.ts`

**Interfaces:**
- Consumes: `Subject`, `SUBJECT_LABELS`(`_shared/subjects.ts`), `BookUnit`, `withUnit`, `rangeLabel`(`_shared/units.ts`), `BookRef`(`chat/analysis.ts`, 타입만)
- Produces:
  - `export const MAX_CHAT_TOTAL_UNITS = 1000`, `export const MAX_TITLE_LENGTH = 20`, `export const MAX_TARGET_ROUNDS = 10`
  - `export interface BookDraft { subject: Subject | null; title: string | null; unit: BookUnit | null; total_units: number | null; target_rounds: number }`
  - `export type BookPatch = { [K in keyof BookDraft]: BookDraft[K] | null }`(분석이 돌려주는 모양, 말하지 않은 것은 null)
  - `export interface CompleteDraft { subject: Subject; title: string; unit: BookUnit; total_units: number; target_rounds: number }`
  - `export type BookAddStep = "ask" | "confirm" | "edit"`
  - `export interface BookAddAction { kind: "book_add"; step: BookAddStep; draft: BookDraft }`, `export type ChatAction = BookAddAction`
  - `export type MissingField = "subject" | "title" | "amount"`(`amount` = 단위나 총량)
  - `export type ChatRequest = { content: string } | { choice: { message_id: string; answer: "yes" | "no" } }`
  - `export const EMPTY_DRAFT: BookDraft`(모두 null, `target_rounds` 1)
  - `export function mergeDraft(base: BookDraft, patch: BookPatch | null): BookDraft` — patch의 null 아닌 값이 덮어쓴다
  - `export function missingFields(d: BookDraft): MissingField[]` — 순서 subject, title, amount
  - `export function completeDraft(d: BookDraft): CompleteDraft | null` — 모든 항목이 있고 Global Constraints 범위 안일 때만
  - `export function parseAction(v: unknown): ChatAction | null` — DB jsonb를 믿지 않는다. 모양·범위가 틀린 항목은 null로(`target_rounds`가 틀리면 1), `kind`·`step`이 틀리면 전체 null
  - `export function parseChatRequest(body: unknown, maxLength: number): ChatRequest | null` — `content`는 trim 뒤 1~maxLength, `choice.message_id`는 비어 있지 않은 문자열, `answer`는 `yes`/`no`. 둘 다 있거나 둘 다 없으면 null
  - `export function confirmAnswer(text: string): "yes" | "no" | null`
  - `export function isDuplicateTitle(d: CompleteDraft, books: BookRef[]): boolean` — 같은 과목에 trim한 제목이 같은 교재
  - `export function askText(d: BookDraft, missing: MissingField[]): string`
  - `export function confirmText(d: CompleteDraft, duplicate: boolean): string`
  - `export const EDIT_TEXT: string`, `export const CHOICE_EXPIRED_TEXT: string`
  - `export type SaveOutcome = { kind: "planned"; today: { start_unit: number; end_unit: number } | null } | { kind: "no_exam" } | { kind: "failed" }`
  - `export function savedText(d: CompleteDraft, outcome: SaveOutcome): string`

정해진 문구(원본, `{과목}`은 `SUBJECT_LABELS`, `{분량}`은 `withUnit(unit, total_units)`):

| 함수 | 문구 |
|---|---|
| `askText` 첫 줄 | 제목이 있으면 `{과목} 「{제목}」 교재를 추가할게요.`(과목이 없으면 `「{제목}」 교재를 추가할게요.`), 없으면 `교재를 추가할게요.` |
| `askText` 묻는 줄(빈 줄 하나 뒤, 빠진 것마다 한 줄) | subject `어느 과목 교재인가요?` / title `교재 이름을 20자 안으로 알려 주세요. 예) 보건행정 기본서` / amount `어떤 단위로 모두 몇 개인지 알려 주세요. 예) 20회분, 12챕터, Day 30` |
| `confirmText` | `이렇게 추가할까요?\n{과목} · {제목} · {분량} · {회독}회독`, 중복이면 끝에 `\n같은 이름의 교재가 이미 있어요.` |
| `EDIT_TEXT` | `어떤 걸 고칠까요? 예) 3회독이야, 30회분이야` |
| `CHOICE_EXPIRED_TEXT` | `이 확인은 끝났어요. 추가할 교재를 다시 말해 주세요.` |
| `savedText` 첫 문단 | `{과목} 「{제목}」 {분량}, {회독}회독을 추가했어요.` |
| `savedText` 둘째 문단(빈 줄 뒤) | planned + today → `시험 전날까지 분량을 다시 나눴어요. 오늘은 {rangeLabel}예요.` / planned + null → `시험 전날까지 분량을 다시 나눴어요.` / no_exam → `시험일을 정하면 분량을 나눠 드려요. 메뉴의 '공부 설정 변경'에서 정할 수 있어요.` / failed → 둘째 문단 없음 |

확답 목록(공백과 `.,!?~…`을 모두 지운 뒤 비교): 긍정 `응 어 네 넵 예 그래 좋아 맞아 ㅇㅇ ㅇㅋ 오케이 추가해줘 네추가해줘 응추가해줘`, 부정 `아니 아니요 아니야 아뇨 노 ㄴㄴ`.

- [ ] **Step 1: 실패하는 테스트** (`bookDraft_test.ts`, `reply_test.ts`처럼 `jsr:@std/assert`)
  - `mergeDraft`: `{...EMPTY_DRAFT, subject: "korean", title: "봉투모의고사"}`에 `{subject: null, title: null, unit: "session", total_units: 20, target_rounds: null}` → 과목·제목 유지, 단위·총량 채움, 회독 1
  - `missingFields(EMPTY_DRAFT)` → `["subject", "title", "amount"]`, 단위만 있으면 `amount` 남음
  - `completeDraft`: 21자 제목·총량 1001·회독 11 → null, 범위 안 → 값
  - `parseAction`: `{kind:"book_add", step:"confirm", draft:{subject:"korean", title:"봉투모의고사", unit:"session", total_units:20, target_rounds:3}}` → 같은 값. `step:"done"` → null. `draft.total_units: 5000` → `total_units` null. `"x"`·`null` → null
  - `parseChatRequest`: `{content:" 안녕 "}` → `{content:"안녕"}`, `{choice:{message_id:"m1", answer:"yes"}}` → 그대로, `{content:"a", choice:{...}}`·`{choice:{message_id:"", answer:"yes"}}`·`{choice:{message_id:"m1", answer:"maybe"}}`·1001자 → null
  - `confirmAnswer`: `"응"`, `"네!"`, `" 추가해 줘~ "`, `"ㅇㅇ"` → `"yes"`, `"아니요."` → `"no"`, `"아니 3회독이야"`, `"응 근데 3회독"`, `"좋아요 고마워"` → null
  - `askText({...EMPTY_DRAFT, subject:"korean", title:"봉투모의고사"}, ["amount"])` → `"국어 「봉투모의고사」 교재를 추가할게요.\n\n어떤 단위로 모두 몇 개인지 알려 주세요. 예) 20회분, 12챕터, Day 30"`
  - `confirmText(국어·봉투모의고사·session·20·1회독, false)` → `"이렇게 추가할까요?\n국어 · 봉투모의고사 · 20회 · 1회독"`, `true`면 끝에 중복 줄. 단위 `day` 60 → `Day 60`
  - `savedText`: planned + `{start_unit:1, end_unit:2}` → `"국어 「봉투모의고사」 20회, 3회독을 추가했어요.\n\n시험 전날까지 분량을 다시 나눴어요. 오늘은 1–2회예요."`, no_exam·failed 문구
  - `isDuplicateTitle`: 같은 과목·같은 제목(앞뒤 공백 차이) → true, 다른 과목 → false
- [ ] **Step 2: 실패 확인** — `cd Backend; npm test` → FAIL(`bookDraft.ts` 없음)
- [ ] **Step 3: 구현** — 파일 맨 위 주석: "교재 추가 초안의 순수 로직. OpenAI·Supabase를 import하지 않는다."
- [ ] **Step 4: 통과 확인** — `npm test` 모두 통과, `deno check supabase/functions/chat/bookDraft.ts`
- [ ] **Step 5: 커밋** — `feat: 채팅 교재 추가 초안 모듈`

---

### Task 4: 분석에 교재 항목과 받아 둔 초안 (Subagent + 리뷰)

**Files:**
- Modify: `Backend/supabase/functions/chat/analysis.ts`, `analysis_test.ts`, `llm.ts`

**Interfaces:**
- Consumes: Task 3의 `BookPatch`, `BookDraft`, `missingFields`, `MAX_CHAT_TOTAL_UNITS`, `MAX_TITLE_LENGTH`, `MAX_TARGET_ROUNDS`
- Produces:
  - `Analysis.book: BookPatch | null` — 모든 항목이 null이면 null
  - `ANALYSIS_SCHEMA`에 `book`(nullable object, 다섯 항목 모두 required·nullable, `unit` enum `day`·`chapter`·`session`·null, `subject` enum 과목·null)
  - `export async function analyzeMessage(content: string, books: BookRef[], today: string, pending: BookDraft | null): Promise<Analysis>`

- [ ] **Step 1: 실패하는 테스트** (`analysis_test.ts`에 추가)
  - `book: {subject:"korean", title:" 봉투모의고사 ", unit:"session", total_units:20, target_rounds:null}` → `{subject:"korean", title:"봉투모의고사", unit:"session", total_units:20, target_rounds:null}`
  - 21자 제목 → `title` null, 총량 0·1001·`1.5` → null, 회독 0·11 → null, unit `"page"` → null
  - 다섯 항목이 모두 null이거나 `book: null` → `analysis.book` null
  - 기존 테스트 입력에 `book: null`이 없어도 통과(없으면 null)
- [ ] **Step 2: 실패 확인** — `npm test` → FAIL
- [ ] **Step 3: `analysis.ts` 구현** — `parseBook(v: unknown): BookPatch | null`. `parseAnalysis`의 다른 동작은 그대로.
- [ ] **Step 4: `llm.ts` 분석 지침** — `analysisInstructions(books, today, pending)`. `study_tip` 단락 뒤에 아래를 넣고, `pending`이 있을 때만 맨 끝에 초안 단락을 붙인다.

```
book: 새 교재를 추가하려는 말이거나 아래 "받아 두는 교재"에 답하는 말일 때만 채운다. 아니면 null.
- 말한 항목만 채우고 나머지는 null. 목표 회독은 "3회독"처럼 말했을 때만.
- title은 20자 안으로 줄인다. 연도·출판사·강사 이름은 뺀다. 예: "2027 해커스 보건행정 기본서" → "보건행정 기본서"
- unit: Day(단어장 등) → day, 챕터·단원 → chapter, 회차·강·회분(인강, 모의고사) → session. 기본서와 인강 세트는 인강 회차로 센다.
- total_units는 그 단위의 전체 개수. 쪽 수는 쓰지 않는다. "모의고사 몇 개"처럼 모호하면 null.
```

```
받아 두는 교재(아직 저장 전): 과목 {과목 또는 없음} | 제목 {제목 또는 없음} | 단위 {단위 또는 없음} | 총량 {총량 또는 없음} | {회독}회독
빠진 항목: {과목, 제목, 단위와 총량 중 빠진 것 또는 없음}
이 메시지가 받아 두는 교재를 채우거나 고치는 말이면 intent는 book_add이고, 바꾸는 항목만 book에 넣는다. 교재와 상관없는 말이면 원래 intent를 고르고 book은 null이다.
```

  `intent` 목록의 `book_add` 줄은 `- book_add: 새 교재를 추가하려 하거나, 받아 두는 교재에 답한다`로 바꾼다. `analyzeMessage`는 `pending`을 지침에 넘긴다. `index.ts`의 호출은 Task 5에서 바꾸므로 여기서는 `analyzeMessage(content, books, today, null)`로 맞춰 둔다.
- [ ] **Step 5: 통과 확인** — `npm test`, `deno check supabase/functions/chat/index.ts`
- [ ] **Step 6: 커밋** — `feat: 채팅 분석에 교재 추가 항목`

---

### Task 5: `chat` 흐름 연결 (Subagent + 리뷰)

**Files:**
- Modify: `Backend/supabase/functions/chat/index.ts`, `db.ts`, `Backend/supabase/functions/_shared/coach.ts`

**Interfaces:**
- Consumes: Task 2 `replan`, `ReplanResult`; Task 3 전부; Task 4 `analyzeMessage(..., pending)`, `Analysis.book`
- Produces (`db.ts`):
  - `ChatMessageRow`에 `action: ChatAction | null`(읽을 때 `parseAction`), `MESSAGE_COLUMNS`에 `action`
  - `insertMessage(sb, userId, role, content, subject, action: ChatAction | null = null)`
  - `export async function loadRecentMessages(sb, today: string, timezone: string, limit: number): Promise<ChatMessageRow[]>` — 오늘 채팅방 최신순
  - `export async function insertBook(sb, userId: string, d: CompleteDraft): Promise<{ id: string }>` — 기본값은 Global Constraints
- Produces (응답): `{ messages: [user, assistant], logged: boolean, planChanged: boolean, replanFailed: boolean }`

- [ ] **Step 1: `index.ts` 흐름**
  1. `parseChatRequest(body, MAX_CONTENT_LENGTH)`가 null이면 400 `invalid_content`(지금 `readContent` 대체).
  2. `loadProfileAndBooks` 뒤 `loadRecentMessages(…, 1)`. 마지막이 코치 메시지이고 `action`이 있으면 그것이 받아 둔 초안(`pending`).
  3. **칩 요청**: `pending.step === "confirm"`이고 `last.id === choice.message_id`일 때만 유효. **글 요청**: `pending.step === "confirm"`이고 `confirmAnswer(content)`가 있으면 칩 요청과 같다. 둘 다 하루 상한을 확인하지 않는다.
  4. 확답 처리: 사용자 메시지(칩이면 `응`/`아니`, 글이면 원문, `subject`는 초안 과목)를 넣고 `loadRecentMessages(…, 2)`가 `[방금 넣은 메시지, 확인 메시지]`가 아니거나, 칩 요청이 유효하지 않거나, `completeDraft`가 null이면 → `CHOICE_EXPIRED_TEXT`.
     - yes: `insertBook` → `replan`(try/catch, 실패는 `console.error({ call: "replan" })` 후 `failed`) → `skipped`면 `no_exam`, 아니면 `tasks`에서 새 교재 `task_date === today` 첫 줄로 `planned`. 답은 `savedText`, `planChanged`는 replan 성공 시 true, `replanFailed`는 실패 시 true.
     - no: `EDIT_TEXT` + `action {kind:"book_add", step:"edit", draft}`.
  5. 그 밖의 글: 지금 흐름(하루 상한 → 분석(`pending?.draft ?? null`) → 기록·순공시간·팁 저장). `buildReply`의 `book_add` 분기는 `BOOK_ADD_PENDING` 대신: `draft = mergeDraft(pending?.draft ?? EMPTY_DRAFT, analysis.book)` → 빠진 게 있으면 `askText` + `step:"ask"`, 없으면 `confirmText(완성, isDuplicateTitle)` + `step:"confirm"`. `fixed()`로 팁 저장 문장을 붙이는 것은 그대로. 의도가 `book_add`가 아니면 `action` 없이 평소대로(받아 둔 초안은 버려진다).
  6. 맨 위 설명 주석에 교재 추가 흐름을 한 문장으로 더하고 "교재 추가는 정해진 문구" 표현을 고친다.
- [ ] **Step 2: `coach.ts`** — `BOOK_ADD_PENDING` 삭제. `USAGE_GUIDE`의 `- 교재와 시험일은…` 줄 앞에 `- 새 교재도 채팅으로 추가할 수 있어요. 예) 국어 봉투모의고사 20회분 추가해줘`.
- [ ] **Step 3: 확인** — `cd Backend; npm test`, `deno check supabase/functions/chat/index.ts supabase/functions/plan-generator/index.ts`. 보고서에 위 4·5의 분기마다 어느 코드 줄이 처리하는지 적는다.
- [ ] **Step 4: 커밋** — `feat: 채팅으로 교재 추가(확인 후 저장, 바로 재분배)`

---

### Task 6: 채팅 화면 확인 칩 (Subagent + 리뷰)

**Files:**
- Create: `Frontend/src/components/chat/ConfirmChips.tsx`
- Modify: `Frontend/src/interfaces/chat.ts`, `Frontend/src/api/chat.ts`, `Frontend/src/hooks/useChat.ts`, `Frontend/src/pages/ChatPage.tsx`, `DESIGN.md`

**Interfaces:**
- Consumes: Task 1 `database.ts`, Task 5 응답 모양
- Produces:
  - `interfaces/chat.ts`: `BookDraft`, `BookAddAction`, `ChatAction`(Task 3과 같은 모양, 과목은 `Subject`, 단위는 `BookUnit`), `ChatMessage.action: ChatAction | null`, `ChatRequest`(Task 3과 같은 합), `ChatResponse`에 `planChanged: boolean`, `replanFailed: boolean`
  - `api/chat.ts`: `fetchChatMessages`가 `action`도 읽는다. `sendChatMessage(content)`는 유지하고 `sendChatChoice(messageId: string, answer: 'yes' | 'no'): Promise<ChatResponse>` 추가(같은 오류 처리). `logged || planChanged`이면 `emitPlanChanged()`
  - `hooks/useChat.ts`: `ChatState.choose(messageId: string, answer: 'yes' | 'no'): Promise<boolean>` — `send`와 같은 임시 말풍선(내용 `응`/`아니`)·오류 처리. `replanFailed`이면 `regeneratePlan()`을 한 번 부르고 실패는 `console.error`만
  - `ConfirmChips`: props `onChoose(answer: 'yes' | 'no')`, `disabled: boolean`

- [ ] **Step 1: 타입·api·hook** — 위 Interfaces대로. 임시 메시지는 `action: null`.
- [ ] **Step 2: `ConfirmChips`** — 버튼 둘(`응`, `아니`), `type="button"`, `min-h-11 rounded-xl border border-line px-3`, `gap-2`, 코치 말풍선 아래 왼쪽 정렬. 보내는 동안 `disabled`(`disabled:opacity-40`). `ChipGroup`(radiogroup)은 쓰지 않는다.
- [ ] **Step 3: `ChatPage`** — 오늘 채팅방(`!readOnly`)이고, 목록의 마지막 메시지가 코치 메시지이며 `action?.step === 'confirm'`일 때만 그 말풍선 바로 아래에 `ConfirmChips`(`disabled={sending}`, `onChoose` → `choose(m.id, answer)`). 실패하면 `error` 문구는 `send`와 같다.
- [ ] **Step 4: DESIGN.md** — 1. 채팅 절에 "확인 칩" 항목(조건·모양·보내는 동안 막힘·지난 확인에는 없음, 다음 말풍선이 고른 답). "아직 남은 것"의 `채팅 안 빠른 응답 버튼` 줄은 "교재 추가 확인 칩은 있음, 그 밖의 빠른 응답은 아직"으로 고친다.
- [ ] **Step 5: 확인** — `cd Frontend; npm run lint; npm run format; npm run build` 통과. 실제 칩 동작은 Task 7에서 확인한다.
- [ ] **Step 6: 커밋** — `feat: 채팅 확인 칩(응/아니)`

---

### Task 7: 배포, 채팅 확인, 문서 (Native, ☁️)

**Files:**
- Modify: `SERVICE_FLOW.md`, `CLAUDE.md`

- [ ] **Step 1: ☁️ 배포** (사용자 승인 후) — `cd Backend; npx supabase functions deploy chat --use-api`, `npx supabase functions deploy plan-generator --use-api`
- [ ] **Step 2: 공부 설정 회귀 확인** — 사용자가 공부 설정에서 교재 진도를 저장해 재분배가 지금처럼 되는지 본다(진행자는 `function_logs`로 `plan-generator` 200 확인).
- [ ] **Step 3: 채팅 확인** (사용자가 브라우저 `npm run dev`에서, 진행자는 `function_logs`와 DB 조회로 확인. 확인용 교재는 끝나고 공부 설정에서 지운다)

| # | 보낼 말·누를 것 | 기대 |
|---|---|---|
| 1 | `영어 단어장 Day 60 추가해줘` | 되묻지 않고 확인 칩. `영어 · 단어장 · Day 60 · 1회독` |
| 2 | 1에서 `응` 칩 | `books` 한 줄(진도 1회독 0), 오늘의 분량 버튼에 새 교재, 답에 오늘 분량 |
| 3 | `국어 봉투모의고사 추가해줘` → `20회` | 단위·총량 되묻기 → 확인 칩 |
| 4 | 3에서 `아니` 칩 → `3회독이야` | 고치기 문구 → `… · 20회 · 3회독` 확인 칩 |
| 5 | 4에서 칩 대신 `네 추가해줘` 입력 | 응 칩과 같이 저장(분석 호출 로그 없음) |
| 6 | 확인 칩이 뜬 상태에서 다른 탭에서 `응` → 원래 탭에서 새로고침 없이 `응` | 두 번째는 끝난 확인 문구, `books` 한 줄만 |
| 7 | (시험일 없는 상태에서만, 없으면 생략) 1을 다시 | 교재 저장 + 시험일 안내 문구 |
| 8 | 확인 칩이 뜬 상태에서 `공중보건 공부법 알려줘` | 평소 답변, 칩 사라짐, 교재 저장 안 됨 |
| 9 | 확인 칩이 뜬 상태에서 새로고침 | 칩이 그대로 보인다 |

- [ ] **Step 4: 문서** — SERVICE_FLOW 6장(채팅 교재 추가 흐름: 되묻기 → 확인 칩 → 저장·재분배, 기본값, 채팅에서 받지 않는 항목, 확답 글, 상관없는 말이면 초안을 버림), "chat 의도별 처리" 표의 `book_add` 행. CLAUDE.md의 `chat` 설명에서 "일정 조정과 채팅 교재 추가는 안내만 한다"를 고치고 교재 추가 흐름 한 문장, `plan-generator` 설명에 "나누는 일은 `_shared/replan.ts`, `chat`도 교재 추가 뒤 같은 모듈을 부른다".
- [ ] **Step 5: 커밋** — `docs: 채팅 교재 추가 흐름 반영`
