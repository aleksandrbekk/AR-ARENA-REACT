import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { BuyTicketModal } from '../components/giveaways/BuyTicketModal'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useGiveaways } from '../hooks/useGiveaways'
import type { Giveaway } from '../types'

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
        setTimeout(() => {
          navigate(`/giveaway/${id}/results`)
        }, 3000)
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

  const prizeEmojis = ['🥇', '🥈', '🥉', '🏅', '🎖️']
  const isActive = giveaway?.status === 'active'

  // Calculate win chance
  const winChance = totalTickets > 0 && myTickets > 0
    ? ((myTickets / totalTickets) * 100).toFixed(2)
    : '0.00'

  if (loading) {
    return (
      <Layout hideNavbar>
        <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-4">
          <div
            className="w-10 h-10 border-4 border-[#FFD700]/20 border-t-[#FFD700] rounded-full animate-spin mb-4"
          />
          <p className="text-white/60">Загрузка розыгрыша...</p>
        </div>
      </Layout>
    )
  }

  if (!giveaway) {
    return (
      <Layout hideNavbar>
        <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-4">
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
      <div className="min-h-screen bg-[#0a0a0a] pt-[70px] pb-[120px] px-4">
        <div className="max-w-[600px] mx-auto">

          {/* HEADER */}
          <div className="flex items-center gap-3 mb-5">
            <button
              onClick={() => navigate('/giveaways')}
              className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl font-bold text-[#FFD700] transition-all active:scale-95"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 165, 0, 0.15))',
                border: '2px solid rgba(255, 215, 0, 0.5)',
                boxShadow: '0 4px 12px rgba(255, 215, 0, 0.3)'
              }}
            >
              ←
            </button>
            <h1 className="text-xl font-bold text-[#FFD700]">Розыгрыш</h1>
          </div>

          {/* MAIN CARD */}
          <div
            className="rounded-[20px] p-5 mb-4"
            style={{
              background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.9), rgba(30, 30, 30, 0.8))',
              backdropFilter: 'blur(20px)',
              border: '2px solid rgba(255, 215, 0, 0.25)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5), inset 0 0 30px rgba(255, 215, 0, 0.05)'
            }}
          >
            {/* Title */}
            <h2
              className="text-2xl font-black mb-3"
              style={{
                background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              {giveaway.title}
            </h2>

            {giveaway.subtitle && (
              <p className="text-sm text-white/70 leading-relaxed mb-4">
                {giveaway.subtitle}
              </p>
            )}

            {/* Countdown */}
            <div
              className="rounded-xl p-3 text-center mb-4"
              style={{
                background: 'rgba(255, 215, 0, 0.1)',
                border: '1px solid rgba(255, 215, 0, 0.3)'
              }}
            >
              <div className="text-xs text-white/60 mb-1">До окончания розыгрыша</div>
              <div className="text-xl font-black text-[#FFD700]">
                {isEnded || giveaway.status === 'completed' ? (
                  '⏰ Розыгрыш завершён'
                ) : (
                  `⏳ ${timeLeft.days}д ${timeLeft.hours}ч ${timeLeft.minutes}м ${timeLeft.seconds}с`
                )}
              </div>
            </div>

            {/* Prizes */}
            {giveaway.prizes && giveaway.prizes.length > 0 && (
              <div className="mt-5">
                <h3 className="text-base font-bold text-[#FFD700] uppercase tracking-wide mb-3">
                  🎁 Призовой фонд
                </h3>
                <div className="space-y-2.5">
                  {giveaway.prizes.map((prize, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl p-3.5 flex items-center gap-3"
                      style={{
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 215, 0, 0.2)'
                      }}
                    >
                      <div className="text-2xl min-w-[32px]">
                        {prizeEmojis[idx] || '🎁'}
                      </div>
                      <div className="flex-1">
                        <div className="text-[15px] font-bold text-white">
                          {prize.place} место
                        </div>
                        <div className="text-[13px] font-semibold text-[#FFD700]">
                          {(prize.amount ?? 0) > 0 ? `${(prize.amount ?? 0).toLocaleString()} ${giveaway.currency?.toUpperCase() || 'AR'}` : ''}
                          {(prize.amount ?? 0) > 0 && (prize.percentage ?? 0) > 0 ? ' + ' : ''}
                          {(prize.percentage ?? 0) > 0 ? `${prize.percentage}% джекпота` : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div
                className="rounded-xl p-3.5 text-center"
                style={{ background: 'rgba(0, 0, 0, 0.4)' }}
              >
                <div
                  className="text-[22px] font-black mb-1"
                  style={{
                    background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}
                >
                  {participantsCount}
                </div>
                <div className="text-xs text-white/60">Участников</div>
              </div>
              <div
                className="rounded-xl p-3.5 text-center"
                style={{ background: 'rgba(0, 0, 0, 0.4)' }}
              >
                <div
                  className="text-[22px] font-black mb-1"
                  style={{
                    background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}
                >
                  {(giveaway.jackpot_current_amount || 0).toLocaleString()}
                </div>
                <div className="text-xs text-white/60">Джекпот {giveaway.currency?.toUpperCase()}</div>
              </div>
            </div>

            {/* Your Participation */}
            {myTickets > 0 && (
              <div
                className="rounded-2xl p-4 mt-4"
                style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.1))',
                  border: '2px solid rgba(16, 185, 129, 0.3)'
                }}
              >
                <h3 className="text-base font-bold text-[#FFD700] uppercase tracking-wide mb-3">
                  ✅ Ваше участие
                </h3>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[13px] text-white/70">Вложено билетов:</span>
                  <span className="text-base font-bold text-[#10b981]">{myTickets}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[13px] text-white/70">Текущий шанс:</span>
                  <span className="text-base font-bold text-[#10b981]">{winChance}%</span>
                </div>
              </div>
            )}
          </div>

          {/* PARTICIPATION CARD */}
          {isActive && (
            <div
              className="rounded-[20px] p-5"
              style={{
                background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.9), rgba(30, 30, 30, 0.8))',
                backdropFilter: 'blur(20px)',
                border: '2px solid rgba(255, 215, 0, 0.25)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5), inset 0 0 30px rgba(255, 215, 0, 0.05)'
              }}
            >
              <h3 className="text-base font-bold text-[#FFD700] uppercase tracking-wide mb-4">
                🎫 Купить билеты
              </h3>

              {/* Ticket Price Info */}
              <div
                className="rounded-xl p-3.5 text-center mb-4"
                style={{
                  background: 'rgba(255, 215, 0, 0.1)',
                  border: '1px solid rgba(255, 215, 0, 0.3)'
                }}
              >
                <div className="text-xs text-white/60 mb-1">Цена билета</div>
                <div className="text-2xl font-black text-[#FFD700]">
                  {giveaway.price} {giveaway.currency?.toUpperCase()}
                </div>
              </div>

              {/* Buy Button */}
              <button
                onClick={() => setShowModal(true)}
                className="w-full rounded-2xl p-4 text-base font-black text-black uppercase tracking-wide transition-all active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                  border: '2px solid rgba(255, 215, 0, 0.4)',
                  boxShadow: '0 8px 24px rgba(255, 215, 0, 0.6)'
                }}
              >
                🎟️ Купить билет
              </button>
            </div>
          )}

          {/* Completed/View Results */}
          {giveaway.status === 'completed' && (
            <div
              className="rounded-[20px] p-5"
              style={{
                background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.9), rgba(30, 30, 30, 0.8))',
                backdropFilter: 'blur(20px)',
                border: '2px solid rgba(255, 215, 0, 0.25)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5), inset 0 0 30px rgba(255, 215, 0, 0.05)'
              }}
            >
              <button
                onClick={() => navigate(`/giveaway/${id}/results`)}
                className="w-full rounded-2xl p-4 text-base font-black text-black uppercase tracking-wide transition-all active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                  border: '2px solid rgba(255, 215, 0, 0.4)',
                  boxShadow: '0 8px 24px rgba(255, 215, 0, 0.6)'
                }}
              >
                🏆 Смотреть результаты
              </button>
            </div>
          )}

          {/* Watch Live Button */}
          {isActive && (
            <button
              onClick={() => navigate(`/live-arena/${id}`)}
              className="w-full mt-4 rounded-2xl p-4 text-base font-black uppercase tracking-wide transition-all active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(126, 34, 206, 0.15))',
                border: '2px solid rgba(168, 85, 247, 0.4)',
                color: '#a855f7',
                boxShadow: '0 4px 16px rgba(168, 85, 247, 0.3)'
              }}
            >
              📺 Смотреть LIVE розыгрыш
            </button>
          )}

        </div>
      </div>

      {/* Modal */}
      <BuyTicketModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        giveaway={giveaway}
        onSuccess={handleBuySuccess}
      />
    </Layout>
  )
}
