-- Migration: Multi-project support and Social Credentials

-- 1. Create Projects table
create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  owner_id text, -- Can be auth.uid() or email
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.projects enable row level security;

-- Policy: Admin has full access
create policy "admin_full_projects" on public.projects 
  for all 
  using (auth.email() = ANY(ARRAY['aleksandrbekk@bk.ru'])) 
  with check (auth.email() = ANY(ARRAY['aleksandrbekk@bk.ru']));

-- Policy: Service role has full access
create policy "service_role_projects" on public.projects 
  for all 
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');


-- 2. Add project_id to Chat Flows
-- We assume flows belong to a project.
do $$ 
begin
  if not exists (select 1 from information_schema.columns where table_name = 'chat_flows' and column_name = 'project_id') then
    alter table public.chat_flows add column project_id uuid references public.projects(id) on delete cascade;
  end if;
end $$;

-- 3. Social Credentials table
create table if not exists public.social_credentials (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade,
  platform text not null, -- 'telegram', 'vk', 'instagram', 'twitter'
  access_token text,
  refresh_token text,
  expires_at timestamp with time zone,
  metadata jsonb default '{}'::jsonb, -- Store extra info like validation tokens, api versions
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.social_credentials enable row level security;

create policy "admin_full_social" on public.social_credentials 
  for all 
  using (auth.email() = ANY(ARRAY['aleksandrbekk@bk.ru'])) 
  with check (auth.email() = ANY(ARRAY['aleksandrbekk@bk.ru']));

create policy "service_role_social" on public.social_credentials 
  for all 
  using (auth.role() = 'service_role');


-- 4. Chat Flow Runs (Logs)
create table if not exists public.chat_flow_runs (
  id uuid default gen_random_uuid() primary key,
  flow_id uuid references public.chat_flows(id) on delete set null,
  project_id uuid references public.projects(id) on delete cascade,
  status text not null, -- 'running', 'completed', 'failed'
  started_at timestamp with time zone default timezone('utc'::text, now()) not null,
  completed_at timestamp with time zone,
  logs jsonb default '[]'::jsonb, -- Array of execution steps
  triggered_by text -- 'manual', 'automation', 'webhook'
);

alter table public.chat_flow_runs enable row level security;

create policy "admin_full_runs" on public.chat_flow_runs 
  for all 
  using (auth.email() = ANY(ARRAY['aleksandrbekk@bk.ru'])) 
  with check (auth.email() = ANY(ARRAY['aleksandrbekk@bk.ru']));

create policy "service_role_runs" on public.chat_flow_runs 
  for all 
  using (auth.role() = 'service_role');


-- 5. Insert a default project if none exists (for backward compatibility/initial setup)
insert into public.projects (name, owner_id)
select 'Main Project', 'aleksandrbekk@bk.ru'
where not exists (select 1 from public.projects);
