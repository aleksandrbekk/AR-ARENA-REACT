-- SQL скрипт для очистки базы данных AR ARENA
-- ВНИМАНИЕ: Это удалит ВСЕ данные!

-- 1. Очищаем таблицу транзакций
DELETE FROM transactions;

-- 2. Очищаем таблицу реферальных связей
DELETE FROM referral_relations;

-- 3. Очищаем таблицу пользователей
DELETE FROM users;

-- Проверяем что всё очищено
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'transactions', COUNT(*) FROM transactions
UNION ALL
SELECT 'referral_relations', COUNT(*) FROM referral_relations;