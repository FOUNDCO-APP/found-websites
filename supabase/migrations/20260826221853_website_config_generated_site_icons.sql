alter table public.website_config
  add column if not exists favicon_ico_url text,
  add column if not exists favicon_32_url text,
  add column if not exists apple_touch_icon_url text,
  add column if not exists pwa_icon_192_url text,
  add column if not exists pwa_icon_512_url text;
