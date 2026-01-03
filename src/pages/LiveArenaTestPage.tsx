import { useState } from 'react'
import { motion } from 'framer-motion'
import { Tour1Drum } from '../components/live/Tour1Drum'
import { SqueezeCard } from '../components/live/SqueezeCard'
import { useArenaSounds } from '../hooks/useArenaSounds'
import { useArenaHaptics } from '../hooks/useArenaHaptics'

type TestMode = 'menu' | 'tour1' | 'tour2' | 'semifinal' | 'final'

// ===================== MOCK DATA =====================
const generateMockWinners = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
        ticket: 100000 + Math.floor(Math.random() * 50000),
        user: `Player ${i + 1}`,
        avatar: `https://ui-avatars.com/api/?name=P${i + 1}&background=${['FFD700', 'FFA500', '22c55e', '3b82f6'][i % 4]}&color=000&bold=true`
    }))

const mockWinners20 = generateMockWinners(20)
const mockFinalists5 = mockWinners20.slice(0, 5)
const mockFinalists3 = mockFinalists5.slice(0, 3)

export function LiveArenaTestPage() {
    const [mode, setMode] = useState<TestMode>('menu')

    // ===================== HOOKS =====================
    const { initAudio, playClick, playSuccess, playFailure, playRouletteTicks, playImpact } = useArenaSounds()
    const { triggerTick, triggerImpact, triggerSuccess, triggerError, triggerTension } = useArenaHaptics()

    // ===================== TOUR 2 STATE =====================
    const [revealedCards, setRevealedCards] = useState<Set<number>>(new Set())
    const [squeezeResults] = useState(() =>
        mockWinners20.map((w, i) => ({
            ...w,
            result: i < 5 ? 'green' as const : 'red' as const
        }))
    )

    // ===================== SEMIFINAL STATE =====================
    const [semifinalHits, setSemifinalHits] = useState<Map<number, number>>(new Map())
    const [semifinalEliminated, setSemifinalEliminated] = useState<Map<number, number>>(new Map())
    const [rouletteOffset, setRouletteOffset] = useState(0)
    const [currentSpinTicket, setCurrentSpinTicket] = useState<number | null>(null)

    // ===================== FINAL STATE =====================
    const [finalScores, setFinalScores] = useState([
        { bulls: 0, bears: 0, place: null as number | null },
        { bulls: 0, bears: 0, place: null as number | null },
        { bulls: 0, bears: 0, place: null as number | null }
    ])
    const [currentFinalPlayer, setCurrentFinalPlayer] = useState<number | null>(null)
    const [wheelAngle, setWheelAngle] = useState(0)
    const [wheelSpinning, setWheelSpinning] = useState(false)
    const [lastResult, setLastResult] = useState<'bull' | 'bear' | null>(null)

    // ===================== HANDLERS =====================
    const handleRevealCard = (idx: number) => {
        if (revealedCards.has(idx)) return
        triggerTension(1500) // Start tension haptics
        playClick()
        setRevealedCards(prev => new Set([...prev, idx]))
    }

    const handleRevealAll = async () => {
        for (let i = 0; i < 20; i++) {
            if (!revealedCards.has(i)) {
                handleRevealCard(i)
                await new Promise(r => setTimeout(r, 200))
            }
        }
    }

    const runSemifinalDemo = async () => {
        // Reset
        setSemifinalHits(new Map())
        setSemifinalEliminated(new Map())
        setRouletteOffset(0)

        const hits = new Map<number, number>()
        mockFinalists5.forEach(p => hits.set(p.ticket, 0))

        // Simulate spins
        let cumulativeOffset = 0
        const spinsData = [
            mockFinalists5[0].ticket,
            mockFinalists5[2].ticket,
            mockFinalists5[1].ticket,
            mockFinalists5[0].ticket,
            mockFinalists5[3].ticket,
            mockFinalists5[0].ticket, // 3 hits = eliminated
            mockFinalists5[1].ticket,
            mockFinalists5[1].ticket, // 3 hits = eliminated
        ]

        for (const ticketNum of spinsData) {
            setCurrentSpinTicket(null)

            // Calculate offset
            const ticketIndex = mockFinalists5.findIndex(t => t.ticket === ticketNum)
            const itemWidth = 112
            const itemsPerRep = 5
            const extraReps = 2 + Math.floor(Math.random() * 2)
            const targetOffset = cumulativeOffset - (extraReps * itemsPerRep * itemWidth) - (ticketIndex * itemWidth)

            setRouletteOffset(targetOffset)
            cumulativeOffset = targetOffset

            playRouletteTicks(25)
            triggerTick()

            await new Promise(r => setTimeout(r, 4000))

            setCurrentSpinTicket(ticketNum)
            triggerImpact()

            const currentHits = (hits.get(ticketNum) || 0) + 1
            hits.set(ticketNum, currentHits)
            setSemifinalHits(new Map(hits))

            if (currentHits === 3) {
                playFailure()
                triggerError()
                const eliminatedCount = [...semifinalEliminated.values()].length
                setSemifinalEliminated(prev => new Map(prev).set(ticketNum, eliminatedCount === 0 ? 5 : 4))

                if (eliminatedCount >= 1) break // Stop after 2 eliminated
            } else {
                playClick()
            }

            await new Promise(r => setTimeout(r, 1500))
        }
    }

    const runFinalDemo = async () => {
        // Reset
        setFinalScores([
            { bulls: 0, bears: 0, place: null },
            { bulls: 0, bears: 0, place: null },
            { bulls: 0, bears: 0, place: null }
        ])
        setCurrentFinalPlayer(null)
        setWheelAngle(0)
        setLastResult(null)

        const scores = [
            { bulls: 0, bears: 0, place: null as number | null },
            { bulls: 0, bears: 0, place: null as number | null },
            { bulls: 0, bears: 0, place: null as number | null }
        ]

        const turnOrder = [0, 1, 2]
        let turnIdx = 0
        let placesAssigned = 0

        while (placesAssigned < 3 && turnIdx < 20) {
            const playerIdx = turnOrder[turnIdx % 3]

            if (scores[playerIdx].place !== null) {
                turnIdx++
                continue
            }

            setCurrentFinalPlayer(playerIdx)
            setLastResult(null)
            await new Promise(r => setTimeout(r, 800))

            // Spin wheel
            setWheelSpinning(true)
            const result: 'bull' | 'bear' = Math.random() < 0.5 ? 'bull' : 'bear'
            const baseAngle = result === 'bull'
                ? 210 + Math.random() * 120
                : 30 + Math.random() * 120

            setWheelAngle(prev => prev + 1800 + baseAngle)
            playRouletteTicks(20)

            await new Promise(r => setTimeout(r, 3000))
            setWheelSpinning(false)
            setLastResult(result)
            playImpact()
            triggerImpact()

            if (result === 'bull') {
                playSuccess()
                triggerSuccess()
                scores[playerIdx].bulls++
                if (scores[playerIdx].bulls === 3) {
                    placesAssigned++
                    scores[playerIdx].place = placesAssigned
                }
            } else {
                playFailure()
                triggerError()
                scores[playerIdx].bears++
                if (scores[playerIdx].bears === 3) {
                    placesAssigned++
                    scores[playerIdx].place = 4 - placesAssigned // 3, 2, 1 for losers
                }
            }

            setFinalScores([...scores])

            // Check if only one player left
            const activePlayers = scores.filter(s => s.place === null).length
            if (activePlayers === 1) {
                const lastPlayer = scores.findIndex(s => s.place === null)
                const takenPlaces = scores.filter(s => s.place !== null).map(s => s.place!)
                scores[lastPlayer].place = [1, 2, 3].find(p => !takenPlaces.includes(p))!
                setFinalScores([...scores])
                break
            }

            setCurrentFinalPlayer(null)
            await new Promise(r => setTimeout(r, 800))
            turnIdx++
        }
    }

    const resetToMenu = () => {
        setMode('menu')
        setRevealedCards(new Set())
        setSemifinalHits(new Map())
        setSemifinalEliminated(new Map())
        setRouletteOffset(0)
        setCurrentSpinTicket(null)
        setFinalScores([
            { bulls: 0, bears: 0, place: null },
            { bulls: 0, bears: 0, place: null },
            { bulls: 0, bears: 0, place: null }
        ])
        setCurrentFinalPlayer(null)
        setWheelAngle(0)
        setLastResult(null)
    }

    // ===================== MENU =====================
    if (mode === 'menu') {
        return (
            <div className="min-h-screen bg-[#0a0a0a] pt-[80px] px-4 flex flex-col items-center">
                <h1 className="text-3xl font-black text-[#FFD700] mb-2">DEV TEST</h1>
                <p className="text-white/50 text-sm mb-8">Arena Components Playground</p>

                <div className="w-full max-w-sm space-y-4">
                    {[
                        { id: 'tour1' as const, label: 'TOUR 1', desc: 'Drum / Барабан', icon: '🎰' },
                        { id: 'tour2' as const, label: 'TOUR 2', desc: 'Squeeze Cards', icon: '🃏' },
                        { id: 'semifinal' as const, label: 'SEMIFINAL', desc: 'Traffic Light Roulette', icon: '🚦' },
                        { id: 'final' as const, label: 'FINAL', desc: 'Bulls & Bears Wheel', icon: '🎯' },
                    ].map((item, i) => (
                        <motion.button
                            key={item.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            onClick={() => { initAudio(); setMode(item.id) }}
                            className="w-full py-5 px-6 bg-zinc-900 rounded-2xl border-2 border-zinc-700 hover:border-[#FFD700] transition-all flex items-center gap-4 group"
                        >
                            <span className="text-3xl">{item.icon}</span>
                            <div className="text-left flex-1">
                                <div className="font-black text-white text-lg group-hover:text-[#FFD700] transition-colors">
                                    {item.label}
                                </div>
                                <div className="text-white/50 text-sm">{item.desc}</div>
                            </div>
                            <span className="text-white/30 group-hover:text-[#FFD700] transition-colors">→</span>
                        </motion.button>
                    ))}
                </div>

                <div className="mt-8 text-center text-white/30 text-xs">
                    <p>Touch to test haptics & sounds</p>
                    <p className="mt-1">Works best in Telegram</p>
                </div>
            </div>
        )
    }

    // ===================== BACK BUTTON =====================
    const BackButton = () => (
        <button
            onClick={resetToMenu}
            className="fixed top-[60px] left-4 z-50 px-4 py-2 bg-zinc-800 rounded-full text-white/70 hover:text-white border border-zinc-700 hover:border-[#FFD700] transition-all flex items-center gap-2"
        >
            ← Menu
        </button>
    )

    // ===================== TOUR 1 =====================
    if (mode === 'tour1') {
        return (
            <div className="min-h-screen bg-[#0a0a0a] pt-[80px] px-4">
                <BackButton />
                <div className="text-center mb-6 pt-8">
                    <h1 className="text-2xl font-black text-[#FFD700]">TOUR 1 TEST</h1>
                    <p className="text-white/50 text-sm">Drum Animation</p>
                </div>
                <Tour1Drum
                    candidates={mockWinners20}
                    winners={mockWinners20}
                    onComplete={() => alert('Drum complete!')}
                />
            </div>
        )
    }

    // ===================== TOUR 2 =====================
    if (mode === 'tour2') {
        return (
            <div className="min-h-screen bg-[#0a0a0a] pt-[80px] px-4">
                <BackButton />
                <div className="text-center mb-4 pt-8">
                    <h1 className="text-2xl font-black text-[#FFD700]">TOUR 2 TEST</h1>
                    <p className="text-white/50 text-sm mb-4">Tap cards to reveal (with Squeeze effect)</p>
                    <button
                        onClick={handleRevealAll}
                        className="px-6 py-2 bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black font-bold rounded-full"
                    >
                        REVEAL ALL
                    </button>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-w-lg mx-auto">
                    {squeezeResults.map((winner, i) => (
                        <div key={i} onClick={() => handleRevealCard(i)} className="cursor-pointer">
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

                <div className="text-center mt-6 text-white/30 text-xs">
                    Green = Passes to Semifinal | Red = Eliminated
                </div>
            </div>
        )
    }

    // ===================== SEMIFINAL =====================
    if (mode === 'semifinal') {
        const getIndicatorClass = (hits: number) => {
            if (hits === 0) return 'bg-zinc-700'
            if (hits === 1) return 'bg-gradient-to-r from-green-500 to-emerald-400 shadow-[0_0_12px_#22c55e] animate-pulse'
            if (hits === 2) return 'bg-gradient-to-r from-yellow-500 to-amber-400 shadow-[0_0_12px_#eab308] animate-pulse'
            return 'bg-gradient-to-r from-red-500 to-red-600 shadow-[0_0_12px_#ef4444] animate-pulse'
        }

        return (
            <div className="min-h-screen bg-[#0a0a0a] pt-[80px] px-4">
                <BackButton />
                <div className="text-center mb-4 pt-8">
                    <h1 className="text-2xl font-black text-[#FFD700]">SEMIFINAL TEST</h1>
                    <p className="text-white/50 text-sm mb-4">Traffic Light Roulette</p>
                    <button
                        onClick={runSemifinalDemo}
                        className="px-6 py-2 bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black font-bold rounded-full"
                    >
                        RUN DEMO
                    </button>
                </div>

                {/* Legend */}
                <div className="flex justify-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="text-xs text-white/70">1 hit</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <span className="text-xs text-white/70">2 hits</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span className="text-xs text-white/70">OUT</span>
                    </div>
                </div>

                {/* Player Cards */}
                <div className="flex gap-2 mb-6 px-2">
                    {mockFinalists5.map((player) => {
                        const hits = semifinalHits.get(player.ticket) || 0
                        const eliminated = semifinalEliminated.get(player.ticket)
                        const isCurrentSpin = currentSpinTicket === player.ticket

                        return (
                            <div
                                key={player.ticket}
                                style={{ flex: 1, minWidth: 0 }}
                                className={`rounded-xl p-1.5 border-2 transition-all duration-500 flex flex-col items-center ${eliminated ? 'border-red-500 bg-red-500/10' :
                                    isCurrentSpin ? 'border-[#FFD700] bg-[#FFD700]/10 scale-105' :
                                        'border-zinc-700 bg-zinc-900/80'
                                    }`}
                            >
                                <div className={`w-full h-1.5 rounded-full mb-1.5 transition-all duration-500 ${getIndicatorClass(hits)}`} />
                                <img
                                    src={player.avatar}
                                    alt=""
                                    className={`w-10 h-10 rounded-full border-2 mb-1 object-cover ${eliminated ? 'border-red-500 grayscale' :
                                        isCurrentSpin ? 'border-[#FFD700]' : 'border-white/30'
                                        }`}
                                />
                                <div className="text-[8px] text-white/70 text-center truncate w-full">{player.user}</div>
                                <div className="text-[10px] font-bold text-[#FFD700]">#{player.ticket}</div>
                                {eliminated && (
                                    <div className="text-[8px] font-bold text-red-400 bg-red-500/20 rounded py-0.5 w-full text-center">
                                        {eliminated} МЕСТО
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                {/* Roulette */}
                <div className="relative mb-6">
                    <div className="flex justify-center mb-2">
                        <img src="/icons/Cursor.png" alt="cursor" className="w-8 h-8 drop-shadow-[0_0_15px_rgba(255,215,0,0.8)]" />
                    </div>
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
                                mockFinalists5.map((t, tIdx) => {
                                    const hits = semifinalHits.get(t.ticket) || 0
                                    const hitClass = hits === 1 ? 'border-green-500 bg-green-500/20 text-green-400' :
                                        hits === 2 ? 'border-yellow-500 bg-yellow-500/20 text-yellow-400' :
                                            hits === 3 ? 'border-red-500 bg-red-500/20 text-red-400' :
                                                'border-[#FFD700]/30 bg-zinc-800/50 text-white'

                                    return (
                                        <div
                                            key={`${repIdx}-${tIdx}`}
                                            className={`flex-shrink-0 w-[100px] h-14 rounded-xl border-2 flex items-center justify-center font-bold text-lg ${hitClass}`}
                                        >
                                            #{t.ticket}
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // ===================== FINAL =====================
    if (mode === 'final') {
        return (
            <div className="min-h-screen bg-[#0a0a0a] pt-[80px] px-4">
                <BackButton />
                <div className="text-center mb-4 pt-8">
                    <h1 className="text-2xl font-black text-[#FFD700]">FINAL TEST</h1>
                    <p className="text-white/50 text-sm mb-4">Bulls & Bears Battle</p>
                    <button
                        onClick={runFinalDemo}
                        className="px-6 py-2 bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black font-bold rounded-full"
                    >
                        RUN DEMO
                    </button>
                </div>

                {/* Players */}
                <div className="flex justify-center items-end gap-4 mb-8">
                    {mockFinalists3.map((player, idx) => {
                        const score = finalScores[idx]
                        const isCurrent = currentFinalPlayer === idx

                        return (
                            <div key={idx} className="flex flex-col items-center">
                                <div className="relative mb-2">
                                    <img
                                        src={player.avatar}
                                        alt=""
                                        className={`w-16 h-16 rounded-full border-3 transition-all duration-300 ${isCurrent ? 'border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.7)] scale-110' :
                                            score?.place ? 'border-[#FFD700]' : 'border-[#FFD700]/50'
                                            }`}
                                    />
                                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-[#FFD700] to-[#FFA500] text-black text-xs font-bold flex items-center justify-center border-2 border-black">
                                        {idx + 1}
                                    </div>
                                </div>

                                <div className={`px-3 py-1 rounded-lg text-center mb-2 text-sm ${score?.place === 1 ? 'bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black font-bold' :
                                    score?.place === 2 ? 'bg-gray-400 text-black font-bold' :
                                        score?.place === 3 ? 'bg-amber-600 text-white font-bold' :
                                            'bg-zinc-800 text-white'
                                    }`}>
                                    {score?.place ? `${score.place} МЕСТО` : player.user}
                                </div>

                                {/* Bulls & Bears */}
                                <div className="space-y-1">
                                    <div className="flex gap-1">
                                        {[0, 1, 2].map(i => (
                                            <div
                                                key={`bull-${i}`}
                                                className={`w-6 h-6 rounded flex items-center justify-center border transition-all ${(score?.bulls || 0) > i
                                                    ? 'bg-green-500 border-green-400'
                                                    : 'bg-zinc-900 border-zinc-700'
                                                    }`}
                                            >
                                                <span className="text-xs">🐂</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-1">
                                        {[0, 1, 2].map(i => (
                                            <div
                                                key={`bear-${i}`}
                                                className={`w-6 h-6 rounded flex items-center justify-center border transition-all ${(score?.bears || 0) > i
                                                    ? 'bg-red-500 border-red-400'
                                                    : 'bg-zinc-900 border-zinc-700'
                                                    }`}
                                            >
                                                <span className="text-xs">🐻</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Wheel */}
                <div className="relative w-56 h-56 mx-auto flex items-center justify-center">
                    <img src="/icons/rulet.png" alt="wheel" className="w-full h-full" />
                    <img
                        src="/icons/Cursor.png"
                        alt="cursor"
                        className={`absolute w-8 h-8 top-0 left-1/2 -ml-4 z-10 transition-transform ${wheelSpinning ? 'duration-[3s] ease-out' : ''}`}
                        style={{
                            transformOrigin: 'center 112px',
                            transform: `rotate(${wheelAngle}deg)`
                        }}
                    />
                    {lastResult && !wheelSpinning && (
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="absolute inset-0 flex items-center justify-center"
                        >
                            <span className={`text-6xl ${lastResult === 'bull' ? 'drop-shadow-[0_0_20px_rgba(34,197,94,0.8)]' : 'drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]'}`}>
                                {lastResult === 'bull' ? '🐂' : '🐻'}
                            </span>
                        </motion.div>
                    )}
                </div>

                <div className="text-center mt-4 text-white/30 text-xs">
                    3 Bulls = WIN | 3 Bears = OUT
                </div>
            </div>
        )
    }

    return null
}
