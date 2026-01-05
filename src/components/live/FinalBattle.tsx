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
    const [cursorAngle, setCursorAngle] = useState(0)
    const [isSpinning, setIsSpinning] = useState(false)
    const [lastResult, setLastResult] = useState<'bull' | 'bear' | null>(null)

    const animationStarted = useRef(false)
    const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])
    const isUnmountedRef = useRef(false)
    const baseAngleRef = useRef(0)

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

    // WHEEL ZONES (колесо статично):
    // Левая половина (270° сверху по часовой до 90°) = ЗЕЛЁНАЯ = БЫКИ
    // Правая половина (90° до 270°) = КРАСНАЯ = МЕДВЕДИ
    // Стрелка начинает сверху (0°) и вращается по часовой

    useEffect(() => {
        if (animationStarted.current || turns.length === 0 || scores.length === 0) return
        animationStarted.current = true

        let turnIdx = 0

        const animateNextTurn = () => {
            if (isUnmountedRef.current) return

            if (turnIdx >= turns.length) {
                // All turns done - assign remaining player 1st place
                setScores(prev => {
                    const newScores = [...prev]
                    const remainingPlayer = newScores.findIndex(s => s.place === null)
                    if (remainingPlayer !== -1) {
                        newScores[remainingPlayer].place = 1
                    }
                    return newScores
                })

                safeTimeout(() => {
                    onWin?.()
                    confetti({
                        particleCount: 200,
                        spread: 120,
                        origin: { y: 0.5 },
                        colors: ['#FFD700', '#FFA500', '#22c55e', '#FFFFFF']
                    })
                    safeTimeout(onComplete, 2500)
                }, 1000)
                return
            }

            const turn = turns[turnIdx]
            setCurrentTurnIndex(turnIdx)
            setCurrentPlayer(turn.player)
            setLastResult(null)
            setIsSpinning(true)

            // Target zones:
            // BULL = left side = angles around 315° (top-left) or 225° (bottom-left)
            // BEAR = right side = angles around 45° (top-right) or 135° (bottom-right)
            const randomOffset = (Math.random() - 0.5) * 60 // ±30° randomness

            let targetZone: number
            if (turn.result === 'bull') {
                // Left side: 225° to 315° (center at 270°)
                targetZone = 270 + randomOffset
            } else {
                // Right side: 45° to 135° (center at 90°)
                targetZone = 90 + randomOffset
            }

            // Calculate spin: multiple full rotations + target
            const currentPos = baseAngleRef.current % 360
            let delta = targetZone - currentPos
            if (delta < 0) delta += 360

            const fullSpins = 1440 // 4 full rotations
            const newAngle = baseAngleRef.current + fullSpins + delta
            baseAngleRef.current = newAngle

            setCursorAngle(newAngle)
            onWheelSpin?.()

            if (window.Telegram?.WebApp?.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.impactOccurred('light')
            }

            safeTimeout(() => {
                if (isUnmountedRef.current) return

                setIsSpinning(false)
                setLastResult(turn.result)

                setScores(prev => {
                    const newScores = [...prev]
                    if (turn.result === 'bull') {
                        newScores[turn.player].bulls++
                    } else {
                        newScores[turn.player].bears++
                    }

                    // Check for 3 bulls = 1st place
                    if (newScores[turn.player].bulls >= 3 && newScores[turn.player].place === null) {
                        newScores[turn.player].place = 1
                        confetti({
                            particleCount: 150,
                            spread: 80,
                            origin: { y: 0.4 },
                            colors: ['#FFD700', '#FFA500', '#22c55e']
                        })
                    }

                    // Check for 3 bears = elimination (3rd place first, then 2nd)
                    if (newScores[turn.player].bears >= 3 && newScores[turn.player].place === null) {
                        const eliminatedCount = newScores.filter(s => s.place !== null && s.place > 1).length
                        newScores[turn.player].place = 3 - eliminatedCount // First eliminated = 3, second = 2
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
                safeTimeout(animateNextTurn, 1800)
            }, 2200)
        }

        safeTimeout(animateNextTurn, 800)
    }, [turns, scores.length, candidates, winners, onComplete, safeTimeout, onWheelSpin, onBull, onBear, onWin])

    // Get place label
    const getPlaceLabel = (place: number | null) => {
        if (place === 1) return '🥇'
        if (place === 2) return '🥈'
        if (place === 3) return '🥉'
        return null
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex flex-col pt-[80px] pb-4 px-3">
            {/* Header */}
            <div className="text-center mb-4">
                <h1 className="text-xl font-black tracking-wide uppercase flex items-center justify-center gap-2">
                    <span className="text-green-500 drop-shadow-[0_0_10px_rgba(34,197,94,0.6)]">🐂 БЫКИ</span>
                    <span className="text-white/30 text-base">vs</span>
                    <span className="text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]">МЕДВЕДИ 🐻</span>
                </h1>
                <div className="mt-2 text-xs text-white/50">
                    3 быка = 🥇 • 3 медведя = выбывание
                </div>
            </div>

            {/* Players - 3 cards */}
            <div className="flex justify-center gap-2 mb-4">
                {candidates.map((ticket, idx) => {
                    const score = scores[idx] || { bulls: 0, bears: 0, place: null }
                    const isCurrent = currentPlayer === idx && score.place === null
                    const hasPlace = score.place !== null
                    const isWinner = score.place === 1

                    return (
                        <motion.div
                            key={idx}
                            className={`
                                flex flex-col items-center p-2 rounded-xl border-2 w-[100px]
                                transition-all duration-300
                                ${isWinner
                                    ? 'border-[#FFD700] bg-gradient-to-b from-[#FFD700]/20 to-transparent shadow-[0_0_30px_rgba(255,215,0,0.5)]'
                                    : hasPlace
                                        ? 'border-red-500/40 bg-red-950/20 opacity-50'
                                        : isCurrent
                                            ? 'border-green-400 bg-green-900/30 shadow-[0_0_20px_rgba(34,197,94,0.4)]'
                                            : 'border-zinc-700/50 bg-zinc-900/50'
                                }
                            `}
                            animate={isCurrent ? { scale: [1, 1.03, 1] } : {}}
                            transition={{ duration: 1, repeat: isCurrent ? Infinity : 0 }}
                        >
                            {/* Avatar with place badge */}
                            <div className="relative mb-1">
                                <img
                                    src={ticket.player.avatar || '/default-avatar.png'}
                                    alt=""
                                    className={`w-11 h-11 rounded-full border-2 object-cover ${
                                        isWinner ? 'border-[#FFD700]' :
                                        hasPlace ? 'border-red-500 grayscale' :
                                        isCurrent ? 'border-green-400' : 'border-zinc-600'
                                    }`}
                                />
                                {hasPlace && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="absolute -top-1 -right-1 text-lg"
                                    >
                                        {getPlaceLabel(score.place)}
                                    </motion.div>
                                )}
                            </div>

                            {/* Name */}
                            <div className="text-[10px] text-white/80 font-medium truncate w-full text-center mb-1.5">
                                {ticket.player.name?.slice(0, 12) || 'Player'}
                            </div>

                            {/* Score - Bulls row */}
                            <div className="flex gap-0.5 mb-0.5">
                                {[0, 1, 2].map(i => (
                                    <motion.div
                                        key={`bull-${i}`}
                                        className={`w-6 h-6 rounded-md flex items-center justify-center text-xs ${
                                            score.bulls > i
                                                ? 'bg-green-500 shadow-[0_0_10px_#22c55e]'
                                                : 'bg-zinc-800/80 border border-zinc-700/50'
                                        }`}
                                        animate={score.bulls > i ? { scale: [0.8, 1.15, 1] } : {}}
                                    >
                                        🐂
                                    </motion.div>
                                ))}
                            </div>

                            {/* Score - Bears row */}
                            <div className="flex gap-0.5">
                                {[0, 1, 2].map(i => (
                                    <motion.div
                                        key={`bear-${i}`}
                                        className={`w-6 h-6 rounded-md flex items-center justify-center text-xs ${
                                            score.bears > i
                                                ? 'bg-red-500 shadow-[0_0_10px_#ef4444]'
                                                : 'bg-zinc-800/80 border border-zinc-700/50'
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

            {/* Wheel Section */}
            <div className="flex-1 flex items-center justify-center relative">
                <div className="relative w-56 h-56">
                    {/* Ambient glow */}
                    <div className="absolute inset-[-30px] bg-gradient-to-r from-green-500/15 via-transparent to-red-500/15 rounded-full blur-3xl" />

                    {/* Wheel (static) */}
                    <img
                        src="/icons/rulet.png"
                        alt="wheel"
                        className="w-full h-full relative z-10 drop-shadow-[0_0_20px_rgba(255,215,0,0.2)]"
                    />

                    {/* Cursor (rotates around wheel) */}
                    <div
                        className="absolute inset-0 z-20 pointer-events-none"
                        style={{
                            transform: `rotate(${cursorAngle}deg)`,
                            transition: isSpinning
                                ? 'transform 2.2s cubic-bezier(0.15, 0.6, 0.2, 1)'
                                : 'none'
                        }}
                    >
                        {/* Cursor positioned at top, pointing down into wheel */}
                        <img
                            src="/icons/Cursor.png"
                            alt="cursor"
                            className="absolute w-8 h-8 top-[-4px] left-1/2 -translate-x-1/2 drop-shadow-[0_0_10px_rgba(255,165,0,0.8)]"
                        />
                    </div>

                    {/* Result overlay */}
                    <AnimatePresence>
                        {lastResult && !isSpinning && (
                            <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                className="absolute inset-0 flex items-center justify-center z-30"
                            >
                                <motion.div
                                    className={`
                                        w-20 h-20 rounded-full flex items-center justify-center backdrop-blur-sm
                                        ${lastResult === 'bull'
                                            ? 'bg-green-500/40 shadow-[0_0_40px_rgba(34,197,94,0.8)]'
                                            : 'bg-red-500/40 shadow-[0_0_40px_rgba(239,68,68,0.8)]'
                                        }
                                    `}
                                    animate={{ scale: [1, 1.1, 1] }}
                                    transition={{ duration: 0.4 }}
                                >
                                    <span className="text-5xl">
                                        {lastResult === 'bull' ? '🐂' : '🐻'}
                                    </span>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Turn indicator */}
            <div className="text-center mt-2">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900/80 rounded-full border border-white/10">
                    <div className={`w-2 h-2 rounded-full ${isSpinning ? 'bg-[#FFD700] animate-pulse' : 'bg-zinc-600'}`} />
                    <span className="text-sm text-white/70 font-medium">
                        Ход {Math.min(currentTurnIndex + 1, turns.length)} из {turns.length}
                    </span>
                </div>
            </div>

            {/* FINAL badge */}
            <div className="text-center mt-3">
                <span
                    className="text-3xl font-black tracking-[0.2em]"
                    style={{
                        background: 'linear-gradient(180deg, #FFD700 0%, #FFA500 50%, #CC8400 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        filter: 'drop-shadow(0 0 15px rgba(255,215,0,0.4))'
                    }}
                >
                    ФИНАЛ
                </span>
            </div>
        </div>
    )
}
