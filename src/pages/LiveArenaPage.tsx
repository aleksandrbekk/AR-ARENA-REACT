import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { supabase } from '../lib/supabase'
import type { Giveaway } from '../types'

// Components
import { Tour1Drum } from '../components/live/Tour1Drum'
import { Tour2Squeeze } from '../components/live/Tour2Squeeze'
import { SemifinalTraffic } from '../components/live/SemifinalTraffic'
import { FinalBattle } from '../components/live/FinalBattle'
import { HowToPlayButton } from '../components/HowToPlayButton'

// Hooks
import { useArenaSounds } from '../hooks/useArenaSounds'

// Types for draw results (matches giveaway-engine.ts output)
interface DrawParticipant {
  ticket_number: number
  username: string
  avatar?: string
  telegram_id: string
}

interface DrawResults {
  seed: number
  tour1: {
    participants: DrawParticipant[]
  }
  tour2: {
    finalists: DrawParticipant[]
  }
  semifinal: {
    spins: { ticket: number; hits: number }[]
    eliminated: { ticket_number: number; username: string; place: number }[]
    finalists3: DrawParticipant[]
  }
  final: {
    turn_order: number[]
    turns: { turn: number; player: number; result: 'bull' | 'bear' }[]
  }
  winners: { place: number; ticket_number: number; username: string; telegram_id: string }[]
}

const STAGES = {
  LOBBY: 'LOBBY',
  TOUR1: 'TOUR1',
  TOUR2: 'TOUR2',
  SEMIFINAL: 'SEMIFINAL',
  FINAL: 'FINAL',
  RESULTS: 'RESULTS'
} as const

export function LiveArenaPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  // State
  const [giveaway, setGiveaway] = useState<Giveaway | null>(null)
  const [loading, setLoading] = useState(true)
  const [stage, setStage] = useState<keyof typeof STAGES>('LOBBY')
  const [drawResults, setDrawResults] = useState<DrawResults | null>(null)

  // Sounds
  const sounds = useArenaSounds()

  // Fetch logic
  useEffect(() => {
    if (!id) return
    fetchGiveaway()

    // Realtime subscription
    const channel = supabase
      .channel('live-arena')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'giveaways', filter: `id=eq.${id}` },
        (payload) => {
          console.log('Update received:', payload)
          setGiveaway(payload.new as Giveaway)
          if (payload.new.draw_results) {
            setDrawResults(payload.new.draw_results as any)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id])

  const fetchGiveaway = async () => {
    try {
      const { data, error } = await supabase
        .from('giveaways')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setGiveaway(data)

      // Check if results exist
      if (data.draw_results) {
        setDrawResults(data.draw_results as any)
      }
    } catch (err) {
      console.error('Error fetching giveaway:', err)
    } finally {
      setLoading(false)
    }
  }

  // Navigation Logic between stages
  const handleStageComplete = () => {
    switch (stage) {
      case 'LOBBY': setStage('TOUR1'); break
      case 'TOUR1': setStage('TOUR2'); break
      case 'TOUR2': setStage('SEMIFINAL'); break
      case 'SEMIFINAL': setStage('FINAL'); break
      case 'FINAL': handleFinish(); break
      default: break
    }
  }

  const handleFinish = () => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FFA500', '#FFFFFF']
    })
    setTimeout(() => {
      setStage('RESULTS')
      // Optional: navigate to results page or show overlay
      // navigate(/giveaways/${id}/results)
    }, 5000)
  }

  // --- RENDERING ---

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-[#FFD700] text-xl font-bold animate-pulse">Загрузка Арены...</div>
      </div>
    )
  }

  if (!giveaway) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center flex-col gap-4">
        <h1 className="text-white text-2xl font-bold">Розыгрыш не найден</h1>
        <button onClick={() => navigate('/giveaways')} className="text-[#FFD700]">Назад</button>
      </div>
    )
  }

  // SECURITY CHECK: If no draw results from DB, show waiting screen.
  // We NEVER generate results on client anymore.
  if (!drawResults) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-4 text-center">
        <div className="w-24 h-24 rounded-full bg-zinc-900 border border-[#FFD700]/20 flex items-center justify-center mb-6 animate-pulse">
          <span className="text-4xl">⏳</span>
        </div>
        <h1 className="text-2xl font-black text-white mb-2">ОЖИДАНИЕ РЕЗУЛЬТАТОВ</h1>
        <p className="text-white/40 max-w-md mx-auto">
          Организатор еще не запустил розыгрыш. Как только результаты будут сгенерированы, вы увидите их здесь.
        </p>
      </div>
    )
  }

  // CHECK FOR OLD FORMAT: If tour1.participants doesn't exist or first element is a number
  const isOldFormat = !drawResults.tour1?.participants ||
    (drawResults.tour1.participants.length > 0 && typeof drawResults.tour1.participants[0] === 'number') ||
    // Also check for old 'winners' field
    (drawResults.tour1 as any)?.winners;

  if (isOldFormat) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-4 text-center">
        <div className="w-24 h-24 rounded-full bg-zinc-900 border border-red-500/30 flex items-center justify-center mb-6">
          <span className="text-4xl">⚠️</span>
        </div>
        <h1 className="text-2xl font-black text-white mb-2">УСТАРЕВШИЙ ФОРМАТ</h1>
        <p className="text-white/40 max-w-md mx-auto mb-4">
          Этот розыгрыш был проведён в старом формате. Для просмотра трансляции требуется переигровка.
        </p>
        <button
          onClick={() => navigate(`/giveaway/${id}/results`)}
          className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-white transition-all"
        >
          Смотреть результаты
        </button>
      </div>
    )
  }

  // Data helpers - memoized transforms to prevent re-renders
  const tour1Winners = useMemo(() =>
    (drawResults.tour1.participants || []).map(p => ({
      ticket: p.ticket_number,
      user: p.username,
      avatar: p.avatar || ''
    })), [drawResults.tour1.participants]
  );

  const tour2Finalists = useMemo(() =>
    (drawResults.tour2.finalists || []).map(p => ({
      ticket: p.ticket_number,
      user: p.username,
      avatar: p.avatar || ''
    })), [drawResults.tour2.finalists]
  );

  // Tour2 data - memoized with full Ticket structure
  const tour2Candidates = useMemo(() =>
    tour1Winners.map(w => ({
      ticket: w.ticket,
      user: w.user,
      player: { id: '0', name: w.user, avatar: w.avatar || '' },
      ticket_number: w.ticket,
      user_id: '0'
    })), [tour1Winners]
  );

  const tour2FinalistsData = useMemo(() =>
    tour2Finalists.map(w => ({
      ticket: w.ticket,
      user: w.user,
      player: { id: '0', name: w.user, avatar: w.avatar || '' },
      ticket_number: w.ticket,
      user_id: '0'
    })), [tour2Finalists]
  );

  const semifinalCandidates = useMemo(() =>
    (drawResults.tour2.finalists || []).map(p => ({
      ticket: p.ticket_number,
      ticket_number: p.ticket_number,
      user: p.username,
      user_id: p.telegram_id,
      player: { id: p.telegram_id, name: p.username, avatar: p.avatar || '' },
      avatar: p.avatar || ''
    })), [drawResults.tour2.finalists]
  );

  // Semifinal data - memoized
  const semifinalSpins = useMemo(() =>
    drawResults.semifinal.spins || [], [drawResults.semifinal.spins]
  );

  const semifinalEliminated = useMemo(() =>
    (drawResults.semifinal.eliminated || []).map(p => ({
      ticket_number: p.ticket_number,
      place: p.place
    })), [drawResults.semifinal.eliminated]
  );

  const finalCandidates = useMemo(() =>
    (drawResults.semifinal.finalists3 || []).map(p => ({
      ticket: p.ticket_number,
      ticket_number: p.ticket_number,
      user: p.username,
      user_id: p.telegram_id,
      player: { id: p.telegram_id, name: p.username, avatar: p.avatar || '' }
    })), [drawResults.semifinal.finalists3]
  );

  const finalWinners = useMemo(() =>
    (drawResults.winners || []).map(w => ({
      place: w.place,
      ticket: w.ticket_number,
      username: w.username,
      telegram_id: w.telegram_id
    })), [drawResults.winners]
  );

  // Memoized final turns
  const finalTurns = useMemo(() =>
    drawResults.final.turns || [], [drawResults.final.turns]
  );

  // Sound callbacks for Tour1
  const handleTour1Tick = useCallback(() => sounds.playClick(), [sounds]);
  const handleTour1Winner = useCallback(() => sounds.playImpact(), [sounds]);
  const handleTour1AllFound = useCallback(() => sounds.playSuccess(), [sounds]);

  // Sound callbacks for Tour2
  const handleTour2Green = useCallback(() => sounds.playHit1(), [sounds]);
  const handleTour2Red = useCallback(() => sounds.playFailure(), [sounds]);

  // Sound callbacks for Semifinal
  const handleSemifinalHit1 = useCallback(() => sounds.playHit1(), [sounds]);
  const handleSemifinalHit2 = useCallback(() => sounds.playHit2(), [sounds]);
  const handleSemifinalEliminated = useCallback(() => sounds.playFailure(), [sounds]);

  // Sound callbacks for Final
  const handleFinalWheelSpin = useCallback(() => sounds.playRouletteTicks(20), [sounds]);
  const handleFinalBull = useCallback(() => sounds.playSuccess(), [sounds]);
  const handleFinalBear = useCallback(() => sounds.playFailure(), [sounds]);
  const handleFinalWin = useCallback(() => sounds.playWin(), [sounds]);

  // Start arena with sound init
  const handleStartArena = useCallback(() => {
    sounds.initAudio()
    handleStageComplete()
  }, [sounds, handleStageComplete])

  return (
    <div className="min-h-screen bg-[#0a0a0a] overflow-hidden relative">

      {/* BACKGROUND ELEMENTS */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#FFD700]/5 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#FFD700]/5 blur-[100px] rounded-full mix-blend-screen" />
      </div>

      {/* HEADER */}
      <div className="absolute top-0 left-0 right-0 p-6 z-50 flex justify-between items-start">
        <button
          onClick={() => navigate(`/giveaways/${id}`)}
          className="flex items-center gap-2 px-4 py-2 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-black/60 transition-all font-medium text-sm"
        >
          <span>←</span>
          <span>Выход</span>
        </button>

        <div className="flex flex-col items-end gap-2">
          {/* Fixed HowToPlayButton prop: removed 'title' */}
          <HowToPlayButton />
          <div className="px-3 py-1 bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-lg">
            <span className="text-xs font-bold text-[#FFD700] uppercase tracking-wider animate-pulse">
              LIVE • {stage}
            </span>
          </div>
        </div>
      </div>

      {/* STAGE CONTENT */}
      <AnimatePresence mode="wait">

        {stage === 'LOBBY' && (
          <motion.div
            key="lobby"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="h-screen flex flex-col items-center justify-center p-4 relative z-10"
          >
            <div className="relative mb-12">
              <div className="absolute inset-0 bg-[#FFD700]/20 blur-[50px] animate-pulse" />
              <img src="/logo.png" alt="AR Arena" className="w-32 h-32 relative z-10 drop-shadow-[0_0_50px_rgba(255,215,0,0.5)]" />
            </div>

            <h1 className="text-4xl md:text-6xl font-black text-center mb-6 tracking-tight">
              <span className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
                ARENA
              </span>
              <span className="block text-[#FFD700] drop-shadow-[0_0_30px_rgba(255,215,0,0.3)]">
                LIVE
              </span>
            </h1>

            <div className="max-w-md text-center space-y-2 mb-12">
              <p className="text-white/60 text-lg">Приготовьтесь к шоу!</p>
              <p className="text-white/40 text-sm">3 этапа • 20 участников • 3 победителя</p>
            </div>

            <motion.button
              onClick={handleStartArena}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-12 py-4 bg-gradient-to-r from-[#FFD700] to-[#FFA500] rounded-2xl font-black text-black text-xl tracking-wider shadow-[0_0_40px_rgba(255,215,0,0.4)] hover:shadow-[0_0_60px_rgba(255,215,0,0.6)] transition-all"
            >
              НАЧАТЬ
            </motion.button>
          </motion.div>
        )}

        {stage === 'TOUR1' && (
          <motion.div
            key="tour1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen bg-[#0a0a0a] pt-[100px] pb-8 relative z-10"
          >
            <div className="text-center mb-6">
              <h1 className="text-2xl font-black text-[#FFD700]">ОТБОРОЧНЫЙ ТУР</h1>
              <p className="text-white/50 text-sm mt-1">Выбираем 20 участников</p>
            </div>
            <Tour1Drum
              candidates={tour1Winners}
              winners={tour1Winners}
              onComplete={handleStageComplete}
              onTick={handleTour1Tick}
              onWinnerFound={handleTour1Winner}
              onAllFound={handleTour1AllFound}
            />
          </motion.div>
        )}

        {stage === 'TOUR2' && (
          <Tour2Squeeze
            key="tour2"
            candidates={tour2Candidates}
            finalists={tour2FinalistsData}
            onComplete={handleStageComplete}
            onRevealGreen={handleTour2Green}
            onRevealRed={handleTour2Red}
          />
        )}

        {stage === 'SEMIFINAL' && (
          <SemifinalTraffic
            key="semifinal"
            candidates={semifinalCandidates}
            spins={semifinalSpins}
            eliminated={semifinalEliminated}
            onComplete={handleStageComplete}
            onHit1={handleSemifinalHit1}
            onHit2={handleSemifinalHit2}
            onEliminated={handleSemifinalEliminated}
          />
        )}

        {stage === 'FINAL' && (
          <FinalBattle
            key="final"
            candidates={finalCandidates}
            turns={finalTurns}
            winners={finalWinners}
            onComplete={handleStageComplete}
            onWheelSpin={handleFinalWheelSpin}
            onBull={handleFinalBull}
            onBear={handleFinalBear}
            onWin={handleFinalWin}
          />
        )}

        {stage === 'RESULTS' && (
          <div className="h-screen flex items-center justify-center text-white">
            <div className="text-center">
              <h2 className="text-4xl font-black text-[#FFD700] mb-4">ПОЗДРАВЛЯЕМ ПОБЕДИТЕЛЕЙ!</h2>
              <button
                onClick={() => navigate(`/giveaways/${id}/results`)}
                className="mt-8 px-8 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-all"
              >
                Таблица результатов
              </button>
            </div>
          </div>
        )}

      </AnimatePresence>
    </div>
  )
}
