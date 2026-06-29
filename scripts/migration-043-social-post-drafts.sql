-- migration-043-social-post-drafts.sql
-- Stores Found-generated social post drafts for starred photos.

create table if not exists social_post_drafts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  photo_id uuid not null references company_photos(id) on delete cascade,
  format text not null check (format in ('square', 'portrait', 'story')),
  caption text not null default '',
  status text not null default 'draft' check (status in ('draft', 'shared', 'downloaded', 'archived')),
  generated_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, photo_id, format)
);

create index if not exists idx_social_post_drafts_company_created
  on social_post_drafts(company_id, created_at desc);

create index if not exists idx_social_post_drafts_photo
  on social_post_drafts(photo_id);