---
name: ar-arena-design-system
description: Дизайн-система AR Arena — dark glassmorphism, криптовалютная эстетика, Telegram Mini App. Используй при создании UI компонентов для AR Arena.
---

# AR Arena Design System

## Цветовая палитра

### Основные цвета
```css
--ar-black: #0a0a0a       /* Основной фон */
--ar-dark: #141414        /* Вторичный фон */
--ar-gold: #FFD700        /* Акцент, премиум */
--ar-orange: #FFA500      /* Призы, награды */
--ar-green: #38EF7D       /* Успех, выигрыш */
--ar-red: #FF4757         /* Ошибки, потери */
--ar-purple: #764BA2      /* Особые элементы */
```

### Стеклянные эффекты
```css
.glass-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

## Визуальный стиль

### Dark Glassmorphism
- Фон: чисто чёрный (#0a0a0a)
- Карточки: полупрозрачные с blur
- Свечения: green (#38EF7D) и gold (#FFD700)
- Границы: white/10, при hover white/20

### Типографика
- Font: system-ui, -apple-system, sans-serif
- Заголовки: bold, крупные
- Цифры: золотой градиент для сумм

### Анимации
```css
/* Встряска при ошибке */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px) rotate(-2deg); }
  75% { transform: translateX(5px) rotate(2deg); }
}

/* Конфетти при выигрыше */
@keyframes confetti {
  0% { transform: translateY(-10px); opacity: 1; }
  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
}

/* Искры */
@keyframes spark {
  0% { transform: scale(0); opacity: 1; }
  100% { transform: scale(1); opacity: 0; }
}
```

## Компоненты

### Кнопки
```tsx
// Главная CTA — золотой градиент
<button className="bg-gradient-to-r from-ar-gold to-ar-orange text-black font-bold py-4 px-8 rounded-xl shadow-lg shadow-ar-gold/30">
  Участвовать
</button>

// Вторичная — glass
<button className="glass-card text-white py-3 px-6 rounded-xl hover:bg-white/10">
  Подробнее
</button>
```

### Карточки
```tsx
// Приз
<div className="glass-card rounded-2xl p-6">
  <div className="text-4xl mb-2">🎁</div>
  <p className="text-ar-gold text-2xl font-bold">50,000 ₽</p>
  <p className="text-gray-400 text-sm">Главный приз</p>
</div>

// Статистика
<div className="glass-card rounded-xl p-4 flex items-center gap-3">
  <div className="w-12 h-12 rounded-full bg-ar-green/20 flex items-center justify-center">
    <span className="text-ar-green text-xl">🏆</span>
  </div>
  <div>
    <p className="text-2xl font-bold text-white">1,247</p>
    <p className="text-xs text-gray-400">Участников</p>
  </div>
</div>
```

### Свечения и акценты
```tsx
// Glow эффект
<div className="relative">
  <div className="absolute inset-0 bg-ar-gold/20 blur-2xl" />
  <div className="relative glass-card">...</div>
</div>

// Gradient text
<span className="bg-gradient-to-r from-ar-gold to-ar-orange bg-clip-text text-transparent">
  Крипто розыгрыш
</span>
```

## Telegram Mini App паттерны

### Safe Areas
```css
:root {
  --safe-area-top: env(safe-area-inset-top, 0px);
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
}

.app-container {
  padding-top: var(--safe-area-top);
  padding-bottom: var(--safe-area-bottom);
}
```

### Haptic Feedback
```typescript
import { haptic } from '@/lib/haptic'

// На tap
haptic.tap()

// На успех
haptic.success()

// На ошибку
haptic.error()
```

### Bottom Navigation
```tsx
<nav className="fixed bottom-0 left-0 right-0 glass-card border-t border-white/10 safe-bottom">
  <div className="flex justify-around py-3">
    {items.map(item => (
      <Link key={item.path} to={item.path} className={cn(
        "flex flex-col items-center gap-1",
        isActive ? "text-ar-gold" : "text-gray-400"
      )}>
        <item.icon size={22} />
        <span className="text-[10px]">{item.label}</span>
      </Link>
    ))}
  </div>
</nav>
```

## Стили для промо-материалов

### 5 визуальных стилей (см. STYLE_AR_ARENA/prompts.md):
1. **Dark Glassmorphism** — матовое стекло, Binance эстетика
2. **Neon Cyberpunk** — яркий неон, агрессивный контраст
3. **Liquid Gold Dark** — чёрный + жидкое золото, luxury
4. **Deep Space Trading** — космос, эпический масштаб
5. **Brutal Minimalist Dark** — жёсткий минимализм, большая типографика

### Ключевые визуальные элементы:
- Candlestick charts (свечные графики)
- Floating 3D coins (Bitcoin, AR coins)
- Green/red свечения
- Glassmorphism карточки
- Holographic интерфейсы

## Иконки и эмодзи

Используемые эмодзи:
- 🎁 Приз
- 🏆 Победа
- 💰 Деньги
- 🔥 Хот
- ⚡ Быстро
- 🎯 Цель
- 🚀 Запуск
- 💎 Премиум
- 🎲 Лотерея
- 🎰 Розыгрыш

## Принципы

1. **Dark first** — всегда тёмный фон
2. **Glass over solid** — стекло вместо солидных блоков
3. **Glow for emphasis** — свечения для акцентов
4. **Gold = premium** — золото для важного
5. **Crypto aesthetic** — Binance/Bybit вдохновение
6. **Mobile first** — TMA приоритет
