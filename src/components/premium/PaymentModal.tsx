import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Define Tariff interface locally to match PricingPage
interface Tariff {
    id: string
    name: string
    duration: string
    durationShort: string
    price: number
    auroraColors: [string, string]
}

interface PaymentModalProps {
    isOpen: boolean
    onClose: () => void
    tariff: Tariff | null
}

// Crypto networks with their fees
const CRYPTO_NETWORKS = [
    { id: 'TON', name: 'TON', currency: 'USDT (TON)', fee: '~$0.5', color: 'from-blue-500 to-blue-600' },
    { id: 'BEP20', name: 'BNB Chain', currency: 'USDT (BEP20)', fee: '~$0.3', color: 'from-yellow-500 to-yellow-600' },
    { id: 'TRC20', name: 'Tron', currency: 'USDT (TRC20)', fee: '~$4', color: 'from-red-500 to-red-600' },
]

// Card payment currencies
const CARD_CURRENCIES = [
    { id: 'RUB', name: 'Рубли', symbol: '₽', color: 'from-blue-500 to-blue-600' },
    { id: 'USD', name: 'Доллары', symbol: '$', color: 'from-green-500 to-green-600' },
    { id: 'EUR', name: 'Евро', symbol: '€', color: 'from-purple-500 to-purple-600' },
]

export const PaymentModal: React.FC<PaymentModalProps> = ({
    isOpen,
    onClose,
    tariff
}) => {
    const [username, setUsername] = useState('')
    const [showNetworkSelect, setShowNetworkSelect] = useState(false)
    const [showCurrencySelect, setShowCurrencySelect] = useState(false)
    const [cryptoLoading, setCryptoLoading] = useState<string | null>(null)
    const [cardLoading, setCardLoading] = useState<string | null>(null)

    // Check if we have a Telegram ID available
    // @ts-ignore
    const tg = window.Telegram?.WebApp
    const telegramIdFromWebApp = tg?.initDataUnsafe?.user?.id
    const telegramIdFromStorage = localStorage.getItem('promo_telegram_id')
    const telegramUsernameFromStorage = localStorage.getItem('promo_telegram_username')
    const hasTelegramId = telegramIdFromWebApp || telegramIdFromStorage
    const [showUsernameInput] = useState(!hasTelegramId)
    
    // Если есть username из localStorage, используем его как начальное значение
    useEffect(() => {
        if (telegramUsernameFromStorage && !username) {
            setUsername(telegramUsernameFromStorage.replace('@', ''))
        }
    }, [telegramUsernameFromStorage])

    // Единый offerId для Premium подписки + periodicity для выбора срока
    const PREMIUM_OFFER_ID = '755e7046-e658-43e1-908d-0738766b464d'

    // Маппинг тарифа на periodicity (Lava API)
    const TARIFF_PERIODICITY: Record<string, string> = {
        'classic': 'MONTHLY',         // 1 месяц
        'gold': 'PERIOD_90_DAYS',     // 3 месяца
        'platinum': 'PERIOD_180_DAYS', // 6 месяцев
        'private': 'PERIOD_YEAR'      // 12 месяцев
    }

    // Цены в USD для крипто-оплаты (продакшн)
    const TARIFF_USD_PRICES: Record<string, number> = {
        'classic': 50,    // 1 мес
        'gold': 125,      // 3 мес
        'platinum': 225,  // 6 мес
        'private': 445    // 12 мес
    }

    // Helper to format price
    const formatPrice = (price?: number) => {
        return price ? price.toLocaleString('ru-RU') + ' ₽' : '...'
    }

    const handleCardCurrencySelect = async (currency: typeof CARD_CURRENCIES[0]) => {
        // @ts-ignore
        const tg = window.Telegram?.WebApp
        // Приоритет: WebApp > localStorage (с промо-страницы) > введенный username
        const telegramId = tg?.initDataUnsafe?.user?.id || localStorage.getItem('promo_telegram_id') || null
        const tgUsername = username.trim().replace('@', '') || localStorage.getItem('promo_telegram_username')?.replace('@', '') || ''
        const streamUtmSource = localStorage.getItem('stream_utm_source') || localStorage.getItem('promo_utm_source') || ''

        // Проверяем наличие идентификатора
        if (!telegramId && !tgUsername) {
            alert('Пожалуйста, введите ваш Telegram username')
            return
        }

        if (!tariff?.price) {
            alert('Ошибка: не выбран тариф')
            return
        }

        setCardLoading(currency.id)

        try {
            console.log('[PaymentModal] Creating invoice via API:', {
                telegramId,
                tgUsername,
                tariffId: tariff.id,
                currency: currency.id
            })

            // Получаем periodicity для выбранного тарифа
            const tariffKey = tariff.id.toLowerCase()
            const periodicity = TARIFF_PERIODICITY[tariffKey]

            if (!periodicity) {
                alert('Ошибка: неизвестный тариф ' + tariff.id)
                return
            }

            // Создаём invoice через API с выбранной валютой
            const response = await fetch('/api/lava-create-invoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    telegramId: telegramId || undefined,
                    telegramUsername: tgUsername || undefined,
                    email: `${telegramId || tgUsername}@premium.ararena.pro`,
                    currency: currency.id,
                    offerId: PREMIUM_OFFER_ID,
                    periodicity: periodicity,
                    streamUtmSource: streamUtmSource || undefined
                })
            })

            const data = await response.json()
            console.log('[PaymentModal] API response:', data)

            if (data.ok && data.paymentUrl) {
                // Редирект на страницу оплаты
                window.location.href = data.paymentUrl
            } else {
                alert('Ошибка создания платежа: ' + (data.error || 'Неизвестная ошибка'))
            }
        } catch (error) {
            console.error('[PaymentModal] Error:', error)
            alert('Ошибка сети. Попробуйте ещё раз.')
        } finally {
            setCardLoading(null)
        }
    }

    const handleCryptoNetworkSelect = async (network: typeof CRYPTO_NETWORKS[0]) => {
        // @ts-ignore
        const tg = window.Telegram?.WebApp
        // Приоритет: WebApp > localStorage (с промо-страницы) > введенный username
        const telegramId = tg?.initDataUnsafe?.user?.id || localStorage.getItem('promo_telegram_id') || null
        const tgUsername = username.trim().replace('@', '') || localStorage.getItem('promo_telegram_username')?.replace('@', '') || ''
        const streamUtmSource = localStorage.getItem('stream_utm_source') || localStorage.getItem('promo_utm_source') || ''

        if (!telegramId && !tgUsername) {
            alert('Пожалуйста, введите ваш Telegram username')
            return
        }

        if (!tariff) {
            alert('Ошибка: не выбран тариф')
            return
        }

        setCryptoLoading(network.id)

        try {
            const tariffKey = tariff.id.toLowerCase()
            const amountUSD = TARIFF_USD_PRICES[tariffKey] || 55

            console.log('[PaymentModal] Creating crypto payment:', {
                telegramId,
                tgUsername,
                tariffId: tariff.id,
                amountUSD,
                network: network.id,
                currency: network.currency
            })

            const response = await fetch('/api/0xprocessing-create-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    telegramId: telegramId || undefined,
                    telegramUsername: tgUsername || undefined,
                    email: `${telegramId || tgUsername}@premium.ararena.pro`,
                    amountUSD,
                    currency: network.currency,
                    tariff: tariffKey,
                    streamUtmSource: streamUtmSource || undefined
                })
            })

            const data = await response.json()
            console.log('[PaymentModal] Crypto API response:', data)

            if (data.ok && data.paymentUrl) {
                // Всегда редирект (без popup)
                window.location.href = data.paymentUrl
            } else {
                alert('Ошибка создания платежа: ' + (data.error || 'Неизвестная ошибка'))
            }
        } catch (error) {
            console.error('[PaymentModal] Crypto Error:', error)
            alert('Ошибка сети. Попробуйте ещё раз.')
        } finally {
            setCryptoLoading(null)
        }
    }

    // Determine title color based on tariff name or aurora colors
    const getTariffColor = (t?: Tariff) => {
        if (!t) return 'text-white'
        switch (t.id) {
            case 'gold': return 'text-[#FFD700]'
            case 'platinum': return 'text-[#8B5CF6]'
            case 'private': return 'text-[#F43F5E]'
            default: return 'text-yellow-400'
        }
    }

    // Reset selections when modal closes
    const handleClose = () => {
        setShowNetworkSelect(false)
        setShowCurrencySelect(false)
        onClose()
    }

    const handleBack = () => {
        setShowNetworkSelect(false)
        setShowCurrencySelect(false)
    }

    return (
        <AnimatePresence>
            {isOpen && tariff && (
                <motion.div
                    key="payment-modal-container"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                >
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={handleClose}
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.95, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: 20 }}
                        className="relative w-full max-w-md bg-zinc-900/80 backdrop-blur-xl border border-yellow-500/20 rounded-2xl overflow-hidden shadow-2xl p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <AnimatePresence mode="wait">
                            {!showNetworkSelect && !showCurrencySelect ? (
                                // Main payment selection
                                <motion.div
                                    key="main"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                >
                                    {/* Header */}
                                    <div className="text-center mb-6">
                                        <h3 className="text-xl font-bold text-white mb-2">
                                            Выберите способ оплаты
                                        </h3>
                                        <p className="text-lg font-medium text-gray-300">
                                            <span className={`${getTariffColor(tariff)} uppercase`}>{tariff.name}</span>
                                            <span className="mx-2 text-gray-500">•</span>
                                            <span>{formatPrice(tariff.price)}</span>
                                            <span className="mx-2 text-gray-500">•</span>
                                            <span className="text-sm">{tariff.duration}</span>
                                        </p>
                                    </div>

                                    {/* Username Input (if no Telegram ID) */}
                                    {showUsernameInput && (
                                        <div className="mb-6 text-left">
                                            <label className="text-gray-400 text-sm mb-2 block font-medium">
                                                Ваш Telegram username
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    placeholder="@username"
                                                    value={username}
                                                    onChange={(e) => setUsername(e.target.value)}
                                                    className="w-full bg-zinc-800 border border-zinc-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 focus:outline-none transition-all"
                                                />
                                            </div>
                                            <p className="text-gray-500 text-xs mt-2 leading-relaxed">
                                                Мы выдадим доступ к клубу на этот аккаунт.<br />
                                                Убедитесь в правильности ввода.
                                            </p>
                                        </div>
                                    )}

                                    {/* Buttons Stack */}
                                    <div className="space-y-4">
                                        {/* Card Payment - opens currency selection */}
                                        <button
                                            onClick={() => setShowCurrencySelect(true)}
                                            className="w-full group relative overflow-hidden rounded-xl p-4 transition-transform duration-200 hover:scale-[1.02] active:scale-95"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-orange-500 opacity-90 group-hover:opacity-100 transition-opacity" />
                                            <div className="relative flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                                    </svg>
                                                </div>
                                                <div className="text-left flex-1">
                                                    <div className="text-white font-bold text-lg leading-tight">
                                                        Банковская карта
                                                    </div>
                                                    <div className="text-white/80 text-xs font-medium">
                                                        ₽ / $ / € (выбор валюты)
                                                    </div>
                                                </div>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </button>

                                        {/* Crypto Payment - opens network selection */}
                                        <button
                                            onClick={() => setShowNetworkSelect(true)}
                                            className="w-full group relative overflow-hidden rounded-xl p-4 transition-transform duration-200 hover:scale-[1.02] active:scale-95"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-600 opacity-90 group-hover:opacity-100 transition-opacity" />
                                            <div className="relative flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <div className="text-left flex-1">
                                                    <div className="text-white font-bold text-lg leading-tight">
                                                        Криптовалюта
                                                    </div>
                                                    <div className="text-white/80 text-xs font-medium">
                                                        USDT (выбор сети)
                                                    </div>
                                                </div>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </button>
                                    </div>

                                    {/* Cancel Button */}
                                    <div className="mt-6 text-center">
                                        <button
                                            onClick={handleClose}
                                            className="text-sm font-medium text-gray-400 hover:text-white transition-colors py-2 px-4"
                                        >
                                            Отмена
                                        </button>
                                    </div>
                                </motion.div>
                            ) : showCurrencySelect ? (
                                // Currency selection for card payment
                                <motion.div
                                    key="currency"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                >
                                    {/* Header with back button */}
                                    <div className="text-center mb-6">
                                        <button
                                            onClick={handleBack}
                                            className="absolute left-4 top-6 text-gray-400 hover:text-white transition-colors p-2"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                            </svg>
                                        </button>
                                        <h3 className="text-xl font-bold text-white mb-2">
                                            Выберите валюту
                                        </h3>
                                        <p className="text-sm text-gray-400">
                                            Visa, Mastercard, МИР
                                        </p>
                                    </div>

                                    {/* Currency buttons */}
                                    <div className="space-y-3">
                                        {CARD_CURRENCIES.map((currency) => (
                                            <button
                                                key={currency.id}
                                                onClick={() => handleCardCurrencySelect(currency)}
                                                disabled={cardLoading !== null}
                                                className="w-full group relative overflow-hidden rounded-xl p-4 transition-transform duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                                            >
                                                <div className={`absolute inset-0 bg-gradient-to-r ${currency.color} opacity-90 group-hover:opacity-100 transition-opacity`} />
                                                <div className="relative flex items-center justify-between">
                                                    <div className="text-left">
                                                        <div className="text-white font-bold text-lg leading-tight">
                                                            {cardLoading === currency.id ? 'Создаём...' : currency.name}
                                                        </div>
                                                        <div className="text-white/80 text-xs font-medium">
                                                            {currency.id}
                                                        </div>
                                                    </div>
                                                    <div className="text-white text-3xl font-bold">
                                                        {currency.symbol}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Cancel Button */}
                                    <div className="mt-4 text-center">
                                        <button
                                            onClick={handleClose}
                                            className="text-sm font-medium text-gray-400 hover:text-white transition-colors py-2 px-4"
                                        >
                                            Отмена
                                        </button>
                                    </div>
                                </motion.div>
                            ) : (
                                // Network selection for crypto
                                <motion.div
                                    key="network"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                >
                                    {/* Header with back button */}
                                    <div className="text-center mb-6">
                                        <button
                                            onClick={handleBack}
                                            className="absolute left-4 top-6 text-gray-400 hover:text-white transition-colors p-2"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                            </svg>
                                        </button>
                                        <h3 className="text-xl font-bold text-white mb-2">
                                            Выберите сеть
                                        </h3>
                                        <p className="text-sm text-gray-400">
                                            ${TARIFF_USD_PRICES[tariff.id.toLowerCase()] || 0} USD • USDT
                                        </p>
                                    </div>

                                    {/* Network buttons */}
                                    <div className="space-y-3">
                                        {CRYPTO_NETWORKS.map((network) => (
                                            <button
                                                key={network.id}
                                                onClick={() => handleCryptoNetworkSelect(network)}
                                                disabled={cryptoLoading !== null}
                                                className="w-full group relative overflow-hidden rounded-xl p-4 transition-transform duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                                            >
                                                <div className={`absolute inset-0 bg-gradient-to-r ${network.color} opacity-90 group-hover:opacity-100 transition-opacity`} />
                                                <div className="relative flex items-center justify-between">
                                                    <div className="text-left">
                                                        <div className="text-white font-bold text-lg leading-tight">
                                                            {cryptoLoading === network.id ? 'Создаём...' : network.name}
                                                        </div>
                                                        <div className="text-white/80 text-xs font-medium">
                                                            USDT • {network.id}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-white/90 text-sm font-medium">
                                                            комиссия
                                                        </div>
                                                        <div className="text-white font-bold">
                                                            {network.fee}
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Info */}
                                    <p className="text-gray-500 text-xs mt-4 text-center">
                                        Комиссия сети включена в сумму оплаты
                                    </p>

                                    {/* Cancel Button */}
                                    <div className="mt-4 text-center">
                                        <button
                                            onClick={handleClose}
                                            className="text-sm font-medium text-gray-400 hover:text-white transition-colors py-2 px-4"
                                        >
                                            Отмена
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
