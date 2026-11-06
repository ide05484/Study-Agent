import { useEffect } from 'react'
import { NavLink } from 'react-router'
import { useSignOut } from '../../hooks/useAuth.ts'
import { useChatDates } from '../../hooks/useChat.ts'
import { formatDateTitle, todayKey } from '../../libs/date.ts'
import { MENU } from '../../libs/menu.ts'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

function linkClass({ isActive }: { isActive: boolean }): string {
  return `flex min-h-11 items-center gap-2 rounded-[10px] px-3 ${
    isActive ? 'bg-accent-soft font-bold text-accent' : 'text-fg'
  }`
}

// 왼쪽에서 밀려 나오는 메뉴: 현재 공부상태 / 공부 설정 변경 / 채팅방 목록(일자별)
export default function Sidebar({ open, onClose }: SidebarProps) {
  const { dates, error } = useChatDates(open)
  const { signingOut, error: signOutError, signOut, clearError } = useSignOut()
  const today = todayKey()

  // 사이드바를 닫으면 지난 로그아웃 오류를 지운다
  useEffect(() => {
    if (!open) clearError()
  }, [open, clearError])

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
      <div
        className={`absolute inset-0 bg-stone-900/40 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        id="app-sidebar"
        className={`absolute inset-y-0 left-0 w-[min(80%,300px)] overflow-y-auto bg-surface px-3 py-4 transition-transform duration-200 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="메뉴"
        inert={!open}
      >
        <nav>
          {MENU.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass} onClick={onClose}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <section className="mt-4 border-t border-line pt-4">
          <h2 className="mb-1 px-3 text-sm font-semibold text-muted">채팅방 목록</h2>
          <ul>
            {dates.map((date) => (
              <li key={date}>
                <NavLink to={date === today ? '/' : `/chat/${date}`} end className={linkClass} onClick={onClose}>
                  {formatDateTitle(date)}
                  {date === today && (
                    <span className="rounded-md bg-accent px-1.5 text-xs font-semibold text-on-accent">오늘</span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
          {error && <p className="p-4 text-center text-muted">목록을 불러오지 못했어요.</p>}
        </section>
        <div className="mt-4 border-t border-line pt-4">
          <button
            type="button"
            onClick={() => void signOut()}
            disabled={signingOut}
            className="flex min-h-11 w-full items-center rounded-[10px] px-3 text-muted disabled:opacity-50"
          >
            로그아웃
          </button>
          {signOutError && (
            <p className="px-3 pt-1 text-sm text-danger" role="alert">
              {signOutError}
            </p>
          )}
        </div>
      </aside>
    </>
  )
}
