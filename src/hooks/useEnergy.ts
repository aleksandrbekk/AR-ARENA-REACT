import { useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

interface EnergyResult {
  energy: number
  energy_max: number
  energy_restored: number
}

export function useEnergy(
  telegramId: string,
  onEnergyUpdate: (energy: number, energyMax: number) => void
) {

  const restoreEnergy = useCallback(async (): Promise<EnergyResult | null> => {
    if (!telegramId) return null

    console.log('=== ENERGY RESTORE ===')

    try {
      const { data, error } = await supabase.rpc('restore_bull_energy', {
        p_telegram_id: telegramId
      }) as { data: any; error: any }

      if (error) throw error

      const result = Array.isArray(data) ? data[0] : data

      console.log('Response from RPC:', data)
      console.log('Parsed result:', result)

      if (result) {
        console.log('Setting energy to:', result.energy, '/', result.energy_max)
        console.log('Energy restored this call:', result.energy_restored)
        onEnergyUpdate(result.energy, result.energy_max)
      }

      return result
    } catch (err) {
      console.error('Energy restore error:', err)
      return null
    }
  }, [telegramId, onEnergyUpdate])

  // Восстанавливать энергию каждые 5 секунд
  useEffect(() => {
    if (!telegramId) return

    // Сразу при загрузке
    restoreEnergy()

    // Потом каждые 5 секунд
    const interval = setInterval(restoreEnergy, 5000)

    return () => clearInterval(interval)
  }, [telegramId, restoreEnergy])

  return { restoreEnergy }
}
