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

  // Папки и навигация
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
        const folderToSave = formData.folder || activeFolder || null
        const { error } = await supabase
          .from('utm_links')
          .insert({
            name: formData.name,
            slug: formData.slug.toLowerCase(),
            folder: folderToSave
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
    setFolders(prev => [...prev, newFolderName.trim()].sort())
    setShowFolderModal(false)
    setActiveFolder(newFolderName.trim())
    setNewFolderName('')
  }

  const handleDeleteFolder = async (folderName: string) => {
    if (!confirm(`Удалить папку "${folderName}"? Все ссылки внутри станут "без папки".`)) return

    try {
      // Убираем папку у всех ссылок в ней
      const { error } = await supabase
        .from('utm_links')
        .update({ folder: null })
        .eq('folder', folderName)

      if (error) throw error
      setActiveFolder(null)
      fetchLinks()
    } catch (err: any) {
      console.error('Error deleting folder:', err)
      alert(`Ошибка: ${err.message}`)
    }
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
      month: '2-digit'
    })
  }

  const formatRelativeTime = (date: string | null) => {
    if (!date) return '-'
    const now = new Date()
    const then = new Date(date)
    const diffMs = now.getTime() - then.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'сейчас'
    if (diffMins < 60) return `${diffMins}м`
    if (diffHours < 24) return `${diffHours}ч`
    if (diffDays < 7) return `${diffDays}д`
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

  // Ссылки без папки (для раздела "Общие")
  const linksWithoutFolder = links.filter(l => !l.folder)

  // Ссылки в текущей папке
  const linksInFolder = activeFolder ? links.filter(l => l.folder === activeFolder) : []

  // Статистика папки
  const getFolderStats = (folderName: string) => {
    const folderLinks = links.filter(l => l.folder === folderName)
    return {
      count: folderLinks.length,
      clicks: folderLinks.reduce((sum, l) => sum + l.clicks, 0),
      conversions: folderLinks.reduce((sum, l) => sum + l.conversions, 0)
    }
  }

  const loading = activeTab === 'payment' ? loadingLinks : loadingToolLinks

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white/40">Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4 pt-2">
      {/* Переключатель табов */}
      <div className="flex gap-2 p-1 bg-zinc-900/50 rounded-xl border border-white/10">
        <button
          onClick={() => { setActiveTab('payment'); setActiveFolder(null) }}
          className={`flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
            activeTab === 'payment'
              ? 'bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black'
              : 'text-white/60'
          }`}
        >
          Оплата
        </button>
        <button
          onClick={() => setActiveTab('tools')}
          className={`flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
            activeTab === 'tools'
              ? 'bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black'
              : 'text-white/60'
          }`}
        >
          Инструменты
        </button>
      </div>

      {/* === БЛОК ССЫЛОК НА ОПЛАТУ === */}
      {activeTab === 'payment' && (
        <>
          {/* РЕЖИМ: ВНУТРИ ПАПКИ */}
          {activeFolder ? (
            <div className="space-y-4">
              {/* Шапка папки */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setActiveFolder(null)}
                  className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="text-sm">Назад</span>
                </button>
                <button
                  onClick={() => handleDeleteFolder(activeFolder)}
                  className="text-red-400/60 hover:text-red-400 text-xs transition-colors"
                >
                  Удалить папку
                </button>
              </div>

              {/* Название папки и статистика */}
              <div className="bg-zinc-900/50 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#FFD700]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-white font-bold text-lg">{activeFolder}</div>
                    <div className="text-white/40 text-xs">{linksInFolder.length} ссылок</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
                    <div className="text-white/50 text-[10px] uppercase tracking-wider">Клики</div>
                    <div className="text-white font-bold">{linksInFolder.reduce((s, l) => s + l.clicks, 0)}</div>
                  </div>
                  <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
                    <div className="text-white/50 text-[10px] uppercase tracking-wider">Конверсии</div>
                    <div className="text-green-400 font-bold">{linksInFolder.reduce((s, l) => s + l.conversions, 0)}</div>
                  </div>
                  <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
                    <div className="text-white/50 text-[10px] uppercase tracking-wider">CR</div>
                    <div className="text-[#FFD700] font-bold">
                      {getConversionRate(
                        linksInFolder.reduce((s, l) => s + l.clicks, 0),
                        linksInFolder.reduce((s, l) => s + l.conversions, 0)
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Кнопка добавить */}
              <button
                onClick={() => {
                  setFormData(prev => ({ ...prev, folder: activeFolder }))
                  setShowCreateModal(true)
                }}
                className="w-full px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-colors border border-white/10 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Добавить ссылку
              </button>

              {/* Список ссылок в папке */}
              <div className="space-y-2">
                {linksInFolder.length === 0 ? (
                  <div className="bg-zinc-900/30 rounded-xl p-8 text-center border border-white/5">
                    <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </div>
                    <div className="text-white/40 text-sm">Папка пуста</div>
                  </div>
                ) : (
                  linksInFolder.map((link) => (
                    <div
                      key={link.id}
                      className="bg-zinc-900/50 backdrop-blur-md rounded-xl p-3 border border-white/10"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium text-sm truncate">{link.name}</div>
                          <div className="text-white/30 text-xs font-mono truncate">
                            premium_{link.slug}
                          </div>
                        </div>
                        <button
                          onClick={() => copyToClipboard(`https://t.me/ARARENA_BOT?start=premium_${link.slug}`, `p-${link.id}`)}
                          className={`ml-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                            copiedId === `p-${link.id}`
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-zinc-700 text-white/70'
                          }`}
                        >
                          {copiedId === `p-${link.id}` ? 'OK' : 'Copy'}
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-white/50">{link.clicks} кл.</span>
                          <span className="text-green-400/70">{link.conversions} конв.</span>
                          <span className="text-[#FFD700]/70">{getConversionRate(link.clicks, link.conversions)}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteLink(link.id, link.name, false)}
                          className="text-red-400/40 hover:text-red-400 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* РЕЖИМ: КАТАЛОГ ПАПОК */
            <div className="space-y-4">
              {/* Общая статистика */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-zinc-900/50 backdrop-blur-md rounded-xl p-3 border border-white/10 text-center">
                  <div className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Всего</div>
                  <div className="text-white font-bold text-lg">{links.length}</div>
                </div>
                <div className="bg-zinc-900/50 backdrop-blur-md rounded-xl p-3 border border-white/10 text-center">
                  <div className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Кликов</div>
                  <div className="text-[#FFD700] font-bold text-lg">{links.reduce((s, l) => s + l.clicks, 0)}</div>
                </div>
                <div className="bg-zinc-900/50 backdrop-blur-md rounded-xl p-3 border border-white/10 text-center">
                  <div className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Конверсий</div>
                  <div className="text-green-400 font-bold text-lg">{links.reduce((s, l) => s + l.conversions, 0)}</div>
                </div>
              </div>

              {/* Кнопка создать папку */}
              <button
                onClick={() => setShowFolderModal(true)}
                className="w-full px-4 py-3 bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black font-semibold rounded-xl active:scale-[0.98] transition-transform"
              >
                Создать папку
              </button>

              {/* Список папок */}
              <div className="space-y-2">
                {folders.map(folder => {
                  const stats = getFolderStats(folder)
                  return (
                    <button
                      key={folder}
                      onClick={() => setActiveFolder(folder)}
                      className="w-full bg-zinc-900/50 backdrop-blur-md rounded-xl p-4 border border-white/10 hover:border-yellow-500/30 transition-all text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center group-hover:from-yellow-500/30 group-hover:to-orange-500/30 transition-colors">
                          <svg className="w-5 h-5 text-[#FFD700]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium">{folder}</div>
                          <div className="text-white/40 text-xs">{stats.count} ссылок</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-white/60 text-sm">{stats.clicks} кл.</div>
                          <div className="text-green-400/60 text-xs">{stats.conversions} конв.</div>
                        </div>
                        <svg className="w-5 h-5 text-white/30 group-hover:text-white/50 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  )
                })}

                {/* Ссылки без папки */}
                {linksWithoutFolder.length > 0 && (
                  <div className="mt-4">
                    <div className="text-white/30 text-xs uppercase tracking-wider mb-2 px-1">Без категории</div>
                    {linksWithoutFolder.map((link) => (
                      <div
                        key={link.id}
                        className="bg-zinc-900/30 rounded-xl p-3 border border-white/5 mb-2"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-white/70 font-medium text-sm truncate">{link.name}</div>
                            <div className="text-white/20 text-xs font-mono truncate">premium_{link.slug}</div>
                          </div>
                          <button
                            onClick={() => copyToClipboard(`https://t.me/ARARENA_BOT?start=premium_${link.slug}`, `p-${link.id}`)}
                            className={`ml-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                              copiedId === `p-${link.id}`
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-zinc-800 text-white/50'
                            }`}
                          >
                            {copiedId === `p-${link.id}` ? 'OK' : 'Copy'}
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-white/40">{link.clicks} кл.</span>
                            <span className="text-green-400/50">{link.conversions} конв.</span>
                          </div>
                          <select
                            value=""
                            onChange={(e) => handleMoveToFolder(link.id, e.target.value || null)}
                            className="bg-zinc-800 text-white/50 text-xs rounded px-2 py-1 border border-white/10 focus:outline-none"
                          >
                            <option value="">Переместить...</option>
                            {folders.map(f => (
                              <option key={f} value={f}>{f}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {folders.length === 0 && linksWithoutFolder.length === 0 && (
                  <div className="bg-zinc-900/30 rounded-xl p-8 text-center border border-white/5">
                    <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-white/30" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                      </svg>
                    </div>
                    <div className="text-white/40 text-sm mb-1">Нет папок</div>
                    <div className="text-white/30 text-xs">Создайте первую папку для UTM-ссылок</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* === БЛОК ССЫЛОК НА ИНСТРУМЕНТЫ === */}
      {activeTab === 'tools' && (
        <div className="space-y-4">
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full px-4 py-3 bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black font-semibold rounded-xl active:scale-[0.98] transition-transform"
          >
            Создать ссылку
          </button>

          <div className="space-y-2">
            {toolLinks.length === 0 ? (
              <div className="bg-zinc-900/30 rounded-xl p-8 text-center border border-white/5">
                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <div className="text-white/40 text-sm">Нет ссылок</div>
              </div>
            ) : (
              toolLinks.map((link) => (
                <div
                  key={link.id}
                  className="bg-zinc-900/50 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium truncate">{link.name}</div>
                        <div className="text-white/30 text-xs font-mono truncate">
                          utm_source={link.slug}
                        </div>
                      </div>
                      <div className="text-white/30 text-xs shrink-0 ml-2">
                        {formatDate(link.created_at)}
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 mb-3">
                      <div className="text-center">
                        <div className="text-[#FFD700] font-bold">{link.clicks}</div>
                        <div className="text-white/30 text-[10px]">клики</div>
                      </div>
                      <div className="text-center">
                        <div className="text-green-400 font-bold">{link.conversions}</div>
                        <div className="text-white/30 text-[10px]">конв.</div>
                      </div>
                      <div className="text-center">
                        <div className="text-white font-bold">{getConversionRate(link.clicks, link.conversions)}</div>
                        <div className="text-white/30 text-[10px]">CR</div>
                      </div>
                      <div className="text-center">
                        <div className="text-white/60 font-medium text-sm">{formatRelativeTime(link.last_click_at)}</div>
                        <div className="text-white/30 text-[10px]">визит</div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => copyToClipboard(getToolUrl(link), `t-${link.id}`)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                          copiedId === `t-${link.id}`
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-zinc-700 text-white'
                        }`}
                      >
                        {copiedId === `t-${link.id}` ? 'Скопировано' : 'Копировать'}
                      </button>
                      <button
                        onClick={() => handleDeleteLink(link.id, link.name, true)}
                        className="px-4 py-2 text-red-400/60 hover:text-red-400 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Модалка создания ссылки */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-zinc-900 rounded-2xl p-6 w-full max-w-md border border-white/10">
            <h3 className="text-white text-lg font-bold mb-4">
              {activeTab === 'payment' ? 'Новая UTM-ссылка' : 'Ссылка на инструмент'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-white/60 text-sm mb-2 block">Название</label>
                <input
                  type="text"
                  placeholder="Instagram Reels"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-yellow-500/30"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-white/60 text-sm mb-2 block">Slug</label>
                <input
                  type="text"
                  placeholder="instagram_reels"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.replace(/\s/g, '_').toLowerCase() })}
                  className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-yellow-500/30 font-mono"
                />
                <div className="text-white/30 text-xs mt-2 font-mono">
                  {activeTab === 'payment'
                    ? `t.me/ARARENA_BOT?start=premium_${formData.slug || 'slug'}`
                    : `ararena.pro/stream?utm_source=${formData.slug || 'slug'}`
                  }
                </div>
              </div>

              {activeTab === 'payment' && !activeFolder && folders.length > 0 && (
                <div>
                  <label className="text-white/60 text-sm mb-2 block">Папка</label>
                  <select
                    value={formData.folder}
                    onChange={(e) => setFormData({ ...formData, folder: e.target.value })}
                    className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-yellow-500/30"
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
                className="flex-1 px-4 py-3 bg-zinc-800 text-white rounded-xl"
              >
                Отмена
              </button>
              <button
                onClick={handleCreateLink}
                disabled={creating || !formData.name || !formData.slug}
                className="flex-1 px-4 py-3 bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black font-semibold rounded-xl disabled:opacity-50"
              >
                {creating ? '...' : 'Создать'}
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
              className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-yellow-500/30"
              autoFocus
            />

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowFolderModal(false)
                  setNewFolderName('')
                }}
                className="flex-1 px-4 py-3 bg-zinc-800 text-white rounded-xl"
              >
                Отмена
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="flex-1 px-4 py-3 bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black font-semibold rounded-xl disabled:opacity-50"
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
