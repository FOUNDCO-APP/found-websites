# TASKS.md - Found Co. / found-websites
### Active work board. Current session truth lives in `SESSION_HANDOFF.md`.
*Last updated: July 9, 2026*
*Current handoff: read `SESSION_HANDOFF.md` first for changed / open / test status.*

---

## CURRENT PHASE

**Phase 4: Customer Dashboard - ACTIVE**
**Add-On System: SHIPPED**
**Online Ordering Add-On: SHIPPED (Codex)**

Online ordering flow live. Dashboard tab customization shipped. Next: test pass, then upsell banner + plan card savings.

---

## JULY 14 DASHBOARD INTEGRITY TEST

- [ ] Switch between tshirts, Tacos, Taco Shop, Construction, and Musician from one login.
- [ ] Confirm Home greeting, top-right company picker, More plan card, bottom tabs, and page titles always show the same selected company.
- [ ] Confirm Musician shows bookings/schedule language and no Orders tab.
- [ ] Confirm Construction still shows Estimates as the primary Business message.
- [ ] Confirm restaurants show Reservations/Orders based on available tools and do not fall back to generic Inquiries when using the Reservations tab.

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

1. **Close the launch payment gate** - `FOUND1` live activation promo is created and production price IDs are live; now create/verify the Stripe Connect webhook destination in live mode, then run activation payment, Accept & Pay, pay later, receipts, owner email, dashboard state, and public paid-state QA end to end.
2. **Run the first-customer launch journey** - brand-new onboarding through plan choice, activation, publication, owner login, and first lead on a real iPhone.
3. **Make the public promise truthful and indexable** - stop exposing test/unready companies in the sitemap, add Found's own public pages, and remove or complete any paid-plan claims that cannot be used today.

*Launch verdict and P1 work are recorded in `LAUNCH_READINESS_AUDIT_2026-07-09.md`. Open self-serve launch remains blocked; controlled pilot only.*

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

**Read this first if you're picking this up.** Shawn reviewed live screenshots of the Blue Luna Events test customer/profile on `my.foundco.app` and flagged 4 things. Blue Luna Events is the account/slug Shawn created for testing; do not treat the word "Events" alone as the issue. Team discussed (Steve/Jony/Craig/Angela), all 4 items are now shipped â€” see notes below on how each was actually resolved.

### 1. "Inquiries" vs "Leads" labeling on the Blue Luna Events test profile - needs correction
- `src/lib/dashboard/typography.ts` -> `defaultFormIntentFor()` maps industries to an intent, which drives the page title/vocab (Leads/Estimates/Inquiries/Bookings/Reservations/Orders/Appointments).
- The live Blue Luna Events test profile was showing "inquiry" language on the Leads page. Shawn clarified that Blue Luna Events is the customer/profile name and slug used for testing; the note should not imply he was asking about generic "events" wording in isolation.
- Current code maps these industries to `"inquiry"` by default: `real_estate, events, event_planning, balloon_decor, creative_services, photography, education, professional_services, childcare, nonprofit`.
- **Team take:** audit the actual intent model and labels so a business on the Leads tool does not feel like it is in the wrong product. Do not blanket-flip all 9 industries without review, but Blue Luna Events should be checked as a real account/profile case.
- **IMPLEMENTED July 6:** Quote-first businesses use `Estimate Requests` as intake and keep `Estimates` as a separate priced document workflow. Blue Luna Events / balloon decor now follows this model by industry/sub-industry, not by business name or slug.
- **Shawn clarification:** Estimates/quotes are not the same thing as leads, inquiries, or bookings. Estimates are their own information pathway and should remain a separate tool/tab when the business needs to price work. A business can need both: one intake path for leads/bookings/inquiries and a separate estimates/quotes path for priced work.
- **Product implication:** Do not use one single intent value to decide everything. We need at least two separate decisions: (1) what the incoming customer/intake tab is called (`Leads`, `Inquiries`, `Bookings`, `Reservations`, `Orders`, `Appointments`), and (2) whether the business also gets an `Estimates`/quotes workflow as a distinct tool.

### 2. Temperature (Hot/Warm/Cold) silently defaults to "Warm" â€” FIXED July 6
- `src/app/dashboard/(app)/leads/page.tsx`: `newTemp` now starts `null`, resets to `null` on cancel/save. Save is disabled until a temperature is picked (for temp-based intents), with a quiet "Pick one to save." hint under the pills.
- Pushed in `161716f`.

### 3. Add-lead form pushes the empty state down instead of covering it â€” FIXED July 6
- Converted the inline `{showAdd && (...)}` card into a real slide-up sheet (scrim + fixed bottom sheet), matching the `IntentPickerSheet` pattern already used elsewhere in this exact file (`#101411` background, same radius/z-index language). No longer shares document flow with the empty state below it.
- Pushed in `161716f`.

### 4. Schedule page needs a calendar â€” FIXED July 6 (Codex)
- Codex rebuilt Schedule as its own session: tab order flipped to Calendar â†’ Bookings â†’ Hours (was Hours-first). Calendar shows a 7-day week strip with booking indicators. Hours redesigned into a read-first weekly summary (Open/Closed + times) with an explicit Edit mode, instead of a dense settings form by default.
- Not yet confirmed live by Shawn â€” see "JULY 6 â€” STILL TO TEST" below.

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
## RECENTLY COMPLETED (July 3, 2026 â€” Claude Code session)
- âœ… Estimate builder step pills â€” were hardcoded fake (`index === 0`), now real `IntersectionObserver` scroll-spy + tap-to-jump
- âœ… Estimate builder card-stack removed â€” five sections now flow as one surface with hairline dividers, not five bordered boxes
- âœ… FOUND wordmark â€” was hardcoded Arial in 12 places, now one shared `src/components/FoundWordmark.tsx` component
- âœ… Sitewide font root cause â€” `globals.css` had dead `create-next-app` boilerplate (`body { font-family: Arial... }`, `--font-sans: var(--font-geist-sans)`) silently overriding the real Inter font loaded in `layout.tsx`. Removed both; `--font-sans` now points at `--font-inter`.
- â³ Not yet visually confirmed â€” see NOW #1
- â³ Gray status-bar band on estimate builder â€” suspected iOS Safari chrome, not app CSS. Needs Shawn to test via "Add to Home Screen" to confirm.

---

## RECENTLY COMPLETED (June 24, 2026 â€” Codex + Claude session)
- âœ… Online ordering system â€” inline add-to-cart on public menu, Stripe checkout, paid order handler
- âœ… Owner order email â€” itemized table, pickup time block, notes, customer contact
- âœ… Customer confirmation email â€” order summary + business branding
- âœ… `DashboardTabsManager.tsx` â€” owners reorder/choose bottom tabs from More tab
- âœ… `DashboardNav.tsx` â€” dynamic tabs per industry + active add-ons (Orders, Reserve auto-appear)
- âœ… Leads page `?view=orders` / `?view=reservations` filtering
- âœ… `dashboard/layout.tsx` â€” fetches activeAddonSlugs server-side, passes to DashboardNav
- âœ… CHANGELOG + TASKS updated

## RECENTLY COMPLETED (June 22-23, 2026 â€” add-on session)
- âœ… 7 add-ons all live in Stripe â€” `addon_subscriptions` table, `addon_stripe_prices` table
- âœ… Reservation system â€” `/[slug]/reserve` page + form + server action + emails
- âœ… More page rewrite â€” plan features, Lock In My Rate button, plans link
- âœ… Menu fallback â€” warm copy + Call Us button
- âœ… Admin email preview â€” reservation tabs conditional on industry
- âœ… Gallery vocab â€” `albumLabelFor` used everywhere
- âœ… `custom_domain` ungated (was accidentally Pro+ only)

## RECENTLY COMPLETED (June 19â€“20, 2026 â€” continuous session)
- âœ… SiteEditor: all accent colors unified to Signal Green; progress bar removed from More plan card; "contact" â†’ "lead" on Leads
- âœ… Migration-035 live â€” `photo_albums` table + `company_photos.album_id` column
- âœ… Photos page full rewrite â€” date grouping headers, albums/projects tab, album detail view, share sheet
- âœ… `/api/albums` route (GET/POST/DELETE with slug dedup)
- âœ… `/api/company-slug` returns `{ slug, industry }`
- âœ… Public album gallery page â€” `/[slug]/gallery/[album]/page.tsx`
- âœ… `albumLabelFor(industry)` â€” 18-industry vocab map in `typography.ts`
- âœ… `getCompany` â€” `industry_category` added to type + SELECT
- âœ… Camera pre-flight â€” pre-fetched albums, instant sheet, project picker with horizontal tile scroll
- âœ… Camera picker visual overhaul â€” 84px glowing hero circle, 72Ã—72 color album tiles, Apple spring easing
- âœ… "New" tab renamed "Unsorted"
- âœ… Gallery integration â€” `company_photos.for_website` now appears on public `/[slug]/gallery` (dashboard photos â†’ site, gap closed)
- âœ… Home redesign â€” 3 pure states (new lead hero / caught up momentum / welcome share), all stat chips + quick-action buttons removed
- âœ… Photo curation â€” all 10 new industries approved by Shawn at `/admin/photos` (June 20, 2026) â€” ALL 22 industries complete
- âœ… Plan gating â€” "Share with Client" locked to Pro; base plan sees UpgradeSheet with feature list + CTA to /more
- âœ… Pro album-organized gallery â€” `/[slug]/gallery` shows album cover grid for Pro users; base plan flat grid unchanged
- âœ… Lead auto-reply â€” confirmed live in `leads.ts`; no new work needed

---

## RECENTLY COMPLETED (June 19, 2026 â€” launch day session)
- âœ… Full team audit (Jony + Steve co-lead) â€” P0/P1/P2 items identified and all approved by Shawn
- âœ… Greeting â†’ `TYPE.largeTitle h1`; new lead Call button full-width green pill with glow
- âœ… Welcome state added (isActive + 0 leads); caught-up state "View all â†’" link
- âœ… Emoji temperature (ðŸ”¥âš¡â„ï¸) â†’ geometric dot system; emoji photo flags â†’ SVG heart/star
- âœ… Unread badge: 8px red dot on Leads tab (mobile + desktop) when newLeadCount > 0
- âœ… Context-aware quick actions: 1-col (photo only) when new lead showing
- âœ… `?upload=1` param â†’ auto-opens file input on Photos page (from sidebar Add Photo button)
- âœ… Contacts page complete rewrite â€” all 20+ px violations fixed, FAB 44px, SVG empty state
- âœ… More page: Found plan green, billing section removed, email row added, upgrade features rewritten
- âœ… Banner condition fixed for canceled accounts; favicon 404 fixed in middleware
- âœ… All px sizes â†’ rem; iOS HIG Dynamic Type ramp enforced sitewide
- âœ… TypeScript âœ… build âœ… â€” committed `09f502b`

## RECENTLY COMPLETED (June 19, 2026 â€” typography session)
- âœ… Typography system rolled out to all remaining dashboard pages â€” `SiteEditor.tsx`, `more/page.tsx`, `photos/page.tsx`. Commits: `f87c359`
- âœ… Desktop sidebar layout â€” responsive 220px sidebar on â‰¥ 768px, mobile bottom nav unchanged. Commits: `94d7db4`

## RECENTLY COMPLETED (June 18, 2026 session)
- âœ… Remove trial from upgrade checkout â€” confirmed no `trial_period_days` in `more/actions.ts`
- âœ… In-dashboard activation banner (white bar, green button, inline overlay â€” no black screen)
- âœ… Lead/Contact detail sheets with full edit capability (PATCH /api/leads, updateContact action)
- âœ… Home screen redesign (single decisive status card)
- âœ… Shared typography system (Leads, Contacts, Home, DashboardNav)
- âœ… Identity-based avatar colors (Apple Contacts style)
- âœ… Bulk-fixed 14 companies with stale `plan: "found_pro"` â†’ `plan: "found"`

---

## CURRENT SESSION HANDOFF (July 1, 2026 â€” Claude Code)

### Shipped
- Business name step: name input only, no URL shown while typing
- Web address shown calmly after name is entered and verified available
- â€œChange my Found web address â†’â€ link (opens SlugSheet, now using plain-language â€œweb addressâ€)
- Progress bar: thin Signal Green bar in header during questions phase
- Bookings route Resend init moved inside POST handler (local build fix)
- Commit: `b3c5791`
- Drawer modal polish: gap fixed, Dynamic Island dark, keyboard awareness, double safe-area padding removed, progress bar removed
- Commit: `d73ac49`
- Typeform-style step animations: title wave 1 â†’ inputs wave 2 (90ms stagger), spring easing, 44px travel
- Contact step: email reveals progressively after 10-digit phone â€” keyboard/scroll problem gone
- Commit: pending

### Decisions
- Owners type the business name. Found generates the web address. They see it after, not during.
- `company.name` and `company.slug` are separate and always were. Now the UI reflects that.
- Always say â€œFound web addressâ€ â€” never â€œslug,â€ never â€œURL,â€ never â€œaddressâ€ alone.

### Must Test Next
- Onboarding on mobile: type name â†’ see web address appear calmly below â†’ tap â€œChange my Found web addressâ€ â†’ SlugSheet language is correct â†’ slug conflict flow still works
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
- Plan card savings display â€” show intro-rate discount cleanly (no "Founding rate" label â€” Shawn rejected that)
- Upsell banner â€” not built; planned as next after June 22
- Stripe custom payment form â€” Option B approved (in-app Stripe Elements), not built
- Menu add-on gating â€” `menu_display` add-on gates nothing; SiteEditor has no check; decision needed on what $10 unlocks
- Food CTA bug â€” "View Our Menu" still appears when `menu_display` add-on isn't active
- Stripe subscriber audit â€” verify no Pro/Business subscribers charged wrong price before activateActions.ts fix

### Dashboard
- Auto-reply message â€” owner writes it once during onboarding/settings, Found sends it to every new lead via Resend
- Manual lead follow-up sequence â€” one toggle: "Follow up automatically if I don't reply in 24 hours"
- Business card scanner â€” camera â†’ OCR â†’ pre-fill lead or contact form
- ~~Dashboard home/overview for desktop (sidebar nav, two-column leads/inbox)~~ â€” sidebar shipped June 19
- Real-time lead notifications (push notification when new lead arrives)
- Contacts tags â€” allow custom tags beyond the preset 5
- Photo Before & After social post creator

### Site
- Hero photo also syncs to `website_config.hero_image_url` for layouts that read it
- Photo social export â€” format with brand typography, save to camera roll
- Color/theme picker (Pro feature)
- Logo upload

### Platform
- Favicon 404 â€” all client sites throw a 404 for `/favicon.svg`. Noisy in logs, bad for SEO. Not urgent enough for NOW slot but still unresolved.
- Photo curation for 10 new industries at `/admin/photos`
- Remove debug `[Activate]` console logs
- `VERCEL_API_TOKEN` + `VERCEL_PROJECT_ID` for connect-domain feature
- Custom domain flow end-to-end test
- **Resend module-level init cleanup** â€” `app/actions/reply.ts`, `app/actions/leads.ts`, `app/onboarding/actions.ts` all init `new Resend(...)` at module level (same pattern that broke the bookings route). Low risk since these are server actions, not route handlers, but should be moved inside each function as a housekeeping pass.

### Unified Product/Service Catalog â€” Cross-System Data Sharing
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
- Team selects, Shawn approves via `/admin/photos` â€” same process as existing 22 industries
- Needed before these industries can show real stock photos to new owners

### Decisions needed
- Portal name â€” "Found Studio" proposed, needs Steve/team sign-off
- Inbox tab â€” currently redirects to Leads. Should it become a full conversation thread view?
- Social posting â€” direct API vs save to camera roll (locked: camera roll for launch)

### Schedule QA note - July 6, 2026
- Verify sticky Calendar / Bookings / Hours tabs on mobile Safari.
- Verify Calendar empty state says `No bookings this week`.
- Verify Bookings empty state says `No booking history yet`.
- Verify Hours shows a separated Weekly hours summary and `Save Changes` only when editing or unsaved changes exist.
