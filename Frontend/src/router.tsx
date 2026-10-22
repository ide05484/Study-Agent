import { createBrowserRouter } from 'react-router'
import AppLayout from './components/layout/AppLayout.tsx'
import ChatPage from './pages/ChatPage.tsx'
import BooksPage from './pages/BooksPage.tsx'
import DashboardPage from './pages/DashboardPage.tsx'
import GoalsPage from './pages/GoalsPage.tsx'
import SettingsPage from './pages/SettingsPage.tsx'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <ChatPage /> },
      { path: 'books', element: <BooksPage /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'goals', element: <GoalsPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
])
