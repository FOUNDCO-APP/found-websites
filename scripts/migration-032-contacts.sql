-- migration-032: contacts table for business network (vendors, subs, suppliers)
-- Run in Supabase SQL Editor

create table if not exists public.contacts (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  name          text not null,
  phone         text,
  email         text,
  notes         text,
  tags          text[] default '{}',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Index for fast lookup by company
create index if not exists contacts_company_id_idx on public.contacts(company_id);

-- RLS
alter table public.contacts enable row level security;

-- Service role can do everything (used by server actions)
create policy "service role full access" on public.contacts
  for all using (true) with check (true);

-- Updated at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger contacts_updated_at
  before update on public.contacts
  for each row execute function update_updated_at();
