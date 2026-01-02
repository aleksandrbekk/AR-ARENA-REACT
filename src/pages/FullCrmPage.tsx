
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
  currency: string | null
  original_amount: number | null
  payments_count: number
  last_payment_at: string | null
  last_payment_method: string | null
  source: string | null
  tags: string[]
}

interface BotUser {
  id: number
  telegram_id: number
  username: string | null
  first_name: string | null
  source: string | null
  created_at: string
  last_seen_at: string
}

interface BroadcastRecord {
  id: string
  message: string | null
  image_url: string | null
  recipients_count: number
  filter_type: string | null
  status: 'completed' | 'failed'
  sent_by: string | null
  created_at: string
}

interface PaymentRecord {
  id: string
  telegram_id: string
  amount: number
  currency: string
  source: string
  created_at: string
}

type TabType = 'leads' | 'premium' | 'broadcast'

// ============ КОНСТАНТЫ ============
// SECURITY: Secrets from environment variables
const BOT_TOKEN = import.meta.env.VITE_BOT_TOKEN || ''
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || ''

// ============ КОМПОНЕНТ ============
export function FullCrmPage() {
  const { telegramUser, isLoading } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [activeTab, setActiveTab] = useState<TabType>('leads')
  const [users, setUsers] = useState<User[]>([])
  const [premiumClients, setPremiumClients] = useState<PremiumClient[]>([])
  const [botUsers, setBotUsers] = useState<BotUser[]>([])
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUsers, setSelectedUsers] = useState<number[]>([])
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [broadcastSearch, setBroadcastSearch] = useState('')
  const [broadcastImage, setBroadcastImage] = useState<File | null>(null)
  const [broadcastImagePreview, setBroadcastImagePreview] = useState<string | null>(null)
  const [sendingBroadcast, setSendingBroadcast] = useState(false)
  const [broadcastProgress, setBroadcastProgress] = useState({ sent: 0, total: 0 })
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  // История рассылок
  const [broadcastHistory, setBroadcastHistory] = useState<BroadcastRecord[]>([])
  const [broadcastTab, setBroadcastTab] = useState<'new' | 'history'>('new')

  // Модалка для отправки сообщения
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)

  // Premium фильтры и поиск
  const [premiumSearch, setPremiumSearch] = useState('')
  const [premiumFilter, setPremiumFilter] = useState<'all' | 'active' | 'expiring'>('all')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [monthFilter, setMonthFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'last_payment' | 'expires' | 'total_paid' | 'created'>('last_payment')
  // Месяц для статистики выручки (по умолчанию текущий)
  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  const [statsMonth, setStatsMonth] = useState<string>(currentMonth)
  const [daysToAdd, setDaysToAdd] = useState(30)
  const [selectedPremiumClient, setSelectedPremiumClient] = useState<PremiumClient | null>(null)

  // Модалка для отправки invite-ссылок
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteLinks, setInviteLinks] = useState<{ channelLink: string; chatLink: string } | null>(null)
  const [generatingInvite, setGeneratingInvite] = useState(false)

  // База пользователей (leads) фильтры
  const [leadsSearch, setLeadsSearch] = useState('')
  const [leadsStatusFilter, setLeadsStatusFilter] = useState<'all' | 'app_opened' | 'not_opened' | 'purchased'>('all')

  // Модалка добавления клиента
  const [showAddClientModal, setShowAddClientModal] = useState(false)
  const [newClientId, setNewClientId] = useState('')
  const [newClientAmount, setNewClientAmount] = useState('')
  const [newClientNoPayment, setNewClientNoPayment] = useState(false)
  const [newClientPeriod, setNewClientPeriod] = useState<'30' | '90' | '180' | '365' | 'custom'>('30')
  const [newClientCustomDate, setNewClientCustomDate] = useState('')
  const [addingClient, setAddingClient] = useState(false)

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

      // Вспомогательная функция для загрузки всех данных чанками
      const fetchAllRows = async (tableName: string, selectQuery: string, orderBy = 'created_at', ascending = false) => {
        let allData: any[] = []
        let page = 0
        const pageSize = 1000
        let hasMore = true

        while (hasMore) {
          const { data, error } = await supabase
            .from(tableName)
            .select(selectQuery)
            .order(orderBy, { ascending, nullsFirst: false })
            .range(page * pageSize, (page + 1) * pageSize - 1)

          if (error) throw error

          if (data) {
            allData = [...allData, ...data]
            hasMore = data.length === pageSize
            page++
          } else {
            hasMore = false
          }
        }
        return allData
      }

      // Загружаем пользователей приложения (всех)
      const usersData = await fetchAllRows(
        'users',
        'id, telegram_id, username, first_name, last_name, avatar_url, created_at'
      )

      // Загружаем Premium клиентов (всех)
      // Сортируем локально позже, здесь важно просто получить всех
      const premiumDataRaw = await fetchAllRows(
        'premium_clients',
        '*',
        'last_payment_at', // Сортировка для чанков
        false
      )

      const premiumClientsData = premiumDataRaw as PremiumClient[]

      // Создаем мапу для быстрой проверки статуса
      const premiumMap = new Map()
      premiumClientsData.forEach(p => premiumMap.set(p.telegram_id, p.expires_at))

      const now = new Date()
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      const usersWithStatus: User[] = (usersData || []).map((user: any) => {
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

      // Загружаем пользователей бота (всех)
      const botUsersData = await fetchAllRows(
        'bot_users',
        '*'
      )

      setBotUsers(botUsersData as BotUser[] || [])

      // Загружаем историю платежей для точной статистики
      const paymentHistoryData = await fetchAllRows(
        'payment_history',
        '*'
      )

      setPaymentHistory(paymentHistoryData as PaymentRecord[] || [])

    } catch (err) {
      console.error('Error:', err)
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

  const getDaysColor = (days: number) => {
    if (days <= 0) return 'text-red-400'
    if (days <= 3) return 'text-red-400'
    if (days <= 7) return 'text-orange-400'
    if (days <= 14) return 'text-yellow-400'
    return 'text-emerald-400'
  }

  // Количество активных подписчиков (для заголовка)
  const activePremiumCount = premiumClients.filter(c => getDaysRemaining(c.expires_at) > 0).length

  // Фильтрация Premium клиентов (только активные — expires > now)
  const filteredPremiumClients = premiumClients
    .filter(client => {
      // Базовый фильтр: только активные подписки
      const days = getDaysRemaining(client.expires_at)
      if (days <= 0) return false // Истёкшие не показываем

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

      // Фильтр по месяцу (по дате последнего платежа)
      if (monthFilter !== 'all' && client.last_payment_at) {
        const paymentDate = new Date(client.last_payment_at)
        const paymentMonth = `${paymentDate.getFullYear()} -${String(paymentDate.getMonth() + 1).padStart(2, '0')} `
        if (paymentMonth !== monthFilter) return false
      }

      // Фильтр по статусу (только среди активных)
      if (premiumFilter === 'active' && days <= 7) return false
      if (premiumFilter === 'expiring' && days > 7) return false

      return true
    })
    .sort((a, b) => {
      // Сортировка
      switch (sortBy) {
        case 'last_payment':
          // По дате последнего платежа (или начала подписки), новые вверху
          const getSortDate = (c: PremiumClient) => {
            if (c.last_payment_at) return new Date(c.last_payment_at).getTime()
            return new Date(c.started_at).getTime()
          }
          return getSortDate(b) - getSortDate(a)
        case 'expires':
          // По дате истечения (скоро истекающие вверху)
          return new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime()
        case 'total_paid':
          // По сумме оплат (больше вверху)
          return (b.total_paid_usd || 0) - (a.total_paid_usd || 0)
        case 'created':
          // По дате добавления (новые вверху)
          return new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
        default:
          return 0
      }
    })

  // Получаем уникальные месяцы для фильтра
  const availableMonths = [...new Set(
    premiumClients
      .filter(c => c.last_payment_at)
      .map(c => {
        const d = new Date(c.last_payment_at!)
        return `${d.getFullYear()} -${String(d.getMonth() + 1).padStart(2, '0')} `
      })
  )].sort().reverse()

  const monthNames: Record<string, string> = {
    '01': 'Январь', '02': 'Февраль', '03': 'Март', '04': 'Апрель',
    '05': 'Май', '06': 'Июнь', '07': 'Июль', '08': 'Август',
    '09': 'Сентябрь', '10': 'Октябрь', '11': 'Ноябрь', '12': 'Декабрь'
  }

  const formatMonthLabel = (m: string) => {
    const [year, month] = m.split('-')
    return `${monthNames[month]} ${year} `
  }

  // ============ УДАЛИТЬ КЛИЕНТА ============
  const deletePremiumClient = async (clientId: string, telegramId: number) => {
    if (!confirm(`Удалить клиента ${telegramId} из Premium ? `)) return

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

      // Проверяем был ли пользователь кикнут
      const client = premiumClients.find(c => c.id === clientId)
      const wasKicked = client?.tags?.includes('kicked')

      // Обновляем локальный стейт
      setPremiumClients(prev => prev.map(c =>
        c.id === clientId ? { ...c, expires_at: newExpires.toISOString() } : c
      ))

      showToast({ variant: 'success', title: `+ ${days} дней добавлено` })

      // Если был кикнут — восстанавливаем доступ (отправляем новые ссылки)
      if (wasKicked) {
        try {
          const reinstateRes = await fetch('/api/reinstate-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telegram_id: telegramId })
          })
          const reinstateData = await reinstateRes.json()

          if (reinstateData.success) {
            showToast({ variant: 'success', title: 'Ссылки отправлены пользователю' })
            // Обновляем теги в локальном стейте
            setPremiumClients(prev => prev.map(c =>
              c.id === clientId ? { ...c, tags: reinstateData.newTags || [] } : c
            ))
          } else {
            showToast({ variant: 'error', title: 'Ошибка отправки ссылок' })
            // Всё равно уведомляем о продлении
            await sendMessage(telegramId, `🎁 Вам начислено < b > ${days} бонусных дней</b > подписки!\n\nНовая дата окончания: ${newExpires.toLocaleDateString('ru-RU')} \n\n⚠️ Для получения ссылок на канал и чат напишите @Andrey_cryptoinvestor`)
          }
        } catch {
          // Если API недоступен, отправляем обычное сообщение
          await sendMessage(telegramId, `🎁 Вам начислено < b > ${days} бонусных дней</b > подписки!\n\nНовая дата окончания: ${newExpires.toLocaleDateString('ru-RU')} \n\n⚠️ Для получения ссылок на канал и чат напишите @Andrey_cryptoinvestor`)
        }
      } else {
        // Обычное уведомление для не-кикнутых
        await sendMessage(telegramId, `🎁 Вам начислено < b > ${days} бонусных дней</b > подписки!\n\nНовая дата окончания: ${newExpires.toLocaleDateString('ru-RU')} `)
      }
    } catch (err) {
      console.error('Error adding days:', err)
      showToast({ variant: 'error', title: 'Ошибка добавления дней' })
    }
  }

  // ============ ДОБАВИТЬ КЛИЕНТА ============
  const addPremiumClient = async () => {
    if (!newClientId.trim()) {
      showToast({ variant: 'error', title: 'Введите Telegram ID' })
      return
    }

    const telegramId = parseInt(newClientId.replace(/\D/g, ''))
    if (!telegramId) {
      showToast({ variant: 'error', title: 'Неверный Telegram ID' })
      return
    }

    // Проверяем что клиент не существует
    const exists = premiumClients.find(c => c.telegram_id === telegramId)
    if (exists) {
      showToast({ variant: 'error', title: 'Клиент уже существует' })
      return
    }

    setAddingClient(true)

    try {
      const now = new Date()
      let expiresAt: Date
      let plan: string

      if (newClientPeriod === 'custom') {
        if (!newClientCustomDate) {
          showToast({ variant: 'error', title: 'Выберите дату' })
          setAddingClient(false)
          return
        }
        expiresAt = new Date(newClientCustomDate + 'T23:59:59')
        // Определяем план по количеству дней до даты
        const daysUntil = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        if (daysUntil <= 45) plan = 'classic'
        else if (daysUntil <= 120) plan = 'gold'
        else if (daysUntil <= 270) plan = 'platinum'
        else plan = 'private'
      } else {
        const days = parseInt(newClientPeriod)
        expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
        // Определяем план по сроку
        const planMap: Record<string, string> = {
          '30': 'classic',
          '90': 'gold',
          '180': 'platinum',
          '365': 'private'
        }
        plan = planMap[newClientPeriod] || 'classic'
      }

      // Сумма оплаты
      const amount = newClientNoPayment ? 0 : parseFloat(newClientAmount) || 0

      const { data, error } = await supabase
        .from('premium_clients')
        .insert({
          telegram_id: telegramId,
          plan,
          started_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          in_channel: false,
          in_chat: false,
          tags: ['migrated'],
          source: 'manual',
          total_paid_usd: amount,
          currency: amount > 0 ? 'USDT' : null,
          original_amount: amount > 0 ? amount : null,
          payments_count: amount > 0 ? 1 : 0,
          last_payment_at: amount > 0 ? now.toISOString() : null,
          last_payment_method: amount > 0 ? 'manual' : null,
          created_at: now.toISOString(),
          updated_at: now.toISOString()
        })
        .select()
        .single()

      if (error) throw error

      // Добавляем в локальный стейт
      setPremiumClients(prev => [data as PremiumClient, ...prev])

      // Сбрасываем форму
      setNewClientId('')
      setNewClientAmount('')
      setNewClientNoPayment(false)
      setNewClientPeriod('30')
      setNewClientCustomDate('')
      setShowAddClientModal(false)

      showToast({ variant: 'success', title: `Клиент ${telegramId} добавлен` })
    } catch (err) {
      console.error('Error adding client:', err)
      showToast({ variant: 'error', title: 'Ошибка добавления' })
    } finally {
      setAddingClient(false)
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

  const sendPhoto = async (telegramId: number, photo: File, caption: string): Promise<boolean> => {
    try {
      const formData = new FormData()
      formData.append('chat_id', telegramId.toString())
      formData.append('photo', photo)
      if (caption) formData.append('caption', caption)
      formData.append('parse_mode', 'HTML')

      const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
        method: 'POST',
        body: formData
      })
      return (await res.json()).ok
    } catch { return false }
  }

  // Генерация и отправка invite-ссылок через API
  const generateInviteLinks = async (telegramId: number, sendToUser: boolean = false) => {
    try {
      setGeneratingInvite(true)
      const res = await fetch('/api/admin-send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: telegramId, send_to_user: sendToUser })
      })

      const data = await res.json()

      if (data.success) {
        setInviteLinks({ channelLink: data.channelLink, chatLink: data.chatLink })
        if (sendToUser && data.sent) {
          showToast({ variant: 'success', title: 'Ссылки отправлены пользователю' })
        }
        return data
      } else {
        showToast({ variant: 'error', title: data.error || 'Ошибка генерации ссылок' })
        return null
      }
    } catch (err) {
      console.error('Generate invite error:', err)
      showToast({ variant: 'error', title: 'Ошибка сети' })
      return null
    } finally {
      setGeneratingInvite(false)
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setBroadcastImage(file)
      const reader = new FileReader()
      reader.onloadend = () => setBroadcastImagePreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const clearBroadcastImage = () => {
    setBroadcastImage(null)
    setBroadcastImagePreview(null)
  }

  const handleBroadcast = async () => {
    if (!broadcastMessage.trim() && !broadcastImage) return showToast({ variant: 'error', title: 'Введите сообщение или добавьте картинку' })
    if (selectedUsers.length === 0) return showToast({ variant: 'error', title: 'Выберите получателей' })

    const messageType = broadcastImage ? 'картинку' : 'сообщение'
    if (!confirm(`Отправить ${messageType} ${selectedUsers.length} пользователям?`)) return

    setSendingBroadcast(true)
    setBroadcastProgress({ sent: 0, total: selectedUsers.length })

    let sent = 0
    for (const telegramId of selectedUsers) {
      let success = false
      if (broadcastImage) {
        success = await sendPhoto(telegramId, broadcastImage, broadcastMessage)
      } else {
        success = await sendMessage(telegramId, broadcastMessage)
      }
      if (success) sent++
      setBroadcastProgress({ sent, total: selectedUsers.length })
      await new Promise(r => setTimeout(r, 50)) // Задержка чтобы не забанили
    }

    setSendingBroadcast(false)
    setBroadcastMessage('')
    clearBroadcastImage()
    setSelectedUsers([])
    showToast({ variant: 'success', title: `Отправлено: ${sent}/${selectedUsers.length}` })

    // Сохранить в историю
    try {
      // Пытаемся сохранить, но не блокируем если таблица не создана
      await supabase.from('crm_broadcasts').insert({
        message: broadcastMessage || (broadcastImage ? 'Картинка' : 'Без текста'),
        recipients_count: sent,
        filter_type: selectedUsers.length === 1 ? 'single' : 'mass', // упрощенно
        status: 'completed',
        sent_by: telegramUser?.id?.toString() || 'admin'
      })
      loadBroadcastHistory()
    } catch (e) {
      console.error('Failed to save broadcast history', e)
    }
  }

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
    if (activeTab === 'broadcast' && broadcastTab === 'history') {
      loadBroadcastHistory()
    }
  }, [activeTab, broadcastTab])

  // ============ ФОРМАТЫ ============
  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) : '-'
  const formatFullDate = (d: string | null) => d ? new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'

  const getInitial = (user: User) => (user.first_name || user.username || '?')[0]?.toUpperCase()
  const getPremiumInitial = (client: PremiumClient) => (client.first_name || client.username || '?')[0]?.toUpperCase()

  // Получить сумму платежа (Lava.top уже показывает чистую сумму после комиссии)
  const getNetAmount = (client: PremiumClient) => {
    return client.original_amount || client.total_paid_usd || 0
  }

  // Форматирование суммы с валютой (уже за вычетом комиссии)
  const formatAmount = (client: PremiumClient) => {
    const rawCurrency = client.currency || (client.source === '0xprocessing' ? 'USD' : 'RUB')
    const amount = getNetAmount(client)

    // Нормализация валюты: все крипто → USD
    const upperCurrency = rawCurrency.toUpperCase()
    let currency = rawCurrency
    if (upperCurrency.includes('USDT') || upperCurrency.includes('USDC') ||
      upperCurrency.includes('USD') || upperCurrency.includes('BTC') ||
      upperCurrency.includes('ETH') || upperCurrency.includes('TON') ||
      upperCurrency.includes('CRYPTO') || client.source === '0xprocessing') {
      currency = 'USD'
    }

    if (currency === 'USD') return `$${amount.toLocaleString('en-US')}`
    if (currency === 'EUR') return `€${amount.toLocaleString('de-DE')}`
    return `${Math.round(amount).toLocaleString('ru-RU')} ₽`
  }

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
                  className={`w-full px-4 py-3 bg-zinc-900 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 ${passwordError ? 'ring-2 ring-red-500' : 'focus:ring-white/20'
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
        <div className="min-h-screen bg-[#000] text-white pt-[80px] pb-8">
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
              <div className={`mt-3 px-4 py-1.5 rounded-full text-sm font-bold uppercase ${client.plan === 'private' ? 'bg-purple-500/20 text-purple-400' :
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
                className="w-full py-3 bg-zinc-800/50 hover:bg-zinc-700/50 text-white/80 hover:text-white rounded-xl font-medium transition-all active:scale-[0.98] backdrop-blur-sm border border-white/10"
              >
                + Добавить {daysToAdd} дней
              </button>
            </div>

            {/* Статистика */}
            <div className="bg-zinc-900 rounded-2xl overflow-hidden mb-4">
              <div className="px-4 py-3 flex justify-between border-b border-white/5">
                <span className="text-white/50">Всего оплачено</span>
                <span className="text-white font-medium">{formatAmount(client)}</span>
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
                <div className={`p-3 rounded-xl text-center backdrop-blur-sm ${client.in_channel ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-zinc-800/50'}`}>
                  <div className={`text-2xl mb-1 ${client.in_channel ? 'text-emerald-400' : 'text-white/30'}`}>
                    {client.in_channel ? '✓' : '✗'}
                  </div>
                  <div className={`text-sm ${client.in_channel ? 'text-emerald-400' : 'text-white/30'}`}>Канал</div>
                </div>
                <div className={`p-3 rounded-xl text-center backdrop-blur-sm ${client.in_chat ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-zinc-800/50'}`}>
                  <div className={`text-2xl mb-1 ${client.in_chat ? 'text-emerald-400' : 'text-white/30'}`}>
                    {client.in_chat ? '✓' : '✗'}
                  </div>
                  <div className={`text-sm ${client.in_chat ? 'text-emerald-400' : 'text-white/30'}`}>Чат</div>
                </div>
              </div>
            </div>

            {/* Действия */}
            <div className="space-y-3">
              <button
                onClick={() => { setMessageText(''); setShowMessageModal(true) }}
                className="w-full py-4 bg-zinc-800/50 hover:bg-zinc-700/50 rounded-2xl text-white font-medium transition-all active:scale-[0.98] backdrop-blur-sm border border-white/10"
              >
                Написать сообщение
              </button>

              <button
                onClick={() => { setInviteLinks(null); setShowInviteModal(true) }}
                className="w-full py-4 bg-zinc-800/50 hover:bg-zinc-700/50 rounded-2xl text-white font-medium transition-all active:scale-[0.98] backdrop-blur-sm border border-white/10"
              >
                Отправить ссылку-приглашение
              </button>

              <button
                onClick={() => deletePremiumClient(client.id, client.telegram_id)}
                className="w-full py-4 bg-zinc-800/50 hover:bg-red-500/20 rounded-2xl text-white/60 hover:text-red-400 font-medium transition-all active:scale-[0.98] backdrop-blur-sm border border-white/10 hover:border-red-500/30"
              >
                Удалить клиента
              </button>
            </div>

            {/* Модалка invite-ссылок */}
            {showInviteModal && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end justify-center z-50">
                <div className="bg-zinc-900 rounded-t-3xl w-full max-w-lg p-6 pb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Ссылки-приглашения</h3>
                    <button onClick={() => setShowInviteModal(false)} className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white text-2xl transition-colors">×</button>
                  </div>

                  {!inviteLinks ? (
                    <div className="space-y-3">
                      <p className="text-white/50 text-sm mb-4">
                        Создать новые invite-ссылки для {client.username ? `@${client.username}` : client.telegram_id}
                      </p>
                      <button
                        onClick={async () => {
                          await generateInviteLinks(client.telegram_id, true)
                        }}
                        disabled={generatingInvite}
                        className="w-full py-4 bg-white text-black font-semibold rounded-xl disabled:opacity-50 active:scale-[0.98] transition-all"
                      >
                        {generatingInvite ? 'Генерация...' : 'Сгенерировать и отправить'}
                      </button>
                      <button
                        onClick={async () => {
                          await generateInviteLinks(client.telegram_id, false)
                        }}
                        disabled={generatingInvite}
                        className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl disabled:opacity-50 active:scale-[0.98] transition-all"
                      >
                        {generatingInvite ? 'Генерация...' : 'Только сгенерировать'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-emerald-400 text-sm">Ссылки сгенерированы</p>

                      <div className="space-y-3">
                        <div className="bg-zinc-800 rounded-xl p-3">
                          <div className="text-white/40 text-xs uppercase tracking-wide mb-2">Канал</div>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={inviteLinks.channelLink}
                              readOnly
                              className="flex-1 bg-transparent text-white text-sm focus:outline-none truncate"
                            />
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(inviteLinks.channelLink)
                                showToast({ variant: 'success', title: 'Скопировано' })
                              }}
                              className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm text-white transition-colors shrink-0"
                            >
                              Копировать
                            </button>
                          </div>
                        </div>

                        <div className="bg-zinc-800 rounded-xl p-3">
                          <div className="text-white/40 text-xs uppercase tracking-wide mb-2">Чат</div>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={inviteLinks.chatLink}
                              readOnly
                              className="flex-1 bg-transparent text-white text-sm focus:outline-none truncate"
                            />
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(inviteLinks.chatLink)
                                showToast({ variant: 'success', title: 'Скопировано' })
                              }}
                              className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm text-white transition-colors shrink-0"
                            >
                              Копировать
                            </button>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          const text = `Канал: ${inviteLinks.channelLink}\nЧат: ${inviteLinks.chatLink}`
                          navigator.clipboard.writeText(text)
                          showToast({ variant: 'success', title: 'Обе ссылки скопированы' })
                        }}
                        className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-colors"
                      >
                        Копировать обе ссылки
                      </button>

                      <p className="text-white/30 text-xs text-center">
                        Ссылки одноразовые, действуют 7 дней
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

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
            {(['leads', 'premium', 'broadcast'] as TabType[]).map(tab => (
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
            <div className="space-y-4">
              {/* Воронка конверсий */}
              {(() => {
                const totalBot = botUsers.length
                const appOpenedSet = new Set(users.map(u => u.telegram_id))
                const appOpenedFromBot = botUsers.filter(bu => appOpenedSet.has(bu.telegram_id)).length
                const purchasedSet = new Set(premiumClients.map(p => p.telegram_id))
                const purchasedFromBot = botUsers.filter(bu => purchasedSet.has(bu.telegram_id)).length

                const appRate = totalBot > 0 ? ((appOpenedFromBot / totalBot) * 100).toFixed(1) : '0'
                const purchaseRate = appOpenedFromBot > 0 ? ((purchasedFromBot / appOpenedFromBot) * 100).toFixed(1) : '0'
                const totalRate = totalBot > 0 ? ((purchasedFromBot / totalBot) * 100).toFixed(1) : '0'

                return (
                  <div className="bg-zinc-900 rounded-2xl p-4">
                    <h3 className="text-sm text-white/40 uppercase tracking-wide mb-4">Воронка (из бота)</h3>
                    <div className="space-y-3">
                      {/* Шаг 1: Бот */}
                      <div className="relative">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white font-medium">Нажали /start</span>
                          <span className="text-white font-bold">{totalBot}</span>
                        </div>
                        <div className="h-3 bg-blue-500/30 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: '100%' }} />
                        </div>
                      </div>

                      {/* Стрелка */}
                      <div className="flex items-center gap-2 text-white/30 text-xs pl-4">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                        <span>{appRate}%</span>
                      </div>

                      {/* Шаг 2: Открыли приложение */}
                      <div className="relative">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white font-medium">Открыли App</span>
                          <span className="text-emerald-400 font-bold">{appOpenedFromBot}</span>
                        </div>
                        <div className="h-3 bg-emerald-500/20 rounded-full overflow-hidden backdrop-blur-sm">
                          <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full" style={{ width: `${appRate}%` }} />
                        </div>
                      </div>

                      {/* Стрелка */}
                      <div className="flex items-center gap-2 text-white/30 text-xs pl-4">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                        <span>{purchaseRate}%</span>
                      </div>

                      {/* Шаг 3: Купили */}
                      <div className="relative">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white font-medium">Купили Premium</span>
                          <span className="text-[#FFD700] font-bold">{purchasedFromBot}</span>
                        </div>
                        <div className="h-3 bg-[#FFD700]/30 rounded-full overflow-hidden">
                          <div className="h-full bg-[#FFD700] rounded-full" style={{ width: `${totalRate}%` }} />
                        </div>
                      </div>

                      {/* Итоговая конверсия */}
                      <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                        <span className="text-white/50">Конверсия /start → Premium</span>
                        <span className="text-[#FFD700] font-bold text-lg">{totalRate}%</span>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Фильтры */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {[
                  { key: 'all', label: 'Все' },
                  { key: 'app_opened', label: 'Открыли App' },
                  { key: 'not_opened', label: 'Не открыли' },
                  { key: 'purchased', label: 'Купили' }
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setLeadsStatusFilter(f.key as typeof leadsStatusFilter)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${leadsStatusFilter === f.key ? 'bg-white text-black' : 'bg-zinc-800 text-white/60'
                      }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Поиск */}
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={leadsSearch}
                  onChange={e => setLeadsSearch(e.target.value)}
                  placeholder="Поиск по имени или ID..."
                  className="w-full pl-12 pr-4 py-3 bg-zinc-900 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>

              {/* Список пользователей */}
              {(() => {
                const appOpenedSet = new Set(users.map(u => u.telegram_id))
                const purchasedSet = new Set(premiumClients.map(p => p.telegram_id))

                const filtered = botUsers.filter(bu => {
                  // Поиск
                  if (leadsSearch) {
                    const q = leadsSearch.toLowerCase()
                    const match = bu.username?.toLowerCase().includes(q) ||
                      bu.first_name?.toLowerCase().includes(q) ||
                      bu.telegram_id.toString().includes(q)
                    if (!match) return false
                  }

                  // Фильтр по статусу
                  const opened = appOpenedSet.has(bu.telegram_id)
                  const purchased = purchasedSet.has(bu.telegram_id)

                  if (leadsStatusFilter === 'app_opened' && !opened) return false
                  if (leadsStatusFilter === 'not_opened' && opened) return false
                  if (leadsStatusFilter === 'purchased' && !purchased) return false

                  return true
                })

                return (
                  <>
                    <div className="text-sm text-white/40 mb-2">
                      Показано: <span className="text-white">{filtered.length}</span> из {botUsers.length}
                    </div>
                    <div className="bg-zinc-900 rounded-2xl overflow-hidden">
                      {filtered.slice(0, 100).map((bu, i) => {
                        const opened = appOpenedSet.has(bu.telegram_id)
                        const purchased = purchasedSet.has(bu.telegram_id)

                        return (
                          <div
                            key={bu.id}
                            className={`flex items-center gap-3 px-4 py-3 ${i !== 0 ? 'border-t border-white/5' : ''}`}
                          >
                            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-white/60 font-medium">
                              {(bu.first_name || bu.username || '?')[0]?.toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">
                                {bu.username ? `@${bu.username}` : bu.first_name || bu.telegram_id}
                              </div>
                              <div className="text-sm text-white/40 truncate flex items-center gap-2">
                                <span>{bu.source || 'direct'}</span>
                                <span className="text-white/20">•</span>
                                <span>{new Date(bu.created_at).toLocaleDateString('ru-RU')}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {opened && (
                                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center backdrop-blur-sm" title="Открыл приложение">
                                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              )}
                              {purchased && (
                                <div className="w-6 h-6 rounded-full bg-[#FFD700]/20 flex items-center justify-center" title="Купил подписку">
                                  <span className="text-[#FFD700] text-xs">$</span>
                                </div>
                              )}
                              {!opened && !purchased && (
                                <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center" title="Не открыл приложение">
                                  <span className="text-white/30 text-xs">—</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                      {filtered.length === 0 && (
                        <div className="py-12 text-center text-white/30">Ничего не найдено</div>
                      )}
                      {filtered.length > 100 && (
                        <div className="py-3 text-center text-white/30 text-sm border-t border-white/5">
                          Показаны первые 100 из {filtered.length}
                        </div>
                      )}
                    </div>
                  </>
                )
              })()}
            </div>
          )}

          {/* ============ PREMIUM ============ */}
          {activeTab === 'premium' && (
            <div className="space-y-4">
              {/* Статистика */}
              {(() => {
                // === СТАТИСТИКА: используем payment_history если есть, иначе premium_clients ===
                const hasPaymentHistory = paymentHistory.length > 0

                // Хелперы для валют
                // Крипто (0xprocessing и крипто-валюты)
                const isCryptoCurrency = (cur: string, source: string) => {
                  const c = (cur || '').toUpperCase()
                  return c.includes('USDT') || c.includes('USDC') ||
                    c.includes('BTC') || c.includes('ETH') || c.includes('TON') ||
                    c.includes('CRYPTO') || source === '0xprocessing'
                }
                // USD фиат (только Lava)
                const isUsdCurrency = (cur: string, source: string) => {
                  const c = (cur || '').toUpperCase()
                  return c === 'USD' && source !== '0xprocessing'
                }
                const isEurCurrency = (cur: string) => (cur || '').toUpperCase() === 'EUR'
                const isRubCurrency = (cur: string, source: string) => {
                  const c = (cur || '').toUpperCase()
                  return c === 'RUB' || (!cur && source === 'lava.top')
                }

                let totalRub = 0, totalUsd = 0, totalUsdt = 0, totalEur = 0, paidCountThisMonth = 0

                if (hasPaymentHistory) {
                  // Используем payment_history для точной статистики
                  const paymentsFiltered = statsMonth === 'all'
                    ? paymentHistory
                    : paymentHistory.filter(p => {
                      if (!p.created_at) return false
                      const paymentDate = new Date(p.created_at)
                      const paymentMonth = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`
                      return paymentMonth === statsMonth
                    })

                  paymentsFiltered.forEach(p => {
                    const amount = p.amount || 0
                    // Суммы в БД уже чистые (Lava показывает после комиссии)

                    if (isRubCurrency(p.currency, p.source)) totalRub += amount
                    else if (isEurCurrency(p.currency)) totalEur += amount
                    else if (isCryptoCurrency(p.currency, p.source)) totalUsdt += amount
                    else if (isUsdCurrency(p.currency, p.source)) totalUsd += amount
                  })
                  paidCountThisMonth = paymentsFiltered.length
                } else {
                  // Fallback: используем premium_clients (менее точно)
                  const allPaidClients = premiumClients.filter(c =>
                    c.source !== 'migration' && (c.total_paid_usd > 0 || (c.original_amount ?? 0) > 0)
                  )
                  const clientsFiltered = statsMonth === 'all'
                    ? allPaidClients
                    : allPaidClients.filter(c => {
                      if (!c.last_payment_at) return false
                      const paymentDate = new Date(c.last_payment_at)
                      const paymentMonth = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`
                      return paymentMonth === statsMonth
                    })

                  // DEBUG: найти не-Lava RUB платежи
                  const nonLavaRub: { id: string; telegram_id: number; amount: number; source: string | null }[] = []

                  clientsFiltered.forEach(c => {
                    // Для "Все время" — total_paid_usd (накопленная сумма)
                    // Для конкретного месяца — original_amount (последний платёж)
                    const amount = statsMonth === 'all'
                      ? (c.total_paid_usd || 0)
                      : (c.original_amount || 0)
                    // Суммы в БД уже чистые (Lava показывает после комиссии)

                    if (isRubCurrency(c.currency || '', c.source || '')) {
                      totalRub += amount
                      // Собираем не-Lava RUB платежи
                      if (c.source !== 'lava.top') {
                        nonLavaRub.push({ id: c.id, telegram_id: c.telegram_id, amount, source: c.source })
                      }
                    }
                    else if (isEurCurrency(c.currency || '')) totalEur += amount
                    else if (isCryptoCurrency(c.currency || '', c.source || '')) {
                      console.log('[USDT DEBUG]', c.telegram_id, 'original_amount:', c.original_amount, 'total_paid_usd:', c.total_paid_usd, 'ADDING:', amount)
                      totalUsdt += amount
                    }
                    else if (isUsdCurrency(c.currency || '', c.source || '')) totalUsd += amount
                  })
                  console.log('[USDT TOTAL FOR MONTH]', statsMonth, totalUsdt)
                  paidCountThisMonth = clientsFiltered.length

                  // DEBUG: вывести в консоль
                  if (nonLavaRub.length > 0) {
                    console.log('=== НЕ-LAVA RUB ПЛАТЕЖИ ===')
                    console.log('Количество:', nonLavaRub.length)
                    console.log('Сумма:', nonLavaRub.reduce((s, p) => s + p.amount, 0))
                    console.table(nonLavaRub)
                  }
                }

                // Активные подписчики (expires > now)
                const now = new Date()
                const activeSubscribers = premiumClients.filter(c => new Date(c.expires_at) > now).length

                // Средний чек
                const USD_TO_RUB = 100
                const EUR_TO_RUB = 110
                const totalInRub = totalRub + (totalUsd * USD_TO_RUB) + (totalUsdt * USD_TO_RUB) + (totalEur * EUR_TO_RUB)
                const avgCheck = paidCountThisMonth > 0 ? Math.round(totalInRub / paidCountThisMonth) : 0

                // Доступные месяцы для выбора
                const monthsSource = hasPaymentHistory
                  ? paymentHistory.filter(p => p.created_at).map(p => new Date(p.created_at))
                  : premiumClients.filter(c => c.last_payment_at).map(c => new Date(c.last_payment_at!))

                const availableStatsMonths = [...new Set(
                  monthsSource.map(d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
                )].sort().reverse()

                // Названия месяцев
                const monthNamesStats: Record<string, string> = {
                  '01': 'Январь', '02': 'Февраль', '03': 'Март', '04': 'Апрель',
                  '05': 'Май', '06': 'Июнь', '07': 'Июль', '08': 'Август',
                  '09': 'Сентябрь', '10': 'Октябрь', '11': 'Ноябрь', '12': 'Декабрь'
                }

                const formatStatsMonth = (m: string) => {
                  if (m === 'all') return 'Все время'
                  const [year, month] = m.split('-')
                  return `${monthNamesStats[month]} ${year}`
                }

                return (
                  <div className="space-y-3">
                    {/* Селектор месяца */}
                    <div className="flex items-center justify-between">
                      <div className="text-white/60 text-sm">Статистика за:</div>
                      <select
                        value={statsMonth}
                        onChange={e => setStatsMonth(e.target.value)}
                        className="px-3 py-1.5 bg-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50 appearance-none cursor-pointer"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23FFD700'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '14px', paddingRight: '28px' }}
                      >
                        <option value="all">Все время</option>
                        {availableStatsMonths.map(m => (
                          <option key={m} value={m}>{formatStatsMonth(m)}</option>
                        ))}
                      </select>
                    </div>

                    {/* Выручка по валютам */}
                    <div className="grid grid-cols-4 gap-2">
                      <div className="bg-zinc-900 rounded-xl p-3">
                        <div className="text-white/40 text-[10px] mb-1">RUB</div>
                        <div className="text-lg font-bold text-white">{Math.round(totalRub).toLocaleString('ru-RU')} ₽</div>
                      </div>
                      <div className="bg-zinc-900 rounded-xl p-3">
                        <div className="text-white/40 text-[10px] mb-1">USD</div>
                        <div className="text-lg font-bold text-[#FFD700]">${Math.round(totalUsd).toLocaleString('en-US')}</div>
                      </div>
                      <div className="bg-zinc-900 rounded-xl p-3">
                        <div className="text-white/40 text-[10px] mb-1">USDT</div>
                        <div className="text-lg font-bold text-emerald-400">${Math.round(totalUsdt).toLocaleString('en-US')}</div>
                      </div>
                      <div className="bg-zinc-900 rounded-xl p-3">
                        <div className="text-white/40 text-[10px] mb-1">EUR</div>
                        <div className="text-lg font-bold text-blue-400">€{Math.round(totalEur).toLocaleString('de-DE')}</div>
                      </div>
                    </div>

                    {/* Статистика подписчиков */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-zinc-900 rounded-xl p-3">
                        <div className="text-white/40 text-[10px] mb-1">Активных</div>
                        <div className="text-lg font-bold text-white">{activeSubscribers}</div>
                      </div>
                      <div className="bg-zinc-900 rounded-xl p-3">
                        <div className="text-white/40 text-[10px] mb-1">Оплат</div>
                        <div className="text-lg font-bold text-emerald-400">{paidCountThisMonth}</div>
                      </div>
                      <div className="bg-zinc-900 rounded-xl p-3">
                        <div className="text-white/40 text-[10px] mb-1">Ср. чек</div>
                        <div className="text-lg font-bold text-[#FFD700]">{avgCheck.toLocaleString('ru-RU')} ₽</div>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Поиск + Кнопка добавления */}
              <div className="flex gap-2">
                <div className="relative flex-1">
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
                <button
                  onClick={() => setShowAddClientModal(true)}
                  className="w-12 h-12 bg-gradient-to-b from-emerald-400 to-emerald-600 hover:from-emerald-300 hover:to-emerald-500 rounded-xl flex items-center justify-center text-white text-2xl font-bold transition-all shadow-lg shadow-emerald-500/30 backdrop-blur-sm flex-shrink-0"
                  title="Добавить клиента"
                >
                  +
                </button>
              </div>

              {/* Фильтры и сортировка */}
              <div className="bg-zinc-900/50 rounded-2xl p-3 space-y-3">
                {/* Верхний ряд: Статус + План */}
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={premiumFilter}
                    onChange={e => setPremiumFilter(e.target.value as typeof premiumFilter)}
                    className="w-full px-3 py-2.5 bg-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/20 appearance-none cursor-pointer"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23666'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '16px', paddingRight: '28px' }}
                  >
                    <option value="all">Все активные</option>
                    <option value="active">Стабильные (8+ дн)</option>
                    <option value="expiring">Истекают (≤7 дн)</option>
                  </select>

                  <select
                    value={planFilter}
                    onChange={e => setPlanFilter(e.target.value)}
                    className="w-full px-3 py-2.5 bg-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/20 appearance-none cursor-pointer"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23666'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '16px', paddingRight: '28px' }}
                  >
                    <option value="all">Все планы</option>
                    <option value="private">Private</option>
                    <option value="platinum">Platinum</option>
                    <option value="gold">Gold</option>
                    <option value="classic">Classic</option>
                    <option value="trader">Trader</option>
                  </select>
                </div>

                {/* Нижний ряд: Месяц + Сортировка */}
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={monthFilter}
                    onChange={e => setMonthFilter(e.target.value)}
                    className="w-full px-3 py-2.5 bg-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/20 appearance-none cursor-pointer"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23666'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '16px', paddingRight: '28px' }}
                  >
                    <option value="all">Все месяцы</option>
                    {availableMonths.map(m => (
                      <option key={m} value={m}>{formatMonthLabel(m)}</option>
                    ))}
                  </select>

                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as typeof sortBy)}
                    className="w-full px-3 py-2.5 bg-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/20 appearance-none cursor-pointer"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23666'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '16px', paddingRight: '28px' }}
                  >
                    <option value="last_payment">Последний платёж</option>
                    <option value="expires">Дата истечения</option>
                    <option value="total_paid">Сумма оплат</option>
                    <option value="created">Дата добавления</option>
                  </select>
                </div>
              </div>

              {/* Счётчик */}
              <div className="text-sm text-white/40">
                Найдено: <span className="text-white">{filteredPremiumClients.length}</span> из {activePremiumCount}
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
                        <div className={`px-3 py-1 rounded-full text-sm font-bold uppercase ${client.plan === 'private' ? 'bg-purple-500/20 text-purple-400' :
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
                          <span className="text-white font-medium">{formatAmount(client)}</span>
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
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs backdrop-blur-sm ${client.in_channel ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-800/50 text-white/30'
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${client.in_channel ? 'bg-emerald-400' : 'bg-white/30'}`} />
                          Канал
                        </div>
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs backdrop-blur-sm ${client.in_chat ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-800/50 text-white/30'
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${client.in_chat ? 'bg-emerald-400' : 'bg-white/30'}`} />
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

              {/* Модалка добавления клиента */}
              {showAddClientModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end justify-center z-50">
                  <div className="bg-zinc-900 rounded-t-3xl w-full max-w-lg p-6 pb-8 max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-white">Добавить подписчика</h3>
                      <button
                        onClick={() => setShowAddClientModal(false)}
                        className="w-8 h-8 flex items-center justify-center text-white/60 text-2xl hover:text-white"
                      >
                        ×
                      </button>
                    </div>

                    <div className="space-y-5">
                      {/* Telegram ID */}
                      <div>
                        <label className="text-white/50 text-sm mb-2 block">Telegram ID</label>
                        <input
                          type="text"
                          value={newClientId}
                          onChange={e => setNewClientId(e.target.value)}
                          placeholder="123456789"
                          className="w-full px-4 py-3 bg-zinc-800 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                          autoFocus
                        />
                      </div>

                      {/* Срок подписки */}
                      <div>
                        <label className="text-white/50 text-sm mb-2 block">Срок подписки</label>
                        <div className="grid grid-cols-5 gap-2">
                          {[
                            { value: '30', label: '1 мес', plan: 'Classic' },
                            { value: '90', label: '3 мес', plan: 'Gold' },
                            { value: '180', label: '6 мес', plan: 'Platinum' },
                            { value: '365', label: '12 мес', plan: 'Private' },
                            { value: 'custom', label: '...', plan: 'Дата' }
                          ].map(p => (
                            <button
                              key={p.value}
                              onClick={() => setNewClientPeriod(p.value as typeof newClientPeriod)}
                              className={`py-3 rounded-xl text-center transition-all ${newClientPeriod === p.value
                                ? 'bg-white text-black'
                                : 'bg-zinc-800 text-white/60 hover:bg-zinc-700'
                                }`}
                            >
                              <div className="font-medium">{p.label}</div>
                              <div className="text-xs opacity-70">{p.plan}</div>
                            </button>
                          ))}
                        </div>

                        {/* Красивый календарь */}
                        {newClientPeriod === 'custom' && (() => {
                          const today = new Date()
                          const viewYear = newClientCustomDate ? new Date(newClientCustomDate).getFullYear() : today.getFullYear()
                          const viewMonth = newClientCustomDate ? new Date(newClientCustomDate).getMonth() : today.getMonth()

                          const selectedDate = newClientCustomDate ? new Date(newClientCustomDate) : null
                          const currentMonth = new Date(viewYear, viewMonth, 1)
                          const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
                          const firstDayOfWeek = (currentMonth.getDay() + 6) % 7 // Понедельник = 0

                          const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                            'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
                          const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

                          const days = []
                          for (let i = 0; i < firstDayOfWeek; i++) {
                            days.push(null)
                          }
                          for (let i = 1; i <= daysInMonth; i++) {
                            days.push(i)
                          }

                          const handlePrevMonth = () => {
                            let m = viewMonth - 1
                            let y = viewYear
                            if (m < 0) { m = 11; y-- }
                            const d = newClientCustomDate ? new Date(newClientCustomDate) : new Date()
                            d.setFullYear(y)
                            d.setMonth(m)
                            d.setDate(1)
                            setNewClientCustomDate(d.toISOString().split('T')[0])
                          }

                          const handleNextMonth = () => {
                            let m = viewMonth + 1
                            let y = viewYear
                            if (m > 11) { m = 0; y++ }
                            const d = newClientCustomDate ? new Date(newClientCustomDate) : new Date()
                            d.setFullYear(y)
                            d.setMonth(m)
                            d.setDate(1)
                            setNewClientCustomDate(d.toISOString().split('T')[0])
                          }

                          const selectDay = (day: number) => {
                            const d = new Date(viewYear, viewMonth, day)
                            setNewClientCustomDate(d.toISOString().split('T')[0])
                          }

                          const isToday = (day: number) => {
                            return day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear()
                          }

                          const isSelected = (day: number) => {
                            if (!selectedDate) return false
                            return day === selectedDate.getDate() && viewMonth === selectedDate.getMonth() && viewYear === selectedDate.getFullYear()
                          }

                          const isPast = (day: number) => {
                            const d = new Date(viewYear, viewMonth, day)
                            d.setHours(23, 59, 59)
                            return d < today
                          }

                          return (
                            <div className="mt-4 bg-zinc-800 rounded-2xl p-4">
                              {/* Навигация месяца */}
                              <div className="flex items-center justify-between mb-4">
                                <button
                                  onClick={handlePrevMonth}
                                  className="w-10 h-10 rounded-xl bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                  </svg>
                                </button>
                                <div className="text-white font-semibold text-lg">
                                  {monthNames[viewMonth]} {viewYear}
                                </div>
                                <button
                                  onClick={handleNextMonth}
                                  className="w-10 h-10 rounded-xl bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </button>
                              </div>

                              {/* Дни недели */}
                              <div className="grid grid-cols-7 gap-1 mb-2">
                                {dayNames.map(d => (
                                  <div key={d} className="text-center text-xs text-white/40 py-1">{d}</div>
                                ))}
                              </div>

                              {/* Дни месяца */}
                              <div className="grid grid-cols-7 gap-1">
                                {days.map((day, i) => (
                                  <div key={i} className="aspect-square">
                                    {day && (
                                      <button
                                        onClick={() => !isPast(day) && selectDay(day)}
                                        disabled={isPast(day)}
                                        className={`w-full h-full rounded-xl flex items-center justify-center text-sm font-medium transition-all ${isSelected(day)
                                          ? 'bg-white text-black'
                                          : isToday(day)
                                            ? 'bg-zinc-600 text-white ring-1 ring-white/30'
                                            : isPast(day)
                                              ? 'text-white/20 cursor-not-allowed'
                                              : 'text-white/70 hover:bg-zinc-700 hover:text-white'
                                          }`}
                                      >
                                        {day}
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>

                              {/* Выбранная дата */}
                              {selectedDate && (
                                <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                                  <div className="text-white/50 text-sm">
                                    Подписка до: <span className="text-white font-medium">
                                      {selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </span>
                                  </div>
                                  <div className="text-[#FFD700] font-medium">
                                    {Math.ceil((selectedDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} дн.
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </div>

                      {/* Оплата */}
                      <div>
                        <label className="text-white/50 text-sm mb-2 block">Оплата</label>

                        {/* Переключатель без оплаты */}
                        <label className="flex items-center gap-3 mb-3 cursor-pointer">
                          <div
                            onClick={() => setNewClientNoPayment(!newClientNoPayment)}
                            className={`w-12 h-7 rounded-full relative transition-colors ${newClientNoPayment ? 'bg-white' : 'bg-zinc-700'
                              }`}
                          >
                            <div className={`w-5 h-5 rounded-full absolute top-1 transition-all ${newClientNoPayment ? 'left-6 bg-black' : 'left-1 bg-white'
                              }`} />
                          </div>
                          <span className="text-white">Без оплаты (бонус/перенос)</span>
                        </label>

                        {/* Поле суммы */}
                        {!newClientNoPayment && (
                          <div className="relative">
                            <input
                              type="number"
                              value={newClientAmount}
                              onChange={e => setNewClientAmount(e.target.value)}
                              placeholder="0"
                              className="w-full px-4 py-3 pr-20 bg-zinc-800 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 font-medium">
                              USDT
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Кнопка */}
                      <button
                        onClick={addPremiumClient}
                        disabled={addingClient || !newClientId.trim() || (newClientPeriod === 'custom' && !newClientCustomDate)}
                        className="w-full py-4 bg-white hover:bg-white/90 text-black font-semibold rounded-xl disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
                      >
                        {addingClient ? 'Добавление...' : 'Добавить'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============ РАССЫЛКА ============ */}
          {activeTab === 'broadcast' && (
            <div className="space-y-3">
              <div className="flex p-1 bg-zinc-900 rounded-xl mb-4">
                <button
                  onClick={() => setBroadcastTab('new')}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${broadcastTab === 'new' ? 'bg-zinc-800 text-white' : 'text-white/40 hover:text-white'
                    }`}
                >
                  Новая рассылка
                </button>
                <button
                  onClick={() => setBroadcastTab('history')}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${broadcastTab === 'history' ? 'bg-zinc-800 text-white' : 'text-white/40 hover:text-white'
                    }`}
                >
                  История
                </button>
              </div>

              {broadcastTab === 'history' ? (
                <div className="space-y-3">
                  {broadcastHistory.length === 0 ? (
                    <div className="text-center py-12 text-white/30">История пуста</div>
                  ) : (
                    broadcastHistory.map(record => (
                      <div key={record.id} className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
                        <div className="flex justify-between items-start mb-2">
                          <div className="text-sm font-medium text-white/50">
                            {new Date(record.created_at).toLocaleString('ru-RU')}
                          </div>
                          <div className={`px-2 py-0.5 rounded textxs font-medium bg-emerald-500/10 text-emerald-400 capitalize`}>
                            {record.status}
                          </div>
                        </div>
                        <div className="text-white mb-3 line-clamp-3 font-mono text-sm bg-zinc-950/50 p-2 rounded-lg">
                          {record.message}
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <div className="text-white/40">Получателей: <span className="text-white">{record.recipients_count}</span></div>
                          <div className="text-white/40">Тип: <span className="text-white">{record.filter_type || 'Manual'}</span></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <>
                  {/* Поиск конкретного пользователя */}
                  <div className="bg-zinc-900 rounded-2xl p-4">
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="text"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        placeholder="Поиск по ID, @username или имени..."
                        value={broadcastSearch}
                        onChange={e => setBroadcastSearch(e.target.value)}
                        className="w-full bg-zinc-800 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
                      />
                      {broadcastSearch && (
                        <button
                          onClick={() => { setBroadcastSearch(''); setSelectedUsers([]) }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Результаты поиска */}
                    {broadcastSearch.trim() && (() => {
                      const q = broadcastSearch.toLowerCase()
                      const allUsers = [
                        ...premiumClients.map(u => ({ telegram_id: u.telegram_id, username: u.username, first_name: u.first_name, avatar_url: u.avatar_url, isPremium: true })),
                        ...botUsers.map(u => ({ telegram_id: u.telegram_id, username: u.username, first_name: u.first_name, avatar_url: null, isPremium: false }))
                      ]
                      const unique = Array.from(new Map(allUsers.map(u => [u.telegram_id, u])).values())
                      const results = unique.filter(u =>
                        String(u.telegram_id).includes(q) ||
                        (u.username && u.username.toLowerCase().includes(q)) ||
                        (u.first_name && u.first_name.toLowerCase().includes(q))
                      ).slice(0, 10)

                      if (results.length === 0) {
                        return <p className="text-white/40 text-sm mt-3">Ничего не найдено</p>
                      }

                      return (
                        <div className="mt-3 space-y-1 max-h-64 overflow-y-auto">
                          {results.map(user => (
                            <button
                              key={user.telegram_id}
                              onClick={() => {
                                setSelectedUsers([user.telegram_id])
                                setBroadcastSearch('')
                              }}
                              className={`w-full flex items-center gap-3 p-2 rounded-xl transition-colors ${selectedUsers.includes(user.telegram_id) ? 'bg-white/10' : 'hover:bg-zinc-800'
                                }`}
                            >
                              {user.avatar_url ? (
                                <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-white/60 text-sm font-medium">
                                  {(user.first_name || user.username || '?')[0]?.toUpperCase()}
                                </div>
                              )}
                              <div className="flex-1 text-left">
                                <div className="text-white text-sm font-medium flex items-center gap-2">
                                  {user.first_name || user.username || 'Без имени'}
                                  {user.isPremium && <span className="text-[10px] bg-[#FFD700]/20 text-[#FFD700] px-1.5 py-0.5 rounded">Premium</span>}
                                </div>
                                <div className="text-white/40 text-xs">
                                  {user.username ? `@${user.username}` : ''} · {user.telegram_id}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )
                    })()}

                    {selectedUsers.length === 1 && !broadcastSearch && (() => {
                      const userId = selectedUsers[0]
                      const user = premiumClients.find(u => u.telegram_id === userId) || botUsers.find(u => u.telegram_id === userId)
                      if (!user) return null
                      return (
                        <div className="mt-3 flex items-center gap-3 bg-zinc-800 rounded-xl p-3">
                          {(user as typeof premiumClients[0]).avatar_url ? (
                            <img src={(user as typeof premiumClients[0]).avatar_url!} alt="" className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-white/60 text-sm font-medium">
                              {(user.first_name || user.username || '?')[0]?.toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="text-white text-sm font-medium">{user.first_name || user.username || 'Без имени'}</div>
                            <div className="text-white/40 text-xs">{user.username ? `@${user.username}` : ''} · {user.telegram_id}</div>
                          </div>
                          <button onClick={() => setSelectedUsers([])} className="text-white/40 hover:text-white p-1">✕</button>
                        </div>
                      )
                    })()}
                  </div>

                  {/* Или выбрать аудиторию */}
                  {!broadcastSearch && selectedUsers.length !== 1 && (
                    <div className="bg-zinc-900 rounded-2xl p-4">
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          onChange={e => {
                            const v = e.target.value
                            if (v === 'bot') setSelectedUsers(botUsers.map(u => u.telegram_id))
                            else if (v === 'app') setSelectedUsers(users.map(u => u.telegram_id))
                            else if (v === 'premium-active') {
                              const activeIds = premiumClients.filter(p => new Date(p.expires_at) > new Date()).map(p => p.telegram_id)
                              setSelectedUsers(activeIds)
                            }
                            else if (v === 'premium-expired') {
                              const expiredIds = premiumClients.filter(p => new Date(p.expires_at) <= new Date()).map(p => p.telegram_id)
                              setSelectedUsers(expiredIds)
                            }
                            else if (v === 'no-premium') {
                              const premiumIds = new Set(premiumClients.map(p => p.telegram_id))
                              setSelectedUsers(botUsers.filter(u => !premiumIds.has(u.telegram_id)).map(u => u.telegram_id))
                            }
                            else setSelectedUsers([])
                          }}
                          className="bg-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-white/20 appearance-none cursor-pointer"
                        >
                          <option value="">Аудитория</option>
                          <option value="bot">Все из бота ({botUsers.length})</option>
                          <option value="premium-active">Активные Premium ({premiumClients.filter(p => new Date(p.expires_at) > new Date()).length})</option>
                          <option value="premium-expired">Были в Premium ({premiumClients.filter(p => new Date(p.expires_at) <= new Date()).length})</option>
                          <option value="no-premium">Без Premium ({botUsers.length - premiumClients.length})</option>
                        </select>

                        <select
                          onChange={e => {
                            const v = e.target.value
                            if (!v) return
                            const filtered = premiumClients.filter(p => {
                              const plan = p.plan?.toLowerCase()
                              if (v === 'classic') return plan === 'classic' || p.plan === '1month'
                              if (v === 'gold') return plan === 'gold'
                              if (v === 'platinum') return plan === 'platinum'
                              if (v === 'private') return plan === 'private' || p.plan === '2months'
                              if (v === 'from3m') return ['gold', 'platinum', 'private'].includes(plan || '') || p.plan === '2months'
                              return false
                            })
                            setSelectedUsers(filtered.map(p => p.telegram_id))
                          }}
                          className="bg-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-white/20 appearance-none cursor-pointer"
                        >
                          <option value="">По тарифу</option>
                          <option value="classic">CLASSIC ({premiumClients.filter(p => p.plan?.toLowerCase() === 'classic' || p.plan === '1month').length})</option>
                          <option value="gold">GOLD ({premiumClients.filter(p => p.plan?.toLowerCase() === 'gold').length})</option>
                          <option value="platinum">PLATINUM ({premiumClients.filter(p => p.plan?.toLowerCase() === 'platinum').length})</option>
                          <option value="private">PRIVATE ({premiumClients.filter(p => p.plan?.toLowerCase() === 'private' || p.plan === '2months').length})</option>
                          <option value="from3m">От 3 мес ({premiumClients.filter(p => ['gold', 'platinum', 'private'].includes(p.plan?.toLowerCase() || '') || p.plan === '2months').length})</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800">
                        <span className="text-white/40 text-sm">Выбрано получателей</span>
                        <span className="text-white font-medium">{selectedUsers.length}</span>
                      </div>
                    </div>
                  )}

                  {/* Контент */}
                  <div className="bg-zinc-900 rounded-2xl p-4 space-y-4">
                    {/* Картинка */}
                    {broadcastImagePreview ? (
                      <div className="relative">
                        <img src={broadcastImagePreview} alt="Preview" className="w-full max-h-40 object-contain rounded-xl" />
                        <button
                          onClick={clearBroadcastImage}
                          className="absolute top-2 right-2 w-7 h-7 bg-black/70 rounded-full flex items-center justify-center text-white/80 hover:text-white text-sm"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center h-16 border border-dashed border-zinc-700 rounded-xl cursor-pointer hover:border-zinc-500 transition-colors">
                        <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                        <span className="text-white/30 text-sm">+ Добавить картинку</span>
                      </label>
                    )}

                    {/* Текст */}
                    <textarea
                      value={broadcastMessage}
                      onChange={e => setBroadcastMessage(e.target.value)}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      placeholder={broadcastImage ? "Подпись к картинке..." : "Текст сообщения..."}
                      className="w-full h-28 bg-zinc-800 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 resize-none"
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
                    disabled={sendingBroadcast || (!broadcastMessage.trim() && !broadcastImage)}
                    className="w-full py-4 bg-white text-black font-semibold rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
                  >
                    {sendingBroadcast ? 'Отправка...' : broadcastImage ? 'Отправить картинку' : 'Отправить'}
                  </button>
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </Layout>
  )
}
// Build 1767352989
