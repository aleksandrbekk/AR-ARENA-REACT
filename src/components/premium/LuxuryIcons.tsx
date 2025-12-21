

// Common definition for gradients to be reused
const Defs = () => (
    <defs>
        {/* Bronze Gradient */}
        <linearGradient id="bronzeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E6A67C" />
            <stop offset="50%" stopColor="#CD7F32" />
            <stop offset="100%" stopColor="#8B4513" />
        </linearGradient>
        <linearGradient id="bronzeShine" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="white" stopOpacity="0.4" />
            <stop offset="100%" stopColor="transparent" />
        </linearGradient>

        {/* Silver/Platinum Gradient */}
        <linearGradient id="silverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E0E0E0" />
            <stop offset="50%" stopColor="#A0A0A0" />
            <stop offset="100%" stopColor="#404040" />
        </linearGradient>
        <linearGradient id="silverShine" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="50%" stopColor="#C0C0C0" />
            <stop offset="100%" stopColor="#808080" />
        </linearGradient>

        {/* Gold Gradient */}
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFF2CC" />
            <stop offset="20%" stopColor="#FFD700" />
            <stop offset="50%" stopColor="#B8860B" />
            <stop offset="100%" stopColor="#8B6508" />
        </linearGradient>
        <linearGradient id="goldSide" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#DAA520" />
            <stop offset="100%" stopColor="#FFD700" />
        </linearGradient>

        {/* Platinum/Diamond Gradient */}
        <linearGradient id="diamondGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E0F7FA" />
            <stop offset="50%" stopColor="#B2EBF2" />
            <stop offset="100%" stopColor="#00BCD4" />
        </linearGradient>

        {/* Glow Filter */}
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
            </feMerge>
        </filter>
    </defs>
)

export const BronzeShieldIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 64 64" className={className} fill="none">
        <Defs />
        <filter id="dropShadow">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.5" />
        </filter>
        {/* Shield Body */}
        <path
            d="M32 4L6 14v16c0 18.2 11.2 35.1 26 40 14.8-4.9 26-21.8 26-40V14L32 4z"
            fill="url(#bronzeGrad)"
            stroke="#8B4513"
            strokeWidth="1"
            filter="url(#dropShadow)"
        />
        {/* Inner Highlight for 3D effect */}
        <path
            d="M32 6L9 15v14.5c0 16.5 10.1 31.9 23 36.5 12.9-4.6 23-20 23-36.5V15L32 6z"
            fill="none"
            stroke="url(#bronzeShine)"
            strokeWidth="2"
            opacity="0.8"
        />
        {/* Central Detail */}
        <path d="M32 14v36" stroke="#5A2F0F" strokeWidth="1" opacity="0.3" />
        <path d="M14 26h36" stroke="#5A2F0F" strokeWidth="1" opacity="0.3" />
    </svg>
)

export const SilverGrowthIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 64 64" className={className} fill="none">
        <Defs />
        <filter id="silverGlow">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        {/* Chart Bars */}
        <rect x="8" y="36" width="10" height="20" rx="2" fill="url(#silverGrad)" />
        <rect x="22" y="24" width="10" height="32" rx="2" fill="url(#silverGrad)" />
        <rect x="36" y="16" width="10" height="40" rx="2" fill="url(#silverGrad)" />
        <rect x="50" y="4" width="10" height="52" rx="2" fill="url(#silverShine)" filter="url(#glow)" />

        {/* Rising Arrow */}
        <path
            d="M4 44 L20 28 L32 36 L56 8"
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
            opacity="0.9"
        />
    </svg>
)

export const GoldIngotIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 64 48" className={className} fill="none">
        <Defs />
        {/* 3D Gold Bar */}
        <g transform="translate(0, 8)">
            {/* Top Face */}
            <path d="M12 4 L52 4 L44 14 L4 14 Z" fill="url(#goldGrad)" opacity="0.9" />
            <path d="M12 4 L52 4 L44 14 L4 14 Z" fill="url(#goldShine)" opacity="0.4" />

            {/* Front Face */}
            <path d="M4 14 L44 14 L44 32 L4 32 Z" fill="url(#goldSide)" />

            {/* Side Face */}
            <path d="M44 14 L52 4 L52 22 L44 32 Z" fill="#B8860B" />

            {/* Shine highlight on edge */}
            <path d="M4 14 L44 14" stroke="white" strokeWidth="1" opacity="0.6" />
            <path d="M44 14 L52 4" stroke="white" strokeWidth="1" opacity="0.6" />

            {/* Stamp */}
            <text x="24" y="26" fontSize="8" fill="#8B6508" fontWeight="bold" fontFamily="serif">999.9</text>
        </g>

        {/* Sparkles */}
        <path d="M50 4L52 0L54 4L58 6L54 8L52 12L50 8L46 6L50 4Z" fill="white" className="animate-pulse" />
    </svg>
)

export const DiamondStarIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 64 64" className={className} fill="none">
        <Defs />
        <g transform="translate(32,32)">
            {/* Diamond Star Shape */}
            <path
                d="M0 -30 L8 -8 L30 0 L8 8 L0 30 L-8 8 L-30 0 L-8 -8 Z"
                fill="url(#diamondGrad)"
                stroke="white"
                strokeWidth="0.5"
                filter="url(#glow)"
            />
            {/* Facets */}
            <path d="M0 -30 L0 30" stroke="white" strokeWidth="0.5" opacity="0.5" />
            <path d="M-30 0 L30 0" stroke="white" strokeWidth="0.5" opacity="0.5" />
            <circle cx="0" cy="0" r="4" fill="white" filter="url(#glow)" />
        </g>

        {/* Floating Particles */}
        <circle cx="10" cy="10" r="1.5" fill="#A8D4E6" className="animate-pulse" style={{ animationDelay: '0.2s' }} />
        <circle cx="54" cy="40" r="1" fill="#A8D4E6" className="animate-pulse" style={{ animationDelay: '0.8s' }} />
        <circle cx="15" cy="50" r="1.5" fill="#FFFFFF" className="animate-pulse" style={{ animationDelay: '0.5s' }} />
    </svg>
)

export const GiftBoxIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 64 64" className={className} fill="none">
        <Defs />
        <g transform="translate(12, 12)">
            {/* Box Base (Black Matte) */}
            <rect x="4" y="16" width="32" height="24" fill="#1a1a1a" stroke="#333" />

            {/* Lid (Black Matte) */}
            <rect x="2" y="10" width="36" height="6" fill="#222" stroke="#444" />

            {/* Gold Ribbon Vertical */}
            <rect x="18" y="16" width="4" height="24" fill="url(#goldGrad)" />
            <rect x="18" y="10" width="4" height="6" fill="url(#goldGrad)" />

            {/* Bow */}
            <path d="M20 10 C 14 0, 4 4, 18 10 C 36 4, 26 0, 20 10" fill="url(#goldGrad)" />
            <circle cx="20" cy="10" r="2" fill="#FFD700" />
        </g>
    </svg>
)
