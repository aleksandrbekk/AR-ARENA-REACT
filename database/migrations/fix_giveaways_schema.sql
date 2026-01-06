-- Fix for Giveaways table schema to support Admin Panel
-- Adds missing columns that are used in GiveawayManager.tsx

ALTER TABLE giveaways ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'ar';
ALTER TABLE giveaways ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;
ALTER TABLE giveaways ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'money';
ALTER TABLE giveaways ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE giveaways ADD COLUMN IF NOT EXISTS subtitle TEXT;
ALTER TABLE giveaways ADD COLUMN IF NOT EXISTS draw_date TIMESTAMPTZ;
ALTER TABLE giveaways ADD COLUMN IF NOT EXISTS prizes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE giveaways ADD COLUMN IF NOT EXISTS requirements JSONB DEFAULT '{}'::jsonb;
ALTER TABLE giveaways ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE giveaways ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';

-- Update existing rows if any to have defaults
UPDATE giveaways SET currency = 'ar' WHERE currency IS NULL;
UPDATE giveaways SET status = 'draft' WHERE status IS NULL;
