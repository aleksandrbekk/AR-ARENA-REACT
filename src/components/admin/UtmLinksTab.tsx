import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

interface UtmLink {
  id: number
  name: string
  slug: string
  folder: string | null
  clicks: number
  conversions: number
  created_at: string
}

interface UtmToolLink {
  id: number
  name: string
  slug: string
  tool_type: string
  clicks: number
  conversions: number
  created_at: string
  last_click_at: string | null
}

type TabType = 'payment' | 'tools'

export function UtmLinksTab() {
  const [activeTab, setActiveTab] = useState<TabType>('payment')

  // Ссылки на оплату
  const [links, setLinks] = useState<UtmLink[]>([])
  const [loadingLinks, setLoadingLinks] = useState(true)

  // Ссылки на инструменты
  const [toolLinks, setToolLinks] = useState<UtmToolLink[]>([])
  const [loadingToolLinks, setLoadingToolLinks] = useState(true)

  // Папки
  const [folders, setFolders] = useState<string[]>([])
  const [activeFolder, setActiveFolder] = useState<string | null>(null)
  const [showFolderModal, setShowFolderModal] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Форма создания ссылки
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    folder: '',
    tool_type: 'stream'
  })

  useEffect(() => {
    fetchLinks()
    fetchToolLinks()
  }, [])

  // Извлекаем уникальные папки из ссылок
  useEffect(() => {
    const uniqueFolders = [...new Set(links.map(l => l.folder).filter(Boolean))] as string[]
    setFolders(uniqueFolders.sort())
  }, [links])

  const fetchLinks = async () => {
    try {
      setLoadingLinks(true)
      const { data, error } = await supabase
        .from('utm_links')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setLinks(data || [])
    } catch (err) {
      console.error('Error fetching utm links:', err)
    } finally {
      setLoadingLinks(false)
    }
  }

  const fetchToolLinks = async () => {
    try {
      setLoadingToolLinks(true)
      const { data, error } = await supabase
        .from('utm_tool_links')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setToolLinks(data || [])
    } catch (err) {
      console.error('Error fetching utm tool links:', err)
    } finally {
      setLoadingToolLinks(false)
    }
  }

  const handleCreateLink = async () => {
    if (!formData.name || !formData.slug) {
      alert('Заполните все поля')
      return
    }

    const slugRegex = /^[a-z0-9_-]+$/i
    if (!slugRegex.test(formData.slug)) {
      alert('Slug может содержать только латиницу, цифры, дефис и нижнее подчеркивание')
      return
    }

    try {
      setCreating(true)

      if (activeTab === 'payment') {
        const { error } = await supabase
          .from('utm_links')
          .insert({
            name: formData.name,
            slug: formData.slug.toLowerCase(),
            folder: formData.folder || null
          })

        if (error) {
          if (error.code === '23505') {
            alert('Ссылка с таким slug уже существует')
          } else {
            throw error
          }
          return
        }
        fetchLinks()
      } else {
        const { error } = await supabase
          .from('utm_tool_links')
          .insert({
            name: formData.name,
            slug: formData.slug.toLowerCase(),
            tool_type: formData.tool_type
          })

        if (error) {
          if (error.code === '23505') {
            alert('Ссылка с таким slug уже существует')
          } else {
            throw error
          }
          return
        }
        fetchToolLinks()
      }

      setShowCreateModal(false)
      setFormData({ name: '', slug: '', folder: '', tool_type: 'stream' })
    } catch (err: any) {
      console.error('Error creating link:', err)
      alert(`Ошибка: ${err.message}`)
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteLink = async (id: number, name: string, isToolLink: boolean) => {
    if (!confirm(`Удалить ссылку "${name}"?`)) return

    try {
      const table = isToolLink ? 'utm_tool_links' : 'utm_links'
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id)

      if (error) throw error

      if (isToolLink) {
        fetchToolLinks()
      } else {
        fetchLinks()
      }
    } catch (err: any) {
      console.error('Error deleting link:', err)
      alert(`Ошибка: ${err.message}`)
    }
  }

  const handleMoveToFolder = async (linkId: number, folder: string | null) => {
    try {
      const { error } = await supabase
        .from('utm_links')
        .update({ folder })
        .eq('id', linkId)

      if (error) throw error
      fetchLinks()
    } catch (err: any) {
      console.error('Error moving link:', err)
      alert(`Ошибка: ${err.message}`)
    }
  }

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return

    // Папка создастся автоматически при добавлении первой ссылки в неё
    setFolders(prev => [...prev, newFolderName.trim()].sort())
    setShowFolderModal(false)
    setNewFolderName('')
    setActiveFolder(newFolderName.trim())
  }

  const copyToClipboard = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      const textArea = document.createElement('textarea')
      textArea.value = url
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatRelativeTime = (date: string | null) => {
    if (!date) return 'никогда'
    const now = new Date()
    const then = new Date(date)
    const diffMs = now.getTime() - then.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'только что'
    if (diffMins < 60) return `${diffMins} мин назад`
    if (diffHours < 24) return `${diffHours} ч назад`
    if (diffDays < 7) return `${diffDays} дн назад`
    return formatDate(date)
  }

  const getConversionRate = (clicks: number, conversions: number) => {
    if (clicks === 0) return '0%'
    return `${((conversions / clicks) * 100).toFixed(1)}%`
  }

  const getToolUrl = (link: UtmToolLink) => {
    if (link.tool_type === 'stream') {
      return `https://ararena.pro/stream?utm_source=${link.slug}`
    }
    return `https://ararena.pro/?utm_source=${link.slug}`
  }

  // Фильтрация ссылок по активной папке
  const filteredLinks = activeFolder === null
    ? links
    : activeFolder === '__no_folder__'
      ? links.filter(l => !l.folder)
      : links.filter(l => l.folder === activeFolder)

  // Подсчёт ссылок без папки
  const linksWithoutFolder = links.filter(l => !l.folder).length

  const loading = activeTab === 'payment' ? loadingLinks : loadingToolLinks

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white/40">Загрузка ссылок...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Переключатель табов */}
      <div className="flex gap-2 p-1 bg-zinc-900/50 rounded-xl border border-white/10">
        <button
          onClick={() => setActiveTab('payment')}
          className={`flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
            activeTab === 'payment'
              ? 'bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black'
              : 'text-white/60 hover:text-white'
          }`}
        >
          💳 Оплата
        </button>
        <button
          onClick={() => setActiveTab('tools')}
          className={`flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
            activeTab === 'tools'
              ? 'bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black'
              : 'text-white/60 hover:text-white'
          }`}
        >
          🛠 Инструменты
        </button>
      </div>

      {/* === БЛОК ССЫЛОК НА ОПЛАТУ === */}
      {activeTab === 'payment' && (
        <>
          {/* Папки */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-white/50 text-xs font-medium uppercase tracking-wider">Папки</div>
              <button
                onClick={() => setShowFolderModal(true)}
                className="text-[#FFD700] text-xs font-medium"
              >
                + Создать папку
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {/* Все ссылки */}
              <button
                onClick={() => setActiveFolder(null)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeFolder === null
                    ? 'bg-[#FFD700] text-black'
                    : 'bg-zinc-800 text-white/60 hover:text-white'
                }`}
              >
                Все ({links.length})
              </button>

              {/* Без папки */}
              {linksWithoutFolder > 0 && (
                <button
                  onClick={() => setActiveFolder('__no_folder__')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activeFolder === '__no_folder__'
                      ? 'bg-[#FFD700] text-black'
                      : 'bg-zinc-800 text-white/60 hover:text-white'
                  }`}
                >
                  Без папки ({linksWithoutFolder})
                </button>
              )}

              {/* Папки */}
              {folders.map(folder => {
                const count = links.filter(l => l.folder === folder).length
                return (
                  <button
                    key={folder}
                    onClick={() => setActiveFolder(folder)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      activeFolder === folder
                        ? 'bg-[#FFD700] text-black'
                        : 'bg-zinc-800 text-white/60 hover:text-white'
                    }`}
                  >
                    📁 {folder} ({count})
                  </button>
                )
              })}
            </div>
          </div>

          {/* Статистика для выбранной папки */}
          {filteredLinks.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-zinc-900/50 backdrop-blur-md rounded-xl p-3 border border-white/10 text-center">
                <div className="text-white/50 text-xs mb-1">Ссылок</div>
                <div className="text-white font-bold text-lg">{filteredLinks.length}</div>
              </div>
              <div className="bg-zinc-900/50 backdrop-blur-md rounded-xl p-3 border border-white/10 text-center">
                <div className="text-white/50 text-xs mb-1">Кликов</div>
                <div className="text-[#FFD700] font-bold text-lg">
                  {filteredLinks.reduce((sum, l) => sum + l.clicks, 0)}
                </div>
              </div>
              <div className="bg-zinc-900/50 backdrop-blur-md rounded-xl p-3 border border-white/10 text-center">
                <div className="text-white/50 text-xs mb-1">Конверсий</div>
                <div className="text-green-500 font-bold text-lg">
                  {filteredLinks.reduce((sum, l) => sum + l.conversions, 0)}
                </div>
              </div>
            </div>
          )}

          {/* Кнопка создать */}
          <button
            onClick={() => {
              setFormData(prev => ({ ...prev, folder: activeFolder === '__no_folder__' ? '' : (activeFolder || '') }))
              setShowCreateModal(true)
            }}
            className="w-full px-4 py-3 bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black font-semibold rounded-xl active:scale-95 transition-transform"
          >
            + Создать ссылку
          </button>

          {/* Список ссылок */}
          <div className="space-y-3">
            {filteredLinks.length === 0 ? (
              <div className="bg-zinc-900/30 backdrop-blur-sm rounded-xl p-8 border border-white/5 text-center">
                <div className="text-4xl mb-3">🔗</div>
                <div className="text-white/40">
                  {activeFolder ? 'Нет ссылок в этой папке' : 'Нет созданных ссылок'}
                </div>
              </div>
            ) : (
              filteredLinks.map((link) => (
                <div
                  key={link.id}
                  className="bg-zinc-900/50 backdrop-blur-md rounded-xl p-4 border border-white/10"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-white font-bold">{link.name}</div>
                        {link.folder && (
                          <span className="px-2 py-0.5 bg-zinc-700 rounded text-[10px] text-white/50">
                            {link.folder}
                          </span>
                        )}
                      </div>
                      <div className="text-white/40 text-xs font-mono">
                        t.me/ARARENA_BOT?start=premium_{link.slug}
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(`https://t.me/ARARENA_BOT?start=premium_${link.slug}`, `payment-${link.id}`)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        copiedId === `payment-${link.id}`
                          ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                          : 'bg-zinc-700 text-white/80 active:scale-95'
                      }`}
                    >
                      {copiedId === `payment-${link.id}` ? '✓' : 'Копировать'}
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
                      <div className="text-white/50 text-xs">Клики</div>
                      <div className="text-white font-semibold">{link.clicks}</div>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
                      <div className="text-white/50 text-xs">Конверсии</div>
                      <div className="text-green-500 font-semibold">{link.conversions}</div>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
                      <div className="text-white/50 text-xs">CR</div>
                      <div className="text-[#FFD700] font-semibold">
                        {getConversionRate(link.clicks, link.conversions)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="text-white/40 text-xs">
                        {formatDate(link.created_at)}
                      </div>
                      {/* Выбор папки */}
                      <select
                        value={link.folder || ''}
                        onChange={(e) => handleMoveToFolder(link.id, e.target.value || null)}
                        className="bg-zinc-800 text-white/60 text-xs rounded px-2 py-1 border border-white/10 focus:outline-none"
                      >
                        <option value="">Без папки</option>
                        {folders.map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() => handleDeleteLink(link.id, link.name, false)}
                      className="px-3 py-1.5 bg-red-500/10 text-red-500 text-xs font-semibold rounded-lg border border-red-500/20 active:scale-95 transition-transform"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* === БЛОК ССЫЛОК НА ИНСТРУМЕНТЫ === */}
      {activeTab === 'tools' && (
        <>
          {/* Кнопка создать */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full px-4 py-3 bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black font-semibold rounded-xl active:scale-95 transition-transform"
          >
            + Создать ссылку
          </button>

          <div className="space-y-3">
            {toolLinks.length === 0 ? (
              <div className="bg-zinc-900/30 backdrop-blur-sm rounded-xl p-8 border border-white/5 text-center">
                <div className="text-4xl mb-3">🔗</div>
                <div className="text-white/40">Нет ссылок</div>
              </div>
            ) : (
              toolLinks.map((link) => (
                <div
                  key={link.id}
                  className="bg-zinc-900/50 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden"
                >
                  <div className="px-4 pt-4 pb-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="text-white font-semibold">{link.name}</div>
                      <div className="text-white/30 text-xs">
                        {formatDate(link.created_at)}
                      </div>
                    </div>
                    <div className="text-white/40 text-xs font-mono truncate">
                      ararena.pro/stream?utm_source=<span className="text-white/60">{link.slug}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 px-4 py-3 bg-zinc-800/30">
                    <div className="text-center">
                      <div className="text-[#FFD700] font-bold text-lg">{link.clicks}</div>
                      <div className="text-white/40 text-[10px]">переходов</div>
                    </div>
                    <div className="text-center">
                      <div className="text-green-400 font-bold text-lg">{link.conversions}</div>
                      <div className="text-white/40 text-[10px]">конверсий</div>
                    </div>
                    <div className="text-center">
                      <div className="text-white font-bold text-lg">{getConversionRate(link.clicks, link.conversions)}</div>
                      <div className="text-white/40 text-[10px]">CR</div>
                    </div>
                    <div className="text-center">
                      <div className="text-white/70 font-medium text-xs leading-tight">{formatRelativeTime(link.last_click_at)}</div>
                      <div className="text-white/40 text-[10px]">посл. визит</div>
                    </div>
                  </div>

                  <div className="flex gap-2 px-4 py-3 border-t border-white/5">
                    <button
                      onClick={() => copyToClipboard(getToolUrl(link), `tool-${link.id}`)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                        copiedId === `tool-${link.id}`
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-zinc-700 text-white active:scale-95'
                      }`}
                    >
                      {copiedId === `tool-${link.id}` ? '✓ Скопировано' : 'Копировать'}
                    </button>
                    <button
                      onClick={() => handleDeleteLink(link.id, link.name, true)}
                      className="px-4 py-2 text-red-400/70 text-sm rounded-lg hover:text-red-400 active:scale-95 transition-all"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Модалка создания ссылки */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-zinc-900 rounded-2xl p-6 w-full max-w-md border border-white/10">
            <h3 className="text-white text-lg font-bold mb-4">
              {activeTab === 'payment' ? 'Создать UTM-ссылку' : 'Создать ссылку на инструмент'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-white/60 text-sm mb-2 block">Название:</label>
                <input
                  type="text"
                  placeholder="Например: Instagram Reels"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-yellow-500/30"
                />
              </div>

              <div>
                <label className="text-white/60 text-sm mb-2 block">Slug:</label>
                <input
                  type="text"
                  placeholder="instagram_reels"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.replace(/\s/g, '_') })}
                  className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-yellow-500/30 font-mono"
                />
                <div className="text-white/40 text-xs mt-2 font-mono break-all">
                  {activeTab === 'payment'
                    ? `t.me/ARARENA_BOT?start=premium_${formData.slug || 'slug'}`
                    : `ararena.pro/stream?utm_source=${formData.slug || 'slug'}`
                  }
                </div>
              </div>

              {activeTab === 'payment' && (
                <div>
                  <label className="text-white/60 text-sm mb-2 block">Папка:</label>
                  <select
                    value={formData.folder}
                    onChange={(e) => setFormData({ ...formData, folder: e.target.value })}
                    className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-yellow-500/30"
                  >
                    <option value="">Без папки</option>
                    {folders.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setFormData({ name: '', slug: '', folder: '', tool_type: 'stream' })
                }}
                className="flex-1 px-4 py-3 bg-zinc-800 text-white rounded-xl active:scale-95 transition-transform"
              >
                Отмена
              </button>
              <button
                onClick={handleCreateLink}
                disabled={creating || !formData.name || !formData.slug}
                className="flex-1 px-4 py-3 bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black font-semibold rounded-xl active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Создание...' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка создания папки */}
      {showFolderModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-zinc-900 rounded-2xl p-6 w-full max-w-sm border border-white/10">
            <h3 className="text-white text-lg font-bold mb-4">Новая папка</h3>

            <input
              type="text"
              placeholder="Название папки"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-yellow-500/30"
              autoFocus
            />

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowFolderModal(false)
                  setNewFolderName('')
                }}
                className="flex-1 px-4 py-3 bg-zinc-800 text-white rounded-xl active:scale-95 transition-transform"
              >
                Отмена
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="flex-1 px-4 py-3 bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black font-semibold rounded-xl active:scale-95 transition-transform disabled:opacity-50"
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
