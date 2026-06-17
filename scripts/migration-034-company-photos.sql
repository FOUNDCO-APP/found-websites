-- migration-034: company photos for the dashboard photo pipeline
-- Run in Supabase SQL Editor

create table if not exists public.company_photos (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  storage_path  text not null,
  url           text not null,
  for_website   boolean default false,
  for_social    boolean default false,
  website_section text, -- 'hero' | 'gallery' | 'about' | null
  created_at    timestamptz default now()
);

create index if not exists company_photos_company_id_idx on public.company_photos(company_id);

alter table public.company_photos enable row level security;

create policy "service role full access" on public.company_photos
  for all using (true) with check (true);
