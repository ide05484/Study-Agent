# 배포 가이드

로컬에서 확인 → GitHub에 push → 자동 배포되는 흐름이다.

```
develop 브랜치에서 작업·로컬 확인 (LOCAL_DEV.md)
   │ git push origin develop      → Vercel 미리보기 배포 + Frontend CI(린트·빌드)
   ▼
main에 병합(PR 또는 merge 후 push)
   │ git push origin main         → Vercel 운영 배포
   │                              → Backend/supabase 변경 시 Supabase 배포(GitHub Actions)
   ▼
운영: https://<프로젝트>.vercel.app  +  Supabase 클라우드
```

| 대상 | 배포 담당 | 설정 위치 |
|---|---|---|
| Frontend | Vercel (GitHub 연동, push 시 자동) | Vercel 대시보드, `Frontend/vercel.json` |
| Frontend 검증 | GitHub Actions | `.github/workflows/frontend-ci.yml` |
| DB 스키마·Edge Functions | GitHub Actions + Supabase CLI | `.github/workflows/supabase-deploy.yml` |

## 최초 1회 설정

### 1. Supabase 프로젝트

1. https://supabase.com/dashboard 에서 새 프로젝트를 만든다. 지역은 Seoul(ap-northeast-2)을 권장하며, DB 비밀번호를 기록해 둔다.
2. 아래 값을 확인한다.
   - **Project ref**: 프로젝트 URL `https://<ref>.supabase.co`의 `<ref>`
   - **Project URL / Publishable key**: Project Settings → API Keys
   - **Access token**: 우측 상단 계정 → Account preferences → Access Tokens에서 생성
3. Edge Function 비밀 값을 등록한다. `Backend/`에서 1회 실행한다.
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref>
   npx supabase secrets set --env-file supabase/functions/.env
   ```

### 2. GitHub 저장소 Secrets

GitHub 저장소 → Settings → Secrets and variables → Actions → New repository secret

| 이름 | 값 |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | Access token |
| `SUPABASE_DB_PASSWORD` | DB 비밀번호 |
| `SUPABASE_PROJECT_ID` | Project ref |

등록 전에는 Supabase 배포 워크플로가 실패하지 않고 건너뛴다. 등록 후 Actions 탭 → Supabase Deploy → Run workflow로 처음 한 번 수동 실행할 수 있다.

### 3. Vercel (Frontend)

1. https://vercel.com 에 GitHub 계정으로 로그인 → Add New → Project → `Study-Agent` 저장소 Import
2. **Root Directory**를 `Frontend`로 지정한다. Framework는 Vite로 자동 인식된다.
3. Environment Variables에 추가한다.
   - `VITE_SUPABASE_URL` = Project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = Publishable key
4. Deploy. 이후에는 push할 때마다 자동 배포된다. Production Branch는 `main`(Settings → Git)이다.

### 4. Supabase Auth 주소

Supabase 대시보드 → Authentication → URL Configuration
- Site URL: Vercel 운영 주소(`https://<프로젝트>.vercel.app`)
- Redirect URLs: 운영 주소, `http://localhost:5173`

## 평소 작업 흐름

```bash
git checkout develop
# 작업 후 로컬 확인 (LOCAL_DEV.md)
git add . && git commit -m "feat: ..."
git push origin develop          # 미리보기 배포로 확인

git checkout main
git merge develop
git push origin main             # 운영 배포
git checkout develop
```

## 주의

- DB 스키마 변경은 반드시 `npx supabase migration new <이름>`으로 새 파일을 만든다. 이미 클라우드에 적용된 마이그레이션 파일을 고치면 `db push`가 반영하지 않는다.
- `.env`, `.env.local`, `supabase/functions/.env`는 git에 올라가지 않는다. 운영 값은 Vercel·Supabase 대시보드와 GitHub Secrets에서만 관리한다.
