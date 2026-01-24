import { useState, useEffect, useRef, useCallback } from 'react'
import DOMPurify from 'dompurify'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAdminAuth } from '../providers/AdminAuthProvider'
import { AutomationRules } from '../components/inbox/AutomationRules'
import {
  Search, Send, ArrowLeft, Star,
  MoreVertical, Check, CheckCheck, Crown,
  MessageCircle
} from 'lucide-react'

// ============ ТИПЫ ============
interface Conversation {
  id: string
  telegram_id: number
  username: string | null
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  status: 'open' | 'closed' | 'archived'
  is_read: boolean
  is_starred: boolean
  last_message_at: string
  last_message_text: string | null
  last_message_from: 'user' | 'bot'
  unread_count: number
  tags: string[]
  notes: string | null
  is_premium: boolean
  premium_plan: string | null
  created_at: string
}

interface Message {
  id: string
  conversation_id: string
  telegram_id: number
  message_id: number | null
  text: string | null
  direction: 'incoming' | 'outgoing'
  message_type: string
  media_file_id: string | null
  caption: string | null
  is_read: boolean
  is_command: boolean
  command_name: string | null
  sent_by: string | null
  created_at: string
}

interface InboxStats {
  total_conversations: number
  unread_conversations: number
  total_unread_messages: number
  premium_conversations: number
  today_messages: number
}

interface SystemMessage {
  id: string
  telegram_id: string
  message_type: string
  text: string
  source: string
  success: boolean
  error: string | null
  metadata: Record<string, any>
  created_at: string
}

// ============ КОНСТАНТЫ ============

// ============ КОМПОНЕНТ ============
export function InboxPage() {
  const { isAdminAuthenticated, verifyAdmin, getAuthHeaders } = useAdminAuth()
  // projectId is optional - only available when rendered under AdminLayout
  let projectId: string | undefined = undefined
  try {
    const context = useOutletContext<{ projectId: string } | null>()
    projectId = context?.projectId
  } catch {
    // Running standalone, no context available
  }

  // Auth state (UI only - actual auth is in AdminAuthProvider)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)

  // Data state
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [stats, setStats] = useState<InboxStats | null>(null)
  const [loading, setLoading] = useState(true)

  // UI state
  const [activeTab, setActiveTab] = useState<'chats' | 'automation' | 'system'>('chats')
  const [systemMessages, setSystemMessages] = useState<SystemMessage[]>([])
  const [systemMessagesLoading, setSystemMessagesLoading] = useState(false)
  const [systemMessagesFilter, setSystemMessagesFilter] = useState<'all' | 'success' | 'failed' | 'payment_welcome'>('all')
  const [systemMessagesSourceFilter, setSystemMessagesSourceFilter] = useState<string>('all')
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread' | 'premium' | 'starred'>('all')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // ... (Keep existing AUTH logic) ...
  const isTelegramWebApp = typeof window !== 'undefined' && !!window.Telegram?.WebApp?.initData

  // Auth is handled by AdminAuthProvider - no local auth logic needed

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
        localStorage.setItem('admin_auth', 'true')
      } else {
        setPasswordError(true)
      }
    } catch {
      setPasswordError(true)
    } finally {
      setIsVerifying(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_auth')
    setPasswordInput('')
    setSelectedConversation(null)
    setConversations([])
    setMessages([])
    // Note: actual logout handled by AdminAuthProvider.logout()
  }

  // ... (Keep existing DATA LOADING logic: loadConversations, loadMessages, loadStats) ...
  const loadConversations = useCallback(async () => {
    // TODO: Filter by projectId when backend supports it
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .order('last_message_at', { ascending: false })

      if (error) throw error
      setConversations(data || [])
    } catch (err) {
      console.error('Load conversations error:', err)
    }
  }, [projectId])

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages(data || [])

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } catch (err) {
      console.error('Load messages error:', err)
    }
  }, [])

  const loadStats = useCallback(async () => {
    try {
      const [totalRes, unreadRes, premiumRes, todayRes] = await Promise.all([
        supabase.from('chat_conversations').select('id', { count: 'exact', head: true }),
        supabase.from('chat_conversations').select('id', { count: 'exact', head: true }).eq('is_read', false),
        supabase.from('chat_conversations').select('id', { count: 'exact', head: true }).eq('is_premium', true),
        supabase.from('chat_messages').select('id', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      ])

      const totalUnread = await supabase
        .from('chat_conversations')
        .select('unread_count')

      const unreadSum = totalUnread.data?.reduce((sum, c) => sum + (c.unread_count || 0), 0) || 0

      setStats({
        total_conversations: totalRes.count || 0,
        unread_conversations: unreadRes.count || 0,
        total_unread_messages: unreadSum,
        premium_conversations: premiumRes.count || 0,
        today_messages: todayRes.count || 0
      })
    } catch (err) {
      console.error('Load stats error:', err)
    }
  }, [])

  const loadSystemMessages = useCallback(async () => {
    setSystemMessagesLoading(true)
    try {
      const params = new URLSearchParams({
        filter: systemMessagesFilter,
        source: systemMessagesSourceFilter
      })

      const response = await fetch(`/api/system-messages?${params}`, {
        headers: getAuthHeaders()
      })

      if (!response.ok) {
        throw new Error('Failed to load system messages')
      }

      const result = await response.json()
      setSystemMessages(result.data || [])
    } catch (err) {
      console.error('Load system messages error:', err)
      setSystemMessages([])
    } finally {
      setSystemMessagesLoading(false)
    }
  }, [systemMessagesFilter, systemMessagesSourceFilter])

  useEffect(() => {
    if (isAdminAuthenticated && activeTab === 'system') {
      loadSystemMessages()
    }
  }, [isAdminAuthenticated, activeTab, loadSystemMessages])

  // ... (Keep existing useEffects for Auth check and Realtime) ...
  useEffect(() => {
    if (isAdminAuthenticated) {
      setLoading(true)
      Promise.all([loadConversations(), loadStats()])
        .finally(() => setLoading(false))
    }
  }, [isAdminAuthenticated, loadConversations, loadStats])

  useEffect(() => {
    if (!isAdminAuthenticated) return

    const channel = supabase
      .channel('inbox-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_conversations'
      }, () => {
        loadConversations()
        loadStats()
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages'
      }, (payload) => {
        if (selectedConversation && payload.new.conversation_id === selectedConversation.id) {
          setMessages(prev => [...prev, payload.new as Message])
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
          }, 100)
        }
        loadConversations()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isAdminAuthenticated, selectedConversation, loadConversations, loadStats])

  // ... (Keep existing ACTIONS: selectConversation, sendMessage, toggleStar) ...
  const selectConversation = async (conv: Conversation) => {
    setSelectedConversation(conv)
    await loadMessages(conv.id)

    if (!conv.is_read || conv.unread_count > 0) {
      await supabase
        .from('chat_conversations')
        .update({ is_read: true, unread_count: 0 })
        .eq('id', conv.id)

      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('conversation_id', conv.id)
        .eq('direction', 'incoming')

      loadConversations()
      loadStats()
    }
  }

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedConversation || sending) return

    setSending(true)
    try {
      const telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user
      const telegramId = telegramUser?.id

      const response = await fetch('/api/inbox-send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          telegramId: selectedConversation.telegram_id,
          text: messageText.trim(),
          sentBy: telegramId || 'admin'
        })
      })

      const result = await response.json()

      if (result.success) {
        setMessageText('')
        await loadMessages(selectedConversation.id)
        inputRef.current?.focus()
      } else {
        alert('Ошибка отправки: ' + (result.error || 'Неизвестная ошибка'))
      }
    } catch (err) {
      console.error('Send message error:', err)
      alert('Ошибка отправки сообщения')
    } finally {
      setSending(false)
    }
  }

  const toggleStar = async (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation()
    await supabase
      .from('chat_conversations')
      .update({ is_starred: !conv.is_starred })
      .eq('id', conv.id)
    loadConversations()
  }

  // ... (Keep existing FILTERS logic) ...
  const filteredConversations = conversations.filter(conv => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchName = conv.first_name?.toLowerCase().includes(query)
      const matchUsername = conv.username?.toLowerCase().includes(query)
      const matchId = String(conv.telegram_id).includes(query)
      if (!matchName && !matchUsername && !matchId) return false
    }
    if (filter === 'unread' && conv.is_read) return false
    if (filter === 'premium' && !conv.is_premium) return false
    if (filter === 'starred' && !conv.is_starred) return false
    return true
  })

  // ... (Keep existing HELPERS) ...
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    } else if (days === 1) {
      return 'Вчера'
    } else if (days < 7) {
      return date.toLocaleDateString('ru-RU', { weekday: 'short' })
    } else {
      return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
    }
  }

  const getDisplayName = (conv: Conversation) => {
    if (conv.first_name) return conv.first_name
    if (conv.username) return `@${conv.username}`
    return `ID: ${conv.telegram_id}`
  }

  const getPlanBadge = (plan: string | null) => {
    const badges: Record<string, { bg: string, text: string }> = {
      classic: { bg: 'bg-zinc-600', text: 'CLASSIC' },
      gold: { bg: 'bg-yellow-600', text: 'GOLD' },
      platinum: { bg: 'bg-purple-600', text: 'PLATINUM' },
      private: { bg: 'bg-red-600', text: 'PRIVATE' }
    }
    return badges[plan || ''] || null
  }


  // ============ RENDER: AUTH ============
  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="bg-zinc-900 rounded-2xl p-8 max-w-sm w-full border border-zinc-800">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">🔐 Авторизация</h1>
            <p className="text-sm text-zinc-400">Требуется доступ администратора</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Пароль администратора</label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                placeholder="Введите пароль"
                autoFocus
                className={`w-full px-4 py-3 bg-zinc-800 border rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 ${passwordError ? 'border-red-500' : 'border-zinc-700'}`}
              />
              {passwordError && (
                <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                  <span>❌</span> Неверный пароль
                </p>
              )}
            </div>
            
            <button
              onClick={handlePasswordSubmit}
              disabled={isVerifying}
              className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold rounded-xl hover:opacity-90 transition active:scale-[0.98] disabled:opacity-50"
            >
              {isVerifying ? 'Проверка...' : 'Войти'}
            </button>
            
            <div className="text-center text-xs text-zinc-500 mt-4">
              <p>Или авторизуйтесь через Telegram</p>
              <p className="text-zinc-600 mt-1">(только для администраторов)</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
      </div>
    )
  }

  // ============ RENDER: MAIN ============
  return (
    <div className="h-screen bg-[#0a0a0a] flex flex-col overflow-hidden">
      {/* Top Bar for Tabs */}
      <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-4 bg-[#0a0a0a] z-10">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('chats')}
            className={`py-4 px-2 text-sm font-medium border-b-2 transition ${activeTab === 'chats' ? 'border-yellow-500 text-yellow-500' : 'border-transparent text-zinc-400 hover:text-white'}`}
          >
            Диалоги
          </button>
          <button
            onClick={() => setActiveTab('automation')}
            className={`py-4 px-2 text-sm font-medium border-b-2 transition ${activeTab === 'automation' ? 'border-yellow-500 text-yellow-500' : 'border-transparent text-zinc-400 hover:text-white'}`}
          >
            Автоматизация
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`py-4 px-2 text-sm font-medium border-b-2 transition ${activeTab === 'system' ? 'border-yellow-500 text-yellow-500' : 'border-transparent text-zinc-400 hover:text-white'}`}
          >
            Системные сообщения
          </button>
        </div>
        
        {/* Индикатор авторизации в шапке */}
        <div className="flex items-center gap-3">
          {isTelegramWebApp ? (
            <div className="flex items-center gap-2 text-xs text-green-400">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>Telegram авторизация</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-yellow-400">
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              <span>Пароль</span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="text-xs text-zinc-400 hover:text-red-400 px-2 py-1 hover:bg-red-400/10 rounded transition"
            title="Выйти из системы"
          >
            Выход
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'chats' ? (
          <>
            {/* Sidebar - Conversations */}
            <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-96 border-r border-zinc-800`}>
              {/* Header */}
              <div className="p-4 border-b border-zinc-800">
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-xl font-bold text-white flex items-center gap-2">
                    <MessageCircle className="w-6 h-6 text-yellow-500" />
                    Inbox
                  </h1>
                  {/* Индикатор авторизации и кнопка выхода */}
                  <div className="flex items-center gap-2">
                    {isTelegramWebApp ? (
                      <span className="text-xs text-green-400 px-2 py-1 bg-green-400/10 rounded">
                        ✅ Telegram
                      </span>
                    ) : (
                      <span className="text-xs text-yellow-400 px-2 py-1 bg-yellow-400/10 rounded">
                        🔐 Авторизован
                      </span>
                    )}
                    <button
                      onClick={handleLogout}
                      className="text-xs text-red-400 hover:text-red-300 px-2 py-1 hover:bg-red-400/10 rounded transition"
                      title="Выйти"
                    >
                      Выход
                    </button>
                  </div>
                </div>

                {/* Stats */}
                {stats && (
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
                      <div className="text-lg font-bold text-white">{stats.total_conversations}</div>
                      <div className="text-xs text-zinc-500">Всего</div>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
                      <div className="text-lg font-bold text-red-400">{stats.unread_conversations}</div>
                      <div className="text-xs text-zinc-500">Непрочит.</div>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
                      <div className="text-lg font-bold text-yellow-400">{stats.premium_conversations}</div>
                      <div className="text-xs text-zinc-500">Premium</div>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
                      <div className="text-lg font-bold text-green-400">{stats.today_messages}</div>
                      <div className="text-xs text-zinc-500">Сегодня</div>
                    </div>
                  </div>
                )}

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск по имени или ID..."
                    className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500"
                  />
                </div>

                {/* Filters */}
                <div className="flex gap-2 mt-3">
                  {(['all', 'unread', 'premium', 'starred'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition ${filter === f
                        ? 'bg-yellow-500 text-black'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                    >
                      {f === 'all' && 'Все'}
                      {f === 'unread' && 'Непрочит.'}
                      {f === 'premium' && 'Premium'}
                      {f === 'starred' && '⭐'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conversations List */}
              <div className="flex-1 overflow-y-auto">
                {filteredConversations.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Нет диалогов</p>
                  </div>
                ) : (
                  filteredConversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => selectConversation(conv)}
                      className={`p-4 border-b border-zinc-800/50 cursor-pointer hover:bg-zinc-800/50 transition ${selectedConversation?.id === conv.id ? 'bg-zinc-800' : ''
                        } ${!conv.is_read ? 'bg-zinc-900' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-black font-bold text-lg">
                            {(conv.first_name?.[0] || conv.username?.[0] || '?').toUpperCase()}
                          </div>
                          {conv.is_premium && (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                              <Crown className="w-3 h-3 text-black" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-white truncate">
                                {getDisplayName(conv)}
                              </span>
                              {conv.premium_plan && getPlanBadge(conv.premium_plan) && (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${getPlanBadge(conv.premium_plan)!.bg} text-white`}>
                                  {getPlanBadge(conv.premium_plan)!.text}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-zinc-500">
                              {formatTime(conv.last_message_at)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-sm text-zinc-400 truncate pr-2">
                              {conv.last_message_from === 'bot' && <span className="text-zinc-500">Вы: </span>}
                              {conv.last_message_text || 'Нет сообщений'}
                            </p>
                            <div className="flex items-center gap-2">
                              {conv.unread_count > 0 && (
                                <span className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center text-xs font-bold text-black">
                                  {conv.unread_count}
                                </span>
                              )}
                              <button
                                onClick={(e) => toggleStar(conv, e)}
                                className={`p-1 rounded transition ${conv.is_starred ? 'text-yellow-500' : 'text-zinc-600 hover:text-zinc-400'}`}
                              >
                                <Star className="w-4 h-4" fill={conv.is_starred ? 'currentColor' : 'none'} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div className={`${selectedConversation ? 'flex' : 'hidden md:flex'} flex-col flex-1`}>
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-zinc-800 flex items-center gap-4">
                    <button
                      onClick={() => setSelectedConversation(null)}
                      className="md:hidden p-2 hover:bg-zinc-800 rounded-lg transition"
                    >
                      <ArrowLeft className="w-5 h-5 text-zinc-400" />
                    </button>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-black font-bold">
                      {(selectedConversation.first_name?.[0] || selectedConversation.username?.[0] || '?').toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{getDisplayName(selectedConversation)}</span>
                        {selectedConversation.is_premium && <Crown className="w-4 h-4 text-yellow-500" />}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {selectedConversation.username && `@${selectedConversation.username} • `}
                        ID: {selectedConversation.telegram_id}
                      </div>
                    </div>
                    <button className="p-2 hover:bg-zinc-800 rounded-lg transition">
                      <MoreVertical className="w-5 h-5 text-zinc-400" />
                    </button>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${msg.direction === 'outgoing' ? 'bg-yellow-500 text-black rounded-br-md' : 'bg-zinc-800 text-white rounded-bl-md'
                          }`}>
                          {msg.is_command && <div className="text-xs opacity-70 mb-1">Команда: {msg.command_name}</div>}

                          {/* Safe HTML Rendering */}
                          <div
                            className="whitespace-pre-wrap break-words [&>b]:font-bold [&>i]:italic [&>a]:underline [&>a]:text-blue-400"
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg.text || '') }}
                          />

                          <div className={`text-xs mt-1 flex items-center gap-1 ${msg.direction === 'outgoing' ? 'text-black/60 justify-end' : 'text-zinc-500'}`}>
                            {new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                            {msg.direction === 'outgoing' && (msg.is_read ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />)}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>


                  {/* Input */}
                  <div className="p-4 border-t border-zinc-800">
                    <div className="flex gap-2">
                      <textarea
                        ref={inputRef}
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            sendMessage()
                          }
                        }}
                        placeholder="Напишите сообщение..."
                        rows={1}
                        className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 resize-none focus:outline-none focus:ring-1 focus:ring-yellow-500"
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!messageText.trim() || sending}
                        className="px-4 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold rounded-xl hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sending ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <Send className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageCircle className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                    <h2 className="text-xl font-medium text-zinc-400 mb-2">Выберите диалог</h2>
                    <p className="text-zinc-600">Выберите диалог из списка слева, чтобы начать переписку</p>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : activeTab === 'automation' ? (
          <AutomationRules projectId={projectId} />
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* System Messages Header */}
            <div className="p-4 border-b border-zinc-800">
              <h2 className="text-xl font-bold text-white mb-4">Системные сообщения</h2>
              
              {/* Filters */}
              <div className="flex gap-4 flex-wrap">
                <div className="flex gap-2">
                  <span className="text-zinc-400 text-sm py-2">Статус:</span>
                  {(['all', 'success', 'failed', 'payment_welcome'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setSystemMessagesFilter(f)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                        systemMessagesFilter === f
                          ? 'bg-yellow-500 text-black'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      {f === 'all' && 'Все'}
                      {f === 'success' && '✅ Успешно'}
                      {f === 'failed' && '❌ Ошибки'}
                      {f === 'payment_welcome' && '💰 Платежи'}
                    </button>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <span className="text-zinc-400 text-sm py-2">Источник:</span>
                  <select
                    value={systemMessagesSourceFilter}
                    onChange={(e) => setSystemMessagesSourceFilter(e.target.value)}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-zinc-800 text-white border border-zinc-700 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                  >
                    <option value="all">Все</option>
                    <option value="0xprocessing">0xProcessing</option>
                    <option value="lava.top">Lava.top</option>
                    <option value="toolsy">Toolsy</option>
                    <option value="subscription-reminder">Напоминания</option>
                    <option value="auto-kick-expired">Автокик</option>
                  </select>
                </div>
              </div>
            </div>

            {/* System Messages List */}
            <div className="flex-1 overflow-y-auto p-4">
              {systemMessagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
                </div>
              ) : systemMessages.length === 0 ? (
                <div className="text-center text-zinc-500 py-12">
                  <p>Нет системных сообщений</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {systemMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-4 rounded-lg border ${
                        msg.success
                          ? 'bg-zinc-900/50 border-zinc-800'
                          : 'bg-red-900/20 border-red-800/50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            msg.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {msg.success ? '✅' : '❌'}
                          </span>
                          <span className="text-xs text-zinc-400">{msg.source}</span>
                          <span className="text-xs text-zinc-500">{msg.message_type}</span>
                        </div>
                        <span className="text-xs text-zinc-500">
                          {new Date(msg.created_at).toLocaleString('ru-RU')}
                        </span>
                      </div>
                      
                      <div className="mb-2">
                        <span className="text-xs text-zinc-400">ID: {msg.telegram_id}</span>
                      </div>
                      
                      <div className="text-sm text-white mb-2 whitespace-pre-wrap break-words">
                        {msg.text.substring(0, 300)}{msg.text.length > 300 ? '...' : ''}
                      </div>
                      
                      {msg.error && (
                        <div className="text-xs text-red-400 mb-2">
                          Ошибка: {msg.error}
                        </div>
                      )}
                      
                      {msg.metadata && Object.keys(msg.metadata).length > 0 && (
                        <details className="text-xs text-zinc-400">
                          <summary className="cursor-pointer hover:text-zinc-300">Метаданные</summary>
                          <pre className="mt-2 p-2 bg-zinc-900 rounded overflow-auto">
                            {JSON.stringify(msg.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
