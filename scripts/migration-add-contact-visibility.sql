-- Migration: contact visibility + lead routing
-- Run in Supabase SQL Editor
-- Adds phone_visible, email_visible, lead_phone, lead_email to companies

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS phone_visible boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_visible boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS lead_phone text,
  ADD COLUMN IF NOT EXISTS lead_email text;
