# TASKS.md — Found Co. / found-websites
### Execution board — single source of truth for active work
*Last updated: June 13, 2026*

---

## OPERATING RULES

1. Only one active phase at a time
2. Max 3 tasks in NOW
3. New ideas go to BACKLOG, not NOW
4. If a critical issue appears, pause and re-rank NOW
5. Update this file before ending every session

---

## CURRENT PHASE

**Phase 3: Billing Foundation**

Goals:
- Stripe subscription checkout at end of onboarding (14-day trial, card required)
- Subscription status stored in DB and reflected in company record
- Owner can manage billing via Stripe Customer Portal
- Plan gates in place (custom domain → Pro+, worker upload → Pro+)

Exit criteria:
1. `STRIPE_PRICE_ID_FOUND` env var set in Vercel (Shawn creates product in Stripe dashboard)
2. `STRIPE_WEBHOOK_SECRET` env var set in Vercel (Shawn registers webhook endpoint in Stripe)
3. migration-029 run in Supabase
4. Owner completes onboarding → sees billing card on reveal screen → enters card → trial activates
5. Webhook updates company `subscription_status` to `trialing`

**Phase 2: Onboarding Flow + Photo System — ✅ CLOSED June 12, 2026**

---

## NOW (MAX 3)

1. ✅ **migration-029 run** — `stripe_customer_id`, `plan`, `trial_ends_at`, `subscription_status` now on companies table.

2. ✅ **Stripe products + prices created** — Done programmatically via Node.js (no Stripe dashboard needed).
   - Found: `price_1ThvPQIiS1OcukjvJwIsqZXu` (monthly)
   - Found Pro: `price_1ThvPRIiS1OcukjvHAIAFtPE` (monthly)
   - Found Business: `price_1ThvPSIiS1Ocukjv2KB1o5tp` (monthly)
   - Yearly prices also created for all three
   - Env vars added to Vercel: `STRIPE_PRICE_ID_FOUND`, `STRIPE_PRICE_ID_FOUND_PRO`, `STRIPE_PRICE_ID_FOUND_BUSINESS`, `STRIPE_WEBHOOK_SECRET`

3. ✅ **Webhook registered** — `https://foundco.app/api/stripe/webhook` — signing secret in Vercel.

4. ✅ **Vercel + Supabase fully automated** — `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF` all in `.env.local`. Claude can now push env vars and trigger redeploys without Shawn touching dashboards.

5. ✅ **4 onboarding UX fixes** — see RECENTLY COMPLETED below.

---

## RECENTLY COMPLETED (June 13, 2026 — Phase 3 billing + UX polish)

3-2a. **Vercel + Supabase full automation** ✅
   - `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF` in `.env.local`
   - Claude can now add env vars to Vercel and trigger redeploys programmatically
   - Claude can now run SQL migrations via Supabase Management API — no SQL editor required

3-2b. **Stripe billing fully wired** ✅
   - All 3 products + 6 prices created in Stripe test mode via Node.js
   - Webhook registered at `https://foundco.app/api/stripe/webhook`
   - All env vars in Vercel and deployed

3-2c. **Smart logo lightness detection (Canvas API)** ✅ (commits `15257c1`, `c237030`)
   - `detectLogoLightness(url)` — samples non-transparent pixels, calculates average luminance
   - Light logo (avg > 190) → auto-sets `navbarDark: true`; confirmation reads "Light logo detected — navigation set to dark"
   - Dark logo (avg < 80) → keeps default light nav; shows Signal Green "✓ Your logo looks great on both backgrounds"
   - Unknown → shows original two-choice fork unchanged

3-2d. **Logo step copy cleanup** ✅ — Removed long explanatory paragraph below dual preview cards

3-2e. **Color step "From your logo" card** ✅
   - Logo-detected color now shown as a prominent card (48px swatch + hex + checkmark when selected)
   - Clear divider "Or choose a different color" before preset grid
   - Replaces the old small inline notification

3-2f. **Preview banner (?preview=true)** ✅
   - `src/components/PreviewBanner.tsx` — client component, fixed Signal Green bottom banner
   - Reads `?preview=true` from URL on mount; only shows if `subscription_status` is not active/trialing
   - "Start my free trial →" button calls `getPreviewCheckout(slug)` server action → Stripe Checkout URL
   - Wired into `src/app/[slug]/layout.tsx`
   - Reveal screen "See your site" link now opens `[slug].foundco.app?preview=true`
   - Regular visitors never see the banner (no `?preview=true` in their URL)

3-2g. **Company type updated** ✅ — Added `stripe_customer_id`, `plan`, `subscription_status`, `trial_ends_at` to `src/types/company.ts`

---

## RECENTLY COMPLETED (June 12, 2026 — Phase 3 kickoff)

3-1a. **Stripe SDK installed** ✅ — `npm install stripe`

3-1b. **migration-029 script created** ✅ — `scripts/migration-029-billing.sql` — adds `stripe_customer_id`, `plan`, `trial_ends_at`, `subscription_status` to companies. Run in Supabase SQL editor.

3-1c. **`stripeActions.ts` — createBillingSession** ✅ SHIPPED
   - Creates Stripe customer + saves `stripe_customer_id` to DB immediately
   - Creates Checkout Session: `mode: subscription`, 14-day trial, card required
   - `success_url`: owner's site `?trial=activated`, `cancel_url`: foundco.app
   - Returns `url` (null if `STRIPE_PRICE_ID_FOUND` not yet set — graceful skip)

3-1d. **Stripe webhook handler** ✅ SHIPPED — `src/app/api/stripe/webhook/route.ts`
   - `checkout.session.completed` → updates company: `subscription_status: trialing`, `plan: found`, `trial_ends_at`
   - `customer.subscription.updated/deleted` → syncs `subscription_status` by `stripe_customer_id`
   - Signature verification via `STRIPE_WEBHOOK_SECRET`

3-1e. **RevealScreen billing card** ✅ SHIPPED
   - `createBillingSession` called after `createOnboardingSite` succeeds
   - `checkoutUrl` passed to RevealScreen
   - Billing card appears at 1.4s delay (after email nudge): "14-day free trial / No charge today / $39/month after / Activate free trial →"
   - Gracefully absent if Stripe not yet configured (card simply doesn't render)

---

## RECENTLY COMPLETED (June 12, 2026)

3a. **Smart slug system** ✅ SHIPPED
   - `src/lib/slugify.ts`: shared client+server utility — camelCase splitting, `&/@/+` normalization
   - `src/app/onboarding/slugActions.ts`: `checkSlugAvailable()` — DB check + suggestion builder (city first, then studio/co/hq/shop/pro/lab/works)
   - Slug preview card on name step: green ✓ / red ✗, 650ms debounce, suggestion chips, custom input, reset link
   - Fallback chain at submit: preferred → preferred-city → preferred-4hexchars (no industry in slug ever)

3b. **Dark navbar mode** ✅ SHIPPED (migration-028 required)
   - `navbar_dark` boolean column on companies — white logos always show on dark nav
   - `Navbar.tsx`: full refactor with `isNavDark` + `isOnDark` logic
   - Onboarding logo step: "Keep my site dark" button; vibe step: dark/light nav toggle tiles

3c. **Two-logo onboarding system** ✅ SHIPPED
   - `uploadLogoFile` variant param: `"primary"` | `"light"` — second logo path `logo-light.{ext}`
   - Logo swap on save: both logos uploaded → `logo_url` = light-bg version, `logo_white_url` = dark-bg version
   - Onboarding UI: second upload zone appears conditionally

3d. **Welcome email on site creation** ✅ SHIPPED
   - `buildWelcomeEmail()` fires after successful insert, via Resend from `hello@foundco.app`
   - Includes: live URL, pages list, 3 next steps, connect-domain link

3e. **Connect domain page** ✅ SHIPPED
   - `/connect-domain?slug=x` — shows foundco.app subdomain, form to save custom domain, DNS instructions
   - Updates `website_config.custom_domain`; calls Vercel API if `VERCEL_API_TOKEN` + `VERCEL_PROJECT_ID` set

3f. **Autocomplete attributes** ✅ SHIPPED
   - `autoComplete="tel"` on phone inputs, `autoComplete="email"` on email inputs in onboarding

3g. **Mobile Call Us + logo shadow polish** ✅ SHIPPED
   - Mobile nav Call Us: now a real pill button with border + color
   - Logo drop-shadow strengthened: `0 1px 3px rgba(0,0,0,0.35)` + `0 0 6px rgba(0,0,0,0.20)`
   - CinematicLayout about: solid `#111111` dark, no competing stock photo

---

## RECENTLY COMPLETED (June 11, 2026)

3e. **Upload stuck bug — fixed** ✅ SHIPPED
   - Root causes: (1) Next.js server actions have 1MB default body limit — iPhone photos (3–15MB) silently killed the request; (2) no try/catch → any error = infinite spinner; (3) HEIC not in accept attribute
   - Fix: hero upload now resizes client-side with Canvas API (HEIC → JPEG, max 2400px, ~500KB output) BEFORE sending to server action. iOS Safari decodes HEIC into canvas natively.
   - Logo upload: try/catch + finally so spinner always stops. Sharp still runs server-side for dominant color extraction.
   - next.config.ts: `serverExternalPackages: ["sharp"]`, `experimental.serverActions.bodySizeLimit: "25mb"`
   - Both file inputs: `accept="image/*"` (was png/jpeg/webp only)

3. **Jony's contact visibility design** ✅ SHIPPED
   - Onboarding contact step: soft inline toggle per field — "✓ Shows on your contact page — tap to hide" / "Hidden from your site — tap to show"
   - "Send leads to a different number or email?" expander — lead_phone + lead_email routing
   - Question title: "What's your business phone and email?" (was "How do customers reach you?")
   - Hint text updated — was wrong ("Not shown publicly. Leads from your site go here.") — now "You control what shows publicly — each field has a toggle below it."
   - contact/page.tsx: gates phone/email display on phone_visible / email_visible flags
   - Migration: `scripts/migration-add-contact-visibility.sql` — 4 new columns on companies (DEFAULT true = existing sites unaffected) ✅ run June 11, 2026
   - TypeScript clean.

3b. **Phone numbers replaced with "Call Us" everywhere** ✅ SHIPPED
   - All 4 layout templates + services/menu/about pages: CTA sections now show ghost "Call Us" button with phone icon instead of raw number
   - Navbar desktop + both mobile drawer variants: raw phone number replaced with "Call Us" link
   - Contact page intentionally kept showing the number (now gated by phone_visible flag)

3c. **Admin copy panel — now shows all sites** ✅ SHIPPED
   - Was filtering `.eq("copy_generated", false)` — broke because migration set all existing sites to `true` by default
   - Fixed: removed filter, added AI/Fallback/Updated badge per row, empty state updated
   - copy_generated migration confirmed run June 10, 2026

4. **Angela's affirmations** ✅ SHIPPED
   - All 10 onboarding steps now have contextual Signal Green affirmations
   - New steps added: photos ("That's your hero. First thing people see."), logo ("Logo's in. It'll show at the top of every page."), color ("That color goes on every button and accent across your site."), testimonials ("Those go straight on your homepage.")
   - Improved existing: name → "That's the one.", description → "We know how to build this.", location → adds "that's your market. It goes everywhere.", contact → "Every button on your site goes here.", different → "That's your edge.", services → "that's your homepage lineup."

4. **Vocab wiring — inner pages** ✅ SHIPPED
   - `about/page.tsx`: "Our Story" → `vocab.aboutLabel`, "Our Services" (button + section heading) → `vocab.servicesLabel`, "send us a message and we'll be in touch." → `vocab.ctaBodyText`
   - `gallery/page.tsx`: `generateMetadata` title was hardcoded "Our Work" → now uses `vocab.galleryLabel`; body switched from `getIndustryDefaults` to `getVocab` for sub-industry accuracy
   - Confirmed: Molca's sub_industry = "food truck" matches vocab key exactly → all labels resolve correctly

---

## RECENTLY COMPLETED (June 10, 2026)

4. **Real file uploads — logo + hero photo** ✅ SHIPPED
   - Owner: Craig
   - `src/app/onboarding/uploadActions.ts` — `uploadLogoFile` + `uploadHeroFile` server actions, `company-assets` Supabase bucket (auto-created on first upload)
   - Logo step: real upload zone with preview + Replace link; "Not yet" still auto-advances to wordmark
   - Photos step: real upload zone + stock-photo fallback; uploaded photo used as hero_image_url
   - Pre-generated `sessionId` = company ID so uploads land at permanent path `logos/{id}/logo.{ext}` before site creation
   - Both URLs threaded through `createOnboardingSite` → saved to `companies.logo_url` + `website_config.hero_image_url`
   - MANUAL STEP REQUIRED: Create `company-assets` bucket in Supabase Storage → set Public = true (auto-created on first upload if permissions allow, but creating it manually first is safer)

---

1. **Build 4 priority new industries**
   - Owner: Craig + Marcus + Jony
   - Status: ✅ CODE COMPLETE — photo pools need Shawn curation
   - Notes: Creative Services, Home-Based Food, Education & Instruction, Music & Performance all added to: `industryManifests.ts` (manifests), `industryDefaults.ts` (values/process/CTA copy), `industryDetection.ts` (keyword detection + labels), `subIndustryVocabulary.ts` (already existed), `layout.ts` (layout matrix rows), `OnboardingFlow.tsx` (differentiator chips). TypeScript clean. REMAINING: photo pool JSON files need to be curated in a session with Shawn — save to Supabase Storage at `config/photo-pools/{industry}.json`.

2. **Menu page for food industry**
   - Owner: Craig + Marcus
   - Status: ✅ SHIPPED
   - Notes: `/[slug]/menu/page.tsx` built. `menu_items: MenuCategory[] | null` added to `WebsiteConfig` type. Navbar now shows "Menu" → `/menu` for food and home_based_food industries (all other industries keep "Services"). Falls back to `config.services` displayed in menu-list style if no `menu_items` yet. Services page header strings now use vocab too. TypeScript clean.

3. **Admin fallback copy alert + one-tap regenerate**
   - Owner: Craig + Priya
   - Status: ✅ SHIPPED — migration run June 10, 2026 ✅
   - Notes: `copy_generated: boolean` added to `GeneratedWebsiteContent`, `WebsiteConfig` type, and saved in onboarding action. `buildFallbackWebsiteContent` returns `false`, Claude success path returns `true`. Admin panel at `/admin/copy` — lists all sites with fallback copy, shows current hero subtitle so Shawn can see what's wrong, one-tap Regenerate calls server action → Claude rewrites all copy fields → updates DB live. MIGRATION REQUIRED: run `scripts/migration-add-copy-generated.sql` in Supabase SQL Editor before first use.

---

## RECENTLY COMPLETED

0c. **Sub-industry vocabulary table (June 10, 2026)**
   - Owner: Craig + Marcus
   - Status: ✅ Shipped. `src/lib/subIndustryVocabulary.ts` created.
   - Notes: ~120 sub-industries across 16 industry categories. Each entry maps to 9 vocabulary fields (servicesLabel, servicesOverline, aboutLabel, reviewsLabel, reviewsOverline, galleryLabel, ctaBodyText, customerWord, appointmentWord) plus websiteJob. Lookup function: exact → partial → industry default → global default.

0d. **7 job-family fallback copy templates (June 10, 2026)**
   - Owner: Angela + Craig
   - Status: ✅ Shipped. `buildFallbackWebsiteContent` in `src/lib/contentGeneration.ts` rebuilt.
   - Notes: Replaced broken function that used `manifest.primaryJob` (an internal instruction string) as visible hero subtitle and about text. Now 7 templates keyed to websiteJob — book_me, hire_me, quote_me, visit_me, order_from_me, trust_me, find_me. Each uses name + location + sub-industry label + differentiator substitution. No live site will show internal copy again.

0e. **Section labels wired into all 4 layout templates (June 10, 2026)**
   - Owner: Marcus + Craig
   - Status: ✅ Shipped. All 4 layouts updated.
   - Notes: ImpactLayout, EditorialLayout, PortraitLayout, CinematicLayout — all hardcoded section headers replaced with vocabulary table lookups. "What We Do" → `vocab.servicesOverline`. "Our Services" → `vocab.servicesLabel`. "Our Story" / "Who We Are" → `vocab.aboutLabel`. "What Clients Say" / "Client Stories" → `vocab.reviewsOverline`. "send us a message" CTA → `vocab.ctaBodyText`. "What Riders Say" hardcoded for RC Bicycles — fixed. TypeScript clean.

0. **Option B + C — Slide-up drawer + light question screens + save-spot lead capture (June 9, 2026)**
   - Owner: Jony + Angela + Craig + Shawn
   - Status: ✅ Shipped. Commit `7517ab7`. Vercel deployed.
   - Notes: Drawer slides up from homepage, dark/light/dark arc, X button + save-spot dialog, Resend follow-up email.

0b. **Supabase migration for save-spot lead capture (June 10, 2026)**
   - Owner: Shawn
   - Status: ✅ Completed. `scripts/migration-add-lead-type.sql` run in Supabase SQL editor.

1. **Homepage hero — all responsive issues resolved (June 8, 2026)**
   - Owner: Jony + Steve + Craig
   - Status: ✅ Completed and verified on Dell Latitude 5400 (Firefox full-screen), iPhone portrait, and iPad
   - Notes: FOUND wordmark moved from copy column to persistent nav header on all screen sizes (removed `md:hidden`). Removed `found-desktop-wordmark` div — freed ~92px, fixed Dell Latitude overflow. iPhone subtitle `<br />` added between sentences. START button absolute positioning removed from portrait CSS — now flows naturally. Categories margin `mt-16` → `mt-8`. Commits: `f0e2d61`, `1ad478f`.

1. **Onboarding — full visual rebuild in Found system (June 8, 2026)**
   - Owner: Jony + Angela + Craig
   - Status: ✅ Shipped, live on Vercel. Commit: `1fa6970`.
   - Notes: Pure Studio dark foundation, desktop two-column with live phone preview, `key={step}` transition animations, auto-advance on tap steps, Signal Green affirmations, ServiceChipInput, LocationInput with service area chips, GeneratingScreen (spinning ring + rotating lines), RevealScreen (full dark, phone mockup, green live indicator). No step counter, no back button. This is the foundation; Option B+C redesign is the active NOW task.

2. **Run Supabase sub_industry migration**
   - Owner: Shawn + Priya
   - Status: ✅ Completed June 4, 2026
   - Notes: `scripts/add-sub-industry.sql` was run in Supabase SQL Editor.

3. **Build onboarding question flow**
   - Owner: Angela + Craig + Marcus
   - Status: ✅ Core flow completed June 5, 2026
   - Notes: `/onboarding` asks Angela's core questions, saves companies/config records, uses Q2.5 sub-industry, and now generates copy through Claude API when configured.

4. **Site reveal moment**
   - Owner: Angela + Jony
   - Status: ✅ First pass completed June 6, 2026
   - Notes: Pure Studio / Signal Green reveal screen now appears after onboarding creates the site.

5. **Rotate security keys**
   - Owner: Shawn
   - Status: ✅ Completed June 4, 2026
   - Notes: GitHub PAT, Supabase service role key, and ADMIN_KEY rotated.

2. **Curate all industry photo pools**
   - Owner: Shawn + team
   - Status: ✅ Completed
   - Notes: All 11 industries curated, tagged, described, and saved to Supabase Storage `config/photo-pools/{industry}.json`.

3. **Approve all 12 industry manifests**
   - Owner: Shawn + Apple team
   - Status: ✅ Completed June 4, 2026
   - Notes: Jony-led meeting completed. Home Services, Food, Wellness, Events, Retail, Fitness, Beauty, Automotive, Pet Services, Cleaning, Landscaping, and Real Estate are approved.

4. **Build manifest code foundation**
   - Owner: Craig + Marcus
   - Status: ✅ Completed June 4, 2026
   - Notes: Added `src/lib/industryManifests.ts`, Real Estate defaults, Real Estate layout mapping, `contact` intent, and `sub_industry` type support.

5. **Build onboarding save foundation**
   - Owner: Angela + Craig + Marcus
   - Status: ✅ Completed June 4, 2026
   - Notes: `/onboarding` now creates `companies` and `website_config` records with Q2.5 sub-industry.

6. **Add color and vibe onboarding steps**
   - Owner: Jony + Angela + Craig
   - Status: ✅ Completed June 4, 2026
   - Notes: Q9 palette and Q10 vibe choices now save to `companies.primary_color` and `companies.vibe`.

7. **Add logo, photo, and testimonial onboarding steps**
   - Owner: Jony + Angela + Craig
   - Status: ✅ Completed June 4, 2026
   - Notes: Flow supports BrandMark/launch-now choices, curated photo fallback, and optional testimonials saved to `website_config`.

---

## NEXT

1. **E2E billing test** — go through onboarding on real device, hit billing card on reveal screen, use Stripe test card `4242 4242 4242 4242`, confirm webhook fires, confirm `subscription_status → trialing` in Supabase companies table, confirm preview banner disappears after.
2. **Add Vercel env vars for domain API** — `VERCEL_API_TOKEN` + `VERCEL_PROJECT_ID` in Vercel dashboard → enables automatic domain registration when owner uses /connect-domain.
3. **Photo pool curation for 10 new industries** — requires curation session with Shawn at /admin/photos. Industries: creative_services, home_based_food, education, music_performance, professional_services, healthcare, childcare, makers_crafts, home_property, nonprofit.
4. **"Your copy was auto-generated" nudge** — backlog 1j. `copy_generated` flag exists. Owner sees quiet prompt in app: "Want Claude to write a custom version?" One tap to trigger regenerate.
5. **Differentiator suggestions** — Industry-specific helper chip content review and refinement (foundation built in `DIFFERENTIATOR_CHIPS` in OnboardingFlow.tsx).

---

## COMPLETED THIS PHASE

- ✅ All 4 layout types built and Jony-approved (Impact, Editorial, Portrait, Cinematic)
- ✅ All 4 layouts: personality-matched hero entrance animations
- ✅ All 4 layouts: InView scroll reveals on every section
- ✅ Gallery rebuilt platform-wide — masonry, lightbox, swipe, keyboard nav
- ✅ Gallery label per industry (Our Work / Our Menu / Our Space / Our Portfolio / etc.)
- ✅ GalleryLightbox — tap → full screen, swipe, arrows, counter, keyboard
- ✅ Navbar fixed everywhere — 160×48px logo containers, no overflow ever
- ✅ Navbar transparent/fixed only on Cinematic homepage, sticky on all inner pages
- ✅ Logo crossfade — background transitions first, logos swap on white background
- ✅ RC Bicycles logos — original clean PNGs restored, mobile session damage undone
- ✅ Hamburger stagger — bold menu items slide in 90ms apart
- ✅ prefers-reduced-motion — Ken Burns, InView, hero entrances all respect it
- ✅ galleryLabel per industry added to industryDefaults
- ✅ Admin photo curator built at /admin/photos
- ✅ All 11 industry photo pools curated, tagged, described, and approved
- ✅ All 12 industry section manifests approved
- ✅ Real Estate added as the 12th approved industry
- ✅ Manifest config foundation added in `src/lib/industryManifests.ts`
- ✅ `contact` CTA intent added
- ✅ Real Estate support added to layout, defaults, Pexels fallback, and photo curator
- ✅ `scripts/add-sub-industry.sql` created
- ✅ Supabase `companies.sub_industry` migration run
- ✅ `/onboarding` route added with Q2.5 and save action
- ✅ Color palette and vibe onboarding steps added
- ✅ Logo/BrandMark, photo fallback, and testimonial onboarding steps added
- ✅ Claude API content generation from onboarding answers with deterministic fallback
- ✅ Supabase schema + storage + RLS
- ✅ Next.js scaffold + Supabase connected
- ✅ Multi-tenant routing engine (proxy.ts)
- ✅ All client website pages (home, about, services, gallery, contact, estimate)
- ✅ Vercel deployment + wildcard subdomain
- ✅ Barrio Builders, Blue Luna Events, Got Smoothie, RC Bicycles — all live

---

## BLOCKED

- Photo pool curation for 10 new industries — requires curation session with Shawn

## RECENTLY UNBLOCKED

- ✅ **Google Places API city autocomplete** — FIXED June 15, 2026. Root cause: API key had HTTP referrer restriction set in Google Cloud Console, which blocks server-side fetch calls. Shawn changed to "None" restriction. No code changes needed. Works in prod.

---

## BACKLOG

— **INDUSTRY EXPANSION —**
✅ All 22 industries built (June 10, 2026)
- Photo pools still needed for 10 new industries (requires Shawn curation session)

---

— **PHASE 3 — BILLING (next up after Phase 2 closes)** —

Pricing approved June 12, 2026:
- Found: $39/month | $350/year — base plan
- Found Pro: $69/month | $620/year — custom domain + team + client tools
- Found Business: $99/month | $890/year — booking + quotes + unlimited workers
- Founding Member: $29/month locked forever — first 25 clients
- 14-day free trial, card required at onboarding, charged day 15

3-1. **Stripe subscription checkout** — at end of onboarding, Stripe Checkout modal, 14-day trial, card required
3-2. **Subscription status in DB** — `companies.stripe_customer_id`, `companies.plan`, `companies.trial_ends_at`, `companies.subscription_status`
3-3. **Billing portal** — owner can upgrade / downgrade / cancel (Stripe Customer Portal)
3-4. **Plan gates** — custom domain gated to Pro+, worker upload gated to Pro+, booking/quotes gated to Business
3-5. **Founding Member flow** — special coupon code or flagged pricing for first 25

---

— **PHASE 4 — PHOTO PIPELINE** (core feature, ALL plans) —

The photo pipeline is the daily habit that keeps owners subscribed. One action → four uses:
website content + social media + quotes/estimates + client galleries.

Why it matters (Shawn, June 12):
- Fresh photos on website = Google sees active business = better local SEO
- Photos stay in Found, NOT cluttering personal camera roll
- Same job photos attach to quotes/estimates — more credible proposals
- Owner can share gallery links with clients instead of texting 20 photos
- Star a photo → sized for Instagram (1080×1350) + Facebook (1080×1080) instantly

4-1. **In-app camera** — capture without touching personal camera roll. Photo goes straight into Found library.
4-2. **Owner photo library** — all uploaded/captured photos in one grid view. Untagged by default.
4-3. **❤️ Heart → website** — heart any photo → auto-syncs to gallery or hero on live site. Unheart → removes it.
4-4. **⭐ Star → social** — star any photo → generates sized JPEGs for IG (1080×1350) + FB (1080×1080). Downloadable instantly.
4-5. **Worker upload app** — upload-only PWA. Worker submits photos, owner hearts/stars them. Worker has NO site access.
4-6. **Client gallery share** — owner selects photos → generates shareable link → client views gallery in browser (no app needed)
4-7. **Quote photo attachments** — attach hearted/starred photos directly to estimate/quote PDFs

---

— **PHASE 5 — REVENUE TOOLS** —

5-1. **Online booking / scheduling** — clients book appointments directly from website. Found Business.
5-2. **Quote & estimate system** — request form → owner builds estimate with photos → client approves → deposit → invoice. Found Business.
5-3. **Review collection** — post-job automated text/email: "How did we do?" → 5 stars → Google review link. Found Business.
5-4. **Contact database** — leads, current clients, past clients, notes. Found Pro.
5-5. **Lead follow-up** — automated email/text when contact form submitted. Found Pro.
5-6. **Copy regeneration** — owner taps "Rewrite this section" → Claude rewrites using original answers. Found Pro.
5-7. **Copy editing** — tap any text on site to edit inline. Text only, layout immutable. Found Pro.

---

— **PHASE 6 — ADD-ONS** —

6-1. **Online Menu** — food businesses. Item photos, prices, categories. +$10/month.
6-2. **Shopping Cart** — sell products via Stripe. Retail, makers, crafts. +$25/month.
6-3. **Second Location** — additional location page. +$25/month per location.
6-4. **Email marketing sequences** — simple follow-up campaigns. +$20/month.

---

— **INFRASTRUCTURE / PLATFORM** —
- Google Places API city autocomplete — BLOCKED on Shawn getting API key
- Curate Real Estate photo pool
- Apple Developer Program ($99) + Capacitor → App Store + Google Play
- foundco.app marketing site (Phil owns this)
- USPTO trademark search + LLC formation (Shawn's to-do)
5. Estimates & Quotes upgrade — quote approval, deposit, final invoice, final payment, receipt
6. Shopping cart upgrade — simple Stripe-powered product sales
7. Online menu upgrade — food/restaurant menu, item photos, prices, optional ordering path
8. In-app camera system (capture without touching personal camera roll)
9. Two-flag curation UI (❤️ heart + ⭐ star)
10. Admin PWA dashboard (view leads, contacts, manage workers, edit website settings)
11. Copy editing UI — tap any text on site to edit inline (Phase 3)
12. "Regenerate" copy via Claude API inside edit mode (Phase 3)
13. Worker PWA (upload-only flow)
14. Gallery auto-sync (hearted photo → appears on website automatically)
15. Social export pipeline (starred photo → sized for Instagram/Facebook)
16. "Built with Found" badge redesign
17. Gallery masonry layout — editorial/full-bleed (future upgrade)
18. Motion system — subtle arrival animations (beyond current InView)
19. Dark mode per business (full-light and full-dark vibe options)
20. Apple Developer Program ($99) + Capacitor → App Store + Google Play
21. foundco.app marketing site (Phil owns this)
22. USPTO trademark search + LLC formation (Shawn's to-do)
23. Sub-industry photo keyword scoring in photoPool.ts
24. PoolPhoto type update — add subject_tags, mood_tags, subcategory fields

---

## TEAM DISCUSSION ITEMS (PENDING)

- [ ] Full affirmations between onboarding questions — Angela to write exact wording
- [x] Industry section manifests — what sections each of 12 industries needs beyond standard
- [x] Sub-industry branching decision (e.g., retail → bike shop / boutique / etc.)
- [x] Pricing during onboarding — industry-specific, not global
- [x] Hours/location during onboarding — required only for visit-based businesses
- [x] Testimonials — optional for every industry
- [x] Contact database phase — Phase 2 foundation, Phase 3 dashboard
- [ ] Upgrade pricing — monthly vs. one-time for cart, quotes, gallery link
- [ ] Progress indicator in onboarding — yes/no? (Steve: "if it needs a step counter, the flow is too long")
- [x] Exact color palette presets — 12 swatches approved and added to onboarding
