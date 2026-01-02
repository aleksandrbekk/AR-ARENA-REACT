// LiveArenaPage.tsx - ТОЧНАЯ КОПИЯ vanilla livearena-v11.html
import { useState, useEffect } from 'react'
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

interface Winner {
  place: number
  name: string
  avatar: string
  prize: number
  ticket_number: number
}

interface ModalConfig {
  title: string
  duration: number
  stats?: { label: string; value: string | number }[]
  goal?: string
}

// ==================== MAIN COMPONENT ====================
export function LiveArenaPage() {
  const { id: giveawayId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)

  // UI State
  const [currentStage, setCurrentStage] = useState<'loading' | 'modal' | 'cards' | 'results'>('loading')
  const [modalConfig, setModalConfig] = useState<ModalConfig | null>(null)
  const [modalTimer, setModalTimer] = useState(0)

  // Cards state
  const [displayedTickets, setDisplayedTickets] = useState<Ticket[]>([])
  const [cardSize, setCardSize] = useState<'small' | 'medium' | 'large' | 'winner'>('small')
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set())
  const [selectedCards, setSelectedCards] = useState<Set<number>>(new Set())
  const [eliminatedCards, setEliminatedCards] = useState<Set<number>>(new Set())
  const [winnerCards, setWinnerCards] = useState<Map<number, { place: number; prize: number }>>(new Map())
  const [placeStyles, setPlaceStyles] = useState<Map<number, number>>(new Map())

  // Prize banner
  const [prizeBanner, setPrizeBanner] = useState<{ place: number; amount: number } | null>(null)

  // Winners
  const [winners, setWinners] = useState<Winner[]>([])

  // Confetti
  const [showConfetti, setShowConfetti] = useState(false)

  // ==================== LOAD DATA ====================
  useEffect(() => {
    if (giveawayId) loadData()
  }, [giveawayId])

  const loadData = async () => {
    try {
      // Load giveaway
      const { data: giveaway, error: gError } = await supabase
        .from('giveaways')
        .select('*')
        .eq('id', giveawayId)
        .single()

      if (gError || !giveaway) throw new Error('Розыгрыш не найден')

      // Load tickets
      const { data: tickets, error: tError } = await supabase
        .from('giveaway_tickets')
        .select('*')
        .eq('giveaway_id', giveawayId)

      if (tError) throw tError

      // Get unique user IDs
      const uniqueUserIds = [...new Set((tickets || []).map(t => t.user_id))]

      // Load users
      const { data: users } = await supabase
        .from('users')
        .select('telegram_id, username, first_name, photo_url')
        .in('telegram_id', uniqueUserIds)

      // Create player map
      const playerMap: Record<string, Player> = {}
      for (const user of users || []) {
        const displayName = user.username || user.first_name || `User ${user.telegram_id}`
        playerMap[user.telegram_id] = {
          id: user.telegram_id,
          name: displayName,
          avatar: user.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=FFD700&color=000&size=128`
        }
      }

      // Create tickets with player data
      const ticketsWithPlayers: Ticket[] = (tickets || []).map(t => ({
        user_id: t.user_id,
        ticket_number: t.ticket_number,
        player: playerMap[t.user_id] || {
          id: t.user_id,
          name: `User ${t.user_id}`,
          avatar: `https://ui-avatars.com/api/?name=User&background=FFD700&color=000&size=128`
        }
      }))

      setLoading(false)

      // Start the draw
      runDraw(ticketsWithPlayers, Object.values(playerMap), giveaway)

    } catch (error: any) {
      console.error('Error loading data:', error)
      alert('Ошибка загрузки: ' + error.message)
      navigate('/giveaways')
    }
  }

  // ==================== HELPERS ====================
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

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

  // ==================== SHOW MODAL ====================
  const showModal = async (config: ModalConfig): Promise<void> => {
    return new Promise(resolve => {
      setModalConfig(config)
      setModalTimer(config.duration / 1000)
      setCurrentStage('modal')

      let timer = config.duration / 1000
      const interval = setInterval(() => {
        timer--
        setModalTimer(timer)
        if (timer <= 0) {
          clearInterval(interval)
          setCurrentStage('cards')
          resolve()
        }
      }, 1000)
    })
  }

  // ==================== RUN DRAW ====================
  const runDraw = async (tickets: Ticket[], players: Player[], giveaway: any) => {
    const seed = giveawayId ? parseInt(giveawayId.replace(/\D/g, '').slice(0, 8)) || 12345 : 12345
    const winnersArr: Winner[] = []

    // Get prizes from giveaway data
    const prizes = giveaway.prizes || [
      { place: 1, amount: 500 },
      { place: 2, amount: 300 },
      { place: 3, amount: 200 },
      { place: 4, amount: 150 },
      { place: 5, amount: 100 },
      { place: 6, amount: 50 }
    ]
    const getPrize = (place: number) => {
      const p = prizes.find((pr: any) => pr.place === place)
      return p?.amount || 0
    }

    // ===== STAGE 1: Modal - First Tour =====
    await showModal({
      title: 'ПЕРВЫЙ ТУР',
      duration: 3000,
      stats: [
        { label: 'Участников розыгрыша', value: players.length },
        { label: 'Куплено билетов', value: tickets.length }
      ],
      goal: 'Сейчас мы выберем 20 счастливчиков, которые пройдут в следующий тур! Удача решает всё 🎯'
    })

    // ===== STAGE 2: Show all tickets, select 20 =====
    setDisplayedTickets(tickets)
    setCardSize('small')
    setFlippedCards(new Set())
    setSelectedCards(new Set())
    setEliminatedCards(new Set())
    setWinnerCards(new Map())
    setPlaceStyles(new Map())

    await sleep(500)

    // Shuffle and select 20
    const shuffled1 = shuffleWithSeed(tickets, seed)
    const selected20 = shuffled1.slice(0, Math.min(20, shuffled1.length))
    const selected20Numbers = new Set(selected20.map(t => t.ticket_number))

    // Blink animation (just wait)
    await sleep(2000)

    // Flip and highlight selected
    for (const ticket of selected20) {
      setFlippedCards(prev => new Set([...prev, ticket.ticket_number]))
      await sleep(150)
    }
    await sleep(500)
    setSelectedCards(selected20Numbers)
    await sleep(2000)

    // ===== STAGE 3: Modal - Second Tour =====
    await showModal({
      title: 'ВТОРОЙ ТУР',
      duration: 3000,
      goal: '20 счастливчиков уже выбраны! Теперь определим топ-6 финалистов, которые разделят призовой фонд 💰'
    })

    // ===== STAGE 4: Show 20, eliminate to 6 =====
    setDisplayedTickets(selected20)
    setCardSize('medium')
    setFlippedCards(new Set())
    setSelectedCards(new Set())
    setEliminatedCards(new Set())

    await sleep(500)

    // Shuffle and select 6
    const shuffled2 = shuffleWithSeed(selected20, seed + 100)
    const selected6 = shuffled2.slice(0, Math.min(6, shuffled2.length))
    const selected6Numbers = new Set(selected6.map(t => t.ticket_number))
    const eliminated = shuffled2.slice(6)

    // Blink
    await sleep(2000)

    // Flip ALL cards
    for (const ticket of selected20) {
      setFlippedCards(prev => new Set([...prev, ticket.ticket_number]))
      await sleep(80)
    }
    await sleep(500)

    // Mark eliminated
    for (const ticket of eliminated) {
      setEliminatedCards(prev => new Set([...prev, ticket.ticket_number]))
      await sleep(100)
    }
    await sleep(500)

    // Highlight kept
    setSelectedCards(selected6Numbers)
    await sleep(2000)

    // ===== STAGE 5: Modal - Places 4-6 =====
    await showModal({
      title: 'РОЗЫГРЫШ МЕСТ 4-6',
      duration: 3000,
      goal: 'Топ-6 определён! 🎉 Начинаем розыгрыш призовых мест. Каждый из этих счастливчиков получит свою награду!'
    })

    // ===== STAGE 6-8: Draw places 6, 5, 4 =====
    let remainingTickets = [...selected6]
    setDisplayedTickets(remainingTickets)
    setCardSize('large')
    setFlippedCards(new Set())
    setSelectedCards(new Set())
    setEliminatedCards(new Set())
    setWinnerCards(new Map())
    setPlaceStyles(new Map())

    await sleep(500)

    // Draw place 6
    remainingTickets = await drawPlace(remainingTickets, 6, getPrize(6), seed + 6, winnersArr)
    await sleep(1000)

    // Draw place 5
    remainingTickets = await drawPlace(remainingTickets, 5, getPrize(5), seed + 5, winnersArr)
    await sleep(1000)

    // Draw place 4
    remainingTickets = await drawPlace(remainingTickets, 4, getPrize(4), seed + 4, winnersArr)
    await sleep(1000)

    // ===== STAGE 9: Modal - Final TOP-3 =====
    await showModal({
      title: 'ФИНАЛ — ТОП-3',
      duration: 3000,
      goal: 'Остались последние 3 участника! 🔥 Сейчас решится, кто заберёт главные призы розыгрыша. Барабанная дробь... 🥁'
    })

    // ===== STAGE 10: Draw places 3, 2, 1 =====
    setDisplayedTickets(remainingTickets)
    setCardSize('winner')
    setFlippedCards(new Set())
    setSelectedCards(new Set())
    setEliminatedCards(new Set())
    setWinnerCards(new Map())
    setPlaceStyles(new Map())

    await sleep(500)

    // Draw place 3
    remainingTickets = await drawPlace(remainingTickets, 3, getPrize(3), seed + 3, winnersArr)
    await sleep(1500)

    // Draw place 2
    remainingTickets = await drawPlace(remainingTickets, 2, getPrize(2), seed + 2, winnersArr)
    await sleep(1500)

    // Draw place 1
    remainingTickets = await drawPlace(remainingTickets, 1, getPrize(1), seed + 1, winnersArr)
    await sleep(1000)

    // Confetti!
    setShowConfetti(true)
    await sleep(3000)

    // ===== STAGE 11: Results =====
    setWinners(winnersArr.sort((a, b) => a.place - b.place))
    setCurrentStage('results')
  }

  // ==================== DRAW PLACE ====================
  const drawPlace = async (
    tickets: Ticket[],
    place: number,
    prize: number,
    seed: number,
    winnersArr: Winner[]
  ): Promise<Ticket[]> => {
    // Show prize banner
    setPrizeBanner({ place, amount: prize })

    // Shuffle to get winner
    const shuffled = shuffleWithSeed(tickets, seed)
    const winner = shuffled[0]

    // Blink animation
    await sleep(2000)

    // Apply place styling BEFORE flip
    setPlaceStyles(prev => new Map(prev).set(winner.ticket_number, place))

    // Flip winner card
    setFlippedCards(prev => new Set([...prev, winner.ticket_number]))
    await sleep(800)

    // Show winner info on card
    setWinnerCards(prev => new Map(prev).set(winner.ticket_number, { place, prize }))
    await sleep(2000)

    // Save winner
    winnersArr.push({
      place,
      name: winner.player.name,
      avatar: winner.player.avatar,
      prize,
      ticket_number: winner.ticket_number
    })

    // Hide prize banner
    setPrizeBanner(null)

    // Flip card back
    setFlippedCards(prev => {
      const next = new Set(prev)
      next.delete(winner.ticket_number)
      return next
    })
    await sleep(800)

    // Remove winner from display
    const remaining = tickets.filter(t => t.ticket_number !== winner.ticket_number)
    setDisplayedTickets(remaining)

    return remaining
  }

  // ==================== RENDER MODAL ====================
  const renderModal = () => {
    if (!modalConfig) return null

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-[#0a0a0a]/98 z-50 flex items-center justify-center p-4"
      >
        <div className="bg-gradient-to-br from-zinc-900/95 to-zinc-950/98 backdrop-blur-xl rounded-3xl border-2 border-[#FFD700]/30 p-8 max-w-md w-full text-center shadow-2xl">
          {/* Icon */}
          <div className="w-20 h-20 mx-auto mb-5">
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_20px_rgba(255,215,0,0.6)]">
              <rect x="30" y="40" width="40" height="30" fill="#FFD700" rx="4"/>
              <path d="M50 20 L50 40 M40 30 L60 30" stroke="#FFD700" strokeWidth="3" strokeLinecap="round"/>
              <circle cx="50" cy="55" r="8" fill="#FFA500"/>
              <rect x="32" y="42" width="36" height="3" fill="#FFA500"/>
              <rect x="32" y="65" width="36" height="3" fill="#FFA500"/>
            </svg>
          </div>

          {/* Title */}
          <h2 className="text-3xl font-black mb-4 bg-gradient-to-r from-red-500 via-red-400 to-red-600 bg-clip-text text-transparent uppercase tracking-wider">
            {modalConfig.title}
          </h2>

          {/* Timer */}
          <div className="text-7xl font-black text-[#FFD700] my-6 animate-pulse drop-shadow-[0_0_40px_rgba(255,215,0,0.8)]">
            {modalTimer}
          </div>

          {/* Stats */}
          {modalConfig.stats && (
            <div className="bg-black/40 rounded-2xl p-5 my-5 border border-[#FFD700]/20">
              {modalConfig.stats.map((stat, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-[#FFD700]/10 last:border-0">
                  <span className="text-white/70 font-semibold">{stat.label}</span>
                  <span className="text-xl font-black text-[#FFD700]">{stat.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Goal */}
          {modalConfig.goal && (
            <div className="text-base leading-relaxed text-white/95 mt-5 p-5 bg-[#FFD700]/10 rounded-xl border border-[#FFD700]/30">
              {modalConfig.goal}
            </div>
          )}
        </div>
      </motion.div>
    )
  }

  // ==================== RENDER CARD ====================
  const renderCard = (ticket: Ticket) => {
    const isFlipped = flippedCards.has(ticket.ticket_number)
    const isSelected = selectedCards.has(ticket.ticket_number)
    const isEliminated = eliminatedCards.has(ticket.ticket_number)
    const winnerInfo = winnerCards.get(ticket.ticket_number)
    const placeStyle = placeStyles.get(ticket.ticket_number)

    // Place-based gradient styles
    const getPlaceGradient = (place: number) => {
      switch (place) {
        case 1: return 'bg-gradient-to-br from-[#FFD700] via-[#FFED4E] to-[#FFA500]'
        case 2: return 'bg-gradient-to-br from-[#C0C0C0] via-[#E8E8E8] to-[#A8A8A8]'
        case 3: return 'bg-gradient-to-br from-[#CD7F32] via-[#E6A45B] to-[#B8722D]'
        default: return 'bg-gradient-to-br from-[#667EEA] via-[#764BA2] to-[#5568D3]'
      }
    }

    const getTextColor = (place: number) => {
      return place <= 2 ? 'text-black' : 'text-white'
    }

    return (
      <motion.div
        key={ticket.ticket_number}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className="relative aspect-[2/3]"
        style={{ perspective: '1000px' }}
      >
        <div
          className={`relative w-full h-full transition-transform duration-700`}
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
          }}
        >
          {/* Back of card */}
          <div
            className="absolute inset-0 rounded-2xl flex items-center justify-center"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <img
              src="/icons/karta.png"
              alt="Card"
              className="w-full h-full object-contain drop-shadow-[0_4px_16px_rgba(255,215,0,0.3)]"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 150"%3E%3Crect fill="%23FFD700" width="100" height="150" rx="8"/%3E%3Ctext x="50" y="80" font-size="40" text-anchor="middle" fill="%23000"%3E?%3C/text%3E%3C/svg%3E'
              }}
            />
          </div>

          {/* Front of card */}
          <div
            className={`absolute inset-0 rounded-2xl p-2 flex flex-col items-center justify-center border-2 ${
              placeStyle ? getPlaceGradient(placeStyle) : 'bg-gradient-to-br from-zinc-900 to-zinc-950'
            } ${
              isSelected && !isEliminated ? 'border-green-400 shadow-[0_0_30px_rgba(56,239,125,0.8)]' :
              isEliminated ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.8)]' :
              placeStyle ? 'border-[#FFD700]/60' : 'border-[#FFD700]/50'
            }`}
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)'
            }}
          >
            {/* Ticket badge */}
            <div className={`px-3 py-1 rounded-lg mb-2 ${placeStyle ? 'bg-black/20' : 'bg-[#FFD700]/15'} border ${placeStyle ? 'border-black/30' : 'border-[#FFD700]/60'}`}>
              <span className={`text-xs font-bold ${placeStyle ? getTextColor(placeStyle) : 'text-[#FFD700]'}`}>
                #{ticket.ticket_number}
              </span>
            </div>

            {/* Avatar */}
            <img
              src={ticket.player.avatar}
              alt={ticket.player.name}
              className={`w-10 h-10 rounded-full mb-2 border-2 ${placeStyle ? (placeStyle <= 2 ? 'border-black' : 'border-white') : 'border-[#FFD700]'} object-cover shadow-lg`}
            />

            {/* Name */}
            <div className={`text-xs font-semibold text-center mb-1 line-clamp-2 ${placeStyle ? getTextColor(placeStyle) : 'text-white/95'}`}>
              {ticket.player.name}
            </div>

            {/* Winner info */}
            {winnerInfo && (
              <>
                <div className={`text-sm font-black ${placeStyle ? getTextColor(placeStyle) : 'text-[#FFD700]'}`}>
                  {winnerInfo.place} МЕСТО
                </div>
                <div className={`text-lg font-black ${placeStyle ? getTextColor(placeStyle) : 'text-[#FFD700]'}`}>
                  {winnerInfo.prize} AR
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>
    )
  }

  // ==================== RENDER CARDS GRID ====================
  const renderCardsGrid = () => {
    const gridClass = {
      small: 'grid-cols-4 gap-2',
      medium: 'grid-cols-4 gap-2.5',
      large: 'grid-cols-3 gap-3 max-w-[80%]',
      winner: 'grid-cols-3 gap-4 max-w-[70%]'
    }[cardSize]

    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-[80px] pb-24 px-4 flex items-center justify-center">
        <div className={`grid ${gridClass} w-[90%] mx-auto`}>
          <AnimatePresence>
            {displayedTickets.map(ticket => renderCard(ticket))}
          </AnimatePresence>
        </div>

        {/* Prize Banner */}
        <AnimatePresence>
          {prizeBanner && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-0 left-0 right-0 p-5 text-center z-40 border-t-2 border-[#FFD700]/30 backdrop-blur-xl"
              style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(10,10,10,0.95) 20%, rgba(10,10,10,0.98) 100%)' }}
            >
              <div className="text-lg font-bold text-white/90 mb-2">
                Разыгрываем {prizeBanner.place === 1 ? '1-е' : prizeBanner.place === 2 ? '2-е' : prizeBanner.place === 3 ? '3-е' : `${prizeBanner.place}-е`} место
              </div>
              <div className="text-3xl font-black bg-gradient-to-r from-[#FFD700] via-[#FFED4E] to-[#FFA500] bg-clip-text text-transparent">
                {prizeBanner.amount} AR
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // ==================== RENDER RESULTS ====================
  const renderResults = () => {
    const getPlaceStyle = (place: number) => {
      switch (place) {
        case 1: return 'bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black'
        case 2: return 'bg-gradient-to-r from-[#C0C0C0] to-[#E8E8E8] text-black'
        case 3: return 'bg-gradient-to-r from-[#CD7F32] to-[#E6A45B] text-white'
        default: return 'bg-gradient-to-r from-[#667EEA] to-[#764BA2] text-white'
      }
    }

    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-[80px] pb-8 px-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-4xl font-black text-center mb-8 bg-gradient-to-r from-[#FFD700] to-[#FFA500] bg-clip-text text-transparent">
            🏆 ПОБЕДИТЕЛИ 🏆
          </h1>

          <div className="space-y-4">
            {winners.map((winner, i) => (
              <motion.div
                key={winner.place}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-gradient-to-br from-zinc-900/80 to-zinc-950/90 rounded-2xl p-5 border-2 border-[#FFD700]/30 flex items-center gap-4 shadow-xl"
              >
                <div className={`text-3xl font-black w-16 h-16 rounded-xl flex items-center justify-center ${getPlaceStyle(winner.place)}`}>
                  {winner.place}
                </div>
                <img
                  src={winner.avatar}
                  alt={winner.name}
                  className="w-14 h-14 rounded-full border-2 border-[#FFD700] object-cover"
                />
                <div className="flex-1">
                  <div className="text-lg font-bold text-white">{winner.name}</div>
                  <div className="text-2xl font-black text-[#FFD700]">{winner.prize} AR</div>
                </div>
              </motion.div>
            ))}
          </div>

          <button
            onClick={() => navigate(`/giveaway/${giveawayId}`)}
            className="w-full mt-8 py-4 rounded-2xl font-black text-black uppercase tracking-wide bg-gradient-to-r from-[#FFD700] via-[#FFED4E] to-[#FFA500] shadow-[0_8px_24px_rgba(255,215,0,0.6)] hover:shadow-[0_12px_32px_rgba(255,215,0,0.8)] transition-shadow"
          >
            Вернуться к розыгрышам
          </button>
        </div>
      </div>
    )
  }

  // ==================== RENDER CONFETTI ====================
  const renderConfetti = () => {
    if (!showConfetti) return null

    const particles = Array.from({ length: 100 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 2,
      color: ['#FFD700', '#FFA500', '#FFED4E', '#FFCC00'][Math.floor(Math.random() * 4)]
    }))

    return (
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {particles.map(p => (
          <motion.div
            key={p.id}
            initial={{ y: -20, x: `${p.x}vw`, opacity: 1 }}
            animate={{ y: '110vh', opacity: 0 }}
            transition={{ duration: p.duration, delay: p.delay, ease: 'linear' }}
            className="absolute w-3 h-3"
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
      <AnimatePresence mode="wait">
        {currentStage === 'modal' && renderModal()}
      </AnimatePresence>

      {currentStage === 'cards' && renderCardsGrid()}
      {currentStage === 'results' && renderResults()}
      {renderConfetti()}
    </div>
  )
}
