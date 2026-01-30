import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { PaymentLinks } from './PaymentLinks'
import { ToolLinks } from './ToolLinks'
import type { UtmLink, UtmToolLink, TabType, FormData, PromoStats } from './types'

// ============ ГЛАВНЫЙ КОМПОНЕНТ ============
export function UtmLinksTab() {
  const [activeTab, setActiveTab] = useState<TabType>('payment')

  // Ссылки на оплату
  const [links, setLinks] = useState<UtmLink[]>([])
  const [loadingLinks, setLoadingLinks] = useState(true)

  // Ссылки на инструменты
  const [toolLinks, setToolLinks] = useState<UtmToolLink[]>([])
  const [loadingToolLinks, setLoadingToolLinks] = useState(true)

  // Детальная статистика для промо-страницы
  const [showStatsModal, setShowStatsModal] = useState(false)
  const [promoStats, setPromoStats] = useState<PromoStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)

  // Папки и навигация
  const [folders, setFolders] = useState<string[]>([])
  const [activeFolder, setActiveFolder] = useState<string | null>(null)
  const [showFolderModal, setShowFolderModal] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [editingFolder, setEditingFolder] = useState<string | null>(null)
  const [editFolderName, setEditFolderName] = useState('')

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Форма создания ссылки
  const [formData, setFormData] = useState<FormData>({
    name: '',
    slug: '',
    folder: '',
    tool_type: 'stream'
  })

  // ============ ЗАГРУЗКА ДАННЫХ ============
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

  // ============ ОПЕРАЦИИ СО ССЫЛКАМИ ============
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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error creating link:', err)
      alert(`Ошибка: ${errorMessage}`)
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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error deleting link:', err)
      alert(`Ошибка: ${errorMessage}`)
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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error moving link:', err)
      alert(`Ошибка: ${errorMessage}`)
    }
  }

  // ============ ОПЕРАЦИИ С ПАПКАМИ ============
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
      const { error } = await supabase
        .from('utm_links')
        .update({ folder: null })
        .eq('folder', folderName)

      if (error) throw error
      setActiveFolder(null)
      fetchLinks()
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error deleting folder:', err)
      alert(`Ошибка: ${errorMessage}`)
    }
  }

  const handleRenameFolder = async () => {
    if (!editingFolder || !editFolderName.trim()) return
    if (editFolderName.trim() === editingFolder) {
      setEditingFolder(null)
      setEditFolderName('')
      return
    }

    try {
      const { error } = await supabase
        .from('utm_links')
        .update({ folder: editFolderName.trim() })
        .eq('folder', editingFolder)

      if (error) throw error

      if (activeFolder === editingFolder) {
        setActiveFolder(editFolderName.trim())
      }

      setEditingFolder(null)
      setEditFolderName('')
      fetchLinks()
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error renaming folder:', err)
      alert(`Ошибка: ${errorMessage}`)
    }
  }

  // ============ ВСПОМОГАТЕЛЬНЫЕ ============
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

  const loadPromoStats = async (slug: string) => {
    try {
      setLoadingStats(true)

      // Загружаем события промо-страницы
      const { data: events, error } = await supabase
        .from('promo_events')
        .select('*')
        .eq('utm_slug', slug)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Загружаем количество оплат из utm_tool_links
      const { data: toolLink } = await supabase
        .from('utm_tool_links')
        .select('conversions')
        .eq('slug', slug)
        .single()

      const stats: PromoStats = {
        totalViews: events?.filter(e => e.event_type === 'view_start').length || 0,
        progress25: events?.filter(e => e.event_type === 'progress_25').length || 0,
        progress50: events?.filter(e => e.event_type === 'progress_50').length || 0,
        progress75: events?.filter(e => e.event_type === 'progress_75').length || 0,
        progress100: events?.filter(e => e.event_type === 'progress_100').length || 0,
        codeCorrect: events?.filter(e => e.event_type === 'code_correct').length || 0,
        codeIncorrect: events?.filter(e => e.event_type === 'code_incorrect').length || 0,
        payments: toolLink?.conversions || 0,
        events: events || []
      }

      setPromoStats(stats)
      setShowStatsModal(true)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error loading promo stats:', err)
      alert(`Ошибка загрузки статистики: ${errorMessage}`)
    } finally {
      setLoadingStats(false)
    }
  }

  // ============ LOADING ============
  const loading = activeTab === 'payment' ? loadingLinks : loadingToolLinks

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white/40">Загрузка...</div>
      </div>
    )
  }

  // ============ RENDER ============
  return (
    <div className="space-y-4 pt-2 overflow-x-hidden">
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

      {/* Контент табов */}
      {activeTab === 'payment' ? (
        <PaymentLinks
          links={links}
          folders={folders}
          activeFolder={activeFolder}
          copiedId={copiedId}
          onSetActiveFolder={setActiveFolder}
          onCopyLink={copyToClipboard}
          onDeleteLink={(id, name) => handleDeleteLink(id, name, false)}
          onMoveToFolder={handleMoveToFolder}
          onEditFolder={(folder) => {
            setEditingFolder(folder)
            setEditFolderName(folder)
          }}
          onDeleteFolder={handleDeleteFolder}
          onCreateLink={() => {
            setFormData(prev => ({ ...prev, folder: activeFolder || '' }))
            setShowCreateModal(true)
          }}
          onCreateFolder={() => setShowFolderModal(true)}
        />
      ) : (
        <ToolLinks
          links={toolLinks}
          copiedId={copiedId}
          loadingStats={loadingStats}
          onCopyLink={copyToClipboard}
          onDeleteLink={(id, name) => handleDeleteLink(id, name, true)}
          onShowStats={loadPromoStats}
          onCreateLink={() => setShowCreateModal(true)}
        />
      )}

      {/* ============ МОДАЛКИ ============ */}

      {/* Модалка создания ссылки */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-zinc-900 rounded-2xl p-4 sm:p-5 w-full max-w-md border border-white/10 my-auto">
            <h3 className="text-white text-base sm:text-lg font-bold mb-4">
              {activeTab === 'payment' ? 'Новая UTM-ссылка' : 'Ссылка на инструмент'}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-white/60 text-xs mb-1.5 block">Название</label>
                <input
                  type="text"
                  placeholder="Instagram Reels"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-zinc-800 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 focus:outline-none focus:border-yellow-500/30"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-white/60 text-xs mb-1.5 block">Slug</label>
                <input
                  type="text"
                  placeholder="instagram_reels"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.replace(/\s/g, '_').toLowerCase() })}
                  className="w-full px-3 py-2.5 bg-zinc-800 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 focus:outline-none focus:border-yellow-500/30 font-mono"
                />
                <div className="text-white/30 text-[10px] mt-1.5 font-mono break-all px-1">
                  {activeTab === 'payment'
                    ? `t.me/ARARENA_BOT?start=premium_${formData.slug || 'slug'}`
                    : formData.tool_type === 'promo'
                      ? `ararena.pro/promo?utm_source=${formData.slug || 'slug'}`
                      : formData.tool_type === 'promo-tg'
                        ? `ararena.pro/promo-tg?utm_source=${formData.slug || 'slug'}`
                        : `ararena.pro/stream?utm_source=${formData.slug || 'slug'}`
                  }
                </div>
              </div>

              {activeTab === 'tools' && (
                <div>
                  <label className="text-white/60 text-xs mb-1.5 block">Тип инструмента</label>
                  <select
                    value={formData.tool_type}
                    onChange={(e) => setFormData({ ...formData, tool_type: e.target.value })}
                    className="w-full px-3 py-2.5 bg-zinc-800 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-yellow-500/30"
                  >
                    <option value="stream">Stream (Трансляция)</option>
                    <option value="promo">Promo (Промо-страница)</option>
                    <option value="promo-tg">Promo TG (Для Telegram постов)</option>
                  </select>
                </div>
              )}

              {activeTab === 'payment' && !activeFolder && folders.length > 0 && (
                <div>
                  <label className="text-white/60 text-xs mb-1.5 block">Папка</label>
                  <select
                    value={formData.folder}
                    onChange={(e) => setFormData({ ...formData, folder: e.target.value })}
                    className="w-full px-3 py-2.5 bg-zinc-800 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-yellow-500/30"
                  >
                    <option value="">Без папки</option>
                    {folders.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-5">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setFormData({ name: '', slug: '', folder: '', tool_type: 'stream' })
                }}
                className="flex-1 px-4 py-2.5 bg-zinc-800 text-white rounded-xl text-sm font-medium"
              >
                Отмена
              </button>
              <button
                onClick={handleCreateLink}
                disabled={creating || !formData.name || !formData.slug}
                className="flex-1 px-4 py-2.5 bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black font-semibold rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? '...' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка создания папки */}
      {showFolderModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-zinc-900 rounded-2xl p-4 sm:p-5 w-full max-w-md border border-white/10 my-auto">
            <h3 className="text-white text-base sm:text-lg font-bold mb-4">Новая папка</h3>

            <input
              type="text"
              placeholder="Название папки"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              className="w-full px-3 py-2.5 bg-zinc-800 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 focus:outline-none focus:border-yellow-500/30"
              autoFocus
            />

            <div className="flex flex-col sm:flex-row gap-3 mt-5">
              <button
                onClick={() => {
                  setShowFolderModal(false)
                  setNewFolderName('')
                }}
                className="flex-1 px-4 py-2.5 bg-zinc-800 text-white rounded-xl text-sm font-medium"
              >
                Отмена
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="flex-1 px-4 py-2.5 bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black font-semibold rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка редактирования папки */}
      {editingFolder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-zinc-900 rounded-2xl p-4 sm:p-5 w-full max-w-md border border-white/10 my-auto">
            <h3 className="text-white text-base sm:text-lg font-bold mb-4">Переименовать папку</h3>

            <input
              type="text"
              placeholder="Название папки"
              value={editFolderName}
              onChange={(e) => setEditFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRenameFolder()}
              className="w-full px-3 py-2.5 bg-zinc-800 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 focus:outline-none focus:border-yellow-500/30"
              autoFocus
            />

            <div className="flex flex-col sm:flex-row gap-3 mt-5">
              <button
                onClick={() => {
                  setEditingFolder(null)
                  setEditFolderName('')
                }}
                className="flex-1 px-4 py-2.5 bg-zinc-800 text-white rounded-xl text-sm font-medium"
              >
                Отмена
              </button>
              <button
                onClick={handleRenameFolder}
                disabled={!editFolderName.trim()}
                className="flex-1 px-4 py-2.5 bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black font-semibold rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка детальной статистики промо-страницы */}
      {showStatsModal && promoStats && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-zinc-900 rounded-2xl p-5 w-full max-w-2xl border border-white/10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-lg font-bold">Детальная статистика</h3>
              <button
                onClick={() => {
                  setShowStatsModal(false)
                  setPromoStats(null)
                }}
                className="text-white/60 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Основная статистика - 5 метрик */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
              <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                <div className="text-[#FFD700] font-bold text-lg">{promoStats.totalViews}</div>
                <div className="text-white/40 text-[10px] uppercase">Открыли видео</div>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                <div className="text-blue-400 font-bold text-lg">{promoStats.progress100}</div>
                <div className="text-white/40 text-[10px] uppercase">100% досмотр.</div>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                <div className="text-green-400 font-bold text-lg">{promoStats.codeCorrect}</div>
                <div className="text-white/40 text-[10px] uppercase">Код верно</div>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                <div className="text-red-400 font-bold text-lg">{promoStats.codeIncorrect}</div>
                <div className="text-white/40 text-[10px] uppercase">Код ошибка</div>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                <div className="text-purple-400 font-bold text-lg">{promoStats.payments}</div>
                <div className="text-white/40 text-[10px] uppercase">💳 Оплат</div>
              </div>
            </div>

            {/* Воронка просмотра с прогресс-барами */}
            <div className="bg-zinc-800/30 rounded-xl p-4 mb-4">
              <div className="text-white/60 text-xs uppercase tracking-wider mb-3">📈 Воронка просмотра</div>
              <div className="space-y-3">
                {/* Открыли видео - 100% база */}
                <div className="flex items-center gap-3">
                  <span className="text-white/70 text-sm w-24 shrink-0">Открыли</span>
                  <div className="flex-1 h-3 bg-zinc-700 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-500 rounded-full" style={{width: '100%'}} />
                  </div>
                  <span className="text-white font-bold w-10 text-right">{promoStats.totalViews}</span>
                  <span className="text-white/40 text-xs w-10 text-right">100%</span>
                </div>
                {/* 25% */}
                <div className="flex items-center gap-3">
                  <span className="text-white/70 text-sm w-24 shrink-0">Дошли до 25%</span>
                  <div className="flex-1 h-3 bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{width: promoStats.totalViews > 0 ? `${Math.round(promoStats.progress25 / promoStats.totalViews * 100)}%` : '0%'}}
                    />
                  </div>
                  <span className="text-white font-bold w-10 text-right">{promoStats.progress25}</span>
                  <span className="text-white/40 text-xs w-10 text-right">
                    {promoStats.totalViews > 0 ? Math.round(promoStats.progress25 / promoStats.totalViews * 100) : 0}%
                  </span>
                </div>
                {/* 50% */}
                <div className="flex items-center gap-3">
                  <span className="text-white/70 text-sm w-24 shrink-0">Дошли до 50%</span>
                  <div className="flex-1 h-3 bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-full transition-all"
                      style={{width: promoStats.totalViews > 0 ? `${Math.round(promoStats.progress50 / promoStats.totalViews * 100)}%` : '0%'}}
                    />
                  </div>
                  <span className="text-white font-bold w-10 text-right">{promoStats.progress50}</span>
                  <span className="text-white/40 text-xs w-10 text-right">
                    {promoStats.totalViews > 0 ? Math.round(promoStats.progress50 / promoStats.totalViews * 100) : 0}%
                  </span>
                </div>
                {/* 75% */}
                <div className="flex items-center gap-3">
                  <span className="text-white/70 text-sm w-24 shrink-0">Дошли до 75%</span>
                  <div className="flex-1 h-3 bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full transition-all"
                      style={{width: promoStats.totalViews > 0 ? `${Math.round(promoStats.progress75 / promoStats.totalViews * 100)}%` : '0%'}}
                    />
                  </div>
                  <span className="text-white font-bold w-10 text-right">{promoStats.progress75}</span>
                  <span className="text-white/40 text-xs w-10 text-right">
                    {promoStats.totalViews > 0 ? Math.round(promoStats.progress75 / promoStats.totalViews * 100) : 0}%
                  </span>
                </div>
                {/* 100% */}
                <div className="flex items-center gap-3">
                  <span className="text-white/70 text-sm w-24 shrink-0">Досмотрели</span>
                  <div className="flex-1 h-3 bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{width: promoStats.totalViews > 0 ? `${Math.round(promoStats.progress100 / promoStats.totalViews * 100)}%` : '0%'}}
                    />
                  </div>
                  <span className="text-[#FFD700] font-bold w-10 text-right">{promoStats.progress100}</span>
                  <span className="text-white/40 text-xs w-10 text-right">
                    {promoStats.totalViews > 0 ? Math.round(promoStats.progress100 / promoStats.totalViews * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Список событий */}
            <div className="bg-zinc-800/30 rounded-xl p-4">
              <div className="text-white/60 text-xs uppercase tracking-wider mb-3">Последние события</div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {promoStats.events.slice(0, 20).map((event) => (
                  <div key={event.id} className="flex items-center justify-between text-xs py-2 border-b border-white/5 last:border-0">
                    <div className="flex-1">
                      <div className="text-white font-medium">
                        {event.event_type === 'view_start' && '👁️ Начало просмотра'}
                        {event.event_type === 'progress_25' && '📊 25% просмотрено'}
                        {event.event_type === 'progress_50' && '📊 50% просмотрено'}
                        {event.event_type === 'progress_75' && '📊 75% просмотрено'}
                        {event.event_type === 'progress_100' && '✅ 100% просмотрено'}
                        {event.event_type === 'code_correct' && `✅ Правильный код: ${event.code_entered}`}
                        {event.event_type === 'code_incorrect' && `❌ Неправильный код: ${event.code_entered}`}
                      </div>
                      <div className="text-white/40 text-[10px]">
                        {new Date(event.created_at).toLocaleString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    {event.progress_percent !== null && event.progress_percent !== undefined && (
                      <div className="text-white/50 text-xs">
                        {event.progress_percent}%
                      </div>
                    )}
                  </div>
                ))}
                {promoStats.events.length === 0 && (
                  <div className="text-white/40 text-sm text-center py-4">Нет событий</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Экспорт по умолчанию для обратной совместимости
export default UtmLinksTab
