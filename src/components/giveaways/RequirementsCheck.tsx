import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import type { Giveaway } from '../../types'

interface RequirementsCheckProps {
  giveaway: Giveaway
  telegramId: string
  onStatusChange: (canParticipate: boolean) => void
}

interface RequirementStatus {
  type: 'channel' | 'friends'
  label: string
  required: string | number
  current: string | number
  met: boolean
  loading: boolean
}

// SVG иконки
const CheckIcon = ({ className = '' }: { className?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={className}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const XIcon = ({ className = '' }: { className?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={className}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const UsersIcon = ({ className = '' }: { className?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const TelegramIcon = ({ className = '' }: { className?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
  </svg>
)

const LoaderIcon = ({ className = '' }: { className?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`animate-spin ${className}`}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
)

export function RequirementsCheck({ giveaway, telegramId, onStatusChange }: RequirementsCheckProps) {
  const [requirements, setRequirements] = useState<RequirementStatus[]>([])

  useEffect(() => {
    checkRequirements()
  }, [giveaway, telegramId])

  const checkRequirements = async () => {
    const reqs: RequirementStatus[] = []

    // Проверка подписки на канал
    if (giveaway.requirements?.telegram_channel_id) {
      reqs.push({
        type: 'channel',
        label: `Подписка на ${giveaway.requirements.telegram_channel_id}`,
        required: 'Да',
        current: 'Проверка...',
        met: false,
        loading: true
      })
    }

    // Проверка минимального количества друзей
    if (giveaway.requirements?.min_friends) {
      reqs.push({
        type: 'friends',
        label: 'Приглашённых друзей',
        required: giveaway.requirements.min_friends,
        current: 0,
        met: false,
        loading: true
      })
    }

    setRequirements(reqs)

    // Проверяем требования
    const updatedReqs = await Promise.all(
      reqs.map(async (req) => {
        if (req.type === 'channel') {
          // Проверка подписки на канал через API бота
          // В реальности это делается через Telegram Bot API
          // Пока что считаем что подписан
          return {
            ...req,
            current: 'Да',
            met: true,
            loading: false
          }
        }

        if (req.type === 'friends') {
          // Получаем количество рефералов пользователя
          const { count: refCount } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('referrer_id', telegramId)

          const friendsCount = refCount || 0
          const required = giveaway.requirements?.min_friends || 0

          return {
            ...req,
            current: friendsCount,
            met: friendsCount >= required,
            loading: false
          }
        }

        return req
      })
    )

    setRequirements(updatedReqs)

    // Проверяем все ли требования выполнены
    const allMet = updatedReqs.every(r => r.met)
    onStatusChange(allMet)
  }

  if (requirements.length === 0) {
    return null
  }

  return (
    <div className="space-y-2 mb-4">
      <p className="text-xs text-white/50 mb-2">Условия участия:</p>

      {requirements.map((req, idx) => (
        <motion.div
          key={req.type}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.1 }}
          className={`flex items-center gap-3 p-3 rounded-xl border ${
            req.loading
              ? 'bg-white/5 border-white/10'
              : req.met
              ? 'bg-green-500/10 border-green-500/20'
              : 'bg-red-500/10 border-red-500/20'
          }`}
        >
          {/* Icon */}
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            req.loading
              ? 'bg-white/10'
              : req.met
              ? 'bg-green-500/20'
              : 'bg-red-500/20'
          }`}>
            {req.loading ? (
              <LoaderIcon className="text-white/50" />
            ) : req.type === 'channel' ? (
              <TelegramIcon className={req.met ? 'text-green-400' : 'text-red-400'} />
            ) : (
              <UsersIcon className={req.met ? 'text-green-400' : 'text-red-400'} />
            )}
          </div>

          {/* Label */}
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${
              req.loading ? 'text-white/70' : req.met ? 'text-green-400' : 'text-red-400'
            }`}>
              {req.label}
            </p>
            <p className="text-xs text-white/40">
              {req.loading ? (
                'Проверка...'
              ) : (
                <>
                  {req.current} / {req.required}
                  {!req.met && req.type === 'friends' && (
                    <span className="ml-1">
                      (нужно ещё {Number(req.required) - Number(req.current)})
                    </span>
                  )}
                </>
              )}
            </p>
          </div>

          {/* Status */}
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
            req.loading
              ? 'bg-white/10'
              : req.met
              ? 'bg-green-500'
              : 'bg-red-500'
          }`}>
            {req.loading ? (
              <LoaderIcon className="text-white/50 w-3 h-3" />
            ) : req.met ? (
              <CheckIcon className="text-white" />
            ) : (
              <XIcon className="text-white" />
            )}
          </div>
        </motion.div>
      ))}

      {/* Warning if not all met */}
      {!requirements.every(r => r.met) && !requirements.some(r => r.loading) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl"
        >
          <p className="text-xs text-red-400 text-center">
            Выполните все условия для участия в розыгрыше
          </p>
        </motion.div>
      )}
    </div>
  )
}
