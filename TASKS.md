# TASKS.md — Found Co. / found-websites
### Execution board — single source of truth for active work
*Last updated: June 20, 2026 — continuous session*

---

## CURRENT PHASE

**Phase 4: Customer Dashboard — ACTIVE**
**Add-On System: SHIPPED**
**Online Ordering Add-On: SHIPPED (Codex)**

Online ordering flow live. Dashboard tab customization shipped. Next: test pass, then upsell banner + plan card savings.

---

## NOW (MAX 3)

1. **QA payable estimates end to end** - Stripe-connected Accept & Pay, pay-later, receipt email, owner email, dashboard `Paid` / `Deposit paid` / `Accepted, unpaid`, and public paid state.
2. **Session 5: AI estimate builder** - AI-assisted work/pricing only after the manual estimator + payment path passes live QA.
3. **Invoice-now / POS planning** - decide whether this belongs as a toggle/tab inside Estimates or a separate POS/invoice mode for owners who already did the work from a verbal yes.
---

## RECENTLY COMPLETED (July 3, 2026 - Codex Session 4)
- Completed dashboard payment-state polish for estimates.
- Estimate cards now distinguish `Paid`, `Deposit paid`, and `Accepted, unpaid` instead of showing every won job as only `Accepted`.
- Accepted estimate detail now shows the payment state, total, accepted date, and the owner next action.
- Added owner-side `Send Payment Link` / `Resend Payment Link` for accepted-but-unpaid estimates with client email.
- Added dashboard API `payment_link` send mode; it emails a clean secure payment link and updates `payment_link_sent_at` without changing accepted status back to sent.
- Added timeline events for payment link sent, deposit paid, paid in full, and receipt sent.
- Verified with `cmd /c npm run build`.

---
## RECENTLY COMPLETED (July 3, 2026 — Claude Code session)
- ✅ Estimate builder step pills — were hardcoded fake (`index === 0`), now real `IntersectionObserver` scroll-spy + tap-to-jump
- ✅ Estimate builder card-stack removed — five sections now flow as one surface with hairline dividers, not five bordered boxes
- ✅ FOUND wordmark — was hardcoded Arial in 12 places, now one shared `src/components/FoundWordmark.tsx` component
- ✅ Sitewide font root cause — `globals.css` had dead `create-next-app` boilerplate (`body { font-family: Arial... }`, `--font-sans: var(--font-geist-sans)`) silently overriding the real Inter font loaded in `layout.tsx`. Removed both; `--font-sans` now points at `--font-inter`.
- ⏳ Not yet visually confirmed — see NOW #1
- ⏳ Gray status-bar band on estimate builder — suspected iOS Safari chrome, not app CSS. Needs Shawn to test via "Add to Home Screen" to confirm.

---

## RECENTLY COMPLETED (June 24, 2026 — Codex + Claude session)
- ✅ Online ordering system — inline add-to-cart on public menu, Stripe checkout, paid order handler
- ✅ Owner order email — itemized table, pickup time block, notes, customer contact
- ✅ Customer confirmation email — order summary + business branding
- ✅ `DashboardTabsManager.tsx` — owners reorder/choose bottom tabs from More tab
- ✅ `DashboardNav.tsx` — dynamic tabs per industry + active add-ons (Orders, Reserve auto-appear)
- ✅ Leads page `?view=orders` / `?view=reservations` filtering
- ✅ `dashboard/layout.tsx` — fetches activeAddonSlugs server-side, passes to DashboardNav
- ✅ CHANGELOG + TASKS updated

## RECENTLY COMPLETED (June 22-23, 2026 — add-on session)
- ✅ 7 add-ons all live in Stripe — `addon_subscriptions` table, `addon_stripe_prices` table
- ✅ Reservation system — `/[slug]/reserve` page + form + server action + emails
- ✅ More page rewrite — plan features, Lock In My Rate button, plans link
- ✅ Menu fallback — warm copy + Call Us button
- ✅ Admin email preview — reservation tabs conditional on industry
- ✅ Gallery vocab — `albumLabelFor` used everywhere
- ✅ `custom_domain` ungated (was accidentally Pro+ only)

## RECENTLY COMPLETED (June 19–20, 2026 — continuous session)
- ✅ SiteEditor: all accent colors unified to Signal Green; progress bar removed from More plan card; "contact" → "lead" on Leads
- ✅ Migration-035 live — `photo_albums` table + `company_photos.album_id` column
- ✅ Photos page full rewrite — date grouping headers, albums/projects tab, album detail view, share sheet
- ✅ `/api/albums` route (GET/POST/DELETE with slug dedup)
- ✅ `/api/company-slug` returns `{ slug, industry }`
- ✅ Public album gallery page — `/[slug]/gallery/[album]/page.tsx`
- ✅ `albumLabelFor(industry)` — 18-industry vocab map in `typography.ts`
- ✅ `getCompany` — `industry_category` added to type + SELECT
- ✅ Camera pre-flight — pre-fetched albums, instant sheet, project picker with horizontal tile scroll
- ✅ Camera picker visual overhaul — 84px glowing hero circle, 72×72 color album tiles, Apple spring easing
- ✅ "New" tab renamed "Unsorted"
- ✅ Gallery integration — `company_photos.for_website` now appears on public `/[slug]/gallery` (dashboard photos → site, gap closed)
- ✅ Home redesign — 3 pure states (new lead hero / caught up momentum / welcome share), all stat chips + quick-action buttons removed
- ✅ Photo curation — all 10 new industries approved by Shawn at `/admin/photos` (June 20, 2026) — ALL 22 industries complete
- ✅ Plan gating — "Share with Client" locked to Pro; base plan sees UpgradeSheet with feature list + CTA to /more
- ✅ Pro album-organized gallery — `/[slug]/gallery` shows album cover grid for Pro users; base plan flat grid unchanged
- ✅ Lead auto-reply — confirmed live in `leads.ts`; no new work needed

---

## RECENTLY COMPLETED (June 19, 2026 — launch day session)
- ✅ Full team audit (Jony + Steve co-lead) — P0/P1/P2 items identified and all approved by Shawn
- ✅ Greeting → `TYPE.largeTitle h1`; new lead Call button full-width green pill with glow
- ✅ Welcome state added (isActive + 0 leads); caught-up state "View all →" link
- ✅ Emoji temperature (🔥⚡❄️) → geometric dot system; emoji photo flags → SVG heart/star
- ✅ Unread badge: 8px red dot on Leads tab (mobile + desktop) when newLeadCount > 0
- ✅ Context-aware quick actions: 1-col (photo only) when new lead showing
- ✅ `?upload=1` param → auto-opens file input on Photos page (from sidebar Add Photo button)
- ✅ Contacts page complete rewrite — all 20+ px violations fixed, FAB 44px, SVG empty state
- ✅ More page: Found plan green, billing section removed, email row added, upgrade features rewritten
- ✅ Banner condition fixed for canceled accounts; favicon 404 fixed in middleware
- ✅ All px sizes → rem; iOS HIG Dynamic Type ramp enforced sitewide
- ✅ TypeScript ✅ build ✅ — committed `09f502b`

## RECENTLY COMPLETED (June 19, 2026 — typography session)
- ✅ Typography system rolled out to all remaining dashboard pages — `SiteEditor.tsx`, `more/page.tsx`, `photos/page.tsx`. Commits: `f87c359`
- ✅ Desktop sidebar layout — responsive 220px sidebar on ≥ 768px, mobile bottom nav unchanged. Commits: `94d7db4`

## RECENTLY COMPLETED (June 18, 2026 session)
- ✅ Remove trial from upgrade checkout — confirmed no `trial_period_days` in `more/actions.ts`
- ✅ In-dashboard activation banner (white bar, green button, inline overlay — no black screen)
- ✅ Lead/Contact detail sheets with full edit capability (PATCH /api/leads, updateContact action)
- ✅ Home screen redesign (single decisive status card)
- ✅ Shared typography system (Leads, Contacts, Home, DashboardNav)
- ✅ Identity-based avatar colors (Apple Contacts style)
- ✅ Bulk-fixed 14 companies with stale `plan: "found_pro"` → `plan: "found"`

---

## CURRENT SESSION HANDOFF (July 1, 2026 — Claude Code)

### Shipped
- Business name step: name input only, no URL shown while typing
- Web address shown calmly after name is entered and verified available
- “Change my Found web address →” link (opens SlugSheet, now using plain-language “web address”)
- Progress bar: thin Signal Green bar in header during questions phase
- Bookings route Resend init moved inside POST handler (local build fix)
- Commit: `b3c5791`
- Drawer modal polish: gap fixed, Dynamic Island dark, keyboard awareness, double safe-area padding removed, progress bar removed
- Commit: `d73ac49`
- Typeform-style step animations: title wave 1 → inputs wave 2 (90ms stagger), spring easing, 44px travel
- Contact step: email reveals progressively after 10-digit phone — keyboard/scroll problem gone
- Commit: pending

### Decisions
- Owners type the business name. Found generates the web address. They see it after, not during.
- `company.name` and `company.slug` are separate and always were. Now the UI reflects that.
- Always say “Found web address” — never “slug,” never “URL,” never “address” alone.

### Must Test Next
- Onboarding on mobile: type name → see web address appear calmly below → tap “Change my Found web address” → SlugSheet language is correct → slug conflict flow still works
- Progress bar grows correctly through all question steps
- Found Business full E2E flow (carry from last session)
- Display-name prompt save closes and does not return (carry from last session)

---


### ESTIMATOR BUILDER TEAM RESET (July 2, 2026)

Problem Shawn identified during testing:
- The builder feels like filling out a database, not running a business tool.
- The visual hierarchy is weak; the eye has no clear path.
- The bottom sheet sits over Found branding and feels like an overlay, not the actual work surface.
- Line items feel like spreadsheet rows.
- Internal payment setup issues must never be visible to clients.

Team-approved redesign direction:
- Full-screen mobile-first estimator surface, starting directly under phone/browser chrome.
- Workflow: Customer -> Job -> Work -> Price -> Review.
- Work item composer should be guided: describe work, choose flat price or quantity/rate, then price it.
- Unit is optional and contextual, not a required-looking database field.
- My Services should feel like quick reusable work, not a rate-sheet database.
- Public client page never says Stripe/payments are not set up. Owner dashboard handles setup warnings.

Do not continue patching random fields before this plan is implemented.

## ESTIMATES REBUILD HANDOFF (July 2, 2026)

### Product Goal
The estimate page is the decision moment. Found should get the customer from "yes" to payment while the emotion is still warm. Do not force the standard estimate -> separate invoice -> later payment pathway unless the customer truly needs it.

### Current State
- Built: public estimate page, print/PDF page, decline flow, expiration, sequential estimate numbers, default tax, lead/client autocomplete, Google Places proxy, embedded Stripe Payment Element, pay-now/deposit flow, quiet pay-later acceptance, payment-link email, customer receipt email, owner notification, and webhook backup for paid deposits.
- Missing: dashboard polish for `Accepted, unpaid` / `Deposit paid` / `Paid`, owner resend payment link, manual QA with Stripe test mode, invoice mode, and AI line-item generation.
- Completed cleanup: builder split client fields now persist through estimate create/update APIs.

### Session 3 - Modern Accept & Pay (Code Implemented, Needs Migration + QA)
- Done: persist split client fields end to end.
- Done in code and database: payment status fields for `unpaid`, `deposit_paid`, `paid`, accepted payment choice, pay-later time, payment-link sent time, paid time, and receipt sent time. Migration 046 was applied to Supabase on July 2, 2026 and verified against `information_schema.columns`.
- Done: primary CTA on public estimate is `Accept & Pay Deposit` or `Accept & Pay Now`.
- Done: embedded Stripe Payment Element uses Stripe automatic payment methods so wallet eligibility can surface Apple Pay, Google Pay, and card where available.
- Done: on payment success, mark accepted and paid/deposit-paid, show a human success state, email receipt/confirmation to customer, notify owner. Webhook fallback mirrors this path.

### Session 4 - Pay Later Without Making It The Default
- Done: quiet secondary text link `Accept now, pay later` exists under the main payment CTA.
- Done: pay-later marks estimate accepted/unpaid and sends the customer a payment-link email.
- Done: public estimate page remains payable after accepted/unpaid until paid.
- Dashboard shows `Accepted, unpaid` and lets owner resend payment link.
- Keep invoice language as a fallback/admin convenience, not the default customer path.

### Session 5 - AI Estimate Builder
- Owner describes the job in natural language.
- Found drafts line items from My Services and, later, the unified catalog.
- Suggested quantities, units, descriptions, and prices are editable.
- AI-generated items are marked internally.
- Owner must review and send manually.

### Test After Each Estimate Session
1. Run `cmd /c npm run build` and confirm TypeScript plus page generation pass.
2. Create a new estimate in the dashboard with first name, last name, email, phone, property/job address, tax, and at least two line items.
3. Save, reopen, and confirm client split fields, totals, tax, deposit amount, and line items persisted.
4. Open the public `/q/[id]` page on mobile width and desktop width.
5. Test primary pay path in Stripe test mode: `Accept & Pay Deposit` or `Accept & Pay Now`, complete payment, confirm success state, customer receipt email, owner email, and public page no longer allows decline.
6. Test secondary path on a fresh estimate: `Accept now, pay later`, confirm accepted/unpaid state, customer payment-link email, owner accepted email, and same public page still lets the customer pay.
7. Check dashboard list/detail status labels for the touched estimate: draft/sent, accepted unpaid, deposit paid, paid, declined, expired as applicable.
8. Run `git diff --check` and record the exact test result in `CHANGELOG.md` before ending the session.
### Later - Invoice Mode / POS-Lite
- Add invoice mode as a sibling inside the same tool: `Estimates | Invoices` or `New Estimate / New Invoice`.
- Invoice means the work was verbally agreed/done and the owner needs payment now.
- Reuse the same client, line-item, tax, payment, receipt, and email engine.
- Do not build a separate POS system yet. Future simple language: `Send Invoice`, `Collect Payment`, `Take Payment Now`.

## BACKLOG

### Add-Ons & Monetization
- Plan card savings display — show intro-rate discount cleanly (no "Founding rate" label — Shawn rejected that)
- Upsell banner — not built; planned as next after June 22
- Stripe custom payment form — Option B approved (in-app Stripe Elements), not built
- Menu add-on gating — `menu_display` add-on gates nothing; SiteEditor has no check; decision needed on what $10 unlocks
- Food CTA bug — "View Our Menu" still appears when `menu_display` add-on isn't active
- Stripe subscriber audit — verify no Pro/Business subscribers charged wrong price before activateActions.ts fix

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
- **Resend module-level init cleanup** — `app/actions/reply.ts`, `app/actions/leads.ts`, `app/onboarding/actions.ts` all init `new Resend(...)` at module level (same pattern that broke the bookings route). Low risk since these are server actions, not route handlers, but should be moved inside each function as a housekeeping pass.

### Unified Product/Service Catalog — Cross-System Data Sharing
**Vision:** One catalog, three systems. A business enters their products/services/prices once and that data flows into:
- **Online store** (sell products by card)
- **Online ordering** (menu items, catering packages)
- **Estimates** (line items pulled from catalog)
- **Eventually: invoices** (same items, same prices)

**Use cases that drove this:**
- Tire shop sells tires online + wants to pull tire prices into estimates
- Auto mechanic has service prices in estimates + wants them in the store
- Caterer uses online ordering for regular orders + needs same menu items for party/event estimates
- Restaurant with online ordering wants to create catering estimates using the same menu data

**Architectural note:** The current rate sheet (estimate add-on), online store products, and menu items are THREE separate data stores with no connection. The rebuild should unify them into a single `company_catalog` table:
- `id`, `company_id`, `name`, `description`, `price`, `unit`, `category`, `available_in` (array: store | ordering | estimates)
- Each system reads from the same table, filtered by `available_in`
- Owner manages one list, controls where each item appears

**When to build:** Needs its own dedicated session. Prerequisite for Session 2 of estimates rebuild (service catalog feature). Also blocks the online store and ordering system from feeling connected.

### New Industry Photo Curation
- Curate Pexels photos for 3 new industries: `print_signage`, `tech_repair`, `transportation`
- Team selects, Shawn approves via `/admin/photos` — same process as existing 22 industries
- Needed before these industries can show real stock photos to new owners

### Decisions needed
- Portal name — "Found Studio" proposed, needs Steve/team sign-off
- Inbox tab — currently redirects to Leads. Should it become a full conversation thread view?
- Social posting — direct API vs save to camera roll (locked: camera roll for launch)

