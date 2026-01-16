import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface DrawStages {
  qualification: { selected_20: string[] }
  elimination: { finalists_5: string[]; eliminated_15: string[] }
  final: { winners: string[] }
}

interface GiveawayDrawAnimationProps {
  stages: DrawStages
  onComplete?: () => void
  autoPlay?: boolean
}

// SVG иконки
const StarIcon = ({ className = '' }: { className?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
)

const SparkleIcon = ({ className = '' }: { className?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
  </svg>
)

// Конфетти частица
const Confetti = ({ color, delay }: { color: string; delay: number }) => {
  const [randomValues] = useState(() => ({
    x: Math.random() * 100,
    rotate: Math.random() * 360,
    duration: 2 + Math.random() * 2,
    isRound: Math.random() > 0.5
  }))

  return (
    <motion.div
      initial={{ y: -20, x: `${randomValues.x}vw`, rotate: 0, opacity: 1 }}
      animate={{
        y: '100vh',
        rotate: randomValues.rotate + 720,
        opacity: 0
      }}
      transition={{
        duration: randomValues.duration,
        delay,
        ease: 'linear'
      }}
      className="fixed top-0 w-3 h-3 pointer-events-none z-50"
      style={{
        backgroundColor: color,
        borderRadius: randomValues.isRound ? '50%' : '2px'
      }}
    />
  )
}

// Рулетка прокрутки
const SpinningReel = ({
  items,
  selectedIndex,
  isSpinning,
  highlightColor = '#FFD700'
}: {
  items: string[]
  selectedIndex: number
  isSpinning: boolean
  highlightColor?: string
}) => {
  const [displayIndex, setDisplayIndex] = useState(0)

  useEffect(() => {
    if (!isSpinning) {
      setDisplayIndex(selectedIndex)
      return
    }

    // Быстрая прокрутка
    const interval = setInterval(() => {
      setDisplayIndex(i => (i + 1) % items.length)
    }, 50)

    // Замедление
    const slowDown = setTimeout(() => {
      clearInterval(interval)
      let currentSpeed = 50
      const slowInterval = setInterval(() => {
        currentSpeed += 20
        setDisplayIndex(i => (i + 1) % items.length)
        if (currentSpeed > 300) {
          clearInterval(slowInterval)
          setDisplayIndex(selectedIndex)
        }
      }, currentSpeed)
    }, 1500)

    return () => {
      clearInterval(interval)
      clearTimeout(slowDown)
    }
  }, [isSpinning, selectedIndex, items.length])

  const visibleItems = []
  for (let i = -2; i <= 2; i++) {
    const idx = (displayIndex + i + items.length) % items.length
    visibleItems.push({ item: items[idx], offset: i })
  }

  return (
    <div className="relative h-48 overflow-hidden rounded-xl bg-black/40 border border-white/10">
      {/* Градиент сверху */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-[#0a0a0a] to-transparent z-10 pointer-events-none" />

      {/* Градиент снизу */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#0a0a0a] to-transparent z-10 pointer-events-none" />

      {/* Центральная линия выбора */}
      <div
        className="absolute top-1/2 left-0 right-0 h-12 -translate-y-1/2 z-5 border-y-2"
        style={{ borderColor: highlightColor + '40', backgroundColor: highlightColor + '10' }}
      />

      {/* Элементы */}
      <div className="relative h-full flex flex-col items-center justify-center">
        <AnimatePresence mode="popLayout">
          {visibleItems.map(({ item, offset }) => (
            <motion.div
              key={`${item}-${offset}`}
              initial={{ opacity: 0, y: offset * 40 }}
              animate={{
                opacity: offset === 0 ? 1 : 0.3,
                y: offset * 40,
                scale: offset === 0 ? 1.1 : 0.9
              }}
              exit={{ opacity: 0 }}
              className={`absolute px-4 py-2 rounded-lg font-mono text-sm ${
                offset === 0 ? 'font-bold' : ''
              }`}
              style={{
                color: offset === 0 ? highlightColor : 'rgba(255,255,255,0.5)'
              }}
            >
              ...{item.slice(-6)}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

// Карточка участника
const ParticipantCard = ({
  id,
  place,
  isWinner,
  isEliminated,
  delay = 0
}: {
  id: string
  place?: number
  isWinner?: boolean
  isEliminated?: boolean
  delay?: number
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{
      opacity: isEliminated ? 0.3 : 1,
      scale: isEliminated ? 0.9 : 1,
      backgroundColor: isWinner
        ? 'rgba(255, 215, 0, 0.2)'
        : isEliminated
        ? 'rgba(255, 0, 0, 0.1)'
        : 'rgba(255, 255, 255, 0.05)'
    }}
    transition={{ delay, duration: 0.3 }}
    className={`relative px-3 py-2 rounded-lg border ${
      isWinner
        ? 'border-[#FFD700]/50'
        : isEliminated
        ? 'border-red-500/30'
        : 'border-white/10'
    }`}
  >
    {place && (
      <span
        className={`absolute -top-2 -left-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
          place === 1
            ? 'bg-[#FFD700] text-black'
            : place === 2
            ? 'bg-gray-400 text-black'
            : place === 3
            ? 'bg-orange-600 text-white'
            : 'bg-white/20 text-white'
        }`}
      >
        {place}
      </span>
    )}
    <span
      className={`font-mono text-xs ${
        isWinner ? 'text-[#FFD700]' : isEliminated ? 'text-red-400/50 line-through' : 'text-white/70'
      }`}
    >
      ...{id.slice(-4)}
    </span>
    {isEliminated && (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-red-500/50">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </motion.div>
    )}
  </motion.div>
)

export function GiveawayDrawAnimation({ stages, onComplete, autoPlay = false }: GiveawayDrawAnimationProps) {
  const [currentStage, setCurrentStage] = useState<'idle' | 'qualification' | 'elimination' | 'final' | 'complete'>('idle')
  const [isSpinning, setIsSpinning] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [selectedQualification, setSelectedQualification] = useState<string[]>([])
  const [selectedFinalists, setSelectedFinalists] = useState<string[]>([])
  const [revealedWinners, setRevealedWinners] = useState<number>(0)

  const confettiColors = ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4']

  const startAnimation = useCallback(() => {
    setCurrentStage('qualification')
    setIsSpinning(true)

    // Этап 1: Квалификация (3 секунды)
    setTimeout(() => {
      setIsSpinning(false)
      setSelectedQualification(stages.qualification.selected_20)

      // Этап 2: Отсев (2 секунды после)
      setTimeout(() => {
        setCurrentStage('elimination')
        setSelectedFinalists(stages.elimination.finalists_5)

        // Этап 3: Финал (2 секунды после)
        setTimeout(() => {
          setCurrentStage('final')

          // Последовательное раскрытие победителей
          stages.final.winners.forEach((_, idx) => {
            setTimeout(() => {
              setRevealedWinners(idx + 1)
              if (idx === 0) {
                setShowConfetti(true)
                setTimeout(() => setShowConfetti(false), 4000)
              }
              if (idx === stages.final.winners.length - 1) {
                setTimeout(() => {
                  setCurrentStage('complete')
                  onComplete?.()
                }, 1000)
              }
            }, idx * 1000)
          })
        }, 2000)
      }, 2000)
    }, 3000)
  }, [stages, onComplete])

  useEffect(() => {
    if (autoPlay) {
      const timer = setTimeout(startAnimation, 500)
      return () => clearTimeout(timer)
    }
  }, [autoPlay, startAnimation])

  return (
    <div className="relative">
      {/* Конфетти */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {Array.from({ length: 50 }).map((_, i) => (
            <Confetti key={i} color={confettiColors[i % confettiColors.length]} delay={i * 0.05} />
          ))}
        </div>
      )}

      {/* Idle state */}
      {currentStage === 'idle' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#FFD700]/20 to-[#FFA500]/10 flex items-center justify-center border border-[#FFD700]/20">
            <StarIcon className="text-[#FFD700] w-10 h-10" />
          </div>
          <h3 className="text-white font-bold text-lg mb-2">Анимация розыгрыша</h3>
          <p className="text-white/50 text-sm mb-4">Посмотрите как определялись победители</p>
          <button
            onClick={startAnimation}
            className="px-6 py-3 rounded-xl font-bold text-black"
            style={{
              background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
              boxShadow: '0 4px 20px rgba(255, 215, 0, 0.3)'
            }}
          >
            Запустить
          </button>
        </motion.div>
      )}

      {/* Квалификация */}
      {currentStage === 'qualification' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/20 text-blue-400 text-sm font-medium">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              Этап 1: Квалификация
            </div>
          </div>

          <SpinningReel
            items={stages.qualification.selected_20}
            selectedIndex={Math.floor(stages.qualification.selected_20.length / 2)}
            isSpinning={isSpinning}
            highlightColor="#3B82F6"
          />

          <p className="text-center text-white/50 text-sm">
            Выбираем 20 случайных участников...
          </p>
        </motion.div>
      )}

      {/* Отсев */}
      {currentStage === 'elimination' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 text-red-400 text-sm font-medium">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
              Этап 2: Отсев
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {selectedQualification.map((id, idx) => (
              <ParticipantCard
                key={id}
                id={id}
                isEliminated={!selectedFinalists.includes(id)}
                delay={idx * 0.1}
              />
            ))}
          </div>

          <p className="text-center text-white/50 text-sm">
            Остаются только 5 финалистов!
          </p>
        </motion.div>
      )}

      {/* Финал */}
      {(currentStage === 'final' || currentStage === 'complete') && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFD700]/20 text-[#FFD700] text-sm font-medium">
              <SparkleIcon />
              Этап 3: Победители
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {stages.final.winners.map((id, idx) => (
              <motion.div
                key={id}
                initial={{ opacity: 0, scale: 0, y: 20 }}
                animate={{
                  opacity: idx < revealedWinners ? 1 : 0,
                  scale: idx < revealedWinners ? 1 : 0,
                  y: idx < revealedWinners ? 0 : 20
                }}
                transition={{ type: 'spring', bounce: 0.5 }}
              >
                <ParticipantCard
                  id={id}
                  place={idx + 1}
                  isWinner={true}
                />
              </motion.div>
            ))}
          </div>

          {currentStage === 'complete' && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-[#FFD700] font-bold mt-4"
            >
              Поздравляем победителей!
            </motion.p>
          )}
        </motion.div>
      )}

      {/* Прогресс */}
      {currentStage !== 'idle' && currentStage !== 'complete' && (
        <div className="flex justify-center gap-2 mt-6">
          {['qualification', 'elimination', 'final'].map((stage, idx) => (
            <div
              key={stage}
              className={`w-2 h-2 rounded-full transition-colors ${
                currentStage === stage
                  ? 'bg-[#FFD700]'
                  : ['qualification', 'elimination', 'final'].indexOf(currentStage) > idx
                  ? 'bg-[#FFD700]/50'
                  : 'bg-white/20'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
