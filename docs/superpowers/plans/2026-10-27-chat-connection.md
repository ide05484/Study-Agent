# 채팅 연결 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로그인한 사용자가 오늘 채팅방에 메시지를 보내면 Edge Function `chat`이 의도를 분류해 학습 기록을 저장·반영하고, 코치 말투로 데이터에 근거한 답을 돌려준다.

**Architecture:** `chat`은 (1) LLM으로 메시지를 분석(의도 + 학습 기록 구조화)하고, (2) 결정적 코드로 `study_logs`·`books.current_page`·오늘 `daily_tasks.status`를 갱신한 뒤, (3) DB에서 모은 코치 컨텍스트로 LLM 답변을 만든다. 순수 로직(분석 결과 검증, 진도 계산, 컨텍스트 문장화, 대체 답변)은 OpenAI·Supabase를 import하지 않는 파일에 두어 `deno test`로 검증한다. 프론트엔드는 카카오 로그인(Supabase Auth Kakao provider)으로 세션을 만들고, 기존 `useChat`에 낙관적 표시와 오늘의 분량 새로고침을 더한다. 카카오 키가 오기 전에는 화면에 없는 검증용 테스트 계정으로 API만 확인한다.

**Tech Stack:** Supabase(Postgres + RLS, Auth + Kakao provider, Edge Functions/Deno, `@supabase/server`), OpenAI Responses API(`text.format` json_schema), React 19 + React Router 8 + Tailwind v4, Deno test(npm `deno` 패키지).

**Spec:** [SERVICE_FLOW.md](../../../SERVICE_FLOW.md) (2.1, 3, 5, 7, chat 의도별 처리), [DESIGN.md](../../../DESIGN.md) (채팅 화면, 컴포넌트 메모), [docs/coach/coach-tone.md](../../coach/coach-tone.md), 로드맵 [2026-10-27-roadmap.md](2026-10-27-roadmap.md)

## Global Constraints

- 문서·화면 문구·프롬프트는 한국어. 화면 문구와 코치 답변은 coach-tone.md의 해요체를 따른다.
- 과목 값은 `korean`, `english`, `public_health`, `health_admin`만 쓴다(`_shared/subjects.ts`의 `SUBJECT_LABELS`).
- 날짜 키는 `profiles.timezone`(기본 `Asia/Seoul`) 기준 `YYYY-MM-DD`. `study_logs.study_date`는 DB 기본값(`current_date`, UTC)에 맡기지 말고 항상 명시한다.
- Frontend 의존 방향 `pages → hooks → api → libs`, 타입은 `interfaces/`. 페이지에서 Supabase를 직접 부르지 않는다.
- 색상은 DESIGN.md 토큰 클래스만, 클래스 이름 문자열 이어 붙이기 금지.
- LLM 모델은 `_shared/openai.ts`의 `MODEL = "gpt-5.6"` 하나로 관리한다.
- `db push`, `functions deploy`, `secrets set`, 대시보드에서 계정 만들기처럼 클라우드를 바꾸는 단계는 **사용자 승인 후** 실행한다(단계에 ☁️ 표시).
- 카카오 앱 키가 있어야 하는 단계는 🔑로 표시한다. 키가 아직 없으면 그 단계만 건너뛰고 History에 "보류"로 남긴 뒤 다음 Task로 간다.
- 각 Task 끝에서 반드시 커밋한다(사용자 승인됨). push는 하지 않는다. 메시지 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Task가 끝날 때마다 [History](../../../History/README.md) 규칙대로 작업 기록을 남긴다.
- 이 단계의 범위 밖: 일정 기반 분량 재배분, 채팅으로 교재 추가, 지난 날짜 기록, 카카오톡 메시지 발송(알림 단계).

## Review Focus

1. **같은 기록을 두 번 보냄** — 진도(`current_page`)는 더 늘지 않아야 한다(`max`). `study_logs` 행 중복은 이번 단계에서 허용한다. → Task 4 `nextCurrentPage` 테스트
2. **자정 직후(한국 0~9시, UTC로는 전날)에 기록** — 기록 날짜와 오늘의 분량은 한국 날짜여야 한다. → Task 4 `toDateKey` 테스트
3. **같은 과목에 교재가 여러 권인데 교재명을 말하지 않음** — 엉뚱한 교재 진도를 올리지 않고 교재 없이 기록만 남긴다. → Task 3 `parseAnalysis` 테스트
4. **카카오 동의 화면에서 취소하거나 카카오 쪽 오류(KOE205 등)** — 빈 화면이 아니라 로그인 화면에 실패 문구를 보이고 다시 누를 수 있다. → Task 2 🔑 확인 단계
5. **세션이 만료된 채로 전송** — 오류 문구만 남기지 말고 로그인 화면으로 보낸다. → Task 7 수동 확인 단계

## 실행 방식

| Task | 방식 | 이유 |
|---|---|---|
| 1 | Native | 대부분 ☁️ 클라우드 작업과 사용자 작업이라 승인을 바로 받아야 한다 |
| 2 | Subagent + 리뷰 | 프론트엔드만 바꾸고, 앞뒤 Task와 주고받는 것이 세션 가드뿐이다 |
| 3~6 | Native, 끝나고 리뷰 서브에이전트 1회(3~6 묶음 diff) | 같은 타입(`Analysis`, `BookRef`, `CoachContext`)을 이어 쓰고 Task 6에 ☁️ 배포가 있다 |
| 7 | Subagent + 리뷰 | Task 6의 응답 계약만 쓰는 프론트엔드 작업이다 |
| 끝 | 전체 브랜치 리뷰 서브에이전트 | |

리뷰에서 나온 지적과 처리 결과도 History에 남긴다.

---

### Task 1: 개발 프로젝트 연결과 DB 타입

**Files:**
- Create: `Frontend/src/interfaces/database.ts` (생성 결과)
- Modify: `Frontend/src/libs/supabase.ts:10-11`
- Modify: `Frontend/src/api/*.ts` (타입 오류가 나는 곳만)

**Interfaces:**
- Produces: `supabase`가 `createClient<Database>`로 타입이 붙은 클라이언트. 클라우드 개발 프로젝트에 테이블·RLS·`handle_new_user` 트리거가 있고, 함수 비밀 값 `OPENAI_API_KEY`가 등록되어 있다. Auth에 검증용 테스트 계정 1개(화면에는 쓰지 않고 Task 6에서 API를 호출할 때만 쓴다).

- [ ] **Step 1: 연결 상태 확인**

Run (`Backend/`): `npx supabase projects list`
Expected: 개발 프로젝트 `ishtebcswgyagbbaakpx` 행에 연결 표시(●). 없으면 LOCAL_DEV.md 순서대로 `npx supabase login` → `npx supabase link --project-ref ishtebcswgyagbbaakpx`.

- [ ] **Step 2: ☁️ 마이그레이션 반영**

Run: `npm run db:push`
Expected: `Applying migration 20261022082116_init_schema.sql...` 후 `Finished supabase db push.`

- [ ] **Step 3: ☁️ 함수 비밀 값 등록**

`Backend/supabase/functions/.env`에 `OPENAI_API_KEY=` 줄이 있는지 확인한다(값은 출력하지 않는다). 그다음
Run: `npm run secrets:set`
Expected: `Finished supabase secrets set.`

- [ ] **Step 4: ☁️ 검증용 테스트 계정 만들기 (사용자)**

카카오 키가 오기 전에도 `chat` 함수를 호출해 볼 수 있게 하는 계정이다. 앱 화면에는 이메일 로그인이 없다.
Supabase 대시보드 → Authentication → Users → Add user → 이메일·비밀번호 입력, "Auto Confirm User" 체크. 이어서 Table Editor의 `profiles`에 그 사용자 id의 행이 생겼는지 확인한다(트리거 동작 확인). 비밀번호는 저장소 파일에 적지 않는다.

- [ ] **Step 4.5: ☁️ 해커스 교재 넣기 (2026-10-30 추가)**

사용자가 고른 해커스 공무원 교재를 `books`에 넣는다. 지금은 검증용 계정에 넣고, Task 2 Step 8에서 카카오 로그인으로 사용자 행이 생기면 같은 SQL을 그 사용자 id로 한 번 더 실행한다. 저장소 파일로 남기지 않고 Supabase SQL Editor(또는 MCP `execute_sql`)에서 `<USER_ID>`만 바꿔 실행한다. 같은 제목이 이미 있으면 넣지 않으므로 다시 실행해도 중복되지 않는다. 쪽수는 알라딘 상품 정보(2026-10-30 확인) 기준이고, 여러 권 세트는 합계 쪽수로 한 행에 넣는다.

```sql
insert into public.books (user_id, subject, title, total_pages)
select '<USER_ID>'::uuid, b.subject::public.subject, b.title, b.total_pages
from (values
  ('korean',        '2027 해커스공무원 국어 올인원 기본서', 456),
  ('korean',        '2027 해커스공무원 신민숙 쉬운국어 한 권으로 끝', 260),
  ('english',       '2027 해커스공무원 영어 올인원 기본서 (전3권)', 792),
  ('english',       '2026 해커스공무원 비비안 영어 매일 하프모의고사 20회분', 204),
  ('public_health', '해커스공무원 최성희 공중보건 기본서 (전2권)', 748),
  ('public_health', '2025 해커스공무원 최성희 공중보건 실전동형모의고사', 128),
  ('health_admin',  '해커스공무원 최성희 보건행정 기본서', 476),
  ('health_admin',  '2025 해커스공무원 최성희 보건행정 실전동형모의고사', 128)
) as b(subject, title, total_pages)
where not exists (
  select 1 from public.books x where x.user_id = '<USER_ID>'::uuid and x.title = b.title
);
```
Expected: `INSERT 0 8` (다시 실행하면 `INSERT 0 0`). 그 계정에 `exam_date`가 있으면 Task 6 Step 3처럼 `plan-generator`를 호출해 분량을 만든다.

- [ ] **Step 5: DB 타입 생성과 클라이언트 연결**

Run (`Backend/`): `npm run gen:types`
`libs/supabase.ts`의 TODO를 지우고 `createClient<Database>(supabaseUrl, supabaseKey)`로 바꾼다(`import type { Database } from '../interfaces/database.ts'`).

- [ ] **Step 6: 빌드로 타입 확인**

Run (`Frontend/`): `npm run build` 그리고 `npm run lint`
Expected: 둘 다 오류 0. 타입 오류가 나면 `api/`의 해당 쿼리만 고친다(`interfaces/`의 도메인 타입은 유지).

- [ ] **Step 7: Commit**

```bash
git add Frontend/src/interfaces/database.ts Frontend/src/libs/supabase.ts Frontend/src/api
git commit -m "chore: 개발 프로젝트 DB 타입 연결"
```

---

### Task 2: 카카오 로그인

**Files:**
- Create: `Frontend/src/api/auth.ts`, `Frontend/src/hooks/useSession.ts`, `Frontend/src/pages/LoginPage.tsx`, `Frontend/src/components/layout/RequireAuth.tsx`
- Modify: `Frontend/src/router.tsx`, `Frontend/src/components/layout/Sidebar.tsx`, `Frontend/src/index.css` (카카오 버튼 색), `DESIGN.md`, `LOCAL_DEV.md`, `DEPLOY.md`

**Interfaces:**
- Consumes: Task 1의 `supabase`.
- Produces:
  - `api/auth.ts`: `signInWithKakao(): Promise<void>`, `signOut(): Promise<void>`, `getSession(): Promise<Session | null>`, `onSessionChange(cb: (session: Session | null) => void): () => void` (반환값은 구독 해제)
  - `hooks/useSession.ts`: `useSession(): { session: Session | null; loading: boolean }`
  - `RequireAuth`: 세션 확인 중이면 아무것도 그리지 않고, 세션이 없으면 `<Navigate to="/login" replace />`, 있으면 `<AppLayout />`.

- [ ] **Step 1: `api/auth.ts`와 `useSession` 구현**

`signInWithKakao`는 ``supabase.auth.signInWithOAuth({ provider: 'kakao', options: { redirectTo: `${window.location.origin}/login` } })``. 돌아오는 곳을 `/login`으로 두는 이유: 취소·오류로 돌아오면 URL의 `error` 값을 로그인 화면이 바로 읽고, 성공하면 로그인 화면이 `/`로 보낸다. `scopes`는 지정하지 않는다(Step 8에서 KOE205가 나면 그때 `'profile_nickname profile_image'`로 지정).
`useSession`은 마운트 때 `getSession()`으로 초기값을 정하고 `onSessionChange`로 갱신한다.

- [ ] **Step 2: 라우터와 가드**

`router.tsx`: `{ path: '/login', element: <LoginPage /> }`를 최상위에 추가하고, 기존 `/` 경로의 element를 `<RequireAuth />`로 바꾼다. `AppLayout`이 마운트될 때는 항상 세션이 있으므로 `useProfile`은 그대로 둔다.

- [ ] **Step 3: 카카오 버튼 색 토큰**

카카오 로그인 디자인 가이드 색은 DESIGN 토큰에 없으므로 추가한다. `index.css` `:root`에 `--kakao: #fee500`, `--on-kakao: rgb(0 0 0 / 0.85)`(다크 모드에서도 같은 값), `@theme inline`에 `--color-kakao`, `--color-on-kakao`. DESIGN.md 색상 표에 "카카오 로그인 버튼 전용"으로 적는다.

- [ ] **Step 4: `LoginPage` 화면**

최대 폭 480px, `bg-bg`. 위쪽에 제목·소개, 아래쪽에 버튼과 안내. 버튼은 `bg-kakao text-on-kakao`, `min-h-12`, `rounded-xl`, 왼쪽에 검정 말풍선 심볼(인라인 SVG, `aria-hidden`). 누르면 이동하는 동안 비활성. 세션이 있으면 `<Navigate to="/" replace />`. URL의 search 또는 hash에 `error`가 있으면 실패 문구를 보인다. 문구는 아래로 고정한다.

| 자리 | 문구 |
|---|---|
| 제목 | 보건직 합격 코치 |
| 소개 | 오늘 공부할 분량을 정해 드리고, 공부 기록과 고민을 같이 봐요. |
| 버튼 | 카카오 로그인 |
| 실패(`text-danger`) | 로그인하지 못했어요. 다시 시도해 주세요. |
| 하단 안내(`text-muted`) | 카카오 계정으로 로그인하면 공부 기록이 계정에 저장돼요. |

- [ ] **Step 5: 사이드바 로그아웃**

`Sidebar` 채팅방 목록 아래 `border-t border-line` 영역에 "로그아웃" 버튼(`min-h-11`, `text-muted`). 누르면 `signOut()` 후 가드가 `/login`으로 보낸다.

- [ ] **Step 6: 문서 갱신**

- DESIGN.md: 화면 목록에 `/login`, "4. 로그인" 절(Step 4 구성과 문구), TODO의 "로그인 화면 구성" 삭제.
- LOCAL_DEV.md에 "카카오 로그인 설정" 절 추가 (사용자가 키를 받을 때 따라 할 순서):
  1. [Kakao Developers](https://developers.kakao.com)에서 앱 만들기
  2. 앱 설정 → 앱 → 플랫폼 키 → REST API 키 확인(= Client ID). 같은 화면의 "카카오 로그인 Redirect URI"에 `https://ishtebcswgyagbbaakpx.supabase.co/auth/v1/callback` 등록
  3. 같은 키의 "카카오 로그인 Client Secret" 확인(= Client Secret)하고 활성화
  4. 제품 설정 → 카카오 로그인 → 사용 설정 ON, 동의항목에 `profile_nickname`, `profile_image` 설정 (`account_email`은 비즈 앱만 가능하므로 받지 않는다)
  5. Supabase 대시보드 → Authentication → Providers → Kakao: Enabled, Client ID·Secret 입력, "Allow users without an email" ON
  6. Authentication → URL Configuration: Site URL `http://localhost:5173`, Redirect URLs에 `http://localhost:5173/login`
  - 키와 Secret은 Supabase 대시보드에만 넣고 저장소 파일에는 적지 않는다.
- DEPLOY.md: 운영 프로젝트도 같은 순서로 설정하되 Redirect URI는 운영 프로젝트 ref, Redirect URLs에는 운영 도메인 `/login`. 운영 프로젝트는 Email provider를 끈다(검증용 계정은 개발 프로젝트에만).

- [ ] **Step 7: 키 없이 하는 확인**

Run (`Frontend/`): `npm run build` 그리고 `npm run lint` → 오류 0.
수동(`npm run dev`): 로그아웃 상태로 `/settings` 접속 → `/login`으로 이동. 버튼 → Supabase 주소로 이동(Provider가 아직 꺼져 있으면 "provider is not enabled" 오류가 정상). `/login?error=access_denied` 직접 접속 → 실패 문구.

- [ ] **Step 8: 🔑 키 받은 뒤 확인**

Step 6의 카카오 설정을 마친 뒤:
1. 카카오 로그인 → 동의 → `/`로 이동. Table Editor `profiles`에 새 사용자 행 생성.
2. 로그아웃 → 다시 로그인 → 동의 화면에서 취소 → `/login`에 실패 문구.
3. 카카오 화면에 KOE205(설정하지 않은 동의항목)가 나오면 Step 1의 `scopes`를 지정하고 다시 확인한다.
4. 공부 설정에서 시험일 저장 성공, 헤더 D-day 표시.
키가 아직 없으면 이 Step을 건너뛰고 History에 보류로 남긴다.

- [ ] **Step 9: Commit**

```bash
git add Frontend/src DESIGN.md LOCAL_DEV.md DEPLOY.md
git commit -m "feat: 카카오 로그인과 인증 가드"
```

---

### Task 3: 메시지 분석 결과 검증 (Deno 테스트 도입)

**Files:**
- Create: `Backend/supabase/functions/chat/analysis.ts`, `Backend/supabase/functions/chat/analysis_test.ts`
- Modify: `Backend/package.json` (devDependency `deno`, 스크립트 `test`), `CLAUDE.md` ("테스트 프레임워크는 아직 없다" → Backend 테스트 명령)

**Interfaces:**
- Consumes: `_shared/subjects.ts`의 `Subject`, `SUBJECT_LABELS`.
- Produces (`chat/analysis.ts`, OpenAI·Supabase import 금지):
  ```ts
  export const INTENTS = ["study_log", "schedule", "book_add", "question", "usage"] as const;
  export type Intent = typeof INTENTS[number];
  export interface BookRef { id: string; subject: Subject; title: string; current_page: number; total_pages: number }
  export interface StudyEntry {
    subject: Subject; book_id: string | null;
    start_page: number | null; end_page: number | null;
    questions_solved: number | null; questions_wrong: number | null;
  }
  export interface Analysis { intent: Intent; subject: Subject | null; entries: StudyEntry[] }
  export const ANALYSIS_SCHEMA: Record<string, unknown>; // OpenAI strict json_schema
  export function parseAnalysis(raw: unknown, books: BookRef[]): Analysis;
  ```

`ANALYSIS_SCHEMA`는 strict 모드 규칙(모든 속성 required, `additionalProperties: false`, 비어 있을 수 있는 값은 `["integer", "null"]`)을 따르고 최상위 속성은 `intent`(enum `INTENTS`), `subject`(과목 enum 또는 null), `entries`(위 `StudyEntry` 배열)다.

`parseAnalysis` 규칙 (LLM 출력을 믿지 않는다):
- `intent`가 `INTENTS`에 없으면 `"question"`.
- `subject`가 과목 값이 아니면 `null`. 과목이 틀린 entry는 버린다.
- 쪽수·문제 수가 정수 1 이상이 아니면 `null`(문제 수는 0 허용). `start_page > end_page`면 둘을 바꾼다.
- `questions_wrong > questions_solved`면 `questions_wrong = null`.
- 쪽수와 문제 수가 모두 `null`인 entry는 버린다.
- `book_id`가 `books`에 없거나 다른 과목의 교재면 `null`. `null`이고 그 과목 교재가 정확히 1권이면 그 교재 id.
- `intent`가 `"study_log"`인데 남은 entry가 없으면 `"question"`으로 바꾼다(코치가 되묻게).

- [ ] **Step 1: 테스트 도구 준비**

Run (`Backend/`): `npm i -D deno`
`package.json` scripts에 `"test": "deno test --no-lock supabase/functions"` 추가.

- [ ] **Step 2: 실패하는 테스트 작성** (`chat/analysis_test.ts`, `jsr:@std/assert`의 `assertEquals`)

```ts
const books: BookRef[] = [
  { id: "b-admin", subject: "health_admin", title: "보건행정 기본서", current_page: 20, total_pages: 300 },
  { id: "b-ko1", subject: "korean", title: "문법", current_page: 0, total_pages: 200 },
  { id: "b-ko2", subject: "korean", title: "봉투모의고사", current_page: 0, total_pages: 120 },
];
const entry = (o: Partial<StudyEntry>) => ({ subject: "health_admin", book_id: null, start_page: null,
  end_page: null, questions_solved: null, questions_wrong: null, ...o });

Deno.test("교재가 1권뿐인 과목은 book_id를 채운다", () => {
  const a = parseAnalysis({ intent: "study_log", subject: "health_admin",
    entries: [entry({ start_page: 30, end_page: 70, questions_solved: 20, questions_wrong: 5 })] }, books);
  assertEquals(a.entries[0], { subject: "health_admin", book_id: "b-admin", start_page: 30, end_page: 70,
    questions_solved: 20, questions_wrong: 5 });
});
Deno.test("같은 과목 교재가 여러 권이고 교재를 모르면 book_id는 null", () => {
  const a = parseAnalysis({ intent: "study_log", subject: "korean",
    entries: [entry({ subject: "korean", start_page: 1, end_page: 10 })] }, books);
  assertEquals(a.entries[0].book_id, null);
});
Deno.test("목록에 없거나 과목이 다른 book_id는 버린다", () => {
  const a = parseAnalysis({ intent: "study_log", subject: "korean",
    entries: [entry({ subject: "korean", book_id: "b-admin", end_page: 10 })] }, books);
  assertEquals(a.entries[0].book_id, null);
});
Deno.test("뒤집힌 쪽수는 바꾸고, 틀린 수가 푼 수보다 크면 버린다", () => {
  const a = parseAnalysis({ intent: "study_log", subject: null,
    entries: [entry({ start_page: 70, end_page: 30, questions_solved: 5, questions_wrong: 9 })] }, books);
  assertEquals([a.entries[0].start_page, a.entries[0].end_page, a.entries[0].questions_wrong], [30, 70, null]);
});
Deno.test("기록할 내용이 없는 study_log는 question으로 바꾼다", () => {
  const a = parseAnalysis({ intent: "study_log", subject: "english", entries: [entry({ subject: "english" })] }, books);
  assertEquals([a.intent, a.entries.length], ["question", 0]);
});
Deno.test("알 수 없는 intent와 과목은 기본값으로", () => {
  const a = parseAnalysis({ intent: "chitchat", subject: "math", entries: [entry({ subject: "math" as Subject, end_page: 3 })] }, books);
  assertEquals([a.intent, a.subject, a.entries.length], ["question", null, 0]);
});
```

- [ ] **Step 3: 실패 확인**

Run (`Backend/`): `npm test`
Expected: FAIL — `analysis.ts` 모듈을 찾을 수 없음.

- [ ] **Step 4: `chat/analysis.ts` 구현** (위 Interfaces와 규칙대로)

- [ ] **Step 5: 통과 확인**

Run: `npm test` → `ok | 6 passed | 0 failed`. `deno.lock`이 생기지 않았는지 `git status`로 확인.

- [ ] **Step 6: CLAUDE.md 명령어 갱신**

Backend 명령 목록에 `npm test  # Edge Function 순수 로직 테스트 (deno test)`를 넣고, "테스트 프레임워크는 아직 없다"를 "Frontend 테스트 도구는 아직 없다. OpenAI·Supabase를 import하는 파일은 테스트에서 불러오지 않도록 순수 로직을 따로 둔다."로 바꾼다.

- [ ] **Step 7: Commit**

```bash
git add Backend/package.json Backend/package-lock.json Backend/supabase/functions/chat/analysis.ts Backend/supabase/functions/chat/analysis_test.ts CLAUDE.md
git commit -m "feat: chat 메시지 분석 결과 검증과 Deno 테스트"
```

---

### Task 4: 학습 기록 반영 계산

**Files:**
- Create: `Backend/supabase/functions/chat/study-log.ts`, `Backend/supabase/functions/chat/study-log_test.ts`, `Backend/supabase/functions/_shared/date_test.ts`

**Interfaces:**
- Consumes: Task 3의 `BookRef`, `StudyEntry`.
- Produces (`chat/study-log.ts`, 순수):
  ```ts
  export type TaskStatus = "pending" | "done" | "partial" | "skipped"; // DB enum task_status
  export function nextCurrentPage(book: Pick<BookRef, "current_page" | "total_pages">, endPage: number): number;
  export function taskStatusAfter(task: { start_page: number; end_page: number; status: TaskStatus }, endPage: number): TaskStatus;
  export interface RecordedLog { subject: Subject; book_title: string | null; start_page: number | null;
    end_page: number | null; questions_solved: number | null; questions_wrong: number | null }
  ```
  - `nextCurrentPage` = `min(total_pages, max(current_page, endPage))`
  - `taskStatusAfter`: `done`은 그대로. `endPage >= end_page` → `done`, `endPage >= start_page` → `partial`, 그 외 원래 상태.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// chat/study-log_test.ts
Deno.test("진도는 앞으로만 간다", () => {
  assertEquals(nextCurrentPage({ current_page: 70, total_pages: 300 }, 50), 70);
  assertEquals(nextCurrentPage({ current_page: 70, total_pages: 300 }, 70), 70); // 같은 기록 재전송
});
Deno.test("진도는 총 페이지에서 멈춘다", () => {
  assertEquals(nextCurrentPage({ current_page: 280, total_pages: 300 }, 400), 300);
});
Deno.test("오늘 분량 상태", () => {
  const task = { start_page: 31, end_page: 45, status: "pending" as const };
  assertEquals(taskStatusAfter(task, 45), "done");
  assertEquals(taskStatusAfter(task, 60), "done");
  assertEquals(taskStatusAfter(task, 38), "partial");
  assertEquals(taskStatusAfter(task, 20), "pending");
  assertEquals(taskStatusAfter({ ...task, status: "done" }, 20), "done");
});

// _shared/date_test.ts
Deno.test("한국 0~9시는 UTC 전날이어도 한국 날짜", () => {
  assertEquals(toDateKey(new Date("2026-10-26T15:30:00Z"), "Asia/Seoul"), "2026-10-27");
});
```

- [ ] **Step 2: 실패 확인** — Run: `npm test` → `study-log.ts` 없음으로 FAIL (date 테스트는 통과해도 된다)

- [ ] **Step 3: `chat/study-log.ts` 구현**

- [ ] **Step 4: 통과 확인** — Run: `npm test` → 모든 테스트 passed

- [ ] **Step 5: Commit**

```bash
git add Backend/supabase/functions/chat/study-log.ts Backend/supabase/functions/chat/study-log_test.ts Backend/supabase/functions/_shared/date_test.ts
git commit -m "feat: 학습 기록의 진도·오늘 분량 반영 계산"
```

---

### Task 5: 코치 컨텍스트와 답변 문구

**Files:**
- Create: `Backend/supabase/functions/_shared/coach.ts`, `Backend/supabase/functions/chat/context.ts`, `Backend/supabase/functions/chat/context_test.ts`, `Backend/supabase/functions/chat/reply.ts`, `Backend/supabase/functions/chat/reply_test.ts`

**Interfaces:**
- Consumes: `Subject`, `SUBJECT_LABELS`, `diffDays`, Task 3 `Intent`, Task 4 `RecordedLog`·`TaskStatus`.
- Produces:
  - `_shared/coach.ts`: `COACH_TONE_INSTRUCTIONS: string`, `USAGE_GUIDE: string`, `BOOK_ADD_PENDING: string`
  - `chat/context.ts` (순수):
    ```ts
    export interface CoachContext {
      today: string; examDate: string | null;
      books: { subject: Subject; title: string; current_page: number; total_pages: number }[];
      todayTasks: { subject: Subject; title: string; start_page: number; end_page: number; status: TaskStatus }[];
      recentLogs: { study_date: string; subject: Subject; start_page: number | null; end_page: number | null;
        questions_solved: number | null; questions_wrong: number | null }[]; // 최근 7일, 오늘 포함
      mockExams: { name: string; taken_on: string; scores: Partial<Record<Subject, number>> }[]; // 최근 3회, 최신순
    }
    export function subjectPercents(books: CoachContext["books"]): Partial<Record<Subject, number>>;
    export function formatCoachContext(ctx: CoachContext): string;
    ```
  - `chat/reply.ts` (순수): `replyInstructions(intent: Intent): string`, `fallbackReply(recorded: RecordedLog[], ctx: CoachContext): string`

값과 문구:
- `subjectPercents`: 과목별 `round(Σmin(current_page, total_pages) / Σtotal_pages × 100)`, 교재 없는 과목은 키 없음(대시보드 `buildSubjects`와 같은 식).
- `formatCoachContext`는 아래 줄을 이 순서로 만든다. 데이터가 없으면 해당 줄 끝을 "없음"으로.
  ```
  오늘: 2026-10-27 (시험까지 123일)        ← 시험일 없으면 "(시험일 미입력)"
  과목별 진도: 국어 45%, 보건행정 7%       ← 과목 순서는 SUBJECT_LABELS 순
  오늘 분량: 국어 문법 31~45쪽(완료), ...   ← 상태: 완료/일부/남음/건너뜀
  최근 7일 기록: 10-27 보건행정 30~70쪽 기출 20문제 중 5개 틀림, ...
  최근 모의고사: 10월 모의(2026-10-20) 국어 80 영어 65, ...
  ```
- `COACH_TONE_INSTRUCTIONS`: coach-tone.md의 "말투", "메시지 구조", "지켜야 할 것", "하지 않을 것"을 요약한 한국어 지침. 반드시 들어갈 것: 해요체, 3~5문장, 제안 1~2개, 이모지 0~1개, 컨텍스트에 있는 수치만 말하고 없으면 묻는다, 합격 가능성 단정·비교·죄책감 금지, 밤샘 권유 금지.
- `USAGE_GUIDE` (이번 단계에서 동작하는 기능만):
  ```
  이렇게 써 보세요.
  - 공부를 마치면 한 분량을 채팅으로 보내주세요. 예) 보건행정 30~70쪽, 기출 20문제 중 5개 틀림
  - 그러면 과목별 진도율을 정리해 드려요.
  - 공부법이나 성적 고민도 편하게 물어보세요.
  - 교재와 시험일은 메뉴의 '공부 설정 변경'에서 바꿀 수 있어요.
  ```
- `BOOK_ADD_PENDING`: `교재 추가는 지금은 메뉴의 '공부 설정 변경'에서 할 수 있어요. 과목, 교재명, 총 페이지 수를 넣으면 시험일까지 분량을 다시 나눠 드려요.`
- `replyInstructions(intent)` = `COACH_TONE_INSTRUCTIONS` + intent별 한 문단:
  - `study_log`: 방금 저장한 기록을 확인하고, 기록한 과목의 진도율과 과목 간 균형을 한 번 짚는다.
  - `schedule`: 분량 재배분은 아직 할 수 없으니 오늘 분량 중 먼저 할 것만 제안하고, 재배분했다고 말하지 않는다.
  - `question`: 과목과 고민을 짚고, 컨텍스트의 기록·점수를 근거로 공부법 1~2개와 멘탈 케어를 함께 준다.
- `fallbackReply`: LLM 답변이 실패했을 때 쓴다.
  - 기록이 있으면: `기록했어요. ` + 기록한 과목마다 `{과목} 진도 {n}%`를 `, `로 이은 것 + `. 오늘도 수고했어요.`
  - 없으면: `지금은 답변을 만들지 못했어요. 잠시 후 다시 보내주세요.`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// chat/context_test.ts — ctx는 위 예시 값(국어 문법 90/200, 보건행정 기본서 20/300, 시험일 2027-02-27)
Deno.test("과목별 진도율은 교재 합계 기준", () => {
  assertEquals(subjectPercents(ctx.books), { korean: 45, health_admin: 7 });
});
Deno.test("컨텍스트 문장", () => {
  const text = formatCoachContext(ctx);
  assertStringIncludes(text, "오늘: 2026-10-27 (시험까지 123일)");
  assertStringIncludes(text, "과목별 진도: 국어 45%, 보건행정 7%");
});
Deno.test("데이터가 없으면 없음", () => {
  const text = formatCoachContext({ ...ctx, examDate: null, todayTasks: [], recentLogs: [], mockExams: [] });
  assertStringIncludes(text, "(시험일 미입력)");
  assertStringIncludes(text, "최근 7일 기록: 없음");
  assertStringIncludes(text, "최근 모의고사: 없음");
});

// chat/reply_test.ts
Deno.test("기록이 있을 때 대체 답변", () => {
  const recorded = [{ subject: "health_admin", book_title: "보건행정 기본서", start_page: 30, end_page: 70,
    questions_solved: 20, questions_wrong: 5 }];
  assertEquals(fallbackReply(recorded, ctx), "기록했어요. 보건행정 진도 7%. 오늘도 수고했어요.");
});
Deno.test("기록이 없을 때 대체 답변", () => {
  assertEquals(fallbackReply([], ctx), "지금은 답변을 만들지 못했어요. 잠시 후 다시 보내주세요.");
});
Deno.test("일정 의도는 재배분했다고 말하지 않게 한다", () => {
  assertStringIncludes(replyInstructions("schedule"), "재배분했다고 말하지 않는다");
});
```

- [ ] **Step 2: 실패 확인** — Run: `npm test` → 모듈 없음으로 FAIL

- [ ] **Step 3: `_shared/coach.ts`, `chat/context.ts`, `chat/reply.ts` 구현**

- [ ] **Step 4: 통과 확인** — Run: `npm test` → 모든 테스트 passed

- [ ] **Step 5: Commit**

```bash
git add Backend/supabase/functions/_shared/coach.ts Backend/supabase/functions/chat/context.ts Backend/supabase/functions/chat/context_test.ts Backend/supabase/functions/chat/reply.ts Backend/supabase/functions/chat/reply_test.ts
git commit -m "feat: 코치 컨텍스트와 답변 지침"
```

---

### Task 6: `chat` Edge Function 연결과 배포

**Files:**
- Create: `Backend/supabase/functions/chat/llm.ts`, `Backend/supabase/functions/chat/db.ts`
- Modify: `Backend/supabase/functions/chat/index.ts` (템플릿 전부 교체), `Backend/supabase/functions/chat/deno.json`, `Backend/supabase/functions/_shared/openai.ts`, `Frontend/src/interfaces/chat.ts`, `CLAUDE.md`, `SERVICE_FLOW.md`

**Interfaces:**
- Consumes: Task 3~5의 모든 순수 함수, `_shared/date.ts`, `_shared/coach.ts`.
- Produces:
  - `_shared/openai.ts`: `export const MODEL = "gpt-5.6"` 추가
  - `chat/llm.ts` (OpenAI를 import하는 유일한 chat 파일):
    `analyzeMessage(content: string, books: BookRef[]): Promise<Analysis>` — `responses.create`에 `text: { format: { type: "json_schema", name: "chat_analysis", strict: true, schema: ANALYSIS_SCHEMA } }`, 교재 목록(id·과목·제목·진도)을 instructions에 넣고 `JSON.parse(output_text)`를 `parseAnalysis`로 검증.
    `generateReply(args: { content: string; intent: Intent; ctx: CoachContext; history: { role: "user" | "assistant"; content: string }[] }): Promise<string>` — instructions는 `replyInstructions(intent)` + `formatCoachContext(ctx)`, input은 history + 이번 메시지.
  - `chat/db.ts` (`SupabaseClient` 타입은 `deno.json` imports에 `"@supabase/supabase-js": "npm:@supabase/supabase-js@^2"` 추가 후 type import):
    `loadProfileAndBooks(sb) → { timezone: string; examDate: string | null; books: BookRef[] }`,
    `insertMessage(sb, userId, role, content, subject) → ChatMessageRow`,
    `recordStudyLogs(sb, userId, today, messageId, entries, books) → RecordedLog[]` (study_logs insert는 `study_date: today` 명시, entry에 `book_id`와 `end_page`가 있으면 `books.current_page = nextCurrentPage(...)`, 오늘 그 교재의 `daily_tasks`를 `taskStatusAfter`로 갱신),
    `loadCoachContext(sb, today, examDate) → CoachContext`,
    `loadTodayHistory(sb, today, timezone, limit = 10)` (오늘 메시지 중 최근 10개, 오래된 순).
  - `interfaces/chat.ts`의 `ChatResponse`에 `logged: boolean` 추가 (함수 응답 `{ messages: [userMessage, assistantMessage], logged }`).

처리 순서 (`index.ts`, `withSupabase({ auth: "user" })`, `ctx.supabase` 사용):
1. body의 `content`를 trim. 비었거나 1000자 초과 → 400 `{ error: "invalid_content" }`.
2. `loadProfileAndBooks` → `today = toDateKey(new Date(), timezone)`.
3. `analyzeMessage` 실패 → 502 `{ error: "analysis_failed" }`. **이 시점까지는 아무것도 저장하지 않는다**(재전송해도 기록이 두 번 쌓이지 않게).
4. 사용자 메시지 저장(`subject` = 분석 결과).
5. `intent === "study_log"`이면 `recordStudyLogs`.
6. 답변: `usage` → `USAGE_GUIDE`, `book_add` → `BOOK_ADD_PENDING`, 그 외 → `loadCoachContext`(기록 반영 후) + `loadTodayHistory`로 `generateReply`. `generateReply`가 실패하면 `fallbackReply`.
7. 코치 메시지 저장 후 응답. DB 오류는 기존 `plan-generator`처럼 500 `{ error }`.

- [ ] **Step 1: `llm.ts`, `db.ts`, `index.ts` 구현과 정적 확인**

Run (`Backend/`): `npx deno check --no-lock --config supabase/functions/chat/deno.json supabase/functions/chat/index.ts` 그리고 `npm test`
Expected: check 오류 0, 테스트 모두 passed.

- [ ] **Step 2: ☁️ 배포**

Run: `npx supabase functions deploy chat --use-api`
Expected: `Deployed Functions on project ishtebcswgyagbbaakpx: chat`

- [ ] **Step 3: 호출 확인**

카카오 키 없이 확인할 수 있도록 Task 1의 검증용 계정으로 토큰을 받는다. 이메일·비밀번호·토큰은 셸 변수로만 쓰고 파일에 남기지 않는다.

```bash
TOKEN=$(curl -s -X POST "https://ishtebcswgyagbbaakpx.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: $PUBLISHABLE_KEY" -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" | node -pe "JSON.parse(require('fs').readFileSync(0)).access_token")

curl -s -X POST "https://ishtebcswgyagbbaakpx.supabase.co/functions/v1/chat" \
  -H "Authorization: Bearer $TOKEN" -H "apikey: $PUBLISHABLE_KEY" -H "Content-Type: application/json" \
  -d '{"content":"이거 어떻게 써?"}'
```
Expected: `messages[1].content`가 `USAGE_GUIDE`와 같고 `"logged":false`.
같은 방식으로 `{"content":""}` → 400 `invalid_content`.
검증용 계정은 화면에 로그인할 수 없으므로 데이터는 Table Editor로 넣는다: `profiles.exam_date`를 2027-02-27로 두고(교재는 Task 1 Step 4.5에서 넣은 해커스 교재 8권), 같은 토큰으로 `plan-generator`를 호출해 오늘 분량을 만든다. 그다음 `{"content":"보건행정 기본서 30~70p, 기출 20문제 중 5개 틀림"}` → `"logged":true`, 대시보드 Table Editor에서 `study_logs` 1행(`study_date` = 오늘 한국 날짜), "해커스공무원 최성희 보건행정 기본서"의 `current_page = 70`. 보건행정 교재가 2권이므로 교재명 없이 "보건행정 30~70p"만 보내면 `book_id`가 비고 진도는 그대로여야 한다(Review Focus 3)는 것도 함께 확인한다.

- [ ] **Step 4: 문서 갱신**

- CLAUDE.md "아직 골격 단계다…" 문단을 "`chat`은 학습 기록·질문·사용법 의도를 처리한다. 일정 재배분과 채팅 교재 추가는 아직 안내만 한다."로 바꾼다.
- SERVICE_FLOW.md "구현 전 결정할 것"에서 "기본 메시지 문구" 항목을 지운다(이미 `WELCOME_MESSAGE`와 같다). chat 의도별 처리 표 아래에 "오늘 일정·교재 추가는 의도만 분류하고, 처리는 로드맵 2단계·이후 단계에서 붙인다."를 적는다.

- [ ] **Step 5: Commit**

```bash
git add Backend/supabase/functions Frontend/src/interfaces/chat.ts CLAUDE.md SERVICE_FLOW.md
git commit -m "feat: chat Edge Function 의도 분류·학습 기록·코치 답변"
```

---

### Task 7: 프론트엔드 채팅 연결

**Files:**
- Modify: `Frontend/src/hooks/useChat.ts`, `Frontend/src/hooks/useTodayTasks.ts`, `Frontend/src/components/chat/TodayPlan.tsx`, `Frontend/src/pages/ChatPage.tsx`, `Frontend/src/api/chat.ts`, `README.md`

**Interfaces:**
- Consumes: Task 6의 `ChatResponse { messages; logged }`, Task 2의 세션 가드.
- Produces:
  - `sendChatMessage(content: string): Promise<ChatResponse>` (지금은 `messages`만 반환 → 응답 전체 반환)
  - `useChat(date)` → `{ messages, sending, error, send, planVersion }`, `send(content: string): Promise<boolean>` (성공 여부)
  - `useTodayTasks(date: string, version: number)` — `version`이 바뀌면 다시 불러온다
  - `TodayPlan` props `{ date: string; version: number }`

동작:
- 보내면 바로 사용자 말풍선을 임시 id(`pending-${Date.now()}`)로 붙이고, 코치 자리에 `text-muted` 말풍선 "답변을 쓰고 있어요…"를 보인다.
- 성공: 임시 말풍선을 응답의 두 메시지로 바꾸고, `logged`이면 `planVersion`을 1 올려 오늘의 분량을 다시 불러온다.
- 실패: 임시 말풍선을 지우고, 오류 문구 "메시지를 보내지 못했어요. 잠시 후 다시 보내주세요."를 보이고, `ChatRoom`은 `send`가 `false`면 입력창에 보낸 내용을 되돌린다.

- [ ] **Step 1: api·훅·컴포넌트 수정**

- [ ] **Step 2: 정적 확인**

Run (`Frontend/`): `npm run build` 그리고 `npm run lint` → 오류 0

- [ ] **Step 3: 🔑 브라우저 확인** (`npm run dev`, 카카오 로그인)

카카오 키가 아직 없으면 이 Step을 건너뛰고 History에 보류로 남긴다. 키를 받으면 Task 2 Step 8과 함께 확인한다. 로그인 후 공부 설정에서 시험일을 넣는다(교재는 Task 1 Step 4.5의 SQL을 카카오 계정 id로 실행해 넣는다).

1. "이거 어떻게 써?" → 사용법 안내 말풍선.
2. "보건행정 기본서 30~70p, 기출 20문제 중 5개 틀림" → 진도율이 들어간 답, 상단 오늘의 분량에서 보건행정 항목 상태가 바뀜(펼쳐서 취소선 확인).
3. "영어 성적이 안 올라" → 공부법 답변, 컨텍스트에 없는 점수를 지어내지 않는지 확인.
4. "국어 봉투모의고사 120쪽 추가" → `BOOK_ADD_PENDING` 문구, `books`에 행이 생기지 않음.
5. 새로고침 → 오늘 대화가 그대로 보이고, 사이드바 채팅방 목록에 오늘이 있음.
6. 개발자 도구 Network를 Offline으로 두고 전송 → 오류 문구, 입력창에 내용 복원, 말풍선 남지 않음.
7. (Review Focus 5) 로컬 스토리지의 `sb-…-auth-token`을 지우고 전송 → `/login`으로 이동. 이동하지 않으면 `useChat`의 401 처리에서 `signOut()`을 호출해 가드가 보내도록 고친다.

- [ ] **Step 4: README 상태 갱신**

주요 기능 표의 "🗣 말로 하는 학습 기록"을 ✅로, "🧑‍🏫 과목별 AI 코치"는 공부법 문서 연결 전이므로 🚧 유지.

- [ ] **Step 5: Commit**

```bash
git add Frontend/src README.md
git commit -m "feat: 채팅 화면을 chat 함수에 연결"
```
