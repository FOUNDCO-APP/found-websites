-- ============================================================
-- Add photo_keywords to companies + seed all clients
-- Run in Supabase SQL editor
-- Generated: June 3, 2026
-- ============================================================

-- STEP 1: Add column
ALTER TABLE companies ADD COLUMN IF NOT EXISTS photo_keywords TEXT;

-- STEP 2: Seed all existing clients with specific keywords
UPDATE companies SET photo_keywords = 'smoothie acai bowl colorful healthy juice fresh drink protein'
WHERE slug = 'gotsmoothie';

UPDATE companies SET photo_keywords = 'balloon decor event party colorful celebration backdrop decoration'
WHERE slug = 'blueluna';

UPDATE companies SET photo_keywords = 'home remodeling construction roofing renovation contractor interior'
WHERE slug = 'barriobuilders';

-- STEP 3: Clear cached stock images so they re-fetch with correct keywords
UPDATE website_config
SET stock_images = '[]'::jsonb, hero_image_url = null
WHERE company_id IN (
  SELECT id FROM companies WHERE slug IN ('gotsmoothie', 'blueluna', 'barriobuilders')
);

-- VERIFY
SELECT c.name, c.slug, c.photo_keywords
FROM companies c
WHERE c.slug IN ('gotsmoothie', 'blueluna', 'barriobuilders');
