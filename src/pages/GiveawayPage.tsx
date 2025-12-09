import { useEffect, useState } from 'react'
import { Layout } from '../components/layout/Layout'
import { GiveawayCard } from '../components/GiveawayCard'
import { useGiveaways } from '../hooks/useGiveaways'
import { Particles } from '../components/Particles'
import { motion } from 'framer-motion'

export function GiveawayPage() {
  const { giveaways, loading, error, getActiveGiveaways, buyTickets, getMyTickets } = useGiveaways()
  const [userTickets, setUserTickets] = useState<Record<number, number>>({})

  // Загружаем розыгрыши при монтировании
  useEffect(() => {
    getActiveGiveaways()
  }, [getActiveGiveaways])

  // Загружаем билеты пользователя для каждого розыгрыша
  useEffect(() => {
    const fetchTickets = async () => {
      const tickets: Record<number, number> = {}
      for (const giveaway of giveaways) {
        const count = await getMyTickets(giveaway.id)
        tickets[giveaway.id] = count
      }
      setUserTickets(tickets)
    }

    if (giveaways.length > 0) {
      fetchTickets()
    }
  }, [giveaways, getMyTickets])

  const handleBuy = async (giveawayId: number, count: number) => {
    await buyTickets(giveawayId, count)
    // Обновляем количество билетов после покупки
    const newCount = await getMyTickets(giveawayId)
    setUserTickets(prev => ({ ...prev, [giveawayId]: newCount }))
    // Можно также обновить список розыгрышей, чтобы обновить джекпот, если он меняется сразу
    getActiveGiveaways()
  }

  return (
    <Layout>
      <div className="min-h-screen bg-[#0a0a0a] pb-24 relative overflow-hidden">
        <Particles />
        
        {/* Header Spotlight */}
        <div 
          className="absolute top-0 left-0 right-0 h-[40vh] pointer-events-none z-0"
          style={{ background: 'radial-gradient(circle at 50% -20%, rgba(255,215,0,0.1) 0%, transparent 70%)' }}
        />

        <div className="relative z-10 px-4 pt-8">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-black text-white mb-6 text-center uppercase tracking-wider drop-shadow-lg"
          >
            Розыгрыши
          </motion.h1>

          {loading && (
            <div className="flex justify-center items-center h-40">
              <div className="text-[#FFD700] animate-pulse font-bold">Loading...</div>
            </div>
          )}

          {error && (
            <div className="text-red-500 text-center p-4 bg-red-500/10 rounded-xl border border-red-500/20">
              {error}
            </div>
          )}

          {!loading && !error && giveaways.length === 0 && (
            <div className="text-center text-white/40 py-10">
              Активных розыгрышей пока нет
            </div>
          )}

          <div className="grid grid-cols-1 gap-6">
            {giveaways.map(giveaway => (
              <GiveawayCard
                key={giveaway.id}
                giveaway={giveaway}
                onBuy={(count) => handleBuy(giveaway.id, count)}
                userTickets={userTickets[giveaway.id] || 0}
              />
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}
