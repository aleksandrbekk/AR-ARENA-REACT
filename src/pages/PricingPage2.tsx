import React, { useState, useEffect } from 'react'


// Aurora Card Component
const AuroraCard = ({
    title,
    price,
    oldPrice,
    period,
    features,
    bonuses,
    colors,
    badge,
    isFeatured
}: {
    title: string
    price: string
    oldPrice?: string
    period: string
    features: string[]
    bonuses?: string[]
    colors: [string, string]
    badge?: string
    isFeatured?: boolean
}) => {
    return (
        <div className={`relative group ${isFeatured ? 'md:scale-105 z-10' : ''}`}>
            <style>{`
                @property --angle {
                    syntax: '<angle>';
                    initial-value: 0deg;
                    inherits: false;
                }
                @keyframes aurora-rotate {
                    to { --angle: 360deg; }
                }
            `}</style>

            {/* Glow Container */}
            <div className="relative rounded-xl bg-[#08080a] overflow-hidden">
                {/* Aurora Effect */}
                <div
                    className="absolute inset-[-2px] opacity-60 blur-[20px] transition-all duration-500 group-hover:opacity-100 group-hover:blur-[30px]"
                    style={{
                        zIndex: 0,
                        background: `conic-gradient(from var(--angle), transparent 0deg, ${colors[0]} 60deg, ${colors[1]} 120deg, transparent 180deg, ${colors[0]} 240deg, ${colors[1]} 300deg, transparent 360deg)`,
                        animation: `aurora-rotate ${isFeatured ? '6s' : '8s'} linear infinite`
                    } as React.CSSProperties}
                />

                {/* Card Content Container (Dark Mask) */}
                <div className="absolute inset-[1px] bg-[#08080a] rounded-[11px] z-[1]" />

                {/* Content */}
                <div className="relative z-[2] p-6 flex flex-col h-full bg-[#08080a]/50 backdrop-blur-sm rounded-xl">
                    {badge && (
                        <div className="absolute top-4 right-4 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider border border-white/10"
                            style={{ color: colors[1], backgroundColor: `${colors[1]}20`, borderColor: `${colors[1]}40` }}>
                            {badge}
                        </div>
                    )}

                    <h3 className="text-white font-medium uppercase tracking-wider mb-1">{title}</h3>
                    <div className="text-gray-400 text-xs mb-4">{period}</div>

                    <div className="mb-6">
                        {oldPrice && (
                            <div className="text-gray-500 text-sm line-through mb-1">{oldPrice} ₽</div>
                        )}
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl md:text-5xl font-bold text-white">{price}</span>
                            <span className="text-2xl font-bold text-white">₽</span>
                        </div>
                        <div className="text-gray-400 text-sm mt-1">{period === '1 мес' ? '/мес' : `/${period}`}</div>
                    </div>

                    <div className="h-px w-full bg-white/10 mb-6" />

                    <div className="flex-1 space-y-4 mb-8">
                        {features.map((f, i) => (
                            <div key={i} className="flex items-start gap-3">
                                <svg className="w-5 h-5 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke={badge ? colors[1] : 'white'}>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="text-sm text-gray-300">{f}</span>
                            </div>
                        ))}

                        {bonuses && bonuses.length > 0 && (
                            <div className="pt-4 mt-4 border-t border-white/5 space-y-3">
                                {bonuses.map((b, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <span
                                            className="px-1.5 py-0.5 text-[10px] font-bold rounded"
                                            style={{
                                                background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
                                                color: '#fff'
                                            }}
                                        >
                                            VIP
                                        </span>
                                        <span className="text-sm text-white font-medium">{b}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        className={`w-full py-4 rounded-xl font-medium transition-all duration-300 ${title === 'PLATINUM'
                            ? 'bg-gradient-to-r from-[#6366F1] to-[#06B6D4] text-white hover:shadow-lg hover:shadow-indigo-500/25'
                            : 'border border-gray-800 text-white hover:bg-white/5'
                            }`}
                        style={title !== 'PLATINUM' && title !== 'CLASSIC' ? { borderColor: `${colors[1]}40`, color: colors[1] } : {}}
                    >
                        {title === 'CLASSIC' ? 'Начать' : `Выбрать ${title.charAt(0) + title.slice(1).toLowerCase()}`}
                    </button>
                </div>
            </div>
        </div>
    )
}

const Timer = () => {
    const [timeLeft, setTimeLeft] = useState('')

    useEffect(() => {
        // Target: 27.12.2025 18:00 MSK
        const target = new Date('2025-12-27T18:00:00+03:00').getTime()

        const update = () => {
            const now = new Date().getTime()
            const diff = target - now

            if (diff <= 0) return setTimeLeft('00:00:00')

            const d = Math.floor(diff / (1000 * 60 * 60 * 24))
            const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
            const s = Math.floor((diff % (1000 * 60)) / 1000)

            setTimeLeft(`${d}д ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`)
        }

        const timer = setInterval(update, 1000)
        update()
        return () => clearInterval(timer)
    }, [])

    return <div className="font-mono bg-white/5 px-4 py-2 rounded-lg border border-white/10 text-white/90">{timeLeft}</div>
}

export const PricingPage2 = () => {
    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-indigo-500/30 overflow-x-hidden">
            {/* Header */}
            <header className="pt-12 pb-16 px-4 text-center">
                <div className="flex justify-center mb-6">
                    <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L2 19h20L12 2zm0 3.8l6.8 11.2H5.2L12 5.8z" />
                    </svg>
                </div>
                <h1 className="text-2xl font-medium tracking-widest mb-2 text-white">PREMIUM AR CLUB</h1>
                <p className="text-[#888888] text-sm uppercase tracking-widest font-medium mb-8">Новогоднее предложение</p>
                <div className="flex justify-center">
                    <Timer />
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-[1400px] mx-auto px-4 pb-24">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-center">
                    <AuroraCard
                        title="CLASSIC"
                        price="4 000"
                        period="1 мес"
                        colors={['#333333', '#444444']}
                        features={[
                            'Ежедневная аналитика рынка',
                            'Фьючерсные сделки с сопровождением',
                            'SPOT-сделки без плечей',
                            'Мгновенные оповещения о сделках',
                            'Готовые инвестиционные портфели',
                            'Актуальный портфель 2025',
                            'Долгосрочные стратегии',
                            'Ончейн-аналитика — движения китов',
                            '900+ обучающих материалов',
                            'Живой чат трейдеров',
                            'Поддержка 24/7',
                            'AMA со мной каждые 2 недели'
                        ]}
                    />

                    <AuroraCard
                        title="GOLD"
                        price="9 900"
                        oldPrice="12 000"
                        period="3 мес"
                        colors={['#C9A962', '#FFA500']}
                        features={[
                            'Ежедневная аналитика рынка',
                            'Фьючерсные сделки с сопровождением',
                            'SPOT-сделки без плечей',
                            'Мгновенные оповещения о сделках',
                            'Готовые инвестиционные портфели',
                            'Актуальный портфель 2025',
                            'Долгосрочные стратегии',
                            'Ончейн-аналитика — движения китов',
                            '900+ обучающих материалов',
                            'Живой чат трейдеров',
                            'Поддержка 24/7',
                            'AMA со мной каждые 2 недели'
                        ]}
                    />

                    <AuroraCard
                        title="PLATINUM"
                        price="17 900"
                        oldPrice="24 000"
                        period="6 мес"
                        badge="ХИТ"
                        isFeatured={true}
                        colors={['#4B0082', '#06B6D4']}
                        features={[
                            'Ежедневная аналитика рынка',
                            'Фьючерсные сделки с сопровождением',
                            'SPOT-сделки без плечей',
                            'Мгновенные оповещения о сделках',
                            'Готовые инвестиционные портфели',
                            'Актуальный портфель 2025',
                            'Долгосрочные стратегии',
                            'Ончейн-аналитика — движения китов',
                            '900+ обучающих материалов',
                            'Живой чат трейдеров',
                            'Поддержка 24/7',
                            'AMA со мной каждые 2 недели'
                        ]}
                    />

                    <AuroraCard
                        title="PRIVATE"
                        price="34 900"
                        oldPrice="44 000"
                        period="12 мес"
                        badge="VIP"
                        colors={['#8B5CF6', '#EC4899']}
                        features={[
                            'Ежедневная аналитика рынка',
                            'Фьючерсные сделки с сопровождением',
                            'SPOT-сделки без плечей',
                            'Мгновенные оповещения о сделках',
                            'Готовые инвестиционные портфели',
                            'Актуальный портфель 2025',
                            'Долгосрочные стратегии',
                            'Ончейн-аналитика — движения китов',
                            '900+ обучающих материалов',
                            'Живой чат трейдеров',
                            'Поддержка 24/7',
                            'AMA со мной каждые 2 недели'
                        ]}
                        bonuses={[
                            'Личный разбор портфеля в Zoom'
                        ]}
                    />
                </div>
            </main>

            {/* Footer */}
            <footer className="text-center pb-12 text-[#888888] text-xs px-4">
                <div className="flex flex-wrap justify-center gap-4 mb-4 font-mono opacity-60">
                    <span>82.2% точность</span>
                    <span>•</span>
                    <span>5000+ участников</span>
                    <span>•</span>
                    <span>900+ материалов</span>
                    <span>•</span>
                    <span>С 2022</span>
                </div>
                <p className="opacity-40">
                    Акция действует 96 часов с начала эфира 23.12
                </p>
            </footer>
        </div>
    )
}
