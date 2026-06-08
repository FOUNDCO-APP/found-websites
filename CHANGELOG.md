# CHANGELOG.md — Found Co. / found-websites
### Every AI must update this file at the end of every session.
### Read this at the START of every session to know exactly where things left off.

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
