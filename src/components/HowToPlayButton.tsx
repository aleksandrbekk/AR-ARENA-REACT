import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HelpCircle, X, ChevronRight } from 'lucide-react'

const stages = [
  {
    number: 1,
    title: 'Отборочный тур',
    subtitle: 'Барабан удачи',
    description: 'Все билеты участвуют в розыгрыше. 20 барабанов случайным образом выбирают 20 счастливчиков!',
    iconUrl: '/icons/slot.png',
    color: 'from-blue-500 to-cyan-500',
    tip: 'Больше билетов = выше шанс пройти'
  },
  {
    number: 2,
    title: 'Второй тур',
    subtitle: 'Карточки судьбы',
    description: 'Из 20 участников определяем ТОП-5. Каждая карта скрывает результат — ПРОШЁЛ или ВЫБЫЛ.',
    iconUrl: '/icons/cards.png',
    color: 'from-purple-500 to-pink-500',
    tip: '5 зелёных карт проходят дальше'
  },
  {
    number: 3,
    title: 'Полуфинал',
    subtitle: 'Светофор',
    description: '5 финалистов крутят рулетку. 3 попадания на твой билет = красный свет = выбывание.',
    iconUrl: '/icons/semafor.png',
    color: 'from-amber-500 to-orange-500',
    tip: '3 игрока выходят в финал'
  },
  {
    number: 4,
    title: 'Финал',
    subtitle: 'Бык vs Медведь',
    description: 'Колесо фортуны! 3 быка = ПОБЕДА и место в TOP. 3 медведя = выбывание.',
    iconUrl: '/icons/wheel.png',
    color: 'from-[#FFD700] to-[#FFA500]',
    tip: 'TOP-3 делят призовой фонд'
  }
]

interface HowToPlayButtonProps {
  variant?: 'icon' | 'button' | 'text'
  className?: string
}

export function HowToPlayButton({ variant = 'icon', className = '' }: HowToPlayButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeStage, setActiveStage] = useState(0)

  const renderButton = () => {
    switch (variant) {
      case 'button':
        return (
          <button
            onClick={() => setIsOpen(true)}
            className={`flex items-center gap-2 px-4 py-2 bg-zinc-800/80 backdrop-blur-sm border border-white/10 rounded-xl hover:border-[#FFD700]/50 transition-all ${className}`}
          >
            <HelpCircle className="w-4 h-4 text-[#FFD700]" />
            <span className="text-white text-sm font-medium">Как играть?</span>
          </button>
        )
      case 'text':
        return (
          <button
            onClick={() => setIsOpen(true)}
            className={`text-[#FFD700] text-sm font-medium hover:underline ${className}`}
          >
            Как играть?
          </button>
        )
      default:
        return (
          <button
            onClick={() => setIsOpen(true)}
            className={`w-10 h-10 rounded-full bg-zinc-800/80 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:border-[#FFD700]/50 transition-all ${className}`}
          >
            <HelpCircle className="w-5 h-5 text-[#FFD700]" />
          </button>
        )
    }
  }

  return (
    <>
      {renderButton()}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="relative w-full max-w-lg max-h-[90vh] bg-gradient-to-b from-zinc-900 to-black rounded-t-3xl sm:rounded-3xl border-t sm:border border-[#FFD700]/30 overflow-hidden"
            >
              {/* Header */}
              <div className="sticky top-0 bg-zinc-900/95 backdrop-blur-sm border-b border-white/10 p-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFD700]/20 to-[#FFA500]/10 flex items-center justify-center border border-[#FFD700]/30">
                    <HelpCircle className="w-5 h-5 text-[#FFD700]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Как играть?</h2>
                    <p className="text-xs text-white/50">Правила Live Arena</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4 text-white/60" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
                {/* Timeline */}
                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-[23px] top-8 bottom-8 w-0.5 bg-gradient-to-b from-blue-500 via-purple-500 via-amber-500 to-[#FFD700]" />

                  {/* Stages */}
                  <div className="space-y-4">
                    {stages.map((stage, idx) => (
                      <motion.div
                        key={stage.number}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className={`relative pl-14 cursor-pointer group`}
                        onClick={() => setActiveStage(idx)}
                      >
                        {/* Number badge */}
                        <div className={`absolute left-0 w-12 h-12 rounded-xl bg-gradient-to-br ${stage.color} flex items-center justify-center shadow-lg transition-transform ${activeStage === idx ? 'scale-110' : 'group-hover:scale-105'}`}>
                          <img src={stage.iconUrl} alt="" className="w-7 h-7" />
                        </div>

                        {/* Card */}
                        <div className={`p-4 rounded-xl border transition-all ${activeStage === idx
                          ? 'bg-white/10 border-[#FFD700]/50 shadow-[0_0_20px_rgba(255,215,0,0.1)]'
                          : 'bg-white/5 border-white/10 hover:border-white/20'
                          }`}>
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h3 className="font-bold text-white">{stage.title}</h3>
                              <p className="text-xs text-[#FFD700]">{stage.subtitle}</p>
                            </div>
                            <ChevronRight className={`w-4 h-4 transition-transform ${activeStage === idx ? 'rotate-90 text-[#FFD700]' : 'text-white/30'}`} />
                          </div>

                          <AnimatePresence>
                            {activeStage === idx && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <p className="text-white/70 text-sm mb-3">{stage.description}</p>
                                <div className="flex items-center gap-2 px-3 py-2 bg-[#FFD700]/10 rounded-lg border border-[#FFD700]/20">
                                  <span className="text-xs">💡</span>
                                  <span className="text-xs text-[#FFD700]">{stage.tip}</span>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Prize info */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-[#FFD700]/10 to-[#FFA500]/5 border border-[#FFD700]/20"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <img src="/icons/trophy.png" alt="" className="w-7 h-7" />
                    <h3 className="font-bold text-[#FFD700]">Призовой фонд</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-black/30 rounded-xl">
                      <div className="text-lg">🥇</div>
                      <div className="text-xs text-white/50">1 место</div>
                      <div className="text-sm font-bold text-[#FFD700]">50%</div>
                    </div>
                    <div className="p-2 bg-black/30 rounded-xl">
                      <div className="text-lg">🥈</div>
                      <div className="text-xs text-white/50">2 место</div>
                      <div className="text-sm font-bold text-gray-300">30%</div>
                    </div>
                    <div className="p-2 bg-black/30 rounded-xl">
                      <div className="text-lg">🥉</div>
                      <div className="text-xs text-white/50">3 место</div>
                      <div className="text-sm font-bold text-amber-600">20%</div>
                    </div>
                  </div>
                </motion.div>

                {/* CTA */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full mt-6 mb-4 py-4 rounded-2xl font-black text-black uppercase bg-gradient-to-r from-[#FFD700] to-[#FFA500] active:scale-[0.98] transition-all"
                >
                  Понятно!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
