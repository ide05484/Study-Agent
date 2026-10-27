# 로컬 실행 · 빌드 가이드

Frontend는 내 PC에서 띄우고, Supabase(DB·인증·Edge Functions)는 **클라우드의 개발용 프로젝트**를 쓴다. Docker는 필요 없다. 배포는 [DEPLOY.md](DEPLOY.md).

```
내 PC                                    Supabase 클라우드 (개발용 프로젝트)
Frontend  npm run dev  ── supabase-js ──▶  DB · Auth · Edge Functions
Backend   npx supabase CLI ── db push / functions deploy ──▶
```

## 0. 준비물

- Node.js 20 이상
- Supabase 계정과 **개발용 프로젝트** 1개 (무료 플랜)
- OpenAI API 키 (채팅·코치 기능)

최초 1회 의존성 설치:

```bash
cd Backend && npm install
cd ../Frontend && npm install
```

> 개발용 프로젝트는 운영과 분리한다. 실제 배포할 때는 운영용 프로젝트를 새로 만들고 DEPLOY.md를 따른다.

## 1. Supabase 개발 프로젝트 연결 (최초 1회)

`Backend/`에서 실행한다.

1. https://supabase.com/dashboard 에서 프로젝트를 만든다. 지역은 Seoul(ap-northeast-2)을 권장하며, DB 비밀번호를 기록해 둔다.
2. CLI를 로그인하고 프로젝트에 연결한다. Project ref는 프로젝트 URL `https://<ref>.supabase.co`의 `<ref>`다.
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref>   # DB 비밀번호 입력
   ```
3. DB 스키마를 적용한다. 적용 결과는 대시보드 → Table Editor에서 확인한다.
   ```bash
   npm run db:push
   ```
4. Edge Function 비밀 값을 등록하고 함수를 배포한다.
   ```bash
   cp supabase/functions/.env.example supabase/functions/.env   # OPENAI_API_KEY 등 채우기
   npm run secrets:set
   npm run functions:deploy
   ```
5. 대시보드 → Authentication → URL Configuration
   - Site URL: `http://localhost:5173`
   - Redirect URLs: `http://localhost:5173`

## 2. Frontend 실행

`Frontend/`에서 실행한다.

```bash
cp .env.example .env.local   # 개발 프로젝트의 Project URL / Publishable key로 교체
npm run dev                  # http://localhost:5173
```

값은 대시보드 → Project Settings → API Keys에 있다. Publishable key는 브라우저에 노출돼도 되는 공개용 키이고, `.env.local`은 git에 올라가지 않는다.

### 빌드 확인

```bash
npm run lint      # oxlint
npm run build     # 타입 체크(tsc -b) + 프로덕션 빌드 → dist/
npm run preview   # 빌드 결과를 http://localhost:4173 에서 확인
```

PWA(서비스워커, 설치, 푸시)는 `npm run dev`에서는 동작하지 않는다. `build` → `preview`로 확인한다.

## 3. 스키마·함수를 바꿨을 때

`Backend/`에서 실행한다.

| 바꾼 것 | 할 일 |
|---|---|
| DB 스키마 | `npx supabase migration new <이름>`으로 새 파일 작성 → `npm run db:push` |
| Edge Function | `npm run functions:deploy` (함수 하나만: `npx supabase functions deploy <이름> --use-api`) |
| `supabase/functions/.env` | `npm run secrets:set` 후 함수 재배포 |
| DB 타입 갱신 | `npm run gen:types` → `Frontend/src/interfaces/database.ts` |

- 이미 `db push`한 마이그레이션 파일은 고치지 않는다. 적용 이력이 남아 있어 다시 반영되지 않는다.
- 개발 DB를 처음부터 다시 만들려면 `npx supabase db reset --linked`를 쓴다. **개발 프로젝트의 데이터가 모두 지워진다.**
- Edge Function 로그는 대시보드 → Edge Functions → 함수 선택 → Logs에서 본다.

## 4. 자주 나는 문제

| 증상 | 해결 |
|---|---|
| 화면이 하얗고 콘솔에 `VITE_SUPABASE_URL ... 설정되어 있지 않습니다` | `Frontend/.env.local`이 없다. `cp .env.example .env.local` 후 값을 채우고 서버 재시작 |
| `Failed to fetch` | `.env.local`의 URL·키를 확인한다. 무료 프로젝트는 오래 쓰지 않으면 일시 정지되므로 대시보드에서 Restore |
| `relation "public.…" does not exist` | 스키마를 아직 적용하지 않았다. `npm run db:push` |
| Edge Function 호출이 404 | 함수를 배포하지 않았다. `npm run functions:deploy` |
| 브라우저에서 504 `Outdated Optimize Dep` | 개발 서버 종료 → `Frontend/node_modules/.vite` 삭제 → `npx vite --force`로 재시작. 개발 서버를 두 개 띄우지 않는다. |

## 5. (선택) Docker로 로컬 Supabase 띄우기

Docker Desktop이 있으면 Supabase 전체를 내 PC에서 띄울 수 있다. 데이터를 마음껏 초기화할 수 있고 Edge Function을 바로 다시 실행할 수 있다.

```bash
# Backend/
npm start                 # 로컬 Supabase 시작 (URL·키 출력, 다시 보기: npx supabase status)
npm run db:reset          # 마이그레이션 재적용 + seed.sql
npm run functions:serve   # Edge Functions 로컬 실행 (supabase/functions/.env)
npm run gen:types:local   # 로컬 DB 기준 타입 생성
npm run stop
```

이때 `Frontend/.env.local`은 `VITE_SUPABASE_URL=http://127.0.0.1:54321`과 `npx supabase status`의 Publishable key로 바꾼다. 로컬 Studio는 http://127.0.0.1:54323 이다.
