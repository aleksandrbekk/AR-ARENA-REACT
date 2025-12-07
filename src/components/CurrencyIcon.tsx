/**
 * CurrencyIcon - Надежный компонент для отображения иконок валют
 * ПРОМТ 2 (Аня - Logic): Решает проблему пустых квадратов []
 */

interface CurrencyIconProps {
  type: 'AR' | 'BUL';
  className?: string;
}

export function CurrencyIcon({ type, className = 'w-4 h-4' }: CurrencyIconProps) {
  const iconPath = type === 'AR' ? '/icons/arcoin.png' : '/icons/BUL.png';
  const altText = type === 'AR' ? 'AR Coin' : 'BUL Coin';

  return (
    <img
      src={iconPath}
      alt={altText}
      className={`object-contain ${className}`}
      onError={(e) => {
        // Fallback: если картинка не загрузилась, показываем серый круг
        const target = e.target as HTMLImageElement;
        target.style.display = 'none';
        const fallback = document.createElement('div');
        fallback.className = `rounded-full bg-gray-500 ${className}`;
        target.parentNode?.appendChild(fallback);
      }}
    />
  );
}
