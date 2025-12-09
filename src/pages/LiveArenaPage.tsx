import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArenaCard } from '../components/live/ArenaCard'
import { ArenaBattle } from '../components/live/ArenaBattle'
import { ArenaRoulette } from '../components/live/ArenaRoulette'
import { supabase } from '../lib/supabase'
import type { Giveaway } from '../types'

type Stage = 'loading' | 'countdown' | 'cards' | 'roulette' | 'battle' | 'result'

interface Participant {
  id: number
  username: string
  avatar?: string
}

interface DrawResult {
  winner_id: number
  winner_username: string
  bull_wins: boolean
  participants: Participant[]
}

export function LiveArenaPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [giveaway, setGiveaway] = useState<Giveaway | null>(null)
  const [drawResult, setDrawResult] = useState<DrawResult | null>(null)
  const [stage, setStage] = useState<Stage>('loading')
  const [countdown, setCountdown] = useState(3)

  // Fetch giveaway data
  useEffect(() => {
    const fetchGiveaway = async () => {
      if (!id) return

      const { data, error } = await supabase
        .from('giveaways')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        console.error('Error fetching giveaway:', error)
        navigate('/giveaways')
        return
      }

      setGiveaway(data)

      // Check if giveaway has draw_results
      if (data.draw_results) {
        setDrawResult(data.draw_results)

        // If status is 'active', show countdown
        if (data.status === 'active') {
          setStage('countdown')
        } else if (data.status === 'completed') {
          // Show "watch broadcast" button
          setStage('loading')
        }
      } else {
        // No draw results yet
        navigate(`/giveaway/${id}`)
      }
    }

    fetchGiveaway()
  }, [id, navigate])

  // Countdown timer
  useEffect(() => {
    if (stage === 'countdown' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (stage === 'countdown' && countdown === 0) {
      // Start animation sequence
      setStage('cards')
    }
  }, [stage, countdown])

  // Stage progression
  useEffect(() => {
    if (stage === 'cards') {
      // Show cards for 5 seconds
      const timer = setTimeout(() => {
        setStage('roulette')
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [stage])

  const handleRouletteComplete = () => {
    setStage('battle')
  }

  const handleBattleComplete = () => {
    setStage('result')
  }

  const handleStartBroadcast = () => {
    setCountdown(3)
    setStage('countdown')
  }

  if (stage === 'loading') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-16 flex items-center justify-center">
        {giveaway?.status === 'completed' && drawResult ? (
          <div className="text-center px-6">
            <h1 className="text-3xl font-bold text-white mb-4 tracking-wide">
              {giveaway.title}
            </h1>
            <p className="text-zinc-400 mb-8">
              Розыгрыш завершен. Смотрите результаты!
            </p>
            <button
              onClick={handleStartBroadcast}
              className="px-8 py-4 bg-gradient-to-b from-yellow-500 to-orange-500 text-black font-bold rounded-xl text-lg tracking-wide shadow-lg"
            >
              СМОТРЕТЬ ТРАНСЛЯЦИЮ
            </button>
          </div>
        ) : (
          <div className="text-white text-xl">Загрузка...</div>
        )}
      </div>
    )
  }

  if (stage === 'countdown') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={countdown}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            className="text-9xl font-bold bg-gradient-to-b from-yellow-500 to-orange-500 bg-clip-text text-transparent"
          >
            {countdown}
          </motion.div>
        </AnimatePresence>
      </div>
    )
  }

  if (!drawResult) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-16 flex items-center justify-center">
        <div className="text-white text-xl">Нет данных о розыгрыше</div>
      </div>
    )
  }

  // Select 2 participants for card flip (winner + random)
  const participants = drawResult.participants || []
  const winner = participants.find(p => p.id === drawResult.winner_id)
  const otherParticipants = participants.filter(p => p.id !== drawResult.winner_id)
  const randomParticipant = otherParticipants[Math.floor(Math.random() * otherParticipants.length)]

  const cardsToShow = [winner, randomParticipant].filter(Boolean) as Participant[]

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-16 overflow-hidden">
      {/* Title */}
      <div className="text-center py-8 px-6">
        <motion.h1
          className="text-2xl md:text-4xl font-bold text-white tracking-wide"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {giveaway?.title}
        </motion.h1>
      </div>

      {/* Stage: Cards */}
      {stage === 'cards' && (
        <motion.div
          className="flex justify-center items-center gap-8 px-6 py-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {cardsToShow.map((participant, index) => (
            <ArenaCard
              key={participant.id}
              username={participant.username}
              avatar={participant.avatar}
              isFlipped={true}
              delay={index * 0.3}
            />
          ))}
        </motion.div>
      )}

      {/* Stage: Roulette */}
      {stage === 'roulette' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-12"
        >
          <ArenaRoulette
            participants={participants}
            winnerId={drawResult.winner_id}
            onComplete={handleRouletteComplete}
          />
        </motion.div>
      )}

      {/* Stage: Battle */}
      {stage === 'battle' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="h-[60vh]"
        >
          <ArenaBattle
            bullWins={drawResult.bull_wins}
            onComplete={handleBattleComplete}
          />
        </motion.div>
      )}

      {/* Stage: Result */}
      {stage === 'result' && winner && (
        <motion.div
          className="flex flex-col items-center justify-center px-6 py-12"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-yellow-500 tracking-widest mb-4">
              ПОБЕДИТЕЛЬ
            </h2>
            <p className="text-2xl text-white font-semibold">
              {winner.username}
            </p>
          </div>

          <ArenaCard
            username={winner.username}
            avatar={winner.avatar}
          />

          <button
            onClick={() => navigate('/giveaways')}
            className="mt-12 px-8 py-4 bg-gradient-to-b from-yellow-500 to-orange-500 text-black font-bold rounded-xl tracking-wide"
          >
            ВЕРНУТЬСЯ К РОЗЫГРЫШАМ
          </button>
        </motion.div>
      )}
    </div>
  )
}
