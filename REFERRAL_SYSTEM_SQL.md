# ПАРТНЁРСКАЯ ПРОГРАММА - SQL

> Выполни в Supabase SQL Editor: https://supabase.com/dashboard/project/syxjkircmiwpnpagznay/sql

---

## ЧАСТЬ 1: ТАБЛИЦЫ

```sql
-- =============================================
-- ПАРТНЁРСКАЯ ПРОГРАММА: ТАБЛИЦЫ
-- 2 уровня: L1 = 10%, L2 = 5%
-- =============================================

-- 1. Таблица связей рефералов
CREATE TABLE IF NOT EXISTS referrals (
    id SERIAL PRIMARY KEY,
    referrer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    level INTEGER NOT NULL DEFAULT 1 CHECK (level IN (1, 2)),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(referred_id, level)
);

-- Индексы для быстрых запросов
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_level ON referrals(level);

-- 2. Таблица начислений реферальных бонусов
CREATE TABLE IF NOT EXISTS referral_earnings (
    id SERIAL PRIMARY KEY,
    referrer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    level INTEGER NOT NULL CHECK (level IN (1, 2)),
    currency VARCHAR(10) NOT NULL CHECK (currency IN ('AR', 'BUL')),
    purchase_amount NUMERIC NOT NULL,
    bonus_percent INTEGER NOT NULL,
    bonus_amount NUMERIC NOT NULL,
    purchase_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_referral_earnings_referrer ON referral_earnings(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_created ON referral_earnings(created_at);

-- 3. Добавить поля в users
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by INTEGER REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_referral_ar NUMERIC DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_referral_bul NUMERIC DEFAULT 0;
```

---

## ЧАСТЬ 2: RPC ФУНКЦИИ

```sql
-- =============================================
-- ГЕНЕРАЦИЯ РЕФЕРАЛЬНОГО КОДА
-- =============================================
CREATE OR REPLACE FUNCTION generate_referral_code(p_telegram_id TEXT)
RETURNS JSON AS $$
DECLARE
    v_user_id INTEGER;
    v_code VARCHAR(20);
BEGIN
    -- Найти пользователя
    SELECT id, referral_code INTO v_user_id, v_code
    FROM users WHERE telegram_id = p_telegram_id;

    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'USER_NOT_FOUND');
    END IF;

    -- Если код уже есть - вернуть его
    IF v_code IS NOT NULL THEN
        RETURN json_build_object('success', true, 'code', v_code);
    END IF;

    -- Генерировать уникальный код (telegram_id + случайные символы)
    v_code := UPPER(SUBSTRING(MD5(p_telegram_id || NOW()::TEXT) FROM 1 FOR 8));

    UPDATE users SET referral_code = v_code WHERE id = v_user_id;

    RETURN json_build_object('success', true, 'code', v_code);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- РЕГИСТРАЦИЯ С РЕФЕРАЛЬНЫМ КОДОМ
-- Вызывается при первом входе с ?startapp=CODE
-- =============================================
CREATE OR REPLACE FUNCTION apply_referral_code(
    p_telegram_id TEXT,
    p_referral_code TEXT
)
RETURNS JSON AS $$
DECLARE
    v_user_id INTEGER;
    v_referrer_id INTEGER;
    v_referrer_l2_id INTEGER;
    v_already_referred BOOLEAN;
BEGIN
    -- Найти пользователя
    SELECT id, (referred_by IS NOT NULL) INTO v_user_id, v_already_referred
    FROM users WHERE telegram_id = p_telegram_id;

    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'USER_NOT_FOUND');
    END IF;

    -- Если уже есть реферер - нельзя менять
    IF v_already_referred THEN
        RETURN json_build_object('success', false, 'error', 'ALREADY_HAS_REFERRER');
    END IF;

    -- Найти реферера по коду
    SELECT id INTO v_referrer_id
    FROM users WHERE referral_code = UPPER(p_referral_code);

    IF v_referrer_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'INVALID_CODE');
    END IF;

    -- Нельзя пригласить самого себя
    IF v_referrer_id = v_user_id THEN
        RETURN json_build_object('success', false, 'error', 'CANNOT_REFER_SELF');
    END IF;

    -- Установить реферера
    UPDATE users SET referred_by = v_referrer_id WHERE id = v_user_id;

    -- Создать связь L1
    INSERT INTO referrals (referrer_id, referred_id, level)
    VALUES (v_referrer_id, v_user_id, 1)
    ON CONFLICT (referred_id, level) DO NOTHING;

    -- Найти L2 реферера (реферер моего реферера)
    SELECT referred_by INTO v_referrer_l2_id FROM users WHERE id = v_referrer_id;

    IF v_referrer_l2_id IS NOT NULL THEN
        -- Создать связь L2
        INSERT INTO referrals (referrer_id, referred_id, level)
        VALUES (v_referrer_l2_id, v_user_id, 2)
        ON CONFLICT (referred_id, level) DO NOTHING;
    END IF;

    RETURN json_build_object('success', true, 'referrer_id', v_referrer_id);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- НАЧИСЛЕНИЕ РЕФЕРАЛЬНЫХ БОНУСОВ
-- Вызывается при любой покупке
-- =============================================
CREATE OR REPLACE FUNCTION process_referral_bonus(
    p_user_id INTEGER,
    p_currency VARCHAR(10),
    p_amount NUMERIC,
    p_purchase_type VARCHAR(50)
)
RETURNS VOID AS $$
DECLARE
    v_referrer RECORD;
    v_bonus NUMERIC;
    v_percent INTEGER;
BEGIN
    -- Найти всех рефереров (L1 и L2) для этого пользователя
    FOR v_referrer IN
        SELECT r.referrer_id, r.level, u.id
        FROM referrals r
        JOIN users u ON u.id = r.referrer_id
        WHERE r.referred_id = p_user_id
    LOOP
        -- Определить процент (L1 = 10%, L2 = 5%)
        v_percent := CASE WHEN v_referrer.level = 1 THEN 10 ELSE 5 END;
        v_bonus := ROUND(p_amount * v_percent / 100, 2);

        IF v_bonus > 0 THEN
            -- Начислить бонус
            IF p_currency = 'AR' THEN
                UPDATE users SET
                    balance_ar = balance_ar + v_bonus,
                    total_referral_ar = COALESCE(total_referral_ar, 0) + v_bonus
                WHERE id = v_referrer.referrer_id;
            ELSE
                UPDATE users SET
                    balance_bul = balance_bul + v_bonus,
                    total_referral_bul = COALESCE(total_referral_bul, 0) + v_bonus
                WHERE id = v_referrer.referrer_id;
            END IF;

            -- Записать в историю
            INSERT INTO referral_earnings (
                referrer_id, referred_id, level, currency,
                purchase_amount, bonus_percent, bonus_amount, purchase_type
            ) VALUES (
                v_referrer.referrer_id, p_user_id, v_referrer.level, p_currency,
                p_amount, v_percent, v_bonus, p_purchase_type
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- ПОЛУЧИТЬ ДАННЫЕ ПАРТНЁРСКОГО КАБИНЕТА
-- =============================================
CREATE OR REPLACE FUNCTION get_partner_stats(p_telegram_id TEXT)
RETURNS JSON AS $$
DECLARE
    v_user_id INTEGER;
    v_referral_code VARCHAR(20);
    v_total_ar NUMERIC;
    v_total_bul NUMERIC;
    v_l1_count INTEGER;
    v_l2_count INTEGER;
    v_team JSON;
    v_recent_earnings JSON;
BEGIN
    -- Найти пользователя
    SELECT id, referral_code,
           COALESCE(total_referral_ar, 0),
           COALESCE(total_referral_bul, 0)
    INTO v_user_id, v_referral_code, v_total_ar, v_total_bul
    FROM users WHERE telegram_id = p_telegram_id;

    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'USER_NOT_FOUND');
    END IF;

    -- Если нет кода - сгенерировать
    IF v_referral_code IS NULL THEN
        v_referral_code := UPPER(SUBSTRING(MD5(p_telegram_id || NOW()::TEXT) FROM 1 FOR 8));
        UPDATE users SET referral_code = v_referral_code WHERE id = v_user_id;
    END IF;

    -- Считаем рефералов
    SELECT COUNT(*) INTO v_l1_count FROM referrals WHERE referrer_id = v_user_id AND level = 1;
    SELECT COUNT(*) INTO v_l2_count FROM referrals WHERE referrer_id = v_user_id AND level = 2;

    -- Команда (L1 + L2 с данными)
    SELECT json_agg(t) INTO v_team FROM (
        SELECT
            u.id,
            u.telegram_id,
            u.username,
            u.first_name,
            u.photo_url,
            r.level,
            r.created_at,
            COALESCE((
                SELECT SUM(bonus_amount)
                FROM referral_earnings
                WHERE referrer_id = v_user_id AND referred_id = u.id
            ), 0) as total_earned
        FROM referrals r
        JOIN users u ON u.id = r.referred_id
        WHERE r.referrer_id = v_user_id
        ORDER BY r.level, r.created_at DESC
        LIMIT 100
    ) t;

    -- Последние начисления
    SELECT json_agg(e) INTO v_recent_earnings FROM (
        SELECT
            re.id,
            re.level,
            re.currency,
            re.purchase_amount,
            re.bonus_percent,
            re.bonus_amount,
            re.purchase_type,
            re.created_at,
            u.first_name as referred_name,
            u.username as referred_username
        FROM referral_earnings re
        JOIN users u ON u.id = re.referred_id
        WHERE re.referrer_id = v_user_id
        ORDER BY re.created_at DESC
        LIMIT 50
    ) e;

    RETURN json_build_object(
        'success', true,
        'referral_code', v_referral_code,
        'total_earned_ar', v_total_ar,
        'total_earned_bul', v_total_bul,
        'l1_count', v_l1_count,
        'l2_count', v_l2_count,
        'team', COALESCE(v_team, '[]'::JSON),
        'recent_earnings', COALESCE(v_recent_earnings, '[]'::JSON)
    );
END;
$$ LANGUAGE plpgsql;
```

---

## ЧАСТЬ 3: ОБНОВИТЬ СУЩЕСТВУЮЩИЕ ФУНКЦИИ

### 3.1 Обновить buy_skin (добавить реферальный бонус)

```sql
-- Добавить в конец функции buy_skin, после успешной покупки:
-- PERFORM process_referral_bonus(v_user_id, 'BUL', v_skin_price, 'skin_purchase');
```

### 3.2 Обновить purchase_equipment (добавить реферальный бонус)

```sql
-- Добавить в конец функции purchase_equipment, после успешной покупки:
-- PERFORM process_referral_bonus(v_user_id, 'BUL', v_equipment_price, 'equipment_purchase');
```

### 3.3 Обновить purchase_location (добавить реферальный бонус)

```sql
-- Добавить в конец функции purchase_location, после успешной покупки:
-- PERFORM process_referral_bonus(v_user_id, 'BUL', v_location_price, 'location_purchase');
```

### 3.4 При пополнении AR (webhook от Lava)

```sql
-- При успешном платеже вызвать:
-- SELECT process_referral_bonus(user_id, 'AR', amount_ar, 'ar_purchase');
```

---

## ИСПОЛЬЗОВАНИЕ

1. При регистрации с ?startapp=CODE:
```javascript
await supabase.rpc('apply_referral_code', {
    p_telegram_id: telegramUser.id.toString(),
    p_referral_code: startParam
});
```

2. Получить данные партнёрского кабинета:
```javascript
const { data } = await supabase.rpc('get_partner_stats', {
    p_telegram_id: telegramUser.id.toString()
});
```

3. Реферальная ссылка:
```
https://t.me/ARARENA_BOT?startapp=USERCODE
```

---

**Дата:** 2026-01-05
**Статус:** Готово к выполнению
