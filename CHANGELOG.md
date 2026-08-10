## Session: August 10, 2026 - Real Bug: Job Photo Upload Was Single-File-Only + Mojibake Sweep
**AI:** Claude

### Found via Shawn's live testing
Testing a new HVAC job on his phone: the "Create" button showed garbled characters, and adding photos right after creating a job only allowed picking one photo at a time (iOS opened a single-photo preview instead of the multi-select grid), and confirming that selection did nothing - silently returned to the Jobs list with no photo added.

### Root causes
- The job-detail "Add photo -> Upload from Library" path (`photos/page.tsx`) is a separate, older upload entry point from the one fixed on 2026-08-09 - that earlier fix only touched the global nav FAB's upload flow (`DashboardNav.tsx`), not this one. This input had no `multiple` attribute and `handleUpload` only ever read `e.target.files?.[0]`, silently dropping everything else - that's exactly what produces iOS's single-photo preview instead of a multi-select grid, and a silent no-op when someone tries to pick more than one.
- The "Create" button text was literal mojibake in the source (`"Creatingâ€¦"` instead of "Creating...") - a UTF-8-as-Latin1 encoding corruption. Swept the whole `src/` tree for the same corruption pattern and found 4 more real user-facing instances beyond the one Shawn hit (a nav upload-failure toast, a job-name placeholder and Create button in the separate nav FAB quick-create flow, a camera delete-confirmation dialog, and a Pro-upgrade feature bullet). Left comment-only instances alone (harmless, invisible to users).

### Fixed
- `photos/page.tsx`: `handleUpload` rewritten to accept multiple files with the same bounded-concurrency pattern (`MAX_UPLOAD_BATCH`/`UPLOAD_CONCURRENCY`) already proven in the nav upload fix, plus a matching progress pill. File input now has `multiple`.
- All 5 real mojibake instances replaced with plain ASCII across `photos/page.tsx`, `DashboardNav.tsx`, `CameraSheet.tsx`.

### Verification
- `npx tsc --noEmit` and `npm run build` passed clean.

### Test next
1. Create a new HVAC job, confirm the "Create" button text renders clean.
2. Immediately add photos from Library, select several at once, confirm the multi-select grid appears (not a single-photo preview) and all selected photos actually upload with a progress pill.

---

## Session: August 10, 2026 - Jobs Round 1: Notes, Photo Notes, Cover Photo, Address Privacy
**AI:** Claude

### Built
Team-approved round 1 of the Jobs pipeline (job notes prioritized as the real gap - a job with only photos and no record of work performed isn't really a job tool - bundled with cover photo and photo notes since all three live on the same job-detail screen; granular worker permissions deliberately excluded and kept as its own future security-reviewed cycle).

- Migration 060: `photo_albums.notes`, `photo_albums.show_address_public` (default false), `company_photos.note`.
- Job-level notes: `JobNotesEditor` on the job detail header - tap-to-edit card, same pattern as the existing customer-details editor.
- Photo notes: tap-to-edit caption row in the dashboard photo viewer, job photos only.
- Cover photo selector: "Set as Cover" button in the photo viewer (job photos only, takes the Add-to-Site button's slot since site placement doesn't apply to job photos). This closed a real existing gap - `cover_photo_id` already existed in the schema (migration 050) but was never actually read or written anywhere; three different places (dashboard job list, the albums API's own cover computation, and the public Pro gallery list) were each independently guessing "most recent photo" instead. All three now prefer the owner's chosen cover photo when one is set.
- Address privacy toggle: checkbox in Job Details, off by default - shows the street address on the shared job link only when an owner explicitly turns it on. Scoped to address only; customer name continues to show on the shared link as before (that was intentional, not part of the gap).

### Verification
- `npx tsc --noEmit` and `npm run build` passed clean.

### Test next
1. On a job, set a cover photo from the photo viewer and confirm it shows in the Jobs list and the public gallery list.
2. Add job notes and a photo note, confirm both persist after reload.
3. Toggle "Show address on shared link" on, confirm the address appears on the public job page; confirm it's hidden when off (the default).

---

## Session: August 10, 2026 - Test-Account Discounts Were Getting Wasted on Proration Invoices
**AI:** Claude

### Built
- Root-caused why Taco Shop showed $69/mo billed after its Starter -> Business upgrade, despite having used a promo code. The existing test-discount coupons (`found_1_first_invoice`, `found_business_1_first_invoice_68_off`) are `duration: once` - they discount whichever Stripe invoice comes next, no matter what it is. The upgrade happened mid-cycle, so the next invoice was a near-$0 proration adjustment; the discount got consumed there instead of a real bill, leaving the subscription at full price afterward. Confirmed against live Stripe invoice and subscription data (not assumed).
- Built new `duration: forever` coupons scoped to internal test accounts only, leaving the real-customer once-off onboarding coupons untouched: `found_1_forever_business` ($68 off Business/mo) and `found_1_forever_pro` ($38 off Pro/mo).
- Created promotion code `F0UND1138` -> `found_1_forever_pro`, fulfilling the original ask for a Pro-plan test code that lands at $1.
- Applied `found_1_forever_business` directly to Taco Shop's live subscription; confirmed the discount is attached with no end date.

### Final resolution - practice accounts moved off Stripe billing entirely
- Shawn clarified the underlying intent: test coupons were covering two different needs that deserved different tools - his own practice accounts vs. real network/referral/trade promos.
- Practice accounts don't need a discounted Stripe subscription at all - `is_comp` (`toggleComp()`, already built in `admin/businesses/actions.ts`) marks an account fully active in the app's own database, independent of Stripe.
- Canceled 11 real live Stripe subscriptions (Audio Pro, Hats, Hvac, Lucky, music, Rosa's Mexican Food, T-Shirts, Taco Shop, Tacos x2, Taquero Mucho) and set `is_comp: true` on all 32 practice accounts with a stripe_customer_id (RC Bicycles excluded, still billing normally). Verified against the database after the run.
- Nereidas salón was previously assumed to be a real paying customer in older docs; Shawn confirmed 2026-08-10 it's actually his own practice account and included it in the comp batch - corrects that stale assumption going forward.
- The real `once` onboarding coupons and the new `forever` coupons (`found_1_forever_business`/`found_1_forever_pro`, promo `F0UND1138`) are untouched and reserved for genuine prospects/trade deals, not practice accounts.

### Test next
1. Spot-check a comped account (e.g. Taco Shop, Hvac) still shows full plan access with no billing prompts.
2. Confirm RC Bicycles is still billing normally as expected.

---

## Session: August 9, 2026 - Real Billing Bug: Webhook Silently Reset Plan to Starter
**AI:** Claude

### Built
- Root-caused a real, live bug: Taco Shop (a real actively-paying test account) showed Found Starter in the app despite an active Found Business Stripe subscription since July 12. `checkout.session.completed` in the Stripe webhook hardcoded `plan: "found"` on every new subscription and could silently race against/overwrite the correct plan set by `customer.subscription.created`, with zero error or log (`5fbc352`).
- Fixed: `checkout.session.completed` no longer touches `plan` at all; the subscription-created/updated handler is the sole source of truth.
- Got a new scoped Stripe Restricted key (separate from the production Secret key, limited permissions) to investigate with live data. Audited all 34 companies with a real Stripe customer id: 9 correct, 2 confirmed mismatches (corrected directly in the database), 22 with a stripe_customer_id that doesn't exist in live Stripe at all (likely pre-mid-July test-mode ids, separate follow-up).

### Verification
- `npx tsc --noEmit` and `npm run build` passed clean.
- Not yet re-tested live by Shawn.

---

## Session: August 9, 2026 - Security Audit: Billing-Action Authorization Gap + 3 Worker-Role Gaps
**AI:** Claude

### Built
Ran a dedicated audit (agent, not self-check) of the worker-role feature per Shawn's request before building more Jobs features on top of it. Found and fixed:
- `more/actions.ts` billing actions had **zero authorization check** at all (client-supplied companyId, no ownership verification) - pre-existing, not worker-specific, most severe finding. New `requireCompanyOwner()` now guards all 6 entry points.
- Three real worker-specific gaps missing `requireOwnerAccess()`: `social-posts/route.ts`, `company-slug/route.ts` PATCH (+ GET info leak), `photos/download/route.ts`.
- Minor: `layout.tsx` sent lead/order/reservation counts to worker sessions regardless of role - now skipped for non-owners.
- Confirmed solid: `/api/photos`, `/api/albums`, no owner-escalation path, revoked members blocked everywhere, team invite/revoke correctly gated.

### Verification
- `npx tsc --noEmit` and `npm run build` passed clean.
- Not yet tested live by Shawn.

---

## Session: August 9, 2026 - iOS Native-Picker Delay: Preparing Signal + Shoot-First Redesign
**AI:** Claude

### Built
- New `triggerNativePicker()` in `DashboardNav.tsx` - shows a "Preparing..." pill using a `window.focus` heuristic (fires when iOS's native picker sheet dismisses, before the actual file data arrives) instead of true silence during the OS-side file-prep window (`12e77ad`).
- Camera sheet redesign: Shoot (live capture, never touches Photos library/iCloud) is now the primary full-width action; Upload from Library is a smaller secondary action with a one-time expectation-setting line (`e2bb603`).

### Also raised
Shawn wants nationwide paid ads live this week and asked about iOS/Android app store timelines. Team's honest assessment: Google Play (PWA-as-TWA) is realistic this week; Apple isn't (D-U-N-S number for business enrollment + real native functionality needed to survive App Review's "Minimum Functionality" guideline). Recommended not blocking the ad launch on either - drive to the existing web/PWA experience, pursue Google Play in parallel, scope Apple separately. Awaiting Shawn's direction.

### Verification
- `npx tsc --noEmit` and `npm run build` passed clean after both commits.
- Not yet tested live by Shawn.

---

## Session: August 9, 2026 - Upload Speed/Limits + Estimate<->Job Reverse Link
**AI:** Claude

### Built
- `DashboardNav.tsx`'s shared multi-file upload handler (Photos + Jobs both use it): 12-file soft cap, bounded concurrency (3 at a time, was strictly sequential), and a real "Uploading X of Y" progress pill where none existed before (`2129c61`).
- Migration 059: `estimates.job_id` references `photo_albums(id)`. Estimate builder can now link/create a Job while writing an estimate (pre-filled from typed customer info); existing estimates can attach to a Job after the fact via DetailSheet. Reuses the existing `/api/albums` endpoint (`e42e62b`).

### Verification
- `npx tsc --noEmit` and `npm run build` passed clean after both commits.
- Not yet tested live by Shawn.

---

## Session: August 9, 2026 - Regression Fix: Gallery Showed Zero Photos (`8de2548`)
**AI:** Claude

Self-inflicted regression, caught by Shawn within minutes: the blank-video fix below added `mime_type` to 4 `.select()` calls across the gallery pages, assuming it was a real `company_photos` column. It isn't - confirmed against the live schema, it's never been persisted, only echoed back transiently in the upload API's own POST response. Selecting a nonexistent column made every one of those queries silently return zero rows instead of erroring loudly, so the HVAC test account's gallery went from "video shows blank" to "nothing shows at all." Fixed by removing `mime_type` from every select; `isVideoMedia()` already falls back to URL file-extension detection, which is how it actually works everywhere else in this codebase. Verified 11 real rows exist for the Hvac company directly against the live DB before pushing the fix.

---

## Session: August 9, 2026 - Blank Videos on Public Gallery + Job Pages
**AI:** Claude

### Built
- Fixed the public `/gallery` page (`GalleryLightbox.tsx`, both plan tiers) to actually render video - it was rendering every gallery item as `<img>` with zero video awareness, so a video just showed blank (`091a0fb`).
- Fixed the identical bug on the shared Job public page (`AlbumPhotoGrid.tsx`) - the page every "Ask about this job" lead links back to (`68c66d1`).
- Fixed a third occurrence in the same investigation: the OG/social-preview image generator for shared job links could pick a video as the cover photo, which `next/og` can't render at all - would have silently broken the entire iMessage/Facebook link preview (`68c66d1`).
- All three reuse the existing `isVideoMedia()` helper and the dashboard Photos page's own video-tile treatment (muted autoplay grid tile, real `<video controls>` in the expanded view) rather than inventing new patterns.

### Verification
- `npx tsc --noEmit` and `npm run build` passed clean after both commits.
- Not yet tested live by Shawn.

---

## Session: August 9, 2026 - Live QA Follow-Up: 3 Bugs + Nav/Settings Restructure
**AI:** Claude

### Built
- Fixed Sign Out to also clear admin View As override cookies (`f27c25d`) - real access-control gap where a stale admin session silently granted full owner access to a worker-restricted account. New `src/lib/auth/clientSignOut.ts` is now the single source of truth for sign-out logic.
- Fixed misleading "Deposit paid $X" copy on the estimate-accept page when a business has no Stripe Connect (`08697ef`) - client-only bug, the database was never wrong.
- Labeled owner vs. worker-only access in the company picker with an amber "Team member" badge (`36b005b`).
- Split Billing/Plan (`0e79420`) and Business Info (`0e79420`) out of More into their own pages, updating every Stripe/addon/upgrade redirect target from `/more` to `/billing` across `entitlements.ts`, `more/actions.ts`, `payments/connect/route.ts`, `PaymentSetupButton`, in-app upgrade CTAs, and an email nudge (`f900460` caught two the first pass missed).
- New top-right `AccountMenu` (`bca8f20`) - avatar icon opening Switch Business/Team/Business Info/Billing & Plan/Sign Out, reusing the Photos filter's anchored-popover pattern. More (bottom dock tab) is now pure page navigation.
- Retired `BusinessNameEditor` (duplicate of Site Editor's Contact Info tile) and removed the Team tile from Site Editor's Site-wide section - the original misplacement bug.

### Process note
- The nav restructure went through multiple real team rounds before any code: Chris/Marcus pushed back on top-right corner nav for mobile ergonomics reasons (CompanyCam and the field-service category keep everything in the bottom bar), Steve named the scope-creep risk directly, and Shawn's own refinement (More becomes pure nav, top-right becomes account/settings, frequency-based placement) is what actually shipped - not the first proposal.

### Verification
- `npx tsc --noEmit` and `npm run build` passed clean after each of 7 commits.
- `git diff --check` passed each time.
- Not yet tested live by Shawn.

---

## Session: August 9, 2026 - Worker Roles/Permissions
**AI:** Claude

### Built
- `company_members` table (migration 058, run live) + `getCompanyRole()`/`requireOwnerAccess()` in `getCompany.ts` - the real app-level permission boundary (RLS is a no-op on tenant tables in this project).
- Owner-only enforcement wired into every sensitive surface: Leads, Contacts, People, Estimates, Schedule, Site editing/publishing (`site/actions.ts`), Marketing, Payments Connect, Locations, Rate Sheet, Menu/Products, and the dashboard home page.
- New `/team` page: owner invites a worker by email via the existing magic-link infra; worker gets camera/Jobs access only. Owner can revoke.
- `DashboardNav` now takes a `role` prop; workers see Photos + a minimal More (Sign Out only).
- Fixed a real regression found mid-build: `getCompanyRole()` now treats Found admin's "View As" override as owner-equivalent access - without this, every owner-only check added this session would have wrongly restricted admin support/demo sessions.

### Verification
- `npx tsc --noEmit` and `npm run build` passed clean after each of the 4 commits (`208e879`, `4f2b721`, `4958249`, `206cbce`).
- `git diff --check` passed each time.
- Not yet tested live by Shawn - see SESSION_HANDOFF.md for the test list.

---

## Session: August 9, 2026 - Job Leads Connected to Estimate Builder
**AI:** Codex

### Built
- Job/shared-work leads now show `Create Estimate` when they land in the dashboard, even outside the estimate-only inbox.
- Creating an estimate from one of these leads pre-fills customer info and uses the job/project title first for the work description when available.

### Verification
- `npm run build` passed.
- `git diff --check` passed.
- Shawn confirmed live: tapped Create Estimate from a job-page lead, estimate screen opened with customer info and description prefilled correctly.

### Process Note
- Codex ran out of credits right after this shipped (commit `0cfd503`), before docs were updated. Backfilled by Claude from Shawn's session summary and live confirmation.

---

## Session: August 8, 2026 - Photos Filter Native Panel and Header Fix
**AI:** Codex

### Built
- Changed active filters to replace the first Photos tab label/count.
- Restored the filter button to a square active-state control.
- Redesigned the Photos filter popover into a larger, softer native-feeling panel.
- Added a solid black cover above the sticky Photos tabs to prevent first-load and scroll clipping.

### Verification
- `git diff --check` passed.
- `cmd /c npm run build` passed; only existing Next.js middleware deprecation warning remains.

---

## Session: August 8, 2026 - Photos Filter Popover and Sticky Bar Polish
**AI:** Codex

### Built
- Replaced the bottom Photos filter sheet with an anchored top-right popover.
- Added active filter wording and count inside the filter button.
- Made the sticky Photos tab bar solid black and removed the transparent gradient behavior.

### Verification
- `git diff --check` passed.
- `cmd /c npm run build` passed; only existing Next.js middleware deprecation warning remains.

---

## Session: August 8, 2026 - Photos Filter Visual Polish
**AI:** Codex

### Built
- Removed the extra filtered-view status line under the Photos tabs.
- Removed the Favorite photos explainer card above the grid.
- Filtered views now keep the same clean `THIS WEEK` rhythm as the normal Photos grid.

### Verification
- `git diff --check` passed.
- `cmd /c npm run build` passed; only existing Next.js middleware deprecation warning remains.

---

## Session: August 8, 2026 - Photos Filter Sheet Refinement
**AI:** Codex

### Built
- Replaced the visible Photos filter chip row with a compact iOS-style descending-lines filter button.
- Added a bottom filter sheet for `All`, `Favorites`, and `Not on site` with counts and owner-friendly descriptions.
- Kept the main Photos tabs clean: `All Photos`, `Gallery`, and `Albums`.
- Active filters now show as a small status line under the tabs.

### Verification
- `git diff --check` passed.
- `cmd /c npm run build` passed; only existing Next.js middleware deprecation warning remains.

---

## Session: August 8, 2026 - Photos IA Cleanup: Favorites and Albums
**AI:** Codex

### Built
- Reorganized the dashboard Photos page around owner-facing tabs: `All Photos`, `On Website`, `Favorites`, and `Albums`.
- Removed the main Photos `Social` tab and old Social Assistant workspace from the active UI.
- Kept the star action, but it now reads as `Favorite` instead of Social.
- `On Website` now shows photos used anywhere on the public website, including gallery-hearted photos and exact section placements.
- Photos page album language now consistently says Albums.
- Empty states were rewritten in plain owner language.

### Verification
- `git diff --check` passed.
- `cmd /c npm run build` passed; only existing Next.js middleware deprecation warning remains.

---

## Session: August 8, 2026 - Email Signup Modal and Subscribe Fix
**AI:** Codex

### Built
- Homepage `Join the List` now opens a signup modal for a faster, more premium public flow.
- The standalone `/subscribe` page remains for QR codes, shared links, and footer/direct traffic.
- `/api/subscribe` now updates existing contacts by company/email or inserts new contacts without depending on a database conflict rule.
- Public sticky CTA bar is hidden on `/subscribe` and `/unsubscribe`.
- Standalone subscribe page spacing was cleaned up so the perks card and form do not feel tucked behind the hero.

### Verification
- `git diff --check` passed.
- `cmd /c npm run build` passed; only existing Next.js middleware deprecation warning remains.

---

## Session: August 8, 2026 - Public Email Signup Entry Points
**AI:** Codex

### Built
- Added a shared public homepage section: `Stay in the loop.` with a `Join the List` button to `/subscribe`.
- Added a public footer `Join our list` quick link.
- Both public entry points are gated by the effective `email_marketing` add-on, so inactive sites stay unchanged.
- Updated the Marketing dashboard helper copy to explain that customers can join from the website or through the QR/link.

### Verification
- `git diff --check` passed.
- `cmd /c npm run build` passed; only existing Next.js middleware deprecation warning remains.

---

## Session: August 8, 2026 - Marketing Subscriber Count Fix
**AI:** Codex

### Built
- Marketing now counts contacts with `email_subscribed = true` and an email address, regardless of the contact's original source.
- Marketing send API uses the same corrected subscriber definition.
- Marketing helper copy now says subscribers are opted-in email contacts, not every contact.
- Subscribe API now checks insert/upsert errors so a failed save cannot look successful.

### Verification
- Live Lucky query now returns `1` email subscriber with the corrected logic.
- `git diff --check` passed.
- `cmd /c npm run build` passed; only existing Next.js middleware deprecation warning remains.

---

## Session: August 8, 2026 - Security Hardening Sprint 2
**AI:** Codex

### Built
- Replaced the public marketing send implementation with the guarded dashboard marketing sender.
- Added login, company ownership, and throttling checks to the stock-photo update route.
- Added throttling and input validation to public Places lookup.
- Added throttling to dashboard Places autocomplete and pointed the dashboard Places input at that secured route.

### Reviewed
- Cron routes already require `CRON_SECRET`.
- Stripe webhook already verifies the Stripe signature before processing events.

### Verification
- `git diff --check` passed.
- `cmd /c npm run build` passed; only existing Next.js middleware deprecation warning remains.

---

## Session: August 8, 2026 - Security Hardening Sprint 1
**AI:** Codex

### Built
- Added hidden form-loaded timestamps to public contact, estimate, and reservation forms.
- Expanded the shared spam guard so impossible instant submissions count as bot-like behavior when combined with other spam signals.
- Added IP-level throttling to password login and magic-link login.
- Added throttling and oversized-payload rejection to public QR endpoints.
- Tightened the admin login cookie with explicit `sameSite: "lax"` and a shorter 8-hour lifetime.

### Verification
- `git diff --check` passed.
- `cmd /c npm run build` passed; only existing Next.js middleware deprecation warning remains.

### Remaining Platform Checks
- Confirm GitHub secret scanning and push protection in repository settings.
- Confirm Vercel security settings match launch posture.
- Consider Cloudflare Turnstile only if spam continues after the lighter protections.

---

## Session: August 8, 2026 - Lead Spam Protection and RC Bicycles Cleanup
**AI:** Codex

### Built
- Added a shared lead spam guard for public contact, estimate, and reservation submissions.
- Added hidden bot fields to public lead/reservation forms.
- Obvious spam is now saved as `status = spam` instead of being deleted, and it skips owner notification emails, customer auto-replies, and contact auto-save.
- Dashboard inbox now hides spam from normal work, search, counts, and customer records while keeping a collapsed `Spam hidden` section for recovery.
- Added owner controls to `Mark as spam` and `Not spam`.
- Cleaned Ryan / RC Bicycles live data by marking 10 obvious spam leads as spam while keeping Shawn Lopez's test lead open.

### Verification
- `git diff --check` passed.
- `npm run build` passed; only existing Next.js middleware deprecation warning remains.

---

## Session: August 8, 2026 - Edit Website Dynamic Pages and Wrapper Consistency
**AI:** Codex

### Built
- Edit Website page switcher now shows Shop only when the effective shopping-cart add-on is active.
- Food businesses still show Menu.
- Retail/makers businesses without shopping cart now see Products & Services instead of a misleading Shop entry.
- About, Contact, and Services/Products & Services now group their preview and edit controls inside one connected card, matching the Homepage/Featured Update rhythm.

### Verification
- `git diff --check` passed.
- `npx tsc --noEmit` passed.
- `npm run build` passed; only existing Next.js middleware deprecation warning remains.

---

## Session: August 7, 2026 - Featured Update Button Grouping Polish
**AI:** Codex

### Built
- Moved `Button words` inside the same Featured Update card as `Button action`.
- Changed helper copy to `Change what customers see on the button.`

### Verification
- `git diff --check` passed.
- `npx tsc --noEmit` passed.
- `npm run build` passed; only existing Next.js middleware deprecation warning remains.

---

## Session: August 7, 2026 - Featured Update Button Action vs Button Words
**AI:** Codex

### Built
- Split Featured Update button controls into `Button action` and `Button words`.
- Action choices now save the destination and visible button text together.
- `Other page` now opens a plain page picker instead of the raw link editor.
- Updated the button-words edit sheet label to make clear it only changes visible text.

### Verification
- `git diff --check` passed.
- `npx tsc --noEmit` passed.
- `npm run build` passed; only existing Next.js middleware deprecation warning remains.

---

## Session: August 7, 2026 - Featured Update Destinations Use Real Active Site Paths
**AI:** Codex

### Built
- Featured Update button destinations now use the same active-add-on CTA resolver as Main Website Button.
- Duplicate destinations are deduped, so Ryan no longer gets separate `Shop` and `Products` choices pointing at the same path.
- Disabled shop/order paths are not offered in the editor.
- Public Featured Update links now protect against stale saved paths like `/shop` when that destination is no longer valid.
- Banner Style choices now remove `Clean`; existing saved `default` values visually map to `Dark`.

### Verification
- `git diff --check` passed.
- `npx tsc --noEmit` passed.
- `npm run build` passed; only existing Next.js middleware deprecation warning remains.

---

## Session: August 7, 2026 - Featured Update Button and Banner Wording Polish
**AI:** Codex

### Built
- Featured Update destination choices now wrap inside the Button card instead of scrolling off-screen.
- Replaced technical destination copy like `/services` with owner language like `Opens Services page`.
- Renamed `Look` to `Banner style`; the default style now displays as `Clean`.
- Renamed `Custom link` chip to `Other page`.

### Verification
- `git diff --check` passed.
- `npx tsc --noEmit` passed.
- `npm run build` passed; only existing Next.js middleware deprecation warning remains.

---

## Session: August 7, 2026 - Featured Update Wrapped Like Homepage
**AI:** Codex
**Worked on:** Shawn showed that Featured Update still did not match the Homepage/First Impression editor pattern. Team direction: one wrapped editing surface, passive photo helper, no loose control stack.

### Built
- Featured Update preview and edit rows now sit inside one parent wrapper.
- Removed the overlapping clickable-looking "Photo off in this look" pill.
- Added passive helper copy for non-image looks when a photo is saved but not shown.

### Verification
- `git diff --check` passed.
- `npx tsc --noEmit` passed.
- `npm run build` passed; only existing Next.js middleware deprecation warning remains.

---

## Session: August 7, 2026 - Home Featured Update Editor Matches Live Preview
**AI:** Codex
**Worked on:** Shawn approved the team direction to make Featured Update feel as intuitive as First Impression and to show a clearer Services Preview reference.

### Built
- Featured Update preview now respects the selected look: Image shows the uploaded photo live; non-image looks show text-only styling and mark the photo as off for that look.
- Renamed controls to `Headline`, `Supporting line`, `Button`, and `Look`.
- Combined Featured Update button text and destination into one control with "Goes to:" shown beside the button wording.
- Services Preview now displays up to three live service/product examples from the Services page before the `Edit services` action.

### Verification
- `git diff --check` passed.
- `npx tsc --noEmit` passed.
- `npm run build` passed; only existing Next.js middleware deprecation warning remains.

---

## Session: August 7, 2026 - Home Main Website Button Truthful Labels
**AI:** Codex
**Worked on:** Shawn's Ryan test showed the editor saying "Shop Now" while the live site showed "Our Products" and routed to Services. Team direction: editor labels must come from the same CTA resolver as the public site.

### Built
- Main Website Button options now resolve labels through `getSiteCTAs()` with effective add-ons.
- Destination-aware helper text replaces hardcoded generic descriptions.
- Removed the Home-only "Button Words" booking-label control.
- Removed unused primary-action override prop plumbing from the Site editor entrypoint.

### Verification
- `git diff --check` passed.
- `npx tsc --noEmit` passed.
- `npm run build` passed; only existing Next.js middleware deprecation warning remains.

---
## Session: August 7, 2026 - Home Editor Language and Flow Cleanup
**AI:** Codex
**Worked on:** Shawn's Ryan test: Home editor needed owner language and live-site order. Team chose "First Impression" instead of web jargon like "hero".

### Built
- Reordered Home editor so First Impression comes first, Main Website Button comes next, Featured Update follows, then Services Preview and Footer Call to Action near the bottom.
- Removed the Home Gallery strip from Home editing; Gallery stays managed from the Gallery page.
- Removed the separate Primary Action picker and renamed Main Button to Main Website Button. Saving it now clears the old hidden primary-action override.
- Renamed Booking Button Text to Button Words for the optional booking label override.
- Added Services Preview handoff for non-food businesses only.
- Labeled the bottom section Footer Call to Action and added a current-headline reference.

### Verification
- `git diff --check` passed.
- `npx tsc --noEmit` passed.
- `npm run build` passed; only existing Next.js middleware deprecation warning remains.

---
## Session: August 7, 2026 - Hours Tab Redesign (Jony-Led)
**AI:** Claude Code (Sonnet)
**Worked on:** Live-test feedback: "5 open days" counter meant nothing to Shawn, and two buttons (Done at top, Save Changes at bottom) both felt like "finished" but only one saved. He wanted to edit one day directly, not all 7 at once. Brought straight to Jony per Shawn's explicit request.

### Built
- Header counter → real summary ("Open 5 days · Closed Sun, Mon"), plus a warning if a day is open with no time set.
- Replaced global `editingHours` boolean with `expandedDays: Set<number>` - any day (or all) independently expandable.
- Tap a day → expands inline with its own toggle, blocks, and docked "Save [Day]" button, no scrolling.
- "Edit all days" kept as explicit bulk option, same editor, one sticky Save bar instead of seven per-row buttons.
- "Cancel" now actually reverts unsaved edits (previously just hid them).

### Verification
- `npm run build` passed clean.

### Test Next
- Shawn: single-day edit + bulk "Edit all days" both need a retest.

---
## Session: August 7, 2026 - Fix: Schedule Actions Failed Under Admin View As
**AI:** Claude Code (Sonnet)
**Worked on:** Live bug caught mid-test - saving hours while viewing Ryan's account as admin returned "Could not save availability."

### Root cause
- Every write in `schedule/actions.ts` used a session-bound (RLS-enforced) Supabase client. Under admin View As, RLS checks the admin's own real identity, not the impersonated customer, so the write was silently rejected even though the code's own authorization check had already approved it correctly. Pre-existing gap, surfaced for the first time tonight.

### Built
- Switched `saveAvailability`, `blockDate`, `blockRange`, `removeBlock`, `cancelBooking` to the admin/service-role client.

### Verification
- `npm run build` passed clean.

### Also flagged, not fixed
- Real UX feedback: Hours tab's single "Edit" toggle puts all 7 days into edit mode at once instead of per-day, and Save/Done require scrolling to the top and bottom of the card. Predates tonight's work - candidate for its own team round.

### Test Next
- Shawn: retry saving Ryan's hours under View As, confirm it works now.

---
## Session: August 7, 2026 - Workstream 1 (Part 2): Upgrade Prompt + Comparison
**AI:** Claude Code (Sonnet)
**Worked on:** Completes workstream 1. Followed the team's "celebrate, then solve" framing - lead with the real win, name the friction second, no hard sell at the moment of good news.

### Built
- `/api/company-slug`: added `primaryIntent`, `plan`, computed `hasCalendar`.
- Upgrade banner on the Reservations view - shown only with real incoming leads present, on a scheduling-intent business without the calendar add-on.
- `BookingComparisonSheet` - static Now-vs-Automated comparison, links out to the existing `/more` upgrade flow.

### Verification
- `npm run build` passed clean.

### Test Next
- Shawn: test-submit a reservation request on a qualifying business, confirm the banner and comparison sheet both work.

Both halves of workstream 1 and all of workstream 2 are complete for this session.

---
## Session: August 7, 2026 - Workstream 1 (Part 1): Universal Booking Action Button
**AI:** Claude Code (Sonnet)
**Worked on:** Shawn wants any business, not just food/wellness-type industries, to be able to turn on Booking as their main action button. Explicit ask before building: don't break the existing action-button flow. Traced the full system first and confirmed the change is purely additive - every industry already has a working CTA, new picker options never touch an existing business's saved selection.

### Real finding that reshaped scope
- Basic-tier reservation requests already land as real leads today; food businesses already get their inbox relabeled "Reservations" when they lack the calendar add-on. This was already half-built, just limited to 10 of 22 industries.

### Built
- Main Button picker: "Book Appointments" now selectable for the 13 previously-excluded industries.
- `toolPolicy.ts`: inbox relabels to "Reservations" (filtered) for any industry when the action button is a scheduling intent and the calendar add-on isn't active - extends the existing food-only pattern universally. `primaryIntent` threaded through `DashboardNav`/`DashboardPages`.

### Not yet built
- In-context upgrade prompt + side-by-side comparison on the Reservations view - separate follow-up.

### Verification
- `npm run build` passed clean.

### Test Next
- Shawn: set Main Button to "Book Appointments" on a newly-included industry, confirm inbox relabels and filters, confirm public CTA shows correctly.

---
## Session: August 7, 2026 - Workstream 2: Multi-Block Daily Hours
**AI:** Claude Code (Sonnet)
**Worked on:** Shawn's real worry was a continuously-open 9-5 calendar forcing the owner to keep watching it. First team pass over-scoped this as weekly-republish; Shawn corrected it to a much smaller ask - multiple fixed time windows per day, set once, permanent, same model as the existing Hours tab.

### Built
- Migration 057: `company_availability` now one row per (day, block), capped at 3 blocks/day.
- `saveAvailability()`: delete-then-insert of the full flattened set, so removed blocks actually disappear.
- `getAvailableSlots()`: walks each working block separately.
- `book/page.tsx`: deduped `workingDays` query.
- Hours tab: stacked per-day block list, add/remove per block, capped at 3.

### Verification
- `npm run build` passed clean. Migration run directly against the live database.

### Test Next
- Shawn: set 2-3 blocks on one day, confirm the public calendar only shows slots inside those windows, not the gap between them.

---
## Session: August 7, 2026 - Fix: Calendar Can No Longer Go Live With Zero Available Days
**AI:** Claude Code (Sonnet)
**Worked on:** Follow-up to last night's booking work - Ryan set his hours (9-5 Mon-Fri) in the dashboard but his public booking calendar showed zero bookable days. Root cause: the Hours tab shows sensible defaults before anything is saved, visually identical to a real saved schedule, so an owner whose desired hours happen to match the defaults has no reason to hit Save. `company_availability` stayed empty; the public calendar only shows days it finds a real row for.

### Team decision
- Explicitly rejected a UI-only patch (banner/graying) as insufficient - "same category of failure, depends on the owner noticing something." Real fix: seed real availability rows the moment the add-on activates, removing the empty-table state entirely, paired with a lightweight status indicator for the ongoing-editing case.
- Shawn explicitly declined writing placeholder/assumed hours into Ryan's specific account - this is the general systemic fix, not a manual data patch.
- Mid-build scope-verification found the original 3-path plan (free switch, paid checkout, Stripe webhook) was real but incomplete - admin tools and manual DB edits could bypass all three - so a 4th backstop was added.

### Built
- `src/lib/bookings/ensureDefaultAvailability.ts` - seeds Mon-Fri 9-5 only when a company has zero rows; never touches real saved hours.
- Wired into `switchIncludedAddon()`, `markAddonActive()` (covers 3 paid-checkout call sites), the Stripe webhook sync handler, and a final backstop directly in `/[slug]/book/page.tsx`'s page load.
- Confirmed template-agnostic - shared backend logic, applies to all 6 templates automatically, no per-template work needed.
- Hours tab: new saved/unsaved status badge, Save button now reachable even before the owner starts editing.

### Verification
- `npm run build` passed clean.

### Test Next
- Shawn: confirm Ryan's Hours tab shows the new status badge, and that a fresh test business activating the calendar add-on gets real bookable days with no manual save required first.

---
## Session: August 6, 2026 - Booking System: Retail/Makers/Nonprofit CTAs, /book Route, Custom Label
**AI:** Claude Code (Sonnet)
**Worked on:** Real live-customer bug (Ryan, bike shop/retail, Found Pro) - switched to the Reservation Calendar add-on, dashboard worked, public site still showed a stale "Our Products" link because retail had no scheduling CTA at all. Root cause: retail was deliberately excluded from booking in the original locked plan; the free included-addon switcher doesn't enforce that exclusion the way the paid add-on flow does. Shawn decided to open booking to every industry instead of patching retail alone - bike repairs, fittings, and similar retail scheduling needs are real, not edge cases.

### Process note
- Claude briefed an early team round with a factual error - said 7 industries had no scheduling CTA when only 3 actually did. Caught and corrected before shipping, with the team's explicit sign-off on the narrower, verified scope. Full record in `feedback_team_approval_process` memory.

### Team-approved, corrected scope
- Only retail, makers_crafts, and nonprofit get new CTAs - the only 3 industries confirmed (against the actual code, not memory) to have none. Automotive/creative_services/professional_services/home_services already had working entries and were left untouched.
- Route renamed `/reserve` → `/book`, decoupled permanently from the CTA label (same pattern that already let one href serve multiple different button texts). `/reserve` kept as a permanent redirect.
- New owner-editable `booking_cta_label` override (curated default + capped 24-char custom field) in Site Editor, wired through the existing `getSiteCTAs` CTA-resolution pipeline so it applies everywhere consistently.

### Built
- `industryCTAs.ts`: 3 new SCHEDULING_CTA entries, all hrefs updated to `/book`, `schedulingCTAFor()` helper applies the label override when set.
- `src/app/[slug]/book/` (moved from `reserve/`), `src/app/[slug]/reserve/page.tsx` now a permanent redirect.
- Migration 056: `companies.booking_cta_label text NULL`.
- Site Editor: new "Booking Button Text" section (industry default vs. custom, 24-char cap).
- Updated every other `/reserve` reference site-wide (SiteAnnouncement targets, siteCopy nudge links, dashboard page picker, revalidatePath calls).

### Verification
- `npm run build` passed clean. Migration run directly against the live database.

### Test Next
- Shawn: confirm Ryan's site shows a real, working booking CTA and that `/reserve` still redirects correctly.

---
## Session: August 6, 2026 - One-Tap Share (Web Share API)
**AI:** Claude Code (Sonnet)
**Worked on:** Next roadmap item after template parity - one-tap photo sharing via the Web Share API. Asked Shawn directly whether to share the real photo file or just a link, since it's a real behavior/complexity tradeoff, not a rubber-stamp detail; he chose the real file.

### Built
- `handleSharePhoto()`: fetches the image, shares it as a real `File` via `navigator.share({ files })` when supported, falls back to link-share (matching the existing album-share convention already in this file) then clipboard-copy.
- Share button on `PhotoCard` (top-right, the one open tile corner after tonight's layout pass) and as a 5th button in `PhotoLightroom`'s action bar.
- Unbranded photo only - branded/canvas-rendered sharing is a separate fast-follow per the team's original scoping, not built now.

### Verification
- `npm run build` passed clean.

### Test Next
- Shawn: confirm Share opens the iOS share sheet with the actual photo (not a link) from both the tile and the full-screen viewer.

---
## Session: August 6, 2026 - Gallery Template Parity (Impact, Cinematic, Editorial)
**AI:** Claude Code (Sonnet)
**Worked on:** Place on Site's Gallery destination only had somewhere to show up on 3 of 6 templates. Team picked up template parity as top-priority; code investigation corrected the team's initial assumptions (Impact's assumed CTA-bleed doesn't exist; Cinematic isn't an easy port - its comments state a deliberate 2-photo-moment rhythm rule a literal strip would break). Team reconvened, real disagreement over breaking that rule vs. owner photos not showing up anywhere, landed on template-appropriate treatments. Shawn approved, asked it followed exactly.

### Team finding
- Impact: no structural blocker, ported Portrait's pattern directly.
- Cinematic: literal strip breaks an intentional design rule (comments: "no competing photo," "rhythm rule honored"). Resolution: real owner photos shown as a small collage inside the existing About section instead of a new strip section - keeps the 2-moment structure, actually contains the photos.
- Editorial: zero photo-forward precedent anywhere in the file, narrow literary character. Resolution: 2-3 small thumbnails inline in the About text column, not a section.

### Built
- `ImpactLayout.tsx`: Portrait's 4-tile full-bleed strip, right after hero.
- `CinematicLayout.tsx`: 4-photo collage inside About's dark background, real photos only (no stock fallback - preserves original restraint for anyone without tagged Gallery photos).
- `EditorialLayout.tsx`: 2-3 small (84px) inline thumbnails in the About column, real photos only.

### Verification
- `npm run build` passed clean.

### Test Next
- Shawn: tag Gallery photos on a company using each of these 3 templates, confirm they now show up in the template-appropriate spot.

---
## Session: August 6, 2026 - Place on Site: Jony-Led Visual Redesign
**AI:** Claude Code (Sonnet)
**Worked on:** Shawn sent screenshots after the last fix - tile's heart/star/Add-to-Site controls crammed into one corner with no spacing, and the destination sheet reading as a flat, undesigned list of seven identical rows. Shawn convened the team again with Jony explicitly leading as design expert, approved Jony's recommendation, asked it followed exactly.

### Team finding
- Tile: heart+star are same-size same-job toggles and should stay a tight pair; Add to Site is a different kind of action (opens a sheet, not a toggle) and needs its own visually distinct treatment/position, not crowded into the same row.
- Sheet: seven identical-looking rows give no scan hierarchy, and Gallery (additive) looked identical to the exclusive-assign rows despite behaving differently - visually a little dishonest.

### Built
- `placementActions.ts`: added `icon` field per destination and `group: "home"` on hero/cta; shortened their labels to "Top"/"Bottom" for the new grouped-chip layout.
- Tile: Add to Site relocated to a low-profile bottom-left bar, separate from the heart/star pair.
- Sheet: new `DestinationGlyph`/`DestinationRow` - icon per row, Home's two slots grouped under one static label with chips beneath, Gallery given a dashed/outlined "+" treatment instead of solid fill.

### Verification
- `npm run build` passed clean.

### Test Next
- Shawn: confirm the tile no longer feels cramped and the sheet reads as more intentional/hierarchical.

---
## Session: August 6, 2026 - Place on Site: Team Review Follow-Up
**AI:** Claude Code (Sonnet)
**Worked on:** Real-phone testing of Place on Site (below) surfaced two issues - pin icon read as a map location, "Replace it" gave no loading feedback. Both got fixed and shipped without a team discussion or Shawn's approval - a process violation Shawn caught immediately. Shawn convened a real team review (Steve leading, Jony on design) to redo both questions properly, then approved the team's recommendation and asked it be followed exactly.

### Process note
- No size threshold exempts a change from team discussion + Shawn's final approval - confirmed and logged in `feedback_team_approval_process` memory after this recurred a second time this month.

### Team finding
- Bare pin icon has no universal "place this on my website" meaning (unlike heart = favorite); "PLACE" alone is a verb without an object. Recommended icon+word instead of either alone.
- No shared spinner exists anywhere in the app - the same rotating-ring animation is copy-pasted independently in ~6 files (globals.css, CompanyPicker's `companyPickerSpin`, ActivateFlow, SiteEditor, schedule page, and this feature). Recommended a real reusable component, used here first.

### Built
- `src/components/Spinner.tsx` - reusable spinner, reuses the existing global `spin` keyframe. Applied to this feature's two loading spinners only; the five pre-existing ad hoc ones elsewhere were not touched (unreviewed scope).
- Tile control and the matching `PhotoLightroom` button: pin icon + "PLACE"/"Place" replaced with a page/frame icon + "Add to Site" / "ADD TO SITE".

### Verification
- `npm run build` passed clean (one stray JSX bracket from the tile edit caught and fixed before it shipped).

### Test Next
- Shawn: confirm the tile control reads clearly now, and the replace-confirm spinner matches the business-switcher's spinner look.

---
## Session: August 6, 2026 - Place on Site: Fast Photo Placement
**AI:** Claude Code (Sonnet)
**Worked on:** Shawn parked the social-post-generation direction after quality issues (logo rendering, no "wow factor") on two other live projects. Redirected to the core mission: eliminate the "be a web designer" tax for photos - fast, one-tap placement, zero tech savvy required. Ran a team brainstorm (Jony/Steve/Angela/Marcus/Craig) off Shawn's own vision (heart -> website tab -> per-page picker); team countered with a destination-first alternative (long-press any photo -> flat action sheet -> one tap places it) reasoning it removes a step instead of adding one. Shawn approved building the team's version.

### Root problem this fixes
- `in_gallery` was a flag totally separate from `for_website`/`website_section`, only settable through a picker buried inside Site Editor - so hearting and assigning new photos to hero/about/etc. never made them show in the gallery-strip section some templates render, leaving it full of stock photos even when the owner had plenty of real ones.

### Built
- `src/app/dashboard/(app)/photos/placementActions.ts` (new) - `getPhotoDestinationOptions()`, `placePhoto()`, `removeFromGallery()`. Thin wrappers around the already-correct `assignPhotoToSection`/`toggleGalleryPhoto` server actions in `site/actions.ts` - no new business logic. Destination labels reuse `getSitePhotoSections()` and `getVocab().galleryLabel` (both pre-existing, per-industry-aware).
- New `PlacementSheet` in `photos/page.tsx` - animated bottom sheet (new `.placement-sheet` CSS transition in `globals.css`, since most sheets in this codebase mount instantly with no animation - modeled on `OnboardingDrawer`'s slide-up instead). Flat one-tap destination list; gallery is a toggle row, everything else exclusive-assign with a replace-confirm if occupied.
- `PhotoCard`: third icon (pin, alongside heart/star) opens the sheet; long-press-to-open built from scratch (pointerdown/timer/move-cancel-threshold - no gesture precedent existed anywhere in this codebase). `PhotoLightroom`: matching "Place" button added to its bottom action bar.
- Added `in_gallery` to the photos API route's GET select and to the `Photo`/`UploadedPhoto`/`DashboardMediaUpload` shared types.

### Explicitly untouched
- Star/`for_social`, the whole Social Assistant tab (branded post generator, drafts, canvas rendering), Site Editor's own per-slot picker sheets. Nothing in those paths was touched.

### Verification
- `npm run build` passed clean (two pre-existing type gaps surfaced and fixed along the way: `uploadDashboardMedia`'s and `CameraSheet`'s upload-response types were missing `in_gallery`, added to both).

### Test Next
- Shawn: heart a photo, long-press it (or tap the pin icon), confirm the sheet shows correct labels on both a food-catalog company ("Menu") and non-food ("Products"), and that the gallery row's label varies by sub-industry.
- Place a photo on "Top of Home page", confirm it goes live as the hero. Add a photo to the gallery row on a Portrait/Wellness Luxe/Wellness Cinematic company, confirm it now appears in the gallery strip instead of stock.
- Confirm Social tab/star/post generator are unaffected.

---
## Session: August 6, 2026 - Edit Website Header Redundancy Fixed
**AI:** Claude Code (Sonnet)
**Worked on:** Shawn had flagged the Menu page showing "Menu" repeatedly to Codex before that session ran out of credit; still unfixed. Brought Jony/Steve/Craig back in explicitly before touching code, per Shawn's ask.

### Team finding
- Menu/Shop: "Menu" (or "Shop") rendered 5x before the real editor - BackHeader's big title, a SectionIntro eyebrow+title both saying the same word, and a photo-hero overlay caption+heading also saying it. Zero unique content across any of it.
- About/Contact/Services: audited on Craig's request before scoping site-wide. Different, smaller bug - only the SectionIntro eyebrow duplicated BackHeader's title. Their photo-hero blocks show real content (business name, editable subtitle, live page copy) and are not redundant.
- Home/Gallery: audited, found no actual duplication. Left alone.

### Fixed
- `SiteEditor.tsx`: Menu/Shop catalog view - removed SectionIntro entirely, removed the photo-hero's overlaid caption/heading, kept the real guidance sentence as a plain paragraph.
- About/Contact/Services - removed only the SectionIntro's `eyebrow` prop; title, body, and photo-hero content unchanged.

### Verification
- `cmd /c npm run build` passed clean.

### Test Next
- Shawn: Edit Website > Menu (or Shop) - confirm the page name appears once, not five times. About/Contact/Services - confirm the small duplicate eyebrow is gone and real editable content (business name, live copy) is untouched.

---
## Session: August 5, 2026 - Blend Edit Website Menu With Shared Catalog Editor
**Worked on:** Shawn rejected the handoff-only Menu screen as feeling broken. Team direction: blend the website page controls and real menu editor into one experience, while keeping one catalog engine.

### Fixed
- Added embedded mode to `CatalogManager` so it can render inside Edit Website without duplicating item/category logic.
- Replaced the Edit Website > Menu/Products handoff card with the embedded shared catalog editor.
- Kept the Menu/Product page image control at the top of Edit Website because it controls the public page visual.
- Added search for larger catalogs and category collapse for large menus/product lists so 30-50 items do not become an endless wall.
- Standalone Dashboard > Menu and Dashboard > Products still use the same component with their normal page header/actions.

### Verification
- `cmd /c npx tsc --noEmit` passed.
- `cmd /c npm run build` passed with the existing middleware deprecation warning only.
- `git diff --check` passed with normal CRLF warnings only.

### Test Next
- Shawn: open Edit Website > Menu. Confirm the Menu Page image is still editable, then scroll down and edit a real menu item without leaving the page.

---
## Session: August 5, 2026 - Fix Edit Website Menu Handoff 404
**Worked on:** Hotfix after Shawn clicked Manage menu items from Edit Website > Menu and hit a 404.

### Fixed
- Changed the handoff route from `/dashboard/menu` to `/menu` and `/dashboard/products` to `/products`.
- This matches the dashboard nav path model on `my.foundco.app`, where live owner-app URLs are app-relative and do not include `/dashboard`.

### Verification
- `cmd /c npx tsc --noEmit` passed.

### Test Next
- Shawn: tap Manage menu items from Edit Website > Menu again. It should open the Menu tool instead of 404.

---
## Session: August 5, 2026 - Consolidate Edit Website Catalog Handoff
**Worked on:** Team-approved UX correction after Shawn showed that Edit Website > Menu and the main Menu tool looked like two different systems for the same job.

### Fixed
- Turned Edit Website > Menu/Products into a website-context screen instead of a duplicate item/category editor.
- Kept the page image control there because it changes the public Menu/Product page presentation.
- Added one primary route into the real manager: Manage menu items / Manage products.
- Added a live page button: View live menu / View live shop.
- Removed the obsolete in-page catalog search, add category, item edit rows, and old catalog item edit sheet from SiteEditor.

### Verification
- `git diff --check` passed.
- `cmd /c npx tsc --noEmit` passed.
- `cmd /c npm run build` passed with the existing middleware deprecation warning only.

### Test Next
- Shawn: go to Edit Website > Menu for Rosa. Confirm it is not a second menu editor anymore, then tap Manage menu items and confirm it opens the same dedicated Menu tool.

---
## Session: August 5, 2026 - Menu Owner Guidance From Public Card Behavior
**Worked on:** Team-approved owner guidance after reviewing Rosa's current public menu: real photos show, missing photos become text-only cards, and descriptions are clamped for scanning.

### Fixed
- Added non-blocking photo guidance to the dedicated Menu/Products manager.
- Added matching guidance to the Edit Website menu/product item sheet.
- Added description guidance so owners know the first lines matter because public cards shorten long copy.
- No public menu layout, checkout, cart, or pricing behavior changed in this pass.

### Verification
- `git diff --check` passed.
- `cmd /c npx tsc --noEmit` passed.
- `cmd /c npm run build` passed with the existing middleware deprecation warning only.

### Test Next
- Shawn: open Dashboard > Menu and Edit Website > Menu, then add/edit an item and confirm the helper text is clear and not annoying.

---
## Session: August 5, 2026 - Restaurant Menu Card Readability Pass
**Worked on:** Team-approved next polish after the no-photo placeholder was removed: improve menu card scanning without changing checkout or the overall layout.

### Fixed
- Clamped restaurant menu item descriptions to 3 lines on cards.
- Tightened mobile card padding/gap slightly.
- Reduced the spacing above add controls from `mt-4` to `mt-3`.
- Kept pricing, checkout, cart state, image behavior, and sticky Order Online unchanged.

### Verification
- `git diff --check` passed.
- `cmd /c npx tsc --noEmit` passed.
- `cmd /c npm run build` passed with the existing middleware deprecation warning only.

### Test Next
- Shawn: refresh Rosa's mobile menu page and confirm descriptions cap at about 3 lines and cards scan faster.

---
## Session: August 5, 2026 - Remove Restaurant No-Photo Placeholder Entirely
**Worked on:** Shawn asked the team to give Codex explicit directions after both fallback attempts missed the mark. Team direction: no fake food, no initials, no placeholder box.

### Fixed
- Removed the restaurant no-photo fallback visual entirely from `OnlineOrderClient.tsx`.
- Items with real photos still render the same 80x80 image.
- Items without photos now render text, price, and add button only.
- Pricing, checkout, cart state, and sticky Order Online behavior were not changed.

### Verification
- `git diff --check` passed.
- `cmd /c npx tsc --noEmit` passed.
- `cmd /c npm run build` passed with the existing middleware deprecation warning only.

### Test Next
- Shawn: refresh Rosa's mobile menu page and confirm the no-photo Burritos item has no image/initials/placeholder square.

---
## Session: August 5, 2026 - Remove Bad Restaurant Placeholder Illustration
**Worked on:** Shawn rejected the illustrated food-plate fallback as looking bad. Team direction: remove fake food, keep a quiet premium placeholder.

### Fixed
- Removed the illustrated plate/food-shape fallback from restaurant order cards.
- Replaced it with a neutral 80x80 placeholder and tiny initials.
- Kept prices, card size, add buttons, checkout, and sticky Order Online behavior unchanged.

### Verification
- `git diff --check` passed.
- `cmd /c npx tsc --noEmit` passed.
- `cmd /c npm run build` passed with the existing middleware deprecation warning only.

### Test Next
- Shawn: refresh Rosa's mobile menu page and confirm the Burritos no-photo card no longer has the fake plate visual.

---
## Session: August 5, 2026 - Restaurant Menu No-Photo Fallback Polish
**Worked on:** Team-approved polish for Rosa's Mexican Food mobile order page. Scope stayed limited to the no-photo menu visual.

### Fixed
- Replaced the initials-dominant missing-photo square on restaurant order cards with a warmer food-style fallback visual.
- Kept the same card layout, dimensions, pricing, checkout behavior, and sticky order button.

### Verification
- `git diff --check` passed.
- `cmd /c npx tsc --noEmit` passed.
- `cmd /c npm run build` passed with the existing middleware deprecation warning only.

### Test Next
- Shawn: open Rosa's mobile order page and confirm the no-photo Burritos item feels more intentional, while photos/prices/buttons still look unchanged.

---
## Session: August 5, 2026 - Documentation Recovery Cleanup
**Worked on:** Shawn questioned whether the recovery documentation followed the normal process and warned against adding more docs than necessary.

### Fixed
- Tightened the top of `SESSION_HANDOFF.md` back into a concise current-truth handoff instead of a long recovery dump.
- Added the current Rosa's menu/order-page pause to `TASKS.md` so next work starts from the active queue.
- Preserved Claude's reconstructed history below the handoff; no product code changed.

### Verification
- Docs-only cleanup. No build needed.

### Test Next
- None for Shawn. Next product step is team review of Rosa's menu/order page before coding.

---
## Session: August 5, 2026 - Catalog Price Normalization + No-Photo Fallback Cards
**Note:** Reconstructed catch-up entry written from `git show e1a53d8`, not live session notes - this shipped without a doc update at the time.
**Worked on:** Price display was duplicated and inconsistent across the restaurant order page, retail shop page, both checkout routes, the catalog showcase preview, and the owner's own catalog editor.

### Fixed / Built
- New shared `src/lib/catalogPricing.ts` - `parseCatalogPriceCents`, `formatCatalogMoney`, `formatCatalogPrice`, `normalizeCatalogPriceInput`.
- Wired `OnlineOrderClient.tsx`, `ShopClient.tsx`, both checkout API routes, `CatalogShowcase.tsx`, and `SiteEditor.tsx` through the shared module instead of each having its own regex.
- Menu/product items with no photo now show an initials-on-gradient fallback card instead of blank space, on both the order and shop pages.

### Test Next
- Restaurant test site `/order` and retail test site `/shop`: confirm prices render consistently, confirm a photo-less item shows the initials card.

---
## Session: August 5, 2026 - Save Confirmations Now Say Where to Look
**Note:** Reconstructed catch-up entry written from 11 commits (`c58741d`..`6b71444`), not live session notes - this shipped without a doc update at the time.
**Worked on:** Generic "Saved" toasts after photo/service/menu/product edits didn't tell the owner where on the live site to actually check.

### Fixed / Built
- New `getPhotoSlotSaveNotice()` in `SiteEditor.tsx` builds a specific message ("Saved to Home Hero. Check Home: top of page.") from each photo slot's own metadata, covering save/remove/gallery paths.
- Extended the same specific-location confirmation to text-content and service saves, then menu/product saves.
- Clarified admin photo labels to match live section names.
- Confirmed the wellness template's hero and CTA photo slots stay independent (no longer double-counted).
- Save notice now dismisses itself automatically when the owner navigates to view the live page.

### Test Next
- Change a hero photo, a service, and a menu item one at a time - confirm each shows a specific page/section location, not a bare "Saved."

---
## Session: August 5, 2026 - Wellness Luxe Template: Second Polish Pass
**Note:** Reconstructed catch-up entry written from 5 commits (`16621e6`..`13f0725`), not live session notes - this shipped without a doc update at the time.
**Worked on:** Follow-up refinement on the Wellness Luxe template added earlier the same day.

### Fixed / Built
- Polished desktop layout, navbar treatment, and mobile sticky CTA bar.
- Hero direction pushed toward more cinematic - diverged enough from the original calm/editorial concept that it was split into its own layout, `WellnessCinematicLayout.tsx` (`wellness_cinematic`), rather than overloading one template with two moods.
- New shared `publicServiceDescription.ts` so Impact/Editorial/Portrait and both wellness layouts fall back to consistent service copy.

### Test Next
- Check both `Wellness Luxe` and `Wellness Cinematic` in Edit My Site > Design on a real wellness/spa test site - confirm they read as genuinely distinct, and check the mobile sticky CTA bar on a real phone.

---
## Session: August 5, 2026 - Premium Wellness Luxe Template Added
**Worked on:** Shawn approved the Jony-led recommendation to close the gap between Found's hero imagery and the actual generated customer templates. First implementation step: make a real premium spa/wellness template option rather than faking it in marketing imagery.

### Fixed / Built
- Added `WellnessLuxeLayout.tsx` as a new public layout family.
- Added `wellness_luxe` to `LayoutType`, valid layout overrides, and the wellness/beauty layout matrix.
- Routed `[slug]` homepage rendering to the new layout.
- Added `Wellness Luxe` as a selectable design option in Edit My Site > Design.
- Review/testimonial treatment says `Client stories` and only renders owner-supplied testimonials. No Google Review implication was added.

### Verified
- `cmd /c npm run build` passed.
- `git diff --check` passed with only normal CRLF warnings.

### Test Next
- Open a spa/wellness/salon test site and compare the new homepage against the Found hero device promise.
- In Edit My Site > Design, switch to `Wellness Luxe` and confirm content/photos carry over cleanly.

---## Session: August 5, 2026 - Dedicated How Found Works Page + Clean Nav
**Worked on:** Shawn found the hamburger `How it works` link still failed after navigating to another menu page: it returned to the home hero instead of the section. Team agreed to stop fighting fragile mobile hash routing and give How It Works its own page.

### Fixed / Built
- Added `/how-it-works` as a dedicated marketing page.
- Updated `SiteNav.tsx`: `How it works` now routes to `/how-it-works`; mobile nav is simple close-then-route behavior with no hash-navigation branch.
- Updated the homepage hero and abbreviated homepage How It Works section to link to `/how-it-works`.
- Added `/how-it-works` to the root sitemap.
- Added root-site-only Organization, WebSite, and SoftwareApplication JSON-LD in `src/app/layout.tsx` for stronger Found entity signals across marketing pages without applying it to tenant sites.

### SEO / AEO / GEO
- Page has title, description, canonical, Open Graph, and Twitter metadata.
- Added WebPage, HowTo, and FAQPage JSON-LD.
- Copy answers launch-intent questions: how Found builds the site, how fast owners can go live, what can be edited after launch, what tools are included, and how Found differs from Wix/Squarespace/Shopify.

### Verified
- `cmd /c npm run build` passed; route list includes `/how-it-works`.
- `git diff --check` passed with only the normal CRLF warning.
- Production-build fetch on `http://127.0.0.1:3002`: `/how-it-works` returned 200, includes JSON-LD / FAQPage / HowTo / SoftwareApplication; `/sitemap.xml` includes `/how-it-works`.

### Test Next
- On iPhone, open hamburger from Home, Compare, Plans, and Industries. Tap How it works and confirm it always opens the dedicated page. Review the new page copy quickly before launch.
---
## Session: July 31, 2026 - Safari Custom-Domain Share URL Fix
**Worked on:** Shawn found Safari sharing a connected-domain site could still use the foundco.app fallback URL for RC Bicycles, even though Firefox respected the business domain.

### Fixed
- Public metadata and dashboard/catalog preview links now resolve through `getPublicSiteOrigin()`.
- Connected `website_config.custom_domain` wins first; slug.foundco.app is only the fallback.
- Shop and order metadata now also set `metadataBase` from the same public origin.

### Verified
- `cmd /c npm run build` passed.
- `git diff --check` passed.

### Test Next
- Shawn: open `https://rcbicycles.com` in normal Safari, tap Share, and confirm the shared/opened URL stays on `rcbicycles.com`. Repeat from Shop/Menu if present.

---
## Session: July 30, 2026 - PostHog Phase 2 Analytics Finished + Sentry/Menu-Gating Status Confirmed
**AI:** Claude Code (Sonnet)
**Worked on:** Shawn's computer crashed last session mid-setup on PostHog (TASKS.md Phase 2 analytics). He wasn't sure what had actually landed, and separately wanted confirmation that Sentry/uptime and the `menu_display` gating fix were really done.

### Confirmed already shipped, no action needed
- **Sentry + UptimeRobot** - fully committed (`b064b41`, `c897f6b`/`0ac6756`, `b31ba9a`), env vars live in Vercel, `/admin/health` page working.
- **`menu_display` $10 gating cleanup** - fully committed 2026-07-29 (`9212ccd`, `16ca352`).

### Fixed / Finished
- Found `posthog-js` in `package.json`, a new uncommitted `src/components/FoundPostHogProvider.tsx`, and its `layout.tsx` wiring sitting locally, never pushed - the actual crash casualty. `NEXT_PUBLIC_POSTHOG_KEY`/`NEXT_PUBLIC_POSTHOG_HOST` had already made it into Vercel before the crash.
- Read the provider code before trusting it: root-site-only via the existing `isRootSite` gate, manual `$pageview` capture (App Router doesn't fire full page loads on client nav).
- Ran a full `npm run build` before committing - clean, all 79 pages generated.
- Committed and pushed: `a70872c`.

### Verification
- `npm run build` passed clean.

### Test Next
- Confirm pageviews land in the PostHog dashboard for `foundco.app`, and confirm tenant sites/dashboard/admin do NOT appear there.

---

## Session: July 31, 2026 - Custom Domains Actually 404'd - Fixed
**AI:** Claude Code (Sonnet)
**Worked on:** Right after the false-"Live" fix below shipped, Shawn finished connecting `mambostudio.app` for real - correct DNS, Vercel confirmed both signals correct. The site still 404'd. Second, separate, more serious bug than the dashboard-status one.

### Root cause
`getCompanyByDomain()` in `src/lib/company.ts` filtered an embedded `website_config` resource without `!inner` - doesn't restrict which `companies` rows come back in Supabase/PostgREST, only which nested rows get attached. Every active company (34) was returned on every lookup; `.single()` choked getting 34 rows instead of 1. Broken for the entire life of the feature, unrelated to the DNS-status bug fixed hours earlier.

### Team review (Shawn-convened, Steve leading, second meeting same session)
- Marcus: his earlier "site-serving path is fine" was accurate for what he'd checked, but he hadn't traced all the way to "does a real domain render a real page."
- Angela: named the real gap - nobody had ever done a genuine end-to-end custom-domain test against the platform's real data shape (30+ companies), invisible in any small dev setup, guaranteed in the real one.
- Explicitly separated from the July 29 GO decision - not a reversal, `DECISIONS.md` gets an honest addendum since GO assumed this worked.
- Shawn approved the full recommendation at once, given real urgency (RC Bicycles about to sign up).

### Fixed
- `getCompanyByDomain()`: `website_config!inner(*)` + `.eq()` for a real join filter, `.maybeSingle()` instead of `.single()` - quiet on zero matches, captures a genuine collision to Sentry instead of silently 404ing an innocent company.
- Migration 049: unique index on `website_config.custom_domain`, audited live data first (zero duplicates), safe to apply immediately.
- `scripts/verify-domain-lookup.mjs`: standalone regression script (no test framework exists in this repo yet - out of scope to build one for a same-day hotfix). Creates two temp companies with distinct domains, confirms correct resolution both ways, confirms an unknown domain resolves to nothing, confirms the unique constraint rejects a collision, cleans up after itself. All 6 checks pass.
- Branded `[slug]/not-found.tsx` added (Jony's backlog item, done since already in this code path).
- Checked live marketing copy per Phil's ask: `plans/found/page.tsx` promises "your own domain... set up in minutes" - now actually true, flagged not edited (Phil's call).

### Verification
- `npm run build` passed clean.
- `scripts/verify-domain-lookup.mjs` - all 6 checks passed against live Supabase, temp data cleaned up after itself.
- **Live end-to-end confirmation:** `mambostudio.app` returns HTTP 200 with Lucky's real site (page title correct) - Shawn's original repro, fixed. Barrio Builders checked and does not have a real custom domain connected (was an illustrative example in `BRIEF.md`, not live data) - multi-company verification satisfied via the script's temp data instead.

### Test Next
- Ryan (RC Bicycles) connecting his real domain is the next live test of this exact path.

---

## Session: July 30, 2026 - False "Live" Domain Status Fixed
**AI:** Claude Code (Sonnet)
**Worked on:** Shawn tested the manual DNS connect flow himself with a real domain (`mambostudio.app`, DNS untouched) and Found immediately said "Live." It wasn't.

### Root cause
Confirmed directly against Vercel's API before proposing anything: Found only ever checked Vercel's domain-ownership signal (`GET /v10/projects/{id}/domains/{domain}`), never its separate DNS-config-correctness signal (`GET /v6/domains/{domain}/config`, `misconfigured` field). An untouched domain reads ownership-verified almost immediately since nothing conflicts with the claim - so "Live" could fire before any DNS work happened.

### Team review (Shawn-convened, Steve leading, full roster - transcript given to Shawn raw)
- Confirmed scope: the real site-serving path never used this field - Vercel's DNS is the actual traffic gate, so no tenant was ever served on the wrong domain. Dashboard trust bug, not a security bug.
- Craig's honest process note: the earlier same-day "verified live" test used `example.com`, which can never pass Vercel's real ownership check - that test proved API plumbing worked, not that the reported status was trustworthy.
- Priya: any check failure must fail closed (report not-live), never an ambiguous pass.
- Angela/Jony synthesis: don't flag "records look wrong" on the very first check (DNS propagation isn't instant) - grace window first, then a distinguishable, actionable message that re-shows the actual records.
- Logged non-blocking follow-ups: possible missing uniqueness constraint on `custom_domain` (Priya), server-side persistence of domain-health state (Priya), "email when actually live" (Chris).
- Assessed as a pre-launch correctness bug, not an incident - every company in the database is a test account, no real customer saw the false status.

### Fixed
- New shared `getVercelDomainStatus()` in `actions.ts` - single source of truth combining both signals; live requires ownership verified AND `misconfigured === false`.
- Fails closed on any fetch error/timeout.
- 12-second in-memory cache so concurrent polls for the same domain don't double Vercel API calls.
- `DomainConnector.tsx`: 3-check grace window before showing the "records don't look right yet" message; extracted `DnsRecordsList` so that message can re-show the actual records inline instead of leaving the owner stranded.
- Annotated the earlier same-day "Verified Live" changelog entry with the honest correction.

### Verification
- `npm run build` passed clean.

### Test Next
- Reconnect a domain with DNS not yet pointed at Found, confirm it now correctly shows not-live. Then actually fix the DNS and confirm it flips to verified once propagated - that recovery path hasn't been tested end-to-end yet.

---

## Session: July 30, 2026 - GoDaddy Auto-Setup Reverted, Manual Flow Fixed, Team-Process Correction
**AI:** Claude Code (Sonnet)
**Worked on:** The GoDaddy scoped-token auto-setup shipped earlier the same session got immediately rejected by Shawn - not usable by real non-technical business owners, full stop. Reverted.

### Process correction
Shawn caught that Claude had been running its own informal simulated "team discussions," excluding Angela/Jony (customer journey, UX - the exact perspectives needed here), and acting on its own synthesis as if it were real team consensus. Standing rule going forward, saved to Claude's memory: Claude never calls a team meeting - only Shawn does.

### Fixed
- Reverted `connectDomainViaGoDaddy()` and its UI panel entirely (`61c0364`).
- Shawn convened a real team meeting (Steve leading, full 8-person roster) - transcript given to him raw, no Claude commentary. Conclusion: hold new automation (Domain Connect needs GoDaddy's unpriced approval timeline; Entri costs $3-9K+/year against Found's current real customer count), fix the actual friction in the shipped manual flow instead.
- Shipped manual-flow improvements (`5c63ea1`): plain-English explanation of what the DNS records do, a warning to replace rather than duplicate an existing record, direct links to GoDaddy/Namecheap DNS settings, and an explicit "Done - I added these records" confirmation that swaps into a calm "checking now" message.
- Clarified with Shawn that nameserver delegation (a different, simpler-looking but riskier approach that could silently break existing business email) is explicitly NOT part of this - stuck with the safer per-record approach.

### Verification
- `npm run build` passed clean before both the GoDaddy-panel commit, the revert, and the manual-flow fix.

### Test Next
- Walk the manual connect flow as a non-technical owner would: explanation line, replace-warning, both registrar links, and the "Done - I added these records" confirmation state.

---

## Session: July 30, 2026 - GoDaddy DNS Auto-Setup Built
**AI:** Claude Code (Sonnet)
**Worked on:** Shawn challenged the earlier research conclusion that GoDaddy auto-setup needed an approval wait - caught a real conflation between Domain Connect (genuinely gated, no promised timeline, confirmed against Domain Connect's own docs) and GoDaddy's direct API (fully self-serve, zero approval needed). Approved building the direct-API path once that was clear.

### Built
- `connectDomainViaGoDaddy()` in `actions.ts`, built against GoDaddy's real v3 OpenAPI spec (fetched and read directly, not assumed): registers with Vercel first via the existing `connectCustomDomain()`, then creates the A/CNAME + any verification records at GoDaddy via `POST/GET/DELETE /v3/domains/zones/{domain}/dns-records` with Bearer-token auth. Clears any existing record at the same name+type first since GoDaddy's API has no replace endpoint - handles the common case of a freshly-bought domain already having a default parking A record.
- The pasted GoDaddy token is a local variable only - used once in that server-action call, never written to the database or logged, discarded immediately after.
- New opt-in panel in `DomainConnector.tsx`'s empty state ("On GoDaddy? Set your DNS up automatically →"), sitting below the existing manual-entry flow which is unchanged and still the default. Auto-setup success swaps the unverified-state manual DNS-record list for a "we did this for you" message instead.

### Verification
- `npm run build` passed clean.

### Test Next
- With a real GoDaddy account, generate a Personal Access Token scoped to `domains.dns:update`, paste it into the new panel on a real domain, and confirm the DNS records appear in GoDaddy's own dashboard and the domain goes live without any manual DNS entry.

---

## Session: July 30, 2026 - Registrar Recommendations Shipped + Domain Auto-Setup Research
**AI:** Claude Code (Sonnet)
**Worked on:** Shawn asked to pause other work and start on domain registrar auto-setup - which registrars to recommend, and which would actually support real DNS automation with Found's system.

### Team correction, logged
First pass floated GoDaddy/Namecheap/Squarespace as "familiar" names. Shawn caught it: Squarespace is a direct website-builder competitor to Found, not a neutral recommendation. Corrected to GoDaddy + Namecheap only, no forced 3rd pick.

### Shipped
- `DomainConnector.tsx` empty state now reads "Don't have a domain yet? We recommend GoDaddy or Namecheap."
- `npm run build` passed clean before commit.

### Researched, not built
- Domain Connect protocol (credential-free, redirect-to-consent DNS automation) - GoDaddy co-created the standard and has an existing template in the official public repo, but registering as a service provider needs a submitted template + direct approval from GoDaddy's team, timeline unknown.
- GoDaddy's scoped Personal Access Token API - usable today (opened up in April 2026), narrower blast radius than a full credential, but still requires the owner to generate and hand over a token, and Found to store it.
- Team decision: pursue Domain Connect as the target, scoped-PAT as the documented fallback, don't block v1 on Domain Connect's approval clock. Actual credential-handling code needs its own explicit sign-off before being written.

### Verification
- `npm run build` passed.

### Test Next
- None yet for the auto-setup piece - research only. Registrar recommendation copy is live, no QA needed beyond a visual glance at the empty Domain Connector state.

---

## Session: July 30, 2026 - PostHog Zero-Events Bug Fixed
**AI:** Claude Code (Sonnet)
**Worked on:** Shawn checked the PostHog dashboard right after the Phase 2 deploy above and it showed no events at all - not a propagation delay, a real bug caught by actually checking instead of assuming shipped code works.

### Fixed
- Root cause: React mounts fire child effects before parent effects. `PageviewTracker` (child) checked a module-level `initialized` flag inside its own `useEffect`, but `FoundPostHogProvider` (parent) only set that flag inside *its* `useEffect` - so on every fresh page load, the child's effect ran first, saw `initialized === false`, and silently skipped the pageview capture. Since `capture_pageview` is intentionally `false` (manual tracking, required for App Router), this meant the first pageview of literally every visit was dropped, and PostHog would only ever record something after a subsequent client-side route change.
- Fix: moved `posthog.init()` out of `useEffect` into the component's render body (`typeof window === "undefined"` guarded so it no-ops during SSR), so initialization is synchronous and always complete before any child effect can check it.
- `npm run build` passed clean before pushing.

### Verification
- `npm run build` passed.

### Test Next
- Load `foundco.app` fresh (full navigation, not a client-side link click from elsewhere in the app) and confirm a `$pageview` event appears in the PostHog dashboard.

---

## 2026-07-27 - Edit My Site Hub Rebuild
**AI:** Claude Code (Opus)
**Worked on:** Built the three-tier hub decided in DESIGN_DECISIONS.md [2026-07-27] - Edit My Site was one long scrolling page (Homepage, Featured Update, About, Contact, Menu/Shop, Services, Photos, Domain all stacked); replaced it with a landing hub of tiles that drill into a focused view per page/section.

### Built
- `SiteEditor.tsx` now has a `view` state (`hub | home | about | contact | catalog | services | photos | businessInfo | domain`). Every existing section's working logic (save handlers, menu/catalog editing, photo picker, domain connector, announcement/Featured Update, AI rewrite) is unchanged - only wrapped behind its own view instead of always rendering. This was a deliberate low-risk choice over extracting each section into separate components/routes.
- Hub screen: live-site preview strip, a Pages tile grid (Home, About, Contact, Shop/Menu, Services, Gallery - Shop/Menu and Services only appear when relevant to the business, same gating as before), a Business Info tile, and a Site-wide row (Photo library, Domain).
- New: **Business Info** - genuinely didn't exist before. Added `updateCompanyField` in `actions.ts` (explicit allowlist: name/phone/email/city/state only - the companies table also holds plan/billing/Stripe fields that must stay unreachable through this). Fields save on blur, no Save button, matching the "easy as taking a picture" bar from the design decision.
- Hub tiles use the real typography tokens from `src/lib/dashboard/typography.ts` and no icon badges - quiet cards, matching the approved mockup.
- `Photo library` tile links out to the existing `/photos` tab rather than duplicating it - that's where raw upload/browsing already lives; SiteEditor's own photo picker (per-slot assignment) stays where it already was, under Home.
- Verified with `npm run build` - clean, no errors or warnings.

### Known simplification, flagged not hidden
- Per-page photo pickers (About's photo picked from inside About, etc.) were **not** built this pass - the existing "Photos around the site" map (all slots: Header/About/Visit-CTA/Gallery/Featured Update/Contact) stays consolidated under the Home view, same as it was before this rebuild. Decomposing that shared map into true per-page pickers is real follow-up work, not done here - the map has shared state (unassigned photo pool, slot-clearing logic) that touches multiple sections at once, higher risk to split apart than the navigation rebuild itself.

### Test Next
- Dashboard -> More -> Edit My Site on your phone. Confirm the hub loads with tiles instead of one long page, tapping a tile opens just that section with a working back button.
- Open Business Info, edit phone and email, confirm they save on blur (small "Saved" indicator, no Save button) and persist after leaving and coming back.
- Confirm every existing capability still works exactly as before inside its new view: About text + AI rewrite, Contact fields, Menu/Shop item editing, Services add/edit/remove, Gallery photo assignment, Featured Update toggle/style/copy, Domain connect.

---

## 2026-07-26 - Site Editor First Impression Slate
- Rebuilt the Edit Website first-impression area into explicit owner controls: preview, headline, supporting line, main button, short hook, header photo, and AI rewrite.
- Moved site photo assignment into a separate "Photos around the site" map so owners can clearly change Header/About/Visit/Gallery/Featured Update/Contact imagery.
- Verified with `npm run build`.
## Session: July 26, 2026 - Site Editor Owner Flow
**AI:** Codex
**Worked on:** Shawn approved the Steve/Jony/Craig direction to remove the confusing Site Studio checklist and make Edit My Site feel like an owner-facing website editor.

### Fixed
- Removed the four diagnostic readiness cards from the top of Edit My Site.
- Replaced the top copy with clear owner language: Edit website / Edit your website / Change what customers see on your live site.
- Moved the Homepage edit preview to the front of the flow instead of hiding it under a checklist.
- Simplified lower section language into owner-facing panels: Featured Update, About, Contact, Menu/Shop, Services, Photos, and Domain.

### Verification
- `cmd /c npm run build` passed.
- `git diff --check` passed after doc formatting cleanup.

### Test Next
- Shawn should open `my.foundco.app > More > Edit My Site` on Lucky/tshirts and confirm the top no longer shows the four status cards, the first editable object is Homepage, and the remaining sections read plainly.

---

## Session: July 26, 2026 - Featured Update Smart Draft Guard
**AI:** Codex
**Worked on:** Shawn approved the team plan to make Featured Update think for the business owner and avoid generic/redundant public copy.

### Fixed
- Added a shared Featured Update draft helper for dashboard and public site rendering.
- Drafts now use industry, sub-industry, products/menu items, and services where available.
- Generic saved filler is replaced with smarter draft copy before it appears in the editor or live site.
- Public pages now avoid duplicating nearby hero/about/shop/menu copy by changing or hiding the section.
- Real owner edits are preserved unless they are blank or known generic filler.

### Verification
- `cmd /c npm run build` passed.

### Test Next
- Shawn should test Lucky, Rosa's, Construction, and FRCC on mobile and confirm Featured Update copy is specific, useful, and not repeating the section around it.

---
## Session: July 26, 2026 - Featured Update Public Redesign
**AI:** Codex
**Worked on:** Shawn approved the Jony/Steve-led plan to replace the weak public announcement card with a premium, industry-aware featured update.

### Fixed
- Renamed the dashboard section to Featured Update.
- Removed the word Announcement from the public site surface.
- Rebuilt the tenant-site section as a full-width feature band instead of a boxed card.
- Added industry-aware public eyebrow language and starter content.
- Made the on-toggle seed useful starter copy/button/link when those fields are blank.

### Verification
- `cmd /c npm run build` passed.

### Test Next
- Shawn should test Lucky on mobile after deploy: toggle Featured Update off/on, refresh the live site, and confirm the section below the hero feels premium and specific.

---
## Session: July 26, 2026 - Live Announcement Schema Fix
**AI:** Codex
**Worked on:** Announcement was turned on in the dashboard but missing on the live site.

### Fixed
- Applied existing additive migration `048-site-announcements.sql` to live Supabase.
- Restored Lucky announcement to on after confirming the earlier toggle could not persist before the columns existed.
- Verified the live Lucky page contains the announcement text.

### Test Next
- Shawn should refresh Lucky live site and confirm the announcement appears visually below the hero.

---

## Session: July 26, 2026 - Announcement Editor Clarity
**AI:** Codex
**Worked on:** Dashboard announcement editor polish after Shawn flagged unclear tap-to-edit behavior, unreadable style variants, and corrupted labels.

### Fixed
- Reworked the announcement editor into an explicit preview and controls layout.
- Added clear controls for headline, message, button text, image, style, and destination.
- Cleaned visible corrupted labels in the site editor.

### Verification
- `cmd /c npm run build` passed.

### Test Next
- Shawn should test Lucky > Edit My Site > Announcement, then confirm the live announcement looks correct.

---
## Session: July 25, 2026 - Final Launch Email Check Passed
**AI:** Codex
**Worked on:** Shawn completed the final quick receipt/payment email check after the activation email polish.

### QA Passed
- Final receipt/payment email check passed.
- Current launch smoke checklist is fully passed: Safari shop/cart/payment-start, fresh signup/payment/site-live email, dashboard switching, lead notification clearing, and receipt/payment email.

### Next
- Summarize launch readiness and choose the first traffic/launch move while continuing post-launch polish.

---
## Session: July 25, 2026 - Lead Notification Passed
**AI:** Codex
**Worked on:** Shawn tested the launch checklist lead/inquiry notification path.

### QA Passed
- Public form/inquiry submission worked.
- Dashboard notification appeared, the lead was visible, and the alert cleared after handling/viewing.

### Test Next
- Final quick receipt/payment email check after the latest email polish, then summarize launch readiness.

---
## Session: July 25, 2026 - Dashboard Switching Passed
**AI:** Codex
**Worked on:** Shawn tested dashboard company switching as launch checklist item #3.

### QA Passed
- Switching businesses from the dashboard company picker works.
- Shawn confirmed the dashboard changed to the selected business correctly.

### Test Next
- Launch checklist #4: submit one public form/inquiry, then verify the dashboard red dot appears and clears after viewing/marking it handled.

---
## Session: July 25, 2026 - Activation Email Polish
**AI:** Codex
**Worked on:** Fresh signup/payment passed functionally, but Shawn flagged the site-live email as not polished enough for launch and inconsistent between Spark and Apple Mail.

### Fixed
- Polished the site-live and activation-reminder email shell in `src/lib/activationEmails.ts` with a consistent dark Found card.
- Reused the production business-name polish helper so lowercase company names are title-cased in email subjects and body copy.
- Simplified the site-live message and button labels for a clearer paid activation moment.

### Verification
- `git diff --check` passed.
- `cmd /c npm run build` passed.

### Test Next
- Trigger one new activation/site-live email and verify it in Spark and Apple Mail before marking launch checklist #2 fully done.

---
## Session: July 25, 2026 - Launch Smoke Test #1 Passed
**AI:** Codex
**Worked on:** Shawn completed the first launch smoke test after the Safari/Stripe lazy-load fixes.

### QA Passed
- Normal iPhone Safari shop/cart/payment-start smoke passed for the public shop path.
- No Stripe `inner.html` download prompt was reported during this pass.

### Test Next
- Launch checklist #2: fresh customer signup from `foundco.app` through onboarding, plan selection, payment, and correct dashboard landing.

---
## Session: July 24, 2026 - Magic Login Email Raw Link Fix
**AI:** Codex
**Worked on:** Shawn found the dashboard login email showing the full Supabase one-time auth URL as visible blue text under the polished Open Dashboard button. Team call: launch polish/security trust bug. Keep the login URL behind the button only.

### Fixed
- Removed the visible raw `${link}` fallback paragraph from `src/app/dashboard/api/send-login/route.ts`.
- Kept the generated Supabase magic link in the Open Dashboard button `href`.
- Restored polished arrow/dash rendering through HTML entities and removed the footer location that iPhone Mail auto-linked in blue.

### Verification
- `git diff --check` passed with only the repo's normal CRLF warning.
- `cmd /c npm run build` passed.

### Test Next
- Request a new dashboard login email, confirm there is no long blue Supabase URL, no ugly ASCII arrow, and no blue auto-linked footer location, then tap Open Dashboard and confirm login still works.

---
## Session: July 21, 2026 - Public Write Rate Limits
**AI:** Codex
**Worked on:** Team next step after Safari Stripe popup was fixed: protect anonymous/public write routes before launch traffic increases. Steve/Craig/Priya scoped this as a narrow launch guard, not a full platform rewrite.

### Fixed
- Added a shared public rate-limit helper with IP-aware, endpoint-specific buckets and clear 429 responses.
- Guarded public writes for subscribers, booking creation, shop checkout/complete, restaurant online-order checkout/complete, estimate pay/accept/decline, magic-link login, password login, website lead/reservation server actions, and reply links.
- Kept authenticated dashboard CRUD routes out of this pass to avoid blocking real owner work.
- This is an in-process launch guard; a Supabase/edge-backed distributed ledger remains the future hardening option if traffic or abuse patterns require it.

### Test Next
- Normal users should see no change. If one browser repeatedly submits the same public form or payment action too quickly, it should receive `Too many attempts. Please try again...` instead of creating more writes/emails/payment work.

---
## Session: July 21, 2026 - Lazy Load Public Shop Stripe Forms
**AI:** Codex
**Worked on:** Shawn confirmed iPhone Safari normal mode still showed the Stripe `inner.html` download prompt after extensions and Hide IP Address were ruled out, while Firefox and Safari Private did not. Team read: stop importing Stripe from public shop/order bundles until the customer intentionally starts payment.

### Fixed
- Moved shop checkout Stripe Elements code out of `ShopClient` into a payment-only lazy component.
- Moved restaurant/menu order Stripe Elements code out of `OnlineOrderClient` into a payment-only lazy component.
- Public shop/order pages can now render product/menu browsing without top-level Stripe imports.
- Preserved the mobile checkout sheet body-lock/visible-viewport fixes already in the order checkout file.
- Build passes with `cmd /c npm run build`.

### Test Next
- After deploy, test normal Safari on Lucky/T-Shirts shop pages without tapping checkout. Browse, open product details, add/remove items, and confirm the `inner.html` download prompt does not appear.
- Then tap checkout and start payment. If the prompt appears only at the real Stripe payment step, the fallback discussion is hosted Stripe Checkout or a Stripe support case.

---
## Session: July 21, 2026 - Lazy Load Stripe Activation Overlay
**AI:** Codex
**Worked on:** Shawn confirmed the Safari `inner.html` download prompt still appeared in normal Safari, while Firefox and Safari Private did not show it. Team read: normal Safari may still be triggering a preloaded activation chunk. Craig found `ActivateOverlay` still had a module-level `loadStripe(...)`, so any chunk preload could download Stripe before the user intentionally activated or paid.

### Fixed
- Removed the module-level `loadStripe(...)` call from `ActivateOverlay`.
- `ActivateOverlay` now creates the Stripe promise only after a real activation client secret exists and the payment step is rendering.
- Build passes with `cmd /c npm run build`.

### Test Next
- After deploy, test normal Safari again on Lucky/T-Shirts shop pages before starting checkout. If the popup still appears, the remaining suspect is the public shop/order checkout bundle or a Safari-specific Stripe PaymentElement behavior.

---
## Session: July 21, 2026 - Stop Stripe Prefetch on Public Preview Banner
**AI:** Codex
**Worked on:** Shawn still saw iPhone Safari asking to download Stripe `inner.html` on Lucky and T-Shirts after all launch security headers were rolled back. Team read: this is not the header layer. Craig found the public preview banner was prefetching the activation overlay, and that overlay has a top-level Stripe load.

### Fixed
- Removed the background `ActivateOverlay` prefetch from `PreviewBanner` so Stripe.js is not intentionally downloaded while a visitor is only browsing a public site.
- Kept activation behavior intact: Stripe loads only when the owner taps the activate banner.
- Left shop/order checkout code untouched so this fix isolates the passive browsing prompt first.

### Test Next
- After deploy, open Lucky and T-Shirts shop pages on iPhone Safari and browse/add/view product details without tapping checkout or activate. The `inner.html` download prompt should not appear.
- If the prompt appears only after tapping `Continue to payment`, the next team step is a direct Stripe PaymentElement investigation or hosted Checkout fallback.

---
## Session: July 21, 2026 - Full Security Header Rollback
**AI:** Codex
**Worked on:** Shawn still saw iPhone Safari offering to download Stripe `inner.html` on Lucky and T-Shirts after the partial header rollback. Team decision: restore the exact pre-header `next.config.ts` shape before launch testing continues.

### Fixed
- Removed all custom global response headers from `next.config.ts`.
- Restored the config to the known-good pre-security-header structure.
- Build passes with `cmd /c npm run build`.

### Test Next
- Wait for Vercel to deploy this rollback, then retest Lucky/T-Shirts shop checkout on iPhone Safari. If the prompt remains after this deploy is live, the cause is not the launch-header change and needs direct checkout/Stripe script investigation.

---
## Session: July 21, 2026 - Stripe Safari Header Hotfix
**AI:** Codex
**Worked on:** Shawn found iPhone Safari showing a download prompt for Stripe `inner.html` on both T-Shirts and Lucky after the security-header deploy. Team call: treat this as launch-blocking and remove the Stripe-sensitive header layer immediately.

### Fixed
- Removed the CSP report-only baseline, Permissions-Policy, and Cross-Origin-Opener-Policy from the launch header set.
- Kept only low-risk global headers: `X-Content-Type-Options`, `X-Frame-Options`, and `Referrer-Policy`.
- Build passes with `cmd /c npm run build`.

### Test Next
- Retest Lucky/T-Shirts shop checkout on iPhone Safari. The `inner.html` download prompt should be gone before we move to speed tuning.

---
## Session: July 21, 2026 - Launch Security Headers
**AI:** Codex
**Worked on:** Team next step after payment QA: add the first launch-safety header layer before sending more traffic to Found. Steve/Craig call: protect the browser surface now, but keep CSP report-only until Stripe/media/dashboard flows get one live smoke pass.

### Fixed
- Added global Next response headers in `next.config.ts`: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and `Cross-Origin-Opener-Policy`.
- Added a production-aware `Content-Security-Policy-Report-Only` baseline that allows Found, Stripe, Supabase, Vercel analytics/live tooling, Google Places, media blobs, and uploads without enforcing/blocking yet.
- Kept the change isolated to config; no dashboard, checkout, shop, or website UI files were touched.
- Build passes with `cmd /c npm run build`.

### Next
- After deploy, smoke-check one public site, dashboard login, Stripe checkout, Stripe Connect setup link, and media upload. If clean, the next P1 is public write-route rate limiting / bot controls.

---
## Session: July 21, 2026 - Pay-Later Estimate QA Verified
**AI:** Codex
**Worked on:** Shawn tested the exact current pay-later estimate path on Construction and shared the resulting dashboard state. Team read: the estimate stayed unpaid, remained in needs-payment, and showed the payment request as sent with the balance still due.

### Verified
- Customer accepted an estimate without completing payment immediately.
- Dashboard did not mark the estimate paid.
- Estimate list showed `Payment request sent` and the amount still due.
- Counts updated to show open / needs-payment / paid / all states separately.

### Status
- Strict launch payment QA is now complete from Found-side evidence unless Shawn wants a separate Stripe Dashboard reconciliation.

---
## Session: July 21, 2026 - Fulfillment Details in Paid Order Receipts
**AI:** Codex
**Worked on:** Shawn completed the live T-Shirts shipping checkout and asked whether customer receipts should show where an order ships or where pickup happens. Team call: yes, every paid order receipt must confirm fulfillment clearly, and pickup must not invent an address.

### Fixed
- Shopping-cart order completion now formats fulfillment as a receipt block instead of a sentence: Shipping shows `Ship to` with the customer-entered address; Pickup shows `Pickup details`.
- Restaurant/menu online-order completion now uses the same receipt block and includes pickup time when present.
- Both owner and customer receipts now pull a real saved `company_locations` address when available; otherwise pickup says the business will contact the customer with pickup instructions.
- Removed the heavy bordered owner-email fulfillment box that made shipping addresses look like a loud blue link block.
- Build passes with `cmd /c npm run build`.

### QA Status
- Shawn confirmed the T-Shirts live shop order with shipping completed end to end, including customer and owner emails.
- Strict payment QA still has the exact current pay-later estimate path open unless Shawn waives it for launch.

---
## Session: July 21, 2026 - Native Shipping Address Checkout Fields
**AI:** Codex
**Worked on:** Shawn found that selecting Shipping in the T-Shirts shop checkout showed one large address textarea instead of normal shipping fields. Team call: Steve/Jony/Angela treat this as a launch-blocking checkout trust issue; Craig/Priya keep one normalized commerce payload.

### Fixed
- Replaced the shop checkout shipping textarea with native address inputs: street, unit, city, state, ZIP, and country.
- Added browser/iOS/Android autofill hints using shipping address autocomplete tokens so saved address suggestions can populate correctly.
- The checkout API now accepts structured address parts, validates required shipping fields, preserves a clean formatted address for existing lead/message/email display, and stores the structured parts in lead partial answers.
- Build passes with `cmd /c npm run build`.

### Test Next
- On `tshirts`, add a product to cart, choose Shipping, tap Street address, and confirm iPhone offers saved address autofill.
- Confirm the fields populate cleanly, checkout enables after required address pieces are present, and the paid order email/owner lead show the shipping address clearly.

---
﻿## Session: July 21, 2026 - Stripe Connect Profile Ledger Audit
**AI:** Codex
**Worked on:** Shawn asked whether every profile and every Stripe account had actually been audited. Craig/Priya ran a read-only Found production database ledger pass across every company with a Stripe Connect account.

### Findings
- Production has 37 companies total.
- 28 companies have a Stripe customer ID for Found plan billing.
- 6 companies have a Stripe Connect account for receiving customer payments: `bluelunaevents`, `construction`, `lucky`, `molcas-mexican`, `rosas`, and `tshirts`.
- Found DB payment evidence exists for 5 of those 6 connected profiles:
  - `bluelunaevents`: estimate deposit payment evidence.
  - `construction`: multiple estimate payment events, including deposit/final-balance records.
  - `lucky`: paid retail `shopping_order` evidence.
  - `molcas-mexican`: older online-order payment attempts and paid records from June testing.
  - `rosas`: paid restaurant `online_order` evidence from July testing.
- `tshirts` has Stripe Connect set up, but Found DB does not show a completed paid order or estimate payment under that connected account.

### Still Open
- This was a Found database ledger audit, not a direct Stripe Dashboard/API reconciliation. Live Stripe API access is still not available from this workspace without pulling a live secret from Vercel/Stripe.
- To say every connected profile has a successful payment test, `tshirts` needs one completed live shop-order payment or a Stripe Dashboard confirmation tied to `acct_1TtMCKEuYeP9g9CO`.
- Exact current pay-later estimate path remains unverified.

### Tooling
- Added `scripts/audit-payment-ledger.mjs`, a read-only audit command that summarizes connected profiles and Found-side payment evidence without printing secrets.

---
## Session: July 21, 2026 - Launch Payment QA Evidence Backfill
**AI:** Codex
**Worked on:** Shawn clarified that live payment QA had already been tested but not recorded after a prior crash/context loss. Craig/Priya led a read-only production Supabase audit before changing the launch checklist.

### Verified
- Fresh onboarding / activation payment: Shawn confirmed it passed live; production test-owner companies show active subscriptions and Stripe customer IDs.
- Lucky (`lucky`) retail shop order: paid $1.00 `shopping_order` for Shawn Lopez from July 17, 2026, selected option `Size: XL`, Stripe PaymentIntent recorded in `leads.partial_answers`.
- Rosa's Mexican Food (`rosas`) restaurant online order: paid $1.00 `online_order` records for Shawn Lopez, including the July 18, 2026 closed Carne Asada order, Stripe PaymentIntent recorded.
- Blue Luna Events (`bluelunaevents`) estimate deposit: accepted $1.00 estimate for Shawn Lopez, 50% deposit, `payment_status: deposit_paid`, `accepted_payment_choice: pay_now`, Stripe PaymentIntent recorded, deposit paid July 20, 2026.
- Construction (`construction`) estimate final balance: $1.09 estimate marked `payment_status: paid`, deposit paid July 16, 2026, final paid July 16, 2026, payment-link timestamp recorded.

### Still Open
- Exact current pay-later estimate path remains unverified: need one live `accepted_payment_choice: pay_later` / `accepted_pay_later_at` test or direct production evidence.
- Stripe API reconciliation could not run from this machine because `.env.local` exposed only a test Stripe secret; live connected-account PaymentIntent reads failed. Supabase production rows were verified.

### Documentation
- Updated `SESSION_HANDOFF.md` and `TASKS.md` with the verified evidence and the remaining pay-later gap.
- Reinforced the process rule: after meaningful code, QA, or note changes, update the handoff/task/changelog docs before ending the session.

---
## Session: July 20, 2026 (part 2) - All 5 Launch-Audit P0s Fixed
**AI:** Claude Code (Opus)
**Worked on:** Shawn approved fixing every P0 from `LAUNCH_READINESS_AUDIT_2026-07-20.md` same-session, plus the two feature requests he tied to it (review-requests copy, per-business sitemap toggle).

### Fixed
- **Post-activation login handoff.** `confirmActivation()` (`src/app/activate/activateActions.ts`) now generates a real Supabase sign-in link for the owner right after payment succeeds (same mechanism the existing working email-login flow already uses), and returns it. `src/app/activate/confirm/route.ts` redirects the owner's browser through that link instead of straight to `/api/select-company`, which required a session that never existed. `src/app/dashboard/(auth)/auth/callback/route.ts` now accepts an optional `next` param (restricted to internal paths) so the sign-in redirect can land exactly on the new company's dashboard instead of the generic `/select` picker. Falls back to the old (broken) direct link only if link generation fails, so activation itself never hard-fails on this.
- **"Automatic review requests" claim.** Changed to "coming soon" in `src/app/plans/found-business/page.tsx` (feature list, FAQ, metadata, closing description) and `src/app/dashboard/(app)/more/page.tsx` (both plan-card feature lists and the plan promise line) instead of building the feature - per Shawn.
- **Catalog editor mobile keyboard/scroll-lock bug.** `src/components/dashboard/CatalogManager.tsx`'s Add/Edit Item sheet now uses the identical body-lock/`visualViewport` effect `SiteEditor.tsx` already has, ported directly rather than reimplemented.
- **Sitemap/indexing.** Added `companies.is_test` (migration 048, `scripts/migration-048-is-test.sql`) - separate from `is_comp` (billing) on purpose, since a real client could be comped and a test company could still be full-price. Added a "Hide from search" / "Show in search" toggle per business in `/admin/businesses` -> Manage (`toggleTest` action, mirrors the existing `toggleComp` pattern), plus a "Test" filter tab. `src/app/sitemap.ts` now excludes `is_test` companies and, separately, now includes Found's own marketing/legal pages (`/`, `/plans/*`, `/industries/*`, `/privacy`, `/terms`) which were previously missing entirely. Test companies' public pages also now get `robots: {index: false, follow: false}` in `src/app/[slug]/layout.tsx`, so they're excluded even if found some other way, not just omitted from the sitemap.
- **One-time data classification (confirmed with Shawn before running):** queried all 37 companies directly - 36 are under `shawnlopez@me.com`, `supershawn@email.com`, or a `@sayitmarketing.com` address (Shawn's own practice/demo accounts); the only company under a different, real owner email is "Nereidas salón" (`nlopez0441@gmail.com`). Marked all 36 as `is_test = true`; left Nereida's live and indexable.
- Verified with `npm run build` after each change and once more at the end - clean throughout.

### Test Next
- Full fresh onboarding -> activation on a throwaway test business, confirm you land signed into the dashboard, not `/login`.
- Confirm `/admin/businesses` shows the new "Hide from search" toggle and "Test" filter, and that toggling it actually changes `is_test` (reload the page, confirm it persisted).
- Open `foundco.app/sitemap.xml` and confirm it now lists Found's own pages plus only Nereida's salon among tenant sites - none of the 36 practice companies should appear.
- Open More -> [Business plan card] and the found-business plan page, confirm review requests read "coming soon" everywhere, not as a live feature.
- On mobile, open a Products/Menu catalog item to edit it, confirm the background no longer scrolls behind the sheet and the keyboard doesn't cover the price field.

---

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

---
## Session: July 19, 2026 - Contact Editing + Video Media Foundation
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

---
## Session: July 18, 2026 - Named Site Photo Slots
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

---

## July 25, 2026 - Site Announcements / Promotions
**AI:** Codex
**Worked on:** Added a premium, owner-editable announcement block for live customer websites.

### Completed
- Added `SiteAnnouncement` shared renderer for all public site layouts.
- Added announcement fields to website config types and copy polishing.
- Added Edit My Site controls for enabling the announcement, editing copy/button/link, choosing style, and assigning announcement media.
- Added migration `048-site-announcements.sql` for website_config announcement fields.
- Verified with `cmd /c npm run build`.

### Needs QA
- Apply migration if needed.
- Turn announcement on for a retail/shop site and verify the live block + CTA.
- Repeat for restaurant/menu and service/estimate destinations.
---

## July 26, 2026 - Announcement QA Correction
**AI:** Codex
**Worked on:** Fixed launch QA issues Shawn found in the new announcement editor.

### Completed
- Generic retail/apparel announcement defaults now say `New in the shop.` instead of bike/back-to-school copy.
- Public site fallback only uses back-to-school copy for bike-related businesses.
- Announcement editor style controls now keep readable text and borders in Light mode.
- Edit sheets open with the visible default announcement copy.

### Verification
- `git diff --check` passed.
- `cmd /c npm run build` passed.
---

## July 26, 2026 - Edit Site Slate Hierarchy Pass
**AI:** Codex
**Worked on:** Whole Edit My Site slate cleanup after Shawn flagged that the page still felt like a backend/settings slate instead of a guided owner workflow.

### Completed
- Added a Site Studio opening section with four readiness signals: First impression, Current push, Business photos, and Launch trust.
- Reworded tap-to-edit labels into clearer owner actions like Change headline, Change supporting line, and Change your story.
- Added explicit section intros for First impression, Featured Update, About, Contact, Shopping/Ordering, Services, Photos, and Custom Domain.
- Gallery/photo guidance now calls out missing owner-photo slots instead of leaving the owner to decode stock placeholders.
- Custom Domain now sits under Launch trust language so it reads like a launch-quality step, not a random settings box.

### Verification
- `cmd /c npm run build` passed.
- `git diff --check` passed with only the repo's normal CRLF warning.

### Test next
1. Open `my.foundco.app` > Edit My Site on Lucky or another test business.
2. Confirm the top says Site Studio / Make the site ready.
3. Tap each readiness signal and confirm it jumps to the right section.
4. Confirm Home, Featured Update, About, Contact, Products/Menu, Services, Gallery, and Custom Domain read like guided owner tasks.

---

## August 8, 2026 - Photos Page Launch Cleanup
**AI:** Codex
**Worked on:** Simplified Photos so non-technical owners understand Favorites, Gallery, and page photo placement.

### Completed
- Renamed the Photos flow around owner language: All Photos, Gallery, Favorites, and Albums.
- Heart now saves a photo to Favorites instead of implying website placement.
- Gallery is now its own explicit action on each photo.
- Gallery and Favorites taps now show an immediate confirmation pill.
- Gallery now appears before Favorites on photo thumbnails and in the full-screen viewer.
- Photos tabs now stay visible while scrolling.
- Favorites moved from a top-level tab into the All Photos filter row.
- Added All Photos filters for All, Favorites, and Not on site.
- Add to Site now uses a larger preview and asks where the owner wants the photo.
- Removed Featured Update and Website gallery from Add to Site to avoid mixing page placement with homepage feature/banner controls.
- Public Gallery now reads owner-managed `in_gallery` photos instead of generic `for_website` placement rows or legacy media fallback rows.
- Deleting a photo now also removes matching legacy media records so old test images do not stay stuck on public Gallery pages.

### Verification
- `cmd /c npm run build` passed.
- `git diff --check` passed with only the repo's normal CRLF warning.
