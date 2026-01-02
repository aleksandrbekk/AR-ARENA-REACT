import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useTelegram } from './useTelegram'

// Типы
interface VaultReward {
    base_amount: number
    rarity: 'common' | 'uncommon' | 'rare' | 'legendary' | 'epic'
    streak: number
    multiplier: number
    final_amount: number
    is_golden: boolean
}

interface VaultHistoryItem {
    id: string
    reward_amount: number
    reward_rarity: string
    streak_at_open: number
    streak_multiplier: number
    final_amount: number
    is_golden: boolean
    created_at: string
}

interface VaultState {
    streak: number
    lockpick_available: boolean
    last_claim_date: string | null
    last_open_date: string | null
    total_opened: number
    total_earned: number
    can_claim: boolean
    can_open: boolean
}

interface UseVaultReturn {
    // Состояние
    state: VaultState | null
    history: VaultHistoryItem[]
    loading: boolean
    error: string | null

    // Награда (после открытия)
    lastReward: VaultReward | null
    newBalance: number | null

    // Golden chest index (случайный при наличии отмычки)
    goldenChestIndex: number | null

    // Действия
    claimLockpick: () => Promise<boolean>
    openChest: (chestIndex: number) => Promise<boolean>
    refresh: () => Promise<void>
    clearReward: () => void

    // Helpers
    getStreakMultiplier: (streak: number) => number
    getTimeToNext: () => { hours: number; minutes: number; seconds: number } | null
}

export function useVault(): UseVaultReturn {
    const { user } = useTelegram()
    const userId = user?.id

    const [state, setState] = useState<VaultState | null>(null)
    const [history, setHistory] = useState<VaultHistoryItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [lastReward, setLastReward] = useState<VaultReward | null>(null)
    const [newBalance, setNewBalance] = useState<number | null>(null)
    const [goldenChestIndex, setGoldenChestIndex] = useState<number | null>(null)

    // Загрузка состояния
    const loadState = useCallback(async () => {
        if (!userId) {
            setLoading(false)
            return
        }

        try {
            setLoading(true)
            setError(null)

            const { data, error: rpcError } = await supabase.rpc('get_vault_state', {
                p_user_id: userId
            })

            if (rpcError) throw rpcError

            if (data?.success) {
                setState(data.state)
                setHistory(data.history || [])

                // Генерируем golden chest index при наличии отмычки
                if (data.state?.lockpick_available && data.state?.can_open) {
                    // 10% шанс на golden chest
                    if (Math.random() < 0.1) {
                        setGoldenChestIndex(Math.floor(Math.random() * 5))
                    } else {
                        setGoldenChestIndex(null)
                    }
                } else {
                    setGoldenChestIndex(null)
                }
            } else {
                throw new Error(data?.message || 'Failed to load vault state')
            }
        } catch (err) {
            console.error('Error loading vault state:', err)
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setLoading(false)
        }
    }, [userId])

    // Получение отмычки
    const claimLockpick = useCallback(async (): Promise<boolean> => {
        if (!userId) return false

        try {
            setLoading(true)
            setError(null)

            const { data, error: rpcError } = await supabase.rpc('claim_vault_lockpick', {
                p_user_id: userId
            })

            if (rpcError) throw rpcError

            if (data?.success) {
                // Обновляем состояние
                await loadState()
                return true
            } else {
                setError(data?.message || 'Failed to claim lockpick')
                return false
            }
        } catch (err) {
            console.error('Error claiming lockpick:', err)
            setError(err instanceof Error ? err.message : 'Unknown error')
            return false
        } finally {
            setLoading(false)
        }
    }, [userId, loadState])

    // Открытие сундука
    const openChest = useCallback(async (chestIndex: number): Promise<boolean> => {
        if (!userId) return false

        try {
            setLoading(true)
            setError(null)

            const { data, error: rpcError } = await supabase.rpc('open_vault_chest', {
                p_user_id: userId,
                p_chest_index: chestIndex
            })

            if (rpcError) throw rpcError

            if (data?.success) {
                setLastReward(data.reward)
                setNewBalance(data.new_balance)
                // Обновляем состояние
                await loadState()
                return true
            } else {
                setError(data?.message || 'Failed to open chest')
                return false
            }
        } catch (err) {
            console.error('Error opening chest:', err)
            setError(err instanceof Error ? err.message : 'Unknown error')
            return false
        } finally {
            setLoading(false)
        }
    }, [userId, loadState])

    // Сброс награды
    const clearReward = useCallback(() => {
        setLastReward(null)
        setNewBalance(null)
    }, [])

    // Получить множитель streak
    const getStreakMultiplier = useCallback((streak: number): number => {
        if (streak >= 7) return 2.0
        if (streak >= 5) return 1.5
        if (streak >= 3) return 1.25
        return 1.0
    }, [])

    // Время до следующей попытки
    const getTimeToNext = useCallback((): { hours: number; minutes: number; seconds: number } | null => {
        if (state?.can_claim || state?.can_open) return null

        const now = new Date()
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(0, 0, 0, 0)

        const diff = tomorrow.getTime() - now.getTime()

        if (diff <= 0) return null

        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diff % (1000 * 60)) / 1000)

        return { hours, minutes, seconds }
    }, [state])

    // Загрузка при монтировании
    useEffect(() => {
        loadState()
    }, [loadState])

    return {
        state,
        history,
        loading,
        error,
        lastReward,
        newBalance,
        goldenChestIndex,
        claimLockpick,
        openChest,
        refresh: loadState,
        clearReward,
        getStreakMultiplier,
        getTimeToNext
    }
}
