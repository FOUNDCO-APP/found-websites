# Client Admin Repair - October 11, 2026

## Approval and Boundary

Shawn approved the visible team recommendations after reviewing eight iPhone screenshots.
Independent AI reviewers covered the Jony/Angela mobile hierarchy and Priya/Craig data roles.
Only the approved Clients list/detail, read-only billing presentation, and focused tests are in scope.
No charges, retries, subscriptions, notices, holds, database migrations, signing secrets, or rollout flags change.
Ryan's protected access remains independent of billing and is not released.

## Implemented

- Clients uses separate wrapping name, stored billing, and plan/recorded-activity lines.
- Removes the misleading generic healthy/client-active emphasis from the scan surface.
- Relationship filters are labeled separately from billing/client attention.
- Detail uses the existing authenticated live ledger for exact outstanding invoice amounts,
  captured payment records, failure reasons, billing status, verification time, and future billing evidence.
- Charge creation dates are labeled as charge dates, not a separate capture timestamp.
- Confirmed invoice retry timestamps are scheduled attempts; subscription period boundaries are expected renewals only.
- Incomplete/test-mode reads do not prove zero balance, no payment failure, or no future collection.
- Review billing opens the existing client-filtered Payments ledger.
- Relationship, site access, activity, and follow-up remain separately labeled.
- Contact links remain user-operated; no communication is sent by page rendering.
- Activity/outreach empty states are compact. No truncated-event count is presented as a full 90-day action count.
- Manual payment records and catalog/local billing expectations are explicitly separate from Stripe facts.
- Unknown payment-method lookups no longer expose no-card setup controls.
- Management/settings are collapsed; the Pro add-on uses a dropdown instead of clipped option buttons.
- Email history is categorized using recorded type/scope/source/lead metadata, not recipient address alone.
- Found account correspondence is distinct from lead automation and other/unknown business emails.
- Provider acceptance is not described as delivery. Recorded delivery/bounce/delay/complaint states are shown.
- Email query failure stays visible even when there are no history records.
- Shared CSS used by other admin pages is unchanged; repair styles are scoped to client surfaces.

## Verification

- `node scripts/check-client-billing-facts.mjs`: 12 complete/partial/mode/balance/payment/status/schedule checks.
- `node scripts/check-admin-client-layout.mjs`: display, unknown-state, access, and email-history regressions.
- `--screenshots`: 20 fixture screenshots, list plus three details at 320/390/430/768/1280px,
  all disclosures open, tested child-box collisions and element/document overflow.
- `--local`: authenticated integration against all three company records at phone/tablet/desktop sizes.
  Local Stripe is test-mode, so live values deliberately remain unknown. This is not a fresh live payment audit.
- Existing ledger and 60 inert backend regressions preserve financial accounting and protected access.
- Independent release reviewer cleared the read-only boundary after the history-failure repair.
- Windows sandbox browser/Turbopack restrictions required external headless Edge and a local webpack test server;
  no application settings were changed as a workaround.
- Screenshots remain in git-ignored `.billing-audits/client-layout/`.

Production build passed. Authenticated local list and all three details passed at phone/tablet/desktop widths.
Deployment completion and live checks are recorded in SESSION_HANDOFF.md.

## Unchanged Follow-up Work

The separate platform/self Stripe listener and production signing configuration still require the existing approval/access process.
Automatic notices and holds remain disabled. SMS/push, recovery/collection policy, and Ryan outreach are not implemented by this release.
Email sender/webhook error-handling changes, a manual-payment ledger/schema, and complete server-side usage aggregates remain separate scopes.
Recent history remains a bounded window; empty history does not prove no message was ever sent.
