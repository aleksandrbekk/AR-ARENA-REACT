import { useState } from 'react'
import { Layout } from '../components/layout/Layout'
import { SkinCard } from '../components/SkinCard'
import { useSkins } from '../hooks/useSkins'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import type { SkinRarity } from '../types'

type RarityFilter = 'all' | SkinRarity

const FILTER_LABELS: Record<RarityFilter, string> = {
  all: 'Все',
  common: 'Обычные',
  uncommon: 'Необычные',
  rare: 'Редкие',
  epic: 'Эпические',
  legendary: 'Легендарные'
}

export function ShopPage() {
  const { telegramUser, gameState, refetch } = useAuth()
  const { skins, isOwned, isEquipped, reload } = useSkins()
  const [filter, setFilter] = useState<RarityFilter>('all')
  const [isProcessing, setIsProcessing] = useState(false)

  // Фильтрация скинов
  const filteredSkins = filter === 'all'
    ? skins
    : skins.filter(skin => skin.rarity === filter)

  // Покупка скина
  const handleBuy = async (skinId: number) => {
    if (!telegramUser || isProcessing) return

    setIsProcessing(true)

    try {
      const { data, error } = await supabase.rpc('buy_skin', {
        p_telegram_id: telegramUser.id.toString(),
        p_skin_id: skinId
      })

      if (error) {
        console.error('RPC error:', error)
        alert('Ошибка при покупке скина')
        return
      }

      const result = data as {
        success: boolean
        error?: string
        required_level?: number
        user_level?: number
        required?: number
        available?: number
      }

      if (!result.success) {
        // Обработка ошибок
        switch (result.error) {
          case 'INSUFFICIENT_BUL':
            alert(`Недостаточно BUL!\nНужно: ${result.required}\nУ вас: ${result.available}`)
            break
          case 'LEVEL_TOO_LOW':
            alert(`Недостаточно уровня!\nНужен: ${result.required_level}\nУ вас: ${result.user_level}`)
            break
          case 'ALREADY_OWNED':
            alert('Вы уже купили этот скин!')
            break
          case 'SKIN_NOT_FOUND':
            alert('Скин не найден')
            break
          default:
            alert('Ошибка при покупке скина')
        }
        return
      }

      // Успех!
      console.log('✅ Скин куплен успешно!')

      // Обновляем данные
      await Promise.all([refetch(), reload()])

      alert('🎉 Скин успешно куплен!')

    } catch (err) {
      console.error('Error buying skin:', err)
      alert('Произошла ошибка при покупке')
    } finally {
      setIsProcessing(false)
    }
  }

  // Экипировка скина
  const handleEquip = async (skinId: number) => {
    if (!telegramUser || isProcessing) return

    setIsProcessing(true)

    try {
      const { data, error } = await supabase.rpc('equip_skin', {
        p_telegram_id: telegramUser.id.toString(),
        p_skin_id: skinId
      })

      if (error) {
        console.error('RPC error:', error)
        alert('Ошибка при экипировке скина')
        return
      }

      const result = data as {
        success: boolean
        error?: string
      }

      if (!result.success) {
        if (result.error === 'SKIN_NOT_OWNED') {
          alert('Сначала купите этот скин!')
        } else {
          alert('Ошибка при экипировке скина')
        }
        return
      }

      // Успех!
      console.log('✅ Скин экипирован успешно!')

      // Обновляем данные
      await Promise.all([refetch(), reload()])

      alert('✓ Скин экипирован!')

    } catch (err) {
      console.error('Error equipping skin:', err)
      alert('Произошла ошибка при экипировке')
    } finally {
      setIsProcessing(false)
    }
  }

  if (!gameState) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-white text-xl">Loading...</div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="flex flex-col h-full">

        {/* Шапка с балансом */}
        <div className="px-4 pt-4 pb-3">
          <h1 className="text-2xl font-bold text-white mb-3">Магазин скинов</h1>

          {/* Баланс BUL */}
          <div className="bg-gradient-to-r from-[#FFD700] to-[#FFA500] rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/icons/BUL.png" className="w-8 h-8" alt="BUL" />
              <span className="text-black font-bold text-lg">{gameState.balance_bul.toLocaleString()}</span>
            </div>
            <span className="text-black/60 text-sm font-medium">Ваш баланс</span>
          </div>
        </div>

        {/* Фильтры по редкости */}
        <div className="px-4 pb-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {(Object.keys(FILTER_LABELS) as RarityFilter[]).map(rarity => (
              <button
                key={rarity}
                onClick={() => setFilter(rarity)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  filter === rarity
                    ? 'bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black'
                    : 'bg-white/10 text-white/60'
                }`}
              >
                {FILTER_LABELS[rarity]}
              </button>
            ))}
          </div>
        </div>

        {/* Грид скинов */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {filteredSkins.length === 0 ? (
            <div className="text-center text-white/60 mt-8">
              Нет скинов в этой категории
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredSkins.map(skin => (
                <SkinCard
                  key={skin.id}
                  skin={skin}
                  isOwned={isOwned(skin.id)}
                  isEquipped={isEquipped(skin.id)}
                  userLevel={gameState.level}
                  userBul={gameState.balance_bul}
                  onBuy={handleBuy}
                  onEquip={handleEquip}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </Layout>
  )
}
