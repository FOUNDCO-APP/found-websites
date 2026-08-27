-- Traffic Report: visit tracking + lead channel attribution.
-- company_id is NULLABLE on purpose: null = Found's own marketing site
-- (foundco.app), a value = a tenant site. One table serves both so the
-- founder report and a future per-owner report share the same pipeline.

create table if not exists public.site_visits (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  session_id text not null,
  path text not null,
  referrer text,
  entry_channel text not null default 'Direct',
  landing_path text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  created_at timestamptz not null default now()
);

create index if not exists site_visits_created_at_idx on public.site_visits (created_at desc);
create index if not exists site_visits_company_created_idx on public.site_visits (company_id, created_at desc);
create index if not exists site_visits_session_idx on public.site_visits (session_id);

alter table public.site_visits enable row level security;
-- Writes go through the /api/track route (service role). No direct client access.
revoke all on public.site_visits from anon, authenticated;

-- Signup attribution: which channel brought a paying Found customer. The
-- onboarding client passes the visitor's found_session_id; signup_channel is
-- resolved from that session's first site_visit at insert time.
alter table public.companies
  add column if not exists signup_session_id text,
  add column if not exists signup_channel text,
  add column if not exists signup_landing_path text;

create index if not exists companies_signup_channel_idx on public.companies (signup_channel);

-- Lead attribution. Tenant leads capture no source data today.
alter table public.leads
  add column if not exists entry_channel text,
  add column if not exists session_id text,
  add column if not exists landing_path text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content text,
  add column if not exists utm_term text;
