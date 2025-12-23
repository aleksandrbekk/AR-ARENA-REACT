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
  plan: string
  expires_at: string
  in_channel: boolean
  in_chat: boolean
  total_paid_usd: number
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

      setPremiumClients((premiumClientsData || []) as PremiumClient[])
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

  const getInitial = (user: User) => (user.first_name || user.username || '?')[0]?.toUpperCase()

  // ============ TELEGRAM BACK ============
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp
      const handleBack = () => selectedUser ? setSelectedUser(null) : navigate('/admin')
      tg.BackButton.show()
      tg.BackButton.onClick(handleBack)
      return () => { tg.BackButton.offClick(handleBack); tg.BackButton.hide() }
    }
  }, [navigate, selectedUser])

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
          <div className="py-4">
            <h1 className="text-3xl font-bold">CRM</h1>
            <p className="text-white/40 mt-1">{users.length} пользователей</p>
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
                {tab === 'premium' && `Premium (${premiumUsers.length})`}
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
            <div className="bg-zinc-900 rounded-2xl overflow-hidden">
              {premiumClients.length === 0 ? (
                <div className="py-12 text-center text-white/30">Нет Premium клиентов</div>
              ) : (
                premiumClients.map((client, i) => {
                  const isExpired = new Date(client.expires_at) < new Date()
                  const isExpiring = !isExpired && new Date(client.expires_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

                  return (
                    <div
                      key={client.id}
                      className={`px-4 py-3 ${i !== 0 ? 'border-t border-white/5' : ''} ${isExpired ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">
                          {client.username ? `@${client.username}` : client.telegram_id}
                        </span>
                        <span className="text-[#FFD700] text-sm font-medium uppercase">
                          {client.plan || 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className={isExpired ? 'text-red-400' : isExpiring ? 'text-orange-400' : 'text-white/40'}>
                          {isExpired ? 'Истёк' : `до ${formatDate(client.expires_at)}`}
                        </span>
                        <span className="text-white/40">
                          ${client.total_paid_usd || 0}
                        </span>
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
// deploy 1766480154
