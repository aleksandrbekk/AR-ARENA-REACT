import { useState, useCallback, useEffect } from 'react'

/**
 * Типизированные ключи localStorage
 * Все ключи должны быть определены здесь для безопасности типов
 */
export const STORAGE_KEYS = {
  // Admin authentication
  ADMIN_AUTH: 'admin_auth',

  // Telegram browser authentication
  TELEGRAM_BROWSER_AUTH: 'telegram_browser_auth',

  // Promo/Sales data
  PROMO_TELEGRAM_ID: 'promo_telegram_id',
  PROMO_TELEGRAM_USERNAME: 'promo_telegram_username',
  PROMO_UTM_SOURCE: 'promo_utm_source',

  // Stream data
  STREAM_VISITOR_ID: 'stream_visitor_id',
  STREAM_UTM_SOURCE: 'stream_utm_source',
  STREAM_GUEST_NAME: 'stream_guest_name',

  // Onboarding
  ONBOARDING_SEEN: 'onboarding_seen_v1',

  // Video player position (dynamic key)
  KINESCOPE_TIME_PREFIX: 'kinescope_',
} as const

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS]

/**
 * Безопасно получить значение из localStorage
 */
export function getStorageItem<T = string>(key: string): T | null {
  if (typeof window === 'undefined') return null

  try {
    const item = localStorage.getItem(key)
    if (item === null) return null

    // Try to parse as JSON, fallback to string
    try {
      return JSON.parse(item) as T
    } catch {
      return item as unknown as T
    }
  } catch (error) {
    console.error(`Error reading localStorage key "${key}":`, error)
    return null
  }
}

/**
 * Безопасно установить значение в localStorage
 */
export function setStorageItem<T>(key: string, value: T): boolean {
  if (typeof window === 'undefined') return false

  try {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value)
    localStorage.setItem(key, serialized)
    return true
  } catch (error) {
    console.error(`Error setting localStorage key "${key}":`, error)
    return false
  }
}

/**
 * Безопасно удалить значение из localStorage
 */
export function removeStorageItem(key: string): boolean {
  if (typeof window === 'undefined') return false

  try {
    localStorage.removeItem(key)
    return true
  } catch (error) {
    console.error(`Error removing localStorage key "${key}":`, error)
    return false
  }
}

/**
 * React хук для работы с localStorage с автоматической синхронизацией
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(() => {
    const item = getStorageItem<T>(key)
    return item !== null ? item : initialValue
  })

  // Setter function
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue(prev => {
      const valueToStore = value instanceof Function ? value(prev) : value
      setStorageItem(key, valueToStore)
      return valueToStore
    })
  }, [key])

  // Remove function
  const removeValue = useCallback(() => {
    removeStorageItem(key)
    setStoredValue(initialValue)
  }, [key, initialValue])

  // Sync with other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue) as T)
        } catch {
          setStoredValue(e.newValue as unknown as T)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [key])

  return [storedValue, setValue, removeValue]
}

/**
 * Специализированные хуки для конкретных данных
 */

// Admin auth
export function useAdminAuthStorage() {
  return useLocalStorage<string | null>(STORAGE_KEYS.ADMIN_AUTH, null)
}

// Promo data
export function usePromoData() {
  const [telegramId] = useLocalStorage<string | null>(STORAGE_KEYS.PROMO_TELEGRAM_ID, null)
  const [username] = useLocalStorage<string | null>(STORAGE_KEYS.PROMO_TELEGRAM_USERNAME, null)
  const [utmSource] = useLocalStorage<string | null>(STORAGE_KEYS.PROMO_UTM_SOURCE, null)

  return { telegramId, username, utmSource }
}

// Stream data
export function useStreamData() {
  const [visitorId, setVisitorId] = useLocalStorage<string | null>(STORAGE_KEYS.STREAM_VISITOR_ID, null)
  const [utmSource, setUtmSource] = useLocalStorage<string | null>(STORAGE_KEYS.STREAM_UTM_SOURCE, null)
  const [guestName, setGuestName] = useLocalStorage<string | null>(STORAGE_KEYS.STREAM_GUEST_NAME, null)

  return {
    visitorId, setVisitorId,
    utmSource, setUtmSource,
    guestName, setGuestName
  }
}

// Onboarding
export function useOnboardingSeen() {
  return useLocalStorage<boolean>(STORAGE_KEYS.ONBOARDING_SEEN, false)
}

// Kinescope video position (dynamic key based on videoId)
export function useKinescopePosition(videoId: string) {
  const key = `${STORAGE_KEYS.KINESCOPE_TIME_PREFIX}${videoId}_time`
  return useLocalStorage<number>(key, 0)
}
