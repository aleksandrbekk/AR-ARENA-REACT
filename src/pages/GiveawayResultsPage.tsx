import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Layout } from '../components/layout/Layout'
import { supabase } from '../lib/supabase'
import type { Giveaway, WinnerInfo, DrawResults } from '../types'

// SVG иконки в нашем стиле
const TrophyIcon = ({ className = '', size = 24 }: { className?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M12 17V14M12 14C14.2091 14 16 12.2091 16 10V4H8V10C8 12.2091 9.79086 14 12 14Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M16 5H18C19.1046 5 20 5.89543 20 7V8C20 9.65685 18.6569 11 17 11H16"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8 5H6C4.89543 5 4 5.89543 4 7V8C4 9.65685 5.34315 11 7 11H8"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8 21H16"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 17V21"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const CrownIcon = ({ className = '', size = 24 }: { className?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M2 8L6 12L12 4L18 12L22 8V18C22 19.1046 21.1046 20 20 20H4C2.89543 20 2 19.1046 2 18V8Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="14" r="2" fill="currentColor" />
  </svg>
)

const MedalIcon = ({ place, size = 32 }: { place: number; size?: number }) => {
  const colors = {
    1: { primary: '#FFD700', secondary: '#FFA500', text: '#000' },
    2: { primary: '#C0C0C0', secondary: '#A0A0A0', text: '#000' },
    3: { primary: '#CD7F32', secondary: '#8B4513', text: '#FFF' },
    4: { primary: '#4A5568', secondary: '#2D3748', text: '#FFF' },
    5: { primary: '#4A5568', secondary: '#2D3748', text: '#FFF' }
  }
  const color = colors[place as keyof typeof colors] || colors[5]

  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <defs>
        <linearGradient id={`medal-gradient-${place}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color.primary} />
          <stop offset="100%" stopColor={color.secondary} />
        </linearGradient>
      </defs>
      <circle cx="20" cy="22" r="14" fill={`url(#medal-gradient-${place})`} />
      <circle cx="20" cy="22" r="11" fill="none" stroke={color.text} strokeWidth="1" opacity="0.3" />
      <path d="M15 4L20 12L25 4" stroke={color.primary} strokeWidth="3" fill="none" />
      <text
        x="20"
        y="27"
        textAnchor="middle"
        fill={color.text}
        fontSize="14"
        fontWeight="bold"
        fontFamily="system-ui"
      >
        {place}
      </text>
    </svg>
  )
}

// Иконки для этапов
const StageIcons = {
  tour1: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  ),
  tour2: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  ),
  semifinal: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="6" r="4" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <circle cx="12" cy="18" r="4" />
    </svg>
  ),
  final: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

export function GiveawayResultsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [giveaway, setGiveaway] = useState<Giveaway | null>(null)
  const [winners, setWinners] = useState<WinnerInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) fetchGiveaway()
  }, [id])

  const fetchGiveaway = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('giveaways')
      .select('*')
      .eq('id', id)
      .single()

    if (data) {
      setGiveaway(data)

      // Формируем список победителей из draw_results
      const dr = data.draw_results as DrawResults | undefined
      if (dr?.winners && dr.winners.length > 0) {
        const winnersInfo: WinnerInfo[] = dr.winners.map((w) => {
          const prize = data.prizes?.find((p: { place: number }) => p.place === w.place)
          return {
            telegram_id: w.user_id,
            place: w.place,
            username: w.username,
            first_name: w.username || `User${w.user_id.slice(-4)}`,
            prize_amount: prize?.amount || 0,
            prize_percentage: prize?.percentage || 0
          }
        })
        setWinners(winnersInfo)
      } else if (data.winners && data.winners.length > 0) {
        // Fallback на старый формат
        const winnersInfo: WinnerInfo[] = await Promise.all(
          data.winners.map(async (telegramId: string, index: number) => {
            const { data: userData } = await supabase
              .from('users')
              .select('username, first_name')
              .eq('telegram_id', telegramId)
              .single()

            const prize = data.prizes?.[index]
            return {
              telegram_id: telegramId,
              place: index + 1,
              username: userData?.username,
              first_name: userData?.first_name || `Участник ${telegramId.slice(-4)}`,
              prize_amount: prize?.amount || 0,
              prize_percentage: prize?.percentage || 0
            }
          })
        )
        setWinners(winnersInfo)
      }
    }
    setLoading(false)
  }

  const calculatePrize = (winner: WinnerInfo) => {
    const jackpot = giveaway?.jackpot_current_amount || 0
    let total = winner.prize_amount || 0
    if (winner.prize_percentage) {
      total += Math.floor(jackpot * (winner.prize_percentage / 100))
    }
    return total
  }

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#FFD700] animate-spin" />
        </div>
      </Layout>
    )
  }

  if (!giveaway || giveaway.status !== 'completed') {
    return (
      <Layout>
        <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4">
          <p className="text-white/50 mb-4 text-center">
            {giveaway ? 'Розыгрыш ещё не завершён' : 'Розыгрыш не найден'}
          </p>
          <button
            onClick={() => navigate('/giveaways')}
            className="text-[#FFD700] font-medium"
          >
            К розыгрышам
          </button>
        </div>
      </Layout>
    )
  }

  const drawResults = giveaway.draw_results as DrawResults | undefined
  const giveawayTitle = giveaway.main_title || giveaway.title || giveaway.name || 'Розыгрыш'
  const currency = giveaway.currency || (giveaway.prices?.ar ? 'ar' : 'bul')

  return (
    <Layout hideNavbar>
      <div className="min-h-screen bg-[#0a0a0a] pb-8">
        {/* Header */}
        <div className="relative pt-[60px] pb-6 px-4">
          <button
            onClick={() => navigate(`/giveaway/${id}`)}
            className="absolute top-[70px] left-4 z-10 p-2 bg-black/40 backdrop-blur-md rounded-full"
          >
            <ArrowLeft size={20} className="text-white" />
          </button>

          {/* Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-[#FFD700]/15 blur-[120px] rounded-full" />

          {/* Title */}
          <div className="relative pt-12 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', bounce: 0.5 }}
              className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#FFD700]/30 to-[#FFA500]/20 flex items-center justify-center border border-[#FFD700]/20"
            >
              <TrophyIcon size={40} className="text-[#FFD700]" />
            </motion.div>
            <h1 className="text-2xl font-bold text-white mb-1">Результаты</h1>
            <p className="text-sm text-white/50">{giveawayTitle}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="px-4 mb-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-zinc-900/60 border border-white/10 rounded-xl text-center">
              <p className="text-2xl font-bold text-[#FFD700]">
                {drawResults?.total_participants || winners.length}
              </p>
              <p className="text-xs text-white/50 mt-1">Участников</p>
            </div>
            <div className="p-4 bg-zinc-900/60 border border-white/10 rounded-xl text-center">
              <p className="text-2xl font-bold text-white">
                {drawResults?.total_tickets || 0}
              </p>
              <p className="text-xs text-white/50 mt-1">Билетов</p>
            </div>
          </div>

          {/* Кнопка LIVE */}
          {drawResults?.success && (
            <button
              onClick={() => navigate(`/live/${id}`)}
              className="w-full mt-3 py-3 rounded-xl font-medium text-[#FFD700] bg-[#FFD700]/10 border border-[#FFD700]/20 flex items-center justify-center gap-2 hover:bg-[#FFD700]/20 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Смотреть LIVE анимацию
            </button>
          )}
        </div>

        {/* Winners */}
        <div className="px-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <CrownIcon size={20} className="text-[#FFD700]" />
            <h2 className="text-lg font-bold text-white">Победители</h2>
          </div>

          <div className="space-y-3">
            {winners.map((winner, idx) => (
              <motion.div
                key={winner.telegram_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`relative overflow-hidden rounded-xl p-4 ${
                  idx === 0
                    ? 'bg-gradient-to-r from-[#FFD700]/20 to-[#FFA500]/10 border border-[#FFD700]/30'
                    : idx === 1
                    ? 'bg-gradient-to-r from-gray-400/10 to-gray-500/5 border border-gray-400/20'
                    : idx === 2
                    ? 'bg-gradient-to-r from-orange-700/10 to-orange-800/5 border border-orange-600/20'
                    : 'bg-zinc-900/60 border border-white/10'
                }`}
              >
                {/* Shine effect for 1st place */}
                {idx === 0 && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />
                )}

                <div className="relative flex items-center gap-4">
                  <MedalIcon place={winner.place} size={40} />

                  <div className="flex-1 min-w-0">
                    <p className={`font-bold truncate ${idx === 0 ? 'text-[#FFD700]' : 'text-white'}`}>
                      {winner.first_name}
                    </p>
                    {winner.username && (
                      <p className="text-xs text-white/40 truncate">@{winner.username}</p>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <img
                        src={currency === 'ar' ? '/icons/arcoin.png' : '/icons/BUL.png'}
                        alt=""
                        className="w-5 h-5"
                      />
                      <span className={`font-bold ${idx === 0 ? 'text-[#FFD700] text-lg' : 'text-white'}`}>
                        {calculatePrize(winner).toLocaleString()}
                      </span>
                    </div>
                    {(winner.prize_percentage ?? 0) > 0 && (
                      <p className="text-xs text-white/40">{winner.prize_percentage}% джекпота</p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Draw Stages - New 4-stage format */}
        {drawResults?.success && (
          <div className="px-4 mb-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/50">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              Этапы розыгрыша
            </h2>

            <div className="space-y-4">
              {/* Tour 1 */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-zinc-900/60 border border-white/10 rounded-xl"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                    {StageIcons.tour1}
                  </div>
                  <div>
                    <p className="font-medium text-white">Tour 1: Барабан</p>
                    <p className="text-xs text-white/40">Случайный отбор 20 участников</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {drawResults.tour1?.participants?.slice(0, 8).map((p, i) => (
                    <span key={i} className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded-md">
                      #{p.ticket_number}
                    </span>
                  ))}
                  {(drawResults.tour1?.participants?.length || 0) > 8 && (
                    <span className="px-2 py-1 bg-white/5 text-white/40 text-xs rounded-md">
                      +{(drawResults.tour1?.participants?.length || 0) - 8}
                    </span>
                  )}
                </div>
              </motion.div>

              {/* Tour 2 */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-4 bg-zinc-900/60 border border-white/10 rounded-xl"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                    {StageIcons.tour2}
                  </div>
                  <div>
                    <p className="font-medium text-white">Tour 2: Карты</p>
                    <p className="text-xs text-white/40">Выбор 5 финалистов</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {drawResults.tour2?.finalists?.map((f, i) => (
                    <span key={i} className="px-2 py-1 bg-purple-500/10 text-purple-400 text-xs rounded-md">
                      #{f.ticket_number} {f.username}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* Semifinal */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-4 bg-zinc-900/60 border border-white/10 rounded-xl"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center text-red-400">
                    {StageIcons.semifinal}
                  </div>
                  <div>
                    <p className="font-medium text-white">Semifinal: Traffic Light</p>
                    <p className="text-xs text-white/40">3 попадания = выбывание (места 4-5)</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1">
                    <span className="text-xs text-white/40 mr-2">Выбыли:</span>
                    {drawResults.semifinal?.eliminated?.map((e, i) => (
                      <span key={i} className="px-2 py-1 bg-red-500/10 text-red-400 text-xs rounded-md">
                        #{e.ticket_number} ({e.place} место)
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <span className="text-xs text-white/40 mr-2">В финале:</span>
                    {drawResults.semifinal?.finalists3?.map((f, i) => (
                      <span key={i} className="px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded-md">
                        #{f.ticket_number} {f.username}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Final */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="p-4 bg-gradient-to-br from-[#FFD700]/10 to-[#FFA500]/5 border border-[#FFD700]/20 rounded-xl"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FFD700]/20 flex items-center justify-center text-[#FFD700]">
                    {StageIcons.final}
                  </div>
                  <div>
                    <p className="font-medium text-[#FFD700]">Final: Battle of Traders</p>
                    <p className="text-xs text-white/40">3 быка = победа (места 1-2-3)</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {drawResults.winners?.slice(0, 3).map((w, i) => (
                    <span
                      key={i}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                        i === 0
                          ? 'bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/30'
                          : i === 1
                          ? 'bg-gray-400/20 text-gray-300 border border-gray-400/30'
                          : 'bg-orange-600/20 text-orange-400 border border-orange-500/30'
                      }`}
                    >
                      #{w.place} {w.username} ({w.bulls} bulls)
                    </span>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        )}

        {/* Seed for verification */}
        {drawResults?.seed && (
          <div className="px-4 mb-6">
            <div className="p-4 bg-zinc-900/40 border border-white/5 rounded-xl">
              <p className="text-xs text-white/30 mb-1">Seed для верификации</p>
              <p className="text-xs text-white/50 font-mono break-all">{drawResults.seed}</p>
            </div>
          </div>
        )}

        {/* Back Button */}
        <div className="px-4">
          <button
            onClick={() => navigate('/giveaways')}
            className="w-full py-4 rounded-xl font-bold text-white bg-zinc-800 border border-white/10 hover:bg-zinc-700 transition-colors"
          >
            К розыгрышам
          </button>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </Layout>
  )
}
