# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

사용자와의 대화와 문서는 한국어로 작성한다.

## 프로젝트 개요

**보건직 공무원 시험 관리 Agent** — 보건직 공무원 수험생의 학습을 관리하는 앱. 최종 목표는 시험 합격이며 과목은 국어/영어/공중보건/보건행정 4개다.

주요 기능:
1. **매일 알림**: 정해진 시간(예: 오전 9시)에 카카오톡 또는 PWA 푸시로 '오늘 해야 할 공부 분량'과 응원 메시지 발송
2. **교재 분량 계획**: 보유 교재를 등록하면 시험일까지 날짜별 분량을 나누고 진척률 추적
3. **목표·코치**: 최종 목표(합격) + 단기 목표 설정, 과목별 진도·학습법에 대한 코치 QnA 채팅
4. **학습 기록·대시보드**: 그날 공부한 분량을 채팅으로 보내면 진척률 정리, 모의고사 점수 등록 시 성적 변화 추이를 대시보드로 표시

아직 골격 단계다. 화면 레이아웃(채팅·대시보드·공부 설정)은 잡혀 있지만 로그인이 없어 데이터가 비어 있고, Edge Function 본문은 대부분 TODO 상태다.

관련 문서:
- [SERVICE_FLOW.md](SERVICE_FLOW.md) — 로그인부터 채팅 코칭·분량 조정·교재 추가까지의 서비스 흐름. 기능 작업 전에 확인한다.
- [LOCAL_DEV.md](LOCAL_DEV.md) — 로컬 실행·빌드 확인, 자주 나는 문제
- [DEPLOY.md](DEPLOY.md) — push 기반 자동 배포 설정 (Vercel + GitHub Actions → Supabase)
- [DESIGN.md](DESIGN.md) — 화면 구성, 레이아웃, 색상 토큰, 컴포넌트 규칙. UI 작업 전에 확인한다.

서비스 흐름은 SERVICE_FLOW.md에, 화면 구성은 DESIGN.md에 정의한다.

브랜치: `develop`에서 작업하고 `main`에 병합·push하면 운영 배포된다. `Backend/supabase/**` 변경이 `main`에 들어가면 마이그레이션과 Edge Functions가 자동 배포되므로, 이미 배포된 마이그레이션 파일은 수정하지 않는다.

## 구조

```
Frontend/src/
  pages/        라우트 단위 화면 (기본 화면은 ChatPage)
  components/   재사용 UI (layout/AppLayout: 헤더 + 사이드바)
  interfaces/   도메인 타입·API 요청/응답 계약 (DB 컬럼명 snake_case 그대로)
  api/          Supabase 테이블 조회, Edge Function 호출
  hooks/        api를 감싼 상태 관리 훅 (예: useChat)
  libs/         Supabase 클라이언트, 상수
Backend/
  supabase/migrations/        DB 스키마 (SQL)
  supabase/functions/<name>/  Edge Function (Deno), 함수마다 deno.json
  supabase/functions/_shared/ 함수 공용 모듈 (배포 대상 아님)
  supabase/seed.sql           db reset 시 로컬 시드
  scripts/                    Node 기반 LLM 실험 스크립트 (tsx)
```

Frontend 의존 방향은 `pages → hooks → api → libs`이고, 타입은 `interfaces`에서 가져온다. 페이지에서 Supabase를 직접 호출하지 않는다.

스타일은 Tailwind CSS v4 유틸리티 클래스로 작성한다. 색상은 DESIGN.md의 토큰(`bg-surface`, `text-muted`, `bg-accent` 등)만 쓰고, 규칙은 DESIGN.md의 "라이브러리·도구"를 따른다.

### 데이터 흐름

- 프론트엔드는 `@supabase/supabase-js`로 DB에 직접 접근하고, 모든 테이블은 `user_id = auth.uid()` RLS로 보호된다. LLM 호출과 알림 발송처럼 비밀 키가 필요한 작업만 Edge Function을 거친다.
- Edge Functions:
  - `chat` — 채팅 단일 엔드포인트. 학습 기록 보고면 `study_logs`로 구조화해 저장하고, 질문이면 과목별 코치 답변을 생성한다. 요청/응답 형식은 [interfaces/chat.ts](Frontend/src/interfaces/chat.ts)의 `ChatRequest`/`ChatResponse`를 따른다.
  - `plan-generator` — `profiles.exam_date` 전날까지 교재별 남은 페이지를 나눠 `daily_tasks`를 다시 만든다. 교재 추가·삭제, 시험일 변경 뒤에는 반드시 호출한다. 응답은 [interfaces/plan.ts](Frontend/src/interfaces/plan.ts)의 `PlanResponse`.
  - `daily-briefing` — pg_cron이 `profiles.notify_time`에 호출하며, 오늘의 `daily_tasks`로 응원 메시지를 만들어 PWA 푸시(`push_subscriptions`) 또는 카카오톡으로 보낸다. 보낸 메시지는 채팅에도 남긴다. (cron 등록은 아직 안 됨)
- LLM은 OpenAI Responses API(`client.responses.create`)를 사용하며 프롬프트는 한국어로 쓴다. Edge Function에서는 `_shared/openai.ts`의 클라이언트를 쓴다.
- 코치 답변·알림·화면 문구의 말투는 [docs/coach/coach-tone.md](docs/coach/coach-tone.md)를, 과목별 공부법은 [docs/coach/study-methods/](docs/coach/study-methods/README.md)를 원본으로 삼는다. 프롬프트나 화면 문구를 쓰기 전에 확인한다.

### 꼭 맞춰야 하는 것

- 과목 값은 DB enum `public.subject`(`korean`, `english`, `public_health`, `health_admin`), [Frontend/src/interfaces/subject.ts](Frontend/src/interfaces/subject.ts), [Backend/supabase/functions/_shared/subjects.ts](Backend/supabase/functions/_shared/subjects.ts)가 일치해야 한다.
- `interfaces/`의 도메인 타입은 DB 컬럼과 맞춰 둔다. `npm run gen:types`로 `interfaces/database.ts`가 생기면 그 타입을 기준으로 삼는다.
- 스키마 변경은 `npx supabase migration new <이름>`으로 새 마이그레이션을 추가한다. 개발 프로젝트에 `db push`하기 전인 초기 스키마 초안은 직접 수정해도 된다.

## 명령어

Frontend (`Frontend/`):
```bash
npm run dev       # 개발 서버 http://localhost:5173
npm run build     # tsc -b 타입 체크 + vite build (+ PWA 서비스워커)
npm run lint      # oxlint
```

Backend (`Backend/`). 개발은 Docker 없이 클라우드의 개발용 Supabase 프로젝트를 쓴다(`npx supabase link` 필요, [LOCAL_DEV.md](LOCAL_DEV.md)):
```bash
npm run db:push            # 마이그레이션 → 개발 프로젝트 DB
npm run functions:deploy   # Edge Functions 배포
npm run secrets:set        # supabase/functions/.env → 함수 비밀 값
npm run gen:types          # DB 타입 → Frontend/src/interfaces/database.ts
npm run llm-test           # OpenAI 호출 실험
```
`db push`·`functions deploy`·`secrets set`은 클라우드를 바꾸므로 사용자가 요청할 때만 실행한다. Docker 로컬 Supabase용 `start`/`stop`/`db:reset`/`functions:serve`/`gen:types:local`도 남아 있다.

테스트 프레임워크는 아직 없다.
