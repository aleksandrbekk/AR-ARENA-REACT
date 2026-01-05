import { useEffect, useState, useRef } from 'react'
import { SqueezeCard } from './SqueezeCard'
import type { Ticket } from '../../types'

interface Tour2SqueezeProps {
    candidates: Ticket[]
    finalists: Ticket[]
    onComplete: () => void
    autoReveal?: boolean // Auto-reveal mode for Live Arena
    // Sound callbacks
    onRevealGreen?: () => void
    onRevealRed?: () => void
}

export function Tour2Squeeze({ candidates, finalists, onComplete, autoReveal = true, onRevealGreen, onRevealRed }: Tour2SqueezeProps) {
    const [revealedCount, setRevealedCount] = useState(0)
    // Map index -> status
    const [results, setResults] = useState<Map<number, 'green' | 'red'>>(new Map())
    const autoRevealStarted = useRef(false)

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

        // Sound feedback
        if (status === 'green') {
            onRevealGreen?.()
        } else {
            onRevealRed?.()
        }
    }

    // Auto-reveal in Live Arena mode
    useEffect(() => {
        if (!autoReveal || autoRevealStarted.current) return
        autoRevealStarted.current = true

        let currentIdx = 0
        const revealNext = () => {
            if (currentIdx >= candidates.length) return
            handleReveal(currentIdx)
            currentIdx++
            if (currentIdx < candidates.length) {
                setTimeout(revealNext, 300) // Reveal one every 300ms
            }
        }
        // Start after a short delay
        setTimeout(revealNext, 500)
    }, [autoReveal, candidates.length])

    // Complete when all revealed
    useEffect(() => {
        if (revealedCount === candidates.length && revealedCount > 0) {
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

            {/* Progress indicator */}
            <div className="fixed bottom-8 left-0 right-0 flex justify-center z-50">
                <div className="px-6 py-2 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-widest text-white/50 border border-white/5">
                    Открыто: {revealedCount} / {candidates.length}
                </div>
            </div>
        </div>
    )
}
