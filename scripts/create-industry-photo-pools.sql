-- ============================================================
-- Industry Photo Pools — Found Co. Platform
-- Creates table + seeds all 3 existing client pools
-- Run in Supabase SQL editor
-- Generated: June 3, 2026
-- ============================================================

-- STEP 1: Create table
CREATE TABLE IF NOT EXISTS industry_photo_pools (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  industry_category TEXT NOT NULL,
  subcategory       TEXT,             -- future: food_smoothie, food_restaurant
  vibe              TEXT,             -- null = applies to all vibes
  label             TEXT NOT NULL,    -- human-readable name
  keywords          TEXT,             -- Pexels fallback search terms
  photos            JSONB NOT NULL DEFAULT '[]', -- [{url, desc}]
  active            BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast onboarding + template lookups
CREATE INDEX IF NOT EXISTS idx_photo_pools_industry_vibe
  ON industry_photo_pools (industry_category, vibe);

-- STEP 2: Seed existing client pools

-- Fit & Delicious To-Go → food + warm
INSERT INTO industry_photo_pools (industry_category, vibe, label, keywords, photos)
VALUES (
  'food', 'warm',
  'Smoothie & Health Food',
  'smoothie acai bowl colorful healthy juice fresh drink protein',
  '[
    {"url":"https://images.unsplash.com/photo-1514995428455-447d4443fa7f?w=1920&q=80&auto=format&fit=crop","desc":"Strawberry juice beside fresh fruits on table"},
    {"url":"https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=1920&q=80&auto=format&fit=crop","desc":"Two colorful fruit shakes in glasses"},
    {"url":"https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=1920&q=80&auto=format&fit=crop","desc":"Green smoothie in glass with straw"},
    {"url":"https://images.unsplash.com/photo-1570696516188-ade861b84a49?w=1920&q=80&auto=format&fit=crop","desc":"Pink smoothie in glass"},
    {"url":"https://images.unsplash.com/photo-1684403620650-81dc661a69db?w=1920&q=80&auto=format&fit=crop","desc":"Açaí bowl with berries and banana"},
    {"url":"https://images.unsplash.com/photo-1610441009633-b6ca9c6d4be2?w=1920&q=80&auto=format&fit=crop","desc":"Strawberries and blueberries in white bowl"},
    {"url":"https://images.unsplash.com/photo-1654084767590-a38c7f0f5bd3?w=1920&q=80&auto=format&fit=crop","desc":"Green smoothie with orange slice and straw"},
    {"url":"https://images.unsplash.com/photo-1654923064926-be7e64267a31?w=1920&q=80&auto=format&fit=crop","desc":"Açaí bowl with milk and fresh fruit"},
    {"url":"https://images.unsplash.com/photo-1562166453-2783119c313a?w=1920&q=80&auto=format&fit=crop","desc":"Dessert bowl with nuts and blackberry"},
    {"url":"https://images.unsplash.com/photo-1590288488147-f46142daf112?w=1920&q=80&auto=format&fit=crop","desc":"Açaí bowl with strawberries and nuts"}
  ]'::jsonb
);

-- Blue Luna Events → events + calm
INSERT INTO industry_photo_pools (industry_category, vibe, label, keywords, photos)
VALUES (
  'events', 'calm',
  'Balloon Decor & Events',
  'balloon decor event party colorful celebration backdrop decoration',
  '[
    {"url":"https://images.unsplash.com/photo-1560128411-79892dd93bf8?w=1920&q=80&auto=format&fit=crop","desc":"Multicolored balloon arrangement near white curtain"},
    {"url":"https://images.unsplash.com/photo-1604668915840-580c30026e5f?w=1920&q=80&auto=format&fit=crop","desc":"Yellow and white balloon table centerpiece"},
    {"url":"https://images.unsplash.com/photo-1741969494307-55394e3e4071?w=1920&q=80&auto=format&fit=crop","desc":"Festive birthday celebration decorated with balloons"},
    {"url":"https://images.unsplash.com/photo-1777119914534-81d2ef0e93e9?w=1920&q=80&auto=format&fit=crop","desc":"Colorful balloons floating against blue sky"},
    {"url":"https://images.unsplash.com/photo-1626149136691-78e3977b3d69?w=1920&q=80&auto=format&fit=crop","desc":"Assorted color balloons hung on string"},
    {"url":"https://images.unsplash.com/photo-1636256373111-cddaa1470363?w=1920&q=80&auto=format&fit=crop","desc":"Decorated table with balloons and celebration cake"},
    {"url":"https://images.unsplash.com/photo-1597509679245-6fe7e1d7781c?w=1920&q=80&auto=format&fit=crop","desc":"Pink and red balloons near green trees outdoors"},
    {"url":"https://images.unsplash.com/photo-1777120032245-75027e5912e2?w=1920&q=80&auto=format&fit=crop","desc":"Colorful balloon cluster on white tree sculpture"}
  ]'::jsonb
);

-- Barrio Builders → home_services + bold
INSERT INTO industry_photo_pools (industry_category, vibe, label, keywords, photos)
VALUES (
  'home_services', 'bold',
  'Home Renovation & Construction',
  'home remodeling construction roofing renovation contractor painting',
  '[
    {"url":"https://images.unsplash.com/photo-1674649207083-281c2517ab49?w=1920&q=80&auto=format&fit=crop","desc":"Two men working on a house exterior"},
    {"url":"https://images.unsplash.com/photo-1634586648651-f1fb9ec10d90?w=1920&q=80&auto=format&fit=crop","desc":"Room under renovation with construction tools"},
    {"url":"https://images.unsplash.com/photo-1517581177682-a085bb7ffb15?w=1920&q=80&auto=format&fit=crop","desc":"Worker climbing ladder inside room during remodel"},
    {"url":"https://images.unsplash.com/photo-1505798577917-a65157d3320a?w=1920&q=80&auto=format&fit=crop","desc":"Contractor standing in front of miter saw"},
    {"url":"https://images.unsplash.com/photo-1649083048770-82e8ffd80431?w=1920&q=80&auto=format&fit=crop","desc":"Finished living room — completed renovation result"},
    {"url":"https://images.unsplash.com/photo-1587582423116-ec07293f0395?w=1920&q=80&auto=format&fit=crop","desc":"Construction worker in hard hat on building frame"},
    {"url":"https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=1920&q=80&auto=format&fit=crop","desc":"Worker in orange safety vest with power tool"},
    {"url":"https://images.unsplash.com/photo-1768321916027-d0f69289227f?w=1920&q=80&auto=format&fit=crop","desc":"Interior construction with exposed beams and framing"},
    {"url":"https://images.unsplash.com/photo-1717281234297-3def5ae3eee1?w=1920&q=80&auto=format&fit=crop","desc":"Painter rolling fresh paint onto interior wall"},
    {"url":"https://images.unsplash.com/photo-1574359411659-15573a27fd0c?w=1920&q=80&auto=format&fit=crop","desc":"Two workers on ladder painting exterior wall"}
  ]'::jsonb
);

-- VERIFY
SELECT industry_category, vibe, label,
       jsonb_array_length(photos) AS photo_count,
       keywords
FROM industry_photo_pools
ORDER BY created_at;
