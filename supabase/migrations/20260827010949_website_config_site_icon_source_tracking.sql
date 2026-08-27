alter table public.website_config
  add column if not exists site_icon_source text,
  add column if not exists site_icon_source_url text,
  add column if not exists site_icon_generated_at timestamptz;
