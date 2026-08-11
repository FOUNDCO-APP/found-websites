# SESSION_HANDOFF.md - Current Truth

## 2026-08-11 - Activation Funnel: Stripe Webhook Fallback

### Where We Left Off
Shawn completed a real activation test for `dj.foundco.app` using a coupon and credit card. Found HQ moved from `7 / 2 / 1 / 0` to `8 / 2 / 2 / 0`, meaning Started and Checkout tracked, but Activated stayed 0.

### Found
- Live Supabase confirmed `dj` is active:
  - `subscription_status = active`
  - `plan = found_business`
  - Stripe customer exists
  - no pending setup intent remains
- Therefore payment and activation succeeded. The issue was analytics reliability, not billing.
- Health reads the correct field: `activation_completed`.
- Root cause: `activation_completed` was only captured from the `/activate/confirm` browser-return route. The Stripe webhook updated the database but did not also capture the activation funnel event.

### What Changed
- Added `activation_completed` capture to the Stripe `customer.subscription.created/updated` webhook path.
- Added transition guarding: only capture when the company was not already active/trialing before the update.
- Added the same guard to the browser-return confirm path to avoid double-counting when both paths run.
- Manually backfilled one `activation_completed` event for the verified `dj` activation using `method = manual_backfill`.

### Verification
- `cmd /c npx tsc --noEmit` passed clean.
- `cmd /c npm run build` passed clean. Existing Next middleware deprecation warning remains.
- PostHog accepted the manual correction event with HTTP 200.

### Test Next
- After deploy, activate another practice site or cancel/retry a test subscription flow.
- Expected: when Stripe subscription becomes active/trialing, `Activated` increments even if the browser-return path is interrupted.
- Health may still lag by PostHog ingestion plus the 60-second Found HQ cache.

---

## 2026-08-11 - Activation Flow: Do Not Ask Plan Twice

### Where We Left Off
Shawn clarified the real issue: pricing can appear before onboarding when the customer enters through a general "Get my site" path, but once a plan is chosen, Found should not ask for the same pricing decision again after the site preview.

### Team Direction
- Steve: one decision, carried through. Repeating the same plan choice makes the product feel like it forgot.
- Angela: two paths are valid: unsure customers choose a plan before questions; plan-aware customers from pricing pages go straight to questions. Both should activate without a second plan selector.
- Phil: keep the revenue path clean; do not create a second chance for downgrade/confusion at the final moment.
- Craig: preserve tracking by carrying the selected plan into the existing activation setup instead of inventing a new event path.

### What Changed
- Updated `ActivateOverlay` so normal activation skips the plan selector when `targetPlan` is already present.
- The overlay now goes straight to Stripe/payment setup for already-selected plans.
- If no plan is known, the overlay still shows Starter / Pro / Business before payment.
- Existing `checkout_started` tracking remains tied to `preparePayment()`, meaning it fires when Stripe/payment setup starts, not after payment.

### Verification
- `cmd /c npx tsc --noEmit` passed clean.
- `cmd /c npm run build` passed clean. Existing Next middleware deprecation warning remains.

### Test Next
- General path: `foundco.app` -> `Get my site` -> choose plan -> questions -> preview -> Activate. Expected: no second plan selector; Stripe/payment setup opens for the chosen plan.
- Pricing path: `/plans` or plan-specific page -> pick plan -> questions -> preview -> Activate. Expected: no second plan selector; Stripe/payment setup opens for that chosen plan.
- Found HQ Health: `Checkout` should increment after payment setup opens. `Activated` should only increment after Stripe activation succeeds.

---

## 2026-08-11 - Onboarding Recovery: Resume Already-Built Site

### Where We Left Off
Shawn continued FOUND Systems QA and noticed two related onboarding problems:
- Health showed `2 Started / 2 Site built`.
- Returning to `foundco.app`, starting again, and entering `DJ` did not offer a clear recovery path. It only said the web address was already taken, then later showed the generic "Save your spot" prompt on exit.

### What Changed
- Added server action `findBuiltSiteForResume(slug, email)`.
- The check verifies both:
  - the requested slug exists, and
  - the entered email matches the email on that company.
- If matched and the site has already reached preview, Found returns the user to the generated-site reveal/activation path.
- If not matched, Found does not expose the site and tells the user to pick another web address or use the original email.
- Added "Already built this site?" recovery UI inside the taken-address sheet.

### Verification
- `cmd /c npx tsc --noEmit` passed clean.
- `cmd /c npm run build` passed clean. Existing Next middleware deprecation warning remains.
- Read-only live DB check showed `2 Site built` was not duplicate tracking for DJ. It reflected two real recent test site records:
  - `dj`
  - `flooring`

### Test Next
- After deploy, go to `foundco.app`.
- Start onboarding again.
- Enter the same business name `DJ`.
- When the address-taken sheet appears, enter the matching email used for DJ.
- Expected: Found returns to the generated-site reveal/activation path for `dj.foundco.app`.
- Then continue to Found Business payment setup and confirm `Checkout` increments.

---

## 2026-08-11 - Activation QA: Remove Public Comp Control

### Where We Left Off
During FOUND Systems checkout QA, Shawn continued from the `dj.foundco.app` practice signup. He tapped **Activate my site**, reached the plan-selection sheet, changed from Found Pro to Found Business, and noticed an internal button: `Activate as comp (Found team)`.

### What Changed
- Treated this as a real trust/UX/security-surface issue.
- Root cause: onboarding was reading Shawn's admin cookie and passing an `isAdminSession` flag into the shared public activation overlay.
- Removed the visible comp button from `ActivateOverlay`.
- Removed onboarding's admin-cookie read and admin-session prop plumbing.
- Removed the now-unused `activateAsComp` server action.
- Existing comp onboarding still uses the separate server-validated comp-token path; it is not shown as a button on the customer activation screen.

### Verification
- `rg` no longer finds the public comp button or `activateAsComp` action in the active activation/onboarding code.
- `cmd /c npx tsc --noEmit` passed clean.
- `cmd /c npm run build` passed clean. Existing Next middleware deprecation warning remains.

### Test Next
- After deploy, repeat from a practice generated site.
- Tap **Activate my site**.
- Expected: plan selector shows Starter / Pro / Business only; no `Activate as comp (Found team)` button.
- Select Found Business and tap Continue.
- Expected: Stripe/card setup appears and Found HQ Health `Checkout` increments after about 1 minute.

---

## 2026-08-11 - Supabase Security Email: RLS Critical Fix

### Where We Left Off
Shawn received a Supabase security email warning: `Action required: security vulnerabilities detected`, rule `rls_disabled_in_public`, project `FOUNDCO APP` (`mmctzloztgkbqvofmkou`). Treat this as real unless proven otherwise.

### What Changed
- Used the Supabase CLI linked to FOUNDCO APP to run the live security advisors.
- Confirmed the critical warning was real: seven public tables had RLS disabled:
  - `estimate_rate_sheets`
  - `email_campaigns`
  - `estimates`
  - `estimate_line_items`
  - `contact_suppressions`
  - `addon_subscriptions`
  - `addon_stripe_prices`
- Confirmed app usage for those tables goes through server routes/admin/service-role clients, not direct browser Supabase calls.
- Applied live SQL to enable RLS on those seven tables and revoke direct access from `anon` and `authenticated`.
- Added migration record: `database/migrations/061-enable-rls-for-business-tables.sql`.
- Added `.gitignore` rule for Supabase CLI local link/cache metadata: `supabase/.temp/`.

### Verification
- Re-ran Supabase security advisors: the critical `rls_disabled_in_public` errors are gone.
- Live catalog query confirms all seven tables now have `rls_enabled = true`.
- Anonymous REST smoke test against representative sensitive tables returns `401`:
  - `estimates`
  - `estimate_line_items`
  - `email_campaigns`
  - `addon_subscriptions`

### Still Open
- Supabase still reports INFO-level `rls_enabled_no_policy` for server-only tables. This is expected for locked-down tables with no direct client policies.
- Supabase still reports WARN-level:
  - `function_search_path_mutable` for `public.update_updated_at`
  - `auth_leaked_password_protection` disabled
- Next security pass should fix the function search path warning and have Shawn enable leaked-password protection in Supabase Auth settings.

### Test Next
- In Supabase dashboard, open the security warning email's **Resolve issue** link again.
- Confirm the critical public-table/RLS warning is resolved or no longer listed.
- In Found, smoke-test estimates, marketing/email send history, checkout/activation add-ons, and public quote pages.

---

## 2026-08-11 - FOUND Systems: Site Built Funnel Reliability Fix

### Where We Left Off
Shawn ran a live iPhone funnel QA. Health showed PostHog traffic updating, `Started = 1`, and `1 Business plan pick`, but `Site built = 0` even though Shawn reached the generated-site preview/reveal screen.

### What Changed
- Treated this as a real tracking bug, not normal lag.
- Moved `onboarding_completed` / **Site built** capture from the browser into `createOnboardingSite()` on the server.
- Removed the duplicate client-side `onboarding_completed` capture so future counts do not double-count.
- Reused `src/lib/foundFunnelServer.ts` as the reliable server-side event sender for both:
  - `onboarding_completed`
  - `activation_completed`
- Reduced Found HQ Health's PostHog cache from 5 minutes to 60 seconds.

### Plain-English Definition
- Started = visitor begins the signup questions.
- Business plan pick = visitor chooses Found Business.
- Site built = Found successfully creates the company/site and the preview/reveal screen is valid.
- Checkout = Stripe activation/payment setup starts.
- Activated = Stripe succeeds and the account becomes paid/active.

### Verification
- `cmd /c npx tsc --noEmit` passed clean.
- `cmd /c npm run build` passed clean. Existing Next middleware deprecation warning remains.
- Shawn re-tested after deploy: created a fresh site and reached `dj.foundco.app`.
- Found HQ Health now shows `2 Started` and `1 Site built`, confirming the server-side `onboarding_completed` capture works.

### Test Next
- Continue from a practice built site to the activation/payment setup step.
- Expected: Checkout increments after Stripe activation setup starts.
- Activated only increments after real Stripe activation succeeds.
- Shawn's previous missing `Site built` event will not backfill automatically unless a manual correction event is sent.

---

## 2026-08-11 - FOUND Systems: Revenue Funnel Instrumentation

### Where We Left Off
Shawn approved moving forward with FOUND Systems as a money-making marketing machine. Team direction: track the minimum funnel that shows where Found loses money, keep the Health view useful on mobile, and show whether visitors are choosing Found Business.

### What Changed
- Added centralized client funnel helper: `src/lib/foundFunnelTracking.ts`.
- Added server-side activation capture helper: `src/lib/foundFunnelServer.ts`.
- Instrumented:
  - `onboarding_started`
  - `plan_selected`
  - `onboarding_completed`
  - `checkout_started`
  - `activation_completed`
- `activation_completed` is captured server-side after Stripe subscription creation in `confirmActivation()` so the paid-customer event survives redirects.
- Found HQ Health now queries and displays 30-day funnel counts:
  - Started
  - Site built
  - Checkout
  - Activated
- Health also shows Business plan picks, because Found Business is the higher-value path Shawn cares about.

### Verification
- `cmd /c npx tsc --noEmit` passed clean.
- `cmd /c npm run build` passed clean. Existing Next middleware deprecation warning remains.

### Test Next
- After deploy, run one practice signup through onboarding.
- Confirm Started / Site built / Checkout counts appear in Found HQ > More > Health.
- A real Stripe activation is required for Activated to increment.
- If the Health query falls back to traffic-only, check the PostHog HogQL query syntax around `properties.plan_name`.

---

## 2026-08-11 - Found HQ Health: Founder Funnel Clarity Pass

### Where We Left Off
Shawn QA'd Found HQ > More > Health live on iPhone. PostHog traffic was working: 13 visitors / 245 pageviews for 7d and 24 visitors / 292 pageviews for 30d. He clarified the admin is for him as Founder/operator, not clients, and he is fine with "funnel" language if the system teaches him what it means and how it helps revenue.

### What Changed
- Health header now describes the page as a founder dashboard for traffic, leads, uptime, errors, and the next funnel step that turns attention into revenue.
- Marketing renamed to **Marketing funnel**.
- Traffic row now explains that Found traffic is attention on `foundco.app`, and the next question is whether it turns into signups, plan picks, and paid activations.
- Added **Next money step: instrument the signup funnel**, defining funnel as the path from stranger to paying customer.
- Errors renamed to **System issues**.
- Added context that Sentry alerts include testing/deploy noise, but repeated/recent/payment/image/AI-credit issues get reviewed first.
- Sentry list now shows top five issues with simple badges (`Review`, `Watch`, `Likely noise`) instead of a full raw error wall on mobile.

### Verification
- `cmd /c npx tsc --noEmit` passed clean.
- `cmd /c npm run build` passed clean. Existing Next middleware deprecation warning remains.

### Test Next
- After deploy, Shawn should re-open Found HQ > More > Health on iPhone and confirm the wording teaches what the funnel means without feeling dumbed down.
- Continue FOUND Systems with full funnel instrumentation: onboarding start, onboarding completion, plan selection, checkout start, and activation.

---

## 2026-08-11 - FOUND Systems: PostHog Read Key + Health Traffic

### Where We Left Off
After Google/Bing/Clarity, Shawn moved to the PostHog Personal API Key step. He created a read-only key and added the required Vercel environment variables for Found HQ to read PostHog analytics server-side.

### What Changed
- Vercel env vars added by Shawn:
  - `POSTHOG_PERSONAL_API_KEY`
  - `POSTHOG_PROJECT_ID=535458`
  - `POSTHOG_HOST=https://us.posthog.com`
- Added `src/app/admin/health/posthog.ts`, a server-only PostHog query helper.
- Found HQ Health now shows PostHog pageviews and unique visitors for 7d/30d when env vars are present.
- The Marketing section no longer says traffic is unwired when PostHog responds.
- Conversion rate remains explicitly not instrumented yet because the app currently only sends `$pageview`; a future pass needs onboarding/plan/checkout/activation events.

### Verification
- `cmd /c npx tsc --noEmit` passed clean.
- First `cmd /c npm run build` failed on external Google Fonts fetch for Playfair, not code.
- Reran build with network access; `cmd /c npm run build` passed clean. Existing Next middleware deprecation warning remains.

### Test Next
- Deploy the PostHog Health code.
- Open Found HQ > More > Health.
- Confirm Marketing shows visitor/pageview numbers instead of the old blocked PostHog message.
- Continue FOUND Systems with full funnel instrumentation or tenant schema-markup scoping.

---

## 2026-08-11 - FOUND Systems: Google/Bing Done, Clarity Wired

### Where We Left Off
Shawn picked up the FOUND Systems checklist after Claude ran out of credit. Google Search Console and Bing Webmaster Tools were set up live with step-by-step guidance, then Microsoft Clarity was created.

### What Changed
- Google Search Console verified `foundco.app`.
- Google sitemap submitted successfully: `https://foundco.app/sitemap.xml`; Google discovered 30 pages.
- Bing Webmaster Tools imported/verified `foundco.app` from Google Search Console.
- Bing sitemap submitted: `https://foundco.app/sitemap.xml`; status is processing, which is normal for up to 48 hours.
- Microsoft Clarity project created for Found Co. Project ID: `y0u9dw7ln4`.
- Clarity tracking added to `src/app/layout.tsx`, gated to the root Found marketing site only via the same `x-found-root-site` logic used by Vercel Analytics and PostHog. It will not load on tenant sites, dashboard, or admin.

### Verification
- `cmd /c npx tsc --noEmit` passed clean.
- `cmd /c npm run build` passed clean. Existing Next middleware deprecation warning remains.

### Test Next
- Deploy the Clarity code.
- Visit `https://foundco.app` after deploy.
- In Microsoft Clarity, confirm the project starts receiving data. It may take a little time.
- Continue FOUND Systems with the PostHog Personal API Key read-scope step.

---

## 2026-08-10 - Real Bug: Silent Photo Loss From Concurrent Upload Path Collisions

### Where We Left Off
Shawn live-tested the upload fix from the entry below and reported the progress indicator itself worked ("1 of 3, 2 of 3") but only 1 photo actually landed afterward - also gave direct design feedback that the indicator was too easy to miss, and that it needs to work app-wide (any business's albums/folders, plus live camera capture), not just Jobs.

### Root Cause Found
Checked the live database directly instead of guessing - confirmed only 1 of 3 photos actually saved. The multipart photo-upload path (`/api/photos` route.ts) built its storage filename from `Date.now()` alone with no random component, unlike the signed-upload (video) path which already had one. Once uploads became concurrent - first from yesterday's nav-upload fix, then today's job-detail fix - two files landing in the same millisecond got an identical storage path; `upsert: false` made the second/third request fail outright, and the client silently swallowed the error. Also found and fixed the one other `upsert:false` upload path with the same bug class (menu item photos); left the two `upsert:true` logo uploads alone since a collision there just overwrites rather than silently drops data.

### What Changed (this bug)
- Added the same random-suffix pattern already used elsewhere to `photos/route.ts` and the menu-photo upload action.

### Team Round: Upload Status UX (2026-08-10)
Shawn's ask: something big, obvious, "right in my face," as the default for every upload surface including the camera - and explicitly not scoped to Jobs, since Found serves many business types with their own photo/folder systems. Team: Steve (trust - failures must be unambiguous), Jony (big but anchored in context, not a full-screen block), Craig (three real states: uploading/done/needs attention, since failures are now known to be real), Angela (never traps someone mid-task - dismissing never cancels the upload), Chris (one shared system across every entry point, not three separate ones).

### What Changed (design work)
- New `UploadStatusProvider.tsx` - a single context/hook mounted once at the dashboard layout level, so every dashboard page and business type gets the same banner automatically, and it persists across navigation.
- Replaced three separate local progress pills/toasts (nav FAB, job/album upload, and DashboardNav's upload toast messages) with this one shared banner.
- Wired into all three real upload entry points, including live camera capture (photo/video/annotated) in `CameraSheet.tsx` - not just library uploads.

### Verification
- `npx tsc --noEmit` and `npm run build` passed clean.
- **Shawn tested live 2026-08-10, all 3 confirmed:** uploading 3 photos to a Job shows the big banner with live progress and lands on a clean success state; taking a live camera photo shows the same banner ("business owners are gonna like that feature"); forcing a failure keeps the banner up with a clear message instead of disappearing. This closes out the shared upload-status banner work.

---

## 2026-08-10 - Real Bug: Job Photo Upload Was Single-File-Only + Mojibake Sweep (`79b8fee`)

### Where We Left Off
Shawn live-tested Jobs round 1 on his phone: the "Create" button on a new job showed garbled characters, and adding photos right after creating the job only let him pick one photo at a time (iOS opened a single-photo preview instead of a multi-select grid), and confirming that one selection silently did nothing - just returned to the Jobs list with no photo added.

### Root Cause Found
Two separate bugs. (1) The job-detail "Add photo -> Upload from Library" path in `photos/page.tsx` is a completely different, older upload entry point from the one fixed 2026-08-09 - that earlier fix only touched the global nav FAB's upload flow (`DashboardNav.tsx`). This input had no `multiple` attribute and `handleUpload` only ever read `e.target.files?.[0]`, dropping everything else - exactly what produces iOS's single-photo preview and a silent no-op on multi-select. (2) The "Create" button text was literal mojibake in the source (a mis-encoded ellipsis). Swept all of `src/` for the same corruption pattern and found 4 more real user-facing instances beyond the one Shawn hit.

### What Changed
- `photos/page.tsx`: `handleUpload` rewritten with the same bounded-concurrency pattern (`MAX_UPLOAD_BATCH`/`UPLOAD_CONCURRENCY`) already proven in the nav fix, plus a matching progress pill. File input now has `multiple`.
- 5 real mojibake instances fixed across `photos/page.tsx`, `DashboardNav.tsx`, `CameraSheet.tsx` (comment-only instances left alone - harmless, invisible to users).

### Verification
- `npx tsc --noEmit` and `npm run build` passed clean.
- Not yet re-tested live by Shawn (in progress as of this handoff).

### Test Next
- Create a new job, confirm "Create" renders clean text.
- Add several photos from Library right after creating a job, confirm the multi-select grid appears and all selected photos actually upload with visible progress.

---

## 2026-08-10 - Jobs Round 1: Job Notes, Photo Notes, Cover Photo Selector, Address Privacy Toggle (`52e3bfb`)

### Where We Left Off
Team-round prioritization of the 7 remaining Jobs-pipeline items: job-level notes was judged the real gap (a job with only photos isn't a job record), bundled with photo notes and a cover photo selector since all three live on the same job-detail screen and are low-risk CRUD. Granular worker permissions was deliberately excluded - flagged as needing its own dedicated security-reviewed cycle, not bundled with routine feature work.

### What Changed
- Migration 060: `photo_albums.notes`, `photo_albums.show_address_public` (default false), `company_photos.note`.
- Job notes editor, photo-note caption in the photo viewer, "Set as Cover" button (job photos only, replaces the Add-to-Site slot in that context).
- Closed a real pre-existing gap found along the way: `cover_photo_id` existed in the schema since migration 050 but was never read or written anywhere - three separate places (dashboard job list, the albums API's own cover computation, public Pro gallery list) were each independently guessing "most recent photo" instead. All three now prefer the owner's chosen cover.
- Address privacy toggle in Job Details, off by default - customer name still shows on the shared link as before (intentional, not part of the gap).

### Verification
- `npx tsc --noEmit` and `npm run build` passed clean.
- Live-tested immediately by Shawn - surfaced the two bugs documented in the entry above this one.

### Test Next
- See the 2026-08-10 upload-bug entry above (found during this feature's live test).
- Confirm cover photo selection shows correctly in both the dashboard Jobs list and the public gallery list.
- Confirm the address toggle correctly shows/hides the street address on the shared job link.

---

## 2026-08-09 - Real Billing Bug Found Live: Webhook Silently Reset Plan to Starter (`5fbc352`)

### Where We Left Off
Shawn was testing the billing-authorization fix (upgrade Starter -> Business on Taco Shop) and the app showed it still on Starter afterward, despite Stripe showing an active Found Business subscription since July 12. Got a new scoped Stripe **Restricted key** (separate from the production Secret key, permissions limited to Coupons/Promotion codes/Subscriptions/Customers/Invoices/Charges) to investigate with real data instead of guessing - stored locally as `STRIPE_RESTRICTED_KEY` in `.env.local` (gitignored), never wired into application code.

### Root Cause Found
`src/app/api/stripe/webhook/route.ts`'s `checkout.session.completed` handler hardcoded `plan: "found"` (Starter) on every new subscription, regardless of what was actually purchased. Stripe fires both `checkout.session.completed` and `customer.subscription.created` for a new subscription with no guaranteed order - the subscription-created handler correctly computes the real plan from the actual Stripe price, but if the checkout handler processed after it, it silently overwrote the correct plan back to Starter with zero error or log. Stripe kept billing the correct plan the whole time; only the app's own enforcement was wrong.

### What Changed
- `checkout.session.completed` no longer touches `plan` at all - only `stripe_customer_id`/`subscription_status`. `customer.subscription.created`/`updated` is now the sole source of truth for plan (which is what it was already doing correctly).
- Ran a full live audit across all 34 companies with a real `stripe_customer_id`: **9 matched correctly**, **2 confirmed real mismatches** (Taco Shop, Tacos - both corrected directly in the database to `found_business`, matching their real active Stripe subscriptions), **22 have a `stripe_customer_id` that doesn't exist in live Stripe at all** - almost certainly test-mode ids saved before live billing was fully wired up mid-July. That last group is a separate, likely pre-existing situation, not caused by this bug - flagged for its own follow-up, not yet investigated further.

### Verification
- `npx tsc --noEmit` and `npm run build` passed clean.
- Live audit numbers above came from real Stripe API calls, not assumptions.
- Not yet re-tested live by Shawn (the original failing scenario).

### Test Next
- Confirm Taco Shop's dashboard now correctly shows Found Business.
- Do a fresh real plan upgrade end to end on a test account and confirm the plan sticks correctly this time (no silent reset).
- Decide whether/when to investigate the 22 stripe_customer_id-not-found companies - do their subscriptions exist in Stripe test mode instead, and does that matter for any of them.

---

## 2026-08-09 - Security Audit: Billing-Action Authorization Gap + 3 Worker-Role Gaps (`00310a1`)

### Where We Left Off
Before building any more Jobs features, Shawn asked for a real security review of the worker-role feature - specifically "check securities for that extra person, everything is set up properly." Ran a dedicated audit agent (not a self-check) rather than just asserting it was fine.

### What The Audit Found
- **Most severe, not worker-specific - predates today's work entirely:** every billing action in `more/actions.ts` (buy an add-on, open the Stripe billing portal, change plans, `previewPlanUpgrade`/`confirmPlanUpgrade`) took a client-supplied `companyId` with **zero authorization check**. Any authenticated user could in principle act on a company that wasn't theirs just by knowing its id.
- **Three real worker-specific gaps** - routes that resolve a company but were missing the `requireOwnerAccess()` check every other owner-only route already has: `social-posts/route.ts` (marketing drafts), `company-slug/route.ts` PATCH (business name/tax rate) plus a minor GET info leak (billing-adjacent fields), `photos/download/route.ts` (bulk photo zip-export).
- **One minor leak:** `layout.tsx` sent lead/order/reservation counts and their latest-activity timestamps to every dashboard request regardless of role - a worker's browser received owner-only numbers even though they can never reach the Leads page.
- **Confirmed solid:** the actual worker-allowed surfaces (`/api/photos`, `/api/albums`) are correctly tenant-scoped with no cross-company leak. No way for a worker to escalate to owner. Revoked members lose access everywhere immediately. Team invite/revoke correctly blocks non-owners.

### What Changed
- New `requireCompanyOwner(companyId)` helper in `more/actions.ts`, guards all 6 billing entry points.
- `requireOwnerAccess()` added to `social-posts` (all 3 methods), `company-slug` PATCH, `photos/download` POST.
- `company-slug` GET strips billing-adjacent fields for non-owners instead of blocking the whole route (Photos, a worker-accessible page, needs the plain slug/industry data from this same endpoint).
- `layout.tsx` skips the lead-count query entirely for non-owners.

### Verification
- `npx tsc --noEmit` and `npm run build` passed clean.
- Not yet tested live by Shawn.

### Test Next
- Confirm owner billing flows (buy add-on, upgrade plan, open billing portal) still work normally.
- Confirm a worker account still gets `[]`/blocked responses from the four fixed routes.
- Confirm Photos page still works correctly for a worker (uses `company-slug` GET for slug/industry/isPro).

---

## 2026-08-09 - iOS Native-Picker Delay: Preparing Signal + Shoot-First Redesign (3 commits)

### Where We Left Off
Shawn live-tested the upload progress work and found it insufficient: a single 5-second video from Photos library still gave 4-6 seconds of total silence after tapping the native picker's checkmark, with the ability to still tap/deselect the thumbnail during that wait - "sitting on an iOS screen thinking it didn't work." Root-caused properly this time before building anything: this is iOS itself preparing the file (HEIC conversion, iCloud download if not on-device) entirely inside its own native picker UI, before the page's change event fires and before any Found code runs at all. Confirmed this also happens picking 3+ plain photos, not just video - same mechanism, just more visible at scale.

### What Changed
1. **"Preparing..." signal** (`12e77ad`) - new `triggerNativePicker()` wraps both native-picker entry points (library upload, camera-capture fallback) with a one-time `window.focus` listener. iOS fires focus on the page the moment its native sheet dismisses, landing before the file data itself arrives - used as an early, honest "something is happening" signal, replaced by the real upload-progress pill once file data actually arrives. Heuristic, not a fix for the underlying OS delay - a 15s safety-net timeout clears it if the user cancels instead of picking.
2. **Shoot made primary, Upload secondary** (`e2bb603`) - the real lever, per a second team round: "Shoot" (live in-app capture via `getUserMedia`/`MediaRecorder`) never touches Apple's Photos library or iCloud at all - confirmed by reading `CameraSheet.tsx` - so it structurally cannot hit this delay, unlike Upload-from-Library which always will. Shoot is now full-width/primary in the camera sheet; Upload from Library is now a smaller secondary action with a one-time expectation-setting line ("...can take a few seconds to prepare... that's your phone, not Found").

### Verification
- `npx tsc --noEmit` and `npm run build` passed clean after all 3 commits this thread.
- Not yet tested live by Shawn.

### Test Next
- Confirm the "Preparing..." pill appears the instant you return to the app after tapping the native picker's checkmark (before the real upload-progress pill takes over).
- Confirm the camera sheet now shows Shoot as the clear primary action with Upload from Library smaller/secondary underneath, plus the heads-up line.
- Retest the original complaint: pick 3+ photos or a video via Upload from Library, see if the wait feels less like "broken" now that something is visible immediately.

### Also raised, not yet actioned
Shawn wants paid ads live nationwide this week and asked about iOS App Store + Google Play timelines. Team's honest read (not yet a decision, pending Shawn's direction): Google Play (PWA wrapped as a Trusted Web Activity) is realistically achievable this week; Apple App Store is not - needs a D-U-N-S number for business enrollment (can take weeks on its own, should start immediately regardless of anything else) plus real native functionality to survive Apple's "Minimum Functionality" review guideline, which a bare PWA wrapper commonly fails. Recommendation: don't block this week's ad launch on either app store - drive ads to the web/PWA experience (already live, already has Add to Home Screen), pursue Google Play in parallel, scope Apple as its own real project.

---

## 2026-08-09 - Upload Speed/Limits + Estimate<->Job Reverse Link (2 commits)

### Where We Left Off
Picked up the two "ready to build" items from the earlier team-approved backlog.

### What Changed
1. **Upload speed/limits** (`2129c61`) - `DashboardNav.tsx`'s `handleNavUpload` (the shared multi-file upload path for both Photos and Jobs) now has a 12-file soft cap per batch (trims and tells the owner to add the rest in a second batch, since native pickers can't enforce a cap at selection time), bounded concurrency (3 uploads at once, replacing strict one-at-a-time), and a real "Uploading X of Y" progress pill - the `uploading` boolean existed before but was never actually rendered anywhere, so multi-file uploads had zero visible feedback until the end-of-batch toast. Client-side video compression is still out of scope for this pass (team-approved deferral).
2. **Estimate <-> Job reverse link** (`e42e62b`) - migration 059 (run live) added `estimates.job_id` referencing `photo_albums(id)`. New estimate builder now has "Link to a Job" in the existing Job step (pick existing or create new, pre-filled from what's already typed). Existing estimates (DetailSheet) show "Attach to a Job" if unlinked, or a tap-through card to the Job's photos if linked. Both reuse the existing `/api/albums` endpoint rather than new API surface.

### Verification
- `npx tsc --noEmit` and `npm run build` passed clean after both commits.
- Not yet tested live by Shawn.

### Test Next
- Select 15+ photos/videos at once in Jobs or Photos, confirm only 12 upload and a "add the rest in a second batch" message shows, confirm the "Uploading X of Y" pill is visible and counts up.
- Create a new estimate, use "Link to a Job" to create a new Job on the spot, confirm it's pre-filled with the customer info already typed.
- Open an existing unlinked estimate, use "Attach to a Job," confirm both picking an existing Job and creating a new one work, and the linked state persists after closing/reopening.

---

## 2026-08-09 - Fix: Uneven Gallery Grid From Non-Square Video Tiles (`f991b7f`)

Shawn reported the gallery grid looked "ugly"/unbalanced after the video fix - gaps under landscape video tiles. Root cause: `globals.css` already has a deliberate rule (with its own explanatory comment) forcing every gallery tile to a uniform 1:1 square crop, specifically because the team had already hit and fixed this exact uneven-grid problem once before for photos of different orientations. That CSS only ever targeted `<img>` - the `<video>` added for gallery videos never got the same treatment, so it rendered at its natural (usually landscape) shape and left a gap. Fixed `GridVideoTile` in `GalleryLightbox.tsx` to get the identical square/cover treatment (matches `AlbumPhotoGrid.tsx`'s video tile, which was already built correctly and never had this bug). Also extended the CSS selector itself (`.masonry-item img, .masonry-item video`) so this can't silently break again. `npx tsc --noEmit` and `npm run build` passed clean.

**Test next:** confirm the HVAC gallery grid looks uniform now - no gaps under the video tile, all tiles the same square shape.

---

## 2026-08-09 - Regression Fix: Gallery Showed Zero Photos (`8de2548`)

Shawn caught this live within minutes of the blank-video fix shipping: the HVAC test account's `/gallery` page went from "video shows blank" to "nothing shows at all - Check back soon," despite having 11 real gallery photos. Root cause: `company_photos` has no `mime_type` column at all (confirmed directly against the live schema) - it's never been a real persisted field, only something the upload API echoes back in its own POST response right after a video upload. The blank-video fix below had added `mime_type` to four `.select()` calls assuming it was real; selecting a nonexistent column makes Postgres reject the whole query, so all four silently returned zero rows. Fixed by removing `mime_type` from every select - `isVideoMedia()` still works correctly from the URL's file extension alone, which is how video detection actually works everywhere else in this codebase already. Verified directly against the live DB (11 real rows for the Hvac company) before pushing the fix. `npx tsc --noEmit` and `npm run build` passed clean.

**Test next:** confirm the HVAC test account's `/gallery` page shows all 11 photos again, including the video playing correctly.

---

## 2026-08-09 - Blank Videos on Public Gallery + Job Pages (2 commits)

### Where We Left Off
Shawn made a new HVAC test account, uploaded short videos, added them to the public Gallery (the four-square icon, `in_gallery`) - and the public site showed a blank tile where the video should be. Traced it directly: video uploads were clearly added to the product after the public-facing gallery pages were built, and none of them ever got updated to handle video. Found and fixed three separate occurrences of the identical root cause.

### What Changed
- `GalleryLightbox.tsx` + `[slug]/gallery/page.tsx` (`091a0fb`) - the main public gallery page (both plan tiers) rendered every item as a plain `<img>`. Now uses the same `isVideoMedia()` helper the dashboard Photos page already relies on to show a muted autoplay video tile in the grid and real `<video controls>` in the fullscreen lightbox. Also guarded the CTA background image and album-cover-photo picks to skip video URLs (both are always-static slots).
- `AlbumPhotoGrid.tsx` + `[slug]/gallery/[album]/page.tsx` (`68c66d1`) - the shared Job public page (what every "Ask about this job" lead links back to) had the exact same bug, fixed the same way. This one matters more - Jobs' whole value prop is the shareable client gallery.
- `[slug]/gallery/[album]/opengraph-image.tsx` (`68c66d1`) - found a third occurrence while in this code: the OG/social-preview image generator for shared job links picked whatever photo was uploaded first with zero video filtering. `next/og` can't render a video at all, so a video as someone's first upload would have silently broken the entire iMessage/Facebook link preview. Now skips forward to the first real still photo.

### Verification
- `npx tsc --noEmit` and `npm run build` passed clean after both commits.
- Not yet tested live by Shawn.

### Test Next
- On the HVAC test account, confirm the video that showed blank on `/gallery` now plays (grid thumbnail autoplays muted, tapping opens it with real controls).
- Same check on a Job's shared public page (`/gallery/[job-slug]`).
- Share a job link that has a video as its first photo to iMessage/Messenger and confirm the preview image isn't broken.

### Also flagged, not yet built
- Upload speed/limit: no cap on files-per-batch, uploads run strictly sequential (not parallel), video gets zero client-side compression before upload. Team-scoped fix (12-file soft cap, 3-way concurrency, real "Uploading X of Y" progress) - approved shape, not yet implemented. Applies to both Photos and Jobs since they share the same upload path.

---

## 2026-08-09 - Live QA Follow-Up: 3 Real Bugs + Nav/Settings Restructure (7 commits)

### Where We Left Off
Shawn live-tested the worker-roles feature end to end on Barrio Builders (invited `supershawn@email.com` as a worker) and found 3 real issues, plus used the Team-placement discussion to drive a larger, deliberate nav restructure. Team-approved throughout, pushed after each step per Shawn's explicit direction.

### Bugs found live-testing, all fixed
1. **Admin View As silently bypassed the worker restriction** (`f27c25d`) - real access-control gap, not the reported "confusion." `admin_key`/`found_admin_view`/`found_admin_company_id` are httpOnly cookies set by the "View As" support tool, completely separate from the Supabase Auth session - `SignOutButton` never cleared them. A stale View As session from earlier admin use silently granted full owner access to a worker-restricted account. New `src/lib/auth/clientSignOut.ts` (`performSignOut()`) is now the one place sign-out logic lives, used by both `SignOutButton` and the new `AccountMenu`.
2. **"Deposit paid $X" shown when no payment was taken** (`08697ef`) - traced to `AcceptButton.tsx`: when a business has no Stripe Connect, `handleSimpleAccept()` never sends a payment claim to the server at all (server correctly left `payment_status` untouched - the database was never wrong), but the client success card showed the same "Deposit paid" copy regardless. Now gated on `hasStripe`.
3. **Same email owning one business + working another showed every account identically** (`36b005b`) - `CompanyPicker.tsx` now shows an amber "Team member" badge and "Camera & job photos only" for worker-only access, and `/select`'s header copy adjusts when any entry is worker-only.

### Nav/Settings restructure (Shawn's direction, Jony leading UI/UX)
Real problem surfaced through the "where should Team live" discussion: More had ~700 lines doing double duty as page-navigation AND account/billing/settings. Team round pushed back hard before building (Chris/Marcus flagged top-right corner nav is bad phone ergonomics and against category norms like CompanyCam; Steve named the scope creep directly) before landing on the final shape:
- **More (bottom dock tab)** is now purely the grouped page-navigation list (`DashboardPages`), untouched otherwise.
- **New top-right `AccountMenu`** (`bca8f20`) - circular avatar (company initial on the company's own `primary_color`), always visible for owners, opens an anchored popover reusing the exact Photos-filter interaction pattern. Rows: Switch Business (if `hasMultiple`) → Team → Business Info → Billing & Plan → Sign Out.
- **New `/billing`** (`0e79420`) - Plan card, all 3 upgrade banners, add-ons panel, payment setup, Manage billing portal - moved verbatim from More. All Stripe/addon/upgrade redirect targets updated from `/more` to `/billing` (`entitlements.ts`, `more/actions.ts`, `payments/connect/route.ts` incl. `refresh_url`, `PaymentSetupButton`'s default, the Photos/Leads upgrade CTAs, a reservation-reminder email nudge).
- **New `/business-info`** (`0e79420`) - signed-in-as, change password, install prompt, get help. Retired `BusinessNameEditor` (deleted) rather than rebuild - it PATCHed the exact same `companies.name` field Site Editor's Contact Info tile already edits; Business Info links to `/site` for that instead of hosting a third copy.
- **`toolPolicy.ts`** gained a `site` tool (Edit My Site) - it had no entry point at all except the one card in More, closed as a real gap while stripping More down.
- **Team tile removed from Site Editor's Site-wide section** - the original bug this whole thread started from.

### Verification
- `npx tsc --noEmit` and `npm run build` passed clean after every one of the 7 commits.
- `git diff --check` passed each time (line-ending warnings only).
- Not yet tested live by Shawn.

### Test Next
- Confirm admin View As on a real customer account has full access again (the actual regression fix - retest the exact scenario that broke).
- Confirm the estimate-accept page on a no-Stripe-Connect business no longer claims a payment was taken.
- Confirm `/select` shows the amber "Team member" badge correctly for worker-only access.
- Tap the new top-right avatar icon: confirm Switch Business (if applicable), Team, Business Info, Billing & Plan, and Sign Out all work and land in the right place.
- Confirm More (bottom tab) now shows only page navigation, no plan/billing/account content.
- Confirm `/billing` shows the plan card, addons, and upgrade banners correctly, and that addon purchase / plan upgrade / payment setup flows still redirect back to `/billing` correctly (not a 404 on `/more`).
- Confirm `/business-info` shows signed-in-as, change password, install, and get help, and that "Logo, name & contact info" correctly opens Site Editor.

---

## 2026-08-09 - Worker Roles/Permissions (4 commits)

### Where We Left Off
- Team round (Steve leading, Craig/Priya/Angela/Marcus/Chris weighing in) picked worker roles/permissions as the top priority off the Jobs/service-industry pipeline - an HVAC-style company needs techs in the field who can capture job photos without seeing leads, contacts, estimates, or being able to edit/publish the website. Shawn approved the team's plan and asked it be built end to end, pushing after each step.
- Confirmed before building: zero multi-user-per-company concept existed anywhere in the codebase (one Supabase Auth login = one company, via `companies.user_id`/`email`). RLS is a no-op on every tenant table (`using(true)`) - real authorization has always lived in application code. The Found Business plan page already promises this exact feature in marketing copy; this was unbuilt until now.

### What Changed
1. **Schema + resolver** (`208e879`): new `company_members` table (migration 058, run live - script stays local/gitignored like all `scripts/*.mjs`, same convention as migration 057 etc.). `getCompany`/`getAllCompanies`/`hasMultipleCompanies` extended to resolve worker access alongside owner access. New `getCompanyRole()`/`requireOwnerAccess()` - the real app-level permission boundary, following the same pattern as the existing `requireScheduleAccess` (RLS can't be trusted here, per the earlier admin-View-As schedule bug).
2. **Server-action enforcement** (`4f2b721`): `requireOwnerAccess()` wired into every sensitive surface - Leads/Contacts/People (CRM, templates, email history), Estimates + Schedule/Booking (via the shared `requireDashboardAddonAccess`/`Page`/`requireDashboardFeaturePage` choke points in `entitlements.ts`), Site editing/publishing (`site/actions.ts`'s `getContext()`, which also covers photo placement to hero/about/gallery), Marketing, Payments Connect, Locations, Rate Sheet, Menu/Products, and the dashboard home page itself (was pulling raw lead PII - a worker's first screen after login could not be left unguarded).
3. **Invite flow** (`4958249`): new owner-facing `/team` page (linked from Edit Website > Site-wide). Reuses the existing magic-link login infra - `generateLink` creates/reuses the worker's Supabase Auth user, inserts `company_members` (role: worker, status: active), emails a one-tap link straight to camera. Owner can remove access any time (status: revoked). Also caught and fixed a gap while wiring this: `site/page.tsx` itself wasn't gated yet even though its save actions were.
4. **Nav/UX + a real regression catch** (`206cbce`): `DashboardNav` now takes a `role` prop from `layout.tsx` (via `getCompanyRole`). Workers see exactly two tabs - Photos and a stripped-down More screen (company name + Sign Out only - without this a worker would have had no way to sign out at all). Separately: found and fixed that `getCompanyRole()` didn't account for Found admin's "View As" override, which already bypasses ownership in `getCompany()` - without the fix, every `requireOwnerAccess()` check from step 2 would have wrongly treated an admin support/demo session as a restricted worker. Fixed at the source so it's corrected everywhere at once.

### Verification
- `npx tsc --noEmit` and `npm run build` passed clean after every one of the 4 commits.
- `git diff --check` passed each time (line-ending warnings only, pre-existing repo convention).
- Not yet tested live by Shawn.

### Test Next
- Owner: go to Edit Website > Team, invite a real email address, confirm the invite email arrives and the magic link works.
- Confirm a freshly invited worker lands on Photos (not Home), sees only Photos + More in the nav, and More shows just company name + Sign Out.
- Confirm a worker cannot reach `/leads`, `/contacts`, `/people`, `/estimates`, `/site`, `/marketing`, `/locations`, `/menu`, `/products`, `/schedule`, `/team` directly by URL (should redirect to `/photos` or show empty data).
- Confirm a worker CAN capture/upload photos and create/view Jobs.
- Important: confirm Found admin "View As" on a real customer account still has full owner access (leads, estimates, site editing) - this is the regression step 4 fixed, worth a direct re-check.
- Owner: confirm "Remove" on the Team page actually revokes access (worker gets redirected/blocked on next load).

---

## 2026-08-09 - Job Leads Connected to Estimate Builder

### Where We Left Off
- Codex follow-up to the shared job/photo-page lead capture work: leads created from a shared job/project page landed in the dashboard, but did not show a clear `Create Estimate` action outside the estimate-only inbox, and starting an estimate from one meant re-typing the customer's info and work description by hand.

### What Changed
- Job/shared-work leads now show `Create Estimate` when they land in the dashboard, even outside the estimate-only inbox view.
- Starting an estimate from one of these leads now pre-fills customer info, and uses the job/project title first for the work description when available.

### Verification
- `npm run build` passed.
- `git diff --check` passed.
- Shawn tested live: tapped `Create Estimate` on a lead created from a shared job page, confirmed the estimate screen opened with customer info filled in and the work description started from the job title/context.

### Process Note
- Codex ran out of credits immediately after this shipped, before the doc trio (`SESSION_HANDOFF.md`/`TASKS.md`/`CHANGELOG.md`) could be updated - commit `0cfd503` on `main`, code-only, no doc changes. Backfilled here from Shawn's session summary plus his live pass/fail confirmation.

---

## 2026-08-08 - Photos Filter Native Panel and Header Fix

- Shawn approved the team direction to make the Photos filter feel closer to iOS/iMessage/Codex system panels and fix the first-load clipping.
- Active filters now replace the first tab label/count (`Favorites 3` or `Not on site 4`) instead of expanding the filter button.
- The filter button is square again and only indicates active state through color.
- The filter menu is now a larger, softer translucent panel with more breathing room, left-side icons, larger rows, and count/check affordances on the right.
- The sticky tabs now paint a solid black cover above the tab row to prevent the Photos title/action row from half-showing through during load or scroll.
- Verification: `git diff --check` passed and `cmd /c npm run build` passed. Existing warning only: Next.js middleware convention deprecation.

---

## 2026-08-08 - Photos Filter Popover and Sticky Bar Polish

- Shawn approved the team direction to make the Photos filter feel like an iOS-style anchored menu instead of a bottom sheet.
- The filter control now expands near the top-right filter button, opening down and left from the control area.
- Active filtered states now show directly inside the filter button (`Favs` or `Off-site` plus count), so owners can tell which filter is active without extra page copy.
- The sticky Photos tab bar now uses a solid black background with an upward black paint extension and no bottom gradient, preventing scrolled content from showing through the gap.
- Verification: `git diff --check` passed and `cmd /c npm run build` passed. Existing warning only: Next.js middleware convention deprecation.

---

## 2026-08-08 - Photos Filter Visual Polish

- Shawn approved the team direction to keep filtered Photos views visually identical to the normal gallery grid.
- Removed the `Showing favorites photos` / `Showing not on site photos` status line under the tabs.
- Removed the extra Favorite photos explainer card so filtered views start cleanly at `THIS WEEK`.
- The active green filter icon remains the only visual cue that a filter is applied.
- Verification: `git diff --check` passed and `cmd /c npm run build` passed. Existing warning only: Next.js middleware convention deprecation.

---

## 2026-08-08 - Photos Filter Sheet Refinement

- Shawn approved the team/Jony direction to remove the visible filter chips under Photos and use a cleaner iOS Photos-style filter control.
- Photos tabs now stay focused on `All Photos`, `Gallery`, and `Albums`.
- The old visible `All / Favorites / Not on site` chip row is now behind a compact descending-lines filter icon to the right of the tabs.
- Tapping the filter icon opens a bottom sheet with `All`, `Favorites`, and `Not on site`, each with plain-language descriptions and counts.
- The filter control is only active on `All Photos`; switching to `Gallery` or `Albums` resets back to all photos.
- Verification: `git diff --check` passed and `cmd /c npm run build` passed. Existing warning only: Next.js middleware convention deprecation.

---

## 2026-08-08 - Photos IA Cleanup: Favorites and Albums

- Shawn corrected the previous photo direction: the website photo flow already works, and the priority is reorganizing the Photos page so it feels premium and owner-friendly.
- Team/Jony direction: remove the broken Social promise from the Photos page, keep the star as `Favorites`, remove `Unsorted`, and make Albums the owner-facing folder/share concept.
- Photos page tabs are now `All Photos`, `On Website`, `Favorites`, and `Albums`.
- `All Photos` shows every uploaded/taken photo. `On Website` now includes both hearted gallery photos and photos placed into website sections (`website_section` or `in_gallery`). `Favorites` uses the existing `for_social` storage field for now but no longer exposes Social language.
- The old Social Assistant workspace and social-post sheet are removed from the active Photos page UI/bundle. The underlying `/dashboard/api/social-posts` route and database field still exist for a future deliberate rebuild.
- Albums language is now fixed to Albums on the Photos page instead of industry-specific Projects/Collections labels.
- Empty states now use plain owner language: take your first photo, no website photos yet, star your best photos, create an album.
- Verification: `git diff --check` passed and `cmd /c npm run build` passed. Existing warning only: Next.js middleware convention deprecation.
- Pending next phase: add `Add to product` / `Add to menu item` from the photo action flow for retail, shopping cart, and restaurant businesses.

---

## 2026-08-08 - Email Signup Modal and Subscribe Fix

- Shawn QA confirmed public signup entry points are correctly gated: email-marketing sites show them, non-email-marketing sites do not.
- New issue from Lucky screenshots: `/subscribe` looked visually broken on mobile, the sticky public CTA crowded the form, and saving a signup could fail with `Could not save this signup.`
- Team decision: homepage `Join the List` should open a premium modal; `/subscribe` remains for QR codes, shared links, and footer/direct traffic.
- API fix: `/api/subscribe` no longer relies on a fragile Supabase `upsert` conflict target. It now finds an existing contact by company/email and updates it, otherwise inserts a new contact.
- UX fix: public sticky CTA bar now hides on `/subscribe` and `/unsubscribe`.
- Visual fix: standalone `/subscribe` page spacing was loosened so the perks card no longer tucks under the hero.
- Verification: `git diff --check` passed and `cmd /c npm run build` passed. Existing warning only: Next.js middleware convention deprecation.

---

## 2026-08-08 - Public Email Signup Entry Points

- Shawn verified Lucky's subscriber flow works, then flagged the real UX issue: public guest websites did not give customers an obvious place to join the list.
- Team direction: make signup discoverable on public sites without creating template-specific one-offs.
- Public homepages now show a shared `Stay in the loop.` signup section near the bottom only when the effective `email_marketing` add-on is active.
- Public footers now add a `Join our list` quick link only when the effective `email_marketing` add-on is active.
- Dashboard Marketing copy now tells owners: customers can join from the website or through the QR/link share flow.
- Verification: `git diff --check` passed and `cmd /c npm run build` passed. Existing warning only: Next.js middleware convention deprecation.
- Pending QA: confirm a site with email marketing active shows the homepage signup section and footer link, and a site without email marketing does not.

---

## 2026-08-08 - Marketing Subscriber Count Fix

- Shawn signed up through Lucky's public subscribe link and saw success, but the Marketing compose audience still showed `0`.
- Root cause: Lucky's existing opted-in contact had `email_subscribed = true` but `source = "website"`. Marketing was incorrectly requiring `source = "subscribe_page"` in addition to the real opt-in flag.
- Team fix: Marketing page and send API now count/send to contacts with `email_subscribed = true` and an email address, regardless of original source.
- Subscribe API now checks Supabase insert/upsert errors and returns a real error instead of showing success if a signup fails to save.
- Live data verification: Lucky currently resolves to `1` email subscriber with the corrected query.
- Verification: `git diff --check` passed and `cmd /c npm run build` passed. Existing warning only: Next.js middleware convention deprecation.

---

## 2026-08-08 - Security Hardening Sprint 2

- Lucky public form smoke test passed after Sprint 1, confirming real customer submissions still work.
- Team follow-up: inspect public API/webhook entry points for service-role access, external API cost abuse, and missing owner checks.
- Public `/api/marketing/send` no longer contains unauthenticated service-role email-sending logic. It now routes through the dashboard marketing sender, which requires dashboard access and the `email_marketing` add-on.
- `/api/stock-photo` now requires a logged-in dashboard user, verifies the requested company belongs to that user, and has request throttling before calling Pexels or updating `website_config`.
- Public `/api/places` now has request throttling plus query length and lat/lng validation before calling Google Places/Geocoding.
- Dashboard Places autocomplete now has request throttling and the shared `PlacesInput` component points to `/dashboard/api/places-autocomplete`, the secured route that already requires a logged-in dashboard user.
- Cron routes were reviewed and already require `CRON_SECRET`. Stripe webhook already verifies the Stripe signature.
- Verification: `git diff --check` passed and `cmd /c npm run build` passed. Existing warning only: Next.js middleware convention deprecation.

---

## 2026-08-08 - Security Hardening Sprint 1

- Team direction: keep Found secure at every public entry point without making real customers fight a CAPTCHA unless the current lightweight protections prove insufficient.
- Public contact, estimate, and reservation forms now send a hidden form-loaded timestamp. The shared spam guard treats impossible instant submissions as bot-like behavior when combined with other spam signals.
- Password login now has IP-level throttling in addition to the existing per-email throttling.
- Magic-link login now has IP-level throttling in addition to the existing per-email throttling.
- Public QR image endpoints now have request throttling and reject oversized QR payloads.
- Admin login cookie now explicitly uses `sameSite: "lax"` and an 8-hour lifetime, matching the safer admin support-view session window.
- Security posture notes: code-level protections are shipped; platform settings still need owner-side verification in GitHub/Vercel/Cloudflare where applicable, especially push protection/secret scanning, Vercel deployment protection, and optional Turnstile if spam pressure continues.
- Verification: `git diff --check` passed and `cmd /c npm run build` passed. Existing warning only: Next.js middleware convention deprecation.

---

## 2026-08-08 - Lead Spam Protection and RC Bicycles Cleanup

- Shawn paused template work to focus on Ryan / RC Bicycles spam leads. Team direction: keep the inbox useful without deleting anything risky.
- Public contact, estimate, and reservation forms now include a hidden `website` field. Bots that fill it are silently accepted but saved as spam.
- New shared spam guard lives at `src/lib/security/spamGuard.ts`. It checks honeypots, known spam/sales domains, marketing pitch language, links, words in phone fields, and mostly-phone messages.
- Obvious spam submissions are saved with `status = "spam"` and `partial_answers.spam_check`, but they do not trigger owner emails, customer auto-replies, or contact auto-save.
- Dashboard inbox hides spam from normal open/search/done work and shows a collapsed `Spam hidden` recovery section. Owners can mark a normal lead as spam or restore a spam lead with `Not spam`.
- Dashboard home counts, navigation badges, and the People/Customers list now exclude spam so junk does not look like business activity.
- Live cleanup completed for RC Bicycles: 10 obvious spam leads were marked `spam`; Shawn Lopez test lead stayed `open`.
- Verification: `git diff --check` passed and `npm run build` passed. Existing warning only: Next.js middleware convention deprecation.

---

## 2026-08-08 - Edit Website Dynamic Pages and Wrapper Consistency

- Shawn approved the team direction to verify that edit sections use the same connected wrapper pattern as Homepage and to hide inactive pages from the Edit Website page switcher.
- Team fix: the Edit Website page dropdown and hub no longer show `Shop` just because a company is retail or makers/crafts. `Shop` only appears when the effective `shopping_cart` add-on is active. Food businesses still show `Menu`.
- Retail/makers businesses without shopping cart now see the normal services route labeled `Products & Services` in Edit Website, which better matches owner language without implying checkout is enabled.
- About, Contact, and Services/Products & Services now wrap their preview and edit controls in one connected card, matching the Homepage/Featured Update pattern.
- Gallery and Menu/Product manager pages intentionally remain tool-style flows; they are not simple public-section edit cards.
- Verification: `git diff --check`, `npx tsc --noEmit`, and `npm run build` passed. Existing warning only: Next.js middleware convention deprecation.

---

## 2026-08-07 - Featured Update Button Grouping Polish

- Shawn approved the action/words split but wanted both pieces visually grouped so owners understand they belong together.
- Team fix: `Button words` now lives inside the same wrapped `Button action` card.
- Helper copy changed from "This is what customers see on the button" to the clearer owner instruction: "Change what customers see on the button."
- Verification: `git diff --check`, `npx tsc --noEmit`, and `npm run build` passed. Existing warning only: Next.js middleware convention deprecation.

---

## 2026-08-07 - Featured Update Button Action vs Button Words

- Shawn found the remaining UX issue: choosing `Call Us` or `Contact` changed the action, but the visible button could still say `See our services`, and `Other page` opened raw technical values like `tel:` or `/services`.
- Team fix: Featured Update now separates `Button action` from `Button words`.
- Selecting an action now saves both the destination and the visible words together, so `Call Us` becomes a call action with `Call Us` button text.
- `Other page` now opens a plain page picker (`Home`, `About`, services/products page, booking, `Gallery`, `Contact`) instead of exposing raw URLs.
- Verification: `git diff --check`, `npx tsc --noEmit`, and `npm run build` passed. Existing warning only: Next.js middleware convention deprecation.

---

## 2026-08-07 - Featured Update Destinations Use Real Active Site Paths

- Shawn found Ryan's Featured Update button options still exposed `Shop` and `Products` together, selected both because they shared `/shop`, and showed "Opens Shop page" even though Ryan does not have the shopping-cart add-on active.
- Team fix: Featured Update button destinations now come from the same active-add-on CTA resolver as Main Website Button, then dedupe by real destination. Disabled shop/order paths are not offered.
- Public Featured Update links now guard stale saved paths too: if an old `/shop`, `/order`, `/menu`, or `/services` value is no longer valid for the business setup, it falls back to the real content destination customers can actually open.
- Banner Style now offers only `Light`, `Dark`, `Accent`, and `Photo`. Existing saved `default` values visually map to `Dark` until changed.
- Verification: `git diff --check`, `npx tsc --noEmit`, and `npm run build` passed. Existing warning only: Next.js middleware convention deprecation.

---

## 2026-08-07 - Featured Update Button and Banner Wording Polish

- Shawn's QA screenshot showed the Featured Update Button destination chips overflowing off-screen, "Goes to: /services" using technical URL language, and "Look / Default" not reading like owner language.
- Team fix: destination choices now wrap in a two-column grid, custom URL is labeled "Other page", the destination summary says "Opens Services page" style language, and `Look` is now `Banner style`.
- The underlying `default` style remains supported but displays to owners as `Clean`.
- Verification: `git diff --check`, `npx tsc --noEmit`, and `npm run build` passed. Existing warning only: Next.js middleware convention deprecation.

---

## 2026-08-07 - Featured Update Wrapped Like Homepage

### Where We Left Off
- Shawn compared screenshots of the Homepage First Impression editor and Featured Update editor. First Impression felt right because the live preview, headline row, supporting line row, and AI row all lived inside one wrapper.
- Featured Update still felt separate because the preview, Headline, Supporting line, Button, and Look controls were loose stacked cards. The "Photo off in this look" pill also overlapped the camera button and looked tappable.
- Team direction: make Featured Update share the First Impression pattern. One parent editing surface, preview at top, controls inside the same wrapper. Convert the photo-off pill into passive helper text.

### What Changed
- Featured Update now has one outer wrapped editing surface around preview, Headline, Supporting line, Button, and Look.
- Removed the clickable-looking "Photo off in this look" pill.
- Added plain helper text under non-image previews: photo is saved for the update, but this look does not show photos; choose Image to use it.
- Kept the camera button clear and separate from helper text.

### Verification
- `git diff --check` passed.
- `npx tsc --noEmit` passed.
- `npm run build` passed. Existing warning only: Next.js middleware convention deprecation.

### Test Next
- Shawn: open Ryan > Edit Website > Home > Featured Update. Confirm it now feels like one wrapped editor, like the Homepage card.
- Confirm the photo helper no longer hides behind the camera or looks clickable.
- Confirm the live preview button still looks like part of the public section.

---

## 2026-08-07 - Home Featured Update Editor Matches Live Preview

### Where We Left Off
- Shawn reviewed the improved Ryan Home editor and approved the team direction, but the Featured Update still felt less intuitive than First Impression.
- Main issue: the editor showed the rhino photo even when the selected update look was `Default`, which made the owner think that image was live. Controls were also split across "Edit message", "Button text", "Style", and "Button goes to" instead of reading like one website section.
- Team decision: make Featured Update follow the same mental model as First Impression: one live-feeling preview, plain labels, button text and destination together. Also add a small Services Preview reference so owners see that homepage services come from the Services page.

### What Changed
- Featured Update preview now changes based on the selected look. `Image` shows the photo with text over it; non-image looks show the written update and mark any uploaded photo as "Photo off in this look."
- Renamed the editor labels to owner language: `Headline`, `Supporting line`, `Button`, and `Look`.
- Combined button wording and destination into one Button control with "Goes to:" shown directly under the button text.
- Replaced `Style` with `Look` and added helper text: "Choose how this update appears on your homepage."
- Services Preview now shows up to three current services/products from the Services page, plus the existing `Edit services` action.
- Footer Call to Action was intentionally left alone.

### Verification
- `git diff --check` passed.
- `npx tsc --noEmit` passed.
- `npm run build` passed. Existing warning only: Next.js middleware convention deprecation.

### Test Next
- Shawn: on Ryan, open Edit Website > Home > Featured Update. Confirm the preview feels like the public section, the labels are plain, and changing Look to Image is the only time the uploaded photo appears as live.
- Confirm the Button area shows both the button words and where it goes.
- Confirm Services Preview shows examples from Ryan's Services page and `Edit services` still jumps to Services.

---

## 2026-08-07 - Home Main Website Button Truthful Labels

### Where We Left Off
- Shawn tested Ryan's retail/bike-shop account side by side with the public site. The Home editor's Main Website Button showed "Shop Now", but the live button resolved to "Our Products" and sent customers to the Services page because Ryan does not currently have an active shopping-cart path.
- Team decision: the editor must never show an internal intent label that differs from the live customer-facing button. It should use the same CTA resolver as the public site.
- Shawn also found "Button Words" confusing because it only controlled booking-label text, not the Home button generally. Team direction: remove it from Home; booking wording belongs in a booking/page setup flow later.

### What Changed
- Main Website Button options now call `getSiteCTAs()` with the same effective add-ons as the public site.
- Retail/makers businesses without shopping cart now show the live content label, e.g. "Our Products", instead of misleading "Shop Now".
- Helper text is destination-aware, e.g. products/services page, online shop, services page, menu, order online, booking, estimate, contact, or phone call.
- Removed the Home "Button Words" section and its local booking-label state/actions from `SiteEditor.tsx`.
- Removed the now-unused `primaryActionOverride` prop from the Site editor server page.

### Verification
- `git diff --check` passed.
- `npx tsc --noEmit` passed.
- `npm run build` passed. Existing warning only: Next.js middleware convention deprecation.

### Test Next
- Shawn: on Ryan, go to Edit Website > Home > Main Website Button. Confirm the first retail content option no longer says "Shop Now" unless the live destination is actually the online shop.
- Confirm choosing Call Us / Book a Repair / Our Products updates the public desktop/mobile CTA consistently.
- Confirm "Button Words" is gone from Home.

---

## 2026-08-07 - Home Editor Language and Flow Cleanup

### Where We Left Off
- Shawn tested Edit Website through the lens of Ryan, a non-technical bike-shop owner. The Home editor still felt confusing because it used web/design language and had controls out of live-site order.
- Team decision: stop using "hero" in owner-facing labels. Apple-style owner wording is "First Impression" because it describes the moment customers see, not the technical section name.
- The old Home editor exposed three button concepts: "Main Button", "Primary Action", and "Booking Button Text". Code verification showed those were split pieces of one owner problem: what the main website button does and, only for booking-style businesses, what it says.

### What Changed
- Home hub subcopy now says "First Impression, button, Featured Update".
- Home editor order now starts with First Impression, then Main Website Button, then Featured Update.
- "Main Button" renamed to "Main Website Button" with plain copy: it controls the main button customers see at the top of the site and on the mobile bar.
- Removed the separate "Primary Action" picker from Home. When an owner chooses the Main Website Button, the old hidden primary-action override is cleared so the live site cannot keep following an invisible older override.
- "Booking Button Text" renamed to "Button Words" and kept only as the optional booking-label wording control.
- Removed the editable Home Gallery strip from the Home editor. Gallery remains managed from the Gallery page; homepage gallery visuals should be automated from Gallery photos/stock fallback.
- Added "Services Preview" on Home for non-food businesses only, with an "Edit services" action that jumps to the Services editor instead of pretending the preview is edited on Home.
- Moved the bottom CTA editor near the end of Home and labeled it "Footer Call to Action" with helper text that says it is the final section above the footer and shows the current public headline.

### Verification
- `git diff --check` passed.
- `npx tsc --noEmit` passed.
- `npm run build` passed. Existing warning only: Next.js middleware convention deprecation.

### Test Next
- Shawn: open Dashboard > More > Edit Website > Home. Confirm the order reads naturally: First Impression, Main Website Button, Featured Update, Services Preview, Footer Call to Action.
- Change the Main Website Button and confirm the public site top/mobile button updates.
- Confirm Gallery no longer appears as a separate editable strip on Home.
- For a food/menu business, confirm Services Preview does not appear on Home.

---

## 2026-08-07 - Hours Tab Redesign (Jony-Led)

### Where We Left Off
- After the admin View As fix, Shawn live-tested again and found the Hours tab itself confusing: the "5 open days" header meant nothing to him, and there were two different buttons that both felt like "I'm finished" (Done at the top, Save Changes at the bottom) but only one actually saved - he used Save Changes instinctively and never understood what Done was for. He wanted to edit a single day (Saturday) directly, not be forced into an all-7-days edit mode.
- Brought straight to Jony per Shawn's explicit request. Real recommendation, not a vague "make it clearer": kill the meaningless counter, remove Done as a concept entirely, make each day independently tappable/expandable with its own docked Save, keep one "Edit all days" bulk option using the identical per-day editor.

### What Changed
- Header counter replaced with a real summary: "Open 5 days · Closed Sun, Mon" (or "Open every day"/"Closed every day"), plus a warning badge if a day is marked open with no time block set.
- Removed the global `editingHours` boolean entirely - replaced with `expandedDays: Set<number>`, so any individual day (or all of them) can be expanded independently.
- Tapping a day now expands just that day inline with its toggle, time blocks, and a docked "Save [Day]" button - no scrolling, no all-days edit mode required.
- "Edit all days" stays as an explicit bulk option, same per-day editor, all seven expanded at once, with one sticky "Save Changes" bar instead of seven docked buttons.
- "Cancel" now actually reverts unsaved edits back to the last-saved state (previously "Done" just hid the edit UI without reverting anything).

### Test Next
- Shawn: tap into a single day, change its hours, confirm Save appears right there and works without scrolling. Try "Edit all days" separately and confirm the bulk flow with the sticky Save bar still works.

---

## 2026-08-07 - Fix: Schedule Actions Failed Under Admin View As

### Where We Left Off
- Shawn testing live: tried saving Ryan's multi-block hours while viewing his account as admin, got "Could not save availability. Please try again."
- Root cause: `schedule/actions.ts` used a session-bound Supabase client for every write (Hours, time-off blocks, booking cancellation). Under admin View As, that client's RLS check runs against the admin's own real auth identity, not the impersonated customer - so the database silently rejected the write even though the code's own authorization check (`requireScheduleAccess`) had already correctly approved it. Pre-existing gap, not introduced tonight - just never triggered until someone tried to save Hours while impersonating a customer.

### What Changed
- `saveAvailability`, `blockDate`, `blockRange`, `removeBlock`, `cancelBooking` all switched from the session-bound client to the admin/service-role client - matching the pattern already used everywhere else authorization is checked explicitly in code.

### Test Next
- Shawn: retry saving Ryan's multi-block hours while viewing as admin, confirm it saves cleanly this time.

### Also flagged, not yet addressed
- Real UX feedback from the same test: the Hours tab's single global "Edit" toggle (top of card) puts all 7 days into edit mode at once rather than per-day, and Save/Done require scrolling back to the top and bottom of the card. Shawn expected to edit one day directly. This predates tonight's multi-block work - worth a team round on its own, not fixed yet.

---

## 2026-08-07 - Workstream 1 (Part 2): Upgrade Prompt + Comparison

### Where We Left Off
- Completes workstream 1. Team's "celebrate, then solve" framing (Angela's guidance from the earlier design round): don't sell the moment they land on the page, lead with the real win, name the friction only after.

### What Changed
- `/api/company-slug` now also returns `primaryIntent`, `plan`, and a computed `hasCalendar`.
- New upgrade banner on the Reservations view (`/leads?view=reservations`) - only shows when there are real incoming reservation leads, on a business using a scheduling action button without the calendar add-on. Leads with "You've got real booking requests coming in," names the manual-confirmation friction second, offers "Show me a comparison" instead of a hard sell.
- New `BookingComparisonSheet` - simple static side-by-side (Now vs. Automated) covering confirmation, the owner's manual work, and reminders. Links to the existing `/more` upgrade flow rather than duplicating it inline.

### Test Next
- Shawn: on a test business with a scheduling action button and no calendar add-on, submit a test reservation request, confirm the upgrade banner appears on the Reservations tab and the comparison sheet opens correctly.

Both halves of workstream 1 and all of workstream 2 are now complete for this session.

---

## 2026-08-07 - Workstream 1 (Part 1): Universal Booking Action Button

### Where We Left Off
- Shawn's bigger vision: any business, not just food/wellness-type industries, should be able to turn on "Booking" as their site's main action button - like a contact form that any business might want. Explicit concern before building: don't break the existing action-button flow other businesses already rely on.
- Investigated the full flow first (Main Button picker -> `primary_intent` column -> `getSiteCTAs` resolution) and confirmed it was safe: every industry already has a working CTA behind scheduling intents, and adding new picker options is purely additive - it never touches any business's already-saved selection.
- Also discovered something that changed the shape of the remaining work: basic-tier reservation requests already land as real leads today (type `reservation_request`), and food businesses already get their inbox relabeled "Reservations" when they lack the calendar add-on. Shawn's vision was already half-built, just limited to 10 of 22 industries.

### What Changed
- `SiteEditor.tsx`'s Main Button picker: added "Book Appointments" as a selectable option for the 13 industries that never had one (retail, makers_crafts, home_services, professional_services, and 9 others).
- `toolPolicy.ts`: the dashboard inbox now relabels to "Reservations" (filtered view) whenever a business's action button is a scheduling intent but they lack the calendar add-on - extending the food-only pattern to every industry. New `primaryIntent` param threaded through `DashboardNav`/`DashboardPages` and their two call sites (`dashboard/(app)/layout.tsx`, `more/page.tsx`).

### Not Yet Built
- The in-context "want to upgrade?" prompt and side-by-side comparison view on that Reservations tab - this is workstream 1's second half, still needs its own build.

### Test Next
- Shawn: on a test business from one of the 13 newly-included industries, set the Main Button to "Book Appointments," confirm the dashboard inbox relabels to "Reservations" and filters correctly, and confirm the public site's CTA shows the right industry-specific label.

---

## 2026-08-07 - Workstream 2: Multi-Block Daily Hours

### Where We Left Off
- Follow-up to the zero-available-days fix: Shawn's real worry was that a continuously-open 9-5 calendar means an owner has to keep watching it to know when someone's actually coming in, especially if the day isn't fully booked.
- First team pass over-scoped this as a weekly-republish workflow (owner logs in every week, curates blocks, publishes). Shawn caught it and corrected: he just wants multiple fixed time windows per day (e.g. 9-11am, 1-3pm, 6-8pm), set once, same permanent model as today's Hours tab - not a weekly chore. Team re-scoped accordingly and confirmed this actually resolves the original worry directly (no gap to babysit if the calendar only ever shows real, intentional windows).
- This is "workstream 2" of a larger two-workstream plan; workstream 1 (universal booking action button + leads/upsell chain) is separate, still to come.

### What Changed
- Migration 057: `company_availability` moved from one row per day to one row per (day, block), capped at 3 blocks/day via a new `(company_id, day_of_week, block_order)` unique constraint.
- `saveAvailability()` now does delete-then-insert of the full flattened block set (not upsert), so removing a block in the UI actually removes its row instead of leaving it stale.
- `getAvailableSlots()` walks each working block separately when generating bookable times.
- `/[slug]/book/page.tsx`'s `workingDays` query deduped (multiple blocks per day now return multiple rows for the same day_of_week).
- Hours tab: each day shows a stacked list of blocks with per-block time pickers, a remove button per block, and an "Add time block" action that disappears once 3 blocks exist.

### Test Next
- Shawn: on a test business, set a day to have 2-3 separate blocks (e.g. 9-11am and 1-3pm), save, confirm the public `/book` calendar only shows real slots inside those windows - not the gap between them.

---

## 2026-08-07 - Fix: Calendar Can No Longer Go Live With Zero Available Days

### Where We Left Off
- Follow-up to last night's booking work: Ryan set his hours to 9-5 Mon-Fri in the dashboard's Hours tab, but his public booking calendar showed zero bookable days at all.
- Root cause: the Hours tab renders sensible Mon-Fri 9-5 defaults on load, before anything is fetched or saved - visually identical to a real saved schedule. Since the defaults already matched what Ryan wanted, he had no reason to think anything needed saving. `company_availability` stayed completely empty for his company; the public calendar only enables days it finds a real row for, so zero rows meant every day showed as unavailable.
- Team explicitly ruled out a quick UI-only patch (a banner is easy to miss, same category of problem as invisible unsaved state) in favor of the real fix: seed real default rows the moment the calendar add-on actually activates, so the empty-table state can't occur in the first place.
- Shawn was explicit he did NOT want any placeholder/assumed hours written into Ryan's specific account, since those weren't confirmed as his real hours - the fix built here is the general systemic one, not a data patch for Ryan's account.
- Mid-build, Shawn asked whether this covers every activation path and every template - a scope-verification round found the original 3-path plan (free switch, paid checkout, Stripe webhook) was real but incomplete (an admin tool and manual DB edits could still bypass it), so a 4th backstop was added directly in the public `/book` page load itself.

### What Changed
- New `src/lib/bookings/ensureDefaultAvailability(companyId)` - checks for zero existing rows, seeds Mon-Fri 9-5 defaults only if genuinely empty, never touches real saved hours.
- Wired into 4 places: `switchIncludedAddon()` (free Pro-plan switch), `markAddonActive()` (paid checkout, 3 call sites converge here), the Stripe webhook's subscription-sync handler, and a final backstop in `/[slug]/book/page.tsx` itself (catches any activation path that bypasses the app entirely - admin tools, manual DB edits).
- Confirmed template-agnostic - this is shared dashboard/backend logic, not per-template code, so it applies to every business on all 6 templates automatically with no separate template work needed (unlike the earlier gallery-strip parity fix).
- Added a saved/unsaved status badge to the Hours tab ("Live on your site" / "Unsaved changes" / "Not saved yet - tap Save below"), and made the Save button reachable even before the owner starts editing - previously it only appeared once something was actively being changed.

### Test Next
- Shawn: have Ryan open his Hours tab and confirm it now shows a clear status badge rather than looking ambiguously "already correct." Confirm a fresh test business activating the calendar add-on gets real bookable days immediately, with no manual save required first.

---

## 2026-08-06 - Booking System: Retail/Makers/Nonprofit CTAs, /book Route, Custom Label

### Where We Left Off
- Real live-customer issue: Ryan (bike shop, industry "retail," Found Pro) switched his free included add-on from Shopping Cart to Reservation Calendar. Dashboard side worked; public site still showed "Our Products" pointing at a product page, because retail had no scheduling CTA defined at all - a real, working `/reserve` booking page existed, just nothing on the public site linked to it for retail.
- Root cause: retail was deliberately excluded from Reservation Calendar in the original locked plan (food/wellness/beauty/fitness/healthcare/pet/education only). The free included-addon switcher doesn't enforce that industry-relevance check the way the paid add-on flow does, so Ryan ended up in a configuration the rest of the system was never wired to support.
- Shawn made the real call: open booking to every industry, not just the original locked subset - a bike shop needs repair/fitting appointments, and other retail businesses have similar real scheduling needs. Ran this through several team rounds (copy review for industry-appropriate CTA labels, then a slug/architecture round, each with real scrutiny - several of Claude's draft proposals got corrected by the team before shipping).
- **Important process note:** Claude briefed an early team meeting with a factual error - claimed 7 industries had no scheduling CTA when only 3 actually did (retail, makers_crafts, nonprofit; automotive/creative_services/professional_services/home_services already had working entries). Caught before shipping, corrected with the team's explicit sign-off on the narrower, accurate scope. See `feedback_team_approval_process` memory for the full record - this is exactly why every premise gets verified against the real code before a team round, not after.

### What Changed
- `industryCTAs.ts`: added real scheduling CTAs for the 3 genuinely-missing industries - retail ("Book an Appointment"), makers_crafts ("Request a Commission"), nonprofit ("Plan Your Visit"). Automotive/creative_services/professional_services/home_services deliberately left untouched - they already worked, nobody asked to change them.
- Route renamed `/reserve` → `/book` site-wide (team's call: "reserve" was picked with restaurants in mind, doesn't fit a bike shop or an accountant; URL and label are intentionally decoupled, same pattern that already let one href serve "Reserve a Table" and "Schedule Service" without confusion). `/reserve` kept as a permanent redirect for any existing bookmarks/GBP links/receipts.
- New `companies.booking_cta_label` column (migration 056) + a new "Booking Button Text" section in Site Editor - industry default preset, or a capped 24-character custom override (e.g. Ryan could type "Book a Repair" instead of the default "Book an Appointment"). Wired through `getSiteCTAs`/`getAvailablePrimaryActions` so the override applies everywhere the CTA shows - hero, sticky bar, the `/book` page itself.

### Test Next
- Shawn: confirm Ryan's site now shows "Book an Appointment" (or whatever he sets it to) linking to a working `/book` page. Confirm `/reserve` still works via redirect. Confirm the new Site Editor section lets him type a custom label.

---

## 2026-08-06 - One-Tap Share (Web Share API)

### Where We Left Off
- Next item off the photo-system roadmap after template parity: a one-tap share button, using the Web Share API (`navigator.share`) to open the phone's native share sheet - already confirmed earlier tonight this works today in-browser, no native app or Meta API review needed for this piece specifically.
- Real design question before building: share the actual photo file (useful for Instagram/Facebook, since a bare link usually doesn't post as an image) or just a link (simpler, matches the existing album-share pattern already in this file)? Asked Shawn directly rather than guessing - he chose file-sharing with a fallback.

### What Changed
- New `handleSharePhoto()` in `photos/page.tsx`: fetches the photo, shares it as a real file via `navigator.share({ files: [...] })` when `navigator.canShare` confirms file support; falls back to link-sharing (same `navigator.share({ url })` pattern already used for album sharing), then to clipboard-copy if Web Share isn't available at all.
- New Share button (standard share glyph) added to `PhotoCard` tiles (top-right corner - the one open spot after tonight's Jony-led layout, offset lower on video tiles to clear the VIDEO badge) and as a 5th button in `PhotoLightroom`'s bottom action bar.
- Unbranded only - shares the real photo as-is. A branded/canvas-rendered version was explicitly scoped as a separate fast-follow, not built now.

### Test Next
- Shawn: tap Share on a photo tile and in the full-screen viewer, confirm the real photo (not just a link) shows up in the iOS share sheet and can be sent to Instagram/Messages/etc.

---

## 2026-08-06 - Gallery Template Parity (Impact, Cinematic, Editorial)

### Where We Left Off
- Real gap from tonight's Place on Site launch: the Gallery destination worked at the data level for every template, but only 3 of 6 templates (Portrait, Wellness Luxe, Wellness Cinematic) actually render a gallery-strip section. On Impact/Editorial/Cinematic, tagging a photo Gallery succeeded in the database with nowhere on the public site for it to show up.
- Team picked this up as the top-priority next item off the earlier photo-system roadmap. First pass at planning assumed Cinematic would be an easy port from Wellness Cinematic and Impact had a structural CTA-bleed complication - direct code investigation corrected both: Impact has no bleed issue (simpler than assumed), and Cinematic's own code comments state a deliberate "exactly two photo moments" (hero + final CTA) rhythm rule that a literal gallery strip would violate - not a gap, an intentional design choice.
- Team reconvened on the corrected facts (real disagreement: Jony arguing for design integrity, Marcus/Angela arguing the owner's actual photos not showing up matters more). Landed on: Impact gets a real strip (ported from Portrait), Cinematic and Editorial get bespoke, smaller, real-photos-only treatments instead of a literal strip, preserving each template's character. Shawn approved and asked it built exactly as recommended.

### What Changed
- `ImpactLayout.tsx`: added Portrait's 4-tile full-bleed gallery strip (same stock-fill-to-4 threshold logic), placed immediately after the hero.
- `CinematicLayout.tsx`: no strip. About section's solid dark background now shows a small 4-photo collage (portrait-oriented tiles, small radius matching Cinematic's own convention) built from the owner's real gallery photos - only renders when the owner has tagged at least one, no stock fallback, so the original "no competing photo" restraint holds for anyone who hasn't used Gallery yet.
- `EditorialLayout.tsx`: no strip either - the template has zero photo-forward precedent anywhere else in the file. Added 2-3 small (84px) thumbnails inline within the About section's text column, real photos only, no stock fallback.

### Test Next
- Shawn: tag a few photos Gallery on a company using each of these 3 templates and confirm they now show up - Impact should show a strip right under the hero, Cinematic should show a small photo collage inside the About section, Editorial should show a few small thumbnails inline in the About text.

---

## 2026-08-06 - Place on Site: Jony-Led Visual Redesign

### Where We Left Off
- Shawn tested again after the icon/spinner fix and sent screenshots. Two visual complaints: the tile's heart/star/Add-to-Site controls were all crammed into one corner with no spacing (unequal-width elements with no separation reading as one cluster instead of two different kinds of action); and the destination sheet felt "weak" - seven visually identical text rows, no hierarchy, Gallery (additive) indistinguishable from the exclusive-assign rows.
- Shawn explicitly convened the team again, Jony leading this time as the design expert, and asked Jony to actually solve both problems rather than take Shawn's rough suggestion literally.
- Jony's recommendation, approved by Shawn and followed exactly: heart+star stay as a tight top-left pair, Add to Site moves to a low-profile bottom-left bar; sheet gets a leading icon per row, Home's two slots merge under one static "Home Page" label with two chips underneath, Gallery gets a dashed/outlined treatment to signal additive vs. exclusive.

### What Changed
- `placementActions.ts`: each `PhotoDestination` now carries an `icon` key (home/person/wrench/phone/tag/grid/star) and hero/cta carry `group: "home"`. Hero/cta labels shortened to "Top"/"Bottom" since they now render as chips under a shared header instead of full standalone rows.
- `PhotoCard`: Add to Site button moved from the top-left icon row to its own low-profile bar at bottom-left; heart/star unchanged.
- `PlacementSheet`: new `DestinationGlyph`/`DestinationRow` components - every row gets a leading icon, Home's two slots render under a static "Home Page" group label, Gallery renders with a dashed border and a "+" affordance instead of solid fill.
- No destination logic or data model changes - confirmed in the team review as a pure layout/visual pass.

### Test Next
- Shawn: confirm the tile no longer feels cramped, and the sheet reads as more designed/hierarchical rather than a flat list.

---

## 2026-08-06 - Place on Site: Team Review Follow-Up (Icon/Label + Shared Spinner)

### Where We Left Off
- After the initial Place on Site build shipped (below), Shawn tested on his phone and found two real issues: a pin icon on the tile read as "a map location" not "place this on my site," and the "Replace it" confirm button gave no feedback while the request was in flight, looking frozen.
- Those two fixes were made and shipped **without** a team discussion or Shawn's approval first - a process violation. Shawn caught it immediately and was explicit: every code change goes through a team discussion he can see, then his final approval, with no size threshold for skipping it. See `feedback_team_approval_process` memory for the full incident record.
- Shawn then explicitly convened a real team review (Steve leading, Jony on design/functional) to redo the same two questions properly. Team recommendation: icon+word combo instead of a word-only badge (a bare pin has no universal "place on site" meaning, and "PLACE" alone is a verb with no object) - landed on a page/layout icon paired with "Add to Site". Also flagged that there's no shared loading-spinner pattern anywhere in the app (same rotating-ring spinner is copy-pasted independently in ~6 files, including the business-switcher's `companyPickerSpin`) and recommended a real reusable component instead of one more one-off fix. Shawn approved this recommendation explicitly and asked it be followed exactly.

### What Changed
- New `src/components/Spinner.tsx` - small reusable spinner (size/thickness/color props), reuses the `spin` keyframe already global in `globals.css`. Used in the two spinners this feature added; the five other pre-existing ad hoc spinners elsewhere in the app were left alone (out of scope - not reviewed by the team).
- Tile control: replaced the word-only "PLACE" badge with an icon (page/frame with a photo inside, not a pin) + "ADD TO SITE" label.
- `PhotoLightroom`'s matching button: same fix applied for consistency - it had the identical pin icon + single-word "Place" caption.

### Test Next
- Shawn: confirm the tile control now reads clearly as "add this to my site" rather than a map pin, and that the "Replace it" button spinner matches the same look/feel as the business-switcher's loading spinner.

---

## 2026-08-06 - Place on Site: Fast Photo Placement

### Where We Left Off
- Shawn parked the social-post-generation direction (star/`for_social` pipeline) after seeing quality issues (logo rendering, no "wow factor") on two other live projects using a similar approach. Redirected the team to the real mission: eliminate the "you have to be a web designer" tax for photos specifically - fast placement, zero tech savvy required.
- Root problem reported: Shawn hearted new photos and assigned them to hero/about/etc., but a gallery-strip section on some templates kept showing stock photos, because `in_gallery` is a flag separate from `for_website`/`website_section`, previously only settable through a picker buried inside Site Editor.
- Team brainstorm (Jony/Steve/Angela/Marcus/Craig) landed on a destination-first flow: long-press (or tap a visible icon on) any photo to get a flat action sheet of real destinations - one tap places it, no nested pickers. Shawn approved and said to build it.

### What Changed
- New `getPhotoDestinationOptions()` / `placePhoto()` / `removeFromGallery()` server actions (`src/app/dashboard/(app)/photos/placementActions.ts`) - thin wrappers around the already-correct, already-shipped `assignPhotoToSection`/`toggleGalleryPhoto` actions in `site/actions.ts`. Destination labels reuse `getSitePhotoSections()` (page/title per slot) and `getVocab().galleryLabel` (per-industry gallery naming, e.g. "The Food" for restaurants, "The Portfolio" for photographers) - both already existed, no new naming system built.
- New `PlacementSheet` component in the Photos tab (`src/app/dashboard/(app)/photos/page.tsx`) - an animated bottom sheet (new `.placement-sheet` CSS transition in `globals.css`, modeled on `OnboardingDrawer`'s slide-up convention since most existing sheets in this codebase mount instantly with no animation). Lists every real destination (Top of Home, Bottom of Home, About, Services, Contact, Menu or Products, Featured Update if enabled, Gallery) as a flat one-tap list; gallery is a toggle row, everything else is exclusive-assign with a "replace this photo?" confirm if the slot is already occupied.
- `PhotoCard` (grid tile) gets a third icon (alongside heart/star) that opens the sheet, plus long-press-to-open built from scratch (no gesture precedent existed anywhere in the codebase - pointerdown/timer/move-cancel-threshold). `PhotoLightroom` gets a matching "Place" button in its existing bottom action bar.
- Added `in_gallery` to the photos API route's GET select and to the shared `Photo`/`UploadedPhoto`/`DashboardMediaUpload` types so the UI can read current gallery state.
- Explicitly untouched: star/`for_social`, the whole Social Assistant tab (branded post generator, drafts, canvas rendering), and Site Editor's own per-slot picker sheets - all left exactly as they were.

### Test Next
- Shawn: heart a photo, long-press it (or tap the new pin icon), confirm the sheet opens with correct labels - test on a food-catalog company (should say "Menu") and a non-food one (should say "Products"), confirm the gallery row's label varies by sub-industry.
- Tap "Top of Home page" on a real photo, confirm it goes live as the hero on the public site. Tap the gallery row on a Portrait/Wellness Luxe/Wellness Cinematic company, confirm the photo now shows in the gallery strip instead of stock - this is the direct fix for the original bug report.
- Confirm the Social tab, star icon, and post generator still work exactly as before - nothing there should have changed.

---

## 2026-08-06 - Edit Website Header Redundancy Fixed

### Where We Left Off
- Shawn had already flagged this to Codex before that session ran out of credit; it was still unfixed. Brought Jony/Steve/Craig back in per Shawn's explicit ask before touching code.
- Craig's find: on the Menu (and Shop) screen in Edit Website, "Menu" rendered five times before the real editor - BackHeader's "You are editing / Menu", a SectionIntro eyebrow+title that also both said "Menu", and a photo-hero overlay with its own "Menu" caption and heading. All pure duplication.
- Team direction: BackHeader owns "what page you're on." The photo-hero block only earns its overlay text when it's showing real, distinct content (a business name, live page copy) - not when it's just repeating the section name a third time.
- Craig flagged this same SectionIntro+photo-hero pairing exists on Home, About, Contact, and Services too and asked for an audit before scoping a fix beyond Menu.

### What Changed
- Menu/Shop: removed the SectionIntro entirely and the hero's overlaid caption/heading. Kept the real guidance sentence ("Keep every item easy to scan...") as a plain paragraph instead of losing it.
- About, Contact, Services: audited and found a *different*, smaller version of the same bug - only the SectionIntro's eyebrow literally duplicated BackHeader's title. Removed just the eyebrow on each; left the title/body and the photo-hero blocks alone, since those show real functional content (About's actual business name + an editable subtitle field, Contact/Services' real editable live-page copy), not decorative repetition.
- Home and Gallery: audited and found no actual duplication - Home's intro says "First impression" / "Homepage" (not "Home"), Gallery's eyebrow says "Photos" against a "Gallery" header. Left untouched; not every page with this component pairing was actually broken.

### Test Next
- Shawn: open Edit Website > Menu (or Shop) and confirm the page name now appears once, in the sticky header, not five times. Open About/Contact/Services and confirm the small eyebrow duplicate is gone but the real page-preview content (business name, live copy) is still there and still editable.

---

## 2026-08-05 - Live Launch Handoff

### Where We Left Off
- Latest local work: Edit Website > Menu/Products now blends the website page visuals with the real shared catalog editor.
- Team decision: there is still one catalog engine (`CatalogManager`), but it can appear from multiple entry points so owners do not feel bounced between two different systems.
- Edit Website > Menu/Products keeps the page image/camera control at the top, then shows the same item/category editor used by the dedicated Menu/Products tool.
- CatalogManager now supports embedded mode plus search and category collapse for larger catalogs.

### What Changed Recently
- Replaced the handoff/explanation card in `SiteEditor.tsx` with embedded `CatalogManager`.
- Added `embedded` support to `src/components/dashboard/CatalogManager.tsx` so the standalone Menu page keeps its header, while Edit Website gets the editor body only.
- Added search when catalogs grow beyond a small list and collapsed categories by default for large menus/product lists.
- Public menu cards still show real photos when present, no image block when missing, descriptions clamped to about 3 lines, and prices normalize through `src/lib/catalogPricing.ts`.

### Shawn-Tested
- Photo labels and live-section confirmations: working.
- Service/menu/product confirmations: working.
- Confirmation clears after `View live page`: working.
- Rosa's price `1` became `$1.00`: working.
- Rosa's public menu readability pass looked better after description clamp.

### Test Next
- In Edit Website > Menu, confirm the top still controls the Menu Page image.
- Below that, confirm the actual menu editor appears directly: pickup/delivery, categories, items, add item, edit item.
- Confirm editing an item from Edit Website saves and updates the public menu.
- For a larger test menu, confirm search appears and categories start collapsed instead of creating a huge wall of items.

### Process Guardrails
- Keep `SESSION_HANDOFF.md` short; detailed history belongs in `CHANGELOG.md` or `CHANGELOG_ARCHIVE.md`.
- Update `TASKS.md` for now/next/backlog changes.
- No independent product/design decisions. Follow `AGENTS.md` team approval rules.
- Do not revert user or Claude changes unless Shawn explicitly asks.

---

## 2026-08-05 - Catalog Price Normalization + No-Photo Fallback Cards (restaurants + retail)

**Reconstructed catch-up entry** - this work (commit `e1a53d8`) shipped without a matching doc update; written after the fact from the actual diff, not live session notes. Flagging that plainly since it's a gap in the process, not a silent edit.

Price parsing/formatting for menu and product items was duplicated across `OnlineOrderClient.tsx` (restaurant ordering), `ShopClient.tsx` (retail shop), both checkout API routes, `CatalogShowcase.tsx`, and the owner's own `SiteEditor.tsx` catalog editor - each with its own slightly different regex, so the same price could render inconsistently depending on which page rendered it. Consolidated into one shared `src/lib/catalogPricing.ts` (`parseCatalogPriceCents`, `formatCatalogMoney`, `formatCatalogPrice`, `normalizeCatalogPriceInput`) and wired every one of those call sites through it.

Also: menu/product items with no photo used to render nothing in that slot. Now show a fallback card - item initials on a soft gradient background - instead of a blank box, on both the restaurant order page and the shop page.

Shawn QA next: on a restaurant test site's `/order` page and a retail test site's `/shop` page, confirm prices display consistently (e.g. `$12.50` not `$12.5` or raw owner input), and confirm any item without a photo now shows an initials card instead of empty space.

---

## 2026-08-05 - Save Confirmations Now Say Where to Look on the Live Site

**Reconstructed catch-up entry** - 11 commits (`c58741d` through `6b71444`) shipped without a matching doc update; written after the fact from the diffs, not live session notes.

Previously, saving a photo, service, or menu/product item in Site Editor showed a generic "Saved" toast with no indication of where on the live site to actually check. Extended the existing calm `flashSaveNotice` toast pattern (see the July 28 saves-can-fail-silently fix below) so it now names the specific destination - e.g. "Saved to Home Hero. Check Home: top of page." A new `getPhotoSlotSaveNotice()` helper in `SiteEditor.tsx` builds this from each photo slot's own section/page/position metadata, covering save, remove, and gallery add/remove paths. Extended the same live-location awareness to text-content edits and service saves, then to menu/product saves. Along the way: photo labels in the admin UI were clarified to match live section names more consistently, the wellness template's hero photo slot was confirmed to stay independent from its CTA photo slot (no longer double-counted), and the notice now dismisses itself automatically if the owner navigates to view the live page rather than lingering.

Shawn QA next: change a hero photo, a service, and a menu item one at a time in Site Editor and confirm each save shows a specific "check X page, Y section" message, not just a bare "Saved."

---

## 2026-08-05 - Wellness Luxe Template: Second Polish Pass

**Reconstructed catch-up entry** - 5 commits (`16621e6` through `13f0725`) shipped without a matching doc update; written after the fact from the diffs, not live session notes.

Follow-up refinement on the Wellness Luxe template added earlier the same day (see entry below). Polished the desktop layout and navbar treatment, improved the mobile sticky CTA bar, and made the hero read as more cinematic. That cinematic hero direction diverged enough from the original calm/editorial Wellness Luxe concept that it was split into its own separate layout family, `WellnessCinematicLayout.tsx` (`wellness_cinematic` in `src/lib/layout.ts`) rather than overloading one template with two different moods - Wellness Luxe stays calm/editorial, Wellness Cinematic is the bolder option. Also extracted a shared `publicServiceDescription.ts` helper so Impact/Editorial/Portrait and both new wellness layouts fall back to consistent service copy when an owner hasn't written their own.

Shawn QA next: on a wellness/spa/salon test site, check both `Wellness Luxe` and `Wellness Cinematic` in Edit My Site > Design and confirm they read as two genuinely distinct moods, not near-duplicates. Confirm the mobile sticky CTA bar looks right on a real phone.

---

## 2026-08-05 - Premium Wellness Luxe Template Added

Shawn approved Jony-led design direction: keep the Found hero quality as the bar and bring templates closer to that promise rather than weakening the marketing. The first implementation step is a real premium wellness/spa template option.

Built: `src/components/layouts/WellnessLuxeLayout.tsx`, a calm image-led layout for spa, salon, beauty, and wellness-style businesses. It uses large editorial imagery, quieter typography, premium spacing, service blocks, gallery mosaic, owner-supplied client stories only, and a strong final CTA. It intentionally does not imply Google Reviews are integrated.

Routing: added `wellness_luxe` as a valid layout type in `src/lib/layout.ts`; wellness and beauty calm/modern/warm profiles now default to it. Added the layout to the public `[slug]` renderer. Added it as a selectable option in Edit My Site > Design with a small mockup.

Verification: `cmd /c npm run build` passed. `git diff --check` passed with only the repo's normal CRLF warnings.

Shawn QA next: open a wellness/spa/salon test site and confirm the homepage feels closer to the Found hero device imagery. In Edit My Site > Design, confirm `Wellness Luxe` appears and switching layouts keeps the same content/photos.

---## 2026-08-05 - Dedicated How Found Works Page + Clean Nav

Shawn approved stopping the fragile `/#how-it-works` hamburger behavior and building a real `/how-it-works` page instead. Team read: Craig/Chris said stop fighting hash navigation on mobile; Steve/Jony/Angela/Phil agreed the topic deserves its own page for clarity, conversion, SEO, AEO, and GEO.

Fixed: `src/components/SiteNav.tsx` now points `How it works` to `/how-it-works` and no longer carries hash-navigation code. Mobile menu navigation is simple: close the menu, release scroll lock, then route.

Built: new `src/app/how-it-works/page.tsx` explaining how Found builds the website, what happens after launch, the mobile dashboard/tools, local search fundamentals, and FAQs. The page includes metadata, canonical URL, Open Graph/Twitter metadata, FAQPage JSON-LD, HowTo JSON-LD, and WebPage JSON-LD.

SEO/AEO/GEO: added `/how-it-works` to `src/app/sitemap.ts`; homepage hero and the abbreviated homepage How It Works preview now link to the dedicated page. Added root-site-only Organization, WebSite, and SoftwareApplication JSON-LD in `src/app/layout.tsx` so Found marketing pages share a consistent entity signal without leaking it onto tenant sites.

Verification: `cmd /c npm run build` passed and generated `/how-it-works`. `git diff --check` passed with only the repo's normal CRLF warning. Production-build verification against `http://127.0.0.1:3002/how-it-works` returned 200, included JSON-LD, FAQPage, HowTo, SoftwareApplication, and `/sitemap.xml` includes `/how-it-works`.

Shawn QA next: on iPhone, open the hamburger from Home, Compare, Plans, and Industries. Tap How it works and confirm it always opens the dedicated page. Review the new page copy quickly for launch clarity.
---
## 2026-07-31 - Safari Custom-Domain Share URL Fix

Shawn found Safari sharing a connected-domain site still opened/shared the foundco.app fallback for RC Bicycles, while Firefox respected the business domain. Craig/Marcus treated this as a public URL source-of-truth bug, not another DNS-only issue.

Fixed: tenant metadata, shop/order metadata, dashboard live-site links, page preview links, and catalog preview links now resolve through `getPublicSiteOrigin()`, which prefers `website_config.custom_domain` and falls back to the slug subdomain only when no domain is connected.

Verification: `cmd /c npm run build` passed. `git diff --check` passed after whitespace cleanup.

Shawn QA next: open `https://rcbicycles.com` in normal Safari, tap Share, send/open the link, and confirm it stays on `rcbicycles.com`. Repeat from Shop/Menu if present.

---
## 2026-07-31 - Custom Domains Actually 404'd - Second Domain Bug, Found and Fixed Same Session

Right after the false-"Live" fix below shipped, Shawn finished connecting `mambostudio.app` for real - correct DNS, Vercel confirmed both ownership and DNS-config correct. The dashboard correctly stopped lying about "Live." But visiting the domain itself still 404'd. Different bug, more serious: the actual site was never reachable.

**Root cause, confirmed against live prod data:** `getCompanyByDomain()` in `src/lib/company.ts` filtered an embedded `website_config` resource without `!inner` - in Supabase/PostgREST, that doesn't restrict which `companies` rows come back, it only controls which nested rows get attached. Every active company (34 of them) was returned on every lookup; `.single()` choked getting 34 rows instead of 1; every custom-domain visitor 404'd. This has been true for the entire life of the feature, for anyone, the moment a second active company existed - completely unrelated to the DNS-status bug fixed hours earlier in the same session.

Shawn called a second team meeting himself (Steve leading, full roster) - transcript given raw. Key points: Marcus owned that his earlier "site-serving path is fine" read this morning was accurate for what he checked (that field genuinely isn't used in routing) but he hadn't traced all the way to "does a real domain actually render a real page." Angela named the real process gap plainly: nobody had ever done a genuine end-to-end custom-domain test against the platform's real data shape (30+ companies), so this was guaranteed to be invisible in any small dev setup and guaranteed to break in the real one. Team explicitly separated this from the July 29 GO-launch decision - not a reversal, but `DECISIONS.md` gets an honest addendum since GO assumed this capability worked.

Shawn approved the full recommendation, all at once, given real urgency (a real prospective customer, RC Bicycles, about to sign up). **Shipped (`6284fe9`):**
- `getCompanyByDomain()` now uses `website_config!inner(*)` + `.eq()` so the filter is a real join condition, and `.maybeSingle()` instead of `.single()` - zero matches stays quiet, but a genuine collision (two companies sharing a domain) now gets captured to Sentry instead of silently 404ing an innocent company.
- Migration 049: unique index on `website_config.custom_domain`. Audited live data first - zero duplicates existed, safe to apply immediately, makes the collision case structurally impossible going forward.
- `scripts/verify-domain-lookup.mjs`: standalone regression check (this repo has no test framework yet - building one from scratch wasn't the right scope for a same-day hotfix). Creates two temp companies with distinct domains, confirms each resolves to itself not the other, confirms an unknown domain resolves to nothing, confirms the new unique constraint rejects a collision, cleans up after itself. All 6 checks pass against live Supabase - run this after any future change to domain/slug lookup logic.
- A branded `[slug]/not-found.tsx` - Jony's backlog item, done now since the session was already in this exact code path.
- **Verified live, not just built:** `mambostudio.app` now returns HTTP 200 with Lucky's actual site (confirmed via direct fetch, page title correct). Barrio Builders was checked and does NOT have a real custom domain connected (that was an illustrative example in `BRIEF.md`, not live data) - so the "two simultaneous real domains" verification the team asked for was satisfied via the temp-data script instead of a second real domain, plus this one real end-to-end confirmation.
- Checked marketing copy per Phil's ask: `src/app/plans/found/page.tsx` already has live copy promising "your own domain... set up in minutes" and an FAQ answer promising Found "walks you through it" connecting an existing domain. That claim is now actually true rather than false - flagged, not edited, copy changes are Phil's call.

**Not done:** confirming the OG-image path specifically (Chris's ask, low priority, same root cause is fixed so it should be resolved too, just not independently re-verified).

Shawn QA next: when Ryan (RC Bicycles) signs up and connects his domain, this is the exact path he'll go through - should work end to end now, both the accurate "Live" status and the site actually rendering.

---

## 2026-07-30 - False "Live" Status Bug: Found, Team-Reviewed, Fixed

Shawn tested the manual DNS flow himself, exactly as a real owner would - typed in a domain he owns (`mambostudio.app`, registered at Namecheap, DNS never touched, still on Namecheap's parking page) and Found immediately said "Live — your site is live at this domain" with a Visit Site button. That's false; the domain wasn't pointing at Found at all.

**Root cause, confirmed directly against Vercel's real API before proposing any fix:** Found's `verified`/"Live" state only ever checked one Vercel signal - whether this project owns the claim to the domain (`GET /v10/projects/{id}/domains/{domain}`'s `verified` field). It never checked the separate signal for whether DNS is actually configured correctly (`GET /v6/domains/{domain}/config`'s `misconfigured` field). A domain nobody's ever touched reads ownership-verified almost immediately, since nothing else on Vercel conflicts with the claim - so brand-new, untouched domains would read "Live" within moments of being typed in, before any DNS work happened. Direct API check on `mambostudio.app` confirmed it exactly: ownership `verified: true`, but `misconfigured: true`, A record still resolving to Namecheap's parking IP.

Shawn called a real team meeting himself (Steve leading, full roster) to review the bug and the proposed fix - full transcript given to him raw. Key findings from that meeting, not just "add a second check":
- **Scope confirmed narrow:** the actual public site-serving path (`middleware.ts` + `getCompanyByDomain()`) never used this flawed field - Vercel's own DNS is the real traffic gate upstream of anything Found does, so this was a dashboard trust/messaging bug, not a routing or security bug. No tenant ever got served on the wrong domain.
- **Craig's honest process note, worth recording plainly:** today's earlier "Custom Domain Connect - Verified Live" entry (see below) tested against `example.com`, which is IANA-reserved and can never pass Vercel's real ownership check by design. That test proved the API plumbing worked (add/check/remove round-trip, clean teardown) - it could not have caught this gap no matter how carefully it was reviewed, because the domain used structurally could never reach the state that would have exposed it. Different claim, same word ("verified"). Future domain-flow verification should use a real, team-controlled test domain that can exercise both the pass and fail paths honestly.
- **Priya's fail-closed requirement:** any error/timeout on the new check must report "not live," never an ambiguous pass.
- **Angela/Jony synthesis on messaging:** don't show a scary "misconfigured" message on the first check (DNS propagation isn't instant, that would manufacture false alarms) - show the calm "still checking" message for a grace window, then only after that window, if still specifically misconfigured, show a distinguishable plain-English message that points back at the actual DNS records so the owner isn't left stranded.
- Adjacent, non-blocking follow-ups logged for later: no uniqueness constraint on `website_config.custom_domain` (Priya), persisting last-checked domain-health state server-side for support visibility (Priya, phase 2), an email the moment a domain actually goes live since nobody sits on the dashboard tab for 48 hours of propagation (Chris, future).
- Team's read on urgency: every company in Found's database is currently one of Shawn's own test/practice accounts - no real customer was ever shown the false "Live" state. Treated as a pre-launch correctness fix caught by exactly the kind of adversarial owner-perspective testing that's supposed to catch it, not an incident.

Shawn approved the full recommendation. **Shipped (`ff78d90`):**
- New shared `getVercelDomainStatus()` in `actions.ts` - single place combining both Vercel signals; "live" requires ownership verified AND `misconfigured === false`. Both `connectCustomDomain()` and `checkDomainStatus()` now go through it instead of duplicating the check.
- Fails closed on any fetch error/timeout - reported as not-live, error message passed through, never treated as a pass.
- 12-second in-memory cache on the combined check so concurrent polls (e.g. two open tabs) for the same domain collapse into one upstream call instead of doubling Vercel API traffic.
- `DomainConnector.tsx`: added a 3-check grace window before showing the "records don't look right yet" message; that message re-shows the DNS records inline (extracted into a shared `DnsRecordsList` used in both places) so the owner has something actionable, not just a warning.
- `npm run build` passed clean before pushing.

**Not done, explicitly deferred, non-blocking:** the `website_config.custom_domain` uniqueness-constraint check, server-side persistence of domain-health state, and the "email when it actually goes live" idea.

Shawn QA next: reconnect `mambostudio.app` (or any domain with DNS not yet pointed at Found) and confirm it now correctly shows "not live" instead of a false "Live." Then actually add the DNS records for real and confirm it correctly flips to verified once DNS propagates - that path hasn't been tested end-to-end with a domain that starts wrong and gets fixed.

---

## 2026-07-30 - GoDaddy DNS Auto-Setup: REVERTED, then Manual Flow Fixed Instead

The GoDaddy scoped-token auto-setup below shipped, then Shawn immediately and correctly rejected it: "My business owners are not developers." Asking an owner to generate a Personal Access Token from a Developer Portal is not usable by Found's real, non-technical customers, no matter how it's worded. Reverted (`61c0364`).

**Process correction, important:** Shawn also flagged that Claude had been running its own informal "team discussion" (simulating Craig/Priya/Phil/Marcus) and then acting on its own synthesis of it as if it were settled team consensus - without Shawn ever calling that meeting, and without including Angela or Jony, the two people whose job was exactly to catch this UX failure. Shawn's explicit, standing rule going forward: **Claude never calls a team meeting, ever - only Shawn does.** See `feedback_team_approval_process.md` in Claude's memory system for the full corrected rule.

Shawn then called a real team meeting himself (Steve leading, full roster - Jony, Angela, Craig, Priya, Marcus, Chris, Phil) to actually solve the domain-connection problem. Full transcript given to Shawn raw. Team's honest conclusion: the manual DNS flow (already live) shouldn't be replaced with new automation yet - Domain Connect's approval timeline is unknown and Entri costs $3-9K+/year against Found's current real customer count, neither justified right now. Instead, fix the real friction points in what's already shipped, since nobody had data suggesting automation was even the actual blocker.

Shawn confirmed: fix the manual flow now (has the time today), hold automation for later. Sequencing question he raised and worth recording: he asked whether this meant switching to **nameserver delegation** instead of individual DNS records - clarified that's a materially different, riskier architecture (hands over ALL DNS to Found, would silently break any existing business email on the domain unless Found first builds a way to preserve those records) and explicitly NOT part of this fix. Stuck with the existing safer record-based approach.

**Shipped (`5c63ea1`):** `DomainConnector.tsx`'s unverified/DNS-records view now has: a plain-English line explaining what the two records do, a warning to replace (not duplicate) any existing record at the same name+type, direct links to GoDaddy's and Namecheap's DNS settings pages, and an explicit "Done - I added these records" confirmation button that swaps into a calm "checking now, no need to keep refreshing" message instead of leaving the state ambiguous. `npm run build` passed clean before each push.

Shawn QA next: walk through the manual connect flow end to end as if you were Ryan (RC Bicycles) with no DNS knowledge - confirm the explanation line, the replace-warning, both registrar links open correctly, and tapping "Done - I added these records" flips to the calm checking message.

---

## 2026-07-30 - GoDaddy DNS Auto-Setup: BUILT (superseded, see entry above)

Shawn pushed back on the earlier research conclusion ("but how long would it take to get this approved") - fair challenge, and it caught a real conflation on Claude's part. Domain Connect (the invisible, no-key UX) genuinely does need GoDaddy's manual approval with no promised timeline - confirmed straight from Domain Connect's own docs, not just search summaries. But the *direct* GoDaddy API path (owner generates their own scoped token, pastes it in) needs **zero approval from GoDaddy at all** - that's fully self-serve today. Shawn approved building that path once the distinction was clear.

Pulled GoDaddy's real v3 OpenAPI spec directly (`developer.godaddy.com/openapi/domains-v3.json`) instead of guessing at endpoints - confirmed the actual contract: `POST/GET/DELETE https://api.godaddy.com/v3/domains/zones/{domain}/dns-records`, Bearer-token auth, `domains.dns:update` scope, records shaped `{name, type, data, ttl}`.

**Built and shipped (`71408bb`):**
- New `connectDomainViaGoDaddy()` in `actions.ts` - registers with Vercel first via the existing `connectCustomDomain()` (so a bad domain never touches the owner's GoDaddy account), then creates the standard A/CNAME records plus any Vercel verification records at GoDaddy. Since GoDaddy's v3 API has no "replace" endpoint (only create/delete by id), it first clears any existing record at that name+type - handles the very common case of a newly-bought domain already having a default parking-page A record.
- The GoDaddy token is a local variable only, used once inside that single server-action call and discarded - never written to the database, never logged. This was the credential-custody question flagged earlier; resolved by simply never persisting it.
- `DomainConnector.tsx` empty state got a new opt-in panel ("On GoDaddy? Set your DNS up automatically →") sitting below the existing manual-entry flow, which is untouched and still the default. When auto-setup is used, the unverified-state view swaps the manual DNS-record list for a plain "we did this for you, checking connection" message instead.
- `npm run build` passed clean before commit.

**Not done:** Domain Connect itself (the true one-click, no-token flow) - still logged as the longer-term goal in `DECISIONS.md`, not blocking this. Namecheap and other registrars are still deferred to a later phase.

Shawn QA next: with a real GoDaddy account and domain, generate a Personal Access Token scoped to `domains.dns:update` at `developer.godaddy.com`, paste it into the new panel, and confirm the A/CNAME records actually appear in the GoDaddy DNS dashboard and the domain goes live without manually touching DNS.

---

## 2026-07-30 - Domain Registrar Recommendations + Auto-Setup Research

Shawn asked to pause the open items from earlier today and start on domain registrar auto-setup: pick top registrars to recommend, and figure out which ones would actually work with Found's setup system for real automation (not just better copy).

**First team pass got corrected by Shawn:** the team initially floated GoDaddy/Namecheap/Squarespace as "familiar" recommendations - Shawn caught that Squarespace is a direct website-builder competitor to Found, not a neutral registrar pick. Real catch, logged so it doesn't happen again. See `DECISIONS.md` [2026-07-30].

**Scope landed on "both, staged":** ship the registrar-recommendation copy now (fast), treat real auto-setup as its own research-then-build track.

**Registrar recommendation - SHIPPED:** `DomainConnector.tsx`'s empty state ("no domain connected yet") now reads "Don't have a domain yet? We recommend GoDaddy or Namecheap." Just copy, no links/affiliate anything. Build passed, committed and pushed (`a356a1c`).

**Auto-setup research (no code written for this part yet):**
- **Domain Connect protocol** - open standard ~20 DNS providers support (covers ~35% of the `.com` zone), redirects the owner to their own registrar's consent screen so Found never touches or stores their registrar credentials. GoDaddy co-created this standard and already has a template in the official public repo (`Domain-Connect/Templates` on GitHub) - strong signal, not a marginal integration. **Not instant, though:** becoming a registered service provider means writing/testing a JSON template (there's an online editor + precedent templates to copy) and directly emailing GoDaddy's team (`domainconnect@godaddy.com`) for approval - an external dependency with no guaranteed timeline.
- **GoDaddy scoped API fallback** - real and usable today, no waiting. GoDaddy's Developer Platform (opened up meaningfully in April 2026, previously gated behind 50+ domains or reseller status) issues Personal Access Tokens scoped narrowly to specific capabilities - e.g. "update DNS records" without domain-purchase or full-account power. The owner would still have to generate this token in their own GoDaddy account and hand it to Found, and Found would need to store it - a real UX step and a real credential-custody decision, much lower blast radius than a password but not zero risk.
- **Namecheap** - mature API but historically requires the owner to manually enable API access + whitelist an IP in their own account first, a real friction point for a non-technical owner. Not confirmed whether they support Domain Connect. Deferred to a later phase - GoDaddy is the first target given it's the dominant registrar among Found's likely owners and has the clearer path (both Domain Connect and scoped-API options).

**Decision, approved by Shawn:** pursue Domain Connect registration for GoDaddy as the long-term no-credential-storage goal, but don't block a v1 build on its approval timeline. Scoped-PAT is the documented fallback path. **Actual code for credential handling (the scoped-PAT flow) still needs explicit sign-off before being built** - this session only covered research + the registrar-copy ship. See `DECISIONS.md` [2026-07-30] for the full formal record.

### Next steps for whoever picks this up
1. If Shawn wants to move forward: draft the Domain Connect template (there's a GitHub repo with precedent templates + an online test editor) and the outreach email to `domainconnect@godaddy.com` - the actual email needs to go out under Shawn/Found's name, not sent by Claude.
2. Get explicit sign-off on the scoped-PAT fallback flow (how it's stored, whether it's discarded after one-time use or retained) before writing any of that code - this is real credential-custody territory.
3. Namecheap and other registrars are explicitly deferred until the GoDaddy path is proven.

---

## 2026-07-30 - PostHog Phase 2 Analytics: Finished After a Crash Mid-Setup

Last session's computer crashed while wiring up PostHog (the `TASKS.md` Phase 2 analytics item - funnel/attribution tracking, separate from the Phase 1 Vercel Web Analytics already live). Shawn had already created the PostHog account and the env vars had made it into Vercel, but the code itself never got committed or pushed - it sat as uncommitted local changes discovered at the start of this session.

Verified what existed before touching anything: `NEXT_PUBLIC_POSTHOG_KEY`/`NEXT_PUBLIC_POSTHOG_HOST` confirmed live in Vercel Production + Preview. `src/components/FoundPostHogProvider.tsx` (new, uncommitted) and its wiring into `layout.tsx` were already written and looked complete on read - root-site-only via the same `isRootSite` gate `<Analytics />` already uses, manual `$pageview` capture since Next's App Router doesn't fire full page loads on client-side nav.

Ran a full `npm run build` before committing anything - clean, all 79 pages generated, no errors. Committed and pushed (`a70872c`). PostHog Phase 2 is now live alongside Sentry/UptimeRobot (both fully shipped and confirmed separately this session - see `admin/health`) and the July 29 `menu_display` gating cleanup (also confirmed already shipped, no action needed).

Shawn checked the PostHog dashboard right after deploy and it showed **zero events** - not a wait-a-few-minutes thing, a real bug. Traced it: `PageviewTracker`'s effect checked a module-level `initialized` flag set by `FoundPostHogProvider`'s own `useEffect`, but React fires child effects before parent effects on mount - so `PageviewTracker` always saw `initialized === false` on first load and silently skipped the capture. With `capture_pageview: false` (needed for manual App Router tracking), that meant **every fresh visit's first pageview was dropped**, and PostHog would only ever see something if a visitor triggered a client-side route change afterward - explaining "no events yet" exactly. Fixed by moving init out of `useEffect` into the render body itself (SSR-guarded with a `typeof window` check), so it always finishes before any child effect can check the flag. Build passed clean, committed and pushed (`80e573b`).

**Shawn confirmed 2026-07-30:** reloaded `foundco.app` fresh and checked the PostHog Activity view - Pageview, Web vitals, and click events (`clicked link with text "Plans"`, `clicked svg`) are all landing correctly, including the first-load pageview that was previously silently dropped. PostHog Phase 2 base tracking is closed out.

Still open, not done this session: confirming tenant sites / `my.foundco.app` / `admin.foundco.app` never leak into PostHog (same scoping check already done for Vercel Analytics, just not re-verified here), and the full funnel/attribution event instrumentation (visit -> onboarding start -> onboarding complete -> activation/paid, UTM tracking) - only pageviews/autocapture are live so far.

---

## 2026-07-30 - Custom Domain Connect: Un-Gated, Deduplicated, Verified Live

Shawn asked for a real team pass before launch: can a business owner actually connect their own domain, with the easiest UI/UX. Held the team review before touching anything, per Shawn's explicit ask (paused an in-progress edit mid-turn to do this properly).

Found two real problems by reading the actual code, not assuming:
1. **Two competing implementations existed.** A real one in the dashboard (Site Editor > Domain) that genuinely calls the Vercel Domains API - register, check status, disconnect - and a standalone `/connect-domain` page that was weaker (fire-and-forget registration, no error surfacing, generic static DNS instructions) and, confirmed via grep, linked from nowhere in the app. Removed the dead one entirely.
2. **The real one was still Pro/Business-gated** - "Upgrade to Found Pro" wall for base-plan owners - left over from before `custom_domain` was made free on every plan back in June (`featureAccess.ts` and the copy right next to this component both already say free; the component just never got updated). Shawn confirmed: should never have cost money, every owner should be able to do this. Un-gated it.

Team also recommended (Jony/Angela on UX, Craig on feasibility) adding quiet background status checking instead of requiring the owner to remember to tap "Check Connection" - Shawn approved. Now checks immediately on page load and every 20s while unverified, flips to "Live" on its own; manual button still there for on-demand reassurance.

Verified the real Vercel integration directly against production before trusting it: full add → check-status → remove round-trip on a safe example.com test domain, confirmed cleanup left nothing behind. `VERCEL_API_TOKEN`/`VERCEL_PROJECT_ID` confirmed live. This closes the "never tested end-to-end" gap that TASKS.md had flagged.

**Correction, same day, logged honestly per team review below:** "verified live" here meant the API plumbing worked - it did not mean the status reported to the owner was trustworthy. `example.com` is IANA-reserved and can never pass Vercel's real ownership check, so this test structurally could not have caught the false-"Live" bug found later the same day (see "False 'Live' Status Bug" entry above). Different claim, same word - not a case of anyone being careless, just a gap in what this specific test was capable of proving.

---

## 2026-07-29 - Full Add-On/Plan-Tier Gating Audit - CLOSED

Follow-up to the functional audit below: Shawn's directive was explicit - no business on any plan/template/industry should get a paid feature for free, audit every gate, not just menu_display.

Verified every real, currently-sellable add-on (online_ordering, shopping_cart, reservation_calendar, quote_payments, email_marketing) already has real enforcement, dashboard-side and public-site-side, by reading the actual enforcement code (not the feature-flag declarations). All clean.

**Two real findings, both fixed:**
1. **`contact_database` (Contacts) had zero enforcement** despite being declared Pro+/Business-only - any base-plan business could use it free. Checked live impact first: all 3 real (non-test) companies are already on `found_business`, so closing this gate has zero real-customer disruption. Added `requireDashboardFeaturePage` (generalized version of the existing addon-page guard, for any `Feature` not just purchasable add-ons), gated the Contacts layout and all 4 server actions directly (not just the page - actions are independently callable), and made the dashboard nav/dock and Home screen's "My Contacts" tile plan-aware so a base-plan owner doesn't see a dead-end tap.
2. **`menu_display`** was declared as a paid add-on but isn't sellable anywhere (not in `ALL_ADDONS`, zero purchases ever) and the real menu page never checked it - only `online_ordering` gates the actual paid capability (checkout on top of the free menu). This was dead/vestigial code from an earlier product iteration, not a live gating gap - removed the unused type/case entirely rather than build a gate for something never sold.

`worker_uploads` and `lead_sequence` are declared but have zero implementation anywhere - unbuilt backlog features, not free-access bugs, left alone. `review_collection` was already correctly resolved (honest "coming soon" copy, no backend to gate).

---

## 2026-07-29 - Final Pre-Launch Pass: Intro Rate, Design + Functional Audit

Shawn asked for one last pass before launch: move the expired intro-rate promo (was gated to July 15, quietly expired 2 weeks with nobody catching it) out to August 15, plus a real design/functional check - live browser + code, not a re-read of docs.

**Intro rate:** Consolidated the previously-duplicated `INTRO_RATE_CUTOFF` date (6 files) into one shared constant (`src/lib/introRate.ts`), moved it to 2026-08-15, updated all "expires July 15" copy sitewide. No Stripe-side change needed - the founding-tier Price IDs and $1 first-invoice promo codes have no `expires_at`/`redeem_by` set; the whole thing was purely app-side date-gated.

**Design bug found + fixed (three passes) - CLOSED:** `CinematicLayout.tsx`'s hero used true `h-screen` + `justify-center` centering with zero top padding on the content wrapper, while the site nav is `fixed` (out of document flow). On a short/wide viewport with a tall headline, this let the "[City]'s Own" tagline render on top of the nav links - confirmed live on `lucky.foundco.app`, not present on Rosa's (different layout). First fix added `pt-24` to the content wrapper - this cleared the nav overlap but, because the section was a *rigid* `h-screen` with `overflow-hidden`, the extra height just pushed the overflow onto the other end instead: Shawn caught the "VISIT US"/"SHOP ONLINE" buttons now clipped at the bottom. Real root cause: `h-screen` can't grow to fit real content (owner-editable business name/headline/subtitle length varies per company), so anything that didn't fit in exactly 100vh got hard-clipped by `overflow-hidden` - padding alone couldn't fix that, only removing the rigid height could. Compared against the other three hero templates: Impact (`min-h-[75vh]/[85vh]`), Portrait (`min-h-[90vh]`), and Editorial (`min-h-[90vh]/screen`) all use `min-height`, never a fixed height - Cinematic was the only one of the four rigid. Changed `h-screen` to `min-h-screen`; swept every layout file afterward for any other rigid `h-screen` section - none exist. Third pass: Shawn caught the buttons still touching the very bottom edge with no breathing room before the next section - the wrapper only had `pt-24` (added purely to clear the nav), no matching bottom padding, so bottom spacing was left entirely to `justify-center`'s centering math instead of a guaranteed minimum. Changed `pt-24` to `py-24` so both ends get real, guaranteed clearance regardless of a given business's content length. Verified live on production via direct DOM measurement: 96px of clearance below the buttons, matching the 96px above the tagline. Narrow mobile viewport not independently re-verified this session (browser resize tooling limitation) - worth Shawn's own phone check when convenient.

**Functional audit - mostly good news, one real gap:** Shopping Cart and Quote & Estimate Payments add-ons (flagged "UNKNOWN" in an old note) are both confirmed fully built and working. Contacts CRUD is fully built (an old "not built" note was stale). Inbox is still a bare redirect to Leads, but nothing markets it as a distinct feature, so not currently misleading - just dead code. **One real flag, not fixed - needs a product/pricing decision:** the `menu_display` add-on ($10/mo) still gates nothing anywhere in the code (confirmed by grep - the feature-access check exists but nothing ever calls it), same as the July 20 audit found. This is a paid SKU with zero functional effect. Already logged as "Decisions needed" in this file's backlog; still needs Steve/Shawn to decide whether to build real gating, fold it into a plan tier, or stop charging for it.

---

## 2026-07-29 - GO for Open Self-Serve Launch

Shawn asked directly: is anything critical left, can we launch today? Checked the full P0/P1 list from `LAUNCH_READINESS_AUDIT_2026-07-20.md` against everything shipped since. All 5 P0 blockers are fixed. Remaining P1s (security headers, automated tests, hero image optimization, checkout webhook fallback, Stripe/RLS audits) are real but non-blocking - most already deliberately deferred. The one real gap: July 20's "no-go" verdict was written before that day's P0 fixes landed, and nobody had recorded an updated verdict since. Closed that gap with a formal team review - see `LAUNCH_READINESS_AUDIT_2026-07-29.md` and `DECISIONS.md`. **Verdict: GO.** Open self-serve launch is approved as of today.

---

## 2026-07-29 - Two Open Questions Closed

Shawn answered both outstanding items from the July 28 pending-decisions block:
- **3 pending clients:** confirmed the only blocker was the Edit My Site design work, which is now shipped and closed. No other blocker exists - nothing further to chase here.
- **Sentry + uptime monitor:** Shawn approved. Since account creation needs his own identity/email, he's signing up for both himself (Sentry DSN, plus a monitor on `foundco.app` and `my.foundco.app` via Better Uptime or UptimeRobot) and will hand over the DSN/API key. Once received, next session should install the Sentry SDK, add env vars via Vercel API, redeploy, and build the Found HQ "Health" page surfacing both.

---

## 2026-07-28 - Launch Punch List: All 7 "Yellow Gap" Items Fixed

Shawn wants to launch and asked for a plain-language list of what's actually still risky, then said "let's fix them all with the team deciding directions." All 7 done and pushed tonight, in order:

1. **Comp-link secret decoupled from ADMIN_KEY.** The `?comp=` onboarding bypass used to validate against the same key that unlocks `/admin/businesses` and `/admin/photos` - a leaked comp link could've granted full admin access, not just a free signup. Now validates against a dedicated `COMP_LINK_SECRET`, set on Vercel (production + preview) via API and in `.env.local`. **Old comp links built with the admin key are now dead** - intentional, they're invalidated by this fix. Corrected stale instructions further down this file that told people to use the admin key as the comp token.
2. **CI build check added** (`.github/workflows/build.yml`) - **DONE and CONFIRMED GREEN.** Runs the production build automatically on every push/PR instead of relying purely on manual QA. Simplified per Shawn's catch: rather than duplicating 16 individual secrets into GitHub, the workflow uses the Vercel CLI (`vercel pull` + `vercel build`) to pull this project's real env vars straight from Vercel at build time - Vercel stays the single source of truth. Shawn added the 3 needed GitHub secrets (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`) himself. First two runs failed - root cause: the workflow pulled the **Preview** environment, but a few real vars (`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`) are only saved under **Production** in Vercel, not Preview. Fixed by pulling Production instead (build #5), then verified green on the very next push (build #6) - Shawn confirmed via screenshot of the Actions tab. **This closes out the full 7-item punch list - all confirmed done, not just shipped.**
3. **Search + collapsible categories added to Shop/Menu editor**, search added to Services (once a business has 7+ services). Was one long always-expanded scroll with no way to search - now scales to a real catalog. Small catalogs (Lucky, Rosa's) look and behave exactly as before.
4. **AI rewrite fallback is disclosed, and now rate-limited.** `regenerateSection` returns `usedFallback: true` when the real Anthropic call failed and generic template copy was used instead - owner used to have no way to know. Surfaced via a new calm/neutral toast (`flashSaveNotice`, distinct from the red error toast since nothing actually failed). Rate-limited to 15/hour per company, reusing the existing `rateLimit.ts` already protecting public routes - previously unbounded.
5. **Basic format validation** on business email/phone (`SiteEditor.tsx`) and menu/product price. Rejects obvious garbage before it reaches the public site; the input visibly snaps back to the last valid value if a save is rejected, via a new return-boolean pattern in `saveBusinessField`/`BizInfoField`.
6. **Home's Main Button CTA picker now covers all 22 industries**, was only 5. Found and fixed a real bug in the process: the wellness bucket checked `industryCategory === 'pet'` but the actual manifest value is `'pet_services'`, so pet businesses were silently unmatched too. Grouped every industry into 4 buckets (food-like, appointment-like, shop-like, quote-like).
7. **Photo uploads are resized client-side before upload**, not just menu/product photos - extracted the existing onboarding-only resize helper (`resizeImageToJpeg`, canvas-based, ~10MB down to under 1MB) into `src/lib/resizeImage.ts` so it's reusable, wired into `handleMenuPhotoUpload`. Note: the general Photos-tab upload pool and the post-onboarding hero-photo-change flow still don't use this - only the two paths touched tonight (original onboarding hero upload, menu/product item photos) are covered. Flagging as a related gap, not fixed tonight.

All builds passed. Everything pushed to `main`.

Shawn QA next: try each fix - a garbage email/phone/price, a search in a catalog, an oversized photo upload, checking the CTA picker shows on a non-food/wellness test company. And the one action item that's actually his: add the GitHub secrets listed under #2 above.

---

## 2026-07-28 - Page Switcher: CLOSED, Shawn Confirmed Approved

Shawn reviewed the final screenshot (Lucky, all 6 Pages sections, panel open) and confirmed with the team: "ok lets leave it." **This closes out the page-switcher saga that ran across ~7 iterations this session and last** (pill row → anchored dropdown → bottom-sheet grid → full-screen takeover → full-width drop-down panel → scrim/flat-edge fixes → editing-context cues). Do not reopen or re-litigate this component without a new, specific complaint from Shawn - the design is approved as of this entry.

Final shape, for reference: `BackHeader` in `SiteEditor.tsx`. Trigger is the page title + chevron in the sticky section header (chevron rotates on open). Opens a full-width panel portaled to `document.body`, dropping down from directly under the persistent FOUND header and the trigger row (both stay visible, never covered), ~60vh tall, scrim only below the header/row (not covering them), flat green bottom edge, numbered list (01/02/03...) with big bold labels, checkmark on the active page, edit-pencil icon on the others, "Editing - jump to a page" caption label at the top of the list.

---

## 2026-07-28 - Page Switcher: Added "Editing, Not Browsing" Cues

Shawn's follow-up: happy with the direction but wanted Jony/Steve's read on whether the panel makes clear to a business owner that they're inside the admin tool mid-edit, not looking at a live preview of their real site - understandable worry since the panel's list is deliberately modeled on the public site's own nav (same page names, same big numbered treatment). Team's proposal, built and shipped: a quiet caption label at the top of the list ("Editing - jump to a page") and a small edit-pencil icon on every inactive row (checkmark still owns the active row). Small, doesn't fight the bold list, but unmistakable regardless of what the eye lands on first. Build passed.

Shawn QA next: open the switcher and judge whether it now reads clearly as an editing tool rather than a site-preview menu.

---

## 2026-07-28 - Page Switcher: Scrim Was Hiding the Header It Should Have Left Alone

Shawn's screenshot of the drop-down panel showed two real bugs, not taste: (1) the scrim was `inset: 0`, covering and dimming the persistent FOUND header and the trigger row above the panel too - defeating the entire point of keeping them visible - now starts at the panel's own top offset instead. (2) the panel's bottom edge was rounded; should be a flat line matching the persistent header's own flat top green bar - rounding removed. Build passed.

Shawn QA next: confirm the FOUND header and "Home ⌄" row stay fully visible (not dimmed) with the panel open, and the bottom edge reads as a flat green line, not a curve.

---

## 2026-07-28 - Page Switcher: Drop-Down Panel Instead of Full-Screen (4th iteration)

Shawn's core objection to the full-screen version, even after the stacking-context bug was fixed: this is the *admin* tool, not the customer's public website - taking over the whole screen made it feel like leaving the app entirely, with no context that you're still mid-edit. Held the Jony-led meeting he asked for before touching code, landed on:

- Persistent FOUND header **and** BackHeader's own back-chevron/title row both stay visible at all times - the panel drops down *under* them, never covers them.
- Full-width panel, ~60vh, with the real page dimmed (not hidden) behind it via a scrim - same convention the photo picker sheet already uses, just flipped to drop from the top instead of rise from the bottom.
- Green accent moved from the panel's left edge to its bottom edge - a left stripe sitting directly under the persistent header's own top green line read as two competing brand marks.
- The trigger itself (the page title + chevron) is now the open/close control - chevron rotates 180 on open - so the separate "Pages" label + X close button that used to live inside the panel is gone, it was redundant.
- Panel's vertical offset is measured live via `ResizeObserver` on the trigger row (same pattern as `--found-header-h`), not a guessed pixel constant.
- List content itself (numbered rows, big bold labels, checkmark on active) unchanged throughout every iteration - that part was never the complaint, only the container shape was.
- Build passed.

Shawn QA next: open the switcher and confirm the FOUND header and the page-title row both stay visible above it, the real page is visible (dimmed) below it, and it reads as "an overlay on this page" rather than "I left the app."

---

## 2026-07-28 - Page Switcher: Fixed a Real Stacking-Context Bug, Not Just Restyled

Shawn sent screenshots of the full-screen switcher with a large dead zone at the top and no visible close button - "not happy yet." This turned out to be a genuine bug, not a taste call:

- **Root cause (Craig):** the panel was rendering nested inside `BackHeader`'s own `position: sticky` wrapper. A fixed-position child nested inside a positioned+z-indexed ancestor has its z-index trapped within that ancestor's local stacking context - it can never out-rank a completely different element elsewhere in the tree (the persistent dashboard header, z-index 40) no matter how high its own z-index is set. The persistent header was rendering on top of the panel's own header row (the "Pages" label and close button), hiding them entirely - that's what looked like empty space.
- **Fix:** portaled the panel straight onto `document.body` via a `Portal` helper - the exact same pattern already used elsewhere in this codebase (`LeadContactSheet`, `ActivateOverlay`, etc.), so this wasn't a new technique, just one that should have been used here from the start.
- **Also (Jony):** switched the list from vertically centered to anchored at the top - centering looked accidental once the bug is fixed, since item count varies by industry (5 vs 6 sections) and there's no bottom CTA content to balance the composition the way the public site's version has.
- Build passed.

Shawn QA next: open the switcher and confirm the "Pages" label + close button are now visible at the top, and the list starts right below them instead of leaving dead space.

---

## 2026-07-28 - Page Switcher Rebuilt Again: Full-Screen, Matching the Public-Site Nav

Shawn rejected the bottom-sheet version outright ("completely horrible") and pointed to the exact reference he wanted: the public tenant site's own hamburger menu (`src/components/Navbar.tsx`, the bold/modern variant) - full-screen dark takeover, brand-accent left stripe, big bold numbered list (01/02/03...) with hairline dividers.

Held the team discussion Shawn asked for (Jony/Steve) before touching code:
- **Jony:** carry the visual language over directly - full-screen takeover, huge numbered list, dark panel - since that's the "modern, shows off" quality that was missing.
- **Steve:** flagged the public hamburger's slow 320ms slide + staggered per-item cascade is earned because it's a rare, one-time reveal for a first-time visitor. This switcher gets tapped constantly during an editing session - full cinematic motion every tap would read as friction, not polish.
- Landed on: same visual DNA, fast/snappy motion (190ms, no stagger) instead of cinematic. Confirmed with Shawn via explicit choice before building.

Built and shipped: `BackHeader`'s page switcher is now a `position:fixed inset:0` full-screen panel (`#111111`, 3px green left stripe), header row with "Pages" label + bordered X-close button, and the six sections as a big numbered list (12px green index, 28px/900-weight labels, hairline dividers, checkmark on the active one). Build passed.

Shawn QA next: open the switcher and confirm it actually reads as Found-quality this time, and that the faster motion still feels responsive rather than abrupt.

---

## 2026-07-28 - Page Switcher Rebuilt as a Bottom Sheet, Not a Bigger Dropdown

Shawn's follow-up on the dropdown elevation from earlier today: "you just made it bigger, that doesn't solve the issue... needs to look modern." Fair - the fix was cosmetic, not structural. Rebuilt the interaction itself:
- Trigger no longer looks like a button/pill - reads as a page title (20px/800 weight) with a small round chevron hint, not a UI control trying to look important.
- Tapping it opens a full bottom sheet (same scrim/shape/shadow as the existing photo picker sheet) with pages laid out as a 2-column grid of large tappable cards instead of a cramped anchored list - bigger touch targets, checkmark on the active page.
- Deliberately reused the photo picker's existing sheet pattern rather than inventing a third distinct control, so this reads as consistent with the rest of the app.
- Build passed (one transient Google Fonts fetch failure on first attempt, unrelated to the change - retry succeeded).

Shawn QA next: open the Pages switcher and judge whether this actually reads as modern/Found-quality now, not just bigger.

---

## 2026-07-28 - Video Thumbnails Fixed, Photo Sheet Extended, Dropdown Elevated

Shawn confirmed the design is "top notch... just needs some finessing" and flagged three specific things:

- **Blank video thumbnails "everywhere"** - root cause was `preload="metadata"` with no autoplay, the exact same bug already fixed in the Photos grid on July 19 (that fix never got applied to `SiteEditor.tsx`). Added a shared `VideoThumb` component (autoplay/loop/`preload="auto"`, fades in on `onLoadedData`/`onCanPlay`) and swapped it into all 4 spots that had the broken pattern: Home's small header-photo row, the "Photos around the site" slot covers, the Featured Update image, and the photo picker grid itself.
- **Photo picker sheet felt like a short bottom sheet** - was capped at `min(78dvh, 680px)`. Changed to anchor its top edge just under the safe-area inset (Dynamic Island) instead of capping height - now reads as a real full-page surface, same as the text editor sheet.
- **Pages dropdown switcher "felt weak, generic, not Found quality"** - fair complaint: 13px text, thin padding, flat panel. Elevated to Found's real type scale (15px/800 weight), added a green glow on the trigger when open, gradient panel background, bigger rows, and a checkmark on the active section instead of relying on color alone.
- Build passed clean.

Shawn QA next: assign a video to any photo slot and confirm a real frame shows, not blank. Open the photo picker and confirm it now reaches near the top of the screen. Open the Pages dropdown and judge if it now feels like it belongs to Found.

---

## 2026-07-27 - END OF SESSION WRAP - read this first, then the dated entries below for detail

Shawn is signing off for the night. Everything below is committed and pushed to `main` (last commit `b56bf2c`, verified clean working tree). This entry is the fast-read summary of the whole session; the dated entries below it (same day) have full detail on each piece if you need it.

### What shipped tonight, in order
1. Sticky section back-nav (was scrolling away, now pinned under the header).
2. Slimmed the "View live site" row from a card into a plain link.
3. Lateral nav between the 6 Pages sections - built as a horizontal pill row first, then **replaced** with a dropdown switcher (pill + chevron, same visual language as the company switcher) after Shawn found the pill row too big/redundant.
4. **Horizontal overflow bug on Home/About - fixed twice.** First attempt (`overflow-x: clip` + pill-row width guard) was wrong and shipped without real verification - Shawn caught it still broken. Second attempt was properly root-caused with an isolated iframe measurement at real mobile width: bare `display: "grid"` (no `gridTemplateColumns`) sizes its column to the max-content width of the longest unwrapped text, ignoring nowrap/ellipsis entirely. Converted 7 affected wrappers to `flex`/`column`. **Verified this time** - 5 overflowing elements before, 0 after, measured directly, not guessed. **Lesson for next session: don't claim a CSS fix works without measuring it.**
5. Contact page rebuilt as one flowing surface with hairline dividers (`EditRowGroup`/`EditRow`) instead of stacked bordered boxes, matching a precedent already set by the Estimate builder rebuild in July.
6. Removed confusing "Tap to edit" label on the hub.
7. Every tappable hub card (6 Pages tiles, Business Info, 2 Site-wide tiles) got a visible chevron - simplified per Shawn's feedback from a filled circle badge down to a bare chevron glyph.
8. Company switcher (top of every dashboard page, not just Edit My Site) de-buttoned into a plain text link, then given back a small caret next to the name after Shawn asked how other products (Slack/Notion/Stripe) signal "this is swappable" - underlined text alone doesn't carry that meaning, name+caret does.
9. **Real code audit** of `SiteEditor.tsx`/`actions.ts` (not a visual review) found: nearly every save path showed "Saved" without checking whether the write actually succeeded, and destructive Removes (service/category/menu item) had no confirm step. Both fixed - saves now roll back and show an error toast on failure; deletes now go through a shared confirm sheet.

### Decided and closed
- Pill-row nav → dropdown switcher (Shawn's call, built and confirmed working).
- Chevron badges simplified to bare glyphs, no circle (Shawn's direct feedback).
- Company switcher: text link + caret, not a button (Shawn's call, built).
- Contact's flowing-surface treatment approved as the pattern going forward *if* it holds up - not yet extended to About/Services/Shop/Gallery, pending Shawn's reaction.

### Explicitly deferred - real, not forgotten, needs its own scoped session
- **Shop/Services at scale** - no search, no category collapse. Will genuinely break with a real catalog (100+ products). This is a missing capability, not a style issue. Still unknown whether this is what's actually blocking Shawn's 3 pending clients - **that question was asked twice this session and never answered**, worth asking again first thing.
- **Instant company-switching** - the switcher is still a full-page navigation to `/select`, not a live inline dropdown. Making it instant is real architecture work touching every dashboard page; deliberately not risked right before a demo.
- **AI rewrite silently falls back to generic template copy on failure**, no disclosure to the owner that it happened. No rate limit on AI rewrite calls either.
- **No format validation** on email/phone/price fields - garbage can reach the public site.
- **No file-size check** before photo upload.
- **Zero accessibility labels** anywhere in `SiteEditor.tsx`.
- **Home's "Main Button" CTA picker** only exists for food/wellness-adjacent industries - silently absent for every other industry with no explanation.

### Pending Shawn's decision - do NOT proceed without explicit approval
**Error monitoring + alerting, requested this session, not yet built.** Shawn wants: email alerts the moment anything fails (onboarding, any page/action, any individual customer site), plus a monitoring view inside Found HQ admin. Team recommendation (Craig/Priya): don't build this from scratch - adopt Sentry (application error tracking) + an external uptime monitor (Better Uptime/UptimeRobot-class tool, must run outside our own infrastructure to be meaningful), both have free tiers sufficient for this scale, then build a lightweight Found HQ "Health" page that surfaces both in one place. **Open question Shawn has not answered yet: is he good signing up for two new third-party services under his accounts?** That's a real decision point, not a build detail - ask before doing anything here.

### Immediate next steps for whoever picks this up
1. Ask Shawn (a) what's actually blocking his 3 pending clients, and (b) whether he approves the Sentry + uptime-monitor sign-up.
2. Get his mobile QA on tonight's shipped changes (see individual entries below for exact test steps per feature).
3. Once scope is confirmed, the error-monitoring build is the next major piece of work.

---

## 2026-07-27 - Company Switcher: Added Back a Small Caret

Shawn asked how other products make "click here to switch entities" feel intuitive. Precedent: Slack/Notion/Stripe all pair the current entity name with a small caret directly next to it - that pairing is the actual signal, not underlined text alone (underline reads as "more info," not "swap this"). Added a 10px caret next to the company name; still no pill/background/button, still a plain link to `/select`. Build passed.

---

## 2026-07-27 - Simplified: Plain Chevrons, Company Switcher as Text Link

Shawn's direct follow-up on the chevron/switcher pass: drop the circular background (just wants a simple chevron), and make the company switcher a plain text link instead of a button. Both done - `TapChevronBadge` is now a bare 18px chevron, company switcher is an underlined text link (company name), no pill/background/icon. Navigation (`/select`) unchanged. Build passed.

---

## 2026-07-27 - Visible Chevron Badges + Company Switcher Restyled

Shawn liked the dropdown switcher but wanted every tappable card to look tappable, and flagged that the company switcher (top of dashboard) and the new section switcher now read as two stacked dropdowns. Team-approved split: ship the safe visual fixes now, hold "make the company switcher truly instant" (a real architecture change touching every dashboard page) for its own session rather than risk it right before Shawn shows this to 3 prospects.

- New shared `TapChevronBadge` (filled 28px circle, high-contrast chevron) replaces the previously-nonexistent affordance on the 6 Pages tiles + 2 Site-wide tiles, and the previously tiny/30%-opacity one on Business Info.
- Company switcher's down-chevron swapped for a switch/swap icon - it's a link to `/select` (full page), not an inline dropdown, so it shouldn't visually promise the same instant behavior as the new section switcher. Purely a glyph swap, zero change to its underlying navigation.
- Build passed.

**Explicitly deferred:** making the company switcher an actual instant inline dropdown (client-side company switching without a page reload) - real work across every dashboard page, not a styling pass. Also still deferred from earlier: Shop/Services search + category collapsing for scale.

Shawn QA next: confirm every hub card now has an obvious chevron, and that the top company switcher no longer looks like a copy of the new section dropdown.

---

## 2026-07-27 - Team Audit: Silent Save Failures + No-Confirm Deletes, Fixed

Full-code audit of Edit My Site (not a visual review - actual read of `SiteEditor.tsx`/`actions.ts`) found real gaps beyond polish. Steve's priority call: fix the two that lose real work or create false confidence, queue the rest.

**Fixed this pass:**
- Every save path except the menu/product editor showed an optimistic "Saved" pulse and discarded the server action's actual result. A failed write (RLS error, network blip) meant the owner believed their change was live when the site never updated. All save paths (`saveEdit`, `saveConfigField`, `toggleFeaturedUpdate`, services, business info, photo assignment, stock photo removal, menu photo upload) now check the result, roll optimistic state back on failure, and show a shared save-error toast.
- Removing a service, a whole product/menu category (with everything inside it), or a menu/product item was one instant tap next to Edit, no confirm, no undo - a mis-tap destroyed real content permanently. Added a shared confirm-before-delete sheet, wired into all three. Left low-stakes actions (stock photo removal, gallery photo unassignment - which just clears a section tag, doesn't delete the photo) without a confirm step deliberately, so as not to add friction to frequent low-risk taps.
- `cmd /c npm run build` passed.

**Explicitly still open from the audit, not forgotten:** AI rewrite silently falls back to generic template copy on failure with no disclosure to the owner; no rate limit on AI rewrite calls; no format validation on email/phone/price fields; no file-size check before photo upload; zero accessibility labels in this file; the "Main Button" CTA picker on Home only exists for food/wellness industries, silently absent for everyone else. None of these are launch-blocking per the team's read, but they're real and tracked.

Shawn QA next: trigger a save with the network off (or throttled) somewhere in Edit My Site and confirm the error toast appears instead of a false "Saved." Try removing a service/category/menu item and confirm the new confirm sheet appears before anything is actually deleted.

---

## 2026-07-27 - Section Nav Redesign + Tap-to-Edit Label Removed

Shawn approved the Steve-led team review (see prior entry below) and asked to move fast - he has 3 clients ready to go, currently blocked. Built the two ready-to-ship items same session:

- Removed the "Tap to edit" hint text next to Pages on the hub - Shawn (technical user) tapped it expecting a control; a fake-looking control teaches owners the UI is unreliable.
- `BackHeader`'s back-row + separate scrolling pill strip is now one row: back chevron left, dropdown switcher right (same pill+chevron visual language as the company switcher), opens a short list of the other 5 Pages sections. Half the vertical space, familiar pattern, same lateral-jump capability the pill row gave.
- Build passed clean.

**Deliberately NOT built yet:** Shop/Services search + collapsed categories for scale (Marcus/Steve's item from the team review). This is real, scoped feature work - not something to bolt on fast alongside everything else, especially with live clients about to depend on this. Needs its own session once Shawn confirms it's actually what's blocking his 3 pending clients (it may not be - worth asking before assuming).

Shawn QA next: reload Edit My Site, confirm the Pages hub no longer has the confusing label, and open any section to confirm the new dropdown switcher (chevron + section name, top right of the section header) opens a list and jumps correctly.

---

## 2026-07-27 - Horizontal Overflow: Actually Root-Caused and Verified This Time

Shawn correctly called out that the earlier "fix" (`overflow-x: clip` + pill-row width guard) did not work - Home and About were still cut off in his next round of screenshots. That earlier fix targeted the wrong thing. Root-caused properly this time with a real measurement, not another guess:

**Real cause:** every `display: "grid", gap: N }}` wrapper in `SiteEditor.tsx` that had no `gridTemplateColumns` was creating a single implicit grid column sized to `auto`. An `auto` grid track sizes to the **max-content** width of its widest child - and max-content sizing ignores `white-space: nowrap`, `overflow: hidden`, and `text-overflow: ellipsis` entirely, because those are rendering properties, not sizing properties. Any row holding a long unbroken string (Home's supporting line, About's full story paragraph, the Featured Update body) blew that column hundreds of pixels past its container. Since `overflow: hidden` sits on the *outer* card, the excess just gets silently clipped/cut off instead of scrolling - exactly what Shawn's screenshots showed.

**Why only Home and About, despite every section sharing the same new pills row:** the pills row is present on all six Pages sections, but only Home and About happen to have long enough unbroken text to trigger the bug. Contact/Shop/Services/Gallery never had it - Services in particular was already using `flex`/`column` instead of bare `grid`, which is why it was always fine. That's what the earlier fix missed.

**Fix:** converted the 7 affected bare-`grid` wrappers to `display: "flex", flexDirection: "column"` (Home's card, Home's photo-slot list, Home's Featured Update block x2, About's wrapper, Contact's wrapper, Business Info's wrapper) - same pattern Services already used successfully.

**Verified, not assumed this time:** built an isolated HTML reproduction of the exact markup at a real 390px width (Chrome DevTools window resize wasn't cooperating, used a same-origin iframe sized to 390x900 instead to force a true narrow viewport) and measured `element.getBoundingClientRect()` against `parent.getBoundingClientRect()` directly in the console. Before the fix: 5 elements overflowed their parent by up to 196px. After the fix: zero. `cmd /c npm run build` also passed.

---

## 2026-07-27 - Contact Page Mockup: Flowing Surface Instead of Stacked Bubbles

Shawn asked Jony to lead a team read on why Edit My Site "feels antiquated... a lot of wrappers and bubbles" even after the Home-matching pass. Jony's read: Home itself has this pattern (Live Preview card + 5 more separate bordered boxes below it) - matching Home spread the bubble-stack further instead of questioning it. Found real precedent already in this codebase: the Estimate builder had the identical complaint in July ("filling out a database... five bordered boxes") and the shipped, Shawn-approved fix was collapsing separate boxes into one continuous surface with hairline dividers.

Built as a **Contact-only mockup for review, not yet applied anywhere else**:
- Removed the "Live Preview" card - it duplicated the same copy already shown in the row below it, which is likely a real contributor to the "too many bubbles" feeling (same content rendered twice).
- Page label / Headline / Supporting line are now one `EditRowGroup` (single bordered surface, hairline divider between rows) instead of three separate bordered boxes.
- Tapping a row still opens the existing full-screen edit sheet - deliberately did not touch that, it was its own hard-fought, already-approved July iteration.
- Build passed clean.

Shawn: this is explicitly a pilot for your reaction, not a direction I've committed to everywhere. If it lands, About/Services/Shop/Gallery would get the same treatment next; if not, we regroup on what "less antiquated" actually means to you.

---

## 2026-07-27 - Edit My Site: Horizontal Overflow Fix

Shawn's screenshots after the lateral-nav ship showed Home and About fields cut off mid-line, and the page scrollable sideways revealing blank space. Fixed same session:

- Added `overflowX: "clip"` on the `SiteEditor` root (guards against any descendant stretching the page past the viewport, without turning the page into its own vertical scroll container - `clip` doesn't have the side effect `hidden` has of forcing `overflow-y: auto`, so the sticky `BackHeader` keeps tracking the shared document scroll).
- Added explicit `width: "100%"` / `boxSizing: "border-box"` to the new Pages pill row - the prime suspect, since it's the one thing common to every affected view and nests a `overflow-x: auto` scroller inside a `position: sticky` ancestor with no explicit width, a combination that can misbehave on real WebKit even though it's spec-correct.
- `cmd /c npm run build` passed. **Could not get live visual confirmation this session** - local browser tooling (Chrome extension connection) was unreliable and I wasn't able to reproduce/verify in an actual mobile viewport before pushing. Root cause is a reasoned best guess, not a confirmed repro.

Shawn QA next (important - this one isn't verified): reload Lucky's Home and About sections on iPhone, confirm nothing is cut off and the page no longer scrolls sideways. If it's still happening, screenshot again - the fix may not have hit the actual cause.

---

## 2026-07-27 - Edit My Site Sections: Lateral Nav + Home-Matched Visual Treatment

Shawn's follow-up mobile QA after the sticky-nav fix: sections still felt "robotic" next to Home, and jumping between sections meant going back to the hub every time. Team meeting (Jony/Steve leads, per Shawn's explicit ask), direction approved, built same session:

- **Jony's read:** Home got its full redesign (Live Preview hero card, plain-noun row labels, explicit green "Edit" pills). About/Contact/Services/Shop/Gallery never got that pass - they're still the older plain bordered-box form pattern with command-verb labels like "Change your story," "Change page label." That gap is the "robotic" feeling.
- **Steve's read:** Back always returned to the hub, forcing a hub detour to move between sections (About -> hub -> tap Contact).
- **Built, both approved directions:**
  1. **Lateral Pages nav** - the sticky `BackHeader` on Home/About/Contact/Shop-or-Menu/Services/Gallery now carries a horizontal pill row (`pagesNavItems` in `SiteEditor.tsx`) so owners jump directly between those six sections without detouring through the hub. Business Info and Domain are intentionally excluded (not part of "Pages").
  2. **About and Contact matched to Home's language/visual pattern** - added a shared `PreviewCard` (Contact) / inline live-preview block (About) showing the actual current copy above the edit controls, and a shared `EditRow` component (plain-noun label + value + explicit green "Edit" pill, same look as Home's rows) replacing the old "Change your story / Change page label / Change headline / Change supporting line" command-verb buttons.
  - **Scoped deliberately:** Services, Shop, and Gallery were left visually as-is this pass - they already render real content (service cards, product photos, gallery photos), not blank form fields, so they didn't have the same "robotic" gap as About/Contact. They did get the lateral nav.
- `cmd /c npm run build` passed. `git diff --check` passed.

Shawn QA next: on Lucky, use the new Pages pill row to jump About -> Contact -> Shop -> Services -> Gallery -> Home directly (no hub detour). Open About and Contact and confirm the live-preview block shows the real current copy above plain-labeled Edit rows ("Story," "Page label," "Headline," "Supporting line" - not "Change ___"). Confirm editing still saves correctly through the same sheet as before.

---

## 2026-07-27 - Edit My Site Hub: Sticky Back Nav + Slim Site Link

Shawn ran mobile QA on the new three-tier Edit My Site hub (Lucky) and flagged two things via screenshots. Team read (Jony/Steve/Craig) approved by Shawn same session, then built:

- **Sticky section back nav:** The green "< [Section]" back header on every drilled-in view (Home, About, Contact, Shop/Menu, Services, Gallery, Business Info, Domain) used to scroll away with the page content, so getting back to the hub meant scrolling all the way to the top - not practical on longer sections like Gallery or Services. `BackHeader` in `SiteEditor.tsx` is now `position: sticky`, pinned just below the main dashboard header at all times, iOS Settings-style. Offset is measured live off `.found-dashboard-header`'s real height via a `ResizeObserver` (`--found-header-h` CSS var, same pattern as the existing `--found-visual-height` var) so it stays correct across devices/safe areas and collapses to 0 on desktop where that header is hidden.
- **Site-link row de-emphasized:** The "Lucky / lucky.foundco.app" row at the top of the hub was a full card with a 46px thumbnail - same visual weight as the Pages tiles below it, for an action that just opens the live site. Replaced with a slim inline "View live site · lucky.foundco.app" text link, no card/thumbnail.
- `cmd /c npm run build` passed. `git diff --check` passed.

Shawn QA next: open Dashboard > More > Edit My Site on mobile (Lucky). Confirm the top site-link now reads as a light text link, not a card. Open Home/About/Contact/Shop/Services/Gallery, scroll down, and confirm the "< [Section]" back bar stays pinned under the FOUND header the whole time instead of scrolling away, with no gap or overlap against the header above it.

---

## 2026-07-26 - Current Handoff
- Site editor top/homepage slate rebuilt after team review: hidden tap zones were replaced with clear owner-facing controls for headline, supporting line, main button, short hook, header photo, and AI rewrite.
- Site photo assignment now sits in a separate "Photos around the site" section for Header, About, Visit/CTA, Gallery, Featured Update, and Contact imagery.
- Build passed with `npm run build`.
- Pending QA: mobile test Dashboard > More > Edit My Site, confirm the new homepage controls are understandable, edit sheets still lock correctly, photo picker opens, and live site reflects saved edits.
## SITE EDITOR OWNER FLOW - July 26, 2026

Steve/Jony/Craig-approved direction after Shawn said the Edit My Site slate looked confusing and cheap.

- Removed the top four readiness/status cards.
- Top now says Edit website / Edit your website / Change what customers see on your live site.
- Homepage preview now leads the editor flow.
- Lower areas now use plain owner-facing labels: Featured Update, About, Contact, Menu/Shop, Services, Photos, and Domain.
- QA: production build passed; diff check passed after doc formatting cleanup.
- Shawn QA next: open `my.foundco.app > More > Edit My Site` and confirm the page feels clearer before moving to the next launch item.

---

## FEATURED UPDATE SMART DRAFT GUARD - July 26, 2026

Jony/Steve/Craig direction after Shawn flagged the public Featured Update could still feel generic or duplicate nearby page copy.

- Added shared Featured Update copy logic in `src/lib/featuredUpdate.ts`.
- Dashboard editor and public tenant site now use the same industry-aware draft system.
- Drafts use business type, sub-industry, services, menu items, and products where available.
- Old generic filler like "New in the shop" or "Share a sale..." is replaced before preview/live render.
- Public site checks nearby hero/about/shop/menu copy and changes or hides the Featured Update if it would repeat the same thought.
- Owner-written copy still wins unless it is blank or generic filler.
- QA: production build passed.
- Shawn QA next: Lucky/Rosa's/Construction/FRCC, toggle Featured Update off/on if old copy is stuck, then confirm live copy is specific and not redundant.

---
## FEATURED UPDATE PUBLIC REDESIGN - July 26, 2026

Jony/Steve-led direction after Shawn flagged the public announcement as weak and cheap.

- Renamed the owner-facing feature from Announcement to Featured Update in the dashboard editor.
- Removed the public "Announcement" label from tenant sites.
- Changed the live section from a boxed card to a full-width premium feature band.
- Added industry-aware public eyebrow language: retail/shop, food, bike shop, home services, nonprofit, events, and fallback.
- Turning the feature on now seeds useful industry-aware starter copy/button/link if the owner has not written any yet.
- Public site hides the section if the feature is on but no owner content/image exists, avoiding empty placeholder copy.
- QA: production build passed.
- Shawn QA next: Lucky > Edit My Site > Featured Update, toggle off/on, refresh live site, and confirm the public section feels integrated instead of boxed.

---
## LIVE ANNOUNCEMENT SCHEMA FIX - July 26, 2026

Craig found the launch blocker: the code and migration existed, but live Supabase was missing the announcement columns on `website_config`.

- Applied existing additive migration `database/migrations/048-site-announcements.sql` to live Supabase.
- Confirmed Lucky can now read `announcement_enabled`, title/body/button/style fields from the public company query.
- Set Lucky announcement back to on because Shawn had already toggled it before the schema existed.
- Verified `https://lucky.foundco.app` returns the announcement text in the live HTML.
- No app code changed in this fix.

---

## ANNOUNCEMENT EDITOR CLARITY - July 26, 2026

Team-approved pass completed for the dashboard announcement editor.

- Announcement editing now separates preview from controls: headline, message, button text, image, style, and destination are explicit.
- Cleaned visible corrupted labels in the site editor.
- QA: production build passed.
- Shawn QA next: Lucky > Edit My Site > Announcement. Toggle it on, edit headline/message/button text, switch Default/Light/Dark/Accent/Image, choose Shop/Products/Contact/Custom link, then View live site.

---
## PUBLIC WRITE RATE LIMITS - July 21, 2026

Team next step after the Safari Stripe popup fix: add the first bot/spam guard to anonymous write paths before launch traffic. Scope stayed narrow and launch-safe.

- Added `src/lib/security/rateLimit.ts`, an IP-aware in-process limiter with endpoint-specific keys and 429 responses.
- Covered public subscriber signup, booking create, shop checkout/complete, restaurant order checkout/complete, estimate pay/accept/decline, magic login, password login, website lead/reservation server actions, and reply links.
- Dashboard-authenticated CRUD was left alone for this pass.
- Caveat from Craig/Priya: this protects the current Node process. A distributed Supabase/edge ledger is the later upgrade if we need cross-instance abuse tracking.
- Test next: normal public form/order/payment actions should still work. Rapid repeated submits from the same browser/IP should get a clear "Too many attempts" response.

---
# SESSION_HANDOFF.md - Found Co. Current Truth
### Start here after `BRIEF.md`. Keep this short, current, and plain-English.
*Last updated: July 25, 2026*

---

## FINAL RECEIPT EMAIL CHECK - July 25, 2026

Shawn confirmed the final quick receipt/payment email check passed after the activation email polish.

Launch smoke checklist status:
- Safari shop/cart/payment-start smoke: passed.
- Fresh signup/payment and site-live email in Spark/Apple Mail: passed.
- Dashboard company switching: passed.
- Public lead/inquiry notification and clearing: passed.
- Final receipt/payment email check: passed.

Next: summarize launch readiness and decide whether to start driving traffic while continuing post-launch polish.

---
## LEAD NOTIFICATION CHECK - July 25, 2026

Shawn tested one public contact/lead path after dashboard switching.

- Public lead/inquiry submission worked.
- Dashboard red-dot notification appeared in the right place.
- The new lead was visible.
- The notification cleared after handling/viewing.
- Launch checklist item #4 is passed.
- Next test: final quick receipt/payment email check after the latest email polish.

---
## DASHBOARD SWITCHING CHECK - July 25, 2026

Shawn tested switching between businesses from the dashboard company picker after the activation email polish pass.

- Dashboard company switching works.
- Home/business context no longer appears stuck on the previous selected company during this check.
- Launch checklist item #3 is passed.
- Next test: one lead/inquiry notification path.

---
## ACTIVATION EMAIL POLISH - July 25, 2026

Shawn confirmed fresh signup/payment passed functionally, but the site-live email needed launch polish before continuing. Steve/Jony decision: activation is a paid trust moment, so the email must feel intentional and consistent in Spark and Apple Mail.

- Updated `src/lib/activationEmails.ts` so site-live and activation-reminder emails use one dark Found card instead of the fragile light header/card mix.
- Reused the existing `polishBusinessName` helper so lowercase test/business names render as display names in the subject and body.
- Cleaned the site-live copy: `Your site is now open for customers. You can view it, edit details, or manage new leads from your dashboard.`
- Primary/secondary buttons now read `Open Dashboard` and `View Site`.
- Build passes with `cmd /c npm run build`.
- Test next: trigger one new site-live email and inspect it in Spark and Apple Mail. Confirm the business name is title-cased, the card stays visually consistent, and both buttons work.

---
## PUBLIC SHOP/ORDER STRIPE LAZY LOAD - July 21, 2026

Shawn confirmed the Safari popup still appeared after Safari extensions and Hide IP Address were ruled out. Firefox and Safari Private still did not show it. Team read: the safest next code-side isolation is to keep Stripe completely out of public shop/order initial bundles until the customer intentionally starts payment.

- `ShopClient` now lazy-loads a new `ShopPaymentElement` only after the checkout API returns a Stripe client secret.
- `OnlineOrderClient` now lazy-loads a new `OrderPaymentElement` only after the order checkout API returns a Stripe client secret.
- Public shop/order browsing no longer imports `@stripe/stripe-js` or `@stripe/react-stripe-js` at module load.
- The already-related mobile order checkout sheet body-lock/visible-viewport fix remains in `OnlineOrderClient`.
- Build passes with `cmd /c npm run build`.
- Test next after deploy: normal Safari on Lucky/T-Shirts shop pages, browse/add/view details without starting checkout. Then start checkout separately.

---
## STRIPE ACTIVATION OVERLAY LAZY LOAD - July 21, 2026

Shawn confirmed the Safari popup still appeared in normal Safari after clearing data, while Firefox and Safari Private did not show it. Team read: normal Safari may still be triggering a preloaded activation chunk. Craig found `ActivateOverlay` still had a module-level `loadStripe(...)`.

- Removed module-level Stripe loading from `ActivateOverlay`.
- Stripe now loads from that overlay only after Found has a real activation client secret and is rendering the payment form.
- Build passes with `cmd /c npm run build`.
- Test next after deploy: normal Safari on Lucky/T-Shirts shop pages before checkout. If it still appears, investigate the public shop/order `PaymentElement` bundle next.

---
## STRIPE PREFETCH REMOVED FROM PUBLIC BROWSING - July 21, 2026

Shawn still saw iPhone Safari asking to download Stripe `inner.html` on Lucky and T-Shirts after the full header rollback. Team read: the headers were not the root cause. Craig found `PreviewBanner` was prefetching `ActivateOverlay`, and `ActivateOverlay` calls Stripe at module load.

- Removed the public preview banner's background `ActivateOverlay` import.
- Stripe should no longer be intentionally downloaded while customers are only browsing a public inactive/unactivated site.
- Activation still works; the overlay loads only after the owner taps the activate CTA.
- Test next after deploy: browse Lucky/T-Shirts shop pages on iPhone Safari without starting checkout. If the popup returns only after tapping payment, isolate the checkout `PaymentElement` path next.

---
## FULL SECURITY HEADER ROLLBACK - July 21, 2026

Shawn still saw iPhone Safari asking to download Stripe `inner.html` on Lucky and T-Shirts after the partial header hotfix. Team decision: remove all custom security headers and restore the exact pre-header `next.config.ts` behavior before continuing launch QA.

- Removed every custom global response header from `next.config.ts`.
- Build passes with `cmd /c npm run build`.
- Test next: after Vercel deploys this rollback, retry Lucky/T-Shirts checkout on iPhone Safari. If the download prompt remains, the issue is not the header change and the next investigation is the checkout/Stripe embed path itself.

---

## STRIPE SAFARI HEADER HOTFIX - July 21, 2026

After the launch security-header deploy, Shawn saw iPhone Safari ask to download Stripe `inner.html` on both T-Shirts and Lucky checkout screens. Team decision: rollback the risky header layer immediately.

- Removed CSP report-only, Permissions-Policy, and Cross-Origin-Opener-Policy from the launch header set.
- Kept only low-risk global headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and `Referrer-Policy: strict-origin-when-cross-origin`.
- Build passes with `cmd /c npm run build`.
- Test next: retry T-Shirts/Lucky checkout on iPhone Safari and confirm the Stripe `inner.html` download prompt is gone. After that, look at the 2-3 second Shop Online navigation delay.

---

## LAUNCH SECURITY HEADERS - July 21, 2026

Team next step after closing Found-side payment QA: add the first launch-safety browser header layer before more traffic. Implemented globally in `next.config.ts`.

- Enforced low-risk headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and `Cross-Origin-Opener-Policy: same-origin-allow-popups`.
- Added `Content-Security-Policy-Report-Only`, not enforced yet, so Stripe checkout/Connect, Supabase, Vercel analytics/live tooling, Google Places, media uploads, and blob previews are not blocked on launch day.
- Build passes with `cmd /c npm run build`.
- Next P1 after deploy smoke test: public write-route rate limiting / bot controls.

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

## PAY-LATER ESTIMATE QA VERIFIED - July 21, 2026

Shawn tested the exact current pay-later estimate path on Construction. The dashboard showed the accepted estimate as unpaid, with `Payment request sent` and the balance still due. This is the expected state: accepted/requested, not paid.

- Pay-later estimate path is now verified from Found-side UI evidence.
- Strict launch payment QA is complete unless Shawn wants a separate Stripe Dashboard reconciliation.

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
  1. **Comp link - zero card screen, ever.** Start onboarding at `https://foundco.app/onboarding?comp=<comp link secret>`. The company gets created already active. The final Reveal screen shows "Go to dashboard" instead of "Launch my site" - the business never sees a payment screen at all. Best for a clean demo, but only works if Shawn remembers to use that link.
     - **CORRECTED 2026-07-28:** this used to be `?comp=<your admin key>` - the same key that unlocks `/admin/photos` and `/admin/businesses`. That meant a leaked comp link could grant full admin access, not just a free signup. Fixed same day: the comp link now validates against its own dedicated `COMP_LINK_SECRET` env var, completely separate from `ADMIN_KEY`. Using the admin key as the `comp` value no longer does anything - it fails silently and the signup just proceeds as a normal paid flow. Get the current comp secret from Vercel env vars, not from the admin login key.
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

---

## July 24, 2026 - Magic Login Email Raw Link Fix

### What changed
- Fixed the dashboard magic-login email so the Supabase one-time auth URL no longer appears as visible blue fallback text at the bottom of the email.
- Kept the actual one-time login URL inside the green Open Dashboard button.
- Removed the visible raw auth URL.
- Restored polished arrow/dash rendering through HTML entities and removed the footer location that iPhone Mail auto-linked in blue.

### Team read
- Steve: launch polish bug; owners should see one clear button, not a technical token URL.
- Jony: raw auth URLs do not belong in a Found email.
- Craig/Priya: the token remains in the button href only; the visible email body no longer exposes it as text.

### Verification
- `git diff --check` passed with only the repo's normal CRLF warning.
- `cmd /c npm run build` passed.

### Test next
1. Request a new Found dashboard login email.
2. Confirm the email shows the green Open Dashboard button with a clean arrow and the expiration text.
3. Confirm there is no long blue Supabase URL at the bottom and no blue auto-linked Tucson footer.
4. Tap Open Dashboard and confirm it still signs you in.

---

## July 25, 2026 - Launch Smoke Test #1 Passed

### What passed
- Shawn completed launch checklist #1 on normal iPhone Safari.
- Lucky/T-Shirts shop browsing, cart, product details, and payment-start path passed without the Stripe `inner.html` download prompt returning.

### Current plain-English launch checklist
1. Safari shop check - PASSED.
2. Fresh customer signup - NEXT.
3. Dashboard company switching.
4. One lead/inquiry notification test.
5. One payment receipt check.
6. Found login email - PASSED.

### Next test for Shawn
1. Go to `foundco.app` as a brand-new business owner.
2. Start onboarding and create a test business.
3. Pick a paid plan and use the promo code if needed.
4. Pay.
5. Confirm it lands in the correct dashboard for that new business.

---

## July 25, 2026 - Site Announcements / Promotions

### What changed
- Added one premium announcement block owners can turn on from Edit My Site.
- Announcement supports title, body, button text, target link, visual style, and an optional image/video background.
- Public websites render the announcement below the hero across Impact, Editorial, Portrait, and Cinematic layouts.
- Announcement photos now have their own Website Photos slot.
- Copy polishing now protects announcement headline, body, button, and link fields.
- Database migration added: `048-site-announcements.sql`.

### Team decision
- Steve/Jony direction: one elegant promotion moment, not a cluttered banner stack.
- Angela direction: defaults should work without training; owners can leave it alone or customize it quickly.
- Craig/Priya/Marcus direction: store this as website config, render it once through shared layout infrastructure, and make it available to every template.

### Verification
- `cmd /c npm run build` passed before handoff update.

### Test next
1. Open `my.foundco.app` > Edit My Site.
2. Turn Announcement on.
3. Edit headline/body/button or leave the default.
4. Pick a destination chip such as Shop, Menu, Contact, Services, Estimate, or Reservations.
5. Optional: choose Image style and assign an Announcement photo.
6. Open the live site and confirm the announcement appears below the hero and the button goes to the right page.
### July 26, 2026 - Announcement QA Correction
- Fixed announcement defaults so generic retail/apparel shops no longer show bike/back-to-school language unless the business is bike-specific.
- Fixed the announcement editor preview contrast so Light, Default, Dark, Accent, and Image controls stay readable.
- Editing announcement fields now opens with the visible default copy instead of a blank field.
- Verified with `git diff --check` and `cmd /c npm run build`.

Test next: Open Lucky > Edit My Site > Announcement. Confirm the default says `New in the shop.` and Light/Dark/Default controls are readable.
---

## July 26, 2026 - Current Handoff: Edit Site Slate Pass

### Latest completed work
- The approved team direction for the whole Edit My Site slate is implemented.
- The page now opens with Site Studio readiness signals and clearer section language instead of relying on "tap to edit" labels.
- Section hierarchy now guides the owner through first impression, current push, page copy, shopping/ordering, services, photos, and launch trust.

### Verification
- `cmd /c npm run build` passed.
- `git diff --check` passed with only the normal CRLF warning.

### Next human QA
1. Open `my.foundco.app` as an owner.
2. Go to More > Edit My Site.
3. Confirm the new Site Studio header and readiness cards feel natural on iPhone.
4. Check each major section for clarity: Home, Featured Update, About, Contact, Products/Menu, Services, Gallery, Custom Domain.
5. If the pass feels good, continue launch checklist; if not, bring screenshots back to the team before coding.

---

## August 8, 2026 - Current Handoff: Photos Page Language + Placement Cleanup

### Latest completed work
- Team-approved Photos cleanup is implemented for launch.
- Heart now means Favorites only.
- Gallery is now an explicit photo action/tab for customer-facing gallery photos.
- Gallery/Favorites taps now show a short confirmation pill so owners know the tap worked.
- Thumbnail and full-screen photo actions now put Gallery before Favorites to match the tab order.
- Photos tabs now stay visible while scrolling.
- Main Photos tabs are now All Photos, Gallery, and Albums; Favorites moved into the All Photos filter row.
- All Photos filters now include All, Favorites, and Not on site.
- Add to Site now only places a photo on a specific website page/section.
- Featured Update was removed from the Photos placement sheet; owners should manage that from Edit Website.
- Website gallery was removed from the Add to Site sheet because Gallery is handled directly on photo thumbnails.
- Public Gallery now reads `in_gallery` photos only, instead of any `for_website` page-placement photo.
- Public Gallery no longer pulls old legacy `media` rows that could leave deleted test photos stuck online.

### Verification
- `cmd /c npm run build` passed.
- `git diff --check` passed with only the normal CRLF warnings.

### Next human QA
1. Open Photos for Ryan or Lucky.
2. Heart a photo and confirm it appears under Favorites.
3. Tap Gallery on a photo and confirm it appears under Gallery and on the live Gallery/New Arrivals area.
4. Tap Use on page and confirm the sheet only shows page photo choices like Home top photo, Home bottom photo, About page photo, Services page photo, Contact page photo, and Products/Menu page photo.
5. Confirm Featured Update is not offered from Photos anymore.
6. Scroll down and confirm the Photos tabs stay visible.
7. Confirm Favorites is a filter under All Photos, not a top-level tab.

---

## August 9, 2026 - Current Handoff: Photos, Jobs, Shared Job Pages

### Current repository state
- Branch: `main`.
- Last known pushed commit: `8048e91` (`Polish shared gallery photo viewer`).
- Working tree was clean immediately after the last push.
- Recent verification: `npm run build` passed after the code changes listed below.

### Latest pushed commits
- `07fa138` - `Unify dashboard loading states`
  - Added `src/components/dashboard/DashboardLoadingState.tsx`.
  - Replaced corrupted/plain loading states in dashboard route loading, Photos, Contacts, Requests/Leads, and Estimates.
  - Owner-facing loading should use the Found dark skeleton/spinner language, not raw `Loading...` text or mojibake.
- `45bb714` - `Simplify job gallery OG image`
  - Simplified shared job Open Graph image to focus on one project photo plus business identity.
  - Removed customer name and address from the OG image.
- `93c2b5c` - `Enlarge job OG logo`
  - Removed the left accent strip and brand tint overlay from the OG image.
  - Increased the business logo/fallback mark so it is visible in iMessage/Facebook cards.
- `b452593` - `Simplify shared job gallery page`
  - Added `src/app/[slug]/gallery/[album]/AlbumPhotoGrid.tsx`.
  - Removed the redundant business-name eyebrow above the public job title.
  - Hid service address from public shared job pages by default.
  - Kept customer name as internal/share context for now.
  - Made public job photos tappable.
- `8048e91` - `Polish shared gallery photo viewer`
  - Reworked the public shared job photo viewer into a black, full-screen, high-z-index viewer.
  - Uses `100dvh`, quiet close/count/previous/next controls, and no card-like rounded frame.

### Locked product decisions from the team
- Photos:
  - Heart means Favorites. It does not publish anything.
  - The four-square Gallery icon means the photo appears in the public website gallery/New Arrivals strip.
  - `Use on page` means place the photo on a specific website page/section.
  - Featured Update is managed from Edit Website, not from Photos.
  - Deleted/removed public gallery photos must not remain stuck online through legacy `media` rows.
- Photos layout:
  - Keep the dark Found photo-workspace language.
  - Filter opens as a compact dark popover near the filter button, not a white iOS glass sheet.
  - Tabs should stay visible while scrolling without dead air, gradients, or a half-visible header.
- Jobs:
  - For service industries, the third Photos tab is `Jobs`, not `Albums` or `Projects`.
  - Job creation starts with the job name, then customer name, address, phone, and email.
  - Job names should display in title case when presented to owners or shared publicly.
  - All Photos should include job photos too; Jobs are a workspace on top of the same photo library.
- Public shared job pages:
  - The public page title is the job name, such as `Kitchen Remodel`.
  - Do not repeat the business name as an eyebrow directly above the title because the logo/header already provides that identity.
  - Hide the street address by default for privacy. Add an explicit owner control later if showing the address becomes needed.
  - Tapping shared job photos should open a premium black lightbox/viewer.
- Shared link previews:
  - The OG image should not repeat job title, customer name, or address inside the image.
  - The OG image should be one strong job photo with the business logo/fallback identity.
  - The title/URL text below the image is handled by iMessage/Facebook metadata.

### Earlier work from this run that must not be lost
- Hamburger menu / How It Works issue:
  - Anchor navigation was unreliable after clicking other menu items.
  - Direction moved toward avoiding fragile anchors and using a dedicated How It Works page/flow where needed while preserving SEO/AEO/GEO.
- Template design:
  - Cinematic/wellness templates were improved, but the team standard is that templates and hero marketing imagery must match honestly.
  - Do not imply Google reviews or other unavailable features in template imagery.
  - Premium spa/salon templates should feel like the Found hero imagery, not generic stock layouts.
- Edit Website UX:
  - Replace technical labels with owner-facing language.
  - `Hero` language was rejected for owners; use plain language like `Homepage` / `First impression`.
  - Homepage editor order: first screen, main website button, featured update, automated services preview, final section before footer.
  - Homepage gallery/strip imagery should come from Gallery photos automatically, not be a confusing manual Home editor section.
  - Main website button and Featured Update button controls must clearly explain what customers see and where the button sends them.
  - Shop/Menu/Booking navigation and edit sections must be dynamic based on activated features/add-ons.
- Menu/order UX:
  - Prices should render as money, e.g. `$1.00`, not `1`.
  - Menu item cards need to handle missing photos gracefully without ugly fake illustrations.
  - Menu management should be one clear place for categories/items/photos/pickup-delivery and must scale to 30-50+ items.
- Spam/security:
  - Ryan spam/inquiry cleanup led to spam protection direction: invisible friction first, owner spam marking, rate limits/honeypots where appropriate.
  - Avoid CAPTCHA unless abuse requires it because it adds customer friction.
- Email signup:
  - Signup block appears only when email marketing is enabled for the business.
  - Subscribe flow was fixed enough for Lucky: Shawn subscribed and received an email.
  - Email dashboard still needs a premium pass: subscriber visibility, better QR wording, and branded emails.

### Jobs/service-industry pipeline
The team direction is to make Found Business feel lighter and better than CompanyCam for small service companies.

Core flow:
1. Owner or worker arrives at a job.
2. They create a Job with job name first, then customer name, address, phone, and optional email.
3. They capture photos directly into that Job.
4. The Job becomes a shareable branded client gallery.
5. The Job later connects to Estimates so photos/customer/address can carry into a quote.
6. If accepted, the customer pays through Stripe, then the Job can track work/progress/final payment.

Open implementation pipeline:
- Add an explicit cover photo selector for Jobs. Until then, first/primary photo may be used.
- Add photo notes inside a Job: after taking/uploading a photo, allow a short note for that specific photo.
- Add Job notes or scope notes for the overall job.
- Connect Jobs to Estimates:
  - From Jobs: create an estimate using this customer/address/photos.
  - From Estimates: attach or create a Job while writing the estimate.
- Add worker roles/permissions:
  - Default worker role: camera/job capture only.
  - Owner can grant estimates or broader permissions later.
  - Workers should not be able to publish website/gallery photos unless the owner grants that power.
- Add service-company search/filter:
  - Jobs by customer name, address, date, worker, and status.
  - Photos by job, worker/uploader, favorites, on site, not on site.
- Add shared-job privacy controls:
  - Default: address hidden.
  - Future: owner can choose whether client name/address show on shared link.
- Improve `Ask about this job`:
  - Should eventually open a contact form with job context instead of a generic contact page.
- Make Facebook/iMessage sharing reliable:
  - OG can be cached by platforms. When testing, use a new job/link or a cache-busting path if available.

### Next human QA
1. Open Photos on Barrio Builders.
2. Confirm the third tab says `Jobs` immediately, never `Projects`.
3. Create a new job with a mixed-case/lowercase name and confirm the owner-facing display is title case.
4. Confirm the Jobs list shows enough context to identify the job, ideally customer name and/or address under the title.
5. Open a job, tap Share, send it through iMessage, and confirm the preview has a clean photo/logo image.
6. Open the shared job page and confirm:
   - no redundant business-name eyebrow above the job title,
   - no street address shown by default,
   - photos tap open into the black full-screen viewer,
   - the page does not show corrupted loading text.
