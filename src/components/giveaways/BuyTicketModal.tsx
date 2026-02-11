import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Minus, Plus, Ticket, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { RequirementsCheck } from './RequirementsCheck'
import type { Giveaway } from '../../types'

interface BuyTicketModalProps {
  isOpen: boolean
  onClose: () => void
  giveaway: Giveaway
  onSuccess: () => void
}

export function BuyTicketModal({ isOpen, onClose, giveaway, onSuccess }: BuyTicketModalProps) {
  const { telegramUser, gameState, refetch } = useAuth()
  const [count, setCount] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requirementsMet, setRequirementsMet] = useState(true)

  // Проверяем есть ли требования
  const hasRequirements = !!(
    giveaway.requirements?.telegram_channel_id ||
    giveaway.requirements?.min_friends
  )

  // Сбрасываем состояние при открытии/закрытии
  useEffect(() => {
    if (isOpen) {
      setCount(1)
      setError(null)
      // Если нет требований, считаем что все выполнено
      if (!hasRequirements) {
        setRequirementsMet(true)
      }
    }
  }, [isOpen, hasRequirements])

  // Определяем цену (только AR)
  const ticketPrice = giveaway.prices?.ar ?? giveaway.price ?? 0

  const totalCost = count * ticketPrice
  const userBalance = gameState?.balance_ar || 0
  const canAfford = userBalance >= totalCost
  const canBuy = canAfford && requirementsMet

  const handleBuy = async () => {
    if (!telegramUser || !canBuy) return

    setLoading(true)
    setError(null)

    try {
      const { error: rpcError } = await supabase.rpc('buy_giveaway_ticket_v2', {
        p_telegram_id: telegramUser.id.toString(),
        p_giveaway_id: giveaway.id,
        p_count: count
      })

      if (rpcError) throw rpcError

      // Refresh user balance
      await refetch()
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Buy ticket error:', err)
      setError(err.message || 'Ошибка покупки билета')
    } finally {
      setLoading(false)
    }
  }

  const presets = [1, 5, 10]

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-4"
          >
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-5 max-w-md mx-auto">
              {/* Header */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">Купить билеты</h3>
                <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg">
                  <X size={20} className="text-white/50" />
                </button>
              </div>

              {/* Giveaway Info */}
              <div className="bg-black/30 rounded-xl p-3 mb-4">
                <p className="text-sm text-white/70">{giveaway.title}</p>
                <p className="text-xs text-white/40">Цена билета: {ticketPrice} AR</p>
              </div>

              {/* Requirements Check */}
              {hasRequirements && telegramUser && (
                <RequirementsCheck
                  giveaway={giveaway}
                  telegramId={telegramUser.id.toString()}
                  onStatusChange={setRequirementsMet}
                />
              )}

              {/* Quantity Selector */}
              <div className="mb-4">
                <label className="text-xs text-white/50 mb-2 block">Количество билетов</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCount(Math.max(1, count - 1))}
                    className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                  >
                    <Minus size={18} className="text-white" />
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-3xl font-bold text-white">{count}</span>
                  </div>
                  <button
                    onClick={() => setCount(count + 1)}
                    className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                  >
                    <Plus size={18} className="text-white" />
                  </button>
                </div>

                {/* Presets */}
                <div className="flex gap-2 mt-3">
                  {presets.map(p => (
                    <button
                      key={p}
                      onClick={() => setCount(p)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        count === p 
                          ? 'bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/30' 
                          : 'bg-white/5 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      x{p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-between items-center py-3 border-t border-white/10 mb-4">
                <span className="text-white/50">Итого:</span>
                <div className="flex items-center gap-2">
                  <img
                    src="/icons/arcoin.png"
                    alt="AR"
                    className="w-5 h-5"
                  />
                  <span className="text-xl font-bold text-white">{totalCost.toLocaleString()}</span>
                </div>
              </div>

              {/* Balance Warning */}
              {!canAfford && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
                  <AlertCircle size={16} className="text-red-400" />
                  <span className="text-xs text-red-400">Недостаточно средств (баланс: {userBalance.toLocaleString()})</span>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
                  <AlertCircle size={16} className="text-red-400" />
                  <span className="text-xs text-red-400">{error}</span>
                </div>
              )}

              {/* Buy Button */}
              <button
                onClick={handleBuy}
                disabled={loading || !canBuy}
                className="w-full py-4 rounded-xl font-bold text-black flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: canBuy
                    ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)'
                    : '#333'
                }}
              >
                <Ticket size={20} />
                {loading ? 'Покупка...' : !requirementsMet ? 'Выполните условия' : 'Купить билеты'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
