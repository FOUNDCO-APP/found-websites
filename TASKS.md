# TASKS.md - Found Co. / found-websites
### Active work board. Current session truth lives in `SESSION_HANDOFF.md`.
*Last updated: July 20, 2026*
*Current handoff: read `SESSION_HANDOFF.md` first for changed / open / test status.*

---

## ANALYTICS - Phase 1 SHIPPED July 20, 2026

Shawn asked for traffic/activity monitoring for marketing purposes. Scoped as two phases:
- **Phase 1 (SHIPPED):** Vercel Web Analytics on `foundco.app` only (not tenant sites, not dashboard/admin) - visitor counts, page views, referrers. Gated via a new `x-found-root-site` header set only by `middleware.ts` for root-domain requests. Not yet confirmed whether Vercel needs a one-time dashboard enable before data flows.
- **Phase 2 (BACKLOG, not started):** PostHog for funnel/attribution - visit -> onboarding start -> onboarding complete -> activation/paid, with UTM campaign tracking. Needs its own session (event instrumentation through the full onboarding flow).

---

## CURRENT PHASE

**Phase 4: Customer Dashboard - ACTIVE**
**Add-On System: SHIPPED**
**Online Ordering Add-On: SHIPPED**
**Unified Product Catalog / Online Shop: SHIPPED July 16-17, Shawn confirmed live and tested**
**Plan Upgrade Flow (Stripe portal): SHIPPED July 15 - also resolved the plan-card savings display question**
**Live-mode Stripe Connect webhook: SHIPPED July 19 - closes the sandbox-only webhook gap flagged July 7**

*Note: this phase line was stale until July 20 - see "DOC GAP BACKFILL" below. Several major features (full catalog/shop rebuild, live payment webhook, plan upgrade flow) shipped July 13-20 without being logged here in real time.*

Online ordering flow live. Full product catalog/shop rebuilt and confirmed working by Shawn. Dashboard tab customization shipped. Next: finish the remaining launch-payment QA pass (see NOW #1) and the upsell banner.

---

## DOC GAP BACKFILL - July 20, 2026

Docs were not kept current July 13-20 (~80 commits, several major features). Reconstructed from `git log` and confirmed with Shawn. Full detail logged in `CHANGELOG.md` under matching dates. Summary of what changed status as a result:

- **Unified Product/Service Catalog** (see BACKLOG below) - was marked "not built yet, needs its own session." Actually shipped July 16-17 as an industry-aware catalog editor with variants/inventory, homepage showcase, and cart-sheet checkout. Shawn confirmed it's live and tested. Menu and product managers are dedicated (not yet confirmed whether estimates line items pull from the same catalog table - that unification may still be partial, needs a follow-up check).
- **Stripe Connect webhook** - live-mode signing secret added July 19 (`d9dbc68`). This was the last piece of the P0 launch gate flagged July 7. Shawn said mark it ready for QA.
- **Plan card savings display** (see BACKLOG below) - was "UNRESOLVED." The July 15 Stripe-portal plan-upgrade flow (`Add Found plan upgrade sheet`, `Route plan upgrades through Stripe portal`) resolved this per Shawn - removed from backlog, logged as a decision in `DECISIONS.md`.
- **Copy quality audit/repair system** - shipped July 13, applied to production copy in staged risk tiers (high-risk fixed first, then medium-risk, plus new faith-industry copy). Shawn confirmed it ran against real customer sites, not just test/audit mode.
- **Estimate payment fixes** (`Fix remaining balance estimate payments`, `Confirm estimate payment request sends`, etc., July 15) - may close part of the outstanding estimate/payment QA list below; not yet confirmed which specific test-list items this covers.
- Smaller undocumented fixes: dashboard badge clearing on view (July 18), payment receipt sender name showing the business instead of "Found" (July 19), black video thumbnails in Photos grid (July 19), mobile checkout sheet stabilization (July 17), 3-option add-to-project photo picker + zoom label/camera button fixes (July 20).

---

## JULY 14 DASHBOARD INTEGRITY TEST

- [ ] Switch between tshirts, Tacos, Taco Shop, Construction, and Musician from one login.
- [ ] Confirm Home greeting, top-right company picker, More plan card, bottom tabs, and page titles always show the same selected company.
- [ ] Confirm Musician shows bookings/schedule language and no Orders tab.
- [ ] Confirm Construction still shows Estimates as the primary Business message.
- [ ] Confirm restaurants show Reservations/Orders based on available tools and do not fall back to generic Inquiries when using the Reservations tab.

---



## VIDEO UPLOAD SAVE FIX - COMPLETED July 19

- [x] Confirmed existing videos were missing from company_photos, not hidden by the Photos UI.
- [x] Added signed direct upload path for videos to avoid serverless body-size failures.
- [x] Made failed camera/library uploads visible to owners instead of silently disappearing.
- [x] Preserved album placement during upload record creation.
- [ ] Test on iPhone: record/upload short video, verify Photos -> Unsorted shows VIDEO badge, then heart/star it.

---
## CONTACT EDITING + VIDEO MEDIA - COMPLETED July 19

- [x] Add editable Contact Page copy fields in Edit My Site.
- [x] Add Contact as a named website media slot.
- [x] Allow Photos uploads to accept videos and show playable video previews/badges.
- [x] Let selected Header media render as a public muted looping hero video when the media is video.
- [ ] Later: owner-controlled hero motion setting for static / rotate-on-load / slideshow.

---
## NAMED SITE PHOTO SLOTS - COMPLETED July 18

- [x] Replace single header-only image picker with explicit Header, About, Visit / CTA, and Gallery slots.
- [x] Persist section assignments through existing company_photos.website_section values: hero, about, cta, and gallery.
- [x] Update public home/about/services templates so selected owner photos win before stock images.
- [x] Keep slideshow/random rotation out of this pass; motion needs a separate owner setting later.

## SITE HEADER PHOTO EDITING - COMPLETED July 18

- [x] Replace mystery hero thumbnails in Edit My Site with an explicit Header Photo control.
- [x] Sync selected owner photos to the public site through `website_config.hero_image_url` and `hero_images`.
- [x] Add a clear header-photo picker and remove action.
- [x] Keep Save/Cancel visible when editing headline/supporting copy on mobile.

---

## NOW (MAX 3)

**Full team audit re-run July 20, 2026 - see `LAUNCH_READINESS_AUDIT_2026-07-20.md`.** All 5 P0s from that audit are now fixed (list below, same day). Kept for history; the remaining 14 P1s from that audit are still open and are the next real priority list.

**All 5 P0s FIXED July 20, 2026:**
0. Payment trust bug - `accept-estimate` now requires and server-verifies the Stripe PaymentIntent before marking anything paid; webhook now also handles `estimate_balance`. **Test next:** run a real test-mode deposit payment and a real balance payment end to end.
1. Post-activation login handoff - `confirmActivation` now generates a real sign-in link and the activation redirect carries the owner's browser through it, landing them signed in on `/api/select-company` instead of a bare `/login` screen. **Test next:** run a full fresh onboarding -> activation and confirm you land in the dashboard already signed in, not at a login screen.
2. Sitemap/indexing - added a per-business `is_test` toggle (`/admin/businesses` -> Manage -> "Hide from search"), separate from `is_comp` billing status. Classified July 20: 36 of 37 companies are Shawn's own practice accounts and are now excluded from the sitemap and marked `noindex`; only Nereida's real salon stays indexable. Sitemap also now includes Found's own marketing/legal pages, which were previously missing entirely.
3. "Automatic review requests" claim - changed to "coming soon" everywhere it appeared (found-business plan page, More page plan cards) instead of building the feature, per Shawn.
4. Catalog editor mobile keyboard/scroll-lock bug - `CatalogManager.tsx`'s Add/Edit Item sheet now uses the same body-lock pattern as SiteEditor.

**Still open, launch payment gate itself (separate from the bug fixes above):**
- `FOUND1` live activation promo is created and production price IDs are live. Live-mode Stripe Connect webhook signing secret shipped July 19. Still needed: run activation payment, Accept & Pay, pay later, receipts, owner email, dashboard state, and public paid-state QA end to end - can proceed now that the login-handoff bug (item 1 above) no longer blocks reaching the dashboard.

*Prior verdicts: `LAUNCH_READINESS_AUDIT_2026-07-09.md`, `LAUNCH_READINESS_AUDIT_2026-07-20.md`. Open self-serve launch remains blocked; controlled pilot only. 14 P1s from the July 20 audit remain open - see that file for the full list (no security headers, no rate limiting, no CI/tests, comp-link secret in a URL, checkout webhook fallback gaps, etc.).*

---

## JULY 6 SESSION - WHAT'S LEFT TO TEST

**Read `SESSION_HANDOFF.md` first. This section keeps the active July 6 live-verification gap visible.** All code is pushed to `main` and builds clean; this is purely the live-verification gap. Commits referenced below are on `main`.

1. **Camera black screen (`e9906d4`)** - if camera permission is blocked, confirm a clear guidance message appears (not a black screen), with iOS vs Android wording. Confirm normal camera flow still works on a device that has never been asked before.
2. **Company-switch speed (`c6b6b38`)** - switch between businesses on an account with 2+ companies, confirm it feels noticeably faster.
3. **Company-switch instant feedback (`1d55ed1`)** - confirm tapping a business highlights it green + shows a spinner immediately, and the other options dim/disable during the switch.
4. **Leads: Warm default removed + form-as-sheet (`161716f`)** - open the add-lead form on a temperature-based business: confirm no pill is pre-selected, Save stays disabled until one is picked, and the empty state never shows through/under the open form.
5. **Estimate Request guidance (`0e59182`)** - manually add a lead on an Estimate-Request business: confirm the added/create-estimate prompt appears and both buttons work. On an existing Estimate Request in the list, confirm Create Estimate shows directly on the row.

---
## LEADS/INQUIRIES AUDIT (July 5, 2026) - ALL 4 ITEMS RESOLVED (July 6)

**Read this first if you're picking this up.** Shawn reviewed live screenshots of the Blue Luna Events test customer/profile on `my.foundco.app` and flagged 4 things. Blue Luna Events is the account/slug Shawn created for testing; do not treat the word "Events" alone as the issue. Team discussed (Steve/Jony/Craig/Angela), all 4 items are now shipped Ã¢â‚¬â€ see notes below on how each was actually resolved.

### 1. "Inquiries" vs "Leads" labeling on the Blue Luna Events test profile - needs correction
- `src/lib/dashboard/typography.ts` -> `defaultFormIntentFor()` maps industries to an intent, which drives the page title/vocab (Leads/Estimates/Inquiries/Bookings/Reservations/Orders/Appointments).
- The live Blue Luna Events test profile was showing "inquiry" language on the Leads page. Shawn clarified that Blue Luna Events is the customer/profile name and slug used for testing; the note should not imply he was asking about generic "events" wording in isolation.
- Current code maps these industries to `"inquiry"` by default: `real_estate, events, event_planning, balloon_decor, creative_services, photography, education, professional_services, childcare, nonprofit`.
- **Team take:** audit the actual intent model and labels so a business on the Leads tool does not feel like it is in the wrong product. Do not blanket-flip all 9 industries without review, but Blue Luna Events should be checked as a real account/profile case.
- **IMPLEMENTED July 6:** Quote-first businesses use `Estimate Requests` as intake and keep `Estimates` as a separate priced document workflow. Blue Luna Events / balloon decor now follows this model by industry/sub-industry, not by business name or slug.
- **Shawn clarification:** Estimates/quotes are not the same thing as leads, inquiries, or bookings. Estimates are their own information pathway and should remain a separate tool/tab when the business needs to price work. A business can need both: one intake path for leads/bookings/inquiries and a separate estimates/quotes path for priced work.
- **Product implication:** Do not use one single intent value to decide everything. We need at least two separate decisions: (1) what the incoming customer/intake tab is called (`Leads`, `Inquiries`, `Bookings`, `Reservations`, `Orders`, `Appointments`), and (2) whether the business also gets an `Estimates`/quotes workflow as a distinct tool.

### 2. Temperature (Hot/Warm/Cold) silently defaults to "Warm" Ã¢â‚¬â€ FIXED July 6
- `src/app/dashboard/(app)/leads/page.tsx`: `newTemp` now starts `null`, resets to `null` on cancel/save. Save is disabled until a temperature is picked (for temp-based intents), with a quiet "Pick one to save." hint under the pills.
- Pushed in `161716f`.

### 3. Add-lead form pushes the empty state down instead of covering it Ã¢â‚¬â€ FIXED July 6
- Converted the inline `{showAdd && (...)}` card into a real slide-up sheet (scrim + fixed bottom sheet), matching the `IntentPickerSheet` pattern already used elsewhere in this exact file (`#101411` background, same radius/z-index language). No longer shares document flow with the empty state below it.
- Pushed in `161716f`.

### 4. Schedule page needs a calendar Ã¢â‚¬â€ FIXED July 6 (Codex)
- Codex rebuilt Schedule as its own session: tab order flipped to Calendar Ã¢â€ â€™ Bookings Ã¢â€ â€™ Hours (was Hours-first). Calendar shows a 7-day week strip with booking indicators. Hours redesigned into a read-first weekly summary (Open/Closed + times) with an explicit Edit mode, instead of a dense settings form by default.
- Not yet confirmed live by Shawn Ã¢â‚¬â€ see "JULY 6 Ã¢â‚¬â€ STILL TO TEST" below.

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
## RECENTLY COMPLETED (July 3, 2026 Ã¢â‚¬â€ Claude Code session)
- Ã¢Å“â€¦ Estimate builder step pills Ã¢â‚¬â€ were hardcoded fake (`index === 0`), now real `IntersectionObserver` scroll-spy + tap-to-jump
- Ã¢Å“â€¦ Estimate builder card-stack removed Ã¢â‚¬â€ five sections now flow as one surface with hairline dividers, not five bordered boxes
- Ã¢Å“â€¦ FOUND wordmark Ã¢â‚¬â€ was hardcoded Arial in 12 places, now one shared `src/components/FoundWordmark.tsx` component
- Ã¢Å“â€¦ Sitewide font root cause Ã¢â‚¬â€ `globals.css` had dead `create-next-app` boilerplate (`body { font-family: Arial... }`, `--font-sans: var(--font-geist-sans)`) silently overriding the real Inter font loaded in `layout.tsx`. Removed both; `--font-sans` now points at `--font-inter`.
- Ã¢ÂÂ³ Not yet visually confirmed Ã¢â‚¬â€ see NOW #1
- Ã¢ÂÂ³ Gray status-bar band on estimate builder Ã¢â‚¬â€ suspected iOS Safari chrome, not app CSS. Needs Shawn to test via "Add to Home Screen" to confirm.

---

## RECENTLY COMPLETED (June 24, 2026 Ã¢â‚¬â€ Codex + Claude session)
- Ã¢Å“â€¦ Online ordering system Ã¢â‚¬â€ inline add-to-cart on public menu, Stripe checkout, paid order handler
- Ã¢Å“â€¦ Owner order email Ã¢â‚¬â€ itemized table, pickup time block, notes, customer contact
- Ã¢Å“â€¦ Customer confirmation email Ã¢â‚¬â€ order summary + business branding
- Ã¢Å“â€¦ `DashboardTabsManager.tsx` Ã¢â‚¬â€ owners reorder/choose bottom tabs from More tab
- Ã¢Å“â€¦ `DashboardNav.tsx` Ã¢â‚¬â€ dynamic tabs per industry + active add-ons (Orders, Reserve auto-appear)
- Ã¢Å“â€¦ Leads page `?view=orders` / `?view=reservations` filtering
- Ã¢Å“â€¦ `dashboard/layout.tsx` Ã¢â‚¬â€ fetches activeAddonSlugs server-side, passes to DashboardNav
- Ã¢Å“â€¦ CHANGELOG + TASKS updated

## RECENTLY COMPLETED (June 22-23, 2026 Ã¢â‚¬â€ add-on session)
- Ã¢Å“â€¦ 7 add-ons all live in Stripe Ã¢â‚¬â€ `addon_subscriptions` table, `addon_stripe_prices` table
- Ã¢Å“â€¦ Reservation system Ã¢â‚¬â€ `/[slug]/reserve` page + form + server action + emails
- Ã¢Å“â€¦ More page rewrite Ã¢â‚¬â€ plan features, Lock In My Rate button, plans link
- Ã¢Å“â€¦ Menu fallback Ã¢â‚¬â€ warm copy + Call Us button
- Ã¢Å“â€¦ Admin email preview Ã¢â‚¬â€ reservation tabs conditional on industry
- Ã¢Å“â€¦ Gallery vocab Ã¢â‚¬â€ `albumLabelFor` used everywhere
- Ã¢Å“â€¦ `custom_domain` ungated (was accidentally Pro+ only)

## RECENTLY COMPLETED (June 19Ã¢â‚¬â€œ20, 2026 Ã¢â‚¬â€ continuous session)
- Ã¢Å“â€¦ SiteEditor: all accent colors unified to Signal Green; progress bar removed from More plan card; "contact" Ã¢â€ â€™ "lead" on Leads
- Ã¢Å“â€¦ Migration-035 live Ã¢â‚¬â€ `photo_albums` table + `company_photos.album_id` column
- Ã¢Å“â€¦ Photos page full rewrite Ã¢â‚¬â€ date grouping headers, albums/projects tab, album detail view, share sheet
- Ã¢Å“â€¦ `/api/albums` route (GET/POST/DELETE with slug dedup)
- Ã¢Å“â€¦ `/api/company-slug` returns `{ slug, industry }`
- Ã¢Å“â€¦ Public album gallery page Ã¢â‚¬â€ `/[slug]/gallery/[album]/page.tsx`
- Ã¢Å“â€¦ `albumLabelFor(industry)` Ã¢â‚¬â€ 18-industry vocab map in `typography.ts`
- Ã¢Å“â€¦ `getCompany` Ã¢â‚¬â€ `industry_category` added to type + SELECT
- Ã¢Å“â€¦ Camera pre-flight Ã¢â‚¬â€ pre-fetched albums, instant sheet, project picker with horizontal tile scroll
- Ã¢Å“â€¦ Camera picker visual overhaul Ã¢â‚¬â€ 84px glowing hero circle, 72Ãƒâ€”72 color album tiles, Apple spring easing
- Ã¢Å“â€¦ "New" tab renamed "Unsorted"
- Ã¢Å“â€¦ Gallery integration Ã¢â‚¬â€ `company_photos.for_website` now appears on public `/[slug]/gallery` (dashboard photos Ã¢â€ â€™ site, gap closed)
- Ã¢Å“â€¦ Home redesign Ã¢â‚¬â€ 3 pure states (new lead hero / caught up momentum / welcome share), all stat chips + quick-action buttons removed
- Ã¢Å“â€¦ Photo curation Ã¢â‚¬â€ all 10 new industries approved by Shawn at `/admin/photos` (June 20, 2026) Ã¢â‚¬â€ ALL 22 industries complete
- Ã¢Å“â€¦ Plan gating Ã¢â‚¬â€ "Share with Client" locked to Pro; base plan sees UpgradeSheet with feature list + CTA to /more
- Ã¢Å“â€¦ Pro album-organized gallery Ã¢â‚¬â€ `/[slug]/gallery` shows album cover grid for Pro users; base plan flat grid unchanged
- Ã¢Å“â€¦ Lead auto-reply Ã¢â‚¬â€ confirmed live in `leads.ts`; no new work needed

---

## RECENTLY COMPLETED (June 19, 2026 Ã¢â‚¬â€ launch day session)
- Ã¢Å“â€¦ Full team audit (Jony + Steve co-lead) Ã¢â‚¬â€ P0/P1/P2 items identified and all approved by Shawn
- Ã¢Å“â€¦ Greeting Ã¢â€ â€™ `TYPE.largeTitle h1`; new lead Call button full-width green pill with glow
- Ã¢Å“â€¦ Welcome state added (isActive + 0 leads); caught-up state "View all Ã¢â€ â€™" link
- Ã¢Å“â€¦ Emoji temperature (Ã°Å¸â€Â¥Ã¢Å¡Â¡Ã¢Ââ€žÃ¯Â¸Â) Ã¢â€ â€™ geometric dot system; emoji photo flags Ã¢â€ â€™ SVG heart/star
- Ã¢Å“â€¦ Unread badge: 8px red dot on Leads tab (mobile + desktop) when newLeadCount > 0
- Ã¢Å“â€¦ Context-aware quick actions: 1-col (photo only) when new lead showing
- Ã¢Å“â€¦ `?upload=1` param Ã¢â€ â€™ auto-opens file input on Photos page (from sidebar Add Photo button)
- Ã¢Å“â€¦ Contacts page complete rewrite Ã¢â‚¬â€ all 20+ px violations fixed, FAB 44px, SVG empty state
- Ã¢Å“â€¦ More page: Found plan green, billing section removed, email row added, upgrade features rewritten
- Ã¢Å“â€¦ Banner condition fixed for canceled accounts; favicon 404 fixed in middleware
- Ã¢Å“â€¦ All px sizes Ã¢â€ â€™ rem; iOS HIG Dynamic Type ramp enforced sitewide
- Ã¢Å“â€¦ TypeScript Ã¢Å“â€¦ build Ã¢Å“â€¦ Ã¢â‚¬â€ committed `09f502b`

## RECENTLY COMPLETED (June 19, 2026 Ã¢â‚¬â€ typography session)
- Ã¢Å“â€¦ Typography system rolled out to all remaining dashboard pages Ã¢â‚¬â€ `SiteEditor.tsx`, `more/page.tsx`, `photos/page.tsx`. Commits: `f87c359`
- Ã¢Å“â€¦ Desktop sidebar layout Ã¢â‚¬â€ responsive 220px sidebar on Ã¢â€°Â¥ 768px, mobile bottom nav unchanged. Commits: `94d7db4`

## RECENTLY COMPLETED (June 18, 2026 session)
- Ã¢Å“â€¦ Remove trial from upgrade checkout Ã¢â‚¬â€ confirmed no `trial_period_days` in `more/actions.ts`
- Ã¢Å“â€¦ In-dashboard activation banner (white bar, green button, inline overlay Ã¢â‚¬â€ no black screen)
- Ã¢Å“â€¦ Lead/Contact detail sheets with full edit capability (PATCH /api/leads, updateContact action)
- Ã¢Å“â€¦ Home screen redesign (single decisive status card)
- Ã¢Å“â€¦ Shared typography system (Leads, Contacts, Home, DashboardNav)
- Ã¢Å“â€¦ Identity-based avatar colors (Apple Contacts style)
- Ã¢Å“â€¦ Bulk-fixed 14 companies with stale `plan: "found_pro"` Ã¢â€ â€™ `plan: "found"`

---

## CURRENT SESSION HANDOFF (July 1, 2026 Ã¢â‚¬â€ Claude Code)

### Shipped
- Business name step: name input only, no URL shown while typing
- Web address shown calmly after name is entered and verified available
- Ã¢â‚¬Å“Change my Found web address Ã¢â€ â€™Ã¢â‚¬Â link (opens SlugSheet, now using plain-language Ã¢â‚¬Å“web addressÃ¢â‚¬Â)
- Progress bar: thin Signal Green bar in header during questions phase
- Bookings route Resend init moved inside POST handler (local build fix)
- Commit: `b3c5791`
- Drawer modal polish: gap fixed, Dynamic Island dark, keyboard awareness, double safe-area padding removed, progress bar removed
- Commit: `d73ac49`
- Typeform-style step animations: title wave 1 Ã¢â€ â€™ inputs wave 2 (90ms stagger), spring easing, 44px travel
- Contact step: email reveals progressively after 10-digit phone Ã¢â‚¬â€ keyboard/scroll problem gone
- Commit: pending

### Decisions
- Owners type the business name. Found generates the web address. They see it after, not during.
- `company.name` and `company.slug` are separate and always were. Now the UI reflects that.
- Always say Ã¢â‚¬Å“Found web addressÃ¢â‚¬Â Ã¢â‚¬â€ never Ã¢â‚¬Å“slug,Ã¢â‚¬Â never Ã¢â‚¬Å“URL,Ã¢â‚¬Â never Ã¢â‚¬Å“addressÃ¢â‚¬Â alone.

### Must Test Next
- Onboarding on mobile: type name Ã¢â€ â€™ see web address appear calmly below Ã¢â€ â€™ tap Ã¢â‚¬Å“Change my Found web addressÃ¢â‚¬Â Ã¢â€ â€™ SlugSheet language is correct Ã¢â€ â€™ slug conflict flow still works
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
- ~~Plan card savings display~~ - resolved July 15 via the Stripe-portal plan upgrade flow. See `DECISIONS.md`.
- Upsell banner Ã¢â‚¬â€ not built; planned as next after June 22
- Stripe custom payment form Ã¢â‚¬â€ Option B approved (in-app Stripe Elements), not built
- Menu add-on gating Ã¢â‚¬â€ `menu_display` add-on gates nothing; SiteEditor has no check; decision needed on what $10 unlocks
- Food CTA bug Ã¢â‚¬â€ "View Our Menu" still appears when `menu_display` add-on isn't active
- Stripe subscriber audit Ã¢â‚¬â€ verify no Pro/Business subscribers charged wrong price before activateActions.ts fix

### Dashboard
- Auto-reply message Ã¢â‚¬â€ owner writes it once during onboarding/settings, Found sends it to every new lead via Resend
- Manual lead follow-up sequence Ã¢â‚¬â€ one toggle: "Follow up automatically if I don't reply in 24 hours"
- Business card scanner Ã¢â‚¬â€ camera Ã¢â€ â€™ OCR Ã¢â€ â€™ pre-fill lead or contact form
- ~~Dashboard home/overview for desktop (sidebar nav, two-column leads/inbox)~~ Ã¢â‚¬â€ sidebar shipped June 19
- Real-time lead notifications (push notification when new lead arrives)
- Contacts tags Ã¢â‚¬â€ allow custom tags beyond the preset 5
- Photo Before & After social post creator

### Site
- Hero photo also syncs to `website_config.hero_image_url` for layouts that read it
- Photo social export Ã¢â‚¬â€ format with brand typography, save to camera roll
- Color/theme picker (Pro feature)
- Logo upload

### Platform
- Favicon 404 Ã¢â‚¬â€ all client sites throw a 404 for `/favicon.svg`. Noisy in logs, bad for SEO. Not urgent enough for NOW slot but still unresolved.
- Photo curation for 10 new industries at `/admin/photos`
- Remove debug `[Activate]` console logs
- `VERCEL_API_TOKEN` + `VERCEL_PROJECT_ID` for connect-domain feature
- Custom domain flow end-to-end test
- **Resend module-level init cleanup** Ã¢â‚¬â€ `app/actions/reply.ts`, `app/actions/leads.ts`, `app/onboarding/actions.ts` all init `new Resend(...)` at module level (same pattern that broke the bookings route). Low risk since these are server actions, not route handlers, but should be moved inside each function as a housekeeping pass.

### Unified Product/Service Catalog Ã¢â‚¬â€ Cross-System Data Sharing
**STATUS UPDATE July 20, 2026: shipped July 16-17, confirmed live and tested by Shawn.** Industry-aware catalog editor, variants/inventory controls, homepage catalog showcase, and cart-sheet checkout are built (commits 66877a8 through 27c48d6). Dedicated menu and products managers exist. **Not yet confirmed:** whether Estimates line items pull from this same catalog table, or whether that integration is still a separate future step. Verify before assuming full cross-system sharing is done.

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
- Team selects, Shawn approves via `/admin/photos` Ã¢â‚¬â€ same process as existing 22 industries
- Needed before these industries can show real stock photos to new owners

### Decisions needed
- Portal name Ã¢â‚¬â€ "Found Studio" proposed, needs Steve/team sign-off
- Inbox tab Ã¢â‚¬â€ currently redirects to Leads. Should it become a full conversation thread view?
- Social posting Ã¢â‚¬â€ direct API vs save to camera roll (locked: camera roll for launch)

### Schedule QA note - July 6, 2026
- Verify sticky Calendar / Bookings / Hours tabs on mobile Safari.
- Verify Calendar empty state says `No bookings this week`.
- Verify Bookings empty state says `No booking history yet`.
- Verify Hours shows a separated Weekly hours summary and `Save Changes` only when editing or unsaved changes exist.
