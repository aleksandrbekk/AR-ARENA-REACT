import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { TelegramUser, GameState } from '../types'

interface UseAuthReturn {
  telegramUser: TelegramUser | null
  gameState: GameState | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  updateGameState: (updates: Partial<GameState>) => void
}

export function useAuth(): UseAuthReturn {
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadGameState = useCallback(async (telegramId: number) => {
    try {
      setIsLoading(true)
      setError(null)

      // Вызываем RPC функцию get_bull_game_state
      const { data, error: rpcError } = await supabase
        .rpc('get_bull_game_state', {
          p_telegram_id: telegramId.toString() // Преобразуем в строку
        })

      if (rpcError) {
        console.error('Error loading game state:', rpcError)
        throw new Error(rpcError.message)
      }

      // RPC с RETURNS TABLE возвращает массив, берём первый элемент
      const row = Array.isArray(data) ? data[0] : data

      console.log('gameState from DB:', data)

      if (row) {
        const state: GameState = {
          balance_bul: Number(row.balance_bul ?? 0),
          balance_ar: Number(row.balance_ar ?? 0),
          energy: Number(row.energy ?? 100),
          energy_max: Number(row.energy_max ?? 100),
          level: Number(row.level ?? 1),
          xp: Number(row.xp ?? 0),
          xp_to_next: Number(row.xp_to_next ?? 1000),
          active_skin: row.active_skin ?? 'Bull1.png',
          last_energy_update: row.last_energy_update ?? new Date().toISOString()
        }

        setGameState(state)
        console.log('Game state:', state)
      } else {
        console.warn('No game state returned from RPC')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load game state'
      setError(errorMessage)
      console.error('useAuth error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refetch = useCallback(async () => {
    if (telegramUser) {
      await loadGameState(telegramUser.id)
    }
  }, [telegramUser, loadGameState])

  const updateGameState = useCallback((updates: Partial<GameState>) => {
    setGameState((prev) => {
      if (!prev) return null
      return { ...prev, ...updates }
    })
  }, [])

  useEffect(() => {
    const initAuth = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Получаем Telegram WebApp
        const tg = window.Telegram?.WebApp

        if (!tg) {
          // Fallback для разработки (когда нет Telegram)
          console.warn('Telegram WebApp not available, using mock user')
          const mockUser: TelegramUser = {
            id: 190202791, // Admin ID для тестирования
            first_name: 'Developer',
            username: 'dev_user'
          }
          setTelegramUser(mockUser)
          console.log('Telegram user (mock):', mockUser)
          await loadGameState(mockUser.id)
          return
        }

        // Инициализируем Telegram WebApp
        tg.ready()
        tg.expand()

        // Получаем данные пользователя
        const user = tg.initDataUnsafe?.user

        if (!user) {
          // Fallback если WebApp есть, но user нет (разработка вне Telegram)
          console.warn('Telegram WebApp exists but no user data, using mock user')
          const mockUser: TelegramUser = {
            id: 190202791,
            first_name: 'Developer',
            username: 'dev_user'
          }
          setTelegramUser(mockUser)
          console.log('Telegram user (mock):', mockUser)
          await loadGameState(mockUser.id)
          return
        }

        const telegramUserData: TelegramUser = {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
          photo_url: user.photo_url,
          language_code: user.language_code
        }

        setTelegramUser(telegramUserData)
        console.log('Telegram user:', telegramUserData)

        // Загружаем состояние игры
        await loadGameState(user.id)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Authentication failed'
        setError(errorMessage)
        console.error('useAuth initialization error:', err)
        setIsLoading(false)
      }
    }

    initAuth()
  }, [loadGameState])

  return {
    telegramUser,
    gameState,
    isLoading,
    error,
    refetch,
    updateGameState
  }
}
