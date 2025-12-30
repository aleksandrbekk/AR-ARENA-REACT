import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import type { Giveaway } from '../../types'
// Icons removed - using text/images per design system rules

export function GiveawayManager() {
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

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'draft': 'Черновик',
      'active': 'Активный',
      'completed': 'Завершён',
      'cancelled': 'Отменён'
    }
    return labels[status] || status
  }

  const handleRunDraw = async (giveawayId: string) => {
    if (!confirm('ВНИМАНИЕ!\n\nЭто действие НЕОБРАТИМО.\nБудут определены победители, выплачены призы и розыгрыш будет завершён.\n\nПродолжить?')) {
      return
    }

    setLoading(true)
    try {
      // Используем новую функцию run_giveaway_draw (генерация + выплата)
      const { data, error } = await supabase.rpc('run_giveaway_draw', {
        p_giveaway_id: giveawayId
      })

      if (error) {
        throw new Error(error.message)
      }

      if (!data?.success) {
        throw new Error(data?.draw?.error || data?.error || 'Ошибка генерации')
      }

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

      if (error) {
        throw new Error(error.message)
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Ошибка выплаты')
      }

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
      // Сначала удаляем билеты
      await supabase
        .from('giveaway_tickets')
        .delete()
        .eq('giveaway_id', giveawayId)

      // Затем удаляем сам розыгрыш
      const { error } = await supabase
        .from('giveaways')
        .delete()
        .eq('id', giveawayId)

      if (error) throw error

      alert('Розыгрыш удалён!')
      await fetchGiveaways()
    } catch (error: any) {
      alert('Ошибка удаления: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (mode === 'list') {
    return (
      <div className="p-6 bg-zinc-900 min-h-screen text-white">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[#FFD700]">Управление розыгрышами</h2>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black font-bold rounded-lg hover:opacity-90"
          >
            + Создать
          </button>
        </div>

        <div className="grid gap-4">
          {giveaways.map(g => (
            <div key={g.id} className="p-4 bg-zinc-800/50 border border-white/10 rounded-xl">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${g.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      g.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                      {getStatusLabel(g.status)}
                    </span>
                    <h3 className="font-bold">{g.title}</h3>
                  </div>
                  <p className="text-sm text-white/50">{g.subtitle}</p>
                  <div className="text-xs text-white/30 mt-1 flex gap-4 flex-wrap">
                    <span>ID: {g.id}</span>
                    <span>Конец: {new Date(g.end_date).toLocaleDateString('ru-RU')}</span>
                    <span>Джекпот: {g.jackpot_current_amount}</span>
                    {g.status === 'completed' && (
                      <span className={(g as any).prizes_distributed ? 'text-green-400' : 'text-yellow-400'}>
                        {(g as any).prizes_distributed ? '✓ Выплачено' : '⏳ Не выплачено'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  {g.status === 'active' && (
                    <button
                      onClick={() => handleRunDraw(g.id)}
                      disabled={loading}
                      className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors text-xs font-medium"
                    >
                      ПРОВЕСТИ
                    </button>
                  )}
                  {g.status === 'completed' && !(g as any).prizes_distributed && (
                    <button
                      onClick={() => handleDistributePrizes(g.id)}
                      disabled={loading}
                      className="px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors text-xs font-medium"
                    >
                      ВЫПЛАТИТЬ
                    </button>
                  )}
                  {g.status === 'completed' && (
                    <button
                      onClick={() => window.open(`/giveaway/${g.id}/results`, '_blank')}
                      className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors text-xs font-medium"
                    >
                      РЕЗУЛЬТАТЫ
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(g)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title="Редактировать"
                  >
                    <span className="text-blue-400 text-sm">Ред.</span>
                  </button>
                  <button
                    onClick={() => handleDelete(g.id, g.title)}
                    disabled={loading}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                    title="Удалить"
                  >
                    <span className="text-red-400 text-sm">Удал.</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-zinc-900 min-h-screen text-white pb-24">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#FFD700]">
          {editingId ? 'Редактировать розыгрыш' : 'Создать розыгрыш'}
        </h2>
        <button onClick={() => setMode('list')} className="p-2 hover:bg-white/10 rounded-lg">
          <span className="text-white/60 text-xl">×</span>
        </button>
      </div>

      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Основная информация */}
        <div className="space-y-4 p-4 bg-black/20 rounded-xl border border-white/5">
          <h3 className="text-lg font-bold flex items-center gap-2"><span className="text-[#FFD700]">*</span> Основная информация</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-white/50 mb-1">Тип</label>
              <select
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white"
              >
                <option value="money">Деньги</option>
                <option value="course">Курс</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Статус</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white"
              >
                <option value="draft">Черновик</option>
                <option value="active">Активный</option>
                <option value="completed">Завершён</option>
                <option value="cancelled">Отменён</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1">Название</label>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white"
            />
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1">Подзаголовок</label>
            <input
              type="text"
              value={formData.subtitle || ''}
              onChange={e => setFormData({ ...formData, subtitle: e.target.value })}
              className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-white/50 mb-1">Цена билета</label>
              <input
                type="number"
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Валюта</label>
              <select
                value={formData.currency}
                onChange={e => setFormData({ ...formData, currency: e.target.value as any })}
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white"
              >
                <option value="ar">AR</option>
                <option value="bul">BUL</option>
              </select>
            </div>
          </div>
        </div>

        {/* Даты */}
        <div className="space-y-4 p-4 bg-black/20 rounded-xl border border-white/5">
          <h3 className="text-lg font-bold flex items-center gap-2"><span className="text-[#FFD700]">Даты</span></h3>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs text-white/50 mb-1">Дата окончания</label>
              <input
                type="datetime-local"
                value={formData.end_date ? new Date(formData.end_date).toISOString().slice(0, 16) : ''}
                onChange={e => setFormData({ ...formData, end_date: new Date(e.target.value).toISOString() })}
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Дата розыгрыша</label>
              <input
                type="datetime-local"
                value={formData.draw_date ? new Date(formData.draw_date).toISOString().slice(0, 16) : ''}
                onChange={e => setFormData({ ...formData, draw_date: new Date(e.target.value).toISOString() })}
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white"
              />
            </div>
          </div>
        </div>

        {/* Призы */}
        <div className="space-y-4 p-4 bg-black/20 rounded-xl border border-white/5">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold flex items-center gap-2"><span className="text-[#FFD700]">Призы</span></h3>
            <button onClick={addPrize} className="text-xs bg-white/10 px-2 py-1 rounded hover:bg-white/20">Добавить приз</button>
          </div>

          <div className="space-y-2">
            {formData.prizes?.map((prize, idx) => (
              <div key={idx} className="flex gap-2 items-center bg-black/40 p-2 rounded-lg">
                <div className="w-10 text-center font-bold text-white/50">#{prize.place}</div>
                <input
                  type="number"
                  placeholder="Сумма"
                  value={prize.amount}
                  onChange={e => updatePrize(idx, 'amount', Number(e.target.value))}
                  className="w-24 bg-transparent border-b border-white/10 p-1 text-sm text-white"
                />
                <input
                  type="number"
                  placeholder="%"
                  value={prize.percentage}
                  onChange={e => updatePrize(idx, 'percentage', Number(e.target.value))}
                  className="w-16 bg-transparent border-b border-white/10 p-1 text-sm text-white"
                />
                <span className="text-xs text-white/30">%</span>
                <button onClick={() => removePrize(idx)} className="ml-auto text-red-400 hover:text-red-300 text-sm">Удалить</button>
              </div>
            ))}
          </div>
        </div>

        {/* Требования */}
        <div className="space-y-4 p-4 bg-black/20 rounded-xl border border-white/5">
          <h3 className="text-lg font-bold flex items-center gap-2"><span className="text-[#FFD700]">Требования</span></h3>

          <div className="space-y-3">
            <div>
              <label className="flex items-center gap-2 text-sm mb-2">
                <input
                  type="checkbox"
                  checked={!!formData.requirements?.telegram_channel_id}
                  onChange={e => {
                    const reqs = { ...formData.requirements }
                    if (e.target.checked) reqs.telegram_channel_id = ''
                    else delete reqs.telegram_channel_id
                    setFormData({ ...formData, requirements: reqs })
                  }}
                />
                Подписка на Telegram канал
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
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm"
                />
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm mb-2">
                <input
                  type="checkbox"
                  checked={!!formData.requirements?.min_friends}
                  onChange={e => {
                    const reqs = { ...formData.requirements }
                    if (e.target.checked) reqs.min_friends = 1
                    else delete reqs.min_friends
                    setFormData({ ...formData, requirements: reqs })
                  }}
                />
                Минимум друзей
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
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm"
                />
              )}
            </div>
          </div>
        </div>

        {/* Кнопка сохранения */}
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black font-bold rounded-xl shadow-lg hover:opacity-90 flex justify-center items-center gap-2"
        >
          {loading ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
    </div >
  )
}
