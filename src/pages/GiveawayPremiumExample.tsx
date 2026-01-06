import { Layout } from '../components/layout/Layout'
import { Check, Ticket, Trophy } from 'lucide-react'

// Mock Data matching current V2 structure
const MOCK_GIVEAWAY = {
    title: "ЕЖЕНЕДЕЛЬНЫЙ РОЗЫГРЫШ",
    subtitle: "WEEKLY LOTTERY",
    jackpot: "$2,000",
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
    return (
        <Layout hideNavbar>
            <div className="min-h-screen bg-[#050505] pb-24 font-sans text-white overflow-x-hidden relative">

                {/* --- LUXURY BACKGROUND --- */}
                <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[#4a0404] via-[#1a0101] to-[#000000] z-0" />

                {/* --- STYLISH GOLDEN FRAME --- */}
                <div className="fixed inset-0 pointer-events-none z-50 border-[6px] border-[#FFD700]/20 rounded-[32px] sm:rounded-none" />

                <div className="relative z-10 pt-16 pb-8">
                    {/* Main Content */}
                    <div className="flex flex-col items-center text-center px-4">

                        {/* New Luxury Icon (Blended) */}
                        <div className="relative w-48 h-48 -mt-6 mb-4">
                            {/* Glow behind */}
                            <div className="absolute inset-0 bg-[#ff0033]/30 blur-[60px] rounded-full animate-pulse" />

                            <img
                                src="/luxury_ruby_slot_machine_black_bg.png"
                                alt="Luxury Icon"
                                className="relative w-full h-full object-contain mix-blend-screen drop-shadow-[0_10px_30px_rgba(255,0,0,0.4)] transform hover:scale-110 transition-transform duration-500"
                                style={{ filter: 'contrast(1.2) saturate(1.2)' }}
                                onError={(e) => {
                                    e.currentTarget.src = '/icons/gift.png'
                                    e.currentTarget.style.mixBlendMode = 'normal'
                                }}
                            />
                        </div>

                        {/* Titles */}
                        <h1 className="text-3xl font-black text-white uppercase tracking-wide drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] mb-2 mt-[-20px]">
                            {MOCK_GIVEAWAY.title}
                        </h1>
                        <p className="text-xs font-bold text-[#FFD700] tracking-[0.4em] uppercase mb-8 opacity-90">
                            {MOCK_GIVEAWAY.subtitle}
                        </p>

                        {/* Timer Grid (Burgundy Style) */}
                        <div className="flex gap-3 justify-center w-full max-w-sm">
                            <TimerBox value={MOCK_GIVEAWAY.timeLeft.days} label="ДН" />
                            <div className="pt-2 text-2xl font-thin text-white/20">:</div>
                            <TimerBox value={MOCK_GIVEAWAY.timeLeft.hours} label="Ч" />
                            <div className="pt-2 text-2xl font-thin text-white/20">:</div>
                            <TimerBox value={MOCK_GIVEAWAY.timeLeft.minutes} label="МИН" />
                            <div className="pt-2 text-2xl font-thin text-white/20">:</div>
                            <TimerBox value={MOCK_GIVEAWAY.timeLeft.seconds} label="СЕК" isRed />
                        </div>
                    </div>
                </div>

                {/* --- STATS BAR (Floating) --- */}
                <div className="px-4 -mt-8 relative z-20">
                    <div className="bg-[#1a0505] border border-[#ff0033]/20 backdrop-blur-xl rounded-2xl p-4 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] flex items-center justify-between">

                        {/* Jackpot */}
                        <div className="flex flex-col">
                            <span className="text-[10px] text-white/50 uppercase tracking-wider font-bold mb-1">Джекпот</span>
                            <span className="text-3xl font-black text-[#FFD700] drop-shadow-sm">{MOCK_GIVEAWAY.jackpot}</span>
                        </div>

                        {/* Vertical Divider */}
                        <div className="w-px h-10 bg-white/10" />

                        {/* My Tickets */}
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] text-white/50 uppercase tracking-wider font-bold mb-1">Мои билеты</span>
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-bold text-white">{MOCK_GIVEAWAY.myTickets}</span>
                                <div className="w-8 h-8 rounded-full bg-[#ff0033] flex items-center justify-center text-white text-lg font-bold shadow-[0_0_15px_rgba(255,0,51,0.4)]">
                                    <Ticket className="w-4 h-4 fill-current" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- CONDITIONS SECTION --- */}
                <div className="px-4 mt-8 mb-8">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-1 h-6 bg-[#ff0033] rounded-full" />
                        <h2 className="text-xl font-bold uppercase tracking-wide text-white">Условия участия</h2>
                    </div>

                    <div className="space-y-3">
                        {CONDITIONS.map((cond) => (
                            <div key={cond.id} className="relative overflow-hidden bg-[#111] border border-white/5 rounded-2xl p-4 flex items-center justify-between group">
                                {cond.done && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-[#ff0033]/5 to-transparent pointer-events-none" />
                                )}

                                <div className="flex items-center gap-4 relative z-10">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${cond.done ? 'bg-[#ff0033] border-[#ff0033] text-white' : 'border-white/10 text-white/20'}`}>
                                        <Check className="w-4 h-4" strokeWidth={3} />
                                    </div>
                                    <span className="font-medium text-sm text-white/90">{cond.text}</span>
                                </div>

                                <div className="relative z-10">
                                    {cond.done ? (
                                        <span className="text-[10px] font-bold text-[#ff0033] uppercase tracking-wider bg-[#ff0033]/10 px-2 py-1 rounded-md">Выполнено</span>
                                    ) : cond.action ? (
                                        <button className="px-4 py-2 rounded-lg bg-white text-black text-xs font-bold hover:bg-gray-200 active:scale-95 transition-all">
                                            {cond.action}
                                        </button>
                                    ) : (
                                        <span className="text-sm font-bold text-white/40">{cond.progress}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* --- WINNERS SECTION --- */}
                <div className="px-4 pb-8">
                    <div className="flex items-center gap-2 mb-4 justify-between">
                        <div className="flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-[#FFD700]" />
                            <h2 className="text-lg font-bold uppercase tracking-wide text-white">Победители</h2>
                        </div>
                        <button className="text-xs font-bold text-white/40 uppercase">Все</button>
                    </div>

                    <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
                        {WINNERS.map((winner, i) => (
                            <div key={winner.id} className="min-w-[160px] bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-white/5 rounded-2xl p-4 relative group">
                                {i === 0 && <div className="absolute top-3 right-3 text-xs">🥇</div>}
                                <div className="text-white/40 font-bold text-[10px] mb-2 uppercase tracking-wider">
                                    {winner.date}
                                </div>
                                <div className="text-xl font-black text-white mb-1 group-hover:text-[#ff0033] transition-colors">
                                    {winner.amount}
                                </div>
                                <div className="text-sm font-bold text-white/80">
                                    {winner.name}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </Layout>
    )
}

function TimerBox({ value, label, isRed = false }: { value: string, label: string, isRed?: boolean }) {
    return (
        <div className="flex flex-col items-center gap-2">
            <div className={`w-16 h-18 rounded-2xl flex items-center justify-center relative overflow-hidden backdrop-blur-md border 
        ${isRed ? 'bg-[#ff0033]/20 border-[#ff0033]/50' : 'bg-white/5 border-white/10'}`}>
                <span className={`text-2xl font-bold ${isRed ? 'text-[#ff0033]' : 'text-white'}`}>{value}</span>

                {/* Glossy Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
            </div>
            <span className={`text-[9px] font-bold uppercase tracking-widest ${isRed ? 'text-[#ff0033]' : 'text-white/30'}`}>{label}</span>
        </div>
    )
}
