# CHANGELOG.md — Found Co. / found-websites
### Every AI must update this file at the end of every session.
### Read this at the START of every session to know exactly where things left off.

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
