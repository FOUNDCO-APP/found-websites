-- Priya's migration: support abandoned onboarding leads
-- Run in Supabase SQL editor

ALTER TABLE leads
  ALTER COLUMN company_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS type varchar(64) DEFAULT 'estimate',
  ADD COLUMN IF NOT EXISTS partial_answers jsonb DEFAULT '{}';

UPDATE leads SET type = 'estimate' WHERE type IS NULL;
