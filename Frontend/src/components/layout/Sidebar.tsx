import { useEffect } from 'react'
import { NavLink } from 'react-router'
import { useChatDates } from '../../hooks/useChat.ts'
import { formatDateTitle, todayKey } from '../../libs/date.ts'
import { MENU } from '../../libs/menu.ts'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

// 왼쪽에서 밀려 나오는 메뉴: 현재 공부상태 / 공부 설정 변경 / 채팅방 목록(일자별)
export default function Sidebar({ open, onClose }: SidebarProps) {
  const { dates, error } = useChatDates(open)
  const today = todayKey()

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  return (
    <>
      <div className={`sidebar-scrim${open ? ' is-open' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside id="app-sidebar" className={`sidebar${open ? ' is-open' : ''}`} aria-label="메뉴" inert={!open}>
        <nav className="sidebar-section">
          {MENU.map((item) => (
            <NavLink key={item.to} to={item.to} className="sidebar-link" onClick={onClose}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <section className="sidebar-section">
          <h2 className="sidebar-heading">채팅방 목록</h2>
          <ul className="sidebar-dates">
            {dates.map((date) => (
              <li key={date}>
                <NavLink to={date === today ? '/' : `/chat/${date}`} end className="sidebar-link" onClick={onClose}>
                  {formatDateTitle(date)}
                  {date === today && <span className="sidebar-badge">오늘</span>}
                </NavLink>
              </li>
            ))}
          </ul>
          {error && <p className="status-text">목록을 불러오지 못했어요.</p>}
        </section>
      </aside>
    </>
  )
}
