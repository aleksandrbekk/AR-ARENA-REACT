import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Loader2, Play, SkipForward } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Giveaway, DrawResults, DrawParticipant, SemifinalSpin, FinalTurn } from '../types'

// Этапы розыгрыша
type Stage = 'loading' | 'intro' | 'tour1' | 'tour2' | 'semifinal' | 'final' | 'victory'

export function LiveArenaPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [giveaway, setGiveaway] = useState<Giveaway | null>(null)
  const [drawResults, setDrawResults] = useState<DrawResults | null>(null)
  const [loading, setLoading] = useState(true)
  const [stage, setStage] = useState<Stage>('loading')
  const [autoPlay, setAutoPlay] = useState(false)

  // Состояния для анимаций
  const [tour1Progress, setTour1Progress] = useState(0)
  const [tour2FlippedCards, setTour2FlippedCards] = useState<number[]>([])
  const [semifinalSpinIndex, setSemifinalSpinIndex] = useState(0)
  const [finalTurnIndex, setFinalTurnIndex] = useState(0)

  useEffect(() => {
    if (id) fetchGiveaway()
  }, [id])

  const fetchGiveaway = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('giveaways')
      .select('*')
      .eq('id', id)
      .single()

    if (data) {
      setGiveaway(data)
      if (data.draw_results?.success) {
        setDrawResults(data.draw_results as DrawResults)
        setStage('intro')
      }
    }
    setLoading(false)
  }

  // Автоматическое воспроизведение
  useEffect(() => {
    if (!autoPlay || !drawResults) return

    const interval = setInterval(() => {
      nextStep()
    }, 1500)

    return () => clearInterval(interval)
  }, [autoPlay, stage, tour1Progress, tour2FlippedCards, semifinalSpinIndex, finalTurnIndex, drawResults])

  const nextStep = useCallback(() => {
    if (!drawResults) return

    switch (stage) {
      case 'intro':
        setStage('tour1')
        break

      case 'tour1':
        if (tour1Progress < (drawResults.tour1?.participants?.length || 0)) {
          setTour1Progress(p => p + 1)
        } else {
          setStage('tour2')
        }
        break

      case 'tour2':
        const finalistCount = drawResults.tour2?.finalists?.length || 0
        if (tour2FlippedCards.length < finalistCount) {
          const nextIndex = drawResults.tour2?.selected_indices?.[tour2FlippedCards.length]
          if (nextIndex !== undefined) {
            setTour2FlippedCards(prev => [...prev, nextIndex])
          }
        } else {
          setStage('semifinal')
        }
        break

      case 'semifinal':
        const spinsCount = drawResults.semifinal?.spins?.length || 0
        if (semifinalSpinIndex < spinsCount) {
          setSemifinalSpinIndex(i => i + 1)
        } else {
          setStage('final')
        }
        break

      case 'final':
        const turnsCount = drawResults.final?.turns?.length || 0
        if (finalTurnIndex < turnsCount) {
          setFinalTurnIndex(i => i + 1)
        } else {
          setStage('victory')
          setAutoPlay(false)
        }
        break
    }
  }, [stage, drawResults, tour1Progress, tour2FlippedCards, semifinalSpinIndex, finalTurnIndex])

  const skipToEnd = () => {
    if (!drawResults) return
    setTour1Progress(drawResults.tour1?.participants?.length || 0)
    setTour2FlippedCards(drawResults.tour2?.selected_indices || [])
    setSemifinalSpinIndex(drawResults.semifinal?.spins?.length || 0)
    setFinalTurnIndex(drawResults.final?.turns?.length || 0)
    setStage('victory')
    setAutoPlay(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#FFD700] animate-spin" />
      </div>
    )
  }

  if (!giveaway || !drawResults) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4">
        <p className="text-white/50 mb-4 text-center">
          Результаты розыгрыша не найдены
        </p>
        <button
          onClick={() => navigate('/giveaways')}
          className="text-[#FFD700] font-medium"
        >
          К розыгрышам
        </button>
      </div>
    )
  }

  const giveawayTitle = giveaway.main_title || giveaway.title || giveaway.name || 'Розыгрыш'

  return (
    <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#FFD700]/10 blur-[150px] rounded-full" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-500/10 blur-[100px] rounded-full" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 pt-[60px] px-4 pb-4 bg-gradient-to-b from-black to-transparent">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(`/giveaway/${id}/results`)}
            className="p-2 bg-black/40 backdrop-blur-md rounded-full"
          >
            <ArrowLeft size={20} className="text-white" />
          </button>

          <div className="flex items-center gap-2">
            {stage !== 'victory' && stage !== 'intro' && (
              <>
                <button
                  onClick={() => setAutoPlay(!autoPlay)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    autoPlay
                      ? 'bg-[#FFD700] text-black'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {autoPlay ? 'Пауза' : 'Авто'}
                </button>
                <button
                  onClick={skipToEnd}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <SkipForward size={18} className="text-white" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="text-center mt-4">
          <p className="text-white/50 text-sm">LIVE</p>
          <h1 className="text-xl font-bold text-white">{giveawayTitle}</h1>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1 mt-4">
          {(['tour1', 'tour2', 'semifinal', 'final'] as const).map((s, i) => (
            <div
              key={s}
              className={`flex-1 h-1 rounded-full transition-colors ${
                stage === s
                  ? 'bg-[#FFD700]'
                  : ['tour1', 'tour2', 'semifinal', 'final'].indexOf(stage as typeof s) > i
                  ? 'bg-[#FFD700]/50'
                  : 'bg-white/10'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="pt-[200px] pb-24 px-4">
        <AnimatePresence mode="wait">
          {/* Intro */}
          {stage === 'intro' && (
            <IntroStage
              key="intro"
              totalParticipants={drawResults.total_participants}
              totalTickets={drawResults.total_tickets}
              onStart={() => {
                setStage('tour1')
                setAutoPlay(true)
              }}
            />
          )}

          {/* Tour 1: Drum */}
          {stage === 'tour1' && (
            <Tour1Stage
              key="tour1"
              participants={drawResults.tour1?.participants || []}
              progress={tour1Progress}
              onNext={nextStep}
            />
          )}

          {/* Tour 2: Cards */}
          {stage === 'tour2' && (
            <Tour2Stage
              key="tour2"
              allParticipants={drawResults.tour1?.participants || []}
              finalists={drawResults.tour2?.finalists || []}
              flippedIndices={tour2FlippedCards}
              onNext={nextStep}
            />
          )}

          {/* Semifinal: Traffic Light */}
          {stage === 'semifinal' && (
            <SemifinalStage
              key="semifinal"
              finalists={drawResults.tour2?.finalists || []}
              spins={drawResults.semifinal?.spins || []}
              eliminated={drawResults.semifinal?.eliminated || []}
              currentSpinIndex={semifinalSpinIndex}
              onNext={nextStep}
            />
          )}

          {/* Final: Battle of Traders */}
          {stage === 'final' && (
            <FinalStage
              key="final"
              finalists={drawResults.semifinal?.finalists3 || []}
              turns={drawResults.final?.turns || []}
              playerScores={drawResults.final?.player_scores || []}
              currentTurnIndex={finalTurnIndex}
              onNext={nextStep}
            />
          )}

          {/* Victory */}
          {stage === 'victory' && (
            <VictoryStage
              key="victory"
              winners={drawResults.winners || []}
              prizes={giveaway.prizes || []}
              onClose={() => navigate(`/giveaway/${id}/results`)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ==================== STAGE COMPONENTS ====================

function IntroStage({
  totalParticipants,
  totalTickets,
  onStart
}: {
  totalParticipants: number
  totalTickets: number
  onStart: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', bounce: 0.5, delay: 0.2 }}
        className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-[#FFD700]/30 to-[#FFA500]/20 flex items-center justify-center border border-[#FFD700]/20"
      >
        <Play size={48} className="text-[#FFD700] ml-1" />
      </motion.div>

      <h2 className="text-2xl font-bold text-white mb-2">Розыгрыш начинается!</h2>
      <p className="text-white/50 mb-8">4 этапа до определения победителей</p>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="p-4 bg-zinc-900/60 border border-white/10 rounded-xl">
          <p className="text-2xl font-bold text-[#FFD700]">{totalParticipants}</p>
          <p className="text-xs text-white/50">Участников</p>
        </div>
        <div className="p-4 bg-zinc-900/60 border border-white/10 rounded-xl">
          <p className="text-2xl font-bold text-white">{totalTickets}</p>
          <p className="text-xs text-white/50">Билетов</p>
        </div>
      </div>

      <button
        onClick={onStart}
        className="w-full py-4 rounded-xl font-bold text-black bg-gradient-to-b from-[#FFD700] to-[#FFA500]"
      >
        Начать розыгрыш
      </button>
    </motion.div>
  )
}

function Tour1Stage({
  participants,
  progress,
  onNext
}: {
  participants: DrawParticipant[]
  progress: number
  onNext: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-white mb-1">Tour 1: Барабан</h2>
        <p className="text-white/50 text-sm">Случайный отбор 20 участников</p>
        <p className="text-[#FFD700] text-sm mt-2">{progress} / {participants.length}</p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {participants.map((p, i) => (
          <motion.div
            key={p.ticket_number}
            initial={{ scale: 0, rotate: -180 }}
            animate={{
              scale: i < progress ? 1 : 0,
              rotate: i < progress ? 0 : -180
            }}
            transition={{ type: 'spring', bounce: 0.4, delay: i * 0.05 }}
            className="aspect-square bg-blue-500/20 border border-blue-500/30 rounded-xl flex flex-col items-center justify-center p-2"
          >
            <span className="text-lg font-bold text-blue-400">#{p.ticket_number}</span>
            <span className="text-[10px] text-white/50 truncate w-full text-center">{p.username}</span>
          </motion.div>
        ))}
      </div>

      {progress >= participants.length && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onNext}
          className="w-full mt-6 py-3 rounded-xl font-medium text-white bg-white/10 border border-white/20"
        >
          Далее: Tour 2
        </motion.button>
      )}
    </motion.div>
  )
}

function Tour2Stage({
  allParticipants,
  finalists,
  flippedIndices,
  onNext
}: {
  allParticipants: DrawParticipant[]
  finalists: DrawParticipant[]
  flippedIndices: number[]
  onNext: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-white mb-1">Tour 2: Карты</h2>
        <p className="text-white/50 text-sm">Выбор 5 финалистов</p>
        <p className="text-purple-400 text-sm mt-2">{flippedIndices.length} / 5</p>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {allParticipants.map((p, i) => {
          const isFlipped = flippedIndices.includes(i)
          const isFinalist = finalists.some(f => f.ticket_number === p.ticket_number)

          return (
            <motion.div
              key={i}
              className="aspect-[3/4] relative"
              style={{ perspective: '1000px' }}
            >
              <motion.div
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.5 }}
                className="w-full h-full relative"
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Back */}
                <div
                  className={`absolute inset-0 rounded-lg bg-gradient-to-br from-purple-900 to-purple-800 border ${
                    isFlipped ? 'border-transparent' : 'border-purple-500/30'
                  } flex items-center justify-center`}
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <span className="text-2xl">?</span>
                </div>
                {/* Front */}
                <div
                  className={`absolute inset-0 rounded-lg ${
                    isFinalist
                      ? 'bg-gradient-to-br from-[#FFD700]/30 to-[#FFA500]/20 border-[#FFD700]/50'
                      : 'bg-zinc-800 border-white/10'
                  } border flex flex-col items-center justify-center p-1`}
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  <span className={`text-sm font-bold ${isFinalist ? 'text-[#FFD700]' : 'text-white/50'}`}>
                    #{p.ticket_number}
                  </span>
                </div>
              </motion.div>
            </motion.div>
          )
        })}
      </div>

      {/* Finalists */}
      {flippedIndices.length > 0 && (
        <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
          <p className="text-sm text-purple-400 mb-2">Финалисты:</p>
          <div className="flex flex-wrap gap-2">
            {finalists.slice(0, flippedIndices.length).map((f, i) => (
              <motion.span
                key={f.ticket_number}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="px-3 py-1 bg-[#FFD700]/20 text-[#FFD700] rounded-lg text-sm font-medium"
              >
                #{f.ticket_number} {f.username}
              </motion.span>
            ))}
          </div>
        </div>
      )}

      {flippedIndices.length >= 5 && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onNext}
          className="w-full mt-6 py-3 rounded-xl font-medium text-white bg-white/10 border border-white/20"
        >
          Далее: Semifinal
        </motion.button>
      )}
    </motion.div>
  )
}

function SemifinalStage({
  finalists,
  spins,
  eliminated,
  currentSpinIndex,
  onNext
}: {
  finalists: DrawParticipant[]
  spins: SemifinalSpin[]
  eliminated: { ticket_number: number; place: number }[]
  currentSpinIndex: number
  onNext: () => void
}) {
  // Подсчёт хитов для каждого финалиста
  const hitCounts: Record<number, number> = {}
  finalists.forEach(f => hitCounts[f.ticket_number] = 0)

  const currentSpins = spins.slice(0, currentSpinIndex)
  currentSpins.forEach(s => {
    hitCounts[s.ticket] = s.hits
  })

  const eliminatedTickets = eliminated.map(e => e.ticket_number)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-white mb-1">Semifinal: Traffic Light</h2>
        <p className="text-white/50 text-sm">3 попадания = выбывание</p>
        <p className="text-red-400 text-sm mt-2">Спин {currentSpinIndex} / {spins.length}</p>
      </div>

      <div className="space-y-3">
        {finalists.map(f => {
          const hits = hitCounts[f.ticket_number] || 0
          const isEliminated = eliminatedTickets.includes(f.ticket_number)
          const eliminatedPlace = eliminated.find(e => e.ticket_number === f.ticket_number)?.place

          return (
            <motion.div
              key={f.ticket_number}
              layout
              className={`p-4 rounded-xl border ${
                isEliminated
                  ? 'bg-red-500/10 border-red-500/30'
                  : 'bg-zinc-900/60 border-white/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`text-lg font-bold ${isEliminated ? 'text-red-400' : 'text-white'}`}>
                    #{f.ticket_number}
                  </span>
                  <span className={`text-sm ${isEliminated ? 'text-red-400/70' : 'text-white/50'}`}>
                    {f.username}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Hit indicators */}
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        animate={{
                          backgroundColor: i < hits ? '#ef4444' : 'rgba(255,255,255,0.1)'
                        }}
                        className="w-4 h-4 rounded-full"
                      />
                    ))}
                  </div>

                  {isEliminated && eliminatedPlace && (
                    <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-md">
                      {eliminatedPlace} место
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {currentSpinIndex >= spins.length && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onNext}
          className="w-full mt-6 py-3 rounded-xl font-medium text-white bg-white/10 border border-white/20"
        >
          Далее: Final
        </motion.button>
      )}
    </motion.div>
  )
}

function FinalStage({
  finalists,
  turns,
  playerScores,
  currentTurnIndex,
  onNext
}: {
  finalists: DrawParticipant[]
  turns: FinalTurn[]
  playerScores: { bulls: number; bears: number; place: number | null }[]
  currentTurnIndex: number
  onNext: () => void
}) {
  // Текущее состояние игроков
  const currentScores = finalists.map((_, i) => {
    const relevantTurns = turns.slice(0, currentTurnIndex).filter(t => t.player === i)
    const bulls = relevantTurns.filter(t => t.result === 'bull').length
    const bears = relevantTurns.filter(t => t.result === 'bear').length
    const place = playerScores[i]?.place
    const hasWon = currentTurnIndex >= turns.length ? place !== null : bulls >= 3
    return { bulls, bears, place, hasWon }
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-[#FFD700] mb-1">Final: Battle of Traders</h2>
        <p className="text-white/50 text-sm">3 быка = победа!</p>
        <p className="text-[#FFD700] text-sm mt-2">Ход {currentTurnIndex} / {turns.length}</p>
      </div>

      <div className="space-y-3">
        {finalists.map((f, i) => {
          const score = currentScores[i]
          const place = score.hasWon ? playerScores[i]?.place : null

          return (
            <motion.div
              key={f.ticket_number}
              layout
              className={`p-4 rounded-xl border ${
                place === 1
                  ? 'bg-[#FFD700]/10 border-[#FFD700]/30'
                  : place
                  ? 'bg-zinc-800/60 border-white/20'
                  : 'bg-zinc-900/60 border-white/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`text-lg font-bold ${place === 1 ? 'text-[#FFD700]' : 'text-white'}`}>
                    #{f.ticket_number}
                  </span>
                  <span className="text-sm text-white/50">{f.username}</span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Bull/Bear counts */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-lg">🐂</span>
                      <span className="text-green-400 font-bold">{score.bulls}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-lg">🐻</span>
                      <span className="text-red-400 font-bold">{score.bears}</span>
                    </div>
                  </div>

                  {place && (
                    <span className={`px-2 py-0.5 text-sm font-bold rounded-md ${
                      place === 1
                        ? 'bg-[#FFD700]/20 text-[#FFD700]'
                        : place === 2
                        ? 'bg-gray-400/20 text-gray-300'
                        : 'bg-orange-600/20 text-orange-400'
                    }`}>
                      #{place}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Last turn indicator */}
      {currentTurnIndex > 0 && currentTurnIndex <= turns.length && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 bg-white/5 rounded-xl text-center"
        >
          <span className="text-white/50 text-sm">
            {turns[currentTurnIndex - 1]?.playerName}:{' '}
            <span className={turns[currentTurnIndex - 1]?.result === 'bull' ? 'text-green-400' : 'text-red-400'}>
              {turns[currentTurnIndex - 1]?.result === 'bull' ? '🐂 Bull!' : '🐻 Bear'}
            </span>
          </span>
        </motion.div>
      )}

      {currentTurnIndex >= turns.length && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onNext}
          className="w-full mt-6 py-3 rounded-xl font-medium text-black bg-gradient-to-b from-[#FFD700] to-[#FFA500]"
        >
          Результаты!
        </motion.button>
      )}
    </motion.div>
  )
}

function VictoryStage({
  winners,
  prizes,
  onClose
}: {
  winners: { place: number; username: string; ticket_number: number; bulls?: number }[]
  prizes: { place: number; amount?: number; percentage?: number }[]
  onClose: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="text-center"
    >
      {/* Confetti simulation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{
              x: Math.random() * 400 - 200,
              y: -20,
              rotate: 0,
              opacity: 1
            }}
            animate={{
              y: 600,
              rotate: Math.random() * 720 - 360,
              opacity: 0
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              delay: Math.random() * 0.5,
              ease: 'easeOut'
            }}
            className={`absolute w-3 h-3 rounded-sm ${
              ['bg-[#FFD700]', 'bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-pink-500'][i % 5]
            }`}
            style={{ left: `${Math.random() * 100}%` }}
          />
        ))}
      </div>

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', bounce: 0.5, delay: 0.2 }}
        className="text-6xl mb-4"
      >
        🏆
      </motion.div>

      <h2 className="text-2xl font-bold text-[#FFD700] mb-6">Победители!</h2>

      <div className="space-y-3 mb-8">
        {winners.map((w, i) => {
          const prize = prizes.find(p => p.place === w.place)

          return (
            <motion.div
              key={w.place}
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.15 }}
              className={`p-4 rounded-xl ${
                w.place === 1
                  ? 'bg-gradient-to-r from-[#FFD700]/20 to-[#FFA500]/10 border border-[#FFD700]/30'
                  : w.place === 2
                  ? 'bg-gradient-to-r from-gray-400/10 to-gray-500/5 border border-gray-400/20'
                  : w.place === 3
                  ? 'bg-gradient-to-r from-orange-700/10 to-orange-800/5 border border-orange-600/20'
                  : 'bg-zinc-900/60 border border-white/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`text-2xl font-bold ${
                    w.place === 1 ? 'text-[#FFD700]' : w.place === 2 ? 'text-gray-300' : 'text-orange-400'
                  }`}>
                    #{w.place}
                  </span>
                  <div className="text-left">
                    <p className={`font-bold ${w.place === 1 ? 'text-[#FFD700]' : 'text-white'}`}>
                      {w.username}
                    </p>
                    <p className="text-xs text-white/40">Билет #{w.ticket_number}</p>
                  </div>
                </div>
                {prize && (
                  <div className="text-right">
                    {(prize.amount ?? 0) > 0 && (
                      <p className="font-bold text-[#FFD700]">{prize.amount} AR</p>
                    )}
                    {(prize.percentage ?? 0) > 0 && (
                      <p className="text-xs text-white/40">{prize.percentage}% джекпота</p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      <button
        onClick={onClose}
        className="w-full py-4 rounded-xl font-bold text-black bg-gradient-to-b from-[#FFD700] to-[#FFA500]"
      >
        Закрыть
      </button>
    </motion.div>
  )
}
