import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Timer, Ticket, Trophy } from 'lucide-react'
import type { Giveaway } from '../types'
import { CurrencyIcon } from './CurrencyIcon'

interface GiveawayCardProps {
  giveaway: Giveaway
  onBuy: (count: number) => Promise<void>
  userTickets: number
}

export function GiveawayCard({ giveaway, onBuy, userTickets }: GiveawayCardProps) {
  const [timeLeft, setTimeLeft] = useState('')
  const [isBuying, setIsBuying] = useState(false)

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(giveaway.end_date) - +new Date()
      
      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24))
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24)
        const minutes = Math.floor((difference / 1000 / 60) % 60)
        const seconds = Math.floor((difference / 1000) % 60)
        
        return `${days}d ${hours}h ${minutes}m ${seconds}s`
      }
      return 'Ended'
    }

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    setTimeLeft(calculateTimeLeft())

    return () => clearInterval(timer)
  }, [giveaway.end_date])

  const handleBuyClick = async () => {
    const countStr = window.prompt(`Сколько билетов купить? Цена: ${giveaway.price} ${giveaway.currency.toUpperCase()}`, '1')
    if (!countStr) return

    const count = parseInt(countStr)
    if (isNaN(count) || count <= 0) {
      alert('Пожалуйста, введите корректное число')
      return
    }

    try {
      setIsBuying(true)
      await onBuy(count)
      alert('Билеты успешно куплены!')
    } catch (error: any) {
      alert(`Ошибка: ${error.message || 'Не удалось купить билеты'}`)
    } finally {
      setIsBuying(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-zinc-900/50 backdrop-blur-md border border-white/10 p-5 flex flex-col gap-4"
    >
      {/* Background Glow */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#FFD700]/10 blur-[50px] rounded-full pointer-events-none" />

      {/* Header */}
      <div className="flex justify-between items-start z-10">
        <div>
          <h3 className="text-lg font-bold text-white leading-tight">{giveaway.title}</h3>
          {giveaway.subtitle && (
            <p className="text-xs text-white/50 mt-1">{giveaway.subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-lg border border-white/5">
          <Ticket className="w-3 h-3 text-[#FFD700]" />
          <span className="text-xs font-medium text-white/80">
            Мои билеты: <span className="text-[#FFD700]">{userTickets}</span>
          </span>
        </div>
      </div>

      {/* Jackpot Section */}
      <div className="py-2 flex flex-col items-center justify-center bg-black/20 rounded-xl border border-white/5 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#FFD700]/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
        <span className="text-xs text-[#FFD700] uppercase tracking-widest font-bold mb-1 flex items-center gap-1">
          <Trophy className="w-3 h-3" /> Jackpot
        </span>
        <div className="text-3xl font-black text-white drop-shadow-[0_0_10px_rgba(255,215,0,0.3)] flex items-center gap-2">
          <CurrencyIcon type={giveaway.currency === 'ar' ? 'AR' : 'BUL'} className="w-6 h-6" />
          {giveaway.jackpot_current_amount.toLocaleString()}
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex justify-between items-center text-xs text-white/60">
        <div className="flex items-center gap-1.5">
          <Timer className="w-3.5 h-3.5 text-[#FFD700]" />
          <span className="font-mono">{timeLeft}</span>
        </div>
        <div className="flex items-center gap-1">
          <span>Цена билета:</span>
          <span className="text-white font-bold">{giveaway.price} {giveaway.currency.toUpperCase()}</span>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={handleBuyClick}
        disabled={isBuying}
        className="w-full py-3 rounded-xl font-bold text-black text-sm relative overflow-hidden transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
        style={{
          background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
          boxShadow: '0 4px 15px rgba(255, 215, 0, 0.2)'
        }}
      >
        {isBuying ? 'Покупка...' : 'Купить билет'}
      </button>
    </motion.div>
  )
}
