## 2026-07-28 - CURRENT PENDING DECISIONS (read this block first)

- [x] Page switcher (`BackHeader` in `SiteEditor.tsx`) - **CLOSED, Shawn approved the final version.** Full-width drop-down panel under the persistent header, numbered list, editing-context cues. Do not reopen without a new specific complaint - see `SESSION_HANDOFF.md` for the full iteration history and final shape.
- [x] **Launch punch list (7 items) - ALL FIXED.** Comp-link secret, CI build check (code done, needs Shawn to add GitHub secrets - see below), Shop/Services search+collapse, AI rewrite disclosure+rate-limit, field validation, CTA picker for all industries, photo resize before upload. Full detail in `SESSION_HANDOFF.md`.
- [x] CI build check - Shawn added the 3 GitHub secrets, hit one real bug (workflow pulled the wrong Vercel environment), fixed, confirmed green via screenshot. Full 7-item launch punch list is now genuinely complete, not just shipped.
- [x] **Sentry + uptime monitor - SHIPPED.** Sentry SDK, env vars, and the Found HQ `/admin/health` page (uptime + open Sentry issues in one view) are all committed and live. Confirmed 2026-07-30.
- [x] **PostHog Phase 2 analytics - base SDK shipped 2026-07-30**, after a computer crash interrupted the prior session mid-setup. See `SESSION_HANDOFF.md`. Full funnel/attribution event instrumentation still needs its own session.
- [x] **3 pending clients - resolved 2026-07-29.** Shawn confirmed it was only ever the Edit My Site design/redesign work (now shipped and closed above). No other blocker exists.

---

## 2026-07-27 - Team Audit: Silent Save Failures + No-Confirm Deletes, Fixed

- [x] All Edit My Site save paths now check server-action results, roll back optimistic state on failure, and show a shared error toast instead of a false "Saved."
- [x] Confirm-before-delete sheet added for removing services, menu/product categories, and menu/product items - the three that destroy real owner content permanently with no undo.
- [x] Build passed.
- [ ] Shawn QA: verify error toast appears on a forced-failed save; verify confirm sheet blocks accidental deletes.

**Explicitly still open from the same audit, not forgotten:**
- AI rewrite falls back to generic copy silently on failure, no disclosure.
- No rate limit on AI rewrite calls.
- No email/phone/price format validation.
- No file-size check before photo upload.
- Zero accessibility labels in SiteEditor.tsx.
- Home's "Main Button" CTA picker only exists for food/wellness industries - silently missing for every other industry.

---

## 2026-07-27 - Section Nav Redesign + Tap-to-Edit Label Removed

- [x] Removed confusing "Tap to edit" label on the hub Pages section.
- [x] BackHeader: back-row + pill-strip collapsed into one row with a dropdown switcher (matches company-switcher pill/chevron style).
- [x] Build passed.
- [ ] Shawn mobile QA: hub reads cleanly without the label; dropdown switcher opens/jumps correctly on every Pages section.

**Explicitly deferred, not forgotten:** Shop/Services search + collapsed categories for scale - real feature work, needs its own scoped session. Flagged to Shawn to confirm whether this is actually what's blocking his 3 pending clients before prioritizing it.

---

## 2026-07-27 - Horizontal Overflow: Root-Caused For Real

- [x] Found the actual cause: bare `display: "grid"` (no `gridTemplateColumns`) sizes its implicit column to max-content, which ignores nowrap/ellipsis/overflow-hidden entirely. Long text (Home's supporting line, About's story, Featured Update body) blew the column hundreds of px past its container; the outer `overflow:hidden` just silently clipped it.
- [x] The pills row (yesterday's suspect) was not the cause - it's on every section but only Home/About had long enough text to trigger the real bug, which is why Contact/Shop/Services/Gallery were always fine.
- [x] Converted all 7 affected bare-grid wrappers to `flex`/`column`, matching Services' already-working pattern.
- [x] Verified with a direct DOM measurement at a real 390px width (iframe-based repro, not a screenshot guess): 5 overflowing elements before, 0 after.
- [x] Build passed.
- [ ] Shawn mobile QA: reload Home and About, confirm nothing is cut off this time.

---

## 2026-07-27 - Edit My Site Sections: Lateral Nav + Home-Matched Visual Treatment, needs Shawn's mobile QA

Follow-up team meeting (Jony/Steve leads) after Shawn flagged sections still felt "robotic" and lateral movement between sections required a hub detour. Full detail: `SESSION_HANDOFF.md`.

- [x] Sticky `BackHeader` on the 6 Pages sections now carries a horizontal jump row (Home/About/Contact/Shop-or-Menu/Services/Gallery) - no more hub detour to move between sections. Business Info/Domain intentionally excluded.
- [x] About and Contact now show a live-preview block (real current copy) above the edit controls, matching Home's pattern.
- [x] Shared `EditRow` component replaces the old "Change your story / Change page label / Change headline / Change supporting line" buttons with plain-noun labels + explicit green Edit pill, matching Home's row style.
- [x] Deliberately left Services/Shop/Gallery visual treatment as-is - they already show real content, not blank fields; they did get the lateral nav.
- [x] Build passes clean, `git diff --check` passed.
- [ ] **Shawn mobile QA (not done yet):** jump directly between all 6 Pages sections via the new pill row; confirm About/Contact preview blocks show real copy and Edit rows read as plain nouns; confirm saves still work.

---

## 2026-07-27 - Edit My Site Hub: Sticky Back Nav + Slim Site Link, needs Shawn's mobile QA

Fix for two issues Shawn found during his first mobile QA pass on the new hub (screenshots). Team-approved, built same day. Full detail: `SESSION_HANDOFF.md`.

- [x] `BackHeader` (used on every section: Home, About, Contact, Shop/Menu, Services, Gallery, Business Info, Domain) is now sticky under the main dashboard header instead of scrolling away.
- [x] Top "Lucky / lucky.foundco.app" row on the hub is now a slim text link instead of a full card.
- [x] Build passes clean, `git diff --check` passed.
- [ ] **Shawn mobile QA (not done yet):** Edit My Site top link reads as light text now, not a card. Open each section, scroll down, confirm the back bar stays pinned with no gap/overlap against the header.

---

## 2026-07-27 - Edit My Site Hub: BUILT, needs Shawn's mobile QA

Full team meeting held (Steve led - see `DESIGN_DECISIONS.md` [2026-07-27]), mockup reviewed and approved (Jony/Steve design pass, toggle concept cut after Shawn found it confusing), then built same day. Full detail: `CHANGELOG.md` "2026-07-27 - Edit My Site Hub Rebuild".

- [x] Three-tier hub: Pages (Home incl. Featured Update, About, Contact, Menu/Shop, Services, Gallery), Business Info (new - name/phone/email/city/state), Site-wide (Photo library links to `/photos`, Domain).
- [x] Business Info is a genuinely new feature - didn't exist before this. Saves on blur, no Save button.
- [x] All existing Edit My Site functionality preserved, just moved behind tile navigation instead of one scroll.
- [x] Build passes clean.
- [ ] **Shawn mobile QA (not done yet):** Dashboard -> More -> Edit My Site. Confirm hub loads, tiles work, back button returns cleanly, Business Info saves and persists, and every section still works exactly as before inside its new view.
- **Known follow-up, not done this pass:** per-page photo pickers (e.g. changing the About photo from inside About). Photo slot assignment stays consolidated under Home for now - see CHANGELOG for why.

---

## 2026-07-26 - Launch QA Update
- DONE: Rebuild Edit Website homepage/first-impression controls into explicit owner rows instead of hidden tap zones.
- NEXT QA: On mobile, open Dashboard > More > Edit My Site; confirm Homepage shows explicit rows for Headline, Supporting line, Main button, Short hook, and Header photo. Tap each text row, save, and confirm the sheet closes cleanly. Tap Header photo and confirm the picker opens.
## JULY 26 SITE EDITOR OWNER FLOW

- [x] Remove confusing top readiness cards from Edit My Site.
- [x] Replace Site Studio copy with direct owner-facing Edit website copy.
- [x] Make Homepage the first visible edit surface.
- [x] Rename lower editor sections into plain owner panels.
- [x] Production build passed.
- [ ] Shawn mobile QA: Lucky/tshirts > More > Edit My Site, confirm the top and section flow feel clearer.

---

## JULY 26 FEATURED UPDATE SMART COPY GUARD

- [x] Create shared Featured Update draft system.
- [x] Replace old generic filler in editor preview with smart draft copy.
- [x] Reuse the same smart copy on the public tenant site.
- [x] Add duplicate guard against hero/about/shop/menu copy.
- [x] Keep owner-edited copy unless blank/generic.
- [x] Production build passed.
- [ ] Shawn mobile QA across Lucky, Rosa's, Construction, and FRCC.

---
# TASKS.md - Found Co. / found-websites
### Active work board. Current session truth lives in `SESSION_HANDOFF.md`.
*Last updated: July 25, 2026*
*Current handoff: read `SESSION_HANDOFF.md` first for changed / open / test status.*

---

## ANALYTICS - Phase 1 SHIPPED July 20, 2026

Shawn asked for traffic/activity monitoring for marketing purposes. Scoped as two phases:
- **Phase 1 (SHIPPED):** Vercel Web Analytics on `foundco.app` only (not tenant sites, not dashboard/admin) - visitor counts, page views, referrers. Gated via a new `x-found-root-site` header set only by `middleware.ts` for root-domain requests. Not yet confirmed whether Vercel needs a one-time dashboard enable before data flows.
- **Phase 2 (SHIPPED 2026-07-30):** PostHog wired onto the root marketing site (`foundco.app` only, same scoping as Phase 1), pageview tracking live. Full funnel/attribution event instrumentation (visit -> onboarding start -> onboarding complete -> activation/paid, UTM campaign tracking) still needs its own session - only the base SDK + pageviews are in so far.

---

## CURRENT PHASE

**Phase 4: Customer Dashboard - ACTIVE**
**Add-On System: SHIPPED**
**Online Ordering Add-On: SHIPPED**
**Unified Product Catalog / Online Shop: SHIPPED July 16-17, Shawn confirmed live and tested**
**Plan Upgrade Flow (Stripe portal): SHIPPED July 15 - also resolved the plan-card savings display question**
**Live-mode Stripe Connect webhook: SHIPPED July 19 - closes the sandbox-only webhook gap flagged July 7**

*Note: this phase line was stale until July 20 - see "DOC GAP BACKFILL" below. Several major features (full catalog/shop rebuild, live payment webhook, plan upgrade flow) shipped July 13-20 without being logged here in real time.*

Online ordering flow live. Full product catalog/shop rebuilt and confirmed working by Shawn. Dashboard tab customization shipped. Next: finish the remaining launch-payment QA pass (see NOW #1) and the upsell banner.

---

## JULY 26 FEATURED UPDATE REDESIGN

- [x] Rename dashboard feature from Announcement to Featured Update.
- [x] Remove public Announcement label.
- [x] Replace boxed public card with full-width premium feature band.
- [x] Add industry-aware public labels/defaults.
- [x] Seed useful starter content when the owner turns the feature on.
- [x] Production build passed.
- [ ] Shawn mobile QA: toggle Lucky Featured Update off/on, refresh live site, and confirm the section appears below hero with the right feel.

---## JULY 26 LIVE ANNOUNCEMENT SCHEMA

- [x] Apply existing `048-site-announcements.sql` migration to live Supabase.
- [x] Confirm Lucky announcement fields are readable from live Supabase.
- [x] Confirm Lucky public page contains the announcement in live HTML.
- [ ] Shawn mobile QA: refresh Lucky live site and confirm the announcement is visible below the hero.

---
## JULY 26 ANNOUNCEMENT EDITOR

- [x] Clarify announcement editor controls: explicit preview, edit headline/message/button text, image, style, and destination controls.
- [x] Clean corrupted visible labels in the site editor.
- [x] Production build passed.
- [ ] Shawn mobile QA: Lucky > Edit My Site > Announcement, test on/off, copy edits, style variants, link destinations, and live preview.

---
## DOC GAP BACKFILL - July 20, 2026

Docs were not kept current July 13-20 (~80 commits, several major features). Reconstructed from `git log` and confirmed with Shawn. Full detail logged in `CHANGELOG.md` under matching dates. Summary of what changed status as a result:

- **Unified Product/Service Catalog** (see BACKLOG below) - was marked "not built yet, needs its own session." Actually shipped July 16-17 as an industry-aware catalog editor with variants/inventory, homepage showcase, and cart-sheet checkout. Shawn confirmed it's live and tested. Menu and product managers are dedicated (not yet confirmed whether estimates line items pull from the same catalog table - that unification may still be partial, needs a follow-up check).
- **Stripe Connect webhook** - live-mode signing secret added July 19 (`d9dbc68`). This was the last piece of the P0 launch gate flagged July 7. Shawn said mark it ready for QA.
- **Plan card savings display** (see BACKLOG below) - was "UNRESOLVED." The July 15 Stripe-portal plan-upgrade flow (`Add Found plan upgrade sheet`, `Route plan upgrades through Stripe portal`) resolved this per Shawn - removed from backlog, logged as a decision in `DECISIONS.md`.
- **Copy quality audit/repair system** - shipped July 13, applied to production copy in staged risk tiers (high-risk fixed first, then medium-risk, plus new faith-industry copy). Shawn confirmed it ran against real customer sites, not just test/audit mode.
- **Estimate payment fixes** (`Fix remaining balance estimate payments`, `Confirm estimate payment request sends`, etc., July 15) - may close part of the outstanding estimate/payment QA list below; not yet confirmed which specific test-list items this covers.
- Smaller undocumented fixes: dashboard badge clearing on view (July 18), payment receipt sender name showing the business instead of "Found" (July 19), black video thumbnails in Photos grid (July 19), mobile checkout sheet stabilization (July 17), 3-option add-to-project photo picker + zoom label/camera button fixes (July 20).

---

## JULY 14 DASHBOARD INTEGRITY TEST

- [x] Switch between tshirts, Tacos, Taco Shop, Construction, and Musician from one login. Shawn confirmed dashboard company switching works July 25.
- [x] Confirm Home greeting, top-right company picker, More plan card, bottom tabs, and page titles always show the same selected company. Shawn confirmed switching works July 25.
- [ ] Confirm Musician shows bookings/schedule language and no Orders tab.
- [ ] Confirm Construction still shows Estimates as the primary Business message.
- [ ] Confirm restaurants show Reservations/Orders based on available tools and do not fall back to generic Inquiries when using the Reservations tab.

---



## VIDEO UPLOAD SAVE FIX - COMPLETED July 19

- [x] Confirmed existing videos were missing from company_photos, not hidden by the Photos UI.
- [x] Added signed direct upload path for videos to avoid serverless body-size failures.
- [x] Made failed camera/library uploads visible to owners instead of silently disappearing.
- [x] Preserved album placement during upload record creation.
- [ ] Test on iPhone: record/upload short video, verify Photos -> Unsorted shows VIDEO badge, then heart/star it.

---
## CONTACT EDITING + VIDEO MEDIA - COMPLETED July 19

- [x] Add editable Contact Page copy fields in Edit My Site.
- [x] Add Contact as a named website media slot.
- [x] Allow Photos uploads to accept videos and show playable video previews/badges.
- [x] Let selected Header media render as a public muted looping hero video when the media is video.
- [ ] Later: owner-controlled hero motion setting for static / rotate-on-load / slideshow.

---
## NAMED SITE PHOTO SLOTS - COMPLETED July 18

- [x] Replace single header-only image picker with explicit Header, About, Visit / CTA, and Gallery slots.
- [x] Persist section assignments through existing company_photos.website_section values: hero, about, cta, and gallery.
- [x] Update public home/about/services templates so selected owner photos win before stock images.
- [x] Keep slideshow/random rotation out of this pass; motion needs a separate owner setting later.

## SITE HEADER PHOTO EDITING - COMPLETED July 18

- [x] Replace mystery hero thumbnails in Edit My Site with an explicit Header Photo control.
- [x] Sync selected owner photos to the public site through `website_config.hero_image_url` and `hero_images`.
- [x] Add a clear header-photo picker and remove action.
- [x] Keep Save/Cancel visible when editing headline/supporting copy on mobile.

---

## NOW (MAX 3)

**Full team audit re-run July 20, 2026 - see `LAUNCH_READINESS_AUDIT_2026-07-20.md`.** All 5 P0s from that audit are now fixed (list below, same day). Kept for history; the remaining 14 P1s from that audit are still open and are the next real priority list.

**All 5 P0s FIXED July 20, 2026:**
0. Payment trust bug - `accept-estimate` now requires and server-verifies the Stripe PaymentIntent before marking anything paid; webhook now also handles `estimate_balance`. **Test next:** run a real test-mode deposit payment and a real balance payment end to end.
1. Post-activation login handoff - `confirmActivation` now generates a real sign-in link and the activation redirect carries the owner's browser through it, landing them signed in on `/api/select-company` instead of a bare `/login` screen. **Test next:** run a full fresh onboarding -> activation and confirm you land in the dashboard already signed in, not at a login screen.
2. Sitemap/indexing - added a per-business `is_test` toggle (`/admin/businesses` -> Manage -> "Hide from search"), separate from `is_comp` billing status. Classified July 20: 36 of 37 companies are Shawn's own practice accounts and are now excluded from the sitemap and marked `noindex`; only Nereida's real salon stays indexable. Sitemap also now includes Found's own marketing/legal pages, which were previously missing entirely.
3. "Automatic review requests" claim - changed to "coming soon" everywhere it appeared (found-business plan page, More page plan cards) instead of building the feature, per Shawn.
4. Catalog editor mobile keyboard/scroll-lock bug - `CatalogManager.tsx`'s Add/Edit Item sheet now uses the same body-lock pattern as SiteEditor.


**Launch smoke checklist - July 25, 2026:**
- [x] Safari shop/cart/payment-start smoke passed.
- [x] Fresh signup/payment and polished site-live email passed in Spark and Apple Mail.
- [x] Dashboard company switching passed.
- [x] Public lead/inquiry notification passed: red dot appeared, lead was visible, and alert cleared.
- [x] Final quick receipt/payment email check after latest polish passed.
**Launch payment QA backfill - July 21, 2026:**
- [x] Fresh onboarding / live activation payment - Shawn confirmed this passed live; production companies under Shawn's test-owner emails now show active subscriptions and Stripe customer IDs. Activation/site-live email polish shipped July 25 and needs one Spark + Apple Mail visual retest before checklist #2 is closed completely.
- [x] Retail shop order payment - verified in production Supabase: Lucky (`lucky`) has a `shopping_order` lead for Shawn Lopez, created July 17, 2026, `payment_status: paid`, $1.00 subtotal, selected option `Size: XL`, Stripe PaymentIntent recorded.
- [x] Restaurant online order payment - verified in production Supabase: Rosa's Mexican Food (`rosas`) has paid `online_order` leads for Shawn Lopez, including July 18, 2026, $1.00 Carne Asada order, `status: closed`, `payment_status: paid`, Stripe PaymentIntent recorded.
- [x] Estimate deposit payment - verified in production Supabase: Blue Luna Events (`bluelunaevents`) has an accepted $1.00 estimate for Shawn Lopez, 50% deposit, `payment_status: deposit_paid`, `accepted_payment_choice: pay_now`, Stripe PaymentIntent recorded, deposit paid July 20, 2026.
- [x] Estimate final-balance payment - verified in production Supabase: Construction (`construction`) has a $1.09 estimate marked `payment_status: paid`, deposit paid July 16, 2026, final paid July 16, 2026, payment link timestamp recorded.
- [x] Pay-later estimate path - Shawn tested the current Construction pay-later flow. Dashboard showed the estimate as unpaid with `Payment request sent` and the balance still due, which is the expected accepted-but-not-paid state.
- [x] Connected-profile Found DB ledger audit - verified July 21 with a read-only production Supabase pass. Production has 6 Stripe Connect profiles: `bluelunaevents`, `construction`, `lucky`, `molcas-mexican`, `rosas`, and `tshirts`. Found DB payment evidence exists for 5 of 6; `tshirts` has Connect set up but no completed paid order/estimate payment evidence recorded.
- [x] T-Shirts connected-account payment proof - Shawn completed a live shop-order payment on `tshirts` with Shipping after Connect setup. Customer and owner emails were received; follow-up cleanup now formats fulfillment details clearly in receipts.
- [x] Paid-order receipt fulfillment details - shop and restaurant/menu receipts now show `Ship to` for shipping and `Pickup details` for pickup, using saved company location when available and a clear pickup-instructions fallback when not.
- [ ] Optional Stripe Dashboard reconciliation - local `.env.local` only exposed a test Stripe secret during Codex verification, so Stripe API could not read live connected-account PaymentIntents from this machine. Supabase production rows are verified; Stripe-side reconciliation should be checked in the Stripe Dashboard if Shawn wants a second ledger confirmation.

*Prior verdicts: `LAUNCH_READINESS_AUDIT_2026-07-09.md`, `LAUNCH_READINESS_AUDIT_2026-07-20.md`. **SUPERSEDED 2026-07-29: GO for open self-serve launch** - see `LAUNCH_READINESS_AUDIT_2026-07-29.md` and `DECISIONS.md`. All P0s from July 20 confirmed fixed; the July 20 "no-go" had simply never been updated in writing after that day's fixes shipped. P1 launch hardening attempted July 21; custom security headers were rolled back after iPhone Safari Stripe `inner.html` download prompts (root cause was eager Stripe.js prefetching, since fixed via lazy-loading - not the headers themselves, but treat header work here as high-risk going forward) and remain deliberately deferred post-launch. Rate limiting shipped July 21 (see below) - it is DONE, not remaining.*

## P1 CLEANUP STATUS - as of July 27, 2026 (consolidated, supersedes scattered mentions above)

From `LAUNCH_READINESS_AUDIT_2026-07-20.md`'s 14 P1s:
- [x] Rate limiting on public write routes - shipped July 21.
- [x] Homepage SEO metadata (canonical/OG/Twitter) - shipped, `src/app/page.tsx` + `HomeClient.tsx`.
- [x] Homepage CTA delay - shortened (was 3.3s, no skip path) and made tap-to-skip.
- [x] Shop page metadata - shipped, `[slug]/shop/page.tsx` + `[slug]/order/page.tsx`.
- [x] Shop/order checkout mobile keyboard bug - fixed, same `visualViewport` pattern as SiteEditor.
- [x] Resend module-level init in 3 files - moved inside each function.
- [x] **FIXED July 28** - comp-link secret decoupled from `ADMIN_KEY` into its own `COMP_LINK_SECRET`. Old comp links built with the admin key no longer work (intentional).
- [x] **PARTIALLY FIXED July 28** - CI build check added (`.github/workflows/build.yml`), runs `npm run build` on every push/PR. Still no automated tests. Workflow needs GitHub Actions secrets added by Shawn before it runs green - see top of this file.
- [ ] **Still open:** hero image optimization (still full-res PNGs, not WebP/AVIF).
- [ ] **Still open:** shop/online-order checkout has no webhook fallback if the tab closes right after a successful payment (the `/complete` routes themselves are solid; this is a missing safety net, not a broken primary path).
- [ ] **Still open, not urgent:** Stripe subscriber price audit (verify no Pro/Business subscribers were charged wrong price before the `activateActions.ts` fix) - read-only check, not yet done.
- [ ] **Still open, not urgent:** RLS policy verification on `estimates`/`addon_subscriptions`/`leads`/catalog `website_config` fields - only 3 migration files exist in source control despite far more live tables; needs a live Supabase check, not a code-review assumption.
- **Not a bug, a product decision:** "one catalog, three systems" (Estimates/Shop/Menu are still 3 separate data stores) - documented, not scheduled.

---

## P1 LAUNCH HARDENING - STARTED July 21, 2026

- [ ] Add browser security headers later; full header experiment was rolled back after iPhone Safari Stripe `inner.html` download prompts.
- [ ] Revisit CSP/Permissions-Policy after launch smoke testing; first attempt caused an iPhone Safari Stripe `inner.html` download prompt and was removed.
- [x] Add public write-route rate limiting / bot controls - launch in-process guard shipped July 21 across subscriber, booking, shop/order checkout, estimate, login-link/password-login, lead/reservation, and reply routes. Later optional upgrade: Supabase/edge-backed distributed ledger.
- [x] Full header rollback did not clear the iPhone Safari Stripe `inner.html` prompt; cause is not the launch header experiment.
- [x] Remove public preview-banner Stripe prefetch so Stripe.js is not downloaded while customers only browse inactive/unactivated public sites.
- [x] After first prefetch fix, normal Safari still showed the prompt while Firefox and Safari Private did not.
- [x] Remove module-level Stripe loading from `ActivateOverlay`; Stripe now loads only after a real activation client secret exists and the payment step renders.
- [x] Safari extensions and Hide IP Address were ruled out by Shawn; normal Safari still showed the prompt, Private Safari and Firefox did not.
- [x] Public shop/order Stripe isolation shipped: `ShopClient` and `OnlineOrderClient` no longer import Stripe at module load; Stripe Elements now live in lazy payment-only components.
- [x] Normal iPhone Safari shop smoke passed July 25: Shawn confirmed #1 on the launch checklist passed for Lucky/T-Shirts shop browsing/cart/payment-start; no Stripe `inner.html` download prompt reported.
- [x] Public write-route rate limiting / bot controls - shipped July 21 (see line above - this bullet was a stale duplicate, corrected July 27).

---

## JULY 6 SESSION - WHAT'S LEFT TO TEST

**Read `SESSION_HANDOFF.md` first. This section keeps the active July 6 live-verification gap visible.** All code is pushed to `main` and builds clean; this is purely the live-verification gap. Commits referenced below are on `main`.

1. **Camera black screen (`e9906d4`)** - if camera permission is blocked, confirm a clear guidance message appears (not a black screen), with iOS vs Android wording. Confirm normal camera flow still works on a device that has never been asked before.
2. **Company-switch speed (`c6b6b38`)** - switch between businesses on an account with 2+ companies, confirm it feels noticeably faster.
3. **Company-switch instant feedback (`1d55ed1`)** - confirm tapping a business highlights it green + shows a spinner immediately, and the other options dim/disable during the switch.
4. **Leads: Warm default removed + form-as-sheet (`161716f`)** - open the add-lead form on a temperature-based business: confirm no pill is pre-selected, Save stays disabled until one is picked, and the empty state never shows through/under the open form.
5. **Estimate Request guidance (`0e59182`)** - manually add a lead on an Estimate-Request business: confirm the added/create-estimate prompt appears and both buttons work. On an existing Estimate Request in the list, confirm Create Estimate shows directly on the row.

---
## LEADS/INQUIRIES AUDIT (July 5, 2026) - ALL 4 ITEMS RESOLVED (July 6)

**Read this first if you're picking this up.** Shawn reviewed live screenshots of the Blue Luna Events test customer/profile on `my.foundco.app` and flagged 4 things. Blue Luna Events is the account/slug Shawn created for testing; do not treat the word "Events" alone as the issue. Team discussed (Steve/Jony/Craig/Angela), all 4 items are now shipped Ã¢â‚¬â€ see notes below on how each was actually resolved.

### 1. "Inquiries" vs "Leads" labeling on the Blue Luna Events test profile - needs correction
- `src/lib/dashboard/typography.ts` -> `defaultFormIntentFor()` maps industries to an intent, which drives the page title/vocab (Leads/Estimates/Inquiries/Bookings/Reservations/Orders/Appointments).
- The live Blue Luna Events test profile was showing "inquiry" language on the Leads page. Shawn clarified that Blue Luna Events is the customer/profile name and slug used for testing; the note should not imply he was asking about generic "events" wording in isolation.
- Current code maps these industries to `"inquiry"` by default: `real_estate, events, event_planning, balloon_decor, creative_services, photography, education, professional_services, childcare, nonprofit`.
- **Team take:** audit the actual intent model and labels so a business on the Leads tool does not feel like it is in the wrong product. Do not blanket-flip all 9 industries without review, but Blue Luna Events should be checked as a real account/profile case.
- **IMPLEMENTED July 6:** Quote-first businesses use `Estimate Requests` as intake and keep `Estimates` as a separate priced document workflow. Blue Luna Events / balloon decor now follows this model by industry/sub-industry, not by business name or slug.
- **Shawn clarification:** Estimates/quotes are not the same thing as leads, inquiries, or bookings. Estimates are their own information pathway and should remain a separate tool/tab when the business needs to price work. A business can need both: one intake path for leads/bookings/inquiries and a separate estimates/quotes path for priced work.
- **Product implication:** Do not use one single intent value to decide everything. We need at least two separate decisions: (1) what the incoming customer/intake tab is called (`Leads`, `Inquiries`, `Bookings`, `Reservations`, `Orders`, `Appointments`), and (2) whether the business also gets an `Estimates`/quotes workflow as a distinct tool.

### 2. Temperature (Hot/Warm/Cold) silently defaults to "Warm" Ã¢â‚¬â€ FIXED July 6
- `src/app/dashboard/(app)/leads/page.tsx`: `newTemp` now starts `null`, resets to `null` on cancel/save. Save is disabled until a temperature is picked (for temp-based intents), with a quiet "Pick one to save." hint under the pills.
- Pushed in `161716f`.

### 3. Add-lead form pushes the empty state down instead of covering it Ã¢â‚¬â€ FIXED July 6
- Converted the inline `{showAdd && (...)}` card into a real slide-up sheet (scrim + fixed bottom sheet), matching the `IntentPickerSheet` pattern already used elsewhere in this exact file (`#101411` background, same radius/z-index language). No longer shares document flow with the empty state below it.
- Pushed in `161716f`.

### 4. Schedule page needs a calendar Ã¢â‚¬â€ FIXED July 6 (Codex)
- Codex rebuilt Schedule as its own session: tab order flipped to Calendar Ã¢â€ â€™ Bookings Ã¢â€ â€™ Hours (was Hours-first). Calendar shows a 7-day week strip with booking indicators. Hours redesigned into a read-first weekly summary (Open/Closed + times) with an explicit Edit mode, instead of a dense settings form by default.
- Not yet confirmed live by Shawn Ã¢â‚¬â€ see "JULY 6 Ã¢â‚¬â€ STILL TO TEST" below.

---

## RECENTLY COMPLETED (July 3, 2026 - Codex Session 4)
- Completed dashboard payment-state polish for estimates.
- Estimate cards now distinguish `Paid`, `Deposit paid`, and `Accepted, unpaid` instead of showing every won job as only `Accepted`.
- Accepted estimate detail now shows the payment state, total, accepted date, and the owner next action.
- Added owner-side `Send Payment Link` / `Resend Payment Link` for accepted-but-unpaid estimates with client email.
- Added dashboard API `payment_link` send mode; it emails a clean secure payment link and updates `payment_link_sent_at` without changing accepted status back to sent.
- Added timeline events for payment link sent, deposit paid, paid in full, and receipt sent.
- Verified with `cmd /c npm run build`.

---
## RECENTLY COMPLETED (July 3, 2026 Ã¢â‚¬â€ Claude Code session)
- Ã¢Å“â€¦ Estimate builder step pills Ã¢â‚¬â€ were hardcoded fake (`index === 0`), now real `IntersectionObserver` scroll-spy + tap-to-jump
- Ã¢Å“â€¦ Estimate builder card-stack removed Ã¢â‚¬â€ five sections now flow as one surface with hairline dividers, not five bordered boxes
- Ã¢Å“â€¦ FOUND wordmark Ã¢â‚¬â€ was hardcoded Arial in 12 places, now one shared `src/components/FoundWordmark.tsx` component
- Ã¢Å“â€¦ Sitewide font root cause Ã¢â‚¬â€ `globals.css` had dead `create-next-app` boilerplate (`body { font-family: Arial... }`, `--font-sans: var(--font-geist-sans)`) silently overriding the real Inter font loaded in `layout.tsx`. Removed both; `--font-sans` now points at `--font-inter`.
- Ã¢ÂÂ³ Not yet visually confirmed Ã¢â‚¬â€ see NOW #1
- Ã¢ÂÂ³ Gray status-bar band on estimate builder Ã¢â‚¬â€ suspected iOS Safari chrome, not app CSS. Needs Shawn to test via "Add to Home Screen" to confirm.

---

## RECENTLY COMPLETED (June 24, 2026 Ã¢â‚¬â€ Codex + Claude session)
- Ã¢Å“â€¦ Online ordering system Ã¢â‚¬â€ inline add-to-cart on public menu, Stripe checkout, paid order handler
- Ã¢Å“â€¦ Owner order email Ã¢â‚¬â€ itemized table, pickup time block, notes, customer contact
- Ã¢Å“â€¦ Customer confirmation email Ã¢â‚¬â€ order summary + business branding
- Ã¢Å“â€¦ `DashboardTabsManager.tsx` Ã¢â‚¬â€ owners reorder/choose bottom tabs from More tab
- Ã¢Å“â€¦ `DashboardNav.tsx` Ã¢â‚¬â€ dynamic tabs per industry + active add-ons (Orders, Reserve auto-appear)
- Ã¢Å“â€¦ Leads page `?view=orders` / `?view=reservations` filtering
- Ã¢Å“â€¦ `dashboard/layout.tsx` Ã¢â‚¬â€ fetches activeAddonSlugs server-side, passes to DashboardNav
- Ã¢Å“â€¦ CHANGELOG + TASKS updated

## RECENTLY COMPLETED (June 22-23, 2026 Ã¢â‚¬â€ add-on session)
- Ã¢Å“â€¦ 7 add-ons all live in Stripe Ã¢â‚¬â€ `addon_subscriptions` table, `addon_stripe_prices` table
- Ã¢Å“â€¦ Reservation system Ã¢â‚¬â€ `/[slug]/reserve` page + form + server action + emails
- Ã¢Å“â€¦ More page rewrite Ã¢â‚¬â€ plan features, Lock In My Rate button, plans link
- Ã¢Å“â€¦ Menu fallback Ã¢â‚¬â€ warm copy + Call Us button
- Ã¢Å“â€¦ Admin email preview Ã¢â‚¬â€ reservation tabs conditional on industry
- Ã¢Å“â€¦ Gallery vocab Ã¢â‚¬â€ `albumLabelFor` used everywhere
- Ã¢Å“â€¦ `custom_domain` ungated (was accidentally Pro+ only)

## RECENTLY COMPLETED (June 19Ã¢â‚¬â€œ20, 2026 Ã¢â‚¬â€ continuous session)
- Ã¢Å“â€¦ SiteEditor: all accent colors unified to Signal Green; progress bar removed from More plan card; "contact" Ã¢â€ â€™ "lead" on Leads
- Ã¢Å“â€¦ Migration-035 live Ã¢â‚¬â€ `photo_albums` table + `company_photos.album_id` column
- Ã¢Å“â€¦ Photos page full rewrite Ã¢â‚¬â€ date grouping headers, albums/projects tab, album detail view, share sheet
- Ã¢Å“â€¦ `/api/albums` route (GET/POST/DELETE with slug dedup)
- Ã¢Å“â€¦ `/api/company-slug` returns `{ slug, industry }`
- Ã¢Å“â€¦ Public album gallery page Ã¢â‚¬â€ `/[slug]/gallery/[album]/page.tsx`
- Ã¢Å“â€¦ `albumLabelFor(industry)` Ã¢â‚¬â€ 18-industry vocab map in `typography.ts`
- Ã¢Å“â€¦ `getCompany` Ã¢â‚¬â€ `industry_category` added to type + SELECT
- Ã¢Å“â€¦ Camera pre-flight Ã¢â‚¬â€ pre-fetched albums, instant sheet, project picker with horizontal tile scroll
- Ã¢Å“â€¦ Camera picker visual overhaul Ã¢â‚¬â€ 84px glowing hero circle, 72Ãƒâ€”72 color album tiles, Apple spring easing
- Ã¢Å“â€¦ "New" tab renamed "Unsorted"
- Ã¢Å“â€¦ Gallery integration Ã¢â‚¬â€ `company_photos.for_website` now appears on public `/[slug]/gallery` (dashboard photos Ã¢â€ â€™ site, gap closed)
- Ã¢Å“â€¦ Home redesign Ã¢â‚¬â€ 3 pure states (new lead hero / caught up momentum / welcome share), all stat chips + quick-action buttons removed
- Ã¢Å“â€¦ Photo curation Ã¢â‚¬â€ all 10 new industries approved by Shawn at `/admin/photos` (June 20, 2026) Ã¢â‚¬â€ ALL 22 industries complete
- Ã¢Å“â€¦ Plan gating Ã¢â‚¬â€ "Share with Client" locked to Pro; base plan sees UpgradeSheet with feature list + CTA to /more
- Ã¢Å“â€¦ Pro album-organized gallery Ã¢â‚¬â€ `/[slug]/gallery` shows album cover grid for Pro users; base plan flat grid unchanged
- Ã¢Å“â€¦ Lead auto-reply Ã¢â‚¬â€ confirmed live in `leads.ts`; no new work needed

---

## RECENTLY COMPLETED (June 19, 2026 Ã¢â‚¬â€ launch day session)
- Ã¢Å“â€¦ Full team audit (Jony + Steve co-lead) Ã¢â‚¬â€ P0/P1/P2 items identified and all approved by Shawn
- Ã¢Å“â€¦ Greeting Ã¢â€ â€™ `TYPE.largeTitle h1`; new lead Call button full-width green pill with glow
- Ã¢Å“â€¦ Welcome state added (isActive + 0 leads); caught-up state "View all Ã¢â€ â€™" link
- Ã¢Å“â€¦ Emoji temperature (Ã°Å¸â€Â¥Ã¢Å¡Â¡Ã¢Ââ€žÃ¯Â¸Â) Ã¢â€ â€™ geometric dot system; emoji photo flags Ã¢â€ â€™ SVG heart/star
- Ã¢Å“â€¦ Unread badge: 8px red dot on Leads tab (mobile + desktop) when newLeadCount > 0
- Ã¢Å“â€¦ Context-aware quick actions: 1-col (photo only) when new lead showing
- Ã¢Å“â€¦ `?upload=1` param Ã¢â€ â€™ auto-opens file input on Photos page (from sidebar Add Photo button)
- Ã¢Å“â€¦ Contacts page complete rewrite Ã¢â‚¬â€ all 20+ px violations fixed, FAB 44px, SVG empty state
- Ã¢Å“â€¦ More page: Found plan green, billing section removed, email row added, upgrade features rewritten
- Ã¢Å“â€¦ Banner condition fixed for canceled accounts; favicon 404 fixed in middleware
- Ã¢Å“â€¦ All px sizes Ã¢â€ â€™ rem; iOS HIG Dynamic Type ramp enforced sitewide
- Ã¢Å“â€¦ TypeScript Ã¢Å“â€¦ build Ã¢Å“â€¦ Ã¢â‚¬â€ committed `09f502b`

## RECENTLY COMPLETED (June 19, 2026 Ã¢â‚¬â€ typography session)
- Ã¢Å“â€¦ Typography system rolled out to all remaining dashboard pages Ã¢â‚¬â€ `SiteEditor.tsx`, `more/page.tsx`, `photos/page.tsx`. Commits: `f87c359`
- Ã¢Å“â€¦ Desktop sidebar layout Ã¢â‚¬â€ responsive 220px sidebar on Ã¢â€°Â¥ 768px, mobile bottom nav unchanged. Commits: `94d7db4`

## RECENTLY COMPLETED (June 18, 2026 session)
- Ã¢Å“â€¦ Remove trial from upgrade checkout Ã¢â‚¬â€ confirmed no `trial_period_days` in `more/actions.ts`
- Ã¢Å“â€¦ In-dashboard activation banner (white bar, green button, inline overlay Ã¢â‚¬â€ no black screen)
- Ã¢Å“â€¦ Lead/Contact detail sheets with full edit capability (PATCH /api/leads, updateContact action)
- Ã¢Å“â€¦ Home screen redesign (single decisive status card)
- Ã¢Å“â€¦ Shared typography system (Leads, Contacts, Home, DashboardNav)
- Ã¢Å“â€¦ Identity-based avatar colors (Apple Contacts style)
- Ã¢Å“â€¦ Bulk-fixed 14 companies with stale `plan: "found_pro"` Ã¢â€ â€™ `plan: "found"`

---

## CURRENT SESSION HANDOFF (July 1, 2026 Ã¢â‚¬â€ Claude Code)

### Shipped
- Business name step: name input only, no URL shown while typing
- Web address shown calmly after name is entered and verified available
- Ã¢â‚¬Å“Change my Found web address Ã¢â€ â€™Ã¢â‚¬Â link (opens SlugSheet, now using plain-language Ã¢â‚¬Å“web addressÃ¢â‚¬Â)
- Progress bar: thin Signal Green bar in header during questions phase
- Bookings route Resend init moved inside POST handler (local build fix)
- Commit: `b3c5791`
- Drawer modal polish: gap fixed, Dynamic Island dark, keyboard awareness, double safe-area padding removed, progress bar removed
- Commit: `d73ac49`
- Typeform-style step animations: title wave 1 Ã¢â€ â€™ inputs wave 2 (90ms stagger), spring easing, 44px travel
- Contact step: email reveals progressively after 10-digit phone Ã¢â‚¬â€ keyboard/scroll problem gone
- Commit: pending

### Decisions
- Owners type the business name. Found generates the web address. They see it after, not during.
- `company.name` and `company.slug` are separate and always were. Now the UI reflects that.
- Always say Ã¢â‚¬Å“Found web addressÃ¢â‚¬Â Ã¢â‚¬â€ never Ã¢â‚¬Å“slug,Ã¢â‚¬Â never Ã¢â‚¬Å“URL,Ã¢â‚¬Â never Ã¢â‚¬Å“addressÃ¢â‚¬Â alone.

### Must Test Next
- Onboarding on mobile: type name Ã¢â€ â€™ see web address appear calmly below Ã¢â€ â€™ tap Ã¢â‚¬Å“Change my Found web addressÃ¢â‚¬Â Ã¢â€ â€™ SlugSheet language is correct Ã¢â€ â€™ slug conflict flow still works
- Progress bar grows correctly through all question steps
- Found Business full E2E flow (carry from last session)
- Display-name prompt save closes and does not return (carry from last session)

---


### ESTIMATOR BUILDER TEAM RESET (July 2, 2026)

Problem Shawn identified during testing:
- The builder feels like filling out a database, not running a business tool.
- The visual hierarchy is weak; the eye has no clear path.
- The bottom sheet sits over Found branding and feels like an overlay, not the actual work surface.
- Line items feel like spreadsheet rows.
- Internal payment setup issues must never be visible to clients.

Team-approved redesign direction:
- Full-screen mobile-first estimator surface, starting directly under phone/browser chrome.
- Workflow: Customer -> Job -> Work -> Price -> Review.
- Work item composer should be guided: describe work, choose flat price or quantity/rate, then price it.
- Unit is optional and contextual, not a required-looking database field.
- My Services should feel like quick reusable work, not a rate-sheet database.
- Public client page never says Stripe/payments are not set up. Owner dashboard handles setup warnings.

Do not continue patching random fields before this plan is implemented.

## ESTIMATES REBUILD HANDOFF (July 2, 2026)

### Product Goal
The estimate page is the decision moment. Found should get the customer from "yes" to payment while the emotion is still warm. Do not force the standard estimate -> separate invoice -> later payment pathway unless the customer truly needs it.

### Current State
- Built: public estimate page, print/PDF page, decline flow, expiration, sequential estimate numbers, default tax, lead/client autocomplete, Google Places proxy, embedded Stripe Payment Element, pay-now/deposit flow, quiet pay-later acceptance, payment-link email, customer receipt email, owner notification, and webhook backup for paid deposits.
- Missing: dashboard polish for `Accepted, unpaid` / `Deposit paid` / `Paid`, owner resend payment link, manual QA with Stripe test mode, invoice mode, and AI line-item generation.
- Completed cleanup: builder split client fields now persist through estimate create/update APIs.

### Session 3 - Modern Accept & Pay (Code Implemented, Needs Migration + QA)
- Done: persist split client fields end to end.
- Done in code and database: payment status fields for `unpaid`, `deposit_paid`, `paid`, accepted payment choice, pay-later time, payment-link sent time, paid time, and receipt sent time. Migration 046 was applied to Supabase on July 2, 2026 and verified against `information_schema.columns`.
- Done: primary CTA on public estimate is `Accept & Pay Deposit` or `Accept & Pay Now`.
- Done: embedded Stripe Payment Element uses Stripe automatic payment methods so wallet eligibility can surface Apple Pay, Google Pay, and card where available.
- Done: on payment success, mark accepted and paid/deposit-paid, show a human success state, email receipt/confirmation to customer, notify owner. Webhook fallback mirrors this path.

### Session 4 - Pay Later Without Making It The Default
- Done: quiet secondary text link `Accept now, pay later` exists under the main payment CTA.
- Done: pay-later marks estimate accepted/unpaid and sends the customer a payment-link email.
- Done: public estimate page remains payable after accepted/unpaid until paid.
- Dashboard shows `Accepted, unpaid` and lets owner resend payment link.
- Keep invoice language as a fallback/admin convenience, not the default customer path.

### Session 5 - AI Estimate Builder
- Owner describes the job in natural language.
- Found drafts line items from My Services and, later, the unified catalog.
- Suggested quantities, units, descriptions, and prices are editable.
- AI-generated items are marked internally.
- Owner must review and send manually.

### Test After Each Estimate Session
1. Run `cmd /c npm run build` and confirm TypeScript plus page generation pass.
2. Create a new estimate in the dashboard with first name, last name, email, phone, property/job address, tax, and at least two line items.
3. Save, reopen, and confirm client split fields, totals, tax, deposit amount, and line items persisted.
4. Open the public `/q/[id]` page on mobile width and desktop width.
5. Test primary pay path in Stripe test mode: `Accept & Pay Deposit` or `Accept & Pay Now`, complete payment, confirm success state, customer receipt email, owner email, and public page no longer allows decline.
6. Test secondary path on a fresh estimate: `Accept now, pay later`, confirm accepted/unpaid state, customer payment-link email, owner accepted email, and same public page still lets the customer pay.
7. Check dashboard list/detail status labels for the touched estimate: draft/sent, accepted unpaid, deposit paid, paid, declined, expired as applicable.
8. Run `git diff --check` and record the exact test result in `CHANGELOG.md` before ending the session.
### Later - Invoice Mode / POS-Lite
- Add invoice mode as a sibling inside the same tool: `Estimates | Invoices` or `New Estimate / New Invoice`.
- Invoice means the work was verbally agreed/done and the owner needs payment now.
- Reuse the same client, line-item, tax, payment, receipt, and email engine.
- Do not build a separate POS system yet. Future simple language: `Send Invoice`, `Collect Payment`, `Take Payment Now`.

## BACKLOG

### Add-Ons & Monetization
- ~~Plan card savings display~~ - resolved July 15 via the Stripe-portal plan upgrade flow. See `DECISIONS.md`.
- Upsell banner Ã¢â‚¬â€ not built; planned as next after June 22
- Stripe custom payment form Ã¢â‚¬â€ Option B approved (in-app Stripe Elements), not built
- ~~Menu add-on gating~~ - resolved 2026-07-29: `menu_display` was never actually sellable (not in `ALL_ADDONS`, zero purchases ever) and the real menu page never checked it. Removed the dead flag entirely rather than gate something never sold. Menu display is free by design; only `online_ordering` (checkout on top of it) is a real paid capability, and that is correctly gated. See `SESSION_HANDOFF.md`.
- ~~Food CTA bug~~ - not a bug, correct by design now that `menu_display` is gone. "View Our Menu" showing unconditionally is intended.
- Stripe subscriber audit Ã¢â‚¬â€ verify no Pro/Business subscribers charged wrong price before activateActions.ts fix

### Dashboard
- Auto-reply message Ã¢â‚¬â€ owner writes it once during onboarding/settings, Found sends it to every new lead via Resend
- Manual lead follow-up sequence Ã¢â‚¬â€ one toggle: "Follow up automatically if I don't reply in 24 hours"
- Business card scanner Ã¢â‚¬â€ camera Ã¢â€ â€™ OCR Ã¢â€ â€™ pre-fill lead or contact form
- ~~Dashboard home/overview for desktop (sidebar nav, two-column leads/inbox)~~ Ã¢â‚¬â€ sidebar shipped June 19
- Real-time lead notifications (push notification when new lead arrives)
- Contacts tags Ã¢â‚¬â€ allow custom tags beyond the preset 5
- Photo Before & After social post creator

### Site
- Hero photo also syncs to `website_config.hero_image_url` for layouts that read it
- Photo social export Ã¢â‚¬â€ format with brand typography, save to camera roll
- Color/theme picker (Pro feature)
- Logo upload

### Platform
- Favicon 404 Ã¢â‚¬â€ all client sites throw a 404 for `/favicon.svg`. Noisy in logs, bad for SEO. Not urgent enough for NOW slot but still unresolved.
- Photo curation for 10 new industries at `/admin/photos`
- Remove debug `[Activate]` console logs
- ~~VERCEL_API_TOKEN + VERCEL_PROJECT_ID for connect-domain feature~~ - resolved 2026-07-30: both confirmed live in Vercel production env.
- ~~Custom domain flow end-to-end test~~ - resolved 2026-07-30: verified live against the real Vercel Domains API (add/check/remove round-trip). Also un-gated the flow (was still Pro-only, stale since custom_domain was made free on every plan in June) and removed a dead duplicate implementation. See SESSION_HANDOFF.md.
- **Registrar recommendation copy** - SHIPPED 2026-07-30. GoDaddy + Namecheap only, no 3rd forced pick. See `DECISIONS.md`.
- **Domain registrar auto-setup (real DNS automation, not just instructions)** - GoDaddy path SHIPPED 2026-07-30. `connectDomainViaGoDaddy()` in `actions.ts` creates the DNS records automatically via GoDaddy's real v3 API using an owner-generated scoped Personal Access Token (never stored - used once, discarded). Opt-in panel live in `DomainConnector.tsx`, manual flow untouched as the default. Needs Shawn's real-account QA (see `SESSION_HANDOFF.md`). Domain Connect (true one-click, no-token UX) remains the longer-term goal, not built - needs GoDaddy's own approval with no promised timeline. Namecheap/other registrars deferred until the GoDaddy path is proven live.
- **Resend module-level init cleanup** Ã¢â‚¬â€ `app/actions/reply.ts`, `app/actions/leads.ts`, `app/onboarding/actions.ts` all init `new Resend(...)` at module level (same pattern that broke the bookings route). Low risk since these are server actions, not route handlers, but should be moved inside each function as a housekeeping pass.

### Unified Product/Service Catalog Ã¢â‚¬â€ Cross-System Data Sharing
**STATUS UPDATE July 20, 2026: shipped July 16-17, confirmed live and tested by Shawn.** Industry-aware catalog editor, variants/inventory controls, homepage catalog showcase, and cart-sheet checkout are built (commits 66877a8 through 27c48d6). Dedicated menu and products managers exist. **Not yet confirmed:** whether Estimates line items pull from this same catalog table, or whether that integration is still a separate future step. Verify before assuming full cross-system sharing is done.

**Vision:** One catalog, three systems. A business enters their products/services/prices once and that data flows into:
- **Online store** (sell products by card)
- **Online ordering** (menu items, catering packages)
- **Estimates** (line items pulled from catalog)
- **Eventually: invoices** (same items, same prices)

**Use cases that drove this:**
- Tire shop sells tires online + wants to pull tire prices into estimates
- Auto mechanic has service prices in estimates + wants them in the store
- Caterer uses online ordering for regular orders + needs same menu items for party/event estimates
- Restaurant with online ordering wants to create catering estimates using the same menu data

**Architectural note:** The current rate sheet (estimate add-on), online store products, and menu items are THREE separate data stores with no connection. The rebuild should unify them into a single `company_catalog` table:
- `id`, `company_id`, `name`, `description`, `price`, `unit`, `category`, `available_in` (array: store | ordering | estimates)
- Each system reads from the same table, filtered by `available_in`
- Owner manages one list, controls where each item appears

**When to build:** Needs its own dedicated session. Prerequisite for Session 2 of estimates rebuild (service catalog feature). Also blocks the online store and ordering system from feeling connected.

### New Industry Photo Curation
- Curate Pexels photos for 3 new industries: `print_signage`, `tech_repair`, `transportation`
- Team selects, Shawn approves via `/admin/photos` Ã¢â‚¬â€ same process as existing 22 industries
- Needed before these industries can show real stock photos to new owners

### Decisions needed
- Portal name Ã¢â‚¬â€ "Found Studio" proposed, needs Steve/team sign-off
- Inbox tab Ã¢â‚¬â€ currently redirects to Leads. Should it become a full conversation thread view?
- Social posting Ã¢â‚¬â€ direct API vs save to camera roll (locked: camera roll for launch)

### Schedule QA note - July 6, 2026
- Verify sticky Calendar / Bookings / Hours tabs on mobile Safari.
- Verify Calendar empty state says `No bookings this week`.
- Verify Bookings empty state says `No booking history yet`.
- Verify Hours shows a separated Weekly hours summary and `Save Changes` only when editing or unsaved changes exist.

### Launch Addition - Site Announcements / Promotions (July 25, 2026)
- Built one configurable announcement/promotion block for customer websites.
- Owners can enable it from Edit My Site, customize headline/body/button/link/style, and optionally assign a promotion image.
- Public layouts now render it below the hero across all primary templates.
- Use case: RC Bicycles/back-to-school sale and any owner needing a current announcement without making the site look hacked together.
- Still needs live Supabase migration application if deployment does not auto-run migrations.
- QA: turn on announcement for one retail/bike-style site, one restaurant/menu site, and one service site; confirm each CTA lands correctly.
### Announcement QA Fix - July 26, 2026
- Lucky/apparel announcement default corrected from bike-school copy to generic shop copy.
- Announcement style selector contrast corrected for readable editor preview.
- QA needed after deploy: Lucky announcement default + Light/Dark/Default readability.
### Edit Site Slate QA - July 26, 2026
- [ ] Owner QA: Edit My Site opens with Site Studio and readiness cards.
- [ ] Owner QA: readiness cards jump to the right sections.
- [ ] Owner QA: no confusing "tap to edit" wording remains in the main edit slate.
- [ ] Owner QA: photo/gallery guidance makes stock vs owner photos understandable.
- [ ] Owner QA: Custom Domain reads as a launch trust step.
