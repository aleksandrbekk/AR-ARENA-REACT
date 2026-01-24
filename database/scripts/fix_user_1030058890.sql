-- ============================================
-- ДИАГНОСТИКА И ИСПРАВЛЕНИЕ ПОДПИСКИ
-- Пользователь: telegram_id = 1030058890
-- Проблема: Крипто-платёж зависший из-за недоплаты 1 цент
-- ============================================

-- ============================================
-- ШАГ 1: ДИАГНОСТИКА - Проверить текущее состояние
-- ============================================

-- 1.1 Проверяем premium_clients
SELECT
  'PREMIUM_CLIENTS' as table_name,
  id,
  telegram_id,
  username,
  plan,
  expires_at,
  (expires_at > NOW()) as is_active,
  total_paid_usd,
  payments_count,
  last_payment_at,
  source,
  in_channel,
  in_chat
FROM premium_clients
WHERE telegram_id = 1030058890;

-- 1.2 Проверяем payment_history (последние платежи)
SELECT
  'PAYMENT_HISTORY' as table_name,
  id,
  telegram_id,
  amount,
  currency,
  source,
  plan,
  contract_id,
  tx_hash,
  created_at
FROM payment_history
WHERE telegram_id = '1030058890'
ORDER BY created_at DESC
LIMIT 10;

-- 1.3 Проверяем users
SELECT
  'USERS' as table_name,
  id,
  telegram_id,
  username,
  status,
  premium_expires,
  created_at
FROM users
WHERE telegram_id = 1030058890;

-- ============================================
-- ШАГ 2: АНАЛИЗ - Сравнить даты
-- ============================================

-- Проверяем расхождение между последним платежом и last_payment_at
WITH client AS (
  SELECT last_payment_at, expires_at, payments_count
  FROM premium_clients WHERE telegram_id = 1030058890
),
last_payment AS (
  SELECT created_at, amount, source
  FROM payment_history
  WHERE telegram_id = '1030058890'
  ORDER BY created_at DESC LIMIT 1
)
SELECT
  'АНАЛИЗ' as report,
  c.last_payment_at as client_last_payment,
  p.created_at as actual_last_payment,
  c.expires_at,
  c.payments_count,
  p.amount,
  p.source,
  CASE
    WHEN p.created_at > c.last_payment_at THEN '⚠️ ПЛАТЁЖ НОВЕЕ ЧЕМ ЗАПИСАНО - НУЖНО ПРОДЛЕНИЕ!'
    WHEN p.created_at IS NULL THEN '⚠️ НЕТ ЗАПИСЕЙ О ПЛАТЕЖЕ - НУЖНО ДОБАВИТЬ!'
    ELSE '✅ Данные согласованы'
  END as status
FROM client c
CROSS JOIN last_payment p;

-- ============================================
-- ШАГ 3: ИСПРАВЛЕНИЕ - Продлить подписку
-- ============================================
-- РАСКОММЕНТИРОВАТЬ ПОСЛЕ ДИАГНОСТИКИ!

-- Вариант A: Если пользователь УЖЕ есть в premium_clients (продление)
-- Продляем на 30 дней от текущей даты истечения (или от сейчас если истекла)
/*
UPDATE premium_clients
SET
  expires_at = CASE
    WHEN expires_at > NOW() THEN expires_at + INTERVAL '30 days'
    ELSE NOW() + INTERVAL '30 days'
  END,
  total_paid_usd = COALESCE(total_paid_usd, 0) + 50,
  payments_count = COALESCE(payments_count, 0) + 1,
  last_payment_at = NOW(),
  last_payment_method = '0xprocessing',
  source = '0xprocessing',
  plan = 'classic',
  updated_at = NOW()
WHERE telegram_id = 1030058890
RETURNING *;
*/

-- Вариант B: Если пользователя НЕТ в premium_clients (новый клиент)
/*
INSERT INTO premium_clients (
  telegram_id,
  username,
  plan,
  started_at,
  expires_at,
  in_channel,
  in_chat,
  source,
  total_paid_usd,
  payments_count,
  last_payment_at,
  last_payment_method,
  created_at,
  updated_at
) VALUES (
  1030058890,
  NULL, -- username если известен
  'classic',
  NOW(),
  NOW() + INTERVAL '30 days',
  FALSE,
  FALSE,
  '0xprocessing',
  50,
  1,
  NOW(),
  '0xprocessing',
  NOW(),
  NOW()
)
RETURNING *;
*/

-- ШАГ 4: Записать платёж в payment_history (если не записан)
/*
INSERT INTO payment_history (
  telegram_id,
  amount,
  currency,
  source,
  plan,
  contract_id,
  tx_hash,
  status,
  created_at
) VALUES (
  '1030058890',
  50, -- сумма в USD
  'USD',
  '0xprocessing',
  'classic',
  'manual_fix_' || extract(epoch from now())::text,
  NULL, -- tx_hash если известен
  'success',
  NOW()
);
*/

-- ============================================
-- ШАГ 5: ПРОВЕРКА после исправления
-- ============================================
/*
SELECT
  'ПРОВЕРКА ПОСЛЕ ИСПРАВЛЕНИЯ' as status,
  pc.telegram_id,
  pc.username,
  pc.plan,
  pc.expires_at,
  (pc.expires_at > NOW()) as is_active,
  pc.total_paid_usd,
  pc.payments_count,
  (SELECT COUNT(*) FROM payment_history WHERE telegram_id = '1030058890') as total_payments_in_history
FROM premium_clients pc
WHERE pc.telegram_id = 1030058890;
*/
