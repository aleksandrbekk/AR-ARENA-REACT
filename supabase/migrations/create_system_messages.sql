-- Создание таблицы system_messages для логирования системных сообщений
-- Выполнить в Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.system_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id TEXT NOT NULL,
  message_type TEXT NOT NULL,
  text TEXT,
  source TEXT,
  success BOOLEAN DEFAULT true,
  error TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_system_messages_telegram_id ON public.system_messages(telegram_id);
CREATE INDEX IF NOT EXISTS idx_system_messages_created_at ON public.system_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_messages_message_type ON public.system_messages(message_type);

-- RLS отключен для служебной таблицы (доступ только через service_role)
ALTER TABLE public.system_messages DISABLE ROW LEVEL SECURITY;

-- Комментарий к таблице
COMMENT ON TABLE public.system_messages IS 'Логирование системных сообщений (Telegram уведомления, платежи, ошибки)';
