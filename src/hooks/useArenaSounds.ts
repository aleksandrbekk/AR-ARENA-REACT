import { useRef, useCallback } from 'react'

/**
 * useArenaSounds - хук для синтеза игровых звуков через Web Audio API
 * Не требует внешних аудио-файлов, генерирует звуки "на лету"
 */
export function useArenaSounds() {
  const audioContextRef = useRef<AudioContext | null>(null)
  const isInitializedRef = useRef(false)
  const scheduledTimeoutsRef = useRef<Set<number>>(new Set())

  // Инициализация AudioContext (обход Autoplay Policy)
  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }

    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume()
    }

    isInitializedRef.current = true
    return audioContextRef.current
  }, [])

  // Получить или создать контекст
  const getContext = useCallback(() => {
    if (!audioContextRef.current) {
      return initAudio()
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume()
    }
    return audioContextRef.current
  }, [initAudio])

  /**
   * playClick - Короткий щелчок (Tick) для рулетки
   * High pitch, short burst
   */
  const playClick = useCallback(() => {
    const ctx = getContext()
    if (!ctx) return

    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.type = 'square'
    oscillator.frequency.setValueAtTime(1200, ctx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.03)

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05)

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.05)
  }, [getContext])

  /**
   * playImpact - Глухой удар (Thud) для остановки барабана
   * Low frequency sine/triangle with decay
   */
  const playImpact = useCallback(() => {
    const ctx = getContext()
    if (!ctx) return

    // Основной низкий удар
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(150, ctx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.15)

    gainNode.gain.setValueAtTime(0.5, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.2)

    // Добавляем шум для "тяжести"
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate)
    const noiseData = noiseBuffer.getChannelData(0)
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * 0.3
    }

    const noiseSource = ctx.createBufferSource()
    const noiseGain = ctx.createGain()
    const noiseFilter = ctx.createBiquadFilter()

    noiseSource.buffer = noiseBuffer
    noiseFilter.type = 'lowpass'
    noiseFilter.frequency.setValueAtTime(500, ctx.currentTime)
    noiseGain.gain.setValueAtTime(0.2, ctx.currentTime)
    noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)

    noiseSource.connect(noiseFilter)
    noiseFilter.connect(noiseGain)
    noiseGain.connect(ctx.destination)

    noiseSource.start(ctx.currentTime)
    noiseSource.stop(ctx.currentTime + 0.1)
  }, [getContext])

  /**
   * playSuccess - Приятный мажорный звук (Green light)
   * Ascending arpeggio C-E-G-C
   */
  const playSuccess = useCallback(() => {
    const ctx = getContext()
    if (!ctx) return

    const notes = [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6
    const noteDuration = 0.08
    const noteGap = 0.06

    notes.forEach((freq, index) => {
      const startTime = ctx.currentTime + index * (noteDuration + noteGap)

      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(freq, startTime)

      gainNode.gain.setValueAtTime(0, startTime)
      gainNode.gain.linearRampToValueAtTime(0.25, startTime + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + noteDuration + 0.1)

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.start(startTime)
      oscillator.stop(startTime + noteDuration + 0.15)
    })
  }, [getContext])

  /**
   * playFailure - Диссонанс/Бззз (Red light/Elimination)
   * Sawtooth low pitch descending
   */
  const playFailure = useCallback(() => {
    const ctx = getContext()
    if (!ctx) return

    // Основной диссонанс
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gainNode = ctx.createGain()

    osc1.type = 'sawtooth'
    osc2.type = 'square'

    // Диссонирующие частоты (минорная секунда)
    osc1.frequency.setValueAtTime(200, ctx.currentTime)
    osc1.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.3)

    osc2.frequency.setValueAtTime(212, ctx.currentTime) // Slightly detuned
    osc2.frequency.exponentialRampToValueAtTime(85, ctx.currentTime + 0.3)

    gainNode.gain.setValueAtTime(0.25, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35)

    osc1.connect(gainNode)
    osc2.connect(gainNode)
    gainNode.connect(ctx.destination)

    osc1.start(ctx.currentTime)
    osc2.start(ctx.currentTime)
    osc1.stop(ctx.currentTime + 0.35)
    osc2.stop(ctx.currentTime + 0.35)

    // Добавляем "бзззз" шум
    const buzzer = ctx.createOscillator()
    const buzzGain = ctx.createGain()

    buzzer.type = 'sawtooth'
    buzzer.frequency.setValueAtTime(55, ctx.currentTime)

    buzzGain.gain.setValueAtTime(0.15, ctx.currentTime)
    buzzGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25)

    buzzer.connect(buzzGain)
    buzzGain.connect(ctx.destination)

    buzzer.start(ctx.currentTime)
    buzzer.stop(ctx.currentTime + 0.25)
  }, [getContext])

  /**
   * playWin - Эпичный аккорд (Победа в финале)
   * Мажорный аккорд с арпеджио + финальный "блеск"
   */
  const playWin = useCallback(() => {
    const ctx = getContext()
    if (!ctx) return

    // Эпичный мажорный аккорд C-E-G (несколько октав)
    const chordFreqs = [
      261.63, 329.63, 392.00,  // C4, E4, G4
      523.25, 659.25, 783.99,  // C5, E5, G5
      1046.50                   // C6
    ]

    // Сначала арпеджио вверх
    chordFreqs.forEach((freq, index) => {
      const startTime = ctx.currentTime + index * 0.05

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, startTime)

      gain.gain.setValueAtTime(0, startTime)
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02)
      gain.gain.setValueAtTime(0.15, startTime + 0.3)
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 1.2)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(startTime)
      osc.stop(startTime + 1.3)
    })

    // Финальный "блеск" (shimmer)
    const shimmerStart = ctx.currentTime + 0.4
    const shimmerOsc = ctx.createOscillator()
    const shimmerGain = ctx.createGain()
    const shimmerFilter = ctx.createBiquadFilter()

    shimmerOsc.type = 'sine'
    shimmerOsc.frequency.setValueAtTime(2093, shimmerStart) // C7
    shimmerOsc.frequency.setValueAtTime(2349, shimmerStart + 0.1) // D7
    shimmerOsc.frequency.setValueAtTime(2637, shimmerStart + 0.2) // E7

    shimmerFilter.type = 'highpass'
    shimmerFilter.frequency.setValueAtTime(1500, shimmerStart)

    shimmerGain.gain.setValueAtTime(0.08, shimmerStart)
    shimmerGain.gain.exponentialRampToValueAtTime(0.01, shimmerStart + 0.5)

    shimmerOsc.connect(shimmerFilter)
    shimmerFilter.connect(shimmerGain)
    shimmerGain.connect(ctx.destination)

    shimmerOsc.start(shimmerStart)
    shimmerOsc.stop(shimmerStart + 0.5)

    // Добавляем реверб-эффект через короткие эхо
    const reverbDelays = [0.1, 0.2, 0.3]
    reverbDelays.forEach((delay, i) => {
      const echoOsc = ctx.createOscillator()
      const echoGain = ctx.createGain()

      echoOsc.type = 'sine'
      echoOsc.frequency.setValueAtTime(1046.50, ctx.currentTime + delay) // C6

      echoGain.gain.setValueAtTime(0.05 / (i + 1), ctx.currentTime + delay)
      echoGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.3)

      echoOsc.connect(echoGain)
      echoGain.connect(ctx.destination)

      echoOsc.start(ctx.currentTime + delay)
      echoOsc.stop(ctx.currentTime + delay + 0.35)
    })
  }, [getContext])

  /**
   * playRouletteTick - Серия мягких тиков для рулетки
   * @param count - количество тиков
   * @param onComplete - callback после завершения
   */
  const playRouletteTicks = useCallback((count: number = 20, onComplete?: () => void) => {
    const ctx = getContext()
    if (!ctx) return

    let currentTime = ctx.currentTime
    const baseInterval = 0.12 // Начальный интервал
    const minInterval = 0.04 // Минимальный интервал

    for (let i = 0; i < count; i++) {
      // Интервал уменьшается экспоненциально, затем увеличивается к концу
      const progress = i / count
      let interval: number

      if (progress < 0.7) {
        // Ускорение
        interval = baseInterval - (baseInterval - minInterval) * (progress / 0.7)
      } else {
        // Замедление к концу
        const slowProgress = (progress - 0.7) / 0.3
        interval = minInterval + (baseInterval - minInterval) * slowProgress * slowProgress
      }

      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      // Мягкий синус вместо резкого square
      oscillator.type = 'sine'
      // Высокий тон для приятного "тик"
      const pitch = 1800 + Math.sin(i * 0.3) * 100
      oscillator.frequency.setValueAtTime(pitch, currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(pitch * 0.7, currentTime + 0.02)

      // Тихая громкость с мягким затуханием
      const volume = 0.06 + progress * 0.04
      gainNode.gain.setValueAtTime(volume, currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.025)

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.start(currentTime)
      oscillator.stop(currentTime + 0.03)

      currentTime += interval
    }

    // Финальный удар
    const finalTime = currentTime + 0.1
    const timeoutId = window.setTimeout(() => {
      scheduledTimeoutsRef.current.delete(timeoutId)
      playImpact()
      onComplete?.()
    }, (finalTime - ctx.currentTime) * 1000)
    scheduledTimeoutsRef.current.add(timeoutId)
  }, [getContext, playImpact])

  /**
   * stopAllSounds - Останавливает все звуки и отменяет таймеры
   */
  const stopAllSounds = useCallback(() => {
    // Отменяем все запланированные таймауты
    scheduledTimeoutsRef.current.forEach(id => window.clearTimeout(id))
    scheduledTimeoutsRef.current.clear()

    // Закрываем и пересоздаём AudioContext для немедленной остановки
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
      isInitializedRef.current = false
    }
  }, [])

  return {
    initAudio,
    playClick,
    playImpact,
    playSuccess,
    playFailure,
    playWin,
    playRouletteTicks,
    stopAllSounds,
    isInitialized: isInitializedRef.current
  }
}
