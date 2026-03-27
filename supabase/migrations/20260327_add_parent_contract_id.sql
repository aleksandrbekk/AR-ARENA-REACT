-- Добавляем parent_contract_id в premium_clients
-- parentContractId — это ID подписки в Lava (не меняется между платежами)
-- contract_id — это ID конкретного платежа (меняется каждый раз)
-- Для отмены подписки через Lava API нужен именно parentContractId

ALTER TABLE premium_clients
ADD COLUMN IF NOT EXISTS parent_contract_id TEXT;

-- Индекс для быстрого поиска по parent_contract_id
CREATE INDEX IF NOT EXISTS idx_premium_clients_parent_contract_id
ON premium_clients(parent_contract_id)
WHERE parent_contract_id IS NOT NULL;

-- Комментарий к колонке
COMMENT ON COLUMN premium_clients.parent_contract_id IS 'Lava subscription ID (parentContractId). Used for cancellation. Does not change between recurring payments.';
