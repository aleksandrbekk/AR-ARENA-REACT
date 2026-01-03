// LiveArenaPage.tsx - ПОЛНАЯ КОПИЯ vanilla livearena.html v29
// 4 этапа: Tour 1 → Tour 2 → Semifinal (Traffic Light) → Final (Bulls & Bears)
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'

interface Player {
  id: string
  name: string
  avatar: string
}

interface Ticket {
  user_id: string
  ticket_number: number
  player: Player
}

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

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [modalConfig, setModalConfig] = useState<ModalConfig | null>(null)
  const [modalTimer, setModalTimer] = useState(0)

  // Tour 1
  const [tour1Winners, setTour1Winners] = useState<Ticket[]>([])
  const [tour1FlippedDrums, setTour1FlippedDrums] = useState<Set<number>>(new Set())
  const [tour1SpunDrums, setTour1SpunDrums] = useState<Set<number>>(new Set())

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

    setCurrentStage('tour1')
    const tour1WinnerTickets = results.tour1.winners.map((winner: any) => {
      const ticketNum = typeof winner === 'number' ? winner : winner.ticket_number
      return tickets.find(t => t.ticket_number === ticketNum)
    }).filter((t): t is Ticket => !!t)
    setTour1Winners(tour1WinnerTickets)

    await sleep(500)

    for (let i = 0; i < 20; i++) {
      setTour1FlippedDrums(prev => new Set([...prev, i]))
      await sleep(80)
    }
    await sleep(800)

    for (let i = 0; i < 20; i++) {
      setTimeout(() => {
        setTour1SpunDrums(prev => new Set([...prev, i]))
      }, 1500 + i * 100)
    }
    await sleep(1500 + 20 * 100 + 2000)

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

    for (const spin of results.semifinal.spins) {
      const spinTicketNum = typeof spin.ticket === 'number' ? spin.ticket : (spin.ticket as any)?.ticket_number || (spin as any).ticket_number

      // Spin animation - start by scrolling fast
      setCurrentSpinTicket(null)
      setRouletteOffset(prev => prev - 2000)
      await sleep(100)

      // Calculate target position - item width 100px + gap 12px = 112px per item
      // Target middle repetition (rep 5 of 10) to have items on both sides
      const ticketIndex = semifinalists.findIndex(t => t.ticket_number === spinTicketNum)
      const itemWidth = 112 // 100px item + 12px gap
      const targetRep = 5 // middle repetition
      const globalIndex = targetRep * semifinalists.length + ticketIndex
      const targetOffset = -(globalIndex * itemWidth)
      setRouletteOffset(targetOffset)
      await sleep(2500)

      setCurrentSpinTicket(spinTicketNum)

      setSemifinalHits(prev => {
        const next = new Map(prev)
        next.set(spinTicketNum, spin.hits)
        return next
      })

      if (spin.hits === 3) {
        eliminatedCount++
        const place = eliminatedCount === 1 ? 5 : 4
        eliminatedMap.set(spinTicketNum, place)
        setSemifinalEliminated(new Map(eliminatedMap))
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
      // Bull = LEFT half (190-350°), Bear = RIGHT half (10-170°) based on wheel image
      const baseAngle = turn.result === 'bull' ? 190 + Math.random() * 160 : 10 + Math.random() * 160
      setWheelAngle(prev => prev + 1440 + baseAngle) // 4 rotations + landing angle
      await sleep(3000)
      setWheelSpinning(false)
      setLastResult(turn.result)

      if (turn.result === 'bull') {
        scores[turn.player].bulls++
        if (scores[turn.player].bulls === 3) {
          const takenPlaces = scores.filter(s => s.place !== null).map(s => s.place!)
          const nextPlace = [1, 2, 3].find(p => !takenPlaces.includes(p))!
          scores[turn.player].place = nextPlace
        }
      } else {
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

      <div className="grid grid-cols-4 gap-2 max-w-lg mx-auto">
        {tour1Winners.map((ticket, idx) => (
          <div key={idx} className="aspect-[2/3]" style={{ perspective: '1000px' }}>
            <div
              className="w-full h-full relative transition-transform duration-700"
              style={{
                transformStyle: 'preserve-3d',
                transform: tour1FlippedDrums.has(idx) ? 'rotateY(180deg)' : 'rotateY(0deg)'
              }}
            >
              <div className="absolute inset-0 rounded-xl overflow-hidden" style={{ backfaceVisibility: 'hidden' }}>
                <img src="/icons/karta.png" alt="card" className="w-full h-full object-cover" />
              </div>
              <div
                className={`absolute inset-0 rounded-xl bg-gradient-to-b from-zinc-800 to-zinc-900 border-2 ${
                  tour1SpunDrums.has(idx) ? 'border-[#FFD700] shadow-[0_0_20px_rgba(255,215,0,0.5)]' : 'border-zinc-700'
                } flex flex-col items-center justify-center p-2`}
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                <img src={ticket.player.avatar} alt="" className="w-10 h-10 rounded-full border-2 border-[#FFD700] mb-1" />
                <div className="text-[9px] text-white/80 text-center truncate w-full">{ticket.player.name}</div>
                <div className="text-xs font-bold text-[#FFD700]">#{ticket.ticket_number}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  // ==================== RENDER TOUR 2 ====================
  const renderTour2 = () => (
    <div className="min-h-screen bg-[#0a0a0a] pt-[100px] pb-8 px-4">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-black text-[#FFD700]">ВТОРОЙ ТУР</h1>
        <p className="text-white/60 text-sm mt-2">Выбираем ТОП-5 финалистов</p>
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

      <div className="grid grid-cols-4 gap-2 max-w-lg mx-auto">
        {tour2Cards.map((ticket, idx) => {
          const result = tour2Results.get(idx)
          return (
            <div
              key={idx}
              className={`rounded-xl bg-zinc-900 border-2 p-2 flex flex-col items-center transition-all duration-500 ${
                result === 'green' ? 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]' :
                result === 'red' ? 'border-red-500 opacity-40' : 'border-zinc-700'
              }`}
            >
              <div className={`w-full h-1.5 rounded-full mb-2 transition-all ${
                result === 'green' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' :
                result === 'red' ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-zinc-700'
              }`} />
              <img src={ticket.player.avatar} alt="" className="w-10 h-10 rounded-full border border-zinc-600 mb-1" />
              <div className="text-[9px] text-white/70 truncate w-full text-center">{ticket.player.name}</div>
              <div className="text-xs font-bold text-[#FFD700]">#{ticket.ticket_number}</div>
            </div>
          )
        })}
      </div>
    </div>
  )

  // ==================== RENDER SEMIFINAL (REDESIGNED) ====================
  const renderSemifinal = () => {
    const getIndicatorClass = (hits: number) => {
      if (hits === 0) return 'bg-zinc-700'
      if (hits === 1) return 'bg-gradient-to-r from-green-500 to-emerald-400 shadow-[0_0_12px_#22c55e] animate-pulse'
      if (hits === 2) return 'bg-gradient-to-r from-yellow-500 to-amber-400 shadow-[0_0_12px_#eab308] animate-pulse'
      return 'bg-gradient-to-r from-red-500 to-red-600 shadow-[0_0_12px_#ef4444] animate-pulse'
    }

    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-[100px] pb-8 px-4">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-black text-[#FFD700]">ПОЛУФИНАЛ</h1>
          <p className="text-white/60 text-sm">Обратный светофор</p>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_6px_#22c55e]" />
            <span className="text-xs text-white/70">1-й штраф</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_6px_#eab308]" />
            <span className="text-xs text-white/70">2-й штраф</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_6px_#ef4444]" />
            <span className="text-xs text-white/70">ВЫЛЕТ</span>
          </div>
        </div>

        {/* Player Cards - EQUAL WIDTH with flex: 1 like vanilla */}
        <div className="flex gap-2 mb-6 px-2">
          {semifinalPlayers.map((ticket) => {
            const hits = semifinalHits.get(ticket.ticket_number) || 0
            const eliminated = semifinalEliminated.get(ticket.ticket_number)
            const isCurrentSpin = currentSpinTicket === ticket.ticket_number

            return (
              <div
                key={ticket.ticket_number}
                style={{ flex: 1, minWidth: 0 }}
                className={`rounded-xl p-1.5 border-2 transition-all duration-500 flex flex-col items-center ${
                  eliminated ? 'border-red-500 bg-red-500/10' :
                  isCurrentSpin ? 'border-[#FFD700] bg-[#FFD700]/10 scale-105' :
                  'border-zinc-700 bg-zinc-900/80'
                }`}
              >
                {/* Traffic Light Indicator */}
                <div className={`w-full h-1.5 rounded-full mb-1.5 transition-all duration-500 ${getIndicatorClass(hits)}`} />

                <img
                  src={ticket.player.avatar}
                  alt=""
                  className={`w-10 h-10 rounded-full border-2 mb-1 object-cover ${
                    eliminated ? 'border-red-500 grayscale' :
                    isCurrentSpin ? 'border-[#FFD700]' : 'border-white/30'
                  }`}
                />
                <div className="text-[8px] text-white/70 text-center truncate w-full leading-tight">{ticket.player.name}</div>
                <div className="text-[10px] font-bold text-[#FFD700] text-center">#{ticket.ticket_number}</div>

                {eliminated && (
                  <div className="text-[8px] font-bold text-red-400 text-center mt-0.5 bg-red-500/20 rounded py-0.5 w-full">
                    {eliminated} МЕСТО
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Roulette */}
        <div className="relative mb-6">
          {/* Cursor - ABOVE the strip with smooth animation */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex justify-center mb-2"
          >
            <img src="/icons/Cursor.png" alt="cursor" className="w-8 h-8 drop-shadow-[0_0_15px_rgba(255,215,0,0.8)]" />
          </motion.div>

          {/* Roulette Strip Container */}
          <div className="bg-zinc-900/90 border-2 border-[#FFD700]/30 rounded-2xl py-3 overflow-hidden">
            <div
              className="flex transition-transform duration-[2.5s] ease-out"
              style={{
                gap: '12px',
                transform: `translateX(calc(50% + ${rouletteOffset}px - 50px))`
              }}
            >
              {Array(10).fill(null).flatMap((_, repIdx) =>
                semifinalPlayers.map((t, tIdx) => {
                  const hits = semifinalHits.get(t.ticket_number) || 0
                  const hitClass = hits === 1 ? 'border-green-500 bg-green-500/20 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.5)]' :
                                   hits === 2 ? 'border-yellow-500 bg-yellow-500/20 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.5)]' :
                                   hits === 3 ? 'border-red-500 bg-red-500/20 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.5)]' :
                                   'border-[#FFD700]/30 bg-zinc-800/50 text-white'

                  return (
                    <div
                      key={`${repIdx}-${tIdx}`}
                      className={`flex-shrink-0 w-[100px] h-14 rounded-xl border-2 flex items-center justify-center font-bold text-lg transition-all ${hitClass}`}
                    >
                      #{t.ticket_number}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Prize Cards */}
        {showSemifinalPrizes && (
          <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
            {[5, 4].map(place => {
              const ticketNum = [...semifinalEliminated.entries()].find(([_, p]) => p === place)?.[0]
              const player = ticketNum ? semifinalPlayers.find(t => t.ticket_number === ticketNum) : null

              return (
                <div key={place} className="bg-zinc-900 rounded-xl p-4 border border-[#FFD700]/30 text-center">
                  <div className="w-14 h-14 mx-auto rounded-full bg-zinc-800 border-2 border-[#FFD700]/50 flex items-center justify-center mb-2 overflow-hidden">
                    {player ? (
                      <img src={player.player.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl text-[#FFD700]">?</span>
                    )}
                  </div>
                  <div className="text-lg font-bold text-white">{place} МЕСТО</div>
                  {player && <div className="text-xs text-[#FFD700] mt-1">{player.player.name}</div>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ==================== RENDER FINAL (REDESIGNED) ====================
  const renderFinal = () => (
    <div className="min-h-screen bg-[#0a0a0a] pt-[100px] pb-8 px-4">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-black text-[#FFD700]">ФИНАЛ</h1>
        <p className="text-white/60 text-sm">Битва быка и медведя</p>
      </div>

      {/* Players */}
      <div className="flex justify-center items-end gap-6 mb-8">
        {finalPlayers.map((ticket, idx) => {
          const score = finalScores[idx]
          const isCurrent = currentFinalPlayer === idx
          const orderNum = finalTurnOrder.indexOf(idx) + 1

          return (
            <div key={idx} className="flex flex-col items-center">
              {/* Avatar with order badge */}
              <div className="relative mb-2">
                <img
                  src={ticket.player.avatar}
                  alt=""
                  className={`w-20 h-20 rounded-full border-3 transition-all duration-300 ${
                    isCurrent ? 'border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.7)] scale-110' :
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
              <div className={`px-4 py-2 rounded-xl text-center mb-2 min-w-[90px] ${
                score?.place === 1 ? 'bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black font-bold shadow-[0_0_20px_rgba(255,215,0,0.6)]' :
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
                      className={`w-8 h-8 rounded-lg flex items-center justify-center border-2 transition-all ${
                        (score?.bulls || 0) > i
                          ? 'bg-gradient-to-br from-green-500 to-emerald-600 border-green-400 shadow-[0_0_10px_rgba(34,197,94,0.5)]'
                          : 'bg-zinc-900 border-zinc-700'
                      }`}
                    >
                      <img src="/icons/bull.png" alt="bull" className="w-5 h-5" />
                    </div>
                  ))}
                </div>
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div
                      key={`bear-${i}`}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center border-2 transition-all ${
                        (score?.bears || 0) > i
                          ? 'bg-gradient-to-br from-red-500 to-red-700 border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                          : 'bg-zinc-900 border-zinc-700'
                      }`}
                    >
                      <img src="/icons/bear.png" alt="bear" className="w-5 h-5" />
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
            className={`rounded-2xl p-4 flex items-center gap-4 border-2 ${
              winner.place === 1 ? 'bg-gradient-to-r from-[#FFD700]/20 to-[#FFA500]/10 border-[#FFD700] shadow-[0_0_20px_rgba(255,215,0,0.3)]' :
              winner.place === 2 ? 'bg-zinc-900/80 border-gray-400' :
              winner.place === 3 ? 'bg-zinc-900/80 border-amber-600' :
              'bg-zinc-900/80 border-zinc-700'
            }`}
          >
            <div className={`text-2xl font-black w-12 h-12 rounded-xl flex items-center justify-center ${
              winner.place === 1 ? 'bg-gradient-to-br from-[#FFD700] to-[#FFA500] text-black' :
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
      {currentStage === 'tour2' && renderTour2()}
      {currentStage === 'semifinal' && renderSemifinal()}
      {currentStage === 'final' && renderFinal()}
      {currentStage === 'results' && renderResults()}
      {renderConfetti()}
    </div>
  )
}
