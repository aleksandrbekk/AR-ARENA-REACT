import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
// ReactPlayer moved to KinescopeVideoPlayer component
import { PaymentModal } from '../components/premium/PaymentModal'
import { KinescopeVideoPlayer } from '../components/KinescopeVideoPlayer'

// ReactPlayer is now handled by KinescopeVideoPlayer component

// ============ КОНФИГУРАЦИЯ ============
const SECRET_CODE = '1990' // Секретный код из видео
// Сюда можно вставить прямую ссылку на YouTube/Vimeo или полный код вставки <iframe>
const VIDEO_SOURCE = '<div style="position: relative; padding-top: 56.25%; width: 100%"><iframe src="https://kinescope.io/embed/6Y8BFWaag2M7gBLy66Paq6" allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write; screen-wake-lock;" frameborder="0" allowfullscreen style="position: absolute; width: 100%; height: 100%; top: 0; left: 0;"></iframe></div>'
const CODE_REVEAL_PERCENT = 70 // Процент просмотра, когда появляется код

// Длительность определяется автоматически плеером

// ============ СТИЛИ ДЛЯ AURORA ============
const auroraStyles = `
  @keyframes aurora-rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  @keyframes pulse-glow {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }

  @keyframes shimmer {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
`

// ============ ТИПЫ ============
interface Tariff {
    id: string
    name: string
    duration: string
    durationShort: string
    price: number
    oldPrice: number | null
    discount: string | null
    badge: string | null
    cardImage: string
    auroraColors: [string, string]
    auroraOpacity: number
    auroraBlur: number
    auroraSpeed: number
    isFeatured: boolean
    baseFeatures: string[]
    bonuses: string[]
    buttonStyle: 'outline' | 'fill'
    buttonColor: string
}

// ============ ОБЩИЕ ФИЧИ ДЛЯ ВСЕХ ТАРИФОВ ============
const commonFeatures = [
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
]

// ============ ДАННЫЕ ТАРИФОВ ============
const tariffs: Tariff[] = [
    {
        id: 'classic',
        name: 'CLASSIC',
        duration: '1 месяц',
        durationShort: '/мес',
        price: 4000,
        oldPrice: null,
        discount: null,
        badge: null,
        cardImage: '/cards/classic.png',
        auroraColors: ['#FFFFFF', '#E5E5E5'],
        auroraOpacity: 0.3,
        auroraBlur: 15,
        auroraSpeed: 10,
        isFeatured: false,
        baseFeatures: commonFeatures,
        bonuses: [],
        buttonStyle: 'outline',
        buttonColor: '#FFFFFF'
    },
    {
        id: 'gold',
        name: 'GOLD',
        duration: '3 месяца',
        durationShort: '/3 мес',
        price: 10900,
        oldPrice: 12000,
        discount: null,
        badge: null,
        cardImage: '/cards/gold.png',
        auroraColors: ['#F5A623', '#E69500'],
        auroraOpacity: 0.6,
        auroraBlur: 18,
        auroraSpeed: 8,
        isFeatured: false,
        baseFeatures: commonFeatures,
        bonuses: [],
        buttonStyle: 'outline',
        buttonColor: '#F5A623'
    },
    {
        id: 'platinum',
        name: 'PLATINUM',
        duration: '6 месяцев',
        durationShort: '/6 мес',
        price: 19900,
        oldPrice: 24000,
        discount: null,
        badge: 'ХИТ',
        cardImage: '/cards/platinum.png',
        auroraColors: ['#8A8A8A', '#6B6B6B'],
        auroraOpacity: 0.8,
        auroraBlur: 12,
        auroraSpeed: 5,
        isFeatured: false,
        baseFeatures: commonFeatures,
        bonuses: ['Групповые разборы портфелей'],
        buttonStyle: 'outline',
        buttonColor: '#8A8A8A'
    }
]

// ============ СНЕЖИНКИ ============
const Snowflakes = () => {
    const [flakes] = useState(() => Array.from({ length: 6 }, (_, i) => ({
        id: i,
        size: 2 + Math.random() * 3,
        left: Math.random() * 100,
        delay: Math.random() * 10,
        duration: 20 + Math.random() * 10
    })))

    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
            {flakes.map((flake) => (
                <motion.div
                    key={flake.id}
                    className="absolute rounded-full bg-white"
                    style={{
                        width: flake.size,
                        height: flake.size,
                        left: `${flake.left}%`,
                        top: -10,
                        opacity: 0.06,
                        filter: 'blur(1px)'
                    }}
                    animate={{
                        y: ['0vh', '105vh'],
                        x: [0, Math.sin(flake.id) * 20]
                    }}
                    transition={{
                        duration: flake.duration,
                        delay: flake.delay,
                        repeat: Infinity,
                        ease: 'linear'
                    }}
                />
            ))}
        </div>
    )
}

// ============ КОМПОНЕНТ КАРТОЧКИ ============
interface PricingCardProps {
    tariff: Tariff
    index: number
    onBuy: (tariff: Tariff) => void
}

function PricingCard({ tariff, index, onBuy }: PricingCardProps) {
    return (
        <motion.div
            className="relative h-full"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
        >
            {/* Aurora glow container */}
            <div
                className="relative rounded-xl overflow-hidden h-full"
                style={{ background: '#08080a' }}
            >
                {/* Aurora ::before effect */}
                <div
                    className="absolute inset-[-2px] rounded-xl"
                    style={{
                        background: `conic-gradient(
              from 0deg,
              transparent 0deg,
              ${tariff.auroraColors[0]} 60deg,
              ${tariff.auroraColors[1]} 120deg,
              transparent 180deg,
              ${tariff.auroraColors[0]} 240deg,
              ${tariff.auroraColors[1]} 300deg,
              transparent 360deg
            )`,
                        filter: `blur(${tariff.auroraBlur}px)`,
                        opacity: tariff.auroraOpacity,
                        animation: `aurora-rotate ${tariff.auroraSpeed}s linear infinite`,
                        zIndex: 0
                    }}
                />

                {/* Inner background */}
                <div
                    className="absolute inset-[1px] rounded-[11px]"
                    style={{ background: '#08080a', zIndex: 1 }}
                />

                {/* Content */}
                <div className="relative z-[2] p-5 md:p-6 h-full flex flex-col">
                    {/* Название + Карта */}
                    <div className="flex items-start justify-between mb-4 md:mb-5">
                        <div>
                            <h3
                                className="text-lg md:text-xl font-bold tracking-wider"
                                style={{
                                    color: tariff.auroraColors[0],
                                    textShadow: `0 0 20px ${tariff.auroraColors[0]}80, 0 0 40px ${tariff.auroraColors[0]}40`
                                }}
                            >
                                {tariff.name}
                            </h3>
                            <div className="text-gray-500 text-xs md:text-sm mt-1">{tariff.duration}</div>
                        </div>

                        <img
                            src={tariff.cardImage}
                            alt={`${tariff.name} card`}
                            className="w-14 md:w-16 h-auto rounded-md opacity-90 flex-shrink-0"
                        />
                    </div>

                    {/* Цена */}
                    <div className="mb-4 md:mb-6">
                        <div className="h-4 md:h-5 mb-1 flex items-center gap-2">
                            {tariff.oldPrice ? (
                                <>
                                    <span className="text-gray-500 text-xs md:text-sm line-through decoration-white/30 decoration-1">
                                        {tariff.oldPrice.toLocaleString('ru-RU')} ₽
                                    </span>
                                    <span className="text-green-400 text-xs md:text-sm font-medium">
                                        выгода {(tariff.oldPrice - tariff.price).toLocaleString('ru-RU')} ₽
                                    </span>
                                </>
                            ) : <div />}
                        </div>

                        <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-white whitespace-nowrap">
                                {tariff.price.toLocaleString('ru-RU')} ₽
                            </span>
                            {tariff.durationShort && <span className="text-gray-500 text-xs md:text-sm whitespace-nowrap">{tariff.durationShort}</span>}
                        </div>
                    </div>

                    {/* Разделитель */}
                    <div className="h-px bg-white/10 mb-4 md:mb-6" />

                    {/* Базовые функции */}
                    {tariff.baseFeatures.length > 0 && (
                        <div className="space-y-2 md:space-y-3 mb-4 md:mb-6">
                            {tariff.baseFeatures.map((feature, i) => (
                                <div key={i} className="flex items-start gap-2 md:gap-3 text-xs md:text-sm">
                                    <svg
                                        className="w-4 h-4 md:w-5 md:h-5 mt-0.5 flex-shrink-0"
                                        style={{ color: tariff.auroraColors[0] }}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span className="text-gray-300">{feature}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* VIP бонус */}
                    {tariff.bonuses.length > 0 && (
                        <div
                            className="mb-4 md:mb-6 p-3 md:p-4 rounded-lg"
                            style={{
                                background: `linear-gradient(135deg, ${tariff.auroraColors[0]}15, ${tariff.auroraColors[1]}10)`,
                                border: `1px solid ${tariff.auroraColors[0]}30`
                            }}
                        >
                            {tariff.bonuses.map((bonus, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs md:text-sm">
                                    <span
                                        className="px-1.5 py-0.5 text-[10px] font-bold rounded"
                                        style={{
                                            background: `linear-gradient(135deg, ${tariff.auroraColors[0]}, ${tariff.auroraColors[1]})`,
                                            color: '#fff'
                                        }}
                                    >
                                        VIP
                                    </span>
                                    <span className="text-white font-medium">{bonus}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Spacer */}
                    <div className="flex-grow" />

                    {/* Кнопка */}
                    <motion.button
                        onClick={() => onBuy(tariff)}
                        className="w-full py-3 md:py-3.5 rounded-lg text-sm md:text-base font-medium transition-all text-center block text-white relative z-20 cursor-pointer"
                        style={{
                            border: `1px solid ${tariff.auroraColors[0]}50`,
                            background: `${tariff.auroraColors[0]}15`
                        }}
                        whileHover={{
                            scale: 1.02,
                            boxShadow: `0 0 20px ${tariff.auroraColors[0]}30`
                        }}
                        whileTap={{ scale: 0.98 }}
                    >
                        {tariff.id === 'classic' ? 'Начать' : `Выбрать ${tariff.name}`}
                    </motion.button>
                </div>
            </div>
        </motion.div>
    )
}

// ============ CODE INPUT WITH BORDER PROGRESS ============
interface CodeInputProps {
    onComplete: (code: string) => void
    error: boolean
    progress: number // 0-100
}

function CodeInput({ onComplete, error, progress }: CodeInputProps) {
    const [digits, setDigits] = useState(['', '', '', ''])
    const inputRefs = [
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null)
    ]

    const handleChange = (index: number, value: string) => {
        // Only allow digits
        if (!/^\d*$/.test(value)) return

        const newDigits = [...digits]
        newDigits[index] = value.slice(-1) // Take only last char

        setDigits(newDigits)

        // Auto-focus next input
        if (value && index < 3) {
            inputRefs[index + 1].current?.focus()
        }

        // Check if complete
        if (newDigits.every(d => d !== '')) {
            onComplete(newDigits.join(''))
        }
    }

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !digits[index] && index > 0) {
            inputRefs[index - 1].current?.focus()
        }
    }

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault()
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
        const newDigits = [...digits]

        for (let i = 0; i < pastedData.length; i++) {
            newDigits[i] = pastedData[i]
        }

        setDigits(newDigits)

        if (newDigits.every(d => d !== '')) {
            onComplete(newDigits.join(''))
        }
    }

    // Calculate border progress for each field (each field fills 25%)
    const getFieldProgress = (fieldIndex: number) => {
        const fieldStart = fieldIndex * 25
        const fieldEnd = (fieldIndex + 1) * 25

        if (progress >= fieldEnd) return 100 // Field fully filled
        if (progress <= fieldStart) return 0 // Field not started
        return ((progress - fieldStart) / 25) * 100 // Partial progress within field
    }

    return (
        <div className="flex gap-3 sm:gap-4">
            {digits.map((digit, index) => {
                const fieldProgress = getFieldProgress(index)

                return (
                    <div key={index} className="relative">
                        {/* Animated border SVG */}
                        <svg
                            className="absolute inset-0 w-full h-full pointer-events-none"
                            viewBox="0 0 64 80"
                            fill="none"
                            style={{ borderRadius: 12 }}
                        >
                            {/* Background border */}
                            <rect
                                x="1"
                                y="1"
                                width="62"
                                height="78"
                                rx="11"
                                stroke="rgba(255, 255, 255, 0.15)"
                                strokeWidth="2"
                                fill="none"
                            />
                            {/* Animated progress border */}
                            <rect
                                x="1"
                                y="1"
                                width="62"
                                height="78"
                                rx="11"
                                stroke="url(#borderGradient)"
                                strokeWidth="2.5"
                                fill="none"
                                strokeLinecap="round"
                                strokeDasharray="280"
                                strokeDashoffset={280 - (fieldProgress / 100) * 280}
                                style={{
                                    transition: 'stroke-dashoffset 0.3s ease',
                                    filter: fieldProgress > 0 ? 'drop-shadow(0 0 6px rgba(255, 215, 0, 0.6))' : 'none'
                                }}
                            />
                            <defs>
                                <linearGradient id="borderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#FFD700" />
                                    <stop offset="100%" stopColor="#FFA500" />
                                </linearGradient>
                            </defs>
                        </svg>

                        <motion.input
                            ref={inputRefs[index]}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            onPaste={handlePaste}
                            className={`
                                w-14 h-20 sm:w-16 sm:h-24 text-center text-2xl sm:text-3xl font-bold rounded-xl
                                bg-white/5 border-2 border-transparent outline-none transition-all
                                focus:bg-white/10
                                ${error ? 'animate-shake' : ''}
                            `}
                            style={{ color: '#FFD700' }}
                            animate={error ? { x: [0, -10, 10, -10, 10, 0] } : {}}
                            transition={{ duration: 0.4 }}
                        />
                    </div>
                )
            })}
        </div>
    )
}

// ============ VIDEO PLAYER ============
// ============ CUSTOM PROGRESS BAR ============
function CustomProgressBar({ progress }: { progress: number }) {
    return (
        <div className="w-full mt-4">
            {/* Text Label */}
            <div className="flex justify-between items-end mb-2">
                <span className="text-white/40 text-[10px] uppercase tracking-wider font-medium">Прогресс просмотра</span>
                <span className="text-[#FFD700] text-xs font-bold tabular-nums">{Math.round(progress)}%</span>
            </div>

            {/* Bar Container */}
            <div className="relative w-full h-1.5 flex items-center">
                {/* Background Track */}
                <div className="absolute inset-0 bg-white/10 rounded-full overflow-hidden" />

                {/* Fill */}
                <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#C9A962] to-[#FFD700] rounded-full transition-all duration-300 ease-out will-change-width z-10"
                    style={{ width: `${progress}%` }}
                >
                    {/* Glow follower (inside fill) */}
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-[#FFD700] blur-[6px] opacity-100" />
                </div>

                {/* Gift Icon at the end */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 z-20 transform translate-x-1/3">
                    <motion.div
                        animate={progress >= 100 ? { scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] } : {}}
                        transition={{ duration: 1, repeat: progress >= 100 ? Infinity : 0, repeatDelay: 2 }}
                        className={`p-1.5 rounded-full border border-white/10 backdrop-blur-sm transition-colors duration-300 ${progress >= 100 ? 'bg-[#FFD700] text-black' : 'bg-black/80 text-white/40'}`}
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}

// ============ ФОРМАТИРОВАНИЕ ВРЕМЕНИ ============
function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
}

// ============ ГЛАВНАЯ СТРАНИЦА ============
export function VideoSalesPage() {
    const [videoProgress, setVideoProgress] = useState(0)
    const [videoDuration, setVideoDuration] = useState(0) // Длительность видео в секундах
    const [isUnlocked, setIsUnlocked] = useState(false)
    const [codeError, setCodeError] = useState(false)
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
    const [selectedTariff, setSelectedTariff] = useState<Tariff | null>(null)

    const pricingRef = useRef<HTMLDivElement>(null)

    // Сброс состояния при монтировании компонента (чтобы можно было пересмотреть)
    useEffect(() => {
        setVideoProgress(0)
        setVideoDuration(0)
        setIsUnlocked(false)
        setCodeError(false)
    }, []) // Пустой массив зависимостей = выполняется только при монтировании

    // Вычисляем оставшееся время
    const remainingTime = videoDuration > 0
        ? Math.max(0, videoDuration - (videoDuration * videoProgress / 100))
        : 0

    const handleCodeComplete = useCallback((code: string) => {
        if (code === SECRET_CODE) {
            setIsUnlocked(true)
            // Haptic feedback
            // @ts-ignore
            window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')

            // Scroll to pricing after animation
            setTimeout(() => {
                pricingRef.current?.scrollIntoView({ behavior: 'smooth' })
            }, 800)
        } else {
            setCodeError(true)
            // @ts-ignore
            window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error')
            setTimeout(() => setCodeError(false), 600)
        }
    }, [])

    const handleBuyClick = (tariff: Tariff) => {
        setSelectedTariff(tariff)
        setIsPaymentModalOpen(true)
    }



    return (
        <>
            <style>{auroraStyles}</style>

            <div className="min-h-screen bg-[#0a0a0a] text-white relative overflow-x-hidden selection:bg-yellow-500/30">
                {/* Background gradient */}
                <div
                    className="fixed inset-0 pointer-events-none"
                    style={{
                        background: 'radial-gradient(ellipse at 50% 0%, rgba(255, 215, 0, 0.03) 0%, transparent 50%)'
                    }}
                />

                <Snowflakes />

                {/* ========== VIDEO SECTION ========== */}
                <AnimatePresence>
                    {!isUnlocked && (
                        <motion.section
                            className="min-h-screen flex flex-col items-center justify-start pt-16 sm:pt-20 px-4 sm:px-6 pb-12"
                            exit={{
                                y: '-100%',
                                transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
                            }}
                        >
                            {/* Header */}
                            <motion.div
                                className="text-center mb-6 sm:mb-8"
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6 }}
                            >
                                <div
                                    className="text-[10px] sm:text-xs tracking-[0.4em] uppercase mb-2 font-medium"
                                    style={{
                                        background: 'linear-gradient(90deg, #C9A962, #FFD700, #C9A962)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text'
                                    }}
                                >
                                    AR PREMIUM CLUB
                                </div>
                                <h1 className="text-2xl sm:text-3xl md:text-4xl font-light tracking-wide">
                                    Эксклюзивное предложение
                                </h1>
                            </motion.div>

                            {/* Video Player */}
                            <motion.div
                                className="w-full max-w-2xl mb-4"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.6, delay: 0.2 }}
                            >
                                <KinescopeVideoPlayer
                                    videoSource={VIDEO_SOURCE}
                                    onProgress={setVideoProgress}
                                    onDuration={setVideoDuration}
                                    videoProgress={videoProgress}
                                    ProgressBar={CustomProgressBar}
                                />

                                {/* Completion badge - shows when video is 100% watched */}
                                {videoProgress >= CODE_REVEAL_PERCENT && (
                                    <motion.div
                                        className="mt-4 text-center"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                    >
                                        <div className="inline-flex flex-col items-center gap-1 px-5 py-3 rounded-2xl bg-[#FFD700]/10 border border-[#FFD700]/30">
                                            <span className="text-[#FFD700] font-semibold text-sm">
                                                Введите код из видео и получите
                                            </span>
                                            <span className="text-white font-medium text-sm">
                                                Лучшие условия для включения в AR Premium
                                            </span>
                                            <span className="text-white/60 text-xs mt-1">
                                                Спец.бонус клуба в Январе — TOP 10 RWA активов
                                            </span>
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>

                            {/* Code Input Section */}
                            <motion.div
                                className="relative flex flex-col items-center"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.4 }}
                            >
                                {/* Timer above code input */}
                                {videoDuration > 0 && (
                                    <div className="mb-4 text-center">
                                        <div className="text-white/40 text-[10px] uppercase tracking-wider mb-1">
                                            Осталось до конца видео
                                        </div>
                                        <div
                                            className="text-3xl sm:text-4xl font-bold tabular-nums"
                                            style={{
                                                background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                                                WebkitBackgroundClip: 'text',
                                                WebkitTextFillColor: 'transparent',
                                                backgroundClip: 'text',
                                                textShadow: '0 0 30px rgba(255, 215, 0, 0.3)'
                                            }}
                                        >
                                            {formatTime(remainingTime)}
                                        </div>
                                    </div>
                                )}

                                {/* Code Input with border progress */}
                                <div className="flex flex-col items-center mb-6">
                                    <CodeInput onComplete={handleCodeComplete} error={codeError} progress={videoProgress} />

                                    <div className="mt-4 text-center">
                                        <p className="text-white/50 text-sm">Введите код из видео</p>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Hint */}
                            <motion.p
                                className="text-white/30 text-xs text-center mt-8 max-w-md"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 1 }}
                            >
                                Смотрите видео внимательно — секретный код будет озвучен во время просмотра
                            </motion.p>
                        </motion.section>
                    )}
                </AnimatePresence>

                {/* ========== PRICING SECTION (REVEALED) ========== */}
                <AnimatePresence>
                    {isUnlocked && (
                        <motion.section
                            ref={pricingRef}
                            className="min-h-screen px-4 sm:px-6 py-12 sm:py-16"
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        >
                            {/* Success Message */}
                            <motion.div
                                className="text-center mb-10 sm:mb-14"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5 }}
                            >
                                <motion.div
                                    className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                                    style={{
                                        background: 'linear-gradient(135deg, #FFD70020, #FFA50015)',
                                        border: '2px solid #FFD70050'
                                    }}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: [0, 1.2, 1] }}
                                    transition={{ duration: 0.5 }}
                                >
                                    <svg className="w-8 h-8 text-[#FFD700]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </motion.div>

                                <div
                                    className="text-[10px] sm:text-xs tracking-[0.4em] uppercase mb-2 font-medium"
                                    style={{
                                        background: 'linear-gradient(90deg, #C9A962, #FFD700, #C9A962)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text'
                                    }}
                                >
                                    Код принят
                                </div>
                                <h2 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-wide mb-4">
                                    Добро пожаловать в клуб
                                </h2>
                                <p className="text-white/50 text-sm sm:text-base">
                                    Выберите подходящий тариф
                                </p>
                            </motion.div>

                            {/* Pricing Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6 mb-12 items-start max-w-5xl mx-auto">
                                {tariffs.map((tariff, index) => (
                                    <PricingCard
                                        key={tariff.id}
                                        tariff={tariff}
                                        index={index}
                                        onBuy={handleBuyClick}
                                    />
                                ))}
                            </div>
                        </motion.section>
                    )}
                </AnimatePresence>

                <PaymentModal
                    isOpen={isPaymentModalOpen}
                    onClose={() => setIsPaymentModalOpen(false)}
                    tariff={selectedTariff}
                />
            </div>
        </>
    )
}
