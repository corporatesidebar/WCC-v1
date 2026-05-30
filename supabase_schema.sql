create table if not exists public.wcc_tasks (
  id text primary key,
  title text not null,
  category text default 'Commander / Governance',
  sender text default 'WW - Governance',
  destination text default 'Commander / Governance',
  message text default '',
  notes text default '',
  status text default 'New',
  comments jsonb default '[]'::jsonb,
  files jsonb default '[]'::jsonb,
  participants jsonb default '[]'::jsonb,
  activity jsonb default '[]'::jsonb,
  test_entries jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.wcc_tasks add column if not exists category text default 'Commander / Governance';
alter table public.wcc_tasks add column if not exists sender text default 'WW - Governance';
alter table public.wcc_tasks add column if not exists destination text default 'Commander / Governance';
alter table public.wcc_tasks add column if not exists message text default '';
alter table public.wcc_tasks add column if not exists notes text default '';
alter table public.wcc_tasks add column if not exists status text default 'New';
alter table public.wcc_tasks add column if not exists comments jsonb default '[]'::jsonb;
alter table public.wcc_tasks add column if not exists files jsonb default '[]'::jsonb;
alter table public.wcc_tasks add column if not exists participants jsonb default '[]'::jsonb;
alter table public.wcc_tasks add column if not exists activity jsonb default '[]'::jsonb;
alter table public.wcc_tasks add column if not exists test_entries jsonb default '[]'::jsonb;
alter table public.wcc_tasks add column if not exists created_at timestamptz default now();
alter table public.wcc_tasks add column if not exists updated_at timestamptz default now();

create index if not exists wcc_tasks_updated_idx on public.wcc_tasks (updated_at desc);
create index if not exists wcc_tasks_status_idx on public.wcc_tasks (status);
create index if not exists wcc_tasks_category_idx on public.wcc_tasks (category);
