# SESSION_HANDOFF.md - Found Co. Current Truth
### Start here after `BRIEF.md`. Keep this short, current, and plain-English.
*Last updated: July 7, 2026*

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

- Repo is on `main`.
- Latest known commit: `0567b54` - `Fix payment reliability, root safe-area gap, redundant builder header`.
- Worktree is clean and pushed.
- Shawn live-tested all 6 July 6 items on `my.foundco.app` on July 7. Results: Camera, Company Switching, Leads/Requests sheet, Schedule all confirmed working. Estimate Requests confirmed working but surfaced a new bug (builder header gap). Estimates/Payments confirmed working but flagged a serious one: after paying, the estimate still showed the full unpaid balance.
- Traced the payment issue: the client-side "mark as paid" call had no error handling - if it failed, the customer's card was still charged successfully but our own record never updated, and nothing told anyone it happened. Now retries 3x. **Not fully closed** - see "Still Needs Work," the Stripe Dashboard webhook config needs a human to verify since no AI in this session has Stripe Dashboard access.
- Also found the builder gap's real root cause: `viewport-fit=cover` was never set anywhere in the app, so `env(safe-area-inset-*)` has been resolving to `0` sitewide, not just in the estimate builder. Fixed at the root.

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

---

## Still Needs Work

- [ ] **IMPORTANT - needs a human with Stripe Dashboard access, not an AI task:** verify the Stripe webhook endpoint is registered to receive "Connect" events (events from connected accounts), not just the platform's own direct events. This estimate deposit payment is a Stripe Connect charge (`stripeAccount: connectAccountId`), and `payment_intent.succeeded` for that only reaches our webhook if a Connect-scoped webhook endpoint exists in the Stripe Dashboard under Developers -> Webhooks. No AI in this project has Stripe Dashboard login access to check this directly. The client-side retry fix (above) covers most real-world cases, but this webhook is the true safety net for the rare case where all 3 client retries fail - right now nobody has confirmed it actually fires.
- [ ] Live-test this session's fixes (builder gap actually gone, payment retry behavior, redundant header copy removed) on `my.foundco.app`.
- [ ] QA Schedule across quote-first, restaurant, and booking-first profiles.
- [ ] Confirm whether sticky Schedule tabs are worth continuing. Shawn said it is okay if freeze/sticky tabs do not happen.
- [ ] QA payable estimates end to end with Stripe-connected account:
  - Accept and Pay.
  - Accept now, pay later.
  - Receipt email.
  - Owner email.
  - Dashboard states: `Paid`, `Deposit paid`, `Accepted, unpaid`.
  - Public paid state.
- [ ] Keep AI estimate builder gated until manual estimate + payment flow passes live QA.
- [ ] Invoice-now / POS-lite planning is still important, but behind live QA and More / Manage IA cleanup.

---

## Shawn Test Steps

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

## Required End-Of-Session Update

Before ending any work session, update this file with:

1. What changed or shipped.
2. What still needs work.
3. Shawn's plain-English test steps.
4. Commit hash, if a commit was made.

If there was a product or design decision, also update `DECISIONS.md` or `DESIGN_DECISIONS.md`.
If there was meaningful code or QA work, also update `CHANGELOG.md`.
If priorities changed, also update `TASKS.md`.
