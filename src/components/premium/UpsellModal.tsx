import React, { useState, useEffect } from 'react'
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
    // Настройки для GOLD-авроры - берем из PricingPage
    const auroraColors = ['#F5A623', '#E69500']
    const auroraOpacity = 0.8
    const auroraBlur = 20
    const auroraSpeed = 8

    // 30-min timer
    const [timeLeft, setTimeLeft] = useState(30 * 60)

    useEffect(() => {
        if (!isOpen) return
        const timer = setInterval(() => {
            setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0))
        }, 1000)
        return () => clearInterval(timer)
    }, [isOpen])

    const minutes = Math.floor(timeLeft / 60)
    const seconds = timeLeft % 60
    const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`

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
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        onClick={onClose}
                    />

                    {/* Modal Wrapper - matching PricingCard layout exactly */}
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="relative w-full max-w-sm sm:max-w-md h-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Aurora glow container identical to PricingCard */}
                        <div
                            className="relative rounded-[20px] overflow-hidden shadow-2xl mt-4"
                            style={{ background: '#08080a' }}
                        >
                            <div
                                className="absolute inset-[-2px] rounded-[20px]"
                                style={{
                                    background: `conic-gradient(from 0deg, transparent 0deg, ${auroraColors[0]} 60deg, ${auroraColors[1]} 120deg, transparent 180deg, ${auroraColors[0]} 240deg, ${auroraColors[1]} 300deg, transparent 360deg)`,
                                    filter: `blur(${auroraBlur}px)`,
                                    opacity: auroraOpacity,
                                    animation: `aurora-rotate-fast ${auroraSpeed}s linear infinite`,
                                    zIndex: 0
                                }}
                            />
                            <div
                                className="absolute inset-[1px] rounded-[19px]"
                                style={{ background: '#08080a', zIndex: 1 }}
                            />

                            {/* Content Layer */}
                            <div className="relative z-[2] px-5 sm:px-6 pt-10 pb-6 text-center h-full flex flex-col">
                                <h3
                                    className="text-2xl font-bold tracking-wider uppercase mb-1"
                                    style={{
                                        color: auroraColors[0],
                                        textShadow: `0 0 20px ${auroraColors[0]}80, 0 0 40px ${auroraColors[0]}40`
                                    }}
                                >
                                    СПЕЦПРЕДЛОЖЕНИЕ
                                </h3>

                                <div className="text-yellow-400 font-mono text-lg font-bold tracking-widest mb-4 bg-yellow-500/10 inline-block px-3 py-1 rounded inline-flex items-center gap-2 mx-auto border border-yellow-500/20">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    {timeFormatted}
                                </div>

                                <p className="text-gray-300 text-sm mb-6 max-w-[95%] mx-auto leading-relaxed">
                                    Возьмите сразу <strong className="text-yellow-400">3 месяца</strong> и сэкономьте — полный доступ ко всем материалам по лучшей цене.
                                </p>

                                {/* Блок сравнения */}
                                <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 sm:p-5 mb-6 relative overflow-hidden text-left shadow-inner">
                                    <div className="absolute top-0 right-0 bg-gradient-to-bl from-yellow-500/20 to-transparent w-full h-full opacity-50 pointer-events-none" />

                                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 relative z-10">
                                        <div className="text-center">
                                            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">1 Месяц</div>
                                            <div className="text-white/40 font-bold text-lg line-through decoration-red-500/40 decoration-2">4,000 ₽</div>
                                        </div>

                                        <div className="text-gray-600 text-xl font-light">👉</div>

                                        <div className="text-center relative">
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-2 py-[1px] rounded-[4px] text-[9px] uppercase tracking-widest font-extrabold shadow-sm whitespace-nowrap">
                                                ХИТ (-18%)
                                            </div>
                                            <div className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest mb-1 mt-1">3 Месяца</div>
                                            <div className="text-white font-bold text-xl sm:text-2xl drop-shadow-[0_0_10px_rgba(245,166,35,0.4)]">9,900 ₽</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Список преимуществ */}
                                <div className="space-y-3 mb-8 text-left px-1">
                                    {[
                                        '90 дней полного доступа к клубу',
                                        'Все закрытые стримы и аналитика',
                                        'On-chain данные по движениям китов',
                                        <span key="save">Выгода: <strong className="text-green-400">2,100 ₽</strong></span>,
                                    ].map((feat, i) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <div className="mt-[3px] flex-shrink-0 w-4 h-4 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-[0_0_10px_rgba(245,166,35,0.3)]">
                                                <svg className="w-2.5 h-2.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                            </div>
                                            <span className="text-sm text-gray-200 font-medium leading-tight">{feat}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Spacer */}
                                <div className="flex-grow" />

                                {/* Кнопки */}
                                <div className="space-y-3">
                                    <motion.button
                                        onClick={onAccept}
                                        className="w-full py-4 rounded-xl text-sm md:text-base font-bold transition-all text-center block text-black relative z-20 overflow-hidden group shadow-[0_0_20px_rgba(245,166,35,0.15)]"
                                        style={{ background: 'linear-gradient(135deg, #FFD700 0%, #F5A623 100%)' }}
                                        whileHover={{ scale: 1.02, boxShadow: `0 0 30px rgba(245,166,35,0.3)` }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="absolute inset-0 bg-white/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        ЗАБРАТЬ 3 МЕСЯЦА СО СКИДКОЙ
                                    </motion.button>

                                    <button
                                        onClick={onDecline}
                                        className="w-full py-2.5 text-[13px] text-gray-500 font-medium hover:text-white transition-colors"
                                    >
                                        Нет, спасибо. Оставлю 1 месяц
                                    </button>
                                </div>

                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
