import React from 'react'
import { GiftBoxIcon } from './LuxuryIcons' // Keeping GiftBoxIcon for small usage or removing if fully replaced

export type TariffTier = 'start' | 'growth' | 'investor' | 'partner'

export interface TariffCardProps {
    tier: TariffTier
    price: string
    oldPrice?: string
    days: string
    features: string[]
    bonus?: string
    badge?: string
    accentColor: string
}

export const TariffCard: React.FC<TariffCardProps> = ({
    tier,
    price,
    oldPrice,
    days,
    features,
    bonus,
    badge,
    accentColor
}) => {
    const isInvestor = tier === 'investor'

    // Dynamic styles based on tier
    // Investor gets gold border/shadow
    // Partner gets platinum blue/ice border/shadow
    // Growth/Start get subtle borders
    let borderColor = 'border-white/5'
    let glowClass = ''

    if (isInvestor) {
        borderColor = 'border-[#C9A962]/40'
        glowClass = 'shadow-[0_0_30px_-5px_rgba(201,169,98,0.2)]'
    } else if (tier === 'partner') {
        borderColor = 'border-[#A8D4E6]/30'
        glowClass = 'shadow-[0_0_20px_-5px_rgba(168,212,230,0.15)]'
    }

    const hoverScale = isInvestor ? 'hover:scale-[1.02]' : 'hover:scale-[1.01]'

    return (
        <div
            className={`
        relative flex flex-col p-6 rounded-2xl bg-[#0d0d0d]/80 backdrop-blur-xl
        border ${borderColor} ${glowClass} h-full
        transition-all duration-500 ease-out group
        ${hoverScale} hover:border-opacity-60 hover:bg-[#121212]
        ${isInvestor ? 'z-10 bg-gradient-to-b from-[#1a1505]/80 to-[#0d0d0d]/90' : 'z-0'}
      `}
        >
            {/* Badge */}
            {badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                    <span className={`
                        px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold shadow-lg whitespace-nowrap
                        ${isInvestor
                            ? 'bg-gradient-to-r from-[#C9A962] to-[#B8860B] text-black ring-1 ring-[#FFD700]/50'
                            : 'bg-[#1a1a1a] border border-white/10 text-white/80'}
                    `}>
                        {badge}
                    </span>
                </div>
            )}

            {/* Ambient Light / Highlight for Investor */}
            {isInvestor && (
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#C9A962] to-transparent opacity-50" />
            )}

            {/* Icon Area */}
            <div className="mb-8 flex justify-center relative">
                {/* Glow behind icon */}
                <div className="absolute inset-0 bg-white/5 blur-3xl rounded-full scale-150 opacity-20" style={{ backgroundColor: accentColor }} />

                <div className="relative w-32 h-32 drop-shadow-2xl flex items-center justify-center">
                    {tier === 'start' && (
                        <img
                            src="/premium/icon_shield.png"
                            alt="Bronze Shield"
                            className="w-full h-full object-contain grayscale-[0.2]"
                        />
                    )}
                    {tier === 'growth' && (
                        <img
                            src="/premium/icon_chart.png"
                            alt="Silver Growth"
                            className="w-full h-full object-contain"
                        />
                    )}
                    {tier === 'investor' && (
                        <img
                            src="/premium/icon_ingot.png"
                            alt="Gold Ingot"
                            className="w-full h-full object-contain brightness-110 contrast-125"
                        />
                    )}
                    {tier === 'partner' && (
                        <img
                            src="/premium/icon_star.png"
                            alt="Platinum Star"
                            className="w-full h-full object-contain brightness-125 saturate-150"
                        />
                    )}
                </div>
            </div>

            {/* Header */}
            <h3 className="text-center text-sm tracking-[0.25em] uppercase text-white/90 font-bold mb-2">
                {tier === 'start' && 'Старт'}
                {tier === 'growth' && 'Рост'}
                {tier === 'investor' && 'Инвестор'}
                {tier === 'partner' && 'Партнёр'}
            </h3>
            <p className="text-center text-xs text-white/40 mb-6 font-light">{days}</p>

            {/* Price */}
            <div className="text-center mb-8 relative">
                {oldPrice && (
                    <div className="text-xs text-white/30 line-through mb-1 font-light decoration-white/20">
                        {oldPrice}
                    </div>
                )}
                <div
                    className="text-3xl font-bold tracking-tight"
                    style={{
                        color: isInvestor ? '#C9A962' : '#ffffff',
                        textShadow: isInvestor ? '0 0 20px rgba(201,169,98,0.3)' : 'none'
                    }}
                >
                    {price}
                </div>
            </div>

            {/* Divider */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-6" />

            {/* Features */}
            <ul className="space-y-3 mb-8 flex-1">
                {features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-xs text-white/70 group-hover:text-white/90 transition-colors">
                        <span style={{ color: accentColor }} className="mt-px">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                        </span>
                        <span className="leading-relaxed font-light">{feature}</span>
                    </li>
                ))}
            </ul>

            {/* Bonus Area */}
            {bonus && (
                <div className="mb-6 p-3 rounded-lg bg-gradient-to-r from-white/[0.03] to-transparent border border-white/5 relative overflow-hidden">
                    <div className="flex justify-center mb-2">
                        <img
                            src="/premium/icon_gift.png"
                            alt="Gift Box"
                            className="w-16 h-16 object-contain opacity-90"
                        />
                    </div>
                    <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1 relative z-10">Подарок</div>
                    <div className="text-sm text-white/90 font-medium flex items-center gap-2 relative z-10">
                        <GiftBoxIcon className="w-5 h-5 mb-0.5" />
                        {bonus}
                    </div>
                </div>
            )}

            {/* Action Button */}
            <button
                className={`
            w-full py-4 rounded-xl border
            text-xs uppercase tracking-[0.15em] font-bold 
            transition-all duration-300 relative overflow-hidden group/btn
            ${isInvestor
                        ? 'bg-gradient-to-r from-[#C9A962] via-[#E2C785] to-[#C9A962] text-black border-transparent shadow-[0_4px_20px_rgba(201,169,98,0.3)] hover:shadow-[0_4px_30px_rgba(201,169,98,0.5)]'
                        : 'bg-transparent text-white border-white/10 hover:bg-white/5 hover:border-white/20'}
        `}
            >
                <span className="relative z-10 flex items-center justify-center gap-2">
                    {isInvestor ? 'Стать Инвестором' : 'Выбрать Тариф'}
                </span>
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 ease-in-out" />
            </button>

        </div>
    )
}
