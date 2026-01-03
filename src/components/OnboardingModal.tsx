import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const STORAGE_KEY = 'onboarding_seen'

const slides = [
  {
    icon: '🎮',
    title: 'Добро пожаловать в AR ARENA!',
    description: 'Участвуй в розыгрышах, тапай быка и выигрывай призы!'
  },
  {
    icon: '🎫',
    title: 'Покупай билеты',
    description: 'Чем больше билетов — тем выше шанс победить в розыгрыше'
  },
  {
    icon: '🏆',
    title: 'Выигрывай призы',
    description: 'TOP-5 участников проходят в финал и борются за главный приз!'
  }
]

export function OnboardingModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY)
    if (!seen) {
      // Small delay for better UX
      const timer = setTimeout(() => setIsOpen(true), 500)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setIsOpen(false)
  }

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1)
    } else {
      handleClose()
    }
  }

  const slide = slides[currentSlide]
  const isLastSlide = currentSlide === slides.length - 1

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-sm bg-gradient-to-b from-zinc-900 to-black rounded-3xl border border-[#FFD700]/30 overflow-hidden shadow-[0_0_60px_rgba(255,215,0,0.15)]"
          >
            {/* Top glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-[#FFD700]/10 blur-3xl pointer-events-none" />

            {/* Content */}
            <div className="relative p-8 pt-10">
              {/* Icon */}
              <motion.div
                key={currentSlide}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#FFD700]/20 to-[#FFA500]/10 border border-[#FFD700]/30 flex items-center justify-center"
              >
                <span className="text-5xl">{slide.icon}</span>
              </motion.div>

              {/* Title */}
              <motion.h2
                key={`title-${currentSlide}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-2xl font-black text-center text-white mb-3"
              >
                {slide.title}
              </motion.h2>

              {/* Description */}
              <motion.p
                key={`desc-${currentSlide}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-white/70 text-center text-sm leading-relaxed mb-8"
              >
                {slide.description}
              </motion.p>

              {/* Dots */}
              <div className="flex justify-center gap-2 mb-6">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      idx === currentSlide
                        ? 'w-6 bg-[#FFD700]'
                        : 'bg-white/20 hover:bg-white/40'
                    }`}
                  />
                ))}
              </div>

              {/* Button */}
              <button
                onClick={handleNext}
                className="w-full py-4 rounded-2xl font-black text-black uppercase tracking-wider bg-gradient-to-r from-[#FFD700] to-[#FFA500] shadow-[0_4px_20px_rgba(255,215,0,0.3)] active:scale-[0.98] transition-all"
              >
                {isLastSlide ? 'Понятно!' : 'Далее'}
              </button>

              {/* Skip button */}
              {!isLastSlide && (
                <button
                  onClick={handleClose}
                  className="w-full mt-3 py-2 text-white/40 text-sm hover:text-white/60 transition-colors"
                >
                  Пропустить
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
