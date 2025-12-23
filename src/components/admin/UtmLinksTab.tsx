import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

interface UtmLink {
  id: number
  name: string
  slug: string
  clicks: number
  conversions: number
  created_at: string
}

export function UtmLinksTab() {
  const [links, setLinks] = useState<UtmLink[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<number | null>(null)

  // Форма создания ссылки
  const [formData, setFormData] = useState({
    name: '',
    slug: ''
  })

  useEffect(() => {
    fetchLinks()
  }, [])

  const fetchLinks = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('utm_links')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setLinks(data || [])
    } catch (err) {
      console.error('Error fetching utm links:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateLink = async () => {
    if (!formData.name || !formData.slug) {
      alert('Заполните все поля')
      return
    }

    // Валидация slug (только латиница, цифры, дефис, нижнее подчеркивание)
    const slugRegex = /^[a-z0-9_-]+$/i
    if (!slugRegex.test(formData.slug)) {
      alert('Slug может содержать только латиницу, цифры, дефис и нижнее подчеркивание')
      return
    }

    try {
      setCreating(true)
      const { error } = await supabase
        .from('utm_links')
        .insert({
          name: formData.name,
          slug: formData.slug.toLowerCase()
        })

      if (error) {
        if (error.code === '23505') {
          alert('Ссылка с таким slug уже существует')
        } else {
          throw error
        }
        return
      }

      setShowCreateModal(false)
      setFormData({ name: '', slug: '' })
      fetchLinks()
    } catch (err: any) {
      console.error('Error creating link:', err)
      alert(`Ошибка: ${err.message}`)
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteLink = async (id: number, name: string) => {
    if (!confirm(`Удалить ссылку "${name}"?`)) return

    try {
      const { error } = await supabase
        .from('utm_links')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchLinks()
    } catch (err: any) {
      console.error('Error deleting link:', err)
      alert(`Ошибка: ${err.message}`)
    }
  }

  const copyToClipboard = async (link: UtmLink) => {
    const url = `https://t.me/ARARENA_BOT?start=premium_${link.slug}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(link.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      // Fallback для Telegram WebApp
      const textArea = document.createElement('textarea')
      textArea.value = url
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopiedId(link.id)
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

  // Конверсия в процентах
  const getConversionRate = (clicks: number, conversions: number) => {
    if (clicks === 0) return '0%'
    return `${((conversions / clicks) * 100).toFixed(1)}%`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white/40">Загрузка ссылок...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Инструкция */}
      <div className="bg-zinc-900/30 backdrop-blur-sm rounded-xl p-4 border border-yellow-500/20">
        <div className="flex items-start gap-3">
          <div className="text-2xl">💡</div>
          <div>
            <div className="text-white font-semibold mb-1">Как работают UTM-ссылки</div>
            <div className="text-white/60 text-sm">
              Создайте ссылку для каждого источника трафика. Когда человек переходит по ссылке — засчитывается клик. Когда покупает подписку — конверсия.
            </div>
          </div>
        </div>
      </div>

      {/* Кнопка создать */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="w-full px-4 py-3 bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black font-semibold rounded-xl active:scale-95 transition-transform"
      >
        + Создать ссылку
      </button>

      {/* Статистика */}
      {links.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-zinc-900/50 backdrop-blur-md rounded-xl p-3 border border-white/10 text-center">
            <div className="text-white/50 text-xs mb-1">Всего ссылок</div>
            <div className="text-white font-bold text-lg">{links.length}</div>
          </div>
          <div className="bg-zinc-900/50 backdrop-blur-md rounded-xl p-3 border border-white/10 text-center">
            <div className="text-white/50 text-xs mb-1">Всего кликов</div>
            <div className="text-[#FFD700] font-bold text-lg">
              {links.reduce((sum, l) => sum + l.clicks, 0)}
            </div>
          </div>
          <div className="bg-zinc-900/50 backdrop-blur-md rounded-xl p-3 border border-white/10 text-center">
            <div className="text-white/50 text-xs mb-1">Конверсий</div>
            <div className="text-green-500 font-bold text-lg">
              {links.reduce((sum, l) => sum + l.conversions, 0)}
            </div>
          </div>
        </div>
      )}

      {/* Список ссылок */}
      <div className="space-y-3">
        {links.length === 0 ? (
          <div className="bg-zinc-900/30 backdrop-blur-sm rounded-xl p-8 border border-white/5 text-center">
            <div className="text-4xl mb-3">🔗</div>
            <div className="text-white/40">Нет созданных ссылок</div>
            <div className="text-white/30 text-sm mt-1">
              Создайте первую UTM-ссылку для отслеживания трафика
            </div>
          </div>
        ) : (
          links.map((link) => (
            <div
              key={link.id}
              className="bg-zinc-900/50 backdrop-blur-md rounded-xl p-4 border border-white/10"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="text-white font-bold mb-1">{link.name}</div>
                  <div className="text-white/40 text-xs font-mono">
                    t.me/ARARENA_BOT?start=premium_{link.slug}
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(link)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    copiedId === link.id
                      ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                      : 'bg-zinc-700 text-white/80 active:scale-95'
                  }`}
                >
                  {copiedId === link.id ? '✓ Скопировано' : 'Копировать'}
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
                <div className="text-white/40 text-xs">
                  Создана: {formatDate(link.created_at)}
                </div>
                <button
                  onClick={() => handleDeleteLink(link.id, link.name)}
                  className="px-3 py-1.5 bg-red-500/10 text-red-500 text-xs font-semibold rounded-lg border border-red-500/20 active:scale-95 transition-transform"
                >
                  Удалить
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Модалка создания ссылки */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-zinc-900 rounded-2xl p-6 w-full max-w-md border border-white/10">
            <h3 className="text-white text-lg font-bold mb-4">
              Создать UTM-ссылку
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-white/60 text-sm mb-2 block">Название источника:</label>
                <input
                  type="text"
                  placeholder="Например: Instagram Reels"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-yellow-500/30"
                />
              </div>

              <div>
                <label className="text-white/60 text-sm mb-2 block">Slug (метка в ссылке):</label>
                <input
                  type="text"
                  placeholder="instagram_reels"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.replace(/\s/g, '_') })}
                  className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-yellow-500/30 font-mono"
                />
                <div className="text-white/40 text-xs mt-2">
                  Ссылка: t.me/ARARENA_BOT?start=premium_{formData.slug || 'slug'}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setFormData({ name: '', slug: '' })
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
    </div>
  )
}
