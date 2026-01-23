-- ============================================
-- ПРОВЕРКА СОСТОЯНИЯ БД AR ARENA
-- Дата: 2026-01-12
-- ============================================

-- 1. ПРОВЕРКА НАЛИЧИЯ ДАННЫХ
SELECT
  'payment_history записей:' as info,
  COUNT(*) as count
FROM payment_history

UNION ALL

SELECT
  'premium_clients записей:',
  COUNT(*)
FROM premium_clients

UNION ALL

SELECT
  'Активных подписок:',
  COUNT(*)
FROM premium_clients
WHERE expires_at > NOW();

-- 2. ПОСЛЕДНИЕ ПЛАТЕЖИ
SELECT
  id,
  telegram_id,
  amount,
  currency,
  source,
  contract_id,
  created_at
FROM payment_history
ORDER BY created_at DESC
LIMIT 10;

-- 3. ПЛАТЕЖИ ЗА ЯНВАРЬ 2026
SELECT
  DATE(created_at) as payment_date,
  COUNT(*) as payments_count,
  SUM(amount) as total_amount,
  STRING_AGG(DISTINCT source, ', ') as sources
FROM payment_history
WHERE created_at >= '2026-01-01'
GROUP BY DATE(created_at)
ORDER BY payment_date DESC;

-- 4. СТАТИСТИКА ПО ИСТОЧНИКАМ
SELECT
  source,
  COUNT(*) as count,
  SUM(amount) as total_amount,
  MAX(created_at) as last_payment
FROM payment_history
GROUP BY source;

-- 5. ПРОВЕРКА RLS ПОЛИТИК
SELECT
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('payment_history', 'premium_clients')
ORDER BY tablename, policyname;

-- 6. ПРОВЕРКА ПРАВ ДОСТУПА
-- Попробуем прочитать как anon пользователь
SET ROLE anon;
SELECT COUNT(*) as anon_can_see FROM payment_history;
SELECT COUNT(*) as anon_can_see FROM premium_clients;
RESET ROLE;

-- 7. НАЙТИ ПРОБЛЕМНЫЕ ЗАПИСИ
-- Записи без contract_id (старые)
SELECT
  COUNT(*) as without_contract_id
FROM payment_history
WHERE contract_id IS NULL;

-- Записи с дублями contract_id
SELECT
  contract_id,
  COUNT(*) as duplicate_count
FROM payment_history
WHERE contract_id IS NOT NULL
GROUP BY contract_id
HAVING COUNT(*) > 1;