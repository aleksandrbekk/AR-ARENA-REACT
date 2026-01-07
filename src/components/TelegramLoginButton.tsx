import { useEffect, useRef } from 'react'

interface TelegramLoginButtonProps {
  botName: string
  onAuth: (user: TelegramAuthData) => void
  buttonSize?: 'large' | 'medium' | 'small'
  cornerRadius?: number
  requestAccess?: 'write'
}

export interface TelegramAuthData {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
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
    window.onTelegramAuth = (user: TelegramAuthData) => {
      console.log('Telegram auth data received:', user)
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
      containerRef.current.innerHTML = ''
      containerRef.current.appendChild(script)
    }

    return () => {
      window.onTelegramAuth = undefined
    }
  }, [botName, buttonSize, cornerRadius, requestAccess, onAuth])

  return <div ref={containerRef} className="flex justify-center" />
}

