import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

interface Message {
  id: number
  telegram_id: number | null
  username: string | null
  first_name: string | null
  message: string
  created_at: string
  is_pinned?: boolean
}

// Админы трансляции
const STREAM_ADMINS = [190202791, 288542643, 288475216]

// Тип для Telegram Login Widget
interface TelegramLoginUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

export function StreamChat() {
  const { telegramUser } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [pinnedMessage, setPinnedMessage] = useState<Message | null>(null)
  const [webUser, setWebUser] = useState<TelegramLoginUser | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const loginButtonRef = useRef<HTMLDivElement>(null)

  // Загрузка сохранённого пользователя из localStorage
  useEffect(() => {
    const saved = localStorage.getItem('telegram_web_user')
    if (saved) {
      try {
        setWebUser(JSON.parse(saved))
      } catch {
        localStorage.removeItem('telegram_web_user')
      }
    }
  }, [])

  // Telegram Login Widget callback
  useEffect(() => {
    (window as unknown as { onTelegramAuth: (user: TelegramLoginUser) => void }).onTelegramAuth = (user: TelegramLoginUser) => {
      setWebUser(user)
      localStorage.setItem('telegram_web_user', JSON.stringify(user))
    }
  }, [])

  // Загрузка Telegram Login Widget скрипта
  useEffect(() => {
    if (!loginButtonRef.current || webUser || window.Telegram?.WebApp?.initDataUnsafe?.user) return

    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', 'ARARENA_BOT')
    script.setAttribute('data-size', 'medium')
    script.setAttribute('data-radius', '10')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    script.setAttribute('data-request-access', 'write')
    script.async = true

    loginButtonRef.current.innerHTML = ''
    loginButtonRef.current.appendChild(script)
  }, [webUser])

  // Текущий пользователь (из WebApp или из Web Login)
  const currentUser = window.Telegram?.WebApp?.initDataUnsafe?.user || webUser
  const canWrite = !!currentUser

  // Проверка админа
  const isAdmin = canWrite && currentUser && STREAM_ADMINS.includes(currentUser.id)
  const isMessageAdmin = (msg: Message) => msg.telegram_id && STREAM_ADMINS.includes(msg.telegram_id)

  // Загрузка сообщений
  useEffect(() => {
    loadMessages()

    // Подписка на новые сообщения (realtime)
    const channel = supabase
      .channel('stream_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'stream_messages'
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages(prev => [...prev, newMsg])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Автоскролл при новых сообщениях
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('stream_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(100)

    if (!error && data) {
      setMessages(data)
      // Находим закреплённое сообщение
      const pinned = data.find(m => m.is_pinned)
      if (pinned) setPinnedMessage(pinned)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSend = async () => {
    if (!newMessage.trim() || sending || !currentUser) return

    setSending(true)
    const messageText = newMessage.trim()
    setNewMessage('')

    const { error } = await supabase
      .from('stream_messages')
      .insert({
        telegram_id: currentUser.id,
        username: currentUser.username || null,
        first_name: currentUser.first_name || 'Гость',
        message: messageText
      })

    if (error) {
      console.error('Error sending message:', error)
      setNewMessage(messageText) // Восстанавливаем текст если ошибка
    }

    setSending(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Удаление сообщения (только для админов)
  const handleDelete = async (msgId: number) => {
    if (!isAdmin) return

    const { error } = await supabase
      .from('stream_messages')
      .delete()
      .eq('id', msgId)

    if (!error) {
      setMessages(prev => prev.filter(m => m.id !== msgId))
      if (pinnedMessage?.id === msgId) {
        setPinnedMessage(null)
      }
    }
  }

  // Закрепление сообщения (только для админов)
  const handlePin = async (msg: Message) => {
    if (!isAdmin) return

    // Если это сообщение уже закреплено - открепляем
    if (pinnedMessage?.id === msg.id) {
      await supabase
        .from('stream_messages')
        .update({ is_pinned: false })
        .eq('id', msg.id)
      setPinnedMessage(null)
      return
    }

    // Открепляем предыдущее
    if (pinnedMessage) {
      await supabase
        .from('stream_messages')
        .update({ is_pinned: false })
        .eq('id', pinnedMessage.id)
    }

    // Закрепляем новое
    await supabase
      .from('stream_messages')
      .update({ is_pinned: true })
      .eq('id', msg.id)

    setPinnedMessage(msg)
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }

  const getDisplayName = (msg: Message) => {
    if (msg.username) return `@${msg.username}`
    if (msg.first_name) return msg.first_name
    return 'Гость'
  }

  const getAvatarColor = (id: number | null) => {
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-cyan-500'
    ]
    return colors[(id || 0) % colors.length]
  }

  return (
    <div className="flex flex-col h-[400px] bg-zinc-900/50 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-zinc-900/80">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-white font-medium">Чат трансляции</span>
        </div>
        <span className="text-white/40 text-sm">{messages.length} сообщений</span>
      </div>

      {/* Pinned Message */}
      {pinnedMessage && (
        <div className="px-3 py-2 bg-yellow-500/10 border-b border-yellow-500/20">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L10 6.477V16h2a1 1 0 110 2H8a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
            </svg>
            <span className="text-yellow-500 text-xs font-medium">Закреплено</span>
            <span className="text-white/60 text-xs">от {pinnedMessage.first_name || 'Гость'}</span>
          </div>
          <p className="text-white text-sm mt-1 pl-6">{pinnedMessage.message}</p>
        </div>
      )}

      {/* Messages */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-3 space-y-3"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-white/40 text-sm">
            Чат пуст. Напишите первое сообщение!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = telegramUser?.id === msg.telegram_id
            const isMsgAdmin = isMessageAdmin(msg)
            return (
              <div
                key={msg.id}
                className={`group flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className={`relative w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${isMsgAdmin ? 'bg-gradient-to-br from-yellow-500 to-orange-500' : getAvatarColor(msg.telegram_id)}`}>
                  {(msg.first_name || 'Г')[0].toUpperCase()}
                  {isMsgAdmin && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Message bubble */}
                <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`flex items-center gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <span className={`text-xs font-medium ${isMsgAdmin ? 'text-yellow-500' : 'text-white/60'}`}>
                      {getDisplayName(msg)}
                      {isMsgAdmin && ' ★'}
                    </span>
                    <span className="text-white/30 text-xs">
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                  <div className="flex items-end gap-1">
                    <div
                      className={`px-3 py-2 rounded-xl text-sm break-words ${
                        isMe
                          ? 'bg-[#FFD700] text-black rounded-tr-sm'
                          : isMsgAdmin
                            ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 text-white rounded-tl-sm'
                            : 'bg-zinc-800 text-white rounded-tl-sm'
                      }`}
                    >
                      {msg.message}
                    </div>

                    {/* Admin controls */}
                    {isAdmin && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handlePin(msg)}
                          className={`p-1 rounded ${pinnedMessage?.id === msg.id ? 'text-yellow-500' : 'text-white/40 hover:text-yellow-500'}`}
                          title={pinnedMessage?.id === msg.id ? 'Открепить' : 'Закрепить'}
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L10 6.477V16h2a1 1 0 110 2H8a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(msg.id)}
                          className="p-1 rounded text-white/40 hover:text-red-500"
                          title="Удалить"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/10 bg-zinc-900/80">
        {canWrite ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Написать сообщение..."
              className="flex-1 px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-xl text-white placeholder-white/40 text-sm focus:outline-none focus:border-yellow-500/30"
              maxLength={500}
            />
            <button
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              className="px-4 py-2.5 bg-[#FFD700] text-black font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
            >
              {sending ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              )}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-2">
            <p className="text-white/50 text-sm">Войдите чтобы писать в чат</p>
            <div ref={loginButtonRef} className="flex justify-center" />
            {/* Fallback кнопка если виджет не загрузился */}
            <a
              href="https://t.me/ARARENA_BOT?start=chat_login"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 bg-[#2AABEE] hover:bg-[#229ED9] text-white font-medium rounded-xl transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
              </svg>
              Войти через Telegram
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
