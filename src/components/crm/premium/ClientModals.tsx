import type { PremiumClient, PaymentRecord, Giveaway, TicketTarget } from './types'
import { getDaysRemaining, formatFullDate, formatAmount, getPremiumInitial } from './helpers'

// ============ CLIENT MODAL ============
interface ClientModalProps {
  client: PremiumClient
  generatingInvite: boolean
  onClose: () => void
  onSendLinks: () => void
  onAddDays: (days: number) => void
  onEditDate: () => void
  onGrantTicket: () => void
  onDelete: () => void
}

export function ClientModal({
  client,
  generatingInvite,
  onClose,
  onSendLinks,
  onAddDays,
  onEditDate,
  onGrantTicket,
  onDelete
}: ClientModalProps) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end justify-center z-50">
      <div className="bg-zinc-900 rounded-t-3xl w-full max-w-lg p-6 pb-8 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {client.avatar_url ? (
              <img src={client.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-white/60 font-bold text-lg">
                {getPremiumInitial(client)}
              </div>
            )}
            <div>
              <div className="font-bold text-white">
                {client.username ? `@${client.username}` : client.first_name || 'Без имени'}
              </div>
              <div className="text-sm text-white/40">{client.telegram_id}</div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-white/60 text-2xl">×</button>
        </div>

        {/* Инфо */}
        <div className="space-y-3 mb-6">
          <div className="flex justify-between">
            <span className="text-white/40">Тариф</span>
            <span className="text-white font-medium">{client.plan}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40">Истекает</span>
            <span className="text-white font-medium">{formatFullDate(client.expires_at)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40">Осталось</span>
            <span className={`font-medium ${getDaysRemaining(client.expires_at) <= 7 ? 'text-orange-400' : 'text-emerald-400'}`}>
              {getDaysRemaining(client.expires_at)} дней
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40">Оплачено</span>
            <span className="text-white font-medium">{formatAmount(client)}</span>
          </div>
        </div>

        {/* Действия */}
        <div className="space-y-2">
          <button
            onClick={onSendLinks}
            disabled={generatingInvite}
            className="w-full py-3 bg-emerald-600 text-white font-medium rounded-xl disabled:opacity-50"
          >
            {generatingInvite ? 'Генерация...' : 'Отправить ссылки'}
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => onAddDays(7)}
              className="flex-1 py-2 bg-zinc-800 text-white text-sm rounded-xl"
            >
              +7 дней
            </button>
            <button
              onClick={() => onAddDays(30)}
              className="flex-1 py-2 bg-zinc-800 text-white text-sm rounded-xl"
            >
              +30 дней
            </button>
            <button
              onClick={onEditDate}
              className="flex-1 py-2 bg-zinc-800 text-white text-sm rounded-xl"
            >
              Изменить
            </button>
          </div>

          <button
            onClick={onGrantTicket}
            className="w-full py-3 bg-[#FFD700] text-black font-medium rounded-xl"
          >
            Выдать билет
          </button>

          <button
            onClick={onDelete}
            className="w-full py-3 bg-red-600/20 text-red-400 font-medium rounded-xl"
          >
            Удалить клиента
          </button>
        </div>
      </div>
    </div>
  )
}

// ============ ADD CLIENT MODAL ============
interface AddClientModalProps {
  clientId: string
  amount: string
  noPayment: boolean
  period: '30' | '90' | '180' | '365' | 'custom'
  customDate: string
  source: 'lava.top' | '0xprocessing' | 'manual'
  currency: 'RUB' | 'USD' | 'EUR' | 'USDT'
  adding: boolean
  onClientIdChange: (v: string) => void
  onAmountChange: (v: string) => void
  onNoPaymentChange: (v: boolean) => void
  onPeriodChange: (v: '30' | '90' | '180' | '365' | 'custom') => void
  onCustomDateChange: (v: string) => void
  onSourceChange: (v: 'lava.top' | '0xprocessing' | 'manual') => void
  onCurrencyChange: (v: 'RUB' | 'USD' | 'EUR' | 'USDT') => void
  onSubmit: () => void
  onClose: () => void
}

export function AddClientModal({
  clientId,
  amount,
  noPayment,
  period,
  customDate,
  source,
  currency,
  adding,
  onClientIdChange,
  onAmountChange,
  onNoPaymentChange,
  onPeriodChange,
  onCustomDateChange,
  onSourceChange,
  onCurrencyChange,
  onSubmit,
  onClose
}: AddClientModalProps) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end justify-center z-50">
      <div className="bg-zinc-900 rounded-t-3xl w-full max-w-lg p-6 pb-8 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Добавить клиента</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-white/60 text-2xl">×</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-white/50 text-sm mb-2 block">Telegram ID или @username</label>
            <input
              type="text"
              value={clientId}
              onChange={e => onClientIdChange(e.target.value)}
              placeholder="123456789 или @username"
              className="w-full bg-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
            />
          </div>

          <div>
            <label className="text-white/50 text-sm mb-2 block">Период</label>
            <select
              value={period}
              onChange={e => onPeriodChange(e.target.value as typeof period)}
              className="w-full bg-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none"
            >
              <option value="30">1 месяц (Classic)</option>
              <option value="90">3 месяца (Gold)</option>
              <option value="180">6 месяцев (Platinum)</option>
              <option value="365">12 месяцев</option>
              <option value="custom">Своя дата</option>
            </select>
          </div>

          {period === 'custom' && (
            <div>
              <label className="text-white/50 text-sm mb-2 block">Дата окончания</label>
              <input
                type="date"
                value={customDate}
                onChange={e => onCustomDateChange(e.target.value)}
                className="w-full bg-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none"
              />
            </div>
          )}

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="noPayment"
              checked={noPayment}
              onChange={e => onNoPaymentChange(e.target.checked)}
              className="w-5 h-5 accent-[#FFD700]"
            />
            <label htmlFor="noPayment" className="text-white/70">Без оплаты (подарок)</label>
          </div>

          {!noPayment && (
            <>
              <div>
                <label className="text-white/50 text-sm mb-2 block">Сумма</label>
                <input
                  type="number"
                  value={amount}
                  onChange={e => onAmountChange(e.target.value)}
                  placeholder="0"
                  className="w-full bg-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none"
                />
              </div>

              <div className="flex gap-2">
                {(['USDT', 'RUB', 'USD', 'EUR'] as const).map(cur => (
                  <button
                    key={cur}
                    onClick={() => onCurrencyChange(cur)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${currency === cur ? 'bg-[#FFD700] text-black' : 'bg-zinc-800 text-white/60'}`}
                  >
                    {cur}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-white/50 text-sm mb-2 block">Источник</label>
                <select
                  value={source}
                  onChange={e => onSourceChange(e.target.value as typeof source)}
                  className="w-full bg-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none"
                >
                  <option value="manual">Вручную</option>
                  <option value="lava.top">Lava.top</option>
                  <option value="0xprocessing">0xProcessing</option>
                </select>
              </div>
            </>
          )}

          <button
            onClick={onSubmit}
            disabled={adding || !clientId.trim()}
            className="w-full py-4 bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black font-bold rounded-xl disabled:opacity-50 active:scale-[0.98] transition-transform"
          >
            {adding ? 'Добавление...' : 'Добавить'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============ EDIT DATE MODAL ============
interface EditDateModalProps {
  client: PremiumClient
  dateValue: string
  onDateChange: (v: string) => void
  onSubmit: () => void
  onClose: () => void
}

export function EditDateModal({
  client,
  dateValue,
  onDateChange,
  onSubmit,
  onClose
}: EditDateModalProps) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-zinc-900 rounded-2xl w-full max-w-sm p-6 border border-white/10">
        <h3 className="text-xl font-bold text-white mb-4">Изменить дату окончания</h3>
        <p className="text-white/40 text-sm mb-4">
          Текущая дата: {formatFullDate(client.expires_at)}
        </p>
        <input
          type="date"
          value={dateValue}
          onChange={e => onDateChange(e.target.value)}
          className="w-full bg-zinc-800 text-white rounded-xl px-4 py-3 mb-6 focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
        />
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-zinc-800 text-white rounded-xl font-medium"
          >
            Отмена
          </button>
          <button
            onClick={onSubmit}
            className="flex-1 py-3 bg-[#FFD700] text-black rounded-xl font-bold"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  )
}

// ============ PAYMENTS MODAL ============
interface PaymentsModalProps {
  paymentHistory: PaymentRecord[]
  selectedPeriod: '5-22' | '23-4'
  onPeriodChange: (p: '5-22' | '23-4') => void
  onClose: () => void
}

export function PaymentsModal({
  paymentHistory,
  selectedPeriod,
  onPeriodChange,
  onClose
}: PaymentsModalProps) {
  // Определяем границы периодов
  const now = new Date()
  const currentDay = now.getDate()
  const currentMonthIdx = now.getMonth()
  const currentYear = now.getFullYear()

  let startDate: Date, endDate: Date
  if (selectedPeriod === '5-22') {
    startDate = new Date(currentYear, currentMonthIdx, 5, 0, 0, 0)
    endDate = new Date(currentYear, currentMonthIdx, 22, 23, 59, 59)
  } else {
    if (currentDay >= 23) {
      startDate = new Date(currentYear, currentMonthIdx, 23, 0, 0, 0)
      endDate = new Date(currentYear, currentMonthIdx + 1, 4, 23, 59, 59)
    } else {
      startDate = new Date(currentYear, currentMonthIdx - 1, 23, 0, 0, 0)
      endDate = new Date(currentYear, currentMonthIdx, 4, 23, 59, 59)
    }
  }

  // Фильтруем платежи по периоду
  const periodPayments = paymentHistory.filter(p => {
    if (!p.created_at) return false
    const payDate = new Date(p.created_at)
    return payDate >= startDate && payDate <= endDate
  })

  // Считаем по валютам
  let rubTotal = 0, usdTotal = 0, eurTotal = 0, usdtTotal = 0
  periodPayments.forEach(p => {
    const amount = typeof p.amount === 'number' ? p.amount : parseFloat(String(p.amount)) || 0
    const currency = (p.currency || '').toUpperCase()
    const source = (p.source || '').toLowerCase()

    if (source === '0xprocessing' || currency.includes('USDT') || currency.includes('USDC')) {
      usdtTotal += amount
    } else if (currency === 'RUB') {
      rubTotal += amount
    } else if (currency === 'USD') {
      usdTotal += amount
    } else if (currency === 'EUR') {
      eurTotal += amount
    }
  })

  // Конвертация в USD
  const USD_RATE = 82
  const EUR_RATE = 1.13
  const rubInUsd = rubTotal / USD_RATE
  const eurInUsd = eurTotal * EUR_RATE
  const totalUsd = rubInUsd + usdTotal + usdtTotal + eurInUsd

  const formatDateShort = (d: Date) => d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-3xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Отчёт по выплатам</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-white/60 text-2xl hover:text-white"
          >
            ×
          </button>
        </div>

        {/* Выбор периода */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => onPeriodChange('5-22')}
            className={`flex-1 py-3 rounded-xl font-medium transition-all ${
              selectedPeriod === '5-22'
                ? 'bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black'
                : 'bg-zinc-800 text-white/60 hover:bg-zinc-700'
            }`}
          >
            5–22
          </button>
          <button
            onClick={() => onPeriodChange('23-4')}
            className={`flex-1 py-3 rounded-xl font-medium transition-all ${
              selectedPeriod === '23-4'
                ? 'bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black'
                : 'bg-zinc-800 text-white/60 hover:bg-zinc-700'
            }`}
          >
            23–4
          </button>
        </div>

        {/* Даты периода */}
        <div className="text-center text-white/50 text-sm mb-4">
          {formatDateShort(startDate)} — {formatDateShort(endDate)}
        </div>

        {/* Предупреждение */}
        {paymentHistory.length === 0 && (
          <div className="mb-4 p-3 bg-orange-500/20 border border-orange-500/30 rounded-xl text-orange-400 text-sm">
            История платежей пуста. Данные могут быть неполными.
          </div>
        )}

        {/* Суммы по валютам */}
        <div className="space-y-3 mb-6">
          <div className="flex justify-between items-center p-4 bg-zinc-800 rounded-xl">
            <span className="text-white/60">RUB</span>
            <div className="text-right">
              <div className="text-white font-bold">{Math.round(rubTotal).toLocaleString('ru-RU')} ₽</div>
              <div className="text-white/40 text-sm">≈ ${Math.round(rubInUsd).toLocaleString()}</div>
            </div>
          </div>
          <div className="flex justify-between items-center p-4 bg-zinc-800 rounded-xl">
            <span className="text-white/60">USD (фиат)</span>
            <div className="text-right">
              <div className="text-[#FFD700] font-bold">${Math.round(usdTotal).toLocaleString()}</div>
            </div>
          </div>
          <div className="flex justify-between items-center p-4 bg-zinc-800 rounded-xl">
            <span className="text-white/60">EUR</span>
            <div className="text-right">
              <div className="text-blue-400 font-bold">€{Math.round(eurTotal).toLocaleString()}</div>
              <div className="text-white/40 text-sm">≈ ${Math.round(eurInUsd).toLocaleString()}</div>
            </div>
          </div>
          <div className="flex justify-between items-center p-4 bg-zinc-800 rounded-xl">
            <span className="text-white/60">USDT (крипто)</span>
            <div className="text-right">
              <div className="text-emerald-400 font-bold">${Math.round(usdtTotal).toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Итого */}
        <div className="p-4 bg-gradient-to-b from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30 rounded-xl">
          <div className="flex justify-between items-center">
            <span className="text-emerald-400 font-medium">Итого USD</span>
            <span className="text-2xl font-bold text-emerald-400">${Math.round(totalUsd).toLocaleString()}</span>
          </div>
          <div className="text-white/40 text-xs mt-1">
            Курс: $1 = 82₽, €1 = $1.13
          </div>
        </div>

        {/* Количество платежей */}
        <div className="text-center text-white/40 text-sm mt-4">
          Платежей за период: {periodPayments.length}
        </div>
      </div>
    </div>
  )
}

// ============ TICKET MODAL ============
interface TicketModalProps {
  target: TicketTarget
  giveaways: Giveaway[]
  selectedGiveawayId: string
  granting: boolean
  onGiveawayChange: (id: string) => void
  onSubmit: () => void
  onClose: () => void
}

export function TicketModal({
  target,
  giveaways,
  selectedGiveawayId,
  granting,
  onGiveawayChange,
  onSubmit,
  onClose
}: TicketModalProps) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end justify-center z-[60]">
      <div className="bg-zinc-900 rounded-t-3xl w-full max-w-lg p-6 pb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Выдать билет</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-white/60 text-2xl">×</button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="text-white/50 text-sm mb-2 block">Пользователь</label>
            <div className="text-white font-medium text-lg">{target.name}</div>
            <div className="text-white/40 text-sm">{target.id}</div>
          </div>

          <div>
            <label className="text-white/50 text-sm mb-2 block">Выберите розыгрыш</label>
            {giveaways.length === 0 ? (
              <div className="text-white/30 italic">Нет активных розыгрышей</div>
            ) : (
              <div className="space-y-2">
                {giveaways.map(g => (
                  <label
                    key={g.id}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
                      selectedGiveawayId === g.id
                        ? 'bg-[#FFD700]/10 border-[#FFD700] text-white'
                        : 'bg-zinc-800 border-transparent text-white/60 hover:bg-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        checked={selectedGiveawayId === g.id}
                        onChange={() => onGiveawayChange(g.id)}
                        className="accent-[#FFD700] w-5 h-5"
                      />
                      <div className="font-medium">{g.title}</div>
                    </div>
                    <div className="text-sm bg-zinc-900 px-2 py-1 rounded text-white/40">{g.price} AR</div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={onSubmit}
            disabled={granting || giveaways.length === 0}
            className="w-full py-4 bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black font-bold rounded-xl disabled:opacity-50 active:scale-[0.98] transition-transform"
          >
            {granting ? 'Выдача...' : 'Выдать билет бесплатно'}
          </button>
        </div>
      </div>
    </div>
  )
}
