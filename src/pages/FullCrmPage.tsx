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
  balance_ar: number
  balance_coins: number
  created_at: string
  updated_at: string | null
  // Вычисляемые поля
  status: 'new' | 'active' | 'premium' | 'expired'
  premium_expires?: string | null
}

interface PremiumClient {
  id: string
  telegram_id: number
  username: string | null
  plan: string
  started_at: string
  expires_at: string
  in_channel: boolean
  in_chat: boolean
  total_paid_usd: number
  payments_count: number
}

interface Stats {
  totalUsers: number
  newUsers7d: number
  activeUsers30d: number
  premiumActive: number
  premiumExpiring7d: number
}

type TabType = 'users' | 'premium' | 'broadcast'
type UserFilter = 'all' | 'new' | 'active' | 'premium' | 'no_premium'

// ============ КОНСТАНТЫ ============
const BOT_TOKEN = '***REMOVED***'

// ============ КОМПОНЕНТ ============
export function FullCrmPage() {
  const { telegramUser, isLoading } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()

  // Состояния
  const [activeTab, setActiveTab] = useState<TabType>('users')
  const [users, setUsers] = useState<User[]>([])
  const [premiumClients, setPremiumClients] = useState<PremiumClient[]>([])
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    newUsers7d: 0,
    activeUsers30d: 0,
    premiumActive: 0,
    premiumExpiring7d: 0
  })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<UserFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<number[]>([])
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [sendingBroadcast, setSendingBroadcast] = useState(false)
  const [broadcastProgress, setBroadcastProgress] = useState({ sent: 0, total: 0, failed: 0 })

  // Проверка доступа
  const ADMIN_IDS = [190202791, 144828618]
  const isAdmin = telegramUser?.id ? ADMIN_IDS.includes(telegramUser.id) : false

  // ============ ЗАГРУЗКА ДАННЫХ ============
  useEffect(() => {
    if (isAdmin) {
      loadData()
    }
  }, [isAdmin])

  const loadData = async () => {
    try {
      setLoading(true)

      // Загружаем всех юзеров
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, telegram_id, username, first_name, last_name, avatar_url, balance_ar, balance_coins, created_at, updated_at')
        .order('created_at', { ascending: false })

      if (usersError) {
        console.error('Error loading users:', usersError)
        setUsers([])
      } else {
        // Загружаем premium клиентов для определения статуса
        const { data: premiumData } = await supabase
          .from('premium_clients')
          .select('telegram_id, expires_at')

        const premiumMap = new Map()
        premiumData?.forEach(p => {
          premiumMap.set(p.telegram_id, p.expires_at)
        })

        // Определяем статус каждого юзера
        const now = new Date()
        const usersWithStatus: User[] = (usersData || []).map(user => {
          const premiumExpires = premiumMap.get(user.telegram_id)
          let status: User['status'] = 'active'

          if (premiumExpires) {
            const expiresDate = new Date(premiumExpires)
            if (expiresDate > now) {
              status = 'premium'
            } else {
              status = 'expired'
            }
          }

          // Новый юзер - создан за последние 7 дней
          const createdAt = new Date(user.created_at)
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          if (createdAt > sevenDaysAgo && status !== 'premium') {
            status = 'new'
          }

          return {
            ...user,
            status,
            premium_expires: premiumExpires || null
          }
        })

        setUsers(usersWithStatus)

        // Статистика
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

        setStats({
          totalUsers: usersWithStatus.length,
          newUsers7d: usersWithStatus.filter(u => new Date(u.created_at) > sevenDaysAgo).length,
          activeUsers30d: usersWithStatus.filter(u => u.updated_at && new Date(u.updated_at) > thirtyDaysAgo).length,
          premiumActive: usersWithStatus.filter(u => u.status === 'premium').length,
          premiumExpiring7d: usersWithStatus.filter(u => {
            if (u.status !== 'premium' || !u.premium_expires) return false
            const expires = new Date(u.premium_expires)
            return expires > now && expires < new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
          }).length
        })
      }

      // Загружаем Premium клиентов
      const { data: premiumClientsData } = await supabase
        .from('premium_clients')
        .select('*')
        .order('expires_at', { ascending: true })

      setPremiumClients((premiumClientsData || []) as PremiumClient[])

    } catch (err) {
      console.error('Error loading data:', err)
      showToast({ variant: 'error', title: 'Ошибка загрузки данных' })
    } finally {
      setLoading(false)
    }
  }

  // ============ ФИЛЬТРАЦИЯ ============
  const filteredUsers = users.filter(user => {
    // Поиск
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        (user.username?.toLowerCase().includes(query)) ||
        (user.first_name?.toLowerCase().includes(query)) ||
        (user.last_name?.toLowerCase().includes(query)) ||
        (user.telegram_id.toString().includes(query))
      if (!matchesSearch) return false
    }

    // Фильтр по статусу
    if (filter === 'all') return true
    if (filter === 'new') return user.status === 'new'
    if (filter === 'active') return user.status === 'active'
    if (filter === 'premium') return user.status === 'premium'
    if (filter === 'no_premium') return user.status !== 'premium'

    return true
  })

  // ============ ОТПРАВКА СООБЩЕНИЙ ============
  const sendMessage = async (telegramId: number, message: string): Promise<boolean> => {
    try {
      const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramId,
          text: message,
          parse_mode: 'HTML'
        })
      })
      const result = await response.json()
      return result.ok
    } catch (err) {
      console.error('Error sending message:', err)
      return false
    }
  }

  const handleSendToUser = async (user: User) => {
    const message = prompt(`Сообщение для ${user.username || user.first_name || user.telegram_id}:`)
    if (!message) return

    const success = await sendMessage(user.telegram_id, message)
    if (success) {
      showToast({ variant: 'success', title: 'Сообщение отправлено' })
    } else {
      showToast({ variant: 'error', title: 'Ошибка отправки', description: 'Возможно пользователь заблокировал бота' })
    }
  }

  const handleBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      showToast({ variant: 'error', title: 'Введите сообщение' })
      return
    }

    const targets = selectedUsers.length > 0
      ? users.filter(u => selectedUsers.includes(u.telegram_id))
      : filteredUsers

    if (targets.length === 0) {
      showToast({ variant: 'error', title: 'Нет получателей' })
      return
    }

    const confirmed = confirm(`Отправить сообщение ${targets.length} пользователям?`)
    if (!confirmed) return

    setSendingBroadcast(true)
    setBroadcastProgress({ sent: 0, total: targets.length, failed: 0 })

    let sent = 0
    let failed = 0

    for (const user of targets) {
      const success = await sendMessage(user.telegram_id, broadcastMessage)
      if (success) {
        sent++
      } else {
        failed++
      }
      setBroadcastProgress({ sent, total: targets.length, failed })

      // Задержка чтобы не упереться в лимиты Telegram API
      await new Promise(r => setTimeout(r, 50))
    }

    setSendingBroadcast(false)
    setBroadcastMessage('')
    setSelectedUsers([])
    showToast({
      variant: 'success',
      title: 'Рассылка завершена',
      description: `Отправлено: ${sent}, Ошибок: ${failed}`
    })
  }

  // ============ ВЫБОР ПОЛЬЗОВАТЕЛЕЙ ============
  const toggleUserSelection = (telegramId: number) => {
    setSelectedUsers(prev =>
      prev.includes(telegramId)
        ? prev.filter(id => id !== telegramId)
        : [...prev, telegramId]
    )
  }

  const selectAllFiltered = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(filteredUsers.map(u => u.telegram_id))
    }
  }

  // ============ ФОРМАТИРОВАНИЕ ============
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
  }

  const getStatusBadge = (status: User['status']) => {
    const badges = {
      new: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Новый' },
      active: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Активный' },
      premium: { bg: 'bg-[#FFD700]/20', text: 'text-[#FFD700]', label: 'Premium' },
      expired: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Истёк' }
    }
    const badge = badges[status]
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    )
  }

  // ============ TELEGRAM BACK BUTTON ============
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp
      const handleBack = () => navigate('/admin')
      tg.BackButton.show()
      tg.BackButton.onClick(handleBack)
      return () => {
        tg.BackButton.offClick(handleBack)
        tg.BackButton.hide()
      }
    }
  }, [navigate])

  // ============ ДОСТУП ЗАПРЕЩЁН ============
  if (!isLoading && !isAdmin) {
    return (
      <Layout hideNavbar>
        <div className="flex flex-col items-center justify-center min-h-screen px-4 pt-20">
          <div className="text-white/40 text-lg text-center font-bold tracking-widest uppercase">
            Доступ запрещён
          </div>
          <button
            onClick={() => navigate('/')}
            className="mt-6 px-6 py-3 bg-zinc-800 text-white rounded-xl active:scale-95 transition-transform font-medium"
          >
            На главную
          </button>
        </div>
      </Layout>
    )
  }

  if (isLoading || loading) {
    return (
      <Layout hideNavbar>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-[#FFD700] text-xl animate-pulse">Загрузка CRM...</div>
        </div>
      </Layout>
    )
  }

  // ============ РЕНДЕР ============
  return (
    <Layout hideNavbar>
      <div className="min-h-screen bg-[#0a0a0a] text-white pt-[60px] pb-8">
        <div className="max-w-7xl mx-auto px-4">

          {/* HEADER */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">
              <span className="text-[#FFD700]">CRM</span> Система
            </h1>
            <button
              onClick={loadData}
              className="px-3 py-1.5 bg-zinc-800 text-white/60 rounded-lg text-sm hover:bg-zinc-700"
            >
              Обновить
            </button>
          </div>

          {/* СТАТИСТИКА */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <div className="p-3 bg-zinc-900/50 border border-white/10 rounded-lg text-center">
              <div className="text-2xl font-bold text-white">{stats.totalUsers}</div>
              <div className="text-xs text-white/50">Всего юзеров</div>
            </div>
            <div className="p-3 bg-zinc-900/50 border border-blue-500/20 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-400">{stats.newUsers7d}</div>
              <div className="text-xs text-white/50">Новых за 7д</div>
            </div>
            <div className="p-3 bg-zinc-900/50 border border-white/10 rounded-lg text-center">
              <div className="text-2xl font-bold text-white">{stats.activeUsers30d}</div>
              <div className="text-xs text-white/50">Активных 30д</div>
            </div>
            <div className="p-3 bg-zinc-900/50 border border-[#FFD700]/20 rounded-lg text-center">
              <div className="text-2xl font-bold text-[#FFD700]">{stats.premiumActive}</div>
              <div className="text-xs text-white/50">Premium</div>
            </div>
            <div className="p-3 bg-zinc-900/50 border border-orange-500/20 rounded-lg text-center">
              <div className="text-2xl font-bold text-orange-400">{stats.premiumExpiring7d}</div>
              <div className="text-xs text-white/50">Истекает 7д</div>
            </div>
          </div>

          {/* ВКЛАДКИ */}
          <div className="flex gap-2 mb-6 border-b border-white/10 pb-3">
            {(['users', 'premium', 'broadcast'] as TabType[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === tab
                    ? 'bg-[#FFD700] text-black'
                    : 'bg-zinc-800 text-white/60 hover:bg-zinc-700'
                }`}
              >
                {tab === 'users' && 'Все юзеры'}
                {tab === 'premium' && 'Premium'}
                {tab === 'broadcast' && 'Рассылка'}
              </button>
            ))}
          </div>

          {/* ============ ВКЛАДКА: ВСЕ ЮЗЕРЫ ============ */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              {/* Поиск и фильтры */}
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по username, имени или ID..."
                  className="flex-1 px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#FFD700]/50"
                />
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {(['all', 'new', 'premium', 'no_premium'] as UserFilter[]).map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                        filter === f
                          ? 'bg-[#FFD700] text-black'
                          : 'bg-zinc-800 text-white/60 hover:bg-zinc-700'
                      }`}
                    >
                      {f === 'all' && 'Все'}
                      {f === 'new' && 'Новые'}
                      {f === 'premium' && 'Premium'}
                      {f === 'no_premium' && 'Без Premium'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Действия с выбранными */}
              {selectedUsers.length > 0 && (
                <div className="flex items-center gap-3 p-3 bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-lg">
                  <span className="text-[#FFD700] font-medium">Выбрано: {selectedUsers.length}</span>
                  <button
                    onClick={() => setActiveTab('broadcast')}
                    className="px-3 py-1 bg-[#FFD700] text-black rounded-lg text-sm font-medium"
                  >
                    Отправить сообщение
                  </button>
                  <button
                    onClick={() => setSelectedUsers([])}
                    className="px-3 py-1 bg-zinc-700 text-white rounded-lg text-sm"
                  >
                    Сбросить
                  </button>
                </div>
              )}

              {/* Таблица юзеров */}
              <div className="bg-zinc-900/50 border border-white/10 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-zinc-800/50">
                      <tr>
                        <th className="px-3 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                            onChange={selectAllFiltered}
                            className="rounded"
                          />
                        </th>
                        <th className="px-3 py-3 text-left text-sm font-medium text-white/80">Пользователь</th>
                        <th className="px-3 py-3 text-left text-sm font-medium text-white/80">Telegram ID</th>
                        <th className="px-3 py-3 text-left text-sm font-medium text-white/80">Статус</th>
                        <th className="px-3 py-3 text-left text-sm font-medium text-white/80">Баланс</th>
                        <th className="px-3 py-3 text-left text-sm font-medium text-white/80">Регистрация</th>
                        <th className="px-3 py-3 text-center text-sm font-medium text-white/80">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr
                          key={user.id}
                          className="border-t border-white/5 hover:bg-zinc-800/30 transition-colors"
                        >
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={selectedUsers.includes(user.telegram_id)}
                              onChange={() => toggleUserSelection(user.telegram_id)}
                              className="rounded"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              {user.avatar_url ? (
                                <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-white/60 text-sm">
                                  {(user.first_name || user.username || '?')[0]?.toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="font-medium text-white">
                                  {user.username ? `@${user.username}` : user.first_name || 'Без имени'}
                                </div>
                                {user.first_name && user.username && (
                                  <div className="text-xs text-white/50">{user.first_name} {user.last_name || ''}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 font-mono text-white/60 text-sm">{user.telegram_id}</td>
                          <td className="px-3 py-3">{getStatusBadge(user.status)}</td>
                          <td className="px-3 py-3 text-white/80">
                            <span className="text-[#FFD700]">{user.balance_ar || 0}</span>
                            <span className="text-white/30"> AR</span>
                          </td>
                          <td className="px-3 py-3 text-white/60 text-sm">{formatDate(user.created_at)}</td>
                          <td className="px-3 py-3 text-center">
                            <button
                              onClick={() => handleSendToUser(user)}
                              className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-xs"
                            >
                              Написать
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredUsers.length === 0 && (
                    <div className="p-8 text-center text-white/40">Нет пользователей</div>
                  )}
                </div>
                <div className="px-4 py-2 bg-zinc-800/30 text-white/50 text-sm">
                  Показано: {filteredUsers.length} из {users.length}
                </div>
              </div>
            </div>
          )}

          {/* ============ ВКЛАДКА: PREMIUM ============ */}
          {activeTab === 'premium' && (
            <div className="space-y-4">
              <div className="bg-zinc-900/50 border border-[#FFD700]/20 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-zinc-800/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-white/80">Клиент</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-white/80">Тариф</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-white/80">Истекает</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-white/80">Канал</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-white/80">Чат</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-white/80">Оплачено</th>
                      </tr>
                    </thead>
                    <tbody>
                      {premiumClients.map((client) => {
                        const isExpired = new Date(client.expires_at) < new Date()
                        const isExpiring = !isExpired && new Date(client.expires_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

                        return (
                          <tr
                            key={client.id}
                            className={`border-t border-white/5 hover:bg-zinc-800/30 transition-colors ${isExpired ? 'opacity-50' : ''}`}
                          >
                            <td className="px-4 py-3">
                              <div className="font-medium text-white">
                                {client.username ? `@${client.username}` : 'Без username'}
                              </div>
                              <div className="text-xs text-white/50 font-mono">{client.telegram_id}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 bg-[#FFD700]/20 text-[#FFD700] rounded text-xs font-medium uppercase">
                                {client.plan || 'N/A'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`${isExpired ? 'text-red-400' : isExpiring ? 'text-orange-400' : 'text-white/80'}`}>
                                {formatDate(client.expires_at)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">{client.in_channel ? '✅' : '❌'}</td>
                            <td className="px-4 py-3 text-center">{client.in_chat ? '✅' : '❌'}</td>
                            <td className="px-4 py-3 text-[#FFD700] font-medium">${client.total_paid_usd || 0}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {premiumClients.length === 0 && (
                    <div className="p-8 text-center text-white/40">Нет Premium клиентов</div>
                  )}
                </div>
              </div>

              <div className="text-center">
                <button
                  onClick={() => navigate('/crm')}
                  className="px-4 py-2 bg-zinc-800 text-white/60 rounded-lg hover:bg-zinc-700"
                >
                  Открыть полную CRM Premium →
                </button>
              </div>
            </div>
          )}

          {/* ============ ВКЛАДКА: РАССЫЛКА ============ */}
          {activeTab === 'broadcast' && (
            <div className="space-y-4">
              {/* Выбор получателей */}
              <div className="p-4 bg-zinc-900/50 border border-white/10 rounded-lg">
                <h3 className="text-lg font-medium text-white mb-3">Получатели</h3>

                <div className="flex flex-wrap gap-2 mb-4">
                  <button
                    onClick={() => { setFilter('all'); setSelectedUsers([]) }}
                    className={`px-3 py-1.5 rounded-lg text-sm ${
                      filter === 'all' && selectedUsers.length === 0
                        ? 'bg-[#FFD700] text-black'
                        : 'bg-zinc-700 text-white/60'
                    }`}
                  >
                    Все ({users.length})
                  </button>
                  <button
                    onClick={() => { setFilter('premium'); setSelectedUsers([]) }}
                    className={`px-3 py-1.5 rounded-lg text-sm ${
                      filter === 'premium' && selectedUsers.length === 0
                        ? 'bg-[#FFD700] text-black'
                        : 'bg-zinc-700 text-white/60'
                    }`}
                  >
                    Premium ({stats.premiumActive})
                  </button>
                  <button
                    onClick={() => { setFilter('no_premium'); setSelectedUsers([]) }}
                    className={`px-3 py-1.5 rounded-lg text-sm ${
                      filter === 'no_premium' && selectedUsers.length === 0
                        ? 'bg-[#FFD700] text-black'
                        : 'bg-zinc-700 text-white/60'
                    }`}
                  >
                    Без Premium ({users.length - stats.premiumActive})
                  </button>
                </div>

                {selectedUsers.length > 0 ? (
                  <div className="text-[#FFD700]">
                    Выбрано вручную: <strong>{selectedUsers.length}</strong> пользователей
                    <button
                      onClick={() => setSelectedUsers([])}
                      className="ml-2 text-white/50 underline text-sm"
                    >
                      сбросить
                    </button>
                  </div>
                ) : (
                  <div className="text-white/60">
                    Будет отправлено: <strong className="text-white">{filteredUsers.length}</strong> пользователям
                  </div>
                )}
              </div>

              {/* Редактор сообщения */}
              <div className="p-4 bg-zinc-900/50 border border-white/10 rounded-lg">
                <h3 className="text-lg font-medium text-white mb-3">Сообщение</h3>
                <textarea
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Введите текст сообщения...&#10;&#10;Поддерживается HTML:&#10;<b>жирный</b>&#10;<i>курсив</i>&#10;<a href='url'>ссылка</a>"
                  className="w-full h-40 px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#FFD700]/50 resize-none"
                />
                <div className="text-xs text-white/40 mt-2">
                  Поддерживается HTML форматирование: &lt;b&gt;, &lt;i&gt;, &lt;a href="..."&gt;
                </div>
              </div>

              {/* Прогресс отправки */}
              {sendingBroadcast && (
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="flex justify-between text-white mb-2">
                    <span>Отправка...</span>
                    <span>{broadcastProgress.sent}/{broadcastProgress.total}</span>
                  </div>
                  <div className="w-full bg-zinc-700 rounded-full h-2">
                    <div
                      className="bg-[#FFD700] h-2 rounded-full transition-all"
                      style={{ width: `${(broadcastProgress.sent / broadcastProgress.total) * 100}%` }}
                    />
                  </div>
                  {broadcastProgress.failed > 0 && (
                    <div className="text-red-400 text-sm mt-2">Ошибок: {broadcastProgress.failed}</div>
                  )}
                </div>
              )}

              {/* Кнопка отправки */}
              <button
                onClick={handleBroadcast}
                disabled={sendingBroadcast || !broadcastMessage.trim()}
                className="w-full py-4 bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-transform text-lg"
              >
                {sendingBroadcast ? 'Отправка...' : 'Отправить рассылку'}
              </button>
            </div>
          )}

        </div>
      </div>
    </Layout>
  )
}
