import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import TabsLayout from './components/TabsLayout'
import './index.css'
import { I18nProvider } from './lib/i18n'
import MenuPage from './pages/MenuPage'
import OrderCardPage from './pages/OrderCardPage'
import StorePage from './pages/StorePage'

const router = createBrowserRouter([
  // 탭 3개는 하나의 레이아웃 아래 둬서 탭을 오가도 다시 마운트되지 않게 한다
  { element: <TabsLayout />, children: [{ path: '/', element: null }, { path: '/reels', element: null }, { path: '/ask', element: null }] },
  { path: '/s/:slug', element: <StorePage /> },
  { path: '/s/:slug/menu', element: <MenuPage /> },
  { path: '/s/:slug/order', element: <OrderCardPage /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <div className="mx-auto h-full max-w-[480px] bg-white shadow-[0_0_0_1px_#e5e5e5]">
        <RouterProvider router={router} />
      </div>
    </I18nProvider>
  </StrictMode>,
)
