# Проверка SQL функции restore_bull_energy

## Симптом проблемы
- Энергия 0, подождал → появилась 1
- Тапнул → стало 30!

Это значит SQL функция восстанавливает неправильное количество энергии.

---

## ШАГ 1: Проверить текущую SQL функцию

Войди в Supabase SQL Editor:
https://supabase.com/dashboard/project/aybkszepclkibqgogpnx/sql/new

Выполни:
```sql
SELECT prosrc FROM pg_proc WHERE proname = 'restore_bull_energy';
```

**Что искать в результате:**

Должна быть строка:
```
v_energy_to_restore := v_seconds_passed / 180;
```

❌ **НЕ ДОЛЖНО БЫТЬ:**
```
v_energy_to_restore := v_seconds_passed / 1;
v_energy_to_restore := v_seconds_passed;
```

---

## ШАГ 2: Протестировать RPC напрямую

В SQL Editor выполни:
```sql
SELECT * FROM restore_bull_energy('190202791');
```

**Ожидаемый результат:**

Если прошло, например, 540 секунд (9 минут):
- `energy_restored` должно быть: `540 / 180 = 3`

Если прошло 60 секунд (1 минута):
- `energy_restored` должно быть: `60 / 180 = 0` (меньше 3 минут)

❌ **НЕПРАВИЛЬНО:**
- `energy_restored` = 540 (если делит на 1)
- `energy_restored` = 60 (если не делит вообще)

---

## ШАГ 3: Если SQL неправильный — обновить

Используй файл: `fix_restore_bull_energy.sql`

**Важная часть функции (строка 41):**
```sql
-- 1 энергия за 180 секунд (3 минуты)
v_energy_to_restore := v_seconds_passed / 180;
```

**Чтобы обновить функцию:**

1. Открой SQL Editor
2. Скопируй весь контент из `fix_restore_bull_energy.sql`
3. Добавь в начало:
```sql
DROP FUNCTION IF EXISTS restore_bull_energy(text);
```
4. Выполни весь скрипт

---

## ШАГ 4: Проверка через логи

После деплоя с debug логами:

1. Открой Telegram Mini App
2. Открой DevTools (если возможно) или проверь логи
3. Подожди 5 секунд (автоматический restore)
4. Смотри в консоли:

```
=== ENERGY RESTORE ===
Response from RPC: [{ success: true, energy: X, energy_max: 100, energy_restored: Y }]
```

**Правильные значения `energy_restored`:**
- Если прошло меньше 180 секунд: `energy_restored = 0`
- Если прошло 180-359 секунд: `energy_restored = 1`
- Если прошло 360-539 секунд: `energy_restored = 2`
- И т.д.

❌ **Неправильные значения:**
- `energy_restored` = большое число (30+) при коротком времени

---

## Быстрый тест

1. Выкликай всю энергию до 0
2. Подожди ровно 3 минуты (180 секунд)
3. Должна восстановиться ТОЛЬКО 1 энергия
4. Тапни → энергия должна стать 0 (1 - 1 = 0)

Если стала 30+ → SQL функция баганная!
