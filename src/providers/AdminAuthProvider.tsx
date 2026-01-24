import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { removeStorageItem, STORAGE_KEYS } from '../hooks/useLocalStorage'

interface AdminAuthContextType {
  isAdminAuthenticated: boolean
  adminPassword: string | null
  telegramAdminId: number | null
  verifyAdmin: (password: string) => Promise<boolean>
  verifyTelegramAdmin: (telegramId: number) => Promise<boolean>
  logout: () => void
  getAuthHeaders: () => Record<string, string>
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null)

const ADMIN_IDS = [190202791, 144828618, 288542643, 288475216]

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false)
  const [adminPassword, setAdminPassword] = useState<string | null>(null)
  const [telegramAdminId, setTelegramAdminId] = useState<number | null>(null)

  const verifyAdmin = useCallback(async (password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/verify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })

      const data = await response.json()

      if (data.isAdmin) {
        setIsAdminAuthenticated(true)
        setAdminPassword(password)
        return true
      }
      return false
    } catch (error) {
      console.error('Admin verification failed:', error)
      return false
    }
  }, [])

  const verifyTelegramAdmin = useCallback(async (telegramId: number): Promise<boolean> => {
    if (ADMIN_IDS.includes(telegramId)) {
      setIsAdminAuthenticated(true)
      setTelegramAdminId(telegramId)
      return true
    }

    try {
      const response = await fetch('/api/verify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId })
      })

      const data = await response.json()

      if (data.isAdmin) {
        setIsAdminAuthenticated(true)
        setTelegramAdminId(telegramId)
        return true
      }
      return false
    } catch (error) {
      console.error('Telegram admin verification failed:', error)
      return false
    }
  }, [])

  const logout = useCallback(() => {
    setIsAdminAuthenticated(false)
    setAdminPassword(null)
    setTelegramAdminId(null)
    removeStorageItem(STORAGE_KEYS.ADMIN_AUTH)
  }, [])

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {}

    if (telegramAdminId) {
      headers['X-Telegram-Id'] = String(telegramAdminId)
    }
    if (adminPassword) {
      headers['X-Admin-Password'] = adminPassword
    }

    return headers
  }, [telegramAdminId, adminPassword])

  return (
    <AdminAuthContext.Provider
      value={{
        isAdminAuthenticated,
        adminPassword,
        telegramAdminId,
        verifyAdmin,
        verifyTelegramAdmin,
        logout,
        getAuthHeaders
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext)
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider')
  }
  return context
}
