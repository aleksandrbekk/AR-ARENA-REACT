import React, { useState, useEffect } from 'react'

import { TariffCard } from '../components/premium/TariffCard'
import type { TariffTier } from '../components/premium/TariffCard'


export const PremiumPromoPage: React.FC = () => {


    // Countdown Timer Logic
    const [timeLeft, setTimeLeft] = useState({ d: 3, h: 23, m: 59, s: 59 })

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev.s > 0) return { ...prev, s: prev.s - 1 }
                if (prev.m > 0) return { ...prev, m: 59, s: 59 }
                if (prev.h > 0) return { ...prev, h: prev.h - 1, m: 59, s: 59 }
                if (prev.d > 0) return { ...prev, d: prev.d - 1, h: 23, m: 59, s: 59 }
                return prev
            })
        }, 1000)
        return () => clearInterval(timer)
    }, [])

    const formatTime = (val: number) => val.toString().padStart(2, '0')

    const tariffs: {
        tier: TariffTier
        price: number
        oldPrice?: number
        features: string[]
        days: string
        badge?: string
        isPopular?: boolean
    }[] = [
            {
                tier: 'start',
                price: 4000,
                days: '1 мес',
                features: [
                    'Торговые сигналы',
                    'Авторская аналитика',
                    'Чат участников'
                ]
            },
            {
                tier: 'growth',
                price: 10200,
                oldPrice: 12000,
                days: '3 мес',
                features: [
                    'Всё что в Classic',
                    '900+ материалов',
                    'AMA-сессии'
                ]
            },
            {
                tier: 'investor', // Platinum
                price: 19200,
                oldPrice: 24000,
                days: '6 мес',
                isPopular: true,
                features: [
                    'Всё что в Gold',
                    'Запись "Крипто-итоги 2025"',
                    'Портфель 2025',
                    'Приоритетная поддержка'
                ]
            },
            {
                tier: 'partner', // Private
                price: 33600,
                oldPrice: 48000,
                days: '12 мес',
                features: [
                    'Полный доступ ко всему',
                    'Личный менеджер',
                    'Закрытые оффлайн встречи',
                    'Доля в пуле (VIP)'
                ]
            }
        ]

    return (
        <div className="min-h-screen bg-[#000000] text-white overflow-x-hidden relative flex flex-col font-sans selection:bg-[#6366F1]/30">
            {/* Background Effects (Subtle global ambience) */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#6366F1]/5 blur-[120px] rounded-full mix-blend-screen" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#06B6D4]/5 blur-[120px] rounded-full mix-blend-screen" />
            </div>

            {/* Header */}
            <header className="pt-16 pb-12 px-4 text-center relative z-10">
                <div className="mb-4">
                    <svg className="w-12 h-12 mx-auto text-white mb-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L2 19h20L12 2zm0 3.8l6.8 11.2H5.2L12 5.8z" />
                    </svg>
                </div>
                <h1 className="text-2xl md:text-3xl font-medium tracking-tight mb-2">
                    PREMIUM AR CLUB
                </h1>
                <p className="text-white/40 text-sm uppercase tracking-widest font-medium mb-8">
                    Новогоднее предложение
                </p>

                {/* Minimal Timer */}
                <div className="inline-flex items-center gap-1 text font-mono text-white/60 bg-white/5 px-4 py-2 rounded-lg border border-white/5">
                    <span>⏳</span>
                    <span>{timeLeft.d}д</span>
                    <span>:</span>
                    <span>{formatTime(timeLeft.h)}</span>
                    <span>:</span>
                    <span>{formatTime(timeLeft.m)}</span>
                    <span>:</span>
                    <span>{formatTime(timeLeft.s)}</span>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 px-4 pb-24 relative z-10 max-w-[1600px] mx-auto w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-center">
                    {tariffs.map((tariff) => {
                        const { isPopular, ...cardProps } = tariff
                        return (
                            <div key={tariff.tier} className={isPopular ? 'xl:-mt-8 xl:mb-8' : ''}>
                                <TariffCard
                                    {...cardProps}
                                    onSelect={(t) => console.log('Selected:', t)}
                                />
                            </div>
                        )
                    })}
                </div>
            </main>

            {/* Footer */}
            <footer className="text-center pb-12 text-white/30 text-xs px-4 relative z-10">
                <div className="flex justify-center gap-6 mb-4 font-mono">
                    <span>82.2% WINRATE</span>
                    <span>•</span>
                    <span>5000+ USERS</span>
                    <span>•</span>
                    <span>SINCE 2022</span>
                </div>
                <p className="opacity-50">
                    Акция действует 96 часов. Limited Edition.
                </p>
            </footer>
        </div>
    )
}
