import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { motion } from 'framer-motion'
import { BuyTicketModal } from '../components/giveaways/BuyTicketModal'
import { PremiumTimer } from '../components/giveaways/PremiumTimer'
import { ParticleBackground } from '../components/giveaways/ParticleBackground'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useGiveaways } from '../hooks/useGiveaways'
import type { Giveaway } from '../types'
import { Ticket, Users, Trophy, ChevronLeft } from 'lucide-react'

// Recent winners - можно загружать из базы
const RECENT_WINNERS = [
  { name: 'Alex***', amount: 12500, date: '05.01' },
  { name: 'Dima***', amount: 8200, date: '02.01' },
  { name: 'Kate***', amount: 15000, date: '29.12' },
  { name: 'Max***', amount: 5600, date: '26.12' },
]

export function GiveawayPageNew() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { telegramUser, gameState } = useAuth()
  const { getGiveawayStats } = useGiveaways()

  // State
  const [giveaway, setGiveaway] = useState<Giveaway | null>(null)
  const [loading, setLoading] = useState(true)
  const [myTickets, setMyTickets] = useState(0)
  const [participantsCount, setParticipantsCount] = useState(0)
  const [totalTickets, setTotalTickets] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [isEnded, setIsEnded] = useState(false)

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

  // Check if ended
  useEffect(() => {
    if (!giveaway?.end_date) return

    const checkEnded = () => {
      const difference = +new Date(giveaway.end_date) - +new Date()
      const ended = difference <= 0
      setIsEnded(ended)

      if (ended && giveaway.status === 'active') {
        setTimeout(() => navigate(`/giveaway/${id}/results`), 3000)
      }
    }

    const timer = setInterval(checkEnded, 1000)
    checkEnded()
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
    ? ((myTickets / totalTickets) * 100).toFixed(2)
    : '0.00'

  // Loading state
  if (loading) {
    return (
      <Layout hideNavbar>
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#FFD700]/20 border-t-[#FFD700] rounded-full animate-spin" />
        </div>
      </Layout>
    )
  }

  // Not found state
  if (!giveaway) {
    return (
      <Layout hideNavbar>
        <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center">
          <p className="text-white/50 mb-4">Розыгрыш не найден</p>
          <button onClick={() => navigate('/giveaways')} className="text-[#FFD700]">
            Назад к розыгрышам
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout hideNavbar>
      <div className="min-h-screen bg-[#0a0a0a] pb-32 relative overflow-hidden flex flex-col">

        {/* Background Atmosphere */}
        <ParticleBackground />
        <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-zinc-800/20 via-[#0a0a0a] to-[#0a0a0a] z-0" />

        {/* Header */}
        <div className="relative z-50 flex items-center justify-between px-4 pt-[60px] pb-4">
          <button
            onClick={() => navigate('/giveaways')}
            className="w-10 h-10 bg-white/5 rounded-full border border-white/10 flex items-center justify-center active:scale-95 transition-transform backdrop-blur-md"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>

          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-xl border border-[#FFD700]/20 rounded-full px-4 py-2 shadow-lg">
            <img src="/icons/arcoin.png" alt="" className="w-5 h-5" />
            <span className="text-white font-bold tracking-wide">{gameState?.balance_ar?.toLocaleString() || '0'}</span>
          </div>
        </div>

        {/* Content Scrollable */}
        <div className="relative z-10 flex-1 overflow-y-auto pb-20 no-scrollbar">

          {/* Hero Section */}
          <div className="px-4 pt-4">
            {/* Replaced Bull with Trophy */}
            <div className="relative w-full h-[200px] flex items-center justify-center mb-8">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-40 h-40 bg-[#FFD700]/10 blur-[50px] rounded-full" />
              </div>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
              >
                <Trophy className="w-24 h-24 text-[#FFD700] drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]" strokeWidth={1} />
              </motion.div>
            </div>

            {/* Titles & Jackpot */}
            <div className="text-center -mt-6 relative z-20">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-block"
              >
                <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-[#FFD700] to-[#FFA500] drop-shadow-[0_0_20px_rgba(255,215,0,0.3)]">
                  {(giveaway.jackpot_current_amount || giveaway.prices?.ar || 0).toLocaleString()}
                </h1>
                <p className="text-[#FFD700]/60 text-xs font-bold tracking-[0.4em] uppercase mt-1">
                  AR · Джекпот
                </p>
              </motion.div>

              <div className="mt-6">
                <h2 className="text-xl font-bold text-white tracking-wide">{giveaway.title}</h2>
                <p className="text-white/40 text-sm mt-1">{giveaway.subtitle}</p>
              </div>
            </div>
          </div>

          {/* Timer */}
          {isActive && !isEnded && giveaway.end_date && (
            <div className="mt-8 px-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <span className="text-[10px] uppercase tracking-widest text-white/30 font-bold">До розыгрыша</span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>
              <PremiumTimer targetDate={giveaway.end_date} />
            </div>
          )}

          {/* Dashboard Grid */}
          <div className="px-4 mt-8 grid grid-cols-2 gap-3">
            {/* Participants */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/5 flex flex-col items-center justify-center">
              <Users className="w-6 h-6 text-white/30 mb-2" />
              <span className="text-lg font-bold text-white">{participantsCount}</span>
              <span className="text-[10px] text-white/30 uppercase tracking-wider">Участников</span>
            </div>

            {/* My Tickets */}
            <div className={`rounded-2xl p-4 border flex flex-col items-center justify-center relative overflow-hidden
                ${myTickets > 0 ? 'bg-gradient-to-br from-[#FFD700]/10 to-[#FFA500]/5 border-[#FFD700]/30' : 'bg-white/5 border-white/5'}`}
            >
              <Ticket className={`w-6 h-6 mb-2 ${myTickets > 0 ? 'text-[#FFD700]' : 'text-white/30'}`} />
              <span className={`text-lg font-bold ${myTickets > 0 ? 'text-[#FFD700]' : 'text-white'}`}>
                {myTickets}
              </span>
              <span className={`text-[10px] uppercase tracking-wider ${myTickets > 0 ? 'text-[#FFD700]/60' : 'text-white/30'}`}>
                Мои билеты
              </span>

              {/* Win Chance Badge */}
              {myTickets > 0 && totalTickets > 0 && (
                <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-[#FFD700] text-black text-[9px] font-bold">
                  {winChance}%
                </div>
              )}
            </div>
          </div>

          {/* Recent Winners */}
          <div className="px-4 mt-8 mb-8">
            <h3 className="text-white/40 text-xs font-bold uppercase tracking-widest mb-4 pl-1">
              Последние победители
            </h3>
            <div className="space-y-2">
              {RECENT_WINNERS.map((winner, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FFD700]/20 to-[#FFA500]/10 flex items-center justify-center text-[#FFD700] text-xs font-bold">
                      {winner.name[0]}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm text-white font-medium">{winner.name}</span>
                      <span className="text-[10px] text-white/30">{winner.date}</span>
                    </div>
                  </div>
                  <div className="text-[#FFD700] font-bold text-sm">
                    +{winner.amount.toLocaleString()} AR
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Fixed Bottom CTA */}
        <div className="fixed bottom-0 left-0 right-0 p-4 pb-8 bg-gradient-to-t from-[#0a0a0a] from-60% via-[#0a0a0a]/90 to-transparent z-50">
          {isActive && !isEnded && (
            <button
              onClick={() => setShowModal(true)}
              className="group relative w-full h-14 rounded-2xl overflow-hidden shadow-[0_0_40px_-5px_rgba(255,215,0,0.3)]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#FFD700] via-[#FDB931] to-[#FFD700] animate-shimmer bg-[length:200%_100%]" />
              <div className="absolute inset-[1px] rounded-[15px] bg-zinc-900 flex items-center justify-center gap-2 group-active:bg-zinc-800 transition-colors">
                <span className="text-[#FFD700] font-black text-lg tracking-wide uppercase">Купить билет</span>
                <div className="w-px h-4 bg-[#FFD700]/20" />
                <span className="text-white/90 font-bold text-sm">
                  {giveaway.prices?.ar ?? giveaway.price ?? 100} AR
                </span>
              </div>
            </button>
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

        <style>{`
          @keyframes shimmer {
            0% { background-position: 100% 0; }
            100% { background-position: -100% 0; }
          }
          .animate-shimmer {
            animation: shimmer 3s linear infinite;
          }
          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>
      </div>
    </Layout>
  )
}
