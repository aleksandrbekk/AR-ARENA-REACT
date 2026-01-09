import { useEffect, useState } from 'react'

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

        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft())
        }, 1000)

        return () => clearInterval(timer)
    }, [targetDate])

    return (
        <div className="flex items-start justify-center gap-2 sm:gap-4 my-8 relative z-20">
            <TimeUnit value={timeLeft.days} label="ДНИ" />
            <Separator />
            <TimeUnit value={timeLeft.hours} label="ЧАСЫ" />
            <Separator />
            <TimeUnit value={timeLeft.minutes} label="МИН" />
            <Separator />
            <TimeUnit value={timeLeft.seconds} label="СЕК" isActive />
        </div>
    )
}

function TimeUnit({ value, label, isActive = false }: { value: string; label: string; isActive?: boolean }) {
    return (
        <div className="flex flex-col items-center gap-2">
            <div className={`relative w-16 h-20 sm:w-20 sm:h-24 rounded-2xl flex items-center justify-center overflow-hidden
        ${isActive ? 'bg-white/10 border-white/20' : 'bg-black/40 border-white/10'}
        backdrop-blur-xl border border-b-4 border-b-black/50 shadow-[0_10px_30px_rgba(0,0,0,0.5)]`}
            >
                {/* Metallic Text Effect */}
                <span className="text-3xl sm:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-[#FFD700] via-[#FDB931] to-[#9E7C20] drop-shadow-sm font-mono tracking-wider">
                    {value}
                </span>

                {/* Inner Glint */}
                <div className="absolute top-0 inset-x-0 h-px bg-white/20" />
                <div className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-black/40 to-transparent" />
            </div>
            <span className="text-[10px] font-bold tracking-[0.2em] text-[#FFD700]/60 uppercase">
                {label}
            </span>
        </div>
    )
}

function Separator() {
    return (
        <div className="h-20 sm:h-24 flex flex-col justify-center gap-2">
            <div className="w-1 h-1 rounded-full bg-[#FFD700]/40" />
            <div className="w-1 h-1 rounded-full bg-[#FFD700]/40" />
        </div>
    )
}
