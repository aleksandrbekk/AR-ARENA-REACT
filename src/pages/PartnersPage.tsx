import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { CurrencyIcon } from '../components/CurrencyIcon'
import { useToast } from '../components/ToastProvider'
import {
  Users,
  Link2,
  Copy,
  Check,
  ChevronRight,
  TrendingUp,
  Gift,
  Clock,
  User,
  Share2,
  Sparkles,
  Trophy,
  Zap
} from 'lucide-react'

interface TeamMember {
  id: number
  telegram_id: string
  username: string | null
  first_name: string | null
  photo_url: string | null
  level: number
  created_at: string
  total_earned: number
}

interface EarningRecord {
  id: number
  level: number
  currency: 'AR'
  purchase_amount: number
  bonus_percent: number
  bonus_amount: number
  purchase_type: string
  created_at: string
  referred_name: string | null
  referred_username: string | null
}

interface PartnerStats {
  success: boolean
  referral_code: string
  total_earned_ar: number
  l1_count: number
  l2_count: number
  team: TeamMember[]
  recent_earnings: EarningRecord[]
}

type TabType = 'overview' | 'team' | 'earnings'

export function PartnersPage() {
  const navigate = useNavigate()
  const { telegramUser } = useAuth()
  const { showToast } = useToast()

  const [stats, setStats] = useState<PartnerStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [teamFilter, setTeamFilter] = useState<1 | 2 | null>(null)

  // Telegram BackButton
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp
      const handleBack = () => navigate('/')
      tg.BackButton.show()
      tg.BackButton.onClick(handleBack)
      return () => {
        tg.BackButton.offClick(handleBack)
        tg.BackButton.hide()
      }
    }
  }, [navigate])

  // Загрузка статистики
  const loadStats = useCallback(async () => {
    if (!telegramUser) return

    try {
      const { data, error } = await supabase.rpc('get_partner_stats', {
        p_telegram_id: telegramUser.id.toString()
      })

      if (error) throw error
      setStats(data as PartnerStats)
    } catch (err) {
      console.error('Error loading partner stats:', err)
      setStats({
        success: true,
        referral_code: 'LOADING',
        total_earned_ar: 0,
        l1_count: 0,
        l2_count: 0,
        team: [],
        recent_earnings: []
      })
    } finally {
      setLoading(false)
    }
  }, [telegramUser])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  // Копирование ссылки
  const copyLink = async () => {
    if (!stats?.referral_code) return

    const link = `https://t.me/ARARENA_BOT?startapp=${stats.referral_code}`

    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      showToast({ variant: 'success', title: 'Ссылка скопирована!' })

      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success')
      }

      setTimeout(() => setCopied(false), 2000)
    } catch {
      showToast({ variant: 'error', title: 'Не удалось скопировать' })
    }
  }

  // Поделиться через Telegram
  const shareLink = () => {
    if (!stats?.referral_code) return

    const link = `https://t.me/ARARENA_BOT?startapp=${stats.referral_code}`
    const text = 'Присоединяйся к AR ARENA! Тапай, зарабатывай и участвуй в розыгрышах!'

    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(
        `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`
      )
    }
  }

  // Форматирование даты
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Форматирование типа покупки
  const formatPurchaseType = (type: string) => {
    const types: Record<string, string> = {
      'skin_purchase': 'Скин',
      'equipment_purchase': 'Оборудование',
      'location_purchase': 'Локация',
      'ar_purchase': 'Пополнение AR',
      'giveaway_ticket': 'Билет'
    }
    return types[type] || type
  }

  // Фильтрованная команда
  const filteredTeam = stats?.team?.filter(m =>
    teamFilter === null || m.level === teamFilter
  ) || []

  const totalTeam = (stats?.l1_count || 0) + (stats?.l2_count || 0)

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#0a0a0a] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FFD700] to-[#FFA500] flex items-center justify-center">
            <Users className="w-8 h-8 text-black" />
          </div>
          <div className="text-white/60">Загрузка...</div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col overflow-hidden">
      {/* Animated Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Main spotlight */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px]"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(255,215,0,0.12) 0%, transparent 70%)',
          }}
        />
        {/* Secondary glow */}
        <div
          className="absolute top-[20%] right-0 w-[300px] h-[300px]"
          style={{
            background: 'radial-gradient(circle at center, rgba(139,92,246,0.08) 0%, transparent 70%)',
          }}
        />
        {/* Bottom accent */}
        <div
          className="absolute bottom-0 left-0 w-[400px] h-[200px]"
          style={{
            background: 'radial-gradient(ellipse at bottom left, rgba(34,197,94,0.06) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Header spacer */}
      <div className="pt-[90px]" />

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto pb-32">
        {/* Hero Section with Invite Card */}
        <div className="px-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative"
          >
            {/* Glass Card */}
            <div className="relative rounded-3xl overflow-hidden">
              {/* Glass background */}
              <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-xl" />
              <div className="absolute inset-0 bg-gradient-to-br from-[#FFD700]/10 via-transparent to-purple-500/5" />
              <div className="absolute inset-[1px] rounded-3xl border border-white/10" />

              {/* Glow effect on top */}
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#FFD700]/50 to-transparent" />

              <div className="relative p-5">
                {/* Title */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFD700] to-[#FFA500] flex items-center justify-center shadow-lg shadow-[#FFD700]/20">
                    <Sparkles className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-lg">Партнёрская программа</h2>
                    <p className="text-white/40 text-xs">Приглашай друзей — зарабатывай</p>
                  </div>
                </div>

                {/* Referral Link */}
                <div className="flex gap-2 mb-4">
                  <div className="flex-1 bg-black/40 rounded-xl px-4 py-3 border border-white/5 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <Link2 className="w-4 h-4 text-[#FFD700] shrink-0" />
                      <span className="text-white/80 font-mono text-sm truncate">
                        t.me/ARARENA_BOT?startapp={stats?.referral_code || '...'}
                      </span>
                    </div>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={copyLink}
                    className="w-12 h-12 rounded-xl bg-gradient-to-b from-[#FFD700] to-[#FFA500] flex items-center justify-center shadow-lg shadow-[#FFD700]/25 cursor-pointer"
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-black" />
                    ) : (
                      <Copy className="w-5 h-5 text-black" />
                    )}
                  </motion.button>
                </div>

                {/* Share Button */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={shareLink}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 cursor-pointer"
                >
                  <Share2 className="w-5 h-5" />
                  Поделиться в Telegram
                </motion.button>

                {/* Bonus Info Pills */}
                <div className="flex items-center justify-center gap-3 mt-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-sm shadow-green-500/50" />
                    <span className="text-green-400 text-xs font-medium">L1: 10%</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
                    <span className="text-blue-400 text-xs font-medium">L2: 5%</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bento Grid Stats */}
        <div className="px-4 mb-6">
          <div className="grid grid-cols-4 gap-3">
            {/* Total Team - 2x1 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="col-span-2 relative rounded-2xl overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-sm" />
              <div className="absolute inset-0 bg-gradient-to-br from-[#FFD700]/10 to-transparent" />
              <div className="absolute inset-[1px] rounded-2xl border border-[#FFD700]/20" />

              <div className="relative p-4 flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#FFD700] to-[#FFA500] flex items-center justify-center shadow-lg shadow-[#FFD700]/20">
                  <Trophy className="w-7 h-7 text-black" />
                </div>
                <div>
                  <div className="text-3xl font-black text-white">{totalTeam}</div>
                  <div className="text-white/40 text-sm">всего в команде</div>
                </div>
              </div>
            </motion.div>

            {/* L1 Count - 1x1 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 }}
              className="relative rounded-2xl overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-sm" />
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent" />
              <div className="absolute inset-[1px] rounded-2xl border border-green-500/20" />

              <div className="relative p-3 h-full flex flex-col justify-between">
                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <span className="text-green-400 font-bold text-xs">L1</span>
                </div>
                <div>
                  <div className="text-2xl font-black text-green-400">{stats?.l1_count || 0}</div>
                </div>
              </div>
            </motion.div>

            {/* L2 Count - 1x1 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="relative rounded-2xl overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-sm" />
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
              <div className="absolute inset-[1px] rounded-2xl border border-blue-500/20" />

              <div className="relative p-3 h-full flex flex-col justify-between">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <span className="text-blue-400 font-bold text-xs">L2</span>
                </div>
                <div>
                  <div className="text-2xl font-black text-blue-400">{stats?.l2_count || 0}</div>
                </div>
              </div>
            </motion.div>

            {/* AR Earned - 2x1 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25 }}
              className="col-span-2 relative rounded-2xl overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-sm" />
              <div className="absolute inset-0 bg-gradient-to-br from-[#FFD700]/5 to-transparent" />
              <div className="absolute inset-[1px] rounded-2xl border border-white/10" />

              <div className="relative p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CurrencyIcon type="AR" className="w-10 h-10" />
                  <div>
                    <div className="text-white/40 text-xs mb-0.5">Заработано AR</div>
                    <div className="text-2xl font-black text-[#FFD700]">
                      {stats?.total_earned_ar?.toLocaleString() || 0}
                    </div>
                  </div>
                </div>
                <Zap className="w-6 h-6 text-[#FFD700]/30" />
              </div>
            </motion.div>

          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 mb-4">
          <div className="flex bg-white/[0.03] backdrop-blur-sm rounded-2xl p-1.5 border border-white/5">
            {(['overview', 'team', 'earnings'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  activeTab === tab
                    ? 'bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black shadow-lg shadow-[#FFD700]/20'
                    : 'text-white/40 hover:text-white/60'
                }`}
              >
                {tab === 'overview' && 'Обзор'}
                {tab === 'team' && 'Команда'}
                {tab === 'earnings' && 'Доход'}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="px-4">
          <AnimatePresence mode="wait">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* How it works */}
                <div className="relative rounded-2xl overflow-hidden">
                  <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-sm" />
                  <div className="absolute inset-[1px] rounded-2xl border border-white/5" />

                  <div className="relative p-5">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-[#FFD700]" />
                      Как это работает
                    </h3>
                    <div className="space-y-4">
                      {[
                        { num: 1, color: 'green', title: 'Поделись ссылкой', desc: 'Отправь друзьям свою реферальную ссылку' },
                        { num: 2, color: 'blue', title: 'Друг регистрируется', desc: 'Он попадает в твою команду (Линия 1)' },
                        { num: 3, color: 'yellow', title: 'Получай бонусы', desc: '10% от покупок друзей, 5% от их рефералов' },
                      ].map((step, i) => (
                        <motion.div
                          key={step.num}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 + i * 0.1 }}
                          className="flex gap-4"
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            step.color === 'green' ? 'bg-green-500/20' :
                            step.color === 'blue' ? 'bg-blue-500/20' : 'bg-[#FFD700]/20'
                          }`}>
                            <span className={`font-bold ${
                              step.color === 'green' ? 'text-green-400' :
                              step.color === 'blue' ? 'text-blue-400' : 'text-[#FFD700]'
                            }`}>{step.num}</span>
                          </div>
                          <div>
                            <p className="text-white font-medium">{step.title}</p>
                            <p className="text-white/40 text-sm">{step.desc}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                {(stats?.recent_earnings?.length || 0) > 0 && (
                  <div className="relative rounded-2xl overflow-hidden">
                    <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-sm" />
                    <div className="absolute inset-[1px] rounded-2xl border border-white/5" />

                    <div className="relative p-5">
                      <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                        <Gift className="w-5 h-5 text-purple-400" />
                        Последние начисления
                      </h3>
                      <div className="space-y-3">
                        {stats?.recent_earnings?.slice(0, 5).map((earning, i) => (
                          <motion.div
                            key={earning.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                                earning.level === 1 ? 'bg-green-500/20' : 'bg-blue-500/20'
                              }`}>
                                <span className={`text-xs font-bold ${
                                  earning.level === 1 ? 'text-green-400' : 'text-blue-400'
                                }`}>L{earning.level}</span>
                              </div>
                              <div>
                                <p className="text-white text-sm font-medium">
                                  {earning.referred_name || earning.referred_username || 'Пользователь'}
                                </p>
                                <p className="text-white/30 text-xs">
                                  {formatPurchaseType(earning.purchase_type)}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-green-400 text-sm font-bold flex items-center gap-1">
                                +{earning.bonus_amount.toLocaleString()}
                                <CurrencyIcon type={earning.currency} className="w-3.5 h-3.5" />
                              </p>
                              <p className="text-white/20 text-xs">{earning.bonus_percent}%</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                      {(stats?.recent_earnings?.length || 0) > 5 && (
                        <button
                          onClick={() => setActiveTab('earnings')}
                          className="w-full mt-4 py-2.5 text-[#FFD700] text-sm font-semibold flex items-center justify-center gap-1 hover:text-[#FFD700]/80 transition-colors cursor-pointer"
                        >
                          Показать все <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {(!stats?.team || stats.team.length === 0) && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative rounded-2xl overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-white/[0.02]" />
                    <div className="absolute inset-[1px] rounded-2xl border border-white/5" />

                    <div className="relative p-8 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                        <Users className="w-8 h-8 text-white/20" />
                      </div>
                      <p className="text-white font-semibold mb-1">Пока никого нет</p>
                      <p className="text-white/40 text-sm">
                        Поделись ссылкой и начни зарабатывать!
                      </p>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Team Tab */}
            {activeTab === 'team' && (
              <motion.div
                key="team"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* Filter */}
                <div className="flex gap-2">
                  {[
                    { filter: null, label: 'Все', count: stats?.team?.length || 0, color: 'yellow' },
                    { filter: 1, label: 'L1', count: stats?.l1_count || 0, color: 'green' },
                    { filter: 2, label: 'L2', count: stats?.l2_count || 0, color: 'blue' },
                  ].map((item) => (
                    <button
                      key={String(item.filter)}
                      onClick={() => setTeamFilter(item.filter as 1 | 2 | null)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                        teamFilter === item.filter
                          ? item.color === 'yellow'
                            ? 'bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black'
                            : item.color === 'green'
                            ? 'bg-green-500 text-black'
                            : 'bg-blue-500 text-white'
                          : 'bg-white/5 text-white/50 hover:bg-white/10'
                      }`}
                    >
                      {item.label} ({item.count})
                    </button>
                  ))}
                </div>

                {/* Team List */}
                {filteredTeam.length > 0 ? (
                  <div className="space-y-2">
                    {filteredTeam.map((member, i) => (
                      <motion.div
                        key={member.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="relative rounded-xl overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-sm" />
                        <div className="absolute inset-[1px] rounded-xl border border-white/5" />

                        <div className="relative p-4 flex items-center gap-3">
                          {/* Avatar */}
                          <div className="w-12 h-12 rounded-xl bg-zinc-800 overflow-hidden shrink-0">
                            {member.photo_url ? (
                              <img
                                src={member.photo_url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <User className="w-6 h-6 text-white/30" />
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-white font-medium truncate">
                                {member.first_name || member.username || 'Пользователь'}
                              </p>
                              <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                                member.level === 1
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-blue-500/20 text-blue-400'
                              }`}>
                                L{member.level}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Clock className="w-3 h-3 text-white/30" />
                              <span className="text-white/30 text-xs">
                                {formatDate(member.created_at)}
                              </span>
                            </div>
                          </div>

                          {/* Earned */}
                          <div className="text-right">
                            <p className="text-green-400 text-sm font-bold">
                              +{member.total_earned?.toLocaleString() || 0}
                            </p>
                            <p className="text-white/20 text-xs">заработано</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="relative rounded-2xl overflow-hidden">
                    <div className="absolute inset-0 bg-white/[0.02]" />
                    <div className="absolute inset-[1px] rounded-2xl border border-white/5" />

                    <div className="relative p-8 text-center">
                      <Users className="w-12 h-12 text-white/20 mx-auto mb-3" />
                      <p className="text-white font-medium mb-1">
                        {teamFilter ? `Нет рефералов L${teamFilter}` : 'Команда пуста'}
                      </p>
                      <p className="text-white/40 text-sm">
                        Приглашай друзей по своей ссылке
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Earnings Tab */}
            {activeTab === 'earnings' && (
              <motion.div
                key="earnings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-2"
              >
                {(stats?.recent_earnings?.length || 0) > 0 ? (
                  stats?.recent_earnings?.map((earning, i) => (
                    <motion.div
                      key={earning.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="relative rounded-xl overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-sm" />
                      <div className="absolute inset-[1px] rounded-xl border border-white/5" />

                      <div className="relative p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                              earning.level === 1
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-blue-500/20 text-blue-400'
                            }`}>
                              L{earning.level} • {earning.bonus_percent}%
                            </span>
                            <span className="text-white/30 text-xs">
                              {formatDate(earning.created_at)}
                            </span>
                          </div>
                          <p className="text-green-400 font-bold flex items-center gap-1">
                            +{earning.bonus_amount.toLocaleString()}
                            <CurrencyIcon type={earning.currency} className="w-4 h-4" />
                          </p>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-white font-medium">
                            {earning.referred_name || earning.referred_username || 'Пользователь'}
                          </span>
                          <span className="text-white/40">
                            {formatPurchaseType(earning.purchase_type)} • {earning.purchase_amount.toLocaleString()} {earning.currency}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="relative rounded-2xl overflow-hidden">
                    <div className="absolute inset-0 bg-white/[0.02]" />
                    <div className="absolute inset-[1px] rounded-2xl border border-white/5" />

                    <div className="relative p-8 text-center">
                      <Gift className="w-12 h-12 text-white/20 mx-auto mb-3" />
                      <p className="text-white font-medium mb-1">Нет начислений</p>
                      <p className="text-white/40 text-sm">
                        Когда рефералы начнут покупать, ты увидишь бонусы здесь
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Fixed Bottom CTA */}
      <div className="absolute bottom-0 inset-x-0 p-4 pb-8 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent pt-8">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={shareLink}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black font-bold text-lg flex items-center justify-center gap-2 shadow-xl shadow-[#FFD700]/25 cursor-pointer"
        >
          <Share2 className="w-5 h-5" />
          Пригласить друзей
        </motion.button>
      </div>
    </div>
  )
}

export default PartnersPage
