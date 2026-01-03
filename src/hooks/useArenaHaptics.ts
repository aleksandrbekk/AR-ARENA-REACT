import { useCallback, useMemo, useRef } from 'react'

/**
 * useArenaHaptics — хук для управления вибрацией в Telegram Mini App
 *
 * Приоритет:
 * 1. Telegram WebApp HapticFeedback (в Telegram)
 * 2. navigator.vibrate (fallback для браузера)
 * 3. Тихий провал, если ничего не поддерживается
 */
export function useArenaHaptics() {
  // Проверяем доступность Telegram WebApp
  const tgHaptic = useMemo(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      return window.Telegram.WebApp.HapticFeedback
    }
    return null
  }, [])

  // Проверяем доступность navigator.vibrate (fallback)
  const canVibrate = useMemo(() => {
    return typeof navigator !== 'undefined' && 'vibrate' in navigator
  }, [])

  /**
   * triggerTick — легкая вибрация для выбора/переключения
   * TG: selectionChanged
   * Browser: vibrate(5)
   */
  const triggerTick = useCallback(() => {
    try {
      if (tgHaptic) {
        tgHaptic.selectionChanged()
      } else if (canVibrate) {
        navigator.vibrate(5)
      }
    } catch {
      // Тихий провал — не критично
    }
  }, [tgHaptic, canVibrate])

  /**
   * triggerImpact — средняя вибрация для действий (тап, клик)
   * TG: impactOccurred('medium')
   * Browser: vibrate(20)
   */
  const triggerImpact = useCallback(() => {
    try {
      if (tgHaptic) {
        tgHaptic.impactOccurred('medium')
      } else if (canVibrate) {
        navigator.vibrate(20)
      }
    } catch {
      // Тихий провал
    }
  }, [tgHaptic, canVibrate])

  /**
   * triggerSuccess — вибрация успеха (покупка, достижение)
   * TG: notificationOccurred('success')
   * Browser: vibrate([50, 50, 50]) — три коротких импульса
   */
  const triggerSuccess = useCallback(() => {
    try {
      if (tgHaptic) {
        tgHaptic.notificationOccurred('success')
      } else if (canVibrate) {
        navigator.vibrate([50, 50, 50])
      }
    } catch {
      // Тихий провал
    }
  }, [tgHaptic, canVibrate])

  /**
   * triggerError — вибрация ошибки
   * TG: notificationOccurred('error')
   * Browser: vibrate([100, 50, 100]) — два длинных импульса
   */
  const triggerError = useCallback(() => {
    try {
      if (tgHaptic) {
        tgHaptic.notificationOccurred('error')
      } else if (canVibrate) {
        navigator.vibrate([100, 50, 100])
      }
    } catch {
      // Тихий провал
    }
  }, [tgHaptic, canVibrate])

  // ============ SQUEEZE / TENSION EFFECTS ============

  // Ref для хранения таймеров tension эффекта
  const tensionTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  /**
   * triggerSqueezeProgress — вибрация на основе прогресса (0-1)
   * Используй в связке с анимацией открытия карты
   *
   * progress < 0.5: редкие тики (каждые ~400ms)
   * progress 0.5-0.8: средние тики (каждые ~200ms)
   * progress > 0.8: частые тики (каждые ~100ms)
   * progress = 1: финальный impact
   *
   * @param progress - значение от 0 до 1
   * @param lastProgress - предыдущее значение (для debounce)
   */
  const triggerSqueezeProgress = useCallback((progress: number, lastProgress?: number) => {
    try {
      // Финальный момент — сильная вибрация
      if (progress >= 1) {
        if (tgHaptic) {
          tgHaptic.impactOccurred('heavy')
        } else if (canVibrate) {
          navigator.vibrate(40)
        }
        return
      }

      // Определяем порог для следующего тика на основе прогресса
      let threshold: number
      if (progress < 0.5) {
        threshold = 0.15 // редкие тики
      } else if (progress < 0.8) {
        threshold = 0.08 // средние тики
      } else {
        threshold = 0.04 // частые тики
      }

      // Проверяем, нужно ли вибрировать (debounce по прогрессу)
      if (lastProgress !== undefined) {
        const delta = progress - lastProgress
        if (delta < threshold) return
      }

      // Вибрируем
      if (tgHaptic) {
        tgHaptic.selectionChanged()
      } else if (canVibrate) {
        navigator.vibrate(5)
      }
    } catch {
      // Тихий провал
    }
  }, [tgHaptic, canVibrate])

  /**
   * stopTension — остановить все запланированные вибрации
   */
  const stopTension = useCallback(() => {
    tensionTimersRef.current.forEach(timer => clearTimeout(timer))
    tensionTimersRef.current = []
  }, [])

  /**
   * triggerTension — автономный эффект нарастающего напряжения
   * Запускает серию вибраций с ускоряющейся частотой
   *
   * @param duration - длительность эффекта в ms (default: 2000)
   * @returns функция для досрочной остановки
   *
   * Пример: const stop = triggerTension(2500)
   */
  const triggerTension = useCallback((duration: number = 2000) => {
    // Очищаем предыдущие таймеры
    stopTension()

    // Расписание вибраций: [время от старта в %, интенсивность]
    // Начинаем редко, заканчиваем часто
    const schedule = [
      { at: 0.0, type: 'tick' },
      { at: 0.15, type: 'tick' },
      { at: 0.30, type: 'tick' },
      { at: 0.45, type: 'tick' },
      { at: 0.55, type: 'tick' },
      { at: 0.65, type: 'tick' },
      { at: 0.72, type: 'tick' },
      { at: 0.78, type: 'tick' },
      { at: 0.84, type: 'tick' },
      { at: 0.88, type: 'tick' },
      { at: 0.92, type: 'tick' },
      { at: 0.95, type: 'tick' },
      { at: 0.98, type: 'tick' },
      { at: 1.0, type: 'impact' }, // финал
    ]

    schedule.forEach(({ at, type }) => {
      const timer = setTimeout(() => {
        try {
          if (type === 'impact') {
            if (tgHaptic) {
              tgHaptic.impactOccurred('heavy')
            } else if (canVibrate) {
              navigator.vibrate(40)
            }
          } else {
            if (tgHaptic) {
              tgHaptic.selectionChanged()
            } else if (canVibrate) {
              navigator.vibrate(5)
            }
          }
        } catch {
          // Тихий провал
        }
      }, duration * at)

      tensionTimersRef.current.push(timer)
    })

    return stopTension
  }, [tgHaptic, canVibrate, stopTension])

  return {
    // Базовые
    triggerTick,
    triggerImpact,
    triggerSuccess,
    triggerError,
    // Squeeze / Tension
    triggerSqueezeProgress,
    triggerTension,
    stopTension,
    // Отладка
    isTelegramHaptics: !!tgHaptic,
    isBrowserVibrate: canVibrate && !tgHaptic,
  }
}
