# PROJECT.md — Found Co. / found-websites
### Read this every session. Every AI. Every time.
*Last updated: May 29, 2026*

---

## WHO YOU ARE WORKING FOR

**Shawn Lopez** — Owner, Say It Marketing, Tucson AZ. In business since 1999.
Web design, branding, SEO, hosting, social media, print brokerage.

**Other businesses Shawn owns or manages:**
- **Say It Marketing** (sayitmarketing.com) — Web design + SEO agency
- **Barrio Builders** (barriobuilders.com) — Roofing, remodeling, painting, Tucson AZ (Instance #1 guinea pig)
- **Blue Luna Events** (bluelunaevents.com) — Events, owned by Monique (Shawn's girlfriend)
- **Spa Mambo** — Spa/wellness client
- **Dog & Cat Groomer** (dogandcatgroomer.com) — Eimy's grooming business in Glendale, AZ

---

## WHAT THIS PROJECT IS

**Found Co.** is a new entity Shawn is creating. Goal: App Store (Apple) + Google Play.

It is a mobile-first SaaS platform that gives any small business owner three things from one app:
1. **Auto-generated website** — answer onboarding questions, site is built automatically
2. **In-app photo/video capture** — organized by job, off the personal camera roll
3. **Social media prep** — flagged photos sized and ready to post

**The core promise:** Owner answers questions → professional website is generated → it looks like Apple built it. No tech skills. No designers. No drag-and-drop. Done in under 10 minutes.

**Barrio Builders** is Instance #1 — the guinea pig that proves the platform works.

---

## REPO STRUCTURE

**Local path:** `C:\Users\SuperShawn\Documents\GitHub\found-websites`
**GitHub:** `github.com/found-co/found-websites` (pending transfer to found-co org)
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
| File Storage | Supabase Storage | Buckets: media (private), logos (public), assets (public) |
| Hosting | Vercel | Auto-deploy on push to main |
| App Store (Phase 2) | Capacitor.js | Wraps PWA for iOS + Android |
| AI Content | Claude API | Pre-fills website content from onboarding answers |
| Email | Resend or Supabase Edge Functions | Lead notifications to business owner |
| Payments (Phase 2) | Stripe | Subscription billing + upgrade features |

**Never add:** WordPress, unnecessary npm packages, paid tools without clear revenue reason.

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
**Icons:** Flat SVGs only. No emoji as icons.
**Typography logo:** Business name rendered as elegant type — no logo needed.

---

## BARRIO BUILDERS (INSTANCE #1)

```
Business name:  Barrio Builders
Domain:         barriobuilders.com
Phone:          520.261.1212
Email:          info@barriobuilders.com
Location:       Tucson, AZ
Languages:      English + Spanish ("Hablamos Español")
Owner:          Michael
Slug:           barrio-builders (in Supabase companies table)

Primary Color:  #2E7D32
Background:     #111111 (dark sections)
```

**Services:** Remodeling, Renovations, Painting, Roofing, New Construction
**Positioning:** "We're not a national chain — we're your neighbors."

---

## DATABASE — SUPABASE SCHEMA

**Project:** mmctzloztgkbqvofmkou.supabase.co

**Tables:**
- `companies` — every Found Co. client business (slug, name, colors, phone, logo_url, industry, intent, etc.)
- `profiles` — admin + worker users (extends Supabase Auth)
- `projects` — jobs/events a company is working on
- `media` — photos/videos with two flags: `website_flag` ❤️ and `social_flag` ⭐
- `website_config` — per-company website content (hero, services, testimonials, social links, custom_domain, published)
- `leads` — estimate/contact form submissions from client websites
- `subscriptions` — billing + plan status per company (Phase 2)

**Storage buckets:**
- `media` — private, 50MB limit, images + videos
- `logos` — public, 50MB limit, images only
- `assets` — public, 50MB limit, images only

**Row Level Security:** Enabled on all tables. Each company sees only its own data.
Public can submit leads (no auth required for contact forms on client websites).

---

## COMPANY TYPE SYSTEM

Each company has two CTA intents — drives the primary and secondary button throughout the site:

| Intent | Button Label | Destination |
|---|---|---|
| `call` | Call Us | `tel:` link |
| `quote` | Get a Free Estimate | `/estimate` |
| `book` | Book Now | `/contact` |
| `visit` | Visit Us | `/contact` |
| `shop` | Shop Now | `/shop` |

---

## SITE STRUCTURE (PER CLIENT)

| Page | Route | Status |
|---|---|---|
| Home | `/[slug]` | ✅ Built |
| About | `/[slug]/about` | ✅ Built |
| Services | `/[slug]/services` | ✅ Built |
| Gallery | `/[slug]/gallery` | ✅ Built |
| Contact | `/[slug]/contact` | ✅ Built |
| Estimate | `/[slug]/estimate` | ✅ Built |
| Found Co. root | `/` | ⏳ Coming soon placeholder |

---

## BUILD ORDER

| Step | What | Status |
|---|---|---|
| 1 | Supabase schema + storage + RLS | ✅ Done |
| 2 | Next.js scaffold + Supabase connected | ✅ Done |
| 3 | Multi-tenant routing engine (proxy + slug system) | ✅ Done |
| 4 | All client website pages (home, about, services, gallery, contact, estimate) | ✅ Done |
| 5 | Vercel deployment configured | ✅ Done |
| 6 | Barrio Builders seed data | ✅ Done (scripts/seed-barrio.json) |
| 7 | Onboarding flow (questions → site generation) | 🔨 Next |
| 8 | In-app camera system | ⏳ Upcoming |
| 9 | Two-flag curation (heart ❤️ + star ⭐) | ⏳ Upcoming |
| 10 | Admin PWA dashboard | ⏳ Upcoming |
| 11 | Worker PWA (upload only) | ⏳ Upcoming |
| 12 | Gallery auto-sync (heart → website) | ⏳ Upcoming |
| 13 | Social export pipeline (star → sized photos) | ⏳ Upcoming |
| 14 | Stripe billing + upgrade features | ⏳ Phase 2 |
| 15 | Capacitor → App Store + Google Play | ⏳ Phase 2 |
| 16 | foundco.app marketing site | ⏳ Phase 2 |

---

## PENDING ADMIN TASKS (SHAWN TO DO)

- [ ] Form Found Co., LLC in Arizona — azcc.gov (~$50)
- [ ] Run USPTO trademark search for "Found" — USPTO.gov → TESS
- [ ] Create GitHub Organization `found-co` and transfer found-websites repo
- [ ] Set up foundco.app email
- [ ] Pay Apple Developer Program ($99) when ready for App Store (Step 15)
- [ ] Connect Vercel to GitHub for auto-deploy

---

## IMPORTANT LINKS

- **Supabase:** app.supabase.com → project mmctzloztgkbqvofmkou
- **Vercel:** vercel.com
- **Domain:** foundco.app (purchased May 28, 2026 via Namecheap)
- **Guinea pig site:** barriobuilders.com
- **GitHub org:** github.com/found-co

---

*Keep this file updated. Keep it honest. Keep it focused on the mission.*
