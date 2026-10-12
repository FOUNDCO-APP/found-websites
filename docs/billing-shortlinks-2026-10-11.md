# Temporary Billing Short Links

## Approved Scope

Shawn requested actual Found-domain links that copy cleanly into SMS, and repair of the incomplete RC Checkout URL.
The team recommended two temporary, opaque redirects to the existing Stripe invoice and Checkout session.
No new invoice, charge, subscription, card update, notification, access restriction, or automatic session regeneration.

## Implementation

- `/pay/[code]` and `/setup/[code]` use a shared server-only Node route helper.
- Codes are independently generated 128-bit base64url identifiers, never business slugs.
- Targets live in service-only `billing_objects`, type `billing_link_redirect`, with the full platform/live primary-key scope.
- Records bind to the verified RC company/customer. Anonymous and authenticated direct table access is denied.
- The stored target is used unchanged, including every query parameter and the complete required Checkout fragment after `#`.
- HTTPS exact-host allowlist: `invoice.stripe.com` for pay, `checkout.stripe.com` for setup; credentials/ports/whitespace/backslashes rejected.
- No incoming destination or query parameters are forwarded. Invalid/expired/revoked mappings return generic 404; storage failure returns generic 503.
- All responses are private/no-store, no-referrer, noindex/nofollow/noarchive. Valid links return 302.
- Both RC links expire October 12, 2026 at 5:45 PM America/Phoenix (`2026-10-13T00:45:00Z`).
- This does not extend the underlying Stripe session or create a permanent billing link.
- Full URLs and mappings are not committed or included in client bundles/logs.

## Invoice Wording Obstacle

Shawn requested a catch-up-only memo referencing August 31 and September 30 (September 31 does not exist).
Team authorized one description-only attempt. Stripe rejected it because the $78 invoice was finalized.
Invoice remains unchanged. Team requires explicit approval for a revised/replacement financial document before any revision/void/finalization.
No invoice amount, date, status or line was changed by this short-link work.

## Verification

- 42 redirect regressions: full query/fragment equality, kind binding, expiry/revocation, hostile URLs, injection, invalid code and storage failures.
- Production build passed. Database re-read confirmed two scoped mappings and denied anon/authenticated reads.
- Independent release review requested before deployment; live redirect/header and browser verification recorded in SESSION_HANDOFF.md.
