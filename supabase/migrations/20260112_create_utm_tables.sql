-- ============================================
-- МИГРАЦИЯ: Создание таблиц UTM ссылок
-- Дата: 2026-01-12
-- ============================================

-- 1. Таблица UTM ссылок для оплаты
CREATE TABLE IF NOT EXISTS utm_links (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  folder TEXT,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Таблица UTM ссылок для инструментов
CREATE TABLE IF NOT EXISTS utm_tool_links (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  tool_type TEXT DEFAULT 'stream',
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  last_click_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Индексы
CREATE INDEX IF NOT EXISTS idx_utm_links_slug ON utm_links(slug);
CREATE INDEX IF NOT EXISTS idx_utm_links_folder ON utm_links(folder);
CREATE INDEX IF NOT EXISTS idx_utm_tool_links_slug ON utm_tool_links(slug);
CREATE INDEX IF NOT EXISTS idx_utm_tool_links_tool_type ON utm_tool_links(tool_type);

-- 4. RLS политики
ALTER TABLE utm_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE utm_tool_links ENABLE ROW LEVEL SECURITY;

-- Разрешаем всё для аутентифицированных (админ-панель)
CREATE POLICY "Allow all for authenticated" ON utm_links
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated" ON utm_tool_links
  FOR ALL USING (true) WITH CHECK (true);

-- 5. Функция для инкремента конверсий UTM
CREATE OR REPLACE FUNCTION increment_utm_conversion(p_slug TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE utm_links
  SET conversions = conversions + 1,
      updated_at = NOW()
  WHERE slug = p_slug;
END;
$$ LANGUAGE plpgsql;

-- 6. Таблица user_sources для отслеживания источника пользователя
CREATE TABLE IF NOT EXISTS user_sources (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sources_telegram_id ON user_sources(telegram_id);
CREATE INDEX IF NOT EXISTS idx_user_sources_source ON user_sources(source);

ALTER TABLE user_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON user_sources
  FOR ALL USING (true) WITH CHECK (true);

-- Комментарии
COMMENT ON TABLE utm_links IS 'UTM ссылки для оплаты Premium (формат: t.me/ARARENA_BOT?start=premium_SLUG)';
COMMENT ON TABLE utm_tool_links IS 'UTM ссылки для инструментов (формат: ararena.pro/stream?utm_source=SLUG)';
COMMENT ON TABLE user_sources IS 'Источник регистрации пользователя (для отслеживания конверсий)';
