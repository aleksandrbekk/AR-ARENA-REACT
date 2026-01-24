import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PaymentModal } from '../components/premium/PaymentModal'
import { KinescopeVideoPlayer } from '../components/KinescopeVideoPlayer'
import { supabase } from '../lib/supabase'
import { setStorageItem, getStorageItem, STORAGE_KEYS } from '../hooks/useLocalStorage'

// ============ КОНФИГУРАЦИЯ ============
const SECRET_CODE = '5421'
const VIDEO_SOURCE = '<div style="position: relative; padding-top: 56.25%; width: 100%"><iframe src="https://kinescope.io/embed/6Y8BFWaag2M7gBLy66Paq6" allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write; screen-wake-lock;" frameborder="0" allowfullscreen style="position: absolute; width: 100%; height: 100%; top: 0; left: 0;"></iframe></div>'
const CODE_REVEAL_PERCENT = 70

// ============ СТИЛИ ДЛЯ AURORA ============
const auroraStyles = `
  @keyframes aurora-rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
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

// ============ ОБЩИЕ ФИЧИ ============
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

// ============ КОМПОНЕНТ КАРТОЧКИ (КОМПАКТНЫЙ) ============
interface PricingCardProps {
    tariff: Tariff
    index: number
    onBuy: (tariff: Tariff) => void
}

function PricingCard({ tariff, index, onBuy }: PricingCardProps) {
    return (
        <motion.div
            className="relative h-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
        >
            <div
                className="relative rounded-xl overflow-hidden h-full"
                style={{ background: '#08080a' }}
            >
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
                <div
                    className="absolute inset-[1px] rounded-[11px]"
                    style={{ background: '#08080a', zIndex: 1 }}
                />
                <div className="relative z-[2] p-4 h-full flex flex-col">
                    <div className="flex items-start justify-between mb-3">
                        <div>
                            <h3
                                className="text-base font-bold tracking-wider"
                                style={{
                                    color: tariff.auroraColors[0],
                                    textShadow: `0 0 20px ${tariff.auroraColors[0]}80, 0 0 40px ${tariff.auroraColors[0]}40`
                                }}
                            >
                                {tariff.name}
                            </h3>
                            <div className="text-gray-500 text-xs mt-0.5">{tariff.duration}</div>
                        </div>
                        <img
                            src={tariff.cardImage}
                            alt={`${tariff.name} card`}
                            className="w-12 h-auto rounded-md opacity-90 flex-shrink-0"
                        />
                    </div>
                    <div className="mb-3">
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-xl font-bold text-white">
                                {tariff.price.toLocaleString('ru-RU')} ₽
                            </span>
                            {tariff.durationShort && <span className="text-gray-500 text-xs">{tariff.durationShort}</span>}
                        </div>
                    </div>
                    <div className="h-px bg-white/10 mb-3" />
                    <div className="space-y-1.5 mb-3 flex-grow">
                        {tariff.baseFeatures.slice(0, 4).map((feature, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs">
                                <svg
                                    className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"
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
                    <motion.button
                        onClick={() => onBuy(tariff)}
                        className="w-full py-2.5 rounded-lg text-sm font-medium transition-all text-center block text-white relative z-20 cursor-pointer"
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

// ============ CODE INPUT ============
interface CodeInputProps {
    onComplete: (code: string) => void
    error: boolean
    progress: number
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
        if (!/^\d*$/.test(value)) return
        const newDigits = [...digits]
        newDigits[index] = value.slice(-1)
        setDigits(newDigits)
        if (value && index < 3) {
            inputRefs[index + 1].current?.focus()
        }
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

    const getFieldProgress = (fieldIndex: number) => {
        const fieldStart = fieldIndex * 25
        const fieldEnd = (fieldIndex + 1) * 25
        if (progress >= fieldEnd) return 100
        if (progress <= fieldStart) return 0
        return ((progress - fieldStart) / 25) * 100
    }

    return (
        <div className="flex gap-2">
            {digits.map((digit, index) => {
                const fieldProgress = getFieldProgress(index)
                return (
                    <div key={index} className="relative">
                        <svg
                            className="absolute inset-0 w-full h-full pointer-events-none"
                            viewBox="0 0 64 80"
                            fill="none"
                            style={{ borderRadius: 12 }}
                        >
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
                            <rect
                                x="1"
                                y="1"
                                width="62"
                                height="78"
                                rx="11"
                                stroke={error ? '#EF4444' : 'url(#borderGradient)'}
                                strokeWidth="2.5"
                                fill="none"
                                strokeLinecap="round"
                                strokeDasharray="280"
                                strokeDashoffset={280 - (fieldProgress / 100) * 280}
                                style={{
                                    transition: 'stroke-dashoffset 0.3s ease, stroke 0.3s ease',
                                    filter: error 
                                        ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.8))' 
                                        : fieldProgress > 0 
                                            ? 'drop-shadow(0 0 6px rgba(255, 215, 0, 0.6))' 
                                            : 'none'
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
                                w-12 h-16 text-center text-xl font-bold rounded-xl
                                bg-white/5 border-2 outline-none transition-all
                                focus:bg-white/10
                                ${error ? 'animate-shake border-red-500' : 'border-transparent'}
                            `}
                            style={{ 
                                color: error ? '#EF4444' : '#FFD700',
                                backgroundColor: error ? 'rgba(239, 68, 68, 0.1)' : undefined
                            }}
                            animate={error ? { 
                                x: [0, -10, 10, -10, 10, 0],
                                scale: [1, 1.05, 1, 1.05, 1],
                                boxShadow: [
                                    '0 0 0px rgba(239, 68, 68, 0)',
                                    '0 0 20px rgba(239, 68, 68, 0.8)',
                                    '0 0 0px rgba(239, 68, 68, 0)',
                                    '0 0 20px rgba(239, 68, 68, 0.8)',
                                    '0 0 0px rgba(239, 68, 68, 0)'
                                ]
                            } : {}}
                            transition={{ duration: 0.5 }}
                        />
                    </div>
                )
            })}
        </div>
    )
}

// ============ PROGRESS BAR ============
function CustomProgressBar({ progress }: { progress: number }) {
    return (
        <div className="w-full mt-2">
            <div className="flex justify-between items-end mb-1.5">
                <span className="text-white/40 text-[9px] uppercase tracking-wider font-medium">Прогресс</span>
                <span className="text-[#FFD700] text-xs font-bold tabular-nums">{Math.round(progress)}%</span>
            </div>
            <div className="relative w-full h-1 flex items-center">
                <div className="absolute inset-0 bg-white/10 rounded-full overflow-hidden" />
                <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#C9A962] to-[#FFD700] rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-[#FFD700] blur-[4px] opacity-100" />
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

// ============ ГЛАВНАЯ СТРАНИЦА (КОМПАКТНАЯ ДЛЯ TG) ============
export function VideoSalesPageTg() {
    const [videoProgress, setVideoProgress] = useState(0)
    const [videoDuration, setVideoDuration] = useState(0)
    const [isUnlocked, setIsUnlocked] = useState(false)
    const [codeError, setCodeError] = useState(false)
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
    const [selectedTariff, setSelectedTariff] = useState<Tariff | null>(null)

    const pricingRef = useRef<HTMLDivElement>(null)
    const sessionIdRef = useRef<string>(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
    const trackedProgressRef = useRef<Set<number>>(new Set())
    const utmSlugRef = useRef<string | null>(null)

    // Сброс состояния при монтировании
    useEffect(() => {
        setVideoProgress(0)
        setVideoDuration(0)
        setIsUnlocked(false)
        setCodeError(false)
        trackedProgressRef.current.clear()
        sessionIdRef.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }, [])

    // Инициализация Telegram WebApp
    useEffect(() => {
        const tg = window.Telegram?.WebApp
        if (tg) {
            // Инициализируем WebApp
            tg.ready()
            
            // Расширяем на мобильных устройствах
            const platform = tg.platform
            const isMobile = platform === 'android' || platform === 'ios'
            if (isMobile) {
                tg.expand()
                if (typeof tg.requestFullscreen === 'function') {
                    try { 
                        tg.requestFullscreen() 
                    } catch (e) { 
                        console.warn('requestFullscreen error', e) 
                    }
                }
            }
            
            // Настраиваем цвета
            tg.setHeaderColor('#0a0a0a')
            tg.setBackgroundColor('#0a0a0a')
        }
    }, [])

    // Сохранение UTM и telegram_id/username
    useEffect(() => {
        const tg = window.Telegram?.WebApp
        const user = tg?.initDataUnsafe?.user
        if (user?.id) {
            setStorageItem(STORAGE_KEYS.PROMO_TELEGRAM_ID, user.id.toString())
            if (user.username) {
                setStorageItem(STORAGE_KEYS.PROMO_TELEGRAM_USERNAME, user.username)
            }
        }

        const params = new URLSearchParams(window.location.search)
        const utmSource = params.get('utm_source')
        if (utmSource) {
            utmSlugRef.current = utmSource
            setStorageItem(STORAGE_KEYS.PROMO_UTM_SOURCE, utmSource)

            const trackClick = async () => {
                try {
                    const { data: link } = await supabase
                        .from('utm_tool_links')
                        .select('id, clicks')
                        .eq('slug', utmSource)
                        .single()

                    if (link) {
                        await supabase
                            .from('utm_tool_links')
                            .update({
                                clicks: link.clicks + 1,
                                last_click_at: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', link.id)
                    }

                    const telegramId = user?.id
                    await supabase
                        .from('promo_events')
                        .insert({
                            utm_slug: utmSource,
                            event_type: 'view_start',
                            progress_percent: 0,
                            telegram_id: telegramId ? parseInt(telegramId.toString()) : null,
                            user_agent: navigator.userAgent,
                            session_id: sessionIdRef.current
                        })
                } catch (err) {
                    console.error('Track click error:', err)
                }
            }

            trackClick()
            window.history.replaceState({}, '', '/promo-tg')
        }
    }, [])

    // Отслеживание прогресса
    useEffect(() => {
        if (!utmSlugRef.current || videoProgress === 0) return

        const progressMilestones = [25, 50, 75, 100]
        const currentMilestone = progressMilestones.find(m => videoProgress >= m && !trackedProgressRef.current.has(m))

        if (currentMilestone) {
            trackedProgressRef.current.add(currentMilestone)
            
            const trackProgress = async () => {
                try {
                    const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id
                    await supabase
                        .from('promo_events')
                        .insert({
                            utm_slug: utmSlugRef.current!,
                            event_type: `progress_${currentMilestone}` as any,
                            progress_percent: currentMilestone,
                            telegram_id: telegramId ? parseInt(telegramId.toString()) : null,
                            user_agent: navigator.userAgent,
                            session_id: sessionIdRef.current
                        })
                } catch (err) {
                    console.error('Track progress error:', err)
                }
            }

            trackProgress()
        }
    }, [videoProgress])

    const remainingTime = videoDuration > 0
        ? Math.max(0, videoDuration - (videoDuration * videoProgress / 100))
        : 0

    const handleCodeComplete = useCallback((code: string) => {
        const trackCodeEvent = async (isCorrect: boolean) => {
            try {
                const utmSource = utmSlugRef.current || getStorageItem<string>(STORAGE_KEYS.PROMO_UTM_SOURCE)
                if (utmSource) {
                    const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id
                    
                    await supabase
                        .from('promo_events')
                        .insert({
                            utm_slug: utmSource,
                            event_type: isCorrect ? 'code_correct' : 'code_incorrect',
                            progress_percent: Math.round(videoProgress),
                            code_entered: code,
                            telegram_id: telegramId ? parseInt(telegramId.toString()) : null,
                            user_agent: navigator.userAgent,
                            session_id: sessionIdRef.current
                        })

                    if (isCorrect) {
                        const { data: link } = await supabase
                            .from('utm_tool_links')
                            .select('id, conversions')
                            .eq('slug', utmSource)
                            .single()

                        if (link) {
                            await supabase
                                .from('utm_tool_links')
                                .update({
                                    conversions: (link.conversions || 0) + 1,
                                    updated_at: new Date().toISOString()
                                })
                                .eq('id', link.id)
                        }
                    }
                }
            } catch (err) {
                console.error('Track code event error:', err)
            }
        }

        if (code === SECRET_CODE) {
            setIsUnlocked(true)
            window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
            trackCodeEvent(true)
            setTimeout(() => {
                pricingRef.current?.scrollIntoView({ behavior: 'smooth' })
            }, 600)
        } else {
            setCodeError(true)
            window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error')
            trackCodeEvent(false)
            setTimeout(() => setCodeError(false), 1000)
        }
    }, [videoProgress])

    const handleBuyClick = (tariff: Tariff) => {
        setSelectedTariff(tariff)
        setIsPaymentModalOpen(true)
    }

    return (
        <>
            <style>{auroraStyles}</style>

            <div className="min-h-screen bg-[#0a0a0a] text-white relative overflow-x-hidden">
                <div
                    className="fixed inset-0 pointer-events-none"
                    style={{
                        background: 'radial-gradient(ellipse at 50% 0%, rgba(255, 215, 0, 0.03) 0%, transparent 50%)'
                    }}
                />

                <AnimatePresence>
                    {!isUnlocked && (
                        <motion.section
                            className="min-h-screen flex flex-col items-center justify-start pt-12 px-3 pb-8"
                            exit={{
                                y: '-100%',
                                transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
                            }}
                        >
                            <motion.div
                                className="text-center mb-4"
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                            >
                                <div
                                    className="text-[9px] tracking-[0.3em] uppercase mb-1.5 font-medium"
                                    style={{
                                        background: 'linear-gradient(90deg, #C9A962, #FFD700, #C9A962)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text'
                                    }}
                                >
                                    AR PREMIUM CLUB
                                </div>
                                <h1 className="text-xl font-light tracking-wide">
                                    Эксклюзивное предложение
                                </h1>
                            </motion.div>

                            <motion.div
                                className="w-full max-w-xl mb-3"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5, delay: 0.1 }}
                            >
                                <KinescopeVideoPlayer
                                    videoSource={VIDEO_SOURCE}
                                    onProgress={setVideoProgress}
                                    onDuration={setVideoDuration}
                                    videoProgress={videoProgress}
                                    ProgressBar={CustomProgressBar}
                                />

                                {videoProgress >= CODE_REVEAL_PERCENT && (
                                    <motion.div
                                        className="mt-3 text-center"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                    >
                                        <div className="inline-flex flex-col items-center gap-1 px-4 py-2 rounded-xl bg-[#FFD700]/10 border border-[#FFD700]/30">
                                            <span className="text-[#FFD700] font-semibold text-xs">
                                                Введите код из видео
                                            </span>
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>

                            <motion.div
                                className="relative flex flex-col items-center"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.3 }}
                            >
                                {videoDuration > 0 && (
                                    <div className="mb-3 text-center">
                                        <div className="text-white/40 text-[9px] uppercase tracking-wider mb-1">
                                            Осталось
                                        </div>
                                        <div
                                            className="text-2xl font-bold tabular-nums"
                                            style={{
                                                background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                                                WebkitBackgroundClip: 'text',
                                                WebkitTextFillColor: 'transparent',
                                                backgroundClip: 'text'
                                            }}
                                        >
                                            {formatTime(remainingTime)}
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-col items-center mb-4">
                                    <CodeInput onComplete={handleCodeComplete} error={codeError} progress={videoProgress} />
                                    <div className="mt-3 text-center">
                                        <p className="text-white/50 text-xs">Введите код из видео</p>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.section>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {isUnlocked && (
                        <motion.section
                            ref={pricingRef}
                            className="min-h-screen px-3 py-8"
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <motion.div
                                className="text-center mb-6"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.4 }}
                            >
                                <motion.div
                                    className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center"
                                    style={{
                                        background: 'linear-gradient(135deg, #FFD70020, #FFA50015)',
                                        border: '2px solid #FFD70050'
                                    }}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: [0, 1.2, 1] }}
                                    transition={{ duration: 0.4 }}
                                >
                                    <svg className="w-6 h-6 text-[#FFD700]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </motion.div>

                                <div
                                    className="text-[9px] tracking-[0.3em] uppercase mb-1.5 font-medium"
                                    style={{
                                        background: 'linear-gradient(90deg, #C9A962, #FFD700, #C9A962)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text'
                                    }}
                                >
                                    Код принят
                                </div>
                                <h2 className="text-2xl font-light tracking-wide mb-2">
                                    Добро пожаловать в клуб
                                </h2>
                                <p className="text-white/50 text-xs">
                                    Выберите подходящий тариф
                                </p>
                            </motion.div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-4xl mx-auto">
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
