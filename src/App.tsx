import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ToastProvider } from './components/ToastProvider'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Home } from './pages/Home'
import SkinsPage from './pages/SkinsPage'
import { ShopPage } from './pages/ShopPage'
import { ProfilePage } from './pages/ProfilePage'
import { FarmPage } from './pages/FarmPage'
// import { FarmPageGemini } from './pages/FarmPageGemini'
import { GiveawaysPage } from './pages/GiveawaysPage'
import { GiveawayDetailsPage } from './pages/GiveawayDetailsPage'
import { LiveArenaPage } from './pages/LiveArenaPage'
import { AdminPage } from './pages/AdminPage'
import PaymentSuccessPage from './pages/PaymentSuccessPage'
import { FullCrmPage } from './pages/FullCrmPage'
import { PremiumPromoPage } from './pages/PremiumPromoPage'
import { TariffsPage } from './pages/TariffsPage'
import { PricingPage } from './pages/PricingPage'
import { PricingPage2 } from './pages/PricingPage2'
import { PricingPageGate } from './pages/PricingPageGate'
import { StreamPage } from './pages/StreamPage'
import { StreamAdminPage } from './pages/StreamAdminPage'

function App() {
  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (tg) {
      tg.ready()

      // Fullscreen только на мобильных устройствах
      const platform = tg.platform
      const isMobile = platform === 'android' || platform === 'ios'

      if (isMobile) {
        tg.expand()
        if (typeof tg.requestFullscreen === 'function') {
          try {
            tg.requestFullscreen()
          } catch (e) {
            console.warn('requestFullscreen not supported:', e)
          }
        }
      }

      tg.setHeaderColor('#0a0a0a')
    }
  }, [])

  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/skins" element={<SkinsPage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/farm" element={<FarmPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/giveaways" element={<GiveawaysPage />} />
            <Route path="/giveaway/:id" element={<GiveawayDetailsPage />} />
            <Route path="/live-arena/:id" element={<LiveArenaPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/payment-success" element={<PaymentSuccessPage />} />
            <Route path="/crm" element={<Navigate to="/full-crm" replace />} />
            <Route path="/full-crm" element={<FullCrmPage />} />
            <Route path="/premium-promo" element={<PremiumPromoPage />} />
            <Route path="/tariffs" element={<TariffsPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/pricing2" element={<PricingPage2 />} />
            <Route path="/pricing-gate" element={<PricingPageGate />} />
            <Route path="/stream" element={<StreamPage />} />
            <Route path="/live" element={<StreamPage />} />
            <Route path="/stream-admin" element={<StreamAdminPage />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App

