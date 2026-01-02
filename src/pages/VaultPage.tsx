import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVault } from '../hooks/useVault'
import { ChestsGrid } from '../components/vault/ChestAnimation'
import { RewardModal } from '../components/vault/RewardModal'

export function VaultPage() {
    const navigate = useNavigate()
    const {
        state,
        history,
        loading,
        error,
        lastReward,
        goldenChestIndex,
        claimLockpick,
        openChest,
        clearReward,
        getStreakMultiplier,
        getTimeToNext
    } = useVault()

    const [openedChestIndex, setOpenedChestIndex] = useState<number | null>(null)
    const [showRewardModal, setShowRewardModal] = useState(false)
    const [countdown, setCountdown] = useState<{ hours: number; minutes: number; seconds: number } | null>(null)
    const [claimLoading, setClaimLoading] = useState(false)

    // Таймер обратного отсчёта
    useEffect(() => {
        const updateCountdown = () => {
            const time = getTimeToNext()
            setCountdown(time)
        }

        updateCountdown()
        const interval = setInterval(updateCountdown, 1000)

        return () => clearInterval(interval)
    }, [getTimeToNext])

    // Показываем модалку награды
    useEffect(() => {
        if (lastReward) {
            setShowRewardModal(true)
        }
    }, [lastReward])

    // Получение отмычки
    const handleClaimLockpick = async () => {
        setClaimLoading(true)
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium')

        const success = await claimLockpick()

        if (success) {
            window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
        }

        setClaimLoading(false)
    }

    // Открытие сундука
    const handleOpenChest = async (index: number) => {
        setOpenedChestIndex(index)

        const success = await openChest(index)

        if (!success) {
            setOpenedChestIndex(null)
        }
    }

    // Закрытие модалки награды
    const handleCloseReward = () => {
        setShowRewardModal(false)
        clearReward()
    }

    // Назад
    const goBack = useCallback(() => {
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')
        navigate('/shop')
    }, [navigate])

    // Telegram Back Button
    useEffect(() => {
        const tg = window.Telegram?.WebApp
        if (tg?.BackButton) {
            tg.BackButton.show()
            tg.BackButton.onClick(goBack)
        }
        return () => {
            tg?.BackButton?.hide()
        }
    }, [goBack])

    // Streak info
    const streakMultiplier = state?.streak ? getStreakMultiplier(state.streak) : 1
    const nextMultiplier = state?.streak ? getStreakMultiplier(state.streak + 1) : 1.25

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white pb-8">
            {/* Header */}
            <div className="pt-[env(safe-area-inset-top)] px-4 py-4">
                <div className="flex items-center justify-between">
                    <button onClick={goBack} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                        <img src="/icons/arrow-left.png" alt="Back" className="w-5 h-5" />
                    </button>

                    {/* Счётчик отмычек */}
                    <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl">
                        <img src="/icons/kiy.png" alt="Отмычка" className="w-5 h-5" />
                        <span className="text-yellow-400 font-bold">{state?.lockpick_available ? 1 : 0}</span>
                    </div>
                </div>
            </div>

            {/* Title */}
            <div className="text-center px-4 mb-6">
                <div className="flex items-center justify-center gap-3 mb-2">
                    <img src="/icons/keis1.png" alt="AR Bank" className="w-12 h-12" />
                    <h1 className="text-2xl font-bold tracking-wide">AR BANK</h1>
                </div>

                {/* Streak indicator */}
                {state && state.streak > 0 && (
                    <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border border-yellow-500/30 px-4 py-2 rounded-xl">
                        <span className="text-2xl">🔥</span>
                        <div className="text-left">
                            <div className="text-sm text-white/70">Серия дней</div>
                            <div className="text-yellow-400 font-bold">
                                День {state.streak} • x{streakMultiplier}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Lockpick Button or Chests */}
            <div className="px-4">
                {state?.can_claim && !state?.lockpick_available ? (
                    // Кнопка получения отмычки
                    <div className="flex flex-col items-center gap-4">
                        <button
                            onClick={handleClaimLockpick}
                            disabled={claimLoading || loading}
                            className="flex items-center gap-3 px-8 py-4 bg-gradient-to-b from-yellow-400 to-orange-500 
                         text-black font-bold rounded-xl hover:from-yellow-300 hover:to-orange-400 
                         transition-all active:scale-95 disabled:opacity-50"
                        >
                            {claimLoading ? (
                                <div className="w-6 h-6 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                            ) : (
                                <img src="/icons/kiy.png" alt="" className="w-6 h-6" />
                            )}
                            <span>Получить отмычку</span>
                        </button>
                        <p className="text-white/50 text-sm">Доступна раз в день</p>

                        {/* Next streak bonus */}
                        {nextMultiplier > streakMultiplier && (
                            <div className="text-center text-sm text-white/40">
                                Завтра: День {(state?.streak || 0) + 1} → x{nextMultiplier}
                            </div>
                        )}
                    </div>
                ) : state?.can_open ? (
                    // Сундуки для открытия
                    <div className="flex flex-col items-center">
                        <p className="text-center text-yellow-400 mb-4">Выбери кейс</p>
                        <ChestsGrid
                            canOpen={true}
                            goldenChestIndex={goldenChestIndex}
                            openedChestIndex={openedChestIndex}
                            onOpen={handleOpenChest}
                            disabled={loading}
                        />

                        {/* Rewards info */}
                        <div className="flex flex-wrap justify-center gap-2 mt-4">
                            {[
                                { amount: 10, chance: '40%' },
                                { amount: 25, chance: '30%' },
                                { amount: 50, chance: '20%' },
                                { amount: 100, chance: '8%', legendary: true },
                                { amount: 500, chance: '2%', epic: true }
                            ].map((r) => (
                                <div
                                    key={r.amount}
                                    className={`
                    px-2 py-1 rounded-lg text-xs 
                    ${r.epic ? 'bg-purple-500/20 text-purple-300' :
                                            r.legendary ? 'bg-yellow-500/20 text-yellow-300' :
                                                'bg-white/5 text-white/50'}
                  `}
                                >
                                    {r.amount} AR <span className="opacity-60">{r.chance}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    // Ожидание следующего дня
                    <div className="flex flex-col items-center gap-4">
                        <div className="text-center">
                            <div className="text-white/50 mb-2">Следующая попытка через:</div>
                            {countdown && (
                                <div className="flex items-center justify-center gap-1 text-2xl font-mono text-yellow-400">
                                    <img src="/icons/time.png" alt="" className="w-6 h-6 mr-2 opacity-70" />
                                    <span>{String(countdown.hours).padStart(2, '0')}</span>
                                    <span className="opacity-50">:</span>
                                    <span>{String(countdown.minutes).padStart(2, '0')}</span>
                                    <span className="opacity-50">:</span>
                                    <span>{String(countdown.seconds).padStart(2, '0')}</span>
                                </div>
                            )}
                        </div>

                        {/* Locked chests */}
                        <ChestsGrid
                            canOpen={false}
                            goldenChestIndex={null}
                            openedChestIndex={openedChestIndex}
                            onOpen={() => { }}
                        />
                    </div>
                )}
            </div>

            {/* History */}
            {history && history.length > 0 && (
                <div className="px-4 mt-8">
                    <h3 className="text-sm font-medium text-white/50 mb-3">История открытий</h3>
                    <div className="space-y-2">
                        {history.slice(0, 5).map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2"
                            >
                                <div className="flex items-center gap-2">
                                    <img src="/icons/arcoin.png" alt="" className="w-5 h-5" />
                                    <span className={`font-medium ${item.reward_rarity === 'epic' ? 'text-purple-400' :
                                            item.reward_rarity === 'legendary' ? 'text-yellow-400' :
                                                item.reward_rarity === 'rare' ? 'text-blue-400' :
                                                    'text-white'
                                        }`}>
                                        +{item.final_amount} AR
                                    </span>
                                    {item.is_golden && <span className="text-xs">⭐</span>}
                                    {item.streak_multiplier > 1 && (
                                        <span className="text-xs text-orange-400">x{item.streak_multiplier}</span>
                                    )}
                                </div>
                                <span className="text-xs text-white/30">
                                    {new Date(item.created_at).toLocaleDateString('ru-RU')}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Stats */}
            {state && (state.total_opened > 0 || state.total_earned > 0) && (
                <div className="px-4 mt-6">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/5 rounded-xl p-4 text-center">
                            <div className="text-2xl font-bold text-white">{state.total_opened}</div>
                            <div className="text-xs text-white/50">Открыто кейсов</div>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4 text-center">
                            <div className="text-2xl font-bold text-yellow-400">{state.total_earned}</div>
                            <div className="text-xs text-white/50">Всего AR</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="px-4 mt-4">
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center text-red-400 text-sm">
                        {error}
                    </div>
                </div>
            )}

            {/* Reward Modal */}
            <RewardModal
                reward={lastReward}
                isOpen={showRewardModal}
                onClose={handleCloseReward}
            />
        </div>
    )
}
