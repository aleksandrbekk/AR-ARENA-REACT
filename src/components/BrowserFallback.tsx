// Экран для пользователей, открывших сайт в браузере (не в Telegram)
// Теперь с возможностью авторизации через Telegram Login Widget

import { useState } from 'react'
import { TelegramLoginButton } from './TelegramLoginButton'
import type { TelegramAuthData } from '../types'
import { setStorageItem, STORAGE_KEYS } from '../hooks/useLocalStorage'

interface BrowserFallbackProps {
  onAuth?: (user: TelegramAuthData) => void
}

export function BrowserFallback({ onAuth }: BrowserFallbackProps) {
  const botUrl = 'https://t.me/ARARENA_BOT'
  const botName = 'ARARENA_BOT'
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const handleTelegramAuth = async (user: TelegramAuthData) => {
    // SECURITY FIX: Removed console.log with user data
    setIsAuthenticating(true)
    setAuthError(null)

    try {
      // Верифицируем на сервере
      const response = await fetch('/api/telegram-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      })

      const data = await response.json()

      if (data.success && data.user) {
        // Сохраняем в localStorage для persistence
        setStorageItem(STORAGE_KEYS.TELEGRAM_BROWSER_AUTH, {
          ...data.user,
          auth_date: user.auth_date
        })
        
        // Вызываем callback если есть
        if (onAuth) {
          onAuth(user)
        }
        
        // Перезагружаем страницу чтобы AuthProvider подхватил
        window.location.reload()
      } else {
        setAuthError(data.error || 'Ошибка авторизации')
      }
    } catch (err) {
      console.error('Auth error:', err)
      setAuthError('Ошибка подключения к серверу')
    } finally {
      setIsAuthenticating(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#FFD700]/10 blur-[150px] rounded-full pointer-events-none" />

      {/* Logo */}
      <div className="relative z-10 mb-8">
        <div className="w-24 h-24 bg-gradient-to-br from-[#FFD700] to-[#FFA500] rounded-2xl flex items-center justify-center shadow-[0_0_60px_rgba(255,215,0,0.3)]">
          <span className="text-black font-black text-3xl tracking-tight">AR</span>
        </div>
      </div>

      {/* Title */}
      <h1 className="relative z-10 text-3xl font-black text-white text-center mb-2">
        AR ARENA
      </h1>
      <p className="relative z-10 text-white/50 text-center mb-8">
        Telegram Mini App
      </p>

      {/* Auth Section */}
      <div className="relative z-10 bg-zinc-900/80 border border-white/10 rounded-2xl p-6 max-w-sm w-full text-center mb-6">
        <div className="text-4xl mb-4">🔐</div>
        <p className="text-white/80 text-sm leading-relaxed mb-6">
          Войдите через Telegram чтобы<br />
          использовать приложение в браузере
        </p>

        {isAuthenticating ? (
          <div className="text-white/60">Авторизация...</div>
        ) : (
          <TelegramLoginButton
            botName={botName}
            onAuth={handleTelegramAuth}
            buttonSize="large"
            cornerRadius={12}
          />
        )}

        {authError && (
          <p className="text-red-400 text-sm mt-4">{authError}</p>
        )}
      </div>

      {/* Divider */}
      <div className="relative z-10 flex items-center gap-4 mb-6 w-full max-w-sm">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-white/30 text-sm">или</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      {/* Open in Telegram Button */}
      <a
        href={botUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="relative z-10 px-8 py-4 bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black font-bold rounded-xl text-lg shadow-[0_4px_20px_rgba(255,215,0,0.4)] hover:shadow-[0_4px_30px_rgba(255,215,0,0.6)] transition-shadow"
      >
        Открыть в Telegram
      </a>

      {/* Bot name */}
      <p className="relative z-10 text-white/30 text-sm mt-4">
        @ARARENA_BOT
      </p>
    </div>
  )
}
