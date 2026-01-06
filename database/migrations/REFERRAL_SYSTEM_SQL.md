# ПАРТНЁРСКАЯ ПРОГРАММА - SQL

> **Статус:** ВЫПОЛНЕНО
> **Дата:** 2026-01-05

---

## СТРУКТУРА БАЗЫ ДАННЫХ

### Таблицы

#### 1. referrals
Связи между рефереррами и приглашёнными.

```sql
CREATE TABLE referrals (
    id SERIAL PRIMARY KEY,
    referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    level INTEGER NOT NULL DEFAULT 1 CHECK (level IN (1, 2)),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(referrer_id, referred_id)
);

CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_referrals_referred ON referrals(referred_id);
CREATE INDEX idx_referrals_level ON referrals(level);
```

#### 2. referral_earnings
История начислений реферальных бонусов.

```sql
CREATE TABLE referral_earnings (
    id SERIAL PRIMARY KEY,
    referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    currency TEXT NOT NULL CHECK (currency IN ('ar', 'bul')),
    level INTEGER NOT NULL CHECK (level IN (1, 2)),
    purchase_type TEXT NOT NULL DEFAULT 'purchase',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_referral_earnings_referrer ON referral_earnings(referrer_id);
CREATE INDEX idx_referral_earnings_created ON referral_earnings(created_at);
```

#### 3. Поля в таблице users

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_referral_ar NUMERIC DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_referral_bul NUMERIC DEFAULT 0;
```

---

## RPC ФУНКЦИИ

### 1. get_partner_stats
Получает статистику партнёрского кабинета.

```sql
CREATE OR REPLACE FUNCTION get_partner_stats(p_telegram_id TEXT)
RETURNS JSON AS $$
-- Возвращает:
-- - referral_code: уникальный код пользователя
-- - total_earned_ar: заработано AR за всё время
-- - total_earned_bul: заработано BUL за всё время
-- - l1_count: количество рефералов L1
-- - l2_count: количество рефералов L2
-- - team: массив членов команды
-- - recent_earnings: последние начисления
$$
```

### 2. apply_referral_code
Применяет реферальный код при регистрации.

```sql
CREATE OR REPLACE FUNCTION apply_referral_code(
    p_telegram_id TEXT,
    p_referral_code TEXT
) RETURNS JSON AS $$
-- Создаёт связи L1 и L2
-- Возвращает: {success: true/false, error?: string}
$$
```

### 3. process_referral_bonus
Начисляет бонусы рефереру при покупке.

```sql
CREATE OR REPLACE FUNCTION process_referral_bonus(
    p_buyer_telegram_id TEXT,
    p_amount NUMERIC,
    p_currency TEXT,  -- 'ar' или 'bul'
    p_purchase_type TEXT DEFAULT 'purchase'
) RETURNS JSON AS $$
-- L1 = 10%, L2 = 5%
-- Начисляет в той же валюте что и покупка
$$
```

### 4. generate_referral_code (триггер)
Автоматически генерирует referral_code при создании пользователя.

```sql
CREATE TRIGGER trigger_generate_referral_code
    BEFORE INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION generate_referral_code();
```

---

## ИСПОЛЬЗОВАНИЕ

### 1. При регистрации с ?startapp=CODE

```typescript
// В AuthProvider.tsx
const startParam = tg.initDataUnsafe?.start_param
if (startParam) {
    await supabase.rpc('apply_referral_code', {
        p_telegram_id: user.id.toString(),
        p_referral_code: startParam
    })
}
```

### 2. Получить данные партнёрского кабинета

```typescript
const { data } = await supabase.rpc('get_partner_stats', {
    p_telegram_id: telegramUser.id.toString()
})
// data = {
//   referral_code: 'A1B2C3D4',
//   total_earned_ar: 150.00,
//   total_earned_bul: 500,
//   l1_count: 10,
//   l2_count: 25,
//   team: [...],
//   recent_earnings: [...]
// }
```

### 3. Начислить бонус при покупке

```typescript
// Вызывать после успешной покупки
await supabase.rpc('process_referral_bonus', {
    p_buyer_telegram_id: telegramUser.id.toString(),
    p_amount: purchaseAmount,
    p_currency: 'ar', // или 'bul'
    p_purchase_type: 'giveaway_ticket' // или 'skin', 'equipment' и т.д.
})
```

### 4. Реферальная ссылка

```
https://t.me/ARARENA_BOT?startapp={referral_code}
```

---

## БОНУСЫ

| Уровень | Процент | Описание |
|---------|---------|----------|
| L1 | 10% | Прямые рефералы |
| L2 | 5% | Рефералы моих рефералов |

Бонусы начисляются в той же валюте, в которой совершена покупка:
- Покупка за AR → бонус в AR
- Покупка за BUL → бонус в BUL

---

## UI КОМПОНЕНТЫ

- `src/pages/PartnersPage.tsx` - Партнёрский кабинет
- 3 вкладки: Обзор, Команда, Начисления
- Копирование/шаринг реферальной ссылки
- Фильтрация команды по L1/L2

---

**Статус:** Выполнено и задеплоено
