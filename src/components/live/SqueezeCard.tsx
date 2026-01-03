import { motion, useAnimationControls } from 'framer-motion'
import { useEffect, useState } from 'react'

interface SqueezeCardProps {
  isRevealed: boolean
  result: 'green' | 'red'
  playerName?: string
  playerAvatar?: string
  ticketNumber?: number
  onRevealComplete?: () => void
}

/**
 * SqueezeCard - Карта с драматичным "Squeeze" эффектом открытия
 * Эффект отклеивания с верхнего правого угла
 */
export function SqueezeCard({
  isRevealed,
  result,
  playerName = 'Player',
  playerAvatar,
  ticketNumber,
  onRevealComplete
}: SqueezeCardProps) {
  const peelControls = useAnimationControls()
  const [showResult, setShowResult] = useState(false)
  const [peelProgress, setPeelProgress] = useState(0)

  // Цвета результата
  const resultColors = {
    green: {
      border: '#22c55e',
      glow: 'rgba(34, 197, 94, 0.5)',
      bg: 'linear-gradient(135deg, #166534 0%, #15803d 50%, #22c55e 100%)',
      text: 'PASSED'
    },
    red: {
      border: '#ef4444',
      glow: 'rgba(239, 68, 68, 0.5)',
      bg: 'linear-gradient(135deg, #7f1d1d 0%, #b91c1c 50%, #ef4444 100%)',
      text: 'OUT'
    }
  }

  const colors = resultColors[result]

  useEffect(() => {
    if (isRevealed) {
      // Запускаем анимацию отклеивания
      const animate = async () => {
        // Фаза 1: Начинаем отгибать угол (0-30%)
        await peelControls.start({
          rotateY: -25,
          rotateX: 15,
          x: -20,
          transition: { duration: 0.8, ease: 'easeOut' }
        })
        setPeelProgress(30)

        // Фаза 2: Показываем краешек результата (30-60%)
        await peelControls.start({
          rotateY: -45,
          rotateX: 25,
          x: -40,
          transition: { duration: 0.7, ease: 'easeInOut' }
        })
        setPeelProgress(60)

        // Пауза для саспенса
        await new Promise(r => setTimeout(r, 300))

        // Фаза 3: Полное открытие (60-100%)
        await peelControls.start({
          rotateY: -180,
          rotateX: 0,
          x: 0,
          opacity: 0,
          transition: { duration: 0.6, ease: 'easeIn' }
        })
        setPeelProgress(100)
        setShowResult(true)
        onRevealComplete?.()
      }

      animate()
    } else {
      // Сброс
      peelControls.start({
        rotateY: 0,
        rotateX: 0,
        x: 0,
        opacity: 1,
        transition: { duration: 0.3 }
      })
      setPeelProgress(0)
      setShowResult(false)
    }
  }, [isRevealed, peelControls, onRevealComplete])

  return (
    <div
      className="relative w-full aspect-[2/2.8]" // 200/280 approx 2/2.8 or roughly 5/7
      style={{ perspective: '1000px' }}
    >
      {/* Результат (под рубашкой) */}
      <motion.div
        className="absolute inset-0 rounded-2xl overflow-hidden"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{
          opacity: showResult ? 1 : (peelProgress > 30 ? 0.3 + peelProgress * 0.007 : 0),
          scale: showResult ? 1 : 0.95
        }}
        transition={{ duration: 0.4 }}
        style={{
          background: colors.bg,
          border: `3px solid ${colors.border}`,
          boxShadow: showResult ? `0 0 40px ${colors.glow}, inset 0 0 30px rgba(255,255,255,0.1)` : 'none'
        }}
      >
        {/* Внутреннее содержимое результата */}
        <div className="flex flex-col items-center justify-center h-full p-4">
          {/* Аватар */}
          <motion.div
            className="w-20 h-20 rounded-full overflow-hidden mb-4 border-4"
            style={{ borderColor: colors.border }}
            initial={{ scale: 0, rotate: -180 }}
            animate={{
              scale: showResult ? 1 : 0,
              rotate: showResult ? 0 : -180
            }}
            transition={{ delay: 0.2, duration: 0.5, type: 'spring' }}
          >
            {playerAvatar ? (
              <img
                src={playerAvatar}
                alt={playerName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-2xl font-bold"
                style={{ background: 'rgba(0,0,0,0.3)' }}
              >
                {playerName.charAt(0).toUpperCase()}
              </div>
            )}
          </motion.div>

          {/* Имя игрока */}
          <motion.div
            className="text-white font-bold text-lg text-center truncate w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: showResult ? 1 : 0, y: showResult ? 0 : 20 }}
            transition={{ delay: 0.3 }}
          >
            {playerName}
          </motion.div>

          {/* Номер билета */}
          {ticketNumber && (
            <motion.div
              className="text-white/60 text-sm mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: showResult ? 1 : 0 }}
              transition={{ delay: 0.4 }}
            >
              Ticket #{ticketNumber}
            </motion.div>
          )}

          {/* Статус */}
          <motion.div
            className="mt-4 px-6 py-2 rounded-full font-black text-xl tracking-wider"
            style={{
              background: 'rgba(0,0,0,0.4)',
              color: colors.border,
              textShadow: `0 0 20px ${colors.glow}`
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: showResult ? 1 : 0,
              opacity: showResult ? 1 : 0
            }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
          >
            {colors.text}
          </motion.div>
        </div>

        {/* Блик на результате */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: showResult ? 1 : 0 }}
          transition={{ delay: 0.3 }}
        />
      </motion.div>

      {/* Рубашка карты (сверху) */}
      <motion.div
        className="absolute inset-0 rounded-2xl overflow-hidden"
        animate={peelControls}
        style={{
          transformOrigin: 'left center',
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden'
        }}
      >
        {/* Основной фон рубашки */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)',
            border: '3px solid rgba(255, 215, 0, 0.3)'
          }}
        >
          {/* Паттерн рубашки */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `
                repeating-linear-gradient(
                  45deg,
                  transparent,
                  transparent 10px,
                  rgba(255,215,0,0.1) 10px,
                  rgba(255,215,0,0.1) 20px
                )
              `
            }}
          />

          {/* Центральный логотип */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="w-24 h-24 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(255,215,0,0.2) 0%, rgba(255,165,0,0.1) 100%)',
                border: '2px solid rgba(255,215,0,0.3)',
                boxShadow: '0 0 30px rgba(255,215,0,0.2)'
              }}
            >
              <span className="text-[#FFD700] font-black text-3xl">AR</span>
            </div>
          </div>

          {/* Угловые декорации */}
          {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => (
            <div
              key={corner}
              className={`absolute w-8 h-8 ${corner === 'top-left' ? 'top-3 left-3' :
                  corner === 'top-right' ? 'top-3 right-3' :
                    corner === 'bottom-left' ? 'bottom-3 left-3' :
                      'bottom-3 right-3'
                }`}
              style={{
                borderTop: corner.includes('top') ? '2px solid rgba(255,215,0,0.4)' : 'none',
                borderBottom: corner.includes('bottom') ? '2px solid rgba(255,215,0,0.4)' : 'none',
                borderLeft: corner.includes('left') ? '2px solid rgba(255,215,0,0.4)' : 'none',
                borderRight: corner.includes('right') ? '2px solid rgba(255,215,0,0.4)' : 'none',
              }}
            />
          ))}
        </div>

        {/* Динамический блик при отгибании */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(
              ${135 + peelProgress}deg,
              rgba(255,255,255,${0.1 + peelProgress * 0.003}) 0%,
              transparent ${30 + peelProgress * 0.5}%
            )`,
          }}
        />

        {/* Тень от сгиба */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(
              to left,
              rgba(0,0,0,${peelProgress * 0.005}) 0%,
              transparent 50%
            )`,
          }}
        />
      </motion.div>

      {/* Тень под картой */}
      <motion.div
        className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[90%] h-8 rounded-full blur-xl"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        animate={{
          scaleX: showResult ? 1.1 : 1,
          opacity: showResult ? 0.8 : 0.5
        }}
      />

      {/* Частицы при полном открытии */}
      {showResult && (
        <>
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                background: colors.border,
                left: '50%',
                top: '50%',
                boxShadow: `0 0 10px ${colors.glow}`
              }}
              initial={{
                x: 0,
                y: 0,
                scale: 0,
                opacity: 1
              }}
              animate={{
                x: Math.cos(i * Math.PI / 4) * 120,
                y: Math.sin(i * Math.PI / 4) * 120,
                scale: [0, 1.5, 0],
                opacity: [1, 1, 0]
              }}
              transition={{
                duration: 0.8,
                delay: i * 0.05,
                ease: 'easeOut'
              }}
            />
          ))}
        </>
      )}
    </div>
  )
}
