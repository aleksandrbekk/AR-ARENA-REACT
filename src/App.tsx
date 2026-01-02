import { useEffect, Suspense, lazy } from 'react'
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom'
import { ToastProvider } from './components/ToastProvider'
import { ErrorBoundary } from './components/ErrorBoundary'

// Public Pages
import { Home } from './pages/Home'
import SkinsPage from './pages/SkinsPage'
import { ShopPage } from './pages/ShopPage'
import { ProfilePage } from './pages/ProfilePage'
import { FarmPage } from './pages/FarmPage'
import { FarmPageGemini } from './pages/FarmPageGemini'
import { GiveawaysPage } from './pages/GiveawaysPage'
import { GiveawayDetailsPage } from './pages/GiveawayDetailsPage'
import { GiveawayResultsPage } from './pages/GiveawayResultsPage'
import { LiveArenaPage } from './pages/LiveArenaPage'
import { AdminPage } from './pages/AdminPage'
import PaymentSuccessPage from './pages/PaymentSuccessPage'
import { PricingPage } from './pages/PricingPage'
import { StreamPage } from './pages/StreamPage'
import { StreamAdminPage } from './pages/StreamAdminPage'
import { VaultPage } from './pages/VaultPage'

// Lazy Loaded Admin Modules for Unified Workspace
const AdminLayoutLazy = lazy(() => import('./layouts/AdminLayout').then(m => ({ default: m.AdminLayout })))
const FullCrmPageLazy = lazy(() => import('./pages/FullCrmPage').then(m => ({ default: m.FullCrmPage })))
const InboxPageLazy = lazy(() => import('./pages/InboxPage').then(m => ({ default: m.InboxPage })))

// Root Component that handles Telegram initialization
function Root() {
  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (tg) {
      tg.ready()
      const platform = tg.platform
      const isMobile = platform === 'android' || platform === 'ios'
      if (isMobile) {
        tg.expand()
        if (typeof tg.requestFullscreen === 'function') {
          try { tg.requestFullscreen() } catch (e) { console.warn('requestFullscreen error', e) }
        }
      }
      tg.setHeaderColor('#0a0a0a')
    }
  }, [])

  return (
    <ErrorBoundary>
      <ToastProvider>
        <Outlet />
      </ToastProvider>
    </ErrorBoundary>
  )
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    children: [
      // --- PUBLIC ROUTES ---
      { index: true, element: <Home /> },
      { path: "skins", element: <SkinsPage /> },
      { path: "shop", element: <ShopPage /> },
      { path: "farm", element: <FarmPage /> },
      { path: "profile", element: <ProfilePage /> },
      { path: "giveaways", element: <GiveawaysPage /> },
      { path: "giveaway/:id", element: <GiveawayDetailsPage /> },
      { path: "giveaway/:id/results", element: <GiveawayResultsPage /> },
      { path: "live-arena/:id", element: <LiveArenaPage /> },
      { path: "live/:id", element: <LiveArenaPage /> },
      { path: "payment-success", element: <PaymentSuccessPage /> },
      { path: "pricing", element: <PricingPage /> },
      { path: "stream", element: <StreamPage /> },
      { path: "live", element: <StreamPage /> },
      { path: "vault", element: <VaultPage /> },

      // --- LEGACY / STANDALONE ADMIN ROUTES ---
      // (Leaving them for backward compatibility until fully migrated)
      { path: "admin", element: <AdminPage /> },
      { path: "stream-admin", element: <StreamAdminPage /> },
      { path: "farm-alt", element: <FarmPageGemini /> },

      // --- NEW UNIFIED ADMIN WORKSPACE ---
      {
        path: "app",
        element: (
          <Suspense fallback={<div className="h-screen bg-[#0a0a0a] flex items-center justify-center text-[#FFD700]">Loading Workspace...</div>}>
            <AdminLayoutLazy />
          </Suspense>
        ),
        children: [
          // Index route for /app to handle redirection if needed or show default state
          {
            index: true,
            element: <div className="h-full flex items-center justify-center text-white/50">Select a project...</div>
          },
          // Если пользователь зашел просто на /app, его перекинет Layout (см. внутри AdminLayout)
          {
            path: ":projectId",
            children: [
              { path: "dashboard", element: <AdminPage /> }, // Reusing existing dashboard
              { path: "crm", element: <Suspense fallback={<div>Loading CRM...</div>}><FullCrmPageLazy /></Suspense> },
              { path: "inbox", element: <Suspense fallback={<div>Loading Inbox...</div>}><InboxPageLazy /></Suspense> },
              { path: "settings", element: <div className="p-8 text-white">Project Settings Placeholder</div> }
            ]
          }
        ]
      },

      // Redirects for old routes to new structure (optional, or kept for safety)
      // For now, let's keep old routes working as standalone, but user can access /app
      { path: "crm", element: <Navigate to="/full-crm" replace /> },
      { path: "full-crm", element: <Suspense fallback={<div>Loading...</div>}><FullCrmPageLazy /></Suspense> },
      { path: "inbox", element: <Suspense fallback={<div>Loading...</div>}><InboxPageLazy /></Suspense> }
    ]
  }
])

function App() {
  return <RouterProvider router={router} />
}

export default App

