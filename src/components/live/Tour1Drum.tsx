import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'

interface Tour1DrumProps {
    candidates: { ticket: number; user: string }[]
    winners: { ticket: number; user: string }[]
    onComplete: () => void
}

export function Tour1Drum({ winners, onComplete }: Tour1DrumProps) {
    const [currentTicket, setCurrentTicket] = useState<number>(0)
    const [foundWinners, setFoundWinners] = useState<{ ticket: number; user: string }[]>([])
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

    return (
        <div className="flex flex-col items-center justify-center w-full max-w-lg mx-auto p-4">
            {/* Main Drum Display */}
            <div className="relative mb-8 p-1 rounded-2xl bg-gradient-to-b from-[#FFD700] to-[#FFA500] shadow-[0_0_50px_rgba(255,215,0,0.3)]">
                <div className="bg-[#0a0a0a] rounded-xl overflow-hidden px-8 py-6 text-center relative">

                    <div className="text-xs text-[#FFD700]/60 uppercase tracking-[0.2em] mb-2">
                        Searching Ticket
                    </div>

                    <div className="text-5xl font-black text-white font-mono tracking-widest relative z-10">
                        {currentTicket.toString().padStart(6, '0')}
                    </div>

                    {/* Scanline effect */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#FFD700]/5 to-transparent animate-scan" />
                </div>
            </div>

            {/* Winners Grid */}
            <div className="w-full">
                <div className="flex items-center gap-4 mb-4">
                    <div className="h-px flex-1 bg-white/10" />
                    <span className="text-sm font-bold text-[#FFD700] uppercase tracking-wider">
                        Qualified ({foundWinners.length}/{winners.length})
                    </span>
                    <div className="h-px flex-1 bg-white/10" />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    <AnimatePresence>
                        {foundWinners.map((w, i) => (
                            <motion.div
                                key={w.ticket}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white/5 border border-white/10 rounded-lg p-2 flex flex-col items-center justify-center gap-1 text-center h-20"
                            >
                                <div className="text-[10px] text-white/50 font-bold uppercase tracking-wider">
                                    #{i + 1} • {w.user}
                                </div>
                                <div className="font-mono text-[#FFD700] font-bold text-lg">
                                    {w.ticket}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 215, 0, 0.3);
          border-radius: 4px;
        }
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
