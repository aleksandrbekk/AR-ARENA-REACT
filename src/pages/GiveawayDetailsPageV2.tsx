import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { BuyTicketModal } from '../components/giveaways/BuyTicketModal'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useGiveaways } from '../hooks/useGiveaways'
import type { Giveaway } from '../types'

// ВАРИАНТ B: Премиум стиль (как страница скина)
export function GiveawayDetailsPageV2() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { telegramUser } = useAuth()
  const { getGiveawayStats } = useGiveaways()

  const [giveaway, setGiveaway] = useState<Giveaway | null>(null)
  const [loading, setLoading] = useState(true)
  const [myTickets, setMyTickets] = useState(0)
  const [participantsCount, setParticipantsCount] = useState(0)
  const [totalTickets, setTotalTickets] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [isEnded, setIsEnded] = useState(false)

  useEffect(() => {
    if (id) {
      fetchGiveaway()
      fetchStats()
      if (telegramUser) fetchMyTickets()
    }
  }, [id, telegramUser])

  const fetchStats = async () => {
    if (!id) return
    const stats = await getGiveawayStats(id)
    setParticipantsCount(stats.participants_count)
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
      return { days: 0, hours: 0, minutes: 0, seconds: 0 }
    }

    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft()
      setTimeLeft(newTimeLeft)
      const ended = newTimeLeft.days === 0 && newTimeLeft.hours === 0 &&
                    newTimeLeft.minutes === 0 && newTimeLeft.seconds === 0
      setIsEnded(ended)

      if (ended && giveaway.status === 'active') {
        setTimeout(() => navigate(`/giveaway/${id}/results`), 3000)
      }
    }, 1000)

    setTimeLeft(calculateTimeLeft())
    return () => clearInterval(timer)
  }, [giveaway?.end_date, giveaway?.status, id, navigate])

  const fetchGiveaway = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('giveaways')
      .select('*')
      .eq('id', id)
      .single()
    if (data) setGiveaway(data)
    setLoading(false)
  }

  const fetchMyTickets = async () => {
    if (!telegramUser) return
    const { data } = await supabase
      .from('giveaway_tickets')
      .select('ticket_count')
      .eq('giveaway_id', id)
      .eq('telegram_id', telegramUser.id.toString())
      .single()
    if (data) setMyTickets(data.ticket_count || 0)
  }

  const handleBuySuccess = () => {
    fetchGiveaway()
    fetchMyTickets()
    fetchStats()
  }

  const isActive = giveaway?.status === 'active'
  const winChance = totalTickets > 0 && myTickets > 0
    ? ((myTickets / totalTickets) * 100).toFixed(2)
    : '0.00'

  if (loading) {
    return (
      <Layout hideNavbar>
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#FFD700]/20 border-t-[#FFD700] rounded-full animate-spin" />
        </div>
      </Layout>
    )
  }

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
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
        {/* HERO - Big Visual Area (40vh) */}
        <div
          className="relative h-[45vh] flex-shrink-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,215,0,0.25) 0%, transparent 50%),
              radial-gradient(ellipse 60% 40% at 50% 20%, rgba(255,165,0,0.15) 0%, transparent 50%),
              linear-gradient(180deg, #0a0a0a 0%, #0a0a0a 100%)
            `
          }}
        >
          {/* Back Button */}
          <button
            onClick={() => navigate('/giveaways')}
            className="absolute top-[70px] left-4 z-20 w-10 h-10 rounded-full bg-black/50 backdrop-blur-xl flex items-center justify-center border border-white/10"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>

          {/* Central Prize Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pt-[60px]">
            {/* Animated Glow Ring */}
            <div className="relative">
              <div
                className="absolute inset-0 w-32 h-32 rounded-full animate-pulse"
                style={{
                  background: 'radial-gradient(circle, rgba(255,215,0,0.4) 0%, transparent 70%)',
                  filter: 'blur(20px)'
                }}
              />
              <div
                className="relative w-28 h-28 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,215,0,0.2) 0%, rgba(255,165,0,0.1) 100%)',
                  border: '2px solid rgba(255,215,0,0.4)',
                  boxShadow: '0 0 60px rgba(255,215,0,0.3), inset 0 0 30px rgba(255,215,0,0.1)'
                }}
              >
                <span className="text-5xl">🎁</span>
              </div>
            </div>

            {/* Jackpot Amount */}
            <div className="mt-4 text-center">
              <div className="text-xs text-white/40 uppercase tracking-widest mb-1">Призовой фонд</div>
              <div className="flex items-center justify-center gap-2">
                <img src="/icons/arcoin.png" alt="" className="w-6 h-6" />
                <span
                  className="text-4xl font-black"
                  style={{
                    background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}
                >
                  {(giveaway.jackpot_current_amount || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Timer Badge */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <div
              className="px-4 py-2 rounded-full flex items-center gap-2"
              style={{
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
            >
              {isEnded || giveaway.status === 'completed' ? (
                <span className="text-[#FFD700] font-medium text-sm">Завершён</span>
              ) : (
                <>
                  <span className="text-white/60 text-sm">⏱</span>
                  <span className="text-white font-mono font-medium text-sm">
                    {String(timeLeft.days).padStart(2, '0')}:{String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Content Panel */}
        <div
          className="flex-1 -mt-4 rounded-t-[28px] relative z-10 overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #141414 0%, #0a0a0a 100%)',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.5)'
          }}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-4">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          {/* Title Section */}
          <div className="px-5 mb-5">
            <h1 className="text-xl font-bold text-white mb-1">
              {giveaway.title || 'Розыгрыш'}
            </h1>
            {giveaway.subtitle && (
              <p className="text-sm text-white/50">{giveaway.subtitle}</p>
            )}
          </div>

          {/* Stats Row */}
          <div className="px-5 mb-5">
            <div className="flex gap-3">
              <div className="flex-1 bg-white/5 rounded-2xl p-3 text-center">
                <div className="text-2xl font-bold text-white">{participantsCount}</div>
                <div className="text-[11px] text-white/40">участников</div>
              </div>
              <div className="flex-1 bg-white/5 rounded-2xl p-3 text-center">
                <div className="text-2xl font-bold text-white">{myTickets}</div>
                <div className="text-[11px] text-white/40">моих билетов</div>
              </div>
              {myTickets > 0 && (
                <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 text-center">
                  <div className="text-2xl font-bold text-emerald-400">{winChance}%</div>
                  <div className="text-[11px] text-emerald-400/60">шанс</div>
                </div>
              )}
            </div>
          </div>

          {/* Prizes */}
          <div className="px-5 mb-6">
            <div className="text-xs text-white/40 uppercase tracking-widest mb-3">Места и призы</div>
            <div className="space-y-2">
              {(giveaway.prizes || []).slice(0, 3).map((prize, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{
                    background: idx === 0
                      ? 'linear-gradient(90deg, rgba(255,215,0,0.15) 0%, transparent 100%)'
                      : 'transparent',
                    borderLeft: idx === 0 ? '3px solid #FFD700' : '3px solid rgba(255,255,255,0.1)'
                  }}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                    idx === 0 ? 'bg-[#FFD700] text-black' :
                    idx === 1 ? 'bg-gray-400 text-black' :
                    'bg-orange-500 text-black'
                  }`}>
                    {prize.place}
                  </div>
                  <div className="flex-1">
                    <span className={`font-semibold ${idx === 0 ? 'text-[#FFD700]' : 'text-white'}`}>
                      {(prize.amount ?? 0) > 0 && `${(prize.amount ?? 0).toLocaleString()} `}
                      {giveaway.currency?.toUpperCase() || 'AR'}
                      {(prize.percentage ?? 0) > 0 && ` + ${prize.percentage}%`}
                    </span>
                  </div>
                </div>
              ))}
              {(giveaway.prizes || []).length > 3 && (
                <div className="text-center text-xs text-white/30 pt-1">
                  +{(giveaway.prizes || []).length - 3} призовых мест
                </div>
              )}
            </div>
          </div>

          {/* Action Button */}
          <div className="px-5 pb-8">
            {isActive ? (
              <div className="space-y-3">
                <button
                  onClick={() => setShowModal(true)}
                  className="w-full py-4 rounded-2xl font-bold text-black text-lg active:scale-[0.98] transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                    boxShadow: '0 4px 20px rgba(255,215,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3)'
                  }}
                >
                  Участвовать — {giveaway.price} {giveaway.currency?.toUpperCase()}
                </button>

                <button
                  onClick={() => navigate(`/live-arena/${id}`)}
                  className="w-full py-3.5 rounded-xl font-medium text-white/70 bg-white/5 border border-white/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <span className="text-lg">📺</span>
                  <span>Смотреть LIVE трансляцию</span>
                </button>
              </div>
            ) : giveaway.status === 'completed' ? (
              <button
                onClick={() => navigate(`/giveaway/${id}/results`)}
                className="w-full py-4 rounded-2xl font-bold text-black text-lg active:scale-[0.98] transition-all"
                style={{
                  background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                  boxShadow: '0 4px 20px rgba(255,215,0,0.4)'
                }}
              >
                🏆 Результаты розыгрыша
              </button>
            ) : (
              <div className="text-center py-4 text-white/40">
                Розыгрыш завершён
              </div>
            )}
          </div>
        </div>
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
