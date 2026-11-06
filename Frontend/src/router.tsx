import { createBrowserRouter } from 'react-router'
import RequireAuth from './components/layout/RequireAuth.tsx'
import ChatPage from './pages/ChatPage.tsx'
import DashboardPage from './pages/DashboardPage.tsx'
import LoginPage from './pages/LoginPage.tsx'
import SettingsPage from './pages/SettingsPage.tsx'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <RequireAuth />,
    children: [
      { index: true, element: <ChatPage /> },
      { path: 'chat/:date', element: <ChatPage /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
])
