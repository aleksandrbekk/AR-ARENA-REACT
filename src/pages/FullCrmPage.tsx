import { useState, useEffect, useCallback, useRef } from 'react'
import { Layout } from '../components/layout/Layout'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useAdminAuth } from '../providers/AdminAuthProvider'
import { useToast } from '../components/ToastProvider'
import { supabase } from '../lib/supabase'
import { setStorageItem, STORAGE_KEYS } from '../hooks/useLocalStorage'
import { LeadsTab } from '../components/crm/LeadsTab'
import { BroadcastTab } from '../components/crm/BroadcastTab'
import { PremiumTab } from '../components/crm/PremiumTab'
import type { User, PremiumClient, BotUser, BroadcastRecord, PaymentRecord, CrmTabType } from '../types/crm'

// ============ КОМПОНЕНТ ============
export function FullCrmPage() {
  const { telegramUser, isLoading } = useAuth()
  const { getAuthHeaders } = useAdminAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [activeTab, setActiveTab] = useState<CrmTabType>('leads')
  const [users, setUsers] = useState<User[]>([])
  const [premiumClients, setPremiumClients] = useState<PremiumClient[]>([])
  const [botUsers, setBotUsers] = useState<BotUser[]>([])
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  // История рассылок (передаётся в BroadcastTab)
  const [broadcastHistory, setBroadcastHistory] = useState<BroadcastRecord[]>([])

  // Модалка для отправки сообщения
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)

  // Auth UI state (actual auth handled by AdminAuthProvider)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)

  const { isAdminAuthenticated, verifyAdmin, verifyTelegramAdmin } = useAdminAuth()

  const ADMIN_IDS = [190202791, 144828618, 288542643, 288475216]
  const isTelegramWebApp = !!window.Telegram?.WebApp?.initData

  // Проверка авторизации при загрузке через Telegram
  useEffect(() => {
    if (isAdminAuthenticated) return
    if (isTelegramWebApp && telegramUser?.id && ADMIN_IDS.includes(telegramUser.id)) {
      verifyTelegramAdmin(telegramUser.id)
    }
  }, [isTelegramWebApp, telegramUser?.id, isAdminAuthenticated, verifyTelegramAdmin])

  const handlePasswordSubmit = async () => {
    if (!passwordInput.trim()) {
      setPasswordError(true)
      return
    }

    setIsVerifying(true)
    setPasswordError(false)

    try {
      const success = await verifyAdmin(passwordInput)
      if (success) {
        setStorageItem(STORAGE_KEYS.ADMIN_AUTH, 'true')
      } else {
        setPasswordError(true)
      }
    } catch {
      setPasswordError(true)
    } finally {
      setIsVerifying(false)
    }
  }

  // ============ ЗАГРУЗКА ============
  useEffect(() => {
    if (isAdminAuthenticated) loadData()
  }, [isAdminAuthenticated])

  const loadData = async () => {
    try {
      setLoading(true)

      // Загружаем ВСЕ CRM данные через серверный API (обходит RLS)
      const response = await fetch('/api/crm-data', {
        headers: getAuthHeaders()
      })

      if (!response.ok) {
        throw new Error(`CRM data API error: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Unknown error')
      }

      const premiumClientsData = result.premiumClients as PremiumClient[]
      const usersData = result.users || []

      // Создаем мапу для быстрой проверки статуса
      const premiumMap = new Map()
      premiumClientsData.forEach(p => premiumMap.set(p.telegram_id, p.expires_at))

      const now = new Date()
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      const usersWithStatus: User[] = usersData.map((user: any) => {
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

      // Подтягиваем аватарки из уже загруженных users
      const avatarMap = new Map<number, string | null>()
      usersWithStatus.forEach(u => avatarMap.set(u.telegram_id, u.avatar_url))

      const premiumWithAvatars = premiumClientsData.map(client => ({
        ...client,
        avatar_url: avatarMap.get(client.telegram_id) || null
      }))

      setPremiumClients(premiumWithAvatars)
      setBotUsers(result.botUsers || [])
      setPaymentHistory(result.paymentHistory as PaymentRecord[] || [])

    } catch (err) {
      console.error('CRM loadData error:', err)
      showToast({ variant: 'error', title: 'Ошибка загрузки данных' })
    } finally {
      setLoading(false)
    }
  }

  // Вспомогательные функции
  const getDaysRemaining = (expiresAt: string) => {
    const now = new Date()
    const expires = new Date(expiresAt)
    const diff = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  // Количество активных подписчиков (для заголовка)
  const activePremiumCount = premiumClients.filter(c => getDaysRemaining(c.expires_at) > 0).length

  // ============ СООБЩЕНИЯ ============
  const sendMessage = async (telegramId: number, message: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin-send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          chatId: telegramId,
          text: message
        })
      })

      const result = await res.json()
      if (!result.success) throw new Error(result.error || 'Failed to send message')
      return true
    } catch { return false }
  }

  // Загрузка истории рассылок
  const loadBroadcastHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('crm_broadcasts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      if (data) setBroadcastHistory(data)
    } catch (err) {
      console.error('Error loading broadcast history:', err)
    }
  }

  useEffect(() => {
    if (activeTab === 'broadcast') {
      loadBroadcastHistory()
    }
  }, [activeTab])

  // ============ ФОРМАТЫ ============
  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) : '-'
  const getInitial = (user: User) => (user.first_name || user.username || '?')[0]?.toUpperCase()

  // ============ TELEGRAM BACK ============
  // Используем ref для хранения актуальной функции handleBack
  const handleBackRef = useRef<() => void>(() => { })

  // Обновляем ref при изменении зависимостей
  handleBackRef.current = useCallback(() => {
    if (selectedUser) {
      setSelectedUser(null)
    } else {
      navigate('/admin')
    }
  }, [selectedUser, navigate])

  // Регистрируем обработчик один раз при монтировании
  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (!tg?.BackButton) return

    // Wrapper функция - всегда вызывает актуальную версию из ref
    const onBackClick = () => {
      handleBackRef.current()
    }

    tg.BackButton.show()
    tg.BackButton.onClick(onBackClick)

    return () => {
      tg.BackButton.offClick(onBackClick)
      tg.BackButton.hide()
    }
  }, []) // Пустой массив - регистрируем только один раз

  // ============ ДОСТУП ============
  // Если не авторизован - показываем форму пароля или запрет
  if (!isLoading && !isAdminAuthenticated) {
    // Если в Telegram - запрещаем (авторизация должна была пройти автоматически)
    if (isTelegramWebApp) {
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
                  className={`w-full px-4 py-3 bg-zinc-900 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 ${passwordError ? 'ring-2 ring-red-500' : 'focus:ring-white/20'
                    }`}
                  autoFocus
                />
                {passwordError && (
                  <p className="text-red-400 text-sm text-center">Неверный пароль</p>
                )}
                <button
                  onClick={handlePasswordSubmit}
                  disabled={isVerifying}
                  className="w-full py-3 bg-white text-black font-semibold rounded-xl active:scale-[0.98] transition-transform disabled:opacity-50"
                >
                  {isVerifying ? 'Проверка...' : 'Войти'}
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
        <div className="min-h-screen bg-[#000] text-white pt-[80px]">
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
              <div className={`mt-3 px-3 py-1 rounded-full text-sm ${selectedUser.status === 'premium' ? 'bg-[#FFD700]/20 text-[#FFD700]' :
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
      <div className="min-h-screen bg-[#000] text-white pt-[80px] pb-24">
        <div className="max-w-3xl mx-auto px-4">

          {/* Заголовок */}
          <div className="py-4 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">CRM</h1>
              <p className="text-white/40 mt-1">
                {activeTab === 'leads' && `${botUsers.length} в боте`}
                {activeTab === 'premium' && `${activePremiumCount} активных`}
                {activeTab === 'broadcast' && 'Рассылка сообщений'}
              </p>
            </div>
          </div>

          {/* Табы */}
          <div className="flex gap-1 p-1 bg-zinc-900 rounded-xl mb-6">
            {(['leads', 'premium', 'broadcast'] as CrmTabType[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab ? 'bg-white text-black' : 'text-white/60'
                  }`}
              >
                {tab === 'leads' && 'База'}
                {tab === 'premium' && 'Premium'}
                {tab === 'broadcast' && 'Рассылка'}
              </button>
            ))}
          </div>

          {/* ============ БАЗА ПОЛЬЗОВАТЕЛЕЙ (LEADS) ============ */}
          {activeTab === 'leads' && (
            <LeadsTab botUsers={botUsers} users={users} premiumClients={premiumClients} />
          )}

          {/* ============ PREMIUM ============ */}
          {activeTab === 'premium' && (
            <PremiumTab
              premiumClients={premiumClients}
              paymentHistory={paymentHistory}
              getAuthHeaders={getAuthHeaders}
              showToast={showToast}
              onDataChange={loadData}
            />
          )}

          {/* ============ РАССЫЛКА ============ */}
          {activeTab === 'broadcast' && (
            <BroadcastTab
              botUsers={botUsers}
              users={users}
              premiumClients={premiumClients}
              broadcastHistory={broadcastHistory}
              getAuthHeaders={getAuthHeaders}
              showToast={showToast}
              telegramUserId={telegramUser?.id}
              onBroadcastComplete={loadBroadcastHistory}
            />
          )}

        </div>
      </div>
    </Layout>
  )
}
// Build 1767352989
// FORCE_REFRESH 1767353752
