-- Migration 030: store pre-created setup intent secret so /activate needs zero Stripe API calls
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS pending_setup_intent_secret text;
