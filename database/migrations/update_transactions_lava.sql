-- Добавить поле lava_contract_id в таблицу transactions

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS lava_contract_id TEXT;

-- Создать индекс для быстрого поиска по contract_id
CREATE INDEX IF NOT EXISTS idx_transactions_lava_contract_id
ON transactions(lava_contract_id);

-- Комментарий к полю
COMMENT ON COLUMN transactions.lava_contract_id IS 'ID контракта из Lava.top для отслеживания платежей';
