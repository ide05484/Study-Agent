import { NavLink, Outlet } from 'react-router'

const TABS = [
  { to: '/', label: '채팅' },
  { to: '/books', label: '교재' },
  { to: '/dashboard', label: '대시보드' },
  { to: '/goals', label: '목표' },
] as const

export default function AppLayout() {
  return (
    <div className="app">
      <header className="app-header">
        <span className="app-title">보건직 합격 코치</span>
        <NavLink to="/settings">설정</NavLink>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <nav className="tab-bar">
        {TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.to === '/'}>
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
