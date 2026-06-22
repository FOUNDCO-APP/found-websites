-- migration-037: add status to leads table for inbox lifecycle
-- Run in Supabase SQL Editor

alter table public.leads
  add column if not exists status text default 'open';

-- Backfill existing leads as open
update public.leads set status = 'open' where status is null;

-- Index for filtering by status
create index if not exists leads_status_idx on public.leads(company_id, status);
