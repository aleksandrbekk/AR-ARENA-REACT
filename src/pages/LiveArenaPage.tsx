import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Tour1Drum } from '../components/live/Tour1Drum'

// MOCK DATA for testing
const MOCK_WINNERS_TOUR_1 = Array.from({ length: 20 }, (_, i) => ({
  ticket: 100000 + Math.floor(Math.random() * 900000),
  user: `User_${i + 1}`
}))

export function LiveArenaPage() {
  const { id } = useParams()


  // Game State
  const [currentStage, setCurrentStage] = useState<'intro' | 'tour1' | 'tour2' | 'semifinal' | 'final' | 'victory'>('intro')

  const handleStart = () => {
    setCurrentStage('tour1')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-hidden relative">
      {/* Dynamic Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#FFD700]/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#FFA500]/10 blur-[120px] rounded-full animate-pulse delay-1000" />
      </div>

      {/* Header */}
      <div className="relative pt-[60px] pb-4 px-4 text-center z-10">
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="inline-block"
        >
          <h1 className="text-3xl font-black italic tracking-tighter">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-[#FFA500]">
              AR ARENA
            </span>
            <span className="ml-2 text-white text-lg not-italic font-normal tracking-widest opacity-60">
              LIVE
            </span>
          </h1>
        </motion.div>
      </div>

      {/* Stage Indicator */}
      <div className="flex justify-center gap-1 mb-8 px-4 relative z-10">
        {['Tour 1', 'Tour 2', 'Semifinal', 'Final'].map((stage, idx) => {
          const stages = ['tour1', 'tour2', 'semifinal', 'final']
          const activeIdx = stages.indexOf(currentStage)
          const isActive = idx === activeIdx
          const isPassed = idx < activeIdx

          return (
            <div
              key={stage}
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${isActive ? 'bg-[#FFD700] shadow-[0_0_10px_#FFD700]' :
                isPassed ? 'bg-[#FFD700]/40' :
                  'bg-white/10'
                }`}
            />
          )
        })}
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 min-h-[60vh] flex flex-col items-center">
        <AnimatePresence mode="wait">

          {currentStage === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="text-center p-8"
            >
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-[#FFD700] to-[#FFA500] rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(255,215,0,0.4)]">
                <span className="text-4xl">🏆</span>
              </div>
              <h2 className="text-2xl font-bold mb-2">Grand Giveaway</h2>
              <p className="text-white/50 mb-8 max-w-xs mx-auto">
                150 participants are ready to fight for the jackpot!
              </p>

              <button
                onClick={handleStart}
                className="px-8 py-3 bg-[#FFD700] text-black font-bold rounded-xl shadow-[0_0_20px_rgba(255,215,0,0.4)] relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-white/30 translate-y-full group-hover:translate-y-0 transition-transform" />
                <span className="relative">START DRAW</span>
              </button>
            </motion.div>
          )}

          {currentStage === 'tour1' && (
            <motion.div
              key="tour1"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="w-full"
            >
              <div className="text-center mb-4">
                <h3 className="text-xl font-bold text-[#FFD700]">STAGE 1: QUALIFICATION</h3>
                <p className="text-xs text-white/50 uppercase tracking-widest">Finding 20 Lucky Tickets</p>
              </div>

              <Tour1Drum
                candidates={[]}
                winners={MOCK_WINNERS_TOUR_1}
                onComplete={() => {
                  setTimeout(() => setCurrentStage('tour2'), 2000)
                }}
              />
            </motion.div>
          )}

          {currentStage === 'tour2' && (
            <motion.div
              key="tour2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center pt-20"
            >
              <h2 className="text-2xl font-bold">Stage 2 Coming Soon...</h2>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Footer Controls (for dev) */}
      <div className="fixed bottom-4 left-0 right-0 p-4 text-center opacity-30 hover:opacity-100 transition-opacity">
        <div className="text-[10px] text-white/50">
          DEBUG: {id} | {currentStage}
        </div>
      </div>
    </div>
  )
}
