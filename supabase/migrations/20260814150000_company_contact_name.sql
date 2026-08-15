-- Team-approved (Steve leading, 2026-08-14): the admin Clients tool has no
-- way to know the actual person behind a business (companies.name is the
-- business name, e.g. "RC Bicycles", never the owner's name). Captured going
-- forward at onboarding (both public and admin-manual); existing clients get
-- backfilled by hand from the new client detail page as Shawn touches them.
alter table companies
  add column if not exists contact_name text;
