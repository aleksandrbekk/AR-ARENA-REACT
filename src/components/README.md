# Компоненты AR ARENA

## Header

Компонент для отображения информации о пользователе и баланса AR в верхней части страницы.

### Использование

```tsx
import { Header } from './components/Header'

function MyComponent() {
  return (
    <Header
      photoUrl="https://t.me/i/userpic/320/..."
      firstName="Alexander"
      balanceAr={1250}
    />
  )
}
```

### Пропсы

| Prop | Тип | Обязательный | Описание |
|------|-----|--------------|----------|
| `photoUrl` | `string \| undefined` | Нет | URL аватара пользователя из Telegram |
| `firstName` | `string` | Да | Имя пользователя |
| `balanceAr` | `number` | Да | Баланс AR для отображения |

### Внешний вид

```
┌──────────────────────────────────────────────┐
│  [👤] Александр           [AR] 1,250        │
│   ↑       ↑                ↑      ↑         │
│ аватар   имя            иконка  баланс      │
│ 40x40  16px              24x24  золото      │
└──────────────────────────────────────────────┘
```

### Особенности

- ✅ Аватар пользователя с золотой рамкой (40x40px)
- ✅ Fallback: первая буква имени на золотом градиенте
- ✅ Имя пользователя белым цветом (16px)
- ✅ Баланс AR с форматированием и иконкой (24x24px)
- ✅ Адаптивный layout (space-between)

### Аватар

**С фото:**
- Круглое изображение (rounded-full)
- Золотая рамка 2px (#FFD700)
- object-cover для правильного кадрирования

**Без фото (fallback):**
- Первая буква имени ЗАГЛАВНАЯ
- Градиентный фон #FFD700 → #FFA500
- Черный текст, жирный шрифт

### Стили (Tailwind CSS)

- **Контейнер**: `w-full flex justify-between items-center px-4 py-2`
- **Левая часть**: `flex items-center gap-2`
- **Правая часть**: `flex items-center gap-1`
- **Аватар с фото**: `w-10 h-10 rounded-full border-2 border-[#FFD700] object-cover`
- **Аватар fallback**: `w-10 h-10 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] flex items-center justify-center text-black font-bold`
- **Имя**: `text-white font-medium text-base`
- **Иконка AR**: `w-6 h-6 object-contain`
- **Баланс**: `text-[#FFD700] font-bold`

### Интеграция в проект

Компонент уже интегрирован в:
- `src/pages/Home.tsx` - шапка страницы

### Зависимости

- Иконка: `/icons/arcoin.png` (должна находиться в `public/icons/`)
- Tailwind CSS для стилизации

---

## BalanceDisplay

Компонент для отображения баланса BUL с градиентным текстом и иконкой.

### Использование

```tsx
import { BalanceDisplay } from './components/BalanceDisplay'

function MyComponent() {
  const balance = 3566
  
  return <BalanceDisplay balance={balance} />
}
```

### Пропсы

| Prop | Тип | Обязательный | Описание |
|------|-----|--------------|----------|
| `balance` | `number` | Да | Баланс BUL для отображения |

### Внешний вид

```
┌─────────────────────────────────┐
│    [🪙]  3,566                  │
│     ↑      ↑                    │
│  иконка  число                  │
│  32x32   36px bold              │
│         градиент                │
│      #FFD700 → #FFA500          │
└─────────────────────────────────┘
```

### Особенности

- ✅ Автоматическое форматирование чисел с разделителями тысяч
- ✅ Градиентный текст от золотого к оранжевому
- ✅ Адаптивный размер иконки (32x32px)
- ✅ Крупный шрифт для хорошей читаемости (36px)
- ✅ Гибкий layout на Flexbox

### Примеры форматирования

| Входное значение | Вывод |
|------------------|-------|
| `0` | `0` |
| `100` | `100` |
| `1000` | `1,000` |
| `3566` | `3,566` |
| `1000000` | `1,000,000` |

### Стили (Tailwind CSS)

- **Контейнер**: `flex items-center justify-center gap-2`
- **Иконка**: `w-8 h-8 object-contain`
- **Текст**: `text-4xl font-bold bg-gradient-to-r from-[#FFD700] to-[#FFA500] bg-clip-text text-transparent`

### Интеграция в проект

Компонент уже интегрирован в:
- `src/pages/Home.tsx` - отображение баланса на главной странице

### Зависимости

- Иконка: `/icons/BUL.png` (должна находиться в `public/icons/`)
- Tailwind CSS для стилизации
