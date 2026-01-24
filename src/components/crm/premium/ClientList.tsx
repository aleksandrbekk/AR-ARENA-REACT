import type { PremiumClient } from './types'
import {
  getDaysRemaining,
  formatDate,
  formatAmount,
  getPremiumInitial,
  getDaysColor,
  getPlanStyle
} from './helpers'

// ============ PROPS ============
interface ClientListProps {
  clients: PremiumClient[]
  totalActive: number
  onSelectClient: (client: PremiumClient) => void
  onAddClient: () => void
}

// ============ КОМПОНЕНТ ============
export function ClientList({
  clients,
  totalActive,
  onSelectClient,
  onAddClient
}: ClientListProps) {
  return (
    <>
      {/* Кнопка добавления */}
      <button
        onClick={onAddClient}
        className="w-full py-3 bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black font-bold rounded-xl active:scale-[0.98] transition-transform"
      >
        + Добавить клиента
      </button>

      {/* Счётчик */}
      <div className="text-sm text-white/40">
        Показано: <span className="text-white">{clients.length}</span> из {totalActive} активных
      </div>

      {/* Список клиентов */}
      <div className="space-y-3">
        {clients.slice(0, 100).map((client) => {
          const days = getDaysRemaining(client.expires_at)
          const isExpired = days <= 0

          return (
            <div
              key={client.id}
              onClick={() => onSelectClient(client)}
              className={`bg-zinc-900 rounded-2xl p-4 cursor-pointer active:scale-[0.99] transition-transform ${isExpired ? 'opacity-60' : ''}`}
            >
              {/* Шапка: аватар + имя + план + дни */}
              <div className="flex items-center gap-3 mb-3">
                {client.avatar_url ? (
                  <img src={client.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-white/60 font-medium">
                    {getPremiumInitial(client)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {client.username ? `@${client.username}` : client.first_name || client.telegram_id}
                  </div>
                  <div className="text-xs text-white/40 font-mono">{client.telegram_id}</div>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${getPlanStyle(client.plan)}`}>
                  {client.plan || 'N/A'}
                </div>
                <div className="text-right ml-1">
                  <div className={`text-lg font-bold ${getDaysColor(days)}`}>
                    {isExpired ? 'Истёк' : `${days}д`}
                  </div>
                </div>
              </div>

              {/* Инфо: сумма + дата + статусы */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-white/60">{formatAmount(client)}</span>
                  <span className="text-white/30">до {formatDate(client.expires_at)}</span>
                </div>
                <div className="flex gap-1.5">
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                    client.in_channel ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-white/30'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${client.in_channel ? 'bg-emerald-400' : 'bg-white/30'}`} />
                    К
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                    client.in_chat ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-white/30'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${client.in_chat ? 'bg-emerald-400' : 'bg-white/30'}`} />
                    Ч
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        {clients.length === 0 && (
          <div className="bg-zinc-900 rounded-2xl py-12 text-center text-white/30">Ничего не найдено</div>
        )}
        {clients.length > 100 && (
          <div className="text-center text-white/30 text-sm py-2">
            Показаны первые 100 из {clients.length}
          </div>
        )}
      </div>
    </>
  )
}
