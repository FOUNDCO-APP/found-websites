begin;

alter table public.companies
  add column if not exists account_kind text not null default 'client',
  add column if not exists client_state text,
  add column if not exists client_started_at timestamptz,
  add column if not exists comp_reason text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'companies_account_kind_check') then
    alter table public.companies add constraint companies_account_kind_check
      check (account_kind in ('client', 'test'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'companies_client_state_check') then
    alter table public.companies add constraint companies_client_state_check
      check (client_state is null or client_state in ('onboarding', 'active', 'comp', 'past_due', 'cancelled'));
  end if;
end $$;

update public.companies
set client_state = case
  when coalesce(is_comp, false) then 'comp'
  when subscription_status in ('active', 'trialing') then 'active'
  when subscription_status in ('past_due', 'unpaid', 'incomplete') then 'past_due'
  when subscription_status in ('canceled', 'cancelled') then 'cancelled'
  else 'onboarding'
end
where client_state is null;

update public.companies
set client_started_at = created_at
where client_started_at is null and client_state in ('active', 'comp');

create table if not exists public.sales_prospects (
  id uuid primary key default gen_random_uuid(),
  person_name text not null,
  business_name text not null,
  email text,
  phone text,
  source text not null default 'manual',
  stage text not null default 'new'
    check (stage in ('new', 'contacted', 'demo_scheduled', 'proposal_sent', 'won', 'lost')),
  next_follow_up_at timestamptz,
  estimated_plan text
    check (estimated_plan is null or estimated_plan in ('found', 'found_pro', 'found_business')),
  notes text,
  loss_reason text,
  linked_company_id uuid references public.companies(id) on delete set null,
  won_at timestamptz,
  lost_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (nullif(trim(email), '') is not null or nullif(trim(phone), '') is not null)
);

create table if not exists public.sales_activities (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.sales_prospects(id) on delete cascade,
  activity_type text not null
    check (activity_type in ('created', 'call', 'text', 'email', 'note', 'stage_change', 'follow_up_change')),
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.client_activities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  activity_type text not null
    check (activity_type in ('note', 'state_change', 'issue_resolved', 'contact')),
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists sales_prospects_stage_follow_up_idx on public.sales_prospects(stage, next_follow_up_at);
create index if not exists sales_prospects_email_idx on public.sales_prospects(lower(email));
create index if not exists sales_activities_prospect_created_idx on public.sales_activities(prospect_id, created_at desc);
create index if not exists client_activities_company_created_idx on public.client_activities(company_id, created_at desc);

alter table public.sales_prospects enable row level security;
alter table public.sales_activities enable row level security;
alter table public.client_activities enable row level security;

revoke all on public.sales_prospects from anon, authenticated;
revoke all on public.sales_activities from anon, authenticated;
revoke all on public.client_activities from anon, authenticated;

commit;
