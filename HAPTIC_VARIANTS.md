# Варианты Haptic Feedback для тестирования

## Текущий код (heavy impact)
```typescript
window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy')
```

---

## Варианты для тестирования

### Вариант 1: Impact типы
```typescript
// Light (легкая вибрация)
window.Telegram.WebApp.HapticFeedback.impactOccurred('light')

// Medium (средняя вибрация) — было раньше
window.Telegram.WebApp.HapticFeedback.impactOccurred('medium')

// Heavy (сильная вибрация) — СЕЙЧАС
window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy')

// Rigid (жесткая вибрация)
window.Telegram.WebApp.HapticFeedback.impactOccurred('rigid')

// Soft (мягкая вибрация)
window.Telegram.WebApp.HapticFeedback.impactOccurred('soft')
```

---

### Вариант 2: Notification типы
```typescript
// Success (успех — 3 коротких вибрации)
window.Telegram.WebApp.HapticFeedback.notificationOccurred('success')

// Warning (предупреждение — 2 вибрации)
window.Telegram.WebApp.HapticFeedback.notificationOccurred('warning')

// Error (ошибка — 3 разных вибрации)
window.Telegram.WebApp.HapticFeedback.notificationOccurred('error')
```

---

### Вариант 3: Selection Changed
```typescript
// Легкая вибрация при изменении выбора
window.Telegram.WebApp.HapticFeedback.selectionChanged()
```

---

## Как тестировать

1. Открой `src/pages/Home.tsx`
2. Найди функцию `handleTap` (строка ~38)
3. Замени строку 44:
   ```typescript
   window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy')
   ```
4. Попробуй разные варианты из списка выше
5. Билд и деплой
6. Тестируй в Telegram

---

## Рекомендации

**Для тапа по быку лучше всего:**
- `heavy` — сильная одиночная вибрация (самая ощутимая)
- `rigid` — жесткая, четкая вибрация
- `notificationOccurred('success')` — тройная вибрация (может быть круто для тапа)

**НЕ рекомендуется:**
- `light` / `soft` — слишком слабые
- `selectionChanged()` — для других целей (свайпы, переключения)

---

## Логи для проверки

После тапа смотри в консоли:
```
🔔 Triggering haptic feedback...
✅ HapticFeedback API available
📳 Heavy impact triggered
```

Если видишь:
```
❌ HapticFeedback API not available
```

Значит Telegram API недоступно (открыто не в Mini App).
