# 코드 컨벤션

이 저장소의 코드를 쓰고 리뷰할 때 따르는 규칙이다. 2026-11-06 기존 코드에서 실제로 쓰고 있는 패턴을 뽑아 정리했다.

- 폴더 구조와 의존 방향은 [CLAUDE.md](CLAUDE.md) "구조"가 기준이다.
- 화면 구성, 색상 토큰, Tailwind 사용 규칙은 [DESIGN.md](DESIGN.md)가 기준이다.
- 화면 문구와 코치 말투는 [docs/coach/coach-tone.md](docs/coach/coach-tone.md)가 기준이다.

이 문서는 위 문서에 없는 코드 작성 규칙을 다룬다. 겹치는 내용은 링크만 둔다.

2026-11-06 사용자가 포매터, 줄 길이, 훅 반환 타입, props 타입, 오류 문구 말투를 확정했다(맨 아래 "결정 기록").

---

## 1. 공통

- 주석, 오류 문구, 문서는 한국어로 쓴다. 식별자(변수, 함수, 타입 이름)는 영어로 쓴다.
- 주석은 코드가 말하지 못하는 것(왜 이렇게 했는지, 범위, 단위, 주의점)만 쓴다. 코드를 그대로 읽어 주는 주석은 쓰지 않는다.
  - 좋은 예: `// 시험 당일은 비우고 전날까지 공부한다`, `// from ~ to (양 끝 포함) 기간의 일별 계획`
- 파일이나 함수의 역할 설명은 선언 바로 위에 `//` 한두 줄로 둔다.
- 할 일은 `// TODO: 무엇을` 형식으로 쓴다. 이유가 있으면 같은 줄에 적는다.
- 비밀 값(API 키, 토큰, 비밀번호)은 코드와 문서에 쓰지 않는다. `.env`, `.env.local`에만 둔다.
- 과목 값은 `korean`, `english`, `public_health`, `health_admin`만 쓴다. 화면 표시는 `SUBJECT_LABELS`로 바꾼다.
- 날짜 키는 `YYYY-MM-DD` 문자열이다. 날짜 산술은 `libs/date.ts`(Frontend), `_shared/date.ts`(Backend)를 쓴다. `Date`를 직접 더하거나 빼지 않는다.

## 2. 이름

| 대상 | 규칙 | 예 |
|---|---|---|
| 변수, 함수 | camelCase | `todayKey`, `fetchBooks` |
| 모듈 상수 | UPPER_SNAKE_CASE | `APP_TIMEZONE`, `SUBJECT_LABELS` |
| 타입, 인터페이스 | PascalCase, 접두사 `I` 없음 | `Book`, `DailyTaskWithBook` |
| 컴포넌트 props 타입 | `컴포넌트명Props` | `BookAddFormProps` |
| 훅 상태 타입 | `이름State` | `ProfileState` |
| DB 컬럼에서 온 필드 | snake_case 그대로 | `total_units`, `exam_date` |
| 불리언 상태 | 형용사·분사 그대로 | `open`, `loading`, `sending`, `saving`, `valid` |
| 불리언을 돌려주는 함수 | `is`/`has` 접두사 | `isDateKey`, `hasAuthError` |
| 이벤트 처리 함수 (컴포넌트 안) | `handle` + 동작 | `handleSubmit`, `handleLogin` |
| 콜백 props | `on` + 동작 | `onAdd`, `onCancel`, `onMenuClick` |

- 로컬 변수는 camelCase로 쓴다. DB에 넣는 객체 키만 snake_case로 쓴다. 예: `const user_id = await requireUserId()`처럼 insert에 바로 펼칠 때.

## 3. Frontend (React + TypeScript)

### 3.1 포맷

Prettier로 맞춘다(`Frontend/.prettierrc.json`). 커밋 전에 `npm run format`을 돌린다. `npm run format:check`로 확인할 수 있다.

- 들여쓰기 2칸, 작은따옴표(`'`), 세미콜론 없음
- 여러 줄 객체·배열·인자 끝에 쉼표
- JSX 속성 값은 큰따옴표(`className="..."`)
- 한 줄은 120자(`printWidth`)를 넘기지 않는다. 120자 안에서는 다음 기준으로 판단한다.
  - 한 줄로 두는 게 로직을 이해하기 쉬우면 굳이 나누지 않는다.
  - 나누는 게 읽기 좋으면 나눈다. 예: 조건이 여러 개인 식, 단계가 많은 쿼리 체인, 인자가 많은 호출.
- Prettier가 나누지 못하는 긴 주석은 직접 나눈다. className, SVG path처럼 이어 붙이지 않고는 나눌 수 없는 문자열은 120자를 넘어도 그대로 둔다(3.8).
- 자동 생성 파일(`src/interfaces/database.ts`)은 포맷하지 않는다(`.prettierignore`).

### 3.2 파일과 폴더

| 폴더 | 파일 이름 | export |
|---|---|---|
| `pages/` | `XxxPage.tsx` (PascalCase) | `export default function XxxPage()` |
| `components/<영역>/` | `ComponentName.tsx` (PascalCase) | `export default function ComponentName()` |
| `components/ui/` | `ComponentName.tsx` (PascalCase) | `export default function ComponentName()` |
| `hooks/` | `useXxx.ts` | named export `export function useXxx()` |
| `api/` | 도메인 이름 소문자 (`study.ts`, `chat.ts`) | named export `export async function` |
| `interfaces/` | 도메인 이름 camelCase (`mockExam.ts`) | `export interface`, `export type` |
| `libs/` | 역할 이름 소문자 (`date.ts`, `errors.ts`) | named export |

- 컴포넌트들이 함께 쓰는 상수·도우미는 같은 폴더에 camelCase `.ts`로 두고 named export한다(예: `components/ui/buttonVariants.ts`).

- `components/` 아래는 화면 영역별 폴더(`chat/`, `dashboard/`, `settings/`, `layout/`)로 나눈다. 여러 화면에서 쓰면 `ui/`에 둔다.
- 파일 하나에 컴포넌트 하나를 default export한다. 그 컴포넌트만 쓰는 작은 도우미 함수는 같은 파일에 둔다.
- 함수는 `function` 선언으로 쓴다. 화살표 함수는 콜백과 인라인 핸들러에만 쓴다.

### 3.3 import

- 순서: 외부 패키지(`react`, `react-router`, `@supabase/...`) → 상대 경로. 각 묶음 안에서는 경로 알파벳 순이다(VS Code "Organize Imports" 결과와 같다).
- 상대 경로 import에는 확장자(`.ts`, `.tsx`)를 붙인다.
- 타입만 가져올 때는 `import type`을 쓴다. 값과 함께 가져오면 `import { useState, type FormEvent }`처럼 쓴다(`verbatimModuleSyntax`).
- 경로 별칭(`@/`)은 쓰지 않는다.

### 3.4 TypeScript

- `strict`를 켜 둔다. `any`는 쓰지 않는다. 모르는 값은 `unknown`으로 받고 좁혀서 쓴다.
- `catch (e)`의 `e`는 `unknown`으로 다루고, 화면에 보일 문구는 `toErrorMessage(e)`로 만든다.
- `as`는 Supabase 쿼리 결과를 도메인 타입으로 바꿀 때만 쓴다. `as unknown as`, `!`(non-null 단언)는 이유를 주석으로 남길 때만 쓴다.
- 객체 모양은 `interface`로 쓴다. 합집합, `Pick`/`Omit` 조합, 함수 타입은 `type`으로 쓴다.
- 공개 함수(export)에는 반환 타입을 적는다. 훅도 같다. 훅의 반환 객체가 크면 `interface XxxState`로 선언한다(`ProfileState`처럼).
- enum은 쓰지 않는다. 문자열 리터럴 합집합과 `as const` 객체를 쓴다.

### 3.5 api 계층 (`api/`)

- Supabase 호출은 `api/`에서만 한다. 함수 하나가 쿼리 하나 또는 Edge Function 호출 하나를 맡는다.
- 이름: 조회 `fetchXxx`, 추가 `addXxx`, 수정 `updateXxx`, 삭제 `deleteXxx`, 함수 호출은 동사(`sendChatMessage`, `regeneratePlan`).
- `select`에는 필요한 컬럼만 적는다. `select('*')`는 쓰지 않는다.
- 오류는 `if (error) throw error`로 그대로 던진다. 문구로 바꾸는 일은 훅이 한다.
- insert에 `user_id`가 필요하면 `requireUserId()`로 얻는다.
- 쿼리 의미가 이름만으로 드러나지 않으면(기간 포함 여부, 정렬, RLS 전제) 위에 한 줄 주석을 단다.

### 3.6 훅 (`hooks/`)

- 화면 상태는 훅이 갖는다. 페이지와 컴포넌트는 훅만 부른다.
- 반환은 객체다. 데이터, `loading`/`sending` 같은 진행 상태, `error: string | null`, 동작 함수를 함께 돌려준다.
- 마운트 때 불러오기는 아래 형태로 쓴다. 언마운트 뒤에 상태를 바꾸지 않도록 `ignore` 플래그를 둔다.

  ```ts
  useEffect(() => {
    let ignore = false
    fetchXxx()
      .then((result) => {
        if (!ignore) setXxx(result)
      })
      .catch((e: unknown) => {
        if (!ignore) setError(toErrorMessage(e))
      })
    return () => {
      ignore = true
    }
  }, [deps])
  ```

- 돌려주는 동작 함수는 `useCallback`으로 감싼다.
- 성공 여부가 필요한 동작은 `Promise<boolean>`을 돌려준다. 실패 사유는 `error` 상태로 보인다.
- 구독(`onSessionChange` 등)은 effect의 cleanup에서 해제한다.

### 3.7 컴포넌트와 페이지

- props 타입은 컴포넌트 위에 `interface XxxProps`로 선언한다. props가 하나뿐이어도 같다. 인라인 타입(`{ date }: { date: string }`)은 쓰지 않는다.
- 훅은 모두 호출한 뒤에 조건부 `return`을 둔다.
- 로딩, 빈 상태, 오류 상태를 각각 보이게 한다. 데이터가 아직 없으면 `null`을 돌려도 된다.
- 목록 `key`는 데이터 id를 쓴다. 배열 index는 쓰지 않는다.
- 버튼에는 `type`을 적는다(`type="button"`, `type="submit"`).
- 접근성: 아이콘만 있는 버튼은 `aria-label`, 장식용 요소는 `aria-hidden="true"`, 펼치는 요소는 `aria-expanded`/`aria-controls`, 오류 문구는 `role="alert"`.
- 비동기 핸들러를 이벤트에 바로 걸 때는 `void fn()`으로 쓴다. 이때 실패가 사용자에게 보이는지 확인한다(훅의 `error` 상태 등).

### 3.8 스타일 (Tailwind)

[DESIGN.md](DESIGN.md) "색상", "라이브러리·도구"를 따른다. 요약하면 다음과 같다.

- 유틸리티 클래스만 쓰고, 색상은 토큰 클래스만 쓴다.
- 클래스 이름을 문자열로 이어 붙여 만들지 않는다(`bg-heat-${n}` ✕). 조건부로 붙일 때는 전체 이름을 적는다(`${open ? '-rotate-135' : ''}`).
- 여러 화면에서 반복되는 버튼·입력·섹션 모양은 `components/ui/`의 컴포넌트(`Button`, `TextField`, `Section` 등)를 쓴다.

### 3.9 문구

- 화면에 보이는 문구는 해요체로 쓴다(coach-tone.md). 오류 문구도 같다. 예: "목록을 불러오지 못했어요."
- `throw new Error('...')`의 문구도 `toErrorMessage`를 거쳐 화면에 나갈 수 있으면 해요체로 쓴다.
- 개발자만 보는 문구(환경 변수 누락처럼 앱 시작 때 멈추는 throw)는 말투를 따지지 않는다.

## 4. Backend (Supabase Edge Functions, Deno)

### 4.1 포맷

`deno fmt` 기본값을 따른다.

- 들여쓰기 2칸, 큰따옴표(`"`), 세미콜론 있음, 한 줄 80자

### 4.2 파일 구조

- 함수마다 `supabase/functions/<함수명>/index.ts`와 `deno.json`(imports)을 둔다. 함수명은 kebab-case(`plan-generator`)로 쓴다.
- 함수끼리 쓰는 코드는 `_shared/`에 둔다. `_shared/` 파일 이름은 소문자 한 단어(`date.ts`, `subjects.ts`)로 짓는다.
- OpenAI·Supabase를 import하지 않는 순수 로직은 따로 파일로 둔다. 테스트는 같은 폴더의 `<이름>_test.ts`에 둔다(`deno test`).
- `index.ts` 맨 위에 `// [함수명] 누가 언제 부르는지, 무엇을 하는지`를 적는다. 응답 형식이 Frontend `interfaces/`에 있으면 그 위치를 적는다.

### 4.3 함수 작성

- 사용자 데이터를 다루는 함수는 `withSupabase({ auth: "user" }, ...)`로 감싸고, `ctx.supabase`(RLS 적용)를 쓴다. RLS를 우회하는 클라이언트는 이유를 주석으로 남길 때만 쓴다.
- 요청 본문은 검증한 뒤 쓴다. 잘못된 입력은 400 `{ error: "<코드>" }`로 응답한다.
- DB 오류는 `errorResponse(message)`(500 `{ error }`)로 돌려준다. 오류 코드는 snake_case 문자열이다(`invalid_content`, `analysis_failed`).
- 응답은 `Response.json(...)`을 쓴다.
- LLM은 `_shared/openai.ts`의 클라이언트와 모델 상수를 쓴다. 프롬프트는 한국어로 쓴다. LLM 출력은 검증 함수를 거친 뒤 DB에 쓴다.
- DB 행 타입은 `XxxRow` 인터페이스로 파일 안에 선언한다. `Frontend/src/interfaces/database.ts`가 있으면 그 타입과 맞춘다.
- 템플릿에서 온 `console.log`, 영어 안내 주석은 구현할 때 지운다.

## 5. DB (SQL 마이그레이션)

- 키워드는 소문자로 쓰고, 객체 이름 앞에 스키마를 붙인다(`public.books`).
- 테이블과 컬럼 이름은 snake_case 복수형 테이블(`books`, `daily_tasks`)로 쓴다.
- 테이블마다 위에 `-- 한 줄 설명` 주석을 단다.
- 사용자 데이터 테이블은 `user_id uuid not null references auth.users (id) on delete cascade`, RLS 켜기, `user_id = auth.uid()` 정책(`using` + `with check`)을 함께 만든다.
- 값 제약은 `check`로 DB에 둔다(`total_units > 0`).
- 새 변경은 `npx supabase migration new <이름>`으로 파일을 만든다. 이름은 snake_case 영어다. 이미 배포된 마이그레이션은 고치지 않는다.
- `security definer` 함수는 `set search_path = ''`로 고정하고, anon·authenticated의 실행 권한을 회수한다.

## 6. Git

- 브랜치: `develop`에서 `feature/<snake_case_이름>`을 따서 작업한다(예: `feature/kakao_login`). `main` 병합은 운영 배포다.
- 커밋 메시지: `<종류>: <한국어 요약>`. 종류는 `feat`(기능), `fix`(버그), `chore`(설정·도구·타입 생성), `docs`(문서·기록), `refactor`(동작이 같은 구조 변경)다.
- 커밋 메시지와 PR 본문에 `Co-Authored-By: Claude …` 같은 Claude 표시 줄을 넣지 않는다.
- 커밋에는 그 작업의 파일만 경로를 지정해 넣는다. `git add -A`, `git add .`는 쓰지 않는다.

---

## 결정 기록

| 날짜 | 항목 | 결정 |
|---|---|---|
| 2026-11-06 | Frontend 포매터 | Prettier 도입 (3.1) |
| 2026-11-06 | 한 줄 길이 | 120자 안에서, 한 줄이 이해에 도움이 되면 두고 나누는 게 읽기 좋으면 나눈다 (3.1) |
| 2026-11-06 | 훅 반환 타입 | 적는다 (3.4) |
| 2026-11-06 | props 타입 | `XxxProps` 인터페이스 (3.7) |
| 2026-11-06 | 오류 문구 말투 | 화면에 나가는 문구는 해요체 (3.9) |

## 정리 대상

확정한 규칙과 어긋나는 기존 코드다. 고치면 이 목록에서 지운다. Frontend 항목은 2026-11-06 정리 작업에서 모두 고쳤다(History 참고).

- **템플릿 코드**: `Backend/supabase/functions/chat/index.ts`, `daily-briefing/index.ts`의 `console.log`와 영어 주석 (Task 6에서 교체 예정)
