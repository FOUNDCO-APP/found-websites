# TASKS.md — Found Co. / found-websites
### Execution board — single source of truth for active work
*Last updated: June 3, 2026**

---

## OPERATING RULES

1. Only one active phase at a time
2. Max 3 tasks in NOW
3. New ideas go to BACKLOG, not NOW
4. If a critical issue appears, pause and re-rank NOW
5. Update this file before ending every session

---

## CURRENT PHASE

**Phase 2: Onboarding Flow + Layout System**

Goals:
- Build the 3 remaining layout types (Editorial, Portrait, Cinematic)
- Build the onboarding question flow that generates a complete website
- Owner answers questions on their phone → site is live in under 10 minutes
- Every generated site must look like Apple built it

Exit criteria:
1. All 4 layout types built and Jony-approved
2. Owner can complete onboarding on mobile in under 10 minutes
3. A complete website is generated and live at [slug].foundco.app
4. Shawn approves the full flow end-to-end

---

## NOW (MAX 3)

1. **Industry section manifest design session**
   - Owner: Steve (product) + Jony (design) + Shawn (domain knowledge)
   - Status: ⏳ Discussion opened June 1 — not yet designed
   - Notes: Each of the 11 industry categories needs its own section manifest. All 4 layouts now exist — this is the last blocker before onboarding.

2. **Build onboarding question flow**
   - Owner: Angela (UX) + Craig (build)
   - Status: ⏳ UNBLOCKED — all 4 layouts now exist
   - Notes: Full spec in ONBOARDING.md. Owner answers questions on phone → site live in under 10 min.

3. **Verify Cinematic navbar fix**
   - Owner: Shawn
   - Status: ⏳ Deployed June 3 — needs live test
   - Notes: Check rcbicycles.foundco.app scroll behavior. Logo should transition cleanly white→color with no white block flash.

---

## NEXT

1. Build onboarding question flow (Angela's full spec in ONBOARDING.md)
2. Build site reveal moment (choreographed first-look experience)
3. Build color palette preset UI (12 Jony-approved swatches for onboarding Q9)
4. Build typography logo system (BrandMark refined for onboarding preview)
5. Pexels photo selection during onboarding (show 3 stock options, owner picks or skips)
6. Claude API content generation from onboarding answers (hero_title, hero_subtitle, about_text, service descriptions)

---

## COMPLETED THIS PHASE

- ✅ Supabase schema + storage + RLS
- ✅ Next.js scaffold + Supabase connected
- ✅ Multi-tenant routing engine (proxy.ts)
- ✅ All client website pages (home, about, services, gallery, contact, estimate)
- ✅ Vercel deployment + wildcard subdomain (barriobuilders.foundco.app live)
- ✅ Barrio Builders seed data confirmed in Supabase
- ✅ Pexels API integration (5-photo pool, self-healing, all pages)
- ✅ Impact layout built and Jony-approved (Barrio Builders)
- ✅ Editorial layout built and Jony-approved (Blue Luna Events)
- ✅ Layout component system (ImpactLayout, EditorialLayout, page.tsx switch)
- ✅ Section rhythm rule locked (photo header + photo CTA only)
- ✅ All pages have imagery
- ✅ Vibe-aware Navbar (calm = white menu, bold = dark menu)
- ✅ Logo sizing system (maxHeight+maxWidth+object-contain — works for all logo shapes)
- ✅ BrandMark scales with name length
- ✅ Customer auto-reply email on lead submission
- ✅ Blue Luna Events (Instance #2) — live at blueluna.foundco.app
- ✅ Teal palette updated to #6ECECE (Tiffany blue)
- ✅ Permanent decision docs: DECISIONS.md, DESIGN_DECISIONS.md, ONBOARDING.md
- ✅ Portrait layout built (Got Smoothie — food + warm)
- ✅ Cinematic layout built (RC Bicycles — retail + modern)
- ✅ All 4 layouts live: Impact, Editorial, Portrait, Cinematic
- ✅ RC Bicycles logo — white bg removed, transparent PNG in Supabase
- ✅ Cinematic navbar logo flash fixed — single img, CSS filter only, no stacking

---

## BLOCKED

- Onboarding flow — Editorial/Portrait/Cinematic layouts must exist before onboarding ships (the site reveal moment needs to render correctly for every business type)
- Site reveal moment — needs onboarding flow to exist first

---

## BACKLOG

1. Stripe subscription billing for Found Co. clients
2. In-app camera system (capture without touching personal camera roll)
3. Two-flag curation UI (❤️ heart + ⭐ star)
4. Admin PWA dashboard (view leads, manage workers, edit website settings)
5. Worker PWA (upload-only flow)
6. Gallery auto-sync (hearted photo → appears on website automatically)
7. Social export pipeline (starred photo → sized for Instagram/Facebook)
8. "Built with Found" badge redesign (current is placeholder)
9. Gallery masonry layout (editorial, full-bleed capability)
10. Motion system (subtle arrival animations)
11. Dark mode per business (full-light and full-dark vibe options)
12. Apple Developer Program ($99) + Capacitor → App Store + Google Play
13. foundco.app marketing site (Phil owns this)
14. USPTO trademark search + LLC formation (Shawn's to-do)
15. Spa Mambo as Instance #2
16. Dog & Cat Groomer as Instance #3

---

## TEAM DISCUSSION ITEMS (PENDING)

- [ ] Full affirmations between onboarding questions — Angela to write exact wording for each
- [ ] Upgrade pricing — monthly vs. one-time for cart, quotes, gallery link
- [ ] Template variety — does each layout have sub-variants or is one per layout enough?
- [ ] What other upgrade features are we missing?
