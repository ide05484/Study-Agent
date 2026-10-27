import { createBrowserRouter } from 'react-router'
import AppLayout from './components/layout/AppLayout.tsx'
import ChatPage from './pages/ChatPage.tsx'
import DashboardPage from './pages/DashboardPage.tsx'
import SettingsPage from './pages/SettingsPage.tsx'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <ChatPage /> },
      { path: 'chat/:date', element: <ChatPage /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
])
