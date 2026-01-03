import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'

interface Winner {
    ticket: number
    user: string
    avatar?: string
}

interface Tour1DrumProps {
    candidates: { ticket: number; user: string; avatar?: string }[]
    winners: Winner[]
    onComplete: () => void
}

export function Tour1Drum({ winners, onComplete }: Tour1DrumProps) {
    const [currentTicket, setCurrentTicket] = useState<number>(0)
    const [foundWinners, setFoundWinners] = useState<Winner[]>([])
    const [isSpinning, setIsSpinning] = useState(true)

    // Simulation of finding winners one by one
    useEffect(() => {
        if (!isSpinning) return

        let currentIndex = 0
        const totalWinners = winners.length

        const spinInterval = setInterval(() => {
            // Random ticket noise
            setCurrentTicket(Math.floor(Math.random() * 999999))
        }, 50)

        const findWinnerInterval = setInterval(() => {
            if (currentIndex >= totalWinners) {
                clearInterval(spinInterval)
                clearInterval(findWinnerInterval)
                setIsSpinning(false)
                onComplete()
                return
            }

            const winner = winners[currentIndex]
            setFoundWinners(prev => [...prev, winner])

            // Haptic & visual feedback
            if (window.Telegram?.WebApp?.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.impactOccurred('medium')
            }

            // Small confetti burst for each winner
            confetti({
                particleCount: 20,
                spread: 30,
                origin: { y: 0.8 },
                colors: ['#FFD700', '#FFA500']
            })

            currentIndex++
        }, 1000) // Find one winner every second

        return () => {
            clearInterval(spinInterval)
            clearInterval(findWinnerInterval)
        }
    }, [isSpinning, winners, onComplete])

    // Generate fallback avatar color from user name
    const getAvatarColor = (name: string) => {
        const colors = ['#FFD700', '#FFA500', '#22c55e', '#3b82f6', '#a855f7', '#ec4899']
        let hash = 0
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash)
        }
        return colors[Math.abs(hash) % colors.length]
    }

    return (
        <div className="flex flex-col items-center w-full max-w-lg mx-auto px-4">
            {/* Main Drum Display */}
            <div className="relative mb-6 p-1 rounded-2xl bg-gradient-to-b from-[#FFD700] to-[#FFA500] shadow-[0_0_50px_rgba(255,215,0,0.3)]">
                <div className="bg-[#0a0a0a] rounded-xl overflow-hidden px-8 py-5 text-center relative">
                    <div className="text-xs text-[#FFD700]/60 uppercase tracking-[0.2em] mb-2">
                        Searching Ticket
                    </div>
                    <div className="text-4xl font-black text-white font-mono tracking-widest relative z-10">
                        {currentTicket.toString().padStart(6, '0')}
                    </div>
                    {/* Scanline effect */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#FFD700]/5 to-transparent animate-scan" />
                </div>
            </div>

            {/* Winners Header */}
            <div className="w-full flex items-center gap-4 mb-4">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-sm font-bold text-[#FFD700] uppercase tracking-wider">
                    Qualified ({foundWinners.length}/{winners.length})
                </span>
                <div className="h-px flex-1 bg-white/10" />
            </div>

            {/* Winners Grid - Adaptive without fixed height */}
            <div className="w-full grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-2">
                <AnimatePresence>
                    {foundWinners.map((w, i) => (
                        <motion.div
                            key={w.ticket}
                            initial={{ opacity: 0, scale: 0.8, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            className="bg-zinc-900/80 border border-white/10 rounded-xl p-2.5 flex items-center gap-2"
                        >
                            {/* Avatar */}
                            {w.avatar ? (
                                <img
                                    src={w.avatar}
                                    alt={w.user}
                                    className="w-9 h-9 rounded-full border-2 border-[#FFD700]/30 object-cover flex-shrink-0"
                                />
                            ) : (
                                <div
                                    className="w-9 h-9 rounded-full flex items-center justify-center text-black font-bold text-sm flex-shrink-0"
                                    style={{ backgroundColor: getAvatarColor(w.user) }}
                                >
                                    {w.user.charAt(0).toUpperCase()}
                                </div>
                            )}

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="text-[10px] text-white/50 font-medium truncate">
                                    #{i + 1} {w.user}
                                </div>
                                <div className="font-mono text-[#FFD700] font-bold text-sm">
                                    {w.ticket}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Empty state placeholder */}
            {foundWinners.length === 0 && (
                <div className="w-full py-8 text-center text-white/30 text-sm">
                    Поиск победителей...
                </div>
            )}

            <style>{`
                @keyframes scan {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(100%); }
                }
                .animate-scan {
                    animation: scan 2s linear infinite;
                }
            `}</style>
        </div>
    )
}
