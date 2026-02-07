import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export interface TaskCompletion {
    started_at: string
    completed_at: string | null
    reward_claimed: boolean
}

export interface Task {
    id: string
    title: string
    description: string | null
    type: string
    category: string | null
    target_url: string | null
    reward_ar: number
    reward_coins: number
    wait_seconds: number
    expires_at: string | null
    completion: TaskCompletion | null
}

interface StartTaskResult {
    success: boolean
    error?: string
    already_started?: boolean
    already_claimed?: boolean
    started_at?: string
    wait_seconds?: number
    reward_amount?: number
    target_url?: string
}

interface ClaimRewardResult {
    success: boolean
    error?: string
    elapsed?: number
    required?: number
    reward_amount?: number
    new_balance?: number
    task_title?: string
}

export function useTasks() {
    const { telegramUser } = useAuth()
    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchTasks = useCallback(async () => {
        if (!telegramUser?.id) return

        try {
            setLoading(true)
            const { data, error: fetchError } = await supabase
                .rpc('get_user_tasks', { p_user_id: String(telegramUser.id) })

            if (fetchError) throw fetchError

            setTasks(data || [])
            setError(null)
        } catch (err) {
            console.error('Error fetching tasks:', err)
            setError('Failed to load tasks')
        } finally {
            setLoading(false)
        }
    }, [telegramUser?.id])

    useEffect(() => {
        fetchTasks()
    }, [fetchTasks])

    const startTask = useCallback(async (taskId: string): Promise<StartTaskResult> => {
        if (!telegramUser?.id) {
            return { success: false, error: 'Not authenticated' }
        }

        try {
            const { data, error: startError } = await supabase
                .rpc('start_task', {
                    p_task_id: taskId,
                    p_user_id: String(telegramUser.id)
                })

            if (startError) {
                return { success: false, error: startError.message }
            }

            // Обновить локальное состояние
            if (data?.success) {
                setTasks(prev => prev.map(task =>
                    task.id === taskId
                        ? {
                            ...task,
                            completion: {
                                started_at: data.started_at,
                                completed_at: null,
                                reward_claimed: false
                            }
                        }
                        : task
                ))
            }

            return data as StartTaskResult
        } catch (err) {
            console.error('Error starting task:', err)
            return { success: false, error: 'Failed to start task' }
        }
    }, [telegramUser?.id])

    const claimReward = useCallback(async (taskId: string): Promise<ClaimRewardResult> => {
        if (!telegramUser?.id) {
            return { success: false, error: 'Not authenticated' }
        }

        // Найти задание для проверки типа
        const task = tasks.find(t => t.id === taskId)

        // Для Telegram подписок — сначала проверить подписку
        if (task?.type === 'telegram_subscribe' && task.target_url) {
            try {
                const checkResponse = await fetch('/api/check-subscription', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        telegram_id: telegramUser.id,
                        channel_id: task.target_url
                    })
                })

                const checkResult = await checkResponse.json()

                if (!checkResult.is_member) {
                    return {
                        success: false,
                        error: 'Вы не подписаны на канал. Подпишитесь и попробуйте снова.'
                    }
                }
            } catch (err) {
                console.error('Error checking subscription:', err)
                // Если проверка упала — пропускаем (как в check-subscription.js)
            }
        }

        try {
            const { data, error: claimError } = await supabase
                .rpc('claim_task_reward', {
                    p_task_id: taskId,
                    p_user_id: String(telegramUser.id)
                })

            if (claimError) {
                return { success: false, error: claimError.message }
            }

            // Обновить локальное состояние
            if (data?.success) {
                setTasks(prev => prev.map(task =>
                    task.id === taskId
                        ? {
                            ...task,
                            completion: {
                                ...task.completion!,
                                completed_at: new Date().toISOString(),
                                reward_claimed: true
                            }
                        }
                        : task
                ))
            }

            return data as ClaimRewardResult
        } catch (err) {
            console.error('Error claiming reward:', err)
            return { success: false, error: 'Failed to claim reward' }
        }
    }, [telegramUser?.id, tasks])

    const pendingTasksCount = tasks.filter(t => !t.completion?.reward_claimed).length

    return {
        tasks,
        loading,
        error,
        pendingTasksCount,
        fetchTasks,
        startTask,
        claimReward
    }
}
