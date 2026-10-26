-- Retirement is independent of billing, account type, and owner identity.
-- NULL preserves every existing business until an explicit retirement occurs.
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS retired_at timestamptz;
