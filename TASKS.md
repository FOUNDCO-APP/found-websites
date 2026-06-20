# TASKS.md — Found Co. / found-websites
### Execution board — single source of truth for active work
*Last updated: June 20, 2026 — continuous session*

---

## CURRENT PHASE

**Phase 4: Customer Dashboard — SUBSTANTIALLY COMPLETE**
**Phase 3 (Photo System): SHIPPED**

Core dashboard complete. Photo organization (albums/projects), industry vocab, camera pre-flight, public gallery integration, and Home 3-state redesign all shipped.

---

## NOW (MAX 3)

1. **Photo curation** — 10 new industries have empty pools; curation session at `/admin/photos` required with Shawn approving. Industries: `creative_services, home_based_food, education, music_performance, professional_services, healthcare, childcare, makers_crafts, home_property, nonprofit`.

2. **Plan gating — "Share with Client"** — the Share sheet on album cards currently shows for all users. Base plan users should see an upgrade prompt instead of the live share link. Check `subscription_status`/`plan` and gate accordingly.

3. **Desktop E2E test** — open `my.foundco.app` on 1280px+ and verify: sidebar, 5 tabs, Home 3-state (new lead / caught up / welcome), camera picker sheet, Photos tabs (Unsorted/Website/Social/Projects).

---

## RECENTLY COMPLETED (June 19–20, 2026 — continuous session)
- ✅ SiteEditor: all accent colors unified to Signal Green; progress bar removed from More plan card; "contact" → "lead" on Leads
- ✅ Migration-035 live — `photo_albums` table + `company_photos.album_id` column
- ✅ Photos page full rewrite — date grouping headers, albums/projects tab, album detail view, share sheet
- ✅ `/api/albums` route (GET/POST/DELETE with slug dedup)
- ✅ `/api/company-slug` returns `{ slug, industry }`
- ✅ Public album gallery page — `/[slug]/gallery/[album]/page.tsx`
- ✅ `albumLabelFor(industry)` — 18-industry vocab map in `typography.ts`
- ✅ `getCompany` — `industry_category` added to type + SELECT
- ✅ Camera pre-flight — pre-fetched albums, instant sheet, project picker with horizontal tile scroll
- ✅ Camera picker visual overhaul — 84px glowing hero circle, 72×72 color album tiles, Apple spring easing
- ✅ "New" tab renamed "Unsorted"
- ✅ Gallery integration — `company_photos.for_website` now appears on public `/[slug]/gallery` (dashboard photos → site, gap closed)
- ✅ Home redesign — 3 pure states (new lead hero / caught up momentum / welcome share), all stat chips + quick-action buttons removed

---

## RECENTLY COMPLETED (June 19, 2026 — launch day session)
- ✅ Full team audit (Jony + Steve co-lead) — P0/P1/P2 items identified and all approved by Shawn
- ✅ Greeting → `TYPE.largeTitle h1`; new lead Call button full-width green pill with glow
- ✅ Welcome state added (isActive + 0 leads); caught-up state "View all →" link
- ✅ Emoji temperature (🔥⚡❄️) → geometric dot system; emoji photo flags → SVG heart/star
- ✅ Unread badge: 8px red dot on Leads tab (mobile + desktop) when newLeadCount > 0
- ✅ Context-aware quick actions: 1-col (photo only) when new lead showing
- ✅ `?upload=1` param → auto-opens file input on Photos page (from sidebar Add Photo button)
- ✅ Contacts page complete rewrite — all 20+ px violations fixed, FAB 44px, SVG empty state
- ✅ More page: Found plan green, billing section removed, email row added, upgrade features rewritten
- ✅ Banner condition fixed for canceled accounts; favicon 404 fixed in middleware
- ✅ All px sizes → rem; iOS HIG Dynamic Type ramp enforced sitewide
- ✅ TypeScript ✅ build ✅ — committed `09f502b`

## RECENTLY COMPLETED (June 19, 2026 — typography session)
- ✅ Typography system rolled out to all remaining dashboard pages — `SiteEditor.tsx`, `more/page.tsx`, `photos/page.tsx`. Commits: `f87c359`
- ✅ Desktop sidebar layout — responsive 220px sidebar on ≥ 768px, mobile bottom nav unchanged. Commits: `94d7db4`

## RECENTLY COMPLETED (June 18, 2026 session)
- ✅ Remove trial from upgrade checkout — confirmed no `trial_period_days` in `more/actions.ts`
- ✅ In-dashboard activation banner (white bar, green button, inline overlay — no black screen)
- ✅ Lead/Contact detail sheets with full edit capability (PATCH /api/leads, updateContact action)
- ✅ Home screen redesign (single decisive status card)
- ✅ Shared typography system (Leads, Contacts, Home, DashboardNav)
- ✅ Identity-based avatar colors (Apple Contacts style)
- ✅ Bulk-fixed 14 companies with stale `plan: "found_pro"` → `plan: "found"`

---

## BACKLOG

### Dashboard
- Auto-reply message — owner writes it once during onboarding/settings, Found sends it to every new lead via Resend
- Manual lead follow-up sequence — one toggle: "Follow up automatically if I don't reply in 24 hours"
- Business card scanner — camera → OCR → pre-fill lead or contact form
- ~~Dashboard home/overview for desktop (sidebar nav, two-column leads/inbox)~~ — sidebar shipped June 19
- Real-time lead notifications (push notification when new lead arrives)
- Contacts tags — allow custom tags beyond the preset 5
- Photo Before & After social post creator

### Site
- Hero photo also syncs to `website_config.hero_image_url` for layouts that read it
- Photo social export — format with brand typography, save to camera roll
- Color/theme picker (Pro feature)
- Logo upload

### Platform
- Favicon 404 — all client sites throw a 404 for `/favicon.svg`. Noisy in logs, bad for SEO. Not urgent enough for NOW slot but still unresolved.
- Photo curation for 10 new industries at `/admin/photos`
- Remove debug `[Activate]` console logs
- `VERCEL_API_TOKEN` + `VERCEL_PROJECT_ID` for connect-domain feature
- Custom domain flow end-to-end test

### Decisions needed
- Portal name — "Found Studio" proposed, needs Steve/team sign-off
- Inbox tab — currently redirects to Leads. Should it become a full conversation thread view?
- Social posting — direct API vs save to camera roll (locked: camera roll for launch)

