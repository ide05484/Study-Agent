import { createBrowserRouter, type RouteObject } from 'react-router'
import RequireAuth from './components/layout/RequireAuth.tsx'
import ChatPage from './pages/ChatPage.tsx'
import DashboardPage from './pages/DashboardPage.tsx'
import LoginPage from './pages/LoginPage.tsx'
import NotFoundPage from './pages/NotFoundPage.tsx'
import SettingsPage from './pages/SettingsPage.tsx'

// /ui 카탈로그는 개발 모드에서만 넣는다. lazy라 운영 빌드에는 들어가지 않는다
const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [{ path: '/ui', lazy: async () => ({ Component: (await import('./pages/UiCatalogPage.tsx')).default }) }]
  : []

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  ...devRoutes,
  {
    path: '/',
    element: <RequireAuth />,
    children: [
      { index: true, element: <ChatPage /> },
      { path: 'chat/:date', element: <ChatPage /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
