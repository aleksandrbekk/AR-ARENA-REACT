import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Timer, Ticket, Trophy, Gift, GraduationCap, Users } from 'lucide-react'
import type { GiveawayWithStats } from '../../types'

interface GiveawayCardProps {
  giveaway: GiveawayWithStats
}

export function GiveawayCard({ giveaway }: GiveawayCardProps) {
  const navigate = useNavigate()
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    if (!giveaway?.end_date) return

    const calculateTimeLeft = () => {
      const difference = +new Date(giveaway.end_date) - +new Date()
      
      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24))
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24)
        const minutes = Math.floor((difference / 1000 / 60) % 60)
        
        if (days > 0) return `${days}д ${hours}ч`
        return `${hours}ч ${minutes}м`
      }
      return 'Завершён'
    }

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 60000)

    setTimeLeft(calculateTimeLeft())
    return () => clearInterval(timer)
  }, [giveaway.end_date])

  const TypeIcon = giveaway.type === 'course' ? GraduationCap : Gift

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(`/giveaway/${giveaway.id}`)}
      className="relative overflow-hidden rounded-2xl bg-zinc-900/60 backdrop-blur-md border border-white/10 p-4 cursor-pointer active:bg-zinc-800/60 transition-colors"
    >
      {/* Glow Effect */}
      <div className="absolute -top-8 -right-8 w-24 h-24 bg-[#FFD700]/10 blur-[40px] rounded-full pointer-events-none" />

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFD700]/20 to-[#FFA500]/10 flex items-center justify-center">
          <TypeIcon className="w-5 h-5 text-[#FFD700]" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white truncate">{giveaway.title}</h3>
          {giveaway.subtitle && (
            <p className="text-xs text-white/40 truncate">{giveaway.subtitle}</p>
          )}
        </div>
      </div>

      {/* Jackpot */}
      <div className="flex items-center justify-between mb-3 py-2 px-3 bg-black/30 rounded-lg">
        <div className="flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-[#FFD700]" />
          <span className="text-xs text-white/50">Призовой фонд</span>
        </div>
        <div className="flex items-center gap-1">
          <img 
            src={giveaway.currency === 'ar' ? '/icons/arcoin.png' : '/icons/BUL.png'} 
            alt="" 
            className="w-4 h-4"
          />
          <span className="font-bold text-[#FFD700]">
            {(giveaway.jackpot_current_amount || 0).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-white/50">
            <Timer className="w-3.5 h-3.5" />
            <span>{timeLeft}</span>
          </div>
          <div className="flex items-center gap-1.5 text-white/50">
            <Users className="w-3.5 h-3.5" />
            <span>{giveaway.participants_count || 0}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Ticket className="w-3.5 h-3.5 text-[#FFD700]" />
          <span className="text-white/70">{giveaway.price} {giveaway.currency?.toUpperCase()}</span>
        </div>
      </div>
    </motion.div>
  )
}
