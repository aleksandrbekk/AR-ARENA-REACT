# 🔧 РУЧНОЕ ВЫПОЛНЕНИЕ SQL МИГРАЦИИ

## ⚠️ ВАЖНО
Claude не может автоматически выполнить SQL в Supabase из-за ограничений.
Тебе нужно выполнить это **вручную через браузер**.

---

## 📋 ИНСТРУКЦИЯ

### ШАГ 1: Открой Supabase SQL Editor
**URL:** https://supabase.com/dashboard/project/syxjkircmiwpnpagznay/sql/new

### ШАГ 2: Авторизуйся (если потребуется)
- **Email:** aleksandrbekk@Bk.ru
- **Password:** xYrsyp-6jyhgy-gubjyc

### ШАГ 3: Вставь и выполни этот SQL

```sql
CREATE OR REPLACE FUNCTION get_bull_game_state(p_telegram_id TEXT)
RETURNS TABLE (
    balance_bul NUMERIC,
    balance_ar NUMERIC,
    energy INTEGER,
    energy_max INTEGER,
    level INTEGER,
    xp INTEGER,
    xp_to_next INTEGER,
    active_skin TEXT,
    last_energy_update TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    INSERT INTO users (telegram_id, balance_bul, energy, energy_max, level, xp, xp_to_next, active_skin, last_energy_update)
    VALUES (p_telegram_id::BIGINT, 0, 100, 100, 1, 0, 100, 'default', NOW())
    ON CONFLICT (telegram_id) DO NOTHING;

    RETURN QUERY
    SELECT
        u.balance_bul,
        COALESCE(u.balance_ar, 0) as balance_ar,
        u.energy,
        u.energy_max,
        u.level,
        u.xp,
        u.xp_to_next,
        u.active_skin,
        u.last_energy_update
    FROM users u
    WHERE u.telegram_id = p_telegram_id::BIGINT;
END;
$$ LANGUAGE plpgsql;
```

### ШАГ 4: Нажми RUN
Кнопка внизу редактора или `Ctrl+Enter`

### ШАГ 5: Проверь результат
Выполни проверочный запрос:

```sql
SELECT * FROM get_bull_game_state('190202791');
```

**Ожидаемый результат:**
```
balance_bul | balance_ar | energy | energy_max | level | xp  | xp_to_next | active_skin      | last_energy_update
------------|------------|--------|------------|-------|-----|------------|------------------|--------------------
3566        | 542366     | 1000   | 1000       | 3     | 196 | 300        | bull_boss.png    | 2025-12-02 09:59:29
```

---

## ✅ ПРОВЕРКА ЧЕРЕЗ ТЕРМИНАЛ

После выполнения SQL, запусти в терминале:

```bash
curl -X POST 'https://syxjkircmiwpnpagznay.supabase.co/rest/v1/rpc/get_bull_game_state' \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eGpraXJjbWl3cG5wYWd6bmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NjQ0MTEsImV4cCI6MjA3MzM0MDQxMX0.XUJWPrPOtsG_cynjfH38mJR2lJYThGTgEVMMu3MIw8g" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eGpraXJjbWl3cG5wYWd6bmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NjQ0MTEsImV4cCI6MjA3MzM0MDQxMX0.XUJWPrPOtsG_cynjfH38mJR2lJYThGTgEVMMu3MIw8g" \
  -H "Content-Type: application/json" \
  -d '{"p_telegram_id":"190202791"}'
```

**Должен вернуть:**
```json
[{
  "balance_bul": 3566,
  "balance_ar": 542366,  ← ДОЛЖНО ПОЯВИТЬСЯ
  "energy": 1000,
  "energy_max": 1000,
  "level": 3,
  "xp": 196,
  "xp_to_next": 300,
  "active_skin": "bull_boss.png",
  "last_energy_update": "2025-12-02T09:59:29.113269+00:00"
}]
```

---

## 🔴 ТЕКУЩАЯ ПРОБЛЕМА

**СЕЙЧАС RPC возвращает:**
```json
{
  "balance_bul": 3566,
  // ❌ balance_ar отсутствует
  "energy": 1000,
  ...
}
```

**ПОСЛЕ ФИКСА должен возвращать:**
```json
{
  "balance_bul": 3566,
  "balance_ar": 542366,  ✅
  "energy": 1000,
  ...
}
```

---

## 📝 ЧТО ИЗМЕНИЛОСЬ

### БЫЛО:
```sql
RETURNS TABLE (
    balance_bul NUMERIC,
    -- ❌ balance_ar отсутствовал
    energy INTEGER,
    ...
)
```

### СТАЛО:
```sql
RETURNS TABLE (
    balance_bul NUMERIC,
    balance_ar NUMERIC,  ✅ ДОБАВЛЕНО
    energy INTEGER,
    ...
)

-- И в SELECT добавлено:
COALESCE(u.balance_ar, 0) as balance_ar
```

---

## 💡 АЛЬТЕРНАТИВА (если SQL Editor не работает)

Используй Supabase CLI:

```bash
# 1. Установи Supabase CLI (если нет)
brew install supabase/tap/supabase

# 2. Login
supabase login

# 3. Выполни SQL
supabase db execute --project-ref syxjkircmiwpnpagznay --file fix_get_bull_game_state.sql
```

---

Когда выполнишь SQL, напиши "готово" в чате.
