import { Link } from 'react-router'
import { formatDDay } from '../../libs/date.ts'

interface AppHeaderProps {
  title: string
  examDate: string | null
  sidebarOpen: boolean
  onMenuClick: () => void
}

export default function AppHeader({ title, examDate, sidebarOpen, onMenuClick }: AppHeaderProps) {
  return (
    <header className="grid min-h-14 grid-cols-[1fr_auto_1fr] items-center border-b border-line px-2">
      <button
        type="button"
        className="grid size-11 place-items-center rounded-xl"
        aria-label="메뉴 열기"
        aria-expanded={sidebarOpen}
        aria-controls="app-sidebar"
        onClick={onMenuClick}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <h1 className="text-center text-[17px] font-bold">{title}</h1>
      {/* 시험일 미설정이면 D-?로 표시하고, 누르면 공부 설정에서 시험일을 정한다 */}
      <Link
        to="/settings"
        className="justify-self-end px-2 py-2.5 font-bold text-accent"
        aria-label={examDate ? `시험까지 ${formatDDay(examDate)}` : '시험일 설정'}
      >
        {formatDDay(examDate)}
      </Link>
    </header>
  )
}
