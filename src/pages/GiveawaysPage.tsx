import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { GiveawayCard } from '../components/giveaways/GiveawayCard'
import { useGiveaways } from '../hooks/useGiveaways'
import { Gift, Loader2, AlertCircle } from 'lucide-react'
import { HowToPlayButton } from '../components/HowToPlayButton'

type TabType = 'active' | 'completed'

export function GiveawaysPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<TabType>('active')
  const { giveaways, loading, error, getGiveaways } = useGiveaways()

  useEffect(() => {
    getGiveaways(tab)
  }, [tab, getGiveaways])

  return (
    <Layout>
      <div className="min-h-screen bg-[#0a0a0a] pt-[60px] pb-24 px-4 relative overflow-hidden">
        {/* Background Vignette */}
        <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-800/10 via-[#0a0a0a] to-[#0a0a0a]" />

        {/* Content Container */}
        <div className="relative z-10">
          {/* TEMP BUTTONS FOR TESTING */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => navigate('/giveaway/new-design')}
              className="flex-1 py-3 bg-emerald-500/20 border border-emerald-500 text-emerald-400 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-emerald-500/30 transition-colors"
            >
              [NEW] Premium Design
            </button>
            <button
              onClick={() => navigate('/giveaway/premium-test')}
              className="flex-1 py-3 bg-red-500/20 border border-red-500 text-red-400 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-red-500/30 transition-colors"
            >
              [OLD] Test
            </button>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFD700]/20 to-[#FFA500]/10 flex items-center justify-center border border-[#FFD700]/10">
                <Gift className="w-5 h-5 text-[#FFD700]" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-wide">Розыгрыши</h1>
            </div>
            <HowToPlayButton variant="icon" />
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 p-1 bg-zinc-900/50 backdrop-blur-md rounded-2xl border border-white/5">
            <button
              onClick={() => setTab('active')}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${tab === 'active'
                ? 'bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black shadow-[0_0_15px_rgba(255,215,0,0.3)]'
                : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
            >
              Активные
            </button>
            <button
              onClick={() => setTab('completed')}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${tab === 'completed'
                ? 'bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black shadow-[0_0_15px_rgba(255,215,0,0.3)]'
                : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
            >
              Завершённые
            </button>
          </div>

          {/* Error State */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-500">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-8 h-8 text-[#FFD700] animate-spin" />
            </div>
          ) : giveaways.length === 0 ? (
            <div className="text-center py-20 bg-zinc-900/30 rounded-2xl border border-dashed border-white/10">
              <Gift className="w-12 h-12 text-white/10 mx-auto mb-3" />
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
      </div>
    </Layout>
  )
}
