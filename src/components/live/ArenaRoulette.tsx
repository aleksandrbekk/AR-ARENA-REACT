import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

interface Participant {
  id: number
  username: string
  avatar?: string
}

interface ArenaRouletteProps {
  participants: Participant[]
  winnerId: number
  onComplete?: () => void
}

export function ArenaRoulette({ participants, winnerId, onComplete }: ArenaRouletteProps) {
  const [offset, setOffset] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)

  // Создаем массив участников для бесконечной прокрутки
  const extendedParticipants = [
    ...participants,
    ...participants,
    ...participants,
    ...participants,
  ]

  useEffect(() => {
    // Начинаем крутить рулетку
    setIsSpinning(true)

    // Находим индекс победителя в расширенном массиве (берем средний)
    const winnerIndex = participants.findIndex(p => p.id === winnerId)
    const targetIndex = participants.length * 2 + winnerIndex

    // Вычисляем финальное смещение
    const itemWidth = 120 // ширина карточки + gap
    const finalOffset = -(targetIndex * itemWidth) + (window.innerWidth / 2) - 60

    // Запускаем анимацию
    setTimeout(() => {
      setOffset(finalOffset)
    }, 100)

    // Завершаем через 5 секунд
    setTimeout(() => {
      setIsSpinning(false)
      onComplete?.()
    }, 5000)
  }, [participants, winnerId, onComplete])

  const getInitials = (username: string) => {
    return username
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="relative w-full h-64 overflow-hidden">
      {/* Triangle Indicator */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20">
        <div
          className="w-0 h-0"
          style={{
            borderLeft: '20px solid transparent',
            borderRight: '20px solid transparent',
            borderTop: '30px solid #FFD700',
            filter: 'drop-shadow(0 0 10px #FFD700)',
          }}
        />
      </div>

      {/* Roulette Track */}
      <motion.div
        className="flex gap-4 py-20"
        animate={{
          x: offset,
        }}
        transition={{
          duration: isSpinning ? 4.5 : 0,
          ease: [0.25, 0.1, 0.25, 1], // Ease out
        }}
      >
        {extendedParticipants.map((participant, index) => {
          const isWinner = participant.id === winnerId && !isSpinning
          const isCenter = Math.abs(offset + index * 120 - window.innerWidth / 2 + 60) < 10

          return (
            <motion.div
              key={`${participant.id}-${index}`}
              className={`
                flex-shrink-0 w-28 h-28 rounded-xl border-2 transition-all duration-300
                ${
                  isWinner && isCenter
                    ? 'border-yellow-500 bg-yellow-500/20 shadow-lg shadow-yellow-500/50'
                    : 'border-zinc-700 bg-zinc-800/50'
                }
              `}
              animate={{
                scale: isWinner && isCenter ? 1.1 : 1,
              }}
            >
              <div className="flex flex-col items-center justify-center h-full p-2">
                {participant.avatar ? (
                  <img
                    src={participant.avatar}
                    alt={participant.username}
                    className="w-16 h-16 rounded-full mb-1"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 border border-zinc-600 flex items-center justify-center mb-1">
                    <span className="text-xl font-bold text-zinc-400">
                      {getInitials(participant.username)}
                    </span>
                  </div>
                )}
                <p className="text-xs text-zinc-300 text-center truncate w-full">
                  {participant.username.split(' ')[0]}
                </p>
              </div>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Gradient Fade Edges */}
      <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#0a0a0a] to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#0a0a0a] to-transparent pointer-events-none" />

      {/* Bottom Label */}
      {!isSpinning && (
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-yellow-500 font-bold tracking-widest text-lg">
            ПОБЕДИТЕЛЬ
          </p>
        </motion.div>
      )}
    </div>
  )
}
