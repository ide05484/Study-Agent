import { useCallback, useState } from 'react'
import { matchPath, Outlet, useLocation } from 'react-router'
import { useProfile } from '../../hooks/useProfile.ts'
import { formatDateTitle, isDateKey, todayKey } from '../../libs/date.ts'
import { MENU } from '../../libs/menu.ts'
import AppHeader from './AppHeader.tsx'
import Sidebar from './Sidebar.tsx'

// 모든 화면 공통: 헤더(햄버거 / 제목 / D-day) + 본문, 햄버거로 여는 왼쪽 사이드바
export default function AppLayout() {
  const profileState = useProfile()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])
  const { pathname } = useLocation()

  return (
    <div className="relative mx-auto flex h-dvh max-w-[480px] flex-col overflow-hidden">
      <AppHeader
        title={pageTitle(pathname)}
        examDate={profileState.profile?.exam_date ?? null}
        sidebarOpen={sidebarOpen}
        onMenuClick={() => setSidebarOpen(true)}
      />
      <main className="min-h-0 flex-1 overflow-y-auto">
        <Outlet context={profileState} />
      </main>
      <Sidebar open={sidebarOpen} onClose={closeSidebar} />
    </div>
  )
}

// 채팅 화면은 채팅방 날짜, 그 외 화면은 메뉴 이름
function pageTitle(pathname: string): string {
  const menu = MENU.find((item) => item.to === pathname)
  if (menu) return menu.label
  const date = matchPath('/chat/:date', pathname)?.params.date
  return formatDateTitle(date && isDateKey(date) ? date : todayKey())
}
