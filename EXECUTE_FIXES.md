# Инструкция по выполнению исправлений

## Проблема
Playwright MCP временно недоступен. Нужно выполнить SQL вручную через Supabase Dashboard.

## Решение: Выполнить через Supabase Dashboard

### Шаг 1: Открыть SQL Editor
```
https://supabase.com/dashboard/project/syxjkircmiwpnpagznay/sql/new
```

### Шаг 2: Скопировать и вставить SQL

Открыть файл `fix_tap_formula_and_energy.sql` и скопировать весь код в SQL Editor.

Или скопировать напрямую:

```sql
-- ЗАДАЧА 1: Исправить формулу тапа в process_bull_tap
CREATE OR REPLACE FUNCTION process_bull_tap(
  p_telegram_id BIGINT,
  p_taps INTEGER
)
RETURNS TABLE(
  energy INTEGER,
  energy_max INTEGER,
  balance_bul BIGINT,
  bul_earned INTEGER
) AS $$
DECLARE
  v_user RECORD;
  v_skin_bonus INTEGER := 0;
  v_bul_earned INTEGER;
  v_energy_cost INTEGER;
BEGIN
  -- Получить данные пользователя
  SELECT u.* INTO v_user
  FROM users u
  WHERE u.telegram_id = p_telegram_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Получить tap_bonus из активного скина
  IF v_user.active_skin_id IS NOT NULL THEN
    SELECT COALESCE(s.tap_bonus, 0) INTO v_skin_bonus
    FROM skins s
    WHERE s.id = v_user.active_skin_id;
  END IF;

  -- Рассчитать стоимость энергии
  v_energy_cost := p_taps;

  -- Проверить энергию
  IF v_user.energy < v_energy_cost THEN
    RAISE EXCEPTION 'Not enough energy';
  END IF;

  -- Награда = tap_power + бонус скина
  v_bul_earned := p_taps * (COALESCE(v_user.tap_power, 1) + COALESCE(v_skin_bonus, 0));

  -- Обновить пользователя
  UPDATE users
  SET
    energy = GREATEST(energy - v_energy_cost, 0),
    balance_bul = balance_bul + v_bul_earned,
    last_energy_update = NOW()
  WHERE telegram_id = p_telegram_id
  RETURNING
    users.energy,
    users.energy_max,
    users.balance_bul,
    v_bul_earned
  INTO energy, energy_max, balance_bul, bul_earned;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- ЗАДАЧА 2: Исправить энергию админа
UPDATE users
SET energy = 1000, energy_max = 1000
WHERE telegram_id = 190202791;

-- Проверка
SELECT telegram_id, energy, energy_max, tap_power, active_skin_id, balance_bul
FROM users
WHERE telegram_id = 190202791;
```

### Шаг 3: Выполнить
Нажать кнопку **RUN** или **Ctrl+Enter**

### Ожидаемый результат

1. **Функция `process_bull_tap` обновлена:**
   - Теперь использует правильную формулу: `tap_power + tap_bonus скина`
   - Например, если `tap_power = 1` и `tap_bonus = 1`, то за 1 тап будет **2 BUL**

2. **Энергия админа обновлена:**
   - `energy = 1000`
   - `energy_max = 1000`

3. **Проверочный запрос покажет:**
   - telegram_id: 190202791
   - energy: 1000
   - energy_max: 1000
   - tap_power: (текущее значение)
   - active_skin_id: (текущее значение)
   - balance_bul: (текущее значение)

## Что изменилось в формуле

### Было (неправильно):
```sql
v_bul_earned := p_taps * (COALESCE(v_user.level, 1) + 1);
```
- Использовал `level` (которого может не быть)
- Не учитывал `tap_bonus` скина

### Стало (правильно):
```sql
-- Получить tap_bonus из активного скина
SELECT COALESCE(s.tap_bonus, 0) INTO v_skin_bonus
FROM skins s
WHERE s.id = v_user.active_skin_id;

-- Награда = tap_power + бонус скина
v_bul_earned := p_taps * (COALESCE(v_user.tap_power, 1) + COALESCE(v_skin_bonus, 0));
```
- Использует `tap_power` из пользователя
- Добавляет `tap_bonus` активного скина
- Правильная формула: `(tap_power + tap_bonus) * количество_тапов`

## Примеры расчета

### Пример 1: Базовый скин (Юзер)
- tap_power = 1
- tap_bonus = 1 (скин "Юзер")
- За 1 тап: (1 + 1) * 1 = **2 BUL**
- За 10 тапов: (1 + 1) * 10 = **20 BUL**

### Пример 2: Редкий скин (Банкир)
- tap_power = 1
- tap_bonus = 4 (скин "Банкир", rare)
- За 1 тап: (1 + 4) * 1 = **5 BUL**
- За 10 тапов: (1 + 4) * 10 = **50 BUL**

### Пример 3: Легендарный скин (Криптан)
- tap_power = 1
- tap_bonus = 10 (скин "Криптан", legendary)
- За 1 тап: (1 + 10) * 1 = **11 BUL**
- За 10 тапов: (1 + 10) * 10 = **110 BUL**
