import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import type { Giveaway } from '../../types'

export function GiveawayManager() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'list' | 'edit'>('list')
  const [giveaways, setGiveaways] = useState<Giveaway[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form State
  const [formData, setFormData] = useState<Partial<Giveaway>>({
    type: 'money',
    title: '',
    subtitle: '',
    price: 10,
    currency: 'ar',
    status: 'draft',
    prizes: [],
    requirements: {}
  })

  useEffect(() => {
    fetchGiveaways()
  }, [])

  const fetchGiveaways = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('giveaways')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) setGiveaways(data)
    setLoading(false)
  }

  const handleCreate = () => {
    setEditingId(null)
    setFormData({
      type: 'money',
      title: '',
      subtitle: '',
      price: 10,
      currency: 'ar',
      status: 'draft',
      prizes: [],
      requirements: {}
    })
    setMode('edit')
  }

  const handleEdit = (giveaway: Giveaway) => {
    setEditingId(giveaway.id)
    setFormData(giveaway)
    setMode('edit')
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const dataToSave = {
        ...formData,
        prizes: formData.prizes || [],
        requirements: formData.requirements || {}
      }

      if (editingId) {
        const { error } = await supabase
          .from('giveaways')
          .update(dataToSave)
          .eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('giveaways')
          .insert([dataToSave])
        if (error) throw error
      }

      await fetchGiveaways()
      setMode('list')
    } catch (error: any) {
      alert('Ошибка сохранения: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const addPrize = () => {
    const newPrize = { place: (formData.prizes?.length || 0) + 1, amount: 0, percentage: 0 }
    setFormData({ ...formData, prizes: [...(formData.prizes || []), newPrize] })
  }

  const removePrize = (index: number) => {
    const newPrizes = [...(formData.prizes || [])]
    newPrizes.splice(index, 1)
    setFormData({ ...formData, prizes: newPrizes })
  }

  const updatePrize = (index: number, field: string, value: any) => {
    const newPrizes = [...(formData.prizes || [])]
    newPrizes[index] = { ...newPrizes[index], [field]: value }
    setFormData({ ...formData, prizes: newPrizes })
  }

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; bg: string; text: string; glow: string }> = {
      'draft': { label: 'Черновик', bg: 'bg-zinc-500/20', text: 'text-zinc-400', glow: '' },
      'active': { label: 'Активный', bg: 'bg-emerald-500/20', text: 'text-emerald-400', glow: 'shadow-[0_0_20px_rgba(16,185,129,0.3)]' },
      'completed': { label: 'Завершён', bg: 'bg-blue-500/20', text: 'text-blue-400', glow: '' },
      'cancelled': { label: 'Отменён', bg: 'bg-red-500/20', text: 'text-red-400', glow: '' }
    }
    return configs[status] || configs['draft']
  }

  const handleRunDraw = async (giveawayId: string) => {
    if (!confirm('ВНИМАНИЕ!\n\nЭто действие НЕОБРАТИМО.\nБудут определены победители, выплачены призы и розыгрыш будет завершён.\n\nПродолжить?')) {
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('run_giveaway_draw', {
        p_giveaway_id: giveawayId
      })

      if (error) throw new Error(error.message)
      if (!data?.success) throw new Error(data?.draw?.error || data?.error || 'Ошибка генерации')

      const drawData = data.draw
      const prizesData = data.prizes

      let message = `Розыгрыш завершён!\n\n`
      message += `Участников: ${drawData?.total_participants || 'N/A'}\n`
      message += `Билетов: ${drawData?.total_tickets || 'N/A'}\n\n`

      if (prizesData?.success) {
        message += `Призы выплачены!\n`
        message += `Всего выплачено: ${prizesData.total_paid} ${prizesData.currency?.toUpperCase()}`
      } else {
        message += `Внимание: призы не выплачены.\n${prizesData?.error || ''}`
      }

      alert(message)
      await fetchGiveaways()
    } catch (error: any) {
      alert('Ошибка: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDistributePrizes = async (giveawayId: string) => {
    if (!confirm('Выплатить призы победителям?\n\nЭто действие начислит AR/BUL на балансы победителей.')) {
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('distribute_giveaway_prizes', {
        p_giveaway_id: giveawayId
      })

      if (error) throw new Error(error.message)
      if (!data?.success) throw new Error(data?.error || 'Ошибка выплаты')

      let message = `Призы выплачены!\n\n`
      message += `Джекпот: ${data.jackpot} ${data.currency?.toUpperCase()}\n`
      message += `Всего выплачено: ${data.total_paid} ${data.currency?.toUpperCase()}\n\n`

      if (data.prizes_paid && data.prizes_paid.length > 0) {
        message += `Победители:\n`
        for (const prize of data.prizes_paid) {
          message += `${prize.place} место: ${prize.first_name || prize.username || prize.telegram_id} — ${prize.total_prize} ${data.currency?.toUpperCase()}\n`
        }
      }

      alert(message)
      await fetchGiveaways()
    } catch (error: any) {
      alert('Ошибка: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (giveawayId: string, title: string) => {
    if (!confirm(`Удалить розыгрыш?\n\n"${title}"\n\nЭто действие удалит розыгрыш и все связанные билеты!`)) {
      return
    }

    setLoading(true)
    try {
      await supabase.from('giveaway_tickets').delete().eq('giveaway_id', giveawayId)
      const { error } = await supabase.from('giveaways').delete().eq('id', giveawayId)
      if (error) throw error

      alert('Розыгрыш удалён!')
      await fetchGiveaways()
    } catch (error: any) {
      alert('Ошибка удаления: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // ==================== LIST VIEW ====================
  if (mode === 'list') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-[100px] pb-8 px-4">
        {/* Premium Header */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="relative text-center">
            {/* Glow effect */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-32 bg-[#FFD700]/10 blur-[80px] rounded-full" />

            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative"
            >
              <h1 className="text-3xl font-black tracking-wider mb-2">
                <span className="bg-gradient-to-r from-[#FFD700] via-[#FFC700] to-[#FFA500] bg-clip-text text-transparent">
                  РОЗЫГРЫШИ
                </span>
              </h1>
              <div className="flex items-center justify-center gap-3">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#FFD700]/50" />
                <span className="text-xs text-white/40 uppercase tracking-[0.3em]">Управление</span>
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#FFD700]/50" />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Create Button */}
        <div className="max-w-2xl mx-auto mb-8">
          <motion.button
            onClick={handleCreate}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 rounded-2xl font-bold text-black uppercase tracking-wider flex items-center justify-center gap-3 transition-all"
            style={{
              background: 'linear-gradient(135deg, #FFD700 0%, #FFC700 25%, #FFB800 50%, #FFA500 75%, #FF9500 100%)',
              boxShadow: '0 4px 30px rgba(255, 215, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
            }}
          >
            <span className="text-2xl font-light">+</span>
            <span>Создать розыгрыш</span>
          </motion.button>
        </div>

        {/* Stats Bar */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Всего', value: giveaways.length, color: 'white' },
              { label: 'Активных', value: giveaways.filter(g => g.status === 'active').length, color: '#10b981' },
              { label: 'Завершённых', value: giveaways.filter(g => g.status === 'completed').length, color: '#3b82f6' }
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-zinc-900/80 backdrop-blur-sm border border-white/5 rounded-xl p-4 text-center"
              >
                <div className="text-2xl font-black" style={{ color: stat.color }}>{stat.value}</div>
                <div className="text-xs text-white/40 uppercase tracking-wider">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Giveaways List */}
        <div className="max-w-2xl mx-auto space-y-4">
          <AnimatePresence>
            {giveaways.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-zinc-900 border border-[#FFD700]/20 flex items-center justify-center">
                  <span className="text-4xl opacity-50">🎁</span>
                </div>
                <p className="text-white/40 mb-2">Нет розыгрышей</p>
                <p className="text-white/20 text-sm">Создайте первый розыгрыш</p>
              </motion.div>
            ) : (
              giveaways.map((g, idx) => {
                const statusConfig = getStatusConfig(g.status)
                const isCompleted = g.status === 'completed'
                const isActive = g.status === 'active'
                const needsPayout = isCompleted && !(g as any).prizes_distributed

                return (
                  <motion.div
                    key={g.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`rounded-2xl border border-white/10 bg-zinc-900/80 overflow-hidden ${statusConfig.glow}`}
                  >
                    {/* Status indicator line */}
                    <div className={`h-1 w-full ${isActive ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
                      isCompleted ? 'bg-gradient-to-r from-blue-500 to-blue-400' :
                        g.status === 'cancelled' ? 'bg-gradient-to-r from-red-500 to-red-400' :
                          'bg-zinc-700'
                      }`} />

                    <div className="p-4">
                      {/* Row 1: Status badges */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 text-[10px] font-semibold rounded ${statusConfig.bg} ${statusConfig.text}`}>
                          {statusConfig.label}
                        </span>
                        {needsPayout && (
                          <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-500/20 text-amber-400">
                            Ожидает
                          </span>
                        )}
                        {isCompleted && (g as any).prizes_distributed && (
                          <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-500/20 text-emerald-400">
                            Выплачено
                          </span>
                        )}
                      </div>

                      {/* Row 2: Title + Jackpot */}
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-bold text-white truncate">{g.title || g.name || 'Без названия'}</h3>
                          {g.subtitle && <p className="text-[11px] text-white/40 truncate">{g.subtitle}</p>}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0 bg-black/30 rounded-lg px-2 py-1">
                          <img src={`/icons/${g.currency === 'ar' ? 'arcoin' : 'BUL'}.png`} alt="" className="w-4 h-4" />
                          <span className="text-sm font-black text-[#FFD700]">
                            {(g.jackpot_current_amount || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Row 3: Info Grid */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {[
                          { label: 'Билет', value: `${g.price} ${g.currency?.toUpperCase()}` },
                          { label: 'Призов', value: g.prizes?.length || 0 },
                          { label: 'Конец', value: g.end_date ? new Date(g.end_date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) : '—' }
                        ].map((item) => (
                          <div key={item.label} className="bg-black/20 rounded-lg py-1.5 px-2 text-center">
                            <div className="text-[9px] text-white/40 uppercase">{item.label}</div>
                            <div className="text-[11px] font-bold text-white">{item.value}</div>
                          </div>
                        ))}
                      </div>

                      {/* Row 4: Actions - Grid for equal sizing */}
                      <div className="grid grid-cols-4 gap-2">
                        {/* Primary Action */}
                        {isActive ? (
                          <button
                            onClick={() => handleRunDraw(g.id)}
                            disabled={loading}
                            className="col-span-2 h-9 rounded-lg font-bold text-[11px] uppercase bg-red-500 text-white disabled:opacity-50"
                          >
                            Провести
                          </button>
                        ) : needsPayout ? (
                          <button
                            onClick={() => handleDistributePrizes(g.id)}
                            disabled={loading}
                            className="col-span-2 h-9 rounded-lg font-bold text-[11px] uppercase bg-emerald-500 text-white disabled:opacity-50"
                          >
                            Выплатить
                          </button>
                        ) : isCompleted ? (
                          <button
                            onClick={() => navigate(`/live/${g.id}`)}
                            className="col-span-2 h-9 rounded-lg font-bold text-[11px] uppercase bg-blue-500 text-white"
                          >
                            Live
                          </button>
                        ) : (
                          <div className="col-span-2" />
                        )}

                        {/* Secondary Actions */}
                        <button
                          onClick={() => handleEdit(g)}
                          className="h-9 rounded-lg font-medium text-[11px] bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
                        >
                          Ред.
                        </button>
                        <button
                          onClick={() => handleDelete(g.id, g.title || g.name || 'Розыгрыш')}
                          disabled={loading}
                          className="h-9 rounded-lg font-medium text-[11px] bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                        >
                          Удал.
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    )
  }

  // ==================== EDIT VIEW ====================
  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-[100px] pb-24 px-4">
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setMode('list')}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
          >
            <span className="text-xl">←</span>
            <span>Назад</span>
          </button>
          <h1 className="text-xl font-bold text-[#FFD700]">
            {editingId ? 'Редактирование' : 'Новый розыгрыш'}
          </h1>
          <div className="w-16" /> {/* Spacer for centering */}
        </div>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Section: Basic Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-white/5 overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#FFD700]/20 flex items-center justify-center">
              <span className="text-[#FFD700]">1</span>
            </div>
            <h3 className="font-bold text-white">Основная информация</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider">Тип</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#FFD700]/50 focus:outline-none transition-colors"
                >
                  <option value="money">Деньги</option>
                  <option value="course">Курс</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider">Статус</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#FFD700]/50 focus:outline-none transition-colors"
                >
                  <option value="draft">Черновик</option>
                  <option value="active">Активный</option>
                  <option value="completed">Завершён</option>
                  <option value="cancelled">Отменён</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider">URL Картинки (Баннер)</label>
              <input
                type="text"
                value={formData.image_url || ''}
                onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://... (оставьте пустым для градиента)"
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white placeholder-white/30 focus:border-[#FFD700]/50 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider">Название</label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="Введите название..."
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white placeholder-white/30 focus:border-[#FFD700]/50 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider">Подзаголовок</label>
              <input
                type="text"
                value={formData.subtitle || ''}
                onChange={e => setFormData({ ...formData, subtitle: e.target.value })}
                placeholder="Краткое описание..."
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white placeholder-white/30 focus:border-[#FFD700]/50 focus:outline-none transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider">Цена билета</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#FFD700]/50 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider">Валюта</label>
                <select
                  value={formData.currency}
                  onChange={e => setFormData({ ...formData, currency: e.target.value as any })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#FFD700]/50 focus:outline-none transition-colors"
                >
                  <option value="ar">AR</option>
                  <option value="bul">BUL</option>
                </select>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Section: Dates */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-white/5 overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#FFD700]/20 flex items-center justify-center">
              <span className="text-[#FFD700]">2</span>
            </div>
            <h3 className="font-bold text-white">Даты</h3>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider">Дата окончания</label>
              <input
                type="datetime-local"
                value={formData.end_date ? new Date(formData.end_date).toISOString().slice(0, 16) : ''}
                onChange={e => setFormData({ ...formData, end_date: new Date(e.target.value).toISOString() })}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#FFD700]/50 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider">Дата розыгрыша</label>
              <input
                type="datetime-local"
                value={formData.draw_date ? new Date(formData.draw_date).toISOString().slice(0, 16) : ''}
                onChange={e => setFormData({ ...formData, draw_date: new Date(e.target.value).toISOString() })}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#FFD700]/50 focus:outline-none transition-colors"
              />
            </div>
          </div>
        </motion.div>

        {/* Section: Prizes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-white/5 overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#FFD700]/20 flex items-center justify-center">
                <span className="text-[#FFD700]">3</span>
              </div>
              <h3 className="font-bold text-white">Призы</h3>
            </div>
            <button
              onClick={addPrize}
              className="px-3 py-1.5 bg-[#FFD700]/20 hover:bg-[#FFD700]/30 text-[#FFD700] rounded-lg text-sm font-medium transition-colors"
            >
              + Добавить
            </button>
          </div>
          <div className="p-5 space-y-3">
            {formData.prizes?.length === 0 && (
              <div className="text-center py-8 text-white/30">
                Нет призов. Нажмите "Добавить" выше.
              </div>
            )}
            {formData.prizes?.map((prize, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-black/30 rounded-xl p-3">
                <div className={`w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-[#FFD700]/20 text-[#FFD700]' :
                  idx === 1 ? 'bg-gray-400/20 text-gray-400' :
                    idx === 2 ? 'bg-amber-600/20 text-amber-500' :
                      'bg-white/5 text-white/50'
                  }`}>
                  {prize.place}
                </div>
                <input
                  type="number"
                  placeholder="Сумма"
                  value={prize.amount || ''}
                  onChange={e => updatePrize(idx, 'amount', Number(e.target.value))}
                  className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm focus:border-[#FFD700]/50 focus:outline-none"
                />
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    placeholder="%"
                    value={prize.percentage || ''}
                    onChange={e => updatePrize(idx, 'percentage', Number(e.target.value))}
                    className="w-16 bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm focus:border-[#FFD700]/50 focus:outline-none"
                  />
                  <span className="text-white/30 text-sm">%</span>
                </div>
                <button
                  onClick={() => removePrize(idx)}
                  className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Section: Requirements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-white/5 overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#FFD700]/20 flex items-center justify-center">
              <span className="text-[#FFD700]">4</span>
            </div>
            <h3 className="font-bold text-white">Требования</h3>
          </div>
          <div className="p-5 space-y-4">
            <label className="flex items-center gap-3 p-3 bg-black/30 rounded-xl cursor-pointer hover:bg-black/40 transition-colors">
              <input
                type="checkbox"
                checked={!!formData.requirements?.telegram_channel_id}
                onChange={e => {
                  const reqs = { ...formData.requirements }
                  if (e.target.checked) reqs.telegram_channel_id = ''
                  else delete reqs.telegram_channel_id
                  setFormData({ ...formData, requirements: reqs })
                }}
                className="w-5 h-5 rounded accent-[#FFD700]"
              />
              <span className="text-white">Подписка на Telegram канал</span>
            </label>
            {formData.requirements?.telegram_channel_id !== undefined && (
              <input
                type="text"
                placeholder="ID канала (напр. @ar_arena)"
                value={formData.requirements.telegram_channel_id}
                onChange={e => setFormData({
                  ...formData,
                  requirements: { ...formData.requirements, telegram_channel_id: e.target.value }
                })}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white placeholder-white/30 focus:border-[#FFD700]/50 focus:outline-none"
              />
            )}

            <label className="flex items-center gap-3 p-3 bg-black/30 rounded-xl cursor-pointer hover:bg-black/40 transition-colors">
              <input
                type="checkbox"
                checked={!!formData.requirements?.min_friends}
                onChange={e => {
                  const reqs = { ...formData.requirements }
                  if (e.target.checked) reqs.min_friends = 1
                  else delete reqs.min_friends
                  setFormData({ ...formData, requirements: reqs })
                }}
                className="w-5 h-5 rounded accent-[#FFD700]"
              />
              <span className="text-white">Минимум друзей</span>
            </label>
            {formData.requirements?.min_friends !== undefined && (
              <input
                type="number"
                placeholder="Количество"
                value={formData.requirements.min_friends}
                onChange={e => setFormData({
                  ...formData,
                  requirements: { ...formData.requirements, min_friends: Number(e.target.value) }
                })}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white placeholder-white/30 focus:border-[#FFD700]/50 focus:outline-none"
              />
            )}
          </div>
        </motion.div>

        {/* Save Button */}
        <motion.button
          onClick={handleSave}
          disabled={loading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-4 rounded-2xl font-bold text-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          style={{
            background: 'linear-gradient(135deg, #FFD700 0%, #FFC700 25%, #FFB800 50%, #FFA500 75%, #FF9500 100%)',
            boxShadow: '0 4px 30px rgba(255, 215, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
          }}
        >
          {loading ? 'Сохранение...' : 'Сохранить'}
        </motion.button>
      </div>
    </div>
  )
}
