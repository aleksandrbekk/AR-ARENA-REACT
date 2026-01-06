import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

export function ParticleBackground() {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; duration: number }>>([])

  useEffect(() => {
    const count = 20
    const newParticles = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1, // 1-4px
      duration: Math.random() * 20 + 10 // 10-30s
    }))
    setParticles(newParticles)
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-[#FFD700]"
          initial={{ 
            opacity: 0, 
            x: `${p.x}%`, 
            y: `110%` 
          }}
          animate={{ 
            opacity: [0, 0.4, 0], 
            y: `-10%`,
            x: [`${p.x}%`, `${p.x + (Math.random() * 20 - 10)}%`] 
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: "linear",
            delay: Math.random() * 10
          }}
          style={{
            width: p.size,
            height: p.size,
            boxShadow: `0 0 ${p.size * 2}px #FFD700`
          }}
        />
      ))}
    </div>
  )
}
