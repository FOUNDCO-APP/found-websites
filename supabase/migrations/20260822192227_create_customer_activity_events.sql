create table if not exists public.customer_activity_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  surface text not null,
  feature text,
  source text not null default 'customer_dashboard',
  metadata jsonb not null default '{}'::jsonb,
  is_admin_view boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.customer_activity_events enable row level security;

create index if not exists customer_activity_events_company_created_idx
  on public.customer_activity_events (company_id, created_at desc);

create index if not exists customer_activity_events_company_surface_created_idx
  on public.customer_activity_events (company_id, surface, created_at desc);

create index if not exists customer_activity_events_user_created_idx
  on public.customer_activity_events (user_id, created_at desc);

create index if not exists customer_activity_events_event_type_idx
  on public.customer_activity_events (event_type);
