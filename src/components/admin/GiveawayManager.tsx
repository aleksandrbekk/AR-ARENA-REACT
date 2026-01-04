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

  // Form State - только необходимые поля
  const [formData, setFormData] = useState<Partial<Giveaway>>({
    title: '',
    subtitle: '',
    status: 'draft',
    prices: { ar: 10 },
    end_date: '',
    prizes: []
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
      title: '',
      subtitle: '',
      status: 'draft',
      prices: { ar: 10 },
      end_date: '',
      prizes: []
    })
    setMode('edit')
  }

  const handleEdit = (giveaway: Giveaway) => {
    setEditingId(giveaway.id)
    setFormData(giveaway)
    setMode('edit')
  }

  const handleSave = async () => {
    if (!formData.title?.trim()) {
      alert('Введите название розыгрыша')
      return
    }
    if (!formData.end_date) {
      alert('Укажите дату окончания')
      return
    }

    setLoading(true)
    try {
      const dataToSave = {
        title: formData.title,
        subtitle: formData.subtitle || null,
        status: formData.status || 'draft',
        prices: formData.prices || { ar: 10 },
        end_date: formData.end_date,
        prizes: formData.prizes || []
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
                          {
                            label: 'Билет',
                            value: g.prices?.ar ? `${g.prices.ar} AR` : g.prices?.bul ? `${g.prices.bul} BUL` : `${g.price || 10} ${(g.currency || 'ar').toUpperCase()}`
                          },
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
  // Получаем текущую валюту из prices
  const currentCurrency = formData.prices?.bul !== undefined ? 'bul' : 'ar'
  const currentPrice = currentCurrency === 'bul' ? (formData.prices?.bul || 0) : (formData.prices?.ar || 0)

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-[100px] pb-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Компактный хедер */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setMode('list')}
            className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-white/60 hover:text-white hover:bg-zinc-700 transition-all"
          >
            ←
          </button>
          <h1 className="text-xl font-bold text-white flex-1">
            {editingId ? 'Редактирование' : 'Новый розыгрыш'}
          </h1>
        </div>

        {/* Форма - компактная и чистая */}
        <div className="space-y-4">
          {/* Название */}
          <div>
            <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider">Название *</label>
            <input
              type="text"
              value={formData.title || ''}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              placeholder="Например: Новогодний розыгрыш"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:border-[#FFD700]/50 focus:outline-none"
            />
          </div>

          {/* Подзаголовок */}
          <div>
            <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider">Описание</label>
            <input
              type="text"
              value={formData.subtitle || ''}
              onChange={e => setFormData({ ...formData, subtitle: e.target.value })}
              placeholder="Краткое описание розыгрыша"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:border-[#FFD700]/50 focus:outline-none"
            />
          </div>

          {/* Цена и Валюта - в одну строку */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider">Цена билета</label>
              <input
                type="number"
                value={currentPrice || ''}
                onChange={e => {
                  const val = Number(e.target.value)
                  if (currentCurrency === 'bul') {
                    setFormData({ ...formData, prices: { bul: val } })
                  } else {
                    setFormData({ ...formData, prices: { ar: val } })
                  }
                }}
                placeholder="10"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:border-[#FFD700]/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider">Валюта</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, prices: { ar: currentPrice } })}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                    currentCurrency === 'ar'
                      ? 'bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/50'
                      : 'bg-zinc-900 text-white/40 border border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  <img src="/icons/arcoin.png" alt="" className="w-5 h-5" />
                  AR
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, prices: { bul: currentPrice } })}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                    currentCurrency === 'bul'
                      ? 'bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/50'
                      : 'bg-zinc-900 text-white/40 border border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  <img src="/icons/BUL.png" alt="" className="w-5 h-5" />
                  BUL
                </button>
              </div>
            </div>
          </div>

          {/* Статус и Дата окончания */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider">Статус</label>
              <select
                value={formData.status || 'draft'}
                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-[#FFD700]/50 focus:outline-none appearance-none"
              >
                <option value="draft">Черновик</option>
                <option value="active">Активный</option>
                <option value="completed">Завершён</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider">Окончание *</label>
              <input
                type="datetime-local"
                value={formData.end_date ? new Date(formData.end_date).toISOString().slice(0, 16) : ''}
                onChange={e => setFormData({ ...formData, end_date: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-[#FFD700]/50 focus:outline-none"
              />
            </div>
          </div>

          {/* Призы */}
          <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
              <span className="font-semibold text-white text-sm">Призовые места</span>
              <button
                type="button"
                onClick={addPrize}
                className="px-3 py-1 bg-[#FFD700]/20 hover:bg-[#FFD700]/30 text-[#FFD700] rounded-lg text-xs font-bold transition-colors"
              >
                + Добавить
              </button>
            </div>
            <div className="p-3 space-y-2">
              {formData.prizes?.length === 0 && (
                <div className="text-center py-6 text-white/30 text-sm">
                  Нажмите "Добавить" для создания призов
                </div>
              )}
              {formData.prizes?.map((prize, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-black/30 rounded-xl p-2.5">
                  <div className={`w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center font-bold text-xs ${
                    idx === 0 ? 'bg-[#FFD700]/20 text-[#FFD700]' :
                    idx === 1 ? 'bg-gray-400/20 text-gray-400' :
                    idx === 2 ? 'bg-amber-600/20 text-amber-500' :
                    'bg-white/5 text-white/50'
                  }`}>
                    {prize.place}
                  </div>
                  <input
                    type="number"
                    placeholder="0"
                    value={prize.amount || ''}
                    onChange={e => updatePrize(idx, 'amount', Number(e.target.value))}
                    className="w-20 bg-black/40 border border-zinc-700 rounded-lg px-2 py-1.5 text-white text-sm focus:border-[#FFD700]/50 focus:outline-none"
                  />
                  <span className="text-white/30 text-xs">фикс.</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={prize.percentage || ''}
                    onChange={e => updatePrize(idx, 'percentage', Number(e.target.value))}
                    className="w-14 bg-black/40 border border-zinc-700 rounded-lg px-2 py-1.5 text-white text-sm focus:border-[#FFD700]/50 focus:outline-none"
                  />
                  <span className="text-white/30 text-xs">%</span>
                  <button
                    type="button"
                    onClick={() => removePrize(idx)}
                    className="ml-auto w-7 h-7 flex items-center justify-center hover:bg-red-500/20 rounded-lg transition-colors text-red-400 text-lg"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setMode('list')}
              className="flex-1 py-3.5 rounded-xl font-bold text-white/60 bg-zinc-800 hover:bg-zinc-700 transition-colors"
            >
              Отмена
            </button>
            <motion.button
              type="button"
              onClick={handleSave}
              disabled={loading}
              whileTap={{ scale: 0.98 }}
              className="flex-[2] py-3.5 rounded-xl font-bold text-black disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
              }}
            >
              {loading ? 'Сохранение...' : 'Сохранить'}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  )
}
