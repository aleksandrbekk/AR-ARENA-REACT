import { motion, AnimatePresence } from 'framer-motion'
import type { Ticket } from '../../types'
import { useEffect } from 'react'

interface SemifinalTrafficProps {
    candidates: Ticket[]
    eliminated: Map<number, number>
    onComplete: () => void
}

export function SemifinalTraffic({
    candidates,
    eliminated,
    onComplete
}: SemifinalTrafficProps) {
    // Internal state mock props for now effectively
    // In real Live implementation, these would drive the animation.
    // For now we just show the state.

    // Derived state for display
    const currentSpinTicket = null

    // Neon indicator styles with activator-style glow
    const getIndicatorStyle = (hitCount: number) => {
        if (hitCount === 0) return {
            background: 'linear-gradient(to right, #3f3f46, #52525b)',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)'
        }
        if (hitCount === 1) return {
            background: 'linear-gradient(to bottom, #4ade80, #22c55e, #16a34a)',
            boxShadow: '0 0 15px #22c55e, 0 0 30px rgba(34,197,94,0.6), inset 0 1px 2px rgba(255,255,255,0.4)'
        }
        if (hitCount === 2) return {
            background: 'linear-gradient(to bottom, #fde047, #eab308, #ca8a04)',
            boxShadow: '0 0 15px #eab308, 0 0 30px rgba(234,179,8,0.6), inset 0 1px 2px rgba(255,255,255,0.4)'
        }
        return {
            background: 'linear-gradient(to bottom, #f87171, #ef4444, #dc2626)',
            boxShadow: '0 0 20px #ef4444, 0 0 40px rgba(239,68,68,0.7), inset 0 1px 2px rgba(255,255,255,0.4)'
        }
    }

    // Auto-complete if static
    useEffect(() => {
        const timer = setTimeout(() => {
            // onComplete() // Disable auto-advance for now to let user see results
        }, 5000)
        return () => clearTimeout(timer)
    }, [onComplete])


    return (
        <div className="min-h-screen bg-[#0a0a0a] pt-[100px] pb-8 px-4">
            {/* Title with glow */}
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
                <p className="text-white/50 text-sm">Полуфинал</p>
            </div>

            {/* Legend with neon dots */}
            <div className="flex justify-center gap-4 mb-5">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shadow-[0_0_8px_#22c55e,0_0_16px_rgba(34,197,94,0.5)]" style={{ background: 'linear-gradient(to bottom, #4ade80, #22c55e)' }} />
                    <span className="text-xs text-white/70">1 удар</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shadow-[0_0_8px_#eab308,0_0_16px_rgba(234,179,8,0.5)]" style={{ background: 'linear-gradient(to bottom, #fde047, #eab308)' }} />
                    <span className="text-xs text-white/70">2 удара</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shadow-[0_0_8px_#ef4444,0_0_16px_rgba(239,68,68,0.5)]" style={{ background: 'linear-gradient(to bottom, #f87171, #ef4444)' }} />
                    <span className="text-xs text-white/70">ВЫБЫЛ</span>
                </div>
            </div>

            {/* Player Cards - BIGGER with min-width */}
            <div className="flex gap-3 mb-5 px-1 justify-center flex-wrap">
                {candidates.map((ticket) => {
                    const hitCount = eliminated.has(ticket.ticket_number) ? 3 : 0
                    const eliminatedPlace = eliminated.get(ticket.ticket_number)
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

                            {/* Traffic Light Indicator - thicker with spring animation */}
                            <motion.div
                                className="w-full h-2.5 rounded-full mb-2"
                                style={indicatorStyle}
                                initial={{ scaleX: 0.5, opacity: 0.5 }}
                                animate={{
                                    scaleX: 1,
                                    opacity: 1,
                                    transition: { type: 'spring', stiffness: 400, damping: 15 }
                                }}
                                key={hitCount}
                            />

                            {/* Avatar - bigger */}
                            <img
                                src={ticket.player.avatar}
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

                            {/* Eliminated badge with stylish X icon */}
                            <AnimatePresence>
                                {eliminatedPlace && (
                                    <motion.div
                                        initial={{ scale: 0, rotate: -15 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 12 }}
                                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
                                        data-testid="out-badge"
                                    >
                                        <div className="bg-gradient-to-b from-red-500 to-red-700 backdrop-blur-sm text-white text-[10px] font-black px-3 py-1.5 rounded-lg border border-red-400/50 shadow-[0_0_20px_rgba(239,68,68,0.7)] flex items-center gap-1.5">
                                            {/* Stylish X icon */}
                                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                                                <path d="M6 6l12 12M6 18L18 6" />
                                            </svg>
                                            OUT
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Place badge at bottom */}
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

        </div>
    )
}
