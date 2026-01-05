import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { BuyTicketModal } from '../components/giveaways/BuyTicketModal'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useGiveaways } from '../hooks/useGiveaways'
import type { Giveaway } from '../types'

// ВАРИАНТ A: Современный карточный дизайн
export function GiveawayDetailsPage() {
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
      <div className="min-h-screen bg-[#0a0a0a]">
        {/* HERO Section с градиентом */}
        <div className="relative">
          {/* Gradient Background */}
          <div
            className="absolute inset-0 h-[280px]"
            style={{
              background: 'linear-gradient(180deg, rgba(255,215,0,0.15) 0%, rgba(255,165,0,0.08) 50%, transparent 100%)'
            }}
          />

          {/* Glow Effect */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[200px] bg-[#FFD700]/20 blur-[100px] rounded-full" />

          {/* Content */}
          <div className="relative pt-[70px] px-4 pb-6">
            {/* Back Button */}
            <button
              onClick={() => navigate('/giveaways')}
              className="absolute top-[75px] left-4 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>

            {/* Icon */}
            <div className="flex justify-center mb-4 pt-8">
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,215,0,0.3) 0%, rgba(255,165,0,0.2) 100%)',
                  boxShadow: '0 8px 32px rgba(255,215,0,0.3)'
                }}
              >
                🎁
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-white text-center mb-1">
              {giveaway.title || 'Розыгрыш'}
            </h1>
            {giveaway.subtitle && (
              <p className="text-white/50 text-center text-sm">{giveaway.subtitle}</p>
            )}
          </div>
        </div>

        {/* Floating Stats Cards */}
        <div className="px-4 -mt-2">
          <div className="grid grid-cols-3 gap-3">
            {/* Timer */}
            <div className="col-span-3 bg-zinc-900/80 backdrop-blur-md rounded-2xl p-4 border border-white/5">
              <div className="text-xs text-white/40 text-center mb-2">До конца розыгрыша</div>
              {isEnded || giveaway.status === 'completed' ? (
                <div className="text-center text-[#FFD700] font-bold">Завершён</div>
              ) : (
                <div className="flex justify-center gap-3">
                  {[
                    { value: timeLeft.days, label: 'дн' },
                    { value: timeLeft.hours, label: 'ч' },
                    { value: timeLeft.minutes, label: 'м' },
                    { value: timeLeft.seconds, label: 'с' }
                  ].map((item, i) => (
                    <div key={i} className="text-center">
                      <div className="text-2xl font-bold text-white font-mono">{String(item.value).padStart(2, '0')}</div>
                      <div className="text-[10px] text-white/40">{item.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Jackpot */}
            <div className="bg-zinc-900/80 backdrop-blur-md rounded-2xl p-3 border border-[#FFD700]/20">
              <div className="text-[10px] text-white/40 mb-1">Джекпот</div>
              <div className="flex items-center gap-1.5">
                <img src="/icons/arcoin.png" alt="" className="w-4 h-4" />
                <span className="text-lg font-bold text-[#FFD700]">
                  {(giveaway.jackpot_current_amount || 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Participants */}
            <div className="bg-zinc-900/80 backdrop-blur-md rounded-2xl p-3 border border-white/5">
              <div className="text-[10px] text-white/40 mb-1">Участников</div>
              <div className="text-lg font-bold text-white">{participantsCount}</div>
            </div>

            {/* My Tickets */}
            <div className="bg-zinc-900/80 backdrop-blur-md rounded-2xl p-3 border border-white/5">
              <div className="text-[10px] text-white/40 mb-1">Мои билеты</div>
              <div className="text-lg font-bold text-white">{myTickets}</div>
            </div>
          </div>
        </div>

        {/* My Participation */}
        {myTickets > 0 && (
          <div className="px-4 mt-4">
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <span className="text-emerald-400">✓</span>
                  </div>
                  <span className="text-white/70 text-sm">Вы участвуете</span>
                </div>
                <div className="text-right">
                  <div className="text-emerald-400 font-bold">{winChance}%</div>
                  <div className="text-[10px] text-white/40">шанс на победу</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Prizes */}
        <div className="px-4 mt-6">
          <h2 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-3">Призы</h2>
          <div className="space-y-2">
            {(giveaway.prizes || []).map((prize, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{
                  background: idx === 0
                    ? 'linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(255,165,0,0.08) 100%)'
                    : 'rgba(255,255,255,0.03)',
                  border: idx === 0 ? '1px solid rgba(255,215,0,0.3)' : '1px solid rgba(255,255,255,0.05)'
                }}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold ${
                  idx === 0 ? 'bg-[#FFD700]/20 text-[#FFD700]' :
                  idx === 1 ? 'bg-gray-400/20 text-gray-400' :
                  idx === 2 ? 'bg-orange-500/20 text-orange-400' :
                  'bg-white/5 text-white/40'
                }`}>
                  {prize.place}
                </div>
                <div className="flex-1">
                  <div className={`font-semibold ${idx === 0 ? 'text-[#FFD700]' : 'text-white'}`}>
                    {(prize.amount ?? 0) > 0 && `${(prize.amount ?? 0).toLocaleString()} ${giveaway.currency?.toUpperCase() || 'AR'}`}
                    {(prize.amount ?? 0) > 0 && (prize.percentage ?? 0) > 0 && ' + '}
                    {(prize.percentage ?? 0) > 0 && `${prize.percentage}%`}
                  </div>
                  {(prize.percentage ?? 0) > 0 && (
                    <div className="text-xs text-white/40">от джекпота</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="px-4 mt-6 pb-8">
          {isActive ? (
            <div className="space-y-3">
              <button
                onClick={() => setShowModal(true)}
                className="w-full py-4 rounded-2xl font-bold text-black text-lg active:scale-[0.98] transition-transform"
                style={{
                  background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                  boxShadow: '0 8px 24px rgba(255,215,0,0.4)'
                }}
              >
                Купить билет — {giveaway.prices?.ar ?? giveaway.prices?.bul ?? giveaway.price ?? 0} {giveaway.prices?.ar !== undefined ? 'AR' : giveaway.prices?.bul !== undefined ? 'BUL' : (giveaway.currency || 'AR').toUpperCase()}
              </button>

              <button
                onClick={() => navigate(`/live-arena/${id}`)}
                className="w-full py-3 rounded-xl font-medium text-purple-400 border border-purple-500/30 bg-purple-500/10 active:scale-[0.98] transition-transform"
              >
                📺 Смотреть LIVE
              </button>
            </div>
          ) : giveaway.status === 'completed' ? (
            <button
              onClick={() => navigate(`/giveaway/${id}/results`)}
              className="w-full py-4 rounded-2xl font-bold text-black text-lg active:scale-[0.98] transition-transform"
              style={{
                background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                boxShadow: '0 8px 24px rgba(255,215,0,0.4)'
              }}
            >
              🏆 Смотреть результаты
            </button>
          ) : (
            <div className="text-center py-4 text-white/50">
              Розыгрыш {giveaway.status === 'cancelled' ? 'отменён' : 'завершён'}
            </div>
          )}
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
