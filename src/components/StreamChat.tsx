import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { STORAGE_KEYS, getStorageItem, setStorageItem } from '../hooks/useLocalStorage'

interface Message {
  id: number
  telegram_id: number | null
  username: string | null
  first_name: string | null
  message: string
  created_at: string
  is_pinned?: boolean
}

interface StreamChatProps {
  forceAdmin?: boolean
}

export function StreamChat({ forceAdmin = false }: StreamChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [pinnedMessage, setPinnedMessage] = useState<Message | null>(null)
  const [guestName, setGuestName] = useState('')
  const [isNameSet, setIsNameSet] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Загрузка имени гостя из localStorage
  useEffect(() => {
    const saved = getStorageItem<string>(STORAGE_KEYS.STREAM_GUEST_NAME)
    if (saved) {
      setGuestName(saved)
      setIsNameSet(true)
    }
  }, [])

  // Текущий пользователь - только гость с введённым именем
  const currentUser = isNameSet ? { id: null, first_name: guestName, username: null } : null
  const canWrite = isNameSet

  // Проверка админа - только через forceAdmin (для /stream-admin)
  const isAdmin = forceAdmin

  // Загрузка сообщений
  useEffect(() => {
    loadMessages()

    // Подписка на изменения (realtime)
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
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'stream_messages'
        },
        (payload) => {
          const deletedId = payload.old.id as number
          setMessages(prev => prev.filter(m => m.id !== deletedId))
          setPinnedMessage(prev => prev?.id === deletedId ? null : prev)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'stream_messages'
        },
        (payload) => {
          const updatedMsg = payload.new as Message
          setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m))
          if (updatedMsg.is_pinned) {
            setPinnedMessage(updatedMsg)
          } else {
            setPinnedMessage(prev => prev?.id === updatedMsg.id ? null : prev)
          }
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
    <div className="flex flex-col h-[450px] w-full max-w-full bg-zinc-900/50 backdrop-blur-sm md:rounded-xl border-y md:border border-white/10 overflow-hidden touch-manipulation">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-zinc-900/80">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-white font-medium">Чат трансляции</span>
          {isAdmin && <span className="text-xs text-yellow-500 ml-2">★ ADMIN</span>}
        </div>
        <span className="text-white/40 text-sm">
          {isNameSet ? guestName : 'Гость'} • {messages.length}
        </span>
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
            const isMe = isNameSet && msg.first_name === guestName && !msg.telegram_id
            return (
              <div
                key={msg.id}
                className={`group flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${getAvatarColor(msg.telegram_id)}`}>
                  {(msg.first_name || 'Г')[0].toUpperCase()}
                </div>

                {/* Message bubble */}
                <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`flex items-center gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <span className="text-xs font-medium text-white/60">
                      {getDisplayName(msg)}
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
                          : 'bg-zinc-800 text-white rounded-tl-sm'
                      }`}
                    >
                      {msg.message}
                    </div>

                    {/* Admin controls */}
                    {isAdmin && (
                      <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
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
          <div className="flex flex-col gap-3 py-1">
            <p className="text-white/50 text-sm text-center">Введите имя чтобы писать в чат</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && guestName.trim()) {
                    setStorageItem(STORAGE_KEYS.STREAM_GUEST_NAME, guestName.trim())
                    setIsNameSet(true)
                  }
                }}
                placeholder="Ваше имя..."
                className="flex-1 px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-xl text-white placeholder-white/40 text-sm focus:outline-none focus:border-yellow-500/30"
                maxLength={30}
              />
              <button
                onClick={() => {
                  if (guestName.trim()) {
                    setStorageItem(STORAGE_KEYS.STREAM_GUEST_NAME, guestName.trim())
                    setIsNameSet(true)
                  }
                }}
                disabled={!guestName.trim()}
                className="px-4 py-2.5 bg-[#FFD700] text-black font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
              >
                Войти
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
