-- ============================================
-- МИГРАЦИЯ: Исправление доступа к payment_history
-- Проблема: anon ключ не может читать таблицу
-- Дата: 2026-01-12
-- ============================================

-- 1. Удаляем старые политики
DROP POLICY IF EXISTS "Allow all for authenticated" ON payment_history;
DROP POLICY IF EXISTS "Allow all for authenticated" ON premium_clients;

-- 2. Создаём новые политики для payment_history

-- Чтение для всех (включая anon)
CREATE POLICY "Enable read access for all users"
    ON payment_history
    FOR SELECT
    USING (true);

-- Вставка только для service_role
CREATE POLICY "Enable insert for service role only"
    ON payment_history
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Обновление только для service_role
CREATE POLICY "Enable update for service role only"
    ON payment_history
    FOR UPDATE
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Удаление только для service_role
CREATE POLICY "Enable delete for service role only"
    ON payment_history
    FOR DELETE
    TO service_role
    USING (true);

-- 3. Создаём новые политики для premium_clients

-- Чтение для всех (включая anon)
CREATE POLICY "Enable read access for all users"
    ON premium_clients
    FOR SELECT
    USING (true);

-- Вставка только для service_role
CREATE POLICY "Enable insert for service role only"
    ON premium_clients
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Обновление только для service_role
CREATE POLICY "Enable update for service role only"
    ON premium_clients
    FOR UPDATE
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Удаление только для service_role
CREATE POLICY "Enable delete for service role only"
    ON premium_clients
    FOR DELETE
    TO service_role
    USING (true);

-- 4. Добавим индексы для оптимизации если их нет
CREATE INDEX IF NOT EXISTS idx_payment_history_created_at ON payment_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_history_source ON payment_history(source);
CREATE INDEX IF NOT EXISTS idx_payment_history_currency ON payment_history(currency);

-- 5. Проверка что таблицы доступны
DO $$
DECLARE
    payment_count INTEGER;
    premium_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO payment_count FROM payment_history;
    SELECT COUNT(*) INTO premium_count FROM premium_clients;

    RAISE NOTICE '✅ payment_history содержит % записей', payment_count;
    RAISE NOTICE '✅ premium_clients содержит % записей', premium_count;

    IF payment_count = 0 THEN
        RAISE NOTICE '⚠️ ВНИМАНИЕ: payment_history пустая! Проверьте webhook обработчики';
    END IF;
END $$;