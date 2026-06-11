# TASKS.md — Found Co. / found-websites
### Execution board — single source of truth for active work
*Last updated: June 11, 2026 (evening)*

---

## OPERATING RULES

1. Only one active phase at a time
2. Max 3 tasks in NOW
3. New ideas go to BACKLOG, not NOW
4. If a critical issue appears, pause and re-rank NOW
5. Update this file before ending every session

---

## CURRENT PHASE

**Phase 2: Onboarding Flow + Photo System**

Goals:
- Populate photo pools with curated photos for the active industries
- Complete industry section manifest decisions
- Build the onboarding question flow that generates a complete website
- Owner answers questions on their phone → site is live in under 10 minutes

Exit criteria:
1. Original 11 industry photo pools populated (10+ photos each, approved by Shawn) ✅
2. Industry section manifests decided for all 12 types ✅
3. Owner can complete onboarding on mobile in under 10 minutes
4. A complete website is generated and live at [slug].foundco.app
5. Shawn approves the full flow end-to-end

---

## NOW (MAX 3)

1. **End-to-end flow test** — Shawn tests full onboarding on his phone: name → industry → location → services → photo upload → logo upload → color (auto-detected) → vibe → submit → reveal screen → live site. Phase 2 exit criterion #5.

2. **Photo pool curation for 10 new industries** — blocked on session with Shawn. All 10 new industries coded but photo pools empty; stock fallback runs instead.

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

1. **Wire Google Places API for city autocomplete** — Stub in place. BLOCKED: waiting for Shawn to get API key from Google Cloud Console (Places API, restrict to foundco.app + localhost). Server-side proxy at `/api/places`. See `// TODO` in OnboardingFlow.tsx.
2. **Differentiator suggestions** — Industry-specific helper chip content review and refinement (foundation built in `DIFFERENTIATOR_CHIPS` in OnboardingFlow.tsx).
3. **Photo pool curation for 10 new industries** — blocked on session with Shawn. Save to Supabase Storage at `config/photo-pools/{industry}.json`.
4. **"Your copy was auto-generated" nudge** — backlog 1j. `copy_generated` flag exists. Owner sees quiet prompt in app: "Want Claude to write a custom version?" One tap to trigger regenerate.

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

- Google Places API city autocomplete — waiting on Shawn to create API key in Google Cloud Console
- Photo pool curation for 10 new industries — requires curation session with Shawn

---

## BACKLOG

— **INDUSTRY EXPANSION —**
✅ All 22 industries built (June 10, 2026): home_services, food, wellness, events, retail, fitness, beauty, automotive, pet_services, cleaning, landscaping, real_estate, creative_services, home_based_food, education, music_performance, professional_services, healthcare, childcare, makers_crafts, home_property, nonprofit
- Photo pools still needed for the 10 new industries (requires Shawn curation session)

— **OWNER APP — PHASE 3 —**
1h. Owner copy editing — tap any section title to rename it. Tap any copy block to edit inline. Tap, type, done. Feels like texting. Text editable, layout immutable. Cannot delete sections or break structure.
1i. Claude regeneration from owner app — owner taps "Regenerate this section" → Claude rewrites it using their original onboarding answers + any edits they've made since. Premium upgrade path.
1j. "Your copy was auto-generated" nudge — if `copy_generated: false`, owner sees a quiet prompt in their app: "Want Claude to write a custom version?" One tap to trigger.

— **EXISTING BACKLOG —**
1. Stripe subscription billing for Found Co. clients
2. Lightweight contact database — leads, current clients, previous clients, guest/customer names
3. Relationship automation upgrade — simple compliant email/text follow-up for contacts
4. Curate Real Estate photo pool
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
