-- ============================================
-- ИСПРАВЛЕНИЕ ДОСТУПА К PAYMENT_HISTORY
-- Проблема: Админка не видит платежи
-- Дата: 2026-01-12
-- ============================================

-- 1. ПРОВЕРКА ДАННЫХ В ТАБЛИЦЕ
SELECT COUNT(*) as total_payments FROM payment_history;
SELECT * FROM payment_history ORDER BY created_at DESC LIMIT 5;

-- 2. ПРОВЕРКА RLS ПОЛИТИК
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'payment_history';

-- 3. УДАЛЕНИЕ СТАРЫХ ПОЛИТИК
DROP POLICY IF EXISTS "Allow all for authenticated" ON payment_history;

-- 4. СОЗДАНИЕ НОВЫХ ПОЛИТИК ДЛЯ АНОНИМНОГО ДОСТУПА
-- Важно: AR Arena использует anon ключ для frontend!

-- Политика для чтения (SELECT)
CREATE POLICY "Enable read access for all users"
    ON payment_history
    FOR SELECT
    USING (true);

-- Политика для вставки (INSERT) - только service role
CREATE POLICY "Enable insert for service role only"
    ON payment_history
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Политика для обновления (UPDATE) - только service role
CREATE POLICY "Enable update for service role only"
    ON payment_history
    FOR UPDATE
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Политика для удаления (DELETE) - только service role
CREATE POLICY "Enable delete for service role only"
    ON payment_history
    FOR DELETE
    TO service_role
    USING (true);

-- 5. ПРОВЕРКА PREMIUM_CLIENTS
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'premium_clients';

-- 6. ИСПРАВЛЕНИЕ ПОЛИТИК ДЛЯ PREMIUM_CLIENTS
DROP POLICY IF EXISTS "Allow all for authenticated" ON premium_clients;

-- Политика для чтения - всем
CREATE POLICY "Enable read access for all users"
    ON premium_clients
    FOR SELECT
    USING (true);

-- Политика для вставки - service role
CREATE POLICY "Enable insert for service role only"
    ON premium_clients
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Политика для обновления - service role
CREATE POLICY "Enable update for service role only"
    ON premium_clients
    FOR UPDATE
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Политика для удаления - service role
CREATE POLICY "Enable delete for service role only"
    ON premium_clients
    FOR DELETE
    TO service_role
    USING (true);

-- 7. ПРОВЕРКА РЕЗУЛЬТАТА
SELECT 'payment_history count:', COUNT(*) FROM payment_history
UNION ALL
SELECT 'premium_clients count:', COUNT(*) FROM premium_clients;

-- 8. ТЕСТОВАЯ ВСТАВКА (для проверки что webhook'и работают)
-- INSERT INTO payment_history (telegram_id, amount, currency, source, contract_id, created_at)
-- VALUES ('190202791', 99.99, 'USD', 'test', 'test_' || NOW()::text, NOW());

-- 9. ВАЖНАЯ ИНФОРМАЦИЯ
/*
AR Arena использует ANON ключ для frontend!
Это значит что все политики должны разрешать чтение для ВСЕХ (не только authenticated).

Если после применения этого скрипта платежи всё ещё не видны:
1. Проверьте что миграции применены
2. Проверьте что в таблице есть данные (пункт 1)
3. Попробуйте тестовую вставку (пункт 8)
4. Проверьте консоль браузера на ошибки
*/