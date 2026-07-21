# SESSION_HANDOFF.md - Found Co. Current Truth
### Start here after `BRIEF.md`. Keep this short, current, and plain-English.
*Last updated: July 21, 2026*

---

## DOC GAP BACKFILL - July 20, 2026

Docs (this file, `CHANGELOG.md`, `TASKS.md`) were not kept current from July 13 through July 20 - about 80 commits shipped with no matching entries. Reconstructed from `git log` and confirmed with Shawn. Full session-by-session detail is now in `CHANGELOG.md`; status changes are in `TASKS.md`. Headlines:

- **Full product catalog / online shop rebuild shipped July 16-17** - industry-aware catalog editor, variants/inventory, homepage showcase, cart-sheet checkout. Shawn confirmed live and tested. `TASKS.md` backlog previously said this "needs its own session, not built yet" - that line was stale.
- **Live-mode Stripe Connect webhook shipped July 19** - closes the P0 launch-payment gate that had been open since July 7 (webhook only existed in sandbox before). Ready for QA per Shawn.
- **Plan card savings display resolved July 15** via the new Stripe-portal plan upgrade flow - logged in `DECISIONS.md`.
- **Copy quality audit/repair system shipped July 13** and ran against real customer sites (confirmed by Shawn), not just test companies.
- Also undocumented: estimate payment fixes (July 15), Stripe Connect payout/audit tooling (July 15), mobile checkout stabilization (July 17), dashboard badge-clearing fix (July 18), payment receipt sender-name fix (July 19), black video thumbnail fix (July 19), and a new 3-option add-to-project photo picker (July 20).

**Fixed in this pass:** the "Current Status" section below previously had the same few July 19/July 10/July 9 paragraphs pasted 4-5 times with sentences cut mid-word (a paste bug from an earlier session). Deduplicated and reconstructed below; older July 6-8 Found HQ history was trimmed out since it's fully preserved in `CHANGELOG.md`/`CHANGELOG_ARCHIVE.md`.

---

## LAUNCH PAYMENT QA BACKFILL - July 21, 2026

Shawn clarified that several live payment QA items were already tested but were not recorded after a prior crash/context loss. Craig/Priya ran a read-only production Supabase audit to backfill evidence before changing the launch list.

- **Fresh onboarding / activation payment:** Shawn confirmed this passed live; production test-owner companies show active subscriptions and Stripe customer IDs.
- **Retail shop order:** verified Lucky (`lucky`) has a paid $1.00 `shopping_order` for Shawn Lopez from July 17, 2026, including selected option `Size: XL` and a recorded Stripe PaymentIntent.
- **Restaurant online order:** verified Rosa's Mexican Food (`rosas`) has paid $1.00 `online_order` records for Shawn Lopez, including the July 18, 2026 closed Carne Asada order with a recorded Stripe PaymentIntent.
- **Estimate deposit:** verified Blue Luna Events (`bluelunaevents`) has an accepted $1.00 estimate for Shawn Lopez, 50% deposit, `payment_status: deposit_paid`, `accepted_payment_choice: pay_now`, and a recorded Stripe PaymentIntent from July 20, 2026.
- **Estimate final balance:** verified Construction (`construction`) has a $1.09 estimate marked `payment_status: paid`; deposit paid July 16, 2026, final paid July 16, 2026, payment-link timestamp recorded.
- **Still unverified:** exact current pay-later estimate path (`accepted_payment_choice: pay_later` / `accepted_pay_later_at`). Older accepted-unpaid estimates exist but do not prove the current pay-later flow.
- **Stripe API note:** this machine's `.env.local` exposed only a test Stripe secret during Codex verification, so live connected-account PaymentIntent reads failed. Supabase production rows were verified; Stripe Dashboard can be used for a second ledger reconciliation if needed.

Process correction: after any meaningful code, QA, or note change, update `SESSION_HANDOFF.md`, `TASKS.md`, and `CHANGELOG.md` before ending the session, then commit/push those notes separately if app code is not part of the commit.

---

## FULFILLMENT DETAILS IN PAID ORDER RECEIPTS - July 21, 2026

Shawn completed the T-Shirts live shop checkout with Shipping and asked whether receipts should show where an order is being shipped or where pickup happens. Team decision: yes, the receipt has to answer that explicitly.

- Customer and owner receipts for retail/shop orders now show a clean receipt block: `Ship to` for shipping orders, `Pickup details` for pickup orders.
- Restaurant/menu paid-order receipts now use the same treatment and include pickup time when present.
- Pickup details use the first saved `company_locations` address when available. If no reliable pickup address exists, Found says the business will contact the customer with pickup instructions instead of inventing one.
- T-Shirts connected-account payment proof is now complete by Shawn's live shipping order test.
- Build passes with `cmd /c npm run build`.
- Still open for strictest launch payment QA: exact current pay-later estimate path unless Shawn waives it.

---

## NATIVE SHIPPING ADDRESS CHECKOUT FIELDS - July 21, 2026

Shawn found the T-Shirts shop checkout used one big Shipping Address textarea. Team decision: this is a customer-trust issue, not a cosmetic issue.

- Shop checkout now uses native shipping fields: street, unit, city, state, ZIP, country.
- Inputs include browser/mobile autofill tokens such as `shipping address-line1`, `shipping address-level2`, `shipping address-level1`, and `shipping postal-code`.
- Shopping cart checkout API now accepts structured `shippingAddress`, validates the required pieces for shipping, stores `shipping_address_parts`, and still stores/formats `shipping_address` for current lead/email display.
- Build passes with `cmd /c npm run build`.
- Test next: on `tshirts`, choose Shipping, tap Street address, use iPhone autofill, complete the $1 order, and confirm the owner/customer emails and dashboard lead show a readable shipping address.

---

## STRIPE CONNECT PROFILE LEDGER AUDIT - July 21, 2026

Shawn asked whether every profile with a Stripe account had been audited. Craig/Priya ran a read-only Found production database ledger audit across every company with a Stripe Connect account.

- Production totals: 37 companies; 28 have Stripe customer IDs for Found plan billing; 6 have Stripe Connect accounts for receiving customer payments.
- Connected profiles found: `bluelunaevents`, `construction`, `lucky`, `molcas-mexican`, `rosas`, and `tshirts`.
- Found DB payment evidence exists for 5 of 6 connected profiles: Blue Luna Events estimate deposit, Construction estimate payments/final-balance evidence, Lucky retail shop order, Molcas older online-order tests, and Rosa's restaurant online-order tests.
- `tshirts` has Stripe Connect set up but no completed paid order or estimate payment evidence in Found DB.
- This was not a direct Stripe Dashboard/API reconciliation. Live Stripe API access is still not available from this workspace without pulling a live secret from Vercel/Stripe.
- Open before the strictest launch sign-off: run one completed live shop-order payment on `tshirts` or verify its connected account directly in Stripe Dashboard; exact current pay-later estimate path is also still unverified.
- Reusable command added: `node scripts/audit-payment-ledger.mjs`.

---
## FULL TEAM AUDIT - July 20, 2026 - ALL 5 P0s FIXED SAME DAY

Shawn asked for a full team audit before launch. Result: **`LAUNCH_READINESS_AUDIT_2026-07-20.md`** - five parallel domain audits actually re-read the current code (a lot shipped since the July 9 audit that was never checked against). Shawn approved fixing every P0 immediately; all shipped this session. Full detail: `CHANGELOG.md`, "July 20, 2026 (part 2)."

- **Payment trust bug - FIXED.** The public estimate accept endpoint used to mark an estimate paid from unauthenticated client input with zero Stripe verification. Now requires and server-verifies the real Stripe PaymentIntent first.
- **Post-activation login - FIXED.** A brand-new paying owner used to hit a bare login screen with no session. Now signed in automatically via a real magic-link redirect on the way to their dashboard.
- **Catalog editor mobile bug - FIXED.** Ported SiteEditor's mobile keyboard/scroll-lock fix over to the catalog editor's Add/Edit Item sheet.
- **Sitemap/indexing - FIXED.** New per-business "Hide from search" toggle in `/admin/businesses`. Classified all 37 companies directly: 36 are Shawn's own practice accounts (now hidden + `noindex`), only Nereida's real salon stays indexable. Found's own marketing pages are now in the sitemap too (previously missing entirely).
- **"Review requests" claim - FIXED.** Changed to "coming soon" everywhere on the Business plan, per Shawn, instead of building the feature.
- 14 P1s from the audit remain open (no security headers, no rate limiting, no CI/tests, comp-link secret in a URL, checkout webhook fallback gaps, etc.) - full list in `LAUNCH_READINESS_AUDIT_2026-07-20.md`. Next priority list once Shawn's ready.

---

## Purpose

This is the shared handoff file for Codex, Claude Code, or any other AI working on Found.

Use this file to prevent lost context when Shawn switches tools, runs out of credits, or tests from his phone. This is not the full history. It is the current operational truth.

Current session history belongs in `CHANGELOG.md`.
Older detailed history belongs in `CHANGELOG_ARCHIVE.md`.
Active task backlog belongs in `TASKS.md`.
Locked decisions belong in `DECISIONS.md` and `DESIGN_DECISIONS.md`.

History policy: keep the current working window and anything still active in current docs. Move older completed history to archive so AI can read the current truth quickly without losing the old record.

---

## Current Status

- **New July 19 hero video loop blend:** Hero videos now use one shared playback layer for both app-recorded and uploaded videos. The player subtly fades near the loop point and still force-restarts on ended, making imperfect clips feel less abrupt instead of cutting to black or snapping hard.
- **New July 19 hero video loop fix:** Shawn found a selected home hero video played once and then went black. Public layouts now use a shared `HeroVideo` renderer with muted inline autoplay, loop, preload, and an explicit restart on ended; Editorial and Portrait layouts also now honor `hero_video_url`. Build passes. Test next: assign a short Header video and confirm the live home hero keeps replaying.
- **New July 19 video upload save fix:** Shawn found recorded videos did not appear in Photos/Unsorted. Read-only Supabase audit showed no video rows existed in `company_photos`, so the problem was upload/save, not the heart/star UI. Video uploads now use signed direct browser-to-Supabase storage, then Found records the row; failed uploads now show an error instead of silently disappearing. Build passes. Test next: record or upload a short video, confirm it appears in Photos -> Unsorted with a VIDEO badge, then heart/star it.
- **New July 19 contact editing + video media foundation:** Site Editor now exposes editable Contact Page copy, adds a Contact media slot, and supports video uploads/previews in Photos. Header media can now be a video hero through `hero_video_url`; public home/contact render selected videos safely with muted looping playback. Build passes. Test next: upload a short video in Photos, confirm the VIDEO badge/playback, assign Header or Contact media in Edit My Site, then open the public home/contact pages.
- **New July 18 named site photo slots:** Site Editor now has explicit Header, About, Visit / CTA, and Gallery photo slots instead of one confusing header-only photo picker. Public home/about/services layouts now use those owner-selected section photos before stock imagery. No slideshow was added yet; motion remains a later explicit owner setting. Build passes. Test next: More -> Edit My Site -> Site Photos, assign photos to each slot, then open the live home/about/services pages and confirm the correct section photos show.
- **New July 18 Site Editor escape fix:** Shawn confirmed the previous full-screen text editor still looked bad and trapped him with no obvious close. The copy editor is now a true full-screen editor with permanent top Close and Save controls; the fragile bottom button row was removed from the keyboard zone. Build passes. Test next: Edit My Site -> Supporting Line, confirm Close/Save stay visible and dragging does not expose the dashboard behind it.
- **New July 18 mobile Site Editor sheet lock:** The text-edit sheet now locks dashboard/body scroll while open, sizes itself to the mobile visual viewport, and uses a stronger scrim/contained overscroll so the page behind it does not show through or yo-yo under the keyboard. Build passes. Team next: add header photo motion as an explicit owner setting, not a surprise carousel.
- **New July 18 site header photo editing:** Site Editor now has an explicit Header Photo picker instead of mystery thumbnails. Selecting a header photo updates `website_config.hero_image_url` and `hero_images`, so the public home hero can actually use the owner-selected photo. Removing it clears those public config fields and falls back to stock/default imagery. The text-edit sheet now sits above mobile nav/keyboard with sticky Save/Cancel controls. Test next: More -> Edit My Site -> Header Photo -> Change, pick a photo, open the live site and confirm the hero updates; then remove it and confirm fallback returns.
- **New July 18 dashboard badge clearing:** Unread dashboard badges now clear once the owner actually views the item instead of persisting after it has been seen.
- **New July 17 mobile checkout stabilization:** Floated/hid the cart bar correctly during checkout and kept the checkout sheet above the cart bar instead of behind it. Online order receipts now send from Found under the business's own branding instead of a generic sender.
- **New July 16-17 product catalog / online shop rebuild:** Industry-aware catalog editor with dedicated menu and products managers, variants/inventory controls, sold-out product handling, homepage catalog showcase, and checkout moved into a cart sheet. Confirmed live and tested by Shawn July 20, 2026. Not yet confirmed whether Estimates line items pull from this same catalog table.
- **New July 15 plan upgrade + Stripe Connect payout tooling:** Plan upgrades now route through a Stripe portal config scoped to the target price (resolved the previously-unresolved plan-card savings display question, see `DECISIONS.md`). Added an admin Stripe Connect audit page and a Stripe payout handoff sheet with a timeout guard; repaired invalid Connect account setups found during the audit. Also fixed remaining-balance calculation and request/queue wording on estimate payments.
- **New July 15 Stripe Connect merchant responsibility fix:** Shawn finished live Connect setup but T-Shirts payout onboarding still failed because Found created Express accounts with `fees.payer = application` and `losses.payments = application`. Craig approved changing the responsibility model so the connected merchant/Stripe side carries the payment fee/loss controller model. New accounts now use `fees.payer = account` and `losses.payments = stripe`; owner-facing errors are sanitized. Build passes with cmd /c npm run build; production deploy is live at found-websites-38uz6ux12-foundco.vercel.app.
- **New July 19 live-mode Connect webhook:** Added the live-mode Stripe Connect webhook signing secret, closing the P0 launch-payment gate flagged since July 7 (webhook only existed in sandbox before). Ready for QA per Shawn.
- **New July 19 payment receipt sender fix:** Payment/deposit receipt emails now show the business's own name instead of "Found" - this was the one customer email that had missed the "show the business name" treatment already applied to leads, bookings, online orders, and sent estimates.
- **New July 13 copy quality audit/repair system:** Read-only audit across live company website copy, with fixes staged by risk (high-risk first, then medium-risk, dry-run plan, guarded apply). Confirmed by Shawn July 20, 2026 to have run against real customer sites, not just test companies. Also added faith-specific website copy and tightened apparel-specific copy rules.
- **New July 20 photo/project UX:** Added a 3-option add-to-project flow (Take Photo, Upload, Use Existing) so new projects no longer dead-end at an empty state; fixed a broken-encoding zoom label ("1x" was showing as garbled text) and matched the Photos page camera button to Home's camera button.
- **New July 14 public business name polish guard:** Shawn found `tshirts` still lowercase on `/shop`. Root cause: prior copy polish covered `website_config` fields, but public pages still received raw `company.name`. `src/lib/company.ts` now polishes `company.name` once in the shared public company loader, covering home/shop/order/menu/contact/reserve/gallery/subscribe/quote/nav/footer/custom-domain paths that use `getCompanyBySlug` or `getCompanyByDomain`. Build passes with `cmd /c npm run build`.
- **New July 14 public commerce fallback safety:** Shawn found the public shop page exposing internal setup language (`payout account`, `No products yet`, cart chrome) on an unfinished retail shop. Shared `/[slug]/shop` now shows a polished coming-soon/contact fallback until payments and products are both ready. Shared online ordering and both commerce checkout APIs now use customer-safe fallback wording instead of Stripe/setup language. Build passes with cmd /c npm run build.
- **New July 14 selected-company cookie selector fix:** Switching still stuck on the last business. Root cause is likely duplicate same-name cookies plus cookies().get() choosing a stale value. getCompany() now prefers a new found_selected_company_id cookie, falls back to legacy found_company_id, and reads all duplicates using the last value. The select-company route writes both names. Build passes. Test next: switch Tacos -> tshirts and back.
- **New July 14 selected-company cookie scope fix:** Hard navigation still stayed on tshirts, likely because old root-domain and new host-only found_company_id cookies could both exist. /dashboard/api/select-company now writes the selected company ID to both scopes on Found domains. Build passes. Test next: switch tshirts -> Tacos and confirm the dashboard leaves tshirts.
- **New July 14 hard business switch boundary:** Shawn still saw Tacos in the header but tshirts plan/name data in the More page after switching. Follow-up fix changes the company picker from a soft server-action transition to a hard browser navigation through /api/select-company, forcing a full document load after the selected-company cookie is set. Build passes. Test next: switch tshirts -> Tacos and confirm Home, Reservations, Guests, and More all show Tacos with no tshirts body data.
- **New July 14 dashboard integrity fix:** Shawn found mixed dashboard state across tshirts, Tacos, Taco Shop, Construction, and Musician. Read-only audit found core lead/customer queries are scoped by company_id, but selected-company rendering could go stale after switching because getCompany() was cached only by user ID/email. Also, Found Business granted every add-on globally and the dashboard exposed irrelevant tools by add-on instead of by industry. Fixed by removing cookie-insensitive getCompany() caching, forcing the dashboard shell dynamic, revalidating company selection, making Orders industry-aware, adding music to schedule-first routing, and making Home smart messages industry-aware for every active plan. Build passes. Test next: switch across tshirts, Tacos, Taco Shop, Construction, and Musician and verify greeting, picker, More plan, tabs, page titles, and Home message all match the selected business.
- **New July 14 additional routing fixes:** Added Found Business dollar promo setup, fixed leads title flicker on load, fixed dashboard request-routing taxonomy and lead-notification routing, fixed industry-aware location sections, and restored Express Connect controller settings.
- **Simple promo July 10:** Replaced the hard-to-type random live promo with F0UND1128 because Stripe does not allow ! in promotion codes. Production setup route created F0UND1128 in live mode, disabled the previous active Found $1 promo, and verified reruns reuse F0UND1128 without duplicates. F0UND1128 remains one-use and leaves $1.00 due on the Found Starter intro plan first invoice.
- **Live Stripe billing bootstrap July 10:** Vercel production now has live Stripe keys, the protected Stripe setup route was upgraded and run in live mode, live products/prices were created or reused, Vercel production price env vars were updated to the live price IDs, production was redeployed, and the one-use FOUND1 promo exists for the base Found intro plan. FOUND1 leaves $1.00 due on the first invoice and did not duplicate on verification.
- **Activation promo codes Phase 1 (July 9):** Added a Stripe-native promo-code field to the activation payment screen. Shawn creates coupons/promotion codes in Stripe Dashboard; Found validates active promotion codes, shows the discounted monthly price, stores promo metadata on the SetupIntent, applies the discount when creating the Stripe subscription, and records promo audit fields when migration database/migrations/046-activation-promo-audit.sql is applied. Build passes. Test next: create a live Stripe promotion code for a small charge (for example a fixed/percent discount that leaves $1 or $10 due), onboard a fresh test business, apply the code on /activate, and confirm Stripe invoice/subscription plus Found activation state.
- **Launch audit July 9:** Team verdict is no-go for open self-serve launch; controlled pilot only. Production health and build pass, but four P0 gates remain: live Stripe Connect destination/payment QA, a fresh onboarding-to-first-lead journey, sitemap exclusion of test/unready companies, and removal or completion of unverified paid-plan claims. Full findings: `LAUNCH_READINESS_AUDIT_2026-07-09.md`.
- **Phone QA follow-up:** Shawn's screenshots exposed question marks where Unicode chevrons, arrows, and separators should render. Replaced all affected admin UI glyphs with CSS-drawn indicators or ASCII-safe text, removed redundant Email previews from More, removed the explanatory Quality rule panel, and tightened Quality counts. Clean build passed. Commit `f3b3d4b`.

*Older Found HQ build history (July 6-8: admin dashboard build, comp activation, view-as tooling, payment reliability fixes, builder header gap) is preserved in full in `CHANGELOG.md` and `CHANGELOG_ARCHIVE.md` - trimmed from this file July 20, 2026 since it is no longer the current working window. This section was also deduplicated July 20, 2026: it previously contained the same few July 19/July 10/July 9 paragraphs pasted 4-5 times with sentences cut mid-word (a paste bug), which has been cleaned up here as a best-effort reconstruction of the original content.*

---

## Changed / Finished

- [x] Schedule now opens to `Calendar`, not the Hours editor.
- [x] Schedule has `Calendar`, `Bookings`, and `Hours` tabs.
- [x] Hours is now a readable weekly summary first, with editing made deliberate.
- [x] More page has grouped business-tool sections instead of a flat list.
- [x] Business plan accounts no longer repeat a redundant Included Business Tools sales list.
- [x] Dock and More now share icon language for Requests, Estimates, Schedule, and related tools.
- [x] Blue Luna / balloon decor uses `Estimate Requests` as intake and keeps `Estimates` as a separate tool.
- [x] `Estimate Requests` can hand off to `Create Estimate`.
- [x] Manual Estimate Request save now prompts: create an estimate now or not yet.
- [x] Incoming Estimate Request rows show `Create Estimate` directly on the row.
- [x] Lead temperature no longer silently defaults to Warm.
- [x] Add-lead form is a slide-up sheet instead of an inline card.
- [x] Company switching was parallelized for speed.
- [x] Company switch tap feedback now highlights/spins immediately.
- [x] Camera blocked-permission path now shows guidance instead of leaving the owner on a black screen.
- [x] Added `SESSION_HANDOFF.md` as the current source of truth for AI handoffs.
- [x] Cleaned `BRIEF.md` so every AI starts from the handoff and team approval rules.
- [x] Created `CHANGELOG_ARCHIVE.md` so older detailed history is preserved outside the current changelog.
- [x] Added a `git status` check to `BRIEF.md` Step 1 to close the uncommitted-handoff gap.
- [x] Rebuilt the post-payment confirmation on the public estimate page: client's own logo/name, bigger branded success moment, actual payment breakdown (amount paid + balance due), permanent instead of a 2.2s animation that decayed into a bare "Thank you."
- [x] Team decision: kept `automatic_payment_methods` enabled (Cash App, Klarna, etc. stay available) - Found clients' own customers may need those payment rails, so choice wasn't restricted to card/bank only.
- [x] Estimate builder header gap - first attempt (margin math) turned out not to be the real fix; root cause was `viewport-fit=cover` missing app-wide, fixed at the root in `src/app/layout.tsx`.
- [x] Payment confirmation reliability - `handlePay()` in `AcceptButton.tsx` now retries the "mark as paid" call 3x with backoff instead of firing once with a silently-swallowed error.
- [x] Removed the redundant "ESTIMATE" eyebrow above "New estimate" in the builder header - one clear title, not two lines saying the same thing.
- [x] Verified directly against Supabase: the "Construction" test company's `primary_color` really is `#1565C0` (blue) - the payment sheet's branding is correctly applying it. Not a bug, just a test company whose real brand color happens to resemble Stripe's own blue.
- [x] **Found HQ** - one admin dashboard (`/admin`) replaces four separate `/admin/*` login screens. Sidebar nav on desktop, bottom nav on mobile, home page shows live stats (total/active/comp/new-this-week) plus the 6 most recent signups. Businesses/Photos/Emails/Copy work exactly as before, just inside the shared shell. Pushed as `3ed70ae`.
- [x] Live-tested all 6 July 6 items directly on production - camera permission (blocked + granted), company switching, leads add-sheet, estimate request -> create estimate handoff, and Schedule (Calendar/Bookings/Hours) all confirmed working with screenshots.

---

- [x] Made Found HQ Copy regeneration recoverable: removed bulk regeneration, added explicit confirmation, durable version history, atomic publish/restore functions, server-side admin checks, View site, and Undo changes. Migration 044 applied; build and rollback-only database test passed. Commit `8825321`.

- [x] Rebuilt Found HQ around Steve and Jony's approved operator model: four-item navigation, actionable Overview, compact Businesses workspace, Quality hub, secondary More destination, and one shared responsive visual system. Commit `2bc4fd0`.

- [x] Fixed phone rendering defects from the first Found HQ redesign review: no visible question-mark glyphs, ASCII-safe metadata, CSS chevrons, and simplified Quality/More content. Commit `f3b3d4b`.

## Still Needs Work

- [x] **Stripe Connect webhook gap - CLOSED July 7.** Confirmed via screenshots: the only registered endpoint listened to "Your account" events, not Connected accounts. Shawn created a second event destination in the Stripe Dashboard (sandbox) scoped to Connected accounts, Snapshot payload style, including `payment_intent.succeeded`. `src/app/api/stripe/webhook/route.ts` now tries both `STRIPE_WEBHOOK_SECRET` (platform) and `STRIPE_WEBHOOK_SECRET_CONNECT` (new) when verifying signatures, since each Stripe endpoint signs independently. New secret added to Vercel (production + preview) via API and to `.env.local`. Pushed as `31d34c0`. **Still needs:** the same Connect-scoped destination created in Stripe's *live* mode before actual launch - everything done so far was in the sandbox. Also a stray `empowering-bliss-thin` destination (wrong payload style, unused) should get deleted from the Stripe Dashboard - cleanup only, not blocking.
- [x] **Live-tested July 8** on production: builder gap is gone, redundant header copy is gone (single "New estimate" title), estimate request -> create estimate handoff prefills correctly. Payment retry behavior and the webhook fallback specifically still need a real Stripe test-mode payment run through end to end - not yet done.
- [ ] QA Schedule across quote-first, restaurant, and booking-first profiles.
- [ ] Confirm whether sticky Schedule tabs are worth continuing. Shawn said it is okay if freeze/sticky tabs do not happen.
- [ ] QA payable estimates end to end with Stripe-connected account:
  - Accept and Pay.
  - Accept now, pay later.
  - Receipt email.
  - Owner email.
  - Dashboard states: `Paid`, `Deposit paid`, `Accepted, unpaid`.
  - Public paid state.
- [ ] **Sandbox test list for July 8 (Shawn confirmed "the list is good, keep it for tomorrow" - July 7):**
  - Full onboarding -> activation, start to finish, on a brand-new business: pick a plan, enter a test card, land on the dashboard for the first time. Hasn't been walked through since the plan-selector redesign.
  - Plan upgrades/downgrades and add-on purchases - confirm each transition re-gates the right tools correctly.
  - The "Accept now, pay later" email path specifically (separate from the direct-pay path already tested) - different email, different dashboard state.
  - All items above this one in this list (builder gap, payment retry, confirmation screen, header copy, webhook fallback, Schedule QA).
- [ ] Keep AI estimate builder gated until manual estimate + payment flow passes live QA.
- [ ] Invoice-now / POS-lite planning is still important, but behind live QA and More / Manage IA cleanup.
- [x] **Found-operator tooling (beginning-stage scope) - BUILT July 7-8, not yet tested live.** New `/admin/businesses` page (same shared `admin_key` gate as `/admin/photos` and `/admin/emails`): lists every company, search by name/slug/email, a "View as" button per row, a comp toggle, and a per-business notes field. `getCompany()` now has an admin override - when the selected-company cookie AND a server-verified `admin_key` cookie are both present, it fetches that company without the normal ownership check. Comping a business also sets `subscription_status: "active"`, which is what actually unblocks their dashboard. Dashboard shows a persistent orange "Viewing as [Business] (Admin)" banner with an Exit button whenever this is genuinely active. Pushed as `abe48a1`. Growth-stage needs (role permissions, audit log, churn dashboard) intentionally not built - backlog only.
  - **Must test:** log into `/admin/businesses` (uses the same admin key as `/admin/photos`), search for a real business, tap "View as," confirm the dashboard loads as that business with the orange banner showing, tap Exit and confirm it returns to Shawn's own account. Test the comp toggle on a real inactive test account and confirm the activation banner disappears immediately.

- [x] **Comp-before-the-card-prompt (both options) - BUILT July 8, not yet tested live.** Superseded the "mark comp after onboarding" answer above with two real paths, pushed as `04aaa3a`:
  1. **Comp link - zero card screen, ever.** Start onboarding at `https://foundco.app/onboarding?comp=<your admin key>` (the same key you use to log into `/admin/photos`). The company gets created already active. The final Reveal screen shows "Go to dashboard" instead of "Launch my site" - the business never sees a payment screen at all. Best for a clean demo, but only works if Shawn remembers to use that link.
  2. **In-flow fallback - works no matter how onboarding started.** As long as Shawn's browser already has the admin cookie (from logging into `/admin/photos` or `/admin/businesses` earlier in that session), the real "Launch my site" activation screen shows an extra dashed-orange button - "Activate as comp (Found team)" - right next to the normal plan/payment flow. Tap that instead of entering a card.
  - **Must test:** try the comp link end to end on a throwaway test business, confirm no card screen ever shows. Separately, go through normal onboarding *without* the comp link while logged into `/admin/photos` in the same browser, confirm the "Activate as comp" button appears on the real activation screen and works.

---

## Shawn Test Steps

### 0. Found HQ (new tonight)
1. Go to `foundco.app/admin` (not `/admin/photos` anymore - just `/admin`).
2. Log in with the same access key you've always used.
3. Confirm you land on a new home page with numbers at the top (total businesses, active, comp accounts, new this week) and a card for each tool below.
4. Tap Businesses, Photos, Emails, and Copy from the left menu (or bottom menu on your phone) and confirm each one opens and works like it always has.
5. On Photos, select a few pictures and confirm the "Approve" bar at the bottom is fully readable and tappable - both on your laptop and your phone.
6. On your phone, tap "Sign out" in the bottom bar and confirm you're dropped back to the login screen.

### 1. Camera Permission
1. On a device/browser where camera permission is blocked, open Camera in Found.
2. Confirm you see a clear message telling you how to allow camera access.
3. Confirm it does not stay on a black screen.
4. On a fresh browser/device, confirm the normal camera permission prompt still appears and camera works after Allow.

### 2. Company Switching
1. Open an account with 2+ businesses.
2. Switch from one business to another.
3. Confirm the tapped business highlights immediately and shows a spinner.
4. Confirm the switch feels faster than before.

### 3. Leads / Requests Add Sheet
1. Open a temperature-based business.
2. Tap Add lead/request.
3. Confirm Hot/Warm/Cold has no default selection.
4. Confirm Save is disabled until a temperature is picked.
5. Confirm the form opens as a sheet and the empty state does not show through under it.

### 4. Estimate Requests
1. Open Blue Luna Events or another quote-first business.
2. Confirm the dock says `Requests` or `Estimate Requests` as intended for the current mobile label, not generic `Leads`.
3. Add a new Estimate Request manually.
4. Confirm the prompt appears: create an estimate now or not yet.
5. Choose Create Estimate and confirm the estimate builder opens with customer info prefilled.
6. On an existing Estimate Request row, confirm `Create Estimate` appears without opening the detail sheet.

### 5. Schedule
1. Open Blue Luna Events and tap Schedule.
2. Confirm it opens to Calendar first.
3. Tap Bookings and confirm the empty or booked state is clear.
4. Tap Hours and confirm it shows a readable weekly summary first.
5. Tap Edit and confirm day toggles, time fields, booking settings, and time off still work.
6. Save and refresh to confirm changes persist.

### 6. Estimates / Payments
1. Use a Stripe-connected business.
2. Create and send a new estimate.
3. Open the public estimate link on mobile.
4. Test Accept and Pay with Stripe test mode.
5. Confirm the customer sees a clean success state.
6. Confirm customer receipt and owner notification emails arrive.
7. Repeat on a fresh estimate with Accept now, pay later.
8. Confirm the dashboard state is correct after each path.

---

### 0B. Copy safety pass
1. Use only a throwaway test business whose copy can safely change.
2. Go to `admin.foundco.app/copy`.
3. Confirm there is no `Regenerate All` button.
4. Tap `Regenerate` and confirm the warning lists the live content that will change.
5. Tap Cancel and confirm nothing changes.
6. Reopen the warning, choose `Save and regenerate`, and wait for completion.
7. Tap `View site` and confirm the test site shows the regenerated copy.
8. Tap `Undo changes`, then refresh the public site and confirm the previous copy returns.
9. Do not run this test on a real customer site.

---

### 0C. Found HQ redesign pass
1. Open `admin.foundco.app` on your phone.
2. Confirm the bottom navigation shows only Overview, Businesses, Quality, and More.
3. On Overview, confirm attention rows and new businesses are readable and useful.
4. Search for a business from Overview and confirm Businesses opens with that search.
5. On Businesses, test All, Attention, Setup, No logo, and Payments filters.
6. Confirm Site and View as still work. Open Manage and confirm notes and comp controls still work.
7. Open Quality, then Website copy, Photo library, and Email previews.
8. Open More and confirm Sign out is there, not in the mobile dock.
9. Check that no content is hidden behind the bottom navigation.

---

## Required End-Of-Session Update

Before ending any work session, update this file with:

1. What changed or shipped.
2. What still needs work.
3. Shawn's plain-English test steps.
4. Commit hash, if a commit was made.

If there was a product or design decision, also update `DECISIONS.md` or `DESIGN_DECISIONS.md`.
If there was meaningful code or QA work, also update `CHANGELOG.md`.
If priorities changed, also update `TASKS.md`.

---

## July 8, 2026 - Found HQ V2 Reset Audit

### What changed
- Audited the current Found HQ product, schema, onboarding capture, and production aggregates.
- Recorded the full recommendation in `FOUND_HQ_V2_AUDIT.md`.
- No production behavior, schema, or UI changed.

### Key findings
- The current HQ is a useful support console but not a Found Co sales/client operating system.
- All 10 abandoned-onboarding rows use one email and overlap an existing company; they are not a real prospect pipeline.
- Stripe customer presence and subscription status are insufficient to represent client health.
- The recommended primary navigation is Today, Sales, Clients, and More.

### Next approval
- Shawn reviews and approves the detailed V2 workflow and data model.
- After approval, start Phase 1 with a migration and backfill dry run before touching production records.

---

## July 8, 2026 - Found HQ V2 Foundation

### Shipped
- Production schema for Found Co prospects, sales activities, client activities, client state, and test-account classification.
- Primary navigation: Today, Sales, Clients, More.
- Functional prospect creation, contact links, stage changes, follow-up scheduling, loss reasons, and activity logging.
- Client filtering, relationship state, test classification, dated notes, Site, and View as.
- Quality tools moved under More.

### Important
- Existing companies were conservatively classified as Active or Onboarding from subscription state.
- Existing test companies are not guessed automatically. Mark them Test from Clients before trusting client totals.
- The old tenant `leads` table was not repurposed or changed.

### Shawn's test pass
1. Open Found HQ on iPhone and confirm the dock reads Today, Sales, Clients, More.
2. On Today, confirm setup blockers appear in priority order and each Resolve action opens the matching client.
3. Open Sales and add one throwaway prospect with your own contact information.
4. Confirm Call/Text/Email links appear for the information entered.
5. Open Update, change the stage, schedule a follow-up, and log a note.
6. Return to Today and confirm the prospect appears when it is new or due.
7. Open Clients, find one known test company, open Manage relationship, and classify it Test.
8. Add a dated note and confirm it appears as Latest after saving.
9. Confirm Site and View as still work.
10. Open More and confirm Website copy, Photo library, and Email previews still open.

---

## July 8, 2026 - Found HQ Brand Refinement

### Changed
- Applied Jony's Found HQ visual system across Today, Sales, Clients, More, and the shared shell.
- Green now signals identity, selection, and commitment instead of filling repeated controls.
- Primary operational content uses quiet separators and spacing instead of stacked cards.
- Added `FOUND_HQ_BRAND_SYSTEM.md` as the implementation standard.

### Test
1. Compare Today, Sales, Clients, and More on iPhone.
2. Confirm no filters scroll horizontally and no text overlaps.
3. Confirm Site, View as, Manage relationship, Add prospect, and quality links still work.

---

## July 8, 2026 - Native iPhone Typography

### Changed
- Found HQ mobile typography now follows a native iOS scale across every primary screen and form.
- Body and row titles are 17-18px; supporting information is 13-15px; page titles are 34px.

### Test
1. Open Today, Sales, Clients, and More on iPhone.
2. Confirm supporting text is comfortable without zooming.
3. Confirm longer client metadata wraps cleanly and no controls overlap.
