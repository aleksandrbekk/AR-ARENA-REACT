import { useState } from 'react'
import { Tour1Drum } from '../components/live/Tour1Drum'
import { SqueezeCard } from '../components/live/SqueezeCard'
import { useArenaSounds } from '../hooks/useArenaSounds'
import { useArenaHaptics } from '../hooks/useArenaHaptics'

export function LiveArenaTestPage() {
    const [mode, setMode] = useState<'menu' | 'drum' | 'squeeze'>('menu')

    // MOCK DATA
    const mockCandidates = Array.from({ length: 150 }, (_, i) => ({
        ticket: 100000 + i,
        user: `User ${i + 1}`
    }))

    const mockWinners = Array.from({ length: 20 }, (_, i) => ({
        ticket: 100000 + Math.floor(Math.random() * 150),
        user: `Winner ${i + 1}`,
        avatar: `https://ui-avatars.com/api/?name=Winner+${i + 1}&background=FFD700&color=000`
    }))

    // SQUEEZE STATE
    const [revealedCards, setRevealedCards] = useState<Set<number>>(new Set())
    const [squeezeResults] = useState(() =>
        mockWinners.map((w, i) => ({
            ...w,
            result: i < 5 ? 'green' as const : 'red' as const // Top 5 win
        }))
    )

    const { initAudio } = useArenaSounds()
    const { triggerImpact } = useArenaHaptics()

    const handleReveal = (idx: number) => {
        setRevealedCards(prev => new Set([...prev, idx]))
        triggerImpact()
    }

    const handleRevealAll = async () => {
        for (let i = 0; i < 20; i++) {
            handleReveal(i)
            await new Promise(r => setTimeout(r, 150))
        }
    }

    if (mode === 'menu') {
        return (
            <div className="min-h-screen bg-[#0a0a0a] pt-[100px] px-4 flex flex-col items-center gap-4">
                <h1 className="text-2xl font-black text-[#FFD700] mb-8">TEST ARENA</h1>

                <button
                    onClick={() => { initAudio(); setMode('drum') }}
                    className="w-full max-w-xs py-4 bg-zinc-800 rounded-xl border border-zinc-700 font-bold text-white hover:border-[#FFD700] transition-all"
                >
                    TEST DRUM (Tour 1)
                </button>

                <button
                    onClick={() => { initAudio(); setMode('squeeze') }}
                    className="w-full max-w-xs py-4 bg-zinc-800 rounded-xl border border-zinc-700 font-bold text-white hover:border-[#FFD700] transition-all"
                >
                    TEST SQUEEZE (Tour 2)
                </button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] pt-[80px] px-4">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => setMode('menu')} className="text-white/60 hover:text-white">
                    ← Back
                </button>
                <h1 className="text-xl font-bold text-white">
                    {mode === 'drum' ? 'Tour 1 Drum' : 'Tour 2 Squeeze'}
                </h1>
            </div>

            {mode === 'drum' && (
                <Tour1Drum
                    candidates={mockCandidates}
                    winners={mockWinners}
                    onComplete={() => alert('Drum Complete!')}
                />
            )}

            {mode === 'squeeze' && (
                <div className="flex flex-col items-center">
                    <button
                        onClick={handleRevealAll}
                        className="mb-6 px-6 py-2 bg-[#FFD700] text-black font-bold rounded-full"
                    >
                        REVEAL ALL
                    </button>

                    <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-4">
                        {squeezeResults.map((winner, i) => (
                            <div key={i} onClick={() => handleReveal(i)} className="cursor-pointer">
                                <SqueezeCard
                                    isRevealed={revealedCards.has(i)}
                                    result={winner.result}
                                    playerName={winner.user}
                                    playerAvatar={winner.avatar}
                                    ticketNumber={winner.ticket}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
