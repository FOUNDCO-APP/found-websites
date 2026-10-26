# Hiram Address Rename - October 25, 2026

Shawn approved the recommended `intellsecurity.foundco.app` address and forwarding
from the improved second site's previous address. Hiram activated before this
change; the live company was confirmed active on Found Pro.

## Approved Target

- Company: `626dc220-4152-4711-8862-a885534e1e0a`.
- Previous slug: `intelligence-protection-security-llc-arizona`.
- New slug: `intellsecurity`.
- Existing owner, email, company UUID, subscription and Stripe references retained.
- Older first company `bf4cd3d6-f96d-495c-aee9-308633da0524` unchanged.

## Execution And Evidence

Independent backend review identified the missing forwarding mechanism and checked
activation completion before proceeding. No general alias database or billing
changes were introduced.

Phase-one release `f31ea8fae3b327e93e82b4d44ff91efe0cdb98b7` deployed with an exact-host
308 redirect, preserving paths, query strings and methods. A narrowly restricted
temporary company lookup bridge allowed the shorter address to work before the
database rename. The bridge matched the fixed company UUID, old slug and active
flag only on an explicit zero-row lookup.

The full build passed, including TypeScript and 86 static pages. Forty-seven
forwarding fixtures passed independently. Fifteen mutation-safety fixture groups
passed independently, including rejection of unexpected Auth metadata changes.

`scripts/rename-hiram-address.mjs` then saved a private snapshot, verified all five
public pages at the new address and all five old-address redirects, rechecked
availability/state, durably claimed the operation, and made one guarded company
slug update. UUID, owner, old slug, updated timestamp, active flag, Pro plan and
active subscription were update predicates. No retry or automatic rollback.

Read-back matched the complete company/config/photo/media/album snapshots and
complete Auth record, allowing only the approved second-company slug and its
server update timestamp. All five public pages and redirects passed again.
An independent reviewer also confirmed the new pages return 200 and old addresses
return 308 with exact path/query preservation.

Private evidence, not for publication or commit:

- `.billing-audits/hiram-address-20261025-before.json`
- `.billing-audits/hiram-address-20261025-attempt.json`
- `.billing-audits/hiram-address-20261025-verified.json`

The rename is complete. Do not replay it. Final release
`95aa8ae511c6cbf3f9132741ebadb120bbdc755b` is deployed READY with production aliases
assigned: https://vercel.com/foundco/found-websites/8P8kUbExpP73stUFm1J2nasK1VgJ .
The temporary lookup bridge is removed, restoring the original company lookup.
The exact previous slug is reserved in onboarding availability/final allocation
and admin prospect conversion, so application signup paths cannot reassign a
hostname that forwards to Hiram. No general alias system or migration. Direct
manual database inserts are not governed by these application guards.

Independent reservation fixtures and all 47 forwarding fixtures passed. The final
integrated build passed TypeScript and all 86 static pages. Final production
read-only verification again confirmed full protected records and five pages plus
five exact redirects. Live gallery inspection found 14 reachable rendered images,
the correct contact mailto, and a site manifest using the new address. Nine
marketing routes remain HTTP 200 and root `/pricing` remains a 301 to `/plans`.
That regression verifier still correctly reports the unrelated marketing imagery
replacement as incomplete; this address change does not complete that earlier task.

## Verification Limits

These are source, fixture, production deployment, database read-back and live HTTP
checks. No browser layout inspection, real form submission, quote acceptance,
payment attempt or Google Business Profile edit was performed. No new email sent.
Do not claim that the separate older duplicate was deleted or retired.
