import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { motion } from 'framer-motion'
import { BuyTicketModal } from '../components/giveaways/BuyTicketModal'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useGiveaways } from '../hooks/useGiveaways'
import type { Giveaway } from '../types'

// Recent winners - можно загружать из базы
const RECENT_WINNERS = [
  { name: 'Alex***', amount: 12500, date: '05.01' },
  { name: 'Dima***', amount: 8200, date: '02.01' },
  { name: 'Kate***', amount: 15000, date: '29.12' },
  { name: 'Max***', amount: 5600, date: '26.12' },
]

// ============ ICONS ============
const TrophyIcon = () => (
  <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
    <defs>
      <linearGradient id="trophyGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFD700" />
        <stop offset="50%" stopColor="#FFA500" />
        <stop offset="100%" stopColor="#FFD700" />
      </linearGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <path
      d="M40 60V50M40 50C48 50 54 42 54 32V16H26V32C26 42 32 50 40 50Z"
      stroke="url(#trophyGold)"
      strokeWidth="3"
      fill="none"
      filter="url(#glow)"
    />
    <path d="M54 20H62C64 20 66 22 66 24V28C66 34 62 38 56 38H54" stroke="url(#trophyGold)" strokeWidth="3" fill="none"/>
    <path d="M26 20H18C16 20 14 22 14 24V28C14 34 18 38 24 38H26" stroke="url(#trophyGold)" strokeWidth="3" fill="none"/>
    <path d="M28 68H52" stroke="url(#trophyGold)" strokeWidth="3" strokeLinecap="round"/>
    <path d="M40 60V68" stroke="url(#trophyGold)" strokeWidth="3"/>
    <circle cx="40" cy="32" r="8" fill="url(#trophyGold)" opacity="0.3"/>
  </svg>
)

const TicketIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M4 6h16v3a2 2 0 100 4v3H4v-3a2 2 0 100-4V6z" stroke="currentColor" strokeWidth="2"/>
    <path d="M10 6v12" stroke="currentColor" strokeWidth="2" strokeDasharray="2 2"/>
  </svg>
)



// ============ COMPONENTS ============

function TimerBlock({ endDate }: { endDate: Date }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const calc = () => {
      const diff = +endDate - +new Date()
      if (diff > 0) {
        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((diff / 1000 / 60) % 60),
          seconds: Math.floor((diff / 1000) % 60)
        })
      }
    }
    calc()
    const timer = setInterval(calc, 1000)
    return () => clearInterval(timer)
  }, [endDate])

  return (
    <div className="flex items-center justify-center gap-2">
      <TimerDigit value={timeLeft.days} label="ДН" />
      <span className="text-2xl text-white/20 font-light mt-[-20px]">:</span>
      <TimerDigit value={timeLeft.hours} label="ЧАС" />
      <span className="text-2xl text-white/20 font-light mt-[-20px]">:</span>
      <TimerDigit value={timeLeft.minutes} label="МИН" />
      <span className="text-2xl text-white/20 font-light mt-[-20px]">:</span>
      <TimerDigit value={timeLeft.seconds} label="СЕК" highlight />
    </div>
  )
}

function TimerDigit({ value, label, highlight }: { value: number; label: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div className={`
        w-14 h-16 rounded-xl flex items-center justify-center
        ${highlight
          ? 'bg-gradient-to-b from-[#FFD700]/20 to-[#FFA500]/10 border border-[#FFD700]/30 shadow-[0_0_20px_rgba(255,215,0,0.2)]'
          : 'bg-white/5 border border-white/10'
        }
      `}>
        <span className={`text-2xl font-mono font-bold ${highlight ? 'text-[#FFD700]' : 'text-white'}`}>
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-[10px] text-white/40 mt-1.5 tracking-wider">{label}</span>
    </div>
  )
}


// ============ MAIN PAGE ============

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
      <div className="min-h-screen bg-[#0a0a0a] pb-32 relative overflow-hidden">

        {/* ===== BACKGROUND EFFECTS ===== */}
        <div className="fixed inset-0 pointer-events-none">
          {/* Центральное золотое свечение */}
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#FFD700]/10 blur-[150px] rounded-full" />
          {/* Боковые акценты */}
          <div className="absolute top-40 -left-20 w-60 h-60 bg-purple-500/10 blur-[100px] rounded-full" />
          <div className="absolute top-60 -right-20 w-60 h-60 bg-orange-500/10 blur-[100px] rounded-full" />
          {/* Виньетка */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#0a0a0a_70%)]" />
        </div>

        {/* ===== GEOMETRIC LINES ===== */}
        <svg className="absolute top-0 left-0 right-0 h-32 pointer-events-none" viewBox="0 0 400 128" preserveAspectRatio="none">
          <defs>
            <linearGradient id="lineGold" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FFD700" stopOpacity="0" />
              <stop offset="50%" stopColor="#FFD700" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line x1="0" y1="80" x2="120" y2="30" stroke="url(#lineGold)" strokeWidth="1" />
          <line x1="400" y1="80" x2="280" y2="30" stroke="url(#lineGold)" strokeWidth="1" />
          <line x1="120" y1="30" x2="200" y2="10" stroke="url(#lineGold)" strokeWidth="1" />
          <line x1="280" y1="30" x2="200" y2="10" stroke="url(#lineGold)" strokeWidth="1" />
        </svg>

        {/* ===== CONTENT ===== */}
        <div className="relative z-10">

          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-[70px] pb-2">
            <button
              onClick={() => navigate('/giveaways')}
              className="w-10 h-10 bg-white/5 rounded-full border border-white/10 flex items-center justify-center active:scale-95 transition-transform"
            >
              <img src="/Cursor.png" alt="" className="w-5 h-5 rotate-180" />
            </button>

            {/* Balance */}
            <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md border border-[#FFD700]/30 rounded-full px-4 py-2">
              <img src="/icons/arcoin.png" alt="" className="w-5 h-5" />
              <span className="text-white font-bold">{gameState?.balance_ar?.toLocaleString() || '0'}</span>
            </div>
          </div>

          {/* ===== HERO SECTION ===== */}
          <div className="px-4 pt-8 pb-6 text-center">
            {/* Trophy / Prize Visual */}
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', bounce: 0.5 }}
              className="mx-auto mb-4"
            >
              <TrophyIcon />
            </motion.div>

            {/* Jackpot Amount */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] via-[#FFA500] to-[#FFD700] drop-shadow-[0_0_30px_rgba(255,215,0,0.5)]">
                {(giveaway.jackpot_current_amount || giveaway.prices?.ar || 0).toLocaleString()}
              </div>
              <div className="text-white/60 text-sm font-medium tracking-[0.3em] uppercase mt-1">
                AR · Джекпот
              </div>
            </motion.div>

            {/* Title */}
            <div className="mt-4">
              <h1 className="text-xl font-bold text-white">{giveaway.title || 'Розыгрыш'}</h1>
              <p className="text-white/40 text-sm">{giveaway.subtitle}</p>
            </div>

            {/* Timer */}
            {isActive && !isEnded && giveaway.end_date && (
              <div className="mt-6">
                <p className="text-xs text-white/40 uppercase tracking-widest mb-3">До розыгрыша</p>
                <TimerBlock endDate={new Date(giveaway.end_date)} />
              </div>
            )}

            {/* Completed State */}
            {isCompleted && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-full"
              >
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-emerald-400 font-medium">Розыгрыш завершён</span>
              </motion.div>
            )}
          </div>

          {/* ===== MY TICKETS SECTION ===== */}
          <div className="px-4 py-4 mx-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Мои билеты</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white">{myTickets}</span>
                  <span className="text-white/30">/ {totalTickets} всего</span>
                </div>
              </div>

              {/* Visual Tickets */}
              <div className="flex -space-x-3">
                {[...Array(Math.min(myTickets, 3))].map((_, i) => (
                  <div
                    key={i}
                    className="w-12 h-16 rounded-lg bg-gradient-to-br from-[#FFD700] to-[#FFA500] border-2 border-[#0a0a0a] flex items-center justify-center shadow-lg"
                    style={{ transform: `rotate(${(i - 1) * 8}deg)` }}
                  >
                    <span className="text-black font-black text-xs">AR</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Win Chance */}
            {myTickets > 0 && (
              <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-white/40 text-sm">Твой шанс на победу</span>
                <span className="text-[#FFD700] font-bold text-lg">{winChance}%</span>
              </div>
            )}
          </div>


          {/* ===== PRIZE INFO (Active State) ===== */}
          {isActive && (giveaway.prices?.ar || giveaway.price) && (
            <div className="px-4 mb-4">
              <div className="p-4 bg-gradient-to-r from-[#FFD700]/10 to-transparent rounded-xl border border-[#FFD700]/20">
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Стоимость билета</span>
                  <span className="text-[#FFD700] font-bold text-lg">{giveaway.prices?.ar ?? giveaway.price} AR</span>
                </div>
              </div>
            </div>
          )}


          {/* ===== RECENT WINNERS SECTION ===== */}
          <div className="px-4 mb-4">
            <h3 className="text-white/40 text-xs font-bold uppercase tracking-widest mb-3 ml-1">
              Последние победители
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {RECENT_WINNERS.map((w, i) => (
                <div key={i} className="p-3 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-sm">{w.name}</span>
                    <span className="text-white/30 text-xs">{w.date}</span>
                  </div>
                  <div className="text-[#FFD700] font-bold mt-1">
                    +{w.amount.toLocaleString()} AR
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ===== STATS BAR ===== */}
          <div className="px-4 py-4 flex items-center justify-center gap-6 border-t border-white/5">
            <div className="text-center">
              <p className="text-xl font-bold text-white">{participantsCount}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Участников</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <p className="text-xl font-bold text-white">{totalTickets}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Билетов</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <p className="text-xl font-bold text-[#FFD700]">{winChance}%</p>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Твой шанс</p>
            </div>
          </div>

        </div>

        {/* ===== BOTTOM CTA ===== */}
        {isActive && !isEnded && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/95 to-transparent z-50">
            <button
              onClick={() => setShowModal(true)}
              className="w-full py-4 rounded-2xl font-black text-lg text-black bg-gradient-to-r from-[#FFD700] to-[#FFA500] shadow-[0_0_30px_rgba(255,215,0,0.4)] active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
            >
              <TicketIcon />
              <span>КУПИТЬ БИЛЕТ</span>
              <span className="bg-black/20 px-2 py-0.5 rounded text-sm">{giveaway.prices?.ar ?? giveaway.price ?? 100} AR</span>
            </button>
          </div>
        )}

        {isCompleted && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/95 to-transparent z-50">
            <div className="flex gap-3">
              <button
                onClick={() => navigate(`/live/${id}`)}
                className="flex-1 py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center gap-2"
              >
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                LIVE
              </button>
              <button className="flex-1 py-4 rounded-2xl font-bold text-black bg-white">
                Результаты
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Shimmer Animation */}
      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(200%); }
        }
      `}</style>

      {/* Buy Ticket Modal */}
      <BuyTicketModal
        isOpen={showModal}
        giveaway={giveaway}
        onClose={() => setShowModal(false)}
        onSuccess={handleBuySuccess}
      />
    </Layout>
  )
}
