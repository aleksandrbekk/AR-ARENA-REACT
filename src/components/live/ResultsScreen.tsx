import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import confetti from 'canvas-confetti'

interface Winner {
    place: number
    ticket: number
    username: string
    avatar?: string
    prize?: string
}

interface ResultsScreenProps {
    winners: Winner[]
    giveawayTitle?: string
    jackpotAmount?: number
    onClose?: () => void
}

export function ResultsScreen({ winners, giveawayTitle, jackpotAmount, onClose }: ResultsScreenProps) {
    const [showPodium, setShowPodium] = useState(false)
    const [showOthers, setShowOthers] = useState(false)

    // Sort winners by place
    const sortedWinners = [...winners].sort((a, b) => a.place - b.place)
    const top3 = sortedWinners.filter(w => w.place <= 3)
    const others = sortedWinners.filter(w => w.place > 3)

    useEffect(() => {
        // Animate entrance
        setTimeout(() => setShowPodium(true), 500)
        setTimeout(() => setShowOthers(true), 1500)

        // Celebration confetti
        const fireConfetti = () => {
            confetti({
                particleCount: 100,
                spread: 80,
                origin: { y: 0.6 },
                colors: ['#FFD700', '#FFA500', '#22c55e', '#FFFFFF']
            })
        }
        fireConfetti()
        const interval = setInterval(fireConfetti, 3000)
        return () => clearInterval(interval)
    }, [])

    const getMedalEmoji = (place: number) => {
        switch (place) {
            case 1: return '🥇'
            case 2: return '🥈'
            case 3: return '🥉'
            default: return `#${place}`
        }
    }

    const getPodiumHeight = (place: number) => {
        switch (place) {
            case 1: return 'h-32'
            case 2: return 'h-24'
            case 3: return 'h-20'
            default: return 'h-16'
        }
    }

    const getPodiumGradient = (place: number) => {
        switch (place) {
            case 1: return 'from-[#FFD700] via-[#FFA500] to-[#CC8400]'
            case 2: return 'from-gray-300 via-gray-400 to-gray-500'
            case 3: return 'from-amber-600 via-amber-700 to-amber-800'
            default: return 'from-zinc-600 to-zinc-700'
        }
    }

    // Reorder for podium: [2nd, 1st, 3rd]
    const podiumOrder = [
        top3.find(w => w.place === 2),
        top3.find(w => w.place === 1),
        top3.find(w => w.place === 3)
    ].filter(Boolean) as Winner[]

    return (
        <div className="min-h-screen bg-[#0a0a0a] pt-[100px] pb-8 px-4 flex flex-col items-center">
            {/* Title */}
            <motion.div
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center mb-6"
            >
                <h1 className="text-3xl font-black text-[#FFD700] drop-shadow-[0_0_20px_rgba(255,215,0,0.5)] mb-2">
                    ПОБЕДИТЕЛИ
                </h1>
                {giveawayTitle && (
                    <p className="text-white/50 text-sm">{giveawayTitle}</p>
                )}
                {jackpotAmount && jackpotAmount > 0 && (
                    <div className="mt-2 inline-flex items-center gap-2 px-4 py-1.5 bg-[#FFD700]/10 rounded-full border border-[#FFD700]/30">
                        <span className="text-[#FFD700] font-bold">
                            Джекпот: {jackpotAmount.toLocaleString()} AR
                        </span>
                    </div>
                )}
            </motion.div>

            {/* Podium */}
            {showPodium && (
                <div className="flex items-end justify-center gap-2 mb-8">
                    {podiumOrder.map((winner, idx) => (
                        <motion.div
                            key={winner.place}
                            initial={{ opacity: 0, y: 50, scale: 0.8 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ delay: idx * 0.2, type: 'spring', stiffness: 200 }}
                            className="flex flex-col items-center"
                        >
                            {/* Avatar */}
                            <motion.div
                                className={`relative mb-2 ${winner.place === 1 ? 'scale-110' : ''}`}
                                animate={winner.place === 1 ? { y: [0, -5, 0] } : {}}
                                transition={{ duration: 2, repeat: Infinity }}
                            >
                                <div className={`
                                    p-1 rounded-full
                                    ${winner.place === 1 ? 'bg-gradient-to-br from-[#FFD700] to-[#FFA500] shadow-[0_0_30px_rgba(255,215,0,0.6)]' :
                                        winner.place === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-400' :
                                        'bg-gradient-to-br from-amber-600 to-amber-700'}
                                `}>
                                    <img
                                        src={winner.avatar || '/default-avatar.png'}
                                        alt={winner.username}
                                        className={`
                                            rounded-full object-cover border-2 border-black
                                            ${winner.place === 1 ? 'w-20 h-20' : 'w-16 h-16'}
                                        `}
                                    />
                                </div>
                                {/* Medal */}
                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-2xl">
                                    {getMedalEmoji(winner.place)}
                                </div>
                            </motion.div>

                            {/* Name */}
                            <div className="text-center mb-2 max-w-[100px]">
                                <div className="text-white font-bold text-sm truncate">
                                    {winner.username}
                                </div>
                                <div className="text-[#FFD700] text-xs font-mono">
                                    #{winner.ticket}
                                </div>
                            </div>

                            {/* Podium */}
                            <div className={`
                                w-24 ${getPodiumHeight(winner.place)}
                                bg-gradient-to-b ${getPodiumGradient(winner.place)}
                                rounded-t-lg flex flex-col items-center justify-start pt-2
                                shadow-lg
                            `}>
                                <div className="text-black font-black text-2xl">
                                    {winner.place}
                                </div>
                                {winner.prize && (
                                    <div className="text-black/70 text-[10px] font-bold text-center px-1">
                                        {winner.prize}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Other places (4, 5) */}
            {showOthers && others.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md"
                >
                    <div className="text-center mb-3">
                        <span className="text-white/40 text-xs uppercase tracking-wider">Также в призах</span>
                    </div>
                    <div className="flex justify-center gap-3">
                        {others.map((winner, idx) => (
                            <motion.div
                                key={winner.place}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.1 }}
                                className="bg-zinc-900/80 rounded-xl p-3 border border-zinc-700/50 flex-1 max-w-[140px]"
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <img
                                        src={winner.avatar || '/default-avatar.png'}
                                        alt={winner.username}
                                        className="w-10 h-10 rounded-full border border-zinc-600 object-cover"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-white font-medium text-xs truncate">
                                            {winner.username}
                                        </div>
                                        <div className="text-white/40 text-[10px] font-mono">
                                            #{winner.ticket}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-white/50 text-xs">{winner.place} место</span>
                                    {winner.prize && (
                                        <span className="text-[#FFD700] text-xs font-bold">{winner.prize}</span>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Action button */}
            {onClose && (
                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2 }}
                    onClick={onClose}
                    className="mt-8 px-8 py-3 bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black font-bold rounded-xl shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:shadow-[0_0_30px_rgba(255,215,0,0.5)] transition-all"
                >
                    Закрыть
                </motion.button>
            )}
        </div>
    )
}
