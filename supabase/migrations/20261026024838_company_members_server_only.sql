-- Memberships are managed by owner-authorized server actions, never directly
-- through a browser client. Keep both grants and RLS aligned with that boundary.
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.company_members FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS "service role full access" ON public.company_members;
CREATE POLICY company_members_service_role_only ON public.company_members
  FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.company_members TO service_role;
