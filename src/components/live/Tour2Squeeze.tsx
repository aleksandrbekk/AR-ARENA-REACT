import { useEffect, useState, useRef, useCallback } from 'react'
import { SqueezeCard } from './SqueezeCard'
import type { Ticket } from '../../types'

interface Tour2SqueezeProps {
    candidates: Ticket[]
    finalists: Ticket[]
    onComplete: () => void
    // Sound callbacks
    onRevealGreen?: () => void
    onRevealRed?: () => void
}

export function Tour2Squeeze({ candidates, finalists, onComplete, onRevealGreen, onRevealRed }: Tour2SqueezeProps) {
    const [revealedCount, setRevealedCount] = useState(0)
    // Map index -> status
    const [results, setResults] = useState<Map<number, 'green' | 'red'>>(new Map())
    const [isRevealingAll, setIsRevealingAll] = useState(false)

    // Refs for cleanup
    const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])
    const isUnmountedRef = useRef(false)

    // Cleanup helper
    const clearAllTimeouts = useCallback(() => {
        timeoutsRef.current.forEach(t => clearTimeout(t))
        timeoutsRef.current = []
    }, [])

    // Safe timeout that tracks for cleanup
    const safeTimeout = useCallback((fn: () => void, delay: number) => {
        const t = setTimeout(() => {
            if (!isUnmountedRef.current) fn()
        }, delay)
        timeoutsRef.current.push(t)
        return t
    }, [])

    // Cleanup on unmount
    useEffect(() => {
        isUnmountedRef.current = false
        return () => {
            isUnmountedRef.current = true
            clearAllTimeouts()
        }
    }, [clearAllTimeouts])

    // Determine status: is ticket in finalists?
    const getStatus = useCallback((ticket: Ticket): 'green' | 'red' => {
        return finalists.some(f => f.ticket_number === ticket.ticket_number) ? 'green' : 'red'
    }, [finalists])

    const handleReveal = useCallback((idx: number) => {
        if (results.has(idx) || isUnmountedRef.current) return

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
    }, [results, candidates, getStatus, onRevealGreen, onRevealRed])

    // "Open All" button handler - reveals remaining cards one by one
    const handleRevealAll = useCallback(() => {
        if (isRevealingAll) return
        setIsRevealingAll(true)

        // Find unrevealed indices
        const unrevealedIndices: number[] = []
        for (let i = 0; i < candidates.length; i++) {
            if (!results.has(i)) {
                unrevealedIndices.push(i)
            }
        }

        // Reveal them one by one with delay
        unrevealedIndices.forEach((idx, i) => {
            safeTimeout(() => {
                handleReveal(idx)
            }, i * 250) // 250ms between each reveal
        })
    }, [isRevealingAll, candidates.length, results, safeTimeout, handleReveal])

    // Complete when all revealed
    useEffect(() => {
        if (revealedCount === candidates.length && revealedCount > 0) {
            safeTimeout(onComplete, 2000)
        }
    }, [revealedCount, candidates.length, onComplete, safeTimeout])

    const allRevealed = revealedCount === candidates.length

    return (
        <div className="min-h-screen bg-[#0a0a0a] pt-[100px] pb-24 px-4">
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

            {/* Bottom bar with progress and Open All button */}
            <div className="fixed bottom-8 left-0 right-0 flex justify-center gap-4 z-50 px-4">
                {/* Progress indicator */}
                <div className="px-5 py-3 bg-zinc-900/90 backdrop-blur-md rounded-xl text-sm font-bold text-white/70 border border-white/10">
                    Открыто: <span className="text-[#FFD700]">{revealedCount}</span> / {candidates.length}
                </div>

                {/* Open All button */}
                {!allRevealed && (
                    <button
                        onClick={handleRevealAll}
                        disabled={isRevealingAll}
                        className={`
                            px-5 py-3 rounded-xl text-sm font-bold uppercase tracking-wide
                            transition-all duration-200
                            ${isRevealingAll
                                ? 'bg-zinc-700 text-white/50 cursor-not-allowed'
                                : 'bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black hover:scale-105 active:scale-95'
                            }
                        `}
                    >
                        {isRevealingAll ? 'Открываю...' : 'Открыть все'}
                    </button>
                )}
            </div>
        </div>
    )
}
