-- 1. Найти все триггеры на таблице users
SELECT
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users';

-- 2. Найти функции которые используют location_id
SELECT
    proname as function_name,
    prosrc as source_code
FROM pg_proc
WHERE prosrc LIKE '%location_id%' AND prosrc LIKE '%user_locations%';

-- 3. Если найден триггер с location_id - удалить его
-- DROP TRIGGER IF EXISTS <trigger_name> ON users;

-- 4. Или исправить функцию триггера, заменив location_id на location_slug
