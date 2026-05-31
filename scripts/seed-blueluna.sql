-- ============================================================
-- Blue Luna Events — Seed (Instance #2)
-- Generated: May 31, 2026 from onboarding session
-- Run in Supabase SQL Editor
-- Safe to run multiple times (upsert)
-- ============================================================

-- STEP 1: Insert company
INSERT INTO companies (
  id,
  name,
  slug,
  industry_category,
  vibe,
  primary_intent,
  secondary_intent,
  phone,
  email,
  city,
  state,
  logo_url,
  primary_color,
  accent_color_1,
  accent_color_2,
  active
) VALUES (
  gen_random_uuid(),
  'Blue Luna Events',
  'blueluna',
  'events',
  'calm',
  'quote',
  'call',
  '(520) 222-6142',
  'monica@bluelunaevents.com',
  'Tucson',
  'AZ',
  null,
  '#00695C',
  '#4DB6AC',
  '#E0F2F1',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name             = EXCLUDED.name,
  industry_category = EXCLUDED.industry_category,
  vibe             = EXCLUDED.vibe,
  primary_intent   = EXCLUDED.primary_intent,
  secondary_intent = EXCLUDED.secondary_intent,
  phone            = EXCLUDED.phone,
  email            = EXCLUDED.email,
  city             = EXCLUDED.city,
  state            = EXCLUDED.state,
  primary_color    = EXCLUDED.primary_color,
  accent_color_1   = EXCLUDED.accent_color_1,
  accent_color_2   = EXCLUDED.accent_color_2,
  active           = EXCLUDED.active;

-- STEP 2: Insert website_config
INSERT INTO website_config (
  company_id,
  hero_title,
  hero_subtitle,
  hero_image_url,
  hero_video_url,
  about_text,
  services,
  testimonials,
  service_areas,
  social_links,
  custom_domain,
  published
)
SELECT
  id,
  'Your Event. Elevated.',
  'From balloons to backdrops, lighting to DJ — Blue Luna Events is Tucson''s one stop shop for unforgettable events. Serving all of Arizona.',
  null,
  null,
  'We''re a local Tucson event company built on creativity, quality, and making your vision come to life. Whether it''s an intimate birthday or a full corporate event, we handle every detail so you don''t have to. One call. One team. One unforgettable event.',
  '[
    {"name":"Balloons","description":"Custom balloon arrangements, arches, columns, and organic balloon art for any event size or theme."},
    {"name":"Decor","description":"Full event decoration services — from centerpieces to entrance setups — tailored to your vision and color palette."},
    {"name":"Backdrops","description":"Stunning custom backdrop designs for ceremonies, photo opportunities, and brand activations."},
    {"name":"Custom Posters & Decals","description":"Personalized signage, welcome boards, and custom decals that make your event feel completely one-of-a-kind."},
    {"name":"Audio","description":"Professional sound systems for speeches, music, and announcements — crystal clear at any venue size."},
    {"name":"Lighting","description":"Ambient, uplighting, and accent lighting that transforms any space into an atmosphere."},
    {"name":"DJ","description":"Experienced DJs who read the room and keep your guests on the dance floor all night long."},
    {"name":"Photo Booth","description":"Fun, branded photo booth experiences your guests will love — with instant prints and digital sharing."}
  ]'::jsonb,
  '[
    {"name":"Jessica & Marco Reyes","role":"Wedding, Tucson AZ","quote":"Blue Luna made our wedding look like something out of a magazine. The balloon arch alone had every guest stopping for photos. Absolutely stunning."},
    {"name":"Sarah Dominguez","role":"Quinceañera, Marana AZ","quote":"From the backdrop to the DJ to the photo booth — Monique handled everything. We didn''t have to worry about a single detail. Perfect night."},
    {"name":"Carlos Mendez","role":"Corporate Event, Tucson AZ","quote":"We needed a full setup for our company party and Blue Luna delivered beyond what we expected. Professional, creative, and on time."}
  ]'::jsonb,
  ARRAY['Tucson','Marana','Oro Valley','Sahuarita','Green Valley','Sierra Vista','Phoenix','Scottsdale','Tempe','Mesa']::text[],
  '{}'::jsonb,
  null,
  true
FROM companies WHERE slug = 'blueluna';

-- VERIFY
SELECT
  c.name, c.slug, c.primary_color, c.vibe, c.city,
  wc.hero_title, wc.published
FROM companies c
LEFT JOIN website_config wc ON wc.company_id = c.id
WHERE c.slug = 'blueluna';
