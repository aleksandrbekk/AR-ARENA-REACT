---
trigger: always_on
---

# AR ARENA Design System

## Цвета

### Основные
- Фон: #0a0a0a (с лёгкой радиальной виньеткой, не плоский чёрный)
- Золото: #FFD700
- Оранжевый: #FFA500

### Правило золота — ЭТО АКЦЕНТ, НЕ ФОН!
✅ Золотое: CTA кнопки, цифра баланса, обводка карточек (20% opacity)
❌ НЕ золотое: весь текст, все иконки, фоны блоков

### Текст
- Основной: #FFFFFF
- Вторичный: #999999
- На золотых кнопках: #000000 (чёрный, жирный)

## Кнопки CTA
- Градиент: bg-gradient-to-b from-[#FFD700] to-[#FFA500]
- Текст: чёрный, font-weight: 600
- Border-radius: 12px

## Карточки (Glassmorphism)
- Фон: bg-zinc-900/50
- Блюр: backdrop-blur-md
- Бордер: border border-yellow-500/20

## Safe Area (Telegram Mini App)
- padding-top: 60px минимум (или env(safe-area-inset-top))
- Не размещать кликабельные элементы в зоне 0-60px сверху

## Иконки
- Путь: /public/icons/ (в коде: /icons/...)
- Скины: /public/icons/skins/
- ⛔ ЗАПРЕЩЕНО: lucide-react, heroicons, FontAwesome, emoji, CDN

## Шрифты
- Sans-serif, строгие
- Заголовки: tracking-wide (разрядка)
- Цифры: font-variant-numeric: tabular-nums