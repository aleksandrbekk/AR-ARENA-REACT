interface BalanceDisplayProps {
  balance: number
}

export function BalanceDisplay({ balance }: BalanceDisplayProps) {
  // Форматируем число с разделителями тысяч
  const formattedBalance = balance.toLocaleString('ru-RU')

  return (
    <div className="flex items-center justify-center gap-2">
      <img 
        src="/icons/BUL.png" 
        alt="BUL" 
        className="w-8 h-8 object-contain drop-shadow-[0_0_10px_rgba(255,215,0,0.3)]"
      />
      <span className="text-4xl font-bold bg-gradient-to-r from-[#FFD700] to-[#FFA500] bg-clip-text text-transparent drop-shadow-sm">
        {formattedBalance}
      </span>
    </div>
  )
}
