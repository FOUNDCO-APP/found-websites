# TASKS.md — Found Co. / found-websites
### Execution board — single source of truth for active work
*Last updated: May 31, 2026*

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

1. **Build Editorial layout**
   - Owner: Jony (design) + Marcus (build)
   - Status: ⏳ Designed this session, not built
   - Notes: Split hero (text left, image right), service list rows instead of grid, generous white space, Playfair + Lato, calm/editorial feel. For wellness, beauty, spa businesses.

2. **Build Portrait layout**
   - Owner: Jony (design) + Marcus (build)
   - Status: ⏳ Designed this session, not built
   - Notes: Photography-forward, image fills top 60% of hero, text bottom-anchored. Masonry services, photo strip mid-page, split about section. For food, events, visual businesses, balloon artists.

3. **Build Cinematic layout**
   - Owner: Jony (design) + Marcus (build)
   - Status: ⏳ Designed this session, not built
   - Notes: True 100vh fullscreen hero, centered headline, horizontal scroll services on mobile, full-bleed about section, large single pull-quote testimonials. For events, fitness, high-energy businesses.

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
- ✅ Section rhythm rule locked (photo header + photo CTA only)
- ✅ All pages have imagery
- ✅ Permanent decision docs: DECISIONS.md, DESIGN_DECISIONS.md, ONBOARDING.md

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
