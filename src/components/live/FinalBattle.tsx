import { motion } from 'framer-motion'
import type { Ticket } from '../../types'

interface FinalBattleProps {
    players: Ticket[]
    scores: { bulls: number; bears: number; place: number | null }[]
    turnOrder: number[]
    currentFinalPlayer: number | null
    wheelAngle: number
    wheelSpinning: boolean
    lastResult: 'bull' | 'bear' | null
}

export function FinalBattle({
    players,
    scores,
    turnOrder,
    currentFinalPlayer,
    wheelAngle,
    wheelSpinning,
    lastResult
}: FinalBattleProps) {

    return (
        <div className="min-h-screen bg-[#0a0a0a] pt-[100px] pb-8 px-4">
            <div className="text-center mb-6">
                <h1 className="text-2xl font-black text-[#FFD700]">ФИНАЛ</h1>
                <p className="text-white/60 text-sm">Битва быка и медведя</p>
            </div>

            {/* Players */}
            <div className="flex justify-center items-end gap-6 mb-8">
                {players.map((ticket, idx) => {
                    const score = scores[idx]
                    const isCurrent = currentFinalPlayer === idx
                    const orderNum = turnOrder.indexOf(idx) + 1

                    return (
                        <div key={idx} className="flex flex-col items-center">
                            {/* Avatar with order badge */}
                            <div className="relative mb-2">
                                <img
                                    src={ticket.player.avatar}
                                    alt=""
                                    className={`w-20 h-20 rounded-full border-3 transition-all duration-300 ${isCurrent ? 'border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.7)] scale-110' :
                                        score?.place ? 'border-[#FFD700]' : 'border-[#FFD700]/50'
                                        }`}
                                />
                                {orderNum > 0 && (
                                    <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-[#FFD700] to-[#FFA500] text-black text-xs font-bold flex items-center justify-center border-2 border-black">
                                        {orderNum}
                                    </div>
                                )}
                            </div>

                            {/* Name / Place */}
                            <div className={`px-4 py-2 rounded-xl text-center mb-2 min-w-[90px] ${score?.place === 1 ? 'bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black font-bold shadow-[0_0_20px_rgba(255,215,0,0.6)]' :
                                score?.place === 2 ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-black font-bold' :
                                    score?.place === 3 ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white font-bold' :
                                        'bg-zinc-800 text-white'
                                }`}>
                                {score?.place ? `${score.place} МЕСТО` : ticket.player.name}
                            </div>

                            {/* Bulls & Bears Grid */}
                            <div className="space-y-1">
                                <div className="flex gap-1">
                                    {[0, 1, 2].map(i => (
                                        <div
                                            key={`bull-${i}`}
                                            className={`w-8 h-8 rounded-lg flex items-center justify-center border-2 transition-all ${(score?.bulls || 0) > i
                                                ? 'bg-gradient-to-br from-green-500 to-emerald-600 border-green-400 shadow-[0_0_10px_rgba(34,197,94,0.5)]'
                                                : 'bg-zinc-900 border-zinc-700'
                                                }`}
                                        >
                                            <img src="/icons/bull.png" alt="bull" className="w-6 h-6" />
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-1">
                                    {[0, 1, 2].map(i => (
                                        <div
                                            key={`bear-${i}`}
                                            className={`w-8 h-8 rounded-lg flex items-center justify-center border-2 transition-all ${(score?.bears || 0) > i
                                                ? 'bg-gradient-to-br from-red-500 to-red-700 border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                                                : 'bg-zinc-900 border-zinc-700'
                                                }`}
                                        >
                                            <img src="/icons/bear.png" alt="bear" className="w-6 h-6" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Wheel - cursor rotates around wheel center, wheel stays still */}
            <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
                {/* Static wheel image */}
                <img
                    src="/icons/rulet.png"
                    alt="wheel"
                    className="w-full h-full"
                />

                {/* Rotating cursor - positioned at top, rotates around wheel center */}
                <img
                    src="/icons/Cursor.png"
                    alt="cursor"
                    className={`absolute w-10 h-10 top-0 left-1/2 -ml-5 z-10 transition-transform ${wheelSpinning ? 'duration-[3s] ease-out' : ''}`}
                    style={{
                        transformOrigin: 'center 128px', // half of 256px wheel = rotate around center
                        transform: `rotate(${wheelAngle}deg)`
                    }}
                />

                {/* Result indicator */}
                {lastResult && !wheelSpinning && (
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="absolute inset-0 flex items-center justify-center"
                    >
                        <img
                            src={lastResult === 'bull' ? '/icons/bull.png' : '/icons/bear.png'}
                            alt={lastResult}
                            className={`w-20 h-20 ${lastResult === 'bull' ? 'drop-shadow-[0_0_20px_rgba(34,197,94,0.8)]' : 'drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]'}`}
                        />
                    </motion.div>
                )}
            </div>
        </div>
    )
}
