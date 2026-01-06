import { Layout } from '../components/layout/Layout'
import { Ticket, Trophy } from 'lucide-react'

// Mock Data matching current V2 structure
const MOCK_GIVEAWAY = {
    title: "ЕЖЕНЕДЕЛЬНЫЙ РОЗЫГРЫШ",
    subtitle: "WEEKLY LOTTERY",
    jackpot: "$2,000",
    timeLeft: { days: "04", hours: "02", minutes: "29", seconds: "58" },
    myTickets: 3,
    totalTickets: 127,
    currency: "AR"
}

const PRIZES = [
    { place: 1, amount: "20,000", currency: "AR", percentage: 50 },
    { place: 2, amount: "10,000", currency: "AR", percentage: 30 },
    { place: 3, amount: "5,000", currency: "AR", percentage: 20 },
    { place: 4, amount: "1,000", currency: "AR" },
    { place: 5, amount: "500", currency: "AR" },
]

export function GiveawayPremiumExample() {
    return (
        <Layout hideNavbar>
            <div className="min-h-screen bg-[#050505] pb-24 font-sans text-white overflow-x-hidden relative">

                {/* --- HEADER BACKGROUND IMAGE --- */}
                <div className="absolute top-0 inset-x-0 h-[600px] overflow-hidden pointer-events-none z-0">
                    <img
                        src="/giveaway_hero_bg_purple_gold.png"
                        alt="Background"
                        className="w-full h-full object-cover opacity-80"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/50 to-[#050505]" />
                </div>


                {/* --- MAIN HEADER CONTENT --- */}
                <div className="relative z-10 pt-16 pb-6">
                    <div className="flex flex-col items-center text-center px-4">

                        {/* NEON ICON (Circular & Floating) */}
                        <div className="relative w-64 h-64 -mt-4 mb-2">
                            <img
                                src="/luxury_neon_slot_machine_circle.png"
                                alt="Neon Slot"
                                className="relative w-full h-full object-contain drop-shadow-[0_10px_40px_rgba(0,0,0,0.6)] transform hover:scale-105 transition-transform duration-500"
                                onError={(e) => {
                                    e.currentTarget.src = '/icons/gift.png'
                                }}
                            />
                        </div>

                        {/* Title Section */}
                        <h1 className="text-3xl font-black text-white uppercase tracking-wide drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] mb-2 mt-[-20px] text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400">
                            {MOCK_GIVEAWAY.title}
                        </h1>
                        <p className="text-xs font-bold text-[#FFD700] tracking-[0.4em] uppercase mb-8 opacity-90 drop-shadow-[0_0_10px_rgba(255,215,0,0.4)]">
                            {MOCK_GIVEAWAY.subtitle}
                        </p>

                        {/* Timer Grid (Gold & Purple Clean Style) */}
                        <div className="flex gap-4 justify-center w-full max-w-sm">
                            <TimerBox value={MOCK_GIVEAWAY.timeLeft.days} label="ДН" />
                            <div className="pt-2 text-2xl font-thin text-purple-500/30">:</div>
                            <TimerBox value={MOCK_GIVEAWAY.timeLeft.hours} label="Ч" />
                            <div className="pt-2 text-2xl font-thin text-purple-500/30">:</div>
                            <TimerBox value={MOCK_GIVEAWAY.timeLeft.minutes} label="МИН" />
                            <div className="pt-2 text-2xl font-thin text-purple-500/30">:</div>
                            <TimerBox value={MOCK_GIVEAWAY.timeLeft.seconds} label="СЕК" isActive />
                        </div>
                    </div>
                </div>

                {/* --- V2 BODY CONTENT (Stats + Prizes) --- */}
                <div className="px-4 relative z-20">

                    {/* 1. Stats Card (Restored from V2) */}
                    <div className="bg-[#141414]/80 backdrop-blur-md border border-white/10 rounded-3xl p-5 shadow-2xl mb-6 relative overflow-hidden">
                        {/* Shimmer effect */}
                        <div className="absolute top-0 -right-20 w-40 h-40 bg-purple-500/10 blur-[50px] rounded-full" />

                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-lg font-bold text-white leading-tight mb-1">Статистика</h2>
                                <p className="text-white/40 text-xs">Ваше участие в розыгрыше</p>
                            </div>

                            <div className="bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-xl px-4 py-2 flex flex-col items-center">
                                <span className="text-[10px] text-[#FFD700] uppercase font-bold tracking-wider">Джекпот</span>
                                <span className="text-xl font-black text-[#FFD700] drop-shadow-[0_0_10px_rgba(255,215,0,0.3)]">{MOCK_GIVEAWAY.jackpot}</span>
                            </div>
                        </div>

                        {/* Stats Row */}
                        <div className="flex gap-3">
                            <div className="flex-1 bg-[#0a0a0a] rounded-2xl p-3 text-center border border-white/5 relative group">
                                <div className="text-[9px] text-white/40 uppercase tracking-wider mb-1 font-bold">Всего билетов</div>
                                <div className="text-xl text-white font-black group-hover:text-purple-400 transition-colors">{MOCK_GIVEAWAY.totalTickets}</div>
                            </div>
                            <div className="flex-1 bg-[#0a0a0a] rounded-2xl p-3 text-center border border-white/5 relative group">
                                <div className="absolute inset-0 bg-gradient-to-b from-[#FFD700]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                                <div className="text-[9px] text-[#FFD700]/80 uppercase tracking-wider mb-1 font-bold">Мои билеты</div>
                                <div className="text-xl text-[#FFD700] font-black">{MOCK_GIVEAWAY.myTickets}</div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Prizes List (Restored from V2) */}
                    <div className="mb-24">
                        <div className="flex items-center gap-2 mb-4 pl-1">
                            <Trophy className="w-4 h-4 text-purple-500" />
                            <h3 className="text-white font-bold uppercase tracking-widest text-sm">Призовые места</h3>
                        </div>

                        <div className="space-y-2">
                            {PRIZES.map((prize, idx) => (
                                <div key={idx} className="flex items-center gap-4 p-3 bg-[#141414] border border-white/5 rounded-2xl hover:border-purple-500/20 transition-colors">
                                    {/* Rank Badge */}
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-inner 
                                        ${idx === 0 ? 'bg-gradient-to-br from-[#FFD700] to-[#FFA500] text-black shadow-[0_0_15px_rgba(255,215,0,0.3)]' :
                                            idx === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-black' :
                                                idx === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-black' :
                                                    'bg-white/5 text-white/40 border border-white/5'
                                        }`}>
                                        {prize.place}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <div className={`font-bold ${idx === 0 ? 'text-[#FFD700]' : 'text-white'}`}>
                                                {prize.amount} {prize.currency}
                                            </div>
                                            {idx === 0 && <div className="text-[10px] text-[#FFD700]/60">Главный приз</div>}
                                            {prize.percentage && idx !== 0 && <div className="text-[10px] text-white/30">+ {prize.percentage}% от пула</div>}
                                        </div>
                                        {idx === 0 && <Ticket className="w-5 h-5 text-[#FFD700] opacity-50" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* --- BUY BUTTON (Visual) --- */}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/90 to-transparent z-50 pb-8">
                    <button className="w-full py-4 rounded-2xl font-black text-lg text-black bg-gradient-to-r from-[#FFD700] to-[#FFA500] shadow-[0_4px_20px_rgba(255,215,0,0.3)] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                        <span>КУПИТЬ БИЛЕТ</span>
                        <span className="bg-black/10 px-2 py-0.5 rounded text-sm font-bold">10 AR</span>
                    </button>
                </div>

            </div>
        </Layout>
    )
}

function TimerBox({ value, label, isActive = false }: { value: string, label: string, isActive?: boolean }) {
    return (
        <div className="flex flex-col items-center gap-2">
            <div className={`w-16 h-18 rounded-2xl flex items-center justify-center relative overflow-hidden backdrop-blur-md border 
        ${isActive ? 'bg-purple-600/20 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'bg-white/5 border-white/10'}`}>
                <span className={`text-2xl font-bold ${isActive ? 'text-purple-400' : 'text-white'}`}>{value}</span>

                {/* Glossy Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
            </div>
            <span className={`text-[9px] font-bold uppercase tracking-widest ${isActive ? 'text-purple-400/80' : 'text-white/30'}`}>{label}</span>
        </div>
    )
}
