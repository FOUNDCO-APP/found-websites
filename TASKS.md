# TASKS.md — Found Co. / found-websites
### Execution board — single source of truth for active work
*Last updated: June 17, 2026 — end of session*

---

## CURRENT PHASE

**Phase 4: Customer Dashboard — SUBSTANTIALLY COMPLETE**

What shipped today:
- ✅ Login flow fixed — magic link → /auth/token → /select → home
- ✅ Home screen — greeting, pulse number, latest lead, quick actions
- ✅ Leads tab — manual add, temperature (Hot/Warm/Cold), hot leads elevated
- ✅ Contacts tab — Supabase wired, add/tag/filter, native call/text/email
- ✅ Photos tab — upload, heart/star, grid view, optimistic updates
- ✅ Site tab — edit all sections, AI rewrite per section, gallery management
- ✅ Gallery — owner photos + stock images combined, remove stock photos
- ✅ More tab — Edit My Site entry, billing, upgrade
- ✅ Found design language applied — green accent bar, font-black eyebrows, font-light headlines, glow buttons
- ✅ Nav fixed — backdrop blur, 120px bottom padding, no floating

---

## NOW (MAX 3)

1. **Remove trial from upgrade checkout** — `more/actions.ts` `startUpgradeCheckout()` still has `trial_period_days: 14`. Must be removed before launch.

2. **Favicon 404** — all client sites throw a 404 for `/favicon.svg`. Noisy in logs, bad for SEO.

3. **Stripe webhook** — `STRIPE_WEBHOOK_SECRET` needs to be verified in Vercel. The webhook at `/api/stripe/webhook` handles subscription status updates. If it's not working, `subscription_status` won't update after billing events.

---

## BACKLOG

### Dashboard
- Auto-reply message — owner writes it once during onboarding/settings, Found sends it to every new lead via Resend
- Manual lead follow-up sequence — one toggle: "Follow up automatically if I don't reply in 24 hours"
- Business card scanner — camera → OCR → pre-fill lead or contact form
- Dashboard home/overview for desktop (sidebar nav, two-column leads/inbox)
- Real-time lead notifications (push notification when new lead arrives)
- Contacts tags — allow custom tags beyond the preset 5
- Photo Before & After social post creator

### Site
- Hero photo also syncs to `website_config.hero_image_url` for layouts that read it
- Photo social export — format with brand typography, save to camera roll
- Color/theme picker (Pro feature)
- Logo upload

### Platform
- Photo curation for 10 new industries at `/admin/photos`
- Remove debug `[Activate]` console logs
- `VERCEL_API_TOKEN` + `VERCEL_PROJECT_ID` for connect-domain feature
- Custom domain flow end-to-end test

### Decisions needed
- Portal name — "Found Studio" proposed, needs Steve/team sign-off
- Inbox tab — currently redirects to Leads. Should it become a full conversation thread view?
- Social posting — direct API vs save to camera roll (locked: camera roll for launch)

