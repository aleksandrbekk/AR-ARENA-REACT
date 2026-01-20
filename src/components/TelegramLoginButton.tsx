import { useEffect, useRef } from 'react'
import type { TelegramAuthData } from '../types'

interface TelegramLoginButtonProps {
  botName: string
  onAuth: (user: TelegramAuthData) => void
  buttonSize?: 'large' | 'medium' | 'small'
  cornerRadius?: number
  requestAccess?: 'write'
}

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramAuthData) => void
  }
}

export function TelegramLoginButton({
  botName,
  onAuth,
  buttonSize = 'large',
  cornerRadius = 12,
  requestAccess = 'write'
}: TelegramLoginButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Устанавливаем глобальный callback
    // SECURITY FIX: Removed console.log with user data
    window.onTelegramAuth = (user: TelegramAuthData) => {
      onAuth(user)
    }

    // Создаём скрипт виджета
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', botName)
    script.setAttribute('data-size', buttonSize)
    script.setAttribute('data-radius', cornerRadius.toString())
    script.setAttribute('data-request-access', requestAccess)
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    script.async = true

    if (containerRef.current) {
      // SECURITY FIX: Use safe DOM method instead of innerHTML
      while (containerRef.current.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild)
      }
      containerRef.current.appendChild(script)
    }

    return () => {
      window.onTelegramAuth = undefined
    }
  }, [botName, buttonSize, cornerRadius, requestAccess, onAuth])

  return <div ref={containerRef} className="flex justify-center" />
}

