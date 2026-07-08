# CHANGELOG.md - Current Session History
### Keep this file readable. Older detailed history lives in `CHANGELOG_ARCHIVE.md`.
*Last organized: July 6, 2026*

---

## Current History Policy

- `SESSION_HANDOFF.md` is the first source of truth for what changed, what is open, and what Shawn tests next.
- `CHANGELOG.md` keeps recent active work only: the current working window plus anything still affecting launch/test decisions.
- `CHANGELOG_ARCHIVE.md` keeps older detailed history so context is never lost.
- When history gets heavy, move older completed sessions to `CHANGELOG_ARCHIVE.md` and leave a short summary here.

---

## Session: July 8, 2026 — Comp Activation Before the Card Prompt
**AI:** Claude Code (Sonnet 5)
**Worked on:** Shawn flagged that the first comp mechanism (mark comp *after* onboarding from `/admin/businesses`) still let the business see a real Stripe card screen before Shawn could intervene. Asked for team discussion, then asked for both options the team laid out rather than picking one.

### Completed
- **`activateAsComp(slug, plan)`** in `src/app/activate/activateActions.ts` — skips Stripe entirely, sets `subscription_status: "active"` + `is_comp: true` directly. Re-reads the `admin_key` cookie itself server-side rather than trusting any client-passed flag.
- **`ActivateOverlay.tsx`** — new optional `isAdminSession` prop. When true, the plan-selection step shows an extra dashed-orange "Activate as comp (Found team)" button next to the real payment flow. Shared component, so this works from onboarding, the dashboard's `ActivationBanner`, `MoreActivateButton`, and `PreviewBanner` alike, though only the onboarding path threads the prop through for now.
- **`src/app/onboarding/page.tsx`** — now an async Server Component reading the `admin_key` cookie server-side, passing down a single `isAdminSession` boolean. The actual secret never reaches client-side code.
- **Comp link** — `OnboardingFlow.tsx` reads `?comp=<token>` from the URL on mount, carries it through the whole session, and passes it to `createOnboardingSite()`. `src/app/onboarding/actions.ts` validates the token server-side against `ADMIN_KEY`; when valid, the company is inserted already `is_comp: true, subscription_status: "active"`. The Reveal screen then shows "Go to dashboard" instead of "Launch my site" - no payment step renders at all.
- Verified with `npm run build` — clean. `/onboarding` is now dynamically rendered (was static) since it reads cookies server-side, as expected.
- Logged as a decision in `DECISIONS.md`, superseding the July 8 "comp after onboarding" entry.

### Must Test
- Comp link: start onboarding at `foundco.app/onboarding?comp=<admin key>`, complete a throwaway test business, confirm the payment screen never appears and Reveal shows "Go to dashboard."
- In-flow fallback: log into `/admin/photos` first (sets the admin cookie), then go through normal onboarding *without* the comp link, confirm "Activate as comp (Found team)" appears on the real activation screen and works.

---

## Session: July 8, 2026 — Found Operator Tooling (View As, Comp, Notes)
**AI:** Claude Code (Sonnet 5)
**Worked on:** Shawn tried to check on a real customer's account (Nereida Lopez, Spa Mambo) and had zero visibility - every dashboard is scoped strictly to whoever owns that company. Team scoped a beginning-stage operator toolkit (see `DECISIONS.md` [2026-07-08]), built it end to end.

### Completed
- Migration applied directly to Supabase: `companies.is_comp` (boolean) and `companies.admin_notes` (text). Migration file kept local only since `scripts/` is gitignored in this repo (other scripts there carry hardcoded credentials).
- `getCompany()` in `src/lib/dashboard/getCompany.ts` now has an admin override — when the selected-company cookie AND a server-verified `admin_key` cookie are both present, it fetches that company by ID without the normal ownership filter. Added `isAdminOverrideActive()` as a reusable check.
- New `/admin/businesses` — same shared admin-key gate as the existing `/admin/photos` and `/admin/emails`. Lists every company, searchable, with a "View as" button per row (reuses the exact same `found_company_id` cookie the normal company switcher already uses), a comp toggle, and a notes textarea that saves on blur.
- Comping a business also sets `subscription_status: "active"` in the same update, so every existing "is this account active" check across the app picks it up automatically instead of needing to touch each one.
- Dashboard layout shows a persistent orange "Viewing as [Business] (Admin)" banner with an Exit button — but only when the override is genuinely resolving someone else's company, not just whenever the admin cookie happens to be present. Never silent about who Shawn is acting as.
- Verified with `npm run build` — clean, `/admin/businesses` compiles.

### Must Test
- Log into `/admin/businesses` with the existing admin key, search for a real business, tap "View as," confirm the dashboard loads as that business with the orange banner visible.
- Tap Exit and confirm it returns cleanly to Shawn's own account.
- Toggle comp on a real inactive test account and confirm its activation banner disappears immediately (no page reload needed beyond normal navigation).
- Confirm notes save correctly (type, click away, reload the page, confirm it persisted).

---

## Session: July 7, 2026 (part 2) — Payment Reliability, Root Safe-Area Fix, Header Cleanup
**AI:** Claude Code (Sonnet 5)
**Worked on:** Shawn found the builder gap persisted after the earlier fix, felt the payment sheet was weak, and — most seriously — found that after paying, the estimate page still showed the full unpaid balance. "Fix it all, we need to launch."

### Completed
- **Payment reliability (priority):** `handlePay()` in `AcceptButton.tsx` called our own "mark as paid" API exactly once, wrapped in an empty `catch {}`. If that single call failed for any reason, Stripe had already charged the customer successfully but our own database never recorded it — with nothing surfacing the failure anywhere. Now retries up to 3 times with backoff. Never tells the customer their payment failed once Stripe has confirmed it, and never re-prompts payment (no double-charge risk) — just gives our own record multiple chances to catch up.
- **Root cause of the builder gap, actually found this time:** `viewport-fit=cover` was never set in the root viewport config (`src/app/layout.tsx`). Without it, `env(safe-area-inset-*)` resolves to `0` on iOS Safari everywhere in the app, not just this one header — meaning last session's margin-math fix was mathematically a no-op (both sides of the cancellation used the same flat fallback). Fixed at the root; this should also correct any other spot in the app relying on real safe-area insets, not just this one screen.
- **Removed redundant header copy** — the green "ESTIMATE" eyebrow above "New estimate" said the same thing twice; removed it, kept one clear title.
- **Verified the payment sheet's branding directly against Supabase** — queried the "Construction" test company's `primary_color`: it's `#1565C0`, a real blue. The payment theming is correctly applying it; the "generic Stripe" impression was a coincidence of this test company's actual brand color resembling Stripe's own, not a branding bug. No code change needed here.
- Verified with `npm run build` — clean. Pushed as `0567b54`.

### Not Fully Closed — Needs a Human
- The Stripe webhook fallback (`payment_intent.succeeded`) needs someone with Stripe Dashboard access to confirm it's registered as a **Connect-scoped webhook** (listening to events from connected accounts), not just the platform's own direct webhook. This estimate payment is a Stripe Connect charge, and Connect events only reach a webhook endpoint that was explicitly set up to receive them. No AI in this session has Stripe Dashboard login access to verify this. The client-side retry fix covers the common case; this webhook is the safety net for the rare case where all 3 retries fail, and right now nobody has confirmed it actually fires for this payment type.

### Must Test
- Builder gap: open a new estimate on a phone with a notch/Dynamic Island, confirm no page content visible above the "New estimate" header.
- Payment: complete a test deposit payment, confirm the estimate's balance updates correctly this time (not stuck showing the full unpaid amount).
- Confirm "New estimate" header now shows one line, not two.

---

## Session: July 7, 2026 — Live Test Results + Builder Gap + Payment Confirmation
**AI:** Claude Code (Sonnet 5)
**Worked on:** Shawn live-tested all 6 July 6 items on `my.foundco.app`. 4 confirmed clean (Camera, Company Switching, Leads sheet, Schedule). 2 surfaced real issues, brought to Jony/Craig before fixing.

### Completed
- **Estimate builder header gap** — found the exact cause: the sticky header's canceling margin was a flat `-18px` while the outer container's top padding used `max(env(safe-area-inset-top), 18px)`, which resolves to the real (larger) safe-area value on notched phones. The two never fully canceled, leaving a gap above the header showing the page scrolling behind it. Fixed both to use the identical expression.
- **Payment methods** — team decision: keep `automatic_payment_methods` enabled. Found clients' own customers may only have Cash App, or want a BNPL option for a large job — restricting to card/bank only would cost a real client a real payment. This reverses an earlier draft recommendation.
- **Post-payment confirmation rebuilt** — was a thin, generic "Estimate Accepted / Thank you" using a flat accent color. Now shows the Found client's own logo (or name), a bigger branded success moment in their actual brand color, and the real payment breakdown (amount paid, balance due at completion) — permanently, not just for a 2.2-second animation that used to decay into the bare version.
- Verified with `npm run build` — clean. Pushed as `2cb0c99`.
- Logged as a locked decision in `DESIGN_DECISIONS.md`.

### Must Test
- Open an estimate builder on a phone with a notch/Dynamic Island — confirm no gap above the "ESTIMATE / New estimate" header, no page content visible behind it.
- Complete a test payment on a Stripe-connected estimate — confirm the confirmation shows the client's logo/name, brand color, and correct amount paid / balance due, and that this state persists (not just visible for a couple seconds).
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