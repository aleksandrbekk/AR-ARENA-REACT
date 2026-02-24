import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Task } from '../../hooks/useTasks'

interface TaskCardProps {
    task: Task
    onStart: (taskId: string) => Promise<{ success: boolean; target_url?: string }>
    onClaimReward: (taskId: string) => Promise<{ success: boolean; reward_amount?: number; error?: string }>
}

type TaskState = 'available' | 'subscribed' | 'completed'

export function TaskCard({ task, onStart, onClaimReward }: TaskCardProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [showReward, setShowReward] = useState(false)
    const [rewardAmount, setRewardAmount] = useState(0)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [localStarted, setLocalStarted] = useState(false)

    // Определить состояние задания
    const getState = (): TaskState => {
        if (task.completion?.reward_claimed) return 'completed'
        if (task.completion?.started_at || localStarted) return 'subscribed'
        return 'available'
    }

    const state = getState()

    // Шаг 1: Подписаться — открывает канал
    const handleSubscribe = useCallback(async () => {
        setIsLoading(true)
        setErrorMessage(null)
        try {
            const result = await onStart(task.id)
            if (result.success && result.target_url) {
                const channel = result.target_url.replace('@', '')
                window.Telegram?.WebApp?.openTelegramLink(`https://t.me/${channel}`)
                setLocalStarted(true)
            }
        } finally {
            setIsLoading(false)
        }
    }, [task.id, onStart])

    // Шаг 2: Проверить подписку — проверяет и сразу начисляет
    const handleCheckSubscription = useCallback(async () => {
        setIsLoading(true)
        setErrorMessage(null)
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium')

        try {
            const result = await onClaimReward(task.id)
            if (result.success && result.reward_amount) {
                setRewardAmount(result.reward_amount)
                setShowReward(true)
                window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
                setTimeout(() => setShowReward(false), 2500)
            } else if (result.error) {
                setErrorMessage(result.error)
                window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error')
            }
        } finally {
            setIsLoading(false)
        }
    }, [task.id, onClaimReward])

    // Не показываем выполненные задания
    if (state === 'completed') return null

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            className="relative overflow-hidden rounded-2xl p-4 bg-zinc-900/50 backdrop-blur-md border border-yellow-500/20"
        >
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 via-transparent to-orange-500/5 pointer-events-none" />

            <div className="relative z-10 flex gap-4">
                {/* Icon */}
                <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-yellow-500/20 to-orange-500/20">
                    <img src="/icons/TASK.png" alt="" className="w-7 h-7" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{task.title}</h3>
                    {task.description && (
                        <p className="text-sm text-white/50 mt-0.5 line-clamp-2">{task.description}</p>
                    )}

                    {/* Reward */}
                    <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                            <span className="text-yellow-400 font-bold">+{task.reward_ar}</span>
                            <span className="text-yellow-400/70 text-sm">AIR</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 space-y-2">
                {state === 'available' && (
                    <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSubscribe}
                        disabled={isLoading}
                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black font-semibold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        ) : (
                            <span>Подписаться</span>
                        )}
                    </motion.button>
                )}

                {state === 'subscribed' && (
                    <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={handleCheckSubscription}
                        disabled={isLoading}
                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-green-500/30 disabled:opacity-50 active:scale-95 transition-transform"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <img src="/icons/TASK.png" alt="" className="w-5 h-5" />
                                <span>Проверить подписку</span>
                            </>
                        )}
                    </motion.button>
                )}

                {/* Error message */}
                <AnimatePresence>
                    {errorMessage && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center"
                        >
                            ❌ {errorMessage}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Reward Animation */}
            <AnimatePresence>
                {showReward && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5, y: 0 }}
                        animate={{ opacity: 1, scale: 1, y: -20 }}
                        exit={{ opacity: 0, scale: 0.5, y: -40 }}
                        className="absolute top-4 right-4 px-4 py-2 rounded-full bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black font-bold shadow-lg"
                    >
                        +{rewardAmount} AIR 🎉
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}
