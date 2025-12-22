import React, { useState } from 'react'
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

export const PaymentModal: React.FC<PaymentModalProps> = ({
    isOpen,
    onClose,
    tariff
}) => {
    const [username, setUsername] = useState('')
    const [loading, setLoading] = useState(false)

    // Check if we have a Telegram ID available
    // @ts-ignore
    const tg = window.Telegram?.WebApp
    const telegramIdFromWebApp = tg?.initDataUnsafe?.user?.id
    const [showUsernameInput] = useState(!telegramIdFromWebApp)

    // Единый offerId для Premium подписки + periodicity для выбора срока
    const PREMIUM_OFFER_ID = '755e7046-e658-43e1-908d-0738766b464d' // ПРОД: 3400 RUB/мес

    // Маппинг тарифа на periodicity (Lava API)
    const TARIFF_PERIODICITY: Record<string, string> = {
        'classic': 'MONTHLY',      // 1 месяц - 3400 RUB
        'trader': 'QUARTERLY',     // 3 месяца - 9600 RUB
        'platinum': 'HALF_YEARLY', // 6 месяцев - 18000 RUB
        'private': 'YEARLY'        // 12 месяцев - 33600 RUB
    }

    // Helper to format price
    const formatPrice = (price?: number) => {
        return price ? price.toLocaleString('ru-RU') + ' ₽' : '...'
    }

    const handleCardBuy = async () => {
        // @ts-ignore
        const tg = window.Telegram?.WebApp
        const telegramId = tg?.initDataUnsafe?.user?.id
        const tgUsername = username.trim().replace('@', '')

        // Проверяем наличие идентификатора
        if (!telegramId && !tgUsername) {
            alert('Пожалуйста, введите ваш Telegram username')
            return
        }

        if (!tariff?.price) {
            alert('Ошибка: не выбран тариф')
            return
        }

        setLoading(true)

        try {
            console.log('[PaymentModal] Creating invoice via API:', {
                telegramId,
                tgUsername,
                tariffId: tariff.id,
                price: tariff.price
            })

            // Получаем periodicity для выбранного тарифа
            const tariffKey = tariff.id.toLowerCase()
            const periodicity = TARIFF_PERIODICITY[tariffKey]

            if (!periodicity) {
                alert('Ошибка: неизвестный тариф ' + tariff.id)
                return
            }

            // Создаём invoice через API с единым offerId + periodicity
            const response = await fetch('/api/lava-create-invoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    telegramId: telegramId || undefined,
                    telegramUsername: tgUsername || undefined,
                    email: `${telegramId || tgUsername}@premium.ararena.pro`,
                    currency: 'RUB',
                    offerId: PREMIUM_OFFER_ID,
                    periodicity: periodicity
                })
            })

            const data = await response.json()
            console.log('[PaymentModal] API response:', data)

            if (data.ok && data.paymentUrl) {
                // @ts-ignore
                if (window.Telegram?.WebApp?.openLink) {
                    // @ts-ignore
                    window.Telegram.WebApp.openLink(data.paymentUrl)
                } else {
                    window.open(data.paymentUrl, '_blank')
                }
            } else {
                alert('Ошибка создания платежа: ' + (data.error || 'Неизвестная ошибка'))
            }
        } catch (error) {
            console.error('[PaymentModal] Error:', error)
            alert('Ошибка сети. Попробуйте ещё раз.')
        } finally {
            setLoading(false)
        }
    }

    const handleCryptoBuy = () => {
        alert('Скоро подключим! (Оплата криптовалютой)')
    }

    // Determine title color based on tariff name or aurora colors
    // Default to white/yellow if not specific
    const getTariffColor = (t?: Tariff) => {
        if (!t) return 'text-white'
        switch (t.id) {
            case 'platinum': return 'text-[#8B5CF6]' // Violet
            case 'private': return 'text-[#F43F5E]' // Rose/Gold mixed in design but text can be distinct
            case 'trader': return 'text-[#10b981]' // Emerald
            default: return 'text-yellow-400'
        }
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
                        onClick={onClose}
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.95, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: 20 }}
                        className="relative w-full max-w-md bg-zinc-900/80 backdrop-blur-xl border border-yellow-500/20 rounded-2xl overflow-hidden shadow-2xl p-6"
                        onClick={(e) => e.stopPropagation()}
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
                                    {/* Optional: Add @ prefix visually if needed, but placeholder handles it well */}
                                </div>
                                <p className="text-gray-500 text-xs mt-2 leading-relaxed">
                                    Мы выдадим доступ к клубу на этот аккаунт.<br />
                                    Убедитесь в правильности ввода.
                                </p>
                            </div>
                        )}

                        {/* Buttons Stack */}
                        <div className="space-y-4">
                            {/* Card Payment (Lava) */}
                            <button
                                onClick={handleCardBuy}
                                disabled={loading}
                                className="w-full group relative overflow-hidden rounded-xl p-4 transition-transform duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                            >
                                {/* Background Gradient */}
                                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-orange-500 opacity-90 group-hover:opacity-100 transition-opacity" />

                                <div className="relative flex items-center gap-4">
                                    {/* Icon Container */}
                                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                        </svg>
                                    </div>

                                    <div className="text-left">
                                        <div className="text-white font-bold text-lg leading-tight">
                                            {loading ? 'Создаём платёж...' : 'Банковская карта'}
                                        </div>
                                        <div className="text-white/80 text-xs font-medium">
                                            Visa, Mastercard, МИР
                                        </div>
                                    </div>
                                </div>
                            </button>

                            {/* Crypto Payment */}
                            <button
                                onClick={handleCryptoBuy}
                                className="w-full group relative overflow-hidden rounded-xl p-4 transition-transform duration-200 hover:scale-[1.02] active:scale-95"
                            >
                                {/* Background Gradient */}
                                <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-600 opacity-90 group-hover:opacity-100 transition-opacity" />

                                <div className="relative flex items-center gap-4">
                                    {/* Icon Container */}
                                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                        {/* Generic Coin Icon */}
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>

                                    <div className="text-left">
                                        <div className="text-white font-bold text-lg leading-tight">
                                            Криптовалюта
                                        </div>
                                        <div className="text-white/80 text-xs font-medium">
                                            USDT / BTC / ETH
                                        </div>
                                    </div>
                                </div>
                            </button>
                        </div>

                        {/* Cancel Button */}
                        <div className="mt-6 text-center">
                            <button
                                onClick={onClose}
                                className="text-sm font-medium text-gray-400 hover:text-white transition-colors py-2 px-4"
                            >
                                Отмена
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
