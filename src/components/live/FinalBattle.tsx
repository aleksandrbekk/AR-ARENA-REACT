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
    const [wheelRotation, setWheelRotation] = useState(0)
    const [isSpinning, setIsSpinning] = useState(false)
    const [showResult, setShowResult] = useState<'bull' | 'bear' | null>(null)

    const animationStarted = useRef(false)
    const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])
    const isUnmountedRef = useRef(false)
    const totalRotationRef = useRef(0)

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

    // WHEEL LOGIC:
    // Cursor is FIXED at top, WHEEL rotates
    // Looking at rulet.png from cursor POV (cursor at top looking down):
    // - When wheel rotation = 0°, cursor sees the TOP of wheel (boundary)
    // - When wheel rotates +90° clockwise, the LEFT side moves to top → cursor sees BULL
    // - When wheel rotates -90° (or +270°), RIGHT side moves to top → cursor sees BEAR
    //
    // So for cursor to point at BULL: rotate wheel so LEFT side (bull) is at top = +90° from current
    // For cursor to point at BEAR: rotate wheel so RIGHT side (bear) is at top = -90° (or +270°)
    //
    // Simpler: we'll use counter-clockwise rotation
    // - BULL zone: wheel angles where left side (green) is at cursor = 45° to 135°
    // - BEAR zone: wheel angles where right side (red) is at cursor = 225° to 315°

    const getTargetRotation = (result: 'bull' | 'bear'): number => {
        // Random position within the zone (±40° from center)
        const variance = (Math.random() - 0.5) * 80

        if (result === 'bull') {
            // Bull zone: wheel rotated so green/left side faces cursor
            // Center at 90°, range 50° to 130°
            return 90 + variance
        } else {
            // Bear zone: wheel rotated so red/right side faces cursor
            // Center at 270°, range 230° to 310°
            return 270 + variance
        }
    }

    useEffect(() => {
        if (animationStarted.current || turns.length === 0 || scores.length === 0) return
        animationStarted.current = true

        let turnIdx = 0

        const animateNextTurn = () => {
            if (isUnmountedRef.current) return

            if (turnIdx >= turns.length) {
                setCurrentPlayer(null)
                setShowResult(null)
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
            setShowResult(null)
            setIsSpinning(true)

            // Calculate target rotation
            const targetInZone = getTargetRotation(turn.result)

            // Add 4-6 full rotations (1440-2160°) plus the target position
            const fullSpins = 1440 + Math.random() * 720
            const newRotation = totalRotationRef.current + fullSpins + targetInZone

            // Normalize to ensure we land in correct zone
            const finalPosition = newRotation % 360

            // Verify zone (safety check)
            const inBullZone = finalPosition >= 45 && finalPosition <= 135
            const inBearZone = finalPosition >= 225 && finalPosition <= 315

            // If somehow outside zones, adjust (shouldn't happen but safety first)
            let adjustedRotation = newRotation
            if (turn.result === 'bull' && !inBullZone) {
                adjustedRotation = totalRotationRef.current + fullSpins + 90
            } else if (turn.result === 'bear' && !inBearZone) {
                adjustedRotation = totalRotationRef.current + fullSpins + 270
            }

            totalRotationRef.current = adjustedRotation
            setWheelRotation(adjustedRotation)

            onWheelSpin?.()

            if (window.Telegram?.WebApp?.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.impactOccurred('medium')
            }

            // After spin completes (3s animation)
            safeTimeout(() => {
                if (isUnmountedRef.current) return

                setIsSpinning(false)
                setShowResult(turn.result)

                // Update scores
                setScores(prev => {
                    const newScores = [...prev]
                    if (turn.result === 'bull') {
                        newScores[turn.player].bulls++
                    } else {
                        newScores[turn.player].bears++
                    }

                    // Check for elimination/win
                    if (newScores[turn.player].bulls >= 3 || newScores[turn.player].bears >= 3) {
                        const winnerEntry = winners.find(w =>
                            w.ticket === candidates[turn.player].ticket_number
                        )
                        if (winnerEntry) {
                            newScores[turn.player].place = winnerEntry.place
                        }

                        if (newScores[turn.player].bulls >= 3 && winnerEntry?.place === 1) {
                            confetti({
                                particleCount: 100,
                                spread: 70,
                                origin: { y: 0.3 },
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
            }, 3000)
        }

        safeTimeout(animateNextTurn, 800)
    }, [turns, scores.length, candidates, winners, onComplete, safeTimeout, onWheelSpin, onBull, onBear, onWin])

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
            {/* Header area with safe padding */}
            <div className="pt-[100px] pb-4 px-4">
                {/* Title */}
                <div className="text-center mb-4">
                    <h1 className="text-2xl font-black uppercase flex items-center justify-center gap-3">
                        <span className="text-green-400">🐂</span>
                        <span className="text-white/90">ФИНАЛ</span>
                        <span className="text-red-400">🐻</span>
                    </h1>
                    <div className="mt-2 text-sm text-white/50">
                        Ход {Math.max(1, currentTurnIndex + 1)} из {turns.length}
                    </div>
                </div>

                {/* Players */}
                <div className="flex justify-center gap-2">
                    {candidates.map((ticket, idx) => {
                        const score = scores[idx] || { bulls: 0, bears: 0, place: null }
                        const isCurrent = currentPlayer === idx
                        const hasPlace = score.place !== null
                        const isWinner = hasPlace && score.bulls >= 3
                        const isLoser = hasPlace && score.bears >= 3

                        return (
                            <motion.div
                                key={idx}
                                className={`
                                    relative flex flex-col items-center p-2 rounded-xl border-2
                                    ${isWinner ? 'border-[#FFD700] bg-[#FFD700]/10' :
                                      isLoser ? 'border-red-500/40 bg-red-900/20 opacity-50' :
                                      isCurrent ? 'border-green-500 bg-green-900/20' :
                                      'border-zinc-700/50 bg-zinc-900/30'}
                                `}
                                animate={isCurrent && !hasPlace ? {
                                    boxShadow: ['0 0 0px rgba(34,197,94,0)', '0 0 20px rgba(34,197,94,0.5)', '0 0 0px rgba(34,197,94,0)']
                                } : {}}
                                transition={{ duration: 1.5, repeat: Infinity }}
                            >
                                {/* Avatar */}
                                <div className="relative">
                                    <img
                                        src={ticket.player.avatar || '/default-avatar.png'}
                                        alt=""
                                        className={`w-12 h-12 rounded-full object-cover border-2 ${
                                            isWinner ? 'border-[#FFD700]' :
                                            isLoser ? 'border-red-500 grayscale' :
                                            isCurrent ? 'border-green-500' :
                                            'border-zinc-600'
                                        }`}
                                    />
                                    {hasPlace && (
                                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                                            score.place === 1 ? 'bg-[#FFD700] text-black' :
                                            score.place === 2 ? 'bg-gray-400 text-black' :
                                            'bg-red-600 text-white'
                                        }`}>
                                            {score.place}
                                        </div>
                                    )}
                                </div>

                                {/* Name */}
                                <div className="text-[10px] text-white/70 truncate w-16 text-center mt-1">
                                    {ticket.player.name?.slice(0, 8) || 'Player'}
                                </div>

                                {/* Score indicators */}
                                <div className="flex gap-0.5 mt-1.5">
                                    {[0, 1, 2].map(i => (
                                        <div
                                            key={`b-${i}`}
                                            className={`w-4 h-4 rounded text-[8px] flex items-center justify-center ${
                                                score.bulls > i ? 'bg-green-500' : 'bg-zinc-800'
                                            }`}
                                        >
                                            🐂
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-0.5 mt-0.5">
                                    {[0, 1, 2].map(i => (
                                        <div
                                            key={`r-${i}`}
                                            className={`w-4 h-4 rounded text-[8px] flex items-center justify-center ${
                                                score.bears > i ? 'bg-red-500' : 'bg-zinc-800'
                                            }`}
                                        >
                                            🐻
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            </div>

            {/* Wheel section - centered in remaining space */}
            <div className="flex-1 flex flex-col items-center justify-center px-4 -mt-4">
                <div className="relative">
                    {/* Glow effect */}
                    <div className="absolute inset-0 scale-110">
                        <div className="absolute inset-0 bg-gradient-to-r from-green-500/30 to-red-500/30 rounded-full blur-3xl" />
                    </div>

                    {/* Fixed cursor at top */}
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-30">
                        <img
                            src="/icons/Cursor.png"
                            alt=""
                            className="w-12 h-12 drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]"
                        />
                    </div>

                    {/* Spinning wheel */}
                    <motion.div
                        className="w-56 h-56 relative z-10"
                        style={{
                            transform: `rotate(${wheelRotation}deg)`,
                            transition: isSpinning
                                ? 'transform 3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                                : 'none'
                        }}
                    >
                        <img
                            src="/icons/rulet.png"
                            alt="wheel"
                            className="w-full h-full"
                        />
                    </motion.div>

                    {/* Result overlay */}
                    <AnimatePresence>
                        {showResult && !isSpinning && (
                            <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                className="absolute inset-0 flex items-center justify-center z-20"
                            >
                                <div className={`
                                    w-20 h-20 rounded-full flex items-center justify-center backdrop-blur-sm
                                    ${showResult === 'bull'
                                        ? 'bg-green-500/50 shadow-[0_0_40px_rgba(34,197,94,0.8)]'
                                        : 'bg-red-500/50 shadow-[0_0_40px_rgba(239,68,68,0.8)]'
                                    }
                                `}>
                                    <span className="text-5xl">
                                        {showResult === 'bull' ? '🐂' : '🐻'}
                                    </span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Legend */}
                <div className="flex gap-6 mt-6 text-xs">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="text-white/60">3 быка = 1 место</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span className="text-white/60">3 медведя = 3 место</span>
                    </div>
                </div>
            </div>

            {/* Bottom padding */}
            <div className="h-8" />
        </div>
    )
}
