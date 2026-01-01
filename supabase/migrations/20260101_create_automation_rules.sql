-- Migration: create simple automation_rules table for keyword-based autoresponders
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.automation_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trigger_keyword TEXT NOT NULL,
  response_text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  match_type TEXT DEFAULT 'contains' CHECK (match_type IN ('contains', 'exact', 'starts_with')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add index for faster keyword lookup
CREATE INDEX IF NOT EXISTS idx_automation_rules_keyword ON public.automation_rules(trigger_keyword);
CREATE INDEX IF NOT EXISTS idx_automation_rules_active ON public.automation_rules(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access (for bot to check rules)
CREATE POLICY "anon_read_rules" ON public.automation_rules 
  FOR SELECT USING (true);

-- Allow all operations for now (no auth restriction for admin panel)
CREATE POLICY "all_operations" ON public.automation_rules 
  FOR ALL USING (true) WITH CHECK (true);
