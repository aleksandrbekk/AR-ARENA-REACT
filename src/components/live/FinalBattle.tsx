import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import confetti from 'canvas-confetti'
import type { Ticket } from '../../types'

interface FinalBattleProps {
    players: Ticket[]
    scores: { bulls: number; bears: number; place: number | null }[]
    turnOrder: number[]
    currentFinalPlayer: number | null
    wheelAngle: number
    wheelSpinning: boolean
    lastResult: 'bull' | 'bear' | null
    onRunDemo?: () => void
    embedded?: boolean
}

export function FinalBattle({
    players,
    scores,
    turnOrder,
    currentFinalPlayer,
    wheelAngle,
    wheelSpinning,
    lastResult,
    onRunDemo,
    embedded = false
}: FinalBattleProps) {
    const [showVictory, setShowVictory] = useState<number | null>(null)
    const [showDefeat, setShowDefeat] = useState<number | null>(null)

    // Watch for 3 bulls (victory) or 3 bears (defeat)
    useEffect(() => {
        scores.forEach((score, idx) => {
            if (score.bulls === 3 && score.place !== null && showVictory !== idx) {
                setShowVictory(idx)
                // Trigger confetti
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#FFD700', '#FFA500', '#22c55e']
                })
            }
            if (score.bears === 3 && score.place !== null && showDefeat !== idx) {
                setShowDefeat(idx)
            }
        })
    }, [scores, showVictory, showDefeat])

    // Reset effects when scores reset
    useEffect(() => {
        const allZero = scores.every(s => s.bulls === 0 && s.bears === 0)
        if (allZero) {
            setShowVictory(null)
            setShowDefeat(null)
        }
    }, [scores])

    const getPlayerCardClass = (idx: number, score: { bulls: number; bears: number; place: number | null }) => {
        const isCurrent = currentFinalPlayer === idx
        const isWinner = score.bulls === 3
        const isEliminated = score.bears === 3

        if (isWinner) {
            return 'border-[#FFD700] shadow-[0_0_40px_rgba(255,215,0,0.8)] scale-105'
        }
        if (isEliminated) {
            return 'border-red-500 grayscale opacity-60'
        }
        if (isCurrent) {
            return 'border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.7)] scale-110'
        }
        if (score.place) {
            return 'border-[#FFD700]'
        }
        return 'border-[#FFD700]/50'
    }

    return (
        <div className={embedded ? '' : 'min-h-screen bg-[#0a0a0a] pt-[100px] pb-8 px-4'}>
            {!embedded && (
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-black text-[#FFD700]">ФИНАЛ</h1>
                    <p className="text-white/60 text-sm">Битва быка и медведя</p>
                </div>
            )}

            {onRunDemo && (
                <div className="text-center mb-6">
                    <button
                        onClick={onRunDemo}
                        data-testid="run-demo-btn"
                        className="px-6 py-2 bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black font-bold rounded-full hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,215,0,0.3)]"
                    >
                        ЗАПУСТИТЬ
                    </button>
                </div>
            )}

            {/* Players */}
            <div className="flex justify-center items-end gap-6 mb-8">
                {players.map((ticket, idx) => {
                    const score = scores[idx]
                    const orderNum = turnOrder.indexOf(idx) + 1
                    const isWinner = score?.bulls === 3

                    return (
                        <motion.div
                            key={idx}
                            className="flex flex-col items-center"
                            animate={
                                showDefeat === idx
                                    ? { x: [0, -5, 5, -5, 5, 0] }
                                    : {}
                            }
                            transition={
                                showDefeat === idx
                                    ? { duration: 0.5, ease: 'easeInOut' }
                                    : {}
                            }
                        >
                            {/* Avatar with order badge */}
                            <div className="relative mb-2">
                                <motion.img
                                    src={ticket.player.avatar}
                                    alt=""
                                    className={`w-20 h-20 rounded-full border-3 transition-all duration-300 ${getPlayerCardClass(idx, score || { bulls: 0, bears: 0, place: null })}`}
                                    animate={isWinner ? { scale: [1, 1.1, 1] } : {}}
                                    transition={isWinner ? { duration: 0.6, repeat: 2 } : {}}
                                />
                                {orderNum > 0 && (
                                    <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-[#FFD700] to-[#FFA500] text-black text-xs font-bold flex items-center justify-center border-2 border-black">
                                        {orderNum}
                                    </div>
                                )}
                            </div>

                            {/* Name / Place */}
                            <motion.div
                                className={`px-4 py-2 rounded-xl text-center mb-2 min-w-[90px] transition-all duration-300 ${
                                    score?.place === 1
                                        ? 'bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black font-bold shadow-[0_0_30px_rgba(255,215,0,0.8)]'
                                        : score?.place === 2
                                            ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-black font-bold shadow-[0_0_15px_rgba(192,192,192,0.5)]'
                                            : score?.place === 3
                                                ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white font-bold shadow-[0_0_15px_rgba(217,119,6,0.5)]'
                                                : 'bg-zinc-800 text-white'
                                }`}
                                animate={score?.place === 1 ? { scale: [1, 1.05, 1] } : {}}
                                transition={score?.place === 1 ? { duration: 0.5, repeat: 3 } : {}}
                            >
                                {score?.place
                                    ? `${score.place} МЕСТО`
                                    : ticket.player.name}
                            </motion.div>

                            {/* Bulls & Bears Grid */}
                            <div className="space-y-1">
                                <div className="flex gap-1">
                                    {[0, 1, 2].map(i => (
                                        <motion.div
                                            key={`bull-${i}`}
                                            className={`w-8 h-8 rounded-lg flex items-center justify-center border-2 transition-all ${(score?.bulls || 0) > i
                                                ? 'bg-gradient-to-br from-green-500 to-emerald-600 border-green-400 shadow-[0_0_10px_rgba(34,197,94,0.5)]'
                                                : 'bg-zinc-900 border-zinc-700'
                                                }`}
                                            initial={false}
                                            animate={(score?.bulls || 0) > i ? { scale: [0.8, 1.2, 1] } : {}}
                                            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                                        >
                                            <img src="/icons/bull.png" alt="bull" className="w-6 h-6" />
                                        </motion.div>
                                    ))}
                                </div>
                                <div className="flex gap-1">
                                    {[0, 1, 2].map(i => (
                                        <motion.div
                                            key={`bear-${i}`}
                                            className={`w-8 h-8 rounded-lg flex items-center justify-center border-2 transition-all ${(score?.bears || 0) > i
                                                ? 'bg-gradient-to-br from-red-500 to-red-700 border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                                                : 'bg-zinc-900 border-zinc-700'
                                                }`}
                                            initial={false}
                                            animate={(score?.bears || 0) > i ? { scale: [0.8, 1.2, 1] } : {}}
                                            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                                        >
                                            <img src="/icons/bear.png" alt="bear" className="w-6 h-6" />
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )
                })}
            </div>

            {/* Wheel - cursor rotates around wheel center */}
            <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
                {/* Static wheel image */}
                <img
                    src="/icons/rulet.png"
                    alt="wheel"
                    className="w-full h-full"
                />

                {/* Rotating cursor - positioned at top, rotates around wheel center */}
                <img
                    src="/icons/Cursor.png"
                    alt="cursor"
                    className="absolute w-10 h-10 top-0 left-1/2 -ml-5 z-10"
                    style={{
                        transformOrigin: 'center 128px',
                        transform: `rotate(${wheelAngle}deg)`,
                        transition: wheelSpinning
                            ? 'transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)'
                            : 'none'
                    }}
                />

                {/* Result indicator with spring animation */}
                <AnimatePresence>
                    {lastResult && !wheelSpinning && (
                        <motion.div
                            initial={{ scale: 0, opacity: 0, rotate: -180 }}
                            animate={{ scale: 1, opacity: 1, rotate: 0 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{
                                type: 'spring',
                                stiffness: 300,
                                damping: 20,
                                mass: 1.2
                            }}
                            className="absolute inset-0 flex items-center justify-center"
                        >
                            <motion.img
                                src={lastResult === 'bull' ? '/icons/bull.png' : '/icons/bear.png'}
                                alt={lastResult}
                                className={`w-24 h-24 ${
                                    lastResult === 'bull'
                                        ? 'drop-shadow-[0_0_30px_rgba(34,197,94,0.9)]'
                                        : 'drop-shadow-[0_0_30px_rgba(239,68,68,0.9)]'
                                }`}
                                animate={{ scale: [1, 1.15, 1] }}
                                transition={{ duration: 0.4, ease: 'easeOut' }}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="text-center mt-4 text-white/30 text-xs">
                3 Bulls = ПОБЕДА | 3 Bears = ВЫБЫВАНИЕ
            </div>
        </div>
    )
}
