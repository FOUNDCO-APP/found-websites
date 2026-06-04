# PROJECT.md — Found Co. / found-websites
### Read this every session. Every AI. Every time.
*Last updated: June 6, 2026*

---

## WHO YOU ARE WORKING FOR

**Shawn Lopez** — Owner, Say It Marketing, Tucson AZ. In business since 1999.
Web design, branding, SEO, hosting, social media, print brokerage.

**Other businesses Shawn owns or manages:**
- **Say It Marketing** (sayitmarketing.com) — Web design + SEO agency
- **Barrio Builders** (barriobuilders.com) — Roofing, remodeling, painting, Tucson AZ (Instance #1)
- **Blue Luna Events** (bluelunaevents.com) — Events, owned by Monique (Instance #2)
- **Got Smoothie** (gotsmoothie.foundco.app) — Food/smoothie bar (Instance #3)
- **RC Bicycles** (rcbicycles.foundco.app) — Retail bike shop (Instance #4)
- **Spa Mambo** — Spa/wellness client (future instance)
- **Dog & Cat Groomer** (dogandcatgroomer.com) — Eimy's grooming business in Glendale, AZ (future instance)

---

## WHAT THIS PROJECT IS

**Found Co.** is a new entity Shawn is creating. Goal: App Store (Apple) + Google Play.

It is a mobile-first SaaS platform that gives any small business owner three things from one app:
1. **Auto-generated website** — answer onboarding questions, site is built automatically
2. **In-app photo/video capture** — organized by job, off the personal camera roll
3. **Social media prep** — flagged photos sized and ready to post

**The core promise:** Owner answers questions → professional website is generated → it looks like Apple built it. No tech skills. No designers. No drag-and-drop. Done in under 10 minutes.

---

## REPO STRUCTURE

**Local path:** `C:\Users\SuperShawn\Documents\GitHub\found-websites`
**GitHub:** `github.com/FOUNDCO-APP/found-websites`
**Hosting:** Vercel (switched from Netlify on May 29, 2026)

**How multi-tenancy works:**
- Every Found Co. client website is served from this ONE Next.js app
- `barriobuilders.foundco.app` → proxy rewrites to `/barriobuilders/*`
- Custom domain (`barriobuilders.com`) → proxy detects non-foundco.app hostname → looks up by `custom_domain` in Supabase
- Each company is a row in the `companies` table with a unique `slug`

---

## TECH STACK

| Layer | Tool | Notes |
|---|---|---|
| Frontend / App | Next.js 16 (PWA) | Single codebase for app + all client websites |
| Styling | Tailwind CSS v4 | Utility-first, mobile-first |
| Database + Auth | Supabase | mmctzloztgkbqvofmkou.supabase.co |
| File Storage | Supabase Storage | Buckets: media (private), logos (public), assets (public), config (public) |
| Hosting | Vercel | Auto-deploy on push to main |
| App Store (Phase 3) | Capacitor.js | Wraps PWA for iOS + Android |
| AI Content | Claude API | Pre-fills website content from onboarding answers |
| Email | Resend | Lead notifications to business owner |
| Payments (Phase 3) | Stripe | Subscription billing + upgrade features |

---

## FOUND CO. BRAND SYSTEM

```
App name:       Found
Company:        Found Co.
Domain:         foundco.app
Tagline:        Get Found.

Primary Green:  #2E7D32  — main brand color
Dark Green:     #1B5E20  — hover / accent states
Near Black:     #111111  — dark sections, hero backgrounds
White:          #FFFFFF  — backgrounds, reversed text
```

**Design philosophy:** Apple-influenced. Clean, minimal, mobile-first.
**Button style:** Pill-shaped (border-radius: 9999px)
**Typography logo (BrandMark):** Business name as elegant type — for owners without a logo

---

## 4 LAYOUT SYSTEM — ALL BUILT ✅

Each company gets a layout based on `industry_category` + `vibe`:

| Layout | Vibe | Best For | Live Example |
|---|---|---|---|
| **Impact** | bold | Contractors, home services, trades | Barrio Builders |
| **Editorial** | calm/warm | Events, wellness, beauty, luxury | Blue Luna Events |
| **Portrait** | warm | Food, visual businesses, photography | Got Smoothie |
| **Cinematic** | modern | Retail, fitness, high-energy | RC Bicycles |

**All 4 layouts have:**
- Personality-matched hero entrance animations
- InView scroll reveals on every section
- Ken Burns on Cinematic hero
- `prefers-reduced-motion` respected

Layout files: `src/components/layouts/`

---

## LIVE CLIENT SITES

| Company | Slug | Layout | URL |
|---|---|---|---|
| Barrio Builders | barriobuilders | Impact | barriobuilders.foundco.app |
| Blue Luna Events | blueluna | Editorial | blueluna.foundco.app |
| Got Smoothie | gotsmoothie | Portrait | gotsmoothie.foundco.app |
| RC Bicycles | rcbicycles | Cinematic | rcbicycles.foundco.app |

---

## PHOTO POOL SYSTEM

**Architecture:** Curated JSON files in Supabase Storage `config` bucket.

**File path per industry:** `config/photo-pools/{industry}.json`

**Format:**
```json
{
  "industry": "home_services",
  "photos": [
    {
      "url": "https://images.pexels.com/...",
      "desc": "Team-written description for alt text and SEO",
      "tag": "painting",
      "keywords": ["painting", "renovation", "interior", "contractor", "professional"]
    }
  ]
}
```

**`tag` values:** `null` = general (any business in category) · or specific sub-type e.g. `wedding`, `barber`, `food truck`, `yoga studio`

**Priority chain in `stockImages.ts`:**
1. Client's own real photos (Phase 3)
2. Cached `stock_images` on `website_config`
3. **Industry photo pool from Storage** ← curated by Shawn + team
4. Pexels API fallback
5. Gradient fallback

**All 11 industries curated:** home_services, food, wellness, events, retail, fitness, beauty, automotive, pet_services, cleaning, landscaping — team-written descriptions + keywords on every photo.

**Admin curation page:** `foundco.app/admin/photos` (key: ask Shawn)

---

## DATABASE — SUPABASE SCHEMA

**Project:** mmctzloztgkbqvofmkou.supabase.co

**Tables:**
- `companies` — every Found Co. client business (slug, name, colors, phone, logo_url, logo_white_url, industry, vibe, intent, etc.)
- `profiles` — admin + worker users (extends Supabase Auth)
- `projects` — jobs/events a company is working on
- `media` — photos/videos with two flags: `website_flag` ❤️ and `social_flag` ⭐
- `website_config` — per-company website content (hero, services, testimonials, social links, custom_domain, stock_images)
- `leads` — estimate/contact form submissions from client websites
- `subscriptions` — billing + plan status per company (Phase 3)

**Storage buckets:**
- `media` — private, client photos/videos
- `logos` — public, client logo files
- `assets` — public, image files
- `config` — public, JSON config files (photo pools live here)

---

## SITE STRUCTURE (PER CLIENT)

| Page | Route | Status |
|---|---|---|
| Home | `/[slug]` | ✅ Built |
| About | `/[slug]/about` | ✅ Built |
| Services | `/[slug]/services` | ✅ Built |
| Gallery | `/[slug]/gallery` | ✅ Built — masonry + lightbox + swipe |
| Contact | `/[slug]/contact` | ✅ Built |
| Estimate | `/[slug]/estimate` | ✅ Built |
| Found Co. root | `/` | ⏳ Coming soon placeholder |
| Admin photo curator | `/admin/photos` | ✅ Built |

---

## CURRENT PHASE — Phase 2: Onboarding Flow

**What's blocking onboarding:**
- Industry section manifests — Shawn walks team through all 11 types (NOT YET DONE)
- Once manifests are decided, onboarding build begins

**What's ready for onboarding:**
- All 4 layouts ✅
- All photo pools curated with descriptions + keywords ✅
- Full onboarding spec in `ONBOARDING.md` ✅
- Claude API content generation planned ✅

---

## PENDING ADMIN TASKS (SHAWN TO DO)

- [ ] Rotate GitHub PAT (urgent — exposed June 3)
- [ ] Rotate Supabase service role key (urgent — exposed June 3)
- [ ] Form Found Co., LLC in Arizona — azcc.gov (~$50)
- [ ] Run USPTO trademark search for "Found" — USPTO.gov → TESS
- [ ] Create GitHub Organization `found-co` and transfer found-websites repo
- [ ] Set up foundco.app email
- [ ] Pay Apple Developer Program ($99) when ready for App Store

---

## IMPORTANT LINKS

- **Supabase:** app.supabase.com → project mmctzloztgkbqvofmkou
- **Vercel:** vercel.com → found-websites project
- **Domain:** foundco.app
- **GitHub:** github.com/FOUNDCO-APP/found-websites
- **Admin page:** foundco.app/admin/photos

---

*Keep this file updated. Keep it honest. Keep it focused on the mission.*
