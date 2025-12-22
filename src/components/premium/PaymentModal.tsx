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
    const [isLoading, setIsLoading] = useState(false)
    const [username, setUsername] = useState('')

    // Check if we have a Telegram ID available
    // @ts-ignore
    const tg = window.Telegram?.WebApp
    const telegramIdFromWebApp = tg?.initDataUnsafe?.user?.id
    const [showUsernameInput] = useState(!telegramIdFromWebApp)

    // Helper to format price
    const formatPrice = (price?: number) => {
        return price ? price.toLocaleString('ru-RU') + ' ₽' : '...'
    }

    const handleCardBuy = async () => {
        if (!tariff) return

        // @ts-ignore
        const tg = window.Telegram?.WebApp
        const telegramId = tg?.initDataUnsafe?.user?.id

        const finalTelegramId = telegramId ? String(telegramId) : null
        const finalUsername = username.trim().replace('@', '')

        if (!finalTelegramId && !finalUsername) {
            alert('Пожалуйста, введите ваш Telegram username для доступа к клубу')
            return
        }

        setIsLoading(true)

        try {
            // NOTE: This endpoint is hypothetical based on requirements. 
            // In a real scenario, ensure this backend route exists.
            const res = await fetch('/api/lava-create-invoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    telegramId: finalTelegramId,
                    telegramUsername: finalUsername || null,
                    offerId: 'd6edc26e-00b2-4fe0-9b0b-45fd7548b037', // This offerId might need to vary by tariff?
                    amount: tariff.price,
                    currency: 'USD',
                    // Ideally pass tariffId too if the backend supports dynamic offers based on ID
                    tariffId: tariff.id
                })
            })

            const data = await res.json()

            if (data.paymentUrl) {
                // @ts-ignore
                if (window.Telegram?.WebApp?.openLink) {
                    // @ts-ignore
                    window.Telegram.WebApp.openLink(data.paymentUrl)
                } else {
                    window.open(data.paymentUrl, '_blank')
                }

                onClose() // Close modal after redirect?
            } else {
                alert('Ошибка создания платежа: ' + (data.message || 'Неизвестная ошибка'))
            }
        } catch (e) {
            console.error(e)
            alert('Ошибка сети. Попробуйте позже.')
        } finally {
            setIsLoading(false)
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
                                        onChange={(e) => setUsername(e.target.value.replace('@', ''))}
                                        className="w-full bg-zinc-800 border border-zinc-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 focus:outline-none transition-all"
                                    />
                                    {/* Optional: Add @ prefix visually if needed, but placeholder handles it well */}
                                </div>
                                <p className="text-gray-500 text-xs mt-2 leading-relaxed">
                                    Мы выдадим доступ к клубу на этот аккаунт. Убедитесь в правильности ввода.
                                </p>
                            </div>
                        )}

                        {/* Buttons Stack */}
                        <div className="space-y-4">
                            {/* Card Payment (Lava) */}
                            <button
                                onClick={handleCardBuy}
                                disabled={isLoading}
                                className="w-full group relative overflow-hidden rounded-xl p-4 transition-transform duration-200 hover:scale-[1.02] active:scale-95"
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
                                            Банковская карта
                                        </div>
                                        <div className="text-white/80 text-xs font-medium">
                                            Visa, Mastercard, МИР
                                        </div>
                                    </div>
                                </div>
                            </button>

                            {/* Crypto Payment (0xProcessing) */}
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
