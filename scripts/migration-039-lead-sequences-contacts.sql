-- Migration 039: Lead sequence day-1 + contact auto-import
-- Adds follow_up_1_sent_at to leads for day-1 email sequence
-- Adds source + lead_id to contacts for website auto-import (Pro/Business)

ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_1_sent_at timestamptz DEFAULT NULL;

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS source text DEFAULT NULL;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES leads(id) ON DELETE SET NULL DEFAULT NULL;
