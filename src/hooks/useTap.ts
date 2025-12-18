import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface TapResult {
  success: boolean
  message: string
  balance_bul: number
  energy: number
  level: number
  xp: number
  xp_to_next: number
  bul_earned: number
  xp_earned: number
  leveled_up: boolean
}

export function useTap(telegramId: string) {
  const [isProcessing, setIsProcessing] = useState(false)

  const tap = async (taps: number = 1): Promise<TapResult | null> => {
    if (isProcessing) return null
    setIsProcessing(true)

    try {
      const { data, error } = await supabase.rpc('process_bull_tap', {
        p_telegram_id: telegramId,
        p_taps: taps,
      }) as { data: any; error: any }

      if (error) {
        console.error('RPC error:', error)
        throw error
      }

      console.log('Raw RPC response:', data)

      // RPC возвращает массив, берём первый элемент
      const result = Array.isArray(data) ? data[0] : data

      console.log('Parsed result:', result)

      return result as TapResult
    } catch (err) {
      console.error('Tap error:', err)
      // При ошибке возвращаем mock результат, чтобы UI работал
      return {
        success: false,
        message: 'Supabase unavailable',
        balance_bul: 1000,
        energy: 100,
        level: 1,
        xp: 0,
        xp_to_next: 1000,
        bul_earned: 0,
        xp_earned: 0,
        leveled_up: false
      }
    } finally {
      setIsProcessing(false)
    }
  }

  return { tap, isProcessing }
}
