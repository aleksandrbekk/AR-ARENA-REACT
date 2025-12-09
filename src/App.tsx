import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Home } from './pages/Home'
import SkinsPage from './pages/SkinsPage'
import { ShopPage } from './pages/ShopPage'
import { ProfilePage } from './pages/ProfilePage'
import { FarmPage } from './pages/FarmPage'

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
        <Route path="/farm" element={<FarmPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
