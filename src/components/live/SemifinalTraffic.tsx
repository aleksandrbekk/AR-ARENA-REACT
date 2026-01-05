import { motion, AnimatePresence } from 'framer-motion'
import type { Ticket } from '../../types'
import { useEffect, useState, useRef, useCallback } from 'react'

interface Prize {
    place: number
    amount?: number
    percentage?: number
}

interface SemifinalTrafficProps {
    candidates: Ticket[]
    spins: { ticket: number; hits: number }[]
    eliminated: { ticket_number: number; username?: string; place: number }[]
    prizes?: Prize[]
    jackpotAmount?: number
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
    prizes = [],
    jackpotAmount = 0,
    onComplete,
    onHit1,
    onHit2,
    onEliminated
}: SemifinalTrafficProps) {
    // Animation state
    const [currentSpinIndex, setCurrentSpinIndex] = useState(-1)
    const [hitCounts, setHitCounts] = useState<Map<number, number>>(new Map())
    const [eliminatedPlayers, setEliminatedPlayers] = useState<Map<number, { place: number; username?: string }>>(new Map())
    const [currentSpinTicket, setCurrentSpinTicket] = useState<number | null>(null)
    const [isSpinning, setIsSpinning] = useState(false)
    const animationStarted = useRef(false)

    // Roulette state
    const [rouletteOffset, setRouletteOffset] = useState(0)
    const rouletteRef = useRef<HTMLDivElement>(null)

    // Refs for cleanup
    const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])
    const isUnmountedRef = useRef(false)

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

    // Initialize hit counts
    useEffect(() => {
        const initialHits = new Map<number, number>()
        candidates.forEach(c => initialHits.set(c.ticket_number, 0))
        setHitCounts(initialHits)
    }, [candidates])

    // Generate roulette tape - repeat tickets for smooth animation
    const rouletteTape = [...candidates, ...candidates, ...candidates, ...candidates, ...candidates]
    const ticketWidth = 72 // Width of each ticket in roulette

    // Animate roulette spin to target ticket
    const spinRoulette = useCallback((targetTicket: number, onStop: () => void) => {
        setIsSpinning(true)

        // Find target index (in the middle set for smooth animation)
        const baseIndex = candidates.findIndex(c => c.ticket_number === targetTicket)
        const targetIndex = candidates.length * 2 + baseIndex // Use middle repetition
        const targetOffset = targetIndex * ticketWidth

        // Spin duration
        const spinDuration = 1500

        // Animate offset
        const startOffset = rouletteOffset
        const totalSpin = targetOffset + (candidates.length * ticketWidth * 2) // Extra rotations
        const startTime = Date.now()

        const animateRoulette = () => {
            if (isUnmountedRef.current) return

            const elapsed = Date.now() - startTime
            const progress = Math.min(elapsed / spinDuration, 1)

            // Easing - slow down at the end
            const eased = 1 - Math.pow(1 - progress, 3)
            const currentOffset = startOffset + (totalSpin - startOffset) * eased

            setRouletteOffset(currentOffset % (candidates.length * ticketWidth * 3))

            if (progress < 1) {
                requestAnimationFrame(animateRoulette)
            } else {
                setIsSpinning(false)
                onStop()
            }
        }

        requestAnimationFrame(animateRoulette)
    }, [candidates, rouletteOffset, ticketWidth])

    // Animate through spins
    useEffect(() => {
        if (animationStarted.current || spins.length === 0) return
        animationStarted.current = true

        let spinIdx = 0
        const animateNextSpin = () => {
            if (isUnmountedRef.current) return

            if (spinIdx >= spins.length) {
                setCurrentSpinTicket(null)
                safeTimeout(onComplete, 2000)
                return
            }

            const spin = spins[spinIdx]
            setCurrentSpinIndex(spinIdx)

            // Spin roulette to target
            spinRoulette(spin.ticket, () => {
                if (isUnmountedRef.current) return

                setCurrentSpinTicket(spin.ticket)

                // Update hit count
                setHitCounts(prev => {
                    const newMap = new Map(prev)
                    newMap.set(spin.ticket, spin.hits)
                    return newMap
                })

                // Check if eliminated
                if (spin.hits >= 3) {
                    const elimEntry = eliminated.find(e => e.ticket_number === spin.ticket)
                    const player = candidates.find(c => c.ticket_number === spin.ticket)
                    if (elimEntry) {
                        setEliminatedPlayers(prev => {
                            const newMap = new Map(prev)
                            newMap.set(spin.ticket, {
                                place: elimEntry.place,
                                username: player?.player.name || elimEntry.username
                            })
                            return newMap
                        })
                    }
                }

                // Haptic & sound feedback
                if (window.Telegram?.WebApp?.HapticFeedback) {
                    if (spin.hits >= 3) {
                        window.Telegram.WebApp.HapticFeedback.notificationOccurred('error')
                    } else {
                        window.Telegram.WebApp.HapticFeedback.impactOccurred('medium')
                    }
                }

                if (spin.hits === 1) onHit1?.()
                else if (spin.hits === 2) onHit2?.()
                else if (spin.hits >= 3) onEliminated?.()

                spinIdx++
                safeTimeout(animateNextSpin, 1500)
            })
        }

        safeTimeout(animateNextSpin, 1000)
    }, [spins, eliminated, candidates, onComplete, spinRoulette, safeTimeout, onHit1, onHit2, onEliminated])

    // Get prize for place
    const getPrizeForPlace = (place: number): string => {
        const prize = prizes.find(p => p.place === place)
        if (!prize) return '—'
        if (prize.amount) return `${prize.amount.toLocaleString()} AR`
        if (prize.percentage && jackpotAmount) {
            return `${Math.round(jackpotAmount * prize.percentage / 100).toLocaleString()} AR`
        }
        return '—'
    }

    // Get indicator style
    const getIndicatorStyle = (hitCount: number) => {
        if (hitCount === 0) return { bg: 'bg-zinc-700', shadow: '' }
        if (hitCount === 1) return { bg: 'bg-green-500', shadow: 'shadow-[0_0_12px_#22c55e]' }
        if (hitCount === 2) return { bg: 'bg-yellow-500', shadow: 'shadow-[0_0_12px_#eab308]' }
        return { bg: 'bg-red-500', shadow: 'shadow-[0_0_12px_#ef4444]' }
    }

    // Get eliminated player for place 4 or 5
    const getEliminatedForPlace = (place: number) => {
        for (const [ticketNum, data] of eliminatedPlayers) {
            if (data.place === place) {
                const player = candidates.find(c => c.ticket_number === ticketNum)
                return {
                    ticket: ticketNum,
                    name: player?.player.name || data.username || 'Unknown',
                    avatar: player?.player.avatar
                }
            }
        }
        return null
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] pt-[100px] pb-8 px-2 overflow-hidden">
            {/* Title */}
            <div className="text-center mb-3">
                <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-2xl font-black"
                    style={{
                        background: 'linear-gradient(90deg, #22c55e 0%, #eab308 50%, #ef4444 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}
                >
                    СВЕТОФОР
                </motion.h1>
                <p className="text-white/50 text-xs">Полуфинал • 5 → 3</p>
            </div>

            {/* Legend */}
            <div className="flex justify-center gap-3 mb-4">
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_6px_#22c55e]" />
                    <span className="text-[10px] text-white/70">1 удар</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-[0_0_6px_#eab308]" />
                    <span className="text-[10px] text-white/70">2 удара</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_6px_#ef4444]" />
                    <span className="text-[10px] text-white/70">ВЫБЫЛ</span>
                </div>
            </div>

            {/* Horizontal Roulette */}
            <div className="relative mb-6">
                {/* Cursor Arrow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
                    <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[14px] border-l-transparent border-r-transparent border-t-[#FFD700] drop-shadow-[0_0_8px_rgba(255,215,0,0.8)]" />
                </div>

                {/* Roulette Container */}
                <div className="relative overflow-hidden h-16 mt-4">
                    {/* Gradient masks */}
                    <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#0a0a0a] to-transparent z-10 pointer-events-none" />
                    <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#0a0a0a] to-transparent z-10 pointer-events-none" />

                    {/* Scrolling tape */}
                    <div
                        ref={rouletteRef}
                        className="flex items-center h-full absolute"
                        style={{
                            transform: `translateX(calc(50% - ${rouletteOffset}px - ${ticketWidth / 2}px))`,
                            transition: isSpinning ? 'none' : 'transform 0.3s ease-out'
                        }}
                    >
                        {rouletteTape.map((ticket, idx) => {
                            const isActive = currentSpinTicket === ticket.ticket_number && !isSpinning
                            return (
                                <div
                                    key={idx}
                                    className={`
                                        flex-shrink-0 w-[68px] h-12 mx-0.5 rounded-lg
                                        flex items-center justify-center
                                        font-mono font-bold text-sm
                                        transition-all duration-200
                                        ${isActive
                                            ? 'bg-[#FFD700] text-black scale-110 shadow-[0_0_20px_rgba(255,215,0,0.6)]'
                                            : 'bg-zinc-800 text-white/70 border border-zinc-700'
                                        }
                                    `}
                                >
                                    #{ticket.ticket_number}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Spin counter */}
            <div className="text-center mb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-900/80 rounded-full border border-white/10">
                    <div className={`w-2 h-2 rounded-full ${isSpinning ? 'bg-[#FFD700] animate-pulse' : 'bg-white/30'}`} />
                    <span className="text-xs text-white/70">
                        Спин {Math.min(currentSpinIndex + 1, spins.length)} / {spins.length}
                    </span>
                </div>
            </div>

            {/* Player Cards - Single Row, Adaptive */}
            <div className="flex justify-center gap-1.5 mb-6 px-1">
                {candidates.map((ticket) => {
                    const hitCount = hitCounts.get(ticket.ticket_number) || 0
                    const eliminatedData = eliminatedPlayers.get(ticket.ticket_number)
                    const isCurrentSpin = currentSpinTicket === ticket.ticket_number
                    const indicator = getIndicatorStyle(hitCount)

                    return (
                        <motion.div
                            key={ticket.ticket_number}
                            initial={{ scale: 1 }}
                            animate={{
                                scale: eliminatedData ? 0.9 : isCurrentSpin ? 1.05 : 1,
                                opacity: eliminatedData ? 0.5 : 1
                            }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            className={`
                                relative rounded-xl p-1.5 border-2 flex flex-col items-center
                                w-[calc(20%-6px)] min-w-[56px] max-w-[72px]
                                ${eliminatedData
                                    ? 'border-red-500/60 bg-red-950/40'
                                    : isCurrentSpin
                                        ? 'border-[#FFD700] bg-[#FFD700]/10 shadow-[0_0_15px_rgba(255,215,0,0.4)]'
                                        : 'border-zinc-700/80 bg-zinc-900/80'
                                }
                            `}
                        >
                            {/* Traffic Light Indicator */}
                            <div className={`w-full h-2 rounded-full mb-1.5 ${indicator.bg} ${indicator.shadow}`} />

                            {/* Avatar */}
                            <div className="relative">
                                <img
                                    src={ticket.player.avatar || '/default-avatar.png'}
                                    alt=""
                                    className={`
                                        w-10 h-10 rounded-full border-2 object-cover
                                        ${eliminatedData
                                            ? 'border-red-500/50 grayscale'
                                            : isCurrentSpin
                                                ? 'border-[#FFD700]'
                                                : 'border-white/20'
                                        }
                                    `}
                                />
                                {/* OUT badge */}
                                {eliminatedData && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded">
                                            OUT
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Name - truncated */}
                            <div className="text-[8px] text-white/70 text-center w-full truncate mt-1 px-0.5">
                                {ticket.player.name}
                            </div>
                            {/* Ticket number */}
                            <div className="text-[9px] font-bold text-[#FFD700]/80">
                                #{ticket.ticket_number}
                            </div>
                        </motion.div>
                    )
                })}
            </div>

            {/* 4th and 5th Place Cards */}
            <div className="flex justify-center gap-3 px-4">
                {[5, 4].map(place => {
                    const player = getEliminatedForPlace(place)
                    const prize = getPrizeForPlace(place)

                    return (
                        <motion.div
                            key={place}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="flex-1 max-w-[160px] bg-zinc-900/80 rounded-xl border border-zinc-700/50 p-3 text-center"
                        >
                            <div className="text-[10px] text-white/40 uppercase tracking-wider mb-2">
                                {place} место
                            </div>

                            <AnimatePresence mode="wait">
                                {player ? (
                                    <motion.div
                                        key="player"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex flex-col items-center"
                                    >
                                        <img
                                            src={player.avatar || '/default-avatar.png'}
                                            alt=""
                                            className="w-12 h-12 rounded-full border-2 border-red-500/50 object-cover mb-1.5"
                                        />
                                        <div className="text-xs text-white font-medium truncate w-full">
                                            {player.name}
                                        </div>
                                        <div className="text-[10px] text-white/50 font-mono">
                                            #{player.ticket}
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="placeholder"
                                        className="flex flex-col items-center"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-zinc-800 border-2 border-dashed border-zinc-600 flex items-center justify-center mb-1.5">
                                            <span className="text-2xl text-zinc-500">?</span>
                                        </div>
                                        <div className="text-xs text-white/30">—</div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Prize */}
                            <div className="mt-2 pt-2 border-t border-zinc-700/50">
                                <div className="text-[10px] text-white/40">Приз:</div>
                                <div className="text-sm font-bold text-[#FFD700]">
                                    {prize}
                                </div>
                            </div>
                        </motion.div>
                    )
                })}
            </div>

            {/* Finalists indicator */}
            {eliminatedPlayers.size >= 2 && !isSpinning && currentSpinIndex >= spins.length - 1 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mt-6"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-full border border-green-500/30">
                        <span className="text-green-400 font-bold text-sm">В ФИНАЛ: 3 игрока</span>
                    </div>
                </motion.div>
            )}
        </div>
    )
}
