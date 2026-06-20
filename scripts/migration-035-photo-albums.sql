-- migration-035: photo albums for client project sharing
-- Run in Supabase SQL Editor

-- Named project/event albums (all plans — Pro unlocks sharing)
create table if not exists public.photo_albums (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  name        text not null,
  slug        text not null,
  created_at  timestamptz default now(),
  unique(company_id, slug)
);

create index if not exists photo_albums_company_idx on public.photo_albums(company_id);

alter table public.photo_albums enable row level security;

create policy "service role full access" on public.photo_albums
  for all using (true) with check (true);

-- Link photos to albums
alter table public.company_photos
  add column if not exists album_id uuid references public.photo_albums(id) on delete set null;

create index if not exists company_photos_album_idx on public.company_photos(album_id);
