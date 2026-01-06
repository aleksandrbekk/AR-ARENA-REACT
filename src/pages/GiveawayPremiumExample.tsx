import { Layout } from '../components/layout/Layout'
import { Plus, Check } from 'lucide-react'

// Mock Data
const MOCK_GIVEAWAY = {
    prize: "$200",
    prizeLabel: "ЕЖЕНЕДЕЛЬНЫЙ ПРИЗ",
    timeLeft: { days: "04", hours: "02", minutes: "29", seconds: "58" },
    myTickets: 3,
    totalParticipants: 127,
    winChance: "2.3%",
    balance: "9,500"
}

const CONDITIONS = [
    { id: 1, text: "Подписаться на Telegram", done: true },
    { id: 2, text: "Сделать репост в VK", done: true },
    { id: 3, text: "Пригласить 2 друзей", progress: "1/2", action: "Пригласить", done: false },
    { id: 4, text: "Купить 1 билет", progress: "0/1", action: "Купить", done: false },
]

const WINNERS = [
    { name: "A****", amount: "$200", date: "07.10.25" },
    { name: "D****", amount: "$50", date: "04.10.25" },
    { name: "B****", amount: "$150", date: "06.10.25" },
    { name: "E****", amount: "$25", date: "03.10.25" },
]

export function GiveawayPremiumExample() {
    return (
        <Layout hideNavbar>
            <div className="min-h-screen bg-black pb-24 font-sans text-white overflow-x-hidden relative">

                {/* === HEADER BAR === */}
                <div className="relative z-20 flex items-center justify-between px-4 pt-4 pb-2">
                    {/* Logo */}
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded bg-gradient-to-br from-[#FFD700] to-[#B8860B] flex items-center justify-center">
                            <span className="text-black font-black text-xs">AR</span>
                        </div>
                        <span className="font-bold text-white tracking-widest text-sm">ARENA</span>
                    </div>

                    {/* Balance */}
                    <div className="flex items-center gap-1.5 bg-black/50 border border-[#FFD700]/30 rounded-full px-3 py-1">
                        <span className="text-white font-bold text-sm">{MOCK_GIVEAWAY.balance}</span>
                        <div className="w-4 h-4 rounded-full bg-[#FFD700]" />
                    </div>
                </div>

                {/* === GEOMETRIC LINES (Top Decoration) === */}
                <div className="absolute top-0 left-0 right-0 h-40 pointer-events-none z-10 overflow-hidden">
                    <svg className="w-full h-full" viewBox="0 0 400 160" preserveAspectRatio="none">
                        <line x1="0" y1="60" x2="100" y2="20" stroke="url(#goldGradient)" strokeWidth="1" opacity="0.3" />
                        <line x1="400" y1="60" x2="300" y2="20" stroke="url(#goldGradient)" strokeWidth="1" opacity="0.3" />
                        <line x1="100" y1="20" x2="200" y2="5" stroke="url(#goldGradient)" strokeWidth="1" opacity="0.5" />
                        <line x1="300" y1="20" x2="200" y2="5" stroke="url(#goldGradient)" strokeWidth="1" opacity="0.5" />
                        <defs>
                            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#B8860B" />
                                <stop offset="50%" stopColor="#FFD700" />
                                <stop offset="100%" stopColor="#B8860B" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>

                {/* === HERO PRIZE SECTION === */}
                <div className="relative z-10 pt-8 pb-4 flex flex-col items-center">
                    {/* 3D Prize Amount */}
                    <div className="relative w-72 h-40 mb-2">
                        <img
                            src="/golden_prize_200.png"
                            alt="$200"
                            className="w-full h-full object-contain drop-shadow-[0_0_40px_rgba(255,215,0,0.3)]"
                        />
                    </div>

                    {/* Prize Label */}
                    <p className="text-[#FFD700] text-sm font-bold tracking-[0.3em] uppercase mb-6">
                        {MOCK_GIVEAWAY.prizeLabel}
                    </p>

                    {/* Timer */}
                    <div className="flex items-center gap-2 text-white font-medium text-lg">
                        <span>{MOCK_GIVEAWAY.timeLeft.days}<span className="text-white/40 text-sm">д</span></span>
                        <span className="text-white/30">:</span>
                        <span>{MOCK_GIVEAWAY.timeLeft.hours}<span className="text-white/40 text-sm">ч</span></span>
                        <span className="text-white/30">:</span>
                        <span>{MOCK_GIVEAWAY.timeLeft.minutes}<span className="text-white/40 text-sm">м</span></span>
                        <span className="text-white/30">:</span>
                        <span>{MOCK_GIVEAWAY.timeLeft.seconds}<span className="text-white/40 text-sm">с</span></span>
                    </div>
                </div>

                {/* === TICKETS SECTION === */}
                <div className="px-4 py-6 border-t border-b border-white/5">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-2xl font-bold text-white">{MOCK_GIVEAWAY.myTickets}</span>
                            <span className="text-white/60 ml-2 uppercase text-sm tracking-wider">БИЛЕТА</span>
                        </div>

                        {/* Ticket Fan */}
                        <div className="flex-1 flex justify-center">
                            <img
                                src="/golden_tickets_fan.png"
                                alt="Tickets"
                                className="w-40 h-24 object-contain drop-shadow-[0_0_20px_rgba(255,215,0,0.2)]"
                            />
                        </div>

                        {/* Add Button */}
                        <button className="w-10 h-10 rounded-full border-2 border-[#FFD700]/50 flex items-center justify-center text-[#FFD700] hover:bg-[#FFD700]/10 transition-colors">
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* === CONDITIONS SECTION === */}
                <div className="px-4 py-6">
                    <h3 className="text-white/60 text-xs font-bold uppercase tracking-widest mb-4">Условия</h3>

                    <div className="space-y-3">
                        {CONDITIONS.map((cond) => (
                            <div key={cond.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                                <div className="flex items-center gap-3">
                                    <span className={`text-sm ${cond.done ? 'text-white/80' : 'text-white/60'}`}>
                                        {cond.text}
                                    </span>
                                </div>

                                {cond.done ? (
                                    <div className="flex items-center gap-1.5 text-[#FFD700]">
                                        <span className="text-xs">Выполнено</span>
                                        <Check className="w-4 h-4" />
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <span className="text-white/40 text-sm">{cond.progress}</span>
                                        <button className="px-4 py-1.5 rounded border border-white/20 text-white text-xs font-medium hover:bg-white/5 transition-colors">
                                            {cond.action}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* === STATS BAR === */}
                <div className="px-4 py-3 flex items-center justify-center gap-4 border-t border-white/5">
                    <span className="text-white/60 text-sm">{MOCK_GIVEAWAY.totalParticipants} участников</span>
                    <span className="text-white/20">·</span>
                    <span className="text-white/60 text-sm">Шанс: <span className="text-[#FFD700]">{MOCK_GIVEAWAY.winChance}</span></span>
                </div>

                {/* === WINNERS SECTION === */}
                <div className="px-4 py-4 grid grid-cols-2 gap-x-8 gap-y-2 border-t border-white/5">
                    {WINNERS.map((winner, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <span className="text-white/60 text-xs">{winner.name}</span>
                            <span className="text-white/30">—</span>
                            <span className="text-[#FFD700] text-sm font-bold">{winner.amount}</span>
                            <span className="text-white/30">—</span>
                            <span className="text-white/40 text-xs">{winner.date}</span>
                        </div>
                    ))}
                </div>

            </div>
        </Layout>
    )
}
