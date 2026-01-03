import { useState } from 'react'
import { motion } from 'framer-motion'
import { Tour1Drum } from '../components/live/Tour1Drum'
import { SqueezeCard } from '../components/live/SqueezeCard'
import { SemifinalTraffic } from '../components/live/SemifinalTraffic'
import { FinalBattle } from '../components/live/FinalBattle'
import { useArenaSounds } from '../hooks/useArenaSounds'
import { useArenaHaptics } from '../hooks/useArenaHaptics'
import type { Ticket } from '../types'

type TestMode = 'menu' | 'tour1' | 'tour2' | 'semifinal' | 'final'

// ===================== MOCK DATA =====================
const generateMockWinners = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
        ticket: 100000 + Math.floor(Math.random() * 50000),
        user: `Player ${i + 1}`,
        avatar: `https://ui-avatars.com/api/?name=P${i + 1}&background=${['FFD700', 'FFA500', '22c55e', '3b82f6'][i % 4]}&color=000&bold=true`
    }))

const mockWinners20 = generateMockWinners(20)
const mockFinalists5Raw = mockWinners20.slice(0, 5)
const mockFinalists3Raw = mockFinalists5Raw.slice(0, 3)

// Convert to Ticket[] format for SemifinalTraffic
const mockFinalists5: Ticket[] = mockFinalists5Raw.map((p, i) => ({
    user_id: `user_${i}`,
    ticket_number: p.ticket,
    player: {
        id: `player_${i}`,
        name: p.user,
        avatar: p.avatar
    }
}))

// Convert to Ticket[] format for FinalBattle
const mockFinalists3: Ticket[] = mockFinalists3Raw.map((p, i) => ({
    user_id: `user_${i}`,
    ticket_number: p.ticket,
    player: {
        id: `player_${i}`,
        name: p.user,
        avatar: p.avatar
    }
}))

export function LiveArenaTestPage() {
    const [mode, setMode] = useState<TestMode>('menu')

    // ===================== HOOKS =====================
    const { initAudio, playClick, playSuccess, playFailure, playRouletteTicks, playImpact } = useArenaSounds()
    const { triggerTick, triggerImpact, triggerSuccess, triggerError, triggerTension } = useArenaHaptics()

    // ===================== TOUR 2 STATE =====================
    const [squeezeResults] = useState(() => {
        // Shuffle: 5 random greens among 20
        const indices = [...Array(20)].map((_, i) => i)
        const shuffled = indices.sort(() => Math.random() - 0.5)
        const greenIndices = new Set(shuffled.slice(0, 5))

        return mockWinners20.map((w, i) => ({
            ...w,
            result: greenIndices.has(i) ? 'green' as const : 'red' as const
        }))
    })

    // ===================== SEMIFINAL STATE =====================
    const [semifinalHits, setSemifinalHits] = useState<Map<number, number>>(new Map())
    const [semifinalEliminated, setSemifinalEliminated] = useState<Map<number, number>>(new Map())
    const [rouletteOffset, setRouletteOffset] = useState(0)
    const [currentSpinTicket, setCurrentSpinTicket] = useState<number | null>(null)
    const [showSemifinalPrizes, setShowSemifinalPrizes] = useState(false)

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
    const runSemifinalDemo = async () => {
        // Reset
        setSemifinalHits(new Map())
        setSemifinalEliminated(new Map())
        setRouletteOffset(0)
        setShowSemifinalPrizes(false)

        const hits = new Map<number, number>()
        const eliminated = new Map<number, number>()
        mockFinalists5.forEach(p => hits.set(p.ticket_number, 0))

        // Simulate spins - each spin lands on a ticket
        const spinsData = [
            mockFinalists5[0].ticket_number,
            mockFinalists5[2].ticket_number,
            mockFinalists5[1].ticket_number,
            mockFinalists5[0].ticket_number,
            mockFinalists5[3].ticket_number,
            mockFinalists5[0].ticket_number, // 3 hits = eliminated (5th place)
            mockFinalists5[1].ticket_number,
            mockFinalists5[1].ticket_number, // 3 hits = eliminated (4th place)
        ]

        let cumulativeOffset = 0

        for (const ticketNum of spinsData) {
            // Check if already eliminated
            if (eliminated.has(ticketNum)) continue

            setCurrentSpinTicket(null)

            // Calculate offset for roulette animation
            const ticketIndex = mockFinalists5.findIndex(t => t.ticket_number === ticketNum)
            const itemWidth = 90 // w-[80px] + gap
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
                const eliminatedCount = eliminated.size
                const place = eliminatedCount === 0 ? 5 : 4
                eliminated.set(ticketNum, place)
                setSemifinalEliminated(new Map(eliminated))

                if (eliminatedCount >= 1) {
                    // Show prizes after both eliminated
                    await new Promise(r => setTimeout(r, 1000))
                    setShowSemifinalPrizes(true)
                    break
                }
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
        setSemifinalHits(new Map())
        setSemifinalEliminated(new Map())
        setRouletteOffset(0)
        setCurrentSpinTicket(null)
        setShowSemifinalPrizes(false)
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
                            data-testid={`menu-${item.id}`}
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
        // Haptic feedback on drag progress
        const handleDragProgress = (progress: number) => {
            // Trigger tension haptics based on drag progress
            if (progress > 0.3) {
                triggerTension(100)
            }
            if (progress > 0.6) {
                triggerTick()
            }
        }

        const handleReveal = (index: number) => {
            const result = squeezeResults[index].result
            if (result === 'green') {
                playSuccess()
                triggerSuccess()
            } else {
                playFailure()
                triggerError()
            }
            playImpact()
        }

        return (
            <div className="min-h-screen bg-[#0a0a0a] pt-[80px] px-4 pb-8">
                <BackButton />
                <div className="text-center mb-4 pt-8">
                    <h1 className="text-2xl font-black text-[#FFD700]">TOUR 2 TEST</h1>
                    <p className="text-white/50 text-sm mb-2">Drag cards down to peek, release to reveal</p>
                    <p className="text-white/30 text-xs">Or tap to instant reveal</p>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 max-w-lg mx-auto">
                    {squeezeResults.map((winner, i) => (
                        <SqueezeCard
                            key={i}
                            result={winner.result}
                            playerName={winner.user}
                            playerAvatar={winner.avatar}
                            ticketNumber={winner.ticket}
                            onReveal={() => handleReveal(i)}
                            onDragProgress={handleDragProgress}
                        />
                    ))}
                </div>

                <div className="text-center mt-6 text-white/30 text-xs">
                    Green = Passes to Semifinal | Red = Eliminated
                </div>
            </div>
        )
    }

    // ===================== SEMIFINAL - Using SemifinalTraffic Component =====================
    if (mode === 'semifinal') {
        return (
            <div className="min-h-screen bg-[#0a0a0a] pt-[80px] px-4">
                <BackButton />
                <div className="text-center mb-4 pt-8">
                    <h1 className="text-2xl font-black text-[#FFD700]">SEMIFINAL TEST</h1>
                    <p className="text-white/50 text-sm mb-4">Traffic Light Roulette</p>
                    <button
                        onClick={runSemifinalDemo}
                        data-testid="run-demo-btn"
                        className="px-6 py-2 bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black font-bold rounded-full hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,215,0,0.3)]"
                    >
                        RUN DEMO
                    </button>
                </div>

                {/* SemifinalTraffic Component - embedded mode */}
                <SemifinalTraffic
                    players={mockFinalists5}
                    hits={semifinalHits}
                    eliminated={semifinalEliminated}
                    rouletteOffset={rouletteOffset}
                    currentSpinTicket={currentSpinTicket}
                    showPrizes={showSemifinalPrizes}
                    embedded={true}
                />
            </div>
        )
    }

    // ===================== FINAL - Using FinalBattle Component =====================
    if (mode === 'final') {
        return (
            <div className="min-h-screen bg-[#0a0a0a] pt-[80px] px-4">
                <BackButton />
                <div className="text-center mb-4 pt-8">
                    <h1 className="text-2xl font-black text-[#FFD700]">FINAL TEST</h1>
                    <p className="text-white/50 text-sm mb-4">Bulls & Bears Battle</p>
                </div>

                <FinalBattle
                    players={mockFinalists3}
                    scores={finalScores}
                    turnOrder={[0, 1, 2]}
                    currentFinalPlayer={currentFinalPlayer}
                    wheelAngle={wheelAngle}
                    wheelSpinning={wheelSpinning}
                    lastResult={lastResult}
                    onRunDemo={runFinalDemo}
                    embedded={true}
                />
            </div>
        )
    }

    return null
}
