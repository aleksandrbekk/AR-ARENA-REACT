import { useState, useEffect } from 'react'
import { Layout } from '../components/layout/Layout'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../components/ToastProvider'
import { supabase } from '../lib/supabase'

// ============ ТИПЫ ============
interface User {
  id: string
  telegram_id: number
  username: string | null
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  created_at: string
  status: 'new' | 'active' | 'premium' | 'expired'
  premium_expires?: string | null
}

interface PremiumClient {
  id: string
  telegram_id: number
  username: string | null
  first_name: string | null
  avatar_url: string | null
  plan: string
  started_at: string
  expires_at: string
  in_channel: boolean
  in_chat: boolean
  total_paid_usd: number
  payments_count: number
  last_payment_at: string | null
  last_payment_method: string | null
  source: string | null
  tags: string[]
}

type TabType = 'users' | 'premium' | 'broadcast'

// ============ КОНСТАНТЫ ============
const BOT_TOKEN = '***REMOVED***'
const ADMIN_PASSWORD = 'arena2024'

// ============ КОМПОНЕНТ ============
export function FullCrmPage() {
  const { telegramUser, isLoading } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [activeTab, setActiveTab] = useState<TabType>('users')
  const [users, setUsers] = useState<User[]>([])
  const [premiumClients, setPremiumClients] = useState<PremiumClient[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<number[]>([])
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [sendingBroadcast, setSendingBroadcast] = useState(false)
  const [broadcastProgress, setBroadcastProgress] = useState({ sent: 0, total: 0 })
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  // Модалка для отправки сообщения
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)

  // Premium фильтры и поиск
  const [premiumSearch, setPremiumSearch] = useState('')
  const [premiumFilter, setPremiumFilter] = useState<'all' | 'active' | 'expiring' | 'expired'>('all')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [daysToAdd, setDaysToAdd] = useState(30)
  const [selectedPremiumClient, setSelectedPremiumClient] = useState<PremiumClient | null>(null)

  // Защита паролем для браузера
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState(false)

  const ADMIN_IDS = [190202791, 144828618, 288542643, 288475216]
  const isTelegramWebApp = !!window.Telegram?.WebApp?.initData
  const isAdmin = telegramUser?.id ? ADMIN_IDS.includes(telegramUser.id) : false

  // Проверка авторизации при загрузке
  useEffect(() => {
    if (isTelegramWebApp) {
      // В Telegram - проверяем по ID
      setIsAuthenticated(isAdmin)
    } else {
      // В браузере - проверяем localStorage
      const saved = localStorage.getItem('admin_auth')
      if (saved === 'true') {
        setIsAuthenticated(true)
      }
    }
  }, [isTelegramWebApp, isAdmin])

  const handlePasswordSubmit = () => {
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAuthenticated(true)
      localStorage.setItem('admin_auth', 'true')
      setPasswordError(false)
    } else {
      setPasswordError(true)
    }
  }

  // ============ ЗАГРУЗКА ============
  useEffect(() => {
    if (isAuthenticated) loadData()
  }, [isAuthenticated])

  const loadData = async () => {
    try {
      setLoading(true)
      const { data: usersData } = await supabase
        .from('users')
        .select('id, telegram_id, username, first_name, last_name, avatar_url, created_at')
        .order('created_at', { ascending: false })

      const { data: premiumData } = await supabase
        .from('premium_clients')
        .select('telegram_id, expires_at')

      const premiumMap = new Map()
      premiumData?.forEach(p => premiumMap.set(p.telegram_id, p.expires_at))

      const now = new Date()
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      const usersWithStatus: User[] = (usersData || []).map(user => {
        const premiumExpires = premiumMap.get(user.telegram_id)
        let status: User['status'] = 'active'

        if (premiumExpires) {
          status = new Date(premiumExpires) > now ? 'premium' : 'expired'
        }
        if (new Date(user.created_at) > sevenDaysAgo && status !== 'premium') {
          status = 'new'
        }

        return { ...user, status, premium_expires: premiumExpires || null }
      })

      setUsers(usersWithStatus)

      const { data: premiumClientsData } = await supabase
        .from('premium_clients')
        .select('*')
        .order('expires_at', { ascending: true })

      // Подтягиваем аватарки из уже загруженных users (без доп. запросов)
      const avatarMap = new Map<number, string | null>()
      usersWithStatus.forEach(u => avatarMap.set(u.telegram_id, u.avatar_url))

      const premiumWithAvatars = (premiumClientsData || []).map(client => ({
        ...client,
        avatar_url: avatarMap.get(client.telegram_id) || null
      }))

      setPremiumClients(premiumWithAvatars as PremiumClient[])
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  // ============ ФИЛЬТРАЦИЯ ============
  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      user.username?.toLowerCase().includes(q) ||
      user.first_name?.toLowerCase().includes(q) ||
      user.telegram_id.toString().includes(q)
    )
  })

  const premiumUsers = users.filter(u => u.status === 'premium')
  const nonPremiumUsers = users.filter(u => u.status !== 'premium')

  // Вспомогательные функции (перенесены выше для использования в фильтрах)
  const getDaysRemaining = (expiresAt: string) => {
    const now = new Date()
    const expires = new Date(expiresAt)
    const diff = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const getDaysColor = (days: number) => {
    if (days <= 0) return 'text-red-400'
    if (days <= 3) return 'text-red-400'
    if (days <= 7) return 'text-orange-400'
    if (days <= 14) return 'text-yellow-400'
    return 'text-green-400'
  }

  // Фильтрация Premium клиентов
  const filteredPremiumClients = premiumClients.filter(client => {
    // Поиск
    if (premiumSearch) {
      const q = premiumSearch.toLowerCase()
      const matchesSearch =
        client.username?.toLowerCase().includes(q) ||
        client.first_name?.toLowerCase().includes(q) ||
        client.telegram_id.toString().includes(q)
      if (!matchesSearch) return false
    }

    // Фильтр по плану
    if (planFilter !== 'all' && client.plan !== planFilter) return false

    // Фильтр по статусу
    const days = getDaysRemaining(client.expires_at)
    if (premiumFilter === 'active' && days <= 7) return false
    if (premiumFilter === 'expiring' && (days <= 0 || days > 7)) return false
    if (premiumFilter === 'expired' && days > 0) return false

    return true
  })

  // ============ УДАЛИТЬ КЛИЕНТА ============
  const deletePremiumClient = async (clientId: string, telegramId: number) => {
    if (!confirm(`Удалить клиента ${telegramId} из Premium?`)) return

    try {
      const { error } = await supabase
        .from('premium_clients')
        .delete()
        .eq('id', clientId)

      if (error) throw error

      // Удаляем из локального стейта
      setPremiumClients(prev => prev.filter(c => c.id !== clientId))
      setSelectedPremiumClient(null)
      showToast({ variant: 'success', title: 'Клиент удалён' })
    } catch (err) {
      console.error('Error deleting client:', err)
      showToast({ variant: 'error', title: 'Ошибка удаления' })
    }
  }

  // ============ ДОБАВИТЬ ДНИ ============
  const addDays = async (clientId: string, telegramId: number, currentExpires: string, days: number) => {
    try {
      const currentDate = new Date(currentExpires)
      const now = new Date()
      // Если подписка истекла, добавляем от сегодня
      const baseDate = currentDate > now ? currentDate : now
      const newExpires = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000)

      const { error } = await supabase
        .from('premium_clients')
        .update({ expires_at: newExpires.toISOString() })
        .eq('id', clientId)

      if (error) throw error

      // Обновляем локальный стейт
      setPremiumClients(prev => prev.map(c =>
        c.id === clientId ? { ...c, expires_at: newExpires.toISOString() } : c
      ))

      showToast({ variant: 'success', title: `+${days} дней добавлено` })

      // Уведомляем пользователя
      await sendMessage(telegramId, `🎁 Вам начислено <b>${days} бонусных дней</b> подписки!\n\nНовая дата окончания: ${newExpires.toLocaleDateString('ru-RU')}`)
    } catch (err) {
      console.error('Error adding days:', err)
      showToast({ variant: 'error', title: 'Ошибка добавления дней' })
    }
  }

  // ============ СООБЩЕНИЯ ============
  const sendMessage = async (telegramId: number, message: string): Promise<boolean> => {
    try {
      const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: telegramId, text: message, parse_mode: 'HTML' })
      })
      return (await res.json()).ok
    } catch { return false }
  }

  const handleBroadcast = async () => {
    if (!broadcastMessage.trim()) return showToast({ variant: 'error', title: 'Введите сообщение' })

    const targets = selectedUsers.length > 0
      ? users.filter(u => selectedUsers.includes(u.telegram_id))
      : filteredUsers

    if (!confirm(`Отправить ${targets.length} пользователям?`)) return

    setSendingBroadcast(true)
    setBroadcastProgress({ sent: 0, total: targets.length })

    let sent = 0
    for (const user of targets) {
      if (await sendMessage(user.telegram_id, broadcastMessage)) sent++
      setBroadcastProgress({ sent, total: targets.length })
      await new Promise(r => setTimeout(r, 50))
    }

    setSendingBroadcast(false)
    setBroadcastMessage('')
    setSelectedUsers([])
    showToast({ variant: 'success', title: `Отправлено: ${sent}/${targets.length}` })
  }

  // ============ ВЫБОР ============
  const selectAll = (list: User[]) => {
    const ids = list.map(u => u.telegram_id)
    const allSelected = ids.every(id => selectedUsers.includes(id))
    setSelectedUsers(allSelected ? [] : ids)
  }

  // ============ ФОРМАТЫ ============
  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) : '-'
  const formatFullDate = (d: string | null) => d ? new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'

  const getInitial = (user: User) => (user.first_name || user.username || '?')[0]?.toUpperCase()
  const getPremiumInitial = (client: PremiumClient) => (client.first_name || client.username || '?')[0]?.toUpperCase()

  // ============ TELEGRAM BACK ============
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp
      const handleBack = () => {
        if (selectedPremiumClient) {
          setSelectedPremiumClient(null)
        } else if (selectedUser) {
          setSelectedUser(null)
        } else {
          navigate('/admin')
        }
      }
      tg.BackButton.show()
      tg.BackButton.onClick(handleBack)
      return () => { tg.BackButton.offClick(handleBack); tg.BackButton.hide() }
    }
  }, [navigate, selectedUser, selectedPremiumClient])

  // ============ ДОСТУП ============
  // В Telegram - проверяем ID, в браузере - показываем форму пароля
  if (!isLoading && !isAuthenticated) {
    // Если в Telegram и не админ - запрещаем
    if (isTelegramWebApp && !isAdmin) {
      return (
        <Layout hideNavbar>
          <div className="flex flex-col items-center justify-center min-h-screen">
            <div className="text-white/40 text-lg">Доступ запрещён</div>
          </div>
        </Layout>
      )
    }

    // Если в браузере - показываем форму пароля
    if (!isTelegramWebApp) {
      return (
        <Layout hideNavbar>
          <div className="min-h-screen bg-[#000] flex items-center justify-center px-4">
            <div className="w-full max-w-sm">
              <h1 className="text-2xl font-bold text-white text-center mb-8">Admin CRM</h1>
              <div className="space-y-4">
                <input
                  type="password"
                  value={passwordInput}
                  onChange={e => { setPasswordInput(e.target.value); setPasswordError(false) }}
                  onKeyDown={e => e.key === 'Enter' && handlePasswordSubmit()}
                  placeholder="Пароль"
                  className={`w-full px-4 py-3 bg-zinc-900 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 ${
                    passwordError ? 'ring-2 ring-red-500' : 'focus:ring-white/20'
                  }`}
                  autoFocus
                />
                {passwordError && (
                  <p className="text-red-400 text-sm text-center">Неверный пароль</p>
                )}
                <button
                  onClick={handlePasswordSubmit}
                  className="w-full py-3 bg-white text-black font-semibold rounded-xl active:scale-[0.98] transition-transform"
                >
                  Войти
                </button>
              </div>
            </div>
          </div>
        </Layout>
      )
    }
  }

  if (loading) {
    return (
      <Layout hideNavbar>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white/50">Загрузка...</div>
        </div>
      </Layout>
    )
  }

  // ============ ДЕТАЛИ PREMIUM КЛИЕНТА ============
  if (selectedPremiumClient) {
    const client = selectedPremiumClient
    const daysRemaining = getDaysRemaining(client.expires_at)
    const isExpired = daysRemaining <= 0

    return (
      <Layout hideNavbar>
        <div className="min-h-screen bg-[#000] text-white pt-[60px] pb-8">
          <div className="max-w-lg mx-auto px-4">
            {/* Кнопка назад */}
            <button
              onClick={() => setSelectedPremiumClient(null)}
              className="flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Назад
            </button>

            {/* Аватар и имя */}
            <div className="flex flex-col items-center mb-6">
              {client.avatar_url ? (
                <img src={client.avatar_url} alt="" className="w-24 h-24 rounded-full object-cover mb-4" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center text-3xl font-medium text-white/60 mb-4">
                  {getPremiumInitial(client)}
                </div>
              )}
              <h1 className="text-2xl font-semibold">
                {client.username ? `@${client.username}` : client.first_name || 'Без имени'}
              </h1>
              <p className="text-white/40 font-mono text-sm mt-1">{client.telegram_id}</p>

              {/* Бейдж плана */}
              <div className={`mt-3 px-4 py-1.5 rounded-full text-sm font-bold uppercase ${
                client.plan === 'private' ? 'bg-purple-500/20 text-purple-400' :
                client.plan === 'platinum' ? 'bg-cyan-500/20 text-cyan-400' :
                client.plan === 'gold' ? 'bg-[#FFD700]/20 text-[#FFD700]' :
                'bg-zinc-700/50 text-white/70'
              }`}>
                {client.plan || 'N/A'}
              </div>
            </div>

            {/* Главный блок: дни */}
            <div className="bg-zinc-900 rounded-2xl p-6 mb-4 text-center">
              <div className="text-white/40 text-sm mb-2">Осталось дней</div>
              <div className={`text-5xl font-bold ${getDaysColor(daysRemaining)}`}>
                {isExpired ? '0' : daysRemaining}
              </div>
              <div className="text-white/40 text-sm mt-2">
                {isExpired ? 'Подписка истекла' : `до ${formatFullDate(client.expires_at)}`}
              </div>
            </div>

            {/* Добавить дни */}
            <div className="bg-zinc-900 rounded-2xl p-4 mb-4">
              <div className="text-white/40 text-xs uppercase tracking-wide mb-3">Добавить бонусные дни</div>
              <div className="flex items-center gap-3 mb-3">
                <input
                  type="range"
                  min="1"
                  max="365"
                  value={daysToAdd}
                  onChange={e => setDaysToAdd(Number(e.target.value))}
                  className="flex-1 h-2 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-[#FFD700]"
                />
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={daysToAdd}
                  onChange={e => setDaysToAdd(Math.max(1, Number(e.target.value)))}
                  className="w-20 px-3 py-2 bg-zinc-800 rounded-lg text-center text-white font-medium focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50"
                />
                <span className="text-white/40">дн.</span>
              </div>
              <button
                onClick={async () => {
                  await addDays(client.id, client.telegram_id, client.expires_at, daysToAdd)
                  // Обновляем selectedPremiumClient
                  const newExpires = new Date(
                    (new Date(client.expires_at) > new Date() ? new Date(client.expires_at) : new Date()).getTime() + daysToAdd * 24 * 60 * 60 * 1000
                  )
                  setSelectedPremiumClient({ ...client, expires_at: newExpires.toISOString() })
                }}
                className="w-full py-3 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl font-medium transition-all active:scale-[0.98]"
              >
                + Добавить {daysToAdd} дней
              </button>
            </div>

            {/* Статистика */}
            <div className="bg-zinc-900 rounded-2xl overflow-hidden mb-4">
              <div className="px-4 py-3 flex justify-between border-b border-white/5">
                <span className="text-white/50">Всего оплачено</span>
                <span className="text-white font-medium">
                  {client.source === 'lava.top'
                    ? `${(client.total_paid_usd || 0).toLocaleString('ru-RU')} ₽`
                    : `$${client.total_paid_usd || 0}`}
                </span>
              </div>
              <div className="px-4 py-3 flex justify-between border-b border-white/5">
                <span className="text-white/50">Платежей</span>
                <span className="text-white font-medium">{client.payments_count || 1}</span>
              </div>
              <div className="px-4 py-3 flex justify-between border-b border-white/5">
                <span className="text-white/50">Источник</span>
                <span className="text-white font-medium">{client.source || '-'}</span>
              </div>
              <div className="px-4 py-3 flex justify-between border-b border-white/5">
                <span className="text-white/50">Последний платёж</span>
                <span className="text-white font-medium">
                  {client.last_payment_at ? formatFullDate(client.last_payment_at) : '-'}
                </span>
              </div>
              <div className="px-4 py-3 flex justify-between border-b border-white/5">
                <span className="text-white/50">Метод оплаты</span>
                <span className="text-white font-medium">
                  {client.last_payment_method === 'lava.top' ? '💳 Карта' : client.last_payment_method === '0xprocessing' ? '🪙 Крипто' : client.last_payment_method || '-'}
                </span>
              </div>
              <div className="px-4 py-3 flex justify-between">
                <span className="text-white/50">Клиент с</span>
                <span className="text-white font-medium">{formatFullDate(client.started_at)}</span>
              </div>
            </div>

            {/* Статус в канале/чате */}
            <div className="bg-zinc-900 rounded-2xl p-4 mb-4">
              <div className="text-white/40 text-xs uppercase tracking-wide mb-3">Статус доступа</div>
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3 rounded-xl text-center ${client.in_channel ? 'bg-green-500/20' : 'bg-zinc-800'}`}>
                  <div className={`text-2xl mb-1 ${client.in_channel ? 'text-green-400' : 'text-white/30'}`}>
                    {client.in_channel ? '✓' : '✗'}
                  </div>
                  <div className={`text-sm ${client.in_channel ? 'text-green-400' : 'text-white/30'}`}>Канал</div>
                </div>
                <div className={`p-3 rounded-xl text-center ${client.in_chat ? 'bg-green-500/20' : 'bg-zinc-800'}`}>
                  <div className={`text-2xl mb-1 ${client.in_chat ? 'text-green-400' : 'text-white/30'}`}>
                    {client.in_chat ? '✓' : '✗'}
                  </div>
                  <div className={`text-sm ${client.in_chat ? 'text-green-400' : 'text-white/30'}`}>Чат</div>
                </div>
              </div>
            </div>

            {/* Действия */}
            <button
              onClick={() => { setMessageText(''); setShowMessageModal(true) }}
              className="w-full py-4 bg-white/10 hover:bg-white/15 rounded-2xl text-white font-medium transition-colors mb-3"
            >
              💬 Написать сообщение
            </button>

            {/* Кнопка удаления */}
            <button
              onClick={() => deletePremiumClient(client.id, client.telegram_id)}
              className="w-full py-4 bg-red-500/10 hover:bg-red-500/20 rounded-2xl text-red-400 font-medium transition-colors mb-3"
            >
              🗑 Удалить клиента
            </button>

            {/* Модалка сообщения */}
            {showMessageModal && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end justify-center z-50">
                <div className="bg-zinc-900 rounded-t-3xl w-full max-w-lg p-6 pb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Сообщение для {client.username ? `@${client.username}` : client.telegram_id}</h3>
                    <button onClick={() => setShowMessageModal(false)} className="w-8 h-8 flex items-center justify-center text-white/60 text-2xl">×</button>
                  </div>
                  <textarea
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    placeholder="Введите сообщение..."
                    className="w-full h-32 bg-zinc-800 rounded-xl p-4 text-white placeholder-white/30 focus:outline-none resize-none mb-4"
                    autoFocus
                  />
                  <button
                    onClick={async () => {
                      if (!messageText.trim()) return
                      setSendingMessage(true)
                      const success = await sendMessage(client.telegram_id, messageText)
                      setSendingMessage(false)
                      if (success) {
                        showToast({ variant: 'success', title: 'Сообщение отправлено' })
                        setShowMessageModal(false)
                      } else {
                        showToast({ variant: 'error', title: 'Ошибка отправки' })
                      }
                    }}
                    disabled={sendingMessage || !messageText.trim()}
                    className="w-full py-4 bg-white text-black font-semibold rounded-xl disabled:opacity-30 active:scale-[0.98] transition-transform"
                  >
                    {sendingMessage ? 'Отправка...' : 'Отправить'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Layout>
    )
  }

  // ============ ДЕТАЛИ ПОЛЬЗОВАТЕЛЯ ============
  if (selectedUser) {
    return (
      <Layout hideNavbar>
        <div className="min-h-screen bg-[#000] text-white pt-[60px]">
          <div className="max-w-lg mx-auto px-4 py-6">
            {/* Аватар и имя */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center text-3xl font-medium text-white/60 mb-4">
                {getInitial(selectedUser)}
              </div>
              <h1 className="text-2xl font-semibold">
                {selectedUser.username ? `@${selectedUser.username}` : selectedUser.first_name || 'Без имени'}
              </h1>
              <p className="text-white/40 font-mono text-sm mt-1">{selectedUser.telegram_id}</p>

              {/* Статус */}
              <div className={`mt-3 px-3 py-1 rounded-full text-sm ${
                selectedUser.status === 'premium' ? 'bg-[#FFD700]/20 text-[#FFD700]' :
                selectedUser.status === 'new' ? 'bg-blue-500/20 text-blue-400' :
                selectedUser.status === 'expired' ? 'bg-red-500/20 text-red-400' :
                'bg-white/10 text-white/60'
              }`}>
                {selectedUser.status === 'premium' ? 'Premium' :
                 selectedUser.status === 'new' ? 'Новый' :
                 selectedUser.status === 'expired' ? 'Подписка истекла' : 'Активный'}
              </div>
            </div>

            {/* Информация */}
            <div className="bg-zinc-900/50 rounded-2xl overflow-hidden mb-6">
              <div className="px-4 py-3 flex justify-between border-b border-white/5">
                <span className="text-white/50">Регистрация</span>
                <span className="text-white">{formatDate(selectedUser.created_at)}</span>
              </div>
              {selectedUser.premium_expires && (
                <div className="px-4 py-3 flex justify-between">
                  <span className="text-white/50">Premium до</span>
                  <span className="text-white">{formatDate(selectedUser.premium_expires)}</span>
                </div>
              )}
            </div>

            {/* Действия */}
            <button
              onClick={() => { setMessageText(''); setShowMessageModal(true) }}
              className="w-full py-4 bg-white/10 hover:bg-white/15 rounded-2xl text-white font-medium transition-colors"
            >
              Написать сообщение
            </button>

            {/* Модалка сообщения */}
            {showMessageModal && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end justify-center z-50">
                <div className="bg-zinc-900 rounded-t-3xl w-full max-w-lg p-6 pb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Сообщение</h3>
                    <button
                      onClick={() => setShowMessageModal(false)}
                      className="w-8 h-8 flex items-center justify-center text-white/60 text-2xl"
                    >
                      ×
                    </button>
                  </div>
                  <textarea
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    placeholder="Введите сообщение..."
                    className="w-full h-32 bg-zinc-800 rounded-xl p-4 text-white placeholder-white/30 focus:outline-none resize-none mb-4"
                    autoFocus
                  />
                  <button
                    onClick={async () => {
                      if (!messageText.trim()) return
                      setSendingMessage(true)
                      const success = await sendMessage(selectedUser.telegram_id, messageText)
                      setSendingMessage(false)
                      if (success) {
                        showToast({ variant: 'success', title: 'Сообщение отправлено' })
                        setShowMessageModal(false)
                      } else {
                        showToast({ variant: 'error', title: 'Ошибка отправки' })
                      }
                    }}
                    disabled={sendingMessage || !messageText.trim()}
                    className="w-full py-4 bg-white text-black font-semibold rounded-xl disabled:opacity-30 active:scale-[0.98] transition-transform"
                  >
                    {sendingMessage ? 'Отправка...' : 'Отправить'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Layout>
    )
  }

  // ============ ГЛАВНЫЙ ЭКРАН ============
  return (
    <Layout hideNavbar>
      <div className="min-h-screen bg-[#000] text-white pt-[60px] pb-24">
        <div className="max-w-3xl mx-auto px-4">

          {/* Заголовок */}
          <div className="py-4 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">CRM</h1>
              <p className="text-white/40 mt-1">{users.length} пользователей</p>
            </div>
            <button
              onClick={() => loadData()}
              disabled={loading}
              className="p-3 bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-colors disabled:opacity-50"
              title="Обновить данные"
            >
              <svg className={`w-5 h-5 text-white/60 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          {/* Табы */}
          <div className="flex gap-1 p-1 bg-zinc-900 rounded-xl mb-6">
            {(['users', 'premium', 'broadcast'] as TabType[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab ? 'bg-white text-black' : 'text-white/60'
                }`}
              >
                {tab === 'users' && `Все (${users.length})`}
                {tab === 'premium' && `Premium (${premiumClients.length})`}
                {tab === 'broadcast' && 'Рассылка'}
              </button>
            ))}
          </div>

          {/* ============ ВСЕ ЮЗЕРЫ ============ */}
          {activeTab === 'users' && (
            <>
              {/* Поиск */}
              <div className="relative mb-4">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Поиск..."
                  className="w-full pl-12 pr-4 py-3 bg-zinc-900 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>

              {/* Список */}
              <div className="bg-zinc-900 rounded-2xl overflow-hidden">
                {filteredUsers.map((user, i) => (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={`flex items-center gap-3 px-4 py-3 active:bg-white/5 cursor-pointer ${
                      i !== 0 ? 'border-t border-white/5' : ''
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-white/60 font-medium">
                      {getInitial(user)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {user.username ? `@${user.username}` : user.first_name || 'Без имени'}
                      </div>
                      <div className="text-sm text-white/40 truncate">
                        {user.first_name && user.username ? user.first_name : `ID: ${user.telegram_id}`}
                      </div>
                    </div>
                    {user.status === 'premium' && (
                      <div className="px-2 py-0.5 bg-[#FFD700]/20 text-[#FFD700] rounded text-xs font-medium">
                        PRO
                      </div>
                    )}
                    {user.status === 'new' && (
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                    )}
                    <svg className="w-5 h-5 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                ))}
                {filteredUsers.length === 0 && (
                  <div className="py-12 text-center text-white/30">Ничего не найдено</div>
                )}
              </div>
            </>
          )}

          {/* ============ PREMIUM ============ */}
          {activeTab === 'premium' && (
            <div className="space-y-4">
              {/* Статистика */}
              {(() => {
                const totalRub = premiumClients
                  .filter(c => c.source === 'lava.top')
                  .reduce((sum, c) => sum + (c.total_paid_usd || 0), 0)
                const totalUsd = premiumClients
                  .filter(c => c.source === '0xprocessing')
                  .reduce((sum, c) => sum + (c.total_paid_usd || 0), 0)
                const activeClients = premiumClients.filter(c => getDaysRemaining(c.expires_at) > 0).length
                const totalPayments = premiumClients.reduce((sum, c) => sum + (c.payments_count || 1), 0)

                return (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-900 rounded-xl p-4">
                      <div className="text-white/40 text-xs mb-1">Выручка (RUB)</div>
                      <div className="text-xl font-bold text-white">{totalRub.toLocaleString('ru-RU')} ₽</div>
                    </div>
                    <div className="bg-zinc-900 rounded-xl p-4">
                      <div className="text-white/40 text-xs mb-1">Выручка (USD)</div>
                      <div className="text-xl font-bold text-white">${totalUsd.toLocaleString('en-US')}</div>
                    </div>
                    <div className="bg-zinc-900 rounded-xl p-4">
                      <div className="text-white/40 text-xs mb-1">Активных</div>
                      <div className="text-xl font-bold text-green-400">{activeClients}</div>
                    </div>
                    <div className="bg-zinc-900 rounded-xl p-4">
                      <div className="text-white/40 text-xs mb-1">Платежей</div>
                      <div className="text-xl font-bold text-white">{totalPayments}</div>
                    </div>
                  </div>
                )
              })()}

              {/* Поиск */}
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={premiumSearch}
                  onChange={e => setPremiumSearch(e.target.value)}
                  placeholder="Поиск по имени или ID..."
                  className="w-full pl-12 pr-4 py-3 bg-zinc-900 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>

              {/* Фильтры */}
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {/* По статусу */}
                {[
                  { key: 'all', label: 'Все' },
                  { key: 'active', label: '✓ Активные' },
                  { key: 'expiring', label: '⚠️ Истекают' },
                  { key: 'expired', label: '✗ Истекли' }
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setPremiumFilter(f.key as typeof premiumFilter)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                      premiumFilter === f.key ? 'bg-white text-black' : 'bg-zinc-800 text-white/60'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* По плану */}
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {[
                  { key: 'all', label: 'Все планы', color: 'bg-zinc-700' },
                  { key: 'private', label: 'Private', color: 'bg-purple-500/30 text-purple-400' },
                  { key: 'platinum', label: 'Platinum', color: 'bg-cyan-500/30 text-cyan-400' },
                  { key: 'gold', label: 'Gold', color: 'bg-[#FFD700]/30 text-[#FFD700]' },
                  { key: 'classic', label: 'Classic', color: 'bg-zinc-600' }
                ].map(p => (
                  <button
                    key={p.key}
                    onClick={() => setPlanFilter(p.key)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                      planFilter === p.key
                        ? p.key === 'all' ? 'bg-white text-black' : p.color + ' ring-2 ring-white/30'
                        : 'bg-zinc-800 text-white/50'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Счётчик */}
              <div className="text-sm text-white/40">
                Найдено: <span className="text-white">{filteredPremiumClients.length}</span> из {premiumClients.length}
              </div>

              {/* Список */}
              {filteredPremiumClients.length === 0 ? (
                <div className="bg-zinc-900 rounded-2xl py-12 text-center text-white/30">Нет клиентов</div>
              ) : (
                filteredPremiumClients.map((client) => {
                  const daysRemaining = getDaysRemaining(client.expires_at)
                  const isExpired = daysRemaining <= 0

                  return (
                    <div
                      key={client.id}
                      onClick={() => setSelectedPremiumClient(client)}
                      className={`bg-zinc-900 rounded-2xl p-4 cursor-pointer active:scale-[0.99] transition-transform ${isExpired ? 'opacity-60' : ''}`}
                    >
                      {/* Шапка: имя + план */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {client.avatar_url ? (
                            <img
                              src={client.avatar_url}
                              alt=""
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-white/60 font-medium">
                              {getPremiumInitial(client)}
                            </div>
                          )}
                          <div>
                            <div className="font-medium">
                              {client.username ? `@${client.username}` : client.first_name || client.telegram_id}
                            </div>
                            <div className="text-xs text-white/40 font-mono">{client.telegram_id}</div>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-bold uppercase ${
                          client.plan === 'private' ? 'bg-purple-500/20 text-purple-400' :
                          client.plan === 'platinum' ? 'bg-cyan-500/20 text-cyan-400' :
                          client.plan === 'gold' ? 'bg-[#FFD700]/20 text-[#FFD700]' :
                          'bg-zinc-700/50 text-white/70'
                        }`}>
                          {client.plan || 'N/A'}
                        </div>
                      </div>

                      {/* Основная инфа: дни + дата */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-zinc-800/50 rounded-xl p-3">
                          <div className="text-xs text-white/40 mb-1">Осталось</div>
                          <div className={`text-xl font-bold ${getDaysColor(daysRemaining)}`}>
                            {isExpired ? 'Истёк' : `${daysRemaining} дн.`}
                          </div>
                        </div>
                        <div className="bg-zinc-800/50 rounded-xl p-3">
                          <div className="text-xs text-white/40 mb-1">Истекает</div>
                          <div className="text-lg font-medium text-white">
                            {formatFullDate(client.expires_at)}
                          </div>
                        </div>
                      </div>

                      {/* Детали */}
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between bg-zinc-800/30 rounded-lg px-3 py-2">
                          <span className="text-white/40">Оплачено</span>
                          <span className="text-white font-medium">
                            {client.source === 'lava.top'
                              ? `${(client.total_paid_usd || 0).toLocaleString('ru-RU')} ₽`
                              : `$${client.total_paid_usd || 0}`}
                          </span>
                        </div>
                        <div className="flex justify-between bg-zinc-800/30 rounded-lg px-3 py-2">
                          <span className="text-white/40">Платежей</span>
                          <span className="text-white font-medium">{client.payments_count || 1}</span>
                        </div>
                        <div className="flex justify-between bg-zinc-800/30 rounded-lg px-3 py-2">
                          <span className="text-white/40">Источник</span>
                          <span className="text-white font-medium">{client.source || '-'}</span>
                        </div>
                        <div className="flex justify-between bg-zinc-800/30 rounded-lg px-3 py-2">
                          <span className="text-white/40">Начало</span>
                          <span className="text-white font-medium">{formatDate(client.started_at)}</span>
                        </div>
                      </div>

                      {/* Статус канал/чат */}
                      <div className="flex gap-2 mt-3">
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs ${
                          client.in_channel ? 'bg-green-500/20 text-green-400' : 'bg-zinc-800 text-white/30'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${client.in_channel ? 'bg-green-400' : 'bg-white/30'}`}/>
                          Канал
                        </div>
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs ${
                          client.in_chat ? 'bg-green-500/20 text-green-400' : 'bg-zinc-800 text-white/30'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${client.in_chat ? 'bg-green-400' : 'bg-white/30'}`}/>
                          Чат
                        </div>
                        {client.last_payment_method && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-zinc-800 text-white/50">
                            {client.last_payment_method === 'lava.top' ? '💳' : '🪙'} {client.last_payment_method}
                          </div>
                        )}
                      </div>

                      {/* Стрелка - клик для деталей */}
                      <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-center text-white/30">
                        <span className="text-xs">Нажмите для деталей</span>
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* ============ РАССЫЛКА ============ */}
          {activeTab === 'broadcast' && (
            <div className="space-y-4">
              {/* Получатели */}
              <div className="bg-zinc-900 rounded-2xl p-4">
                <h3 className="text-sm text-white/40 uppercase tracking-wide mb-3">Получатели</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => { setSelectedUsers([]); setSearchQuery('') }}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      selectedUsers.length === 0 ? 'bg-white text-black' : 'bg-zinc-800 text-white/60'
                    }`}
                  >
                    Все ({users.length})
                  </button>
                  <button
                    onClick={() => selectAll(premiumUsers)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      premiumUsers.every(u => selectedUsers.includes(u.telegram_id)) && selectedUsers.length > 0
                        ? 'bg-[#FFD700] text-black' : 'bg-zinc-800 text-white/60'
                    }`}
                  >
                    Premium ({premiumUsers.length})
                  </button>
                  <button
                    onClick={() => selectAll(nonPremiumUsers)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      nonPremiumUsers.every(u => selectedUsers.includes(u.telegram_id)) && selectedUsers.length > 0
                        ? 'bg-white text-black' : 'bg-zinc-800 text-white/60'
                    }`}
                  >
                    Без Premium ({nonPremiumUsers.length})
                  </button>
                </div>
                {selectedUsers.length > 0 && (
                  <p className="text-sm text-white/40 mt-3">
                    Выбрано: <span className="text-white">{selectedUsers.length}</span>
                  </p>
                )}
              </div>

              {/* Сообщение */}
              <div className="bg-zinc-900 rounded-2xl p-4">
                <h3 className="text-sm text-white/40 uppercase tracking-wide mb-3">Сообщение</h3>
                <textarea
                  value={broadcastMessage}
                  onChange={e => setBroadcastMessage(e.target.value)}
                  placeholder="Введите текст..."
                  className="w-full h-32 bg-transparent text-white placeholder-white/30 focus:outline-none resize-none"
                />
              </div>

              {/* Прогресс */}
              {sendingBroadcast && (
                <div className="bg-zinc-900 rounded-2xl p-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-white/40">Отправка</span>
                    <span className="text-white">{broadcastProgress.sent}/{broadcastProgress.total}</span>
                  </div>
                  <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white transition-all"
                      style={{ width: `${(broadcastProgress.sent / broadcastProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Кнопка */}
              <button
                onClick={handleBroadcast}
                disabled={sendingBroadcast || !broadcastMessage.trim()}
                className="w-full py-4 bg-white text-black font-semibold rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
              >
                {sendingBroadcast ? 'Отправка...' : 'Отправить'}
              </button>
            </div>
          )}

        </div>
      </div>
    </Layout>
  )
}
