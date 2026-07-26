begin;

alter table public.website_config
  add column if not exists announcement_enabled boolean default false,
  add column if not exists announcement_title text,
  add column if not exists announcement_body text,
  add column if not exists announcement_cta_label text,
  add column if not exists announcement_cta_href text,
  add column if not exists announcement_style text default 'default';

commit;