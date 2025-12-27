-- ============================================
-- INBOX CHAT SYSTEM
-- Система чатов для AR ARENA Bot
-- 2025-12-27
-- ============================================

-- ============================================
-- ТАБЛИЦА CONVERSATIONS (диалоги)
-- ============================================

CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT NOT NULL UNIQUE,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,

  -- Статус диалога
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'archived')),
  is_read BOOLEAN DEFAULT FALSE,
  is_starred BOOLEAN DEFAULT FALSE,

  -- Метаданные
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_text TEXT,
  last_message_from TEXT DEFAULT 'user', -- 'user' или 'bot'
  unread_count INTEGER DEFAULT 0,

  -- Теги и заметки
  tags TEXT[] DEFAULT '{}',
  notes TEXT,

  -- Связь с premium
  is_premium BOOLEAN DEFAULT FALSE,
  premium_plan TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для conversations
CREATE INDEX IF NOT EXISTS idx_chat_conversations_telegram_id ON chat_conversations(telegram_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_last_message ON chat_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_unread ON chat_conversations(is_read, unread_count);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_status ON chat_conversations(status);

-- ============================================
-- ТАБЛИЦА MESSAGES (сообщения)
-- ============================================

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE,
  telegram_id BIGINT NOT NULL,

  -- Контент сообщения
  message_id BIGINT, -- Telegram message_id
  text TEXT,

  -- Тип сообщения
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'photo', 'video', 'document', 'voice', 'sticker', 'location', 'contact', 'command')),

  -- Медиа (если есть)
  media_file_id TEXT,
  media_url TEXT,
  caption TEXT,

  -- Метаданные
  is_read BOOLEAN DEFAULT FALSE,
  is_command BOOLEAN DEFAULT FALSE,
  command_name TEXT,

  -- Отправитель для outgoing
  sent_by TEXT, -- telegram_id админа или 'bot' для автоответов

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_telegram_id ON chat_messages(telegram_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_direction ON chat_messages(direction);

-- ============================================
-- ФУНКЦИЯ: Обновить conversation при новом сообщении
-- ============================================

CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_conversations
  SET
    last_message_at = NEW.created_at,
    last_message_text = COALESCE(NEW.text, NEW.caption, '[media]'),
    last_message_from = CASE WHEN NEW.direction = 'incoming' THEN 'user' ELSE 'bot' END,
    unread_count = CASE
      WHEN NEW.direction = 'incoming' THEN unread_count + 1
      ELSE unread_count
    END,
    is_read = CASE
      WHEN NEW.direction = 'incoming' THEN FALSE
      ELSE is_read
    END,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер
DROP TRIGGER IF EXISTS trg_update_conversation_on_message ON chat_messages;
CREATE TRIGGER trg_update_conversation_on_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();

-- ============================================
-- ФУНКЦИЯ: Создать или получить conversation
-- ============================================

CREATE OR REPLACE FUNCTION get_or_create_conversation(
  p_telegram_id BIGINT,
  p_username TEXT DEFAULT NULL,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
  v_is_premium BOOLEAN := FALSE;
  v_premium_plan TEXT := NULL;
BEGIN
  -- Проверяем premium статус
  SELECT TRUE, plan INTO v_is_premium, v_premium_plan
  FROM premium_clients
  WHERE telegram_id = p_telegram_id
    AND expires_at > NOW()
  LIMIT 1;

  -- Ищем существующий диалог
  SELECT id INTO v_conversation_id
  FROM chat_conversations
  WHERE telegram_id = p_telegram_id;

  IF v_conversation_id IS NULL THEN
    -- Создаём новый
    INSERT INTO chat_conversations (
      telegram_id, username, first_name, last_name,
      is_premium, premium_plan
    ) VALUES (
      p_telegram_id, p_username, p_first_name, p_last_name,
      v_is_premium, v_premium_plan
    )
    RETURNING id INTO v_conversation_id;
  ELSE
    -- Обновляем данные
    UPDATE chat_conversations
    SET
      username = COALESCE(p_username, username),
      first_name = COALESCE(p_first_name, first_name),
      last_name = COALESCE(p_last_name, last_name),
      is_premium = v_is_premium,
      premium_plan = v_premium_plan,
      updated_at = NOW()
    WHERE id = v_conversation_id;
  END IF;

  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ФУНКЦИЯ: Отметить сообщения как прочитанные
-- ============================================

CREATE OR REPLACE FUNCTION mark_conversation_read(p_conversation_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Обновляем conversation
  UPDATE chat_conversations
  SET
    is_read = TRUE,
    unread_count = 0,
    updated_at = NOW()
  WHERE id = p_conversation_id;

  -- Обновляем сообщения
  UPDATE chat_messages
  SET is_read = TRUE
  WHERE conversation_id = p_conversation_id
    AND direction = 'incoming'
    AND is_read = FALSE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ФУНКЦИЯ: Статистика inbox
-- ============================================

CREATE OR REPLACE FUNCTION get_inbox_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_conversations', (SELECT COUNT(*) FROM chat_conversations),
    'unread_conversations', (SELECT COUNT(*) FROM chat_conversations WHERE is_read = FALSE),
    'total_unread_messages', (SELECT COALESCE(SUM(unread_count), 0) FROM chat_conversations),
    'premium_conversations', (SELECT COUNT(*) FROM chat_conversations WHERE is_premium = TRUE),
    'today_messages', (
      SELECT COUNT(*) FROM chat_messages
      WHERE created_at > NOW() - INTERVAL '24 hours'
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Разрешаем всё для authenticated (админы)
CREATE POLICY "Allow all for authenticated" ON chat_conversations
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated" ON chat_messages
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- ВКЛЮЧАЕМ REALTIME
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE chat_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
