import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Play,
    ThumbsUp,
    MessageCircle,
    Bell,
    Gift,
    Check,
    ExternalLink,
    Loader2
} from 'lucide-react'
import type { Task } from '../../hooks/useTasks'
import { TaskTimer } from './TaskTimer'

interface TaskCardProps {
    task: Task
    onStart: (taskId: string) => Promise<{ success: boolean; target_url?: string }>
    onClaimReward: (taskId: string) => Promise<{ success: boolean; reward_amount?: number; error?: string }>
}

const TASK_ICONS: Record<string, typeof Play> = {
    youtube_watch: Play,
    youtube_like: ThumbsUp,
    youtube_comment: MessageCircle,
    youtube_subscribe: Bell,
    telegram_subscribe: Bell,
    default: Gift
}

const TASK_LABELS: Record<string, string> = {
    youtube_watch: 'Посмотреть видео',
    youtube_like: 'Поставить лайк',
    youtube_comment: 'Написать комментарий',
    youtube_subscribe: 'Подписаться на YouTube',
    telegram_subscribe: 'Подписаться',
    default: 'Выполнить'
}

type TaskState = 'available' | 'in_progress' | 'ready_to_claim' | 'completed'

export function TaskCard({ task, onStart, onClaimReward }: TaskCardProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [timerComplete, setTimerComplete] = useState(false)
    const [showReward, setShowReward] = useState(false)
    const [rewardAmount, setRewardAmount] = useState(0)

    // Определить состояние задания
    const getState = (): TaskState => {
        if (task.completion?.reward_claimed) return 'completed'
        if (task.completion?.started_at) {
            const startTime = new Date(task.completion.started_at).getTime()
            const elapsed = (Date.now() - startTime) / 1000
            if (elapsed >= task.wait_seconds || timerComplete) return 'ready_to_claim'
            return 'in_progress'
        }
        return 'available'
    }

    const state = getState()
    const Icon = TASK_ICONS[task.type] || TASK_ICONS.default
    const actionLabel = TASK_LABELS[task.type] || TASK_LABELS.default
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const handleStart = useCallback(async () => {
        setIsLoading(true)
        setErrorMessage(null)
        try {
            const result = await onStart(task.id)
            if (result.success && result.target_url) {
                // Для Telegram открываем t.me, для YouTube — ссылку
                if (task.type === 'telegram_subscribe') {
                    const channel = result.target_url.replace('@', '')
                    window.open(`https://t.me/${channel}`, '_blank')
                } else {
                    window.open(result.target_url, '_blank')
                }
            }
        } finally {
            setIsLoading(false)
        }
    }, [task.id, task.type, onStart])

    const handleClaim = useCallback(async () => {
        setIsLoading(true)
        setErrorMessage(null)
        try {
            const result = await onClaimReward(task.id)
            if (result.success && result.reward_amount) {
                setRewardAmount(result.reward_amount)
                setShowReward(true)
                setTimeout(() => setShowReward(false), 2000)
            } else if (result.error) {
                setErrorMessage(result.error)
            }
        } finally {
            setIsLoading(false)
        }
    }, [task.id, onClaimReward])

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`
        relative overflow-hidden rounded-2xl p-4
        glass-card
        ${state === 'completed' ? 'opacity-60' : ''}
      `}
        >
            {/* Glow effect for available tasks */}
            {state === 'available' && (
                <div className="absolute inset-0 bg-gradient-to-r from-ar-gold/5 via-transparent to-ar-orange/5 pointer-events-none" />
            )}

            <div className="relative z-10 flex gap-4">
                {/* Icon */}
                <div className={`
          flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center
          ${state === 'completed'
                        ? 'bg-ar-green/20'
                        : 'bg-gradient-to-br from-ar-gold/20 to-ar-orange/20'}
        `}>
                    {state === 'completed' ? (
                        <Check className="w-6 h-6 text-ar-green" />
                    ) : (
                        <Icon className={`w-6 h-6 ${state === 'ready_to_claim' ? 'text-ar-gold' : 'text-white/80'}`} />
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{task.title}</h3>
                    {task.description && (
                        <p className="text-sm text-white/50 mt-0.5 line-clamp-2">{task.description}</p>
                    )}

                    {/* Reward */}
                    <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-ar-gold/10 border border-ar-gold/20">
                            <span className="text-ar-gold font-bold">+{task.reward_ar}</span>
                            <span className="text-ar-gold/70 text-sm">AIR</span>
                        </div>

                        {state === 'available' && (
                            <span className="text-xs text-white/40">
                                ⏱️ {task.wait_seconds}с
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Timer for in-progress state */}
            {state === 'in_progress' && task.completion?.started_at && (
                <div className="mt-4">
                    <TaskTimer
                        startedAt={task.completion.started_at}
                        waitSeconds={task.wait_seconds}
                        onComplete={() => setTimerComplete(true)}
                    />
                </div>
            )}

            {/* Action Button */}
            <div className="mt-4">
                {state === 'available' && (
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleStart}
                        disabled={isLoading}
                        className="
              w-full py-3 px-4 rounded-xl
              bg-gradient-to-r from-ar-gold to-ar-orange
              text-black font-semibold
              flex items-center justify-center gap-2
              disabled:opacity-50
            "
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <span>{actionLabel}</span>
                                <ExternalLink className="w-4 h-4" />
                            </>
                        )}
                    </motion.button>
                )}

                {state === 'in_progress' && !timerComplete && (
                    <button
                        disabled
                        className="
              w-full py-3 px-4 rounded-xl
              bg-white/10 border border-white/20
              text-white/50 font-medium
              cursor-not-allowed
            "
                    >
                        Выполняется...
                    </button>
                )}

                {state === 'ready_to_claim' && (
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleClaim}
                        disabled={isLoading}
                        className="
              w-full py-3 px-4 rounded-xl
              bg-gradient-to-r from-ar-green to-emerald-500
              text-white font-semibold
              flex items-center justify-center gap-2
              shadow-lg shadow-ar-green/30
              disabled:opacity-50
            "
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <Gift className="w-5 h-5" />
                                <span>Получить +{task.reward_ar} AIR</span>
                            </>
                        )}
                    </motion.button>
                )}

                {state === 'completed' && (
                    <div className="
            w-full py-3 px-4 rounded-xl
            bg-ar-green/10 border border-ar-green/20
            text-ar-green font-medium
            flex items-center justify-center gap-2
          ">
                        <Check className="w-5 h-5" />
                        <span>Выполнено</span>
                    </div>
                )}

                {/* Error message */}
                {errorMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center"
                    >
                        {errorMessage}
                    </motion.div>
                )}
            </div>

            {/* Reward Animation */}
            <AnimatePresence>
                {showReward && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5, y: 0 }}
                        animate={{ opacity: 1, scale: 1, y: -20 }}
                        exit={{ opacity: 0, scale: 0.5, y: -40 }}
                        className="
              absolute top-4 right-4
              px-4 py-2 rounded-full
              bg-ar-gold text-black font-bold
              shadow-lg shadow-ar-gold/50
            "
                    >
                        +{rewardAmount} AIR 🎉
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}
