import { Navigate } from 'react-router'
import { useSession } from '../../hooks/useSession.ts'
import AppLayout from './AppLayout.tsx'
import SplashScreen from './SplashScreen.tsx'

// 로그인한 사용자만 앱 화면을 본다
export default function RequireAuth() {
  const { session, loading } = useSession()
  if (loading) return <SplashScreen />
  if (!session) return <Navigate to="/login" replace />
  return <AppLayout />
}
