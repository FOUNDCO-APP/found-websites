# CHANGELOG.md — Found Co. / found-websites
### Every AI must update this file at the end of every session.
### Read this at the START of every session to know exactly where things left off.

---

## Session: July 1, 2026 — Onboarding: Typeform Step Animations + Progressive Email Reveal
**AI:** Claude Code (Sonnet 4.6)
**Commit:** pending

### Completed
- **Typeform-style step transitions** — each step now animates in two waves: (1) question title slides up with `step-in` at 0ms, (2) input area slides up 90ms behind it. Uses spring easing `cubic-bezier(0.16,1,0.3,1)` with 44px travel. Feels like a real conversation advancing, not a form swapping.
- **New `@keyframes step-in`** added to `globals.css` — 44px translateY, spring easing, included in `prefers-reduced-motion` suppression block.
- **Contact step progressive email reveal** — email field only appears after phone reaches 10 valid digits. Slides in with its own `step-in` animation. Eliminates the keyboard/scroll problem on the contact step entirely.
- **`canAdvance("contact")` unchanged** — still requires 10-digit phone + valid email. The reveal threshold and the advance threshold are the same.

### Files changed
- `src/app/globals.css` — `@keyframes step-in`, reduced-motion update
- `src/app/onboarding/OnboardingFlow.tsx` — section animation removed, question div wave 1, inputs wrapper wave 2, contact email conditional reveal

### Must Test
- Go through onboarding: each step should feel like Typeform — title appears first, then the field slides in just behind
- Contact step: fill phone to 10 digits, confirm email slides in with animation
- Tap email field — confirm it's visible above keyboard, no scroll needed
- Fill email — Continue enables

---

## Session: July 1, 2026 — Drawer Polish: Gap, Status Bar, Keyboard, Progress Bar
**AI:** Claude Code (Sonnet 4.6)
**Commit:** `d73ac49`

### Completed
- **Drawer gap fixed** — removed the 30px intentional "peek" offset from `.found-drawer` top. Drawer now goes flush to the Dynamic Island (`env(safe-area-inset-top)`). Marketing page FOUND logo no longer peeks through behind the drawer's FOUND logo.
- **Status bar color fixed** — `theme-color` meta was being set to Signal Green (`#32D074`) when drawer opened, turning the Dynamic Island area green. Changed to `#080A09` (FOUND_BLACK) so the Dynamic Island area matches the dark drawer background.
- **Keyboard fix** — added `visualViewport` resize/scroll listener in `OnboardingDrawer.tsx`. When keyboard opens on iOS or Android, the drawer's `bottom` adjusts by the keyboard height — Continue button always visible above the keyboard.
- **Header padding fixed** — drawer header was adding `max(2rem, env(safe-area-inset-top))` as padding-top, but the drawer itself already accounts for the safe area at its `top` position. Was padding the safe area twice. Changed to flat `2rem` in drawer mode.
- **Progress bar removed** — the Signal Green bar at top competed visually with the Signal Green input underline. Steve/Jony/Phil direction: affirmations do the job of showing progress. Bar removed entirely.
- **Rounded corners stay** — `border-radius: 32px 32px 0 0` untouched. Sheet feel preserved.

### Must Test
- Open drawer from homepage on iPhone — confirm no gap at top showing marketing page behind it
- Confirm Dynamic Island area is dark (not green) when drawer is open
- Tap name input, keyboard opens — confirm Continue button is visible above keyboard
- Go through questions — confirm no progress bar anywhere

---

## Session: July 1, 2026 — Business Name / Web Address Separation + Progress Bar
**AI:** Claude Code (Sonnet 4.6)
**Commit:** `b3c5791`

### Completed
- **Business name step** — no longer shows the slug/URL while the owner is typing their business name. The name input is now just a name input. Clean and human.
- **Web address shown after** — once the name is entered and the availability check completes, a calm confirmation appears: "Your Found web address will be X.foundco.app until your real domain is connected."
- **"Change my Found web address →"** — small link below the confirmation. Opens the same `SlugSheet` as before for editing, but now framed as "web address" everywhere, never "slug" or "address."
- **Taken state reworded** — "That web address is already taken. These are available:" — plain language, no technical framing.
- **SlugSheet reworded** — title changed to "That web address is taken", body uses "web address" language throughout.
- **Progress bar** — thin 2px Signal Green bar added to the header during the questions phase. Grows from ~8% on first question to 100% on testimonials. Quiet and visual, no step counter text.
- **Bookings route build fix** — `src/app/api/bookings/create/route.ts` was initializing `new Resend(...)` at module level, which crashed local builds when `RESEND_API_KEY` isn't in `.env.local`. Moved inside the POST handler. No behavior change in production.

### Decisions Captured
- Business owners type their business name. Found generates the web address behind the scenes. Owners only see the web address after it's ready — as a result, not a field.
- `company.name` (display name) and `company.slug` (URL route) remain fully separate. Always were in the DB; now also separated in the UI.
- "Change my Found web address" is the only terminology. Never "slug," never "URL slug," never just "address."

### Must Test Next
- Go through onboarding on mobile: type a business name → confirm URL shows calmly below (not during typing) → tap "Change my Found web address →" → confirm SlugSheet opens with correct language → confirm slug conflict flow works end-to-end
- Verify progress bar appears and grows correctly through all question steps
- Found Business E2E test (carry from last session)

---

## Session: June 30, 2026 — More Page Feature-Led Flow
**AI:** Codex
**Worked on:** More page order and upgrade psychology

### Completed
- Reordered the More page so business tools/features appear directly under My Dock.
- My Plan now comes after Add Features / Included Business Tools, so the page leads with useful actions before billing context.
- Existing activation, add-on, included Business tools, plan, and recommendation behavior stayed intact.

### Decision Captured
- Owners think in tools first, plans second. The More page should feel like business management before it feels like billing.

---
## Session: June 30, 2026 — Business Tools Entitlements + Display Name Prompt
**AI:** Codex
**Worked on:** Found Business dashboard tools, display-name prompt persistence, Business public tool access

### Completed
- Business display-name prompt now persists dismissal in `localStorage` so refreshing does not keep reopening it on the same browser.
- Added shared Business entitlement logic: Found Business includes online ordering, shopping cart, quote/deposit payments, booking calendar, and email marketing without fake paid add-on rows.
- Dashboard nav and More page now receive effective included tools for Found Business.
- More page hides paid add-on upsells for Business and shows **Included Business Tools** instead.
- Public `/order`, `/shop`, `/menu`, and `/reserve` access now respects Found Business entitlements.
- Online ordering and shopping cart checkout APIs now allow Found Business via plan entitlement, not only add-on subscription rows.
- Dashboard home now shows a Business tools nudge with an industry-aware recommended tool.
- Retail/order dashboard routing now opens the orders view instead of the generic leads view.

### Decisions Captured
- Do not create fake Stripe add-on purchases for Found Business. Entitlement should come from the plan.
- Business owners should see all included tools for free, while Found can still recommend the most relevant tool by industry.
- Payment setup copy should remain industry-aware and should not switch to product-payment wording just because Business includes shopping cart.

---
## Session: June 29, 2026 — Onboarding Plan Flow, Intro Pricing, Activation, Social Posts
**AI:** Codex
**Worked on:** public onboarding plan selection, More plan pricing, display-name prompt, activation flow, brand contrast, social post assistant, testing plan

### Completed And Pushed
- Onboarding plan picker redesigned as plan cards, with Pro positioned as the recommended default.
- Sticky/floating selected-plan CTA added, then simplified to a clean green pill with no glow/glass wrapper.
- Found Business included-tools list flattened so it is not a card inside a card.
- Runtime pricing language changed to **intro rate**. Do not use "founding member" in product/customer language.
- More page inactive pricing fixed: Starter $29, Pro $39, Business $69 intro prices.
- Activation setup uses intro Stripe price IDs for inactive companies.
- Stripe setup metadata now uses `intro_rate`, not `founding_price`.
- Dashboard display-name prompt added/refined for slug-like company names.
- Prompt copy is now: "How would you like your business name to appear to your clients?"
- Prompt save dismisses before reload so it should not immediately reopen.
- End of onboarding now opens the activation/payment overlay for the selected plan.
- Activate banner remains as recovery if the owner closes/skips payment.
- Public wordmark color now has a contrast guard on dark/light headers.
- Social post assistant shipped in Photos → Social; migration 043 is required for saved drafts.

### Decisions Captured
- Use **intro rate** / **promo**, not "founding member." Legacy DB/env names remain only until a controlled migration.
- Brand readability overrides selected brand color on dark headers.
- Payment/card step belongs immediately after onboarding reveal; Activate is recovery only.
- Display-name prompt asks how the business name appears to clients.

### Carry Forward
- Run a controlled migration later to replace legacy `is_founding_member` naming if desired. Do not rename the live Supabase column casually.
- Run Supabase migration `scripts/migration-043-social-post-drafts.sql` if not already applied.
- Found Business E2E test is next.

### Found Business Test Plan
1. Start from public Get My Site.
2. Select Found Business.
3. Complete onboarding with dark navbar and muted/gray brand color.
4. Confirm generated site header wordmark is readable on black.
5. Confirm display-name prompt copy is correct if name looks like slug.
6. Save display name and confirm modal closes and does not return.
7. Confirm activation/payment opens automatically after reveal screen.
8. Confirm activation uses Business intro rate: $69/mo, regular $99/mo context.
9. If payment is closed, confirm dashboard Activate banner remains as recovery nudge.
10. Confirm welcome email arrives and dashboard link opens correct company.
11. Confirm dashboard plan card says Found Business and $69/mo intro price before activation.
12. Confirm Business tools/pages are visible as expected: online ordering, booking calendar, estimates/deposits, email marketing.

### Recent Commits
- `bc3f3bc` Fix onboarding activation flow and brand contrast
- `8e618e3` Rename pricing logic to intro rate
- `73bc86c` Fix intro pricing and display name prompt
- `522fb7f` Simplify onboarding floating CTA
- `9043e08` Refine onboarding CTA glass styling
- `0eca834` Keep onboarding plan CTA visible
- `7a7fa96` Flatten Business tools list
- `2fce55d` Refine onboarding plan bullets
- `97c3d1d` Add social post assistant

---

## Session: June 24, 2026 — Online Ordering + Dashboard Tab Customization
**AI:** Codex (prior) + Claude Code Sonnet 4.6 (this session)
**Worked on:** Online ordering add-on (Codex), dashboard tab customization (Codex + Claude), commit + push, session docs

### ✅ Completed This Session

**Online Ordering System (Codex — 10 commits pushed):**
- Public `/[slug]/menu` page: inline ordering controls — customers add items, pick a pickup time, and pay via Stripe
- Full Stripe payment flow: Found-branded checkout, payment captured server-side
- `/api/online-order/complete/route.ts` — webhook/completion handler: marks lead paid, sends owner + customer emails
- Owner email: itemized order table, pickup time block (bold bordered), notes block, customer contact
- Customer email: order confirmation with item list and business branding
- Email refinement (Claude — local change): pickup time now in subject line, cleaner HTML layout

**Dashboard Tab Customization (Codex + Claude — local, pushed this session):**
- `DashboardTabsManager.tsx` — NEW component in More tab: owners choose which tabs appear at the bottom and reorder them (up to 5 slots, Home + More always locked)
- `DashboardNav.tsx` — fully rewired from static `TABS` array to dynamic tabs driven by industry + active add-ons:
  - Food industry: **Orders** tab appears when `online_ordering` add-on is active; **Reserve** tab appears when `reservation_calendar` is active
  - Tab preferences persisted in `localStorage` per company name — survive page reloads
  - `found:dashboard-tabs-updated` custom event syncs nav instantly when More tab saves changes
  - Two new tab icons: receipt/list icon (Orders), calendar icon (Reserve)
  - `isActive()` logic updated for `?view=orders` / `?view=reservations` query params
- `leads/page.tsx` — `?view=orders` shows only online_order leads; `?view=reservations` shows only reservation leads; regular view hides both; temperature filters hidden for order/reservation views
- `dashboard/layout.tsx` — fetches `activeAddonSlugs` from `addon_subscriptions` table server-side, passes to DashboardNav
- `more/page.tsx` — DashboardTabsManager rendered in More tab with industry + activeAddons

### ⏳ Still Pending / Carry Forward

- **Test pass needed** — verify online ordering E2E on food company, tab customization in More, Orders tab routing on dashboard
- **Plan card savings display** — UNRESOLVED from June 22 (no "Founding rate" label — just show discount cleanly)
- **Menu add-on gating** — `SiteEditor.tsx` has zero check for `menu_display`; food companies get menu editor free (pending decision on what $10 unlocks)
- **Stripe custom payment form** — Option B approved (in-app Stripe Elements), not yet built
- **Food CTA picker bug** — "View Our Menu" CTA shows even when `menu_display` add-on isn't active
- **Upsell banner** — not built
- **Stripe subscriber audit** — check if any Pro/Business subscribers were charged wrong price before activateActions.ts fix
- **Contact database UI** — plan-gated at Pro+ but owner-facing UI doesn't exist
- **DNS automation** — `VERCEL_API_TOKEN` + `VERCEL_PROJECT_ID` in .env.local only, not in Vercel env

### 🔜 What's Next (In Priority Order)

1. **Test online ordering + tab customization** — open a food company in dev, verify Orders tab, ordering flow, emails
2. **Fix anything found during testing** — bugs, copy, UX issues
3. **Plan card savings display** — clean mockup options for Shawn to approve
4. **Upsell banner** — next after savings display resolved

---


## Session: June 22-23, 2026 — Add-On System, Reservation System, More Page, Menu Fallback
**AI:** Claude Code (Sonnet 4.6)
**Worked on:** Add-on system live in Stripe, reservation system, More page rewrite, menu fallback copy, gallery vocab, admin email reservation tabs

### ✅ Completed This Session

**Add-On System (7 add-ons — all live in Stripe):**
- `more/page.tsx` — "Add Features" section + "Active Add-ons" section
- `more/actions.ts` — `startAddonCheckout`: looks up price from `addon_stripe_prices` table, adds subscription item, writes `addon_subscriptions` row
- Migration-036 ✅ — `addon_subscriptions` table + `stripe_connect_account_id` on companies
- `addon_stripe_prices` table ✅ — 7 rows with live Stripe price IDs
- `featureAccess.ts` — add-on label renames: "Online Menu" → "Menu Page", "Online Ordering" → "Order Online"
- `custom_domain` ungated (was accidentally Pro+ only — now always-on)

**Reservation System:**
- `/[slug]/reserve/page.tsx` — server component: hero + sidebar + form
- `/[slug]/reserve/ReservationForm.tsx` — fields: name*, phone*, email (optional), date*, time*, party_size, notes
- `src/app/actions/leads.ts` — `submitReservation`: inserts lead type "reservation_request", sends owner + customer auto-reply
- "Reserve a Table" CTA intent wired

**More Page Rewrite:**
- `PLAN_FEATURES` constant — Apple-style bullets for all 3 plans
- "Lock In My Rate — $X/mo" green full-width button when not active
- "See what's included in every plan →" always visible → `https://foundco.app/plans`
- Plan card savings display attempted and reverted (run-on sentence, broke mobile layout)

**Menu Page Fallback:**
- Warm copy + Call Us button (with company primary color) when no menu is set up

**Admin Email Preview:**
- Reservation tabs now conditional — only show for food industries or `primary_intent === "reservations"`

**Gallery + Vocab:**
- Gallery pages use `albumLabelFor` from typography — no more hardcoded "projects"

### ⏳ Still Pending
(See June 24 session above)

---


## Session: June 20, 2026 — Pro Album Gallery (new session)
**AI:** Claude Code (Sonnet 4.6)
**Worked on:** Pro album-organized public gallery, lead auto-reply audit

### ✅ Completed This Session

**Pro album-organized website gallery:**
- `/[slug]/gallery/page.tsx` now branches on `isPro` (plan + status check — no extra fetch, already on Company type)
- Pro path: 4 parallel queries — albums, all album photos, unsorted hearted photos, legacy media
- Album cover grid: 280px-wide cards with cover photo, gradient overlay, album name + photo count, links to `/[slug]/gallery/[album]`
- Unsorted hearted photos (album_id=null, for_website=true) + legacy media shown as flat "More Photos" section below albums
- Base plan: unchanged flat grid (existing behavior preserved)
- TypeScript clean ✅

**Lead auto-reply audit:**
- Confirmed `src/app/actions/leads.ts` already sends a branded auto-reply to the customer when email is provided
- No new work needed — this feature was already live

### ⏳ Still Pending / Carry Forward

- **Marketing site** — foundco.app + per-plan pages (`/plans/found`, `/plans/found-pro`, `/plans/found-business`), autonomous sales engine
- **More plan gating** — custom domain, lead sequence, contact DB all need upgrade prompts wired

---

## Session: June 20, 2026 — Plan Gating, Photo Curation Complete, Session Wrap
**AI:** Claude Code (Sonnet 4.6)
**Worked on:** Plan gating for "Share with Client", confirmed photo curation complete, session memory + docs wrapped

### ✅ Completed This Session

**Photo curation — COMPLETE:**
- Shawn confirmed all 10 new industries approved at `/admin/photos` (June 20, 2026)
- All 22 industries now have curated Pexels pools live ✅

**Plan gating — "Share with Client" — commit `dd45143`:**
- `/api/company-slug` now returns `isPro` (`found_pro` or `found_business` + `active`/`trialing`)
- Photos page reads `isPro` on mount via existing fetch — zero extra requests
- Share button in album header: lock icon + muted when base plan; Signal Green share icon when Pro
- Share with Client on album cards: same gate — lock icon + muted when base
- `UpgradeSheet` bottom sheet: lock icon, 3 feature bullets, "Upgrade to Pro →" → `/more`, "Maybe later" dismiss

### ⏳ Still Pending / Carry Forward

- **Pro album-organized website gallery** — website gallery shows albums as cover-grid sections for Pro users
- **Lead auto-reply** — base plan feature gap; auto-send branded reply to every new lead via Resend
- **More plan gating** — custom domain, lead sequence, contact DB all need upgrade prompts wired
- **Marketing site** — foundco.app + per-plan pages, autonomous sales engine
- **`VERCEL_API_TOKEN` + `VERCEL_PROJECT_ID`** — connect-domain feature still hidden

---

## Session: June 19–20, 2026 — Photo System, Albums, Home Redesign, Camera Picker
**AI:** Claude Code (Sonnet 4.6) — continuous session (PowerShell never closed)
**Worked on:** Full photo organization system (albums/projects), context-aware camera pre-flight, industry vocab, gallery integration, Home page state-aware redesign, camera picker visual overhaul

### ✅ Completed This Session

**SiteEditor color unification — commit `2412739`:**
- All non-green accent colors (purple About, orange Services/Gallery, blue Hook AI bar) → Signal GREEN
- Empty state 📸 emoji → SVG camera icon
- Leads subtitle "contact/contacts" → "lead/leads"
- More page: progress bar removed from plan card

**Photo system — albums/projects — commit `eacb118`:**
- `photo_albums` table + `company_photos.album_id` column — migration-035 run live via Supabase Management API ✅
- `photos/page.tsx` full rewrite: date grouping headers (This week / Last week / Month Year), albums/projects tab, album detail view, share-with-client sheet, upload via camera FAB
- `/api/albums` route — GET/POST/DELETE with unique slug generation
- `/api/company-slug` — micro-endpoint returning `{ slug, industry }` for client-side use
- `/api/photos` PATCH — `album_id` support added
- `src/app/[slug]/gallery/[album]/page.tsx` — new public client gallery page (white, branded, photo grid, "Shared via FOUND" footer)
- Home page: stats row (this week/total/photos chips) + recent leads strip added — parallel fetch for photoCount + recentLeads

**Industry vocab + camera pre-flight + gallery integration — commit `8e3de81`:**
- `albumLabelFor(industry)` in `typography.ts` — 18-industry mapping (Contractors→Projects, Restaurant→Events, Salon/Beauty→Looks, Spa→Treatments, Retail/Crafts→Collections, Music→Shows, Childcare→Memories, etc.)
- `getCompany.ts` + SELECT — `industry_category` added to `CompanyRow` type
- `DashboardNav.tsx` — camera FAB tapped off /photos → bottom sheet with pre-fetched album list + "No project — sort later"; tapped on /photos → direct upload
- `photos/page.tsx` — `?upload=1&album=ID` param handled via `pendingAlbumIdRef`; in-album camera auto-assigns; "New" tab renamed "Unsorted"; all labels use `albumLabelFor`
- `gallery/page.tsx` — now fetches BOTH `media` (legacy) AND `company_photos` (dashboard, `for_website=true`) via admin client; dashboard-hearted photos appear first on public gallery; gap closed ✅

**Home page redesign — commit `d497856`:**
- Removed: stat chip row (this week/total/photos), Add Photo button, Add Lead shortcut, Share Your Site strip, `photoCount` query
- Three pure states:
  - State 1 (new lead): hero card — name, message, Call (green full-width) + Text (green outline) + email ghost link; "+ N more →" if multiple
  - State 2 (caught up): 5rem/300 total leads number + recent leads in a single rounded container with hairline separators
  - State 3 (welcome/no leads): one card, one "Share My Site →" button, nothing else

**Camera picker visual overhaul — commits `de855b7`, `b921d34`:**
- Albums pre-fetched on mount → zero delay when camera tapped
- Sheet opens at 0.22s with Apple spring easing `cubic-bezier(0.32, 0.72, 0, 1)`
- 84px glowing camera circle as hero (shoot now, no album)
- Horizontal scroll strip of 72×72 album tiles with `avatarColorFor` colors
- Dashed "New" tile at end of strip → expands to inline name input with "Create & Shoot" CTA

### ⏳ Still Pending / Carry Forward

- **Pro album-organized gallery** — website gallery shows albums as sections with covers for Pro users ("Kitchen Remodel — 14 photos")
- **Plan gating for "Share with Client"** — base plan should show upgrade prompt instead of share link
- **Photo curation** — 10 new industries have empty pools at `/admin/photos`
- **Desktop E2E test** — verify sidebar, activation banner, Home 3-state redesign at 1280px+
- **`VERCEL_API_TOKEN` + `VERCEL_PROJECT_ID`** — connect-domain feature still hidden

---

## Session: June 19, 2026 — Jony's Touch: Full Dashboard Design Pass (Launch Day)
**AI:** Claude Code (Sonnet 4.6) — desktop session
**Worked on:** Full design audit + implementation of all Jony Ive / Steve Jobs team recommendations across every dashboard screen. Typography system completed on all pages. Contacts page fully rewritten. Build clean, committed, launch-ready.

### ✅ Completed This Session

**Full team audit (TEXT ONLY) — Steve Jobs + Jony Ive co-led:**
- Identified P0, P1, P2 issues across all 8 dashboard files
- User approved all items: "I like it all. We're gonna fix all of them today because we're gonna launch this this evening."

**P0/P1/P2 fixes — commit `d0c5324`:**
- Greeting elevated to `TYPE.largeTitle h1` (was subhead at 55% opacity)
- New lead Call button: full-width green pill, `padding: 18px 0`, glow shadow, `fontWeight: 900`
- Email reply demoted to text link `"or reply by email →"` at 38% opacity
- Welcome state added (isActive + 0 leads): green gradient card, "Share your site." at 1.875rem/300
- Caught-up state: "View all →" link when totalCount > 0
- Quick actions: context-aware grid — 1-col (photo only) when new lead showing, 2-col otherwise
- Stat strip and site URL footer both removed from Home
- Unread badge: 8px `#FF3B30` dot on Leads tab icon (mobile + desktop) when `newLeadCount > 0 && !active`
- Lead count query in `layout.tsx` (7-day window, COUNT only, server-side, passed as prop)
- Emoji temperature (🔥⚡❄️) → geometric dot system (6px colored dot + TYPE.caption label)
- SVG heart + star replace emoji flags (❤️⭐) in photo action overlay
- Camera FAB label "Camera" removed (icon only)
- Inactive sidebar nav items: fontWeight 400 → 500
- Company name in sidebar: 10px uppercase → `TYPE.caption` fontWeight 600
- "Add Photo" sidebar button now routes to `/photos?upload=1`
- Photos page: `useSearchParams` → auto-click file input on `?upload=1`, then `router.replace("/photos")`
- More page: Found plan color `#6B7280` → `GREEN`; Billing section removed; email row added to Account; upgrade feature list rewritten
- Banner condition: `!company.subscription_status` → `!== "active" && !== "trialing"` (fixes canceled accounts)
- SignOutButton: `fontSize: 14` → `0.9375rem`; icon opacity wrapper removed
- Middleware: `favicon.svg|icons|images|dashboard-manifest` added to matcher negative lookahead (fixes favicon 404 on client sites)
- Activation guard already correct (only blocks `=== "active"`); removed verbose debug console.log

**Jony's touch — full design pass — commit `09f502b`:**
- Contacts: complete rewrite from scratch — all 20+ typography violations fixed; FAB 36→44px; TYPE.caption labels, TYPE.body inputs, SVG empty state icon; detail sheet action buttons with proper gap/padding
- All remaining px sizes → rem throughout every file
- iOS HIG Dynamic Type ramp enforced sitewide: `TYPE.largeTitle` / `title` / `headline` / `body` / `subhead` / `footnote` / `caption` — no raw px values remain
- TypeScript check: ✅ clean (no output)
- Production build: ✅ clean (39 routes, no errors)

### ⏳ Still Pending / Carry Forward

- **Desktop E2E test** — verify sidebar, activation banner, Home redesign, all 5 tabs at 1280px+
- **Photo curation** for 10 new industries at `/admin/photos` (team curation session required)
- **`VERCEL_API_TOKEN` + `VERCEL_PROJECT_ID`** — connect-domain feature, currently hidden

---

## Session: June 19, 2026 — Typography Rollout Complete + Desktop Sidebar Layout
**AI:** Claude Code (Sonnet 4.6) — desktop session
**Worked on:** Applied shared typography system to the 3 remaining dashboard pages; built responsive desktop sidebar layout

### ✅ Completed This Session

**Typography system — fully rolled out across all dashboard pages:**
- `more/page.tsx` — full rewrite: section headers 10px→`TYPE.caption` (13px), h1 22px→`TYPE.largeTitle` (34px), all row text uses `TYPE.subhead`/`TYPE.footnote`, opacities standardized to `TEXT_OPACITY` tiers, chevrons use `ICON.action` (18px), duplicate "Account" section label corrected to "Billing", `const SIGNAL_GREEN` replaced with import from typography
- `photos/page.tsx` — h1 weight 200→300 (matches `TYPE.largeTitle`), subtitle opacity 0.25→`TEXT_OPACITY.tertiary` (0.55), empty state body opacity 0.3→0.55, empty state title weight 200→300
- `SiteEditor.tsx` — all 8 caption labels 11px→`TYPE.caption` (13px), `TapToEdit` label 10px→13px, `PageTab` h2 26px→`TYPE.title` (24px), `const GREEN`/`const BLACK` replaced with imports from typography
- Typography system now applied to every dashboard page ✅ (Leads, Contacts, Home, DashboardNav, More, Photos, SiteEditor)
- Commits: `f87c359`

**Desktop sidebar layout — responsive nav:**
- Mobile (< 768px): existing bottom tab bar + camera FAB — completely unchanged
- Desktop (≥ 768px): fixed 220px left sidebar replaces bottom nav
  - FOUND wordmark at top of sidebar (weight 300, same as marketing)
  - Signal Green accent line below wordmark
  - All 5 nav items (Home / Leads / Photos / Contacts / More) as vertical rows: icon + label, active state = green left border + `${GREEN}12` fill + green text
  - "Add Photo" button at sidebar bottom — same route as mobile camera FAB (`/photos`)
  - Header FOUND wordmark hidden on desktop (sidebar has it)
  - Content wrapper shifts right via `margin-left: 220px` CSS class
  - Content max-width expanded 680px → 760px on desktop
  - Bottom padding drops 120px → 48px when no bottom bar
- Files: `src/components/dashboard/DashboardNav.tsx`, `src/app/dashboard/(app)/layout.tsx`
- Commits: `94d7db4`

### ⏳ Still Pending / Carry Forward

- **Desktop E2E test** — activation banner, Home redesign, lead/contact detail sheets, typography, and sidebar all need a desktop browser pass to verify visuals and layout at 1280px+ width
- **Rebrand/naming** — "FoundBizz"/"FoundBuzz" both tabled. No decision. Only weigh in on brand-fit when Shawn brings it back up. Do not push.
- **Favicon 404** — all client sites throw 404 for `/favicon.svg`. Noisy in Vercel logs. Low priority.
- **Remove `[Activate]` debug logs** from `activateActions.ts`
- **Photo curation for 10 new industries** — `/admin/photos` session needed
- **`VERCEL_API_TOKEN` + `VERCEL_PROJECT_ID` in Vercel dashboard** — needed for `/connect-domain` auto-registration in prod

### 🔜 Next Session Priority

1. Desktop E2E test — open `my.foundco.app` on desktop, verify sidebar, all tabs, activation banner, Home screen, lead/contact sheets
2. Favicon 404 fix (quick)
3. Remove debug logs from `activateActions.ts` (quick)
4. Photo curation session at `/admin/photos`

---

## Session: June 18, 2026 — Activation Banner, Dashboard Home Redesign, Lead/Contact Detail Sheets, Dynamic-Type Typography System
**AI:** Claude (Sonnet 4.6) — claude.ai mobile chat interface
**Worked on:** In-dashboard activation reminder, full Home screen redesign (two iterations), Apple-Contacts-style detail sheets for Leads and Contacts with edit capability, a shared rem-based typography system applied across the dashboard, and identity-based avatar colors.

### ✅ Completed This Session

**1. In-dashboard activation banner**
- New component `src/components/dashboard/ActivationBanner.tsx`, rendered in dashboard layout when `!company.subscription_status`
- Final state: white bar background, green "Activate →" button (high contrast — earlier green-on-green and white-on-white passes were rejected by Shawn for poor contrast), dismissable X
- Critically: button opens `ActivateOverlay` (the same component used on the public client-site banner) directly inline via local state — NOT a navigation to `/activate?slug=`. The navigation approach caused a black-screen flash; the overlay approach matches the existing working flow exactly with zero navigation.
- `activateActions.ts` `createActivationSetup()` guard bug fixed: was blocking re-activation if `stripe_customer_id` existed at all (even for unpaid accounts) — now only blocks if `subscription_status === "active"`. Reuses existing Stripe customer ID if present instead of erroring.

**2. Stale plan data bulk-fixed**
- Discovered `molcas` test company had `plan: "found_pro"` in DB (stale data from before an earlier-session fix to the onboarding default), causing the activate overlay to show Pro pricing instead of Found pricing
- Searched for all companies with `plan = "found_pro"` — found 14, including `sayit` (a real customer, paying the correct $29 Found Founding price in Stripe despite the DB label saying Pro) and `molcas-mexican` (Shawn's actual current test company — distinct from `molcas`, different company ID)
- Bulk-corrected all 14 to `plan: "found"` via single PATCH
- **Process note:** Claude initially over-scoped by checking and fixing companies beyond the one in question without asking first — flagged by Shawn as scope creep. Going forward: fix only what's explicitly in scope unless given permission to expand.

**3. Home screen — full redesign, two passes**
- First pass: added ambient time-of-day gradient lighting (warm/neutral/cool depending on morning/afternoon/evening), a breathing-pulse animation on the lead-count number, staggered fade-up + blur-to-sharp reveal animations, subtle noise texture overlay
- Shawn's feedback on first pass: still looked generic/template-like, text too faint to read at a glance, wasted vertical space (giant ghost "0" numeral), busy job-site users need instant readability not slow ambient mood
- **Second pass (current/final structure):** collapsed the stacked-zones layout into ONE decisive status card. New-lead state = full glowing green card at the top of the screen (lead name 30px/800 weight, message preview, Call/Reply buttons inline, no scrolling needed to act). Caught-up state = single calm high-contrast card. Quick actions (Add Lead / Add Photo / Share Site) sit immediately below with no dead air between sections. Ambient time-of-day gradient kept from pass one. Body text contrast raised significantly (old: 0.25–0.45 opacity faint gray; new: uses shared TEXT_OPACITY scale, minimum 0.55).
- File: `src/components/dashboard/HomeClient.tsx`

**4. Lead & Contact detail sheets (Apple Contacts style) — net-new feature**
- **Root cause investigation:** Shawn reported notes entered when adding a lead were invisible. Found: `leads` table has NO `notes` column. Notes were actually being saved correctly into the existing `message` field the whole time — the bug was purely UI: the leads list only ever showed a one-line truncated preview with zero way to view the rest. Data was never lost.
- Built full detail-sheet solution for both Leads and Contacts:
  - Every row now has a chevron and `onClick` → opens a bottom sheet (iOS pattern): avatar, name, temperature badge (leads) or tags (contacts), Call/Text/Email action buttons, full field list, notes/message shown in full (not truncated), and an Edit mode
  - Added `PATCH` handler to `src/app/dashboard/api/leads/route.ts` (previously only GET/POST existed — there was no way to edit an existing lead at all)
  - Added `updateContact()` server action to `src/app/dashboard/(app)/contacts/actions.ts` (same gap — no edit capability existed)
  - Files: `src/app/dashboard/(app)/leads/page.tsx` (LeadDetailSheet component), `src/app/dashboard/(app)/contacts/page.tsx` (ContactDetailSheet component)

**5. Shared Dynamic-Type-style typography system — net-new, applied dashboard-wide**
- Shawn compared the dashboard against native iOS screenshots (Settings, Messages, Calls, Contacts, Clock app) and correctly identified that Found's text sizes, chevron sizes, and contrast were dramatically smaller/fainter than Apple's system UI (e.g. iOS section headers render 34-40pt bold vs. Found's 10-14px labels; iOS list chevrons ~17-20pt vs. Found's 14px)
- Key methodological question Shawn raised before any changes: does this need to respect OS/browser accessibility text-size settings (Dynamic Type) across iOS/Android/desktop/mobile-web, not just look bigger on one screenshot? Answer: yes — solved by using `rem` instead of raw `px`. `rem` is relative to root font-size and respects browser zoom + OS-level accessibility text scaling; `px` never adapts. Confirmed no `html { font-size }` override exists anywhere in the codebase, so `rem` correctly resolves to the browser default (16px) and will scale with accessibility settings exactly like iOS Dynamic Type does.
- **New file: `src/lib/dashboard/typography.ts`** — exports:
  - `TYPE` object: `largeTitle` (2.125rem/34px, weight 300 — Found's signature light page-header style, NOT bolded), `title` (1.5rem/24px, weight 700), `headline` (1.0625rem/17px, weight 700 — iOS list-row standard), `body` (1.0625rem/17px, weight 400), `subhead` (0.9375rem/15px, weight 500), `footnote` (0.8125rem/13px, weight 700 — true floor), `caption` (0.8125rem/13px, weight 800, uppercase, tracked — Found's existing eyebrow/label style, same floor as footnote)
  - `TEXT_OPACITY`: `primary: 1` (true white), `secondary: 0.78`, `tertiary: 0.55`, `disabled: 0.3` — calibrated to match iOS system dark-mode label brightness tiers after Shawn compared directly against iOS screenshots; nothing meant to be read should ever go below `tertiary`
  - `ICON`: `chevron: 20` (was hardcoded 14px everywhere — too small vs iOS ~17-20pt), `action: 18`, `large: 24`
  - `avatarColorFor(name)`: Apple Contacts/Messages-style deterministic identity color — hashes the name to pick one of 8 muted/desaturated palette colors, so the same person always renders the same avatar color everywhere. Replaces the old system where avatar color was tied to lead temperature (hot/warm/cold), which made nearly every avatar the same orange since most leads default to "warm" — Shawn flagged this as the visual inconsistency to fix. Temperature retains its own separate colored badge/pill, unchanged.
- **Important correction mid-session:** first draft of `typography.ts` made `largeTitle` bold (700). Shawn stopped this immediately — Found's existing brand voice (light-300 large headlines + heavy-800/900 uppercase tracked-out labels) is a deliberate, already-approved design signature, not something to "fix." Rebuilt with `largeTitle` correctly at weight 300. **Rule going forward: typography/contrast fixes must preserve Found's existing visual voice, not flatten it toward generic system-UI conventions.**
- Applied to: `src/app/dashboard/(app)/leads/page.tsx`, `src/app/dashboard/(app)/contacts/page.tsx`, `src/components/dashboard/HomeClient.tsx`, `src/components/dashboard/DashboardNav.tsx` (the bottom tab bar was the worst offender in the whole app — labels were 8px at 0.25 opacity, smaller/fainter than anything that had been fixed on any page; raised to 10px/0.5 opacity)
- **NOT yet applied:** Site editor (`SiteEditor.tsx`) and the More tab still have all original hardcoded pixel values from earlier build rounds. This is the next typography task.

**6. Product decision — lead lifecycle (no code change)**
- Shawn asked whether the system has any way to know a lead became a customer. Discussed at length: Found currently has no invoicing/payments/job-tracking, so there is no real signal that could ever automatically detect "this lead is now a paying customer" — it would always require manual input from the owner.
- **Decision: leads never convert to a separate entity/table.** A lead stays a lead permanently (it just records how someone found you); temperature (hot/warm/cold — already editable per-lead via the new detail sheet) is the mechanism for tracking where things stand, including closed/won relationships. No conversion-to-contact feature, no new `status` field, no `customers` table. Locked unless reopened.

### ⏳ Still Pending
| Item | Status | Notes |
|---|---|---|
| Apply typography system to Site editor | Not started | `SiteEditor.tsx` still has all original hardcoded px values |
| Apply typography system to More tab | Not started | `more/page.tsx` untouched this session |
| Apply typography system to Photos tab | Not started | Untouched this session |
| Rebrand/rename exploration for App Store launch | Open thread, no decision | Shawn explored "FoundBizz" / "FoundBuzz" as possible marketing names/domains. Claude advised against both (dilutes existing Found brand equity; "Buzz" tonally conflicts with the calm minimalist dark-green identity) and suggested either keeping "Found" as root with a stronger tagline, or exploring outcome-based naming instead. Nothing decided — revisit when Shawn wants to continue. NOT a Claude call to make (trademark/domain/entity decisions are outside what Claude should weigh in on) — keep any future input scoped to naming *feel*/brand fit, not legal/business advice. |

### 🔜 What To Work On Next (In Order)
1. Finish typography system rollout — Site editor, More tab, Photos tab
2. Verify `ActivationBanner.tsx` end-to-end on a fresh test company once Shawn has tested on desktop
3. Revisit rebrand/naming thread if Shawn brings it back up — stay in brand-fit lane only

---


## Session: June 16-17, 2026 — Billing Activation Flow Fixed End-to-End
**AI:** Claude (Sonnet 4.6) — claude.ai chat interface
**Worked on:** Diagnosing and fixing the entire activation/billing flow, which was broken in multiple layers

### ✅ Completed This Session

**E2E billing test — RAN and FIXED ✅**

The activation flow had 5 compounding bugs discovered in sequence. Here's the full chain of what was wrong and how it was fixed:

**Bug 1: Wrong companyId passed to createSetupIntentForCompany**
- `OnboardingFlow.tsx` was passing `sessionId` (a random browser UUID) instead of the real company ID returned from the DB
- Fix: `actions.ts` now returns `companyId` in the success response; `OnboardingResult` type updated; `OnboardingFlow.tsx` guards `res.companyId` before calling Stripe
- Commits: `f953a2f`, `dcf592d`

**Bug 2: STRIPE_SECRET_KEY and STRIPE_PRICE_ID_FOUND were blank in Vercel**
- The env vars existed as keys but had empty values — Vercel's sensitive var API doesn't return decrypted values so this was invisible
- Root cause: Claude Code from a previous session created the env var shells but values weren't saved
- Fix: Shawn manually set both values in Vercel dashboard; confirmed via Stripe API that `price_1TijsEIiS1OcukjvTQX4STzJ` (Found Founding, $29/month) is valid and active in test mode
- Note: Vercel API PATCH on sensitive vars silently accepts but doesn't save — must be set via dashboard UI

**Bug 3: Subscription used pending_setup_intent but got payment_intent instead (no trial)**
- `payment_behavior: "default_incomplete"` without a trial period causes Stripe to NOT create a `pending_setup_intent` — it creates a `payment_intent` instead
- Attempted fix: switched to `payment_behavior: "allow_incomplete"` + `expand: ["latest_invoice.payment_intent"]`
- That also failed: Stripe returned 400 "This customer has no attached payment source or default payment method"
- `allow_incomplete` requires a payment method already on the customer — which defeats the purpose

**Bug 4: Correct fix — use SetupIntent directly (not via subscription)**
- The right Stripe flow for "collect card now, charge immediately" is:
  1. Create a `SetupIntent` directly (not a subscription) to collect and save the card
  2. After card confirmed → `confirmActivation()` sets the card as default payment method → creates subscription with saved card → charges immediately
- Both `activateActions.ts` and `stripeActions.ts` now use `stripe.setupIntents.create()` with `usage: "off_session"` and store `price_id` in metadata
- `confirmActivation()` now: retrieves setup intent → gets payment method ID → sets as customer default → creates subscription with `default_payment_method` → charges immediately
- Confirm page updated to pass `setup_intent` param (not `payment_intent`)
- `ActivateOverlay` uses `confirmSetup` (not `confirmPayment`)
- Commits: `07d2368`

**Bug 5: Banner disappeared after card entry (stripe_customer_id set too early)**
- `createSetupIntentForCompany` (onboarding fire-and-forget) was saving `stripe_customer_id` to the company record
- `PreviewBanner` was checking `stripeCustomerId !== null` to decide whether to hide — so it disappeared as soon as onboarding completed, before the user ever saw the activate button
- Fix: Banner now checks `subscription_status === 'active'` instead of `stripe_customer_id`
- Layout passes `isActivated={company.subscription_status === 'active'}` to PreviewBanner
- Commit: `b8f90d3`

**Full activation flow confirmed working ✅**
- Test company: `igloofrost` (slug)
- Supabase: `stripe_customer_id: cus_UiZ5YQO4jNUKzg`, `subscription_status: active`, `pending_setup_intent_secret: null`
- Stripe: `sub_1Tj81DIiS1OcukjvmCKYxhOM`, status `active`, $29/month

**Pricing decision made by Shawn:**
- No trial period — charge immediately on activation
- $29/month founding rate (not called a "trial" — terms say 3 days to cancel, but Stripe has no trial days)
- Rationale: users see their live site before activating — visual proof IS the trust. No trial needed.
- The founding pricing is the deal: $29 instead of $39 (what Pro will cost), $39 instead of $69 (what Business will cost)

**Debug logging added to activateActions.ts:**
- `[Activate]` prefix on all console logs for easy filtering in Vercel function logs
- Logs slug, company ID, stripe_customer_id, pending_secret status, dbError on every call
- Logs which null-return path was hit

### 🔍 Customer Dashboard Assessment (Shawn requested this review)

The customer dashboard lives at `my.foundco.app` (app subdomain). Current state:

**What's working well:**
- Magic link login flow — clean, well-built, good email design
- Multi-company select screen — handles agency/multi-site owners
- More page — plan display, founding member badge, upgrade card, billing portal link, sign out. Solid.
- Inbox page — leads with Call/Reply action row, initial avatar, date formatting
- Auth callback → cookie → redirect flow is clean

**What needs work (priority order):**

1. **Leads and Inbox are duplicates** — Both `/leads` and `/inbox` pull identical data from the same table with the same query. Inbox has the Call/Reply action row (better UX). One should be removed or they need different purposes (e.g. Inbox = unread/new, Leads = full history).

2. **Site page is almost entirely "Coming Soon"** — Edit business info, update services, change colors, add photos, upload logo — all locked with "Coming soon" badge. This is the first tab a client will tap after logging in and it's essentially non-functional. Highest priority to fix.

3. **Upgrade checkout still uses trial_period_days: 14** in `more/actions.ts` `startUpgradeCheckout()` — inconsistent with the team's decision to charge immediately. Should be removed or set to 0.

4. **No home/overview screen** — Dashboard redirects straight to `/leads`. No summary of "here's your site status, your last lead, your plan" — just a raw list. A home tab with site status + lead count + plan would improve orientation for new users.

5. **`more/actions.ts` upgrade flow** creates a NEW subscription via Stripe Checkout (with `trial_period_days: 14`) for users who somehow have no existing subscription — this path is inconsistent with the activation flow and should be audited.

### ⚠️ Still Pending / Carry Forward

- **Photo pool curation for 10 new industries** — `/admin/photos` session needed (creative_services, home_based_food, education, music_performance, professional_services, healthcare, childcare, makers_crafts, home_property, nonprofit)
- **VERCEL_API_TOKEN + VERCEL_PROJECT_ID in Vercel dashboard** — needed for `/connect-domain` auto-registration in prod. Currently only in `.env.local`.
- **Remove debug logging** from `activateActions.ts` once billing is confirmed stable in prod
- **Favicon 404** on all client sites — `/favicon.svg` returns 404, shows warnings in Vercel logs constantly

### 🔜 Next Session Priority

1. Fix Site page — at minimum make "Edit business info" and "Update services" functional (most impactful for clients)
2. Remove Inbox/Leads duplication — pick one, remove the other
3. Remove `trial_period_days: 14` from upgrade checkout in `more/actions.ts`
4. Add a Dashboard home/overview screen
5. Photo curation session at `/admin/photos`


---

## Session: June 15, 2026 — Google Places Autocomplete Fixed
**AI:** Claude Code (Sonnet 4.6)
**Worked on:** Diagnosing broken city autocomplete, fixing Google Places API key restriction

### ✅ Completed This Session

**Google Places city autocomplete — fixed (no code changes needed):**
- Root cause: API key had "HTTP referrers" restriction set in Google Cloud Console
- Server-side fetch calls (from `/api/places` route) send no referrer header → Google blocked every request with `REQUEST_DENIED`
- Fix: Shawn changed Application restrictions to "None" in Google Cloud Console
- `/api/places/route.ts` and `OnboardingFlow.tsx` are both correct — code was never the problem
- Confirmed working: `Tucson` → returns `Tucson, AZ, USA` as first result ✅
- City autocomplete and service area autocomplete both use the same route → both now work

**E2E billing test — walked through (not yet run):**
- Full test flow documented in session: onboarding → reveal screen billing card → Stripe test checkout (card: 4242 4242 4242 4242) → verify `subscription_status = trialing` in Supabase → verify preview banner disappears

### ⚠️ Still Pending / Carry Forward

- **E2E billing test** — not yet run. Steps: go through onboarding, hit billing card on reveal screen, use Stripe test card 4242 4242 4242 4242, confirm webhook fires, confirm `subscription_status → trialing` in Supabase, confirm preview banner gone
- **`VERCEL_API_TOKEN` + `VERCEL_PROJECT_ID` in Vercel dashboard** — currently only in `.env.local`; needed for `/connect-domain` auto-registration in prod
- **Photo pool curation for 10 new industries** — requires session at `/admin/photos` with Shawn (creative_services, home_based_food, education, music_performance, professional_services, healthcare, childcare, makers_crafts, home_property, nonprofit)

### 🔜 Next Session

1. Run E2E billing test end-to-end on real device
2. Add `VERCEL_API_TOKEN` + `VERCEL_PROJECT_ID` to Vercel dashboard env vars
3. Photo pool curation session at `/admin/photos`

---

## Session: June 13, 2026 — Stripe Billing Activation + 4 UX Fixes
**AI:** Claude Code (Sonnet 4.6)
**Worked on:** Completing Phase 3 billing setup, then 4 onboarding UX improvements found during testing

### ✅ Completed This Session

**Stripe billing fully activated:**
- All 3 products + 6 prices (monthly + yearly) created programmatically via Node.js (no Stripe dashboard)
- Webhook registered at `https://foundco.app/api/stripe/webhook` with signing secret
- `STRIPE_PRICE_ID_FOUND`, `STRIPE_PRICE_ID_FOUND_PRO`, `STRIPE_PRICE_ID_FOUND_BUSINESS`, `STRIPE_WEBHOOK_SECRET` added to Vercel and deployed
- Vercel API token + Supabase personal access token saved to `.env.local` — Claude can now push env vars and run migrations autonomously

**Smart logo lightness detection (commits `15257c1`, `c237030`):**
- Canvas API samples non-transparent pixels on every logo upload
- Light logo → auto-flips `navbarDark: true` with confirmation "Light logo detected — navigation set to dark"
- Dark logo → keeps white nav, shows "✓ Your logo looks great on both backgrounds" in Signal Green
- Unknown → original two-choice fork (unchanged)

**Logo step copy cleanup:**
- Removed the 3-sentence explanatory paragraph below the dual preview cards

**Color step redesign ("From your logo" card):**
- Logo-detected color now shown as a large card at the top of the color step (48px swatch, hex, ✓ checkmark)
- Divider "Or choose a different color" before preset grid
- Makes the detected color feel intentional and easy to confirm

**Preview banner (`?preview=true`):**
- `src/components/PreviewBanner.tsx` — client component, Signal Green fixed-bottom banner
- Reads `?preview=true` from URL; only visible when `subscription_status` is not active/trialing
- "Start my free trial →" button → `getPreviewCheckout(slug)` server action → Stripe Checkout
- Wired into `src/app/[slug]/layout.tsx`
- Reveal screen "See your site" link now appends `?preview=true`
- Added `src/app/[slug]/previewActions.ts` — server action creates/reuses Stripe customer + fresh checkout URL
- Company type updated with Stripe fields: `stripe_customer_id`, `plan`, `subscription_status`, `trial_ends_at`

### ⚠️ Still Pending / Carry Forward

- **Google Places API key** — city autocomplete stub in place, need key from Google Cloud Console
- **Photo pool curation for 10 new industries** — session at `/admin/photos` needed (creative_services, home_based_food, education, music_performance, professional_services, healthcare, childcare, makers_crafts, home_property, nonprofit)
- **`VERCEL_API_TOKEN` + `VERCEL_PROJECT_ID` in Vercel** — currently only in `.env.local`, needed for `/connect-domain` in prod
- **End-to-end billing test** — create a test account, go through onboarding, verify preview banner shows, click Start my free trial, complete Stripe checkout, verify webhook fires and `subscription_status` → trialing, verify banner disappears

### 🔜 Next Session

1. E2E billing test (see above)
2. Add `VERCEL_API_TOKEN` + `VERCEL_PROJECT_ID` to Vercel env vars (or do it programmatically)
3. Photo pool curation session with Shawn

---

## Session: June 12, 2026 (evening) — Slug Check Bug Fix
**AI:** Claude Code (Sonnet 4.6)
**Worked on:** Diagnosing 4 failed Vercel builds, fixing slug availability check

### ✅ Completed This Session

**Slug status always visible on any device (Craig + Jony — commit `effdfec`):**
- ✓/✗ icon moved inside the input field (right side) — always visible above keyboard on any screen size
- Taken state: `SlugSheet` bottom sheet component (`position: fixed`) slides up from above the iOS keyboard
- Sheet shows: taken address in red, 3 suggestion chips (pre-verified available), custom input, "Use this →" button
- Pre-verified suggestion picked → confirm advances to next step immediately
- Custom-typed slug → confirm closes sheet, debounce re-checks, icon updates, user taps Next
- "Change →" link also opens the sheet for editing an available slug
- Intercepted `advance()`: if `step === "name" && slugStatus === "taken"` → shows sheet instead of advancing

**Root cause of 4 failed deployments (Craig):**
- `actions.ts` had a TypeScript error (TS2448): `city` was referenced in `uniqueSlug(preferredBase, city)` before `splitLocation()` had declared it — one line below
- This caused every build after commit `344b737` to fail: `539c521`, `7cf5dd5`, `344b737`, `90d21cf`
- Fix: moved `splitLocation()` call above the `uniqueSlug()` call
- Commit `7bc2cae` — now live ✅

**Compact slug status UI (Craig + Jony):**
- Old design: full bordered card below the name input — hidden behind iPhone keyboard on mobile
- New design: compact single-line status (`double-blur.foundco.app · ✓ Available`) that stays visible above the keyboard
- Taken state still expands suggestion chips + custom input below the input field
- Both fixes in commit `7bc2cae`

### ⚠️ Still Pending (carry to next session)

- **Run migration-028** in Supabase SQL editor: `ALTER TABLE companies ADD COLUMN IF NOT EXISTS navbar_dark boolean DEFAULT false;`
- **Add Vercel env vars**: `VERCEL_API_TOKEN` + `VERCEL_PROJECT_ID` for automatic domain registration via connect-domain page
- **End-to-end onboarding test** — Shawn testing slug check now

### 🔜 Next Session

1. Confirm slug check working end-to-end on Shawn's phone
2. Run migration-028
3. Full onboarding flow test: name → submit → welcome email → live site

---

## Session: June 12, 2026 — Slug System + Dark Navbar + Two-Logo + Connect Domain + Welcome Email
**AI:** Claude Code (Sonnet 4.6) + Apple Team
**Worked on:** Smart slug system, dark navbar mode, dual-logo onboarding, connect-domain page, welcome email, mobile nav polish

### ✅ Completed This Session

**Logo & Navbar fixes (Craig + Jony):**
- `mix-blend-mode: multiply` was erasing white logo pixels — replaced with CSS drop-shadow: `drop-shadow(0 1px 3px rgba(0,0,0,0.35)) drop-shadow(0 0 6px rgba(0,0,0,0.20))`
- CinematicLayout about section: removed competing stock photo, now always `#111111` solid dark
- Mobile "Call Us" button: now styled as a real pill button (`className="btn text-center font-black"`) with proper border + color — was rendering as plain text

**Dark navbar mode (`navbar_dark` flag — Craig):**
- `scripts/migration-028-add-navbar-dark.sql` — ⚠️ MUST BE RUN in Supabase SQL editor: `ALTER TABLE companies ADD COLUMN IF NOT EXISTS navbar_dark boolean DEFAULT false;`
- `src/types/company.ts`: added `navbar_dark: boolean | null`
- `src/components/Navbar.tsx`: full refactor — `isNavDark = !!company.navbar_dark`, `isOnDark = isOverlay || isNavDark`, background/border/text/logo all branch on this
- When `navbar_dark = true`: navbar always `#111111`, logo always white (brightness(0) invert(1)), no transparent phase
- Logo filter on light nav: `drop-shadow(0 1px 3px rgba(0,0,0,0.35)) drop-shadow(0 0 6px rgba(0,0,0,0.20))`

**Two-logo onboarding system (Angela + Craig):**
- `src/app/onboarding/uploadActions.ts`: `uploadLogoFile` now takes `variant: "primary" | "light"` — second logo saves to `logos/{sessionId}/logo-light.{ext}`
- Onboarding logo step: "Keep my site dark" button sets `navbarDark: true`; "I have a version for white backgrounds" triggers second logo upload
- Logo swap on save: if both logos uploaded, `logo_url` = light-bg version, `logo_white_url` = dark-bg version (navbar crossfade system already handles this correctly)
- `src/app/onboarding/actions.ts`: `logoWhiteUrl` + `navbarDark` wired through to insert

**Vibe step dark/light nav toggle (Jony + Angela):**
- Two tiles below vibe cards — mini navbar mockup previews (dark + light)
- Sets `navbarDark: true/false` — overrides the logo-step preference if changed here

**Smart slug system (Craig + Marcus):**
- `src/lib/slugify.ts`: NEW shared client+server utility — camelCase splitting (`DoubleBlur → double-blur`), `&/@/+` normalization, 48-char limit
- `src/app/onboarding/slugActions.ts`: NEW server action — `checkSlugAvailable(raw, city)` — checks DB, builds suggestions: city first, then SUFFIXES array (`studio/co/hq/shop/pro/lab/works`), returns first 3 available
- `src/app/onboarding/OnboardingFlow.tsx`: slug preview card on name step — green ✓ / red ✗ with 650ms debounce, suggestion chips, "Or type your own" custom input, "Change it →" / "Reset to default" links
- Slug fallback chain at submit: `preferred → preferred-city → preferred-4hexchars` (no industry in slug)
- `actions.ts`: `slugPreference` honored at create, falls back gracefully

**Autocomplete fix (Angela):**
- `autoComplete="tel"` on all phone inputs in onboarding contact step
- `autoComplete="email"` on all email inputs
- Prevents iPhone showing wrong suggestions (e.g., usernames in phone field)

**Welcome email on site creation (Craig):**
- `src/app/onboarding/actions.ts`: `buildWelcomeEmail()` fires after successful site insert (fire-and-forget)
- From: `Found <hello@foundco.app>`, replyTo: `hello@foundco.app`, via Resend
- Email includes: live site URL button, pages list (Home/About/Services/Gallery/Contact), 3 next steps, connect-domain link

**Connect domain page (Craig):**
- `src/app/connect-domain/page.tsx`: server component, loads company by slug, shows `[slug].foundco.app` + current custom domain, renders form + DNS instructions
- `src/app/connect-domain/ConnectDomainForm.tsx`: "use client" form, calls `connectDomain(slug, domain)`, success state with DNS reminder
- `src/app/connect-domain/actions.ts`: validates domain format, verifies company exists, updates `website_config.custom_domain`, calls Vercel API (`POST /v10/projects/{projectId}/domains`) if env vars set — degrades gracefully if not
- DNS instructions: A record → `76.76.21.21`, CNAME www → `cname.vercel-dns.com`

### ⚠️ ACTION REQUIRED

1. **Run migration-028** in Supabase SQL editor: `ALTER TABLE companies ADD COLUMN IF NOT EXISTS navbar_dark boolean DEFAULT false;`
2. **Add Vercel env vars** for domain auto-registration: `VERCEL_API_TOKEN` + `VERCEL_PROJECT_ID` in Vercel dashboard (connect-domain page works without them — just skips the API call)

### 🔜 What To Work On Next

1. **End-to-end flow test** — Shawn tests full onboarding: name (slug preview) → industry → location → services → photos → logo (dark/light fork) → vibe (toggle) → submit → reveal → welcome email → live site
2. **Google Places API** — Shawn gets key from Google Cloud Console (Places API, restrict to foundco.app + localhost)
3. **Photo pool curation** — 10 new industries have empty pools; requires curation session with Shawn at /admin/photos
4. **CHANGELOG + TASKS** — updated this session ✅

---

## Session: June 11, 2026 — Upload Fix + Contact Visibility + Admin Panel + Affirmations + Vocab Wiring
**AI:** Claude Code (Sonnet 4.6) + Apple Team
**Worked on:** iPhone upload bug, contact visibility toggles, admin copy panel fix, affirmations, inner-page vocab wiring

### ✅ Completed This Session

**Upload stuck bug fixed (Craig):**
- Next.js server actions have 1MB default body limit — iPhone photos (3–15MB) silently killed the request
- Fix: hero upload now resizes client-side via Canvas API (HEIC → JPEG, max 2400px, ~500KB output) before sending to server
- Logo upload: try/catch + finally so spinner always stops
- `next.config.ts`: `serverExternalPackages: ["sharp"]`, `experimental.serverActions.bodySizeLimit: "25mb"`
- Both inputs: `accept="image/*"` (was png/jpeg/webp only)
- Commit: shipped and confirmed working

**Contact visibility design (Jony + Angela — commit shipped):**
- Onboarding contact step: inline toggle per field — "✓ Shows on your contact page — tap to hide" / "Hidden — tap to show"
- "Send leads to a different number or email?" expander for lead routing
- `contact/page.tsx` gates phone/email display on `phone_visible` / `email_visible` flags
- Migration: `scripts/migration-add-contact-visibility.sql` — ✅ run June 11, 2026

**Admin copy panel fix (Craig):**
- Was filtering `.eq("copy_generated", false)` — broke because migration defaulted all existing to `true`
- Fixed: removed filter, added AI/Fallback/Updated badges per row

**Angela's affirmations (all 10 steps — Angela):**
- All onboarding steps have contextual Signal Green affirmations
- Covers name, description, location, contact, differentiator, services, photos, logo, color, testimonials

**Vocab wiring — inner pages (Craig + Marcus):**
- `about/page.tsx`: "Our Story" → `vocab.aboutLabel`, "Our Services" → `vocab.servicesLabel`, CTA body → `vocab.ctaBodyText`
- `gallery/page.tsx`: title uses `vocab.galleryLabel`; body switches to `getVocab` for sub-industry accuracy

### 🔜 What To Work On Next (As Of June 11)
1. End-to-end onboarding flow test on Shawn's phone
2. Google Places API key
3. Photo pool curation for 10 new industries

---

## Session: June 10, 2026 — Industry Taxonomy Expanded + Content Architecture Locked + Photo Bug Fixed
**AI:** Claude Code (Sonnet 4.6) + Apple Team
**Worked on:** Full content/copy architecture planning, expanded industry taxonomy to 22, fixed photo wiring bug, locked all decisions

### ✅ Completed This Session

**Photo wiring bug fixed (Craig):**
- `[slug]/page.tsx` was bypassing curated industry photo pools entirely — calling Pexels directly
- Fixed: now calls `getStockImages(company)` — routes through curated pools → Pexels → gradient in correct priority
- All 250+ curated photos are now actually used on live sites

**Supabase migration confirmed done (Shawn):**
- `scripts/migration-add-lead-type.sql` run. Save-spot lead capture is fully live.

**Full content architecture designed and locked (team session):**
- Website Job Framework approved: 7 jobs (Book me, Hire me, Quote me, Visit me, Order from me, Trust me, Find me)
- Sub-industry vocabulary table approved: ~120 sub-industries × 8 vocabulary words each. Structural copy cross-referenced; emotional copy stays Claude-generated.
- 7 job-family fallback templates approved — replaces broken `primaryJob`-as-copy fallback. NOT 120 static entries.
- Industry baseline copy approved for all 12 existing industries (see DECISIONS.md)
- Claude failure strategy locked: silent fallback, `copy_generated` flag, admin regeneration, owner never sees error
- Owner copy editing approved for Phase 3: tap to edit any text, Claude regeneration per section, text editable / structure immutable

**Full 22-industry taxonomy locked (Jony-led planning session):**
- 12 existing industries confirmed
- 4 priority new industries approved: Creative Services, Home-Based Food, Education & Instruction, Music & Performance
- 4 next-sprint industries identified: Professional Services, Healthcare, Childcare & Family, Makers & Crafts
- 2 later industries: Home & Property Specialists, Nonprofit & Community
- Website job assigned to every industry
- See DECISIONS.md [2026-06-10] for full taxonomy

**Section label system designed (Jony):**
- All hardcoded section labels banned: "What We Do", "Our Services", "Who We Are", "What Clients Say", etc.
- Every template will read from sub-industry vocabulary table
- Full label table documented in DESIGN_DECISIONS.md [2026-06-10]

### 🔜 What To Work On Next (In Order)

1. **Build sub-industry vocabulary table** — `src/lib/subIndustryVocabulary.ts`, ~120 rows, 8 fields each
2. **Build 7 job-family fallback templates** — replace broken `buildFallbackWebsiteContent` in `contentGeneration.ts`
3. **Wire section labels into all 4 layout templates** — depends on vocabulary table
4. **Build 4 priority new industries** — manifests, sub-industries, vocab entries, layout matrix, photo pools
5. **Add menu page for food industry** — `/[slug]/menu/page.tsx`, swap nav link
6. **Add admin fallback copy alert** — `copy_generated` flag + admin view + one-button regeneration

---

## Session: June 9, 2026 — Option B + C: Slide-Up Drawer, Light Question Screens, Save-Spot Lead Capture
**AI:** Claude Code (Sonnet 4.6) + Apple Team
**Worked on:** Implemented approved Option B + C design direction, added save-spot lead capture on dismiss

### ✅ Completed This Session

**Design review (Jony led, Steve approved):**
- Confirmed B + C together is correct — they solve different problems and belong together
- Welcome screen redesigned: trimmed subtext, big Signal Green pill button with 0.0 40px rgba(50,208,116,0.38) glow
- Three transition moments locked: welcome→questions (white sweeps up), questions→generating (dark returns), generating→reveal (already solid)
- Three architecture decisions locked: URL updates to /onboarding when drawer opens, dismissal friction dialog if ≥1 question answered, no progress persistence yet (Phase 3)
- Save-spot lead capture added (Shawn's idea): dismissal becomes an offer, not a warning

**Option C — Slide-up drawer (commit `7517ab7`):**
- `src/app/page.tsx` converted to client component; "Build my site" + "Start" trigger `setDrawerOpen(true)` instead of navigating
- `src/components/OnboardingDrawer.tsx` — new full-screen panel, slides up from below (500ms cubic-bezier(0.32,0.72,0,1)), locks body scroll, manages URL pushState/popState
- Auto-opens when landing with `?start=1` (resume link from save-spot email)
- Browser back button closes drawer
- `/onboarding` standalone page still works as fallback

**Option B — Light question screens:**
- `phase` state: `'welcome' | 'questions'`
- Welcome screen stays Pure Studio dark — big Signal Green button, soft glow
- On "Let's go →": white `#FAFAF9` panel sweeps up from below (`@keyframes sweep-up`, 300ms), covering dark welcome
- All question steps render on white with FOUND_BLACK text — accessibility fixed
- Reveal + Generating screens stay dark — full arc: Dark / Light / Dark ✅
- `getTokens(isLight, primaryColor)` helper: all colors (text, muted, hint, borders, card bg/border, placeholders) switch based on phase
- Accessibility: all inputs min `text-[2rem]`, all hints `text-[0.9rem]`, placeholder `#757575` (4.54:1 WCAG AA on #FAFAF9)
- X button in header when in drawer mode — color adapts to phase

**Save-spot lead capture (Shawn's idea — approved by full team):**
- `saveAbandonedLead` server action added to `src/app/onboarding/actions.ts`
- `requestClose()` logic: if stepIndex 0 → close immediately; if email already collected → auto-save silently + close; if not → show SaveSpotDialog
- `SaveSpotDialog`: bottom sheet on mobile, centered card on desktop — first name + email → saves `type: 'onboarding_abandoned'` lead to Supabase → sends one Angela-tone follow-up email via Resend
- Migration script: `scripts/migration-add-lead-type.sql` — must be run in Supabase SQL editor

### ⚠️ ACTION REQUIRED — Run migration before save-spot is live

Shawn must run `scripts/migration-add-lead-type.sql` in Supabase SQL editor:
- Makes `company_id` nullable in `leads` table (abandoned leads have no company yet)
- Adds `type varchar(64)` and `partial_answers jsonb` columns
- Without this, save-spot will throw a DB error on submit

### 🔜 What To Work On Next (In Order)

1. **Run Supabase migration** — `scripts/migration-add-lead-type.sql` in SQL editor before testing save-spot
2. **Test on real devices** — verify drawer entrance on iPhone portrait, iPad, desktop; check light question screens contrast; test X button + save dialog
3. **Angela's affirmations** — write exact wording for each step affirmation (visual system is now stable — this was the blocker)
4. **Wire Google Places API** — Shawn to get API key from Google Cloud Console (Places API, restrict to foundco.app + localhost)
5. **Real file uploads** — logo and hero photo to Supabase Storage

---

## Session: June 8, 2026 — Homepage Responsive Fixes + Onboarding Rebuild + Design Direction Locked
**AI:** Claude Code (Sonnet 4.6) + Apple Team
**Worked on:** Fixed all homepage responsive issues from Codex session, rebuilt onboarding in Found visual system, locked design direction for next onboarding phase

### ✅ Completed This Session

**Homepage hero fixes (all verified on real devices):**
- Moved FOUND wordmark from copy column into nav header on ALL screen sizes (removed `md:hidden`)
- Removed `found-desktop-wordmark` div from copy column — freed ~92px of vertical space, fixed Dell Latitude 5400 overflow where header was cut off
- iPhone subtitle: added `<br />` between the two sentences to reduce overlap with device art
- Categories bullet row (Websites • Bookings • Quotes • Social): reduced `mt-16` → `mt-8`, now visible on desktop
- Fixed START button on iPhone portrait: removed `position: absolute` from `.found-start-link` portrait CSS — was misaligned above the shell padding. Now flows naturally in flex header alongside FOUND wordmark.
- Cleaned up dead `found-desktop-wordmark` CSS references in tablet, portrait, and landscape states
- Added `@keyframes spin` to globals.css for generating screen spinner

**Onboarding — full rebuild (`src/app/onboarding/OnboardingFlow.tsx`):**
- Pure Studio dark foundation: `#080A09` background, white type, Signal Green accents throughout
- Desktop two-column layout: question/conversation on left, live site preview on right
- Live preview panel (desktop only): phone mockup updates in real time as owner types — name, industry, color, services all reflect immediately
- Question transitions: `key={step}` triggers `fade-up` CSS animation on every step change
- Removed: summary step, step counter ("X of 14"), Back button — forward motion only (Steve approved)
- Auto-advance on single-tap steps (subIndustry, vibe, photos, logo) — 320ms delay after tap
- Signal Green affirmations appear inline when field is ready: "Barrio Builders. Perfect." / "Home Services — makes sense." / etc.
- `ServiceChipInput` component: chip-based service entry with industry sub-type suggestions
- `LocationInput` component: city text input + service area chip row (appears after city is typed). Google Places autocomplete stubbed with `// TODO` comment — ready for API key
- Differentiator chips (Q6): industry-specific quick-add phrases (e.g. "Family owned", "Licensed & insured", "Free estimates")
- `GeneratingScreen`: spinning ring + 3 rotating lines ("Building your site." → "Writing your story." → "Almost ready.")
- `RevealScreen`: full-screen Pure Studio reveal with phone mockup, Signal Green live indicator, site URL, "See your site" + "Make changes" CTAs
- `actions.ts`: added `serviceAreas?: string[]` — merges typed service areas with derived city

**Commits pushed today:**
- `f0e2d61` — Move FOUND wordmark to nav on all screen sizes, fix desktop overflow
- `1ad478f` — Fix START button alignment on iPhone portrait
- `1fa6970` — Rebuild onboarding in Found visual system with live desktop preview

### ⚠️ Design Feedback From Shawn (Session End — Addressed Next Session)

Shawn reviewed the new onboarding on real devices and gave the following feedback:

1. **Too dark for accessibility** — Shawn wears readers. Grayed-out placeholder text (white/18–25%) is invisible until typing starts. Subtext under location felt too small to read. For the target audience (small business owners, not all tech-savvy), contrast must be much higher.
2. **Welcome screen has no "wow" and no clear call to action** — Doesn't communicate that you should type. Felt like something was broken. No invitation, no intrigue.
3. **Transition from homepage to onboarding is a hard cut** — Needs a cinematic entrance. Referenced Typeform and Spa Mambo as examples.
4. **Overall: alive but bland** — The green activating as you type is great. The initial landing doesn't pull you in.

### 🔒 Design Decisions Locked for Next Session

**Option B + C approved by Shawn, designed by Jony, approved by Steve:**

**Option B — Light questions, dark bookends:**
- Welcome screen: stays dark, Pure Studio, cinematic
- Question screens: flip to clean white/near-white background with FOUND_BLACK text and Signal Green accents — maximum readability, Typeform-level contrast, Signal Green pops harder on white
- Reveal screen: returns to dark — the site is born in darkness

**Option C — Slide-up drawer from homepage:**
- Onboarding does NOT navigate to a new page
- Clicking "Build my site" on homepage slides a full-screen panel up from the bottom — like Typeform, like an iOS sheet
- Homepage stays beneath. The entrance IS the wow moment.
- This replaces the hard-cut page navigation currently in place

**Together:** Dark homepage → slide-up reveals dark welcome screen → "Let's go" flips to light question screens → light questions throughout → dark reveal when site is ready. Dark / Light / Dark. Ceremony / Work / Ceremony.

**Additional design rules for light question screens:**
- Minimum font size for inputs: 2rem (32px) — never smaller
- Minimum font size for hints/subtext: 0.9rem at white/75+ or black/65+
- Placeholder text: visible at rest (not invisible until typing) — use opacity that passes WCAG AA (4.5:1)
- Every screen must have an obvious primary action — no ambiguity about what to do
- "Press Enter →" keyboard hint on text input steps (desktop)

### 🔜 What To Work On Next (In Order)

1. **Implement Option C: slide-up drawer** — Homepage "Build my site" CTA opens onboarding as a slide-up full-screen sheet (no page navigation). Smooth entrance animation.
2. **Implement Option B: light question screens** — Flip question screens to white/near-white. Dark welcome and dark reveal stay. Apply new contrast/font-size rules throughout.
3. **Wire Google Places API** — Shawn to get API key from Google Cloud Console (Places API, restrict to foundco.app + localhost). Server-side proxy route. City autocomplete + nearby service area chips replace the current text stub.
4. **Angela's affirmations session** — Write exact wording for each step's affirmation now that the visual system is settled.
5. **Real file uploads** — Logo and hero photo upload (to Supabase Storage), not just "I'll add later" placeholder.

---

## Session: June 8, 2026 - Found Homepage Hero Art + Responsive System
**AI:** Codex (GPT-5) + Apple Team
**Worked on:** Rebuilt the Found marketing homepage hero around the approved Signal Green direction and cleaned up responsive behavior

### Completed This Session

- Replaced the earlier duplicated-logo hero treatment
  - Removed baked-in `FOUND`/headline artwork from the page background
  - Generated and shipped distinct desktop/mobile v3 hero assets
  - Device screens now show different client outcomes: real estate, wellness, HVAC, and restaurant/menu
  - Client sample sites use different palettes and button styles so Found does not look like one template repeated
- Refined homepage copy and brand hierarchy
  - Removed visible `Found Co.` from the hero
  - Removed `Found it.` from the hero
  - Changed root metadata title to `FOUND`
  - Kept the hero message focused: `FOUND` + `Your business beautifully online.`
- Refactored the hero responsive CSS system in `src/app/globals.css`
  - Replaced stacked height-only exceptions with named responsive states
  - Desktop: copy high-left, device art on the right, CTAs in the copy column
  - Tablet/iPad: copy higher and constrained so it avoids the mockups
  - Phone portrait: portrait art, short mobile copy, CTAs pinned toward the bottom
  - Phone landscape: wide art, compact mobile copy, CTAs pinned toward the bottom, desktop category row hidden
- Verified production after push
  - Latest pushed commit: `88a3bc6` (`Refactor Found hero responsive system`)
  - `https://foundco.app` returned `200`
  - Production HTML included the new hero markup/CSS

### Important Handoff Notes

- Shawn approved the direction, but real-device visual review was still in progress when the session wrapped.
- Shawn specifically asked future AI not to keep bandaging responsive issues with random one-off overrides.
- Future responsive changes should follow the four approved states:
  1. Desktop: `min-width: 1181px`
  2. Tablet/iPad: `768px-1180px`
  3. Phone portrait: `max-width: 767px` + portrait
  4. Phone landscape: `max-width: 1180px` + landscape/short height
- Before pushing future homepage visual changes, verify the actual screenshots Shawn provides or use real viewport screenshots.
- Leave `scripts/upload-gotsmoothie-logo.mjs` alone unless Shawn explicitly asks; it was already dirty and unrelated to this work.

### What To Work On Next (In Order)

1. **Final real-device homepage QA** - Shawn should review live desktop, iPad, iPhone portrait, and iPhone landscape after commit `88a3bc6`
2. **If approved, lock homepage hero baseline** - avoid further hero layout churn until onboarding design catches up
3. **Bring onboarding UI into the same Jony-approved visual system** - current onboarding still needs the Found premium treatment
4. **Resume Phase 2 product tasks** - location intelligence, differentiator suggestions, uploads, logo color extraction

---

## Session: June 7, 2026 - Found Homepage Foundation Built
**AI:** Codex (GPT-5) + Apple Team
**Worked on:** Replaced the root placeholder with the first real Found Pure Studio / Signal Green homepage

### Completed This Session

- Rebuilt `src/app/page.tsx` as the Found product-stage homepage
  - Refined uppercase `FOUND` wordmark
  - Pure Studio black/white foundation
  - Signal Green used only for live/action/reveal meaning
  - Device-style website stage showing the product idea without copying Apple UI
  - Primary CTA into `/onboarding`
  - Short "No templates. No builder. Just a conversation." section
- Verified with `npm.cmd run build`

### What To Work On Next (In Order)

1. **Location intelligence** - city autocomplete + nearby service area chips for SEO/AEO/GEO
2. **Differentiator suggestions** - industry-specific helper chips on "What makes you different?"
3. **Real file uploads** - logo upload, hero photo/video upload, and gallery photo upload during onboarding
4. **Logo color extraction** - suggest colors from uploaded logo before the palette presets

---

## Session: June 6, 2026 - Found Brand Direction + Reveal First Pass
**AI:** Codex (GPT-5) + Apple Team
**Worked on:** Locked Found's brand direction and added the first Pure Studio / Signal Green onboarding reveal

### Completed This Session

- Approved Found brand direction: **Pure Studio with a Signal Green heartbeat**
  - Found product world stays black, white, and quiet
  - Signal Green `#32D074` is reserved for action, live state, success, and reveal
  - Client site colors remain separate so Found does not compete with the websites it creates
- Approved logo direction: refined uppercase `FOUND` wordmark
  - Avoid map pins, magnifying glasses, sparkles, and generic SaaS marks
  - The `O` can be explored only if it stays subtle
- Documented decisions in `DECISIONS.md`, `DESIGN_DECISIONS.md`, `PROJECT.md`, and `ONBOARDING.md`
- Added first reveal screen to `/onboarding`
  - Shows "Found it.", live status, generated business name, generated URL, and device-style preview
  - Primary action: "See your site"
  - Secondary action: "Make changes"

### What To Work On Next (In Order)

1. **Real file uploads** - logo upload, hero photo/video upload, and gallery photo upload during onboarding
2. **Contact foundation** - leads create/update lightweight contacts; full contact dashboard stays Phase 3
3. **Curate Real Estate photo pool** - replace Pexels fallback with approved images
4. **Found homepage direction** - rebuild the root Found experience around Pure Studio / Signal Green

---

## Session: June 5, 2026 - Onboarding Claude Content Generation Wired
**AI:** Codex (GPT-5) + Apple Team
**Worked on:** Connected onboarding save flow to Claude API content generation with deterministic fallback copy

### Completed This Session

- Added `src/lib/contentGeneration.ts`
  - Calls Anthropic Messages API once during onboarding site creation when `ANTHROPIC_API_KEY` is set
  - Defaults to `claude-haiku-4-5`, with `ANTHROPIC_MODEL` override available
  - Sends Found's industry manifest, sub-industry, vibe, services, location, and differentiator as prompt context
  - Returns/saves structured homepage copy: hero title, hero subtitle, about text, tagline, CTA headline, and service descriptions
  - Sanitizes the response and falls back to Found's built-in deterministic copy if the key is missing, the API fails, or JSON is invalid
- Updated `/onboarding` save action to use generated copy before inserting `website_config`
- Verified with `npm.cmd run build` after allowing the build to fetch Google Fonts

### What To Work On Next (In Order)

1. **Real file uploads** - logo upload, hero photo/video upload, and gallery photo upload during onboarding
2. **Site reveal moment** - Angela/Jony first-look screen after generated site creation
3. **Contact foundation** - leads create/update lightweight contacts; full contact dashboard stays Phase 3
4. **Curate Real Estate photo pool** - replace Pexels fallback with approved images

---

## Session: June 5-6, 2026 — Photo Pools Complete — All 11 Industries Tagged, Described, Approved
**AI:** Claude Code (Sonnet 4.6)
**Worked on:** Full photo pool curation — all 11 industries reviewed, tagged, described, and approved by Shawn

### ✅ Completed This Session

**All 11 industry photo pools — fully curated:**
- Every photo reviewed by the Apple team with Shawn approving each industry
- Every photo has a team-written description (replaces Pexels alt text)
- Every photo has team-approved keywords (5 per photo, for matching engine)
- Sub-type tags verified and corrected across all industries

**Critical fixes made during review:**
- Automotive: 8 beard trim/barber photos removed → moved to Beauty pool (tagged `barber`)
- Events: 9 general photos retagged as `wedding` (were incorrectly labeled general)
- Retail: 2 cosmetics store photos retagged as `beauty store`
- Fitness: yoga photos retagged from `yoga class` → `yoga studio`
- Landscaping: 6 general garden photos added by team (was missing general category entirely)
- Fitness: 5 yoga studio photos added by team for variety (was all heavy gym/male weightlifting)

**Final pool summary:**
- home_services: 29 photos — general(10) · camera install(9) · tv install(7) · painting(3)
- food: 19 photos — general(12) · food truck(7)
- wellness: 13 photos — general(13)
- events: 24 photos — wedding(9) · balloon decor(8) · balloon garland(7)
- retail: 11 photos — general(9) · beauty store(2)
- fitness: 16 photos — general(11) · yoga studio(5)
- beauty: 40 photos — general(11) · barber(20) · pedicure(6) · manicure(3)
- automotive: 12 photos — general(12)
- pet_services: 12 photos — general(9) · pet groomer(3)
- cleaning: 9 photos — general(4) · home cleaner(2) · commercial cleaner(3)
- landscaping: 18 photos — general(6) · hardscaping(5) · paver(3) · tree trimmer(3) · tree grooming(1)

**Storage:** All pools saved to `config/photo-pools/{industry}.json` in Supabase Storage
**PoolPhoto type:** Updated to include `keywords?: string[]` field
**Cache cleared:** All 4 live sites had stock_images cache cleared — will pull from curated pools on next load

### 🔜 What To Work On Next (In Order)

1. **Industry section manifest session** — Shawn walks team through all 11 industry types
2. **Build onboarding flow** — Angela's spec in ONBOARDING.md, photo pools now ready
3. **Add sub-industry question to onboarding** (Angela's Q2.5) — drives photo tag matching
4. **Build the site reveal moment** — choreographed first-look experience

---

## Session: June 5, 2026 — Admin Photo Curator Working
**AI:** Claude Code (Sonnet 4.6) — desktop session
**Worked on:** Fixed admin photo curator end-to-end — table, storage, save, highlights

### ✅ Completed This Session

**Root cause found and fixed — photos now save correctly:**
- `industry_photo_pools` DB table didn't exist → created via Supabase SQL editor
- PostgREST schema cache refused to pick up the new table (tried NOTIFY, grants, project restart — all failed)
- Switched to Supabase Storage JSON files instead: `config/photo-pools/{industry}.json`
- Created new `config` bucket (public, allows application/json)
- `photoPool.ts` now reads from public Storage URL with 5min cache
- Admin `actions.ts` writes/merges via service role Storage API
- Full write + read tested and confirmed working

**Admin curator UX fixed:**
- Approved photos stay highlighted after saving — checkmarks don't clear
- On tab load: approved URLs fetched from Storage, matching photos pre-selected
- Progress bar, tab badges, and status strip all working correctly
- `getApprovedUrls(industry)` server action added

**Other fixes this session:**
- All navbar logos fixed at 160×48px fixed containers — Got Smoothie no longer breaks layout
- `galleryLabel` per industry added (Our Work / Our Menu / Our Space / Our Portfolio / etc.)

### 🔜 What To Work On Next (In Order)

1. **Go through all 11 industry tabs** in `foundco.app/admin/photos` and approve 8-15 photos each
2. **Rotate security keys** — GitHub PAT + Supabase service role (urgent since June 3)
3. **Industry section manifest session** — Shawn walks team through all 11 types
4. **Build onboarding flow** — Angela's spec in ONBOARDING.md, unblocked once photos approved

---

## Session: June 4, 2026 — Admin Photo Curator Built
**AI:** Claude Code (Sonnet 4.6) — desktop session
**Worked on:** Admin photo curation page, logo fixes

### ✅ Completed This Session

**Admin photo curator — `/admin/photos`:**
- Built `src/app/admin/photos/` — 4 files: page.tsx, actions.ts, PhotoCurator.tsx, AdminLogin.tsx
- Dark grid UI, all 11 industry tabs with approved count badges
- 24 Pexels photos per industry loaded on demand
- Tap to select (green checkmark overlay), Approve button saves directly to `industry_photo_pools` table
- Deduplication — won't save the same photo twice
- Auth via `ADMIN_KEY` cookie (30-day session)
- `ADMIN_KEY` set in .env.local

**⚠️ ACTION REQUIRED — Vercel env var:**
- Vercel CLI couldn't authenticate headlessly
- Shawn must manually add `ADMIN_KEY` in Vercel dashboard → Settings → Environment Variables → then Redeploy
- Without this, the admin page login won't work on production

**Logo fixes:**
- All logo slots use fixed 160×48px containers with `object-contain object-left`
- Got Smoothie wide logo no longer breaks navbar or mobile menu
- Calm menu panel has `overflow: hidden` as safety net

### 🔜 What To Work On Next (In Order)

1. **Set ADMIN_KEY in Vercel dashboard + redeploy** — must do before using admin page
2. **Rotate security keys** — GitHub PAT + Supabase service role (urgent since June 3)
3. **Go through photo curator** — approve 10-15 photos per industry across all 11 tabs
4. **Industry section manifest session** — Shawn walks team through all 11 industry types
5. **Build onboarding flow** — Angela's spec in ONBOARDING.md, unblocked once photos are approved

---

## Session: June 4, 2026 — Platform Polish Pass Complete
**AI:** Claude Code (Sonnet 4.6) — desktop session
**Worked on:** Gallery rebuild, lightbox, all-layout animations, navbar fixes, photo system plan

### ✅ Completed This Session

**Gallery — rebuilt platform-wide:**
- Masonry layout (CSS columns, 2-col mobile / 3-col desktop, 3px gaps, natural aspect ratios)
- GalleryLightbox client component — tap photo → full-screen, swipe left/right, arrow buttons, keyboard nav, photo counter, brand color accent line, body scroll lock
- Minimal header: "Our Work" + photo count only (company name removed — already in navbar)
- Empty state: "Our work speaks for itself." brand statement + CTA
- Photo CTA at bottom (section rhythm rule honored)

**Navbar fixes:**
- Fixed/transparent only on Cinematic homepage — inner pages always sticky
- `colorLogoReady` initializes correctly on inner pages (color logo shows immediately on white navbar)
- `isHome` guard on colorLogoReady effect so inner pages never reset logo state
- Logo crossfade: background transitions first, logos swap after bg is white
- Logo sizes matched across navbar and all mobile menus (48px)
- RC Bicycles logos: original clean PNGs from Shawn uploaded, damaged mobile-session files replaced

**All 4 layouts — animations complete:**
- Impact: fast confident punch (400-500ms), service cards stagger 80ms, InView on all sections
- Editorial: slow magazine drift (700-900ms), image panel fades from right, service rows stagger 60ms
- Portrait: warm light rising (500-700ms), gallery strip sequence fade, InView on all sections
- Cinematic: already complete from previous session
- New `fade-left` keyframe for Editorial image panel
- `prefers-reduced-motion` respected across all layouts

**Hamburger menu:**
- Bold menu nav items stagger in (90ms apart, 400ms, 24px slide from left)
- White logo uses `logo_white_url` directly (no filter artifacts)
- Logo size matched to navbar on all menus

**Photo system — plan locked (no code yet):**
- `industry_photo_pools` table exists, is empty — this is the gap
- Plan: curate 15-20 photos per industry, upload to Supabase Storage, tag with subject/mood/subcategory metadata
- Keyword scoring function to match photos to specific business types within an industry
- Angela's onboarding adds sub-industry question to drive photo matching

**Logo + gallery polish (same session, later):**
- All logos bumped to 56px across navbar and all mobile menus — Blue Luna nav/hamburger now match
- Got Smoothie calm menu: logo `min-w-0` + close button `flex-shrink-0` — wide logos can't push close button off screen, maxWidth tightened to 160px
- Bold menu logos: maxWidth tightened to 180px
- `galleryLabel` added to `IndustryDefaults` type + all 11 industry entries
- Gallery page uses industry-specific label: Our Work / Our Menu / Our Space / Our Portfolio / Our Collection / Our Studio / Our Projects
- All four live sites verified ✅

### ⚠️ SECURITY — Still Action Required
- Rotate GitHub PAT: github.com → Settings → Developer Settings → Personal Access Tokens
- Rotate Supabase service role key: supabase.com → Project Settings → API

### 🔜 What To Work On Next (In Order)

1. **Rotate security keys** — urgent, been pending since June 3
2. **Industry section manifest session** — Shawn walks team through all 11 industry types
3. **Photo curation session** — Shawn approves 15-20 photos per industry, team tags metadata
4. **Populate `industry_photo_pools` table** — after curation
5. **Build onboarding flow** — Angela's spec in ONBOARDING.md, all layouts exist, all photos ready

---

## Session: June 3, 2026 — Cinematic Animations + Navbar Fade Fix
**AI:** Claude Code (Sonnet 4.6) — desktop session
**Worked on:** Navbar transparent fade fix, Cinematic hero entrance animations, Ken Burns, scroll reveals

### ✅ Completed This Session

**Navbar transparent fade — root cause fixed:**
- Previous fix had `transparent` (= rgba(0,0,0,0)) transitioning to `#ffffff` — browser interpolated through gray-black
- Fix: `rgba(255,255,255,0)` → `#ffffff` — now fades through white only, smooth and clean
- Pushed to main ✅

**Cinematic hero entrance — staggered reveal (Jony approved):**
- Tagline fades up: 150ms delay
- Headline fades up: 300ms delay, 900ms duration, spring easing
- Color rule line draws across from center: 600ms delay (scale-x-reveal keyframe)
- Subtitle fades up: 750ms delay
- CTA buttons fade in: 950ms delay
- Scroll indicator fades in: 1200ms delay

**Ken Burns on hero image:**
- Hero background image gently scales 1.0 → 1.06 over 10s, infinite alternate
- Pure CSS `@keyframes ken-burns`, GPU-composited (transform only)
- Creates a live, cinematic feeling without being distracting

**Scroll reveals on every section (IntersectionObserver):**
- New reusable component: `src/components/InView.tsx` — works for any layout
- Services section, About section, Testimonials, Final CTA — all fade up as you scroll
- Desktop service cards stagger in with 60ms delay per card
- 650ms ease-out, triggers once at 12% visibility

### ⚠️ SECURITY — Still Action Required
The June 3 mobile session shared a GitHub PAT and Supabase service role key in the chat.
- Rotate GitHub PAT: github.com → Settings → Developer Settings → Personal Access Tokens
- Rotate Supabase service role key: supabase.com → Project Settings → API

### 🔜 What To Work On Next (In Order)

1. **Rotate security keys** (above) — do this before next session
2. **Verify animations on live site** — check rcbicycles.foundco.app after Vercel deploys
3. **Industry section manifest design session** — NOW priority (all 4 layouts exist)
4. **Onboarding flow** — spec ready in ONBOARDING.md, unblocked

---

## Session: June 3, 2026 — Logo Transition Fix Improved + Git Conflict Resolved (Desktop)
**AI:** Claude Code (Sonnet 4.6) — desktop session
**Worked on:** Reviewed BRIEF, improved mobile session's logo fix, resolved git conflict

### ✅ Completed This Session

**Logo transition fix — upgraded from mobile session's version:**
- Mobile session used single-logo `brightness-0 invert` with instant snap (no transition-all)
- Problem: ignored `logo_white_url`, abrupt background switch looked jarring
- New approach in `Navbar.tsx`:
  - If company has `logo_white_url`: staggered crossfade — white logo fades out in 150ms, color logo delayed 220ms so navbar is already white before it appears. No white box flash.
  - If company has only `logo_url`: CSS filter `brightness(0) invert(1)` with smooth 300ms transition
  - Restored `transition-all duration-300` on the header so navbar smoothly fades from transparent to white on scroll
- Resolved git conflict between mobile and desktop sessions
- Pushed to main ✅

**Gotsmoothie upload script (`scripts/upload-gotsmoothie-logo.mjs`):**
- Encoding corruption from mobile session (em dashes + checkmarks garbled)
- NOT committed — left unstaged, needs cleanup

### ⚠️ SECURITY — Action Required
The June 3 mobile session shared a GitHub PAT and Supabase service role key in the chat.
- Rotate GitHub PAT: github.com → Settings → Developer Settings → Personal Access Tokens
- Rotate Supabase service role key: supabase.com → Project Settings → API

### 🔜 What To Work On Next (In Order)

1. **Rotate security keys** (above) — do this before next session
2. **Verify logo fix on live site** — scroll test rcbicycles.foundco.app after Vercel deploys
3. **Industry section manifest design session** — NOW priority (all 4 layouts exist)
4. **Onboarding flow** — spec ready in ONBOARDING.md, unblocked

---

## Session: June 3, 2026 — All 4 Layouts Confirmed + Cinematic Navbar Flash Fixed
**AI:** Claude (Sonnet 4.6) — claude.ai chat interface
**Worked on:** Confirmed all 4 layouts built, RC Bicycles logo fixed, Cinematic navbar white flash resolved

### ✅ Completed This Session

**Layout system — fully confirmed:**
- All 4 layouts are built and wired: ImpactLayout, EditorialLayout, PortraitLayout, CinematicLayout ✅
- CHANGELOG was out of date — Portrait and Cinematic were built but docs not updated
- Client → layout mapping confirmed:
  - Barrio Builders → Impact (home_services + bold)
  - Blue Luna Events → Editorial (events + calm)
  - Got Smoothie → Portrait (food + warm)
  - RC Bicycles → Cinematic (retail + modern)
- Got Smoothie (gotsmoothie.foundco.app) and RC Bicycles (rcbicycles.foundco.app) confirmed live

**RC Bicycles logo — transparent PNG processed and uploaded:**
- Original logo had white background baked into PNG canvas
- White background removed via Python/Pillow — 75% of pixels now transparent
- Clean PNG uploaded to Supabase Storage: `logos/rcbicycles/logo.png`
- companies table updated with new logo_url

**Cinematic navbar logo white flash — root cause found and fixed:**
- Problem: on scroll, header snaps to white but logo transition lagged — white block visible behind logo
- Multiple band-aids tried and removed (mix-blend-mode, opacity stacking, wrapper div bg, stacking order flip)
- Final correct fix: stripped everything back to ONE img element
  - `brightness-0 invert` Tailwind classes when isOverlay (dark hero)
  - No filter, no classes when scrolled (white navbar)
  - Same DOM element the whole time — no stacking, no opacity juggling, no render flash
- Also removed `transition-all` from header — background now snaps instantly, no white rectangle fade

**Repo access pattern established for claude.ai sessions:**
- Repo cloned to container, changes made directly, pushed via git
- GitHub PAT configured for push access
- Supabase service role key used for storage uploads and DB updates
- ⚠️ SECURITY: rotate GitHub PAT + Supabase service role key — both were shared in this session

### ⏳ Still Pending

| Item | Status | Notes |
|---|---|---|
| Cinematic navbar flash | ⏳ Verify on live site | Check rcbicycles.foundco.app after deploy |
| Industry section manifest design session | ❌ Not designed | Shawn walks team through 11 industry types — this is NOW |
| Onboarding question flow | ❌ Not built | UNBLOCKED — all 4 layouts now exist. Spec in ONBOARDING.md |
| Site reveal moment | ❌ Not built | Needs onboarding first |
| Color palette preset UI | ❌ Not built | 12 swatches ready |

### 🔜 What To Work On Next (In Order)

1. **Verify Cinematic navbar fix** — scroll test on rcbicycles.foundco.app
2. **Industry section manifest session** — all 4 layouts exist, this is now the blocker
3. **Onboarding flow** — Angela's spec in ONBOARDING.md, ready to build
4. **Site reveal moment** — after onboarding is built

---


## Session: June 1, 2026 — Docs Completed + All Decisions Captured
**AI:** Claude Code (Sonnet 4.6)
**Worked on:** Verified all session decisions captured, missing docs added, security fix

### ✅ Completed This Session (addendum)

- DESIGN_DECISIONS.md: added vibe-aware mobile menu specs, logo sizing system, BrandMark scaling, Editorial layout full spec
- DECISIONS.md: added industry section manifests concept + design session requirements
- upload-blueluna-logo.mjs: removed hardcoded service role key (security fix)
- All docs verified complete before session close

### 🔜 What To Work On Next (In Order)

1. **Industry section manifest design session** — Shawn walks team through what each of the 11 industry types needs. Steve + Jony design the section library. Craig specs new schema fields. Angela updates onboarding questions per industry. This is the unlock for everything else.
2. **Portrait layout** — photography-forward, for balloon artists, food, visual businesses
3. **Cinematic layout** — high-energy, events, fitness
4. **Onboarding flow** — Angela's spec ready in ONBOARDING.md, build after all 4 layouts exist

---

## Session: June 1, 2026 — Editorial Layout + Blue Luna Events + Industry Manifests Discussion
**AI:** Claude Code (Sonnet 4.6) + Full Apple Team
**Worked on:** Editorial layout built and polished, Blue Luna Events as Instance #2, vibe-aware navbar, industry section manifest discussion opened

### ✅ Completed This Session

**Email system:**
- Customer auto-reply email built and deployed — when a visitor submits the estimate/contact form and includes their email, they immediately receive a confirmation from the Found client's business
- Owner notification email was already working (Resend + foundco.app domain already verified)

**Layout system architecture:**
- `src/types/layout.ts` — shared LayoutProps type
- `src/components/layouts/ImpactLayout.tsx` — extracted from page.tsx, Barrio Builders / contractors / bold vibes
- `src/components/layouts/EditorialLayout.tsx` — new, magazine aesthetic
- `page.tsx` — clean switch statement routes to correct layout by industry + vibe
- Portrait + Cinematic fall back to Impact until built

**Editorial layout (fully rebuilt after v1 was rejected):**
- Hero: full viewport split — white left (italic Playfair headline), full-height image right bleeds to edge, no overlay
- Mobile: full-width image (h-72) above text panel — no more blank white screen
- Section order: Hero → **About statement first** → Services (luxury menu rows) → Testimonials (oversized pull quotes) → CTA (photo)
- Different emotional journey from Impact — brand story leads, services follow
- Calm mobile menu: white slide-in panel, italic Playfair nav links (completely different from Impact's dark overlay)

**Blue Luna Events (Instance #2):**
- Ran full onboarding questions — events + calm → Editorial layout confirmed
- Seeded in Supabase: slug = `blueluna`, primary = #6ECECE, vibe = calm
- Real logo uploaded to Supabase Storage from local file
- Tiffany blue (#6ECECE) set as primary color — matched from actual logo
- Live at blueluna.foundco.app

**Vibe-aware Navbar:**
- BrandMark: font size + letter-spacing scales automatically with name length (long names no longer overflow)
- Calm/warm mobile menu: white slide-in panel, italic nav links, refined close button
- Bold/modern mobile menu: unchanged dark numbered overlay
- Logo shows in both mobile menus (was showing BrandMark only before)
- Logo sizing system: `maxHeight + maxWidth + object-contain` — works for wide, tall, and square logos at all sizes

**Palette update:**
- Teal swatch: `#00695C` → `#6ECECE` (Tiffany blue, confirmed from Blue Luna logo, works on both light and dark backgrounds)

### ⏳ Still Pending

| Item | Status | Notes |
|---|---|---|
| Industry section manifests | ❌ Not designed | Discussion opened — each industry needs different sections, different order, different data fields. Shawn to lead the design session with the team. |
| Portrait layout | ❌ Not built | Next after industry manifests |
| Cinematic layout | ❌ Not built | After Portrait |
| Onboarding question flow | ❌ Not built | Spec in ONBOARDING.md — blocked until all 4 layouts exist |
| Site reveal moment | ❌ Not built | Blocked until onboarding is built |
| Color palette preset UI | ❌ Not built | 12 swatches ready, needs onboarding screen |

### 🔜 What To Work On Next (In Order)

1. **Industry section manifest design session** — Shawn walks team through what each of the 11 industry types needs that we're not showing. Steve + Jony design the section library. Craig specs the new schema fields. This unlocks everything else.
2. **Portrait layout** — visual businesses (balloon artists, food, events with lots of photos)
3. **Cinematic layout** — high-energy businesses (fitness, events, nightlife)
4. **Onboarding flow** — Angela's full spec in ONBOARDING.md, ready to build once layouts are done

---

## Session: May 31, 2026 — Impact Layout Built + Full Site Polish
**AI:** Claude Code (Sonnet 4.6) + Full Apple Team
**Worked on:** Barrio Builders full site build, image system, Impact layout polish, section rhythm rule

### ✅ Completed This Session

**Documentation (permanent — never lose this again):**
- `DECISIONS.md` — every approved product decision, locked
- `DESIGN_DECISIONS.md` — every visual/UX decision Jony approved, including section rhythm rule
- `ONBOARDING.md` — full question flow, exact wording, tone, branching logic
- `BRIEF.md` updated — all 3 new docs added to required reading list

**Barrio Builders seed data (confirmed in Supabase):**
- Ran full onboarding questions for Michael / Barrio Builders
- Correct colors: #1EAB46 (green), #5F5F5F (gray), #C0C0C0 (silver)
- 6 services: Remodeling, Renovations, Painting, Drywall, Framing, Flooring
- 3 testimonials (2 English, 1 Spanish — Hablamos Español)
- 7 service areas: Tucson, Marana, Oro Valley, Sahuarita, Green Valley, Vail, Catalina Foothills
- Slug fixed: `barriobuilders` (no hyphen — matches subdomain)

**Infrastructure fixed:**
- `proxy.ts` confirmed as correct Next.js 16 middleware file (no middleware.ts needed)
- Build errors resolved
- Vercel deployment working at barriobuilders.foundco.app

**Pexels API integration:**
- `src/lib/pexels.ts` — fetchStockPhotos() returns pool of 5 photos per industry+vibe
- `src/lib/stockImages.ts` — shared getStockImages() utility: any page self-heals if pool is empty
- PEXELS_API_KEY added to Vercel + .env.local
- stock_images column added to website_config table in Supabase

**Impact layout polished (Jony approved):**
- Hero: 75vh/85vh desktop, 62% overlay, text-balance on headline
- Homepage rhythm: Photo→Light→Photo→White→Photo (alternating, no competing sections)
- Services teaser: capped at 3 on homepage, "View All →" inline link
- About strip: two-column redesign (name left, paragraph right, readable)
- Testimonials: white background, primary color top-border cards
- Final CTA: photo background with overlay

**All pages have imagery:**
- Homepage: hero, about strip, final CTA — photo. Services, testimonials — clean.
- About: header, final CTA — photo. Story, values, service areas, services preview — clean/solid.
- Services: header, final CTA — photo. Grid, how-it-works — clean.
- Contact: header — photo. Form — clean.
- Gallery: header — photo. Grid — clean.
- Estimate: header — photo. Form — clean.

**Section rhythm rule locked permanently:**
- Photos only in: page header + final CTA
- Mid-page sections: solid white, light, or #111111 only — never photo
- Rule is in DESIGN_DECISIONS.md and enforced by template design

**Pages rebuilt:**
- About page: full redesign (values strip, service areas as chips, services preview, strong CTA)
- Services page: full rebuild (photo header, 2-col cards with icon, How It Works 01/02/03 strip, photo CTA)
- Gallery: empty state redesigned (on-brand, phone CTA)

**Layout system discussed and approved:**
- 4 layout types defined: Impact, Editorial, Portrait, Cinematic
- Impact = Barrio Builders (home_services + bold) — built and polished ✅
- Editorial, Portrait, Cinematic — designed, not yet built

### ⏳ Still Pending

| Item | Status | Notes |
|---|---|---|
| Editorial layout | ❌ Not built | Designed this session — wellness, beauty, spa |
| Portrait layout | ❌ Not built | Designed this session — food, events, balloon artists |
| Cinematic layout | ❌ Not built | Designed this session — events, nightclubs, fitness |
| Onboarding question flow | ❌ Not built | Full spec in ONBOARDING.md — Angela + Craig own this |
| Color palette presets UI | ❌ Not built | 12 swatches approved by Jony, need onboarding screen |
| Site reveal moment | ❌ Not built | Choreographed first-look experience |
| "Built with Found" badge redesign | ❌ Not built | Current version is placeholder |
| Vercel wildcard *.foundco.app | ✅ Working | Confirmed live this session |
| Barrio Builders seed in Supabase | ✅ Done | Confirmed live this session |

### 🔜 What To Work On Next (In Order)

1. **Build Editorial layout** — Jony has the spec. First inner page that differs from Impact.
2. **Build Portrait layout** — balloon artists, food, visual businesses
3. **Build Cinematic layout** — events, fitness, high-energy
4. **Build onboarding question flow** — Angela's full spec is in ONBOARDING.md, ready to code
5. **Build site reveal moment** — the choreographed first-look experience
6. **Color palette preset UI** — 12 swatches for onboarding Q9

---

## Session: May 31, 2026 — Vision Reconstructed + Decision Docs Created
**AI:** Claude Code (Sonnet 4.6) + Full Apple Team
**Worked on:** Reconstructed lost session work, captured full product vision from Shawn, created permanent decision documentation system

### ✅ Completed This Session

**New files created:**
- `DECISIONS.md` — every approved product decision, dated, with reasoning. Locked unless Steve reopens.
- `DESIGN_DECISIONS.md` — every approved visual/UX decision Jony approved, with full reasoning and specs.
- `ONBOARDING.md` — full onboarding question flow, exact wording, tone guidelines, branching logic, Claude API content generation instructions.

**BRIEF.md updated:**
- Added DECISIONS.md, DESIGN_DECISIONS.md, ONBOARDING.md to Step 1 required reading list
- Added all three to Quick Reference table

**Vision captured from Shawn (May 31, 2026):**
- Found is for ALL small business types — balloon artists, barbers, food carts, aestheticians, T-shirt sellers from home, restaurants. Everyone.
- Onboarding feels like talking to a best friend — human, organic, natural, enthusiastic
- Two-flag system (❤️ website, ⭐ social), worker/admin roles, lead system with reply button — all confirmed
- Shopping cart upgrade: simplified, elegant, NOT Shopify. Apple-quality UX only.
- 5-minute break view: calm, ready, one tap. Not a dashboard.

**New creative decisions approved by the team (May 31, 2026):**
- "Built with Found" badge = growth engine, must feel premium (redesign pending)
- Site reveal moment = choreographed unboxing experience, personal message to owner
- Gallery = editorial/masonry portfolio, not a grid
- Dark mode per business = vibe system to support full-light and full-dark options
- Motion system = subtle arrival animations, nothing dramatic
- Showcase of real client sites needed for foundco.app credibility

**Phase structure clarified:**
- Phase 1: Build + perfect Barrio Builders website ✅ COMPLETE
- Phase 2: Onboarding flow (current)
- Phase 3: PWA features (camera, curation, admin, worker, gallery sync, social export)
- Phase 4: App Store (Capacitor)
- Phase 5: Billing, upgrades, marketing site

### ⏳ Still Pending

| Item | Status | Notes |
|---|---|---|
| Onboarding question flow — build it | ❌ Not built | ONBOARDING.md has full spec. Angela + Craig own this. |
| Layout engine — wire getLayout() to actual page differences | ❌ Not built | Currently computed but unused |
| Color palette presets — 10–12 Jony-approved swatches | ❌ Not built | Need names + hex values from Jony |
| Site reveal moment | ❌ Not built | Spec in DESIGN_DECISIONS.md |
| Gallery masonry layout | ❌ Not built | Spec in DESIGN_DECISIONS.md |
| Motion system | ❌ Not built | Spec in DESIGN_DECISIONS.md |
| "Built with Found" badge redesign | ❌ Not built | Current version is placeholder |
| Vercel wildcard subdomain *.foundco.app | ❌ Not configured | DNS + Vercel config needed |
| Barrio Builders seed data confirmed in Supabase | ❌ Not confirmed | seed-barrio.json exists but not verified as inserted |

### 🔜 What To Work On Next (In Order)

1. **Wire getLayout() to actual layout differences** — Jony must approve what each layout type (Impact, Editorial, Portrait, Cinematic) actually looks like on screen before onboarding ships
2. **Approve Jony's color palette presets** — 10–12 swatches with names for onboarding Q9
3. **Build the onboarding question flow** — Angela's spec is in ONBOARDING.md, ready to build
4. **Build the site reveal moment** — the choreographed first-look experience
5. **Confirm Barrio Builders seed data** and verify site loads at barriobuilders.foundco.app
6. **Configure Vercel wildcard subdomain** for *.foundco.app

---

## Session: May 29, 2026 — Docs Rebuilt + Vision Captured
**AI:** Claude Code (Sonnet 4.6)
**Worked on:** Rebuilt all missing project documentation from session conversation

### ✅ Completed This Session

**Documentation — All Created From Scratch**
- `BRIEF.md` — AI entry point, session rules, approval rules, quick reference
- `PROJECT.md` — full project intelligence: who, what, stack, schema, build order
- `PRODUCT_BRIEF.md` — complete product vision, features, pricing, upgrades, design standard
- `AGENTS.md` — full Apple-inspired team: Steve Jobs, Jony Ive, Phil Schiller, Angela Ahrendts, Craig Federighi, Priya Nair, Marcus Webb, Chris Lattner
- `TASKS.md` — execution board, Phase 2 now active (onboarding flow)
- `CHANGELOG.md` — this file
- `TEMP_SESSION_NOTES.md` — saved mid-session when battery died (can be deleted)

**Vision Captured from Shawn**
- Found Co. is a new entity — goal is App Store (Apple + Google)
- Core promise: answer questions → professional website generated automatically
- No tech skills, no drag-and-drop, no designers needed — under 10 minutes
- Every generated site must look like Apple built it (Jony Ive standard)
- Typography logo system for owners without a logo
- Jony Ive-inspired color palette presets + custom hex option
- Two-flag photo system: ❤️ website heart + ⭐ social star
- Upgrade features identified: shopping cart (Stripe), estimates/quotes, shared gallery link

**Prior Sessions Reconstructed**
- May 28 Session 1: Product strategy, Found Co. brand, Supabase schema, Next.js scaffold (in old barriobuilders repo)
- May 29 Session 2: Rebuilt as multi-tenant engine in new `found-websites` repo, switched to Vercel
- May 29 Session 3 (today): Onboarding question set discussed (undocumented — needs full recreate next session)

### ⏳ Still Pending

| Item | Status | Notes |
|---|---|---|
| Onboarding question set | ❌ Not documented | Was designed in prior session — needs Angela + Jony to recreate |
| Typography logo system | ❌ Not started | Jony to design, Marcus to build |
| Color palette system | ❌ Not started | ~10-12 Jony Ive-inspired presets + custom hex |
| Vercel wildcard subdomain | ❌ Not configured | *.foundco.app needs DNS + Vercel project config |
| Barrio Builders Supabase seed | ❌ Not confirmed | seed-barrio.json exists but not confirmed as inserted |
| TEMP_SESSION_NOTES.md | ✅ Can delete | Served its purpose — all info captured in these docs |

### 🔜 What To Work On Next (In Order)

1. **Recreate the onboarding question set** — Angela + Jony session (team discussion)
2. **Build typography logo system** — Jony designs, Marcus builds
3. **Build color palette system** — Jony-approved presets + custom hex
4. **Verify Barrio Builders seed data is in Supabase** — confirm site loads at barriobuilders.foundco.app
5. **Configure Vercel wildcard subdomain** for *.foundco.app

---

## Session: May 29, 2026 — Multi-Tenant Engine Built + Vercel Migration
**AI:** Claude Code (Sonnet 4.6)
**Worked on:** Rebuilt project as `found-websites`, multi-tenant routing, Vercel switch

### ✅ Completed This Session

- Created new repo: `found-websites` (replacing barriobuilders as the platform repo)
- Built multi-tenant routing system:
  - `src/proxy.ts` — reads hostname, rewrites to `/[slug]/*`
  - Handles `slug.foundco.app` subdomains and custom domains via `__domain__` prefix
- Built all client website pages dynamically from Supabase data:
  - `[slug]/page.tsx` — full homepage (hero, services, about strip, testimonials, final CTA)
  - `[slug]/about/page.tsx` — about page
  - `[slug]/services/page.tsx` — services page
  - `[slug]/gallery/page.tsx` — gallery page
  - `[slug]/contact/page.tsx` — contact page
  - `[slug]/estimate/page.tsx` + `EstimateForm.tsx` — estimate form → Supabase leads
  - `[slug]/layout.tsx` — wraps all pages with Navbar + Footer, injects company colors as CSS vars
- `src/lib/company.ts` — `getCompanyBySlug` + `getCompanyByDomain`
- `src/types/company.ts` — full TypeScript types: Company, WebsiteConfig, Intent system
- `src/components/Navbar.tsx` — sticky, mobile hamburger, logo-aware, dynamic CTA
- `src/components/Footer.tsx` — company info, links, Say It Marketing credit
- `scripts/seed-barrio.json` — Barrio Builders seed data for website_config
- Removed Netlify config — moved to Vercel
- Debugged Vercel/Supabase connection (test API route added and removed)

### 🔜 What To Work On Next

1. Onboarding flow — the core product feature
2. Typography logo + color palette system
3. Vercel wildcard subdomain configuration

---

## Session: May 28, 2026 — Kickoff (barriobuilders repo)
**AI:** Claude Code (Sonnet 4.6)
**Worked on:** Full product strategy, Found Co. brand, Supabase setup, Next.js scaffold

### ✅ Completed This Session

- Defined Found Co. product vision
- Locked app name (Found), company name (Found Co.), domain (foundco.app), tagline (Get Found.)
- Created full agent team in AGENTS.md
- Created PRODUCT_BRIEF.md with full vision
- Set up Supabase project (FOUND) — 7 tables, RLS, 3 storage buckets
- Seeded Barrio Builders as Instance #1
- Scaffolded Next.js 16 + Tailwind + Supabase in barriobuilders repo
- Created all project MD files in barriobuilders repo

---

## How To Update This File

At the end of every session add a new entry at the TOP:

```markdown
## Session: [Date] — [Topic]
**AI:** [Which AI / model]
**Worked on:** [Brief summary]

### ✅ Completed This Session
- Item 1

### ⏳ Still Pending
| Item | Status | Notes |

### 🔜 What To Work On Next (In Order)
1. First priority
```

**Rule:** No AI closes a session without updating this file.
**Rule:** "What To Work On Next" is always in priority order.
**Rule:** Never delete history — only add to it.

---

*This file is the memory of the project.*
*Read it before you start. Update it before you stop.*
