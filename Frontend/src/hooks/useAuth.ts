import { useCallback, useState } from 'react'
import { signInWithKakao, signOut as signOutApi } from '../api/auth.ts'

export interface KakaoLoginState {
  redirecting: boolean
  error: string | null
  login: () => Promise<void>
}

// 카카오 로그인. 이동 중에는 redirecting, 시작하지 못하면 error에 안내 문구를 둔다
export function useKakaoLogin(): KakaoLoginState {
  const [redirecting, setRedirecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = useCallback(async () => {
    setRedirecting(true)
    setError(null)
    try {
      await signInWithKakao()
    } catch (e: unknown) {
      console.error(e)
      setRedirecting(false)
      setError('로그인하지 못했어요. 다시 시도해 주세요.')
    }
  }, [])

  return { redirecting, error, login }
}

export interface SignOutState {
  signingOut: boolean
  error: string | null
  signOut: () => Promise<void>
  clearError: () => void
}

// 로그아웃. 진행 중에는 signingOut, 실패하면 error에 안내 문구를 둔다
export function useSignOut(): SignOutState {
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signOut = useCallback(async () => {
    setSigningOut(true)
    setError(null)
    try {
      await signOutApi()
    } catch (e: unknown) {
      console.error(e)
      setError('로그아웃하지 못했어요. 다시 시도해 주세요.')
    } finally {
      setSigningOut(false)
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return { signingOut, error, signOut, clearError }
}
