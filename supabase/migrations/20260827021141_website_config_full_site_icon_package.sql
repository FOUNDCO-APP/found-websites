alter table public.website_config
  add column if not exists favicon_16_url text,
  add column if not exists favicon_48_url text;
