// Telegram WebApp types
export interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
}

export interface TelegramWebApp {
  initData: string
  initDataUnsafe: {
    user?: TelegramUser
  }
  version: string
  platform: string
  colorScheme: 'light' | 'dark'
  isExpanded: boolean
  viewportHeight: number
  viewportStableHeight: number
  ready: () => void
  expand: () => void
  close: () => void
  requestFullscreen?: () => void
  setHeaderColor: (color: string) => void
}

// User types
export interface User {
  id: string
  telegram_id: number
  username: string
  first_name: string
  balance_coins: number
  balance_tickets: number
  energy: number
  max_energy: number
  level: number
  created_at: string
}

// Station types
export interface Station {
  id: number
  name: string
  description: string
  reward_coins: number
  is_completed: boolean
}
