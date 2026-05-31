# found-websites

Multi-tenant website engine for Found Co. — one repo, one deploy, every client site.

## What this is

Every client of Found gets a website at `[slug].foundco.app`. This repo serves all of them from a single Next.js deployment on Vercel. New client = new row in Supabase. No new repos, no new deploys.

## Architecture

- **Proxy** (`src/proxy.ts`) — reads hostname, extracts slug from subdomain or flags custom domain, rewrites URL to `/[slug]/...`
- **Company layout** (`src/app/[slug]/layout.tsx`) — fetches company data once, applies vibe-driven CSS variables, renders Navbar + Footer
- **Page routes** — `[slug]/page.tsx`, `[slug]/services`, `[slug]/about`, `[slug]/gallery`, `[slug]/contact`, `[slug]/estimate`
- **Reply page** (`src/app/reply/[token]/`) — owner compose screen for replying to leads

## Design system

- **Vibe** (`src/lib/vibe.ts`) — maps `bold/calm/modern/warm` to font pairs, card radius, shadow, button radius
- **Layout** (`src/lib/layout.ts`) — maps `industry_category + vibe` to layout type (impact/editorial/portrait/cinematic)
- **Colors** (`src/lib/color.ts`) — `heroGradient()`, `logoColor()`, `darkenHex()`
- **Fonts** — Oswald, Playfair Display, Space Grotesk, Merriweather + body pairs loaded in root layout
- **Buttons** — `.btn` class in `globals.css` — single source of truth for all button heights

## Key components

- `Navbar.tsx` — sticky header, active nav state, full-screen slide overlay mobile menu
- `Footer.tsx` — social icons from `social_links`, `logoColor()` for dark background
- `ServiceIcon.tsx` — `getServiceIcon(serviceName)` keyword mapper, per-service icons

## SEO / AEO / GEO

- `generateMetadata` in every page — rich title, description, Open Graph, Twitter card
- `[slug]/layout.tsx` — LocalBusiness + FAQPage + Service JSON-LD schemas
- `sitemap.ts` — dynamic sitemap covering all active client pages
- `robots.ts` — allow all crawlers
- `[slug]/opengraph-image.tsx` — branded 1200×630 sharing image per company
- `icon.tsx` — dynamic favicon per company (reads host header)

## Lead flow

1. Customer submits estimate form → `leads` table in Supabase
2. Resend sends branded notification email to owner at `hello@foundco.app`
3. Owner clicks "Email [Name]" → `foundco.app/reply/[token]` compose page
4. Owner sends reply → Resend delivers clean personal email to customer

## Environment variables (Vercel)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_ROOT_DOMAIN=foundco.app
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
```

## Team

See `AGENTS.md` — Steve Jobs, Jony Ive, and the full Found Co. team.
