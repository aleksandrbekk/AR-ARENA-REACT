import React, { useMemo } from 'react'

export type TariffTier = 'start' | 'growth' | 'investor' | 'partner'

interface TariffCardProps {
    tier: TariffTier
    price: number
    oldPrice?: number
    features: string[]
    days: string
    onSelect: (tier: TariffTier) => void
    badge?: string
}

export const TariffCard: React.FC<TariffCardProps> = ({
    tier,
    price,
    oldPrice,
    features,
    // days, // Using days/months from tier logic usually, but props passed might be specific
    onSelect,
    badge
}) => {
    // Dynamic Styles based on Tier
    const styleConfig = useMemo(() => {
        switch (tier) {
            case 'start': // CLASSIC
                return {
                    name: 'Classic',
                    glow: 'bg-white/5', // Minimal
                    border: 'border-white/10',
                    button: 'border border-white/20 hover:bg-white/5 text-white',
                    badge: null,
                    height: 'h-[500px]'
                }
            case 'growth': // GOLD
                return {
                    name: 'Gold',
                    glow: 'bg-gradient-to-br from-[#C9A962] to-[#FFA500] opacity-20',
                    border: 'border-[#FFA500]/20',
                    button: 'bg-[#1a1a1a] text-[#FFA500] border border-[#FFA500]/50 hover:bg-[#FFA500]/10',
                    badge: { text: '-15%', color: 'text-[#FFA500] border border-[#FFA500]/30 bg-[#FFA500]/10' },
                    height: 'h-[500px]'
                }
            case 'investor': // PLATINUM (Main Focus)
                return {
                    name: 'Platinum',
                    glow: 'bg-gradient-to-br from-[#6366F1] via-[#8B5CF6] to-[#06B6D4] opacity-40',
                    border: 'border-[#8B5CF6]/50 shadow-[0_0_30px_rgba(139,92,246,0.15)]',
                    button: 'bg-gradient-to-r from-[#6366F1] to-[#06B6D4] text-white shadow-lg hover:shadow-cyan-500/25',
                    badge: { text: '-20% • POPULAR', color: 'text-white bg-gradient-to-r from-[#6366F1] to-[#06B6D4]' },
                    height: 'h-[540px] -mt-5' // Taller and visually elevated
                }
            case 'partner': // PRIVATE
                return {
                    name: 'Private',
                    glow: 'bg-gradient-to-br from-[#8B5CF6] via-[#EC4899] to-[#F43F5E] opacity-30',
                    border: 'border-[#EC4899]/30',
                    button: 'bg-[#1a1a1a] text-[#EC4899] border border-[#EC4899]/50 hover:bg-[#EC4899]/10',
                    badge: { text: '-30% • VIP', color: 'text-[#EC4899] border border-[#EC4899]/30 bg-[#EC4899]/10' },
                    height: 'h-[500px]'
                }
        }
    }, [tier])

    return (
        <div
            className={`
                relative group flex flex-col rounded-2xl transition-all duration-300
                ${styleConfig.height} w-full
                bg-[#0a0a0a] backdrop-blur-2xl
                ${styleConfig.border}
                overflow-visible z-0 hover:z-10
            `}
        >
            {/* Aurora Glow Effect (Behind) */}
            <div
                className={`
                    absolute -inset-4 -z-10 blur-[60px] rounded-full transition-opacity duration-500
                    ${styleConfig.glow}
                    opacity-0 group-hover:opacity-60 group-hover:blur-[80px]
                `}
            />

            {/* Badge */}
            {(badge || styleConfig.badge) && (
                <div className="absolute top-4 right-4">
                    <span
                        className={`
                            px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md
                            ${styleConfig.badge?.color || 'bg-white/10 text-white/60'}
                        `}
                    >
                        {badge || styleConfig.badge?.text}
                    </span>
                </div>
            )}

            <div className="p-8 flex-1 flex flex-col">
                {/* Header */}
                <h3 className="text-white/60 font-medium tracking-wide uppercase text-sm mb-2">
                    {styleConfig.name}
                </h3>

                {/* Price */}
                <div className="mt-2 mb-1 flex items-baseline gap-2">
                    <span className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                        {price.toLocaleString('ru-RU')} ₽
                    </span>
                    <span className="text-sm text-white/40">/мес</span>
                </div>
                {oldPrice && (
                    <div className="text-sm text-white/30 line-through mb-8">
                        {oldPrice.toLocaleString('ru-RU')} ₽
                    </div>
                )}
                {!oldPrice && <div className="mb-8 h-5" />}

                <div className="w-full h-px bg-white/5 mb-8" />

                {/* Features */}
                <ul className="space-y-4 flex-1">
                    {features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-sm text-white/80 font-light">
                            <svg className="w-5 h-5 text-white/40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                            </svg>
                            {feature}
                        </li>
                    ))}
                    {/* Bonus Section for Gold+ */}
                    {tier !== 'start' && (
                        <li className="pt-4 mt-4 border-t border-white/5">
                            <div className="flex items-start gap-3 text-sm text-white/90">
                                <span className="text-lg">🎁</span>
                                <span>
                                    <strong className="block text-white">Бонус:</strong>
                                    Крипто-итоги 2025
                                </span>
                            </div>
                        </li>
                    )}
                </ul>

                {/* Button */}
                <button
                    onClick={() => onSelect(tier)}
                    className={`
                        w-full mt-8 py-4 rounded-xl font-medium text-sm transition-all duration-300
                        ${styleConfig.button}
                    `}
                >
                    {styleConfig.name === 'Platinum' ? 'Выбрать Platinum' :
                        styleConfig.name === 'Classic' ? 'Начать' :
                            `Выбрать ${styleConfig.name}`}
                </button>
            </div>
        </div>
    )
}
