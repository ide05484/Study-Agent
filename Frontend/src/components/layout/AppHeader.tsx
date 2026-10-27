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
    <header className="app-header">
      <button
        type="button"
        className="icon-button"
        aria-label="메뉴 열기"
        aria-expanded={sidebarOpen}
        aria-controls="app-sidebar"
        onClick={onMenuClick}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <h1 className="app-title">{title}</h1>
      {/* 시험일 미설정이면 D-?로 표시하고, 누르면 공부 설정에서 시험일을 정한다 */}
      <Link to="/settings" className="app-dday" aria-label={examDate ? `시험까지 ${formatDDay(examDate)}` : '시험일 설정'}>
        {formatDDay(examDate)}
      </Link>
    </header>
  )
}
