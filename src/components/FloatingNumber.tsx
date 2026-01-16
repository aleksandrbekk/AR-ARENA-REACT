import { useState } from 'react'
import { motion } from 'framer-motion'

interface Props {
  value: number
  id: number
  onComplete: (id: number) => void
}

export function FloatingNumber({ value, id, onComplete }: Props) {
  // Случайное смещение по X для естественности
  const [randomX] = useState(() => Math.random() * 80 - 40)

  return (
    <motion.div
      initial={{ opacity: 1, y: 0, x: randomX, scale: 0.5 }}
      animate={{ opacity: 0, y: -150, scale: 1.2 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      onAnimationComplete={() => onComplete(id)}
      className="absolute left-1/2 top-[40%] pointer-events-none z-50 text-4xl font-black"
      style={{
        background: 'linear-gradient(to bottom, #FFD700, #FFA500)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
      }}
    >
      +{value}
    </motion.div>
  )
}
