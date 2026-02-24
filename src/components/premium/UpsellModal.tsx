import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface UpsellModalProps {
    isOpen: boolean
    onClose: () => void
    onAccept: () => void
    onDecline: () => void
}

export const UpsellModal: React.FC<UpsellModalProps> = ({
    isOpen,
    onClose,
    onAccept,
    onDecline
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="upsell-modal-container"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                >
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.95, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: 20 }}
                        className="relative w-full max-w-md bg-zinc-900/90 backdrop-blur-xl border border-yellow-500/30 rounded-2xl overflow-hidden shadow-2xl p-6 md:p-8"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            boxShadow: '0 0 40px rgba(245, 166, 35, 0.1)'
                        }}
                    >
                        {/* Анимация лучей на фоне */}
                        <div
                            className="absolute inset-0 opacity-20 pointer-events-none"
                            style={{
                                background: 'radial-gradient(circle at 50% 0%, rgba(245, 166, 35, 0.5) 0%, transparent 70%)'
                            }}
                        />

                        <div className="relative z-10 text-center">
                            {/* Иконка подарка или короны */}
                            <div className="mx-auto w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mb-6">
                                <span className="text-3xl">🎁</span>
                            </div>

                            <h3 className="text-2xl font-bold tracking-wide mb-3"
                                style={{
                                    background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                }}
                            >
                                Подождите!
                            </h3>

                            <h4 className="text-lg font-semibold text-white mb-4">
                                Специальное предложение
                            </h4>

                            <div className="bg-black/40 rounded-xl p-4 mb-6 border border-white/5">
                                <p className="text-gray-300 text-sm md:text-base leading-relaxed mb-4">
                                    Вместо 1 месяца возьмите сразу <strong className="text-yellow-400">3 месяца (GOLD)</strong> со скидкой!
                                    Полный доступ ко всем событиям и максимальный профит.
                                </p>

                                <div className="flex flex-col items-center justify-center gap-1">
                                    <div className="text-gray-500 text-sm line-through decoration-red-500/50 decoration-2">
                                        12,000 ₽
                                    </div>
                                    <div className="text-3xl font-bold text-white flex items-baseline gap-2">
                                        9,810 ₽
                                        <span className="text-sm text-yellow-500 font-medium bg-yellow-500/10 px-2 py-0.5 rounded">
                                            -18%
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Кнопки */}
                            <div className="space-y-3">
                                {/* Главная кнопка Action */}
                                <motion.button
                                    onClick={onAccept}
                                    className="w-full py-4 rounded-xl text-black font-bold text-base transition-all relative overflow-hidden group"
                                    style={{
                                        background: 'linear-gradient(to right, #FFD700, #FFA500)'
                                    }}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    Забрать 3 месяца со скидкой
                                </motion.button>

                                {/* Второстепенная кнопка */}
                                <button
                                    onClick={onDecline}
                                    className="w-full py-3 text-sm text-gray-500 font-medium hover:text-white transition-colors"
                                >
                                    Остаться на 1 месяце (4,000 ₽)
                                </button>
                            </div>

                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
