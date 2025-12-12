import { useState, useEffect } from 'react'
import { Layout } from '../components/layout/Layout'
import { useAuth } from '../hooks/useAuth'
import { useSkins } from '../hooks/useSkins'
import { supabase } from '../lib/supabase'
import datacenterIcon from '../assets/locations/datacenter.png'

const BASE_INCOME_PER_HOUR = 100 // BUL в час
const MAX_HOURS = 8 // Максимум накопления

export function FarmPageGemini() {
    const { telegramUser, gameState, updateGameState } = useAuth()
    const { activeSkin } = useSkins()
    const [lastClaim, setLastClaim] = useState<Date | null>(null)
    const [accumulated, setAccumulated] = useState(0)
    const [incomePerHour, setIncomePerHour] = useState(BASE_INCOME_PER_HOUR)
    const [maxAccumulated, setMaxAccumulated] = useState(BASE_INCOME_PER_HOUR * MAX_HOURS)
    const [isClaiming, setIsClaiming] = useState(false)

    // Загружаем last_farm_claim
    useEffect(() => {
        async function loadFarmData() {
            if (!telegramUser) return

            try {
                const { data, error } = await supabase
                    .from('users')
                    .select('last_farm_claim')
                    .eq('telegram_id', telegramUser.id.toString())
                    .single()

                if (error) {
                    setLastClaim(new Date())
                    return
                }

                const lastClaimDate = data?.last_farm_claim
                    ? new Date(data.last_farm_claim)
                    : new Date()

                setLastClaim(lastClaimDate)
            } catch (err) {
                setLastClaim(new Date())
            }
        }

        loadFarmData()
    }, [telegramUser])

    // Пересчет дохода
    useEffect(() => {
        const farmBonus = activeSkin?.farm_bonus || 0
        const income = BASE_INCOME_PER_HOUR * (1 + farmBonus / 100)
        setIncomePerHour(income)
        setMaxAccumulated(income * MAX_HOURS)
    }, [activeSkin])

    // Таймер накопления
    useEffect(() => {
        if (!lastClaim) return

        const interval = setInterval(() => {
            const now = new Date()
            const hoursPassed = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60)
            const hoursCapped = Math.min(hoursPassed, MAX_HOURS)
            const earned = incomePerHour * hoursCapped
            setAccumulated(Math.floor(earned))
        }, 1000)

        return () => clearInterval(interval)
    }, [lastClaim, incomePerHour])

    const handleClaim = async () => {
        if (!telegramUser || !gameState || accumulated === 0 || isClaiming) return

        setIsClaiming(true)
        const newBalance = gameState.balance_bul + accumulated
        const now = new Date()

        try {
            const { error } = await supabase
                .from('users')
                .update({
                    balance_bul: newBalance,
                    last_farm_claim: now.toISOString()
                })
                .eq('telegram_id', telegramUser.id.toString())

            if (error) throw error

            updateGameState({ balance_bul: newBalance })
            setLastClaim(now)
            setAccumulated(0)

            if (window.Telegram?.WebApp?.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.notificationOccurred('success')
            }
        } catch (err) {
            console.error('Error claiming farm:', err)
            alert('Ошибка сбора')
        } finally {
            setIsClaiming(false)
        }
    }

    const progress = Math.min((accumulated / maxAccumulated) * 100, 100)

    return (
        <Layout>
            <div className="min-h-screen bg-[#0a0a0a] pt-[60px] pb-24 px-4 relative overflow-hidden">
                {/* Vignette Background */}
                <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-800/10 via-[#0a0a0a] to-[#0a0a0a]" />

                <div className="relative z-10 flex flex-col gap-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold text-white tracking-wide">Ферма</h1>
                        <div className="flex items-center gap-2 bg-[#FFD700]/10 px-3 py-1.5 rounded-full border border-[#FFD700]/20">
                            <img src="/icons/BUL.png" alt="BUL" className="w-5 h-5" />
                            <span className="font-bold text-[#FFD700] tabular-nums">
                                {gameState?.balance_bul.toLocaleString() ?? 0}
                            </span>
                        </div>
                    </div>

                    {/* Location Card */}
                    <div className="relative overflow-hidden rounded-2xl bg-zinc-900/50 backdrop-blur-md border border-white/10 aspect-[2/1] group">
                        {/* Placeholder Image Layer */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
                        <img
                            src={datacenterIcon}
                            alt="Location"
                            className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500"
                        />

                        <div className="absolute bottom-4 left-4 z-20 w-full pr-8 flex items-end justify-between">
                            <div>
                                <p className="text-xs text-white/50 mb-1 uppercase tracking-widest">Текущая локация</p>
                                <h2 className="text-xl font-bold text-white">База AR</h2>
                            </div>
                            <button className="px-3 py-1.5 rounded-lg border border-white/20 text-xs font-medium text-white hover:bg-white/10 transition-colors backdrop-blur-sm">
                                Сменить
                            </button>
                        </div>
                    </div>

                    {/* Stats Panel */}
                    <div className="bg-zinc-900/50 backdrop-blur-md rounded-2xl p-5 border border-[#FFD700]/20 relative overflow-hidden">
                        {/* Glow */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD700]/5 blur-[50px] rounded-full pointer-events-none" />

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <p className="text-xs text-white/40 mb-1">Доход в час</p>
                                <p className="text-lg font-bold text-white flex items-center gap-1.5">
                                    {Math.floor(incomePerHour)} <span className="text-xs font-normal text-white/50">BUL/ч</span>
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-white/40 mb-1">Накоплено</p>
                                <p className="text-lg font-bold text-[#FFD700] tabular-nums">
                                    {accumulated.toFixed(0)}
                                </p>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-[#FFD700] to-[#FFA500]"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <div className="flex justify-between mt-2 text-[10px] text-white/30 uppercase tracking-wider">
                            <span>0h</span>
                            <span>{MAX_HOURS}h Full</span>
                        </div>
                    </div>

                    {/* Collect Button */}
                    <button
                        onClick={handleClaim}
                        disabled={accumulated === 0 || isClaiming}
                        className={`w-full py-4 rounded-xl font-bold text-black flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg ${accumulated > 0
                            ? 'bg-gradient-to-b from-[#FFD700] to-[#FFA500] shadow-[#FFD700]/20'
                            : 'bg-zinc-800 text-white/20 cursor-not-allowed'
                            }`}
                    >
                        {isClaiming ? 'Сбор...' : `Собрать ${accumulated.toFixed(0)} BUL`}
                    </button>

                    {/* Equipment List */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-bold text-white">Оборудование</h3>
                            <button className="text-xs text-[#FFD700] hover:text-[#FFA500] transition-colors">
                                Магазин
                            </button>
                        </div>

                        <div className="grid gap-3">
                            {/* Mock Equipment Item */}
                            <div className="p-3 rounded-xl bg-zinc-900/50 backdrop-blur-md border border-white/5 flex items-center gap-3">
                                <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center border border-white/5">
                                    <span className="text-xl">🔋</span>
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-white text-sm">Генератор v1</h4>
                                    <p className="text-xs text-white/40">+15 BUL/час</p>
                                </div>
                                <div className="text-right">
                                    <span className="block text-xs text-[#FFD700] font-bold">Lvl 1</span>
                                    <button className="mt-1 px-3 py-1 rounded bg-white/5 text-[10px] font-medium text-white hover:bg-white/10 transition-colors">
                                        Улучшить
                                    </button>
                                </div>
                            </div>

                            {/* Mock Equipment Item 2 */}
                            <div className="p-3 rounded-xl bg-zinc-900/50 backdrop-blur-md border border-white/5 flex items-center gap-3">
                                <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center border border-white/5">
                                    <span className="text-xl">📡</span>
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-white text-sm">Антенна</h4>
                                    <p className="text-xs text-white/40">+30 BUL/час</p>
                                </div>
                                <div className="text-right">
                                    <span className="block text-xs text-white/30 font-bold">Locked</span>
                                    <button className="mt-1 px-3 py-1 rounded bg-white/5 text-[10px] font-medium text-white/30 cursor-not-allowed">
                                        Купить
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="h-4"></div>
                </div>
            </div>
        </Layout>
    )
}
