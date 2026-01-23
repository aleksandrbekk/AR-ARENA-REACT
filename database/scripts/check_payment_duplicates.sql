-- AR ARENA: ПРОВЕРКА И ОЧИСТКА ДУБЛИКАТОВ ПЛАТЕЖЕЙ
-- Дата: 2026-01-12
-- Автор: AI Agent для Александра

-- ============================================
-- 1. ПРОВЕРКА ДУБЛИКАТОВ В payment_history
-- ============================================

-- Найти все дубликаты по contract_id
SELECT
    contract_id,
    COUNT(*) as duplicate_count,
    SUM(amount) as total_amount,
    STRING_AGG(DISTINCT telegram_id::text, ', ') as telegram_ids,
    STRING_AGG(id::text, ', ' ORDER BY created_at) as payment_ids,
    MIN(created_at) as first_payment,
    MAX(created_at) as last_payment
FROM payment_history
WHERE contract_id IS NOT NULL
GROUP BY contract_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, first_payment DESC;

-- ============================================
-- 2. НАЙТИ ПЛАТЕЖИ БЕЗ contract_id (УЯЗВИМОСТЬ!)
-- ============================================

SELECT
    id,
    telegram_id,
    amount,
    currency,
    source,
    created_at,
    tx_hash
FROM payment_history
WHERE contract_id IS NULL
ORDER BY created_at DESC
LIMIT 50;

-- ============================================
-- 3. СТАТИСТИКА ПО ИСТОЧНИКАМ
-- ============================================

SELECT
    source,
    COUNT(*) as total_payments,
    COUNT(DISTINCT contract_id) as unique_payments,
    COUNT(*) - COUNT(DISTINCT contract_id) as potential_duplicates,
    SUM(amount) as total_amount,
    AVG(amount) as avg_amount,
    COUNT(CASE WHEN contract_id IS NULL THEN 1 END) as payments_without_id
FROM payment_history
GROUP BY source
ORDER BY total_payments DESC;

-- ============================================
-- 4. НАЙТИ ПОДОЗРИТЕЛЬНЫЕ ПЛАТЕЖИ (одинаковые в течение 5 минут)
-- ============================================

SELECT
    p1.id as payment1_id,
    p2.id as payment2_id,
    p1.telegram_id,
    p1.amount,
    p1.created_at as time1,
    p2.created_at as time2,
    EXTRACT(EPOCH FROM (p2.created_at - p1.created_at)) as seconds_apart,
    p1.contract_id as contract1,
    p2.contract_id as contract2
FROM payment_history p1
JOIN payment_history p2
    ON p1.telegram_id = p2.telegram_id
    AND p1.amount = p2.amount
    AND p1.id < p2.id
    AND p2.created_at - p1.created_at < INTERVAL '5 minutes'
ORDER BY p1.created_at DESC;

-- ============================================
-- 5. ПРОВЕРКА premium_clients НА МНОЖЕСТВЕННЫЕ ЗАПИСИ
-- ============================================

-- Найти пользователей с несколькими записями
SELECT
    telegram_id,
    COUNT(*) as record_count,
    STRING_AGG(id::text, ', ') as client_ids,
    STRING_AGG(plan, ', ') as plans,
    STRING_AGG(expires_at::text, ', ') as expiry_dates
FROM premium_clients
WHERE telegram_id IS NOT NULL
GROUP BY telegram_id
HAVING COUNT(*) > 1
ORDER BY record_count DESC;

-- Найти записи без telegram_id (только username)
SELECT
    username,
    COUNT(*) as record_count,
    STRING_AGG(id::text, ', ') as client_ids,
    STRING_AGG(plan, ', ') as plans
FROM premium_clients
WHERE telegram_id IS NULL AND username IS NOT NULL
GROUP BY username
HAVING COUNT(*) > 1
ORDER BY record_count DESC;

-- ============================================
-- 6. СВОДКА ДЛЯ АДМИНИСТРАТОРА
-- ============================================

SELECT
    'Всего платежей' as metric,
    COUNT(*)::text as value
FROM payment_history
UNION ALL
SELECT
    'Уникальных платежей',
    COUNT(DISTINCT contract_id)::text
FROM payment_history
WHERE contract_id IS NOT NULL
UNION ALL
SELECT
    'Платежей без ID',
    COUNT(*)::text
FROM payment_history
WHERE contract_id IS NULL
UNION ALL
SELECT
    'Возможных дубликатов',
    (COUNT(*) - COUNT(DISTINCT contract_id))::text
FROM payment_history
WHERE contract_id IS NOT NULL
UNION ALL
SELECT
    'Сумма всех платежей',
    ROUND(SUM(amount))::text || ' USD'
FROM payment_history
UNION ALL
SELECT
    'Premium клиентов',
    COUNT(DISTINCT COALESCE(telegram_id::text, username))::text
FROM premium_clients;

-- ============================================
-- 7. СКРИПТЫ ДЛЯ ОЧИСТКИ (ОСТОРОЖНО! СНАЧАЛА ПРОВЕРЬТЕ!)
-- ============================================

-- ВНИМАНИЕ: НЕ ВЫПОЛНЯЙТЕ ЭТОТ БЛОК БЕЗ BACKUP!

-- Удалить дубликаты, оставив только самый ранний платёж
/*
WITH duplicates AS (
    SELECT
        id,
        contract_id,
        ROW_NUMBER() OVER (
            PARTITION BY contract_id
            ORDER BY created_at ASC
        ) as rn
    FROM payment_history
    WHERE contract_id IS NOT NULL
)
DELETE FROM payment_history
WHERE id IN (
    SELECT id
    FROM duplicates
    WHERE rn > 1
);
*/

-- Установить contract_id для платежей без него
/*
UPDATE payment_history
SET contract_id = source || '_' || telegram_id || '_' || amount || '_' || EXTRACT(EPOCH FROM created_at)::text
WHERE contract_id IS NULL;
*/

-- ============================================
-- 8. РЕКОМЕНДАЦИИ
-- ============================================

/*
ПОСЛЕ АНАЛИЗА РЕЗУЛЬТАТОВ:

1. Если есть дубликаты в payment_history:
   - Запустите скрипт удаления дубликатов (раздел 7)
   - Убедитесь что миграция 20260112_fix_payment_history_duplicates.sql применена

2. Если есть платежи без contract_id:
   - Запустите скрипт установки contract_id (раздел 7)
   - Проверьте новый код webhook'ов

3. Если есть дубликаты в premium_clients:
   - Оставьте запись с последней expires_at
   - Удалите старые записи

4. Проверьте что новый код развёрнут:
   - api/lava-premium-webhook.js (с maybeSingle)
   - api/0xprocessing-webhook.js (с fallback ID)
*/