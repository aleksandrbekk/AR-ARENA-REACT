# SQL Функции для скинов

## Файл: `sql_buy_and_equip_skins.sql`

Две функции для работы со скинами через Supabase RPC.

---

## 1️⃣ buy_skin — Покупка скина

### Параметры:
- `p_telegram_id` (TEXT) — Telegram ID пользователя
- `p_skin_id` (INTEGER) — ID скина для покупки

### Проверки:
1. ✅ Пользователь существует
2. ✅ Скин существует и активен (`is_active = true`)
3. ✅ Скин ещё не куплен
4. ✅ Уровень пользователя >= `level_req`
5. ✅ Баланс BUL >= `price_bul`

### Действия:
- Списывает BUL с баланса
- Добавляет запись в `user_skins` (is_equipped = false)
- Создаёт транзакцию в `transactions` (type = 'skin_purchase')

### Возвращаемые значения:

**Успех:**
```json
{
  "success": true,
  "skin_id": 2,
  "new_balance_bul": 950
}
```

**Ошибки:**
```json
// Пользователь не найден
{ "success": false, "error": "USER_NOT_FOUND" }

// Скин не найден или неактивен
{ "success": false, "error": "SKIN_NOT_FOUND" }

// Скин уже куплен
{ "success": false, "error": "ALREADY_OWNED" }

// Недостаточно уровня
{
  "success": false,
  "error": "LEVEL_TOO_LOW",
  "required_level": 5,
  "user_level": 3
}

// Недостаточно BUL
{
  "success": false,
  "error": "INSUFFICIENT_BUL",
  "required": 1000,
  "available": 500
}
```

---

## 2️⃣ equip_skin — Экипировка скина

### Параметры:
- `p_telegram_id` (TEXT) — Telegram ID пользователя
- `p_skin_id` (INTEGER) — ID скина для экипировки

### Проверки:
1. ✅ Пользователь существует
2. ✅ Скин куплен (есть в `user_skins`)

### Действия:
- Снимает все скины (`is_equipped = false` для всех)
- Экипирует выбранный скин (`is_equipped = true`)
- Обновляет `active_skin_id` в таблице `users`

### Возвращаемые значения:

**Успех:**
```json
{
  "success": true,
  "equipped_skin_id": 2
}
```

**Ошибки:**
```json
// Пользователь не найден
{ "success": false, "error": "USER_NOT_FOUND" }

// Скин не куплен
{ "success": false, "error": "SKIN_NOT_OWNED" }
```

---

## 📋 Использование в коде

### TypeScript интерфейсы:

```typescript
interface BuySkinResponse {
  success: boolean
  error?: 'USER_NOT_FOUND' | 'SKIN_NOT_FOUND' | 'ALREADY_OWNED' | 'LEVEL_TOO_LOW' | 'INSUFFICIENT_BUL'
  skin_id?: number
  new_balance_bul?: number
  required_level?: number
  user_level?: number
  required?: number
  available?: number
}

interface EquipSkinResponse {
  success: boolean
  error?: 'USER_NOT_FOUND' | 'SKIN_NOT_OWNED'
  equipped_skin_id?: number
}
```

### Пример вызова:

```typescript
import { supabase } from '../lib/supabase'

// Покупка скина
async function buySkin(telegramId: string, skinId: number) {
  const { data, error } = await supabase.rpc('buy_skin', {
    p_telegram_id: telegramId,
    p_skin_id: skinId
  })

  if (error) {
    console.error('RPC error:', error)
    return null
  }

  const result = data as BuySkinResponse

  if (!result.success) {
    // Обработка ошибок
    switch (result.error) {
      case 'INSUFFICIENT_BUL':
        alert(`Нужно ${result.required} BUL, у вас ${result.available}`)
        break
      case 'LEVEL_TOO_LOW':
        alert(`Нужен уровень ${result.required_level}, у вас ${result.user_level}`)
        break
      case 'ALREADY_OWNED':
        alert('Вы уже купили этот скин')
        break
      default:
        alert('Ошибка покупки')
    }
    return null
  }

  console.log('Скин куплен! Новый баланс:', result.new_balance_bul)
  return result
}

// Экипировка скина
async function equipSkin(telegramId: string, skinId: number) {
  const { data, error } = await supabase.rpc('equip_skin', {
    p_telegram_id: telegramId,
    p_skin_id: skinId
  })

  if (error) {
    console.error('RPC error:', error)
    return null
  }

  const result = data as EquipSkinResponse

  if (!result.success) {
    if (result.error === 'SKIN_NOT_OWNED') {
      alert('Сначала купите этот скин')
    }
    return null
  }

  console.log('Скин экипирован:', result.equipped_skin_id)
  return result
}
```

---

## 🚀 Установка функций в Supabase

1. Открой Supabase SQL Editor:
   https://supabase.com/dashboard/project/aybkszepclkibqgogpnx/sql/new

2. Скопируй весь контент из `sql_buy_and_equip_skins.sql`

3. Выполни скрипт (Run)

4. Проверь что функции созданы:
   ```sql
   SELECT proname FROM pg_proc WHERE proname IN ('buy_skin', 'equip_skin');
   ```

---

## 🧪 Тестирование

### Тест 1: Покупка скина #2
```sql
SELECT buy_skin('190202791', 2);
```

**Ожидаемый результат (успех):**
```json
{"success": true, "skin_id": 2, "new_balance_bul": 950}
```

### Тест 2: Экипировка скина #2
```sql
SELECT equip_skin('190202791', 2);
```

**Ожидаемый результат (успех):**
```json
{"success": true, "equipped_skin_id": 2}
```

### Проверка результатов:

```sql
-- Купленные скины
SELECT * FROM user_skins
WHERE user_id IN (SELECT id FROM users WHERE telegram_id = '190202791');

-- Активный скин в users
SELECT active_skin_id FROM users WHERE telegram_id = '190202791';

-- Баланс после покупки
SELECT balance_bul FROM users WHERE telegram_id = '190202791';

-- Транзакции покупки
SELECT * FROM transactions
WHERE user_id IN (SELECT id FROM users WHERE telegram_id = '190202791')
AND type = 'skin_purchase'
ORDER BY created_at DESC;
```

---

## 📊 Структура таблиц (ожидаемая)

### `skins`
```sql
id, name, file, rarity, price_bul, price_ar,
level_req, refs_req, tap_bonus, passive_bonus,
description, is_active
```

### `user_skins`
```sql
id, user_id, skin_id, is_equipped, purchased_at
```

### `users`
```sql
id, telegram_id, level, balance_bul, active_skin_id, ...
```

### `transactions`
```sql
id, user_id, type, amount, description, created_at
```

---

## ⚠️ Важные замечания

1. **Транзакции:** Функция `buy_skin` создаёт запись в таблице `transactions` с типом `'skin_purchase'`

2. **Одновременная экипировка:** Только один скин может быть экипирован (`equip_skin` снимает все остальные)

3. **Валюта:** Сейчас покупка только за BUL (`price_bul`). Поле `price_ar` не используется

4. **Реферальные требования:** Поле `refs_req` не проверяется (можно добавить позже)

5. **Активность скинов:** Покупка доступна только для активных скинов (`is_active = true`)

Готово к использованию! 🎉
