# TASKS.md — Found Co. / found-websites
### Execution board — single source of truth for active work
*Last updated: June 8, 2026*

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

0. **Run Supabase migration for save-spot lead capture**
   - Owner: Shawn (manual step in Supabase SQL editor)
   - Status: READY — script at `scripts/migration-add-lead-type.sql`
   - Notes: Makes company_id nullable, adds type + partial_answers columns to leads table. Required before save-spot dialog can save leads. Without this, the DB insert will fail.

1. **Wire Google Places API for city autocomplete**
   - Owner: Craig + Shawn
   - Status: Stub in place. Waiting for Shawn to get Google Maps API key from Google Cloud Console.
   - Notes: Restrict key to Places API + foundco.app + localhost. Server-side proxy at `/api/places`. Replace current city `<input>` in LocationInput component. Show nearby service area chips after city selection. See `// TODO: Replace city <input> with Google Places Autocomplete` in OnboardingFlow.tsx.

---

## RECENTLY COMPLETED

0. **Option B + C — Slide-up drawer + light question screens + save-spot lead capture (June 9, 2026)**
   - Owner: Jony + Angela + Craig + Shawn
   - Status: ✅ Shipped. Commit `7517ab7`. Vercel deploying.
   - Notes: Drawer slides up from homepage, dark/light/dark arc, X button + save-spot dialog, Resend follow-up email. Migration still needs to be run in Supabase.

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

0. **Angela's affirmations** — Write exact wording for each onboarding step affirmation. System must be visually stable (Option B) before wording session. Angela owns content, Jony approves display.
1. **Real file uploads** — Logo upload and hero photo upload wired to Supabase Storage. Currently "I have a logo / I'll add it later" stubs only.
2. **Logo color extraction** — After logo upload, suggest a palette from the logo's dominant color before Q9 color picker.
3. **FOUND wordmark size decision** — Nav wordmark is now h-8 w-44 (smaller than the old h-14 w-[330px] desktop version). Shawn said "not sure how I feel about it yet." Revisit after Option B+C ships.
4. **Differentiator suggestions** — Industry-specific helper chip content review and refinement (foundation built in `DIFFERENTIATOR_CHIPS` in OnboardingFlow.tsx).

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

- Real onboarding file uploads — logo, hero photo/video, and gallery uploads still use launch-now choices only

---

## BACKLOG

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
