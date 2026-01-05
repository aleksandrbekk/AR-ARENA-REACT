import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState, useRef, useCallback } from 'react'
import confetti from 'canvas-confetti'
import type { Ticket } from '../../types'

interface Turn {
    turn: number
    player: number
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
    onWheelSpin?: () => void
    onBull?: () => void
    onBear?: () => void
    onWin?: () => void
}

export function FinalBattle({
    candidates,
    turns,
    winners,
    onComplete,
    onWheelSpin,
    onBull,
    onBear,
    onWin
}: FinalBattleProps) {
    const [currentTurnIndex, setCurrentTurnIndex] = useState(-1)
    const [scores, setScores] = useState<{ bulls: number; bears: number; place: number | null }[]>([])
    const [currentPlayer, setCurrentPlayer] = useState<number | null>(null)
    const [wheelAngle, setWheelAngle] = useState(0)
    const [wheelSpinning, setWheelSpinning] = useState(false)
    const [lastResult, setLastResult] = useState<'bull' | 'bear' | null>(null)
    const [isAnimating, setIsAnimating] = useState(false)

    const animationStarted = useRef(false)
    const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])
    const isUnmountedRef = useRef(false)
    const accumulatedAngleRef = useRef(0)

    // Cleanup
    const clearAllTimeouts = useCallback(() => {
        timeoutsRef.current.forEach(t => clearTimeout(t))
        timeoutsRef.current = []
    }, [])

    const safeTimeout = useCallback((fn: () => void, delay: number) => {
        const t = setTimeout(() => {
            if (!isUnmountedRef.current) fn()
        }, delay)
        timeoutsRef.current.push(t)
        return t
    }, [])

    useEffect(() => {
        isUnmountedRef.current = false
        return () => {
            isUnmountedRef.current = true
            clearAllTimeouts()
        }
    }, [clearAllTimeouts])

    // Initialize scores
    useEffect(() => {
        setScores(candidates.map(() => ({ bulls: 0, bears: 0, place: null })))
    }, [candidates])

    // Wheel zones:
    // rulet.png: LEFT = GREEN (BULL), RIGHT = RED (BEAR)
    // Cursor at top (0°) rotates clockwise
    // - 90° = points RIGHT = BEAR
    // - 270° = points LEFT = BULL
    const getTargetAngle = (result: 'bull' | 'bear'): number => {
        const randomOffset = (Math.random() - 0.5) * 50 // ±25° within zone
        if (result === 'bull') {
            return 270 + randomOffset  // Left side (220-320°)
        } else {
            return 90 + randomOffset   // Right side (40-140°)
        }
    }

    // Animate through turns
    useEffect(() => {
        if (animationStarted.current || turns.length === 0 || scores.length === 0) return
        animationStarted.current = true
        setIsAnimating(true)

        let turnIdx = 0

        const animateNextTurn = () => {
            if (isUnmountedRef.current) return

            if (turnIdx >= turns.length) {
                setIsAnimating(false)
                setCurrentPlayer(null)
                setLastResult(null)
                safeTimeout(() => {
                    onWin?.()
                    confetti({
                        particleCount: 150,
                        spread: 100,
                        origin: { y: 0.5 },
                        colors: ['#FFD700', '#FFA500', '#22c55e']
                    })
                    safeTimeout(onComplete, 2000)
                }, 1000)
                return
            }

            const turn = turns[turnIdx]
            setCurrentTurnIndex(turnIdx)
            setCurrentPlayer(turn.player)
            setLastResult(null)
            setWheelSpinning(true)

            // Calculate wheel angle - FIX: account for current position
            const currentPos = accumulatedAngleRef.current % 360
            const targetZoneAngle = getTargetAngle(turn.result)
            const fullRotations = 1440 + Math.random() * 720 // 4-6 full spins

            // Calculate delta to reach target zone from current position
            let delta = targetZoneAngle - currentPos
            if (delta < 0) delta += 360

            const newAngle = accumulatedAngleRef.current + fullRotations + delta
            accumulatedAngleRef.current = newAngle

            setWheelAngle(newAngle)
            onWheelSpin?.()

            if (window.Telegram?.WebApp?.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.impactOccurred('light')
            }

            // After wheel stops
            safeTimeout(() => {
                if (isUnmountedRef.current) return

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
                    if (newScores[turn.player].bulls >= 3 || newScores[turn.player].bears >= 3) {
                        const winnerEntry = winners.find(w =>
                            w.ticket === candidates[turn.player].ticket_number
                        )
                        if (winnerEntry) {
                            newScores[turn.player].place = winnerEntry.place
                        }

                        if (newScores[turn.player].bulls >= 3 && winnerEntry?.place === 1) {
                            confetti({
                                particleCount: 80,
                                spread: 60,
                                origin: { y: 0.4 },
                                colors: ['#FFD700', '#FFA500', '#22c55e']
                            })
                        }
                    }

                    return newScores
                })

                // Haptic & sound
                if (window.Telegram?.WebApp?.HapticFeedback) {
                    window.Telegram.WebApp.HapticFeedback.notificationOccurred(
                        turn.result === 'bull' ? 'success' : 'error'
                    )
                }

                if (turn.result === 'bull') {
                    onBull?.()
                } else {
                    onBear?.()
                }

                turnIdx++
                safeTimeout(animateNextTurn, 2000)
            }, 2500)
        }

        safeTimeout(animateNextTurn, 1000)
    }, [turns, scores.length, candidates, winners, onComplete, safeTimeout, onWheelSpin, onBull, onBear, onWin])

    return (
        <div className="min-h-screen bg-[#0a0a0a] pt-[70px] pb-4 px-4 flex flex-col">
            {/* Title */}
            <div className="text-center mb-3">
                <h1 className="text-2xl font-black tracking-wide uppercase flex items-center justify-center gap-2">
                    <span className="text-green-500 drop-shadow-[0_0_10px_rgba(34,197,94,0.6)]">
                        БЫКИ
                    </span>
                    <span className="text-white/40">vs</span>
                    <span className="text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]">
                        МЕДВЕДИ
                    </span>
                </h1>
                {isAnimating && (
                    <div className="mt-2 inline-flex items-center gap-2 px-4 py-1.5 bg-zinc-900/80 rounded-full border border-white/10">
                        <div className="w-2 h-2 rounded-full bg-[#FFD700] animate-pulse" />
                        <span className="text-sm text-white/70">
                            Ход {currentTurnIndex + 1} / {turns.length}
                        </span>
                    </div>
                )}
            </div>

            {/* Players - Centered Row */}
            <div className="flex justify-center items-start gap-3 mb-4">
                {candidates.map((ticket, idx) => {
                    const score = scores[idx] || { bulls: 0, bears: 0, place: null }
                    const isCurrent = currentPlayer === idx
                    const hasPlace = score.place !== null

                    return (
                        <motion.div
                            key={idx}
                            className={`
                                flex flex-col items-center p-3 rounded-2xl border-2 transition-all duration-300 w-[100px]
                                ${hasPlace && score.place === 1
                                    ? 'border-[#FFD700] bg-[#FFD700]/10 shadow-[0_0_25px_rgba(255,215,0,0.5)]'
                                    : hasPlace && score.place === 3
                                        ? 'border-red-500/50 bg-red-950/30 opacity-60'
                                        : isCurrent
                                            ? 'border-green-500 bg-green-500/10 shadow-[0_0_20px_rgba(34,197,94,0.4)]'
                                            : 'border-zinc-700/50 bg-zinc-900/50'
                                }
                            `}
                            animate={isCurrent && !hasPlace ? { scale: [1, 1.02, 1] } : {}}
                            transition={{ duration: 0.6, repeat: isCurrent ? Infinity : 0 }}
                        >
                            {/* Avatar */}
                            <div className="relative mb-2">
                                <img
                                    src={ticket.player.avatar || '/default-avatar.png'}
                                    alt=""
                                    className={`w-16 h-16 rounded-full border-3 object-cover ${
                                        hasPlace && score.place === 1 ? 'border-[#FFD700]' :
                                        hasPlace && score.place === 3 ? 'border-red-500 grayscale' :
                                        isCurrent ? 'border-green-500' : 'border-zinc-600'
                                    }`}
                                />
                                {isCurrent && !hasPlace && (
                                    <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                                        <span className="text-xs">▶</span>
                                    </div>
                                )}
                                {hasPlace && (
                                    <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-black ${
                                        score.place === 1 ? 'bg-[#FFD700] text-black' :
                                        score.place === 2 ? 'bg-gray-400 text-black' :
                                        'bg-red-600 text-white'
                                    }`}>
                                        {score.place === 1 ? '🥇' : score.place === 2 ? '🥈' : '🥉'}
                                    </div>
                                )}
                            </div>

                            {/* Name */}
                            <div className="text-xs text-white/80 font-medium truncate w-full text-center mt-1 mb-2">
                                {ticket.player.name}
                            </div>

                            {/* Score - Bulls */}
                            <div className="flex gap-1 mb-1">
                                {[0, 1, 2].map(i => (
                                    <motion.div
                                        key={`bull-${i}`}
                                        className={`w-6 h-6 rounded-md flex items-center justify-center text-sm ${
                                            score.bulls > i
                                                ? 'bg-green-500 shadow-[0_0_8px_#22c55e]'
                                                : 'bg-zinc-800 border border-zinc-700'
                                        }`}
                                        animate={score.bulls > i ? { scale: [0.8, 1.15, 1] } : {}}
                                    >
                                        🐂
                                    </motion.div>
                                ))}
                            </div>

                            {/* Score - Bears */}
                            <div className="flex gap-1">
                                {[0, 1, 2].map(i => (
                                    <motion.div
                                        key={`bear-${i}`}
                                        className={`w-6 h-6 rounded-md flex items-center justify-center text-sm ${
                                            score.bears > i
                                                ? 'bg-red-500 shadow-[0_0_8px_#ef4444]'
                                                : 'bg-zinc-800 border border-zinc-700'
                                        }`}
                                        animate={score.bears > i ? { scale: [0.8, 1.15, 1] } : {}}
                                    >
                                        🐻
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )
                })}
            </div>

            {/* Wheel - Big and Centered */}
            <div className="flex-1 flex items-center justify-center">
                <div className="relative w-64 h-64">
                    {/* Wheel background glow */}
                    <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 via-transparent to-red-500/20 rounded-full blur-2xl" />

                    {/* Wheel image */}
                    <img
                        src="/icons/rulet.png"
                        alt="wheel"
                        className="w-full h-full relative z-10"
                    />

                    {/* Cursor - rotates around wheel */}
                    <div
                        className="absolute inset-0 z-20"
                        style={{
                            transform: `rotate(${wheelAngle}deg)`,
                            transition: wheelSpinning
                                ? 'transform 2.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)'
                                : 'none'
                        }}
                    >
                        <img
                            src="/icons/Cursor.png"
                            alt="cursor"
                            className="absolute w-10 h-10 top-0 left-1/2 -translate-x-1/2 -translate-y-2"
                        />
                    </div>

                    {/* Result indicator */}
                    <AnimatePresence>
                        {lastResult && !wheelSpinning && (
                            <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                className="absolute inset-0 flex items-center justify-center z-30"
                            >
                                <div className={`
                                    w-24 h-24 rounded-full flex items-center justify-center
                                    ${lastResult === 'bull'
                                        ? 'bg-green-500/40 shadow-[0_0_50px_rgba(34,197,94,0.9)]'
                                        : 'bg-red-500/40 shadow-[0_0_50px_rgba(239,68,68,0.9)]'
                                    }
                                `}>
                                    <motion.span
                                        className="text-6xl"
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        {lastResult === 'bull' ? '🐂' : '🐻'}
                                    </motion.span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* FINAL text */}
            <div className="text-center mt-2">
                <h2
                    className="text-5xl font-black tracking-[0.3em]"
                    style={{
                        background: 'linear-gradient(180deg, #FFD700 0%, #FFA500 50%, #CC8400 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textShadow: '0 0 30px rgba(255,215,0,0.3)'
                    }}
                >
                    FINAL
                </h2>
            </div>
        </div>
    )
}
