-- Migration 029: add billing columns to companies
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS plan               text DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS trial_ends_at      timestamptz DEFAULT (now() + interval '14 days'),
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'trialing';
