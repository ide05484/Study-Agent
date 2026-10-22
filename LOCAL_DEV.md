# 로컬 실행 · 빌드 가이드

로컬에서 Backend(Supabase)와 Frontend를 각각 띄워 확인하는 방법. 배포는 [DEPLOY.md](DEPLOY.md).

## 0. 준비물

- Node.js 20 이상
- Docker Desktop (로컬 Supabase가 Docker 컨테이너로 실행됨) — 실행 중이어야 한다
- OpenAI API 키

최초 1회 의존성 설치:

```bash
cd Backend && npm install
cd ../Frontend && npm install
```

## 1. Backend (Supabase) 로컬 실행

`Backend/`에서 실행한다.

```bash
npm start            # 로컬 Supabase 시작 (처음엔 Docker 이미지 다운로드로 오래 걸림)
npx supabase status  # URL과 키 다시 보기
```

`npm start`가 끝나면 아래 값들이 출력된다.

| 항목 | 기본값 | 용도 |
|---|---|---|
| API URL | `http://127.0.0.1:54321` | Frontend `VITE_SUPABASE_URL` |
| Studio URL | `http://127.0.0.1:54323` | DB 테이블을 브라우저에서 확인 |
| Publishable key | `sb_publishable_...` | Frontend `VITE_SUPABASE_PUBLISHABLE_KEY` |

### DB 스키마 적용 확인

```bash
npm run db:reset     # migrations/ 전체 재적용 + seed.sql 실행 (로컬 데이터 초기화됨)
npm run gen:types    # DB 타입을 Frontend/src/interfaces/database.ts로 생성
```

Studio(`http://127.0.0.1:54323`) → Table Editor에서 테이블이 생성됐는지 확인한다.

### Edge Functions 실행

```bash
cp supabase/functions/.env.example supabase/functions/.env   # 값 채우기 (OPENAI_API_KEY 등)
npm run functions:serve
```

다른 터미널에서 호출해 본다.

```bash
curl -i -X POST http://127.0.0.1:54321/functions/v1/chat \
  -H "apikey: <Publishable key>" \
  -H "Content-Type: application/json" \
  -d '{"content":"오늘 보건행정 30~70p 공부했어"}'
```

### 종료

```bash
npm run stop
```

## 2. Frontend 로컬 실행

`Frontend/`에서 실행한다. Backend가 먼저 떠 있어야 데이터가 보인다.

```bash
cp .env.example .env.local   # 로컬 Supabase 기본값이 들어 있음 (키가 다르면 위의 Publishable key로 교체)
npm run dev                  # http://localhost:5173
```

### 빌드 확인

```bash
npm run lint      # oxlint
npm run build     # 타입 체크(tsc -b) + 프로덕션 빌드 → dist/
npm run preview   # 빌드 결과를 http://localhost:4173 에서 확인
```

PWA(서비스워커, 설치, 푸시)는 `npm run dev`에서는 동작하지 않는다. `build` → `preview`로 확인한다.

## 3. 자주 나는 문제

| 증상 | 해결 |
|---|---|
| 브라우저에서 504 `Outdated Optimize Dep` | 개발 서버 종료 → `Frontend/node_modules/.vite` 삭제 → `npx vite --force`로 재시작. 개발 서버를 두 개 띄우지 않는다. |
| 화면이 하얗고 콘솔에 `VITE_SUPABASE_URL ... 설정되어 있지 않습니다` | `Frontend/.env.local`이 없다. `cp .env.example .env.local` 후 서버 재시작 |
| 채팅에 `Failed to fetch` | Backend(로컬 Supabase)가 꺼져 있다. `Backend`에서 `npm start` |

## 4. 배포

push 기반 자동 배포는 [DEPLOY.md](DEPLOY.md)를 참고한다.
