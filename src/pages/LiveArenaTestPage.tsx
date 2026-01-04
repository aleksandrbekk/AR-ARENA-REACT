import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
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
        user: `Игрок ${i + 1}`,
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
    const navigate = useNavigate()

    // ===================== HOOKS (must be before callbacks that use them) =====================
    const { initAudio, playClick, playSuccess, playFailure, playRouletteTicks, playImpact, stopAllSounds } = useArenaSounds()
    const { triggerTick, triggerImpact, triggerSuccess, triggerError, triggerTension } = useArenaHaptics()

    // AbortController for stopping demos
    const abortControllerRef = useRef<AbortController | null>(null)

    // Stop demos and sounds when leaving
    const stopDemo = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            abortControllerRef.current = null
        }
        stopAllSounds()
    }, [stopAllSounds])

    // ===================== TELEGRAM BACK BUTTON =====================
    const handleBack = useCallback(() => {
        // Stop all sounds first
        stopDemo()

        if (mode === 'menu') {
            // На главном меню - выходим на страницу розыгрышей
            navigate('/giveaways')
        } else {
            // Внутри теста - возвращаемся в меню
            setMode('menu')
        }
    }, [mode, navigate, stopDemo])

    useEffect(() => {
        const tg = window.Telegram?.WebApp
        if (!tg?.BackButton) return

        // Показываем кнопку "Назад"
        tg.BackButton.show()
        tg.BackButton.onClick(handleBack)

        return () => {
            tg.BackButton.offClick(handleBack)
            tg.BackButton.hide()
        }
    }, [handleBack])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopDemo()
        }
    }, [stopDemo])

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
    // Показываем карточки призов сразу (с "?" пока нет выбывших)
    const [showSemifinalPrizes, _setShowSemifinalPrizes] = useState(true)

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
        // Reset (но карточки призов оставляем видимыми)
        setSemifinalHits(new Map())
        setSemifinalEliminated(new Map())
        setRouletteOffset(0)

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

        let spinCount = 0

        for (const ticketNum of spinsData) {
            // Check if already eliminated
            if (eliminated.has(ticketNum)) continue

            setCurrentSpinTicket(null)

            // Calculate offset for roulette animation
            // Each slot is 90px (80px width + 10px gap)
            // Slot N shows players[N % 5]
            // To center slot N: offset = -(N * 90)
            const ticketIndex = mockFinalists5.findIndex(t => t.ticket_number === ticketNum)
            const itemWidth = 90
            const itemsPerRep = 5

            // Each spin adds 2-3 full repetitions + lands on correct ticket
            // Start from repetition 5 to have room for multiple spins
            const targetRepetition = 5 + spinCount * 3 + Math.floor(Math.random() * 2)
            const targetSlot = targetRepetition * itemsPerRep + ticketIndex
            const targetOffset = -(targetSlot * itemWidth)

            setRouletteOffset(targetOffset)
            spinCount++

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
                    // Оба выбыли — конец демо
                    await new Promise(r => setTimeout(r, 1000))
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
        let currentAngle = 0 // Track angle locally

        while (placesAssigned < 3 && turnIdx < 20) {
            const playerIdx = turnOrder[turnIdx % 3]

            if (scores[playerIdx].place !== null) {
                turnIdx++
                continue
            }

            setCurrentFinalPlayer(playerIdx)
            setLastResult(null)
            await new Promise(r => setTimeout(r, 800))

            // Spin wheel - random angle first, then determine result
            setWheelSpinning(true)
            const spinAmount = 1800 + Math.random() * 720 // 5-7 full rotations
            const newAngle = currentAngle + spinAmount
            currentAngle = newAngle

            setWheelAngle(newAngle)
            playRouletteTicks(20)

            await new Promise(r => setTimeout(r, 3000))
            setWheelSpinning(false)

            // Determine result by final angle
            // Wheel: Left (180-360°) = BULL (green), Right (0-180°) = BEAR (red)
            const normalized = newAngle % 360
            const result: 'bull' | 'bear' = normalized >= 180 ? 'bull' : 'bear'

            setLastResult(result)
            playImpact()
            triggerImpact()

            if (result === 'bull') {
                playSuccess()
                triggerSuccess()
                scores[playerIdx].bulls++
                if (scores[playerIdx].bulls === 3) {
                    // 3 БЫКА = 1 МЕСТО (ПОБЕДА)
                    scores[playerIdx].place = 1
                    placesAssigned++
                }
            } else {
                playFailure()
                triggerError()
                scores[playerIdx].bears++
                if (scores[playerIdx].bears === 3) {
                    // 3 МЕДВЕДЯ = 3 МЕСТО (ПРОИГРЫШ)
                    scores[playerIdx].place = 3
                    placesAssigned++
                }
            }

            setFinalScores([...scores])

            // Check if only one player left without place
            const activePlayers = scores.filter(s => s.place === null).length
            if (activePlayers === 1) {
                // Последний оставшийся = 2 МЕСТО
                const lastPlayerIdx = scores.findIndex(s => s.place === null)
                scores[lastPlayerIdx].place = 2
                placesAssigned++
                setFinalScores([...scores])
                break
            }

            setCurrentFinalPlayer(null)
            await new Promise(r => setTimeout(r, 800))
            turnIdx++
        }
    }

    const resetToMenu = useCallback(() => {
        // Stop all running demos and sounds
        stopDemo()

        setMode('menu')
        setSemifinalHits(new Map())
        setSemifinalEliminated(new Map())
        setRouletteOffset(0)
        setCurrentSpinTicket(null)
        // showSemifinalPrizes остаётся true — карточки всегда видны
        setFinalScores([
            { bulls: 0, bears: 0, place: null },
            { bulls: 0, bears: 0, place: null },
            { bulls: 0, bears: 0, place: null }
        ])
        setCurrentFinalPlayer(null)
        setWheelAngle(0)
        setLastResult(null)
    }, [stopDemo])

    // ===================== MENU =====================
    if (mode === 'menu') {
        return (
            <div className="min-h-screen bg-[#0a0a0a] pt-[80px] px-4 flex flex-col items-center">
                <h1 className="text-3xl font-black text-[#FFD700] mb-2">AR ARENA</h1>
                <p className="text-white/50 text-sm mb-8">Выбери этап розыгрыша</p>

                <div className="w-full max-w-sm space-y-4">
                    {[
                        { id: 'tour1' as const, label: 'ОТБОР', desc: 'Все → 20 билетов', icon: '🎰' },
                        { id: 'tour2' as const, label: 'ЛИКВИДАЦИЯ', desc: '20 → 5 призёров', icon: '🃏' },
                        { id: 'semifinal' as const, label: 'СВЕТОФОР', desc: 'Полуфинал • 5 → 3', icon: '🚦' },
                        { id: 'final' as const, label: 'ФИНАЛ', desc: 'Быки и Медведи', icon: '🎯' },
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
                    <p>Тест вибрации и звуков</p>
                    <p className="mt-1">Лучше всего работает в Telegram</p>
                </div>
            </div>
        )
    }

    // ===================== BACK BUTTON =====================
    // В Telegram используем системную кнопку BackButton
    // На десктопе (браузер) показываем UI кнопку
    // Проверяем platform — он есть только в реальном Telegram
    const isTelegram = typeof window !== 'undefined' &&
        !!window.Telegram?.WebApp?.platform &&
        window.Telegram.WebApp.platform !== 'unknown'

    const BackButton = () => {
        // В Telegram полностью скрываем — там системная кнопка
        if (isTelegram) return null

        return (
            <button
                onClick={resetToMenu}
                className="fixed top-4 left-4 z-50 px-4 py-2 bg-zinc-800 rounded-full text-white/70 hover:text-white border border-zinc-700 hover:border-[#FFD700] transition-all flex items-center gap-2"
            >
                ← Меню
            </button>
        )
    }

    // ===================== TOUR 1 =====================
    if (mode === 'tour1') {
        return (
            <div className="min-h-screen bg-[#0a0a0a] pt-[80px] px-4">
                <BackButton />
                <div className="text-center mb-6 pt-8">
                    <h1 className="text-2xl font-black text-[#FFD700]">ОТБОРОЧНЫЙ ТУР</h1>
                    <p className="text-white/50 text-sm">Выбираем 20 из {mockWinners20.length} билетов</p>
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
                    <h1 className="text-2xl font-black text-[#FFD700]">ЛИКВИДАЦИЯ</h1>
                    <p className="text-white/50 text-sm">20 → 5 призёров</p>
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
                    Зелёный = Проходит в полуфинал | Красный = Выбыл
                </div>
            </div>
        )
    }

    // ===================== SEMIFINAL - Using SemifinalTraffic Component =====================
    if (mode === 'semifinal') {
        return (
            <div className="min-h-screen bg-[#0a0a0a] pt-[80px] px-4">
                <BackButton />
                <div className="text-center mb-4 pt-4">
                    {/* Stylish СВЕТОФОР title */}
                    <div className="relative inline-block mb-1">
                        {/* Glow effect behind */}
                        <div className="absolute inset-0 blur-xl opacity-50 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500" />
                        <h1
                            className="relative text-4xl font-black tracking-[0.2em] uppercase"
                            style={{
                                background: 'linear-gradient(90deg, #22c55e 0%, #eab308 50%, #ef4444 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                textShadow: '0 0 40px rgba(234,179,8,0.3)',
                                filter: 'drop-shadow(0 0 10px rgba(234,179,8,0.4))'
                            }}
                        >
                            СВЕТОФОР
                        </h1>
                    </div>
                    {/* Subtitle */}
                    <div className="flex items-center justify-center gap-2 mb-3">
                        <div className="h-px w-8 bg-gradient-to-r from-transparent to-white/30" />
                        <span className="text-white/50 text-xs font-medium tracking-[0.3em] uppercase">Полуфинал</span>
                        <div className="h-px w-8 bg-gradient-to-l from-transparent to-white/30" />
                    </div>
                    <button
                        onClick={runSemifinalDemo}
                        data-testid="run-demo-btn"
                        className="px-6 py-2 bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black font-bold rounded-full hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,215,0,0.3)]"
                    >
                        ЗАПУСТИТЬ
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
                    <h1 className="text-2xl font-black text-[#FFD700]">ФИНАЛ</h1>
                    <p className="text-white/50 text-sm mb-4">3 быка = победа | 3 медведя = выбывание</p>
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
