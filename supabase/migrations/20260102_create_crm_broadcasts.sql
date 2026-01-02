-- Create crm_broadcasts table
CREATE TABLE IF NOT EXISTS public.crm_broadcasts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id TEXT, -- optional, for multi-tenant
  message_text TEXT,
  image_url TEXT,
  target_audience TEXT NOT NULL, -- 'all', 'premium', 'tag:xxx'
  recipients_count INTEGER DEFAULT 0,
  successful_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'completed', -- 'pending', 'processing', 'completed', 'failed'
  created_by UUID, -- auth.uid()
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crm_broadcasts ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for now (MVP)
CREATE POLICY "crm_broadcasts_all" ON public.crm_broadcasts FOR ALL USING (true) WITH CHECK (true);
