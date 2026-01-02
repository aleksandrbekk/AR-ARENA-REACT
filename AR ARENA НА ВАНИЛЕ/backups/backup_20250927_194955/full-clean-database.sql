-- ПОЛНАЯ ОЧИСТКА БАЗЫ ДАННЫХ AR ARENA
-- ВНИМАНИЕ: Это удалит ВСЕ данные безвозвратно!

-- 1. Удаляем все транзакции
DELETE FROM transactions;

-- 2. Удаляем все реферальные связи
DELETE FROM referral_relations;

-- 3. Удаляем все выполненные задания (если есть)
DELETE FROM task_completions;

-- 4. Удаляем ВСЕХ пользователей
DELETE FROM users;

-- Проверяем что база полностью пустая
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'transactions', COUNT(*) FROM transactions
UNION ALL
SELECT 'referral_relations', COUNT(*) FROM referral_relations
UNION ALL
SELECT 'task_completions', COUNT(*) FROM task_completions;

-- Все таблицы должны показать count = 0