import { useState } from 'react'
import { Navigate } from 'react-router'
import SplashScreen from '../components/layout/SplashScreen.tsx'
import Mascot from '../components/ui/Mascot.tsx'
import { useKakaoLogin } from '../hooks/useAuth.ts'
import { useSession } from '../hooks/useSession.ts'

// 카카오 로그인에서 취소·오류로 돌아오면 URL의 search 또는 hash에 error가 실린다
function hasAuthError(): boolean {
  const search = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  return search.has('error') || hash.has('error')
}

export default function LoginPage() {
  const { session, loading } = useSession()
  const { redirecting, error, login } = useKakaoLogin()
  const [urlError, setUrlError] = useState(hasAuthError)

  // 코드 교환 중에는 RequireAuth와 같은 스플래시를 보여 줘 로그인 직후 화면이 바뀌지 않게 한다
  if (loading) return <SplashScreen />
  if (session) return <Navigate to="/" replace />

  const handleLogin = () => {
    setUrlError(false)
    void login()
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-between bg-bg px-6 py-12">
      <header className="flex flex-col items-start gap-5 pt-10">
        <Mascot mood="cheer" size={140} />
        <h1 className="text-[26px] font-bold">보건직 합격 코치</h1>
        <p className="text-muted">코치 합격이가 오늘 공부할 분량을 정해 드리고, 공부 기록과 고민을 같이 봐요.</p>
      </header>
      <div>
        <button
          type="button"
          onClick={handleLogin}
          disabled={loading || redirecting}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-kakao px-4 font-semibold text-on-kakao disabled:opacity-50"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path
              fill="#000"
              d="M9 1.5C4.58 1.5 1 4.31 1 7.78c0 2.24 1.5 4.21 3.75 5.32l-.95 3.48a.3.3 0 0 0 .46.33l4.1-2.72c.21.02.42.03.64.03 4.42 0 8-2.81 8-6.44S13.42 1.5 9 1.5Z"
            />
          </svg>
          카카오 로그인
        </button>
        {(urlError || error !== null) && (
          <p role="alert" className="mt-3 text-center text-danger">
            로그인하지 못했어요. 다시 시도해 주세요.
          </p>
        )}
        <p className="mt-4 text-center text-sm text-muted">카카오 계정으로 로그인하면 공부 기록이 계정에 저장돼요.</p>
      </div>
    </div>
  )
}
