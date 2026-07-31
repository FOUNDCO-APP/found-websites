-- Prevents two companies from ever sharing the same custom_domain value.
-- Without this, a data collision would make getCompanyByDomain's
-- .maybeSingle() throw and silently 404 a company that did everything
-- right. Audited live data first (2026-07-31): zero duplicates existed,
-- safe to apply.
CREATE UNIQUE INDEX IF NOT EXISTS website_config_custom_domain_unique
  ON website_config (custom_domain)
  WHERE custom_domain IS NOT NULL;
