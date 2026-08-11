begin;

alter table public.estimate_rate_sheets enable row level security;
alter table public.email_campaigns enable row level security;
alter table public.estimates enable row level security;
alter table public.estimate_line_items enable row level security;
alter table public.contact_suppressions enable row level security;
alter table public.addon_subscriptions enable row level security;
alter table public.addon_stripe_prices enable row level security;

revoke all on public.estimate_rate_sheets from anon, authenticated;
revoke all on public.email_campaigns from anon, authenticated;
revoke all on public.estimates from anon, authenticated;
revoke all on public.estimate_line_items from anon, authenticated;
revoke all on public.contact_suppressions from anon, authenticated;
revoke all on public.addon_subscriptions from anon, authenticated;
revoke all on public.addon_stripe_prices from anon, authenticated;

commit;
