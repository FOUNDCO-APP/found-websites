-- migration-033: add source and temperature columns to leads table
-- Run in Supabase SQL Editor

alter table public.leads
  add column if not exists source text default 'website',
  add column if not exists temperature text default 'warm';

-- Index for filtering by temperature
create index if not exists leads_temperature_idx on public.leads(company_id, temperature);

-- Backfill existing leads
update public.leads set source = 'website' where source is null;
update public.leads set temperature = 'warm' where temperature is null;
