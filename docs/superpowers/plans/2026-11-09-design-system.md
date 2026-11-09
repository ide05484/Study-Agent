# 1.5단계 디자인 시스템 적용 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 확정한 디자인 시스템을 코드에 옮긴다. 반복되는 클래스 묶음을 공용 컴포넌트로 바꾸고, 코치 캐릭터 합격이를 로그인·앱 시작·404 화면과 파비콘에 넣고, 개발 모드 전용 `/ui` 카탈로그를 만든다.

**Architecture:**
- `components/ui/`에 버튼·입력·영역·펼침·안내 문구·꺾쇠·합격이 컴포넌트를 두고, 변형은 `Record<variant, className>` 매핑으로 고른다(새 라이브러리 없음).
- 페이지와 화면 컴포넌트는 이 컴포넌트만 쓰고, `components/ui/classes.ts`는 지운다.
- 합격이는 저장소의 SVG 네 장(`src/assets/mascot/`)을 `<img>`로 쓴다.
- 앱 시작 화면은 `RequireAuth`가 세션을 확인하는 동안, 404는 로그인한 사용자의 알 수 없는 주소에서 보인다.

**Tech Stack:** React 19 + React Router 8 + Tailwind CSS v4, Vite 8 + vite-plugin-pwa 2. 테스트 프레임워크는 없다(Vitest는 3단계). 확인은 `build`·`lint`·`format:check`와 Chrome headless 캡처로 한다.

**Spec:**
- [DESIGN.md](../../../DESIGN.md): 색상, 타이포, 컴포넌트 메모, 코치 캐릭터
- [docs/design/](../../design/README.md): 브랜드 북, `components.md`, 화면 시안 캡처
- [로드맵 1.5](2026-10-27-roadmap.md)

## Global Constraints

- 색은 DESIGN.md 토큰 클래스만 쓴다. 클래스 이름은 문자열로 이어 붙여 만들지 않는다(`bg-heat-${n}` ✕). 변형은 전체 이름을 적은 매핑으로 고른다.
- CONVENTIONS.md를 따른다.
  - 컴포넌트는 파일 하나에 하나, `export default function`, props는 `interface XxxProps`.
  - 버튼에는 `type`을 적는다.
  - 상대 import에는 확장자를 붙인다.
- 화면 문구는 해요체. 이 계획의 문구는 그대로 쓴다.
- 값은 지금 코드와 같게 옮긴다.
  - 버튼 `min-h-11 rounded-xl px-4`, 비활성 `opacity-50`
  - 입력 칸 `min-h-11 rounded-xl border border-line bg-bg px-3 py-2`, 비활성 `opacity-60`
  - 영역 `border-b border-line py-5 last:border-b-0`, 영역 제목 `mb-3 text-[15px] font-bold`
- 합격이는 로그인(`cheer`, 140px), 앱 시작(`think`, 160px), 404(`oops`, 150px)에만 넣는다. 채팅·대시보드·공부 설정과 말풍선에는 넣지 않는다. `alt`는 "코치 합격이".
- `/ui`는 개발 모드에서만 라우트에 들어가고, 운영 빌드 결과에 포함되지 않는다.
- 각 Task 끝에서 `feature/design_system`에 커밋한다. push는 하지 않는다. 스테이징된 `Backend/package.json`·`package-lock.json`은 커밋하지 않는다.
- Task가 끝날 때마다 History 규칙대로 기록한다(메인 세션).

## Review Focus

1. **다크 모드**: 컴포넌트를 바꾼 뒤에도 다크에서 글자·테두리·비활성 상태가 보인다. 합격이는 고정 색이라 어두운 바탕에서도 윤곽이 보인다. → Task 3 `/ui` 라이트·다크 나란히 캡처
2. **로그아웃 상태로 없는 주소**: `/없는주소`는 404가 아니라 `/login`으로 간다. 로그인 상태면 헤더 제목 "페이지 없음"과 404 본문이 보인다. → Task 2 Step 6
3. **360px 화면**: 로그인 화면의 합격이·제목·버튼이 한 화면에 들어가고, 404 문구가 넘치지 않는다. → Task 2 Step 7 캡처(360×740)
4. **파비콘 16px**: 탭 아이콘에서 햄스터 얼굴과 주황 머리띠가 알아보인다(선이 사라지지 않는다). → Task 2 Step 3
5. **`/ui`가 운영 빌드에 섞임**: `dist`에 카탈로그 코드가 없다. → Task 3 Step 4

---

## 실행 방식

| Task | 방식 | 이유 |
|---|---|---|
| 1 | Subagent + 리뷰 | 프론트엔드만 바꾸고, 결과는 Interfaces의 컴포넌트 이름뿐이다 |
| 2 | Subagent + 리뷰 | Task 1의 `Button`·`ButtonLink`·`Notice`를 쓴다 |
| 3 | Subagent + 리뷰 | Task 1·2의 컴포넌트를 모아 보여 준다 |
| 끝 | 전체 브랜치 리뷰(task-reviewer + code-reviewer) | |

구현은 `implementer`가 맡는다. 리뷰는 `task-reviewer`와 `code-reviewer`에게 같은 diff로 동시에 맡긴다(CLAUDE.md "작업 방식").

---

### Task 1: 공용 UI 컴포넌트와 테마 클래스

**Files:**
- Create: `Frontend/src/components/ui/` 아래 파일 9개
  - `Button.tsx`, `ButtonLink.tsx`
  - `TextField.tsx`, `Select.tsx`, `TextArea.tsx`
  - `Section.tsx`, `Disclosure.tsx`, `Chevron.tsx`, `Notice.tsx`
- Modify: `Frontend/src/index.css` (테마 클래스, `--scrim` 토큰)
- Modify: 클래스 묶음을 쓰는 곳 전부
  - `Frontend/src/pages/SettingsPage.tsx`, `pages/DashboardPage.tsx`
  - `components/settings/BookAddForm.tsx`, `components/settings/ExamDateForm.tsx`
  - `components/chat/TodayPlan.tsx`, `components/dashboard/SubjectProgressList.tsx`, `components/layout/Sidebar.tsx`
- Delete: `Frontend/src/components/ui/classes.ts`
- Modify: `DESIGN.md` (색상 표에 `scrim`, "라이브러리·도구"의 `classes.ts` 문장 → 컴포넌트 목록)

**Interfaces:**
- Produces (모두 `components/ui/<이름>.tsx`의 default export):
  - `Button(props: ButtonProps)`
    - `ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'>`
    - 추가 props: `type: 'button' | 'submit'`(필수), `variant?: 'primary' | 'ghost'`(기본 `'primary'`), `block?: boolean`(꽉 채움)
  - `ButtonLink(props: ButtonLinkProps)`: react-router `Link`에 같은 변형을 입힌 것. `ButtonLinkProps { to: string; variant?: 'primary' | 'ghost'; block?: boolean; children: ReactNode }`
  - `TextField`, `Select`, `TextArea`: 각각 `InputHTMLAttributes<HTMLInputElement>`, `SelectHTMLAttributes<HTMLSelectElement>`, `TextareaHTMLAttributes<HTMLTextAreaElement>`를 그대로 받아 입력 칸 모양을 입힌다. `className`은 받지 않는다.
  - `Section(props: { title?: string; children: ReactNode })`: 제목이 있으면 `<h2>`로 그린다.
  - `Disclosure(props: { summary: ReactNode; children: ReactNode })`: `<details className="group">` + `<summary>`(48px, 600, 오른쪽 `Chevron`, 열리면 위로).
  - `Chevron(props: { direction?: 'down' | 'up' | 'right'; className?: string })`: `className`은 `group-open:-rotate-135`처럼 상태 회전을 더할 때만 쓴다.
  - `Notice(props: { tone?: 'info' | 'error'; children: ReactNode })`: `info`는 `text-sm text-muted`, `error`는 `text-sm text-danger` + `role="alert"`.
- 테마
  - `index.css`가 `:root, .theme-light`(라이트), `@media (prefers-color-scheme: dark) { :root }`(다크), `.theme-dark`(다크)를 정의한다.
  - 어떤 요소에 `theme-light`·`theme-dark`를 붙이면 그 아래는 그 테마로 보인다.
  - `--scrim: rgb(28 25 23 / 0.4)`(두 테마 같음) → Tailwind `bg-scrim`

- [ ] **Step 1: `index.css`에 테마 클래스와 `--scrim` 추가**
  - 라이트 블록 선택자를 `:root, .theme-light`로 바꾼다.
  - 다크 값 블록을 `.theme-dark`에도 둔다. 미디어 쿼리 블록과 같은 값이고, 그 사실을 주석 한 줄로 남긴다.
  - `--scrim`을 추가하고 `@theme inline`에 `--color-scrim: var(--scrim)`를 추가한다.
  - DESIGN.md 색상 표에 `--scrim` 행을 넣는다: `scrim`, 라이트·다크 모두 `rgb(28 25 23 / 0.4)`, "사이드바 바깥 딤".
- [ ] **Step 2: 위 컴포넌트 9개 작성**
  - 클래스 값은 Global Constraints와 지금 `classes.ts`·`TodayPlan`·`SubjectProgressList`·`SettingsPage` 그대로 옮긴다.
  - `Button`의 변형 매핑:
    - `primary`: `bg-accent font-semibold text-on-accent`
    - `ghost`: `border border-line bg-bg text-fg`
  - `Chevron` 기본은 `size-2 shrink-0 border-r-2 border-b-2 border-muted transition-transform`이다. 방향 매핑: `down` → `rotate-45`, `up` → `-rotate-135`, `right` → `-rotate-45`.
- [ ] **Step 3: 사용처 교체**
  - `classes.ts`를 import하던 곳을 모두 컴포넌트로 바꾸고 `classes.ts`를 지운다.
  - `Sidebar`의 딤은 `bg-stone-900/40` → `bg-scrim`.
  - 버튼 `type`, `aria-*`, 비활성 조건은 그대로 둔다.
  - 아래 세 곳은 이번 범위가 아니다. 그대로 둔다.
    - `ChatPage`의 보내기 버튼(원형)·입력 줄(둥근 칸)
    - `LoginPage` 카카오 버튼
    - `DatePicker` 트리거
- [ ] **Step 4: 확인**
  - 실행: `cd Frontend && npm run format && npm run build && npm run lint`
  - 기대: 빌드 성공(기존 500kB 청크 경고만), lint 오류 0
  - 실행: `git grep -n "classes.ts\|bg-stone-900" Frontend/src` → 기대: 결과 없음
- [ ] **Step 5: 커밋**
  - 경로: `Frontend/src DESIGN.md`
  - 메시지: `refactor: 반복 클래스 묶음을 공용 UI 컴포넌트로 바꾸고 테마 클래스와 scrim 토큰 추가`

### Task 2: 합격이(로그인·앱 시작·404)와 파비콘

**Files:**
- Create: `Frontend/src/components/ui/Mascot.tsx`, `Frontend/src/components/layout/SplashScreen.tsx`, `Frontend/src/pages/NotFoundPage.tsx`
- Create: `Frontend/public/` 아래 아이콘 4개
  - `apple-touch-icon.png`(180)
  - `pwa-192.png`, `pwa-512.png`
  - `pwa-maskable-512.png`
- Modify: `Frontend/public/favicon.svg`, `Frontend/index.html`, `Frontend/vite.config.ts`
- Modify: `Frontend/src/pages/LoginPage.tsx`, `components/layout/RequireAuth.tsx`, `components/layout/AppLayout.tsx`, `router.tsx`
- Modify: `DESIGN.md` (화면 목록에 앱 시작·404, 로그인 와이어프레임)

**Interfaces:**
- Consumes: Task 1의 `ButtonLink`.
- Produces:
  - `Mascot(props: { mood: MascotMood; size: number })`: `<img src alt="코치 합격이" width height>`
    - `MascotMood = 'base' | 'cheer' | 'think' | 'oops'`, `Mascot.tsx`에서 export한다.
    - SVG는 `src/assets/mascot/hapgyeok-<mood>.svg`를 import해 `Record<MascotMood, string>`으로 고른다.
  - `SplashScreen()`: props 없음. `RequireAuth`가 `loading`일 때 그린다.
  - `NotFoundPage()`: 라우트 `{ path: '*', element: <NotFoundPage /> }`, `RequireAuth` 자식의 마지막에 둔다.

- [ ] **Step 1: `Mascot` 작성**
- [ ] **Step 2: 파비콘 SVG**
  - `public/favicon.svg`를 `src/assets/mascot/hapgyeok-base.svg`로 다시 만든다. 16px에서 선이 사라지지 않게 아래만 바꾼다.
    - `viewBox="8 20 106 106"`
    - 테두리 `stroke-width` 1.8 → 4, 입 1.7 → 3
    - 눈 `r` 3.6 → 5
    - 볼터치는 그대로
  - `width`·`height` 속성은 지운다.
- [ ] **Step 3: PNG 아이콘과 manifest**
  - Chrome headless로 favicon.svg를 PNG로 찍는다. 바탕은 `#faf9f7`, 햄스터는 가운데에 둔다.
    - 일반 아이콘(apple-touch, 192, 512): 햄스터가 폭의 86%
    - maskable: 햄스터가 폭의 64%
  - 찍을 때 쓰는 임시 HTML은 커밋하지 않는다.
  - `vite.config.ts` manifest `icons`:
    - `{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }`
    - `{ src: '/pwa-192.png', sizes: '192x192', type: 'image/png' }`
    - `{ src: '/pwa-512.png', sizes: '512x512', type: 'image/png' }`
    - `{ src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }`
  - `index.html`에 `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />`를 넣는다.
  - 확인: favicon.svg를 16×16, 32×32로 찍어 보고, 얼굴 윤곽·점눈·주황 띠가 보이면 통과다.
- [ ] **Step 4: 로그인 화면**
  - `LoginPage` header의 제목 위에 `<Mascot mood="cheer" size={140} />`를 넣는다.
  - header 위 여백 `pt-16` → `pt-10`, 합격이와 제목 사이 `gap-5`.
  - 소개 문구: "코치 합격이가 오늘 공부할 분량을 정해 드리고, 공부 기록과 고민을 같이 봐요."
- [ ] **Step 5: 앱 시작 화면**
  - `SplashScreen`: `mx-auto flex h-dvh max-w-[480px] flex-col items-center justify-center gap-4 bg-bg`, `role="status"`.
  - 내용 순서:
    1. `Mascot think 160`
    2. "보건직 합격 코치" (`text-[17px] font-bold`)
    3. "오늘의 분량을 챙기고 있어요…" (`text-sm text-muted`)
  - `RequireAuth`의 `if (loading) return null`을 `return <SplashScreen />`으로 바꾼다.
- [ ] **Step 6: 404 화면과 헤더 제목**
  - `NotFoundPage` 본문: 가운데 정렬, `px-8`, `gap-3`.
  - 내용 순서:
    1. `Mascot oops 150`
    2. `<h2 className="mt-2 text-xl font-bold">길을 잃었어요</h2>`
    3. `<p className="text-sm text-muted">주소가 바뀌었거나 없는 화면이에요. 오늘 채팅방으로 돌아가서 이어서 공부해요.</p>`
    4. `<ButtonLink to="/">오늘 채팅으로 가기</ButtonLink>` (`mt-3`)
  - `AppLayout.pageTitle`: 아래가 아닌 경로는 "페이지 없음"을 돌려준다.
    - `/`
    - `/chat/:date`
    - 메뉴 경로
  - 확인 (로그인한 브라우저, 사용자 확인 가능)
    - `/abc` → 헤더 "페이지 없음"과 404 본문
    - 로그아웃 상태로 `/abc` → `/login`
- [ ] **Step 7: 캡처 확인**
  - `npm run dev`를 띄우고 Chrome headless로 `/login`을 390×844와 360×740으로 찍는다.
  - 기대: 합격이·제목·카카오 버튼이 한 화면에 다 보이고, 가로 스크롤이 없다.
  - SplashScreen과 404는 Task 3의 `/ui`에서 함께 찍는다.
- [ ] **Step 8: DESIGN.md**
  - 화면 목록에 두 행을 넣는다.
    - 앱 시작(`RequireAuth` 로딩 중, 경로 없음)
    - 404(`*`, 로그인한 사용자의 알 수 없는 주소)
  - 로그인 와이어프레임에 합격이 자리를 넣는다.
  - "코치 캐릭터: 합격이"의 "아직 코드에 없다" 줄을 지운다.
- [ ] **Step 9: 확인과 커밋**
  - 실행: `npm run format && npm run build && npm run lint` → 기대: 오류 0
  - 경로: `Frontend DESIGN.md` (`Frontend/node_modules` 제외는 .gitignore)
  - 메시지: `feat: 합격이를 로그인·앱 시작·404 화면과 파비콘에 넣음`

### Task 3: 개발 모드 `/ui` 카탈로그

**Files:**
- Create: `Frontend/src/pages/UiCatalogPage.tsx`
- Modify: `Frontend/src/router.tsx`
- Modify: `DESIGN.md` ("컴포넌트 메모" → 컴포넌트 목록과 사용 규칙)

**Interfaces:**
- Consumes: Task 1의 컴포넌트 전부, Task 2의 `Mascot`, `SplashScreen`, `NotFoundPage`.
- Produces: 개발 모드에서만 있는 경로 `/ui`. 로그인 없이 열린다.

- [ ] **Step 1: 라우트**
  - `router.tsx`에서 `import.meta.env.DEV`일 때만 아래 라우트를 배열에 넣는다.
    - `{ path: '/ui', lazy: async () => ({ Component: (await import('./pages/UiCatalogPage.tsx')).default }) }`
  - `RequireAuth` 밖에 둔다.
- [ ] **Step 2: `UiCatalogPage`**
  - 두 열을 나란히 그린다: 왼쪽 `theme-light`, 오른쪽 `theme-dark`. 각 열은 `bg-bg text-fg`, 폭 `max-w-[480px]`.
  - 각 열에 같은 목록을 넣는다.
    - 색상 토큰 칸: 이름 + 칸
    - Button(주요·보조·비활성), ButtonLink
    - TextField·Select·TextArea(일반·비활성)
    - Section, Disclosure, Notice(info·error), Chevron(세 방향)
    - Mascot 네 표정
    - SplashScreen, NotFoundPage
  - SplashScreen과 NotFoundPage는 `h-[600px] overflow-hidden`인 틀 안에 둔다.
  - 페이지 문구는 영역 이름만 쓴다. 설명 문장은 넣지 않는다.
- [ ] **Step 3: 캡처 확인**
  - `npm run dev` 상태에서 Chrome headless로 `/ui`를 1100폭으로 찍는다.
  - 기대: 두 열 모두 글자·테두리·비활성 상태가 보이고, 다크 열의 합격이 윤곽이 보인다.
  - 이미지를 리뷰 보고서에 붙인다.
- [ ] **Step 4: 운영 빌드에서 빠졌는지 확인**
  - 카탈로그의 영역 이름 중 다른 화면에 없는 문자열 하나를 정한다(예: "색상 토큰").
  - 실행: `npm run build && grep -l "색상 토큰" dist/assets/*.js`
  - 기대: 결과 없음
- [ ] **Step 5: DESIGN.md**
  - "컴포넌트 메모"를 "컴포넌트" 목록으로 바꾼다. 컴포넌트마다 한 줄: 이름, 쓰는 곳, 주요 props.
  - 말풍선·입력창·영역 구분·터치·움직임·날짜 선택 규칙은 그대로 둔다.
  - "라이브러리·도구"에 `/ui`(개발 모드 카탈로그)를 적는다.
- [ ] **Step 6: 확인과 커밋**
  - 실행: `npm run format && npm run build && npm run lint` → 기대: 오류 0
  - 경로: `Frontend/src DESIGN.md`
  - 메시지: `feat: 개발 모드 /ui 컴포넌트 카탈로그 추가`

## 완료 기준

- 페이지 파일에 버튼·입력 칸의 Tailwind 클래스가 직접 남지 않는다. 예외는 Task 1 Step 3에 적은 세 곳이다.
- `/ui`에서 모든 컴포넌트와 색상 토큰을 라이트·다크로 볼 수 있다.
- 로그인·앱 시작·404 화면에 합격이가 보인다. 브라우저 탭과 PWA 아이콘이 합격이 얼굴이다.
