import { SqueezeCard } from './SqueezeCard'
import type { Ticket } from '../../types'


interface Tour2SqueezeProps {
    candidates: Ticket[]
    results: Map<number, 'green' | 'red'>
    onReveal?: (idx: number) => void
    onDragProgress?: (progress: number) => void
}

export function Tour2Squeeze({ candidates, results, onReveal, onDragProgress }: Tour2SqueezeProps) {

    return (
        <div className="min-h-screen bg-[#0a0a0a] pt-[100px] pb-8 px-4">
            <div className="text-center mb-6">
                <h1 className="text-2xl font-black text-[#FFD700]">ЛИКВИДАЦИЯ</h1>
                <p className="text-white/60 text-sm mt-2">20 → 5 призёров</p>
                <div className="flex justify-center gap-6 mt-3">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
                        <span className="text-xs text-white/70">Проходит</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
                        <span className="text-xs text-white/70">Выбывает</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-w-lg mx-auto">
                {candidates.map((ticket, idx) => {
                    const result = results.get(idx)
                    const isRevealed = results.has(idx)

                    return (
                        <div key={idx} className="w-full">
                            <SqueezeCard
                                result={result || 'red'}
                                playerName={ticket.player.name}
                                playerAvatar={ticket.player.avatar}
                                ticketNumber={ticket.ticket_number}
                                isRevealed={isRevealed}
                                onReveal={() => onReveal?.(idx)}
                                onDragProgress={onDragProgress}
                            />
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
