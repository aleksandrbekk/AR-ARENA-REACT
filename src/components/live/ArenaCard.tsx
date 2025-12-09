import { motion } from 'framer-motion'
import { useState } from 'react'

interface ArenaCardProps {
  username: string
  avatar?: string
  isFlipped?: boolean
  delay?: number
}

export function ArenaCard({ username, avatar, isFlipped = false, delay = 0 }: ArenaCardProps) {
  const [showBack, setShowBack] = useState(isFlipped)

  // Инициалы для fallback
  const initials = username
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <motion.div
      className="relative w-full aspect-[3/4] max-w-[200px]"
      style={{ perspective: '1000px' }}
      initial={{ rotateY: isFlipped ? 180 : 0 }}
      animate={{ rotateY: showBack ? 180 : 0 }}
      transition={{ duration: 0.6, delay }}
      onAnimationComplete={() => {
        if (isFlipped) setShowBack(true)
      }}
    >
      {/* Front Side */}
      <div
        className="absolute inset-0 rounded-xl overflow-hidden"
        style={{
          backfaceVisibility: 'hidden',
          transform: 'rotateY(0deg)',
        }}
      >
        <div className="w-full h-full bg-zinc-900/80 backdrop-blur-md border-2 border-transparent relative">
          {/* Gradient Border Effect */}
          <div
            className="absolute inset-0 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, #FFD700, #FFA500, #FFD700)',
              padding: '2px',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
            }}
          />

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center justify-center h-full p-4">
            {/* Avatar or Initials */}
            {avatar ? (
              <img
                src={avatar}
                alt={username}
                className="w-24 h-24 rounded-full border-2 border-yellow-500/30 mb-4"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/30 flex items-center justify-center mb-4">
                <span className="text-3xl font-bold text-yellow-500 tracking-wider">
                  {initials}
                </span>
              </div>
            )}

            {/* Username */}
            <div className="text-center">
              <p className="text-white font-semibold text-sm tracking-wide line-clamp-2">
                {username}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Back Side */}
      <div
        className="absolute inset-0 rounded-xl overflow-hidden"
        style={{
          backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
        }}
      >
        <div className="w-full h-full bg-zinc-900 relative overflow-hidden">
          {/* Geometric Pattern */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `
                repeating-linear-gradient(
                  45deg,
                  #FFD700 0px,
                  #FFD700 2px,
                  transparent 2px,
                  transparent 10px
                ),
                repeating-linear-gradient(
                  -45deg,
                  #FFA500 0px,
                  #FFA500 2px,
                  transparent 2px,
                  transparent 10px
                )
              `,
            }}
          />

          {/* AR Logo */}
          <div className="relative z-10 flex items-center justify-center h-full">
            <div className="text-6xl font-bold tracking-widest bg-gradient-to-b from-yellow-500 to-orange-500 bg-clip-text text-transparent">
              AR
            </div>
          </div>

          {/* Border */}
          <div className="absolute inset-0 border-2 border-yellow-500/50 rounded-xl pointer-events-none" />
        </div>
      </div>
    </motion.div>
  )
}
