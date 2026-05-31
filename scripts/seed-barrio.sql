-- ============================================================
-- Barrio Builders — Complete Seed
-- Generated: May 31, 2026 from onboarding session
-- Run this in Supabase SQL Editor to insert or update Barrio Builders
-- Safe to run multiple times (upsert — won't create duplicates)
-- ============================================================

-- STEP 1: Add accent_color_2 column if it doesn't exist yet
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS accent_color_2 text DEFAULT '#cccccc';

-- ============================================================
-- STEP 2: Upsert the company record
-- ============================================================
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
  '9fdc7cda-3151-412b-9cec-978a5ea93304',
  'Barrio Builders',
  'barrio-builders',
  'home_services',
  'bold',
  'quote',
  'call',
  '(520) 261-1212',
  'hello@barriobuilders.com',
  'Tucson',
  'AZ',
  null,
  '#1EAB46',
  '#5F5F5F',
  '#C0C0C0',
  true
)
ON CONFLICT (id) DO UPDATE SET
  name             = EXCLUDED.name,
  slug             = EXCLUDED.slug,
  industry_category = EXCLUDED.industry_category,
  vibe             = EXCLUDED.vibe,
  primary_intent   = EXCLUDED.primary_intent,
  secondary_intent = EXCLUDED.secondary_intent,
  phone            = EXCLUDED.phone,
  email            = EXCLUDED.email,
  city             = EXCLUDED.city,
  state            = EXCLUDED.state,
  logo_url         = EXCLUDED.logo_url,
  primary_color    = EXCLUDED.primary_color,
  accent_color_1   = EXCLUDED.accent_color_1,
  accent_color_2   = EXCLUDED.accent_color_2,
  active           = EXCLUDED.active;

-- ============================================================
-- STEP 3: Upsert the website_config record
-- ============================================================
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
) VALUES (
  '9fdc7cda-3151-412b-9cec-978a5ea93304',
  'Built for Tucson. Built to Last.',
  'From remodels to new floors, Barrio Builders brings quality craftsmanship and honest work to every Tucson home and business. Hablamos Español.',
  null,
  null,
  'We''re not a national chain — we''re your neighbors. Barrio Builders serves Tucson families with quality remodeling, construction, and finishing work that stands the test of time. When you hire us, you get a crew that cares about your home as much as you do.',
  '[
    {"name":"Remodeling","description":"From kitchen transformations to full home remodels, we handle every detail with craftsmanship that shows for years to come."},
    {"name":"Renovations","description":"Breathe new life into any space. We renovate with quality materials and an eye for detail that comes through in every finish."},
    {"name":"Painting","description":"Interior or exterior, our crews deliver clean lines and lasting color that makes your property look its best."},
    {"name":"Drywall","description":"Smooth, seamless installation and repair. We prep it right so every wall is perfect — no shortcuts, ever."},
    {"name":"Framing","description":"Strong bones make a strong home. Our framing is precise, code-compliant, and built to last for decades."},
    {"name":"Flooring","description":"From hardwood to tile, we install flooring that looks beautiful and holds up to real Tucson life."}
  ]'::jsonb,
  '[
    {"name":"Maria Gonzalez","role":"Homeowner, Tucson AZ","quote":"Barrio Builders remodeled our kitchen and we couldn''t be happier. Professional, clean, and they finished on time. 100% recommended."},
    {"name":"Tom Richards","role":"Property Owner, Marana AZ","quote":"They replaced my entire roof after the monsoon season. Fair price, great work, and they kept me updated the whole time."},
    {"name":"Rosa & Daniel Peralta","role":"Homeowners, South Tucson AZ","quote":"Hablamos con el equipo de Barrio Builders y desde el principio nos sentimos en confianza. El trabajo quedó perfecto."}
  ]'::jsonb,
  '["Tucson","Marana","Oro Valley","Sahuarita","Green Valley","Vail","Catalina Foothills"]'::jsonb,
  '{}'::jsonb,
  null,
  true
)
ON CONFLICT (company_id) DO UPDATE SET
  hero_title     = EXCLUDED.hero_title,
  hero_subtitle  = EXCLUDED.hero_subtitle,
  hero_image_url = EXCLUDED.hero_image_url,
  hero_video_url = EXCLUDED.hero_video_url,
  about_text     = EXCLUDED.about_text,
  services       = EXCLUDED.services,
  testimonials   = EXCLUDED.testimonials,
  service_areas  = EXCLUDED.service_areas,
  social_links   = EXCLUDED.social_links,
  custom_domain  = EXCLUDED.custom_domain,
  published      = EXCLUDED.published;

-- ============================================================
-- VERIFY — run this after to confirm it worked
-- ============================================================
SELECT
  c.name,
  c.slug,
  c.primary_color,
  c.accent_color_1,
  c.accent_color_2,
  c.vibe,
  c.city,
  wc.hero_title,
  wc.published
FROM companies c
LEFT JOIN website_config wc ON wc.company_id = c.id
WHERE c.slug = 'barrio-builders';
