-- Migration 050: Job-ready photo albums
-- Run in Supabase SQL editor before relying on job/customer metadata in Photos.

alter table public.photo_albums
  add column if not exists album_type text not null default 'album',
  add column if not exists customer_name text null,
  add column if not exists customer_phone text null,
  add column if not exists customer_email text null,
  add column if not exists service_address text null,
  add column if not exists cover_photo_id uuid null references public.company_photos(id) on delete set null;

create index if not exists photo_albums_company_type_idx
  on public.photo_albums(company_id, album_type, created_at desc);

create index if not exists photo_albums_cover_photo_idx
  on public.photo_albums(cover_photo_id);
