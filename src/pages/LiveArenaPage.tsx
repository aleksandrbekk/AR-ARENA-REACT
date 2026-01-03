// LiveArenaPage.tsx - ПОЛНАЯ КОПИЯ vanilla livearena.html v29
// 4 этапа: Tour 1 → Tour 2 → Semifinal (Traffic Light) → Final (Bulls & Bears)
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useArenaSounds } from '../hooks/useArenaSounds'
import { useArenaHaptics } from '../hooks/useArenaHaptics'
import { Tour1Drum } from '../components/live/Tour1Drum'
import { Tour2Squeeze } from '../components/live/Tour2Squeeze'
import { SemifinalTraffic } from '../components/live/SemifinalTraffic'
import { FinalBattle } from '../components/live/FinalBattle'

import type { Ticket, Player } from '../types'

interface ModalConfig {
  title: string
  duration: number
  stats?: { label: string; value: string | number; icon?: string }[]
  goal?: string
}

interface DrawResults {
  seed: number
  tour1: { winners: number[] }
  tour2: { selected_indices: number[]; finalists: number[] }
  semifinal: { spins: { ticket: number; hits: number }[]; eliminated: number[]; finalists3: number[] }
  final: { turn_order: number[]; turns: { turn: number; player: number; result: 'bull' | 'bear' }[] }
  winners: { place: number; ticket: number; username: string }[]
}

// ==================== MAIN COMPONENT ====================
export function LiveArenaPage() {
  const { id: giveawayId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [currentStage, setCurrentStage] = useState<string>('loading')

  // Data
  const allTicketsRef = useRef<Ticket[]>([])
  const allPlayersRef = useRef<Player[]>([])
  const giveawayDataRef = useRef<any>(null)
  const drawResultsRef = useRef<DrawResults | null>(null)
  const stageResolver = useRef<(() => void) | null>(null)

  // SFX & Haptics
  const { initAudio, playClick, playImpact, playSuccess, playFailure, playWin, playRouletteTicks } = useArenaSounds()
  const { triggerTick, triggerImpact, triggerSuccess, triggerError } = useArenaHaptics()

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [modalConfig, setModalConfig] = useState<ModalConfig | null>(null)
  const [modalTimer, setModalTimer] = useState(0)

  // Tour 1
  const [tour1Winners, setTour1Winners] = useState<Ticket[]>([])


  // Tour 2
  const [tour2Cards, setTour2Cards] = useState<Ticket[]>([])
  const [tour2Results, setTour2Results] = useState<Map<number, 'green' | 'red'>>(new Map())

  // Semifinal
  const [semifinalPlayers, setSemifinalPlayers] = useState<Ticket[]>([])
  const [semifinalHits, setSemifinalHits] = useState<Map<number, number>>(new Map())
  const [semifinalEliminated, setSemifinalEliminated] = useState<Map<number, number>>(new Map())
  const [rouletteOffset, setRouletteOffset] = useState(0)
  const [showSemifinalPrizes, setShowSemifinalPrizes] = useState(false)
  const [currentSpinTicket, setCurrentSpinTicket] = useState<number | null>(null)

  // Final
  const [finalPlayers, setFinalPlayers] = useState<Ticket[]>([])
  const [finalScores, setFinalScores] = useState<{ bulls: number; bears: number; place: number | null }[]>([])
  const [finalTurnOrder, setFinalTurnOrder] = useState<number[]>([])
  const [currentFinalPlayer, setCurrentFinalPlayer] = useState<number | null>(null)
  const [wheelAngle, setWheelAngle] = useState(0)
  const [wheelSpinning, setWheelSpinning] = useState(false)
  const [lastResult, setLastResult] = useState<'bull' | 'bear' | null>(null)

  // Results
  const [winners, setWinners] = useState<{ place: number; name: string; avatar: string; prize: number; ticket: number }[]>([])
  const [showConfetti, setShowConfetti] = useState(false)

  // ==================== HELPERS ====================
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  const hashUUID = (uuid: string): number => {
    let hash = 0
    for (let i = 0; i < uuid.length; i++) {
      const char = uuid.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash)
  }

  const seededRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000
    return x - Math.floor(x)
  }

  const shuffleWithSeed = <T,>(array: T[], seed: number): T[] => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom(seed + i) * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  // ==================== LOAD DATA ====================
  useEffect(() => {
    if (giveawayId) loadData()
  }, [giveawayId])

  const loadData = async () => {
    try {
      const { data: giveaway, error: gError } = await supabase
        .from('giveaways')
        .select('*')
        .eq('id', giveawayId)
        .single()

      if (gError || !giveaway) throw new Error('Розыгрыш не найден')
      giveawayDataRef.current = giveaway

      const { data: tickets, error: tError } = await supabase
        .from('giveaway_tickets')
        .select('*')
        .eq('giveaway_id', giveawayId)

      if (tError) throw tError

      const uniqueUserIds = [...new Set((tickets || []).map(t => t.user_id))]
      const { data: users } = await supabase
        .from('users')
        .select('telegram_id, username, first_name, photo_url')
        .in('telegram_id', uniqueUserIds)

      const playerMap: Record<string, Player> = {}
      for (const user of users || []) {
        const displayName = user.username || user.first_name || `User ${user.telegram_id}`
        playerMap[user.telegram_id] = {
          id: user.telegram_id,
          name: displayName,
          avatar: user.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=FFD700&color=000&size=128`
        }
      }

      const ticketsWithPlayers: Ticket[] = (tickets || [])
        .map(t => ({
          user_id: t.user_id,
          ticket_number: t.ticket_number,
          player: playerMap[t.user_id] || {
            id: t.user_id,
            name: `User ${t.user_id}`,
            avatar: `https://ui-avatars.com/api/?name=User&background=FFD700&color=000&size=128`
          }
        }))
        .sort((a, b) => a.ticket_number - b.ticket_number)

      allTicketsRef.current = ticketsWithPlayers
      allPlayersRef.current = Object.values(playerMap)

      // Load or generate draw results
      const hasValidStructure = giveaway.draw_results &&
        giveaway.draw_results.tour1 &&
        giveaway.draw_results.tour2 &&
        giveaway.draw_results.semifinal &&
        giveaway.draw_results.final

      if (hasValidStructure) {
        drawResultsRef.current = giveaway.draw_results
      } else {
        drawResultsRef.current = await autoGenerateDrawResults(ticketsWithPlayers, giveawayId!)
      }

      setLoading(false)
      runDraw()

    } catch (error: any) {
      console.error('Error loading data:', error)
      alert('Ошибка загрузки: ' + error.message)
      navigate('/giveaways')
    }
  }

  // ==================== AUTO GENERATE RESULTS ====================
  const autoGenerateDrawResults = async (tickets: Ticket[], giveawayId: string): Promise<DrawResults> => {
    const seed = hashUUID(giveawayId)

    const shuffled1 = shuffleWithSeed(tickets, seed)
    const tour1Winners = shuffled1.slice(0, 20)

    const indices = Array.from({ length: tour1Winners.length }, (_, i) => i)
    const shuffledIndices = shuffleWithSeed(indices, seed + 100)
    const selectedIndices = shuffledIndices.slice(0, 5)
    const tour2Finalists = selectedIndices.map(idx => tour1Winners[idx])

    const hitCounts: Record<number, number> = {}
    tour2Finalists.forEach(t => hitCounts[t.ticket_number] = 0)
    const spins: { ticket: number; hits: number }[] = []
    const eliminated: number[] = []
    let spinSeed = seed + 200

    while (eliminated.length < 2) {
      const available = Object.keys(hitCounts).filter(t => hitCounts[parseInt(t)] < 3)
      if (available.length === 0) break

      const winnerTicket = parseInt(available[Math.floor(seededRandom(spinSeed++) * available.length)])
      hitCounts[winnerTicket]++
      spins.push({ ticket: winnerTicket, hits: hitCounts[winnerTicket] })

      if (hitCounts[winnerTicket] === 3) {
        eliminated.push(winnerTicket)
      }
    }

    const finalists3 = tour2Finalists.filter(t => !eliminated.includes(t.ticket_number))

    const turnOrder = shuffleWithSeed([0, 1, 2], seed + 300)
    const playerScores = [{ bulls: 0, bears: 0 }, { bulls: 0, bears: 0 }, { bulls: 0, bears: 0 }]
    const turns: { turn: number; player: number; result: 'bull' | 'bear' }[] = []
    const places: { place: number; playerIndex: number }[] = []
    let turnIdx = 0
    let turnSeed = seed + 400

    while (places.length < 3 && turns.length < 100) {
      const activePlayers = [0, 1, 2].filter(i => !places.some(p => p.playerIndex === i))
      if (activePlayers.length === 1) {
        places.push({ place: 3, playerIndex: activePlayers[0] })
        break
      }

      const currentPlayer = turnOrder[turnIdx % 3]
      if (places.some(p => p.playerIndex === currentPlayer)) {
        turnIdx++
        continue
      }

      const result: 'bull' | 'bear' = seededRandom(turnSeed++) < 0.5 ? 'bull' : 'bear'
      playerScores[currentPlayer][result === 'bull' ? 'bulls' : 'bears']++
      turns.push({ turn: turns.length + 1, player: currentPlayer, result })

      if (playerScores[currentPlayer].bulls >= 3) {
        places.push({ place: places.length + 1, playerIndex: currentPlayer })
      } else if (playerScores[currentPlayer].bears >= 3) {
        const remainingPlaces = [1, 2, 3].filter(p => !places.some(pl => pl.place === p))
        places.push({ place: remainingPlaces[remainingPlaces.length - 1], playerIndex: currentPlayer })
      }

      turnIdx++
    }

    const finalWinners = places.map(p => ({
      place: p.place,
      ticket: finalists3[p.playerIndex].ticket_number,
      username: finalists3[p.playerIndex].player.name
    }))

    const results: DrawResults = {
      seed,
      tour1: { winners: tour1Winners.map(t => t.ticket_number) },
      tour2: { selected_indices: selectedIndices, finalists: tour2Finalists.map(t => t.ticket_number) },
      semifinal: { spins, eliminated, finalists3: finalists3.map(t => t.ticket_number) },
      final: { turn_order: turnOrder, turns },
      winners: finalWinners
    }

    await supabase.from('giveaways').update({ draw_results: results }).eq('id', giveawayId)

    return results
  }

  // ==================== SHOW MODAL ====================
  const displayModal = async (config: ModalConfig): Promise<void> => {
    return new Promise(resolve => {
      setModalConfig(config)
      setModalTimer(config.duration / 1000)
      setShowModal(true)

      let timer = config.duration / 1000
      const interval = setInterval(() => {
        timer--
        setModalTimer(timer)
        if (timer <= 0) {
          clearInterval(interval)
          setShowModal(false)
          resolve()
        }
      }, 1000)
    })
  }

  // ==================== RUN DRAW ====================
  const runDraw = async () => {
    const tickets = allTicketsRef.current
    const players = allPlayersRef.current
    const results = drawResultsRef.current
    const giveaway = giveawayDataRef.current

    if (!results) return

    // Init Audio context (best effort - might need interaction)
    // We try here, but browsers might block. Ideally user clicked something to get here.
    try { initAudio() } catch (e) { console.error('Audio init failed', e) }

    // ===== TOUR 1 =====
    await displayModal({
      title: 'ОТБОРОЧНЫЙ ТУР',
      duration: 3000,
      stats: [
        { label: 'Участников', value: players.length, icon: 'users' },
        { label: 'Билетов', value: tickets.length, icon: 'ticket' }
      ],
      goal: '✓ Все билеты участвуют в розыгрыше\n✓ Больше билетов = выше шанс\n✓ 20 барабанов выберут 20 счастливчиков'
    })

    const tour1WinnerTickets = results.tour1.winners.map((winner: any) => {
      const ticketNum = typeof winner === 'number' ? winner : winner.ticket_number
      return tickets.find(t => t.ticket_number === ticketNum)
    }).filter((t): t is Ticket => !!t)
    setTour1Winners(tour1WinnerTickets)
    setCurrentStage('tour1')

    await sleep(500)

    setTour1Winners(tour1WinnerTickets)

    await sleep(500)

    // Wait for Tour1Drum to complete
    await new Promise<void>(resolve => {
      stageResolver.current = resolve
    })

    await sleep(2000)

    // ===== TOUR 2 =====
    await displayModal({
      title: 'ВТОРОЙ ТУР',
      duration: 3000,
      goal: '20 счастливчиков выбраны!\nТеперь определим ТОП-5 финалистов'
    })

    setCurrentStage('tour2')
    setTour2Cards(tour1WinnerTickets)
    await sleep(1000)

    const selectedSet = new Set(results.tour2.selected_indices)
    for (let i = 0; i < 20; i++) {
      setTour2Results(prev => {
        const next = new Map(prev)
        next.set(i, selectedSet.has(i) ? 'green' : 'red')
        return next
      })
      if (selectedSet.has(i)) {
        playSuccess()
        triggerSuccess()
      } else {
        playClick()
        triggerTick()
      }
      await sleep(300)
    }

    await sleep(2000)

    // ===== SEMIFINAL =====
    await displayModal({
      title: 'ПОЛУФИНАЛ',
      duration: 3000,
      goal: '5 финалистов играют в светофор!\n3 попадания = красный свет = выбывание\nВ финал выходят 3 игрока!'
    })

    setCurrentStage('semifinal')

    const semifinalists = results.tour2.finalists.map((finalist: any) => {
      const ticketNum = typeof finalist === 'number' ? finalist : finalist.ticket_number
      return tickets.find(t => t.ticket_number === ticketNum)
    }).filter((t): t is Ticket => !!t)

    setSemifinalPlayers(semifinalists)

    const hits = new Map<number, number>()
    semifinalists.forEach(t => hits.set(t.ticket_number, 0))
    setSemifinalHits(hits)

    await sleep(1500)
    setShowSemifinalPrizes(true)

    const eliminatedMap = new Map<number, number>()
    let eliminatedCount = 0

    // Track cumulative offset for smooth continuous scrolling
    let cumulativeOffset = 0

    for (const spin of results.semifinal.spins) {
      const spinTicketNum = typeof spin.ticket === 'number' ? spin.ticket : (spin.ticket as any)?.ticket_number || (spin as any).ticket_number

      // Like vanilla: calculate target position first, then smooth animate
      setCurrentSpinTicket(null)

      // Item width 100px + gap 12px = 112px per item
      const ticketIndex = semifinalists.findIndex(t => t.ticket_number === spinTicketNum)
      const itemWidth = 112
      const itemsPerRep = semifinalists.length

      // Calculate how many full repetitions to scroll (2-3 reps for visual effect)
      const extraReps = 2 + Math.floor(Math.random() * 2) // 2-3 extra repetitions
      const targetOffset = cumulativeOffset - (extraReps * itemsPerRep * itemWidth) - (ticketIndex * itemWidth)

      // Smooth scroll to target over 4 seconds (like vanilla)
      setRouletteOffset(targetOffset)
      cumulativeOffset = targetOffset

      // Play visuals sound
      playRouletteTicks(25) // Approx 4 seconds of ticks
      triggerTick()

      await sleep(4000)

      setCurrentSpinTicket(spinTicketNum)
      triggerImpact()

      setSemifinalHits(prev => {
        const next = new Map(prev)
        next.set(spinTicketNum, spin.hits)
        return next
      })

      if (spin.hits === 3) {
        playFailure()
        triggerError()
        eliminatedCount++
        const place = eliminatedCount === 1 ? 5 : 4
        eliminatedMap.set(spinTicketNum, place)
        setSemifinalEliminated(new Map(eliminatedMap))
      } else {
        playClick()
      }

      await sleep(1500)
    }

    await sleep(2000)

    // ===== FINAL =====
    await displayModal({
      title: 'ФИНАЛ',
      duration: 3000,
      goal: 'Битва быка и медведя!\n3 быка = ПОБЕДА\n3 медведя = ВЫЛЕТ'
    })

    setCurrentStage('final')
    const finalists = results.semifinal.finalists3.map((finalist: any) => {
      const ticketNum = typeof finalist === 'number' ? finalist : finalist.ticket_number
      return tickets.find(t => t.ticket_number === ticketNum)
    }).filter((t): t is Ticket => !!t)

    setFinalPlayers(finalists)
    setFinalScores([
      { bulls: 0, bears: 0, place: null },
      { bulls: 0, bears: 0, place: null },
      { bulls: 0, bears: 0, place: null }
    ])
    setFinalTurnOrder(results.final.turn_order)

    await sleep(2000)

    const scores = [
      { bulls: 0, bears: 0, place: null as number | null },
      { bulls: 0, bears: 0, place: null as number | null },
      { bulls: 0, bears: 0, place: null as number | null }
    ]

    for (const turn of results.final.turns) {
      if (scores.filter(s => s.place !== null).length >= 3) break

      setCurrentFinalPlayer(turn.player)
      setLastResult(null)
      await sleep(800)

      setWheelSpinning(true)
      // Bull = LEFT half (green), Bear = RIGHT half (red)
      // Safe zones with margin from boundaries (180° and 0°/360°):
      // Bull: 210-330° (center ~270°, safe from both boundaries)
      // Bear: 30-150° (center ~90°, safe from both boundaries)
      const baseAngle = turn.result === 'bull'
        ? 210 + Math.random() * 120  // 210-330° for bull (safe margin)
        : 30 + Math.random() * 120   // 30-150° for bear (safe margin)
      setWheelAngle(prev => prev + 1800 + baseAngle) // 5 rotations + landing angle (like vanilla)

      playRouletteTicks(20) // Spin sound

      await sleep(3000)
      setWheelSpinning(false)
      setLastResult(turn.result)
      playImpact()
      triggerImpact()

      if (turn.result === 'bull') {
        playSuccess()
        triggerSuccess()
        scores[turn.player].bulls++
        if (scores[turn.player].bulls === 3) {
          const takenPlaces = scores.filter(s => s.place !== null).map(s => s.place!)
          const nextPlace = [1, 2, 3].find(p => !takenPlaces.includes(p))!
          scores[turn.player].place = nextPlace
        }
      } else {
        playFailure()
        triggerError()
        scores[turn.player].bears++
        if (scores[turn.player].bears === 3) {
          const takenPlaces = scores.filter(s => s.place !== null).map(s => s.place!)
          const worstPlace = [3, 2, 1].find(p => !takenPlaces.includes(p))!
          scores[turn.player].place = worstPlace
        }
      }

      setFinalScores([...scores])

      const playersWithoutPlace = scores.filter(s => s.place === null).length
      if (playersWithoutPlace === 1) {
        const lastPlayerIdx = scores.findIndex(s => s.place === null)
        const takenPlaces = scores.filter(s => s.place !== null).map(s => s.place!)
        const lastPlace = [1, 2, 3].find(p => !takenPlaces.includes(p))!
        scores[lastPlayerIdx].place = lastPlace
        setFinalScores([...scores])
        break
      }

      setCurrentFinalPlayer(null)
      await sleep(800)
    }

    await sleep(2000)

    // ===== RESULTS =====
    setCurrentStage('results')
    setShowConfetti(true)
    playWin()
    triggerSuccess()

    const prizes = giveaway?.prizes || []
    const getPrize = (place: number) => {
      const p = prizes.find((pr: any) => pr.place === place)
      return p?.amount || 0
    }

    const finalWinners = scores.map((score, idx) => ({
      place: score.place!,
      name: finalists[idx]?.player.name || 'Unknown',
      avatar: finalists[idx]?.player.avatar || '',
      prize: getPrize(score.place!),
      ticket: finalists[idx]?.ticket_number || 0
    })).sort((a, b) => a.place - b.place)

    const allWinners = [...finalWinners]
    eliminatedMap.forEach((place, ticket) => {
      const player = semifinalists.find(t => t.ticket_number === ticket)
      if (player) {
        allWinners.push({
          place,
          name: player.player.name,
          avatar: player.player.avatar,
          prize: getPrize(place),
          ticket: player.ticket_number
        })
      }
    })

    setWinners(allWinners.sort((a, b) => a.place - b.place))
  }

  // ==================== RENDER MODAL ====================
  const renderModal = () => {
    if (!showModal || !modalConfig) return null

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
      >
        <div className="bg-gradient-to-b from-zinc-900 to-black rounded-3xl border border-[#FFD700]/30 p-8 max-w-md w-full text-center">
          <img src="/icons/GIF.png" alt="gift" className="w-20 h-20 mx-auto mb-4" />
          <h2 className="text-3xl font-black mb-4 text-[#FFD700] uppercase tracking-wider">
            {modalConfig.title}
          </h2>
          <div className="text-6xl font-black text-[#FFD700] my-6 animate-pulse">
            {modalTimer}
          </div>
          {modalConfig.stats && (
            <div className="flex gap-3 my-5">
              {modalConfig.stats.map((stat, i) => (
                <div key={i} className="flex-1 bg-black/50 rounded-xl p-4 border border-[#FFD700]/20">
                  <div className="text-2xl font-black text-[#FFD700]">{stat.value}</div>
                  <div className="text-xs text-white/70">{stat.label}</div>
                </div>
              ))}
            </div>
          )}
          {modalConfig.goal && (
            <div className="text-sm text-white/90 mt-4 p-4 bg-[#FFD700]/10 rounded-xl border border-[#FFD700]/20 whitespace-pre-line">
              {modalConfig.goal}
            </div>
          )}
        </div>
      </motion.div>
    )
  }

  // ==================== RENDER TOUR 1 ====================
  const renderTour1 = () => (
    <div className="min-h-screen bg-[#0a0a0a] pt-[100px] pb-8 px-4">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-black text-[#FFD700]">ОТБОРОЧНЫЙ ТУР</h1>
        <p className="text-white/60 text-sm mt-2">Выбираем 20 из {allTicketsRef.current.length} билетов</p>
      </div>

      <Tour1Drum
        candidates={allTicketsRef.current.map(t => ({ ticket: t.ticket_number, user: t.player.name }))}
        winners={tour1Winners.map(t => ({ ticket: t.ticket_number, user: t.player.name }))}
        onComplete={() => stageResolver.current?.()}
      />
    </div>
  )







  // ==================== RENDER RESULTS ====================
  const renderResults = () => (
    <div className="min-h-screen bg-[#0a0a0a] pt-[100px] pb-8 px-4">
      <h1 className="text-3xl font-black text-center mb-8 text-[#FFD700]">
        ПОБЕДИТЕЛИ
      </h1>

      <div className="space-y-3 max-w-md mx-auto">
        {winners.map((winner, i) => (
          <motion.div
            key={winner.place}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.15 }}
            className={`rounded-2xl p-4 flex items-center gap-4 border-2 ${winner.place === 1 ? 'bg-gradient-to-r from-[#FFD700]/20 to-[#FFA500]/10 border-[#FFD700] shadow-[0_0_20px_rgba(255,215,0,0.3)]' :
              winner.place === 2 ? 'bg-zinc-900/80 border-gray-400' :
                winner.place === 3 ? 'bg-zinc-900/80 border-amber-600' :
                  'bg-zinc-900/80 border-zinc-700'
              }`}
          >
            <div className={`text-2xl font-black w-12 h-12 rounded-xl flex items-center justify-center ${winner.place === 1 ? 'bg-gradient-to-br from-[#FFD700] to-[#FFA500] text-black' :
              winner.place === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-black' :
                winner.place === 3 ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white' :
                  'bg-zinc-800 text-white'
              }`}>
              {winner.place}
            </div>
            <img src={winner.avatar} alt="" className="w-12 h-12 rounded-full border-2 border-[#FFD700]/50" />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-white truncate">{winner.name}</div>
              <div className="text-sm text-white/50">Билет #{winner.ticket}</div>
            </div>
            {winner.prize > 0 && (
              <div className="text-lg font-black text-[#FFD700]">{winner.prize} AR</div>
            )}
          </motion.div>
        ))}
      </div>

      <button
        onClick={() => navigate('/giveaways')}
        className="w-full max-w-md mx-auto mt-8 py-4 rounded-2xl font-black text-black uppercase bg-gradient-to-r from-[#FFD700] to-[#FFA500] block"
      >
        Вернуться к розыгрышам
      </button>
    </div>
  )

  // ==================== RENDER CONFETTI ====================
  const renderConfetti = () => {
    if (!showConfetti) return null
    const particles = Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 2,
      color: ['#FFD700', '#FFA500', '#FFED4E', '#22c55e'][Math.floor(Math.random() * 4)]
    }))
    return (
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {particles.map(p => (
          <motion.div
            key={p.id}
            initial={{ y: -20, x: `${p.x}vw`, opacity: 1 }}
            animate={{ y: '110vh', opacity: 0 }}
            transition={{ duration: p.duration, delay: p.delay, ease: 'linear' }}
            className="absolute w-2 h-2 rounded-sm"
            style={{ backgroundColor: p.color }}
          />
        ))}
      </div>
    )
  }

  // ==================== MAIN RENDER ====================
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#FFD700] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <AnimatePresence>{showModal && renderModal()}</AnimatePresence>

      {currentStage === 'tour1' && renderTour1()}

      {currentStage === 'tour2' && (
        <Tour2Squeeze
          candidates={tour2Cards}
          results={tour2Results}

        />
      )}

      {currentStage === 'semifinal' && (
        <SemifinalTraffic
          players={semifinalPlayers}
          hits={semifinalHits}
          eliminated={semifinalEliminated}
          rouletteOffset={rouletteOffset}
          currentSpinTicket={currentSpinTicket}
          showPrizes={showSemifinalPrizes}
        />
      )}

      {currentStage === 'final' && (
        <FinalBattle
          players={finalPlayers}
          scores={finalScores}
          turnOrder={finalTurnOrder}
          currentFinalPlayer={currentFinalPlayer}
          wheelAngle={wheelAngle}
          wheelSpinning={wheelSpinning}
          lastResult={lastResult}
        />
      )}

      {currentStage === 'results' && renderResults()}
      {renderConfetti()}
    </div>
  )
}

