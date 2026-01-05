import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState, useRef } from 'react'
import confetti from 'canvas-confetti'
import type { Ticket } from '../../types'

interface Turn {
    turn: number
    player: number // index in candidates array
    result: 'bull' | 'bear'
}

interface Winner {
    place: number
    ticket: number
    username: string
}

interface FinalBattleProps {
    candidates: Ticket[]
    turns: Turn[]
    winners: Winner[]
    onComplete: () => void
}

export function FinalBattle({
    candidates,
    turns,
    winners,
    onComplete
}: FinalBattleProps) {
    // Animation state
    const [currentTurnIndex, setCurrentTurnIndex] = useState(-1)
    const [scores, setScores] = useState<{ bulls: number; bears: number; place: number | null }[]>([])
    const [currentPlayer, setCurrentPlayer] = useState<number | null>(null)
    const [wheelAngle, setWheelAngle] = useState(0)
    const [wheelSpinning, setWheelSpinning] = useState(false)
    const [lastResult, setLastResult] = useState<'bull' | 'bear' | null>(null)
    const [isAnimating, setIsAnimating] = useState(false)
    const animationStarted = useRef(false)

    // Initialize scores
    useEffect(() => {
        setScores(candidates.map(() => ({ bulls: 0, bears: 0, place: null })))
    }, [candidates])

    // Animate through turns
    useEffect(() => {
        if (animationStarted.current || turns.length === 0 || scores.length === 0) return
        animationStarted.current = true
        setIsAnimating(true)

        let turnIdx = 0
        let currentAngle = 0

        const animateNextTurn = () => {
            if (turnIdx >= turns.length) {
                setIsAnimating(false)
                setCurrentPlayer(null)
                setLastResult(null)
                // All turns done, wait then complete
                setTimeout(onComplete, 3000)
                return
            }

            const turn = turns[turnIdx]
            setCurrentTurnIndex(turnIdx)
            setCurrentPlayer(turn.player)
            setLastResult(null)
            setWheelSpinning(true)

            // Calculate wheel angle based on result
            // Bull = green (left side, 180-360), Bear = red (right side, 0-180)
            const spinAmount = 1800 + Math.random() * 720 // 5-7 full rotations
            const resultOffset = turn.result === 'bull' ? 270 : 90 // Target angle
            const newAngle = currentAngle + spinAmount + resultOffset
            currentAngle = newAngle

            setWheelAngle(newAngle)

            // Haptic feedback for spin
            if (window.Telegram?.WebApp?.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.impactOccurred('light')
            }

            // After wheel stops spinning
            setTimeout(() => {
                setWheelSpinning(false)
                setLastResult(turn.result)

                // Update scores
                setScores(prev => {
                    const newScores = [...prev]
                    if (turn.result === 'bull') {
                        newScores[turn.player].bulls++
                    } else {
                        newScores[turn.player].bears++
                    }

                    // Check for place assignment
                    if (newScores[turn.player].bulls >= 3) {
                        // Winner! Find place from winners array
                        const winnerEntry = winners.find(w =>
                            w.ticket === candidates[turn.player].ticket_number
                        )
                        if (winnerEntry) {
                            newScores[turn.player].place = winnerEntry.place
                        }
                        // Confetti for winner
                        if (winnerEntry?.place === 1) {
                            confetti({
                                particleCount: 100,
                                spread: 70,
                                origin: { y: 0.6 },
                                colors: ['#FFD700', '#FFA500', '#22c55e']
                            })
                        }
                    } else if (newScores[turn.player].bears >= 3) {
                        // Eliminated
                        const winnerEntry = winners.find(w =>
                            w.ticket === candidates[turn.player].ticket_number
                        )
                        if (winnerEntry) {
                            newScores[turn.player].place = winnerEntry.place
                        }
                    }

                    return newScores
                })

                // Haptic feedback for result
                if (window.Telegram?.WebApp?.HapticFeedback) {
                    window.Telegram.WebApp.HapticFeedback.notificationOccurred(
                        turn.result === 'bull' ? 'success' : 'error'
                    )
                }

                turnIdx++
                // Next turn after delay
                setTimeout(animateNextTurn, 2000)
            }, 3000) // Wheel spin duration
        }

        // Start animation after short delay
        setTimeout(animateNextTurn, 1000)
    }, [turns, scores.length, candidates, winners, onComplete])

    const getPlayerCardClass = (idx: number) => {
        const score = scores[idx]
        if (!score) return 'border-[#FFD700]/50'

        const isCurrent = currentPlayer === idx
        const hasPlace = score.place !== null

        if (hasPlace) {
            if (score.place === 1) {
                return 'border-[#FFD700] shadow-[0_0_40px_rgba(255,215,0,0.8)] scale-105'
            }
            if (score.place === 3) {
                return 'border-red-500 grayscale opacity-60'
            }
            if (score.place === 2) {
                return 'border-gray-400 shadow-[0_0_20px_rgba(156,163,175,0.5)]'
            }
        }

        if (isCurrent) {
            return 'border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.7)] scale-110'
        }

        return 'border-[#FFD700]/50'
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] pt-[100px] pb-8 px-4">
            {/* Title */}
            <div className="text-center mb-6">
                <h1 className="text-2xl font-black tracking-wider uppercase flex items-center justify-center gap-2">
                    <span
                        style={{
                            background: 'linear-gradient(180deg, #7FFF7F 0%, #22c55e 40%, #166534 70%, #0a3d1a 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            filter: 'drop-shadow(0 2px 4px rgba(34,197,94,0.5))',
                        }}
                    >
                        БЫКИ
                    </span>
                    <span className="text-white/40">И</span>
                    <span
                        style={{
                            background: 'linear-gradient(180deg, #FF7F7F 0%, #ef4444 40%, #991b1b 70%, #450a0a 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            filter: 'drop-shadow(0 2px 4px rgba(239,68,68,0.5))',
                        }}
                    >
                        МЕДВЕДИ
                    </span>
                </h1>
                {isAnimating && (
                    <div className="mt-2 inline-flex items-center gap-2 px-4 py-1 bg-zinc-900/80 rounded-full border border-white/10">
                        <div className="w-2 h-2 rounded-full bg-[#FFD700] animate-pulse" />
                        <span className="text-sm text-white/70">
                            Ход {currentTurnIndex + 1} / {turns.length}
                        </span>
                    </div>
                )}
            </div>

            {/* Players */}
            <div className="flex justify-center items-end gap-6 mb-8">
                {candidates.map((ticket, idx) => {
                    const score = scores[idx] || { bulls: 0, bears: 0, place: null }
                    const hasPlace = score.place !== null

                    return (
                        <motion.div
                            key={idx}
                            className="flex flex-col items-center"
                            animate={
                                score.place === 3
                                    ? { x: [0, -3, 3, -3, 3, 0] }
                                    : {}
                            }
                            transition={{ duration: 0.4 }}
                        >
                            {/* Avatar */}
                            <div className="relative mb-2">
                                <motion.img
                                    src={ticket.player.avatar || '/default-avatar.png'}
                                    alt=""
                                    className={`w-20 h-20 rounded-full border-3 transition-all duration-300 object-cover ${getPlayerCardClass(idx)}`}
                                    animate={score.place === 1 ? { scale: [1, 1.1, 1] } : {}}
                                    transition={score.place === 1 ? { duration: 0.6, repeat: 2 } : {}}
                                />
                                {currentPlayer === idx && !hasPlace && (
                                    <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-green-500 to-green-600 text-white text-xs font-bold flex items-center justify-center border-2 border-black animate-pulse">
                                        ▶
                                    </div>
                                )}
                            </div>

                            {/* Name / Place */}
                            <motion.div
                                className={`px-3 py-2 rounded-xl text-center mb-2 min-w-[80px] max-w-[100px] transition-all duration-300 ${score.place === 1
                                    ? 'bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black font-bold shadow-[0_0_30px_rgba(255,215,0,0.8)]'
                                    : score.place === 2
                                        ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-black font-bold'
                                        : score.place === 3
                                            ? 'bg-gradient-to-r from-red-600 to-red-700 text-white font-bold'
                                            : 'bg-zinc-800 text-white'
                                    }`}
                                animate={score.place === 1 ? { scale: [1, 1.05, 1] } : {}}
                                transition={score.place === 1 ? { duration: 0.5, repeat: 3 } : {}}
                            >
                                <span className="truncate block text-sm font-bold">
                                    {hasPlace
                                        ? `${score.place} МЕСТО`
                                        : ticket.player.name}
                                </span>
                            </motion.div>

                            {/* Bulls & Bears Grid */}
                            <div className="space-y-1">
                                <div className="flex gap-1">
                                    {[0, 1, 2].map(i => (
                                        <motion.div
                                            key={`bull-${i}`}
                                            className={`w-8 h-8 rounded-lg flex items-center justify-center border-2 transition-all ${score.bulls > i
                                                ? 'bg-gradient-to-br from-green-500 to-emerald-600 border-green-400 shadow-[0_0_10px_rgba(34,197,94,0.5)]'
                                                : 'bg-zinc-900 border-zinc-700'
                                                }`}
                                            initial={false}
                                            animate={score.bulls > i ? { scale: [0.8, 1.2, 1] } : {}}
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
                                            className={`w-8 h-8 rounded-lg flex items-center justify-center border-2 transition-all ${score.bears > i
                                                ? 'bg-gradient-to-br from-red-500 to-red-700 border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                                                : 'bg-zinc-900 border-zinc-700'
                                                }`}
                                            initial={false}
                                            animate={score.bears > i ? { scale: [0.8, 1.2, 1] } : {}}
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

            {/* Wheel */}
            <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
                <img
                    src="/icons/rulet.png"
                    alt="wheel"
                    className="w-full h-full"
                />

                {/* Rotating cursor */}
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

                {/* Result indicator */}
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
                            }}
                            className="absolute inset-0 flex items-center justify-center"
                        >
                            <motion.img
                                src={lastResult === 'bull' ? '/icons/bull.png' : '/icons/bear.png'}
                                alt={lastResult}
                                className={`w-24 h-24 ${lastResult === 'bull'
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

            {/* FINAL footer */}
            <div className="text-center mt-6">
                <div className="relative inline-block">
                    <div className="absolute inset-0 blur-2xl opacity-30 bg-gradient-to-r from-green-500 via-[#FFD700] to-red-500" />
                    <h2
                        className="relative text-5xl font-black tracking-[0.3em] uppercase"
                        style={{
                            background: 'linear-gradient(180deg, #FFD700 0%, #FFA500 50%, #CC8400 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            textShadow: '0 0 60px rgba(255,215,0,0.4)',
                        }}
                    >
                        FINAL
                    </h2>
                </div>
            </div>
        </div>
    )
}
