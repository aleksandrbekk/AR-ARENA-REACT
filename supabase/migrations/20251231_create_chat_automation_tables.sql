-- Migration: create chat automation tables

create table if not exists public.chat_flows (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_by text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.chat_nodes (
  id uuid default gen_random_uuid() primary key,
  flow_id uuid references public.chat_flows(id) on delete cascade,
  type text not null,
  payload jsonb,
  position_x double precision,
  position_y double precision
);

create table if not exists public.chat_edges (
  id uuid default gen_random_uuid() primary key,
  flow_id uuid references public.chat_flows(id) on delete cascade,
  source_node_id uuid references public.chat_nodes(id) on delete cascade,
  target_node_id uuid references public.chat_nodes(id) on delete cascade
);

create table if not exists public.chat_variables (
  id uuid default gen_random_uuid() primary key,
  flow_id uuid references public.chat_flows(id) on delete cascade,
  key text not null,
  value jsonb
);

-- Enable Row Level Security
alter table public.chat_flows enable row level security;
alter table public.chat_nodes enable row level security;
alter table public.chat_edges enable row level security;
alter table public.chat_variables enable row level security;

-- Simple policies: admins (identified by email) can manage, service_role can read/execute
-- Replace ADMIN_EMAILS with actual admin list if needed.
create policy "admin_full_access" on public.chat_flows for all using (auth.email() = ANY(ARRAY['aleksandrbekk@bk.ru'])) with check (auth.email() = ANY(ARRAY['aleksandrbekk@bk.ru']));
create policy "admin_full_access" on public.chat_nodes for all using (auth.email() = ANY(ARRAY['aleksandrbekk@bk.ru'])) with check (auth.email() = ANY(ARRAY['aleksandrbekk@bk.ru']));
create policy "admin_full_access" on public.chat_edges for all using (auth.email() = ANY(ARRAY['aleksandrbekk@bk.ru'])) with check (auth.email() = ANY(ARRAY['aleksandrbekk@bk.ru']));
create policy "admin_full_access" on public.chat_variables for all using (auth.email() = ANY(ARRAY['aleksandrbekk@bk.ru'])) with check (auth.email() = ANY(ARRAY['aleksandrbekk@bk.ru']));

-- Service role can select all
create policy "service_role_select" on public.chat_flows for select using (auth.role() = 'service_role');
create policy "service_role_select" on public.chat_nodes for select using (auth.role() = 'service_role');
create policy "service_role_select" on public.chat_edges for select using (auth.role() = 'service_role');
create policy "service_role_select" on public.chat_variables for select using (auth.role() = 'service_role');
