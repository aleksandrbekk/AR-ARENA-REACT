import { motion } from 'framer-motion'
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

    const getIndicatorClass = (hitCount: number) => {
        if (hitCount === 0) return 'bg-zinc-700'
        if (hitCount === 1) return 'bg-gradient-to-r from-green-500 to-emerald-400 shadow-[0_0_12px_#22c55e] animate-pulse'
        if (hitCount === 2) return 'bg-gradient-to-r from-yellow-500 to-amber-400 shadow-[0_0_12px_#eab308] animate-pulse'
        return 'bg-gradient-to-r from-red-500 to-red-600 shadow-[0_0_12px_#ef4444] animate-pulse'
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] pt-[100px] pb-8 px-4">
            <div className="text-center mb-4">
                <h1 className="text-2xl font-black text-[#FFD700]">ПОЛУФИНАЛ</h1>
                <p className="text-white/60 text-sm">Обратный светофор</p>
            </div>

            {/* Legend */}
            <div className="flex justify-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_6px_#22c55e]" />
                    <span className="text-xs text-white/70">1-й штраф</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_6px_#eab308]" />
                    <span className="text-xs text-white/70">2-й штраф</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_6px_#ef4444]" />
                    <span className="text-xs text-white/70">ВЫЛЕТ</span>
                </div>
            </div>

            {/* Player Cards - EQUAL WIDTH with flex: 1 like vanilla */}
            <div className="flex gap-2 mb-6 px-2">
                {players.map((ticket) => {
                    const hitCount = hits.get(ticket.ticket_number) || 0
                    const eliminatedPlace = eliminated.get(ticket.ticket_number)
                    const isCurrentSpin = currentSpinTicket === ticket.ticket_number

                    return (
                        <div
                            key={ticket.ticket_number}
                            style={{ flex: 1, minWidth: 0 }}
                            className={`rounded-xl p-1.5 border-2 transition-all duration-500 flex flex-col items-center ${eliminatedPlace ? 'border-red-500 bg-red-500/10' :
                                isCurrentSpin ? 'border-[#FFD700] bg-[#FFD700]/10 scale-105' :
                                    'border-zinc-700 bg-zinc-900/80'
                                }`}
                        >
                            {/* Traffic Light Indicator */}
                            <div className={`w-full h-1.5 rounded-full mb-1.5 transition-all duration-500 ${getIndicatorClass(hitCount)}`} />

                            <img
                                src={ticket.player.avatar}
                                alt=""
                                className={`w-10 h-10 rounded-full border-2 mb-1 object-cover ${eliminatedPlace ? 'border-red-500 grayscale' :
                                    isCurrentSpin ? 'border-[#FFD700]' : 'border-white/30'
                                    }`}
                            />
                            <div className="text-[8px] text-white/70 text-center truncate w-full leading-tight">{ticket.player.name}</div>
                            <div className="text-[10px] font-bold text-[#FFD700] text-center">#{ticket.ticket_number}</div>

                            {eliminatedPlace && (
                                <div className="text-[8px] font-bold text-red-400 text-center mt-0.5 bg-red-500/20 rounded py-0.5 w-full">
                                    {eliminatedPlace} МЕСТО
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Roulette */}
            <div className="relative mb-6">
                {/* Cursor - ABOVE the strip with smooth animation */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex justify-center mb-2"
                >
                    <img src="/icons/Cursor.png" alt="cursor" className="w-8 h-8 drop-shadow-[0_0_15px_rgba(255,215,0,0.8)]" />
                </motion.div>

                {/* Roulette Strip Container */}
                <div className="bg-zinc-900/90 border-2 border-[#FFD700]/30 rounded-2xl py-3 overflow-hidden">
                    <div
                        className="flex"
                        style={{
                            gap: '12px',
                            transform: `translateX(calc(50% + ${rouletteOffset}px - 50px))`,
                            transition: 'transform 4s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                        }}
                    >
                        {Array(10).fill(null).flatMap((_, repIdx) =>
                            players.map((t, tIdx) => {
                                const hitCount = hits.get(t.ticket_number) || 0
                                const hitClass = hitCount === 1 ? 'border-green-500 bg-green-500/20 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.5)]' :
                                    hitCount === 2 ? 'border-yellow-500 bg-yellow-500/20 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.5)]' :
                                        hitCount === 3 ? 'border-red-500 bg-red-500/20 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.5)]' :
                                            'border-[#FFD700]/30 bg-zinc-800/50 text-white'

                                return (
                                    <div
                                        key={`${repIdx}-${tIdx}`}
                                        className={`flex-shrink-0 w-[100px] h-14 rounded-xl border-2 flex items-center justify-center font-bold text-lg transition-all ${hitClass}`}
                                    >
                                        #{t.ticket_number}
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Prize Cards */}
            {showPrizes && (
                <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
                    {[5, 4].map(place => {
                        const ticketNum = [...eliminated.entries()].find(([_, p]) => p === place)?.[0]
                        const player = ticketNum ? players.find(t => t.ticket_number === ticketNum) : null

                        return (
                            <div key={place} className="bg-zinc-900 rounded-xl p-4 border border-[#FFD700]/30 text-center">
                                <div className="w-14 h-14 mx-auto rounded-full bg-zinc-800 border-2 border-[#FFD700]/50 flex items-center justify-center mb-2 overflow-hidden">
                                    {player ? (
                                        <img src={player.player.avatar} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-2xl text-[#FFD700]">?</span>
                                    )}
                                </div>
                                <div className="text-lg font-bold text-white">{place} МЕСТО</div>
                                {player && <div className="text-xs text-[#FFD700] mt-1">{player.player.name}</div>}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
