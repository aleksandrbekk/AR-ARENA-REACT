-- ============================================
-- МИГРАЦИЯ: Защита от дублирования платежей
-- Дата: 2026-01-12
-- ============================================

-- 1. Добавляем колонку contract_id если её нет
ALTER TABLE payment_history
ADD COLUMN IF NOT EXISTS contract_id TEXT;

-- 2. Добавляем колонку tx_hash если её нет
ALTER TABLE payment_history
ADD COLUMN IF NOT EXISTS tx_hash TEXT;

-- 3. Добавляем колонку plan если её нет
ALTER TABLE payment_history
ADD COLUMN IF NOT EXISTS plan TEXT;

-- 4. Добавляем колонку status если её нет
ALTER TABLE payment_history
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'success';

-- 5. Создаём уникальный индекс на contract_id (но разрешаем NULL)
-- Это позволит существующим записям без contract_id остаться,
-- но предотвратит дублирование новых записей
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_history_contract_id_unique
ON payment_history(contract_id)
WHERE contract_id IS NOT NULL;

-- 6. Обновляем существующие записи без contract_id (генерируем уникальные)
UPDATE payment_history
SET contract_id = 'legacy_' || id::text || '_' || EXTRACT(EPOCH FROM created_at)::bigint::text
WHERE contract_id IS NULL;

-- 7. Делаем contract_id NOT NULL после заполнения
ALTER TABLE payment_history
ALTER COLUMN contract_id SET NOT NULL;

-- 8. Комментарий для документации
COMMENT ON COLUMN payment_history.contract_id IS 'Уникальный ID платежа от провайдера (Lava contractId, 0x PaymentId, Toolsy eventId)';
COMMENT ON COLUMN payment_history.tx_hash IS 'Хэш транзакции (для крипто-платежей)';
COMMENT ON COLUMN payment_history.plan IS 'Тариф подписки (classic, gold, platinum, private)';
COMMENT ON COLUMN payment_history.status IS 'Статус платежа (success, failed, pending)';
