-- Миграция: Добавление поля contract_id в таблицу premium_clients
-- Дата: 2026-01-22
-- Описание: Добавляет поле для хранения ID подписки от Lava.top для возможности отмены

-- 1. Добавить колонку contract_id (nullable TEXT)
ALTER TABLE premium_clients
ADD COLUMN IF NOT EXISTS contract_id TEXT;

-- 2. Создать частичный индекс на contract_id (только для NOT NULL значений)
CREATE INDEX IF NOT EXISTS idx_premium_clients_contract_id
ON premium_clients(contract_id)
WHERE contract_id IS NOT NULL;

-- 3. Добавить комментарий к колонке
COMMENT ON COLUMN premium_clients.contract_id IS 'ID подписки от Lava.top для отмены';
