# Hiram Email Correction - October 25, 2026

## Owner Authorization

Shawn supplied Hiram's message confirming `intellprotectionsec2023@gmail.com` and
explicitly authorized correcting the second site, fixing his existing login and
sending the welcome/access email. Latest scope does not include deleting or
retiring the older site, activation, charges, Stripe edits or new app-flow changes.

## Verified Before State

Both company records and their shared Auth user have the same typo:
`intellprotrctionsec2023@gmail.com`. This does not establish how the typo arose.

- First company: `bf4cd3d6-f96d-495c-aee9-308633da0524`, slug
  `intelligence-protection-security-llc`.
- Preserve/correct second company: `626dc220-4152-4711-8862-a885534e1e0a`, slug
  `intelligence-protection-security-llc-arizona`.
- Shared Auth user: `7dd093ca-da7a-4da8-ae0c-7ce683567de1`; before state is unconfirmed.
- Company lead_email fields were null; notification fallback reads company.email.
- Distinct Stripe customers exist. Null stored subscription status does not prove
  no billing activity. Stripe was not read or modified for this correction.

## Team Safety Review

Preserve the Auth UUID, all company ownership, photos/config/media/albums, first
company record, plan/billing/access fields. Check collisions in Auth, companies and
active membership email grants before changing identity; do not create another
account, merge identities or mark the email verified administratively.

Official Supabase documentation confirms admin `updateUserById({ email })` applies
the correction directly. The separate `email_confirm` option must not be used.
Generate an access link for the same corrected user and let the recipient prove
inbox possession by clicking. Do not consume the token as an agent.

Source inspection found callback `next` is lost in the implicit-token/password
flow. Do not change that product flow in this repair. Send a normal sign-in link
plus a separate protected second-company dashboard link for use after sign-in:
`https://my.foundco.app/api/select-company?id=626dc220-4152-4711-8862-a885534e1e0a`.
No `activated=true` flag, no payment/discount or hardcoded expiry claims. Include
the second site's public preview link. Do not claim the site is activated or paid.

Use exclusive private before snapshot/attempt evidence, scoped company-email CAS,
identity read-back, and tracked email with a stable provider idempotency key. Never
print raw login links/tokens or reuse an uncertain attempt automatically. Verify
provider acceptance separately from actual delivery; do not claim inbox receipt
unless delivery is confirmed.

## Status

COMPLETED: second company and existing Auth user now use
`intellprotectionsec2023@gmail.com`. Public Contact mailto verified. Original Auth
UUID, first company, photos/config/media/albums and billing/access fields preserved.
Auth remains unconfirmed until Hiram uses his access link; no administrative
confirmation or password change was made. Fifteen fixture groups passed. Final
independent agents hit a usage limit; parent reviewed/tested and completed the
authorized operation, not a fresh independent final GO.

Private before snapshot: `.billing-audits/hiram-email-correction-20261025-before.json`.
The correction ran ONCE. Its first validator stopped after successful writes
because GoTrue synchronized the identity's top-level email and cleared/omitted old
confirmation/recovery sent timestamps. Parent inspected exact changed paths,
added narrowly scoped normalization/tests, and verified without replaying writes.
Do not replay the correction attempt or roll back the corrected email.

The custom welcome helper did NOT send: local Resend configuration was missing and
the existing production key was not available through the authorized read API.
No secret was printed, saved, changed or bypassed. Instead, parent invoked the
existing live `https://my.foundco.app/api/send-login` once for the corrected address.
The standard Found welcome/sign-in email was accepted and delivery confirmed in
email_log: `19b9d093-29ab-45fb-895f-dedbe99c136e`, provider
`01a174da-fba5-752b-b634-8d271d55ec8e`, status `delivered`.
This was the normal access email, not the custom three-button draft above. Do not
send that additional draft automatically; a fresh resend needs user authorization.

Attempt evidence: `.billing-audits/hiram-standard-access-20261025-attempt.json`.
Final verification receipt:
`.billing-audits/hiram-email-correction-20261025-final.json`.
Older site was not deleted/retired; Stripe contacts were not audited or changed.
Keep all private snapshots/tokens out of Git. No login token was consumed by the
agent and no card, subscription, activation or app-source change was performed.
