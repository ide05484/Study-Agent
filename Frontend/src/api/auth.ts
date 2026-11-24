import type { Session } from '@supabase/supabase-js'
import { supabase } from '../libs/supabase.ts'

// 돌아오는 곳을 /login으로 둔다: 취소·오류의 error 값을 로그인 화면이 읽고, 성공하면 로그인 화면이 /로 보낸다
export async function signInWithKakao(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: { redirectTo: `${window.location.origin}/login` },
  })
  if (error) throw error
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

// 반환값을 호출하면 구독이 해제된다
export function onSessionChange(callback: (session: Session | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session))
  return () => data.subscription.unsubscribe()
}
