import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface TaskTimerProps {
    startedAt: string
    waitSeconds: number
    onComplete: () => void
}

export function TaskTimer({ startedAt, waitSeconds, onComplete }: TaskTimerProps) {
    const [remainingSeconds, setRemainingSeconds] = useState(0)
    const [isComplete, setIsComplete] = useState(false)

    useEffect(() => {
        const startTime = new Date(startedAt).getTime()
        const endTime = startTime + (waitSeconds * 1000)

        const updateTimer = () => {
            const now = Date.now()
            const remaining = Math.max(0, Math.ceil((endTime - now) / 1000))

            setRemainingSeconds(remaining)

            if (remaining === 0 && !isComplete) {
                setIsComplete(true)
                onComplete()
            }
        }

        updateTimer()
        const interval = setInterval(updateTimer, 1000)

        return () => clearInterval(interval)
    }, [startedAt, waitSeconds, onComplete, isComplete])

    const progress = Math.max(0, Math.min(100, ((waitSeconds - remainingSeconds) / waitSeconds) * 100))

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}с`
    }

    if (isComplete) {
        return null
    }

    return (
        <div className="w-full space-y-2">
            {/* Progress Bar */}
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                    className="h-full bg-gradient-to-r from-ar-gold to-ar-orange"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                />
            </div>

            {/* Timer Text */}
            <div className="flex items-center justify-center gap-2 text-sm text-white/60">
                <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="w-2 h-2 rounded-full bg-ar-gold"
                />
                <span>Осталось {formatTime(remainingSeconds)}</span>
            </div>
        </div>
    )
}
