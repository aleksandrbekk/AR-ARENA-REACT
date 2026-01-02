# Настройка Supabase для AR ARENA

## Проблема
URL `https://rujvghydqpjfmvogmpxk.supabase.co` недоступен. Возможные причины:
1. Проект Supabase приостановлен (бесплатные проекты останавливаются после 7 дней неактивности)
2. Неправильный URL проекта
3. Проект был удален

## Решение - Создать новый проект Supabase

### Шаг 1: Создание проекта
1. Зайдите на https://supabase.com
2. Войдите в аккаунт или зарегистрируйтесь
3. Нажмите "New Project"
4. Заполните:
   - Project name: `ar-arena` (или любое)
   - Database Password: (запомните его!)
   - Region: выберите ближайший
5. Нажмите "Create new project"
6. Дождитесь создания (1-2 минуты)

### Шаг 2: Получение данных для подключения
После создания проекта:
1. Зайдите в Settings → API
2. Скопируйте:
   - **Project URL**: (например: https://xxxxxxxxxxx.supabase.co)
   - **anon public key**: (длинный ключ начинающийся с eyJ...)

### Шаг 3: Создание таблиц
1. В Supabase перейдите в SQL Editor
2. Нажмите "New query"
3. Вставьте этот SQL и выполните:

```sql
-- Создание таблиц для AR ARENA
CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    language_code TEXT,
    balance_ar INTEGER DEFAULT 0,
    referrer_id BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    type TEXT,
    amount INTEGER,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referral_relations (
    id SERIAL PRIMARY KEY,
    referrer_id BIGINT REFERENCES users(id),
    referral_id BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_completions (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    task_id TEXT,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, task_id)
);

-- Индексы для оптимизации
CREATE INDEX idx_users_referrer ON users(referrer_id);
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_referrals_referrer ON referral_relations(referrer_id);
CREATE INDEX idx_tasks_user ON task_completions(user_id);

-- Включение RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;

-- Политики для анонимного доступа
CREATE POLICY "Enable all for users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for referral_relations" ON referral_relations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for task_completions" ON task_completions FOR ALL USING (true) WITH CHECK (true);
```

### Шаг 4: Обновление конфигурации в файлах

После получения новых данных Supabase, нужно обновить их во ВСЕХ файлах:

1. `admin.html` - строки 598-599
2. `auth.js` - в начале файла
3. `supabase-client.js` - константы SUPABASE_URL и SUPABASE_ANON_KEY

Замените старые значения на новые:
```javascript
const SUPABASE_URL = 'ВАШ_НОВЫЙ_URL';
const SUPABASE_ANON_KEY = 'ВАШ_НОВЫЙ_КЛЮЧ';
```

### Шаг 5: Проверка
1. Загрузите обновленные файлы на сервер
2. В админке нажмите "Тест БД"
3. Должны увидеть зеленые галочки для всех таблиц

## Важно!
- Бесплатный проект Supabase автоматически останавливается после 7 дней неактивности
- Чтобы проект не останавливался, заходите в Supabase Dashboard хотя бы раз в неделю
- Или обновитесь до платного плана ($25/месяц)