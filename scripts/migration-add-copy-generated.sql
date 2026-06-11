-- Migration: add copy_generated flag to website_config
-- Run in Supabase SQL Editor
-- Purpose: track whether Claude wrote the copy (true) or the fallback templates ran (false/null)
-- Admin view at /admin/copy shows sites where copy_generated = false so Shawn can regenerate with one tap

ALTER TABLE website_config
  ADD COLUMN IF NOT EXISTS copy_generated boolean NOT NULL DEFAULT true;

-- Mark existing sites as generated=true (they were created before this flag existed,
-- assume Claude ran for them). Only newly-created fallback sites will get false.
UPDATE website_config SET copy_generated = true WHERE copy_generated IS NULL;
