import { useCallback, useMemo } from 'react'

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

  return {
    triggerTick,
    triggerImpact,
    triggerSuccess,
    triggerError,
    // Полезно для отладки
    isTelegramHaptics: !!tgHaptic,
    isBrowserVibrate: canVibrate && !tgHaptic,
  }
}
