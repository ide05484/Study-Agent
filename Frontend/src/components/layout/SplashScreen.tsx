import Mascot from '../ui/Mascot.tsx'

// 로그인 상태를 확인하는 동안 보이는 앱 시작 화면
export default function SplashScreen() {
  return (
    <div role="status" className="mx-auto flex h-dvh max-w-[480px] flex-col items-center justify-center gap-4 bg-bg">
      <Mascot mood="think" size={160} />
      <p className="text-[17px] font-bold">보건직 합격 코치</p>
      <p className="text-sm text-muted">오늘의 분량을 챙기고 있어요…</p>
    </div>
  )
}
