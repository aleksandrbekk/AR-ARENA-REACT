import { motion, AnimatePresence } from 'framer-motion'
import type { Ticket } from '../../types'

interface SemifinalTrafficProps {
    players: Ticket[]
    hits: Map<number, number>
    eliminated: Map<number, number>
    rouletteOffset: number
    currentSpinTicket: number | null
    showPrizes: boolean
    // Optional: for embedding without title/legend
    embedded?: boolean
}

export function SemifinalTraffic({
    players,
    hits,
    eliminated,
    rouletteOffset,
    currentSpinTicket,
    showPrizes,
    embedded = false
}: SemifinalTrafficProps) {

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

    return (
        <div className={embedded ? '' : 'min-h-screen bg-[#0a0a0a] pt-[100px] pb-8 px-4'}>
            {/* Title with glow - only if not embedded */}
            {!embedded && (
                <>
                    <div className="text-center mb-4">
                        <motion.h1
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-2xl font-black text-[#FFD700] drop-shadow-[0_0_20px_rgba(255,215,0,0.5)]"
                        >
                            SEMIFINAL
                        </motion.h1>
                        <p className="text-white/60 text-sm">Обратный светофор</p>
                    </div>

                    {/* Legend with neon dots */}
                    <div className="flex justify-center gap-4 mb-5">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full shadow-[0_0_8px_#22c55e,0_0_16px_rgba(34,197,94,0.5)]" style={{ background: 'linear-gradient(to bottom, #4ade80, #22c55e)' }} />
                            <span className="text-xs text-white/70">1 hit</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full shadow-[0_0_8px_#eab308,0_0_16px_rgba(234,179,8,0.5)]" style={{ background: 'linear-gradient(to bottom, #fde047, #eab308)' }} />
                            <span className="text-xs text-white/70">2 hits</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full shadow-[0_0_8px_#ef4444,0_0_16px_rgba(239,68,68,0.5)]" style={{ background: 'linear-gradient(to bottom, #f87171, #ef4444)' }} />
                            <span className="text-xs text-white/70">ВЫБЫЛ</span>
                        </div>
                    </div>
                </>
            )}

            {/* Player Cards - BIGGER with min-width */}
            <div className="flex gap-3 mb-5 px-1 justify-center">
                {players.map((ticket) => {
                    const hitCount = hits.get(ticket.ticket_number) || 0
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
                            className={`relative rounded-xl p-2 border-2 flex flex-col items-center overflow-hidden w-[68px] ${
                                eliminatedPlace
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
                                className={`w-12 h-12 rounded-full border-2 mb-1.5 object-cover transition-all duration-500 ${
                                    eliminatedPlace
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

                            {/* Eliminated badge with animation - ❌ ВЫБЫЛ */}
                            <AnimatePresence>
                                {eliminatedPlace && (
                                    <motion.div
                                        initial={{ scale: 0, rotate: -15 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 12 }}
                                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
                                        data-testid="out-badge"
                                    >
                                        <div className="bg-red-600/95 backdrop-blur-sm text-white text-[11px] font-black px-2.5 py-1 rounded-lg border-2 border-red-400 shadow-[0_0_25px_rgba(239,68,68,0.9)]">
                                            ❌ ВЫБЫЛ
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

            {/* Roulette - COMPACT */}
            <div className="relative mb-5">
                {/* Cursor with OVER-THE-TOP neon glow */}
                <motion.div
                    initial={{ opacity: 0, y: -15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex justify-center mb-1 relative z-20"
                >
                    <div className="relative">
                        {/* Multi-layer glow pulse */}
                        <motion.div
                            animate={{
                                opacity: [0.4, 0.8, 0.4],
                                scale: [0.8, 1.3, 0.8]
                            }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                ease: 'easeInOut'
                            }}
                            className="absolute -inset-2 bg-[#FFD700] rounded-full blur-xl"
                        />
                        <motion.div
                            animate={{
                                opacity: [0.6, 1, 0.6],
                                scale: [0.9, 1.1, 0.9]
                            }}
                            transition={{
                                duration: 1.2,
                                repeat: Infinity,
                                ease: 'easeInOut',
                                delay: 0.2
                            }}
                            className="absolute -inset-1 bg-[#FFA500] rounded-full blur-lg"
                        />
                        <img
                            src="/icons/Cursor.png"
                            alt="cursor"
                            className="w-7 h-7 relative z-10"
                            style={{ filter: 'drop-shadow(0 0 12px #FFD700) drop-shadow(0 0 20px rgba(255,165,0,0.8))' }}
                        />
                    </div>
                </motion.div>

                {/* Pointer triangle - neon */}
                <div className="flex justify-center -mt-0.5 mb-0.5 relative z-10">
                    <div
                        className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-[#FFD700]"
                        style={{ filter: 'drop-shadow(0 0 6px #FFD700) drop-shadow(0 0 12px rgba(255,215,0,0.8))' }}
                    />
                </div>

                {/* Roulette Strip - SHORTER height */}
                <div className="relative">
                    {/* Edge fades */}
                    <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#0a0a0a] to-transparent z-10 pointer-events-none rounded-l-xl" />
                    <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#0a0a0a] to-transparent z-10 pointer-events-none rounded-r-xl" />

                    {/* Center highlight beam */}
                    <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-[90px] bg-gradient-to-r from-transparent via-[#FFD700]/15 to-transparent z-[5] pointer-events-none" />

                    <div
                        className="py-2 overflow-hidden rounded-xl"
                        style={{
                            background: 'linear-gradient(180deg, rgba(39,39,42,0.95) 0%, rgba(24,24,27,1) 50%, rgba(39,39,42,0.95) 100%)',
                            border: '2px solid rgba(255,215,0,0.35)',
                            boxShadow: 'inset 0 2px 15px rgba(0,0,0,0.6), 0 0 20px rgba(255,215,0,0.15)'
                        }}
                    >
                        <div
                            className="flex"
                            style={{
                                gap: '10px',
                                transform: `translateX(calc(50% + ${rouletteOffset}px - 40px))`,
                                transition: 'transform 4s cubic-bezier(0.12, 0.9, 0.22, 1)'
                            }}
                        >
                            {Array(10).fill(null).flatMap((_, repIdx) =>
                                players.map((t, tIdx) => {
                                    const hitCount = hits.get(t.ticket_number) || 0
                                    const isEliminated = eliminated.has(t.ticket_number)

                                    const getSlotStyle = () => {
                                        if (hitCount === 1) return {
                                            border: '2px solid #22c55e',
                                            background: 'linear-gradient(135deg, rgba(34,197,94,0.35) 0%, rgba(22,163,74,0.25) 100%)',
                                            boxShadow: '0 0 15px rgba(34,197,94,0.5), inset 0 1px 10px rgba(34,197,94,0.2)',
                                            color: '#4ade80'
                                        }
                                        if (hitCount === 2) return {
                                            border: '2px solid #eab308',
                                            background: 'linear-gradient(135deg, rgba(234,179,8,0.35) 0%, rgba(202,138,4,0.25) 100%)',
                                            boxShadow: '0 0 15px rgba(234,179,8,0.5), inset 0 1px 10px rgba(234,179,8,0.2)',
                                            color: '#facc15'
                                        }
                                        if (hitCount >= 3 || isEliminated) return {
                                            border: '2px solid #ef4444',
                                            background: 'linear-gradient(135deg, rgba(239,68,68,0.35) 0%, rgba(220,38,38,0.25) 100%)',
                                            boxShadow: '0 0 15px rgba(239,68,68,0.5), inset 0 1px 10px rgba(239,68,68,0.2)',
                                            color: '#f87171'
                                        }
                                        return {
                                            border: '2px solid rgba(255,215,0,0.25)',
                                            background: 'linear-gradient(135deg, rgba(63,63,70,0.9) 0%, rgba(39,39,42,0.95) 100%)',
                                            boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4)',
                                            color: '#e4e4e7'
                                        }
                                    }

                                    return (
                                        <div
                                            key={`${repIdx}-${tIdx}`}
                                            className="flex-shrink-0 w-[80px] h-10 rounded-lg flex items-center justify-center font-bold text-base"
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

            {/* Prize Cards - 4th & 5th place - "Burnt out" style */}
            <AnimatePresence>
                {showPrizes && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="grid grid-cols-2 gap-3 max-w-[280px] mx-auto"
                    >
                        {[5, 4].map((place, idx) => {
                            const ticketNum = [...eliminated.entries()].find(([_, p]) => p === place)?.[0]
                            const player = ticketNum ? players.find(t => t.ticket_number === ticketNum) : null

                            return (
                                <motion.div
                                    key={place}
                                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    transition={{ delay: idx * 0.15, type: 'spring', stiffness: 300 }}
                                    className="rounded-xl p-3 text-center relative overflow-hidden"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(50,50,55,0.9) 0%, rgba(30,30,35,0.95) 100%)',
                                        border: '1px solid rgba(239,68,68,0.3)',
                                        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)'
                                    }}
                                >
                                    {/* Burnt overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-900/10 to-red-950/20 pointer-events-none" />

                                    <div className="w-11 h-11 mx-auto rounded-full bg-zinc-800 border-2 border-red-500/40 flex items-center justify-center mb-2 overflow-hidden relative z-10 grayscale-[30%]">
                                        {player ? (
                                            <img src={player.player.avatar} alt="" className="w-full h-full object-cover opacity-70" />
                                        ) : (
                                            <span className="text-xl text-red-500/50">?</span>
                                        )}
                                    </div>
                                    <div className="text-sm font-bold text-red-400/90 relative z-10">{place}TH PLACE</div>
                                    {player && (
                                        <div className="text-[10px] text-white/50 mt-0.5 relative z-10 truncate">
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
