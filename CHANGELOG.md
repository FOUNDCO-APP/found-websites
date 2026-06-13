# CHANGELOG.md — Found Co. / found-websites
### Every AI must update this file at the end of every session.
### Read this at the START of every session to know exactly where things left off.

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
