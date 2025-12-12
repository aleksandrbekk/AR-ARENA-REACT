import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Home } from './pages/Home'
import SkinsPage from './pages/SkinsPage'
import { ShopPage } from './pages/ShopPage'
import { ProfilePage } from './pages/ProfilePage'
import { FarmPageGemini } from './pages/FarmPageGemini'
import { GiveawaysPage } from './pages/GiveawaysPage'
import { GiveawayDetailsPage } from './pages/GiveawayDetailsPage'
import { LiveArenaPage } from './pages/LiveArenaPage'
import { AdminPage } from './pages/AdminPage'
import PaymentSuccessPage from './pages/PaymentSuccessPage'

function App() {
  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (tg) {
      tg.ready()
      tg.expand()
      // Проверяем что метод существует и поддерживается
      if (typeof tg.requestFullscreen === 'function') {
        try {
          tg.requestFullscreen()
        } catch (e) {
          console.warn('requestFullscreen not supported:', e)
        }
      }
      tg.setHeaderColor('#0a0a0a')
    }
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/skins" element={<SkinsPage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/farm" element={<FarmPageGemini />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/giveaways" element={<GiveawaysPage />} />
        <Route path="/giveaway/:id" element={<GiveawayDetailsPage />} />
        <Route path="/live-arena/:id" element={<LiveArenaPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/payment-success" element={<PaymentSuccessPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

