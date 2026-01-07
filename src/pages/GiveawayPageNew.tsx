import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { motion } from 'framer-motion'

// ============ MOCK DATA (потом заменим на реальные) ============
const MOCK_GIVEAWAY = {
  id: '1',
  title: 'ЕЖЕНЕДЕЛЬНЫЙ',
  subtitle: 'Розыгрыш',
  jackpot: 15000,
  currency: 'AR',
  endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000 + 29 * 60 * 1000), // 4д 2ч 29м
  status: 'active' as 'active' | 'completed',
  myTickets: 3,
  totalTickets: 847,
  totalParticipants: 234,
  prizes: [
    { place: 1, amount: 10000, percentage: 50, label: 'Главный приз' },
    { place: 2, amount: 5000, percentage: 30 },
    { place: 3, amount: 3000, percentage: 20 },
    { place: 4, amount: 2000 },
    { place: 5, amount: 1000 },
  ],
  winners: [
    { place: 1, username: 'CryptoKing', amount: 15000 },
    { place: 2, username: 'LuckyTrader', amount: 8000 },
    { place: 3, username: 'DiamondHands', amount: 5600 },
    { place: 4, username: 'MoonBoy', amount: 2000 },
    { place: 5, username: 'Hodler228', amount: 1000 },
  ]
}

const CONDITIONS = [
  { id: 1, text: 'Подписаться на Telegram', done: true, icon: 'tg' },
  { id: 2, text: 'Пригласить 2 друзей', progress: '1/2', action: 'Пригласить', done: false, icon: 'friends' },
  { id: 3, text: 'Купить минимум 1 билет', progress: '3/1', done: true, icon: 'ticket' },
]

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

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const ConditionIcon = ({ type }: { type: string }) => {
  if (type === 'tg') return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.74 4-1.73 6.67-2.88 8-3.44 3.81-1.6 4.6-1.88 5.12-1.89.11 0 .37.03.53.17.14.12.18.28.2.45-.02.07-.02.14-.04.22z"/>
    </svg>
  )
  if (type === 'friends') return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
    </svg>
  )
  return <TicketIcon />
}

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

function WinnerCard({ winner, index, currency }: { winner: typeof MOCK_GIVEAWAY.winners[0]; index: number; currency: string }) {
  const colors = [
    { bg: 'from-[#FFD700]/20 to-[#FFA500]/5', border: 'border-[#FFD700]/40', text: 'text-[#FFD700]', glow: 'shadow-[0_0_30px_rgba(255,215,0,0.3)]' },
    { bg: 'from-gray-300/20 to-gray-400/5', border: 'border-gray-300/40', text: 'text-gray-300', glow: '' },
    { bg: 'from-orange-500/20 to-orange-600/5', border: 'border-orange-500/40', text: 'text-orange-400', glow: '' },
    { bg: 'from-white/10 to-white/5', border: 'border-white/20', text: 'text-white', glow: '' },
    { bg: 'from-white/10 to-white/5', border: 'border-white/20', text: 'text-white', glow: '' },
  ]
  const style = colors[index] || colors[4]

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`
        relative overflow-hidden rounded-xl p-4
        bg-gradient-to-r ${style.bg} border ${style.border} ${style.glow}
      `}
    >
      {/* Shine effect for 1st place */}
      {index === 0 && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />
      )}

      <div className="relative flex items-center gap-4">
        {/* Place Badge */}
        <div className={`
          w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg
          ${index === 0 ? 'bg-gradient-to-br from-[#FFD700] to-[#FFA500] text-black' :
            index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-black' :
            index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-black' :
            'bg-white/10 text-white/60'
          }
        `}>
          {winner.place}
        </div>

        {/* Username */}
        <div className="flex-1">
          <p className={`font-bold ${style.text}`}>{winner.username}</p>
          {index === 0 && <p className="text-[10px] text-[#FFD700]/60">Победитель</p>}
        </div>

        {/* Prize */}
        <div className="text-right">
          <span className={`font-black text-lg ${style.text}`}>
            {winner.amount.toLocaleString()}
          </span>
          <span className="text-white/40 text-sm ml-1">{currency}</span>
        </div>
      </div>
    </motion.div>
  )
}

// ============ MAIN PAGE ============

export function GiveawayPageNew() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // В реальности тут будет загрузка данных
  const giveaway = MOCK_GIVEAWAY
  const isActive = giveaway.status === 'active'
  const isCompleted = giveaway.status === 'completed'

  // Шанс на победу
  const winChance = giveaway.totalTickets > 0 && giveaway.myTickets > 0
    ? ((giveaway.myTickets / giveaway.totalTickets) * 100).toFixed(2)
    : '0'

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
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <button
              onClick={() => navigate('/giveaways')}
              className="p-2 bg-white/5 rounded-full border border-white/10"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>

            {/* Balance */}
            <div className="flex items-center gap-2 bg-black/40 border border-[#FFD700]/30 rounded-full px-4 py-2">
              <span className="text-white font-bold">9,500</span>
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#FFD700] to-[#FFA500]" />
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
                {giveaway.jackpot.toLocaleString()}
              </div>
              <div className="text-white/60 text-sm font-medium tracking-[0.3em] uppercase mt-1">
                {giveaway.currency} · Джекпот
              </div>
            </motion.div>

            {/* Title */}
            <div className="mt-4">
              <h1 className="text-xl font-bold text-white">{giveaway.title}</h1>
              <p className="text-white/40 text-sm">{giveaway.subtitle}</p>
            </div>

            {/* Timer */}
            {isActive && (
              <div className="mt-6">
                <p className="text-xs text-white/40 uppercase tracking-widest mb-3">До розыгрыша</p>
                <TimerBlock endDate={giveaway.endDate} />
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
                  <span className="text-3xl font-black text-white">{giveaway.myTickets}</span>
                  <span className="text-white/30">/ {giveaway.totalTickets} всего</span>
                </div>
              </div>

              {/* Visual Tickets */}
              <div className="flex -space-x-3">
                {[...Array(Math.min(giveaway.myTickets, 3))].map((_, i) => (
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
            {giveaway.myTickets > 0 && (
              <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-white/40 text-sm">Твой шанс на победу</span>
                <span className="text-[#FFD700] font-bold text-lg">{winChance}%</span>
              </div>
            )}
          </div>

          {/* ===== CONDITIONS SECTION ===== */}
          <div className="px-4 mb-4">
            <h3 className="text-white/40 text-xs font-bold uppercase tracking-widest mb-3 ml-1">
              Условия участия
            </h3>
            <div className="space-y-2">
              {CONDITIONS.map((cond) => (
                <div
                  key={cond.id}
                  className={`
                    flex items-center justify-between p-4 rounded-xl border
                    ${cond.done
                      ? 'bg-emerald-500/10 border-emerald-500/20'
                      : 'bg-white/5 border-white/10'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cond.done ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/40'}`}>
                      <ConditionIcon type={cond.icon} />
                    </div>
                    <span className={cond.done ? 'text-white/80' : 'text-white/60'}>{cond.text}</span>
                  </div>

                  {cond.done ? (
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <CheckIcon />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-white/30 text-sm">{cond.progress}</span>
                      <button className="px-4 py-1.5 rounded-lg bg-[#FFD700]/10 border border-[#FFD700]/30 text-[#FFD700] text-sm font-medium">
                        {cond.action}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ===== PRIZES SECTION (Active State) ===== */}
          {isActive && (
            <div className="px-4 mb-4">
              <h3 className="text-white/40 text-xs font-bold uppercase tracking-widest mb-3 ml-1">
                Призовые места
              </h3>
              <div className="space-y-2">
                {giveaway.prizes.map((prize, idx) => (
                  <div
                    key={prize.place}
                    className={`
                      flex items-center gap-4 p-3 rounded-xl border
                      ${idx === 0
                        ? 'bg-gradient-to-r from-[#FFD700]/10 to-transparent border-[#FFD700]/30'
                        : 'bg-white/5 border-white/10'
                      }
                    `}
                  >
                    <div className={`
                      w-9 h-9 rounded-lg flex items-center justify-center font-bold
                      ${idx === 0 ? 'bg-gradient-to-br from-[#FFD700] to-[#FFA500] text-black' :
                        idx === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-black' :
                        idx === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-black' :
                        'bg-white/10 text-white/60'
                      }
                    `}>
                      {prize.place}
                    </div>
                    <div className="flex-1">
                      <span className={`font-bold ${idx === 0 ? 'text-[#FFD700]' : 'text-white'}`}>
                        {prize.amount.toLocaleString()} {giveaway.currency}
                      </span>
                      {prize.percentage && (
                        <span className="text-white/40 ml-1">+ {prize.percentage}%</span>
                      )}
                      {prize.label && (
                        <p className="text-[10px] text-[#FFD700]/60">{prize.label}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== WINNERS SECTION (Completed State) ===== */}
          {isCompleted && (
            <div className="px-4 mb-4">
              <h3 className="text-white/40 text-xs font-bold uppercase tracking-widest mb-3 ml-1 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                Победители
              </h3>
              <div className="space-y-2">
                {giveaway.winners.map((winner, idx) => (
                  <WinnerCard key={winner.place} winner={winner} index={idx} currency={giveaway.currency} />
                ))}
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
              <p className="text-xl font-bold text-white">{giveaway.totalParticipants}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Участников</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <p className="text-xl font-bold text-white">{giveaway.totalTickets}</p>
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
        {isActive && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/95 to-transparent z-50">
            <button className="w-full py-4 rounded-2xl font-black text-lg text-black bg-gradient-to-r from-[#FFD700] to-[#FFA500] shadow-[0_0_30px_rgba(255,215,0,0.4)] active:scale-[0.98] transition-transform flex items-center justify-center gap-2">
              <TicketIcon />
              <span>КУПИТЬ БИЛЕТ</span>
              <span className="bg-black/20 px-2 py-0.5 rounded text-sm">100 AR</span>
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
    </Layout>
  )
}
