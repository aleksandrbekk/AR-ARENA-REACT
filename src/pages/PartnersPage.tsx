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
  Share2
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
  currency: 'AR' | 'BUL'
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
  total_earned_bul: number
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
      // Fallback на мок-данные если функция не существует
      setStats({
        success: true,
        referral_code: 'LOADING',
        total_earned_ar: 0,
        total_earned_bul: 0,
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

      // Haptic feedback
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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white text-xl">Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="pt-[70px] px-4 pb-4 bg-gradient-to-b from-yellow-500/10 to-transparent">
        <h1 className="text-2xl font-black text-white mb-1">Партнёрская программа</h1>
        <p className="text-white/50 text-sm">Приглашай друзей и зарабатывай!</p>
      </div>

      {/* Referral Link Card */}
      <div className="px-4 mb-4">
        <motion.div
          className="bg-gradient-to-br from-yellow-500/20 to-orange-500/10 rounded-2xl p-4 border border-yellow-500/30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="w-5 h-5 text-yellow-400" />
            <span className="text-white/70 text-sm">Твоя реферальная ссылка</span>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 bg-black/40 rounded-xl px-4 py-3 border border-white/10 overflow-hidden">
              <span className="text-white font-mono text-sm truncate block">
                t.me/ARARENA_BOT?startapp={stats?.referral_code || '...'}
              </span>
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={copyLink}
              className="w-12 h-12 rounded-xl bg-yellow-500 flex items-center justify-center"
            >
              {copied ? (
                <Check className="w-5 h-5 text-black" />
              ) : (
                <Copy className="w-5 h-5 text-black" />
              )}
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={shareLink}
              className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center"
            >
              <Share2 className="w-5 h-5 text-white" />
            </motion.button>
          </div>

          <p className="text-white/40 text-xs mt-3">
            10% с покупок друзей (L1) + 5% с их рефералов (L2)
          </p>
        </motion.div>
      </div>

      {/* Stats Cards */}
      <div className="px-4 mb-4 grid grid-cols-2 gap-3">
        <motion.div
          className="bg-zinc-900/80 rounded-xl p-4 border border-white/5"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <CurrencyIcon type="AR" className="w-5 h-5" />
            <span className="text-white/50 text-xs">Заработано AR</span>
          </div>
          <div className="text-2xl font-black text-white">
            {stats?.total_earned_ar?.toLocaleString() || 0}
          </div>
        </motion.div>

        <motion.div
          className="bg-zinc-900/80 rounded-xl p-4 border border-white/5"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <CurrencyIcon type="BUL" className="w-5 h-5" />
            <span className="text-white/50 text-xs">Заработано BUL</span>
          </div>
          <div className="text-2xl font-black text-white">
            {stats?.total_earned_bul?.toLocaleString() || 0}
          </div>
        </motion.div>

        <motion.div
          className="bg-zinc-900/80 rounded-xl p-4 border border-white/5"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-green-400" />
            <span className="text-white/50 text-xs">Линия 1 (10%)</span>
          </div>
          <div className="text-2xl font-black text-white">
            {stats?.l1_count || 0}
          </div>
        </motion.div>

        <motion.div
          className="bg-zinc-900/80 rounded-xl p-4 border border-white/5"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-white/50 text-xs">Линия 2 (5%)</span>
          </div>
          <div className="text-2xl font-black text-white">
            {stats?.l2_count || 0}
          </div>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="px-4 mb-4">
        <div className="flex bg-zinc-900/80 rounded-xl p-1 border border-white/5">
          {(['overview', 'team', 'earnings'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-yellow-500 text-black'
                  : 'text-white/50 hover:text-white/70'
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
      <div className="flex-1 overflow-y-auto px-4 pb-8">
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
              <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/5">
                <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-yellow-400" />
                  Как это работает
                </h3>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                      <span className="text-green-400 font-bold text-sm">1</span>
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">Поделись ссылкой</p>
                      <p className="text-white/50 text-xs">Отправь друзьям свою реферальную ссылку</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                      <span className="text-blue-400 font-bold text-sm">2</span>
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">Друг регистрируется</p>
                      <p className="text-white/50 text-xs">Он попадает в твою команду (Линия 1)</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0">
                      <span className="text-yellow-400 font-bold text-sm">3</span>
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">Получай бонусы</p>
                      <p className="text-white/50 text-xs">10% от покупок друзей, 5% от их рефералов</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              {(stats?.recent_earnings?.length || 0) > 0 && (
                <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/5">
                  <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                    <Gift className="w-4 h-4 text-purple-400" />
                    Последние начисления
                  </h3>
                  <div className="space-y-2">
                    {stats?.recent_earnings?.slice(0, 5).map((earning) => (
                      <div
                        key={earning.id}
                        className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            earning.level === 1 ? 'bg-green-500/20' : 'bg-blue-500/20'
                          }`}>
                            <span className={`text-xs font-bold ${
                              earning.level === 1 ? 'text-green-400' : 'text-blue-400'
                            }`}>L{earning.level}</span>
                          </div>
                          <div>
                            <p className="text-white text-sm">
                              {earning.referred_name || earning.referred_username || 'Пользователь'}
                            </p>
                            <p className="text-white/40 text-xs">
                              {formatPurchaseType(earning.purchase_type)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-green-400 text-sm font-bold flex items-center gap-1">
                            +{earning.bonus_amount.toLocaleString()}
                            <CurrencyIcon type={earning.currency} className="w-3 h-3" />
                          </p>
                          <p className="text-white/30 text-xs">{earning.bonus_percent}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {(stats?.recent_earnings?.length || 0) > 5 && (
                    <button
                      onClick={() => setActiveTab('earnings')}
                      className="w-full mt-3 py-2 text-yellow-400 text-sm font-medium flex items-center justify-center gap-1"
                    >
                      Показать все <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              {/* Empty State */}
              {(!stats?.team || stats.team.length === 0) && (
                <div className="bg-zinc-900/50 rounded-xl p-8 border border-white/5 text-center">
                  <Users className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white font-medium mb-1">Пока никого нет</p>
                  <p className="text-white/50 text-sm">
                    Поделись ссылкой и начни зарабатывать!
                  </p>
                </div>
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
                <button
                  onClick={() => setTeamFilter(null)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    teamFilter === null
                      ? 'bg-yellow-500 text-black'
                      : 'bg-zinc-800 text-white/50'
                  }`}
                >
                  Все ({stats?.team?.length || 0})
                </button>
                <button
                  onClick={() => setTeamFilter(1)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    teamFilter === 1
                      ? 'bg-green-500 text-black'
                      : 'bg-zinc-800 text-white/50'
                  }`}
                >
                  L1 ({stats?.l1_count || 0})
                </button>
                <button
                  onClick={() => setTeamFilter(2)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    teamFilter === 2
                      ? 'bg-blue-500 text-black'
                      : 'bg-zinc-800 text-white/50'
                  }`}
                >
                  L2 ({stats?.l2_count || 0})
                </button>
              </div>

              {/* Team List */}
              {filteredTeam.length > 0 ? (
                <div className="space-y-2">
                  {filteredTeam.map((member) => (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-zinc-900/80 rounded-xl p-4 border border-white/5 flex items-center gap-3"
                    >
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden shrink-0">
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
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            member.level === 1
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-blue-500/20 text-blue-400'
                          }`}>
                            L{member.level}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-3 h-3 text-white/30" />
                          <span className="text-white/40 text-xs">
                            {formatDate(member.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Earned */}
                      <div className="text-right">
                        <p className="text-green-400 text-sm font-bold">
                          +{member.total_earned?.toLocaleString() || 0}
                        </p>
                        <p className="text-white/30 text-xs">заработано</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="bg-zinc-900/50 rounded-xl p-8 border border-white/5 text-center">
                  <Users className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white font-medium mb-1">
                    {teamFilter ? `Нет рефералов L${teamFilter}` : 'Команда пуста'}
                  </p>
                  <p className="text-white/50 text-sm">
                    Приглашай друзей по своей ссылке
                  </p>
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
                stats?.recent_earnings?.map((earning) => (
                  <motion.div
                    key={earning.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-zinc-900/80 rounded-xl p-4 border border-white/5"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          earning.level === 1
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          L{earning.level} • {earning.bonus_percent}%
                        </span>
                        <span className="text-white/40 text-xs">
                          {formatDate(earning.created_at)}
                        </span>
                      </div>
                      <p className="text-green-400 font-bold flex items-center gap-1">
                        +{earning.bonus_amount.toLocaleString()}
                        <CurrencyIcon type={earning.currency} className="w-4 h-4" />
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white">
                        {earning.referred_name || earning.referred_username || 'Пользователь'}
                      </span>
                      <span className="text-white/50">
                        {formatPurchaseType(earning.purchase_type)} • {earning.purchase_amount.toLocaleString()} {earning.currency}
                      </span>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="bg-zinc-900/50 rounded-xl p-8 border border-white/5 text-center">
                  <Gift className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white font-medium mb-1">Нет начислений</p>
                  <p className="text-white/50 text-sm">
                    Когда рефералы начнут покупать, ты увидишь бонусы здесь
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom CTA */}
      <div className="p-4 bg-black/90 backdrop-blur-xl border-t border-white/10 pb-8">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={shareLink}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold text-lg flex items-center justify-center gap-2"
        >
          <Share2 className="w-5 h-5" />
          Пригласить друзей
        </motion.button>
      </div>
    </div>
  )
}

export default PartnersPage
