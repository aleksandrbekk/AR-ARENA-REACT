import { useState } from 'react'

import { Layout } from '../components/layout/Layout'
import { Check, Star, Users, Ticket } from 'lucide-react'

// Mock Data for Prototype
const MOCK_GIVEAWAY = {
    title: "ЕЖЕНЕДЕЛЬНЫЙ РОЗЫГРЫШ",
    subtitle: "WEEKLY LOTTERY",
    jackpot: "$200",
    timeLeft: { days: "04", hours: "02", minutes: "29", seconds: "58" },
    myTickets: 3,
    totalParticipants: 127
}

const CONDITIONS = [
    { id: 1, text: "Подписка на @premium_news", done: true },
    { id: 2, text: "Подписка на @AlexRich83", done: true },
    { id: 3, text: "Пригласить 3 друзей", progress: "2/3", done: false },
    { id: 4, text: "Иметь минимум 1 билет", action: "Купить", done: false },
]

const WINNERS = [
    { id: 1, name: "A****", amount: "$200", date: "07.10.2025" },
    { id: 2, name: "D****", amount: "30,000₽", date: "30.09.2025" },
    { id: 3, name: "M****", amount: "25,000₽", date: "23.09.2025" },
]

export function GiveawayPremiumExample() {
    const [activeTab, setActiveTab] = useState<'free' | 'vip'>('free')

    return (
        <Layout hideNavbar>
            <div className="min-h-screen bg-[#050505] pb-24 font-sans text-white overflow-x-hidden">

                {/* --- HEADER SLOT MACHINE SECTION --- */}
                <div className="relative pt-6 pb-12 overflow-hidden">
                    {/* Background Glows */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-yellow-600/20 blur-[100px] rounded-full pointer-events-none" />

                    {/* Main Card */}
                    <div className="mx-4 relative z-10 rounded-[32px] p-[2px] bg-gradient-to-b from-[#FFD700] via-[#FFA500] to-transparent shadow-[0_0_30px_rgba(255,215,0,0.15)]">
                        <div className="bg-gradient-to-b from-[#1a1500] to-[#0a0a0a] rounded-[30px] p-6 flex flex-col items-center text-center relative overflow-hidden">

                            {/* Slot Icon Placeholder */}
                            <div className="w-20 h-20 mb-4 bg-gradient-to-b from-gray-800 to-black rounded-2xl border border-yellow-500/30 flex items-center justify-center shadow-lg transform -rotate-3">
                                <span className="text-4xl filter drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]">🎰</span>
                            </div>

                            {/* Titles */}
                            <h1 className="text-2xl font-black text-[#FFD700] uppercase tracking-wide drop-shadow-md">
                                {MOCK_GIVEAWAY.title}
                            </h1>
                            <p className="text-[10px] font-bold text-[#b8860b] tracking-[0.3em] uppercase mb-6">
                                {MOCK_GIVEAWAY.subtitle}
                            </p>

                            {/* Jackpot Display */}
                            <div className="relative mb-8">
                                <div className="absolute inset-0 bg-yellow-500/20 blur-xl rounded-full" />
                                <span className="relative text-6xl font-black text-[#FFD700] drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">
                                    {MOCK_GIVEAWAY.jackpot}
                                </span>
                            </div>

                            {/* Timer Grid */}
                            <div className="flex gap-3 w-full justify-center">
                                <TimerBox value={MOCK_GIVEAWAY.timeLeft.days} label="ДН" />
                                <TimerBox value={MOCK_GIVEAWAY.timeLeft.hours} label="Ч" />
                                <TimerBox value={MOCK_GIVEAWAY.timeLeft.minutes} label="МИН" />
                                <TimerBox value={MOCK_GIVEAWAY.timeLeft.seconds} label="СЕК" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- STATS BAR --- */}
                <div className="px-4 flex gap-3 mb-8">
                    <div className="flex-1 bg-[#111] border border-white/5 rounded-2xl p-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                            <Ticket className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="text-[10px] text-white/40 uppercase font-bold">Мои билеты</div>
                            <div className="text-xl font-bold text-[#FFD700]">{MOCK_GIVEAWAY.myTickets}</div>
                        </div>
                        <button className="ml-auto w-8 h-8 rounded-lg bg-[#FFD700] text-black flex items-center justify-center font-bold text-lg active:scale-95 transition-transform">
                            +
                        </button>
                    </div>
                    <div className="flex-1 bg-[#111] border border-white/5 rounded-2xl p-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/60">
                            <Users className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="text-[10px] text-white/40 uppercase font-bold">Участников</div>
                            <div className="text-xl font-bold text-white">{MOCK_GIVEAWAY.totalParticipants}</div>
                        </div>
                    </div>
                </div>

                {/* --- CONDITIONS SECTION --- */}
                <div className="px-4 mb-8">
                    <div className="flex items-center gap-2 mb-4 justify-center">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#FFD700] to-[#b8860b] flex items-center justify-center text-black text-xs font-bold">✓</div>
                        <h2 className="text-lg font-black uppercase tracking-wide">Условия участия</h2>
                    </div>

                    {/* Type Switcher */}
                    <div className="flex bg-[#111] p-1 rounded-xl mb-6 border border-white/5">
                        <button
                            onClick={() => setActiveTab('free')}
                            className={`flex-1 py-3 rounded-lg font-black text-sm uppercase transition-all ${activeTab === 'free' ? 'bg-[#FFD700] text-black shadow-lg' : 'text-white/40'}`}
                        >
                            Free
                        </button>
                        <button
                            onClick={() => setActiveTab('vip')}
                            className={`flex-1 py-3 rounded-lg font-black text-sm uppercase transition-all ${activeTab === 'vip' ? 'bg-[#FFD700] text-black shadow-lg' : 'text-white/40'}`}
                        >
                            VIP
                        </button>
                    </div>

                    {/* List */}
                    <div className="bg-[#111] border border-white/5 rounded-3xl p-6 space-y-4 relative overflow-hidden">
                        {/* Corner Accent */}
                        <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 blur-2xl rounded-full" />

                        {CONDITIONS.map((cond) => (
                            <div key={cond.id} className="flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${cond.done ? 'bg-[#FFD700] border-[#FFD700] text-black' : 'border-white/10 text-transparent'}`}>
                                        <Check className="w-3.5 h-3.5" strokeWidth={4} />
                                    </div>
                                    <span className="font-medium text-sm text-white/90">{cond.text}</span>
                                </div>

                                {cond.done ? (
                                    <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Выполнено</span>
                                ) : cond.action ? (
                                    <button className="px-4 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform">
                                        {cond.action}
                                    </button>
                                ) : (
                                    <span className="text-sm font-bold text-[#FFD700]">{cond.progress}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* --- WINNERS SECTION --- */}
                <div className="px-4">
                    <div className="flex items-center gap-2 mb-4 justify-center">
                        <Star className="w-5 h-5 text-[#cda434]" fill="#cda434" />
                        <h2 className="text-lg font-black uppercase tracking-wide">Прошлые победители</h2>
                    </div>

                    <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
                        {WINNERS.map((winner) => (
                            <div key={winner.id} className="min-w-[140px] bg-[#111] border border-white/5 rounded-2xl p-4 flex flex-col">
                                <div className="text-[#FFD700] font-black text-xs mb-1 uppercase tracking-wider">
                                    {winner.name}
                                </div>
                                <div className="text-2xl font-black text-white mb-1">
                                    {winner.amount}
                                </div>
                                <div className="text-[10px] text-white/30 font-medium">
                                    {winner.date}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </Layout>
    )
}

function TimerBox({ value, label }: { value: string, label: string }) {
    return (
        <div className="flex flex-col items-center gap-1">
            <div className="w-14 h-14 rounded-xl bg-[#1a1a1a] border border-[#FFD700]/30 flex items-center justify-center relative overflow-hidden shadow-inner">
                <span className="text-xl font-bold text-[#FFD700] pt-1">{value}</span>
                {/* Shine */}
                <div className="absolute top-0 inset-x-0 h-[1px] bg-white/20" />
            </div>
            <span className="text-[9px] font-bold text-[#888] uppercase tracking-widest">{label}</span>
        </div>
    )
}
