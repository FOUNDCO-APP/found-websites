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