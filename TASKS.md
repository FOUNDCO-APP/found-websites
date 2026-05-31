# TASKS.md — Found Co. / found-websites
### Execution board — single source of truth for active work
*Last updated: May 29, 2026*

---

## OPERATING RULES

1. Only one active phase at a time
2. Max 3 tasks in NOW
3. New ideas go to BACKLOG, not NOW
4. If a critical issue appears, pause and re-rank NOW
5. Update this file before ending every session

---

## CURRENT PHASE

**Phase 2: Onboarding Flow — Answer Questions → Generate Site**

Goal:
- Build the onboarding question flow that generates a complete website
- Owner answers questions on their phone → site is live in under 10 minutes
- No technical knowledge required — owner never sees the backend
- Every generated site must look like Apple built it

Exit criteria:
1. Owner can complete onboarding on mobile in under 10 minutes
2. A complete website is generated and live at `[slug].foundco.app`
3. Typography logo renders correctly when no logo is uploaded
4. Jony Ive approves the design of every generated output
5. Shawn approves the full flow end-to-end

---

## NOW (MAX 3)

1. **Design the onboarding question set**
   - Owner: Angela + Jony
   - Status: ⏳ Not started
   - Notes: Question set was designed in a prior undocumented session — needs to be rebuilt. Angela designs the questions and flow. Jony approves the UI. Questions feed directly into website_config in Supabase.

2. **Build the typography logo system**
   - Owner: Jony + Marcus
   - Status: ⏳ Not started
   - Notes: When owner has no logo, their business name renders as a beautiful typography-based logo. Must look premium, not like a placeholder. System should support different business name lengths.

3. **Build the Jony Ive color palette system**
   - Owner: Jony + Marcus
   - Status: ⏳ Not started
   - Notes: ~10-12 preset palettes, Apple/Jony Ive inspired. Each has a primary + accent. Plus a custom hex option for owners who already have brand colors. Palette selection happens during onboarding.

---

## NEXT

1. In-app camera system (capture photos without touching personal camera roll)
2. Two-flag curation UI — heart ❤️ (website) and star ⭐ (social)
3. Admin PWA dashboard (view leads, manage workers, website settings)
4. Worker PWA (upload-only flow)
5. Gallery auto-sync — hearted photo → appears on website automatically
6. Social export pipeline — starred photo → sized for Instagram/Facebook
7. Vercel wildcard subdomain setup for `*.foundco.app`
8. Seed Barrio Builders data into Supabase and confirm site loads at barriobuilders.foundco.app

---

## BLOCKED

- Onboarding question set — needs Angela + Jony discussion before building
- Vercel wildcard subdomain — needs DNS config on Namecheap + Vercel project settings
- Barrio Builders custom domain — barriobuilders.com still on Namecheap host

---

## BACKLOG

1. Stripe subscription billing for Found Co. clients (Phase 2)
2. Upgrade feature: Shopping cart (Stripe product listings)
3. Upgrade feature: Estimates & quotes (create + send to clients)
4. Upgrade feature: Shared gallery link (shareable project progress link for clients)
5. Upgrade feature: Additional pages (blog, FAQ, team, service areas)
6. Upgrade feature: Human design session (one-time paid design review)
7. Admin dashboard — view all leads, manage workers, edit website settings
8. Worker account system + invite flow
9. Apple Developer Program ($99) + Capacitor → App Store + Google Play
10. foundco.app marketing site (Phil owns this)
11. USPTO trademark search + LLC formation (Shawn's to-do)
12. Spa Mambo as Instance #2
13. Dog & Cat Groomer as Instance #3
14. Blog/SEO pages for Barrio Builders

---

## TEAM DISCUSSION ITEMS (PENDING)

The following need a full team discussion before we can spec or build:

- [ ] **Full onboarding question set** — Angela to design, Jony to approve UI, Steve to approve flow
- [ ] **Upgrade pricing** — what are the monthly vs. one-time prices for cart, quotes, gallery link?
- [ ] **What other upgrades are we missing?** — what would a contractor, groomer, or event company pay for?
- [ ] **Template variety** — do we have 1 template (perfect, Apple quality) or 3 options?
- [ ] **AI content fill** — Claude API prompt strategy for pre-filling services, about text, headlines

---

## SESSION UPDATE TEMPLATE

```md
### Session Update (YYYY-MM-DD)
- Done:
  - ...
- Moved to NEXT:
  - ...
- Added to BACKLOG:
  - ...
- Blockers:
  - ...
```
