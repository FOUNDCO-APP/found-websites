ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS is_founding_member boolean DEFAULT false;
