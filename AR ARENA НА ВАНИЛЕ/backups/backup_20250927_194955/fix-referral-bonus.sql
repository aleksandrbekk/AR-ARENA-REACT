-- Скрипт для начисления реферального бонуса Александру за Анастасию
-- Выполните этот SQL в Supabase SQL Editor

-- 1. Проверяем текущую ситуацию
SELECT
    u1.first_name as referrer_name,
    u1.telegram_id as referrer_tg_id,
    u1.balance_ar as referrer_balance,
    u2.first_name as referred_name,
    u2.telegram_id as referred_tg_id,
    u2.referrer_id
FROM users u1
JOIN users u2 ON u2.referrer_id = u1.id
WHERE u1.telegram_id = 190202791;

-- 2. Обновляем баланс Александра (добавляем 100 AR)
UPDATE users
SET balance_ar = balance_ar + 100
WHERE telegram_id = 190202791;

-- 3. Добавляем транзакцию о бонусе
INSERT INTO transactions (user_id, type, amount, status, description, created_at)
SELECT
    id,
    'referral_bonus',
    100,
    'completed',
    'Бонус за приглашение пользователя Анастасия',
    NOW()
FROM users
WHERE telegram_id = 190202791;

-- 4. Проверяем результат
SELECT
    first_name,
    telegram_id,
    balance_ar,
    (SELECT COUNT(*) FROM users WHERE referrer_id = (SELECT id FROM users WHERE telegram_id = 190202791)) as referrals_count
FROM users
WHERE telegram_id = 190202791;