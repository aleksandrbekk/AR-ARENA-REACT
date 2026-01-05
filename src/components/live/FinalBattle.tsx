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

    useEffect(() => {
        setScores(candidates.map(() => ({ bulls: 0, bears: 0, place: null })))
    }, [candidates])

    // WHEEL MECHANICS:
    // Cursor at top (0°) rotates clockwise around wheel
    // rulet.png: LEFT = GREEN (BULL), RIGHT = RED (BEAR)
    //
    // When cursor at 270° → points LEFT → BULL zone
    // When cursor at 90° → points RIGHT → BEAR zone
    //
    // SIMPLE APPROACH: Always add full rotations + target angle directly
    // No delta calculation - just set absolute target

    useEffect(() => {
        if (animationStarted.current || turns.length === 0 || scores.length === 0) return
        animationStarted.current = true
        setIsAnimating(true)

        let turnIdx = 0
        let baseAngle = 0

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

            // Target angle based on result
            // Bull = 270° (left side), Bear = 90° (right side)
            // Add randomness ±30° within zone
            const randomOffset = (Math.random() - 0.5) * 60
            const targetAngle = turn.result === 'bull'
                ? 270 + randomOffset  // 240° to 300°
                : 90 + randomOffset   // 60° to 120°

            // Add 5 full spins (1800°) + target
            const fullSpins = 1800
            const newAngle = baseAngle + fullSpins + targetAngle
            baseAngle = newAngle

            setWheelAngle(newAngle)
            onWheelSpin?.()

            if (window.Telegram?.WebApp?.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.impactOccurred('light')
            }

            safeTimeout(() => {
                if (isUnmountedRef.current) return

                setWheelSpinning(false)
                setLastResult(turn.result)

                setScores(prev => {
                    const newScores = [...prev]
                    if (turn.result === 'bull') {
                        newScores[turn.player].bulls++
                    } else {
                        newScores[turn.player].bears++
                    }

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
        <div className="min-h-screen bg-[#0a0a0a] pt-[90px] pb-4 px-3 flex flex-col">
            {/* Title */}
            <div className="text-center mb-4">
                <h1 className="text-xl font-black tracking-wide uppercase flex items-center justify-center gap-2">
                    <span className="text-green-500 drop-shadow-[0_0_10px_rgba(34,197,94,0.6)]">
                        БЫКИ
                    </span>
                    <span className="text-white/40">И</span>
                    <span className="text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]">
                        МЕДВЕДИ
                    </span>
                </h1>
                {isAnimating && (
                    <div className="mt-1.5 inline-flex items-center gap-2 px-3 py-1 bg-zinc-900/80 rounded-full border border-white/10">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#FFD700] animate-pulse" />
                        <span className="text-xs text-white/70">
                            Ход {currentTurnIndex + 1} / {turns.length}
                        </span>
                    </div>
                )}
            </div>

            {/* Players */}
            <div className="flex justify-center items-start gap-2 mb-4">
                {candidates.map((ticket, idx) => {
                    const score = scores[idx] || { bulls: 0, bears: 0, place: null }
                    const isCurrent = currentPlayer === idx
                    const hasPlace = score.place !== null

                    return (
                        <motion.div
                            key={idx}
                            className={`
                                flex flex-col items-center p-2 rounded-xl border-2 transition-all duration-300
                                ${hasPlace && score.place === 1
                                    ? 'border-[#FFD700] bg-[#FFD700]/10 shadow-[0_0_20px_rgba(255,215,0,0.5)]'
                                    : hasPlace && score.place === 3
                                        ? 'border-red-500/50 bg-red-950/30 opacity-60'
                                        : isCurrent
                                            ? 'border-green-500 bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.4)]'
                                            : 'border-zinc-700 bg-zinc-900/50'
                                }
                            `}
                            animate={isCurrent && !hasPlace ? { scale: [1, 1.03, 1] } : {}}
                            transition={{ duration: 0.5, repeat: isCurrent ? Infinity : 0 }}
                        >
                            {/* Avatar */}
                            <div className="relative mb-1.5">
                                <img
                                    src={ticket.player.avatar || '/default-avatar.png'}
                                    alt=""
                                    className={`w-14 h-14 rounded-full border-2 object-cover ${
                                        hasPlace && score.place === 1 ? 'border-[#FFD700]' :
                                        hasPlace && score.place === 3 ? 'border-red-500 grayscale' :
                                        isCurrent ? 'border-green-500' : 'border-zinc-600'
                                    }`}
                                />
                                {isCurrent && !hasPlace && (
                                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                                        <span className="text-[10px]">▶</span>
                                    </div>
                                )}
                                {hasPlace && (
                                    <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[10px] font-bold ${
                                        score.place === 1 ? 'bg-[#FFD700] text-black' :
                                        score.place === 2 ? 'bg-gray-400 text-black' :
                                        'bg-red-600 text-white'
                                    }`}>
                                        {score.place}
                                    </div>
                                )}
                            </div>

                            {/* Name */}
                            <div className="text-[10px] text-white/70 truncate max-w-[70px] mb-1.5">
                                {ticket.player.name}
                            </div>

                            {/* Score Grid */}
                            <div className="flex flex-col gap-0.5">
                                <div className="flex gap-0.5">
                                    {[0, 1, 2].map(i => (
                                        <motion.div
                                            key={`bull-${i}`}
                                            className={`w-5 h-5 rounded flex items-center justify-center ${
                                                score.bulls > i
                                                    ? 'bg-green-500 shadow-[0_0_6px_#22c55e]'
                                                    : 'bg-zinc-800 border border-zinc-700'
                                            }`}
                                            animate={score.bulls > i ? { scale: [0.8, 1.1, 1] } : {}}
                                        >
                                            <span className="text-[10px]">🐂</span>
                                        </motion.div>
                                    ))}
                                </div>
                                <div className="flex gap-0.5">
                                    {[0, 1, 2].map(i => (
                                        <motion.div
                                            key={`bear-${i}`}
                                            className={`w-5 h-5 rounded flex items-center justify-center ${
                                                score.bears > i
                                                    ? 'bg-red-500 shadow-[0_0_6px_#ef4444]'
                                                    : 'bg-zinc-800 border border-zinc-700'
                                            }`}
                                            animate={score.bears > i ? { scale: [0.8, 1.1, 1] } : {}}
                                        >
                                            <span className="text-[10px]">🐻</span>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )
                })}
            </div>

            {/* Wheel */}
            <div className="flex-1 flex items-center justify-center">
                <div className="relative w-52 h-52">
                    {/* Glow */}
                    <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 via-transparent to-red-500/20 rounded-full blur-xl" />

                    {/* Wheel image */}
                    <img
                        src="/icons/rulet.png"
                        alt="wheel"
                        className="w-full h-full relative z-10"
                    />

                    {/* Cursor rotates */}
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
                            className="absolute w-8 h-8 top-0 left-1/2 -translate-x-1/2 -translate-y-1"
                        />
                    </div>

                    {/* Result */}
                    <AnimatePresence>
                        {lastResult && !wheelSpinning && (
                            <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                className="absolute inset-0 flex items-center justify-center z-30"
                            >
                                <div className={`
                                    w-20 h-20 rounded-full flex items-center justify-center
                                    ${lastResult === 'bull'
                                        ? 'bg-green-500/30 shadow-[0_0_40px_rgba(34,197,94,0.8)]'
                                        : 'bg-red-500/30 shadow-[0_0_40px_rgba(239,68,68,0.8)]'
                                    }
                                `}>
                                    <motion.span
                                        className="text-5xl"
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

            {/* FINAL */}
            <div className="text-center mt-4">
                <h2
                    className="text-4xl font-black tracking-[0.2em]"
                    style={{
                        background: 'linear-gradient(180deg, #FFD700 0%, #FFA500 50%, #CC8400 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}
                >
                    FINAL
                </h2>
            </div>
        </div>
    )
}
