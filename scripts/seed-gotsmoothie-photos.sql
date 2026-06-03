-- ============================================================
-- Curated Unsplash photos for Fit & Delicious To-Go
-- Hand-picked June 3, 2026 — smoothies, acai bowls, healthy food
-- Saves directly to stock_images so Pexels is never called
-- ============================================================

UPDATE website_config
SET
  stock_images = '[
    "https://images.unsplash.com/photo-1514995428455-447d4443fa7f?w=1920&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=1920&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=1920&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1570696516188-ade861b84a49?w=1920&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1684403620650-81dc661a69db?w=1920&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1610441009633-b6ca9c6d4be2?w=1920&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1654084767590-a38c7f0f5bd3?w=1920&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1654923064926-be7e64267a31?w=1920&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1562166453-2783119c313a?w=1920&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1590288488147-f46142daf112?w=1920&q=80&auto=format&fit=crop"
  ]'::jsonb,
  hero_image_url = 'https://images.unsplash.com/photo-1514995428455-447d4443fa7f?w=1920&q=80&auto=format&fit=crop'
WHERE company_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';

-- VERIFY
SELECT
  LEFT(hero_image_url, 60) AS hero,
  jsonb_array_length(stock_images) AS photo_count
FROM website_config
WHERE company_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
