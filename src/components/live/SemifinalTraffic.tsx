import { motion, AnimatePresence } from 'framer-motion'
import type { Ticket } from '../../types'
import { useEffect, useState, useRef } from 'react'

interface SemifinalTrafficProps {
    candidates: Ticket[]
    spins: { ticket: number; hits: number }[]
    eliminated: { ticket_number: number; place: number }[]
    onComplete: () => void
    // Sound callbacks
    onHit1?: () => void  // First hit (green)
    onHit2?: () => void  // Second hit (yellow)
    onEliminated?: () => void  // Third hit (red)
}

export function SemifinalTraffic({
    candidates,
    spins,
    eliminated,
    onComplete,
    onHit1,
    onHit2,
    onEliminated
}: SemifinalTrafficProps) {
    // Animation state
    const [currentSpinIndex, setCurrentSpinIndex] = useState(-1)
    const [hitCounts, setHitCounts] = useState<Map<number, number>>(new Map())
    const [eliminatedPlayers, setEliminatedPlayers] = useState<Map<number, number>>(new Map())
    const [currentSpinTicket, setCurrentSpinTicket] = useState<number | null>(null)
    const [isAnimating, setIsAnimating] = useState(false)
    const animationStarted = useRef(false)

    // Initialize hit counts
    useEffect(() => {
        const initialHits = new Map<number, number>()
        candidates.forEach(c => initialHits.set(c.ticket_number, 0))
        setHitCounts(initialHits)
    }, [candidates])

    // Animate through spins
    useEffect(() => {
        if (animationStarted.current || spins.length === 0) return
        animationStarted.current = true
        setIsAnimating(true)

        let spinIdx = 0
        const animateNextSpin = () => {
            if (spinIdx >= spins.length) {
                setIsAnimating(false)
                setCurrentSpinTicket(null)
                // All spins done, wait then complete
                setTimeout(onComplete, 2000)
                return
            }

            const spin = spins[spinIdx]
            setCurrentSpinTicket(spin.ticket)
            setCurrentSpinIndex(spinIdx)

            // After showing which player was hit, update their count
            setTimeout(() => {
                setHitCounts(prev => {
                    const newMap = new Map(prev)
                    newMap.set(spin.ticket, spin.hits)
                    return newMap
                })

                // Check if this player is now eliminated
                if (spin.hits >= 3) {
                    const elimEntry = eliminated.find(e => e.ticket_number === spin.ticket)
                    if (elimEntry) {
                        setEliminatedPlayers(prev => {
                            const newMap = new Map(prev)
                            newMap.set(spin.ticket, elimEntry.place)
                            return newMap
                        })
                    }
                }

                // Haptic feedback
                if (window.Telegram?.WebApp?.HapticFeedback) {
                    if (spin.hits >= 3) {
                        window.Telegram.WebApp.HapticFeedback.notificationOccurred('error')
                    } else {
                        window.Telegram.WebApp.HapticFeedback.impactOccurred('medium')
                    }
                }

                // Sound feedback
                if (spin.hits === 1) {
                    onHit1?.()
                } else if (spin.hits === 2) {
                    onHit2?.()
                } else if (spin.hits >= 3) {
                    onEliminated?.()
                }

                spinIdx++
                // Next spin after delay
                setTimeout(animateNextSpin, 1200)
            }, 800)
        }

        // Start animation after short delay
        setTimeout(animateNextSpin, 1000)
    }, [spins, eliminated, onComplete])

    // Neon indicator styles
    const getIndicatorStyle = (hitCount: number) => {
        if (hitCount === 0) return {
            background: 'linear-gradient(to right, #3f3f46, #52525b)',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)'
        }
        if (hitCount === 1) return {
            background: 'linear-gradient(to bottom, #4ade80, #22c55e, #16a34a)',
            boxShadow: '0 0 15px #22c55e, 0 0 30px rgba(34,197,94,0.6)'
        }
        if (hitCount === 2) return {
            background: 'linear-gradient(to bottom, #fde047, #eab308, #ca8a04)',
            boxShadow: '0 0 15px #eab308, 0 0 30px rgba(234,179,8,0.6)'
        }
        return {
            background: 'linear-gradient(to bottom, #f87171, #ef4444, #dc2626)',
            boxShadow: '0 0 20px #ef4444, 0 0 40px rgba(239,68,68,0.7)'
        }
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] pt-[100px] pb-8 px-4">
            {/* Title */}
            <div className="text-center mb-4">
                <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-3xl font-black"
                    style={{
                        background: 'linear-gradient(90deg, #22c55e 0%, #eab308 50%, #ef4444 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        filter: 'drop-shadow(0 0 20px rgba(234,179,8,0.5))'
                    }}
                >
                    СВЕТОФОР
                </motion.h1>
                <p className="text-white/50 text-sm">Полуфинал • 5 → 3</p>
            </div>

            {/* Legend */}
            <div className="flex justify-center gap-4 mb-5">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: 'linear-gradient(to bottom, #4ade80, #22c55e)', boxShadow: '0 0 8px #22c55e' }} />
                    <span className="text-xs text-white/70">1 удар</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: 'linear-gradient(to bottom, #fde047, #eab308)', boxShadow: '0 0 8px #eab308' }} />
                    <span className="text-xs text-white/70">2 удара</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: 'linear-gradient(to bottom, #f87171, #ef4444)', boxShadow: '0 0 8px #ef4444' }} />
                    <span className="text-xs text-white/70">ВЫБЫЛ</span>
                </div>
            </div>

            {/* Spin counter */}
            {isAnimating && (
                <div className="text-center mb-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900/80 rounded-full border border-white/10">
                        <div className="w-2 h-2 rounded-full bg-[#FFD700] animate-pulse" />
                        <span className="text-sm text-white/70">
                            Спин {currentSpinIndex + 1} / {spins.length}
                        </span>
                    </div>
                </div>
            )}

            {/* Player Cards */}
            <div className="flex gap-3 mb-5 px-1 justify-center flex-wrap">
                {candidates.map((ticket) => {
                    const hitCount = hitCounts.get(ticket.ticket_number) || 0
                    const eliminatedPlace = eliminatedPlayers.get(ticket.ticket_number)
                    const isCurrentSpin = currentSpinTicket === ticket.ticket_number
                    const indicatorStyle = getIndicatorStyle(hitCount)

                    return (
                        <motion.div
                            key={ticket.ticket_number}
                            initial={{ scale: 1 }}
                            animate={{
                                scale: eliminatedPlace ? 0.85 : isCurrentSpin ? 1.08 : 1,
                                opacity: eliminatedPlace ? 0.6 : 1
                            }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            className={`relative rounded-xl p-2 border-2 flex flex-col items-center overflow-hidden w-[68px] ${eliminatedPlace
                                    ? 'border-red-500/80 bg-red-950/50'
                                    : isCurrentSpin
                                        ? 'border-[#FFD700] bg-[#FFD700]/15 shadow-[0_0_25px_rgba(255,215,0,0.4)]'
                                        : 'border-zinc-700 bg-zinc-900/90'
                                }`}
                        >
                            {/* Red overlay for eliminated */}
                            <AnimatePresence>
                                {eliminatedPlace && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="absolute inset-0 bg-gradient-to-b from-red-500/30 to-red-900/40 pointer-events-none"
                                    />
                                )}
                            </AnimatePresence>

                            {/* Traffic Light Indicator */}
                            <motion.div
                                className="w-full h-2.5 rounded-full mb-2"
                                style={indicatorStyle}
                                key={hitCount}
                                initial={{ scale: 0.8 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                            />

                            {/* Avatar */}
                            <img
                                src={ticket.player.avatar || '/default-avatar.png'}
                                alt=""
                                className={`w-12 h-12 rounded-full border-2 mb-1.5 object-cover transition-all duration-500 ${eliminatedPlace
                                        ? 'border-red-500 grayscale opacity-50'
                                        : isCurrentSpin
                                            ? 'border-[#FFD700] shadow-[0_0_20px_rgba(255,215,0,0.6)]'
                                            : 'border-white/30'
                                    }`}
                            />
                            <div className="text-[9px] text-white/80 text-center truncate w-full leading-tight relative z-10 font-medium">
                                {ticket.player.name}
                            </div>
                            <div className="text-[11px] font-bold text-[#FFD700] text-center relative z-10">
                                #{ticket.ticket_number}
                            </div>

                            {/* Eliminated badge */}
                            <AnimatePresence>
                                {eliminatedPlace && (
                                    <motion.div
                                        initial={{ scale: 0, rotate: -15 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 12 }}
                                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
                                    >
                                        <div className="bg-gradient-to-b from-red-500 to-red-700 text-white text-[10px] font-black px-3 py-1.5 rounded-lg border border-red-400/50 shadow-[0_0_20px_rgba(239,68,68,0.7)] flex items-center gap-1.5">
                                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                                                <path d="M6 6l12 12M6 18L18 6" />
                                            </svg>
                                            OUT
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Place badge */}
                            {eliminatedPlace && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-[9px] font-bold text-red-400 text-center mt-1 bg-red-500/40 rounded py-0.5 w-full relative z-10 border border-red-500/60"
                                >
                                    {eliminatedPlace}TH
                                </motion.div>
                            )}
                        </motion.div>
                    )
                })}
            </div>

            {/* Finalists indicator */}
            {!isAnimating && eliminatedPlayers.size >= 2 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mt-6"
                >
                    <div className="inline-flex items-center gap-2 px-6 py-3 bg-green-500/20 rounded-full border border-green-500/30">
                        <span className="text-green-400 font-bold">В ФИНАЛ ПРОХОДЯТ:</span>
                        <span className="text-white font-mono">
                            {candidates.filter(c => !eliminatedPlayers.has(c.ticket_number)).length} игрока
                        </span>
                    </div>
                </motion.div>
            )}
        </div>
    )
}
