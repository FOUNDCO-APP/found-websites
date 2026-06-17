# TASKS.md — Found Co. / found-websites
### Execution board — single source of truth for active work
*Last updated: June 17, 2026*

---

## OPERATING RULES

1. Only one active phase at a time
2. Max 3 tasks in NOW
3. New ideas go to BACKLOG, not NOW
4. If a critical issue appears, pause and re-rank NOW
5. Update this file before ending every session

---

## CURRENT PHASE

**Phase 3: Billing Foundation — ✅ CLOSED June 17, 2026**

Exit criteria all met:
1. ✅ `STRIPE_PRICE_ID_FOUND` set in Vercel
2. ✅ `STRIPE_WEBHOOK_SECRET` set in Vercel
3. ✅ migration-029 run in Supabase
4. ✅ Owner completes onboarding → sees activate banner → enters card → activates
5. ✅ Supabase `subscription_status → active`, `stripe_customer_id` set

**Phase 4: Customer Dashboard — NOW ACTIVE**

Goals:
- Site page functional (edit business info, services at minimum)
- Leads/Inbox deduplicated
- Dashboard home/overview screen
- Billing upgrade flow consistent (no trial on upgrades)

---

## NOW (MAX 3)

1. **Fix Site page** — "Edit business info" and "Update services" are the two most impactful. Remove "Coming soon" and wire to actual edit forms. Clients tap this first.

2. **Remove Leads/Inbox duplication** — `/leads` and `/inbox` show identical data. Decision needed: keep Inbox (has Call/Reply actions), remove Leads, or differentiate clearly.

3. **Remove trial from upgrade checkout** — `more/actions.ts` `startUpgradeCheckout()` has `trial_period_days: 14` which contradicts the team's charge-immediately decision. Remove it.

---

## RECENTLY COMPLETED (June 16-17, 2026 — Billing activation fixed)

- ✅ **Full activation flow working end-to-end** — `igloofrost` test confirmed: Stripe subscription active, $29/month, Supabase `subscription_status: active`
- ✅ **Fixed companyId bug** — onboarding was passing browser `sessionId` to Stripe instead of real DB company ID
- ✅ **Fixed blank Stripe env vars** — `STRIPE_SECRET_KEY` and `STRIPE_PRICE_ID_FOUND` were empty in Vercel
- ✅ **Switched to SetupIntent flow** — correct Stripe pattern: collect card via SetupIntent → confirm → create subscription with saved card → immediate charge
- ✅ **Fixed banner hiding too early** — banner now hides on `subscription_status === 'active'` not `stripe_customer_id !== null`
- ✅ **Pricing decision locked** — no trial period, charge immediately, $29 founding rate

---

## BACKLOG

- Dashboard home/overview screen (site status + lead count + plan summary)
- Favicon 404 fix on all client sites
- Photo curation for 10 new industries at `/admin/photos`
- `VERCEL_API_TOKEN` + `VERCEL_PROJECT_ID` in Vercel dashboard for connect-domain
- Remove debug `[Activate]` console logs once billing confirmed stable in prod
- Real-time lead notifications (push or email)
- Edit business info (site page)
- Update services (site page)
- Change colors & theme (site page)
- Add photos / upload logo (site page — Pro gated)
