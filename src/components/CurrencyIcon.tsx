/**
 * CurrencyIcon - Компонент для отображения иконки AR валюты
 */

interface CurrencyIconProps {
  type?: 'AR';
  className?: string;
}

export function CurrencyIcon({ className = 'w-4 h-4' }: CurrencyIconProps) {
  return (
    <img
      src="/icons/arcoin.png"
      alt="AR Coin"
      className={`object-contain ${className}`}
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        target.style.display = 'none';
        const fallback = document.createElement('div');
        fallback.className = `rounded-full bg-gray-500 ${className}`;
        target.parentNode?.appendChild(fallback);
      }}
    />
  );
}
