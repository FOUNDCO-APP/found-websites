-- Add user_id to companies for dashboard auth
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
