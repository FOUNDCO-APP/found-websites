-- Add sub-industry support for Found onboarding Q2.5.
-- Run in Supabase SQL Editor.

alter table public.companies
add column if not exists sub_industry text;

comment on column public.companies.sub_industry is
  'Human-readable sub-industry selected during onboarding, e.g. barber, smoothie shop, multi-provider spa, residential agent.';
