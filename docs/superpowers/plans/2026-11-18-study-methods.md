# 공부법 DB와 코치 지식 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `docs/study-methods`의 공부법 정리본을 DB(`study_methods`)에 넣어 공부 설정 "과목별 공부법" 탭(과목 4개 + 멘탈관리)에 보이게 하고, 코치가 질문에 답할 때 해당 과목 공부법·멘탈·시간관리 지식과 채팅에서 저장한 "잘 맞은 방법"(`study_tips`)을 근거로 쓰게 한다.

**Architecture:**
- 원본은 문서다. `_shared/methods.ts`(순수 모듈)가 내용 파일을 섹션(목록 또는 두 칸 표)으로 파싱하고 내용 마이그레이션 SQL을 만든다. `npm run methods:migration`이 그 SQL을 새 마이그레이션 파일로 쓰고, `main` 병합 때 GitHub Actions가 운영에 반영한다.
- `chat`은 분석 호출 한 번에 `study_tip`·`knowledge`를 함께 받아 팁을 저장하고, 답변 호출에 필요한 지식만 넣는다. GPT 호출 수는 그대로다.
- 화면은 탭을 열 때 공부법 섹션(`time` 제외)과 내 팁을 읽어 아코디언으로 그린다. `**굵게**`, `==형광펜==`만 꾸밈으로 해석한다.

**Tech Stack:** Supabase(Postgres + RLS, Edge Functions/Deno), OpenAI Responses API(json_schema strict), Node `tsx` 스크립트, React 19 + Tailwind v4, Deno test. Frontend 테스트 도구는 없다.

**Spec:** [공부법 DB와 코치 지식 설계](../specs/2026-11-18-study-methods-db-design.md). 근거 원문은 [조사 문서](../../study-methods/research/2026-11-보건직-과목별-공부법.md).

## 이 계획에서 정한 것 (설계에 없던 것)

| 항목 | 결정 |
|---|---|
| 파서 위치 | `Backend/supabase/functions/_shared/methods.ts`. `npm test`(deno test)에 그대로 들어가고, 스크립트는 `plan-preview.ts`처럼 상대 경로로 import한다. `chat`도 같은 모듈의 타입·`stripMarks`·라벨을 쓴다 |
| DB의 `title` | 저장하지 않는다. 화면·코치는 `topic` 라벨(과목명, `멘탈관리`, `시간관리`)을 쓴다 |
| 중복 팁 | `study_tips`에 `unique nulls not distinct (user_id, subject, content)`. 넣다가 `23505`면 저장 안 한 것으로 본다 |
| 정해진 문구 답변 + 팁 | 정해진 문구(사용법, 교재 추가, 순공시간만, 순공시간 다시 묻기) 뒤에도 팁 저장 문장을 붙인다 |
| 팁 저장 문장 | `잘 맞은 방법은 {과목} 공부법에 적어 뒀어요.` / 과목 없음 `잘 맞은 방법은 공부법에 적어 뒀어요.` |
| 팁 표시 | 팁은 꾸밈을 해석하지 않고 글 그대로 그린다(LLM이 만든 문장) |
| 내용 마이그레이션 시점 | 정리본을 사용자가 읽고 고친 뒤에 만든다(Task 3). 고칠 때마다 마이그레이션이 쌓이지 않게 |

## Global Constraints

- 문서·화면 문구·프롬프트는 한국어 해요체([coach-tone](../../coach/coach-tone.md)). 재촉·비교·합격 단정 금지.
- `topic` 값: `korean`, `english`, `public_health`, `health_admin`, `mental`, `time`. 과목 4개는 `public.subject` enum과 같은 문자열. 라벨: 과목은 `SUBJECT_LABELS`, `mental` → `멘탈관리`, `time` → `시간관리`.
- 내용 파일: `korean.md`, `english.md`, `public-health.md`, `health-admin.md`, `mental.md`, `time.md`(모두 `docs/study-methods/`). 형식: `# 제목` 한 줄, `## 소제목` 섹션, 섹션 본문은 `- ` 목록 또는 두 칸 표 하나만, 꾸밈은 `**`·`==`만, 형광펜 파일당 최대 3곳.
- 팁 내용 1~200자(앞뒤 공백 제거 뒤). 코치에는 과목별 최근 5개.
- 화면에 "ENTJ"라는 말을 쓰지 않는다. `time`은 화면에서 읽지 않는다.
- GPT 비용 장치 유지: 메시지당 분석 1번 + 답변 1번, 다시 시도 없음, `reasoning: low`, 출력 상한 분석 1500·답변 2000.
- Frontend 의존 방향 `pages → hooks → api → libs`. DESIGN.md 토큰만, 새 색 토큰 없음, 형광펜은 기존 `marker` 유틸리티.
- ☁️ 단계(`db push`, `functions deploy`, `gen:types`)는 개발 프로젝트에만, 실행 전에 사용자 승인. 이미 반영된 마이그레이션은 고치지 않는다. 사용자 UUID·키는 파일·커밋·History에 적지 않는다.
- Task마다 `feature/study_knowledge`에 경로 지정 커밋, push 안 함, 커밋에 Claude 표시 줄 없음. History는 메인 세션이 [2026-11-18-공부법-채우기.md](../../../History/2026-11-18-공부법-채우기.md)에 Task별로 쌓는다.
- 범위 밖: 메모 입력, 팁 화면 입력·수정, 안 맞은 방법 저장, 앱 안 공부법 편집, 예/아니오 칩, 답변 속도 개선.

## Review Focus

1. **기분만 말한 메시지**("오늘 공부 잘 됐다") — 방법이 없으니 팁을 저장하지 않는다 → Task 4 프롬프트 문장, Task 6 채팅 확인 4
2. **같은 방법을 두 번 말함** — 한 번만 저장되고, 두 번째 답변은 "적어 뒀다"고 하지 않는다 → Task 1 SQL 확인 4·5, Task 6 채팅 확인 3
3. **공부법 표가 비어 있거나 읽기 실패**(내용 마이그레이션 전, 네트워크 오류) — 코치는 지식 없이 답하고, 탭은 과목마다 `공부법을 준비하고 있어요.` 또는 오류 문구를 보인다 → Task 5 `formatKnowledge([], [])` 테스트, Task 7 Step 3
4. **내용에 작은따옴표·`|`·백슬래시** — SQL이 깨지지 않고 원문 그대로 들어간다 → Task 2 `methodsMigrationSql` 테스트
5. **팁에 `==`, `**`, `<b>` 같은 글자** — 꾸밈·HTML로 해석되지 않고 글 그대로 보인다 → Task 7 Step 3(팁은 `MarkedText`를 쓰지 않음), `/ui` 예시

## 실행 방식

| Task | 방식 | 이유 |
|---|---|---|
| 1 | Native | ☁️ DB 반영과 SQL 확인 |
| 2 | Subagent + 리뷰 | 순수 로직, 테스트로 확인 |
| 3 | Native | 내용 작성은 판단이 필요하고 사용자 검토·☁️ 반영이 있다 |
| 4~5 | Subagent + 리뷰 | 순수 로직 |
| 6 | Native | 4~5를 묶고 ☁️ 배포·실제 채팅 확인 |
| 7 | Subagent + 리뷰 | 화면 작업 |
| 끝 | 계획 범위 리뷰(task-reviewer + code-reviewer, 같은 diff), 로드맵·README 정리 | |

---

### Task 1: `study_methods`, `study_tips` 스키마 (Native, ☁️)

**Files:**
- Create: `Backend/supabase/migrations/<타임스탬프>_study_methods.sql` (`npx supabase migration new study_methods`)
- Modify: `Frontend/src/interfaces/database.ts` (`npm run gen:types`)
- 커밋 안 함: `<스크래치패드>/study_methods_check.sql`

**Interfaces:**
- Produces:
  - `public.study_methods(topic text, position smallint, heading text, kind text, items jsonb)`, 기본 키 `(topic, position)`. check: `topic in (6개)`, `position > 0`, `char_length(heading) between 1 and 100`, `kind in ('list','pairs')`, `jsonb_typeof(items) = 'array'`. RLS 켜기, 정책 `"read for signed in"` `for select to authenticated using (true)`. `anon`의 모든 권한과 `authenticated`의 insert·update·delete·truncate 권한 회수.
  - `public.study_tips(id uuid default gen_random_uuid() primary key, user_id uuid not null → auth.users on delete cascade, subject public.subject null, content text not null check (char_length(content) between 1 and 200), source_message_id uuid → public.chat_messages on delete set null, created_at timestamptz default now())`, `unique nulls not distinct (user_id, subject, content)`, 인덱스 `(user_id, subject, created_at desc)`, RLS `"own rows"`(다른 테이블과 같은 `using`·`with check`).
  - 테이블마다 한국어 `comment on table`. `study_methods` 주석에 "쓰기는 npm run methods:migration이 만든 마이그레이션으로만".

- [ ] **Step 1: 확인 SQL 쓰기** — 묶음 C `chat_db_check.sql`과 같은 틀(`begin; … rollback;`, `set local role authenticated`, `request.jwt.claims`, 경우마다 `do $$ … assert … $$`, 마지막 `select 'ok';`).

| # | 하는 일 | 기대 |
|---|---|---|
| 1 | `select count(*) from public.study_methods` | 오류 없음 |
| 2 | `insert into public.study_methods …` | SQLSTATE `42501` |
| 3 | 팁 `(public_health, '기출 풀고 바로 백지 복기하기')` 넣기 | 성공 |
| 4 | 3과 같은 값 한 번 더 | `23505` |
| 5 | `subject null`, 같은 내용 두 번 | 두 번째 `23505` |
| 6 | `content ''`, 201자 | 둘 다 `23514` |
| 7 | 가짜 사용자로 바꿔 `select count(*) from public.study_tips` | 0 |

- [ ] **Step 2: 실패 확인** — `cd Backend; npx supabase db query --linked -f <스크래치패드>/study_methods_check.sql` → FAIL `relation "public.study_methods" does not exist`
- [ ] **Step 3: 마이그레이션 쓰기** — 위 Produces 그대로.
- [ ] **Step 4: ☁️ 반영과 통과 확인** (사용자 승인 후) — `npx supabase db push --dry-run`(이 파일 하나) → `db push --yes` → Step 2 명령 → `ok`. `get_advisors`(security) 새 경고 없음.
- [ ] **Step 5: 타입과 커밋** — `npm run gen:types`, `cd ../Frontend; npm run build` 통과.

```bash
git add Backend/supabase/migrations/<타임스탬프>_study_methods.sql Frontend/src/interfaces/database.ts
git commit -m "feat: 공부법 내용과 잘 맞은 방법 테이블"
```

---

### Task 2: 공부법 문서 파서와 내용 마이그레이션 생성 (Subagent + 리뷰)

**Files:**
- Create: `Backend/supabase/functions/_shared/methods.ts`, `Backend/supabase/functions/_shared/methods_test.ts`, `Backend/scripts/study-methods-migration.ts`
- Modify: `Backend/package.json`(`"methods:migration": "tsx scripts/study-methods-migration.ts"`), `docs/study-methods/README.md`(형식·반영 방법 절), `CLAUDE.md`(Backend 명령어에 한 줄, 구조의 `scripts/` 설명에 "공부법 내용 마이그레이션")

**Interfaces:**
- Produces (`_shared/methods.ts`, OpenAI·Supabase import 없음):
  - `export const METHOD_TOPICS = ["korean", "english", "public_health", "health_admin", "mental", "time"] as const;` `export type MethodTopic`
  - `export const METHOD_TOPIC_LABELS: Record<MethodTopic, string>` (과목은 `SUBJECT_LABELS`, `멘탈관리`, `시간관리`)
  - `export const METHOD_FILES: Record<MethodTopic, string>` (`public-health.md`, `health-admin.md` 등)
  - `export interface MethodPair { label: string; text: string }`
  - `export type MethodSection = { heading: string; kind: "list"; items: string[] } | { heading: string; kind: "pairs"; items: MethodPair[] };`
  - `export interface MethodDoc { topic: MethodTopic; sections: MethodSection[] }`
  - `export const MAX_HIGHLIGHTS = 3;`
  - `export class MethodDocError extends Error` — `constructor(file: string, line: number, reason: string)`, 메시지 `${file}:${line} ${reason}`
  - `export function parseMethodDoc(topic: MethodTopic, file: string, markdown: string): MethodDoc` — 형식이 틀리면 `MethodDocError`
  - `export function methodsMigrationSql(docs: MethodDoc[]): string`
  - `export function stripMarks(text: string): string`

파싱 규칙: 빈 줄은 건너뛴다. 처음 내용 줄은 `# `여야 한다(한 번만). `## `가 섹션을 연다. 섹션 안 `- `는 목록 항목, `|`로 시작하는 줄은 표(첫 줄 머리글, 둘째 줄 `|---|---|` 구분선은 버림, 나머지는 칸 2개). 그 밖의 줄(문단, `>`, `###`, 들여쓴 `- `, 칸 3개 표)은 오류. 한 섹션에 목록과 표를 섞으면 오류. 항목이 없는 섹션, 섹션 없는 문서는 오류. 한 항목 안에 `**`나 `==` 개수가 홀수면 오류. 파일 전체 `==…==` 쌍이 3개를 넘으면 오류(줄 번호는 4번째 형광펜 줄). 항목·칸은 앞뒤 공백을 다듬는다.

- [ ] **Step 1: 실패하는 테스트 쓰기** (`methods_test.ts`)

```ts
const DOC = `# 공중보건

## 과목 특징
- 같은 주제가 되풀이돼요. ==반복 출제는 무실점==
- **역학은 매년** 나와요

## 고민별 처방
| 고민 | 처방 |
|---|---|
| 외울 게 많음 | 기출 표부터 |
`;

Deno.test("parseMethodDoc: 목록과 두 칸 표를 순서대로", () => {
  assertEquals(parseMethodDoc("public_health", "public-health.md", DOC), {
    topic: "public_health",
    sections: [
      { heading: "과목 특징", kind: "list", items: ["같은 주제가 되풀이돼요. ==반복 출제는 무실점==", "**역학은 매년** 나와요"] },
      { heading: "고민별 처방", kind: "pairs", items: [{ label: "외울 게 많음", text: "기출 표부터" }] },
    ],
  });
});
```

오류 테스트(각각 `assertThrows(…, MethodDocError, "<파일>:<줄>")`로 줄 번호까지):
- `"문단 줄은 오류"` — `## 과목 특징` 아래 `그냥 문장` → 그 줄 번호
- `"형광펜 4곳은 오류"` — `==a==` 네 항목 → 4번째 줄
- `"짝 안 맞는 꾸밈은 오류"` — `- ==반쯤` 
- `"목록과 표를 섞으면 오류"`, `"빈 섹션은 오류"`, `"# 제목 없으면 오류"`, `"칸 3개 표는 오류"`
- `stripMarks("**역학** ==무실점== 그대로")` → `"역학 무실점 그대로"`
- `methodsMigrationSql`:
  - `"delete 뒤 insert, position은 1부터"` — 결과가 `delete from public.study_methods;`로 시작(주석 줄 뒤), `('public_health', 1, '과목 특징', 'list', '[...]'::jsonb)` 포함
  - `"작은따옴표·|·백슬래시 이스케이프"` — 항목 `수험생's | a\\b` → SQL 안 `''` 로, `JSON.parse`로 되돌리면 원문과 같음
  - `"topic 6개가 모두 한 번씩 없으면 오류"` — 5개만 주면 `Error`

- [ ] **Step 2: 실패 확인** — `cd Backend; npm test` → FAIL (`methods.ts` 없음)
- [ ] **Step 3: `methods.ts` 구현** — SQL은 문자열 리터럴(작은따옴표 두 번)에 `JSON.stringify(items)`를 넣고 `::jsonb`. 맨 위 주석 두 줄: `-- 자동 생성: npm run methods:migration (docs/study-methods). 직접 고치지 않는다.` / `-- 공부법 내용을 통째로 바꾼다.`
- [ ] **Step 4: 통과 확인** — `npm test` 모두 통과, `deno check supabase/functions/_shared/methods.ts`
- [ ] **Step 5: 스크립트** — `study-methods-migration.ts`: 저장소 루트 `docs/study-methods/`에서 `METHOD_FILES`를 읽어 파싱 → `supabase/migrations/<UTC YYYYMMDDHHmmss>_study_methods_content.sql`을 쓰고 경로를 출력. 오류면 `MethodDocError` 메시지를 `console.error`하고 `process.exit(1)`, 파일은 쓰지 않는다. 지금은 내용 파일이 형식에 맞지 않으므로 실행 결과가 오류(첫 파일의 `(초안)`·`>` 줄)인지 확인한다.
- [ ] **Step 6: 문서** — README에 "앱 반영" 절: 형식 규칙(Global Constraints 그대로), 흐름(문서 수정 → `npm run methods:migration` → SQL 확인·커밋 → `db push`(개발, 요청 시) → `main` 병합 시 운영), 배포된 내용 마이그레이션은 고치지 않는다. CLAUDE.md 명령어 줄.
- [ ] **Step 7: 커밋**

```bash
git add Backend/supabase/functions/_shared/methods.ts Backend/supabase/functions/_shared/methods_test.ts Backend/scripts/study-methods-migration.ts Backend/package.json docs/study-methods/README.md CLAUDE.md
git commit -m "feat: 공부법 문서 파서와 내용 마이그레이션 생성 스크립트"
```

---

### Task 3: 공부법 정리본 작성과 DB 반영 (Native, ☁️)

**Files:**
- Modify: `docs/study-methods/korean.md`, `english.md`, `public-health.md`, `health-admin.md`, `README.md`, `docs/coach/coach-tone.md`, `docs/coach/coach-tone-examples.md`
- Create: `docs/study-methods/mental.md`, `docs/study-methods/time.md`, `Backend/supabase/migrations/<타임스탬프>_study_methods_content.sql`(스크립트가 만듦)

**Interfaces:**
- Consumes: Task 2의 형식 규칙과 `npm run methods:migration`
- Produces: DB `study_methods`에 6개 topic의 섹션. `coach-tone.md`의 "힘들 때 말하는 방식" 절(Task 5 `HARD_TIMES_INSTRUCTIONS`의 원본)

- [ ] **Step 1: 과목 4개 정리본** — 섹션 `과목 특징` / `단계별 공부법`(표: `기본`·`기출`·`실전`·`마무리`) / `고민별 처방`(표). 영어만 `하루 공부 예시`(목록). 조사 문서에서 옮기는 규칙은 설계 "내용 작성 규칙" 그대로: [확인] 단정, [추정] 단정하지 않는 말, [미확인] 빼기, 날짜는 시험일 기준, 강사·학원·교재 이름 없음, "초반 한 과목 집중"은 "매일 모든 과목 + 약한 과목에 추가 시간"으로. `(초안)`·`✏️`·출처 링크 없음. 형광펜은 파일당 1~3곳, 그 과목에서 가장 중요한 원칙·주제에.
- [ ] **Step 2: `mental.md`** — 섹션 `점수가 떨어졌을 때`, `공부가 손에 안 잡힐 때`, `불안하고 비교될 때`, `몸과 리듬`, `시험 직전`. 섹션마다 목록 2~4개를 현실 → 방향 → 가능성 → 바로 할 해결책 순서로, 위로로 시작하지 않고 응원은 끝에 짧게 한 번까지. 근거는 조사 문서 Part 3와 장기화 패턴. "2주 이상 무기력·수면 문제가 이어지면 주변과 전문 상담에 도움을 구한다"를 꼭 넣는다.
- [ ] **Step 3: `time.md`** — README의 `학습 단계 (공통)`·`공통 원칙`을 옮기고(표 → 두 칸 표, 문단 → 목록) 조사 문서 Part 2(분량 기준 계획, 주 1일 휴식, 인출·분산, 회독 간격, 직장 병행, 시험 당일 110분)를 더한다. README에서는 옮긴 두 절을 지우고 "공부법을 제안하는 순서"·"주의"·파일 표(멘탈·시간 추가)를 남긴다.
- [ ] **Step 4: 코치 톤** — `coach-tone.md`에 "힘들 때 말하는 방식" 절: 적용 범위(멘탈관리 탭, 점수 하락·지침·불안 답변), 순서(현실 확인 → 방향 → 가능성(기록 근거) → 바로 할 행동 하나 → 짧은 응원), 이유(사용자가 ENTJ 성향이라 방향·현실·해결책이 꼭 필요하다는 요청, 2026-11-18, 모두에게 같게 적용). 상황별 패턴 표의 "성적 고민·공부법 질문" 줄에 이 절 링크. `coach-tone-examples.md`에 좋은 예·나쁜 예 한 쌍.
- [ ] **Step 5: 형식 확인** — `cd Backend; npm run methods:migration` 실행이 통과하는지 보고, 만들어진 파일은 지운다(아직 커밋하지 않음).
- [ ] **Step 6: 사용자 검토** — 6개 파일을 사용자에게 보여 주고 고칠 곳을 받는다. 고친 뒤 Step 5 다시.
- [ ] **Step 7: 마이그레이션 생성과 ☁️ 반영** (사용자 승인 후) — `npm run methods:migration` → `db push --dry-run`(이 파일 하나) → `db push --yes` → `npx supabase db query --linked "select topic, count(*) from public.study_methods group by topic order by topic"` → 6줄, 각 1 이상.
- [ ] **Step 8: 커밋**

```bash
git add docs/study-methods docs/coach Backend/supabase/migrations/<타임스탬프>_study_methods_content.sql
git commit -m "docs: 공부법 정리본(과목·멘탈·시간관리)과 DB 내용 반영"
```

---

### Task 4: 분석에 잘 맞은 방법과 필요한 지식 더하기 (Subagent + 리뷰)

**Files:**
- Modify: `Backend/supabase/functions/chat/analysis.ts`, `analysis_test.ts`, `llm.ts`(분석 지침 문장만)

**Interfaces:**
- Produces (`analysis.ts`):
  - `export const KNOWLEDGE = ["mental", "time"] as const;` `export type Knowledge`
  - `export interface StudyTip { subject: Subject | null; content: string }`
  - `Analysis`에 `studyTip: StudyTip | null`, `knowledge: Knowledge[]`
  - `export const MAX_TIP_LENGTH = 200;`
  - `ANALYSIS_SCHEMA`에 `study_tip`(`type: ["object","null"]`, `subject`는 과목 enum + null, `content` string, 둘 다 required, `additionalProperties: false`)와 `knowledge`(`type: "array"`, items enum `KNOWLEDGE`). 둘 다 최상위 `required`에.

- [ ] **Step 1: 실패하는 테스트 쓰기** (기존 `parseAnalysis` 테스트 옆, 기존 입력에는 `study_tip: null, knowledge: []`를 더한다)
  - `"study_tip: 과목과 내용"` — `{ subject: "public_health", content: " 기출 풀고 바로 백지 복기하기 " }` → `{ subject: "public_health", content: "기출 풀고 바로 백지 복기하기" }`
  - `"study_tip: 과목이 없으면 메시지 과목"` — 최상위 `subject: "english"`, 팁 `subject: null` → 팁 과목 `"english"`. 최상위도 null이면 null
  - `"study_tip: 잘못된 과목은 메시지 과목"` — 팁 `subject: "math"` → 메시지 과목
  - `"study_tip: 빈 내용·201자·객체 아님은 null"` — `"   "`, `"가".repeat(201)`, `"문자열"` → `null`; `"가".repeat(200)` → 저장
  - `"knowledge: 모르는 값 빼고 중복 없이 정해진 순서"` — `["time", "mental", "mental", "x"]` → `["mental", "time"]`; 없거나 배열 아니면 `[]`
  - `"study_tip은 intent를 바꾸지 않는다"` — `intent: "study_log"`, entry 하나 + 팁 → intent `study_log`, entries 1, 팁 있음
- [ ] **Step 2: 실패 확인** — `cd Backend; npm test` → FAIL
- [ ] **Step 3: 구현** — `parseAnalysis`에 `parseStudyTip(v, messageSubject)`, `parseKnowledge(v)`.
- [ ] **Step 4: 분석 지침 문장** (`llm.ts` `analysisInstructions`, study_time 설명 뒤):

```
study_tip: 수험생이 자기에게 잘 맞았던 공부 방식을 말했을 때만 채운다. 없으면 null.
- content는 그 방식을 한 문장(200자 이내)으로 다듬는다. 예: "기출 풀고 바로 백지에 써 보니까 잘 외워졌어" → "기출을 풀고 바로 백지 복기하기"
- "오늘 공부 잘 됐다"처럼 방식이 없는 말, 분량 보고만 있는 말, 안 맞았던 방식은 null.
- subject는 그 방식이 해당하는 과목, 과목과 상관없으면 null.

knowledge: 답변에 필요한 참고 지식. 해당하는 것만, 없으면 빈 배열.
- mental: 점수 하락, 지침, 불안, 슬럼프, 비교, 시험 직전 긴장
- time: 시간 배분, 하루·주간 루틴, 휴식, 직장 병행, 시험 당일 시간 운영
```

- [ ] **Step 5: 통과 확인** — `npm test`, `deno check supabase/functions/chat/index.ts`
- [ ] **Step 6: 커밋** — `git add Backend/supabase/functions/chat/analysis.ts Backend/supabase/functions/chat/analysis_test.ts Backend/supabase/functions/chat/llm.ts` / `feat: 채팅 분석에 잘 맞은 방법과 필요한 지식`

---

### Task 5: 코치 지식 글과 답변 지침 (Subagent + 리뷰)

**Files:**
- Create: `Backend/supabase/functions/chat/knowledge.ts`, `knowledge_test.ts`
- Modify: `Backend/supabase/functions/chat/reply.ts`, `reply_test.ts`, `Backend/supabase/functions/_shared/coach.ts`

**Interfaces:**
- Consumes: Task 2 `MethodTopic`, `MethodSection`, `METHOD_TOPIC_LABELS`, `stripMarks`; Task 4 `Intent`, `Knowledge`, `StudyTip`
- Produces:
  - `knowledge.ts`:
    - `export type KnowledgeSection = MethodSection & { topic: MethodTopic };`
    - `export const TIP_LIMIT = 5;`
    - `export function knowledgeTopics(intent: Intent, subject: Subject | null, knowledge: Knowledge[]): MethodTopic[]` — `question`이고 과목이 있으면 `[subject, ...knowledge]`, 그 밖에는 `[...knowledge]`(usage·book_add·study_time만은 답변 호출이 없어 상관없음)
    - `export function loadsTips(intent: Intent): boolean` — `question`일 때만 true
    - `export function formatKnowledge(sections: KnowledgeSection[], tips: string[]): string` — 둘 다 비면 `""`
  - `reply.ts`:
    - `export interface ReplyOptions { savedStudyTime: string | null; hasKnowledge: boolean; hasTips: boolean; hardTimes: boolean; savedTip: StudyTip | null }`
    - `export function replyInstructions(intent: Intent, options: ReplyOptions): string` (기존 두 번째 인자를 바꾼다)
    - `export function tipSavedReply(subject: Subject | null): string`
    - `fallbackReply(recorded, ctx, savedTime = null, savedTip: StudyTip | null = null): string`
  - `_shared/coach.ts`: `export const HARD_TIMES_INSTRUCTIONS: string`, `USAGE_GUIDE`에 한 줄

- [ ] **Step 1: 실패하는 테스트 쓰기**
  - `knowledgeTopics("question", "english", ["mental"])` → `["english", "mental"]`; `("question", null, [])` → `[]`; `("study_log", "english", [])` → `[]`; `("schedule", null, ["time"])` → `["time"]`
  - `formatKnowledge`: 섹션 `{ topic: "public_health", heading: "고민별 처방", kind: "pairs", items: [{ label: "외울 게 많음", text: "==기출 표==부터" }] }`와 팁 `["백지 복기하기"]` →

```
[공중보건 공부법]
고민별 처방
- 외울 게 많음: 기출 표부터

[이 수험생에게 잘 맞았던 방법]
- 백지 복기하기
```
  (topic이 바뀔 때마다 `[{라벨} 공부법]`, `mental`은 `[멘탈관리]`, `time`은 `[시간관리]`, 블록 사이 빈 줄 하나). `formatKnowledge([], [])` → `""`
  - `tipSavedReply("public_health")` → `잘 맞은 방법은 공중보건 공부법에 적어 뒀어요.`, `tipSavedReply(null)` → `잘 맞은 방법은 공부법에 적어 뒀어요.`
  - `replyInstructions`: `hasKnowledge`면 `아래 공부법은 참고 자료다. 질문에 맞는 것 1~2개만 고르고, 통째로 옮기지 않는다. 출처나 강사 이름을 말하지 않는다.` 포함, `hasTips`면 `이 수험생에게 잘 맞았던 방법이다. 맞으면 먼저 이걸 살려서 제안한다.`, `hardTimes`면 `HARD_TIMES_INSTRUCTIONS`, `savedTip`이면 `이번 메시지의 방법을 '공중보건 공부법'에 적어 뒀다. 한 문장으로 알려 준다.`(과목 없으면 `'공부법'`). 모두 false·null이면 지금 결과와 같음(기존 테스트를 새 인자로 고쳐 유지)
  - `fallbackReply`: 기록 있음 + 팁 → 기존 문장 뒤에 ` 잘 맞은 방법은 …에 적어 뒀어요.`; 기록 없음 + 팁 → `잘 맞은 방법은 …에 적어 뒀어요. 질문 답변은 지금 만들지 못했어요. 잠시 후 다시 물어봐 주세요.`
- [ ] **Step 2: 실패 확인** — `npm test` → FAIL
- [ ] **Step 3: 구현** — `HARD_TIMES_INSTRUCTIONS`는 coach-tone.md "힘들 때 말하는 방식"(Task 3 Step 4)을 요약: `수험생이 점수 하락, 지침, 불안을 말하면 위로로 시작하지 않는다. 기록의 수치로 지금 현실을 짚고, 방향을 한 문장으로 정하고, 기록이나 공부법을 근거로 가능성을 보여 준 뒤, 오늘 바로 할 행동 하나를 제안한다. 응원은 끝에 짧게 한 번만 한다. 2주 이상 무기력이나 수면 문제가 이어진다고 하면 주변이나 전문 상담에 도움을 구하라고 권한다.` `USAGE_GUIDE`의 `- 공부법이나 성적 고민도…` 다음 줄: `- 잘 맞은 공부법을 말해 주면 공부 설정의 과목별 공부법에 모아 둬요. 예) 기출 풀고 바로 백지 복기하니까 잘 외워졌어`
- [ ] **Step 4: 통과 확인** — `npm test`, `deno check supabase/functions/chat/index.ts`(llm.ts의 `replyInstructions` 호출은 Task 6에서 바꾸므로 여기서는 `{ savedStudyTime, hasKnowledge: false, hasTips: false, hardTimes: false, savedTip: null }`로 맞춰 둔다)
- [ ] **Step 5: 커밋** — `feat: 코치 지식 글과 잘 맞은 방법 답변 문구`

---

### Task 6: `chat` 연결과 배포 (Native, ☁️)

**Files:**
- Modify: `Backend/supabase/functions/chat/db.ts`, `index.ts`, `llm.ts`, `SERVICE_FLOW.md`, `CLAUDE.md`(chat 설명)

**Interfaces:**
- Consumes: Task 4·5 전부
- Produces (`db.ts`):
  - `export async function insertStudyTip(sb, userId: string, tip: StudyTip, messageId: string): Promise<boolean>` — `23505`면 false, 그 밖 오류는 throw
  - `export async function loadKnowledge(sb, topics: MethodTopic[], tipSubject: Subject | null, withTips: boolean): Promise<{ sections: KnowledgeSection[]; tips: string[] }>` — 섹션은 `.in("topic", topics)` 후 `topics` 순서·`position` 순으로 정렬(topics가 비면 조회하지 않음), 팁은 `withTips`일 때 과목 `eq`(null이면 `.is("subject", null)`) `created_at desc` `limit(TIP_LIMIT)`

- [ ] **Step 1: `index.ts`** — 사용자 메시지를 넣고 기록·순공시간 저장 뒤 `analysis.studyTip`이 있으면 `insertStudyTip`(try/catch, 실패는 `console.error({ call: "tip" })` 후 저장 안 함). 저장됐을 때만 `savedTip`. `buildReply`: 정해진 문구를 돌려주는 네 곳(순공시간 다시 묻기, 사용법, 교재 추가, 순공시간만)은 `savedTip`이면 `\n${tipSavedReply(subject)}`를 붙인다. 답변 호출 경로는 `loadCoachContext`·`loadTodayHistory`와 함께 `loadKnowledge(...).catch(() => 빈 값)`(실패는 로그, 지식 없이 답함). `generateReply`에 `knowledge: string`과 `ReplyOptions`(`hardTimes = analysis.knowledge.includes("mental")`)를 넘기고, `fallbackReply`에 `savedTip`.
- [ ] **Step 2: `llm.ts` `generateReply`** — 지침 끝(공부 현황 뒤)에 지식이 있으면 `\n\n아래는 참고할 공부법이다.\n${knowledge}`.
- [ ] **Step 3: 확인** — `npm test`, `deno check supabase/functions/chat/index.ts`
- [ ] **Step 4: ☁️ 배포** (사용자 승인 후) — `npx supabase functions deploy chat --use-api`
- [ ] **Step 5: 채팅 확인** (사용자가 브라우저에서, 진행자는 `function_logs`와 DB 조회로 확인)

| # | 보낼 말 | 기대 |
|---|---|---|
| 1 | `공중보건 점수가 계속 떨어져서 힘들어` | 공중보건 공부법 + 힘들 때 말하는 방식 순서, 근거 없는 수치 없음 |
| 2 | `기출 풀고 바로 백지 복기하니까 잘 외워졌어` | `study_tips` 한 줄, 답변에 적어 뒀다는 문장 |
| 3 | 2를 한 번 더 | 줄 그대로, "적어 뒀다" 없음 |
| 4 | `오늘 공부 잘 됐다` | 팁 없음 |
| 5 | `하루 시간 배분을 어떻게 해야 해?` | 시간관리 근거 답변 |
| 6 | `보건행정 15강까지 했고 비교표로 정리하니 잘 들어왔어` | 기록 + 보건행정 팁 둘 다 |

- [ ] **Step 6: 문서** — SERVICE_FLOW 3장(공부법 지식과 잘 맞은 방법을 근거로), chat 의도별 처리 표에 "잘 맞은 방법 공유 → `study_tips`(intent와 상관없이)". CLAUDE.md `chat` 설명에 같은 내용 한 문장.
- [ ] **Step 7: 커밋** — `feat: 채팅에서 잘 맞은 방법 저장과 공부법 지식으로 답변`

---

### Task 7: 공부 설정 "과목별 공부법" 탭 (Subagent + 리뷰)

**Files:**
- Create: `Frontend/src/interfaces/studyMethod.ts`, `Frontend/src/api/studyMethods.ts`, `Frontend/src/hooks/useStudyMethods.ts`, `Frontend/src/libs/marks.ts`, `Frontend/src/components/settings/StudyMethodsPanel.tsx`, `MethodSectionView.tsx`, `MarkedText.tsx`, `StudyTipList.tsx`
- Modify: `Frontend/src/pages/SettingsPage.tsx:306-326`, `Frontend/src/pages/UiCatalogPage.tsx`, `DESIGN.md`

**Interfaces:**
- Consumes: Task 1 테이블(`database.ts` 타입)
- Produces:
  - `interfaces/studyMethod.ts`: `StudyMethodTopic = Subject | 'mental'`, `StudyMethodPair { label; text }`, `StudyMethodSection`(`topic`, `position`, `heading`, 그리고 `kind: 'list'`·`items: string[]` 또는 `kind: 'pairs'`·`items: StudyMethodPair[]`), `StudyTip { id; subject: Subject | null; content; created_at }`
  - `api/studyMethods.ts`: `fetchStudyMethodSections(): Promise<StudyMethodSection[]>`(`.neq('topic', 'time')`, `topic`·`position` 순), `fetchStudyTips(): Promise<StudyTip[]>`(최신순), `deleteStudyTip(id: string): Promise<void>`
  - `hooks/useStudyMethods.ts`: `StudyMethodsState { sections; tips; loading; error: string | null; removeTip: (id: string) => Promise<boolean> }`
  - `libs/marks.ts`: `MarkSegment { text: string; mark: 'plain' | 'bold' | 'highlight' }`, `parseMarks(text: string): MarkSegment[]` — 짝이 없는 `**`·`==`는 글 그대로

- [ ] **Step 1: api·hook·libs** — CONVENTIONS 3.5·3.6 패턴(`useMockExams`처럼 마운트 때 두 조회를 `Promise.all`, `ignore` 플래그). `removeTip`은 성공하면 목록에서 빼고 true, 실패하면 `error`에 `지우지 못했어요. 다시 눌러 주세요.`, false.
- [ ] **Step 2: 컴포넌트**
  - `MarkedText`: `parseMarks` 조각을 `bold` → `<strong className="font-semibold">`, `highlight` → `<mark className="marker bg-transparent text-inherit">`, `plain` → 글. HTML로 해석하지 않는다.
  - `MethodSectionView`: 소제목 `text-sm font-semibold`, `list`는 점 목록, `pairs`는 정의 목록(`dl`, 줄마다 `dt` 굵게 + `dd`)으로 폰 폭에서도 표가 좁아지지 않게.
  - `StudyTipList`: 소제목 `내게 잘 맞은 방법`, 줄마다 내용(글 그대로) + `M/D`(`text-xs text-muted`) + `IconButton`(`aria-label="{내용} 지우기"`) → `useConfirm({ title: '이 방법을 지울까요?', message: 내용, confirmLabel: '지우기', tone: 'danger' })`. 비면 `채팅에서 "이렇게 하니 잘 됐어"라고 말해 주면 여기에 모아 둘게요.`(`text-sm text-muted`).
  - `StudyMethodsPanel`(`useStudyMethods`를 부르는 곳, 탭을 열 때 마운트): `Disclosure` 순서 국어, 영어, 공중보건, 보건행정, 과목 공통(과목 null 팁이 있을 때만, 팁 목록만), 멘탈관리(팁 목록 없음). 과목 아코디언 = 섹션들 + `StudyTipList`. 섹션이 없는 topic은 `공부법을 준비하고 있어요.`(`Notice`). 불러오는 중 `Notice`(`불러오는 중…`), 조회 실패 `Notice tone="error"`(`공부법을 불러오지 못했어요. 잠시 후 다시 열어 주세요.`). 아코디언은 `divide-y divide-line`, 처음엔 모두 닫힘.
- [ ] **Step 3: 페이지** — `SettingsPage`의 methods 탭 블록을 `<StudyMethodsPanel />`로 바꾸고, 메모 `TextArea`·준비 중 안내와 TODO 주석을 지운다(안 쓰는 import 정리).
- [ ] **Step 4: `/ui` 예시** — `MarkedText`(굵게·형광펜·짝 없는 `==`), `MethodSectionView` list·pairs 한 개씩, 팁에 `==`·`<b>`가 든 예.
- [ ] **Step 5: DESIGN.md** — 공부 설정 "과목별 공부법" 설명(아코디언 순서, 섹션 모양, 내게 잘 맞은 방법, 과목 공통, 빈·오류 문구), 형광펜 규칙에 예외 한 줄(공부법 문서마다 최대 3곳, 한 번에 한 아코디언), 화면 그림의 `기본 공부법 ...` 부분, 메모 관련 줄(현재 "준비 중", "메모를 저장할 곳이 없다", "아직 남은 것"의 공부법 구성)을 지우거나 고친다.
- [ ] **Step 6: 확인** — `cd Frontend; npm run lint; npm run format; npm run build` 통과. `npm run dev`로 폰 폭(360px)·라이트·다크에서 탭 열기, 형광펜, 팁 지우기(확인 창 → 사라짐) 확인(개발 DB에 Task 3 내용과 Task 6 팁이 있다).
- [ ] **Step 7: 커밋** — `feat: 과목별 공부법 탭에 공부법·멘탈관리·잘 맞은 방법`

---

### 끝: 계획 범위 리뷰와 정리 (메인 세션)

- [ ] task-reviewer + code-reviewer에게 `git diff develop...HEAD`를 같은 diff 파일로 동시에 맡긴다. 지적은 implementer가 고치고 재리뷰.
- [ ] 로드맵 2.1: 메모 테이블 → 잘 맞은 방법(`study_tips`), 완료 기준 "공부 설정에 공부법이 보이고, 코치가 공부법과 잘 맞은 방법을 근거로 답한다"로, 상세 계획 링크. 루트 README 주요 기능 표의 AI 코치 줄 상태.
- [ ] History에 Task별 결과·리뷰를 정리하고 커밋. push·`develop` 병합은 사용자 요청 때.
