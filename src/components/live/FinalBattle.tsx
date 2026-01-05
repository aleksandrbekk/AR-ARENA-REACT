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

    // WHEEL ZONES:
    // Left half = GREEN = BULLS (180° to 360° = top-left quadrant at 270°±90°)
    // Right half = RED = BEARS (0° to 180° = top-right quadrant at 90°±90°)
    // Cursor starts at top (0°) pointing into wheel

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
            setCurrentPlayer(turn.player)
            setLastResult(null)
            setIsSpinning(true)

            // IMPROVED RANDOMIZATION:
            // Bull zone: 180° to 360° (left half) - pick random spot
            // Bear zone: 0° to 180° (right half) - pick random spot
            // Add more variance to make it look natural

            const bullZoneStart = 180
            const bullZoneEnd = 360
            const bearZoneStart = 0
            const bearZoneEnd = 180

            let targetZone: number
            if (turn.result === 'bull') {
                // Random position within bull zone (left half)
                targetZone = bullZoneStart + Math.random() * (bullZoneEnd - bullZoneStart)
            } else {
                // Random position within bear zone (right half)
                targetZone = bearZoneStart + Math.random() * (bearZoneEnd - bearZoneStart)
            }

            // Calculate spin with randomized full rotations (3-5 spins)
            const fullSpins = (3 + Math.floor(Math.random() * 3)) * 360 // 3-5 full rotations
            const currentPos = baseAngleRef.current % 360
            let delta = targetZone - currentPos
            if (delta < 0) delta += 360

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
                        newScores[turn.player].place = 3 - eliminatedCount
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

    // Get place style
    const getPlaceStyle = (place: number | null) => {
        if (place === 1) return { bg: 'bg-gradient-to-b from-[#FFD700] to-[#B8860B]', text: 'text-black', glow: 'shadow-[0_0_20px_rgba(255,215,0,0.8)]' }
        if (place === 2) return { bg: 'bg-gradient-to-b from-[#C0C0C0] to-[#808080]', text: 'text-black', glow: 'shadow-[0_0_15px_rgba(192,192,192,0.6)]' }
        if (place === 3) return { bg: 'bg-gradient-to-b from-[#CD7F32] to-[#8B4513]', text: 'text-white', glow: 'shadow-[0_0_15px_rgba(205,127,50,0.6)]' }
        return null
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex flex-col pt-[70px] pb-4 px-3">
            {/* Header */}
            <div className="text-center mb-3">
                <h1 className="text-xl font-black tracking-wide uppercase flex items-center justify-center gap-3">
                    <img src="/icons/bull.png" alt="Bull" className="w-8 h-8" />
                    <span className="text-white/30">vs</span>
                    <img src="/icons/bear.png" alt="Bear" className="w-8 h-8" />
                </h1>
            </div>

            {/* Players - 3 cards */}
            <div className="flex justify-center gap-2 mb-3">
                {candidates.map((ticket, idx) => {
                    const score = scores[idx] || { bulls: 0, bears: 0, place: null }
                    const isCurrent = currentPlayer === idx && score.place === null
                    const hasPlace = score.place !== null
                    const isWinner = score.place === 1
                    const placeStyle = getPlaceStyle(score.place)

                    return (
                        <motion.div
                            key={idx}
                            className={`
                                flex flex-col items-center p-2 rounded-xl border-2 w-[105px]
                                transition-all duration-300
                                ${isWinner
                                    ? 'border-[#FFD700] bg-gradient-to-b from-[#FFD700]/20 to-transparent shadow-[0_0_30px_rgba(255,215,0,0.5)]'
                                    : hasPlace
                                        ? 'border-red-500/40 bg-red-950/20 opacity-60'
                                        : isCurrent
                                            ? 'border-white/60 bg-white/10 shadow-[0_0_25px_rgba(255,255,255,0.3)]'
                                            : 'border-zinc-700/50 bg-zinc-900/50'
                                }
                            `}
                            animate={isCurrent ? { scale: [1, 1.02, 1] } : {}}
                            transition={{ duration: 0.8, repeat: isCurrent ? Infinity : 0 }}
                        >
                            {/* Avatar with place badge */}
                            <div className="relative mb-1">
                                <img
                                    src={ticket.player.avatar || '/default-avatar.png'}
                                    alt=""
                                    className={`w-12 h-12 rounded-full border-2 object-cover ${
                                        isWinner ? 'border-[#FFD700]' :
                                        hasPlace ? 'border-red-500 grayscale' :
                                        isCurrent ? 'border-white' : 'border-zinc-600'
                                    }`}
                                />
                                {hasPlace && placeStyle && (
                                    <motion.div
                                        initial={{ scale: 0, rotate: -180 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        className={`absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${placeStyle.bg} ${placeStyle.text} ${placeStyle.glow}`}
                                    >
                                        {score.place}
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
                                        className={`w-7 h-7 rounded-md flex items-center justify-center overflow-hidden ${
                                            score.bulls > i
                                                ? 'bg-green-500/30 border border-green-400 shadow-[0_0_12px_rgba(34,197,94,0.6)]'
                                                : 'bg-zinc-800/60 border border-zinc-700/50'
                                        }`}
                                        animate={score.bulls > i ? { scale: [0.7, 1.2, 1] } : {}}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <img
                                            src="/icons/bull.png"
                                            alt=""
                                            className={`w-5 h-5 ${score.bulls > i ? '' : 'opacity-20 grayscale'}`}
                                        />
                                    </motion.div>
                                ))}
                            </div>

                            {/* Score - Bears row */}
                            <div className="flex gap-0.5">
                                {[0, 1, 2].map(i => (
                                    <motion.div
                                        key={`bear-${i}`}
                                        className={`w-7 h-7 rounded-md flex items-center justify-center overflow-hidden ${
                                            score.bears > i
                                                ? 'bg-red-500/30 border border-red-400 shadow-[0_0_12px_rgba(239,68,68,0.6)]'
                                                : 'bg-zinc-800/60 border border-zinc-700/50'
                                        }`}
                                        animate={score.bears > i ? { scale: [0.7, 1.2, 1] } : {}}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <img
                                            src="/icons/bear.png"
                                            alt=""
                                            className={`w-5 h-5 ${score.bears > i ? '' : 'opacity-20 grayscale'}`}
                                        />
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )
                })}
            </div>

            {/* Wheel Section */}
            <div className="flex-1 flex items-center justify-center relative">
                <div className="relative w-60 h-60">
                    {/* Ambient glow */}
                    <div className="absolute inset-[-40px] bg-gradient-to-r from-green-500/10 via-transparent to-red-500/10 rounded-full blur-3xl animate-pulse" />

                    {/* Wheel (static) */}
                    <img
                        src="/icons/rulet.png"
                        alt="wheel"
                        className="w-full h-full relative z-10 drop-shadow-[0_0_30px_rgba(255,215,0,0.3)]"
                    />

                    {/* Cursor (rotates around wheel) */}
                    <div
                        className="absolute inset-0 z-20 pointer-events-none"
                        style={{
                            transform: `rotate(${cursorAngle}deg)`,
                            transition: isSpinning
                                ? 'transform 2.2s cubic-bezier(0.12, 0.8, 0.2, 1)'
                                : 'none'
                        }}
                    >
                        <img
                            src="/icons/Cursor.png"
                            alt="cursor"
                            className="absolute w-9 h-9 top-[-6px] left-1/2 -translate-x-1/2 drop-shadow-[0_0_15px_rgba(255,165,0,0.9)]"
                        />
                    </div>

                    {/* Result overlay */}
                    <AnimatePresence>
                        {lastResult && !isSpinning && (
                            <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                className="absolute inset-0 flex items-center justify-center z-30"
                            >
                                <motion.div
                                    className={`
                                        w-24 h-24 rounded-full flex items-center justify-center backdrop-blur-md
                                        ${lastResult === 'bull'
                                            ? 'bg-green-500/30 shadow-[0_0_50px_rgba(34,197,94,0.9)] border-2 border-green-400/50'
                                            : 'bg-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.9)] border-2 border-red-400/50'
                                        }
                                    `}
                                    animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                                    transition={{ duration: 0.5 }}
                                >
                                    <img
                                        src={lastResult === 'bull' ? '/icons/bull.png' : '/icons/bear.png'}
                                        alt={lastResult}
                                        className="w-16 h-16 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                                    />
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* FINAL badge */}
            <div className="text-center mt-2">
                <span
                    className="text-3xl font-black tracking-[0.15em]"
                    style={{
                        background: 'linear-gradient(180deg, #FFD700 0%, #FFA500 50%, #CC8400 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        filter: 'drop-shadow(0 0 20px rgba(255,215,0,0.5))'
                    }}
                >
                    ФИНАЛ
                </span>
            </div>
        </div>
    )
}
