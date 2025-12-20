import { useState, useEffect } from 'react'
import { Layout } from '../components/layout/Layout'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../components/ToastProvider'
import { supabase } from '../lib/supabase'

interface EventStatus {
  digit_1: number | null
  digit_2: number | null
  digit_3: number | null
  digit_4: number | null
  wheel_active: boolean
}

interface EventCode {
  digit_1: number
  digit_2: number
  digit_3: number
  digit_4: number
  digit_1_revealed: boolean
  digit_2_revealed: boolean
  digit_3_revealed: boolean
  digit_4_revealed: boolean
  wheel_active: boolean
  event_date: string
}

interface Statistics {
  codeEntered: number
  wheelSpun: number
  promocodesIssued: number
}

export function EventAdminPage() {
  const { telegramUser, isLoading } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [eventStatus, setEventStatus] = useState<EventStatus | null>(null)
  const [eventCode, setEventCode] = useState<EventCode | null>(null)
  const [statistics, setStatistics] = useState<Statistics>({
    codeEntered: 0,
    wheelSpun: 0,
    promocodesIssued: 0
  })
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Проверка доступа
  const isAdmin = telegramUser?.id === 190202791

  // Загрузка данных
  const loadData = async () => {
    try {
      setLoading(true)

      // Получаем статус через RPC
      const { data: statusData, error: statusError } = await supabase.rpc('get_revealed_digits')

      if (statusError) {
        console.error('Error loading status:', statusError)
      } else {
        setEventStatus(statusData as EventStatus)
      }

      // Получаем полный код из таблицы event_codes
      const { data: codeData, error: codeError } = await supabase
        .from('event_codes')
        .select('*')
        .eq('event_date', new Date().toISOString().split('T')[0])
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (codeError) {
        console.error('Error loading code:', codeError)
      } else {
        setEventCode(codeData as EventCode)
        // Обновляем статус из полных данных
        if (codeData) {
          setEventStatus({
            digit_1: codeData.digit_1_revealed ? codeData.digit_1 : null,
            digit_2: codeData.digit_2_revealed ? codeData.digit_2 : null,
            digit_3: codeData.digit_3_revealed ? codeData.digit_3 : null,
            digit_4: codeData.digit_4_revealed ? codeData.digit_4 : null,
            wheel_active: codeData.wheel_active
          })
        }
      }

      // Загружаем статистику
      const [codeEnteredRes, wheelSpunRes, promocodesRes] = await Promise.all([
        supabase
          .from('event_participants')
          .select('*', { count: 'exact', head: true })
          .eq('code_entered', true),
        supabase
          .from('event_participants')
          .select('*', { count: 'exact', head: true })
          .eq('wheel_spun', true),
        supabase
          .from('event_promocodes')
          .select('*', { count: 'exact', head: true })
      ])

      setStatistics({
        codeEntered: codeEnteredRes.count || 0,
        wheelSpun: wheelSpunRes.count || 0,
        promocodesIssued: promocodesRes.count || 0
      })
    } catch (err) {
      console.error('Error loading data:', err)
      showToast({ variant: 'error', title: 'Ошибка загрузки данных' })
    } finally {
      setLoading(false)
    }
  }

  // Автообновление каждые 5 секунд
  useEffect(() => {
    if (!isAdmin) return

    loadData()

    const interval = setInterval(() => {
      loadData()
    }, 5000)

    return () => clearInterval(interval)
  }, [isAdmin])

  // Открытие цифры
  const handleRevealDigit = async (digitNumber: number) => {
    if (actionLoading) return

    setActionLoading(`reveal-${digitNumber}`)

    try {
      const { data, error } = await supabase.rpc('admin_reveal_digit', {
        digit_number: digitNumber
      })

      if (error) {
        throw new Error(error.message)
      }

      const result = data as { success: boolean; error?: string }

      if (result.success) {
        showToast({ variant: 'success', title: `Цифра ${digitNumber} открыта` })
        await loadData()
      } else {
        throw new Error(result.error || 'Ошибка открытия цифры')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка открытия цифры'
      showToast({ variant: 'error', title: 'Ошибка', description: errorMessage })
    } finally {
      setActionLoading(null)
    }
  }

  // Переключение рулетки
  const handleToggleWheel = async () => {
    if (actionLoading || !eventStatus) return

    const newState = !eventStatus.wheel_active
    setActionLoading('toggle-wheel')

    try {
      const { data, error } = await supabase.rpc('admin_toggle_wheel', {
        is_active: newState
      })

      if (error) {
        throw new Error(error.message)
      }

      const result = data as { success: boolean; error?: string }

      if (result.success) {
        showToast({
          variant: 'success',
          title: newState ? 'Рулетка включена' : 'Рулетка выключена'
        })
        await loadData()
      } else {
        throw new Error(result.error || 'Ошибка переключения рулетки')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка переключения рулетки'
      showToast({ variant: 'error', title: 'Ошибка', description: errorMessage })
    } finally {
      setActionLoading(null)
    }
  }

  // Настройка Telegram Back Button
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp
      const handleBack = () => navigate('/')
      tg.BackButton.show()
      tg.BackButton.onClick(handleBack)

      return () => {
        tg.BackButton.offClick(handleBack)
        tg.BackButton.hide()
      }
    }
  }, [navigate])

  // Доступ запрещён
  if (!isLoading && !isAdmin) {
    return (
      <Layout hideNavbar>
        <div className="flex flex-col items-center justify-center min-h-screen px-4" style={{ paddingTop: '80px' }}>
          <div className="text-white/40 text-lg text-center font-bold tracking-widest uppercase">
            Доступ запрещён
          </div>
          <button
            onClick={() => navigate('/')}
            className="mt-6 px-6 py-3 bg-zinc-800 text-white rounded-xl active:scale-95 transition-transform font-medium"
          >
            На главную
          </button>
        </div>
      </Layout>
    )
  }

  if (isLoading || loading) {
    return (
      <Layout hideNavbar>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white text-xl">Загрузка...</div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout hideNavbar>
      <div className="min-h-screen bg-[#0a0a0a] text-white pt-[60px] pb-8 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Заголовок */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Управление событием</h1>
            <button
              onClick={loadData}
              disabled={loading}
              className="px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg text-sm disabled:opacity-50"
            >
              Обновить
            </button>
          </div>

          {/* БЛОК 1: ТЕКУЩИЙ СТАТУС */}
          <div className="p-6 bg-zinc-900/50 backdrop-blur-md border border-yellow-500/20 rounded-lg">
            <h2 className="text-lg font-bold mb-4 text-[#FFD700]">Текущий статус</h2>

            {eventCode ? (
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-white/60 mb-2">Название события:</div>
                  <div className="text-lg font-semibold">Крипто-итоги 2025</div>
                </div>

                <div>
                  <div className="text-sm text-white/60 mb-2">Код:</div>
                  <div className="flex gap-2 text-2xl font-bold">
                    {eventCode.digit_1_revealed ? (
                      <span className="text-[#FFD700]">{eventCode.digit_1}</span>
                    ) : (
                      <span className="text-white/30">?</span>
                    )}
                    {eventCode.digit_2_revealed ? (
                      <span className="text-[#FFD700]">{eventCode.digit_2}</span>
                    ) : (
                      <span className="text-white/30">?</span>
                    )}
                    {eventCode.digit_3_revealed ? (
                      <span className="text-[#FFD700]">{eventCode.digit_3}</span>
                    ) : (
                      <span className="text-white/30">?</span>
                    )}
                    {eventCode.digit_4_revealed ? (
                      <span className="text-[#FFD700]">{eventCode.digit_4}</span>
                    ) : (
                      <span className="text-white/30">?</span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-white/60 mb-2">Статус цифр:</div>
                  <div className="flex gap-4">
                    {[1, 2, 3, 4].map((num) => {
                      const revealed = eventCode[`digit_${num}_revealed` as keyof EventCode] as boolean
                      return (
                        <div key={num} className="flex items-center gap-2">
                          <span className="text-sm">Цифра {num}:</span>
                          {revealed ? (
                            <span className="text-green-500">✅ открыта</span>
                          ) : (
                            <span className="text-white/40">🔒 скрыта</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-white/60 mb-2">Рулетка:</div>
                  <div className="flex items-center gap-2">
                    {eventCode.wheel_active ? (
                      <span className="text-green-500">🟢 включена</span>
                    ) : (
                      <span className="text-red-500">🔴 выключена</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-white/60">Событие не найдено</div>
            )}
          </div>

          {/* БЛОК 2: УПРАВЛЕНИЕ КОДОМ */}
          <div className="p-6 bg-zinc-900/50 backdrop-blur-md border border-yellow-500/20 rounded-lg">
            <h2 className="text-lg font-bold mb-4 text-[#FFD700]">Управление кодом</h2>
            <div className="grid grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((num) => {
                const revealed = eventCode?.[`digit_${num}_revealed` as keyof EventCode] as boolean
                const isLoading = actionLoading === `reveal-${num}`
                return (
                  <button
                    key={num}
                    onClick={() => handleRevealDigit(num)}
                    disabled={revealed || isLoading}
                    className="py-3 px-4 bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-white/60 disabled:from-transparent disabled:to-transparent"
                  >
                    {isLoading ? '...' : `Открыть ${num}`}
                  </button>
                )
              })}
            </div>
          </div>

          {/* БЛОК 3: УПРАВЛЕНИЕ РУЛЕТКОЙ */}
          <div className="p-6 bg-zinc-900/50 backdrop-blur-md border border-yellow-500/20 rounded-lg">
            <h2 className="text-lg font-bold mb-4 text-[#FFD700]">Управление рулеткой</h2>
            <button
              onClick={handleToggleWheel}
              disabled={!eventStatus || actionLoading === 'toggle-wheel'}
              className={`w-full py-3 px-4 font-bold rounded-lg ${
                eventStatus?.wheel_active
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {actionLoading === 'toggle-wheel'
                ? '...'
                : eventStatus?.wheel_active
                  ? 'Выключить рулетку'
                  : 'Включить рулетку'}
            </button>
          </div>

          {/* БЛОК 4: СТАТИСТИКА */}
          <div className="p-6 bg-zinc-900/50 backdrop-blur-md border border-yellow-500/20 rounded-lg">
            <h2 className="text-lg font-bold mb-4 text-[#FFD700]">Статистика</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-white/80">Участников ввело код:</span>
                <span className="text-[#FFD700] font-bold text-xl">{statistics.codeEntered}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/80">Крутили рулетку:</span>
                <span className="text-[#FFD700] font-bold text-xl">{statistics.wheelSpun}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/80">Промокодов выдано:</span>
                <span className="text-[#FFD700] font-bold text-xl">{statistics.promocodesIssued}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

