## Session: July 20, 2026 - Full Team Audit + Payment Trust Fix
**AI:** Claude Code (Opus)
**Worked on:** Shawn asked for a full team audit before launch. Five parallel domain audits (product/journey, payments/data, public web, architecture/security, design/mobile) re-read the current code against the July 9 launch audit, since ~80 commits had shipped since with nothing re-verified.

### Found
- Full findings in `LAUNCH_READINESS_AUDIT_2026-07-20.md` - 5 P0s (up from July 9's 4), most urgent being a live payment-trust bug independent of launch timing.
- Most other July 9 P1s (security headers, rate limiting, comp-link secret, no CI/tests) confirmed still untouched.

### Fixed (Shawn approved same session)
- **Payment trust bug:** `src/app/[slug]/api/accept-estimate/[id]/route.ts` previously marked an estimate `paid` straight from an unauthenticated `{ paid: true }` request body with zero Stripe verification. Now requires a `payment_intent_id`, retrieves it from Stripe scoped to the company's Connect account, and verifies `status === "succeeded"` plus `metadata.estimate_id`/`metadata.company_id` match before writing anything. `src/app/[slug]/q/[id]/AcceptButton.tsx` now passes the real `paymentIntent.id` returned by `stripe.confirmPayment()`.
- **Companion gap:** `src/app/api/stripe/webhook/route.ts` only ever handled `payment_intent.succeeded` events tagged `estimate_deposit`; balance payments (`estimate_balance`, added when the July 15 remaining-balance work shipped) had no handler at all, so a real Stripe-confirmed balance payment had no server-side path to mark the estimate paid. Added a matching `estimate_balance` branch - marks `payment_status: "paid"`, sends owner/customer emails, guarded against double-processing via `!estimate.paid_at`.
- Verified with `npm run build` - clean, all 89+ pages generate.

### Test Next
- Run a real test-mode deposit payment end to end on a Stripe-connected estimate, confirm it still marks `deposit_paid` correctly.
- Run a real test-mode balance payment (pay deposit first, then pay the remaining balance), confirm the webhook now marks it `paid` and sends the "final payment received" emails.
- Confirm a bare POST to `/api/accept-estimate/[id]` with `{paid:true}` and no valid `payment_intent_id` is now rejected (400), not silently marked paid.

### Also shipped this session - Analytics Phase 1
Shawn asked for a way to monitor traffic/activity for marketing purposes. Confirmed zero analytics existed anywhere in the codebase beforehand (no tracking package, no tracking code). Scoped as two phases per Shawn: Phase 1 (simple site analytics, foundco.app only) now, Phase 2 (funnel/attribution across onboarding -> activation, likely PostHog) as a future session.

- Added `@vercel/analytics` and rendered `<Analytics />` in `src/app/layout.tsx`, gated behind a new `x-found-root-site` request header that `src/middleware.ts` only sets on requests to `foundco.app`/`www.foundco.app`. Tenant sites, `my.foundco.app` (dashboard), and `admin.foundco.app` never get this header, so Found's own traffic tracking cannot leak into a customer's site or the dashboard.
- No cookie banner needed - Vercel Web Analytics is cookieless/first-party.
- Verified with `npm run build` - clean.
- **Not yet confirmed:** whether Web Analytics needs a one-time enable in the Vercel project dashboard before data starts flowing (this varies by plan) - check `vercel.com/<team>/found-websites/analytics` after the next deploy.

### Test Next (analytics)
- After deploying, visit `foundco.app` a few times and confirm visits show up in the Vercel Analytics tab within a few minutes.
- Visit a tenant site (e.g. a `*.foundco.app` subdomain) and confirm it does NOT show up in the same analytics - separately confirms the scoping actually works, not just that tracking exists.

---

## DOC GAP BACKFILL - Entries below reconstructed July 20, 2026

The sessions from July 13 through July 20 below were not logged in real time - `git log` showed ~80 commits with no matching CHANGELOG/SESSION_HANDOFF entries. Reconstructed from commit messages and confirmed with Shawn during a documentation catch-up pass. AI attribution is unknown (git author is just Shawn's machine login for every commit regardless of which AI made the change), so it's omitted below instead of guessed.

---
## Session: July 20, 2026 - Photo Picker and Camera Polish

### Completed
- Added a 3-option add-to-project flow (Take Photo, Upload, Use Existing) - previously adding a photo inside a project skipped straight to live camera capture with no way to upload from the library or reuse an existing Found photo. New projects now open this picker immediately instead of leaving the owner in an empty project.
- Fixed a broken-encoding zoom label ("1Ã—" instead of "1x") - same glyph-corruption bug family as earlier chevron/arrow issues.
- Matched the Photos page camera button to Home's camera button - both now open the same picker sheet when browsing the general library, while still jumping straight to camera with the album preselected when already inside a specific project.

---
## Session: July 19, 2026 - Payment Receipt and Stripe Connect Fixes

### Completed
- Fixed payment/deposit receipt emails to show the business's own name instead of "Found" - this was the one customer email that had missed the "show the business name" treatment already applied to leads, bookings, online orders, and sent estimates. Fix is shared across every industry that takes estimate payments.
- Added a live-mode Stripe Connect webhook signing secret - the Connect webhook destination previously only existed in Stripe sandbox mode. **This closes the P0 launch-payment gate flagged July 7** (webhook handler now tries platform, sandbox-Connect, and live-Connect secrets). Confirmed ready for QA by Shawn.
- Added business profile/settings detail to the admin Stripe Connect audit route (read-only, admin-key gated) - used to verify a connected account's receipt-email sender name and a prior per-account decision to disable Stripe's automatic receipt email.
- Fixed black video thumbnails in the dashboard Photos grid - video tiles only loaded metadata before; some phones showed a black frame instead of a preview. Now forces real video-data loading and fades in once a frame is ready, with a play-icon overlay.

### Test Next
- Confirm a real payment/deposit receipt email shows the business name, not "Found."
- Run the launch-payment QA list in `TASKS.md` NOW #1 now that the live webhook secret is in place.

---
## Session: July 18, 2026 - Dashboard Badge Clearing

### Completed
- Fixed dashboard badges (unread indicators) so they clear once the owner actually views the item, instead of persisting after it's been seen.

---
## Session: July 17, 2026 - Mobile Checkout Stabilization

### Completed
- Stabilized mobile checkout sheets on the public shop/ordering pages - float/hide the cart bar correctly during checkout, keep the checkout sheet above the cart bar instead of behind it.
- Order confirmation/receipt emails for online orders now come from Found under the business's own branding ("Found own order receipts") rather than a generic sender.

### Test Next
- Add items to cart on a mobile shop page, open checkout, confirm the cart bar hides/reappears correctly and nothing overlaps.

---
## Session: July 16, 2026 - Product Catalog and Online Shop Rebuild

**This is a major feature that was not logged when it shipped.** Confirmed by Shawn July 20, 2026: live and tested.

### Completed
- Built an industry-aware product catalog editor with dedicated menu and products managers (previously catalog/menu/rate-sheet data lived in three disconnected places - see the "Unified Product/Service Catalog" backlog note in `TASKS.md` for the cross-system vision this partially realizes).
- Added catalog variants and inventory controls; sold-out product choices now show correctly in the public shop instead of disappearing or erroring.
- Added a homepage catalog showcase and cleaned up product card presentation.
- Moved public ordering checkout into a cart sheet; added a cart bar that renders on the active shop page.
- Polished catalog manager rows, category actions, and the mobile checkout sheet for a quieter, less database-like feel.

### Test Next (per Shawn: already tested, logging for the record)
- Add a product with variants and inventory, confirm sold-out states show correctly on the public shop.
- Complete a full public checkout through the new cart sheet on mobile.

---
## Session: July 15, 2026 - Plan Upgrades, Stripe Connect Payout Tooling, Estimate Payment Fixes

### Completed
- **Plan upgrade flow rebuilt:** added a Found plan upgrade sheet, created a Stripe portal config scoped to the target price, and routed plan upgrades through Stripe's own portal instead of a custom in-app flow. Per Shawn, this also resolved the previously-unresolved "plan card savings display" decision - see `DECISIONS.md` [2026-07-15].
- **Stripe Connect payout tooling:** added an admin Stripe Connect audit page, a Stripe payout handoff sheet (with a timeout guard), and repaired invalid/incomplete Connect account setups found during the audit.
- **Estimate payment fixes:** fixed remaining-balance calculation on estimate payments, confirmed estimate payment requests actually send, cleaned up estimate payment row display, and clarified payment-request/queue wording. May close part of the outstanding estimate/payment QA checklist in `SESSION_HANDOFF.md` - not yet confirmed which specific items.
- Fixed the mobile menu item editor's save flow.
- Merchant responsibility Stripe Connect fix (`fees.payer = account`, `losses.payments = stripe`) - see the July 15 entry already logged below for full detail.

### Test Next
- Run a plan upgrade end to end through the new Stripe portal flow and confirm the savings/discount display looks right.
- Re-run the estimate/payment QA checklist to see which items these fixes actually closed out.

---
## Session: July 14, 2026 - Additional Dashboard Routing Fixes

*(Supplements the July 14 "Dashboard Company and Tool Integrity" entry already logged below - these are the remaining commits from that day that weren't captured.)*

### Completed
- Added Found Business dollar promo setup.
- Fixed leads title flicker on load.
- Fixed dashboard request-routing taxonomy and lead-notification routing.
- Fixed industry-aware location sections.
- Restored Express Connect controller settings (related to the July 15 Stripe Connect merchant-responsibility fix).

---
## Session: July 13, 2026 - Copy Quality Audit and Repair System

**Confirmed by Shawn July 20, 2026: this ran against real production/customer sites, not just test companies.**

### Completed
- Added a read-only copy quality audit across live company website copy.
- Staged the fix rollout by risk: cleared high-risk issues first, then reduced medium-risk issues, with a dry-run repair plan and guarded apply step before touching production.
- Added a copy quality fixture gate and applied it to production copy polish going forward, so future copy generation is checked against the same rules.
- Split the homepage and about-page copy models, and split regenerated about-copy fields so they don't overwrite each other.
- Removed redundant about-copy intros and prevented repeated human-industry labels (e.g. saying "barber" three different ways in one paragraph).
- Added faith-specific website copy and fixed faith about-page copy.
- Tightened apparel-specific copy quality rules.
- Prevented duplicate service copy.

### Test Next
- Spot-check a handful of real customer sites' About/Home copy for quality and confirm no regressions from the staged fixes.

---
## Session: July 19, 2026 - Hero Video Loop Blend
**AI:** Codex
**Worked on:** Smoothed hero video restarts for both app-recorded and uploaded videos.

### Completed
- Kept one shared `HeroVideo` path for every public home hero video source.
- Added a subtle fade blend near the loop point so imperfect clips do not restart as sharply.
- Preserved the explicit restart fallback for iOS/Safari if the video still reaches an ended state.
- Verified with `git diff --check` and `npm.cmd run build`.

### Test Next
- Test one video recorded in Found and one uploaded video as Header media. Confirm both keep moving and the loop point feels less abrupt.

---
## Session: July 19, 2026 - Hero Video Loop Fix
**AI:** Codex
**Worked on:** Fixed selected home hero videos ending on a black frame.

### Completed
- Added a shared hero video renderer with muted autoplay, inline playback, looping, preload, and an explicit ended-event restart for iOS.
- Replaced one-off hero video tags in Impact and Cinematic layouts with the shared renderer.
- Added hero video support to Editorial and Portrait home layouts so selected header videos are not ignored on those templates.
- Verified with `git diff --check` and `npm.cmd run build`.

### Test Next
- On iPhone, assign a short video to Header in Edit My Site, open the live home page, and confirm the hero keeps replaying instead of going black.

---
## Session: July 19, 2026 - Video Upload Save Fix
**AI:** Codex
**Worked on:** Fixed videos disappearing before they could be hearted/starred in Photos.

### Completed
- Audited Supabase and confirmed the issue was not the Photos filter: videos were not being inserted into `company_photos`.
- Added signed direct video uploads to Supabase Storage, then records the completed upload in Found.
- Kept regular photo uploads on the existing path while preserving album placement for both paths.
- Camera and library uploads now show a real error if a save fails instead of leaving Unsorted empty.
- Verified with `git diff --check` and `npm.cmd run build`.

### Test Next
- On iPhone, record or upload a short video, then open Photos -> Unsorted. Confirm the video appears with a VIDEO badge and can be hearted/starred.

---## Session: July 19, 2026 - Contact Editing + Video Media Foundation
**AI:** Codex
**Worked on:** Made the contact page editable and added safe video handling for dashboard media and public hero slots.

### Completed
- Added Contact Page copy controls in Edit My Site for label, headline, supporting line, form headline, and form note.
- Added a Contact media slot under Site Photos so owners can control the public contact hero image/video.
- Photos now accepts video uploads, marks videos with a VIDEO badge, and opens videos in a playable preview.
- Public home/contact hero media can render selected videos as muted looping background media while photos continue to work normally.
- Verified with `git diff --check` and `npm.cmd run build`.

### Test Next
- Upload a short video from Photos, assign it to Header or Contact in Edit My Site, then open the public home/contact pages and confirm the selected media renders.

---## Session: July 18, 2026 - Named Site Photo Slots
**AI:** Codex
**Worked on:** Replaced the single confusing header-photo path with named website image slots.

### Completed
- Site Editor now shows explicit slots: Header, About, Visit / CTA, and Gallery.
- Owners can choose which website area a hearted photo belongs to instead of guessing from tiny thumbnails.
- Public home/about/services layouts now prefer those section-specific owner photos before falling back to stock imagery.
- No slideshow or random rotation was added yet; motion remains a later explicit owner setting.
- Verified with `git diff --check` and `cmd /c npm run build`.

### Test Next
- On `my.foundco.app`, open More -> Edit My Site -> Site Photos. Assign one photo each to Header, About, Visit / CTA, and Gallery, then open the public home/about/services pages and confirm those exact sections use the selected photos.

---# CHANGELOG.md - Current Session History
### Keep this file readable. Older detailed history lives in `CHANGELOG_ARCHIVE.md`.
*Last organized: July 6, 2026*

---

## Session: July 18, 2026 - Site Copy Editor Escape Fix
**AI:** Codex
**Worked on:** Replaced the trapped mobile copy editor with a true full-screen editor.

### Completed
- Added a permanent top `Close` control so the owner is never trapped behind the iOS keyboard.
- Moved Save into the top bar instead of the keyboard area.
- Removed the fragile bottom action row that could drift, expose the page behind it, or become unreachable.

### Test Next
- Edit My Site -> tap Supporting Line. Confirm Close and Save are visible at the top with the keyboard open, and dragging the editor does not reveal the dashboard behind it.

---
## Session: July 18, 2026 - Site Edit Sheet Lock
**AI:** Codex
**Worked on:** Fixed the mobile text-edit sheet so the page behind it cannot peek through or scroll while the keyboard is open.

### Completed
- Locked dashboard/body scrolling while Site Editor sheets are open.
- Updated the text-edit sheet to own the visible mobile viewport using `visualViewport` height.
- Strengthened the scrim and contained sheet overscroll so editing headline/supporting text feels focused instead of loose.

### Team Next
- Header motion should be a deliberate owner choice: Static, Rotate on load, or Slow slideshow. Do not surprise owners with an auto-carousel by default.

---
## Session: July 18, 2026 - Site Header Photo Editing
**AI:** Codex
**Worked on:** Made owner-selected header photos clear in Site Editor and connected them to the public website config.

### Completed
- Replaced tiny unexplained hero thumbnails with an explicit Header Photo control and full bottom-sheet picker.
- Selecting a header photo now updates `website_config.hero_image_url` and `hero_images`, not only `company_photos.website_section`.
- Removing a header photo clears the public hero config so stock/default imagery can return.
- Raised and constrained the text edit sheet so Save/Cancel stay visible above mobile nav and keyboard.

### Test Next
- On `my.foundco.app`, open More -> Edit My Site, change the Header Photo, then open the live site and confirm the public hero photo changes. Also edit the supporting line with the keyboard open and confirm Save/Cancel are visible.

---
## Session: July 15, 2026 - Stripe Connect Merchant Responsibility
**AI:** Codex
**Worked on:** Updated business-owner payout setup so connected merchants, not Found, carry the payment-fee/loss controller model.

### Completed
- Changed new Express connected account creation to `fees.payer = account` and `losses.payments = stripe`.
- Kept Stripe-hosted requirement collection and Express dashboard access.
- Stopped exposing raw Stripe API errors in the business-owner dashboard while preserving server-side logs.

### Test Next
- On `my.foundco.app`, select `T-Shirts`, open More, and tap `Continue secure setup`. It should open Stripe onboarding instead of returning the platform-loss review error.

---
## Session: July 14, 2026 - Public Business Name Polish Guard
**AI:** Codex
**Worked on:** Fixed raw lowercase company names leaking across public pages.

### Completed
- Public company loader now polishes `company.name` before templates receive it.
- This covers shared public slug/domain pages including home, shop, order, menu, contact, reserve, gallery, subscribe, quote, nav, footer, and metadata.
- Existing known fixes now apply to business display names, including `tshirts` -> `T-shirts` and `frcc` -> `FRCC`.
- Verified with `cmd /c npm run build`.

### Test Next
- Reopen `https://tshirts.foundco.app/shop` after deploy. The card copy should say `T-shirts`, not `tshirts`.

---
## Session: July 14, 2026 - Public Commerce Fallback Safety
**AI:** Codex
**Worked on:** Removed public-facing setup language from unfinished shop and order flows across shared templates.

### Completed
- Shared `/[slug]/shop` now shows a polished coming-soon/contact fallback until payments and products are both ready.
- Shared online ordering no longer exposes Stripe payout/setup wording to customers.
- Shopping cart and online-order checkout APIs now return customer-safe fallback errors if setup is incomplete.

### Test Next
- Open a retail shop URL before products or payout setup are complete. Customers should see a coming-soon/contact path, not payout/account/product setup details.

---

## Session: July 14, 2026 - Selected Company Cookie Selector
**AI:** Codex
**Worked on:** Fixed the remaining stuck-business switch by avoiding ambiguous duplicate selected-company cookies.

### Completed
- getCompany() now prefers the new ound_selected_company_id cookie and falls back to legacy ound_company_id.
- If duplicate selected-company cookies are present, it reads all matching cookies and uses the last value instead of cookies().get().
- The select-company API writes both the legacy and new selected-company cookies for compatibility.
- Verified with cmd /c npm run build.

### Test Next
- Switch Tacos -> tshirts and tshirts -> Tacos. The selected business should now actually change.

---

## Session: July 14, 2026 - Selected Company Cookie Scope
**AI:** Codex
**Worked on:** Fixed the case where hard switching could still leave the dashboard on the previous business.

### Completed
- Updated /dashboard/api/select-company to write ound_company_id to both the host cookie and the root-domain cookie when running on Found domains.
- This removes ambiguity when an older .foundco.app cookie and a newer my.foundco.app cookie both exist.
- Verified with cmd /c npm run build.

### Test Next
- Switch from tshirts to Tacos again and confirm the dashboard leaves tshirts.

---

## Session: July 14, 2026 - Hard Business Switch Boundary
**AI:** Codex
**Worked on:** Fixed the remaining stale dashboard body after Shawn switched from tshirts to Tacos.

### Completed
- Changed the company picker from a soft server-action transition to a hard browser navigation through /api/select-company.
- The selected-company API still verifies ownership, sets the selected company cookie, and redirects home, but now the browser performs a full document load so cached page bodies do not survive the business switch.
- Removed the now-unused select-page server action and cleaned the picker separator text.
- Verified with cmd /c npm run build.

### Test Next
- Switch from tshirts to Tacos again, then open Home, Reservations, Guests, and More.
- Confirm every screen says Tacos and no page body still shows tshirts plan/name data.

---

## Session: July 14, 2026 - Dashboard Company and Tool Integrity
**AI:** Codex
**Worked on:** Fixed the dashboard inconsistencies Shawn found when switching between tshirts, Tacos, Taco Shop, Construction, and Musician.

### Completed
- Removed cookie-insensitive React caching from getCompany() so selected-company lookups are not memoized only by user ID/email.
- Forced the dashboard shell to render dynamically and revalidate after company selection.
- Added no-store handling to the select-company redirect path.
- Made dashboard Orders visibility industry-aware so Business does not expose Orders for non-commerce businesses like musicians or contractors.
- Added Music/Music Performance to the schedule-first dashboard path.
- Rebuilt the Home smart next-step copy so every active business gets an industry-aware message, including Starter accounts.
- Restaurant accounts now prioritize Reservations messaging; retail/cart accounts prioritize Orders; music accounts prioritize Bookings/Schedule; construction-style accounts prioritize Estimates.
- Verified with cmd /c npm run build and git diff --check.

### Test Next
- Switch between tshirts, Tacos, Taco Shop, Construction, and Musician from the same login.
- Confirm the top-right selected company, Home greeting, More plan card, bottom tabs, and page titles all match the same business.
- Confirm Musician no longer shows Orders and its Home message talks about bookings/schedule instead of estimates.
- Confirm Construction still shows estimates, and restaurants show Reservations/Orders according to available tools.

---
## Session: July 10, 2026 - Simple Live Promo Code
**AI:** Codex
**Worked on:** Replaced the hard-to-type live `$1` promo with Shawn's simpler requested code.

### Completed
- Confirmed Stripe promotion codes cannot use `!`, so the live code is `F0UND1128`.
- Updated and deployed the protected Stripe setup route.
- Created the live one-use `F0UND1128` promo for Found Starter.
- Disabled the previous active Found `$1` promo.
- Verified a second setup call reused `F0UND1128` and did not create a duplicate.

### Test Next
- Fresh onboarding, choose Found Starter, apply `F0UND1128`, activate, then verify Stripe invoice/subscription and Found activation state.

---
## Session: July 10, 2026 - Secure Found Starter Promo Rotation
**AI:** Codex
**Worked on:** Renamed the live base Stripe product and replaced the guessable `$1` promo code.

### Completed
- Updated the protected Stripe setup route so the base product is named `Found Starter`.
- Deployed production and reran the protected setup route in live mode.
- Disabled the guessable `FOUND1` promotion code.
- Created the secure one-use `$1` activation promo `F0UND1128`.
- Verified a second setup call reused the secure promo, did not duplicate it, and did not reactivate `FOUND1`.

### Test Next
- Fresh onboarding, choose Found Starter, apply `F0UND1128`, activate, then verify the Stripe invoice/subscription and Found activation state.

---
## Session: July 10, 2026 - Live Stripe Billing Bootstrap
**AI:** Codex
**Worked on:** Created the live Stripe billing objects and `$1` activation promo after Shawn activated the live Stripe account.

### Completed
- Upgraded the protected `/api/stripe/setup-products` route to create/reuse live products, regular monthly prices, intro monthly prices, and the `FOUND1` promotion code idempotently.
- Ran the route in production with Vercel's live Stripe key; production reported `mode: live`.
- Created or reused the live Found, Found Pro, and Found Business products/prices.
- Created the one-use `FOUND1` promo for the base Found intro plan; it leaves `$1.00` due on the first invoice.
- Updated Vercel production price environment variables to the returned live price IDs.
- Redeployed production and verified a second setup call did not duplicate the promo.

### Test Next
- Fresh onboarding, choose Found, apply `FOUND1`, activate, then verify the Stripe invoice/subscription and Found activation state.

---
## Session: July 9, 2026 - Activation Promo Codes
**AI:** Codex
**Worked on:** Added the team-approved Phase 1 promo-code path for live payment testing and sales discounts.

### Completed
- Added a promo-code field to the activation payment card.
- Validates active Stripe promotion codes server-side against the selected plan price.
- Shows the discounted monthly price before card confirmation.
- Stores the validated promotion-code metadata on the SetupIntent so the redirect-safe confirmation step can apply the same code.
- Applies the Stripe promotion code when creating the subscription.
- Added a company audit migration for applied promotion code, coupon, and discount label.
- Kept the flow Stripe-native; no fake payment path or custom coupon engine.
- Verified with `npm.cmd run build`.

### Test Next
- Create a live Stripe coupon + promotion code that leaves a small real charge due.
- Run fresh onboarding, enter the promo on `/activate`, and confirm Stripe invoice/subscription plus Found activation state.

---
## Session: July 9, 2026 - Public Launch Readiness Audit
**AI:** Codex
**Worked on:** Audited the public Found site and launch path with the full Found Co. team filter.

### Completed
- Recorded Steve's launch verdict: no-go for open self-serve launch; controlled pilot only.
- Verified the production build passes.
- Verified production onboarding health returns healthy service/schema checks.
- Verified public homepage, plans, onboarding, privacy, terms, robots, sitemap, and favicon return HTTP 200.
- Identified four P0 launch gates: live Stripe Connect/payment QA, a fresh first-customer journey, sitemap cleanup, and truthful paid-plan claims.
- Identified P1 readiness work: analytics, public write-route protection, security headers, safer comp tokens, SEO metadata, CTA timing, hero image optimization, and automated release tests.
- Documented the full audit in `LAUNCH_READINESS_AUDIT_2026-07-09.md`.

### Not Completed
- Browser/device automation timed out, so a fresh visual iPhone walkthrough remains a launch gate.

---
## Session: July 8, 2026 - Native iPhone Typography
**AI:** Codex
**Worked on:** Raised Found HQ's undersized mobile typography to a native iOS scale after Shawn's phone review.

### Completed
- Set mobile body and operational titles to 17-18px.
- Raised secondary text to 13-15px and status text to 12-13px.
- Raised page titles to 34px and dock labels to 11px.
- Applied the scale to Today, Sales, Clients, More, forms, filters, and management controls.
- Preserved 44px minimum interaction targets and passed the production build.

---
## Session: July 8, 2026 - Found HQ Brand Refinement
**AI:** Codex
**Worked on:** Rebuilt the visual language after Shawn said V2 looked cheap and unlike Found.

### Completed
- Removed the generic card-dashboard treatment from primary admin surfaces.
- Restored Found Black, Found White, and restrained Signal Green usage.
- Replaced pill-heavy status styling with quiet typography.
- Reworked navigation, page hierarchy, lists, filters, inputs, and repeated actions.
- Added a documented Found HQ brand system.
- Preserved all V2 functionality and passed the production build.

---
## Session: July 8, 2026 - Found HQ V2 Foundation
**AI:** Codex
**Worked on:** Implemented Shawn's approved reset from a software-monitoring admin into a client and growth operating system.

### Completed
- Replaced primary navigation with Today, Sales, Clients, and More.
- Added prioritized Today work for sales follow-ups, proposals, payment risk, and launch blockers.
- Added a Found Co sales pipeline with contact actions, stages, follow-up scheduling, loss reasons, and append-only activity logs.
- Replaced Businesses with relationship-focused Clients, including client state, test classification, dated notes, and retained Site/View as controls.
- Moved Copy, Photos, and Email previews under More.
- Applied production migration 045 with admin-only sales/activity tables and conservative client-state backfill.
- Kept tenant customer leads separate from Found Co prospects.
- Passed the production build.

### Test Next
- Run the Found HQ V2 test pass in `SESSION_HANDOFF.md`.
- Classify test companies before relying on client totals.

---
## Session: July 8, 2026 - Found HQ V2 Operating-System Audit
**AI:** Codex
**Worked on:** Audited the admin product and production data after Shawn said the redesign still felt weak and needed to help manage clients and bring in new business.

### Completed
- Reviewed the current Overview, Businesses, Quality, More, onboarding, billing, and lead data paths.
- Ran a read-only production schema and aggregate-data audit.
- Confirmed the abandoned-onboarding records are test/retry artifacts, not a usable sales pipeline.
- Documented the team recommendation for Today, Sales, Clients, and More in `FOUND_HQ_V2_AUDIT.md`.
- Defined separate prospect/activity records, explicit client state, test-account exclusion, and phased safety rules.
- Made no production schema or UI changes.

### Decision Needed
- Approve the detailed V2 specification before schema or interface implementation begins.

---

## Session: July 8, 2026 - Found HQ Phone QA Corrections
**AI:** Codex
**Worked on:** Corrected defects visible in Shawn's first live iPhone screenshots of the redesign.

### Completed
- Replaced broken question-mark chevrons with CSS-drawn indicators.
- Replaced unsafe metadata separators and status glyphs with ASCII-safe text.
- Removed duplicate Email previews from More.
- Removed the explanatory Quality rule panel.
- Simplified Quality badges to compact counts.
- Ran a clean production build.
- Code commit: `f3b3d4b`.

---


## Session: July 8, 2026 - Found HQ Operator Redesign
**AI:** Codex
**Worked on:** Implemented Steve and Jony's approved redesign after reviewing seven live iPhone screenshots.

### Completed
- Replaced six-item mobile navigation with Overview, Businesses, Quality, and More.
- Rebuilt Overview around actionable signals and recent business status.
- Rebuilt Businesses as compact rows with meaningful filters and secondary Manage controls.
- Removed the non-actionable No leads warning.
- Grouped Copy, Photos, and Email previews under Quality.
- Moved Sign out to More on mobile.
- Added a shared Found HQ token system and aligned login, email detail, Copy, and Photos surfaces.
- Verified with a clean production build.
- Code commit: `2bc4fd0`.

### Test Next
- Run the Found HQ redesign pass in `SESSION_HANDOFF.md` on Shawn's iPhone.

---


## Session: July 8, 2026 - Safe Copy Regeneration and Undo
**AI:** Codex
**Worked on:** Added the team-approved safety layer before allowing Found HQ to overwrite live customer website copy.

### Completed
- Removed `Regenerate All`.
- Added per-site confirmation listing the live fields that will change.
- Added explicit admin verification inside every Copy server action.
- Added migration 044 with append-only copy snapshots and service-role-only atomic publish/restore functions.
- Added `View site`, `Undo changes`, and a distinct retry path for failed Undo attempts.
- Undo saves the generated version before restoring the prior version.
- Applied and verified the production migration permissions.
- Passed a transactionally rolled-back publish/restore database test and `npm run build`.
- Code commit: `8825321`.

### Test Next
- Run the Copy safety pass from `SESSION_HANDOFF.md` using only a throwaway business.

---


## Current History Policy

- `SESSION_HANDOFF.md` is the first source of truth for what changed, what is open, and what Shawn tests next.
- `CHANGELOG.md` keeps recent active work only: the current working window plus anything still affecting launch/test decisions.
- `CHANGELOG_ARCHIVE.md` keeps older detailed history so context is never lost.
- When history gets heavy, move older completed sessions to `CHANGELOG_ARCHIVE.md` and leave a short summary here.

---

## Session: July 8, 2026 (part 2) â€” Found HQ Admin Dashboard
**AI:** Claude Code (Sonnet 5)
**Worked on:** Shawn asked for "an official back end for myself" â€” one dashboard and menu to everything, instead of four separate `/admin/*` pages each with their own login screen. Approved to build overnight, unattended.

### Completed
- **`src/app/admin/layout.tsx`** â€” single auth gate for all of `/admin/*`. Checks the `admin_key` cookie once; shows the shared login screen bare if missing, otherwise wraps every page in the new `AdminShell`.
- **`src/app/admin/AdminShell.tsx`** â€” persistent nav: sticky left sidebar on desktop, bottom nav bar on mobile (Home / Businesses / Photos / Emails / Copy / Sign out). `adminAuth.ts` holds the new `adminLogout()` action.
- **`src/app/admin/page.tsx`** â€” new HQ home: total/active/comp/new-this-week stats, a card per tool, and the 6 most recent signups â€” reading the same `companies` table the other admin tools already use.
- Repointed the four existing tools' now-stale `redirect("/admin/photos")` and `â† Admin` breadcrumb links to `/admin` (`businesses`, `emails`, `emails/[companyId]`, `copy`). No functional changes to any of the four tools themselves.
- **Two real integration bugs found and fixed via scripted click-through testing, not just screenshots:**
  1. PhotoCurator's own fixed bottom action bar (`position:fixed` Approve bar) collided with the new sidebar on both breakpoints â€” text got clipped under the sidebar on desktop, and the bar sat exactly behind the bottom nav on mobile. Fixed with a sidebar z-index (desktop) and a `found-hq-bottom-bar` offset class (mobile) â€” no changes to PhotoCurator's own logic.
  2. More serious: the mobile sidebar's height rule leaked in from the desktop version and silently covered the *entire screen* with an invisible tap-blocking layer â€” nothing but the nav itself was clickable on mobile. Only surfaced because an automated test tried to click a photo and Playwright reported the nav "intercepts pointer events." Screenshots alone looked completely normal the whole time.
- Verified with `npm run build` (clean) plus scripted Playwright click-throughs on both desktop and mobile viewports, logged in for real, clicking through Home â†’ Businesses â†’ Photos â†’ Emails â†’ Copy and back. Pushed as `3ed70ae`.

### Must Test
- Log into `/admin` (same key as before) and confirm you land on the new stats home page, not `/admin/photos`.
- Click through Businesses, Photos, Emails, and Copy from the sidebar (desktop) and bottom bar (mobile) â€” confirm each tool works exactly as before, just inside the new shell.
- On Photos, select a few images and confirm the "N photos selected / Approve" bar is fully readable and clickable on both a laptop and a phone.
- Sign out from the mobile bottom bar and confirm it correctly drops back to the login screen.

---

## Session: July 8, 2026 â€” Comp Activation Before the Card Prompt
**AI:** Claude Code (Sonnet 5)
**Worked on:** Shawn flagged that the first comp mechanism (mark comp *after* onboarding from `/admin/businesses`) still let the business see a real Stripe card screen before Shawn could intervene. Asked for team discussion, then asked for both options the team laid out rather than picking one.

### Completed
- **`activateAsComp(slug, plan)`** in `src/app/activate/activateActions.ts` â€” skips Stripe entirely, sets `subscription_status: "active"` + `is_comp: true` directly. Re-reads the `admin_key` cookie itself server-side rather than trusting any client-passed flag.
- **`ActivateOverlay.tsx`** â€” new optional `isAdminSession` prop. When true, the plan-selection step shows an extra dashed-orange "Activate as comp (Found team)" button next to the real payment flow. Shared component, so this works from onboarding, the dashboard's `ActivationBanner`, `MoreActivateButton`, and `PreviewBanner` alike, though only the onboarding path threads the prop through for now.
- **`src/app/onboarding/page.tsx`** â€” now an async Server Component reading the `admin_key` cookie server-side, passing down a single `isAdminSession` boolean. The actual secret never reaches client-side code.
- **Comp link** â€” `OnboardingFlow.tsx` reads `?comp=<token>` from the URL on mount, carries it through the whole session, and passes it to `createOnboardingSite()`. `src/app/onboarding/actions.ts` validates the token server-side against `ADMIN_KEY`; when valid, the company is inserted already `is_comp: true, subscription_status: "active"`. The Reveal screen then shows "Go to dashboard" instead of "Launch my site" - no payment step renders at all.
- Verified with `npm run build` â€” clean. `/onboarding` is now dynamically rendered (was static) since it reads cookies server-side, as expected.
- Logged as a decision in `DECISIONS.md`, superseding the July 8 "comp after onboarding" entry.

### Must Test
- Comp link: start onboarding at `foundco.app/onboarding?comp=<admin key>`, complete a throwaway test business, confirm the payment screen never appears and Reveal shows "Go to dashboard."
- In-flow fallback: log into `/admin/photos` first (sets the admin cookie), then go through normal onboarding *without* the comp link, confirm "Activate as comp (Found team)" appears on the real activation screen and works.

---

## Session: July 8, 2026 â€” Found Operator Tooling (View As, Comp, Notes)
**AI:** Claude Code (Sonnet 5)
**Worked on:** Shawn tried to check on a real customer's account (Nereida Lopez, Spa Mambo) and had zero visibility - every dashboard is scoped strictly to whoever owns that company. Team scoped a beginning-stage operator toolkit (see `DECISIONS.md` [2026-07-08]), built it end to end.

### Completed
- Migration applied directly to Supabase: `companies.is_comp` (boolean) and `companies.admin_notes` (text). Migration file kept local only since `scripts/` is gitignored in this repo (other scripts there carry hardcoded credentials).
- `getCompany()` in `src/lib/dashboard/getCompany.ts` now has an admin override â€” when the selected-company cookie AND a server-verified `admin_key` cookie are both present, it fetches that company by ID without the normal ownership filter. Added `isAdminOverrideActive()` as a reusable check.
- New `/admin/businesses` â€” same shared admin-key gate as the existing `/admin/photos` and `/admin/emails`. Lists every company, searchable, with a "View as" button per row (reuses the exact same `found_company_id` cookie the normal company switcher already uses), a comp toggle, and a notes textarea that saves on blur.
- Comping a business also sets `subscription_status: "active"` in the same update, so every existing "is this account active" check across the app picks it up automatically instead of needing to touch each one.
- Dashboard layout shows a persistent orange "Viewing as [Business] (Admin)" banner with an Exit button â€” but only when the override is genuinely resolving someone else's company, not just whenever the admin cookie happens to be present. Never silent about who Shawn is acting as.
- Verified with `npm run build` â€” clean, `/admin/businesses` compiles.

### Must Test
- Log into `/admin/businesses` with the existing admin key, search for a real business, tap "View as," confirm the dashboard loads as that business with the orange banner visible.
- Tap Exit and confirm it returns cleanly to Shawn's own account.
- Toggle comp on a real inactive test account and confirm its activation banner disappears immediately (no page reload needed beyond normal navigation).
- Confirm notes save correctly (type, click away, reload the page, confirm it persisted).

---

## Session: July 7, 2026 (part 2) â€” Payment Reliability, Root Safe-Area Fix, Header Cleanup
**AI:** Claude Code (Sonnet 5)
**Worked on:** Shawn found the builder gap persisted after the earlier fix, felt the payment sheet was weak, and â€” most seriously â€” found that after paying, the estimate page still showed the full unpaid balance. "Fix it all, we need to launch."

### Completed
- **Payment reliability (priority):** `handlePay()` in `AcceptButton.tsx` called our own "mark as paid" API exactly once, wrapped in an empty `catch {}`. If that single call failed for any reason, Stripe had already charged the customer successfully but our own database never recorded it â€” with nothing surfacing the failure anywhere. Now retries up to 3 times with backoff. Never tells the customer their payment failed once Stripe has confirmed it, and never re-prompts payment (no double-charge risk) â€” just gives our own record multiple chances to catch up.
- **Root cause of the builder gap, actually found this time:** `viewport-fit=cover` was never set in the root viewport config (`src/app/layout.tsx`). Without it, `env(safe-area-inset-*)` resolves to `0` on iOS Safari everywhere in the app, not just this one header â€” meaning last session's margin-math fix was mathematically a no-op (both sides of the cancellation used the same flat fallback). Fixed at the root; this should also correct any other spot in the app relying on real safe-area insets, not just this one screen.
- **Removed redundant header copy** â€” the green "ESTIMATE" eyebrow above "New estimate" said the same thing twice; removed it, kept one clear title.
- **Verified the payment sheet's branding directly against Supabase** â€” queried the "Construction" test company's `primary_color`: it's `#1565C0`, a real blue. The payment theming is correctly applying it; the "generic Stripe" impression was a coincidence of this test company's actual brand color resembling Stripe's own, not a branding bug. No code change needed here.
- Verified with `npm run build` â€” clean. Pushed as `0567b54`.

### Not Fully Closed â€” Needs a Human
- The Stripe webhook fallback (`payment_intent.succeeded`) needs someone with Stripe Dashboard access to confirm it's registered as a **Connect-scoped webhook** (listening to events from connected accounts), not just the platform's own direct webhook. This estimate payment is a Stripe Connect charge, and Connect events only reach a webhook endpoint that was explicitly set up to receive them. No AI in this session has Stripe Dashboard login access to verify this. The client-side retry fix covers the common case; this webhook is the safety net for the rare case where all 3 retries fail, and right now nobody has confirmed it actually fires for this payment type.

### Must Test
- Builder gap: open a new estimate on a phone with a notch/Dynamic Island, confirm no page content visible above the "New estimate" header.
- Payment: complete a test deposit payment, confirm the estimate's balance updates correctly this time (not stuck showing the full unpaid amount).
- Confirm "New estimate" header now shows one line, not two.

---

## Session: July 7, 2026 â€” Live Test Results + Builder Gap + Payment Confirmation
**AI:** Claude Code (Sonnet 5)
**Worked on:** Shawn live-tested all 6 July 6 items on `my.foundco.app`. 4 confirmed clean (Camera, Company Switching, Leads sheet, Schedule). 2 surfaced real issues, brought to Jony/Craig before fixing.

### Completed
- **Estimate builder header gap** â€” found the exact cause: the sticky header's canceling margin was a flat `-18px` while the outer container's top padding used `max(env(safe-area-inset-top), 18px)`, which resolves to the real (larger) safe-area value on notched phones. The two never fully canceled, leaving a gap above the header showing the page scrolling behind it. Fixed both to use the identical expression.
- **Payment methods** â€” team decision: keep `automatic_payment_methods` enabled. Found clients' own customers may only have Cash App, or want a BNPL option for a large job â€” restricting to card/bank only would cost a real client a real payment. This reverses an earlier draft recommendation.
- **Post-payment confirmation rebuilt** â€” was a thin, generic "Estimate Accepted / Thank you" using a flat accent color. Now shows the Found client's own logo (or name), a bigger branded success moment in their actual brand color, and the real payment breakdown (amount paid, balance due at completion) â€” permanently, not just for a 2.2-second animation that used to decay into the bare version.
- Verified with `npm run build` â€” clean. Pushed as `2cb0c99`.
- Logged as a locked decision in `DESIGN_DECISIONS.md`.

### Must Test
- Open an estimate builder on a phone with a notch/Dynamic Island â€” confirm no gap above the "ESTIMATE / New estimate" header, no page content visible behind it.
- Complete a test payment on a Stripe-connected estimate â€” confirm the confirmation shows the client's logo/name, brand color, and correct amount paid / balance due, and that this state persists (not just visible for a couple seconds).
- Confirm Cash App / Klarna / other automatic payment methods still appear as options in the payment step.

---

## Session: July 6, 2026 - Source-of-Truth Cleanup
**AI:** Codex
**Worked on:** Shawn asked for a cleaner handoff process because he switches between Codex, Claude Code, and phone testing. The team agreed the docs need a current truth file, a current active changelog, and an archive for older history.

### Completed This Session
- Added `SESSION_HANDOFF.md` as the first current-truth handoff file.
- Updated `BRIEF.md` so every AI reads `SESSION_HANDOFF.md` first and reports:
  - what changed / finished,
  - what is still pending,
  - what Shawn needs to test next.
- Updated `CLAUDE.md` so Claude Code loads `BRIEF.md`, `SESSION_HANDOFF.md`, and `AGENTS.md`.
- Updated `TASKS.md` to point to `SESSION_HANDOFF.md` for current session state.
- Created `CHANGELOG_ARCHIVE.md` and moved the old detailed changelog history there for preservation.

### Still Open
- Use this process after every meaningful session:
  - update `SESSION_HANDOFF.md`,
  - update `TASKS.md` if priorities changed,
  - update `CHANGELOG.md` for recent work,
  - archive old history when it stops being current.

### Shawn Test
1. Start a new Codex or Claude session.
2. Say: `Read BRIEF.md`.
3. Confirm the AI reads `SESSION_HANDOFF.md` and starts by telling you:
   - what changed,
   - what is still open,
   - what you should test next.

---

## Active July 6 Summary

- Schedule now opens to Calendar and includes Calendar, Bookings, and Hours.
- Hours was redesigned into a readable weekly summary with deliberate editing.
- More page now groups business tools instead of showing one flat list.
- Business plan accounts no longer repeat an Included Business Tools sales list.
- Dock and More share icon language for Requests, Estimates, Schedule, and related tools.
- Blue Luna / balloon decor now uses Estimate Requests as intake and keeps Estimates separate.
- Estimate Requests can hand off to Create Estimate.
- Manual Estimate Request save prompts the owner to create an estimate now or later.
- Incoming Estimate Request rows show Create Estimate directly.
- Lead temperature no longer defaults to Warm.
- Add-lead form is now a slide-up sheet.
- Company switching was made faster and now gives instant tap feedback.
- Camera blocked-permission state now shows guidance instead of a black screen.

### Active QA Still Needed

- Live-test all July 6 changes on `my.foundco.app`.
- QA Schedule across quote-first, restaurant, and booking-first profiles.
- QA payable estimates end to end with Stripe-connected accounts.
- Keep AI estimate builder gated until manual estimate + payment flow passes live QA.
- Keep invoice-now / POS-lite behind live QA and More / Manage IA cleanup.

---

## Older History

Older detailed entries were moved to `CHANGELOG_ARCHIVE.md` on July 6, 2026.