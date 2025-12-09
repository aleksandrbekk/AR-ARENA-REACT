import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import type { Giveaway } from '../../types'
import { Plus, Edit, Trash, Save, X, Trophy, Calendar, DollarSign, Users } from 'lucide-react'

export function GiveawayManager() {
  const [mode, setMode] = useState<'list' | 'edit'>('list')
  const [giveaways, setGiveaways] = useState<Giveaway[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

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

  const handleGenerateResults = async (giveawayId: number) => {
    if (!confirm('⚠️ ВНИМАНИЕ!\n\nЭто действие НЕОБРАТИМО.\nБудут определены победители и розыгрыш будет завершён.\n\nПродолжить?')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-giveaway-result`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ giveaway_id: giveawayId })
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Ошибка генерации')
      }

      alert(`✅ Розыгрыш завершён!\n\nУчастников: ${data.total_participants}\nБилетов: ${data.total_tickets}\n\n🏆 Победители определены!`)
      await fetchGiveaways()
    } catch (error: any) {
      alert('❌ Ошибка: ' + error.message)
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
            <Plus size={20} /> Создать
          </button>
        </div>

        <div className="grid gap-4">
          {giveaways.map(g => (
            <div key={g.id} className="p-4 bg-zinc-800/50 border border-white/10 rounded-xl">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      g.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      g.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {getStatusLabel(g.status)}
                    </span>
                    <h3 className="font-bold">{g.title}</h3>
                  </div>
                  <p className="text-sm text-white/50">{g.subtitle}</p>
                  <div className="text-xs text-white/30 mt-1 flex gap-4">
                    <span>ID: {g.id}</span>
                    <span>Конец: {new Date(g.end_date).toLocaleDateString('ru-RU')}</span>
                    <span>Джекпот: {g.jackpot_current_amount}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {g.status === 'active' && (
                    <button 
                      onClick={() => handleGenerateResults(g.id)}
                      disabled={loading}
                      className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors text-xs font-medium flex items-center gap-1"
                    >
                      🛑 STOP & GENERATE
                    </button>
                  )}
                  <button 
                    onClick={() => handleEdit(g)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Edit size={18} className="text-blue-400" />
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
          <X size={24} />
        </button>
      </div>

      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Основная информация */}
        <div className="space-y-4 p-4 bg-black/20 rounded-xl border border-white/5">
          <h3 className="text-lg font-bold flex items-center gap-2"><Trophy size={18} className="text-[#FFD700]" /> Основная информация</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-white/50 mb-1">Тип</label>
              <select 
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value as any})}
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
                onChange={e => setFormData({...formData, status: e.target.value as any})}
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
              onChange={e => setFormData({...formData, title: e.target.value})}
              className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white"
            />
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1">Подзаголовок</label>
            <input 
              type="text" 
              value={formData.subtitle || ''}
              onChange={e => setFormData({...formData, subtitle: e.target.value})}
              className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-white/50 mb-1">Цена билета</label>
              <input 
                type="number" 
                value={formData.price}
                onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Валюта</label>
              <select 
                value={formData.currency}
                onChange={e => setFormData({...formData, currency: e.target.value as any})}
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
          <h3 className="text-lg font-bold flex items-center gap-2"><Calendar size={18} className="text-[#FFD700]" /> Даты</h3>
          
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs text-white/50 mb-1">Дата окончания</label>
              <input 
                type="datetime-local" 
                value={formData.end_date ? new Date(formData.end_date).toISOString().slice(0, 16) : ''}
                onChange={e => setFormData({...formData, end_date: new Date(e.target.value).toISOString()})}
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Дата розыгрыша</label>
              <input 
                type="datetime-local" 
                value={formData.draw_date ? new Date(formData.draw_date).toISOString().slice(0, 16) : ''}
                onChange={e => setFormData({...formData, draw_date: new Date(e.target.value).toISOString()})}
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white"
              />
            </div>
          </div>
        </div>

        {/* Призы */}
        <div className="space-y-4 p-4 bg-black/20 rounded-xl border border-white/5">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold flex items-center gap-2"><DollarSign size={18} className="text-[#FFD700]" /> Призы</h3>
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
                <button onClick={() => removePrize(idx)} className="ml-auto text-red-400 hover:text-red-300">
                  <Trash size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Требования */}
        <div className="space-y-4 p-4 bg-black/20 rounded-xl border border-white/5">
          <h3 className="text-lg font-bold flex items-center gap-2"><Users size={18} className="text-[#FFD700]" /> Требования</h3>
          
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
          {loading ? 'Сохранение...' : <><Save size={20} /> Сохранить</>}
        </button>
      </div>
    </div>
  )
}
