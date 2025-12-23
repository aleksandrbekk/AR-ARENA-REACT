import { useState, useEffect } from 'react'
import type { TelegramWebApp, TelegramUser } from '../types'

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp
    }
  }
}

export function useTelegram() {
  const [isReady, setIsReady] = useState(false)
  const [user, setUser] = useState<TelegramUser | null>(null)

  useEffect(() => {
    const tg = window.Telegram?.WebApp

    if (tg) {
      tg.ready()
      // expand() вызывается в App.tsx только для мобильных устройств
      setUser(tg.initDataUnsafe.user || null)
      setIsReady(true)
    } else {
      // Mock user for development
      setUser({
        id: 123456789,
        first_name: 'Developer',
        username: 'dev_user',
      })
      setIsReady(true)
    }
  }, [])

  return {
    tg: window.Telegram?.WebApp || null,
    user,
    isReady,
  }
}
