import { motion, AnimatePresence } from 'framer-motion'
import type { Ticket } from '../../types'

interface SemifinalTrafficProps {
    players: Ticket[]
    hits: Map<number, number>
    eliminated: Map<number, number>
    rouletteOffset: number
    currentSpinTicket: number | null
    showPrizes: boolean
}

export function SemifinalTraffic({
    players,
    hits,
    eliminated,
    rouletteOffset,
    currentSpinTicket,
    showPrizes
}: SemifinalTrafficProps) {

    // Neon indicator styles with enhanced glow
    const getIndicatorStyle = (hitCount: number) => {
        if (hitCount === 0) return {
            background: 'linear-gradient(to right, #3f3f46, #52525b)',
            boxShadow: 'none'
        }
        if (hitCount === 1) return {
            background: 'linear-gradient(to right, #22c55e, #10b981)',
            boxShadow: '0 0 20px #22c55e, 0 0 40px rgba(34, 197, 94, 0.5), inset 0 0 10px rgba(255,255,255,0.3)'
        }
        if (hitCount === 2) return {
            background: 'linear-gradient(to right, #eab308, #f59e0b)',
            boxShadow: '0 0 20px #eab308, 0 0 40px rgba(234, 179, 8, 0.5), inset 0 0 10px rgba(255,255,255,0.3)'
        }
        return {
            background: 'linear-gradient(to right, #ef4444, #dc2626)',
            boxShadow: '0 0 25px #ef4444, 0 0 50px rgba(239, 68, 68, 0.6), inset 0 0 10px rgba(255,255,255,0.3)'
        }
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] pt-[100px] pb-8 px-4">
            {/* Title with glow */}
            <div className="text-center mb-4">
                <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-2xl font-black text-[#FFD700] drop-shadow-[0_0_20px_rgba(255,215,0,0.5)]"
                >
                    ПОЛУФИНАЛ
                </motion.h1>
                <p className="text-white/60 text-sm">Обратный светофор</p>
            </div>

            {/* Legend with neon dots */}
            <div className="flex justify-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e,0_0_20px_rgba(34,197,94,0.5)]" />
                    <span className="text-xs text-white/70">1-й штраф</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_10px_#eab308,0_0_20px_rgba(234,179,8,0.5)]" />
                    <span className="text-xs text-white/70">2-й штраф</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_#ef4444,0_0_20px_rgba(239,68,68,0.5)]" />
                    <span className="text-xs text-white/70">ВЫЛЕТ</span>
                </div>
            </div>

            {/* Player Cards */}
            <div className="flex gap-2 mb-6 px-2">
                {players.map((ticket) => {
                    const hitCount = hits.get(ticket.ticket_number) || 0
                    const eliminatedPlace = eliminated.get(ticket.ticket_number)
                    const isCurrentSpin = currentSpinTicket === ticket.ticket_number
                    const indicatorStyle = getIndicatorStyle(hitCount)

                    return (
                        <motion.div
                            key={ticket.ticket_number}
                            style={{ flex: 1, minWidth: 0 }}
                            initial={{ scale: 1 }}
                            animate={{
                                scale: eliminatedPlace ? 0.9 : isCurrentSpin ? 1.05 : 1,
                                opacity: eliminatedPlace ? 0.7 : 1
                            }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            className={`relative rounded-xl p-1.5 border-2 flex flex-col items-center overflow-hidden ${
                                eliminatedPlace
                                    ? 'border-red-500/80 bg-red-950/40'
                                    : isCurrentSpin
                                        ? 'border-[#FFD700] bg-[#FFD700]/10'
                                        : 'border-zinc-700 bg-zinc-900/80'
                            }`}
                        >
                            {/* Red overlay for eliminated */}
                            <AnimatePresence>
                                {eliminatedPlace && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="absolute inset-0 bg-gradient-to-b from-red-500/20 to-red-900/30 pointer-events-none"
                                    />
                                )}
                            </AnimatePresence>

                            {/* Traffic Light Indicator with spring animation */}
                            <motion.div
                                className="w-full h-2 rounded-full mb-1.5"
                                style={indicatorStyle}
                                initial={{ scaleX: 0 }}
                                animate={{
                                    scaleX: 1,
                                    transition: { type: 'spring', stiffness: 400, damping: 15 }
                                }}
                                key={hitCount} // re-trigger animation on hit change
                            />

                            <img
                                src={ticket.player.avatar}
                                alt=""
                                className={`w-10 h-10 rounded-full border-2 mb-1 object-cover transition-all duration-500 ${
                                    eliminatedPlace
                                        ? 'border-red-500 grayscale opacity-60'
                                        : isCurrentSpin
                                            ? 'border-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.5)]'
                                            : 'border-white/30'
                                }`}
                            />
                            <div className="text-[8px] text-white/70 text-center truncate w-full leading-tight relative z-10">
                                {ticket.player.name}
                            </div>
                            <div className="text-[10px] font-bold text-[#FFD700] text-center relative z-10">
                                #{ticket.ticket_number}
                            </div>

                            {/* Eliminated badge with animation */}
                            <AnimatePresence>
                                {eliminatedPlace && (
                                    <motion.div
                                        initial={{ scale: 0, rotate: -10 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
                                    >
                                        <div className="bg-red-600/90 backdrop-blur-sm text-white text-[10px] font-black px-2 py-1 rounded-lg border border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.8)]">
                                            ❌ OUT
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Place badge at bottom */}
                            {eliminatedPlace && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-[8px] font-bold text-red-400 text-center mt-0.5 bg-red-500/30 rounded py-0.5 w-full relative z-10 border border-red-500/50"
                                >
                                    {eliminatedPlace} МЕСТО
                                </motion.div>
                            )}
                        </motion.div>
                    )
                })}
            </div>

            {/* Roulette */}
            <div className="relative mb-6">
                {/* Cursor with enhanced glow */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex justify-center mb-2 relative z-20"
                >
                    <div className="relative">
                        {/* Cursor glow pulse */}
                        <motion.div
                            animate={{
                                opacity: [0.5, 1, 0.5],
                                scale: [1, 1.2, 1]
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: 'easeInOut'
                            }}
                            className="absolute inset-0 bg-[#FFD700] rounded-full blur-xl opacity-50"
                        />
                        <img
                            src="/icons/Cursor.png"
                            alt="cursor"
                            className="w-8 h-8 relative z-10 drop-shadow-[0_0_20px_rgba(255,215,0,1)]"
                        />
                    </div>
                </motion.div>

                {/* Pointer triangle */}
                <div className="flex justify-center -mt-1 mb-1 relative z-10">
                    <div
                        className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-[#FFD700]"
                        style={{ filter: 'drop-shadow(0 0 8px rgba(255,215,0,0.8))' }}
                    />
                </div>

                {/* Roulette Strip Container with gradient overlay */}
                <div className="relative">
                    {/* Left fade gradient */}
                    <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#0a0a0a] to-transparent z-10 pointer-events-none rounded-l-2xl" />
                    {/* Right fade gradient */}
                    <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#0a0a0a] to-transparent z-10 pointer-events-none rounded-r-2xl" />

                    {/* Center highlight */}
                    <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-[110px] bg-gradient-to-r from-transparent via-[#FFD700]/10 to-transparent z-[5] pointer-events-none" />

                    <div
                        className="py-3 overflow-hidden rounded-2xl"
                        style={{
                            background: 'linear-gradient(180deg, rgba(39,39,42,0.9) 0%, rgba(24,24,27,0.95) 50%, rgba(39,39,42,0.9) 100%)',
                            border: '2px solid rgba(255,215,0,0.3)',
                            boxShadow: 'inset 0 2px 20px rgba(0,0,0,0.5), 0 0 30px rgba(255,215,0,0.1)'
                        }}
                    >
                        <div
                            className="flex"
                            style={{
                                gap: '12px',
                                transform: `translateX(calc(50% + ${rouletteOffset}px - 50px))`,
                                transition: 'transform 4s cubic-bezier(0.15, 0.85, 0.25, 1)'
                            }}
                        >
                            {Array(10).fill(null).flatMap((_, repIdx) =>
                                players.map((t, tIdx) => {
                                    const hitCount = hits.get(t.ticket_number) || 0
                                    const isEliminated = eliminated.has(t.ticket_number)

                                    const getSlotStyle = () => {
                                        if (hitCount === 1) return {
                                            border: '2px solid #22c55e',
                                            background: 'linear-gradient(135deg, rgba(34,197,94,0.3) 0%, rgba(16,185,129,0.2) 100%)',
                                            boxShadow: '0 0 20px rgba(34,197,94,0.5), inset 0 0 15px rgba(34,197,94,0.2)',
                                            color: '#4ade80'
                                        }
                                        if (hitCount === 2) return {
                                            border: '2px solid #eab308',
                                            background: 'linear-gradient(135deg, rgba(234,179,8,0.3) 0%, rgba(245,158,11,0.2) 100%)',
                                            boxShadow: '0 0 20px rgba(234,179,8,0.5), inset 0 0 15px rgba(234,179,8,0.2)',
                                            color: '#facc15'
                                        }
                                        if (hitCount >= 3 || isEliminated) return {
                                            border: '2px solid #ef4444',
                                            background: 'linear-gradient(135deg, rgba(239,68,68,0.3) 0%, rgba(220,38,38,0.2) 100%)',
                                            boxShadow: '0 0 20px rgba(239,68,68,0.5), inset 0 0 15px rgba(239,68,68,0.2)',
                                            color: '#f87171'
                                        }
                                        return {
                                            border: '2px solid rgba(255,215,0,0.3)',
                                            background: 'linear-gradient(135deg, rgba(63,63,70,0.8) 0%, rgba(39,39,42,0.9) 100%)',
                                            boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.3)',
                                            color: '#ffffff'
                                        }
                                    }

                                    return (
                                        <div
                                            key={`${repIdx}-${tIdx}`}
                                            className="flex-shrink-0 w-[100px] h-14 rounded-xl flex items-center justify-center font-bold text-lg"
                                            style={getSlotStyle()}
                                        >
                                            #{t.ticket_number}
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Prize Cards */}
            <AnimatePresence>
                {showPrizes && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 30 }}
                        className="grid grid-cols-2 gap-4 max-w-xs mx-auto"
                    >
                        {[5, 4].map((place, idx) => {
                            const ticketNum = [...eliminated.entries()].find(([_, p]) => p === place)?.[0]
                            const player = ticketNum ? players.find(t => t.ticket_number === ticketNum) : null

                            return (
                                <motion.div
                                    key={place}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.2, type: 'spring', stiffness: 300 }}
                                    className="rounded-xl p-4 text-center"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(39,39,42,0.9) 0%, rgba(24,24,27,0.95) 100%)',
                                        border: '1px solid rgba(255,215,0,0.3)',
                                        boxShadow: '0 0 20px rgba(255,215,0,0.1)'
                                    }}
                                >
                                    <div className="w-14 h-14 mx-auto rounded-full bg-zinc-800 border-2 border-[#FFD700]/50 flex items-center justify-center mb-2 overflow-hidden shadow-[0_0_15px_rgba(255,215,0,0.2)]">
                                        {player ? (
                                            <img src={player.player.avatar} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-2xl text-[#FFD700]">?</span>
                                        )}
                                    </div>
                                    <div className="text-lg font-bold text-white">{place} МЕСТО</div>
                                    {player && (
                                        <div className="text-xs text-[#FFD700] mt-1 drop-shadow-[0_0_5px_rgba(255,215,0,0.5)]">
                                            {player.player.name}
                                        </div>
                                    )}
                                </motion.div>
                            )
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
