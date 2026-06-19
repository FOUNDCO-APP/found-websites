# TASKS.md — Found Co. / found-websites
### Execution board — single source of truth for active work
*Last updated: June 19, 2026 — end of session*

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

1. **Desktop E2E test** — open `my.foundco.app` on a desktop browser (1280px+) and verify: sidebar renders, all 5 tabs navigate correctly, activation banner shows for unactivated company, Home screen layout, lead/contact detail sheets, typography across all pages. Mobile should be unchanged.

2. **Quick cleanup** — (a) remove `[Activate]` debug console logs from `activateActions.ts`; (b) fix favicon 404 on all client sites (`/favicon.svg` returns 404, noisy in Vercel logs)

3. **Rebrand/naming — tabled** — "FoundBizz"/"FoundBuzz" explored, neither landed. No decision. Do not raise unless Shawn brings it up. Only weigh in on brand-feel, never legal/domain/entity.

---

## RECENTLY COMPLETED (June 19, 2026 session)
- ✅ Typography system rolled out to all remaining dashboard pages — `SiteEditor.tsx`, `more/page.tsx`, `photos/page.tsx`. Every dashboard page now uses `TYPE`, `TEXT_OPACITY`, `ICON` from `typography.ts`. Commits: `f87c359`
- ✅ Desktop sidebar layout — responsive: mobile keeps bottom tab bar + FAB, desktop (≥ 768px) shows fixed 220px sidebar with wordmark, Signal Green accent, 5 vertical nav items, "Add Photo" button. Content shifts right, header wordmark hides, max-width 760px. Commits: `94d7db4`

## RECENTLY COMPLETED (June 18, 2026 session)
- ✅ Remove trial from upgrade checkout — confirmed no `trial_period_days` in `more/actions.ts`
- ✅ In-dashboard activation banner (white bar, green button, inline overlay — no black screen)
- ✅ Lead/Contact detail sheets with full edit capability (PATCH /api/leads, updateContact action)
- ✅ Home screen redesign (single decisive status card)
- ✅ Shared typography system (Leads, Contacts, Home, DashboardNav)
- ✅ Identity-based avatar colors (Apple Contacts style)
- ✅ Bulk-fixed 14 companies with stale `plan: "found_pro"` → `plan: "found"`

---

## BACKLOG

### Dashboard
- Auto-reply message — owner writes it once during onboarding/settings, Found sends it to every new lead via Resend
- Manual lead follow-up sequence — one toggle: "Follow up automatically if I don't reply in 24 hours"
- Business card scanner — camera → OCR → pre-fill lead or contact form
- ~~Dashboard home/overview for desktop (sidebar nav, two-column leads/inbox)~~ — sidebar shipped June 19
- Real-time lead notifications (push notification when new lead arrives)
- Contacts tags — allow custom tags beyond the preset 5
- Photo Before & After social post creator

### Site
- Hero photo also syncs to `website_config.hero_image_url` for layouts that read it
- Photo social export — format with brand typography, save to camera roll
- Color/theme picker (Pro feature)
- Logo upload

### Platform
- Favicon 404 — all client sites throw a 404 for `/favicon.svg`. Noisy in logs, bad for SEO. Not urgent enough for NOW slot but still unresolved.
- Photo curation for 10 new industries at `/admin/photos`
- Remove debug `[Activate]` console logs
- `VERCEL_API_TOKEN` + `VERCEL_PROJECT_ID` for connect-domain feature
- Custom domain flow end-to-end test

### Decisions needed
- Portal name — "Found Studio" proposed, needs Steve/team sign-off
- Inbox tab — currently redirects to Leads. Should it become a full conversation thread view?
- Social posting — direct API vs save to camera roll (locked: camera roll for launch)

