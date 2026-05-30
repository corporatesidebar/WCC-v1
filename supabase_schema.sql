create table if not exists public.wcc_tasks (
  id uuid primary key,
  title text not null,
  sender text default '',
  destination text default '',
  message text default '',
  notes text default '',
  status text default 'New' check (status in ('New','In Progress','Waiting','Blocked','Done','Approved')),
  files jsonb default '[]'::jsonb,
  participants jsonb default '[]'::jsonb,
  activity jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wcc_tasks_updated_at_idx on public.wcc_tasks (updated_at desc);
