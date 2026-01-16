import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { BuyTicketModal } from '../components/giveaways/BuyTicketModal'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useGiveaways } from '../hooks/useGiveaways'
import type { Giveaway } from '../types'
import { motion } from 'framer-motion'
import { Loader2, Users, Ticket, Trophy } from 'lucide-react'

// ВЕРСИЯ 3: По макету #10 с кубиками
export function GiveawayPageV3() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { telegramUser } = useAuth()
    const { getGiveawayStats } = useGiveaways()

    const [giveaway, setGiveaway] = useState<Giveaway | null>(null)
    const [loading, setLoading] = useState(true)
    const [myTickets, setMyTickets] = useState(0)
    const [totalParticipants, setTotalParticipants] = useState(0)
    const [showModal, setShowModal] = useState(false)

    // Timer State
    const [timeLeft, setTimeLeft] = useState<{ days: number, hours: number, minutes: number, seconds: number } | null>(null)
    const [isEnded, setIsEnded] = useState(false)



    // Прошлые победители (демо)
    const pastWinners = [
        { name: 'Флихлинд Машоев', prize: '$100' },
        { name: 'Александр К.', prize: '$50' },
    ]

    useEffect(() => {
        if (id) {
            fetchGiveaway()
            fetchStats()
            if (telegramUser) fetchMyTickets()
        }
    }, [id, telegramUser])

    // Real-time subscription
    useEffect(() => {
        if (!id) return
        const channel = supabase
            .channel(`giveaway_tickets:${id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'giveaway_tickets', filter: `giveaway_id=eq.${id}` },
                () => fetchStats()
            )
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [id])

    const fetchStats = async () => {
        if (!id) return
        const stats = await getGiveawayStats(id)
        setTotalParticipants(stats.participants_count || stats.total_tickets || 0)
    }

    useEffect(() => {
        if (!giveaway?.end_date) return

        const calculateTimeLeft = () => {
            const difference = +new Date(giveaway.end_date) - +new Date()
            if (difference > 0) {
                return {
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60)
                }
            }
            return null
        }

        const timer = setInterval(() => {
            const newTimeLeft = calculateTimeLeft()
            setTimeLeft(newTimeLeft)
            if (!newTimeLeft) setIsEnded(true)
            else setIsEnded(false)
        }, 1000)

        setTimeLeft(calculateTimeLeft())
        if (new Date(giveaway.end_date) < new Date()) setIsEnded(true)

        return () => clearInterval(timer)
    }, [giveaway?.end_date])

    const fetchGiveaway = async () => {
        setLoading(true)
        const { data } = await supabase
            .from('giveaways')
            .select('*')
            .eq('id', id)
            .single()
        if (data) {
            setGiveaway(data)
            setIsEnded(data.status === 'completed' || new Date(data.end_date) < new Date())
        }
        setLoading(false)
    }

    const fetchMyTickets = async () => {
        if (!telegramUser) return
        const { count } = await supabase
            .from('giveaway_tickets')
            .select('*', { count: 'exact', head: true })
            .eq('giveaway_id', id)
            .eq('user_id', telegramUser.id)
        setMyTickets(count || 0)
    }

    const handleBuySuccess = () => {
        fetchGiveaway()
        fetchMyTickets()
        fetchStats()
    }

    const isActive = giveaway?.status === 'active' && !isEnded
    const prizeAmount = giveaway?.jackpot_current_amount || 500000

    if (loading) {
        return (
            <Layout hideNavbar>
                <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-[#FFD700] animate-spin" />
                </div>
            </Layout>
        )
    }

    if (!giveaway) {
        return (
            <Layout hideNavbar>
                <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center">
                    <p className="text-white/50 mb-4">Розыгрыш не найден</p>
                    <button onClick={() => navigate('/giveaways')} className="text-[#FFD700]">Назад</button>
                </div>
            </Layout>
        )
    }

    return (
        <Layout hideNavbar>
            <div className="min-h-screen bg-[#0a0a0a] flex flex-col relative overflow-hidden">

                {/* === ЗОЛОТЫЕ ДИАГОНАЛЬНЫЕ ЛИНИИ (ФОН) === */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full">
                        <div className="absolute -top-20 -left-20 w-[200%] h-32 bg-gradient-to-r from-transparent via-[#FFD700]/10 to-transparent rotate-[25deg]" />
                        <div className="absolute top-40 -right-20 w-[200%] h-24 bg-gradient-to-r from-transparent via-[#FFD700]/5 to-transparent -rotate-[15deg]" />
                        <div className="absolute bottom-40 -left-20 w-[200%] h-20 bg-gradient-to-r from-transparent via-[#FFA500]/10 to-transparent rotate-[20deg]" />
                    </div>
                </div>

                {/* === HERO СЕКЦИЯ === */}
                <div className="relative pt-16 pb-4 px-4 text-center">
                    {/* Кубики */}
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.6 }}
                        className="flex justify-center mb-4"
                    >
                        <img
                            src="/icons/giveaway_dice.png"
                            alt="Lucky Dice"
                            className="w-32 h-32 object-contain drop-shadow-[0_0_30px_rgba(255,215,0,0.4)]"
                        />
                    </motion.div>

                    {/* Заголовок */}
                    <motion.h1
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-lg font-bold text-white/80 tracking-[0.15em] uppercase mb-2"
                    >
                        ЕЖЕНЕДЕЛЬНЫЙ
                    </motion.h1>
                    <motion.h2
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-2xl font-black text-white tracking-[0.1em] uppercase mb-4"
                    >
                        РОЗЫГРЫШ
                    </motion.h2>

                    {/* Сумма приза */}
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.4, type: "spring" }}
                        className="inline-block bg-gradient-to-r from-[#1a1a1a] to-[#2a2a2a] border-2 border-[#FFD700]/50 rounded-xl px-8 py-3 mb-6 shadow-[0_0_30px_rgba(255,215,0,0.2)]"
                    >
                        <span className="text-4xl font-black bg-gradient-to-b from-[#FFD700] to-[#FFA500] bg-clip-text text-transparent">
                            {prizeAmount.toLocaleString()} ₽
                        </span>
                    </motion.div>

                    {/* Таймер */}
                    {isActive && timeLeft && (
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="flex justify-center gap-2"
                        >
                            <TimerPill value={timeLeft.days} label="ДНЯ" />
                            <span className="text-white/30 text-2xl font-light self-center">:</span>
                            <TimerPill value={timeLeft.hours} label="ЧАС" />
                            <span className="text-white/30 text-2xl font-light self-center">:</span>
                            <TimerPill value={timeLeft.minutes} label="МИН" />
                            <span className="text-white/30 text-2xl font-light self-center">:</span>
                            <TimerPill value={timeLeft.seconds} label="СЕК" />
                        </motion.div>
                    )}
                </div>

                {/* === БИЛЕТЫ И УЧАСТНИКИ === */}
                <div className="px-4 py-3">
                    <div className="flex items-center justify-between bg-[#1a1a1a]/80 border border-[#FFD700]/20 rounded-xl p-3">
                        <div className="flex items-center gap-2">
                            <Ticket className="w-5 h-5 text-[#FFD700]" />
                            <span className="text-white/60 text-sm">ВАШИ БИЛЕТЫ</span>
                            <span className="text-white font-bold ml-2">{myTickets}</span>
                        </div>
                        <button
                            onClick={() => setShowModal(true)}
                            className="px-4 py-2 bg-gradient-to-r from-[#FFD700]/20 to-[#FFA500]/20 border border-[#FFD700]/40 rounded-lg text-[#FFD700] text-sm font-bold hover:from-[#FFD700]/30 hover:to-[#FFA500]/30 transition-all"
                        >
                            КУПИТЬ БИЛЕТЫ
                        </button>
                    </div>

                    {/* Участников */}
                    <div className="flex items-center justify-center gap-2 mt-3 text-white/50 text-sm">
                        <Users className="w-4 h-4" />
                        <span>УЧАСТНИКОВ:</span>
                        <span className="text-white font-bold">{totalParticipants.toLocaleString()}</span>
                    </div>
                </div>



                {/* === ИСТОРИЯ ПОБЕДИТЕЛЕЙ === */}
                <div className="px-4 py-3 pb-32">
                    <div className="bg-[#1a1a1a]/60 border border-white/5 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Trophy className="w-4 h-4 text-[#FFD700]" />
                            <h3 className="text-white/60 text-xs font-bold uppercase tracking-widest">ИСТОРИЯ ПОБЕДИТЕЛЕЙ</h3>
                        </div>
                        <div className="space-y-2">
                            {pastWinners.map((winner, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FFD700] to-[#FFA500] flex items-center justify-center text-black font-bold text-xs">
                                            {idx + 1}
                                        </div>
                                        <span className="text-white/80 text-sm">{winner.name}</span>
                                    </div>
                                    <span className="text-[#FFD700] font-bold">{winner.prize}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* === BOTTOM NAV === */}
                <div className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a] border-t border-white/10 p-3 pb-6 flex justify-around">
                    <NavItem icon="🏠" label="Главная" active />
                    <NavItem icon="🎮" label="Игры" />
                    <NavItem icon="👥" label="Рефералы" />
                </div>

            </div>

            <BuyTicketModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                giveaway={giveaway}
                onSuccess={handleBuySuccess}
            />
        </Layout>
    )
}

// Компонент таймера
function TimerPill({ value, label }: { value: number, label: string }) {
    return (
        <div className="flex flex-col items-center">
            <div className="w-14 h-14 bg-[#1a1a1a] border border-[#FFD700]/30 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(255,215,0,0.1)]">
                <span className="text-2xl font-bold text-white tabular-nums">{String(value).padStart(2, '0')}</span>
            </div>
            <span className="text-[10px] text-white/40 mt-1 font-medium tracking-wider">{label}</span>
        </div>
    )
}

// Компонент навигации
function NavItem({ icon, label, active }: { icon: string, label: string, active?: boolean }) {
    return (
        <div className={`flex flex-col items-center gap-1 ${active ? 'text-[#FFD700]' : 'text-white/40'}`}>
            <span className="text-xl">{icon}</span>
            <span className="text-[10px] font-medium">{label}</span>
        </div>
    )
}
