/**
 * BroadcastTab - Вкладка "Рассылка" в CRM
 *
 * Функционал:
 * - Отправка сообщений/картинок пользователям
 * - Выбор аудитории (по фильтрам или поиск)
 * - История рассылок
 */

import { useState } from 'react'
import type { BotUser, User, PremiumClient, BroadcastRecord } from '../../types/crm'

interface BroadcastTabProps {
  botUsers: BotUser[]
  users: User[]
  premiumClients: PremiumClient[]
  broadcastHistory: BroadcastRecord[]
  getAuthHeaders: () => Record<string, string>
  showToast: (opts: { variant: 'success' | 'error'; title: string }) => void
  telegramUserId?: number
  onBroadcastComplete: () => void
}

export function BroadcastTab({
  botUsers,
  users,
  premiumClients,
  broadcastHistory,
  getAuthHeaders,
  showToast,
  telegramUserId,
  onBroadcastComplete
}: BroadcastTabProps) {
  // State
  const [broadcastTab, setBroadcastTab] = useState<'new' | 'history'>('new')
  const [broadcastSearch, setBroadcastSearch] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<number[]>([])
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [broadcastImage, setBroadcastImage] = useState<File | null>(null)
  const [broadcastImagePreview, setBroadcastImagePreview] = useState<string | null>(null)
  const [sendingBroadcast, setSendingBroadcast] = useState(false)
  const [broadcastProgress, setBroadcastProgress] = useState({ sent: 0, total: 0 })

  // Функции работы с изображением
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setBroadcastImage(file)
      setBroadcastImagePreview(URL.createObjectURL(file))
    }
  }

  const clearBroadcastImage = () => {
    setBroadcastImage(null)
    setBroadcastImagePreview(null)
  }

  // API функции
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

  const sendPhoto = async (telegramId: number, photo: File, caption: string): Promise<boolean> => {
    try {
      const reader = new FileReader()
      const photoDataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(photo)
      })

      const res = await fetch('/api/admin-send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          chatId: telegramId,
          photoUrl: photoDataUrl,
          caption: caption
        })
      })

      const result = await res.json()
      if (!result.success) throw new Error(result.error || 'Failed to send photo')
      return true
    } catch { return false }
  }

  // Отправка рассылки
  const handleBroadcast = async () => {
    if (!broadcastMessage.trim() && !broadcastImage) {
      return showToast({ variant: 'error', title: 'Введите сообщение или добавьте картинку' })
    }
    if (selectedUsers.length === 0) {
      return showToast({ variant: 'error', title: 'Выберите получателей' })
    }

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
      await new Promise(r => setTimeout(r, 50))
    }

    setSendingBroadcast(false)
    setBroadcastMessage('')
    clearBroadcastImage()
    setSelectedUsers([])
    showToast({ variant: 'success', title: `Отправлено: ${sent}/${selectedUsers.length}` })

    // Сохранить в историю через API
    try {
      const { supabase } = await import('../../lib/supabase')
      await supabase.from('crm_broadcasts').insert({
        message: broadcastMessage || (broadcastImage ? 'Картинка' : 'Без текста'),
        recipients_count: sent,
        filter_type: selectedUsers.length === 1 ? 'single' : 'mass',
        status: 'completed',
        sent_by: telegramUserId?.toString() || 'admin'
      })
      onBroadcastComplete()
    } catch (e) {
      console.error('Failed to save broadcast history', e)
    }
  }

  return (
    <div className="space-y-3">
      {/* Переключатель вкладок */}
      <div className="flex p-1 bg-zinc-900 rounded-xl mb-4">
        <button
          onClick={() => setBroadcastTab('new')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
            broadcastTab === 'new' ? 'bg-zinc-800 text-white' : 'text-white/40 hover:text-white'
          }`}
        >
          Новая рассылка
        </button>
        <button
          onClick={() => setBroadcastTab('history')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
            broadcastTab === 'history' ? 'bg-zinc-800 text-white' : 'text-white/40 hover:text-white'
          }`}
        >
          История
        </button>
      </div>

      {broadcastTab === 'history' ? (
        /* История рассылок */
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
                  <div className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 capitalize">
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
        /* Форма новой рассылки */
        <>
          {/* Поиск пользователя */}
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
                      className={`w-full flex items-center gap-3 p-2 rounded-xl transition-colors ${
                        selectedUsers.includes(user.telegram_id) ? 'bg-white/10' : 'hover:bg-zinc-800'
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

            {/* Выбранный пользователь */}
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

          {/* Выбор аудитории */}
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

          {/* Контент сообщения */}
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

          {/* Прогресс отправки */}
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

          {/* Кнопка отправки */}
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
  )
}
