import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Timer, Trophy, Ticket, Users, Check, Gift, GraduationCap, Loader2 } from 'lucide-react'
import { Layout } from '../components/layout/Layout'
import { BuyTicketModal } from '../components/giveaways/BuyTicketModal'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import type { Giveaway } from '../types'

export function GiveawayDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { telegramUser } = useAuth()
  
  const [giveaway, setGiveaway] = useState<Giveaway | null>(null)
  const [loading, setLoading] = useState(true)
  const [myTickets, setMyTickets] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    if (id) {
      fetchGiveaway()
      if (telegramUser) fetchMyTickets()
    }
  }, [id, telegramUser])

  useEffect(() => {
    if (!giveaway?.end_date) return

    const calculateTimeLeft = () => {
      const difference = +new Date(giveaway.end_date) - +new Date()
      
      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24))
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24)
        const minutes = Math.floor((difference / 1000 / 60) % 60)
        const seconds = Math.floor((difference / 1000) % 60)
        
        return `${days}д ${hours}ч ${minutes}м ${seconds}с`
      }
      return 'Завершён'
    }

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    setTimeLeft(calculateTimeLeft())
    return () => clearInterval(timer)
  }, [giveaway?.end_date])

  const fetchGiveaway = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('giveaways')
      .select('*')
      .eq('id', id)
      .single()

    if (data) setGiveaway(data)
    setLoading(false)
  }

  const fetchMyTickets = async () => {
    if (!telegramUser) return
    
    const { data } = await supabase
      .from('giveaway_tickets')
      .select('ticket_count')
      .eq('giveaway_id', id)
      .eq('telegram_id', telegramUser.id.toString())
      .single()

    if (data) setMyTickets(data.ticket_count || 0)
  }

  const handleBuySuccess = () => {
    fetchGiveaway()
    fetchMyTickets()
  }

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#FFD700] animate-spin" />
        </div>
      </Layout>
    )
  }

  if (!giveaway) {
    return (
      <Layout>
        <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center">
          <p className="text-white/50 mb-4">Розыгрыш не найден</p>
          <button onClick={() => navigate('/giveaways')} className="text-[#FFD700]">
            Назад к розыгрышам
          </button>
        </div>
      </Layout>
    )
  }

  const TypeIcon = giveaway.type === 'course' ? GraduationCap : Gift
  const isActive = giveaway.status === 'active'

  return (
    <Layout hideNavbar>
      <div className="min-h-screen bg-[#0a0a0a] pb-24">
        {/* Hero */}
        <div className="relative pt-[60px] pb-6 px-4">
          {/* Back Button */}
          <button 
            onClick={() => navigate('/giveaways')}
            className="absolute top-[70px] left-4 z-10 p-2 bg-black/40 backdrop-blur-md rounded-full"
          >
            <ArrowLeft size={20} className="text-white" />
          </button>

          {/* Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#FFD700]/10 blur-[100px] rounded-full" />

          {/* Content */}
          <div className="relative pt-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#FFD700]/30 to-[#FFA500]/20 flex items-center justify-center">
              <TypeIcon className="w-8 h-8 text-[#FFD700]" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">{giveaway.title}</h1>
            {giveaway.subtitle && (
              <p className="text-sm text-white/50">{giveaway.subtitle}</p>
            )}
          </div>
        </div>

        {/* Timer & Jackpot */}
        <div className="px-4 mb-6">
          <div className="grid grid-cols-2 gap-3">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-zinc-900/60 border border-white/10 rounded-xl"
            >
              <div className="flex items-center gap-1.5 text-white/50 text-xs mb-1">
                <Timer size={14} />
                <span>До конца</span>
              </div>
              <p className="text-lg font-bold text-white font-mono">{timeLeft}</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-4 bg-zinc-900/60 border border-[#FFD700]/20 rounded-xl"
            >
              <div className="flex items-center gap-1.5 text-[#FFD700] text-xs mb-1">
                <Trophy size={14} />
                <span>Джекпот</span>
              </div>
              <div className="flex items-center gap-1.5">
                <img 
                  src={giveaway.currency === 'ar' ? '/icons/arcoin.png' : '/icons/BUL.png'} 
                  alt="" 
                  className="w-5 h-5"
                />
                <span className="text-lg font-bold text-[#FFD700]">
                  {(giveaway.jackpot_current_amount || 0).toLocaleString()}
                </span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Stats */}
        <div className="px-4 mb-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-black/30 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FFD700]/10 flex items-center justify-center">
                <Ticket size={18} className="text-[#FFD700]" />
              </div>
              <div>
                <p className="text-xs text-white/40">Мои билеты</p>
                <p className="text-lg font-bold text-white">{myTickets}</p>
              </div>
            </div>
            <div className="p-3 bg-black/30 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                <Users size={18} className="text-white/50" />
              </div>
              <div>
                <p className="text-xs text-white/40">Участников</p>
                <p className="text-lg font-bold text-white">—</p>
              </div>
            </div>
          </div>
        </div>

        {/* Prizes */}
        {giveaway.prizes && giveaway.prizes.length > 0 && (
          <div className="px-4 mb-6">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Trophy size={18} className="text-[#FFD700]" />
              Призы
            </h2>
            <div className="space-y-2">
              {giveaway.prizes.map((prize, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-center gap-3 p-3 bg-zinc-900/60 border border-white/5 rounded-xl"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                    idx === 0 ? 'bg-[#FFD700]/20 text-[#FFD700]' :
                    idx === 1 ? 'bg-gray-400/20 text-gray-400' :
                    idx === 2 ? 'bg-orange-600/20 text-orange-500' :
                    'bg-white/5 text-white/50'
                  }`}>
                    {prize.place}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">
                      {prize.amount > 0 ? `${prize.amount.toLocaleString()} ${giveaway.currency?.toUpperCase()}` : ''}
                      {prize.amount > 0 && prize.percentage > 0 ? ' + ' : ''}
                      {prize.percentage > 0 ? `${prize.percentage}% джекпота` : ''}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Requirements */}
        {giveaway.requirements && Object.keys(giveaway.requirements).length > 0 && (
          <div className="px-4 mb-6">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Check size={18} className="text-green-400" />
              Условия участия
            </h2>
            <div className="space-y-2">
              {giveaway.requirements.telegram_channel_id && (
                <div className="flex items-center gap-3 p-3 bg-zinc-900/60 border border-white/5 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check size={14} className="text-green-400" />
                  </div>
                  <span className="text-white/70 text-sm">
                    Подписка на канал {giveaway.requirements.telegram_channel_id}
                  </span>
                </div>
              )}
              {giveaway.requirements.min_friends && (
                <div className="flex items-center gap-3 p-3 bg-zinc-900/60 border border-white/5 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check size={14} className="text-green-400" />
                  </div>
                  <span className="text-white/70 text-sm">
                    Минимум {giveaway.requirements.min_friends} друзей
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sticky Footer */}
        {isActive && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent">
            <button
              onClick={() => setShowModal(true)}
              className="w-full py-4 rounded-xl font-bold text-black flex items-center justify-center gap-2 active:scale-95 transition-transform"
              style={{
                background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                boxShadow: '0 4px 20px rgba(255, 215, 0, 0.3)'
              }}
            >
              <Ticket size={20} />
              Купить билет — {giveaway.price} {giveaway.currency?.toUpperCase()}
            </button>
          </div>
        )}

        {/* Modal */}
        <BuyTicketModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          giveaway={giveaway}
          onSuccess={handleBuySuccess}
        />
      </div>
    </Layout>
  )
}
