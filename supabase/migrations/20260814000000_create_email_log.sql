create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  recipient_email text not null,
  recipient_type text not null,
  email_type text not null,
  subject text not null,
  success boolean not null,
  error text,
  source text not null,
  created_at timestamptz not null default now()
);

create index if not exists email_log_company_id_idx on public.email_log (company_id);
create index if not exists email_log_created_at_idx on public.email_log (created_at desc);

alter table public.email_log enable row level security;
-- Admin-only tooling (service role) writes and reads this; no anon/authenticated
-- policies are added on purpose, matching client_activities' access pattern.
