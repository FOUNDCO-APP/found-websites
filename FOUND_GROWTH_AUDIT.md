# FOUND_GROWTH_AUDIT.md — Marketing Site SEO/AEO/GEO + Traffic Report

*Started 2026-08-27. Team meeting held; Shawn approved the direction.*

---

## The ask

Audit `foundco.app` for everything that brings in traffic — SEO (Google), AEO (answer engines / AI Overviews), GEO (generative-engine citation). Use Blue Luna Events as the reference (its site started producing real leads in the last week or two). Bring Blue Luna's **Traffic Report** into Found.

## Decisions (Shawn, 2026-08-27)

1. **Traffic Report → Found HQ, for Shawn/founder, first.** Architect it so a per-business-owner version can be added later without a rewrite. Shawn: "I was not thinking of that but it sounds amazing."
2. **Approved:** full audit + written plan AND start building the cheap marketing-site SEO/AEO wins this session.
3. Match Blue Luna's report, plus whatever the team judges will help scale sooner.

---

## What Blue Luna does that works (reference)

From `~/Documents/GitHub/blue-luna-events`:

- **6 per-vertical landing pages** — `/weddings`, `/quinceaneras`, `/graduations`, `/birthdays`, `/baby-showers`, `/corporate-events`. Each: geo-targeted `<title>` ("Wedding Balloon Décor in **Tucson, AZ**"), specific service content, **`FAQPage` JSON-LD on every page**.
- `LocalBusiness` JSON-LD in the root layout. Canonicals, OG tags. Sitemap with every page at priority 0.9.
- **UTM-tagged social links** (IG bio, IG story, FB page, FB post) sitting copy-paste-ready inside the Traffic Report.
- **Traffic Report** (`/studio/analytics`): a `site_visits` table fed by `VisitTracker.tsx` (captures entry-referrer + UTMs **once per tab session**, posts every pageview), a shared `channel.ts` that buckets referrer/UTM into plain labels (Instagram, Facebook, Google, Yelp, Nextdoor, Apple Maps, Referral, Direct/DMs). The report shows:
  - plain-English one-sentence summary first
  - **leads by channel**, with trend vs the previous period (up/down/flat)
  - visits by channel
  - top pages
  - **pages that led to inquiries**
  - **top lead paths** (the page sequences visitors took before inquiring)
  - windows: This Month / Last 3 Months / All Time
- Ranks by **leads, not visits** — Shawn's "not fluffy numbers, I need to know where to spend focus" rule.
- One shared channel module so the visit numbers and the lead-attribution numbers cannot quietly disagree (Blue Luna left a code comment about learning this the hard way).

---

## Found marketing site — current state (verified 2026-08-27)

### Already good
- **8 industry pages** (`/industries/{contractors,restaurants,salons,spas,real-estate,retail,photographers,cleaning}`) via `IndustryPage.tsx` — each has page-specific metadata, OG tags, **`FAQPage` JSON-LD**, and a "what makes Found different from Wix/Squarespace" FAQ.
- `/compare` ("Found vs. Wix & Squarespace") — uses `IndustryPage`, so it also gets FAQ schema.
- `/how-it-works` — the strongest page: `HowTo` + `FAQPage` + `WebPage` JSON-LD.
- Root layout: `Organization` + `WebSite` + `SoftwareApplication` JSON-LD, scoped to root host only.
- `sitemap.ts` (root pages + non-test tenant sites), `robots.ts`.
- Analytics installed: Vercel Analytics, PostHog (pageviews + autocapture), Microsoft Clarity — all gated to the root host.

### Gaps
| Gap | Impact | Effort |
|---|---|---|
| `/plans` + `/plans/{found,found-pro,found-business}` have **no FAQ schema and no `Product`/`Offer` schema** | AEO — these are the money pages; no rich pricing results, not answer-engine friendly | low |
| Home page has **no `FAQPage`** ("what is Found / how much / how fast / do I need a designer") | AEO — the highest-traffic page contributes nothing to AI answers | low |
| Comparison depth = Wix/Squarespace only | Missing **GoDaddy Website Builder** (the #1 competitor for "I just bought a domain"), "hiring a web designer / agency", "doing it myself" — all high-intent | medium (needs Phil copy review) |
| Only 8 of ~22 industries have pages (`INDUSTRY_MANIFESTS.md`) | Each missing vertical = a missing SEO entry point | medium |
| No industry × feature long-tail ("restaurant website with online ordering", "contractor website with estimates") | The Found-appropriate version of Blue Luna's per-vertical pages, at scale | medium/high |
| No content/blog | Slower ROI — **deferred** per Steve | high |
| **No channel attribution for Found's own funnel** — PostHog has pageviews but not "signups by channel / by referrer" | Shawn is about to run ads with no way to see which channel converts | this doc's main build |
| **No UTM discipline** — no standard tagged links for Shawn's own social/ads | Ad spend is unmeasurable without it | low |

---

## Plan

### Phase 1 — Traffic Report (Found HQ, founder-first, tenant-ready) — THIS is the flagship build

**Schema** (`site_visits`):
- `id`, `path`, `referrer` (raw), `entry_channel` (bucketed), `session_id`, `utm_source/medium/campaign/content/term`, `landing_path`, `created_at`
- **`company_id` nullable** — null = Found's own marketing site; a value = a tenant site. Same table serves both. This is the "architect for owners later" decision.
- `leads` gets `entry_channel`, `utm_*`, `landing_path` (tenant leads capture zero source data today).
- For Found's own funnel: reuse the existing PostHog funnel events or add a lightweight `found_signups` view; MVP can attribute signups by joining the visitor `session_id` captured at onboarding start.

**Shared module** `src/lib/channel.ts` (ported from Blue Luna, extended): one function bucketing referrer + UTM into plain channels. Used by both the visit tracker and lead attribution so the numbers can't drift.

**Tracker** `src/components/VisitTracker.tsx` (root-site only, gated by `x-found-root-site` exactly like PostHog/Analytics/Clarity): capture entry referrer + UTMs once per `sessionStorage` session, `POST /api/track` on every pageview, `keepalive`. Tenant version later = same component mounted in `[slug]/layout.tsx` with `company_id`.

**Found HQ page** `/admin/traffic` ("Traffic Report"): plain-English summary sentence, signups/leads by channel with trend, visits by channel, top pages, pages that led to signups, top paths, window switcher (Month / 3 Months / All). Excludes test/admin traffic (reuse `testIdentity.ts` / the Client Health "don't count admin" rule).

**UTM link builder**: a small section on `/admin/traffic` (or `/admin/growth`) with copy-paste tagged links for Shawn's channels — Instagram bio/story, Facebook page/post, Google Business Profile, email signature, paid ads — matching Blue Luna's `TRACKED_LINKS`.

### Phase 2 — Cheap marketing-site SEO/AEO wins (start this session, alongside Phase 1)
- `FAQPage` JSON-LD on `/plans`, each `/plans/*`, and the home page.
- `Product` + `Offer` JSON-LD on the three plan pages (price, currency, plan name, "no setup fee").
- Standardize the `WebSite` schema with `potentialAction` SearchAction if/when site search exists (skip for now).

### Phase 3 — Comparison + vertical expansion (needs Phil/team copy review — scoped, not auto-built)
- `/compare/godaddy`, `/compare/web-designer`, `/compare/diy` (or fold into `/compare` as sections + their own FAQ entries).
- Fill in the missing ~14 industry pages from `INDUSTRY_MANIFESTS.md`.
- Programmatic industry × primary-feature pages once the vertical pages prove out.

### Phase 4 — Per-owner Traffic Report (the "sounds amazing" future)
- Flip on the tenant `VisitTracker` (company-scoped), start stamping `entry_channel` on tenant leads.
- New tenant dashboard page: "Where your leads come from" — plain English, their own copy-paste UTM links for their social, "your Services page drove the most inquiries" style insight.
- Positioned as a Found differentiator: Wix/Squarespace give you a GA-style dashboard nobody reads; Found tells a small business owner where to spend their time in one sentence.

---

## What the team added beyond Blue Luna (Phase 1/2 scope)

- **Signups-by-channel** (not just leads-by-channel) — Found's "conversion" is a paid signup; the report must tie channel → signup → plan.
- **Cost-per-signup hooks** — leave a column/field for ad spend per channel so once Shawn runs ads the report answers "is this channel worth it," not just "how many."
- **UTM link builder built in** — so there's no excuse for an untagged link going out.
- **`Product`/`Offer` schema on pricing** — Blue Luna is a service business and didn't need it; Found is a SaaS product and pricing rich-results matter.
- Test/admin traffic exclusion from day one (Found HQ already has this discipline for Client Health).

---

## Status log

- 2026-08-27: doc created, team direction captured. Building Phase 1 + Phase 2 schema wins.
