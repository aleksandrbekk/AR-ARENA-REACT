import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArenaRoulette } from '../components/live/ArenaRoulette'
import { ArenaCard } from '../components/live/ArenaCard'
import { ArenaBattle } from '../components/live/ArenaBattle'

// MOCK DATA
const MOCK_PARTICIPANTS = Array.from({ length: 50 }, (_, i) => ({
  id: i + 1,
  username: `User ${i + 1}`,
  avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`
}))

export function LiveArenaPage() {

  const [stage, setStage] = useState<'intro' | 'tour1' | 'tour2' | 'semifinal' | 'final' | 'victory'>('intro')



  // Tour 2 State
  const [tour2Cards] = useState(MOCK_PARTICIPANTS.slice(0, 20))
  const [flippedCards] = useState<number[]>([])

  const handleStart = () => {
    setStage('tour1')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-hidden relative flex flex-col">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-[#FFD700]/5 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-[#FFA500]/5 blur-[150px] rounded-full" />
      </div>

      {/* Header */}
      <header className="relative z-10 p-6 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#FFD700] to-[#FFA500] rounded-xl flex items-center justify-center font-black text-black text-xl">
            AR
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none">ARENA LIVE</h1>
            <p className="text-[10px] text-white/50 uppercase tracking-widest">{stage.replace('tour', 'STAGE ').toUpperCase()}</p>
          </div>
        </div>
        <div className="flex gap-1">
          {['tour1', 'tour2', 'semifinal', 'final'].map((s) => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full ${stage === s || ['tour1', 'tour2', 'semifinal', 'final'].indexOf(stage) > ['tour1', 'tour2', 'semifinal', 'final'].indexOf(s)
                ? 'bg-[#FFD700]'
                : 'bg-white/10'
                }`}
            />
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10 flex flex-col items-center justify-center p-4">
        <AnimatePresence mode="wait">

          {/* INTRO */}
          {stage === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="text-center"
            >
              <h1 className="text-4xl md:text-6xl font-black mb-6">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-[#FFA500]">
                  GIVEAWAY
                </span>
                <br />
                <span className="text-white text-2xl md:text-4xl font-light tracking-widest">
                  EVENT
                </span>
              </h1>
              <button
                onClick={handleStart}
                className="px-10 py-4 bg-[#FFD700] text-black font-bold rounded-2xl text-xl hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,215,0,0.3)]"
              >
                START BROADCAST
              </button>
            </motion.div>
          )}

          {/* TOUR 1: ROULETTE */}
          {stage === 'tour1' && (
            <motion.div
              key="tour1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-4xl"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-[#FFD700] mb-2">QUALIFICATION</h2>
                <p className="text-white/50">Spinning for luck...</p>
              </div>

              {/* Using Existing ArenaRoulette Component */}
              <ArenaRoulette
                participants={MOCK_PARTICIPANTS}
                winnerId={42}
                onComplete={() => setTimeout(() => setStage('tour2'), 3000)}
              />
            </motion.div>
          )}

          {/* TOUR 2: CARDS */}
          {stage === 'tour2' && (
            <motion.div
              key="tour2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-5xl"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-[#FFD700] mb-2">ELIMINATION</h2>
                <p className="text-white/50">Only 5 will remain</p>
              </div>

              <div className="grid grid-cols-4 md:grid-cols-5 gap-4">
                {tour2Cards.map((p, idx) => (
                  <ArenaCard
                    key={p.id}
                    username={p.username}
                    avatar={p.avatar}
                    isFlipped={flippedCards.includes(p.id)}
                    delay={idx * 0.05}
                  />
                ))}
              </div>

              <div className="mt-8 text-center">
                <button
                  onClick={() => setStage('final')}
                  className="px-6 py-2 border border-white/20 rounded-full hover:bg-white/10"
                >
                  Skip to Final (Dev)
                </button>
              </div>
            </motion.div>
          )}

          {/* FINAL: BATTLE */}
          {stage === 'final' && (
            <motion.div
              key="final"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full"
            >
              {/* Using Existing ArenaBattle Component */}
              <ArenaBattle
                bullWins={true}
                onComplete={() => setStage('victory')}
              />
            </motion.div>
          )}

          {/* VICTORY */}
          {stage === 'victory' && (
            <motion.div
              key="victory"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="text-6xl mb-4">👑</div>
              <h1 className="text-4xl font-bold text-[#FFD700]">WINNER!</h1>
              <p className="text-2xl mt-4">User 42</p>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  )
}
