-- Add hero_images array to website_config
-- Existing sites keep hero_image_url as fallback — nothing breaks.
-- New sites store up to 3 uploaded photos as an ordered array.

ALTER TABLE website_config
  ADD COLUMN IF NOT EXISTS hero_images jsonb DEFAULT '[]'::jsonb;
