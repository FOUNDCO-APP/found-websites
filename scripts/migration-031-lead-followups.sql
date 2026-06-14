-- Migration 031: Lead follow-up tracking for Pro/Business plan sequences
-- Run in Supabase SQL editor

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS follow_up_3_sent_at  timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS follow_up_7_sent_at  timestamptz DEFAULT NULL;
