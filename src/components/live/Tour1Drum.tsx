import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'

interface Winner {
  ticket: number
  user: string
  avatar?: string
}

interface Tour1DrumProps {
  candidates: { ticket: number; user: string; avatar?: string }[]
  winners: Winner[]
  onComplete: () => void
  // Sound callbacks
  onTick?: () => void        // Tick during spin
  onWinnerFound?: () => void // Impact when winner found
  onAllFound?: () => void    // Victory sound at end
}

// Градиентные цвета для аватаров-плейсхолдеров
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
  'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
  'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
  'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
  'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
  'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
  'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
  'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
]

export function Tour1Drum({ winners, onComplete, onTick, onWinnerFound, onAllFound }: Tour1DrumProps) {
  const [currentTicket, setCurrentTicket] = useState<number>(0)
  const [foundWinners, setFoundWinners] = useState<Winner[]>([])
  const [isSpinning, setIsSpinning] = useState(true)
  const [lastFoundIndex, setLastFoundIndex] = useState<number>(-1)
  const [showingWinner, setShowingWinner] = useState(false)

  // Simulation of finding winners one by one
  useEffect(() => {
    if (!isSpinning) return

    let currentIndex = 0
    const totalWinners = winners.length
    let isPaused = false
    let tickCount = 0

    const spinInterval = setInterval(() => {
      // Random ticket noise — только когда не показываем победителя
      if (!isPaused) {
        setCurrentTicket(Math.floor(Math.random() * 999999))
        // Play tick sound every 3rd tick (150ms)
        tickCount++
        if (tickCount % 3 === 0 && onTick) {
          onTick()
        }
      }
    }, 50)

    const findNextWinner = () => {
      if (currentIndex >= totalWinners) {
        clearInterval(spinInterval)
        setIsSpinning(false)
        // Показываем последний найденный билет
        if (winners.length > 0) {
          setCurrentTicket(winners[winners.length - 1].ticket)
        }
        // Victory sound!
        onAllFound?.()
        onComplete()
        return
      }

      const winner = winners[currentIndex]

      // Пауза на барабане — показываем найденный билет
      isPaused = true
      setShowingWinner(true)
      setCurrentTicket(winner.ticket)

      setFoundWinners(prev => [...prev, winner])
      setLastFoundIndex(currentIndex)

      // Haptic & sound feedback
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('medium')
      }
      onWinnerFound?.()

      // Small confetti burst for each winner
      confetti({
        particleCount: 25,
        spread: 40,
        origin: { y: 0.7 },
        colors: ['#FFD700', '#FFA500', '#22c55e']
      })

      currentIndex++

      // Через 400ms возобновляем вращение
      setTimeout(() => {
        isPaused = false
        setShowingWinner(false)
        // Следующий победитель через 400ms после возобновления
        setTimeout(findNextWinner, 400)
      }, 400)
    }

    // Стартуем поиск первого победителя через 500ms
    const startTimeout = setTimeout(findNextWinner, 500)

    return () => {
      clearInterval(spinInterval)
      clearTimeout(startTimeout)
    }
  }, [isSpinning, winners, onComplete, onTick, onWinnerFound, onAllFound])

  // Generate gradient from user name
  const getAvatarGradient = (name: string) => {
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length]
  }


  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto px-4">
      {/* Main Drum Display */}
      <div className="relative mb-6">
        {/* Outer glow */}
        <div className="absolute -inset-2 bg-gradient-to-r from-[#FFD700]/20 via-[#FFA500]/30 to-[#FFD700]/20 rounded-3xl blur-xl" />

        {/* Border gradient */}
        <div className="relative p-[2px] rounded-2xl bg-gradient-to-b from-[#FFD700] via-[#FFA500] to-[#FFD700]/50">
          <div className="bg-[#0a0a0a] rounded-2xl overflow-hidden px-10 py-6 text-center relative">
            {/* Label */}
            <div className="text-xs text-[#FFD700]/70 uppercase tracking-[0.3em] mb-3 font-medium">
              Поиск билета
            </div>

            {/* Ticket number */}
            <div
              className={`text-5xl font-black font-mono tracking-[0.15em] relative z-10 transition-all duration-200 ${
                showingWinner
                  ? 'text-[#22c55e] scale-110'
                  : 'text-white'
              }`}
              style={showingWinner ? { textShadow: '0 0 20px rgba(34, 197, 94, 0.8)' } : {}}
            >
              {currentTicket.toString().padStart(6, '0')}
            </div>

            {/* Scanline effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#FFD700]/10 to-transparent animate-scan pointer-events-none" />

            {/* Corner decorations */}
            <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-[#FFD700]/40" />
            <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-[#FFD700]/40" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-[#FFD700]/40" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-[#FFD700]/40" />
          </div>
        </div>
      </div>

      {/* Winners Header */}
      <div className="w-full flex items-center gap-4 mb-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <span className="text-sm font-bold text-[#FFD700] uppercase tracking-wider">
            Прошли
          </span>
          <span className="text-white/60 font-mono text-sm">
            {foundWinners.length}/{winners.length}
          </span>
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>

      {/* Winners Grid - Responsive without fixed height */}
      <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        <AnimatePresence mode="popLayout">
          {foundWinners.map((w, i) => {
            const isNew = i === lastFoundIndex

            return (
              <motion.div
                key={w.ticket}
                layout
                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: 0,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 25,
                  delay: isNew ? 0 : 0.02 * i
                }}
                className={`
                  relative overflow-hidden rounded-xl
                  ${isNew ? 'ring-2 ring-[#FFD700] ring-offset-2 ring-offset-[#0a0a0a]' : ''}
                `}
              >
                {/* Card background with subtle gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/90 to-zinc-900/90 backdrop-blur-sm" />

                {/* Shine effect for new card */}
                {isNew && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-[#FFD700]/20 to-transparent"
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                )}

                {/* Content - Compact 2-row layout */}
                <div className="relative p-2.5">
                  {/* Row 1: Avatar + Ticket + Check */}
                  <div className="flex items-center gap-2 mb-1.5">
                    {/* Small Avatar */}
                    <div className="relative w-7 h-7 rounded-full p-[1.5px] bg-gradient-to-br from-[#FFD700]/60 to-[#FFA500]/40 flex-shrink-0">
                      {w.avatar ? (
                        <img
                          src={w.avatar}
                          alt={w.user}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full rounded-full flex items-center justify-center text-white font-bold text-[10px] shadow-inner"
                          style={{ background: getAvatarGradient(w.user) }}
                        >
                          {w.user.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Ticket number */}
                    <div className="flex-1 font-mono text-[#FFD700] font-bold text-xs tracking-wide">
                      #{w.ticket.toString().padStart(6, '0')}
                    </div>

                    {/* Check mark */}
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                      <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>

                  {/* Row 2: Player name */}
                  <div className="text-white font-semibold text-sm truncate pl-0.5" title={w.user}>
                    {w.user}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Empty state placeholder */}
      {foundWinners.length === 0 && (
        <motion.div
          className="w-full py-12 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-zinc-900/50 border border-white/10">
            <motion.div
              className="w-2 h-2 rounded-full bg-[#FFD700]"
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <span className="text-white/50 text-sm font-medium">Поиск победителей...</span>
          </div>
        </motion.div>
      )}

      {/* Completion message */}
      {!isSpinning && foundWinners.length > 0 && (
        <motion.div
          className="mt-6 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 border border-green-500/30">
            <span className="text-green-400 font-medium text-sm">
              Все участники найдены!
            </span>
            <span className="text-lg">🎉</span>
          </div>
        </motion.div>
      )}

      <style>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        .animate-scan {
          animation: scan 1.5s linear infinite;
        }
      `}</style>
    </div>
  )
}
