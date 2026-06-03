-- ============================================================
-- Curated Unsplash photos for Barrio Builders
-- Hand-picked June 3, 2026 — construction, remodeling, painting
-- hero_image_url = null so shuffled pool drives hero + all CTAs
-- ============================================================

UPDATE website_config
SET
  hero_image_url = null,
  stock_images = '[
    "https://images.unsplash.com/photo-1674649207083-281c2517ab49?w=1920&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1634586648651-f1fb9ec10d90?w=1920&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1517581177682-a085bb7ffb15?w=1920&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1505798577917-a65157d3320a?w=1920&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1649083048770-82e8ffd80431?w=1920&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1587582423116-ec07293f0395?w=1920&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=1920&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1768321916027-d0f69289227f?w=1920&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1717281234297-3def5ae3eee1?w=1920&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1574359411659-15573a27fd0c?w=1920&q=80&auto=format&fit=crop"
  ]'::jsonb
WHERE company_id = '9fdc7cda-3151-412b-9cec-978a5ea93304';

-- VERIFY
SELECT LEFT(hero_image_url::text, 30) AS hero, jsonb_array_length(stock_images) AS photo_count
FROM website_config WHERE company_id = '9fdc7cda-3151-412b-9cec-978a5ea93304';
