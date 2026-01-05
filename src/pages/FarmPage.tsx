import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ToastProvider'

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

  // Farm state from get_farm_state RPC
  const [farmState, setFarmState] = useState<FarmState | null>(null)
  const [farmStatus, setFarmStatus] = useState<FarmStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [toast, setToast] = useState<{ show: boolean; amount: number }>({ show: false, amount: 0 })

  // Get telegram ID
  const getTelegramId = useCallback(() => {
    const tg = window.Telegram?.WebApp
    return tg?.initDataUnsafe?.user?.id || null
  }, [])

  // Load farm state from Supabase
  const loadFarmData = useCallback(async () => {
    const telegramId = getTelegramId()
    if (!telegramId) {
      setLoading(false)
      return
    }

    try {
      // Load both farm state and status in parallel
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

  // Telegram BackButton
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

  // Load farm data on mount + auto-refresh every 30 seconds
  useEffect(() => {
    loadFarmData()
    const interval = setInterval(loadFarmData, 30000)
    return () => clearInterval(interval)
  }, [loadFarmData])

  // Collect income
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

  // Purchase equipment
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

  // Purchase location
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

  // Switch location
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
      showToast({ variant: 'error', title: 'Ошибка', description: 'Не удалось сменить локацию' })
    }
  }

  // Calculate progress based on real farm data
  const progressPercent = farmStatus
    ? Math.min((farmStatus.hours_since_claim / farmStatus.max_hours) * 100, 100)
    : 0

  const timeDisplay = farmStatus
    ? `${Math.floor(farmStatus.hours_since_claim)}ч ${Math.floor((farmStatus.hours_since_claim % 1) * 60)}м / ${farmStatus.max_hours}ч`
    : '0ч 0м / 0ч'

  // Get current location from state
  const currentLocation = farmState?.current_location || { slug: 'dorm', name: 'Общага', image: '/icons/locations/dormitory.png' }

  // Get all equipment
  const allEquipment = farmState?.equipment || []

  // Loading state
  if (loading) {
    return (
      <Layout hideNavbar>
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
          <p className="text-gray-400">Загрузка...</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout hideNavbar>
      <div
        className="min-h-screen bg-[#0a0a0a]"
        style={{
          marginTop: 'calc(var(--safe-area-top) * -1)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 20px) + 80px)',
        }}
      >
        {/* Location Hero Image */}
        <div className="relative w-full h-[280px]">
          <img
            src={currentLocation.image}
            alt={currentLocation.name}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = '/icons/locations/dormitory.png' }}
          />
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
            <div>
              <h1 className="text-white text-xl font-bold">{currentLocation.name}</h1>
              {farmState?.farm_bonus && farmState.farm_bonus > 0 && (
                <p className="text-green-400 text-sm">+{farmState.farm_bonus}% бонус от скина</p>
              )}
            </div>
            <button
              onClick={() => setShowLocationModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800/80 backdrop-blur rounded-full text-white text-sm active:scale-95 transition-transform"
            >
              <span>Сменить</span>
            </button>
          </div>
        </div>

        {/* Stats Panel */}
        <div className="px-4 pt-4">
          <div
            className="rounded-3xl p-6 mb-6 border border-white/5"
            style={{
              background: `
                linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.2)),
                repeating-linear-gradient(0deg, #1c1c1c 0px, #1c1c1c 1px, #252525 2px, #252525 3px)
              `,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 10px 30px rgba(0,0,0,0.5)'
            }}
          >
            {/* Income per hour */}
            <div className="mb-5">
              <div className="text-xs uppercase tracking-wide text-zinc-500 font-semibold mb-1.5">
                ДОХОД В ЧАС
              </div>
              <div
                className="text-2xl font-extrabold flex items-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 0 20px rgba(191, 149, 63, 0.3)'
                }}
              >
                {(farmStatus?.income_per_hour || 0).toFixed(2)} AR
              </div>
            </div>

            {/* Progress */}
            <div className="mb-5">
              <div className="flex justify-between text-sm text-zinc-500 font-semibold mb-2">
                <span>{timeDisplay}</span>
                <span className="text-[#FCF6BA]" style={{ textShadow: '0 0 10px rgba(191, 149, 63, 0.5)' }}>
                  +{(farmStatus?.accumulated_ar || 0).toFixed(2)} AR
                </span>
              </div>
              <div className="h-1.5 bg-black rounded-full overflow-hidden border-b border-white/10">
                <div
                  className="h-full transition-all duration-300 ease-out"
                  style={{
                    width: `${progressPercent}%`,
                    background: 'linear-gradient(135deg, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C)',
                    boxShadow: '0 0 15px rgba(191, 149, 63, 0.6)'
                  }}
                />
              </div>
            </div>

            {/* Claim Button */}
            <button
              onClick={handleCollect}
              disabled={claiming || !farmStatus?.accumulated_ar || farmStatus.accumulated_ar <= 0}
              className="w-full h-[60px] rounded-2xl relative overflow-hidden transition-transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: farmStatus?.accumulated_ar && farmStatus.accumulated_ar > 0
                  ? 'linear-gradient(180deg, #FBF5B7 0%, #BF953F 20%, #B38728 50%, #AA771C 100%)'
                  : 'linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%)',
                boxShadow: farmStatus?.accumulated_ar && farmStatus.accumulated_ar > 0
                  ? '0 0 25px rgba(191, 149, 63, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.8), inset 0 -2px 0 rgba(0, 0, 0, 0.2)'
                  : 'inset 0 1px 0 rgba(255,255,255,0.05)'
              }}
            >
              {farmStatus?.accumulated_ar && farmStatus.accumulated_ar > 0 && (
                <div
                  className="absolute top-0 left-0 right-0 h-[30px] pointer-events-none"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.1) 100%)',
                    borderRadius: '16px 16px 100% 100% / 12px 12px 10px 10px'
                  }}
                />
              )}
              <div className="relative z-10 flex items-center justify-center gap-2 text-lg font-black uppercase tracking-wide">
                <span
                  className={farmStatus?.accumulated_ar && farmStatus.accumulated_ar > 0 ? 'text-[#3E2723]' : 'text-zinc-600'}
                  style={farmStatus?.accumulated_ar && farmStatus.accumulated_ar > 0 ? { textShadow: '0 1px 0 rgba(255,255,255,0.4)' } : {}}
                >
                  {claiming ? 'Собираем...' : `СОБРАТЬ ${(farmStatus?.accumulated_ar || 0).toFixed(2)} AR`}
                </span>
              </div>
            </button>
          </div>

          {/* Equipment Section */}
          <div className="flex items-center gap-2.5 mb-4">
            <img src="/icons/FERMA2.png" className="w-6 h-6" alt="Equipment" />
            <span className="text-white text-lg font-bold">Оборудование</span>
          </div>

          {/* Equipment List - All equipment */}
          <div className="flex flex-col gap-3 mb-6">
            {allEquipment.map((eq) => {
              const location = farmState?.locations?.find(l => l.slug === eq.location_slug)
              const locationPurchased = location?.purchased || eq.location_slug === 'dorm'

              return (
                <div
                  key={eq.slug}
                  className="bg-zinc-900/50 backdrop-blur-md rounded-2xl p-4 flex items-center gap-4 border border-yellow-500/20 transition-all"
                  style={{
                    background: 'linear-gradient(180deg, #1a1a1a 0%, #111 100%)',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                    opacity: locationPurchased ? 1 : 0.5
                  }}
                >
                  {/* Icon */}
                  <div className="w-[50px] h-[50px] bg-black rounded-xl border border-white/10 flex items-center justify-center flex-shrink-0">
                    <img
                      src={eq.icon}
                      alt={eq.name}
                      className="w-8 h-8 object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/icons/FERMA2.png' }}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="text-white text-base font-bold mb-1">
                      {eq.name}
                      <span className="text-xs text-zinc-500 ml-1.5">
                        {eq.owned_quantity}/{eq.max_quantity} шт
                      </span>
                    </div>
                    <div
                      className="text-sm text-[#FCF6BA] flex items-center gap-1"
                      style={{ textShadow: '0 0 5px rgba(191, 149, 63, 0.5)' }}
                    >
                      {eq.income_per_unit} AR/ч за шт
                      {eq.owned_quantity > 0 && (
                        <span className="text-zinc-400 ml-1">
                          (всего: {eq.total_income.toFixed(1)} AR/ч)
                        </span>
                      )}
                    </div>
                    {!locationPurchased && location && (
                      <div className="text-xs text-zinc-600 mt-1">
                        Требуется: {location.name}
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div>
                    {!locationPurchased ? (
                      <span className="text-xs text-zinc-600">🔒</span>
                    ) : eq.owned_quantity >= eq.max_quantity ? (
                      <span className="text-xs text-green-500 font-bold">MAX</span>
                    ) : (
                      <button
                        onClick={() => handlePurchaseEquipment(eq.slug)}
                        disabled={purchasing === eq.slug || !eq.can_buy}
                        className="bg-transparent border border-[#FFD700] text-[#FFD700] px-3 py-2 rounded-xl font-bold text-sm transition-all active:scale-95 active:bg-[#FFD700]/10 disabled:opacity-50"
                        style={{ boxShadow: '0 0 10px rgba(255, 215, 0, 0.15)' }}
                      >
                        {purchasing === eq.slug ? '...' : `${eq.price.toLocaleString()} BUL`}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Balance info */}
          {farmState && (
            <div className="text-center text-zinc-500 text-sm mb-4">
              Баланс: {farmState.balance_bul?.toLocaleString() || 0} BUL | {(farmState.balance_ar || 0).toFixed(2)} AR
            </div>
          )}
        </div>

        {/* Toast */}
        {toast.show && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50">
            <div className="flex items-center gap-3 px-6 py-4 bg-zinc-900/95 backdrop-blur-md border border-yellow-500/30 rounded-2xl shadow-lg">
              <div className="w-10 h-10 rounded-full bg-gradient-to-b from-[#FFD700] to-[#FFA500] flex items-center justify-center">
                <span className="text-black text-lg">✓</span>
              </div>
              <div>
                <p className="text-white font-bold text-lg">+{toast.amount.toFixed(2)} AR</p>
                <p className="text-gray-400 text-sm">Успешно собрано</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#0a0a0a]">
          {/* Close button */}
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={() => setShowLocationModal(false)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-800"
            >
              <span className="text-white text-xl">×</span>
            </button>
          </div>

          {/* Current location hero */}
          <div className="h-[35vh] relative">
            <img
              src={currentLocation.image}
              alt="Current location"
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = '/icons/locations/dormitory.png' }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-[#0a0a0a]" />
            <div className="absolute bottom-4 left-4">
              <p className="text-gray-400 text-sm">Текущая локация</p>
              <h2 className="text-white text-2xl font-bold">{currentLocation.name}</h2>
            </div>
          </div>

          {/* Locations list */}
          <div className="flex-1 px-4 pt-4 overflow-y-auto">
            <h3 className="text-white text-lg font-bold mb-4">Выбрать локацию</h3>
            <div className="space-y-3 pb-8">
              {farmState?.locations?.map((location) => (
                <div
                  key={location.slug}
                  onClick={() => {
                    if (location.is_current) return
                    if (location.purchased) {
                      handleSwitchLocation(location.slug)
                    } else if (location.can_purchase) {
                      handlePurchaseLocation(location.slug)
                    }
                  }}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                    location.is_current
                      ? 'bg-yellow-500/20 border border-yellow-500/50'
                      : location.purchased
                      ? 'bg-zinc-900 active:scale-[0.98]'
                      : location.can_purchase
                      ? 'bg-zinc-900 active:scale-[0.98]'
                      : 'bg-zinc-900/50 opacity-50'
                  }`}
                >
                  <img
                    src={location.image}
                    alt={location.name}
                    className="w-14 h-14 rounded-lg object-cover bg-zinc-800"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/icons/locations/dormitory.png' }}
                  />
                  <div className="flex-1">
                    <p className="text-white font-medium">{location.name}</p>
                    <p className="text-gray-500 text-sm">
                      {location.purchased
                        ? `${location.equipment_count}/${location.max_slots} шт оборудования`
                        : `${location.price.toLocaleString()} BUL`
                      }
                    </p>
                  </div>
                  <div>
                    {location.is_current ? (
                      <span className="text-yellow-500 text-sm font-bold">Текущая</span>
                    ) : location.purchased ? (
                      <span className="text-gray-400 text-sm">Выбрать →</span>
                    ) : location.can_purchase ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePurchaseLocation(location.slug)
                        }}
                        disabled={purchasing === location.slug}
                        className="text-yellow-500 text-sm font-bold"
                      >
                        {purchasing === location.slug ? '...' : `${location.price.toLocaleString()} BUL`}
                      </button>
                    ) : (
                      <span className="text-zinc-600 text-xs">🔒 Недостаточно BUL</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
