-- ============================================================
-- Curated Unsplash photos for Blue Luna Events
-- Hand-picked June 3, 2026 — balloons, event decor, celebrations
-- hero_image_url = null so shuffled pool drives hero + all CTAs
-- ============================================================

UPDATE website_config
SET
  hero_image_url = null,
  stock_images = '[
    "https://images.unsplash.com/photo-1560128411-79892dd93bf8?w=1920&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1604668915840-580c30026e5f?w=1920&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1741969494307-55394e3e4071?w=1920&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1777119914534-81d2ef0e93e9?w=1920&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1626149136691-78e3977b3d69?w=1920&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1636256373111-cddaa1470363?w=1920&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1597509679245-6fe7e1d7781c?w=1920&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1777120032245-75027e5912e2?w=1920&q=80&auto=format&fit=crop"
  ]'::jsonb
WHERE company_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

-- VERIFY
SELECT LEFT(hero_image_url::text, 30) AS hero, jsonb_array_length(stock_images) AS photo_count
FROM website_config WHERE company_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
