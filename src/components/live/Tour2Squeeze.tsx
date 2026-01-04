import { useEffect, useState } from 'react'
import { SqueezeCard } from './SqueezeCard'
import type { Ticket } from '../../types'

interface Tour2SqueezeProps {
    candidates: Ticket[]
    finalists: Ticket[]
    onComplete: () => void
}

export function Tour2Squeeze({ candidates, finalists, onComplete }: Tour2SqueezeProps) {
    const [revealedCount, setRevealedCount] = useState(0)
    // Map index -> status
    const [results, setResults] = useState<Map<number, 'green' | 'red'>>(new Map())

    // Determine status: is ticket in finalists?
    const getStatus = (ticket: Ticket): 'green' | 'red' => {
        return finalists.some(f => f.ticket_number === ticket.ticket_number) ? 'green' : 'red'
    }

    const handleReveal = (idx: number) => {
        if (results.has(idx)) return

        const ticket = candidates[idx]
        const status = getStatus(ticket)

        setResults(prev => new Map(prev).set(idx, status))
        setRevealedCount(prev => prev + 1)

        // Haptic feedback
        if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred(status === 'green' ? 'heavy' : 'light')
        }
    }

    // Auto-reveal effect if user doesn't interact (optional fallback)
    useEffect(() => {
        if (revealedCount === candidates.length) {
            setTimeout(onComplete, 2000)
        }
    }, [revealedCount, candidates.length, onComplete])

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
                    // If we haven't revealed it yet, we pass what it WILL be, but card handles hidden state
                    // Actually SqueezeCard needs 'result' to be the final color. 'isRevealed' controls if it's shown.
                    const finalStatus = getStatus(ticket)

                    return (
                        <div key={idx} className="w-full">
                            <SqueezeCard
                                result={finalStatus}
                                playerName={ticket.player.name}
                                playerAvatar={ticket.player.avatar}
                                ticketNumber={ticket.ticket_number}
                                isRevealed={results.has(idx)}
                                onReveal={() => handleReveal(idx)}
                            />
                        </div>
                    )
                })}
            </div>

            {/* Auto-reveal all button for debug/speed */}
            <div className="fixed bottom-8 left-0 right-0 flex justify-center z-50">
                <button
                    onClick={() => {
                        const newMap = new Map()
                        candidates.forEach((t, i) => newMap.set(i, getStatus(t)))
                        setResults(newMap)
                        setRevealedCount(candidates.length)
                    }}
                    className="px-6 py-2 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-widest text-white/50 hover:bg-white/20 transition-all border border-white/5"
                >
                    Открыть все
                </button>
            </div>
        </div>
    )
}
