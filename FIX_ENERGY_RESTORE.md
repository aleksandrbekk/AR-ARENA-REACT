# 🔧 ИСПРАВЛЕНИЕ ВОССТАНОВЛЕНИЯ ЭНЕРГИИ

## ⚠️ ПРОБЛЕМА
Сейчас энергия восстанавливается слишком быстро (1 за 1 секунду).
Нужно: **1 энергия за 180 секунд (3 минуты)**.

---

## 📋 ИНСТРУКЦИЯ

### ШАГ 1: Открой Supabase SQL Editor
**URL:** https://supabase.com/dashboard/project/syxjkircmiwpnpagznay/sql/new

### ШАГ 2: Авторизуйся
- **Email:** aleksandrbekk@Bk.ru
- **Password:** xYrsyp-6jyhgy-gubjyc

### ШАГ 3: Вставь и выполни SQL

Открой файл `fix_restore_bull_energy.sql` в этой папке и скопируй весь SQL код.

Или вставь это:

```sql
CREATE OR REPLACE FUNCTION restore_bull_energy(p_telegram_id TEXT)
RETURNS TABLE (
    success BOOLEAN,
    energy INTEGER,
    energy_max INTEGER,
    energy_restored INTEGER
) AS $$
DECLARE
    v_user_id BIGINT;
    v_current_energy INTEGER;
    v_energy_max INTEGER;
    v_last_update TIMESTAMP WITH TIME ZONE;
    v_seconds_passed INTEGER;
    v_energy_to_restore INTEGER;
    v_new_energy INTEGER;
BEGIN
    -- Получаем данные пользователя
    SELECT u.energy, u.energy_max, u.last_energy_update
    INTO v_current_energy, v_energy_max, v_last_update
    FROM users u
    WHERE u.telegram_id = p_telegram_id::BIGINT;

    -- Если пользователь не найден
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0, 0, 0;
        RETURN;
    END IF;

    -- Если энергия уже максимальная
    IF v_current_energy >= v_energy_max THEN
        RETURN QUERY SELECT TRUE, v_current_energy, v_energy_max, 0;
        RETURN;
    END IF;

    -- Вычисляем сколько секунд прошло
    v_seconds_passed := EXTRACT(EPOCH FROM (NOW() - v_last_update))::INTEGER;

    -- 1 энергия за 180 секунд (3 минуты)
    v_energy_to_restore := v_seconds_passed / 180;

    -- Если прошло меньше 3 минут, энергия не восстанавливается
    IF v_energy_to_restore = 0 THEN
        RETURN QUERY SELECT TRUE, v_current_energy, v_energy_max, 0;
        RETURN;
    END IF;

    -- Вычисляем новую энергию (не больше максимума)
    v_new_energy := LEAST(v_current_energy + v_energy_to_restore, v_energy_max);

    -- Обновляем энергию
    UPDATE users
    SET
        energy = v_new_energy,
        last_energy_update = NOW()
    WHERE telegram_id = p_telegram_id::BIGINT;

    -- Возвращаем результат
    RETURN QUERY SELECT TRUE, v_new_energy, v_energy_max, v_energy_to_restore;
END;
$$ LANGUAGE plpgsql;
```

### ШАГ 4: Нажми RUN
Кнопка внизу редактора или `Ctrl+Enter`

### ШАГ 5: Проверь результат

Выполни проверочный запрос:

```sql
SELECT * FROM restore_bull_energy('190202791');
```

**Ожидаемый результат:**
- `energy_restored` должно быть 0 (если прошло меньше 3 минут)
- Или 1-2 если прошло 3-6 минут с последнего обновления

---

## ✅ ПРОВЕРКА ЧЕРЕЗ ТЕРМИНАЛ

После выполнения SQL, запусти:

```bash
curl -X POST 'https://syxjkircmiwpnpagznay.supabase.co/rest/v1/rpc/restore_bull_energy' \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eGpraXJjbWl3cG5wYWd6bmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NjQ0MTEsImV4cCI6MjA3MzM0MDQxMX0.XUJWPrPOtsG_cynjfH38mJR2lJYThGTgEVMMu3MIw8g" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eGpraXJjbWl3cG5wYWd6bmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NjQ0MTEsImV4cCI6MjA3MzM0MDQxMX0.XUJWPrPOtsG_cynjfH38mJR2lJYThGTgEVMMu3MIw8g" \
  -H "Content-Type: application/json" \
  -d '{"p_telegram_id":"190202791"}'
```

**Должен вернуть:**
```json
[{
  "success": true,
  "energy": 100,
  "energy_max": 100,
  "energy_restored": 0
}]
```

---

## 📝 ЧТО ИЗМЕНИЛОСЬ

### БЫЛО:
```sql
v_energy_to_restore := v_seconds_passed / 1;  -- 1 энергия за 1 секунду
```

### СТАЛО:
```sql
v_energy_to_restore := v_seconds_passed / 180;  -- 1 энергия за 180 секунд (3 минуты)
```

---

Когда выполнишь SQL, напиши "готово" в чате.
