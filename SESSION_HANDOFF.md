# SESSION_HANDOFF.md - Found Co. Current Truth
### Start here after `BRIEF.md`. Keep this short, current, and plain-English.
*Last updated: July 19, 2026*

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
- **New July 19 hero video loop fix:** Shawn found a selected home hero video played once and then went black. Public layouts now use a shared `HeroVideo` renderer with muted inline autoplay, loop, preload, and an explicit restart on ended; Editorial and Portrait layouts also now honor `hero_video_url`. Build passes. Test next: assign a short Header video and confirm the live home hero keeps replaying.

- **New July 19 video upload save fix:** Shawn found recorded videos did not appear in Photos/Unsorted. Read-only Supabase audit showed no video rows existed in `company_photos`, so the problem was upload/save, not the heart/star UI. Video uploads now use signed direct browser-to-Supabase storage, then Found records the row; failed uploads now show an error instead of silently disappearing. Build passes. Test next: record or upload a short video, confirm it appears in Photos -> Unsorted with a VIDEO badge, then heart/star it.
- **New July 19 contact editing + video media foundation:** Site Editor now exposes editable Contact Page copy, adds a Contact media slot, and supports video uploads/previews in Photos. Header media can now be a video hero through `hero_video_url`; public home/contact render selected videos safely with muted looping playback. Build passes. Test next: upload a short video in Photos, confirm the VIDEO badge/playback, assign Header or Contact media in Edit My Site, then open the public home/contact pages.
- **New July 18 named site photo slots:** Site Editor now has explicit Header, About, Visit / CTA, and Gallery photo slots instead of one confusing header-only photo picker. Public home/about/services layouts now use those owner-selected section photos before stock imagery. No slideshow was added yet; motion remains a later explicit owner setting. Build passes. Test next: More -> Edit My Site -> Site Photos, assign photos to each slot, then open the live home/about/services pages and confirm the correct section photos show.
- **New July 18 Site Editor escape fix:** Shawn confirmed the previous full-screen text editor still looked bad and trapped him with no obvious close. The copy editor is now a true full-screen editor with permanent top Close and Save controls; the fragile bottom button row was removed from the keyboard zone. Build passes. Test next: Edit My Site -> Supporting Line, confirm Close/Save stay visible and dragging does not expose the dashboard behind it.
- **New July 18 mobile Site Editor sheet lock:** The text-edit sheet now locks dashboard/body scroll while open, sizes itself to the mobile visual viewport, and uses a stronger scrim/contained overscroll so the page behind it does not show through or yo-yo under the keyboard. Build passes. Team next: add header photo motion as an explicit owner setting, not a surprise carousel.
- **New July 18 site header photo editing:** Site Editor now has an explicit Header Photo picker instead of mystery thumbnails. Selecting a header photo updates `website_config.hero_image_url` and `hero_images`, so the public home hero can actually use the owner-selected photo. Removing it clears those public config fields and falls back to stock/default imagery. The text-edit sheet now sits above mobile nav/keyboard with sticky Save/Cancel controls. Test next: More -> Edit My Site -> Header Photo -> Change, pick a photo, open the live site and confirm the hero updates; then remove it and confirm fallback returns.
- **New July 15 Stripe Connect merchant responsibility fix:** Shawn finished live Connect setup but T-Shirts payout onboarding still failed because Found created Express accounts with `fees.payer = application` and `losses.payments = application`. Craig approved changing the responsibility model so the connected merchant/Stripe side carries the payment fee/loss controller model. New accounts now use `fees.payer = account` and `losses.payments = stripe`; owner-facing errors are sanitized. Build passes with cmd /c npm run build; production deploy is live at found-websites-38uz6ux12-foundco.vercel.app.
- **New July 14 public business name polish guard:** Shawn found `tshirts` still lowercase on `/shop`. Root cause: prior copy polish covered `website_config` fields, but public pages still received raw `company.name`. `src/lib/company.ts` now polishes `company.name` once in the shared public company loader, covering home/shop/order/menu/contact/reserve/gallery/subscribe/quote/nav/footer/custom-domain paths that use `getCompanyBySlug` or `getCompanyByDomain`. Build passes with `cmd /c npm run build`.
- **New July 14 public commerce fallback safety:** Shawn found the public shop page exposing internal setup language (`payout account`, `No products yet`, cart chrome) on an unfinished retail shop. Shared `/[slug]/shop` now shows a polished coming-soon/contact fallback until payments and products are both ready. Shared online ordering and both commerce checkout APIs now use customer-safe fallback wording instead of Stripe/setup language. Build passes with cmd /c npm run build.
- **New July 14 selected-company cookie selector fix:** Switching still stuck on the last business. Root cause is likely duplicate same-name cookies plus cookies().get() choosing a stale value. getCompany() now prefers a new ound_selected_company_id cookie, falls back to legacy ound_company_id, and reads all duplicates using the last value. The select-company route writes both names. Build passes. Test next: switch Tacos -> tshirts and back.
- **New July 14 selected-company cookie scope fix:** Hard navigation still stayed on tshirts, likely because old root-domain and new host-only ound_company_id cookies could both exist. /dashboard/api/select-company now writes the selected company ID to both scopes on Found domains. Build passes. Test next: switch tshirts -> Tacos and confirm the dashboard leaves tshirts.
- **New July 14 hard business switch boundary:** Shawn still saw Tacos in the header but tshirts plan/name data in the More page after switching. Follow-up fix changes the company picker from a soft server-action transition to a hard browser navigation through /api/select-company, forcing a full document load after the selected-company cookie is set. Build passes. Test next: switch tshirts -> Tacos and confirm Home, Reservations, Guests, and More all show Tacos with no tshirts body data.
- **New July 14 dashboard integrity fix:** Shawn found mixed dashboard state across tshirts, Tacos, Taco Shop, Construction, and Musician. Read-only audit found core lead/customer queries are scoped by company_id, but selected-company rendering could go stale after switching because getCompany() was cached only by user ID/email. Also, Found Business granted every add-on globally and the dashboard exposed irrelevant tools by add-on instead of by industry. Fixed by removing cookie-insensitive getCompany() caching, forcing the dashboard shell dynamic, revalidating company selection, making Orders industry-aware, adding music to schedule-first routing, and making Home smart messages industry-aware for every active plan. Build passes. Test next: switch across tshirts, Tacos, Taco Shop, Construction, and Musician and verify greeting, picker, More plan, tabs, page titles, and Home message all match the selected business.
- **Simple promo July 10:** Replaced the hard-to-type random live promo with F0UND1128 because Stripe does not allow ! in promotion codes. Production setup route created F0UND1128 in live mode, disabled the previous active Found  promo, and verified reruns reuse F0UND1128 without duplicates. F0UND1128 remains one-use and leaves ## Current Status

- **New July 19 video upload save fix:** Shawn found recorded videos did not appear in Photos/Unsorted. Read-only Supabase audit showed no video rows existed in `company_photos`, so the problem was upload/save, not the heart/star UI. Video uploads now use signed direct browser-to-Supabase storage, then Found records the row; failed uploads now show an error instead of silently disappearing. Build passes. Test next: record or upload a short video, confirm it appears in Photos -> Unsorted with a VIDEO badge, then heart/star it.
- **New July 19 contact editing + video media foundation:** Site Editor now exposes editable Contact Page copy, adds a Contact media slot, and supports video uploads/previews in Photos. Header media can now be a video hero through `hero_video_url`; public home/contact render selected videos safely with muted looping playback. Build passes. Test next: upload a short video in Photos, confirm the VIDEO badge/playback, assign Header or Contact media in Edit My Site, then open the public home/contact pages.
.00 due on the Found Starter intro plan first invoice.
- **Live Stripe billing bootstrap July 10:** Vercel production now has live Stripe keys, the protected Stripe setup route was upgraded and run in live mode, live products/prices were created or reused, Vercel production price env vars were updated to the live price IDs, production was redeployed, and the one-use FOUND1 promo exists for the base Found intro plan. FOUND1 leaves ## Current Status

- **New July 19 video upload save fix:** Shawn found recorded videos did not appear in Photos/Unsorted. Read-only Supabase audit showed no video rows existed in `company_photos`, so the problem was upload/save, not the heart/star UI. Video uploads now use signed direct browser-to-Supabase storage, then Found records the row; failed uploads now show an error instead of silently disappearing. Build passes. Test next: record or upload a short video, confirm it appears in Photos -> Unsorted with a VIDEO badge, then heart/star it.
- **New July 19 contact editing + video media foundation:** Site Editor now exposes editable Contact Page copy, adds a Contact media slot, and supports video uploads/previews in Photos. Header media can now be a video hero through `hero_video_url`; public home/contact render selected videos safely with muted looping playback. Build passes. Test next: upload a short video in Photos, confirm the VIDEO badge/playback, assign Header or Contact media in Edit My Site, then open the public home/contact pages.
- **Simple promo July 10:** Replaced the hard-to-type random live promo with F0UND1128 because Stripe does not allow ! in promotion codes. Production setup route created F0UND1128 in live mode, disabled the previous active Found  promo, and verified reruns reuse F0UND1128 without duplicates. F0UND1128 remains one-use and leaves ## Current Status

- **New July 19 video upload save fix:** Shawn found recorded videos did not appear in Photos/Unsorted. Read-only Supabase audit showed no video rows existed in `company_photos`, so the problem was upload/save, not the heart/star UI. Video uploads now use signed direct browser-to-Supabase storage, then Found records the row; failed uploads now show an error instead of silently disappearing. Build passes. Test next: record or upload a short video, confirm it appears in Photos -> Unsorted with a VIDEO badge, then heart/star it.
- **New July 19 contact editing + video media foundation:** Site Editor now exposes editable Contact Page copy, adds a Contact media slot, and supports video uploads/previews in Photos. Header media can now be a video hero through `hero_video_url`; public home/contact render selected videos safely with muted looping playback. Build passes. Test next: upload a short video in Photos, confirm the VIDEO badge/playback, assign Header or Contact media in Edit My Site, then open the public home/contact pages.
.00 due on the Found Starter intro plan first invoice.
.00 due on the first invoice and did not duplicate on verification. Next test: fresh onboarding, choose Found Starter, apply `F0UND1128`, activate, and verify Stripe invoice/subscription plus Found activation state.
- **Activation promo codes Phase 1:** Added a Stripe-native promo-code field to the activation payment screen. Shawn creates coupons/promotion codes in Stripe Dashboard; Found validates active promotion codes, shows the discounted monthly price, stores promo metadata on the SetupIntent, applies the discount when creating the Stripe subscription, and records promo audit fields when migration database/migrations/046-activation-promo-audit.sql is applied. Build passes. Test next: create a live Stripe promotion code for a small charge (for example a fixed/percent discount that leaves ## Current Status

- **New July 19 video upload save fix:** Shawn found recorded videos did not appear in Photos/Unsorted. Read-only Supabase audit showed no video rows existed in `company_photos`, so the problem was upload/save, not the heart/star UI. Video uploads now use signed direct browser-to-Supabase storage, then Found records the row; failed uploads now show an error instead of silently disappearing. Build passes. Test next: record or upload a short video, confirm it appears in Photos -> Unsorted with a VIDEO badge, then heart/star it.
- **New July 19 contact editing + video media foundation:** Site Editor now exposes editable Contact Page copy, adds a Contact media slot, and supports video uploads/previews in Photos. Header media can now be a video hero through `hero_video_url`; public home/contact render selected videos safely with muted looping playback. Build passes. Test next: upload a short video in Photos, confirm the VIDEO badge/playback, assign Header or Contact media in Edit My Site, then open the public home/contact pages.
- **Simple promo July 10:** Replaced the hard-to-type random live promo with F0UND1128 because Stripe does not allow ! in promotion codes. Production setup route created F0UND1128 in live mode, disabled the previous active Found  promo, and verified reruns reuse F0UND1128 without duplicates. F0UND1128 remains one-use and leaves ## Current Status

- **New July 19 video upload save fix:** Shawn found recorded videos did not appear in Photos/Unsorted. Read-only Supabase audit showed no video rows existed in `company_photos`, so the problem was upload/save, not the heart/star UI. Video uploads now use signed direct browser-to-Supabase storage, then Found records the row; failed uploads now show an error instead of silently disappearing. Build passes. Test next: record or upload a short video, confirm it appears in Photos -> Unsorted with a VIDEO badge, then heart/star it.
- **New July 19 contact editing + video media foundation:** Site Editor now exposes editable Contact Page copy, adds a Contact media slot, and supports video uploads/previews in Photos. Header media can now be a video hero through `hero_video_url`; public home/contact render selected videos safely with muted looping playback. Build passes. Test next: upload a short video in Photos, confirm the VIDEO badge/playback, assign Header or Contact media in Edit My Site, then open the public home/contact pages.
.00 due on the Found Starter intro plan first invoice.
- **Live Stripe billing bootstrap July 10:** Vercel production now has live Stripe keys, the protected Stripe setup route was upgraded and run in live mode, live products/prices were created or reused, Vercel production price env vars were updated to the live price IDs, production was redeployed, and the one-use FOUND1 promo exists for the base Found intro plan. FOUND1 leaves ## Current Status

- **New July 19 video upload save fix:** Shawn found recorded videos did not appear in Photos/Unsorted. Read-only Supabase audit showed no video rows existed in `company_photos`, so the problem was upload/save, not the heart/star UI. Video uploads now use signed direct browser-to-Supabase storage, then Found records the row; failed uploads now show an error instead of silently disappearing. Build passes. Test next: record or upload a short video, confirm it appears in Photos -> Unsorted with a VIDEO badge, then heart/star it.
- **New July 19 contact editing + video media foundation:** Site Editor now exposes editable Contact Page copy, adds a Contact media slot, and supports video uploads/previews in Photos. Header media can now be a video hero through `hero_video_url`; public home/contact render selected videos safely with muted looping playback. Build passes. Test next: upload a short video in Photos, confirm the VIDEO badge/playback, assign Header or Contact media in Edit My Site, then open the public home/contact pages.
- **Simple promo July 10:** Replaced the hard-to-type random live promo with F0UND1128 because Stripe does not allow ! in promotion codes. Production setup route created F0UND1128 in live mode, disabled the previous active Found  promo, and verified reruns reuse F0UND1128 without duplicates. F0UND1128 remains one-use and leaves ## Current Status

- **New July 19 video upload save fix:** Shawn found recorded videos did not appear in Photos/Unsorted. Read-only Supabase audit showed no video rows existed in `company_photos`, so the problem was upload/save, not the heart/star UI. Video uploads now use signed direct browser-to-Supabase storage, then Found records the row; failed uploads now show an error instead of silently disappearing. Build passes. Test next: record or upload a short video, confirm it appears in Photos -> Unsorted with a VIDEO badge, then heart/star it.
- **New July 19 contact editing + video media foundation:** Site Editor now exposes editable Contact Page copy, adds a Contact media slot, and supports video uploads/previews in Photos. Header media can now be a video hero through `hero_video_url`; public home/contact render selected videos safely with muted looping playback. Build passes. Test next: upload a short video in Photos, confirm the VIDEO badge/playback, assign Header or Contact media in Edit My Site, then open the public home/contact pages.
.00 due on the Found Starter intro plan first invoice.
.00 due on the first invoice and did not duplicate on verification. Next test: fresh onboarding, choose Found Starter, apply `F0UND1128`, activate, and verify Stripe invoice/subscription plus Found activation state.
 or $10 due), onboard a fresh test business, apply the code on /activate, and confirm Stripe invoice/subscription plus Found activation state.
- **Launch audit July 9:** Team verdict is no-go for open self-serve launch; controlled pilot only. Production health and build pass, but four P0 gates remain: live Stripe Connect destination/payment QA, a fresh onboarding-to-first-lead journey, sitemap exclusion of test/unready companies, and removal or completion of unverified paid-plan claims. Full findings: `LAUNCH_READINESS_AUDIT_2026-07-09.md`.
- **Phone QA follow-up:** Shawn's screenshots exposed question marks where Unicode chevrons, arrows, and separators should render. Replaced all affected admin UI glyphs with CSS-drawn indicators or ASCII-safe text, removed redundant Email previews from More, removed the explanatory Quality rule panel, and tightened Quality counts. Clean build passed. Commit `f3b3d4b`.
- **New July 8:** Found HQ was redesigned as an operator workspace. Primary navigation is now Overview, Businesses, Quality, and More. Overview shows actionable setup/quality signals; Businesses is compact and filterable; Copy, Photos, and Email previews live under Quality; Sign out moved to More on mobile. Shared visual tokens and consistent specialist-tool framing shipped in code commit `2bc4fd0`.
- **New July 8:** Copy regeneration is now recoverable and admin-only. `Regenerate All` was removed. Every regeneration requires confirmation, atomically snapshots the eight affected live-copy fields in Supabase, and exposes `View site` plus one-tap `Undo changes`. Undo creates its own recovery snapshot before restoring. Migration 044 was applied and its permissions verified; rollback-only publish/restore testing passed. Code commit: `8825321`.
- Repo is on `main`.
- Latest functional commit: `f3b3d4b` - `Fix Found HQ mobile glyph rendering`.
- Copy safety code is committed; this handoff update is pending its documentation commit and push.
- **New tonight:** Live-tested all 6 July 6 items directly against production (`my.foundco.app`), logged in as a real session via a minted Supabase magic link (no password needed) - all 5 testable flows (camera permission blocked/granted, company switching, leads add-sheet, estimate request -> create estimate handoff, schedule tabs) confirmed working with screenshots at every step. Left one obviously-labeled test lead ("TEST â€” Claude QA") on Blue Luna Events - safe to delete, not cleaned up automatically.
- **New tonight:** Built "Found HQ" - one unified admin dashboard replacing the four separate `/admin/*` pages that each had their own login screen. See "Changed / Finished" and the July 8 (part 2) changelog entry for full detail. Two real bugs were found and fixed by scripted click-through testing (not just screenshots) before this shipped - most seriously, a mobile layout bug that would have silently made almost the entire admin app untappable on a phone.
- Shawn live-tested all 6 July 6 items on `my.foundco.app` on July 7. Results: Camera, Company Switching, Leads/Requests sheet, Schedule all confirmed working. Estimate Requests confirmed working but surfaced a new bug (builder header gap). Estimates/Payments confirmed working but flagged a serious one: after paying, the estimate still showed the full unpaid balance.
- Traced the payment issue: the client-side "mark as paid" call had no error handling - if it failed, the customer's card was still charged successfully but our own record never updated, and nothing told anyone it happened. Now retries 3x. **Not fully closed** - see "Still Needs Work," the Stripe Dashboard webhook config needs a human to verify since no AI in this session has Stripe Dashboard access.
- Builder gap took 3 attempts to actually fix. Attempt 1 (margin math) and attempt 2 (`viewport-fit=cover`, which turned out to already be set one layer down) both missed the real cause. Attempt 3: removed `position: sticky` entirely - it was likely desyncing from true viewport top during iOS momentum/bounce scroll. Header is now genuinely `position: fixed` with its real height measured via `ResizeObserver`, not guessed. This is a structurally different fix, not another parameter tweak - confirmed fixed live on production July 8 (see Estimate Requests test above: no gap, single clean title).

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
