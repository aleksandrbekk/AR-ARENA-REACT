import React from 'react'

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
    const borderColor = isInvestor ? 'border-[#C9A962]/30' : 'border-white/5'
    const glowClass = isInvestor ? 'shadow-[0_0_30px_-10px_rgba(201,169,98,0.15)]' : ''
    const hoverScale = isInvestor ? 'hover:scale-105' : 'hover:scale-[1.02]'

    return (
        <div
            className={`
        relative flex flex-col p-6 rounded-2xl bg-[#0d0d0d] backdrop-blur-md
        border ${borderColor} ${glowClass} h-full
        transition-all duration-500 ease-out group
        ${hoverScale} hover:border-opacity-50 hover:bg-[#121212]
        ${isInvestor ? 'z-10' : 'z-0'}
      `}
            style={{
                boxShadow: isInvestor ? '0 0 40px -10px rgba(201,169,98,0.15)' : 'none'
            }}
        >
            {/* Badge */}
            {badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 bg-[#1a1a1a] border border-white/10 rounded-full text-[10px] uppercase tracking-widest font-semibold text-white/80 shadow-lg whitespace-nowrap">
                        {badge}
                    </span>
                </div>
            )}

            {/* Gold Particles for Investor (Static decoration for now, could be animated) */}
            {isInvestor && (
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-b from-[#C9A962]/10 to-transparent blur-xl -z-10 opacity-50" />
            )}

            {/* Icon Placeholder - Custom defined in parent or mapped here */}
            <div className="mb-6 flex justify-center">
                <div
                    className="w-16 h-16 rounded-full flex items-center justify-center border border-white/5 bg-white/[0.02]"
                    style={{ borderColor: `${accentColor}40` }}
                >
                    {/* Simple shapes for icons as per request, avoiding external libraries for strict control */}
                    {tier === 'start' && (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="1.5">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                    )}
                    {tier === 'growth' && (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="1.5">
                            <path d="M22 6L12 16l-4-4-6 6" /><path d="M22 6h-6" /><path d="M22 6v6" />
                        </svg>
                    )}
                    {tier === 'investor' && (
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="1.5">
                            <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
                        </svg>
                    )}
                    {tier === 'partner' && (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="1.5">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                        </svg>
                    )}
                </div>
            </div>

            {/* Header */}
            <h3 className="text-center text-sm tracking-[0.2em] uppercase text-white/90 font-medium mb-1">
                {tier === 'start' && 'Старт'}
                {tier === 'growth' && 'Рост'}
                {tier === 'investor' && 'Инвестор'}
                {tier === 'partner' && 'Партнёр'}
            </h3>
            <p className="text-center text-xs text-white/40 mb-6">{days}</p>

            {/* Price */}
            <div className="text-center mb-6">
                {oldPrice && (
                    <div className="text-xs text-white/30 line-through mb-1 font-light decoration-white/20">
                        {oldPrice}
                    </div>
                )}
                <div className="text-2xl md:text-3xl font-bold" style={{ color: '#C9A962' }}>
                    {price}
                </div>
            </div>

            {/* Divider */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-6" />

            {/* Features */}
            <ul className="space-y-3 mb-8 flex-1">
                {features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-xs text-white/60">
                        <span className="text-[#C9A962] mt-px">✦</span>
                        <span className="leading-relaxed">{feature}</span>
                    </li>
                ))}
            </ul>

            {/* Bonus Area */}
            {bonus && (
                <div className="mb-6 p-3 rounded-lg bg-gradient-to-r from-white/[0.03] to-transparent border border-white/5">
                    <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Подарок</div>
                    <div className="text-sm text-white/90 font-medium flex items-center gap-2">
                        <span className="text-lg">🎁</span>
                        {bonus}
                    </div>
                </div>
            )}

            {/* Action Button */}
            <button
                className={`
            w-full py-3 rounded-xl border border-white/10
            text-xs uppercase tracking-widest font-semibold text-white
            transition-all duration-300 relative overflow-hidden group/btn
            ${isInvestor ? 'bg-[#C9A962] text-black border-[#C9A962]' : 'bg-transparent hover:bg-white/5'}
        `}
            >
                <span className="relative z-10">
                    {isInvestor ? 'Вступить в клуб' : 'Выбрать'}
                </span>
                {/* Shimmer effect for Investor button */}
                {isInvestor && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 ease-in-out" />
                )}
            </button>

        </div>
    )
}
