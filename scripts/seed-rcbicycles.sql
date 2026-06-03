-- ============================================================
-- RC Bicycle — Seed (Instance #4)
-- Domain: rcbicycles.com → rcbicycles.foundco.app
-- Industry: retail + modern = Cinematic layout
-- Generated: June 3, 2026
-- ============================================================

-- STEP 0: Add missing columns (safe to run even if they already exist)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS photo_keywords TEXT;
ALTER TABLE website_config ADD COLUMN IF NOT EXISTS tagline TEXT;
ALTER TABLE website_config ADD COLUMN IF NOT EXISTS cta_headline TEXT;
ALTER TABLE website_config ADD COLUMN IF NOT EXISTS stock_images JSONB DEFAULT '[]'::jsonb;

INSERT INTO companies (
  id, name, slug, industry_category, vibe,
  primary_intent, secondary_intent,
  phone, email, city, state,
  logo_url, primary_color, accent_color_1, accent_color_2,
  photo_keywords, active
) VALUES (
  'c3d4e5f6-a7b8-9012-cdef-123456789012',
  'RC Bicycle',
  'rcbicycles',
  'retail',
  'modern',
  'visit',
  'call',
  '(520) 624-2285',
  'rhino@rcbicycles.com',
  'Tucson',
  'AZ',
  null,
  '#1565C0',
  '#E53935',
  '#0D47A1',
  'bicycle cycling mountain bike road bike repair shop Tucson university',
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
  photo_keywords    = EXCLUDED.photo_keywords,
  active            = EXCLUDED.active;

INSERT INTO website_config (
  company_id, hero_title, hero_subtitle,
  hero_image_url, hero_video_url,
  about_text, tagline, cta_headline,
  services, testimonials, service_areas,
  social_links, custom_domain, published
) VALUES (
  'c3d4e5f6-a7b8-9012-cdef-123456789012',
  'Tucson''s Bike Shop.',
  'Sales, rentals, and repairs for every rider. New bikes, quality used bikes starting at $150, and expert mechanics who get you back on the road fast. Located near the University of Arizona.',
  null,
  null,
  'Located near the University of Arizona, RC Bicycles is Tucson''s premier destination for all things biking. Whether you''re buying, renting, or need a repair — from a quick flat fix to a full tune-up — our skilled mechanics handle it all with precision and care. Used bikes starting at $150. Loaner bikes available during repairs. We keep Tucson rolling.',
  'We keep Tucson rolling.',
  'Come Ride With Us.',
  '[
    {"name":"Mini Tune-Up","description":"Quick, thorough, and affordable. Keep your bike in peak condition with our essential tune-up — adjustments, lubrication, and safety check included."},
    {"name":"Full Maintenance","description":"Comprehensive inspection and adjustment of every component. The complete overhaul that keeps serious riders confident on every ride."},
    {"name":"Bike Repair","description":"From minor fixes to major overhauls — every repair handled with precision and care. Our skilled mechanics get you back on the road fast."},
    {"name":"Tire Repair","description":"Fast, reliable flat fixes and blowout repairs. Walk in, we fix it, you ride out. No appointment needed."},
    {"name":"Emergency Repair","description":"Bike broken down unexpectedly? Come in anytime — we fix it fast and provide a loaner bike while we work so your day keeps moving."},
    {"name":"Bike Sales","description":"New bikes from top brands and quality used bikes starting at $150. Find your perfect ride with help from our expert staff."},
    {"name":"Bike Rentals","description":"Daily, weekly, and monthly rental plans. Special student discounts for University of Arizona riders. All rentals inspected and maintained."},
    {"name":"Accessories","description":"Helmets, locks, lights, bags, and everything else you need to ride safe, ride smart, and ride in style."}
  ]'::jsonb,
  '[
    {"name":"Carlos M.","role":"UA Student, Tucson AZ","quote":"I''ve been coming here since my first week at UA. They fixed my bike same-day, gave me a loaner, and charged me less than I expected. Only bike shop I trust."},
    {"name":"Jennifer L.","role":"Local Cyclist, Tucson AZ","quote":"RC Bicycle keeps my road bike in perfect shape. Their mechanics actually explain what they''re doing and why. That''s rare."},
    {"name":"David R.","role":"Bike Renter, Tucson AZ","quote":"Rented a bike for the weekend to explore Tucson. Clean, well-maintained, great price. Will definitely rent again before I buy my own."}
  ]'::jsonb,
  ARRAY['Tucson','University District','Midtown','South Tucson','Marana','Oro Valley','Catalina Foothills']::text[],
  '{}'::jsonb,
  null,
  true
)
ON CONFLICT (company_id) DO UPDATE SET
  hero_title    = EXCLUDED.hero_title,
  hero_subtitle = EXCLUDED.hero_subtitle,
  about_text    = EXCLUDED.about_text,
  tagline       = EXCLUDED.tagline,
  cta_headline  = EXCLUDED.cta_headline,
  services      = EXCLUDED.services,
  testimonials  = EXCLUDED.testimonials,
  service_areas = EXCLUDED.service_areas,
  published     = EXCLUDED.published;

-- VERIFY
SELECT c.name, c.slug, c.vibe, c.industry_category, c.primary_color,
       wc.hero_title, wc.tagline, wc.cta_headline, wc.published
FROM companies c
LEFT JOIN website_config wc ON wc.company_id = c.id
WHERE c.id = 'c3d4e5f6-a7b8-9012-cdef-123456789012';
