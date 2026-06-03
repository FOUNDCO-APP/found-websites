-- ============================================================
-- Fit & Delicious To-Go — Seed (Instance #3)
-- Domain: gotsmoothie.com → gotsmoothie.foundco.app
-- Industry: food + warm = Portrait layout
-- Generated: June 3, 2026
-- Safe to run multiple times
-- ============================================================

INSERT INTO companies (
  id, name, slug, industry_category, vibe,
  primary_intent, secondary_intent,
  phone, email, city, state,
  logo_url, primary_color, accent_color_1, accent_color_2, active
) VALUES (
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'Fit & Delicious To-Go',
  'gotsmoothie',
  'food',
  'warm',
  'visit',
  'call',
  '(520) 222-4321',
  'info@gotsmoothie.com',
  'Tucson',
  'AZ',
  null,
  '#7C3AED',
  '#F59E0B',
  '#10B981',
  true
)
ON CONFLICT (id) DO UPDATE SET
  name              = EXCLUDED.name,
  slug              = EXCLUDED.slug,
  industry_category = EXCLUDED.industry_category,
  vibe              = EXCLUDED.vibe,
  primary_intent    = EXCLUDED.primary_intent,
  secondary_intent  = EXCLUDED.secondary_intent,
  phone             = EXCLUDED.phone,
  email             = EXCLUDED.email,
  city              = EXCLUDED.city,
  state             = EXCLUDED.state,
  primary_color     = EXCLUDED.primary_color,
  accent_color_1    = EXCLUDED.accent_color_1,
  accent_color_2    = EXCLUDED.accent_color_2,
  active            = EXCLUDED.active;

INSERT INTO website_config (
  company_id, hero_title, hero_subtitle,
  hero_image_url, hero_video_url,
  about_text, tagline,
  services, testimonials, service_areas,
  social_links, custom_domain, published
) VALUES (
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'Where Healthy Meets Tasty',
  'Smoothies, açaí bowls, juices, and protein-packed meals. Made with real ingredients, served fast — right here in Tucson.',
  null, null,
  'Fit & Delicious To-Go is where healthy meets tasty. Whether you''re craving a cold smoothie, a refreshing açaí bowl, or a protein-packed meal, we''ve got you covered. We''re on a mission to fuel Tucson with fast, feel-good food that''s made with real ingredients — no shortcuts, no gimmicks.',
  'Real food. Real fast. Real good.',
  '[
    {"name":"Smoothies","description":"Blended to order with real fruit, protein, and superfoods. Customizable, cold, and packed with everything your body needs."},
    {"name":"Açaí Bowls","description":"Thick frozen açaí topped with fresh fruit, granola, and honey. Pure fuel in a bowl."},
    {"name":"Juices","description":"Cold-pressed and fresh-squeezed. Loaded with vitamins and nothing artificial."},
    {"name":"Meals","description":"Protein-packed meals made with real ingredients. Fast food that''s actually good for you."},
    {"name":"Supplements","description":"Premium proteins, vitamins, and boosters to elevate your daily routine."}
  ]'::jsonb,
  '[
    {"name":"Marcus T.","role":"Regular, Tucson AZ","quote":"I come here after every workout. The protein smoothies are unreal and they actually use real fruit. Nothing else comes close in Tucson."},
    {"name":"Daniela R.","role":"Mom of three, North Tucson","quote":"My whole family loves this place. The açaí bowls are my kids'' favorite and I love that everything is actually made with real ingredients."},
    {"name":"James K.","role":"First-timer, Tucson AZ","quote":"Walked in on a recommendation and immediately became a regular. The meals are filling, the smoothies are incredible, and the vibe is great."}
  ]'::jsonb,
  ARRAY['Tucson','North Tucson','Marana','Oro Valley','Catalina Foothills','Midtown Tucson']::text[],
  '{}'::jsonb,
  null,
  true
)
ON CONFLICT (company_id) DO UPDATE SET
  hero_title    = EXCLUDED.hero_title,
  hero_subtitle = EXCLUDED.hero_subtitle,
  about_text    = EXCLUDED.about_text,
  tagline       = EXCLUDED.tagline,
  services      = EXCLUDED.services,
  testimonials  = EXCLUDED.testimonials,
  service_areas = EXCLUDED.service_areas,
  published     = EXCLUDED.published;

-- VERIFY
SELECT
  c.name, c.slug, c.vibe, c.industry_category, c.primary_color,
  wc.hero_title, wc.tagline, wc.published
FROM companies c
LEFT JOIN website_config wc ON wc.company_id = c.id
WHERE c.id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
