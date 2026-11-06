import { useCallback, useState } from 'react'
import { signInWithKakao, signOut as signOutApi } from '../api/auth.ts'

// 카카오 로그인. 이동 중에는 redirecting, 시작하지 못하면 error
export function useKakaoLogin(): { redirecting: boolean; error: boolean; login: () => Promise<void> } {
  const [redirecting, setRedirecting] = useState(false)
  const [error, setError] = useState(false)

  const login = useCallback(async () => {
    setRedirecting(true)
    setError(false)
    try {
      await signInWithKakao()
    } catch {
      setRedirecting(false)
      setError(true)
    }
  }, [])

  return { redirecting, error, login }
}

// 로그아웃. 실패하면 error에 안내 문구를 둔다
export function useSignOut(): { error: string | null; signOut: () => Promise<void> } {
  const [error, setError] = useState<string | null>(null)

  const signOut = useCallback(async () => {
    setError(null)
    try {
      await signOutApi()
    } catch {
      setError('로그아웃하지 못했어요. 다시 시도해 주세요.')
    }
  }, [])

  return { error, signOut }
}
