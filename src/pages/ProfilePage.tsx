import { useAuth } from '../hooks/useAuth'
import { useGiveaways } from '../hooks/useGiveaways'
import { supabase } from '../lib/supabase'
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Users,
  Ticket,
  ChevronRight,
  Crown,
  Calendar,
  Sparkles,
  Trophy,
  Zap,
  Key
} from 'lucide-react'
import type { GiveawayHistory } from '../types'

interface PremiumInfo {
  plan: string
  expires_at: string
  total_paid_usd: number
}

interface PartnerSummary {
  l1_count: number
  l2_count: number
  total_earned_ar: number
  referral_code: string
}

interface VaultInfo {
  lockpick_available: boolean
  streak: number
  total_opened: number
  total_earned: number
}

export function ProfilePage() {
  const navigate = useNavigate()
  const { telegramUser, gameState } = useAuth()
  const { getMyGiveawayHistory } = useGiveaways()

  const [createdAt, setCreatedAt] = useState<string | null>(null)
  const [premium, setPremium] = useState<PremiumInfo | null>(null)
  const [partners, setPartners] = useState<PartnerSummary | null>(null)
  const [giveawayHistory, setGiveawayHistory] = useState<GiveawayHistory[]>([])
  const [vault, setVault] = useState<VaultInfo | null>(null)
  const [activeTickets, setActiveTickets] = useState(0)
  const [loading, setLoading] = useState(true)

  // Telegram BackButton
  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (tg?.BackButton) {
      const handleBack = () => {
        navigate(-1)
      }
      tg.BackButton.show()
      tg.BackButton.onClick(handleBack)
      return () => {
        tg.BackButton.offClick(handleBack)
        tg.BackButton.hide()
      }
    }
  }, [navigate])

  // Загрузка всех данных параллельно
  const loadData = useCallback(async () => {
    if (!telegramUser) return

    try {
      const tid = telegramUser.id.toString()

      const [userRes, premiumRes, partnerRes, giveawayRes, vaultRes, ticketsRes] = await Promise.all([
        // Дата регистрации
        supabase
          .from('users')
          .select('created_at')
          .eq('telegram_id', tid)
          .single(),

        // Premium подписка
        supabase
          .from('premium_clients')
          .select('plan, expires_at, total_paid_usd')
          .eq('telegram_id', tid)
          .maybeSingle(),

        // Партнёрская статистика
        supabase.rpc('get_partner_stats', { p_telegram_id: tid }),

        // История розыгрышей
        getMyGiveawayHistory(),

        // Vault state (отмычки)
        supabase.rpc('get_vault_state', { p_user_id: tid }),

        // Активные билеты (из активных розыгрышей)
        supabase
          .from('giveaway_tickets')
          .select('ticket_count, giveaway_id', { count: 'exact' })
          .eq('telegram_id', tid)
      ])

      if (userRes.data) {
        setCreatedAt(userRes.data.created_at)
      }

      if (premiumRes.data) {
        setPremium(premiumRes.data)
      }

      if (partnerRes.data) {
        const p = partnerRes.data as any
        setPartners({
          l1_count: p.l1_count || 0,
          l2_count: p.l2_count || 0,
          total_earned_ar: p.total_earned_ar || 0,
          referral_code: p.referral_code || ''
        })
      }

      if (vaultRes.data) {
        const v = vaultRes.data as any
        setVault({
          lockpick_available: v.lockpick_available || false,
          streak: v.streak || 0,
          total_opened: v.total_opened || 0,
          total_earned: v.total_earned || 0
        })
      }

      // Считаем общее количество билетов
      if (ticketsRes.data) {
        const total = ticketsRes.data.reduce((sum: number, t: any) => sum + (t.ticket_count || 1), 0)
        setActiveTickets(total)
      }

      setGiveawayHistory(giveawayRes as GiveawayHistory[])
    } catch (err) {
      console.error('ProfilePage: error loading data', err)
    } finally {
      setLoading(false)
    }
  }, [telegramUser, getMyGiveawayHistory])

  useEffect(() => {
    loadData()
  }, [loadData])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const isPremiumActive = premium
    ? new Date(premium.expires_at) > new Date()
    : false

  const premiumDaysLeft = premium
    ? Math.max(0, Math.ceil((new Date(premium.expires_at).getTime() - Date.now()) / 86400000))
    : 0

  const totalTeam = (partners?.l1_count || 0) + (partners?.l2_count || 0)
  const totalTickets = giveawayHistory.reduce((sum, g) => sum + (g.my_tickets || 0), 0)

  if (!telegramUser) {
    return (
      <div className="fixed inset-0 bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white text-xl">Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[350px]"
          style={{ background: 'radial-gradient(ellipse at center, rgba(255,215,0,0.08) 0%, transparent 70%)' }}
        />
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-24 pt-[70px]">
        {/* === HEADER: Аватар + Имя === */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center px-4 mb-6"
        >
          <div className="relative mb-3">
            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#FFD700]/40 shadow-lg shadow-[#FFD700]/10">
              {telegramUser.photo_url ? (
                <img src={telegramUser.photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#FFD700] to-[#FFA500] flex items-center justify-center">
                  <span className="text-black text-2xl font-bold">
                    {telegramUser.first_name[0].toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            {isPremiumActive && (
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center border-2 border-[#0a0a0a]">
                <Crown className="w-3.5 h-3.5 text-white" />
              </div>
            )}
          </div>

          <h1 className="text-xl font-bold text-white">
            {telegramUser.first_name}{telegramUser.last_name ? ` ${telegramUser.last_name}` : ''}
          </h1>
          {telegramUser.username && (
            <p className="text-white/50 text-sm">@{telegramUser.username}</p>
          )}
        </motion.div>

        {/* === БАЛАНС AR === */}
        <div className="px-4 mb-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="relative rounded-2xl overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#FFD700]/15 via-[#FFD700]/5 to-transparent" />
            <div className="absolute inset-[1px] rounded-2xl border border-[#FFD700]/20" />
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#FFD700]/40 to-transparent" />

            <div className="relative p-5 flex items-center justify-between">
              <div>
                <div className="text-white/40 text-xs font-medium mb-1">Баланс</div>
                <div className="flex items-center gap-2">
                  <img src="/icons/arcoin.png" alt="AR" className="w-8 h-8" />
                  <span className="text-3xl font-black text-white">
                    {loading ? (
                      <span className="inline-block w-24 h-8 bg-white/10 rounded animate-pulse" />
                    ) : (
                      (gameState?.balance_ar || 0).toLocaleString()
                    )}
                  </span>
                </div>
              </div>
              <Zap className="w-8 h-8 text-[#FFD700]/20" />
            </div>
          </motion.div>
        </div>

        {/* === PREMIUM ПОДПИСКА === */}
        <div className="px-4 mb-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            onClick={() => !isPremiumActive && navigate('/pricing')}
            className={`relative rounded-2xl overflow-hidden ${!isPremiumActive ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''}`}
          >
            {isPremiumActive ? (
              <>
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/15 via-pink-500/5 to-transparent" />
                <div className="absolute inset-[1px] rounded-2xl border border-purple-500/20" />
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-400/40 to-transparent" />

                <div className="relative p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                        <Crown className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold">{premium?.plan || 'Premium'}</span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-green-500/20 text-green-400">
                            Активен
                          </span>
                        </div>
                        <p className="text-white/40 text-xs">
                          {premiumDaysLeft} дн. до {formatDate(premium!.expires_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="absolute inset-0 bg-white/[0.03]" />
                <div className="absolute inset-[1px] rounded-2xl border border-white/10" />

                <div className="relative p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                      <Crown className="w-5 h-5 text-white/30" />
                    </div>
                    <div>
                      <span className="text-white font-medium">Premium</span>
                      <p className="text-white/30 text-xs">Нет активной подписки</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[#FFD700]">
                    <span className="text-sm font-semibold">Подключить</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </div>

        {/* === ПАРТНЁРКА === */}
        <div className="px-4 mb-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            onClick={() => navigate('/partners')}
            className="relative rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
          >
            <div className="absolute inset-0 bg-white/[0.03]" />
            <div className="absolute inset-[1px] rounded-2xl border border-white/10" />

            <div className="relative p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFD700]/20 to-[#FFA500]/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-[#FFD700]" />
                  </div>
                  <div>
                    <span className="text-white font-bold">Партнёры</span>
                    <div className="flex items-center gap-3 mt-0.5">
                      {loading ? (
                        <span className="inline-block w-32 h-4 bg-white/10 rounded animate-pulse" />
                      ) : (
                        <>
                          <span className="text-white/40 text-xs">
                            В команде: <span className="text-white font-semibold">{totalTeam}</span>
                          </span>
                          {(partners?.total_earned_ar || 0) > 0 && (
                            <span className="text-green-400 text-xs font-medium">
                              +{partners!.total_earned_ar.toLocaleString()} AR
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-white/20" />
              </div>

              {/* L1/L2 pills */}
              {!loading && totalTeam > 0 && (
                <div className="flex gap-2 mt-3 pl-[52px]">
                  <div className="px-2.5 py-1 rounded-lg bg-green-500/10 border border-green-500/20">
                    <span className="text-green-400 text-xs font-medium">L1: {partners?.l1_count || 0}</span>
                  </div>
                  <div className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <span className="text-blue-400 text-xs font-medium">L2: {partners?.l2_count || 0}</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* === МОИ БИЛЕТЫ + ОТМЫЧКИ (2 в ряд) === */}
        <div className="px-4 mb-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.22 }}
            className="grid grid-cols-2 gap-3"
          >
            {/* Билеты */}
            <div
              onClick={() => navigate('/giveaways')}
              className="relative rounded-2xl overflow-hidden cursor-pointer active:scale-[0.97] transition-transform"
            >
              <div className="absolute inset-0 bg-white/[0.03]" />
              <div className="absolute inset-[1px] rounded-2xl border border-white/10" />
              <div className="relative p-4 flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-[#FFD700]/10 flex items-center justify-center">
                  <Ticket className="w-5 h-5 text-[#FFD700]" />
                </div>
                <span className="text-2xl font-black text-white">
                  {loading ? '—' : activeTickets}
                </span>
                <span className="text-white/40 text-xs">Мои билеты</span>
              </div>
            </div>

            {/* Отмычки */}
            <div
              onClick={() => navigate('/vault')}
              className="relative rounded-2xl overflow-hidden cursor-pointer active:scale-[0.97] transition-transform"
            >
              <div className="absolute inset-0 bg-white/[0.03]" />
              <div className="absolute inset-[1px] rounded-2xl border border-white/10" />
              <div className="relative p-4 flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-[#FFA500]/10 flex items-center justify-center">
                  <Key className="w-5 h-5 text-[#FFA500]" />
                </div>
                <span className="text-2xl font-black text-white">
                  {loading ? '—' : (vault?.lockpick_available ? 1 : 0)}
                </span>
                <span className="text-white/40 text-xs">Мои отмычки</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* === МОИ РОЗЫГРЫШИ === */}
        <div className="px-4 mb-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25 }}
            className="relative rounded-2xl overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/[0.03]" />
            <div className="absolute inset-[1px] rounded-2xl border border-white/10" />

            <div className="relative p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FFD700]/10 flex items-center justify-center">
                    <Ticket className="w-5 h-5 text-[#FFD700]" />
                  </div>
                  <div>
                    <span className="text-white font-bold">Мои розыгрыши</span>
                    {!loading && totalTickets > 0 && (
                      <p className="text-white/40 text-xs">
                        {totalTickets} билет{totalTickets === 1 ? '' : totalTickets < 5 ? 'а' : 'ов'}
                      </p>
                    )}
                  </div>
                </div>
                {giveawayHistory.length > 0 && (
                  <button
                    onClick={() => navigate('/giveaways')}
                    className="text-[#FFD700] text-xs font-semibold flex items-center gap-0.5"
                  >
                    Все <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Content */}
              {loading ? (
                <div className="flex justify-center py-6">
                  <div className="w-5 h-5 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : giveawayHistory.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-white/30 text-sm">Нет участий</p>
                  <button
                    onClick={() => navigate('/giveaways')}
                    className="mt-2 text-[#FFD700] text-sm font-medium"
                  >
                    Посмотреть розыгрыши
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {giveawayHistory.slice(0, 3).map((g) => (
                    <div
                      key={g.id}
                      onClick={() => navigate(`/giveaway/${g.id}`)}
                      className="flex items-center gap-3 p-3 bg-black/20 rounded-xl cursor-pointer active:bg-black/40 transition-colors"
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        g.is_winner
                          ? 'bg-[#FFD700]/20'
                          : g.status === 'active'
                            ? 'bg-green-500/20'
                            : 'bg-white/5'
                      }`}>
                        {g.is_winner ? (
                          <Trophy className="w-4 h-4 text-[#FFD700]" />
                        ) : g.status === 'active' ? (
                          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        ) : (
                          <Ticket className="w-4 h-4 text-white/30" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${g.is_winner ? 'text-[#FFD700]' : 'text-white'}`}>
                          {g.title}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-white/40">
                          <span>{g.my_tickets} бил.</span>
                          {g.is_winner && g.winner_place && (
                            <span className="text-[#FFD700]">#{g.winner_place}</span>
                          )}
                          {g.status === 'active' && (
                            <span className="text-green-400">Активен</span>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-white/15 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* === ДАТА РЕГИСТРАЦИИ === */}
        <div className="px-4 mb-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="relative rounded-2xl overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/[0.02]" />
            <div className="absolute inset-[1px] rounded-2xl border border-white/5" />

            <div className="relative px-4 py-3 flex items-center gap-3">
              <Calendar className="w-4 h-4 text-white/30" />
              <div className="flex items-center gap-2">
                <span className="text-white/30 text-xs">Дата регистрации:</span>
                <span className="text-white/60 text-xs font-medium">
                  {loading || !createdAt ? (
                    <span className="inline-block w-24 h-3.5 bg-white/10 rounded animate-pulse" />
                  ) : (
                    formatDate(createdAt)
                  )}
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* === SPARKLE FOOTER === */}
        <div className="px-4 mb-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center justify-center gap-2 py-2"
          >
            <Sparkles className="w-3 h-3 text-[#FFD700]/20" />
            <span className="text-white/15 text-[10px] tracking-wider uppercase">AR Arena</span>
            <Sparkles className="w-3 h-3 text-[#FFD700]/20" />
          </motion.div>
        </div>
      </div>
    </div>
  )
}
