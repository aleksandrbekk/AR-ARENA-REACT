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
}

export function StreamChat() {
  const { telegramUser } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

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
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return

    setSending(true)
    const messageText = newMessage.trim()
    setNewMessage('')

    const { error } = await supabase
      .from('stream_messages')
      .insert({
        telegram_id: telegramUser?.id || null,
        username: telegramUser?.username || null,
        first_name: telegramUser?.first_name || 'Гость',
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
            return (
              <div
                key={msg.id}
                className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${getAvatarColor(msg.telegram_id)}`}>
                  {(msg.first_name || 'Г')[0].toUpperCase()}
                </div>

                {/* Message bubble */}
                <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`flex items-center gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <span className="text-white/60 text-xs font-medium">
                      {getDisplayName(msg)}
                    </span>
                    <span className="text-white/30 text-xs">
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                  <div
                    className={`px-3 py-2 rounded-xl text-sm break-words ${
                      isMe
                        ? 'bg-[#FFD700] text-black rounded-tr-sm'
                        : 'bg-zinc-800 text-white rounded-tl-sm'
                    }`}
                  >
                    {msg.message}
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
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={telegramUser ? 'Написать сообщение...' : 'Войдите через Telegram...'}
            disabled={!telegramUser}
            className="flex-1 px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-xl text-white placeholder-white/40 text-sm focus:outline-none focus:border-yellow-500/30 disabled:opacity-50"
            maxLength={500}
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending || !telegramUser}
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
        {!telegramUser && (
          <p className="text-white/40 text-xs mt-2 text-center">
            Откройте через Telegram чтобы писать в чат
          </p>
        )}
      </div>
    </div>
  )
}
