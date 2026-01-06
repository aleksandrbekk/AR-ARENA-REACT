-- ========================================
-- FIX БАЗОВЫЙ SKIN ISSUES
-- ========================================
-- 1. Set Базовый skin tap_bonus to 0 (it should give no bonus, just base tap power)
-- 2. Make Базовый skin automatically owned by all users
-- 3. Ensure price is 0 (it's free/default)
-- ========================================

-- Issue #1: Базовый skin should have tap_bonus = 0 (no bonus, just base power)
UPDATE skins
SET tap_bonus = 0
WHERE id = 1 AND name = 'Юзер';

-- Issue #2: Set price to 0 (it's the default/free skin)
UPDATE skins
SET price_bul = 0, price_ar = 0
WHERE id = 1 AND name = 'Юзер';

-- Issue #3: Ensure all existing users own the Базовый skin (id=1)
-- Insert user_skins record for users who don't have it yet
INSERT INTO user_skins (user_id, skin_id, is_equipped)
SELECT
  u.id,
  1,  -- Базовый skin id
  false  -- Don't equip it automatically, keep their current skin
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM user_skins us
  WHERE us.user_id = u.id AND us.skin_id = 1
)
ON CONFLICT DO NOTHING;

-- Verify the changes
SELECT id, name, tap_bonus, farm_bonus, regen_bonus, price_bul, price_ar
FROM skins
WHERE id = 1;

-- Check how many users now own Базовый skin
SELECT
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(DISTINCT user_id) FROM user_skins WHERE skin_id = 1) as users_with_bazovy;
