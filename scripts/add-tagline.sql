-- ============================================================
-- Add tagline field to website_config + seed both clients
-- Run in Supabase SQL editor: https://mmctzloztgkbqvofmkou.supabase.co
-- Generated: June 3, 2026
-- Safe to run multiple times
-- ============================================================

-- STEP 1: Add tagline column (nullable, max 100 chars)
ALTER TABLE website_config ADD COLUMN IF NOT EXISTS tagline TEXT;

-- STEP 2: Blue Luna Events
-- Remove the tagline from about_text (it now lives in its own field)
UPDATE website_config
SET
  tagline    = 'One call. One team. One unforgettable event.',
  about_text = 'We''re a local Tucson event company built on creativity, quality, and making your vision come to life. Whether it''s an intimate birthday or a full corporate event, we handle every detail so you don''t have to.'
WHERE company_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

-- STEP 3: Barrio Builders
UPDATE website_config
SET tagline = 'Built right. Backed by the neighborhood.'
WHERE company_id = '9fdc7cda-3151-412b-9cec-978a5ea93304';

-- VERIFY
SELECT
  c.name,
  c.slug,
  wc.tagline,
  LEFT(wc.about_text, 80) AS about_preview
FROM companies c
JOIN website_config wc ON wc.company_id = c.id
WHERE c.slug IN ('blueluna', 'barriobuilders');
