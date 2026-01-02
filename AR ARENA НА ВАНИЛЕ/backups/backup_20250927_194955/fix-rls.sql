-- Отключаем RLS для таблиц, чтобы админка могла читать данные

-- Для таблицы users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users are viewable by everyone" ON users;
CREATE POLICY "Users are viewable by everyone" ON users
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (true);

-- Для таблицы transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Transactions are viewable by everyone" ON transactions;
CREATE POLICY "Transactions are viewable by everyone" ON transactions
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Transactions can be inserted" ON transactions;
CREATE POLICY "Transactions can be inserted" ON transactions
    FOR INSERT WITH CHECK (true);

-- Для таблицы referral_relations
ALTER TABLE referral_relations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Referral relations are viewable by everyone" ON referral_relations;
CREATE POLICY "Referral relations are viewable by everyone" ON referral_relations
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Referral relations can be inserted" ON referral_relations;
CREATE POLICY "Referral relations can be inserted" ON referral_relations
    FOR INSERT WITH CHECK (true);

-- Для таблицы task_completions
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Task completions are viewable by everyone" ON task_completions;
CREATE POLICY "Task completions are viewable by everyone" ON task_completions
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Task completions can be inserted" ON task_completions;
CREATE POLICY "Task completions can be inserted" ON task_completions
    FOR INSERT WITH CHECK (true);