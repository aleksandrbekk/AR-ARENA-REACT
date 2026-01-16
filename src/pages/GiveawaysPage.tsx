import { useState, useEffect } from 'react'
import { Layout } from '../components/layout/Layout'
import { GiveawayCard } from '../components/giveaways/GiveawayCard'
import { useGiveaways } from '../hooks/useGiveaways'
import { Loader2, AlertCircle } from 'lucide-react'
import { HowToPlayButton } from '../components/HowToPlayButton'

type TabType = 'active' | 'completed'

export function GiveawaysPage() {
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
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <img src="/icons/Jackpot.png" alt="" className="w-10 h-10" />
              <h1 className="text-2xl font-bold text-white tracking-wide">Розыгрыши</h1>
            </div>
            <HowToPlayButton variant="icon" />
          </div>

          {/* Tabs - Luxury Gold Glass Style */}
          <div className="flex gap-2 mb-6 p-1.5 bg-black/40 backdrop-blur-xl rounded-2xl border border-[#B8860B]/20">
            <button
              onClick={() => setTab('active')}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${tab === 'active'
                ? 'bg-gradient-to-b from-[#B8860B]/30 to-[#8B6914]/20 text-[#FFD700] border border-[#B8860B]/40 shadow-[inset_0_1px_0_rgba(255,215,0,0.2)]'
                : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                }`}
            >
              Активные
            </button>
            <button
              onClick={() => setTab('completed')}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${tab === 'completed'
                ? 'bg-gradient-to-b from-[#B8860B]/30 to-[#8B6914]/20 text-[#FFD700] border border-[#B8860B]/40 shadow-[inset_0_1px_0_rgba(255,215,0,0.2)]'
                : 'text-white/40 hover:text-white/60 hover:bg-white/5'
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
              <img src="/icons/Jackpot.png" alt="" className="w-12 h-12 mx-auto mb-3 opacity-30" />
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
