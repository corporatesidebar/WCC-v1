-- WCC V1 Supabase Schema
-- Run this in Supabase SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.wcc_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text default '',
  type text not null default 'note',
  channel text not null default 'Governance',
  state text not null default 'New',
  short_version text default '',
  long_version text default '',
  must_read text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wcc_activity (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references public.wcc_items(id) on delete set null,
  action text not null,
  details text default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_wcc_items_updated_at on public.wcc_items(updated_at desc);
create index if not exists idx_wcc_items_channel on public.wcc_items(channel);
create index if not exists idx_wcc_items_state on public.wcc_items(state);
create index if not exists idx_wcc_activity_created_at on public.wcc_activity(created_at desc);
create index if not exists idx_wcc_activity_item_id on public.wcc_activity(item_id);

-- Optional: enable RLS later when auth is added.
-- For current backend service-role use, leave RLS disabled during V1 deployment test.
alter table public.wcc_items disable row level security;
alter table public.wcc_activity disable row level security;
