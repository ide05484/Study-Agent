import { useCallback, useState } from 'react'
import { matchPath, Outlet, useLocation } from 'react-router'
import { useCarryOver } from '../../hooks/useCarryOver.ts'
import { useProfile } from '../../hooks/useProfile.ts'
import { formatDateTitle, isDateKey, todayKey } from '../../libs/date.ts'
import { MENU } from '../../libs/menu.ts'
import DialogProvider from '../ui/DialogProvider.tsx'
import AppHeader from './AppHeader.tsx'
import OverdueTargetsModal from './OverdueTargetsModal.tsx'
import Sidebar from './Sidebar.tsx'

// 모든 화면 공통: 헤더(햄버거 / 제목 / D-day) + 본문, 햄버거로 여는 왼쪽 사이드바
export default function AppLayout() {
  const profileState = useProfile()
  const examDate = profileState.profile?.exam_date ?? null
  // 앱을 열 때 지난 날짜에 못 끝낸 분량을 남은 날로 다시 나눈다(목표일 지남 창과 함께 돌아도 DB 잠금으로 차례로 돈다)
  useCarryOver(examDate)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])
  const { pathname } = useLocation()

  return (
    <div className="relative mx-auto flex h-dvh max-w-[480px] flex-col overflow-hidden">
      <AppHeader
        title={pageTitle(pathname)}
        examDate={examDate}
        sidebarOpen={sidebarOpen}
        onMenuClick={() => setSidebarOpen(true)}
      />
      <main className="min-h-0 flex-1 overflow-y-auto">
        <DialogProvider>
          <Outlet context={profileState} />
          <OverdueTargetsModal examDate={examDate} />
        </DialogProvider>
      </main>
      <Sidebar open={sidebarOpen} onClose={closeSidebar} />
    </div>
  )
}

// 채팅 화면은 채팅방 날짜, 메뉴 화면은 메뉴 이름, 그 외 주소는 "페이지 없음"
function pageTitle(pathname: string): string {
  const menu = MENU.find((item) => matchPath({ path: item.to, end: true }, pathname))
  if (menu) return menu.label
  if (pathname === '/') return formatDateTitle(todayKey())
  const date = matchPath('/chat/:date', pathname)?.params.date
  if (date) return formatDateTitle(isDateKey(date) ? date : todayKey())
  return '페이지 없음'
}
