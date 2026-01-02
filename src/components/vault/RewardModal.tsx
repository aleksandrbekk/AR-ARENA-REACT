import { useEffect, useState } from 'react'

interface VaultReward {
    base_amount: number
    rarity: 'common' | 'uncommon' | 'rare' | 'legendary' | 'epic'
    streak: number
    multiplier: number
    final_amount: number
    is_golden: boolean
}

interface RewardModalProps {
    reward: VaultReward | null
    isOpen: boolean
    onClose: () => void
}

export function RewardModal({ reward, isOpen, onClose }: RewardModalProps) {
    const [showConfetti, setShowConfetti] = useState(false)
    const [showEpicEffect, setShowEpicEffect] = useState(false)

    useEffect(() => {
        if (reward?.rarity === 'legendary') {
            setShowConfetti(true)
        } else if (reward?.rarity === 'epic') {
            setShowEpicEffect(true)
            setShowConfetti(true)
        }

        return () => {
            setShowConfetti(false)
            setShowEpicEffect(false)
        }
    }, [reward])

    if (!isOpen || !reward) return null

    const rarityColors: Record<string, string> = {
        common: 'from-gray-400 to-gray-500',
        uncommon: 'from-green-400 to-green-600',
        rare: 'from-blue-400 to-blue-600',
        legendary: 'from-yellow-400 to-orange-500',
        epic: 'from-purple-400 to-purple-600'
    }

    const rarityLabels: Record<string, string> = {
        common: 'Обычный',
        uncommon: 'Необычный',
        rare: 'Редкий',
        legendary: 'Легендарный',
        epic: 'Эпический'
    }

    const handleClaim = () => {
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn">
            {/* Конфетти эффект */}
            {showConfetti && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {Array.from({ length: 50 }).map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-2 h-2 animate-confetti"
                            style={{
                                left: `${Math.random() * 100}%`,
                                backgroundColor: ['#FFD700', '#FFA500', '#FF6347', '#FF1493', '#00CED1'][Math.floor(Math.random() * 5)],
                                animationDelay: `${Math.random() * 2}s`,
                                animationDuration: `${2 + Math.random() * 2}s`
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Epic фиолетовые искры */}
            {showEpicEffect && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {Array.from({ length: 100 }).map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-1 h-1 rounded-full animate-spark"
                            style={{
                                left: '50%',
                                top: '50%',
                                backgroundColor: ['#9333ea', '#a855f7', '#c084fc', '#e879f9'][Math.floor(Math.random() * 4)],
                                boxShadow: '0 0 10px #9333ea',
                                animationDelay: `${i * 0.02}s`
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Модальное окно */}
            <div className="relative bg-gradient-to-b from-zinc-900 to-black border border-yellow-500/30 rounded-2xl p-6 mx-4 max-w-sm w-full animate-scaleIn">
                {/* Golden badge */}
                {reward.is_golden && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-orange-500 px-4 py-1 rounded-full text-black text-xs font-bold">
                        ⭐ GOLDEN CHEST ⭐
                    </div>
                )}

                {/* Header */}
                <div className="text-center mb-4 mt-2">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <img src="/icons/arcoin.png" alt="AR" className="w-10 h-10" />
                        <h3 className="text-xl font-bold text-white">Кейс взломан!</h3>
                    </div>

                    {/* Рarity badge */}
                    <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${rarityColors[reward.rarity]} text-white`}>
                        {rarityLabels[reward.rarity]}
                    </div>
                </div>

                {/* Reward amount */}
                <div className="text-center mb-4">
                    <div className="text-5xl font-bold bg-gradient-to-b from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                        +{reward.final_amount} AR
                    </div>

                    {/* Streak bonus */}
                    {reward.multiplier > 1 && (
                        <div className="mt-2 text-sm text-yellow-400/80">
                            <span className="text-white/60">Базовая награда: {reward.base_amount} AR</span>
                            <br />
                            <span className="font-medium">🔥 Streak x{reward.multiplier} (День {reward.streak})</span>
                        </div>
                    )}
                </div>

                {/* Info text */}
                <p className="text-center text-white/50 text-sm mb-4">
                    Награда добавлена на ваш баланс
                </p>

                {/* Claim button */}
                <button
                    onClick={handleClaim}
                    className="w-full py-3 bg-gradient-to-b from-yellow-400 to-orange-500 text-black font-bold rounded-xl 
                     hover:from-yellow-300 hover:to-orange-400 transition-all active:scale-95"
                >
                    Забрать
                </button>
            </div>
        </div>
    )
}
