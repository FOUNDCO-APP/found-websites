# TASKS.md — Found Co. / found-websites
### Execution board — single source of truth for active work
*Last updated: June 4, 2026*

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
- Populate `industry_photo_pools` with curated photos for all 11 industries
- Complete industry section manifest decisions
- Build the onboarding question flow that generates a complete website
- Owner answers questions on their phone → site is live in under 10 minutes

Exit criteria:
1. All 11 industry photo pools populated (10+ photos each, approved by Shawn)
2. Industry section manifests decided for all 11 types
3. Owner can complete onboarding on mobile in under 10 minutes
4. A complete website is generated and live at [slug].foundco.app
5. Shawn approves the full flow end-to-end

---

## NOW (MAX 3)

1. **Curate photos in admin page** — foundco.app/admin/photos
   - Owner: Shawn
   - Status: ⏳ Ready — approve 8-15 photos per industry across all 11 tabs
   - Notes: Storage backend now works. Checkmarks persist. Go tab by tab.

2. **Rotate security keys**
   - Owner: Shawn
   - Status: ⚠️ Urgent — pending since June 3
   - Notes: Rotate GitHub PAT (github.com → Settings → Developer Settings → Personal Access Tokens) AND Supabase service role key (supabase.com → Project Settings → API)

3. **Curate photos in admin page**
   - Owner: Shawn (approves), team (already built the tool)
   - Status: ⏳ Ready — go to foundco.app/admin/photos once Vercel env var is set
   - Notes: Approve 10-15 photos per industry across all 11 tabs. This unblocks the onboarding photo picker.

---

## NEXT

1. Industry section manifest session — Shawn walks team through all 11 industry types
2. Build onboarding question flow (Angela's full spec in ONBOARDING.md)
3. Build site reveal moment (choreographed first-look experience)
4. Build color palette preset UI (12 Jony-approved swatches for onboarding Q9)
5. Claude API content generation from onboarding answers
6. Add sub-industry question to onboarding (drives photo matching + section manifests)

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
- ✅ Supabase schema + storage + RLS
- ✅ Next.js scaffold + Supabase connected
- ✅ Multi-tenant routing engine (proxy.ts)
- ✅ All client website pages (home, about, services, gallery, contact, estimate)
- ✅ Vercel deployment + wildcard subdomain
- ✅ Barrio Builders, Blue Luna Events, Got Smoothie, RC Bicycles — all live

---

## BLOCKED

- Onboarding photo picker — needs industry_photo_pools populated first
- Site reveal moment — needs onboarding flow first

---

## BACKLOG

1. Stripe subscription billing for Found Co. clients
2. In-app camera system (capture without touching personal camera roll)
3. Two-flag curation UI (❤️ heart + ⭐ star)
4. Admin PWA dashboard (view leads, manage workers, edit website settings)
5. Copy editing UI — tap any text on site to edit inline (Phase 3)
6. "Regenerate" copy via Claude API inside edit mode (Phase 3)
7. Worker PWA (upload-only flow)
8. Gallery auto-sync (hearted photo → appears on website automatically)
9. Social export pipeline (starred photo → sized for Instagram/Facebook)
10. "Built with Found" badge redesign
11. Gallery masonry layout — editorial/full-bleed (future upgrade)
12. Motion system — subtle arrival animations (beyond current InView)
13. Dark mode per business (full-light and full-dark vibe options)
14. Apple Developer Program ($99) + Capacitor → App Store + Google Play
15. foundco.app marketing site (Phil owns this)
16. USPTO trademark search + LLC formation (Shawn's to-do)
17. Sub-industry photo keyword scoring in photoPool.ts
18. PoolPhoto type update — add subject_tags, mood_tags, subcategory fields

---

## TEAM DISCUSSION ITEMS (PENDING)

- [ ] Full affirmations between onboarding questions — Angela to write exact wording
- [ ] Industry section manifests — what sections each of 11 industries needs beyond standard
- [ ] Sub-industry branching in onboarding (e.g., retail → bike shop / boutique / etc.)
- [ ] Upgrade pricing — monthly vs. one-time for cart, quotes, gallery link
- [ ] Progress indicator in onboarding — yes/no? (Steve: "if it needs a step counter, the flow is too long")
- [ ] Exact color palette presets — Jony to approve all 10-12 swatches with names
