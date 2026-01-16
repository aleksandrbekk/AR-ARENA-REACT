import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { motion } from 'framer-motion'
import { BuyTicketModal } from '../components/giveaways/BuyTicketModal'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useGiveaways } from '../hooks/useGiveaways'
import type { Giveaway } from '../types'
import { Plus } from 'lucide-react'

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
  const [_totalTickets, setTotalTickets] = useState(0)
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

  // Loading state
  if (loading) {
    return (
      <Layout hideNavbar>
        <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-[#FFD700]/20 border-t-[#FFD700] rounded-full animate-spin" />
        </div>
      </Layout>
    )
  }

  // Not found state
  if (!giveaway) {
    return (
      <Layout hideNavbar>
        <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center">
          <p className="text-white/50 mb-4">Розыгрыш не найден</p>
          <button onClick={() => navigate('/giveaways')} className="text-[#FFD700]">
            Назад к розыгрышам
          </button>
        </div>
      </Layout>
    )
  }

  const jackpotAmount = giveaway.jackpot_current_amount || giveaway.prices?.ar || 0
  // ticketPrice available: giveaway.prices?.ar ?? giveaway.price ?? 100

  return (
    <Layout hideNavbar>
      <div className="min-h-screen bg-[#0D0D0D] relative overflow-y-auto pb-6">

        {/* Main Content */}
        <div className="relative z-10 px-4 pt-4">

          {/* Hero Card - Main Giveaway Display */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-3xl overflow-hidden mb-4"
          >
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a1a] via-[#151515] to-[#0D0D0D]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#FFD700]/5 via-transparent to-[#FFD700]/10" />

            {/* Golden border glow */}
            <div className="absolute inset-0 rounded-3xl border border-[#FFD700]/30" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-[#FFD700]/60 to-transparent" />

            <div className="relative p-6 pt-8">
              {/* Big Icon */}
              <div className="relative w-32 h-32 mx-auto mb-4">
                <div className="absolute inset-0 bg-[#FFD700]/40 blur-3xl rounded-full" />
                <img src="/icons/Jackpot.png" alt="" className="relative w-full h-full object-contain drop-shadow-[0_0_30px_rgba(255,215,0,0.5)]" />
              </div>

              {/* Title */}
              <div className="text-center mb-2">
                <h1 className="text-[#FFD700] text-xl font-black uppercase tracking-wide">
                  {giveaway.title || 'ЕЖЕНЕДЕЛЬНЫЙ РОЗЫГРЫШ'}
                </h1>
                <p className="text-[#FFD700]/50 text-xs tracking-[0.2em] uppercase mt-1">
                  WEEKLY LOTTERY
                </p>
              </div>

              {/* Jackpot Amount */}
              <div className="text-center mb-6">
                <div className="relative inline-block">
                  <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-[#FFD700] via-[#FFED4A] to-[#FFA500]">
                    ${jackpotAmount.toLocaleString()}
                  </span>
                  <div className="absolute inset-0 text-6xl font-black text-[#FFD700] blur-xl opacity-50 -z-10">
                    ${jackpotAmount.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Timer OR Live Button */}
              {isActive && !isEnded && giveaway.end_date ? (
                <div className="flex justify-center gap-2">
                  <TimeBlock value={timeLeft.days} label="ДН" />
                  <TimeBlock value={timeLeft.hours} label="Ч" />
                  <TimeBlock value={timeLeft.minutes} label="МИН" />
                  <TimeBlock value={timeLeft.seconds} label="СЕК" isActive />
                </div>
              ) : (isEnded || isCompleted) ? (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/live/${id}`)}
                  className="w-full h-14 rounded-2xl bg-gradient-to-r from-red-600 via-red-500 to-red-600 flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(220,38,38,0.5)]"
                >
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                  <span className="text-white font-black text-xl tracking-wider">LIVE</span>
                </motion.button>
              ) : null}
            </div>
          </motion.div>


          {/* === STATS SECTION (REDESIGN) === */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-3 mb-6"
          >
            {/* Main Stats Row */}
            <div className="grid grid-cols-3 gap-2">
              {/* Мои билеты */}
              <div className="relative bg-gradient-to-b from-[#1a1a1a] to-[#141414] rounded-2xl p-4 border border-[#FFD700]/20 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FFD700]/40 to-transparent" />
                <div className="text-center">
                  <img src="/icons/tiket.png" alt="" className="w-8 h-8 mx-auto mb-2" />
                  <div className="text-[#FFD700] text-2xl font-black">{myTickets}</div>
                  <div className="text-[#FFD700]/60 text-[10px] uppercase tracking-wider">Билетов</div>
                </div>
              </div>

              {/* Участники */}
              <div className="relative bg-gradient-to-b from-[#1a1a1a] to-[#141414] rounded-2xl p-4 border border-white/10 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <div className="text-center">
                  <img src="/icons/peaple.png" alt="" className="w-8 h-8 mx-auto mb-2" />
                  <div className="text-white text-2xl font-black">{participantsCount}</div>
                  <div className="text-white/60 text-[10px] uppercase tracking-wider">Участников</div>
                </div>
              </div>

              {/* Шанс */}
              <div className="relative bg-gradient-to-b from-[#1a1a1a] to-[#141414] rounded-2xl p-4 border border-[#FFD700]/20 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FFD700]/40 to-transparent" />
                <div className="text-center">
                  <img src="/icons/kubic.png" alt="" className="w-8 h-8 mx-auto mb-2" />
                  <div className="text-[#FFD700] text-2xl font-black">
                    {myTickets > 0 && participantsCount > 0
                      ? `${((myTickets / participantsCount) * 100).toFixed(1)}%`
                      : '0%'
                    }
                  </div>
                  <div className="text-[#FFD700]/60 text-[10px] uppercase tracking-wider">Шанс</div>
                </div>
              </div>
            </div>

            {/* LUXURY Buy Button */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowModal(true)}
              className="relative w-full py-4 rounded-2xl overflow-hidden group"
            >
              {/* Luxury gold gradient background */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#B8860B] via-[#FFD700] to-[#B8860B]" />

              {/* Shimmer overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

              {/* Inner highlight for 3D effect */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-black/20" />

              {/* Top shine line */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />

              {/* Bottom shadow line */}
              <div className="absolute bottom-0 left-0 right-0 h-px bg-black/30" />

              {/* Outer glow */}
              <div className="absolute -inset-1 bg-[#FFD700]/30 blur-lg rounded-2xl" />

              {/* Button text */}
              <span className="relative text-black font-black text-lg uppercase tracking-widest drop-shadow-[0_1px_0_rgba(255,255,255,0.3)]">
                Купить билеты
              </span>
            </motion.button>
          </motion.div>

          {/* === PAST WINNERS (REDESIGN) === */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🏆</span>
                <h3 className="text-white/60 text-xs font-bold uppercase tracking-widest">Победители</h3>
              </div>
            </div>

            <div className="space-y-2">
              <WinnerRow place={1} name="A****" amount="$200" date="07.10.2025" />
              <WinnerRow place={2} name="D****" amount="30,000₽" date="30.09.2025" />
              <WinnerRow place={3} name="M****" amount="25,000₽" date="23.09.2025" />
            </div>
          </motion.div>


        </div>

        {/* Modal */}
        <BuyTicketModal
          isOpen={showModal}
          giveaway={giveaway}
          onClose={() => setShowModal(false)}
          onSuccess={handleBuySuccess}
        />

        <style>{`
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
      </div>
    </Layout>
  )
}

// Timer Block Component
function TimeBlock({ value, label, isActive = false }: { value: string; label: string; isActive?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div className={`
        w-[72px] h-[72px] rounded-2xl flex items-center justify-center
        ${isActive
          ? 'bg-gradient-to-b from-[#FFD700]/30 to-[#FFD700]/10 border-2 border-[#FFD700]/50'
          : 'bg-[#1A1A1A] border border-white/10'
        }
      `}>
        <span className={`text-4xl font-black ${isActive ? 'text-[#FFD700]' : 'text-white'}`}>
          {value}
        </span>
      </div>
      <span className={`mt-2 text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-[#FFD700]' : 'text-white/40'}`}>
        {label}
      </span>
    </div>
  )
}

// Winner Row Component (Premium Design)
function WinnerRow({ place, name, amount, date }: { place: number; name: string; amount: string; date: string }) {
  const placeColors = {
    1: 'from-[#FFD700] to-[#FFA500]',
    2: 'from-gray-300 to-gray-400',
    3: 'from-orange-400 to-orange-600'
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-[#1a1a1a]/80 rounded-xl border border-white/5">
      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${placeColors[place as keyof typeof placeColors] || 'from-white/20 to-white/10'} flex items-center justify-center text-black font-bold text-sm`}>
        {place}
      </div>
      <div className="flex-1">
        <div className="text-white/80 text-sm font-medium">{name}</div>
        <div className="text-white/40 text-[10px]">{date}</div>
      </div>
      <div className="text-[#FFD700] font-bold text-sm">{amount}</div>
    </div>
  )
}
