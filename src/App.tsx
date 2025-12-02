import { useEffect } from 'react'
import { Home } from './pages/Home'

function App() {
  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (tg) {
      tg.ready()
      tg.expand()
      tg.requestFullscreen?.()
      tg.setHeaderColor('#0a0a0a')
    }
  }, [])

  return <Home />
}

export default App
