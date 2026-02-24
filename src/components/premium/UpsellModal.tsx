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
    const auroraColors = ['#F5A623', '#E69500']
    const auroraOpacity = 0.8
    const auroraBlur = 20
    const auroraSpeed = 8

    // 30-min countdown
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
    const mm = minutes.toString().padStart(2, '0')
    const ss = seconds.toString().padStart(2, '0')

    const features = [
        '90 дней полного доступа к клубу',
        'Актуальный портфель 2025',
        'Ончейн-аналитика — движения китов',
        '900+ обучающих материалов',
        'Все закрытые стримы',
        'Живой чат трейдеров',
        'AMA каждые 2 недели',
    ]

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="upsell-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                >
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="relative w-full max-w-[380px]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Aurora border */}
                        <div className="relative rounded-[20px] overflow-hidden shadow-2xl" style={{ background: '#08080a' }}>
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
                            <div className="absolute inset-[1px] rounded-[19px]" style={{ background: '#08080a', zIndex: 1 }} />

                            {/* ── Content ── */}
                            <div className="relative z-[2] px-5 pt-7 pb-5 flex flex-col">

                                {/* Header row: title + timer */}
                                <div className="flex items-center justify-between mb-5">
                                    <h3
                                        className="text-lg font-bold tracking-wider uppercase"
                                        style={{
                                            color: auroraColors[0],
                                            textShadow: `0 0 16px ${auroraColors[0]}60`
                                        }}
                                    >
                                        Выгодное предложение
                                    </h3>
                                    <div className="flex items-center gap-1.5 text-yellow-400 font-mono text-sm font-bold bg-yellow-500/10 px-2.5 py-1 rounded-lg border border-yellow-500/20 flex-shrink-0">
                                        <svg className="w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        {mm}:{ss}
                                    </div>
                                </div>

                                {/* Subtitle */}
                                <p className="text-gray-400 text-[13px] leading-relaxed mb-5">
                                    Получите <strong className="text-white">полный доступ на 3 месяца</strong> по лучшей цене — всё включено.
                                </p>

                                {/* Price comparison */}
                                <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 mb-5 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 bg-gradient-to-bl from-yellow-500/15 to-transparent w-full h-full pointer-events-none" />

                                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 relative z-10">
                                        <div className="text-center">
                                            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">1 мес</div>
                                            <div className="text-white/40 font-bold text-base line-through decoration-red-500/40 decoration-2">4,000 ₽</div>
                                        </div>

                                        <div className="text-gray-600 text-lg">→</div>

                                        <div className="text-center relative">
                                            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-2 py-[1px] rounded text-[9px] uppercase tracking-widest font-extrabold whitespace-nowrap">
                                                -18%
                                            </div>
                                            <div className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest mb-1 mt-1">3 мес</div>
                                            <div className="text-white font-bold text-lg drop-shadow-[0_0_8px_rgba(245,166,35,0.3)]">9,900 ₽</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Features list */}
                                <div className="space-y-2.5 mb-6">
                                    {features.map((feat, i) => (
                                        <div key={i} className="flex items-center gap-2.5">
                                            <div className="flex-shrink-0 w-3.5 h-3.5 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                                                <svg className="w-2 h-2 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                            </div>
                                            <span className="text-[13px] text-gray-300">{feat}</span>
                                        </div>
                                    ))}
                                    {/* Savings highlight */}
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex-shrink-0 w-3.5 h-3.5 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                                            <svg className="w-2 h-2 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                        <span className="text-[13px] text-green-400 font-medium">Выгода 2,100 ₽</span>
                                    </div>
                                </div>

                                {/* CTA */}
                                <motion.button
                                    onClick={onAccept}
                                    className="w-full py-3.5 rounded-xl text-sm font-bold text-black relative overflow-hidden group"
                                    style={{ background: 'linear-gradient(135deg, #FFD700 0%, #F5A623 100%)' }}
                                    whileHover={{ scale: 1.02, boxShadow: '0 0 25px rgba(245,166,35,0.25)' }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <div className="absolute inset-0 bg-white/25 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    ЗАБРАТЬ 3 МЕСЯЦА СО СКИДКОЙ
                                </motion.button>

                                <button
                                    onClick={onDecline}
                                    className="w-full py-2 mt-2 text-[12px] text-gray-600 hover:text-gray-400 transition-colors"
                                >
                                    Нет, оставлю 1 месяц
                                </button>

                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
