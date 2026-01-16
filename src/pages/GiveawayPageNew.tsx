import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { motion } from 'framer-motion'
import { BuyTicketModal } from '../components/giveaways/BuyTicketModal'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useGiveaways } from '../hooks/useGiveaways'
import type { Giveaway } from '../types'

export function GiveawayPageNew() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { telegramUser } = useAuth()
  const { getGiveawayStats } = useGiveaways()

  // State
  const [giveaway, setGiveaway] = useState<Giveaway | null>(null)
  const [loading, setLoading] = useState(true)
  const [myTickets, setMyTickets] = useState(0)
  const [participantsCount, setParticipantsCount] = useState(0)
  const [totalTickets, setTotalTickets] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [isEnded, setIsEnded] = useState(false)
  const [timeLeft, setTimeLeft] = useState({ days: '00', hours: '00', minutes: '00', seconds: '00' })

  // Data fetching
  const fetchGiveaway = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const { data } = await supabase
      .from('giveaways')
      .select('*')
      .eq('id', id)
      .single()
    if (data) setGiveaway(data)
    setLoading(false)
  }, [id])

  const fetchStats = useCallback(async () => {
    if (!id) return
    const stats = await getGiveawayStats(id)
    setParticipantsCount(stats.participants_count)
    setTotalTickets(stats.total_tickets || 0)
  }, [id, getGiveawayStats])

  const fetchMyTickets = useCallback(async () => {
    if (!telegramUser || !id) return
    const { data } = await supabase
      .from('giveaway_tickets')
      .select('ticket_count')
      .eq('giveaway_id', id)
      .eq('telegram_id', telegramUser.id.toString())
      .single()
    if (data) setMyTickets(data.ticket_count || 0)
  }, [telegramUser, id])

  useEffect(() => {
    if (id) {
      fetchGiveaway()
      fetchStats()
      if (telegramUser) fetchMyTickets()
    }
  }, [id, telegramUser, fetchGiveaway, fetchStats, fetchMyTickets])

  // Timer + check ended
  useEffect(() => {
    if (!giveaway?.end_date) return

    const updateTimer = () => {
      const difference = +new Date(giveaway.end_date) - +new Date()
      const ended = difference <= 0
      setIsEnded(ended)

      if (ended) {
        setTimeLeft({ days: '00', hours: '00', minutes: '00', seconds: '00' })
        if (giveaway.status === 'active') {
          setTimeout(() => navigate(`/giveaway/${id}/results`), 3000)
        }
      } else {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)).toString().padStart(2, '0'),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24).toString().padStart(2, '0'),
          minutes: Math.floor((difference / 1000 / 60) % 60).toString().padStart(2, '0'),
          seconds: Math.floor((difference / 1000) % 60).toString().padStart(2, '0')
        })
      }
    }

    updateTimer()
    const timer = setInterval(updateTimer, 1000)
    return () => clearInterval(timer)
  }, [giveaway?.end_date, giveaway?.status, id, navigate])

  const handleBuySuccess = () => {
    fetchGiveaway()
    fetchMyTickets()
    fetchStats()
  }

  const isActive = giveaway?.status === 'active'
  const isCompleted = giveaway?.status === 'completed'

  // Win chance
  const winChance = totalTickets > 0 && myTickets > 0
    ? ((myTickets / totalTickets) * 100).toFixed(1)
    : '0'

  // Loading state
  if (loading) {
    return (
      <Layout hideNavbar>
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-[#FFD700]/20 border-t-[#FFD700] rounded-full animate-spin" />
        </div>
      </Layout>
    )
  }

  // Not found state
  if (!giveaway) {
    return (
      <Layout hideNavbar>
        <div className="min-h-screen bg-black flex flex-col items-center justify-center">
          <p className="text-white/50 mb-4">Розыгрыш не найден</p>
          <button onClick={() => navigate('/giveaways')} className="text-[#FFD700]">
            Назад к розыгрышам
          </button>
        </div>
      </Layout>
    )
  }

  const jackpotAmount = giveaway.jackpot_current_amount || giveaway.prices?.ar || 0
  const ticketPrice = giveaway.prices?.ar ?? giveaway.price ?? 100

  return (
    <Layout hideNavbar>
      <div className="min-h-screen bg-black relative overflow-hidden">

        {/* Premium Background */}
        <div className="absolute inset-0">
          {/* Golden radial glow at top */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#FFD700]/8 blur-[120px] rounded-full" />
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 opacity-[0.02]" style={{
            backgroundImage: `linear-gradient(rgba(255,215,0,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,215,0,0.3) 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }} />
        </div>

        {/* Main Content */}
        <div className="relative z-10 px-5 pt-6 pb-32">

          {/* Hero: Icon + Jackpot */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            {/* Slot Icon */}
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 bg-[#FFD700]/30 blur-2xl rounded-full animate-pulse" />
              <img src="/icons/SLOT.png" alt="" className="relative w-full h-full object-contain" />
            </div>

            {/* Jackpot Label */}
            <div className="text-[#FFD700]/60 text-xs font-bold tracking-[0.3em] uppercase mb-2">
              Джекпот
            </div>

            {/* Jackpot Amount */}
            <div className="relative">
              <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-[#FFD700] via-[#FFED4A] to-[#FFA500]">
                {jackpotAmount.toLocaleString()}
              </h1>
              <div className="absolute inset-0 text-6xl font-black text-[#FFD700] blur-2xl opacity-40 -z-10">
                {jackpotAmount.toLocaleString()}
              </div>
            </div>

            {/* AR Label */}
            <div className="flex items-center justify-center gap-2 mt-2">
              <img src="/icons/arcoin.png" alt="" className="w-5 h-5" />
              <span className="text-white/60 text-sm font-semibold">AR</span>
            </div>

            {/* Title */}
            <h2 className="text-white text-lg font-bold mt-4">{giveaway.title}</h2>
            {giveaway.subtitle && (
              <p className="text-white/40 text-sm mt-1">{giveaway.subtitle}</p>
            )}
          </motion.div>

          {/* Timer Section */}
          {isActive && !isEnded && giveaway.end_date && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-6"
            >
              <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-900/70 backdrop-blur-xl rounded-3xl p-5 border border-white/5">
                <div className="text-center text-white/40 text-xs font-semibold uppercase tracking-wider mb-4">
                  До розыгрыша
                </div>

                <div className="flex justify-center gap-3">
                  <TimeBlock value={timeLeft.days} label="дней" />
                  <TimeSeparator />
                  <TimeBlock value={timeLeft.hours} label="часов" />
                  <TimeSeparator />
                  <TimeBlock value={timeLeft.minutes} label="минут" />
                  <TimeSeparator />
                  <TimeBlock value={timeLeft.seconds} label="секунд" isActive />
                </div>
              </div>
            </motion.div>
          )}

          {/* Stats Row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-3 gap-3 mb-6"
          >
            {/* Participants */}
            <div className="bg-zinc-900/70 backdrop-blur-sm rounded-2xl p-4 border border-white/5 text-center">
              <img src="/icons/peaple.png" alt="" className="w-8 h-8 mx-auto mb-2" />
              <div className="text-xl font-black text-white">{participantsCount}</div>
              <div className="text-[9px] text-white/40 uppercase tracking-wider">участников</div>
            </div>

            {/* My Tickets */}
            <div className={`backdrop-blur-sm rounded-2xl p-4 border text-center relative overflow-hidden ${
              myTickets > 0
                ? 'bg-gradient-to-b from-[#FFD700]/20 to-[#FFD700]/5 border-[#FFD700]/30'
                : 'bg-zinc-900/70 border-white/5'
            }`}>
              <img src="/icons/tiket.png" alt="" className="w-8 h-8 mx-auto mb-2" />
              <div className={`text-xl font-black ${myTickets > 0 ? 'text-[#FFD700]' : 'text-white'}`}>
                {myTickets}
              </div>
              <div className={`text-[9px] uppercase tracking-wider ${myTickets > 0 ? 'text-[#FFD700]/60' : 'text-white/40'}`}>
                билетов
              </div>
            </div>

            {/* Win Chance */}
            <div className="bg-zinc-900/70 backdrop-blur-sm rounded-2xl p-4 border border-white/5 text-center">
              <div className="w-8 h-8 mx-auto mb-2 flex items-center justify-center">
                <span className="text-2xl">🎯</span>
              </div>
              <div className={`text-xl font-black ${Number(winChance) > 0 ? 'text-green-400' : 'text-white'}`}>
                {winChance}%
              </div>
              <div className="text-[9px] text-white/40 uppercase tracking-wider">шанс</div>
            </div>
          </motion.div>

          {/* Info Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-3 mb-6"
          >
            {/* How it works */}
            <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl p-4 border border-white/5">
              <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                <span className="text-lg">💡</span> Как это работает
              </h3>
              <div className="space-y-2 text-white/60 text-sm">
                <div className="flex items-start gap-3">
                  <span className="text-[#FFD700] font-bold">1.</span>
                  <span>Покупай билеты за AR монеты</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-[#FFD700] font-bold">2.</span>
                  <span>Чем больше билетов — тем выше шанс</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-[#FFD700] font-bold">3.</span>
                  <span>Победитель получает весь джекпот!</span>
                </div>
              </div>
            </div>

            {/* Prize Pool Info */}
            <div className="bg-gradient-to-r from-[#FFD700]/10 to-transparent backdrop-blur-sm rounded-2xl p-4 border border-[#FFD700]/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🏆</span>
                  <div>
                    <div className="text-white font-bold text-sm">Призовой фонд растёт!</div>
                    <div className="text-white/50 text-xs">50% от каждого билета идёт в джекпот</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[#FFD700] font-black text-lg">{totalTickets}</div>
                  <div className="text-white/40 text-[10px]">всего билетов</div>
                </div>
              </div>
            </div>
          </motion.div>

        </div>

        {/* Fixed Bottom CTA */}
        <div className="fixed bottom-0 left-0 right-0 p-4 pb-8 bg-gradient-to-t from-black via-black/95 to-transparent z-50">
          {isActive && !isEnded && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowModal(true)}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#FFD700] via-[#FFED4A] to-[#FFA500] flex items-center justify-center gap-3 shadow-[0_0_40px_rgba(255,215,0,0.3)]"
            >
              <img src="/icons/tiket.png" alt="" className="w-6 h-6" />
              <span className="text-black font-black text-lg">КУПИТЬ БИЛЕТ</span>
              <div className="h-5 w-px bg-black/20" />
              <span className="text-black/70 font-bold">{ticketPrice} AR</span>
            </motion.button>
          )}

          {isCompleted && (
            <div className="flex gap-3">
              <button
                onClick={() => navigate(`/live/${id}`)}
                className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-red-600 to-red-500 flex items-center justify-center gap-2 font-bold text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]"
              >
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                LIVE
              </button>
              <button
                onClick={() => navigate(`/giveaway/${id}/results`)}
                className="flex-1 h-14 rounded-2xl bg-white text-black font-bold"
              >
                Результаты
              </button>
            </div>
          )}
        </div>

        {/* Modal */}
        <BuyTicketModal
          isOpen={showModal}
          giveaway={giveaway}
          onClose={() => setShowModal(false)}
          onSuccess={handleBuySuccess}
        />
      </div>
    </Layout>
  )
}

// Timer Components
function TimeBlock({ value, label, isActive = false }: { value: string; label: string; isActive?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div className={`
        w-16 h-16 rounded-xl flex items-center justify-center
        ${isActive
          ? 'bg-gradient-to-b from-[#FFD700]/30 to-[#FFD700]/10 border border-[#FFD700]/40'
          : 'bg-zinc-800/80 border border-white/10'
        }
      `}>
        <span className={`text-3xl font-black font-mono ${isActive ? 'text-[#FFD700]' : 'text-white'}`}>
          {value}
        </span>
      </div>
      <span className={`mt-1.5 text-[9px] uppercase tracking-wider ${isActive ? 'text-[#FFD700]/70' : 'text-white/40'}`}>
        {label}
      </span>
    </div>
  )
}

function TimeSeparator() {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 pt-1">
      <div className="w-1.5 h-1.5 rounded-full bg-[#FFD700]/50" />
      <div className="w-1.5 h-1.5 rounded-full bg-[#FFD700]/30" />
    </div>
  )
}
