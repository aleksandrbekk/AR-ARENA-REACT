import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Layout } from '../components/layout/Layout'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ToastProvider'
import { CurrencyIcon } from '../components/CurrencyIcon'
import {
  Zap,
  Clock,
  TrendingUp,
  MapPin,
  ChevronRight,
  Lock,
  Check,
  X,
  Sparkles
} from 'lucide-react'

// TypeScript interfaces based on new RPC structure
interface Equipment {
  slug: string
  name: string
  icon: string
  owned_quantity: number
  max_quantity: number
  income_per_unit: number
  total_income: number
  price: number
  location_slug: string
  can_buy: boolean
}

interface Location {
  slug: string
  name: string
  image: string
  price: number
  required_level: number
  max_slots: number
  purchased: boolean
  is_current: boolean
  can_purchase: boolean
  equipment_count: number
}

interface CurrentLocation {
  slug: string
  name: string
  image: string
}

interface FarmState {
  user_level: number
  balance_bul: number
  balance_ar: number
  last_passive_claim: string
  farm_bonus: number
  current_location: CurrentLocation
  income_per_hour: number
  equipment: Equipment[]
  locations: Location[]
}

interface FarmStatus {
  location_name: string
  location_image: string
  income_per_hour: number
  accumulated_ar: number
  hours_since_claim: number
  max_hours: number
  farm_bonus: number
}

export function FarmPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [farmState, setFarmState] = useState<FarmState | null>(null)
  const [farmStatus, setFarmStatus] = useState<FarmStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [toast, setToast] = useState<{ show: boolean; amount: number }>({ show: false, amount: 0 })

  const getTelegramId = useCallback(() => {
    const tg = window.Telegram?.WebApp
    return tg?.initDataUnsafe?.user?.id || null
  }, [])

  const loadFarmData = useCallback(async () => {
    const telegramId = getTelegramId()
    if (!telegramId) {
      setLoading(false)
      return
    }

    try {
      const [stateRes, statusRes] = await Promise.all([
        supabase.rpc('get_farm_state', { p_telegram_id: telegramId }),
        supabase.rpc('get_farm_status', { p_telegram_id: telegramId })
      ])

      if (!stateRes.error && stateRes.data) {
        setFarmState(stateRes.data)
      }

      if (!statusRes.error && statusRes.data) {
        setFarmStatus(statusRes.data)
      }
    } catch (err) {
      console.error('Failed to load farm data:', err)
    }

    setLoading(false)
  }, [getTelegramId])

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (tg) {
      tg.BackButton.show()
      const handleBack = () => navigate(-1)
      tg.BackButton.onClick(handleBack)
      return () => {
        tg.BackButton.offClick(handleBack)
        tg.BackButton.hide()
      }
    }
  }, [navigate])

  useEffect(() => {
    loadFarmData()
    const interval = setInterval(loadFarmData, 30000)
    return () => clearInterval(interval)
  }, [loadFarmData])

  const handleCollect = async () => {
    const telegramId = getTelegramId()
    if (!telegramId || claiming || !farmStatus?.accumulated_ar) return

    setClaiming(true)

    const { data, error } = await supabase.rpc('claim_farm_income', {
      p_telegram_id: telegramId
    })

    if (!error && data?.success) {
      setToast({ show: true, amount: data.claimed_ar })
      setTimeout(() => setToast({ show: false, amount: 0 }), 2500)
      await loadFarmData()
    } else {
      showToast({ variant: 'error', title: 'Ошибка', description: error?.message || 'Не удалось собрать' })
    }

    setClaiming(false)
  }

  const handlePurchaseEquipment = async (slug: string) => {
    const telegramId = getTelegramId()
    if (!telegramId || purchasing) return

    setPurchasing(slug)

    const { data, error } = await supabase.rpc('purchase_equipment', {
      p_telegram_id: telegramId,
      p_equipment_slug: slug
    })

    if (!error && data?.success) {
      showToast({
        variant: 'success',
        title: 'Куплено!',
        description: `Теперь у вас ${data.new_quantity} шт. (+${data.income_per_unit} AR/ч)`
      })
      await loadFarmData()
    } else {
      const errorMsg = data?.error || error?.message || 'Не удалось купить'
      showToast({ variant: 'error', title: 'Ошибка', description: errorMsg })
    }

    setPurchasing(null)
  }

  const handlePurchaseLocation = async (slug: string) => {
    const telegramId = getTelegramId()
    if (!telegramId || purchasing) return

    setPurchasing(slug)

    const { data, error } = await supabase.rpc('purchase_location', {
      p_telegram_id: telegramId,
      p_location_slug: slug
    })

    if (!error && data?.success) {
      showToast({
        variant: 'success',
        title: 'Локация куплена!',
        description: data.location_name
      })
      await loadFarmData()
      setShowLocationModal(false)
    } else {
      const errorMsg = data?.error || error?.message || 'Не удалось купить'
      showToast({ variant: 'error', title: 'Ошибка', description: errorMsg })
    }

    setPurchasing(null)
  }

  const handleSwitchLocation = async (slug: string) => {
    const telegramId = getTelegramId()
    if (!telegramId) return

    const { data, error } = await supabase.rpc('switch_location', {
      p_telegram_id: telegramId,
      p_location_slug: slug
    })

    if (!error && data?.success) {
      await loadFarmData()
      setShowLocationModal(false)
    } else {
      const msg = data?.error || error?.message || 'Не удалось сменить локацию'
      showToast({ variant: 'error', title: 'Ошибка', description: msg })
    }
  }

  const progressPercent = farmStatus
    ? Math.min((farmStatus.hours_since_claim / farmStatus.max_hours) * 100, 100)
    : 0

  const timeDisplay = farmStatus
    ? `${Math.floor(farmStatus.hours_since_claim)}ч ${Math.floor((farmStatus.hours_since_claim % 1) * 60)}м`
    : '0ч 0м'

  const currentLocation = farmState?.current_location || { slug: 'dorm', name: 'Общага', image: '/icons/locations/dormitory.png' }
  const allEquipment = farmState?.equipment || []
  const canCollect = farmStatus?.accumulated_ar && farmStatus.accumulated_ar > 0

  if (loading) {
    return (
      <Layout hideNavbar>
        <div className="fixed inset-0 bg-[#0a0a0a] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FFD700] to-[#FFA500] flex items-center justify-center">
              <Zap className="w-8 h-8 text-black" />
            </div>
            <div className="text-white/60">Загрузка фермы...</div>
          </motion.div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout hideNavbar>
      <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col overflow-hidden">
        {/* Location Hero */}
        <div className="relative w-full h-[240px] shrink-0">
          <img
            src={currentLocation.image}
            alt={currentLocation.name}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = '/icons/locations/dormitory.png' }}
          />
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-[#0a0a0a]" />

          {/* Glow effect */}
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center bottom, rgba(255,215,0,0.15) 0%, transparent 70%)',
            }}
          />

          {/* Location info */}
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-[#FFD700]" />
                <span className="text-white/60 text-sm">Локация</span>
              </div>
              <h1 className="text-white text-2xl font-bold">{currentLocation.name}</h1>
              {farmState?.farm_bonus && farmState.farm_bonus > 0 && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Sparkles className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-green-400 text-sm font-medium">+{farmState.farm_bonus}% бонус от скина</span>
                </div>
              )}
            </motion.div>

            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowLocationModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer"
              style={{
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
            >
              <span className="text-white text-sm font-medium">Сменить</span>
              <ChevronRight className="w-4 h-4 text-white/60" />
            </motion.button>
          </div>
        </div>

        {/* Main Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 pt-4 pb-32">
            {/* Stats Bento Grid */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              {/* Income per hour - 2x1 */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="col-span-2 relative rounded-2xl overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-sm" />
                <div className="absolute inset-0 bg-gradient-to-br from-[#FFD700]/10 to-transparent" />
                <div className="absolute inset-[1px] rounded-2xl border border-[#FFD700]/20" />

                <div className="relative p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-[#FFD700]/20 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-[#FFD700]" />
                    </div>
                    <span className="text-white/50 text-xs">Доход в час</span>
                  </div>
                  <div className="text-3xl font-black text-[#FFD700]">
                    {(farmStatus?.income_per_hour || 0).toFixed(1)}
                    <span className="text-lg ml-1">AR</span>
                  </div>
                </div>
              </motion.div>

              {/* Time - 1x1 */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 }}
                className="relative rounded-2xl overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-sm" />
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
                <div className="absolute inset-[1px] rounded-2xl border border-blue-500/20" />

                <div className="relative p-3 h-full flex flex-col justify-between">
                  <Clock className="w-5 h-5 text-blue-400" />
                  <div>
                    <div className="text-lg font-bold text-blue-400">{timeDisplay}</div>
                    <div className="text-white/30 text-[10px]">/ {farmStatus?.max_hours || 24}ч</div>
                  </div>
                </div>
              </motion.div>

              {/* Accumulated - 1x1 */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="relative rounded-2xl overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-sm" />
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent" />
                <div className="absolute inset-[1px] rounded-2xl border border-green-500/20" />

                <div className="relative p-3 h-full flex flex-col justify-between">
                  <Zap className="w-5 h-5 text-green-400" />
                  <div>
                    <div className="text-lg font-bold text-green-400">+{(farmStatus?.accumulated_ar || 0).toFixed(1)}</div>
                    <div className="text-white/30 text-[10px]">накоплено</div>
                  </div>
                </div>
              </motion.div>

              {/* Progress Bar - Full width */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="col-span-4 relative rounded-2xl overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-sm" />
                <div className="absolute inset-[1px] rounded-2xl border border-white/5" />

                <div className="relative p-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-white/40">Прогресс накопления</span>
                    <span className="text-[#FFD700] font-medium">{progressPercent.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-black/50 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{
                        background: 'linear-gradient(90deg, #FFD700, #FFA500)',
                        boxShadow: '0 0 20px rgba(255,215,0,0.5)'
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Collect Button */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              whileTap={{ scale: canCollect ? 0.98 : 1 }}
              onClick={handleCollect}
              disabled={claiming || !canCollect}
              className={`w-full py-4 rounded-2xl mb-6 font-bold text-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                canCollect
                  ? 'bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black shadow-xl shadow-[#FFD700]/25'
                  : 'bg-white/5 text-white/30 cursor-not-allowed'
              }`}
            >
              {canCollect && <Zap className="w-5 h-5" />}
              {claiming ? 'Собираем...' : canCollect ? `Собрать ${(farmStatus?.accumulated_ar || 0).toFixed(2)} AR` : 'Нечего собирать'}
            </motion.button>

            {/* Balance Cards */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 }}
                className="relative rounded-xl overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-sm" />
                <div className="absolute inset-[1px] rounded-xl border border-white/5" />
                <div className="relative p-3 flex items-center gap-3">
                  <CurrencyIcon type="BUL" className="w-8 h-8" />
                  <div>
                    <div className="text-white/40 text-xs">Баланс</div>
                    <div className="text-white font-bold">{(farmState?.balance_bul || 0).toLocaleString()} BUL</div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 }}
                className="relative rounded-xl overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-sm" />
                <div className="absolute inset-[1px] rounded-xl border border-white/5" />
                <div className="relative p-3 flex items-center gap-3">
                  <CurrencyIcon type="AR" className="w-8 h-8" />
                  <div>
                    <div className="text-white/40 text-xs">Баланс</div>
                    <div className="text-white font-bold">{(farmState?.balance_ar || 0).toFixed(0)} AR</div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Equipment Section */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FFD700] to-[#FFA500] flex items-center justify-center">
                  <img src="/icons/FERMA2.png" className="w-5 h-5" alt="" />
                </div>
                <span className="text-white text-lg font-bold">Оборудование</span>
              </div>

              <div className="space-y-3">
                {allEquipment.map((eq, i) => {
                  const location = farmState?.locations?.find(l => l.slug === eq.location_slug)
                  const locationPurchased = location?.purchased || eq.location_slug === 'dorm'
                  const isMax = eq.owned_quantity >= eq.max_quantity

                  return (
                    <motion.div
                      key={eq.slug}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.45 + i * 0.05 }}
                      className="relative rounded-2xl overflow-hidden"
                      style={{ opacity: locationPurchased ? 1 : 0.5 }}
                    >
                      <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-sm" />
                      <div className="absolute inset-0 bg-gradient-to-r from-[#FFD700]/5 to-transparent" />
                      <div className="absolute inset-[1px] rounded-2xl border border-white/5" />

                      <div className="relative p-4 flex items-center gap-4">
                        {/* Icon */}
                        <div className="w-14 h-14 rounded-xl bg-black/50 border border-white/10 flex items-center justify-center shrink-0">
                          <img
                            src={eq.icon}
                            alt={eq.name}
                            className="w-9 h-9 object-contain"
                            onError={(e) => { (e.target as HTMLImageElement).src = '/icons/FERMA2.png' }}
                          />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-bold">{eq.name}</span>
                            <span className="px-2 py-0.5 rounded-md bg-white/10 text-white/50 text-xs font-medium">
                              {eq.owned_quantity}/{eq.max_quantity}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[#FFD700] text-sm font-medium">
                              {eq.income_per_unit} AR/ч
                            </span>
                            {eq.owned_quantity > 0 && (
                              <span className="text-white/30 text-xs">
                                (всего: {eq.total_income.toFixed(1)} AR/ч)
                              </span>
                            )}
                          </div>
                          {!locationPurchased && location && (
                            <div className="flex items-center gap-1 mt-1">
                              <Lock className="w-3 h-3 text-white/30" />
                              <span className="text-white/30 text-xs">Требуется: {location.name}</span>
                            </div>
                          )}
                        </div>

                        {/* Action */}
                        <div className="shrink-0">
                          {!locationPurchased ? (
                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                              <Lock className="w-4 h-4 text-white/20" />
                            </div>
                          ) : isMax ? (
                            <div className="px-3 py-2 rounded-xl bg-green-500/20 border border-green-500/30">
                              <span className="text-green-400 text-xs font-bold">MAX</span>
                            </div>
                          ) : (
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handlePurchaseEquipment(eq.slug)}
                              disabled={purchasing === eq.slug || !eq.can_buy}
                              className="px-3 py-2 rounded-xl border border-[#FFD700]/50 text-[#FFD700] font-bold text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              style={{ boxShadow: '0 0 15px rgba(255,215,0,0.1)' }}
                            >
                              {purchasing === eq.slug ? '...' : `${eq.price.toLocaleString()}`}
                            </motion.button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Toast */}
        <AnimatePresence>
          {toast.show && (
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className="fixed top-24 left-4 right-4 z-50"
            >
              <div className="relative rounded-2xl overflow-hidden mx-auto max-w-sm">
                <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" />
                <div className="absolute inset-[1px] rounded-2xl border border-green-500/30" />
                <div className="relative p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/30">
                    <Check className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg">+{toast.amount.toFixed(2)} AR</p>
                    <p className="text-white/50 text-sm">Успешно собрано!</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Location Modal */}
        <AnimatePresence>
          {showLocationModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex flex-col bg-[#0a0a0a]"
            >
              {/* Background glow */}
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse at center, rgba(255,215,0,0.1) 0%, transparent 70%)',
                }}
              />

              {/* Close button */}
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setShowLocationModal(false)}
                className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm cursor-pointer"
              >
                <X className="w-5 h-5 text-white" />
              </motion.button>

              {/* Current location hero */}
              <div className="h-[35vh] relative shrink-0">
                <img
                  src={currentLocation.image}
                  alt="Current location"
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/icons/locations/dormitory.png' }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-[#0a0a0a]" />
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-4 left-4"
                >
                  <p className="text-white/50 text-sm mb-1">Текущая локация</p>
                  <h2 className="text-white text-2xl font-bold">{currentLocation.name}</h2>
                </motion.div>
              </div>

              {/* Locations list */}
              <div className="flex-1 px-4 pt-4 overflow-y-auto">
                <h3 className="text-white text-lg font-bold mb-4">Выбрать локацию</h3>
                <div className="space-y-3 pb-8">
                  {farmState?.locations?.map((location, i) => (
                    <motion.div
                      key={location.slug}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => {
                        if (location.is_current) return
                        if (location.purchased) {
                          handleSwitchLocation(location.slug)
                        } else if (location.can_purchase) {
                          handlePurchaseLocation(location.slug)
                        }
                      }}
                      className={`relative rounded-xl overflow-hidden cursor-pointer ${
                        !location.is_current && (location.purchased || location.can_purchase) ? 'active:scale-[0.98]' : ''
                      }`}
                      style={{ opacity: location.is_current || location.purchased || location.can_purchase ? 1 : 0.5 }}
                    >
                      <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-sm" />
                      {location.is_current && (
                        <div className="absolute inset-0 bg-gradient-to-r from-[#FFD700]/10 to-transparent" />
                      )}
                      <div className={`absolute inset-[1px] rounded-xl border ${
                        location.is_current ? 'border-[#FFD700]/50' : 'border-white/5'
                      }`} />

                      <div className="relative p-3 flex items-center gap-3">
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-zinc-800 shrink-0">
                          <img
                            src={location.image}
                            alt={location.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = '/icons/locations/dormitory.png' }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium">{location.name}</p>
                          <p className="text-white/40 text-sm">
                            {location.purchased
                              ? `${location.equipment_count}/${location.max_slots} оборудования`
                              : `${location.price.toLocaleString()} BUL`
                            }
                          </p>
                        </div>
                        <div className="shrink-0">
                          {location.is_current ? (
                            <span className="px-3 py-1.5 rounded-lg bg-[#FFD700]/20 text-[#FFD700] text-sm font-bold">
                              Текущая
                            </span>
                          ) : location.purchased ? (
                            <div className="flex items-center gap-1 text-white/50">
                              <span className="text-sm">Выбрать</span>
                              <ChevronRight className="w-4 h-4" />
                            </div>
                          ) : location.can_purchase ? (
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={(e) => {
                                e.stopPropagation()
                                handlePurchaseLocation(location.slug)
                              }}
                              disabled={purchasing === location.slug}
                              className="px-3 py-1.5 rounded-lg border border-[#FFD700]/50 text-[#FFD700] text-sm font-bold cursor-pointer"
                            >
                              {purchasing === location.slug ? '...' : 'Купить'}
                            </motion.button>
                          ) : (
                            <div className="flex items-center gap-1 text-white/30">
                              <Lock className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  )
}
