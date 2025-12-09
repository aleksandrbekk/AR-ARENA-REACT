import { useState, useEffect } from 'react'
import { Layout } from '../components/layout/Layout'
import { GiveawayCard } from '../components/giveaways/GiveawayCard'
import { supabase } from '../lib/supabase'
import type { Giveaway } from '../types'
import { Gift, Loader2 } from 'lucide-react'

type TabType = 'active' | 'completed'

export function GiveawaysPage() {
  const [tab, setTab] = useState<TabType>('active')
  const [giveaways, setGiveaways] = useState<Giveaway[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGiveaways()
  }, [tab])

  const fetchGiveaways = async () => {
    setLoading(true)
    const statuses = tab === 'active' ? ['active'] : ['completed']
    
    const { data } = await supabase
      .from('giveaways')
      .select('*')
      .in('status', statuses)
      .order('end_date', { ascending: tab === 'active' })

    if (data) setGiveaways(data)
    setLoading(false)
  }

  return (
    <Layout>
      <div className="min-h-screen bg-[#0a0a0a] pt-[60px] pb-24 px-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFD700]/20 to-[#FFA500]/10 flex items-center justify-center">
            <Gift className="w-5 h-5 text-[#FFD700]" />
          </div>
          <h1 className="text-2xl font-bold text-white">Розыгрыши</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('active')}
            className={`flex-1 py-3 rounded-xl font-medium text-sm transition-all ${
              tab === 'active'
                ? 'bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/30'
                : 'bg-white/5 text-white/50 hover:bg-white/10'
            }`}
          >
            Активные
          </button>
          <button
            onClick={() => setTab('completed')}
            className={`flex-1 py-3 rounded-xl font-medium text-sm transition-all ${
              tab === 'completed'
                ? 'bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/30'
                : 'bg-white/5 text-white/50 hover:bg-white/10'
            }`}
          >
            Завершённые
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 text-[#FFD700] animate-spin" />
          </div>
        ) : giveaways.length === 0 ? (
          <div className="text-center py-20">
            <Gift className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/40">
              {tab === 'active' ? 'Нет активных розыгрышей' : 'Нет завершённых розыгрышей'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {giveaways.map(g => (
              <GiveawayCard key={g.id} giveaway={g} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
