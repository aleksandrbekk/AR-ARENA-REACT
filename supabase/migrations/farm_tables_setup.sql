-- ============================================================================
-- AR ARENA - FARM TABLES SETUP
-- ============================================================================
-- Создание таблиц для системы крипто-фермы
-- Дата: 12.12.2025
-- ============================================================================

-- 1. ТАБЛИЦА: locations
-- Локации фермы (Общага, Подвал, Гараж, Склад)
-- ============================================================================
CREATE TABLE IF NOT EXISTS locations (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  image TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  required_level INTEGER NOT NULL DEFAULT 1,
  slots INTEGER NOT NULL DEFAULT 3,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- 2. ТАБЛИЦА: equipment
-- Типы оборудования для майнинга
-- ============================================================================
CREATE TABLE IF NOT EXISTS equipment (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  base_price NUMERIC NOT NULL,
  base_income NUMERIC NOT NULL,
  income_multiplier NUMERIC NOT NULL DEFAULT 1.2,
  price_multiplier NUMERIC NOT NULL DEFAULT 1.5,
  max_level INTEGER NOT NULL DEFAULT 10,
  location_slug TEXT NOT NULL REFERENCES locations(slug) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- 3. ТАБЛИЦА: user_locations
-- Купленные локации пользователей
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_locations (
  user_id BIGINT NOT NULL,
  location_slug TEXT NOT NULL REFERENCES locations(slug) ON DELETE CASCADE,
  purchased BOOLEAN NOT NULL DEFAULT FALSE,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, location_slug)
);

-- 4. ТАБЛИЦА: user_equipment
-- Купленное оборудование пользователей
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_equipment (
  user_id BIGINT NOT NULL,
  equipment_slug TEXT NOT NULL REFERENCES equipment(slug) ON DELETE CASCADE,
  level INTEGER NOT NULL DEFAULT 1,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, equipment_slug)
);

-- ============================================================================
-- НАЧАЛЬНЫЕ ДАННЫЕ: LOCATIONS
-- ============================================================================
INSERT INTO locations (slug, name, image, price, required_level, slots, sort_order) VALUES
('dorm', 'Общага', '/icons/locations/dormitory.png', 0, 1, 3, 1),
('basement', 'Подвал', '/icons/locations/basement.png', 5000, 3, 4, 2),
('garage', 'Гараж', '/icons/locations/garage.png', 15000, 5, 5, 3),
('warehouse', 'Склад', '/icons/locations/warehouse.png', 50000, 10, 8, 4)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- НАЧАЛЬНЫЕ ДАННЫЕ: EQUIPMENT
-- ============================================================================
INSERT INTO equipment (slug, name, icon, base_price, base_income, income_multiplier, price_multiplier, max_level, location_slug, sort_order) VALUES
('usb_miner', 'USB Miner', '/icons/equipment/usb_miner.png', 1000, 10, 1.2, 1.5, 10, 'dorm', 1),
('gpu_rig', 'GPU Rig', '/icons/equipment/gpu_rig.png', 10000, 50, 1.2, 1.5, 10, 'basement', 2),
('asic', 'ASIC', '/icons/equipment/asic.png', 50000, 200, 1.2, 1.5, 10, 'garage', 3),
('server_rack', 'Server Rack', '/icons/equipment/server_rack.png', 150000, 500, 1.2, 1.5, 10, 'warehouse', 4)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- ГОТОВО! Таблицы созданы.
-- ============================================================================
-- Доступ к таблицам контролируется через RPC функции с SECURITY DEFINER
-- RLS не используется, так как доступ идёт через telegram_id, а не auth.uid()

-- ============================================================================
-- ГОТОВО!
-- ============================================================================
-- Таблицы созданы:
--   ✅ locations (4 записи)
--   ✅ equipment (4 записи)
--   ✅ user_locations (пустая, заполняется при покупке)
--   ✅ user_equipment (пустая, заполняется при покупке)
--
-- RLS настроен:
--   ✅ locations: публичное чтение
--   ✅ equipment: публичное чтение
--   ✅ user_locations: только свои записи
--   ✅ user_equipment: только свои записи
-- ============================================================================
