-- migration-036: addon_subscriptions
-- Tracks à la carte add-ons purchased by each company.
-- Stripe subscription item ID stored for future billing management.

create table if not exists addon_subscriptions (
  id                        uuid primary key default gen_random_uuid(),
  company_id                uuid not null references companies(id) on delete cascade,
  addon_slug                text not null,
  stripe_subscription_item_id text null,
  active                    boolean not null default true,
  created_at                timestamptz not null default now()
);

create unique index if not exists addon_subscriptions_company_slug_idx
  on addon_subscriptions (company_id, addon_slug)
  where active = true;

alter table companies
  add column if not exists stripe_connect_account_id text null;
