## 2026-08-05 - CURRENT NOW

## 2026-08-11 - FOUND Systems: Analytics/SEO/AEO/GEO Tracking Stack (Started)

Shawn's question: besides PostHog, what's free or near-free to track everything going in/out of Found and help the team grow (SEO, AEO, GEO)? Named this initiative "FOUND Systems" per Shawn - a durable, ongoing checklist (also saved to memory so "remind me of FOUND Systems" works in any future conversation, not just this one).

### Team round + decision
- Priya: keep PostHog (event-level behavior), add **Microsoft Clarity** alongside it - 100% free, no traffic cap, session recordings + heatmaps show *why* not just *what*.
- Phil: **Google Search Console** and **Bing Webmaster Tools** are non-negotiable and free - the only places that show real indexing/ranking data; Bing matters because its index feeds Copilot and part of what ChatGPT browses.
- Craig: no mature *free* AEO/GEO tracking tool exists yet (Profound/Otterly/Peec are paid and still new) - don't spend money there yet.
- Steve: the actual AEO/GEO lever isn't a tracking tool, it's structured data/schema markup - and for Found specifically this is a product opportunity, not just a marketing chore: auto-generating clean schema (LocalBusiness/Service/FAQ) for every tenant site Found hosts is real AEO advantage for every client, not just Found Co.'s own site.

### Step-by-step setup checklist
- [x] Google Search Console - verified `foundco.app`, submitted `https://foundco.app/sitemap.xml`, Google discovered 30 pages on first read.
- [x] Bing Webmaster Tools - imported/verified `foundco.app` from Google Search Console and submitted `https://foundco.app/sitemap.xml` (processing, normal up-to-48h delay).
- [x] Microsoft Clarity - created Found Co project (`y0u9dw7ln4`) and wired tracking into the root Found marketing site only, behind the same root-site gate as Vercel Analytics/PostHog.
- [ ] Microsoft Clarity QA - deploy, visit `https://foundco.app`, then confirm Clarity receives data.
- [x] PostHog Personal API Key (read scope) - generated and added in Vercel with `POSTHOG_PROJECT_ID=535458` and `POSTHOG_HOST=https://us.posthog.com`.
- [x] Found HQ Health now reads PostHog pageviews/unique visitors for 7d/30d when env vars are present.
- [x] PostHog Health QA - Shawn confirmed live on iPhone: Found HQ > More > Health shows 13 visitors / 245 pageviews for 7d and 24 visitors / 292 pageviews for 30d instead of the old blocked message.
- [x] Health founder-clarity pass - kept "funnel" language but explained it in-place as the path from stranger to paying customer; changed Marketing to Marketing funnel; added "Next money step"; softened Sentry from raw scary error wall to System issues with context and badges.
- [x] Full funnel instrumentation - added clean PostHog events for `onboarding_started`, `plan_selected`, `onboarding_completed`, `checkout_started`, and server-side `activation_completed`; Found HQ Health now shows Started / Site built / Checkout / Activated plus Business plan picks.
- [x] Funnel QA issue found - Shawn's live iPhone test showed Started and Business plan pick, but Site built stayed 0 after the preview/reveal screen. Root cause: `onboarding_completed` was still client-side and could be dropped during the heavy mobile completion transition.
- [x] Funnel reliability fix - moved `onboarding_completed` to server-side capture inside `createOnboardingSite()` and reduced Health's PostHog cache from 5 minutes to 60 seconds.
- [ ] Funnel re-QA - after deploy, run one new practice signup through onboarding and confirm Site built increments after the preview/reveal screen. Activation completion only increments after real Stripe activation succeeds.
- [ ] Scope schema-markup feature for tenant sites (future build, not today's setup work)

## 2026-08-11 - Found HQ: Sales -> Growth Rebuild, Auto-Promotion, Visual Depth

Shawn's call, not mine: "let the team decide what's next." Team round (Jony leading design, Steve on Sales direction) - approved and built.

- [x] Today's "Active clients"/"Open sales"/"At risk" stats are now real links (Active clients -> Clients filtered to active, At risk -> Clients filtered to past_due, Open sales -> Growth). Added `?state=` support to Clients' initial filter to make this work.
- [x] **Sales renamed to Growth, rebuilt from a CRM pipeline into what Shawn actually asked for**: no more stages (New/Contacted/Demo/Proposal/Won/Lost) - replaced with automatic "upgrade cohorts" (2+ real clients sharing a plan + industry, e.g. "3 Starter clients - HVAC", pulled live from Clients data, with an "email all" action) plus a simple manual "Add a lead" (name/business/contact/note only) for one-off referrals. Confirmed abandoned-onboarding data is still all noise (1 distinct email, 0 in 30 days) before deciding not to build anything around it yet.
- [x] "Mark converted" now does both things at once (set stage + create/link the real client record) instead of two separate manual steps.
- [x] Fixed the real structural gap behind RC Bicycles getting stuck at "onboarding": `client_state` now auto-promotes to "active" the moment a real client's Stripe subscription actually goes active/trialing, via the webhook sync - no longer a manual switch Shawn has to remember to flip. Test accounts and non-onboarding states are untouched.
- [x] Visual depth pass (Jony-led): panels/lists get a whisper of surface lift instead of pure flat-on-black (deliberately restrained - Shawn already rejected the heavy card look once, July 8), section headers get a hairline + uppercase treatment so grouped content (like More's Quality/Monitoring split) actually reads as separated groups.
- [ ] Shawn QA: Today's stats link correctly; Growth shows cohorts/leads with no stage-picking; converting a lead creates/links a real client in one step; a real Stripe activation auto-promotes a client out of onboarding; More/other pages read with more visual separation.

## 2026-08-11 - Found HQ: Real Trust-Breaking Data Bugs, Caught by Shawn Live

Shawn tested the rebuilt admin live via screenshots and found it actively lying about his business state - "0 active clients" while looking at his one real paying client, 8 fake "due now" items that were all his own throwaway test signups, test accounts leaking into every state tab. Team decision (his call: "let the team decide"): fix the trust-breaking data bugs as the sole priority; leave Sales exactly as-is (no real sales-touch acquisition channel exists yet, so an empty manual pipeline is accurate, not broken - don't invest further, don't remove it either).

- [x] Root-caused with live data: RC Bicycles (Shawn's one real client) had `client_state: null`, never set - reading as "onboarding" instead of "active". Fixed directly.
- [x] Found exactly 8 companies matching Today's "8 due now" - all `account_kind: client` with no subscription, no comp, throwaway names (nanas, Catalina, test, finally, etc.), all Shawn's own untracked test signups. Reclassified to `account_kind: test`.
- [x] Fixed the structural cause, not just today's bad rows: `account_kind` column now defaults to `'test'` at the database level (previously defaulted to `'client'`, silently mislabeling every future practice signup as real with zero prompting to fix it). `createOnboardingSite()` now explicitly computes the real value - Shawn's own known email(s) (`OWNER_EMAILS` env var, defaults to his address) default to `test`, everyone else defaults to `client` - so this can't quietly recur, and real future customers aren't wrongly hidden either.
- [x] New-signup email alert now skips Shawn's own test signups - no point alerting him about his own action.
- [x] Fixed Clients' state tabs (Attention/Onboarding/Active/Past due) - they were showing test accounts mixed in with real ones; only the dedicated Clients/Test tabs excluded them correctly before. Now every state tab is real-clients-only by default.
- [x] Added back-navigation to all 5 of More's sub-pages (Copy, Photos, Emails, Health, Test Billing) - confirmed missing, a real gap.
- [ ] Shawn QA: Today shows 1 active client / 0 due now; Clients' default and state tabs show only RC Bicycles; test accounts only appear under the Test tab; back-navigation works from every More sub-page.

## 2026-08-11 - Found HQ Rebuild: Phase 5 (Final), Marketing Health

- [x] Added a Marketing section to the Health page - leads last 7d/30d across real clients (test accounts excluded), top clients by lead volume. Real data, not a placeholder.
- [x] Traffic/conversion (PostHog) explicitly flagged as blocked, not silently faked: only a public write-key exists locally, querying real analytics data back out needs a Personal API Key with read scopes from PostHog's own settings, which doesn't exist yet.
- [ ] Shawn QA: Health page's new Marketing section shows real lead counts.
- [ ] Shawn: generate a PostHog Personal API Key (read scope) and add as an env var when ready to close the traffic/conversion gap.

### Found HQ rebuild: all 5 phases from the team audit complete
Data integrity fixed, orphaned pages removed, brand system fully migrated (3 legacy components), new-signup visibility + real email alerts built, Won->Client conversion built, marketing health added. See FOUND_HQ_V2_AUDIT.md for the original audit and CHANGELOG.md (Aug 11 entries) for the full build record.

### CI build check: one real failure, caught by Shawn via GitHub email
- [x] Shawn caught a GitHub Actions "Build failed" email for commit `b32c5cd` (Phase 5) via his PhotoDrop screenshot folder. Investigated via the GitHub Actions API (no local token, used unauthenticated endpoints - run/job status is public, raw logs are not).
- [x] Confirmed this is NOT the old missing-secrets issue (that was fixed and confirmed green in July) - the "Pull Vercel environment variables" step succeeded; only the actual `vercel build` step failed.
- [x] Checked every commit from today's 5-phase run: Phase 1 and 2 succeeded clean; Phase 5 failed; Phase 3 and 4 sat "in_progress" for 10+ minutes (a normal build takes ~35s) - a pattern pointing at resource contention from 5 rapid pushes each triggering a full `vercel pull` + `vercel build`, not a code defect. Every one of these 5 commits also passed a real local `npm run build` before being pushed.
- [ ] Confirm via a fresh, isolated push (well clear of the original burst) that CI goes green again with no code changes - if it does, this was transient, not a real regression.

## 2026-08-11 - Found HQ Rebuild: Phase 4, Won -> Client Conversion

- [x] Built the one required V2 action that was never implemented: marking a sales prospect "Won" previously did nothing beyond the stage change - no client record got created, `linked_company_id` existed in the schema since July 8 but was never read or written anywhere.
- [x] `convertProspectToClient()` in `sales/actions.ts` - auto-links to an existing company if one already matches by email (zero retyping); otherwise creates a minimal client stub carrying the prospect's identity data over (name, email, phone), landed in `onboarding` state for Shawn to finish setting up.
- [x] "Convert to client" button appears on any Won prospect without a linked company; becomes "View client record" once linked.
- [ ] Shawn QA: mark a test prospect Won, convert it, confirm it shows up correctly in Clients with the right info carried over.

## 2026-08-11 - Found HQ Rebuild: Phase 3, New-Signup Visibility + Alerts

- [x] Found where a company signup actually happens: `createOnboardingSite()` in `src/app/onboarding/actions.ts:246` - this is where the old Overview page's "6 most recent signups" list (dropped when V2 replaced it, never restored) should hook in.
- [x] Added a "Recent signups" section to Today (last 7 days, links straight to that company in Clients) - real in-admin visibility, not just a count.
- [x] Added a "New" badge on Clients rows for companies created in the last 48 hours.
- [x] Built the real-time email alert: new `src/lib/adminAlerts.ts`, fires to Shawn (`ADMIN_ALERT_EMAIL` env var, falls back to his known address) the moment a company record is created. Confirmed `RESEND_API_KEY` is live in Vercel production before building this. Best-effort/non-blocking - a failed alert can never break someone's actual signup.
- [ ] Shawn QA: test a real signup end to end, confirm the email alert arrives and the company shows up in Today's Recent signups.

## 2026-08-11 - Found HQ Rebuild: Phase 2, Brand System Migration

- [x] Migrated the 3 legacy components identified in the audit as the actual source of the "two designs" feeling - all were pre-dating the brand system and never migrated.
- [x] `EmailPreviewTabs.tsx` - rebuilt the tab bar on the real `hq-filter-row` class instead of a filled rounded-pill box.
- [x] `CopyRegenPanel.tsx` - rebuilt on `hq-business-list`/`hq-business-row`/`hq-badge` (same pattern as Clients/Sales) instead of Tailwind cards with hardcoded hex colors.
- [x] `PhotoCurator.tsx` (largest, most complex - full state machine preserved untouched) - replaced every hardcoded hex color (off-brand amber `#f5c842`, non-token green `#4caf50`, arbitrary grays) with real brand CSS variables. Removed the blanket `!important` radius override that was fighting intentional circular elements (count badges, remove buttons) once the actual colors/shapes were fixed at the source.
- [x] Removed now-dead CSS override rules from `admin.css` that only existed to patch over the unmigrated components.
- [ ] Shawn QA: Photos, Copy, and Email preview pages now read as part of the same system as Today/Sales/Clients, not a different app.

## 2026-08-11 - Found HQ Rebuild: Phase 1, Data Integrity + Kill Orphaned Pages

Team-ordered rebuild of Found HQ (admin panel) per full audit - see FOUND_HQ_V2_AUDIT.md. Audit found V2 (July 8) was ~80% built then abandoned mid-migration: real architecture, real schema, but two orphaned pages still live and writing to legacy fields.

- [x] Found and fixed a real production data-integrity bug live in the database: the 32 accounts comped earlier this session (raw SQL, bypassing the Clients page's own sync logic) had a messy mix of stale `account_kind`/`client_state` values - all corrected to `account_kind: test`, `client_state: active`.
- [x] Fixed `/admin/billing`'s query - was filtering by the old `is_test` (sitemap-indexing) flag instead of `account_kind` (business-classification), so a company reclassified as test via Clients wouldn't show up in Test Billing.
- [x] Folded the unique capabilities of the old Businesses page into Clients before removing it: "No payment setup" issue detection, the Pro-plan included-addon picker, and the is_test (search-indexing) toggle.
- [x] Deleted `/admin/businesses` (page.tsx + BusinessesTable.tsx) and `/admin/quality` (dead duplicate of More's own Quality section) - both were fully unlinked from any nav, only reachable by bookmark/URL guess. Kept `businesses/actions.ts` (setViewAsCookie/exitAdminView/toggleTest/setIncludedAddon still used elsewhere).
- [x] Cleaned stale route references out of `AdminShell.tsx`'s nav match arrays.
- [ ] Shawn QA: Clients page shows the payment-setup issue, addon picker, and search-visibility toggle correctly; Test Billing shows the right accounts.

## 2026-08-10 - Job Photo Grid, Gallery Tab Filter, "View Job Photos" Flicker

- [x] Team round: "This week" date-group headers don't fit inside a Job (a bounded project record, not a rolling photo stream) - dropped for Jobs specifically, kept for the general Photos/Gallery views where they still do real navigational work.
- [x] Fixed: filter button (Favorites/Not on site) only worked on the All Photos tab, disabled everywhere else. Enabled Favorites on the Website/Gallery tab too (Shawn confirmed) - "Not on site" correctly stays All-Photos-only since it's meaningless once you're already looking at what's on the site.
- [x] Root-caused the "View Job Photos" flicker Shawn reported when opening an estimate from a job: `DetailSheet` and `BuilderSheet` each ran their own independent `/api/albums` fetch on mount, starting from empty every time - the linked-job name only resolved after that fresh fetch completed, showing the generic fallback text first. Lifted `jobs` state up to the parent `EstimatesPage` (fetched once, already-loaded by the time either sheet opens) and removed both duplicate fetches.
- [x] Shawn QA confirmed 2026-08-10: job photo grid shows flat (no date headers); Favorites filter works on the Gallery tab; clicking into an estimate from a job shows the real job name immediately, no flicker.

## 2026-08-10 - Estimate List/Detail Never Actually Displayed the Job Title

- [x] Shawn retested and reported "no job name listed" - checked the live database directly rather than guess: confirmed the title-sync fix from the prior entry genuinely worked (his second test estimate has `title: "Hvac Install"` saved correctly), but neither the Estimates list card nor the estimate detail header ever rendered `title` anywhere - it was a fully dead field visually even when populated.
- [x] Estimate list card (`EstimateCard`) now leads with the job title when present (matching how the Jobs list itself reads), with client name + address moved into the subline underneath - exactly the "Job Name at top, client + address on second line" pattern Shawn asked for.
- [x] Estimate detail header now shows the same pattern - job title as the heading, client name as a secondary line beneath it.
- [x] Falls back to client_name as the heading for estimates with no linked job (unchanged behavior for non-job estimates).
- [x] Shawn QA confirmed 2026-08-10: Estimates list and detail both show the job title as the primary line for job-linked estimates.

## 2026-08-10 - Job <-> Estimate: Real Deep Links + Title Sync

- [x] Shawn tested the new Create Estimate flow: the "Linked to Job" card on the estimate showed the job name but the link went to the general Jobs list (`/photos?tab=jobs`), not the specific job - had to search for it manually. Fixed: `/photos?album=<id>` now actually opens that job's detail directly. Added real deep-link handling to the Photos page (didn't exist before - `?album=` was previously only consumed for camera/upload flows, never to open a job's detail on load).
- [x] Estimate's title now seeded from the job's own name/title at creation (e.g. "Flooring for kitchen") instead of being blank/generic - `createEstimateForJob()` now passes `title`.
- [x] Shawn QA confirmed 2026-08-10: tapping "Linked to Job" on an estimate opens that exact job (not the general list); a new estimate's title matches the job it was created from.

## 2026-08-10 - Job -> Estimate: the Missing Forward Direction

- [x] Shawn's question surfaced a real gap: estimate->job worked (attach/create a job from the estimate builder), but job->estimate did not exist at all - zero mention of "estimate" anywhere on the Jobs detail screen.
- [x] Clarified scope with Shawn: photos are reference-only for now (not attached to the customer-facing quote) - smaller, faster build, matches what he actually described (take photos on-site, then write the estimate using them as your own reference).
- [x] Added a "Linked Estimates" card to the Job detail screen - shows every estimate tied to that job (a job can have several over time) with status and total, tap to open.
- [x] Added a real "Create Estimate" button directly on the Job screen - creates a new estimate pre-linked to the job (`job_id` set immediately) with customer name/phone/email/address carried over automatically from the job's own fields, then opens it via the estimates page's existing `?estimate=<id>` deep link.
- [x] Gated on actually having estimate access (`quote_payments` addon) - hidden entirely rather than showing a button that would just fail for companies without it.
- [x] Shawn QA confirmed 2026-08-10: creating an estimate from a job opens it pre-filled and correctly linked; a job with multiple estimates lists all of them.

## 2026-08-10 - Delete Confirmation/Feedback, Bulk Delete, Select-Mode Redesign

- [x] Team round: Lightroom's Delete button was skipping the existing confirm dialog entirely (grid thumbnail already had one); no feedback after any delete; select mode could only download, not delete; select-mode bar visually inconsistent with the Lightroom's own icon-button design.
- [x] Lightroom Delete now routes through the same confirm dialog as the grid, instead of deleting instantly.
- [x] "Photo deleted" / "N photos deleted" notice after any successful delete (single or bulk), reusing the existing notice-pill pattern.
- [x] Bulk delete added to select mode with its own scaled confirm dialog.
- [x] Select-mode bottom bar rebuilt with circular icon buttons (Delete + Download) matching the Lightroom's visual language.
- [x] Upload error diagnostics improved further - real HTTP status/response detail instead of generic "Upload failed" text.
- [x] Shawn QA: delete confirmation + feedback, bulk delete, and the redesigned select-mode bar all work as expected. Confirmed 2026-08-10.

## 2026-08-10 - Chased "Only 1 of N Uploads Succeeds" Past the Storage-Path Fix

- [x] Confirmed via Vercel API that both prior upload fixes (single-file bug, storage-path collision) were genuinely live in production when Shawn hit this again - not a deploy-lag issue.
- [x] Confirmed via direct DB query only 1 photo actually landed - a real, different failure, not the same bug recurring.
- [x] Leading hypothesis: concurrent uploads racing on Supabase's session refresh - simultaneous requests can share the same (single-use, rotating) refresh token cookie; only one wins, the rest get silently logged out mid-batch. Consistent with the pattern being intermittent (Shawn's next test with 5 photos: all 5 succeeded) rather than tied to file count.
- [x] Stopped swallowing upload errors - the banner now shows the real thrown error text on failure, so the next occurrence gives proof instead of another guess.
- [x] Applied the safe preventive fix regardless of full confirmation: `ensureFreshSession()` in `uploadDashboardMedia.ts`, called once before any concurrent upload batch fires (nav upload + job/album upload), forcing the token refresh to happen once, sequentially, before requests can race on it.
- [ ] Shawn QA: retest a multi-photo upload; if it still fails, read back the exact banner error text.

## 2026-08-10 - Shared Upload-Status Banner (App-Wide, All Business Types)

- [x] Team round: big/unmissable but not a full-screen block, three real states (uploading/done/needs attention), never traps mid-task, one shared system not three separate ones.
- [x] `UploadStatusProvider.tsx` - context + hook, mounted once at the dashboard layout level so every business type/folder system (Jobs, Albums, whatever a given industry calls it) gets the same banner automatically.
- [x] Wired into nav FAB upload, job/album library upload, and live camera capture (photo/video/annotated) - the 3 real upload entry points.
- [x] Replaces the old small per-screen progress pills (2026-08-09 entry below) and DashboardNav's upload toasts.
- [x] Shawn QA confirmed 2026-08-10: 3-photo library upload shows live progress and lands on a clean success state; camera capture shows the same banner ("business owners are gonna like that feature"); forced failure keeps the banner up with a clear message instead of disappearing.

## 2026-08-09 - Real Billing Bug: Webhook Silently Reset Plan to Starter

- [x] Root-caused Taco Shop showing Starter despite active paid Business subscription.
- [x] Fixed checkout.session.completed hardcoding plan:"found" and racing with the correct subscription-sync handler.
- [x] Got scoped Stripe Restricted key (not the production Secret key) for live investigation - stored in .env.local, gitignored.
- [x] Audited all 34 companies with a stripe_customer_id against real Stripe data.
- [x] Corrected Taco Shop and Tacos in the database to found_business (matches real Stripe state).
- [x] Verify `npx tsc --noEmit` and `npm run build`.
- [ ] Shawn QA: Taco Shop dashboard now shows Found Business correctly.
- [ ] Shawn QA: fresh real plan upgrade on a test account sticks correctly (no silent reset).
- [ ] Follow-up, not yet investigated: 22 companies have a stripe_customer_id that doesn't exist in live Stripe - likely test-mode ids from before live billing was wired up mid-July. Needs its own look.

## 2026-08-10 - Test-Account Discounts: "Once" Coupons Were Getting Wasted on Proration Invoices

- [x] Root-caused why Taco Shop showed $69/mo after upgrading Starter -> Business: the existing `found_1_first_invoice` / `found_business_1_first_invoice_68_off` coupons are `duration: once`, which discounts whichever Stripe invoice comes next. Because the upgrade happened mid-cycle, the "next invoice" was a $0 proration adjustment, not a real bill - the discount got spent there instead, leaving the subscription at full price going forward. Confirmed live via Stripe invoice/subscription data, not guessed.
- [x] Built new `duration: forever` coupons for internal test accounts, separate from the real-customer once-off onboarding coupons (left untouched): `found_1_forever_business` ($68 off Business, forever), `found_1_forever_pro` ($38 off Pro, forever).
- [x] Created promo code `F0UND1138` -> `found_1_forever_pro` (max_redemptions 25), satisfies the original Pro-plan $1 test-discount request.
- [x] Applied `found_1_forever_business` directly to Taco Shop's live subscription, then superseded by the decision below - see final resolution.

### Final resolution: practice accounts don't need coupons at all - use `is_comp`
- [x] Shawn clarified test coupons served two different purposes that need different tools: (1) Shawn's own practice accounts testing the product, (2) real promo codes for network/referral/trade prospects.
- [x] For (1): practice accounts should never be on real Stripe billing in the first place - `is_comp` (`toggleComp()` in `admin/businesses/actions.ts`) already exists for exactly this and is Stripe-independent.
- [x] Canceled 11 real live Stripe subscriptions: Audio Pro, Hats, Hvac, Lucky, music, Rosa's Mexican Food, T-Shirts, Taco Shop, Tacos (x2), Taquero Mucho.
- [x] Set `is_comp: true` + `subscription_status: 'active'` on all 32 practice accounts (everyone with a stripe_customer_id except RC Bicycles, left billing normally). Verified in DB after the run.
- [x] Corrected a stale assumption: Nereidas salón was previously thought to be a real customer; Shawn confirmed 2026-08-10 it's actually his own account too, now comped.
- [x] For (2): kept the real `once` coupons untouched for genuine signups; the new `forever` coupons (`found_1_forever_business`, `found_1_forever_pro` / promo `F0UND1138`) stay live and reserved for real network/trade deals, not practice accounts.
- [ ] Shawn QA: spot-check a couple of comped accounts (Taco Shop, Hvac) still show full plan access with no billing prompts.

---

## 2026-08-09 - Security Audit: Billing Auth Gap + Worker-Role Gaps

- [x] Ran dedicated security audit of worker-role feature (not a self-check).
- [x] Fixed more/actions.ts: zero-auth billing actions (pre-existing, not worker-specific) - new requireCompanyOwner() guards all 6.
- [x] Fixed social-posts/route.ts: no requireOwnerAccess on any method.
- [x] Fixed company-slug/route.ts: PATCH had no check; GET now strips billing fields for non-owners.
- [x] Fixed photos/download/route.ts: bulk export had no check.
- [x] Fixed layout.tsx: lead/order/reservation counts leaked to worker sessions.
- [x] Confirmed solid: /api/photos, /api/albums, no owner-escalation path, revoked members blocked everywhere.
- [x] Verify `npx tsc --noEmit` and `npm run build`.
- [ ] Shawn QA: owner billing flows still work (buy add-on, upgrade, billing portal).
- [ ] Shawn QA: worker still blocked from the 4 fixed routes.
- [ ] Shawn QA: Photos page still works for a worker account.
- [ ] Next: back to Jobs feature list - cover photo selector, photo notes (+ possible estimate linkage), job notes, worker permission toggles (owner grants specific access like estimates), job search/filter, address privacy toggle. Facebook link-preview also needs a real test (iMessage confirmed working, Facebook assumed but unverified).

---

## 2026-08-09 - iOS Native-Picker Delay + App Store Timeline Question

- [x] "Preparing..." focus-triggered signal for the native-picker handoff gap.
- [x] Shoot made primary action in camera sheet, Upload from Library secondary with expectation-setting copy.
- [x] Verify `npx tsc --noEmit` and `npm run build` after both commits.
- [ ] Shawn QA: Preparing pill appears immediately on return from native picker.
- [ ] Shawn QA: camera sheet reads Shoot-first now, Upload feels clearly secondary.
- [ ] Decision needed: App Store strategy. Team recommendation given (Google Play this week via TWA, Apple needs D-U-N-S number + real native functionality, don't block ad launch on either) - awaiting Shawn's direction on what to build next.

---

## 2026-08-09 - Upload Speed/Limits + Estimate<->Job Reverse Link

- [x] 12-file soft cap on multi-file uploads (Photos + Jobs share this path).
- [x] Bounded concurrency (3 at a time) replacing sequential uploads.
- [x] Real "Uploading X of Y" progress indicator.
- [x] Migration 059: estimates.job_id references photo_albums(id).
- [x] BuilderSheet: "Link to a Job" - pick existing or create new, pre-filled.
- [x] DetailSheet: "Attach to a Job" / tap-through to linked Job's photos.
- [x] Verify `npx tsc --noEmit` and `npm run build` after both commits.
- [ ] Shawn QA: select 15+ files, confirm 12-cap + progress pill.
- [ ] Shawn QA: create estimate with new Job, confirm pre-fill.
- [ ] Shawn QA: attach existing estimate to a Job, confirm it persists.
- [ ] Next on Jobs pipeline (not started): "Ask about this job" real context, cover photo selector + per-photo notes, Job/scope notes, worker permissions beyond camera-only, search/filter + privacy toggle (low priority, deferred).

---

## 2026-08-09 - Regression Fix: Gallery Showed Zero Photos

- [x] Root-caused: company_photos has no mime_type column, my earlier fix's .select() calls silently failed.
- [x] Removed mime_type from all 4 select() calls; isVideoMedia() works from URL extension alone.
- [x] Verified 11 real rows exist for Hvac test company directly against live DB before pushing.
- [x] Verify `npx tsc --noEmit` and `npm run build`.
- [ ] Shawn QA: HVAC /gallery shows all 11 photos again, video plays correctly.

---

## 2026-08-09 - Blank Videos on Public Gallery + Job Pages

- [x] Fix public /gallery page to render video (grid tile + lightbox), both plan tiers.
- [x] Guard CTA background image and album-cover picks to skip video URLs.
- [x] Fix the same bug on the shared Job public page (AlbumPhotoGrid.tsx).
- [x] Fix OG/social-preview image generator to skip video when picking a cover photo.
- [x] Verify `npx tsc --noEmit` and `npm run build` after both commits.
- [ ] Shawn QA: HVAC test account video now shows/plays on public gallery.
- [ ] Shawn QA: same check on a Job's shared public page.
- [ ] Shawn QA: sharing a job link with a video-first album to iMessage doesn't break the preview.
- [ ] Next (approved shape, not built): upload speed/limit - 12-file soft cap, 3-way concurrency instead of sequential, real progress indicator. Affects Photos and Jobs both.

---

## 2026-08-09 - Live QA Follow-Up: 3 Bugs + Nav/Settings Restructure

- [x] Fix Sign Out to also clear admin View As override cookies (real access-control gap, not confusion).
- [x] Fix misleading "Deposit paid" copy on estimate-accept page when business has no Stripe Connect.
- [x] Label owner vs. worker-only access in the company picker (`/select`).
- [x] Split Billing/Plan and Business Info out of More into their own pages.
- [x] Add top-right AccountMenu (Switch Business, Team, Business Info, Billing & Plan, Sign Out).
- [x] Strip More down to pure page navigation.
- [x] Remove Team tile from Site Editor's Site-wide section.
- [x] Add "site" tool to toolPolicy.ts registry (Edit My Site had no other entry point).
- [x] Retire BusinessNameEditor (duplicate of Site Editor's Contact Info tile).
- [x] Verify `npx tsc --noEmit` and `npm run build` after each of 7 commits.
- [ ] Shawn QA: admin View As has full access again on a real customer account.
- [ ] Shawn QA: no-Stripe-Connect estimate accept no longer claims a payment.
- [ ] Shawn QA: new AccountMenu (avatar icon) - all 5 rows work correctly.
- [ ] Shawn QA: More/Billing/Business Info split - nothing lost, nothing 404s.
- [ ] Next phase (not started): reverse Jobs<->Estimates link, "Ask about this job" with real context, OG/link-preview caching diagnosis, cover photo selector + per-photo notes.

---

## 2026-08-09 - Worker Roles/Permissions

- [x] company_members table + owner/worker access resolver (migration 058, additive).
- [x] Enforce owner-only access on Leads/Contacts/People/Estimates/Schedule/Site editing/Marketing/Payments/Locations/Rate Sheet/Menu/Products/dashboard home.
- [x] Owner-facing /team invite flow (magic-link based, reuses existing login infra).
- [x] Worker nav restricted to Photos + minimal More (Sign Out only).
- [x] Fix admin "View As" regression caught while building nav (getCompanyRole now treats admin override as owner-equivalent).
- [x] Verify `npx tsc --noEmit` and `npm run build` after each of the 4 commits.
- [ ] Shawn QA: invite a real worker end to end (email arrives, magic link works, lands on Photos).
- [ ] Shawn QA: worker cannot reach owner-only pages by direct URL.
- [ ] Shawn QA: admin View As still has full owner access on a real customer account.
- [ ] Shawn QA: Team page "Remove" actually revokes access.
- [ ] Next phase (not started): reverse Jobs<->Estimates link (create/attach a Job from the Estimate builder), "Ask about this job" with real job context, OG/link-preview caching diagnosis, cover photo selector + per-photo notes.

---

## 2026-08-09 - Job Leads Connected to Estimate Builder

- [x] Job/shared-work leads show Create Estimate even outside the estimate-only inbox.
- [x] Creating an estimate from a job lead pre-fills customer info.
- [x] Estimate work description uses the job/project title first when available.
- [x] Verify `npm run build` and `git diff --check`.
- [x] Shawn QA: tapped Create Estimate on a job-page lead, confirmed prefilled customer info and job-title-based description.

---

## 2026-08-08 - Photos IA Cleanup: Favorites and Albums

- [x] Rename Photos tabs to owner-facing language: All Photos, On Website, Favorites, Albums.
- [x] Remove the Social tab from the main Photos page.
- [x] Keep the star but relabel it as Favorite instead of Social.
- [x] Make On Website include hearted gallery photos and photos placed on exact website sections.
- [x] Rename Collections/Projects language in this screen to Albums.
- [x] Update empty states to plain owner language.
- [x] Remove the old Social Assistant workspace from the active Photos page bundle.
- [x] Verify `git diff --check` and `npm run build`.
- [ ] Shawn QA: Photos page tabs read All Photos, On Website, Favorites, Albums.
- [ ] Shawn QA: hearting a photo shows it under On Website and still feeds the public gallery.
- [ ] Shawn QA: starring a photo shows it under Favorites and no Social wording appears.
- [ ] Shawn QA: long press/Add to Site still opens the placement sheet and saves to the chosen website section.
- [ ] Next phase: add Add to Product / Add to Menu Item flow for shopping cart and restaurant businesses.

---

## 2026-08-08 - Email Signup Modal and Subscribe Fix

- [x] Keep `/subscribe` available for QR/direct links.
- [x] Change homepage `Join the List` into a modal signup flow.
- [x] Hide the sticky public CTA bar on `/subscribe` and `/unsubscribe`.
- [x] Fix `/api/subscribe` so existing contacts update without relying on a database conflict rule.
- [x] Polish standalone `/subscribe` spacing.
- [x] Verify `git diff --check` and `npm run build`.
- [ ] Shawn QA: homepage `Join the List` opens a modal and successfully saves.
- [ ] Shawn QA: footer/direct `/subscribe` page looks clean and saves.

---

## 2026-08-08 - Public Email Signup Entry Points

- [x] Add a shared public homepage signup section gated by the effective `email_marketing` add-on.
- [x] Add a gated footer `Join our list` link to public websites with email marketing active.
- [x] Keep the implementation shared across templates instead of Lucky-only.
- [x] Update Marketing dashboard copy so owners understand customers can join from the website or QR/link.
- [x] Verify `git diff --check` and `npm run build`.
- [x] Shawn QA: Lucky or another email-marketing site shows `Stay in the loop.` near the bottom of the homepage.
- [x] Shawn QA: a site without email marketing does not show the signup section or footer link.

---

## 2026-08-08 - Marketing Subscriber Count Fix

- [x] Reproduce Lucky mismatch: contact exists and is email opted-in, but source is `website`.
- [x] Remove overly strict `source = subscribe_page` filter from Marketing page counts.
- [x] Remove overly strict `source = subscribe_page` filter from Marketing send API.
- [x] Update Marketing helper copy to explain subscribers are opted-in email contacts, not every contact.
- [x] Make subscribe API return an error if Supabase insert/upsert fails.
- [x] Verify corrected Lucky query returns `1` email subscriber.
- [x] Verify `git diff --check` and `npm run build`.

---

## 2026-08-08 - Security Hardening Sprint 2

- [x] Confirm Lucky public form smoke test still submits normally.
- [x] Replace unauthenticated public marketing sender with guarded dashboard sender.
- [x] Require dashboard ownership before stock-photo route can update a company website image.
- [x] Add throttling and input validation to public Places lookup.
- [x] Add throttling to dashboard Places autocomplete.
- [x] Point dashboard Places input at secured `/dashboard/api/places-autocomplete`.
- [x] Review cron routes for `CRON_SECRET`.
- [x] Confirm Stripe webhook signature check is present.
- [x] Verify `git diff --check` and `npm run build`.

---

## 2026-08-08 - Security Hardening Sprint 1

- [x] Add hidden form-loaded timestamp to public contact, estimate, and reservation forms.
- [x] Teach spam guard to score impossible instant submissions as bot-like behavior.
- [x] Add IP-level throttling to password login.
- [x] Add IP-level throttling to magic-link login.
- [x] Add throttling and payload-size guard to public QR endpoints.
- [x] Tighten admin login cookie with explicit same-site behavior and shorter lifetime.
- [x] Verify `git diff --check` and `npm run build`.
- [ ] Owner/platform check: confirm GitHub secret scanning and push protection are enabled.
- [ ] Owner/platform check: confirm Vercel security settings match launch posture.
- [ ] Future decision: add Cloudflare Turnstile only if spam pressure continues after hidden-field, timing, and rate-limit protections.

---

## 2026-08-08 - Lead Spam Protection and RC Bicycles Cleanup

- [x] Add shared spam guard for website lead/reservation submissions.
- [x] Add hidden bot field to public contact, estimate, and reservation forms.
- [x] Save obvious spam as `status = spam` without deleting the record.
- [x] Skip owner notification emails, customer auto-replies, and contact auto-save for obvious spam.
- [x] Hide spam from normal inbox search/open/done workflow.
- [x] Add collapsed `Spam hidden` recovery section with `Not spam`.
- [x] Add manual `Mark as spam` action for owner cleanup.
- [x] Exclude spam from dashboard home counts, navigation badges, and People/Customers.
- [x] Mark 10 obvious RC Bicycles spam leads as spam in live Supabase.
- [x] Keep Shawn Lopez test lead open.
- [x] Verify `git diff --check` and `npm run build`.
- [ ] Shawn QA: Ryan / RC Bicycles inbox shows only the real open test lead by default.
- [ ] Shawn QA: collapsed `Spam hidden` section can restore a lead with `Not spam`.

---

## 2026-08-08 - Edit Website Dynamic Pages and Wrapper Consistency

- [x] Edit Website dropdown now hides inactive Shop unless the effective shopping-cart add-on is active.
- [x] Food businesses still show Menu in Edit Website.
- [x] Retail/makers businesses without shopping cart now use Products & Services owner language for the services page.
- [x] About, Contact, and Services/Products & Services edit controls now sit inside one connected wrapper like Homepage.
- [ ] Shawn QA: Ryan no longer sees Shop in the Edit Website page dropdown while shopping/cart is inactive.
- [ ] Shawn QA: About, Contact, and Products & Services feel visually grouped like Homepage.

---

## 2026-08-07 - Featured Update Button Grouping Polish

- [x] Button action and Button words now live in one visual wrapper.
- [x] Button words helper now says "Change what customers see on the button."
- [ ] Shawn QA: Button action/words read as one connected control.

---

## 2026-08-07 - Featured Update Button Action/Words Split

- [x] Featured Update now separates Button action from Button words.
- [x] Action choices update visible button words at the same time.
- [x] Other page opens a page picker instead of raw `/path` or `tel:` editing.
- [ ] Shawn QA: choosing Call Us changes the public button to call and updates the visible words.
- [ ] Shawn QA: Other page picker feels owner-friendly and does not expose technical links.

---

## 2026-08-07 - Featured Update Dynamic Destinations

- [x] Featured Update button choices now respect active add-ons and live site paths.
- [x] Duplicate destination choices are deduped.
- [x] Stale public Featured Update paths fall back to a valid customer-facing content path.
- [x] Removed `Clean` from Banner Style owner choices; old saved default maps to Dark visually.
- [ ] Shawn QA: Ryan Featured Update no longer shows Shop when shopping cart is inactive.
- [ ] Shawn QA: clicking Products/Services/Contact updates the destination without opening the link edit sheet.

---

## 2026-08-07 - Featured Update Button/Banner Polish

- [x] Destination choices no longer overflow horizontally.
- [x] Button destination summary now uses owner language instead of URL paths.
- [x] `Look` renamed to `Banner style`.
- [x] `Default` displayed as `Clean`; `Custom link` displayed as `Other page`.
- [ ] Shawn QA: Featured Update Button card fits cleanly on iPhone.

---

## 2026-08-07 - Featured Update Wrapped Like Homepage

- [x] Featured Update preview and edit rows are now inside one wrapper like First Impression.
- [x] Removed the overlapping clickable-looking "Photo off in this look" pill.
- [x] Added passive helper text for photos saved while a non-image look is selected.
- [ ] Shawn QA: Featured Update feels like one connected editing card on mobile.
- [ ] Shawn QA: photo helper is readable and does not compete with the camera button.

---

## 2026-08-07 - Home Featured Update Preview Cleanup

- [x] Featured Update now uses one live-feeling preview instead of a disconnected image/card/control stack.
- [x] Non-image looks no longer imply the uploaded photo is live; they show "Photo off in this look."
- [x] Featured Update controls now use plain labels: Headline, Supporting line, Button, Look.
- [x] Button wording and destination now live together in one Button control.
- [x] Services Preview now shows examples from the Services page before the Edit services action.
- [ ] Shawn QA: Ryan Home > Featured Update feels as intuitive as First Impression.
- [ ] Shawn QA: Featured Update Look = Image is the only mode that shows the uploaded photo as live.
- [ ] Shawn QA: Services Preview examples match Ryan's Services page.

---

## 2026-08-07 - Main Website Button Truthful Labels

- [x] Main Website Button now uses public-site CTA labels instead of hardcoded editor labels.
- [x] Ryan-style retail businesses without shopping cart no longer see misleading "Shop Now" for a Services destination.
- [x] Removed Home "Button Words" booking-only control.
- [ ] Shawn QA: Ryan's Main Website Button options match the live public button labels and destinations.

---

## 2026-08-07 - Home Editor Owner-Language Cleanup

- [x] Team certified "First Impression" as the owner-facing replacement for "hero".
- [x] Home editor now surfaces Main Website Button instead of separate Main Button / Primary Action controls.
- [x] Main Website Button clears the old hidden CTA override when saved.
- [x] Home Gallery strip removed from the Home editor.
- [x] Services Preview added as a handoff to Services for non-food businesses.
- [x] Footer Call to Action moved near the bottom and labeled with current-headline reference.
- [ ] Shawn QA: Home editor order and labels make sense for Ryan-level non-technical owners.
- [ ] Shawn QA: changing Main Website Button updates the public site top/mobile button.

---

- [x] Team audit Rosa's Mexican Food mobile order page before more code changes.
- [x] Decide whether no-photo menu items should stay initials-only, use richer food-style placeholders, or push owners harder to add real photos. Final team correction: no placeholder at all for restaurant no-photo items.
- [x] Replace Edit Website > Menu/Products handoff with embedded shared CatalogManager.
- [x] Add shared menu/product search and large-catalog category collapse behavior.
- [ ] Shawn QA: Edit Website > Menu should show page image controls followed by the real menu editor, not a detour button.
- [ ] Shawn QA: Edit a menu item from Edit Website and confirm it saves and updates the public menu.
- [x] Documentation recovery checkpoint added after credit interruption; current truth is back at the top of `SESSION_HANDOFF.md`.

---

## 2026-07-31 - Custom-Domain Share QA

- [x] Fix Safari custom-domain share source of truth: public metadata and live-preview links prefer connected domains over foundco.app fallback URLs.
- [ ] Shawn QA: open `https://rcbicycles.com` in normal Safari, use Share, and confirm the shared/opened URL stays on `rcbicycles.com`. Repeat from Shop/Menu if present.

---
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
- ~~Custom domain flow end-to-end test~~ - resolved 2026-07-30: verified live against the real Vercel Domains API (add/check/remove round-trip). Also un-gated the flow (was still Pro-only, stale since custom_domain was made free on every plan in June) and removed a dead duplicate implementation. **Caveat added same day:** that round-trip used `example.com`, which can never pass Vercel's real ownership check - it proved the API plumbing worked, not that the reported "Live" status was trustworthy. See the false-"Live" bug entry directly below.
- ~~False "Live" domain status~~ - resolved 2026-07-30: Found only checked Vercel's domain-ownership signal, never its separate DNS-config-correctness signal, so untouched domains could read "Live" within moments of being typed in. Team-reviewed (Shawn-convened, Steve leading), fixed - both signals now required, fails closed on errors, 3-check grace window before showing a "records look wrong" message. See `SESSION_HANDOFF.md` and `DECISIONS.md` [2026-07-30].
- ~~Custom domains 404'd for real~~ - resolved 2026-07-31, second and more serious domain bug found same session: `getCompanyByDomain()`'s Supabase query didn't actually restrict results by domain (missing `!inner` on an embedded-resource filter), so it never worked once a second active company existed - unrelated to the dashboard-status bug above. Fixed, migration added (unique constraint on `custom_domain`), standalone regression script added (`scripts/verify-domain-lookup.mjs`, no test framework exists yet), verified live end-to-end against `mambostudio.app`. See `SESSION_HANDOFF.md` and `DECISIONS.md` [2026-07-31].
- **No test framework in this repo** - noted while fixing the above. `npm run build`/manual QA/standalone verification scripts are the only checks today. Worth a real scoping conversation (vitest vs jest, CI integration) when there's time - not decided or started.
- **Registrar recommendation copy** - SHIPPED 2026-07-30. GoDaddy + Namecheap only, no 3rd forced pick. See `DECISIONS.md`.
- **Domain registrar auto-setup** - the GoDaddy scoped-token path was built, then REVERTED 2026-07-30: Shawn correctly rejected it as unusable by real non-technical owners ("my business owners are not developers"). Real team meeting held (Shawn-convened, Steve leading, full roster) - conclusion: hold all new automation, no data yet showing it's the actual blocker. **Instead SHIPPED 2026-07-30:** manual DNS flow improvements - plain-English explanation, replace-not-duplicate warning, direct GoDaddy/Namecheap DNS-settings links, explicit "Done - I added these records" confirmation step. See `SESSION_HANDOFF.md` for full detail.
- **Longer-term, not started:** Domain Connect (true one-click, no-token UX) - Craig owns submitting the template + emailing GoDaddy, 2-week check-in committed. Entri Connect (paid, $3-9K+/year) explicitly tabled until real customer count justifies the cost. Instrumenting the manual flow to see if domain-connection is actually a drop-off point - not done, should happen before spending on either option above.
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

### Photos Page QA - August 8, 2026
- [ ] Owner QA: Heart adds/removes a photo from Favorites only.
- [ ] Owner QA: Gallery adds/removes a photo from the public gallery/New Arrivals area.
- [ ] Owner QA: Add to Site only shows specific page photo destinations.
- [ ] Owner QA: Featured Update is managed from Edit Website, not Photos.
- [ ] Owner QA: Deleted test photos do not remain on the public Gallery page.

### Photos + Jobs QA - August 9, 2026
- [ ] Owner QA: Photos opens without corrupted `Loading...` text or mojibake.
- [ ] Owner QA: All Photos, Gallery, and Jobs tabs keep the dark Found photo-workspace feel.
- [ ] Owner QA: The filter opens as a compact dark popover near the filter button.
- [ ] Owner QA: Heart only controls Favorites.
- [ ] Owner QA: Gallery icon only controls public website gallery/New Arrivals.
- [ ] Owner QA: `Use on page` only opens page/section photo placement choices.
- [ ] Owner QA: Service companies see `Jobs`, not `Albums` or `Projects`.
- [ ] Owner QA: Jobs tab label never flashes `Projects` on load.
- [ ] Owner QA: New Job form asks for job name first, then customer name, address, phone, and email.
- [ ] Owner QA: Job names display in title case in the Jobs list and job detail.
- [ ] Owner QA: Jobs list gives enough context to distinguish repeat jobs, such as customer name and/or address.
- [ ] Owner QA: Job detail has more breathing room than the normal photo grid and feels like its own workspace.
- [ ] Owner QA: Shared job link opens the public branded job page instead of the Found 404.
- [ ] Owner QA: Public shared job page does not show a duplicate business-name eyebrow above the job title.
- [ ] Owner QA: Public shared job page hides street address by default.
- [ ] Owner QA: Public shared job photos open in the black full-screen viewer.
- [ ] Owner QA: iMessage/Facebook preview uses the job photo/logo OG image and does not show customer name/address inside the image.

### Active Pipeline - Service Industry Jobs
- [x] Connect Jobs to Estimates: create estimate from a job and attach/create job from an estimate. Estimate->job direction shipped first (picker/create UI in the estimate builder and detail sheet); job->estimate direction was actually missing until 2026-08-10 (Shawn caught it by asking) - now a real "Create Estimate" button + linked-estimates list live on the Job screen itself.
- [x] Worker role: camera/job capture only by default. Shipped - `company_members`/`getCompanyRole()`, DashboardNav restricts workers to Photos + More only.
- [x] Make `Ask about this job` open a job-aware contact form instead of a generic contact page. Shipped - `JobLeadCapture` component on the public job/gallery album page.
- [x] Cover photo selector for each Job. Shipped 2026-08-10 - "Set as Cover" button in the photo viewer (job photos only, replaces the Add-to-Site slot); `photo_albums.cover_photo_id` was already in the schema but unused, now actually read/written by the dashboard job list, job detail cover fallback, and the public Pro gallery list (all three previously computed "most recent photo" independently).
- [x] Photo notes inside Jobs. Shipped 2026-08-10 - tap-to-edit caption row in the photo viewer, job photos only. New `company_photos.note` column.
- [x] Job-level notes or scope summary. Shipped 2026-08-10 - `JobNotesEditor` on the job detail header (tap-to-edit card, same pattern as the customer-details editor). New `photo_albums.notes` column.
- [x] Add an owner-facing privacy toggle for customer name/street address on the shared job link. Shipped 2026-08-10, scoped to address only (customer name was already intentionally shown) - checkbox in Job Details, off by default. New `photo_albums.show_address_public` column.
- [ ] Owner-controlled worker permissions for estimates, publishing website photos, and broader dashboard access (only the default camera-only worker role exists - no per-worker granular toggle yet). Deliberately kept out of this round - team called this its own security-reviewed cycle, not bundled with the CRUD work above.
- [ ] Search/filter Jobs by customer, address, worker, date, and status.
- [ ] Search/filter Photos by job, worker/uploader, favorites, on-site, and not-on-site.

### Active Pipeline - Email Marketing
- [ ] Email dashboard should show who is on the list, not only subscriber count.
- [ ] Rename `Share QR` to `Download QR code` unless actual QR sharing is implemented.
- [ ] Keep `Share Link` for sending the signup URL.
- [ ] Upgrade campaign templates from plain text to branded, premium email layouts.

### Active Pipeline - Menu / Ordering
- [ ] Menu editor should scale cleanly for 30-50+ items.
- [ ] Add search/collapsible categories for long menus.
- [ ] Keep money formatting consistent across menus, carts, and ordering: `$1.00`, not `1`.
- [ ] Missing product/menu photos need a premium fallback that does not look fake or cheap.
