-- Migration 060: Jobs round 1 - job notes, per-photo notes, address privacy toggle
alter table public.photo_albums
  add column if not exists notes text null,
  add column if not exists show_address_public boolean not null default false;

alter table public.company_photos
  add column if not exists note text null;
