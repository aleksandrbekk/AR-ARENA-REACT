import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'

// 🎯 MOCK DATA — Заглушки для UI preview
const MOCK_LOCATIONS = [
  { id: 1, slug: 'dorm', name: 'Общага', price: 0, level: 1, slots: 3, image: '/icons/locations/dormitory.png', owned: true, active: true },
  { id: 2, slug: 'apartment', name: 'Апартаменты', price: 5000, level: 3, slots: 4, image: '/icons/locations/apartment.png', owned: true, active: false },
  { id: 3, slug: 'office', name: 'Офис', price: 15000, level: 5, slots: 5, image: '/icons/locations/office.png', owned: false, active: false },
  { id: 4, slug: 'datacenter', name: 'Дата-центр', price: 50000, level: 10, slots: 8, image: '/icons/locations/datacenter.png', owned: false, active: false }
]

type Location = (typeof MOCK_LOCATIONS)[number]

const MOCK_EQUIPMENT = [
  {
    id: 1,
    slug: 'miner-v1',
    name: 'Майнер v1',
    icon: '/icons/FERMA2.png',
    income: 50,
    level: 3,
    maxLevel: 10,
    upgradePrice: 2000,
    owned: true,
    locationOwned: true
  },
  {
    id: 2,
    slug: 'cooler',
    name: 'Кулер RGB',
    icon: '/icons/FERMA2.png',
    income: 25,
    level: 1,
    maxLevel: 5,
    upgradePrice: 1000,
    owned: true,
    locationOwned: true
  },
  {
    id: 3,
    slug: 'power-supply',
    name: 'Блок питания',
    icon: '/icons/FERMA2.png',
    income: 100,
    level: 0,
    maxLevel: 10,
    basePrice: 5000,
    owned: false,
    locationOwned: true
  },
  {
    id: 4,
    slug: 'server-rack',
    name: 'Серверная стойка',
    icon: '/icons/FERMA2.png',
    income: 200,
    level: 0,
    maxLevel: 15,
    basePrice: 15000,
    owned: false,
    locationOwned: false,
    locationName: 'Апартаменты'
  }
]

const MOCK_STATS = {
  incomePerHour: 150,
  accumulated: 450,
  maxAccumulated: 600,
  progressPercent: 75,
  timeElapsed: '3ч 0м / 4ч'
}

export function FarmPage() {
  const navigate = useNavigate()
  const locations = MOCK_LOCATIONS

  const [currentLocation, setCurrentLocation] = useState<Location>(() => {
    try {
      const savedId = localStorage.getItem('selectedLocationId')
      if (savedId && locations.length > 0) {
        const saved = locations.find((l) => l.id === Number(savedId))
        if (saved) return saved
      }
    } catch (e) {
      console.warn('Failed to read selectedLocationId on init:', e)
    }

    return locations.find((l) => l.active) ?? locations[0]
  })
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [accumulated, setAccumulated] = useState(MOCK_STATS.accumulated)
  const [timeDisplay] = useState(MOCK_STATS.timeElapsed)
  const [progressPercent, setProgressPercent] = useState(MOCK_STATS.progressPercent)
  const [toast, setToast] = useState<{ show: boolean; amount: number }>({ show: false, amount: 0 })

  // Restore выбранную локацию (временно через localStorage)
  useEffect(() => {
    try {
      const savedLocationId = localStorage.getItem('selectedLocationId')
      if (!savedLocationId || locations.length === 0) return
      const saved = locations.find((l) => l.id === Number(savedLocationId))
      if (saved) setCurrentLocation(saved)
    } catch (e) {
      console.warn('Failed to restore selectedLocationId:', e)
    }
  }, [locations])

  // Telegram BackButton: показываем "← Назад" вместо "X Закрыть"
  useEffect(() => {
    const tg = window.Telegram?.WebApp

    if (tg) {
      tg.BackButton.show()

      const handleBack = () => {
        navigate(-1)
      }

      tg.BackButton.onClick(handleBack)

      return () => {
        tg.BackButton.offClick(handleBack)
        tg.BackButton.hide()
      }
    }
  }, [navigate])

  // Mock таймер для анимации прогресс-бара
  useEffect(() => {
    // Правильный расчёт: (150 BUL/час ÷ 3600 секунд) × 10 секунд = 0.4166 BUL за обновление
    const incomePerSecond = MOCK_STATS.incomePerHour / 3600
    const updateInterval = 10000 // Обновлять каждые 10 секунд
    const incomePerUpdate = incomePerSecond * (updateInterval / 1000)

    const interval = setInterval(() => {
      setAccumulated(prev => {
        const newValue = prev + incomePerUpdate
        return newValue > MOCK_STATS.maxAccumulated ? MOCK_STATS.maxAccumulated : newValue
      })

      setProgressPercent(() => {
        const newPercent = (accumulated / MOCK_STATS.maxAccumulated) * 100
        return Math.min(newPercent, 100)
      })
    }, updateInterval)

    return () => clearInterval(interval)
  }, [accumulated])

  const handleCollect = () => {
    const claimedAmount = Math.floor(accumulated)
    console.log('🎯 Mock: Собрать награду', claimedAmount)
    setToast({ show: true, amount: claimedAmount })
    setTimeout(() => setToast({ show: false, amount: 0 }), 2500)
    setAccumulated(0)
    setProgressPercent(0)
  }

  const selectLocation = (location: Location) => {
    console.log('🎯 Mock: Сменить локацию на', location.name)
    setCurrentLocation(location)

    try {
      localStorage.setItem('selectedLocationId', String(location.id))
    } catch (e) {
      console.warn('Failed to save selectedLocationId:', e)
    }

    setShowLocationModal(false)
  }

  const handlePurchaseEquipment = (slug: string) => {
    console.log('🎯 Mock: Купить оборудование', slug)
    alert(`Покупка ${slug} (MOCK)`)
  }

  const handleUpgradeEquipment = (slug: string) => {
    console.log('🎯 Mock: Улучшить оборудование', slug)
    alert(`Улучшение ${slug} (MOCK)`)
  }

  const handlePurchaseLocation = (slug: string) => {
    console.log('🎯 Mock: Купить локацию', slug)
    alert(`Покупка локации ${slug} (MOCK)`)
  }

  return (
    <Layout hideNavbar>
      {/* Контейнер страницы БЕЗ верхнего padding (hero-картинка от самого верха) */}
      <div
        className="min-h-screen bg-[#0a0a0a]"
        style={{
          // Компенсируем padding-top из Layout, чтобы картинка начиналась от верхней кромки
          marginTop: 'calc(var(--safe-area-top) * -1)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 20px) + 80px)',
        }}
      >
        {/* Картинка локации — от самого верха */}
        <div className="relative w-full h-[280px]">
          <img
            src={currentLocation.image}
            alt={currentLocation.name}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = '/icons/locations/dormitory.png' }}
          />

          {/* Gradient overlay внизу картинки */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0a0a0a] to-transparent" />

          {/* Название + кнопка Сменить — поверх gradient */}
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
            <div>
              <h1 className="text-white text-xl font-bold">{currentLocation.name}</h1>
              <p className="text-gray-400 text-sm">Lvl {currentLocation.level}</p>
            </div>
            <button
              onClick={() => setShowLocationModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800/80 backdrop-blur rounded-full text-white text-sm active:scale-95 transition-transform"
            >
              <span>Сменить</span>
            </button>
          </div>
        </div>

        {/* Остальной контент — с отступами */}
        <div className="px-4 pt-4">

          {/* STATS PANEL — Панель статистики */}
          <div
            className="rounded-3xl p-6 mb-6 border border-white/5"
            style={{
              background: `
                linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.2)),
                repeating-linear-gradient(
                  0deg,
                  #1c1c1c 0px,
                  #1c1c1c 1px,
                  #252525 2px,
                  #252525 3px
                )
              `,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 10px 30px rgba(0,0,0,0.5)'
            }}
          >
            {/* Доход в час */}
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
                {MOCK_STATS.incomePerHour} <img src="/icons/BUL.png" className="w-5 h-5" alt="BUL" />
              </div>
            </div>

            {/* Progress Container */}
            <div className="mb-5">
              <div className="flex justify-between text-sm text-zinc-500 font-semibold mb-2">
                <span>{timeDisplay}</span>
                <span
                  className="text-[#FCF6BA]"
                  style={{ textShadow: '0 0 10px rgba(191, 149, 63, 0.5)' }}
                >
                  +{Math.floor(accumulated).toLocaleString()} BUL
                </span>
              </div>

              {/* Progress Bar */}
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

            {/* CLAIM BUTTON — Золотой градиент */}
            <button
              onClick={handleCollect}
              disabled={accumulated <= 0}
              className="w-full h-[60px] rounded-2xl relative overflow-hidden transition-transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: accumulated > 0
                  ? 'linear-gradient(180deg, #FBF5B7 0%, #BF953F 20%, #B38728 50%, #AA771C 100%)'
                  : 'linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%)',
                boxShadow: accumulated > 0
                  ? '0 0 25px rgba(191, 149, 63, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.8), inset 0 -2px 0 rgba(0, 0, 0, 0.2)'
                  : 'inset 0 1px 0 rgba(255,255,255,0.05)'
              }}
            >
              {/* Glass highlight */}
              {accumulated > 0 && (
                <div
                  className="absolute top-0 left-0 right-0 h-[30px] pointer-events-none"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.1) 100%)',
                    borderRadius: '16px 16px 100% 100% / 12px 12px 10px 10px'
                  }}
                />
              )}

              <div className="relative z-10 flex items-center justify-center gap-2 text-lg font-black uppercase tracking-wide">
                <img src="/icons/BUL.png" className="w-6 h-6" alt="BUL" />
                <span
                  className={accumulated > 0 ? 'text-[#3E2723]' : 'text-zinc-600'}
                  style={accumulated > 0 ? { textShadow: '0 1px 0 rgba(255,255,255,0.4)' } : {}}
                >
                  СОБРАТЬ {Math.floor(accumulated).toLocaleString()} BUL
                </span>
              </div>
            </button>
          </div>

          {/* EQUIPMENT SECTION — Оборудование */}
          <div className="flex items-center gap-2.5 mb-4">
            <img src="/icons/FERMA2.png" className="w-6 h-6" alt="Equipment" />
            <span className="text-white text-lg font-bold">Оборудование</span>
          </div>

          {/* Equipment List */}
          <div className="flex flex-col gap-3 mb-6">
            {MOCK_EQUIPMENT.map((eq) => (
              <div
                key={eq.id}
                className="bg-zinc-900/50 backdrop-blur-md rounded-2xl p-4 flex items-center gap-4 border border-yellow-500/20 transition-all active:scale-[0.98] active:border-yellow-500/60"
                style={{
                  background: 'linear-gradient(180deg, #1a1a1a 0%, #111 100%)',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                  opacity: eq.locationOwned ? 1 : 0.5
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
                    {eq.owned && (
                      <span className="text-xs text-zinc-500 ml-1.5">
                        Lvl {eq.level}
                      </span>
                    )}
                  </div>
                  <div
                    className="text-sm text-[#FCF6BA] flex items-center gap-1"
                    style={{ textShadow: '0 0 5px rgba(191, 149, 63, 0.5)' }}
                  >
                    {eq.income.toLocaleString()}
                    <img src="/icons/BUL.png" className="w-3 h-3" alt="BUL" />
                    /ч
                  </div>
                </div>

                {/* Action Button */}
                <div>
                  {!eq.locationOwned ? (
                    <span className="text-xs text-zinc-600">
                      Снимите {eq.locationName?.toLowerCase()}
                    </span>
                  ) : !eq.owned ? (
                    <button
                      onClick={() => handlePurchaseEquipment(eq.slug)}
                      className="bg-transparent border border-[#FFD700] text-[#FFD700] px-4 py-2 rounded-xl font-bold text-sm transition-all active:scale-95 active:bg-[#FFD700]/10"
                      style={{ boxShadow: '0 0 10px rgba(255, 215, 0, 0.15)' }}
                    >
                      {eq.basePrice?.toLocaleString()} BUL
                    </button>
                  ) : eq.level < eq.maxLevel ? (
                    <button
                      onClick={() => handleUpgradeEquipment(eq.slug)}
                      className="bg-transparent border border-[#4facfe] text-[#4facfe] px-4 py-2 rounded-xl font-bold text-sm transition-all active:scale-95"
                    >
                      {eq.upgradePrice?.toLocaleString()} BUL
                    </button>
                  ) : (
                    <span className="text-xs text-zinc-600 font-bold">MAX</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Toast уведомление */}
        {toast.show && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50">
            <div className="flex items-center gap-3 px-6 py-4 bg-zinc-900/95 backdrop-blur-md border border-yellow-500/30 rounded-2xl shadow-lg">
              <div className="w-10 h-10 rounded-full bg-gradient-to-b from-[#FFD700] to-[#FFA500] flex items-center justify-center">
                <span className="text-black text-lg">✓</span>
              </div>
              <div>
                <p className="text-white font-bold text-lg">+{toast.amount} AR</p>
                <p className="text-gray-400 text-sm">Успешно собрано</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* LOCATION MODAL — Модалка выбора локации */}
      {showLocationModal && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-end"
          onClick={() => setShowLocationModal(false)}
        >
          <div
            className="w-full bg-zinc-900 rounded-t-3xl p-6 border-t border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-5">
              <span className="text-white text-xl font-bold">Локации</span>
              <button
                onClick={() => setShowLocationModal(false)}
                className="text-white text-3xl leading-none"
              >
                &times;
              </button>
            </div>

            {/* Locations List */}
            <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
              {MOCK_LOCATIONS.map((loc) => {
                const isCurrent = loc.id === currentLocation.id
                const isUnlocked = loc.owned || loc.id === 1 || MOCK_LOCATIONS[loc.id - 2]?.owned

                return (
                  <div
                    key={loc.id}
                    className={`flex items-center gap-3 p-3 bg-zinc-800 rounded-2xl border transition-all ${
                      isCurrent ? 'border-[#4facfe]' : 'border-yellow-500/20'
                    }`}
                    style={{ opacity: isUnlocked ? 1 : 0.5 }}
                  >
                    {/* Картинка должна быть видна */}
                    <img
                      src={loc.image}
                      alt={loc.name}
                      className="w-16 h-16 rounded-lg object-cover bg-zinc-800"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).src = '/icons/skins/Bull1.png'
                      }}
                    />

                    <div className="flex-1">
                      <p className="text-white font-medium">{loc.name}</p>
                      <p className="text-zinc-500 text-sm">
                        {loc.owned ? 'Куплено' : `${loc.price.toLocaleString()} BUL`}
                      </p>
                    </div>

                    {/* Action */}
                    {loc.owned ? (
                      isCurrent ? (
                        <span className="text-[#4facfe] text-sm font-semibold">Текущая</span>
                      ) : (
                        <button
                          onClick={() => selectLocation(loc)}
                          className="text-[#4facfe] text-sm font-semibold cursor-pointer"
                        >
                          Выбрать
                        </button>
                      )
                    ) : isUnlocked ? (
                      <button
                        onClick={() => handlePurchaseLocation(loc.slug)}
                        className="text-[#FFD700] text-sm font-semibold cursor-pointer"
                      >
                        {loc.price.toLocaleString()} BUL
                      </button>
                    ) : (
                      <span className="text-xs text-zinc-600">
                        Сначала {MOCK_LOCATIONS[loc.id - 2]?.name}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
