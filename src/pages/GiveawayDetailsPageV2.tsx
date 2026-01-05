import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { BuyTicketModal } from '../components/giveaways/BuyTicketModal'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useGiveaways } from '../hooks/useGiveaways'
import type { Giveaway } from '../types'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

// ВАРИАНТ C: Banner Redesign (Final)
export function GiveawayDetailsPageV2() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { telegramUser } = useAuth()
  const { getGiveawayStats } = useGiveaways()

  const [giveaway, setGiveaway] = useState<Giveaway | null>(null)
  const [loading, setLoading] = useState(true)
  const [myTickets, setMyTickets] = useState(0)
  const [totalTickets, setTotalTickets] = useState(0)
  const [showModal, setShowModal] = useState(false)

  // Timer State
  const [timeLeft, setTimeLeft] = useState<{ days: number, hours: number, minutes: number, seconds: number } | null>(null)
  const [isEnded, setIsEnded] = useState(false)

  useEffect(() => {
    if (id) {
      fetchGiveaway()
      fetchStats()
      if (telegramUser) fetchMyTickets()
    }
  }, [id, telegramUser])

  // Real-time subscription for stats
  useEffect(() => {
    if (!id) return

    // Subscribe to ticket sales
    const channel = supabase
      .channel(`giveaway_tickets:${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'giveaway_tickets', filter: `giveaway_id=eq.${id}` },
        () => fetchStats()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id])

  const fetchStats = async () => {
    if (!id) return
    const stats = await getGiveawayStats(id)
    setTotalTickets(stats.total_tickets || 0)
  }

  useEffect(() => {
    if (!giveaway?.end_date) return

    const calculateTimeLeft = () => {
      const difference = +new Date(giveaway.end_date) - +new Date()
      if (difference > 0) {
        return {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        }
      }
      return null
    }

    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft()
      setTimeLeft(newTimeLeft)

      if (!newTimeLeft) {
        setIsEnded(true)
        // If status is still active but time ended, we wait for backend or show "Processing"
      } else {
        setIsEnded(false)
      }
    }, 1000)

    // Initial calc
    setTimeLeft(calculateTimeLeft())

    // Check if already ended
    if (new Date(giveaway.end_date) < new Date()) {
      setIsEnded(true)
    }

    return () => clearInterval(timer)
  }, [giveaway?.end_date])

  const fetchGiveaway = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('giveaways')
      .select('*')
      .eq('id', id)
      .single()
    if (data) {
      setGiveaway(data)
      setIsEnded(data.status === 'completed' || new Date(data.end_date) < new Date())
    }
    setLoading(false)
  }

  const fetchMyTickets = async () => {
    if (!telegramUser) return
    const { count } = await supabase
      .from('giveaway_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('giveaway_id', id)
      .eq('user_id', telegramUser.id)
    setMyTickets(count || 0)
  }

  const handleBuySuccess = () => {
    fetchGiveaway()
    fetchMyTickets()
    fetchStats()
  }

  const isActive = giveaway?.status === 'active' && !isEnded
  const winChance = totalTickets > 0 && myTickets > 0
    ? parseFloat(((myTickets / totalTickets) * 100).toFixed(2)).toString()
    : '0'

  if (loading) {
    return (
      <Layout hideNavbar>
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-[#FFD700] animate-spin" />
        </div>
      </Layout>
    )
  }

  if (!giveaway) {
    return (
      <Layout hideNavbar>
        <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center">
          <p className="text-white/50 mb-4">Розыгрыш не найден</p>
          <button onClick={() => navigate('/giveaways')} className="text-[#FFD700]">Назад</button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout hideNavbar>
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col relative pb-24">

        {/* === HERO BANNER === */}
        <div className="relative w-full h-[380px] bg-zinc-900 overflow-hidden flex-shrink-0">
          {/* Background Image */}
          {giveaway.image_url ? (
            <img
              src={giveaway.image_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-80"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-black" />
          )}

          {/* Gradient Overlay (Vignette + Fade Bottom) */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-black/20 to-black/60" />

          {/* Back Button */}
          <button
            onClick={() => navigate('/giveaways')}
            className="absolute top-[60px] left-4 z-20 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 active:scale-95 transition-transform"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>

          {/* === CENTRAL TIMER Or ACTION === */}
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pt-10">
            {isActive && timeLeft ? (
              <div className="text-center">
                <div className="text-xs text-white/60 font-medium tracking-[0.2em] uppercase mb-4 drop-shadow-lg">До розыгрыша</div>

                {/* Timer Digits */}
                <div className="flex items-end gap-3">
                  <TimerUnit value={timeLeft.days} label="ДН" />
                  <div className="text-2xl font-light text-white/30 mb-4">:</div>
                  <TimerUnit value={timeLeft.hours} label="ЧАС" />
                  <div className="text-2xl font-light text-white/30 mb-4">:</div>
                  <TimerUnit value={timeLeft.minutes} label="МИН" />
                  <div className="text-2xl font-light text-white/30 mb-4">:</div>
                  <TimerUnit value={timeLeft.seconds} label="СЕК" />
                </div>
              </div>
            ) : (
              // ENDED STATE -> Action Button
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FFD700] to-[#FFA500] flex items-center justify-center shadow-[0_0_40px_rgba(255,215,0,0.6)] animate-pulse">
                  <span className="text-4xl">🏆</span>
                </div>
                <h2 className="text-2xl font-bold text-white drop-shadow-lg">Розыгрыш завершён</h2>

                <button
                  onClick={() => navigate(`/giveaway/${id}/results`)}
                  className="mt-2 px-8 py-3 rounded-xl bg-white text-black font-bold uppercase tracking-wider hover:bg-gray-200 transition-colors shadow-lg"
                >
                  Смотреть результаты
                </button>
              </motion.div>
            )}
          </div>
        </div>

        {/* === INFO CONTENT === */}
        <div className="px-4 -mt-6 relative z-10">
          {/* Header Card */}
          <div className="bg-[#141414] border border-white/5 rounded-2xl p-5 shadow-2xl mb-4 backdrop-blur-sm">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h1 className="text-xl font-bold text-white leading-tight">{giveaway.title}</h1>
                {giveaway.subtitle && <p className="text-white/50 text-sm mt-1">{giveaway.subtitle}</p>}
              </div>

              <div className="bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-lg px-3 py-1.5 flex flex-col items-center min-w-[80px]">
                <span className="text-[10px] text-[#FFD700] uppercase font-bold tracking-wider">Джекпот</span>
                <span className="text-lg font-black text-[#FFD700]">{(giveaway.jackpot_current_amount || 0).toLocaleString()}</span>
              </div>
            </div>

            {/* Stats Row */}
            <div className="flex gap-2 mt-4">
              <div className="flex-1 bg-black/30 rounded-xl p-2.5 text-center border border-white/5">
                <div className="text-[10px] text-white/40 uppercase mb-0.5">Всего билетов</div>
                <div className="text-white font-bold">{totalTickets}</div>
              </div>
              <div className="flex-1 bg-black/30 rounded-xl p-2.5 text-center border border-white/5">
                <div className="text-[10px] text-white/40 uppercase mb-0.5">Мои билеты</div>
                <div className="text-white font-bold">{myTickets}</div>
              </div>
              {myTickets > 0 && (
                <div className="flex-1 bg-emerald-500/10 rounded-xl p-2.5 text-center border border-emerald-500/20">
                  <div className="text-[10px] text-emerald-400/60 uppercase mb-0.5">Шанс</div>
                  <div className="text-emerald-400 font-bold">{winChance}%</div>
                </div>
              )}
            </div>
          </div>

          {/* Prizes List */}
          <div className="mb-20">
            <h3 className="text-white/40 text-xs font-bold uppercase tracking-widest mb-3 ml-1">Призовые места</h3>
            <div className="space-y-2">
              {(giveaway.prizes || []).map((prize, idx) => (
                <div key={idx} className="flex items-center gap-4 p-3 bg-zinc-900/50 border border-white/5 rounded-xl">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shadow-inner ${idx === 0 ? 'bg-gradient-to-br from-[#FFD700] to-[#FFA500] text-black shadow-[0_0_10px_rgba(255,215,0,0.3)]' :
                    idx === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-black' :
                      idx === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-black' :
                        'bg-white/10 text-white'
                    }`}>
                    {prize.place}
                  </div>
                  <div className="flex-1">
                    <div className={`font-bold ${idx === 0 ? 'text-[#FFD700]' : 'text-white'}`}>
                      {(prize.amount || 0).toLocaleString()} {giveaway.currency?.toUpperCase()}
                      {prize.percentage ? ` + ${prize.percentage}%` : ''}
                    </div>
                    {idx === 0 && <div className="text-[10px] text-[#FFD700]/60">Главный приз</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* === BOTTOM ACTION BAR === */}
        {isActive && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/90 to-transparent z-50 pb-8">
            <button
              onClick={() => setShowModal(true)}
              className="w-full py-4 rounded-2xl font-black text-lg text-black bg-gradient-to-r from-[#FFD700] to-[#FFA500] shadow-[0_4px_20px_rgba(255,215,0,0.3)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <span>КУПИТЬ БИЛЕТ</span>
              <span className="bg-black/10 px-2 py-0.5 rounded text-sm font-bold">
                {giveaway.price} {giveaway.currency?.toUpperCase()}
              </span>
            </button>
          </div>
        )}

      </div>

      <BuyTicketModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        giveaway={giveaway}
        onSuccess={handleBuySuccess}
      />
    </Layout>
  )
}

// Helper Components
function TimerUnit({ value, label }: { value: number, label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-14 h-16 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 flex items-center justify-center mb-2 shadow-lg">
        <span className="text-3xl font-mono font-bold text-white">{String(value).padStart(2, '0')}</span>
      </div>
      <span className="text-[10px] font-bold text-white/40">{label}</span>
    </div>
  )
}
