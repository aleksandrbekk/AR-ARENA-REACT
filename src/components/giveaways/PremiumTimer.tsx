import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface PremiumTimerProps {
    targetDate: string
}

export function PremiumTimer({ targetDate }: PremiumTimerProps) {
    const [timeLeft, setTimeLeft] = useState<{
        days: string
        hours: string
        minutes: string
        seconds: string
    }>({ days: '00', hours: '00', minutes: '00', seconds: '00' })

    useEffect(() => {
        const calculateTimeLeft = () => {
            const difference = +new Date(targetDate) - +new Date()

            if (difference > 0) {
                return {
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)).toString().padStart(2, '0'),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24).toString().padStart(2, '0'),
                    minutes: Math.floor((difference / 1000 / 60) % 60).toString().padStart(2, '0'),
                    seconds: Math.floor((difference / 1000) % 60).toString().padStart(2, '0')
                }
            }
            return { days: '00', hours: '00', minutes: '00', seconds: '00' }
        }

        setTimeLeft(calculateTimeLeft())
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft())
        }, 1000)

        return () => clearInterval(timer)
    }, [targetDate])

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-20"
        >
            {/* Glow background */}
            <div className="absolute inset-0 -inset-x-4 bg-gradient-to-r from-transparent via-[#FFD700]/5 to-transparent blur-xl" />

            <div className="flex items-center justify-center gap-3 py-4">
                <TimeUnit value={timeLeft.days} label="дн" delay={0} />
                <Separator />
                <TimeUnit value={timeLeft.hours} label="ч" delay={0.1} />
                <Separator />
                <TimeUnit value={timeLeft.minutes} label="мин" delay={0.2} />
                <Separator />
                <TimeUnit value={timeLeft.seconds} label="сек" delay={0.3} isActive />
            </div>
        </motion.div>
    )
}

function TimeUnit({ value, label, delay = 0, isActive = false }: { value: string; label: string; delay?: number; isActive?: boolean }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay, type: "spring", stiffness: 200 }}
            className="flex flex-col items-center"
        >
            <div className={`
                relative w-[60px] h-[72px] rounded-xl
                flex items-center justify-center overflow-hidden
                ${isActive
                    ? 'bg-gradient-to-b from-[#FFD700]/20 to-[#FFD700]/5 border-[#FFD700]/30'
                    : 'bg-zinc-900/80 border-white/10'
                }
                border backdrop-blur-sm
                shadow-lg
            `}>
                {/* Top shine */}
                <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                {/* Number */}
                <span className={`
                    text-3xl font-black font-mono tabular-nums
                    ${isActive
                        ? 'text-[#FFD700] drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]'
                        : 'text-white'
                    }
                `}>
                    {value}
                </span>

                {/* Bottom gradient */}
                <div className="absolute bottom-0 inset-x-0 h-6 bg-gradient-to-t from-black/30 to-transparent" />
            </div>

            <span className={`
                mt-2 text-[10px] font-semibold uppercase tracking-wider
                ${isActive ? 'text-[#FFD700]/80' : 'text-white/40'}
            `}>
                {label}
            </span>
        </motion.div>
    )
}

function Separator() {
    return (
        <div className="flex flex-col items-center gap-2 pb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-[#FFD700]/60" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#FFD700]/40" />
        </div>
    )
}
