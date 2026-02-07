-- ==========================================
-- TASKS SYSTEM - AR ARENA
-- ==========================================
-- Дата: 2026-01-30
-- Назначение: Система заданий с начислением AIR coins

-- ==========================================
-- 1. ТАБЛИЦА TASKS
-- ==========================================

CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  task_type VARCHAR(50) NOT NULL CHECK (task_type IN ('youtube_watch', 'youtube_like', 'youtube_comment', 'youtube_subscribe')),
  target_url TEXT NOT NULL,
  reward_amount INTEGER NOT NULL CHECK (reward_amount > 0),
  wait_seconds INTEGER NOT NULL DEFAULT 60 CHECK (wait_seconds >= 0),
  max_completions INTEGER,  -- NULL = безлимитно
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by BIGINT  -- telegram_id админа
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_tasks_is_active ON tasks(is_active);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_tasks_dates ON tasks(starts_at, ends_at);

COMMENT ON TABLE tasks IS 'Задания для пользователей с наградой в AIR coins';
COMMENT ON COLUMN tasks.task_type IS 'Тип задания: youtube_watch, youtube_like, youtube_comment, youtube_subscribe';
COMMENT ON COLUMN tasks.wait_seconds IS 'Сколько секунд ждать перед получением награды';
COMMENT ON COLUMN tasks.max_completions IS 'Максимум выполнений (NULL = безлимит)';

-- ==========================================
-- 2. ТАБЛИЦА TASK_COMPLETIONS
-- ==========================================

CREATE TABLE IF NOT EXISTS task_completions (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  reward_claimed BOOLEAN DEFAULT false,
  reward_amount INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(task_id, user_id)  -- каждый пользователь выполняет задание 1 раз
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_task_completions_user ON task_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_task ON task_completions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_claimed ON task_completions(reward_claimed);

COMMENT ON TABLE task_completions IS 'Выполнения заданий пользователями';

-- ==========================================
-- 3. RPC: START_TASK
-- ==========================================
-- Начать выполнение задания

CREATE OR REPLACE FUNCTION start_task(
  p_task_id INTEGER,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task RECORD;
  v_existing RECORD;
  v_completion_count INTEGER;
BEGIN
  -- Получить задание
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id AND is_active = true;
  
  IF v_task IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task not found or inactive');
  END IF;
  
  -- Проверить даты
  IF v_task.starts_at IS NOT NULL AND NOW() < v_task.starts_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task not started yet');
  END IF;
  
  IF v_task.ends_at IS NOT NULL AND NOW() > v_task.ends_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task has ended');
  END IF;
  
  -- Проверить лимит выполнений
  IF v_task.max_completions IS NOT NULL THEN
    SELECT COUNT(*) INTO v_completion_count 
    FROM task_completions 
    WHERE task_id = p_task_id AND reward_claimed = true;
    
    IF v_completion_count >= v_task.max_completions THEN
      RETURN jsonb_build_object('success', false, 'error', 'Task limit reached');
    END IF;
  END IF;
  
  -- Проверить, не выполнял ли уже
  SELECT * INTO v_existing 
  FROM task_completions 
  WHERE task_id = p_task_id AND user_id = p_user_id;
  
  IF v_existing IS NOT NULL THEN
    IF v_existing.reward_claimed THEN
      RETURN jsonb_build_object('success', false, 'error', 'Already completed', 'already_claimed', true);
    ELSE
      -- Уже начато, вернуть данные
      RETURN jsonb_build_object(
        'success', true,
        'already_started', true,
        'started_at', v_existing.started_at,
        'wait_seconds', v_task.wait_seconds,
        'reward_amount', v_task.reward_amount
      );
    END IF;
  END IF;
  
  -- Создать запись о начале выполнения
  INSERT INTO task_completions (task_id, user_id, started_at)
  VALUES (p_task_id, p_user_id, NOW());
  
  RETURN jsonb_build_object(
    'success', true,
    'started_at', NOW(),
    'wait_seconds', v_task.wait_seconds,
    'reward_amount', v_task.reward_amount,
    'target_url', v_task.target_url
  );
END;
$$;

-- ==========================================
-- 4. RPC: CLAIM_TASK_REWARD
-- ==========================================
-- Получить награду за задание

CREATE OR REPLACE FUNCTION claim_task_reward(
  p_task_id INTEGER,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task RECORD;
  v_completion RECORD;
  v_elapsed_seconds INTEGER;
  v_new_balance NUMERIC;
  v_db_user_id BIGINT;
BEGIN
  -- Получить задание
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id;
  
  IF v_task IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task not found');
  END IF;
  
  -- Получить запись о выполнении
  SELECT * INTO v_completion 
  FROM task_completions 
  WHERE task_id = p_task_id AND user_id = p_user_id;
  
  IF v_completion IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task not started');
  END IF;
  
  IF v_completion.reward_claimed THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reward already claimed');
  END IF;
  
  -- Проверить время
  v_elapsed_seconds := EXTRACT(EPOCH FROM (NOW() - v_completion.started_at))::INTEGER;
  
  IF v_elapsed_seconds < v_task.wait_seconds THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Not enough time passed',
      'elapsed', v_elapsed_seconds,
      'required', v_task.wait_seconds
    );
  END IF;
  
  -- Получить id пользователя из таблицы users
  SELECT id INTO v_db_user_id FROM users WHERE id = p_user_id;
  
  -- Начислить награду
  UPDATE users
  SET balance_ar = COALESCE(balance_ar, 0) + v_task.reward_amount
  WHERE id = p_user_id
  RETURNING balance_ar INTO v_new_balance;
  
  -- Обновить запись о выполнении
  UPDATE task_completions
  SET 
    completed_at = NOW(),
    reward_claimed = true,
    reward_amount = v_task.reward_amount
  WHERE task_id = p_task_id AND user_id = p_user_id;
  
  -- Записать транзакцию
  INSERT INTO transactions (user_id, currency, amount, type, description, metadata)
  SELECT 
    u.id,
    'AR',
    v_task.reward_amount,
    'task_reward',
    format('Task completed: %s', v_task.title),
    jsonb_build_object(
      'task_id', p_task_id,
      'task_title', v_task.title,
      'task_type', v_task.task_type
    )
  FROM users u WHERE u.id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'reward_amount', v_task.reward_amount,
    'new_balance', v_new_balance,
    'task_title', v_task.title
  );
END;
$$;

-- ==========================================
-- 5. RPC: GET_USER_TASKS
-- ==========================================
-- Получить список заданий для пользователя

CREATE OR REPLACE FUNCTION get_user_tasks(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'title', t.title,
      'description', t.description,
      'task_type', t.task_type,
      'target_url', t.target_url,
      'reward_amount', t.reward_amount,
      'wait_seconds', t.wait_seconds,
      'starts_at', t.starts_at,
      'ends_at', t.ends_at,
      'completion', CASE 
        WHEN tc.id IS NOT NULL THEN jsonb_build_object(
          'started_at', tc.started_at,
          'completed_at', tc.completed_at,
          'reward_claimed', tc.reward_claimed
        )
        ELSE NULL
      END
    ) ORDER BY 
      CASE WHEN tc.reward_claimed = true THEN 1 ELSE 0 END,
      t.created_at DESC
  ) INTO v_result
  FROM tasks t
  LEFT JOIN task_completions tc ON t.id = tc.task_id AND tc.user_id = p_user_id
  WHERE t.is_active = true
    AND (t.starts_at IS NULL OR t.starts_at <= NOW())
    AND (t.ends_at IS NULL OR t.ends_at > NOW());
  
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- ==========================================
-- 6. RPC: ADMIN_CREATE_TASK
-- ==========================================

CREATE OR REPLACE FUNCTION admin_create_task(
  p_title TEXT,
  p_description TEXT,
  p_task_type TEXT,
  p_target_url TEXT,
  p_reward_amount INTEGER,
  p_wait_seconds INTEGER DEFAULT 60,
  p_max_completions INTEGER DEFAULT NULL,
  p_starts_at TIMESTAMPTZ DEFAULT NULL,
  p_ends_at TIMESTAMPTZ DEFAULT NULL,
  p_created_by BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task_id INTEGER;
BEGIN
  -- Валидация
  IF p_title IS NULL OR length(trim(p_title)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Title is required');
  END IF;
  
  IF p_task_type NOT IN ('youtube_watch', 'youtube_like', 'youtube_comment', 'youtube_subscribe') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid task type');
  END IF;
  
  IF p_reward_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reward must be positive');
  END IF;
  
  -- Создать задание
  INSERT INTO tasks (
    title, description, task_type, target_url, 
    reward_amount, wait_seconds, max_completions,
    starts_at, ends_at, created_by
  )
  VALUES (
    p_title, p_description, p_task_type, p_target_url,
    p_reward_amount, p_wait_seconds, p_max_completions,
    p_starts_at, p_ends_at, p_created_by
  )
  RETURNING id INTO v_task_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'task_id', v_task_id,
    'title', p_title
  );
END;
$$;

-- ==========================================
-- 7. RLS POLICIES
-- ==========================================

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;

-- Tasks: все авторизованные видят активные
CREATE POLICY "Anyone can view active tasks" ON tasks
  FOR SELECT USING (is_active = true);

-- Task completions: пользователь видит только свои
CREATE POLICY "Users can view own completions" ON task_completions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own completions" ON task_completions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own completions" ON task_completions
  FOR UPDATE USING (user_id = auth.uid());

-- ==========================================
-- 8. GRANTS
-- ==========================================

GRANT SELECT ON tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE ON task_completions TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE task_completions_id_seq TO authenticated;

GRANT EXECUTE ON FUNCTION start_task TO authenticated;
GRANT EXECUTE ON FUNCTION claim_task_reward TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_tasks TO authenticated;
GRANT EXECUTE ON FUNCTION admin_create_task TO authenticated;

-- ==========================================
-- 9. ТЕСТОВОЕ ЗАДАНИЕ
-- ==========================================

INSERT INTO tasks (title, description, task_type, target_url, reward_amount, wait_seconds, created_by)
VALUES (
  'Посмотреть видео о криптовалютах',
  'Посмотрите обучающее видео и получите награду',
  'youtube_watch',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  50,
  30,
  190202791
);

-- ==========================================
-- ГОТОВО!
-- ==========================================
