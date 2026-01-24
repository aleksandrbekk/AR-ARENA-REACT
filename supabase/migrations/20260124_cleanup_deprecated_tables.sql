-- ============================================
-- МИГРАЦИЯ: Очистка устаревших таблиц
-- Дата: 2026-01-24
-- ВНИМАНИЕ: Выполнить ТОЛЬКО после подтверждения!
-- ============================================

-- ============================================
-- ШАГ 1: БЭКАП (выполнить перед удалением!)
-- ============================================

-- Сначала сохраним данные если есть
CREATE TABLE IF NOT EXISTS _backup_payments AS
SELECT * FROM payments;

-- Проверить количество записей перед удалением
DO $$
DECLARE
  payments_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO payments_count FROM payments;
  RAISE NOTICE '📊 Таблица payments содержит % записей', payments_count;

  IF payments_count > 0 THEN
    RAISE NOTICE '⚠️ Данные будут сохранены в _backup_payments';
  END IF;
END $$;

-- ============================================
-- ШАГ 2: УДАЛЕНИЕ ТАБЛИЦЫ payments
-- ============================================

-- Эта таблица НЕ используется в коде (только в test-supabase.mjs)
-- Все реальные платежи идут в payment_history

-- DROP TABLE IF EXISTS payments;
-- Раскомментировать после проверки бэкапа!

-- ============================================
-- ШАГ 3: Очистка алиасов в premium_clients
-- (Можно выполнять позже, после обновления кода)
-- ============================================

-- Проверим какие поля используются:
-- plan vs tariff
-- started_at vs start_date
-- total_paid vs total_paid_usd

-- Синхронизация данных (на всякий случай)
UPDATE premium_clients
SET tariff = plan
WHERE tariff != plan OR tariff IS NULL;

UPDATE premium_clients
SET start_date = started_at
WHERE start_date != started_at OR start_date IS NULL;

UPDATE premium_clients
SET total_paid = total_paid_usd
WHERE total_paid != total_paid_usd OR total_paid IS NULL;

-- Удаление алиасов (ПОСЛЕ обновления кода):
-- ALTER TABLE premium_clients DROP COLUMN IF EXISTS tariff;
-- ALTER TABLE premium_clients DROP COLUMN IF EXISTS start_date;
-- ALTER TABLE premium_clients DROP COLUMN IF EXISTS total_paid;

-- ============================================
-- КОММЕНТАРИИ ДЛЯ ДОКУМЕНТАЦИИ
-- ============================================

COMMENT ON TABLE payment_history IS 'Основная таблица истории платежей. Используется всеми webhook-ами.';
COMMENT ON TABLE premium_clients IS 'Подписчики Premium AR Club. telegram_id - уникальный ключ.';
COMMENT ON TABLE users IS 'Игроки Mini App (баланс AR, энергия, скины)';
COMMENT ON TABLE bot_users IS 'Все пользователи Telegram бота (для отслеживания)';
COMMENT ON TABLE bull_users IS 'Игроки Bull Game (отдельная механика)';
COMMENT ON TABLE utm_links IS 'UTM ссылки для отслеживания конверсий оплаты';
COMMENT ON TABLE utm_tool_links IS 'UTM ссылки для отслеживания кликов на инструменты';
