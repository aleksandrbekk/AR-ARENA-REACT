import React, { useState, useEffect } from 'react'
import { WinterEffects } from '../components/premium/WinterEffects'
import { TariffCard } from '../components/premium/TariffCard'
import type { TariffTier } from '../components/premium/TariffCard'
import { useNavigate } from 'react-router-dom'

export const PremiumPromoPage: React.FC = () => {
    const navigate = useNavigate()

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
        price: string
        oldPrice?: string
        days: string
        features: string[]
        bonus?: string
        badge?: string
        accentColor: string
    }[] = [
            {
                tier: 'start',
                price: '4 000 ₽',
                days: '1 месяц',
                accentColor: '#CD7F32',
                features: [
                    'Доступ к закрытому каналу',
                    'Базовые сигналы',
                    'Чат участников'
                ]
            },
            {
                tier: 'growth',
                price: '10 200 ₽',
                oldPrice: '12 000 ₽',
                days: '3 месяца',
                accentColor: '#C0C0C0',
                badge: '-15%',
                bonus: '+1 неделя',
                features: [
                    'Всё что в СТАРТ',
                    'Расширенная аналитика',
                    'Приоритетная поддержка'
                ]
            },
            {
                tier: 'investor',
                price: '19 200 ₽',
                oldPrice: '24 000 ₽',
                days: '6 месяцев',
                accentColor: '#C9A962',
                badge: 'ВЫБОР КЛУБА -20%',
                bonus: '+1 месяц',
                features: [
                    'Всё что в РОСТ',
                    'Персональные рекомендации',
                    'Доступ к пресейлам',
                    'Закрытые стримы',
                    'Ментинг 1 на 1 (1 час)'
                ]
            },
            {
                tier: 'partner',
                price: '33 600 ₽',
                oldPrice: '48 000 ₽',
                days: '12 месяцев',
                accentColor: '#A8D4E6',
                badge: 'VIP -30%',
                bonus: '+2 месяца',
                features: [
                    'Полный доступ ко всему',
                    'Личный менеджер',
                    'Закрытые оффлайн встречи',
                    'Доля в пуле ликвидности'
                ]
            }
        ]

    return (
        <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden relative flex flex-col font-sans selection:bg-[#C9A962]/30">
            {/* Background Effects */}
            <div className="fixed inset-0 bg-gradient-radial from-[#1a1a1a] to-[#050505] -z-20" />
            <WinterEffects />

            {/* Frozen Vignette */}
            <div className="fixed inset-0 pointer-events-none -z-10 shadow-[inset_0_0_150px_rgba(168,212,230,0.05)]" />

            {/* Header */}
            <header className="pt-12 pb-8 px-4 text-center relative z-10">
                <div className="mb-2">
                    <span className="text-[#C9A962] tracking-[0.3em] text-xs uppercase font-medium">Новогоднее предложение</span>
                </div>
                <h1 className="text-3xl md:text-5xl font-light tracking-wide mb-8">
                    PREMIUM AR CLUB
                </h1>

                {/* Timer */}
                <div className="inline-flex gap-4 p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 shadow-lg">
                    <div className="text-center">
                        <div className="text-xl md:text-2xl font-mono font-bold leading-none">{timeLeft.d}</div>
                        <div className="text-[10px] text-white/40 uppercase tracking-wider">Дней</div>
                    </div>
                    <div className="text-xl font-mono opacity-30">:</div>
                    <div className="text-center">
                        <div className="text-xl md:text-2xl font-mono font-bold leading-none">{formatTime(timeLeft.h)}</div>
                        <div className="text-[10px] text-white/40 uppercase tracking-wider">Часов</div>
                    </div>
                    <div className="text-xl font-mono opacity-30">:</div>
                    <div className="text-center">
                        <div className="text-xl md:text-2xl font-mono font-bold leading-none">{formatTime(timeLeft.m)}</div>
                        <div className="text-[10px] text-white/40 uppercase tracking-wider">Мин</div>
                    </div>
                    <div className="text-xl font-mono opacity-30">:</div>
                    <div className="text-center">
                        <div className="text-xl md:text-2xl font-mono font-bold leading-none text-[#C9A962]">{formatTime(timeLeft.s)}</div>
                        <div className="text-[10px] text-white/40 uppercase tracking-wider">Сек</div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 px-4 pb-20 relative z-10 max-w-[1400px] mx-auto w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-center">
                    {tariffs.map((tariff) => (
                        <TariffCard key={tariff.tier} {...tariff} />
                    ))}
                </div>
            </main>

            {/* Footer */}
            <footer className="text-center pb-12 text-white/30 text-xs px-4 relative z-10">
                <div className="flex flex-col md:flex-row justify-center gap-4 mb-4 uppercase tracking-widest text-[10px]">
                    <span>82.2% точность сигналов</span>
                    <span className="hidden md:inline">•</span>
                    <span>5000+ участников</span>
                    <span className="hidden md:inline">•</span>
                    <span>С 2022 года</span>
                </div>
                <p className="font-light">
                    Акция действует 96 часов с 23.12.2025. Кол-во мест ограничено.
                </p>
                <button onClick={() => navigate('/')} className="mt-8 text-white/20 hover:text-white transition-colors underline decoration-white/10 underline-offset-4">
                    На главную
                </button>
            </footer>
        </div>
    )
}
