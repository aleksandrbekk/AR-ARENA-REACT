import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

interface ArenaBattleProps {
  bullWins: boolean
  onComplete?: () => void
}

// SVG Bull Icon - Angular, powerful style
function BullIcon({ className = '', isAttacking = false }: { className?: string; isAttacking?: boolean }) {
  return (
    <motion.svg
      viewBox="0 0 200 200"
      className={className}
      animate={
        isAttacking
          ? {
              scale: [1, 1.3, 1],
              filter: [
                'drop-shadow(0 0 0px #FFD700)',
                'drop-shadow(0 0 30px #FFD700)',
                'drop-shadow(0 0 0px #FFD700)',
              ],
            }
          : {}
      }
      transition={{ duration: 0.5 }}
    >
      {/* Bull Head */}
      <path
        d="M 100 60 L 120 100 L 100 140 L 80 100 Z"
        fill="url(#bullGradient)"
        stroke="#FFD700"
        strokeWidth="3"
      />

      {/* Horns */}
      <path
        d="M 70 90 L 50 60 L 60 85"
        fill="none"
        stroke="#FFD700"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M 130 90 L 150 60 L 140 85"
        fill="none"
        stroke="#FFD700"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* Eyes */}
      <circle cx="85" cy="95" r="5" fill="#FFD700" />
      <circle cx="115" cy="95" r="5" fill="#FFD700" />

      {/* Nose Ring */}
      <circle cx="100" cy="120" r="8" fill="none" stroke="#FFA500" strokeWidth="3" />

      {/* Powerful Body Lines */}
      <path
        d="M 100 140 L 100 160"
        stroke="#FFD700"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M 80 150 L 60 170"
        stroke="#FFD700"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M 120 150 L 140 170"
        stroke="#FFD700"
        strokeWidth="5"
        strokeLinecap="round"
      />

      <defs>
        <linearGradient id="bullGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#FFA500" />
        </linearGradient>
      </defs>
    </motion.svg>
  )
}

// SVG Bear Icon - Aggressive, angular style
function BearIcon({ className = '', isAttacking = false }: { className?: string; isAttacking?: boolean }) {
  return (
    <motion.svg
      viewBox="0 0 200 200"
      className={className}
      animate={
        isAttacking
          ? {
              scale: [1, 1.3, 1],
              filter: [
                'drop-shadow(0 0 0px #DC2626)',
                'drop-shadow(0 0 30px #DC2626)',
                'drop-shadow(0 0 0px #DC2626)',
              ],
            }
          : {}
      }
      transition={{ duration: 0.5 }}
    >
      {/* Bear Head */}
      <path
        d="M 100 70 L 130 100 L 120 140 L 80 140 L 70 100 Z"
        fill="url(#bearGradient)"
        stroke="#DC2626"
        strokeWidth="3"
      />

      {/* Ears */}
      <circle cx="75" cy="65" r="15" fill="#DC2626" stroke="#B91C1C" strokeWidth="2" />
      <circle cx="125" cy="65" r="15" fill="#DC2626" stroke="#B91C1C" strokeWidth="2" />

      {/* Eyes - Aggressive */}
      <path
        d="M 80 95 L 90 90 L 85 100 Z"
        fill="#DC2626"
      />
      <path
        d="M 120 95 L 110 90 L 115 100 Z"
        fill="#DC2626"
      />

      {/* Fangs */}
      <path
        d="M 90 125 L 85 135 L 95 130 Z"
        fill="#DC2626"
      />
      <path
        d="M 110 125 L 115 135 L 105 130 Z"
        fill="#DC2626"
      />

      {/* Claws */}
      <path
        d="M 70 140 L 50 165"
        stroke="#DC2626"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M 75 145 L 60 170"
        stroke="#DC2626"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M 130 140 L 150 165"
        stroke="#DC2626"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M 125 145 L 140 170"
        stroke="#DC2626"
        strokeWidth="4"
        strokeLinecap="round"
      />

      <defs>
        <linearGradient id="bearGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#DC2626" />
          <stop offset="100%" stopColor="#B91C1C" />
        </linearGradient>
      </defs>
    </motion.svg>
  )
}

export function ArenaBattle({ bullWins, onComplete }: ArenaBattleProps) {
  const [phase, setPhase] = useState<'idle' | 'bullAttack' | 'bearAttack' | 'winner'>('idle')

  useEffect(() => {
    // Sequence of battle animations
    const sequence = async () => {
      await new Promise(resolve => setTimeout(resolve, 500))
      setPhase('bullAttack')

      await new Promise(resolve => setTimeout(resolve, 800))
      setPhase('bearAttack')

      await new Promise(resolve => setTimeout(resolve, 800))
      setPhase('bullAttack')

      await new Promise(resolve => setTimeout(resolve, 800))
      setPhase('winner')

      await new Promise(resolve => setTimeout(resolve, 1000))
      onComplete?.()
    }

    sequence()
  }, [onComplete])

  return (
    <div className="relative w-full h-full flex items-center justify-center py-12">
      {/* Battle Arena Background */}
      <div className="absolute inset-0 bg-gradient-radial from-zinc-800/50 to-zinc-900/90" />

      {/* Combat Grid Effect */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(to right, #FFD700 1px, transparent 1px),
            linear-gradient(to bottom, #FFD700 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Battle Participants */}
      <div className="relative z-10 flex items-center justify-around w-full max-w-2xl px-8">
        {/* BULL */}
        <motion.div
          className="flex flex-col items-center"
          animate={{
            opacity: phase === 'winner' && !bullWins ? 0.3 : 1,
            scale: phase === 'winner' && bullWins ? 1.2 : 1,
          }}
        >
          <BullIcon
            className="w-32 h-32 md:w-40 md:h-40"
            isAttacking={phase === 'bullAttack'}
          />
          <div className="mt-4 text-center">
            <p className="text-yellow-500 font-bold tracking-widest text-lg">БЫК</p>
            {phase === 'winner' && bullWins && (
              <motion.p
                className="text-yellow-500 text-sm mt-1"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                ПОБЕДИТЕЛЬ
              </motion.p>
            )}
          </div>
        </motion.div>

        {/* VS */}
        <div className="text-4xl md:text-6xl font-bold text-zinc-600 tracking-widest">
          VS
        </div>

        {/* BEAR */}
        <motion.div
          className="flex flex-col items-center"
          animate={{
            opacity: phase === 'winner' && bullWins ? 0.3 : 1,
            scale: phase === 'winner' && !bullWins ? 1.2 : 1,
          }}
        >
          <BearIcon
            className="w-32 h-32 md:w-40 md:h-40"
            isAttacking={phase === 'bearAttack'}
          />
          <div className="mt-4 text-center">
            <p className="text-red-600 font-bold tracking-widest text-lg">МЕДВЕДЬ</p>
            {phase === 'winner' && !bullWins && (
              <motion.p
                className="text-red-600 text-sm mt-1"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                ПОБЕДИТЕЛЬ
              </motion.p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Energy Wave Effect During Attacks */}
      {(phase === 'bullAttack' || phase === 'bearAttack') && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.5, 0] }}
          transition={{ duration: 0.5 }}
        >
          <div
            className={`absolute inset-0 ${
              phase === 'bullAttack'
                ? 'bg-yellow-500/10'
                : 'bg-red-600/10'
            }`}
          />
        </motion.div>
      )}
    </div>
  )
}
