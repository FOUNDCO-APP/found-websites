# Company retirement and membership containment

**Final outcome:** Release d4f97106e3e2f6306a998c157779d51abead787c READY. Old draft
retired once at 2026-10-26T03:23:38.937495Z, not deleted. Independent protected-state,
Auth and membership verification passed; paid pages and forwarding live. Shawn
confirmed the admin outcome seems fixed. Automated authenticated HQ check was
blocked by unavailable operator credential; no password bypass or real login test.
Do not replay the completed operator. SESSION_HANDOFF.md has the current handoff.

Shawn approved the visible independent team recommendation on October 25, 2026:
close the membership permission gap, reversibly retire Hiram's unused first
signup, and correct the paid customer's Stripe billing email. No Auth deletion,
subscription cancellation, price changes, new charges, or image changes.

## Membership boundary

All current membership reads/writes use trusted server clients. Owner-only
invitation/revocation actions retain their authorization checks. Migration
`20261026024838_company_members_server_only.sql` revokes browser/PUBLIC table
privileges and replaces the overly broad policy with explicit service-role-only
access. Production migration version was assigned `20261026025956` by MCP.

Containment is live. Anonymous zero-row REST reads now fail with HTTP 401/code
42501; anonymous/authenticated table and column privileges are denied; server
CRUD remains granted. Five membership records and their aggregate fingerprint
are unchanged. Twelve local PostgreSQL/server-behavior test groups pass. This
does not establish whether past exploitation occurred.

## Retirement

Migration `20261026030147_company_retirement.sql` adds nullable `retired_at`.
Every pre-existing company starts unretired. Retirement is not cancellation,
test classification, identity deletion, or billing reassignment.

Current clients, company selection, public lookup and activation exclude retired
records. HQ retains a read-only retired-history view. Stale selections fail
closed for mutations; signed-in page loads recover through company selection.
A single remaining business uses the existing selection endpoint automatically.

Retirement is an explicitly guarded operator action, not an automatic duplicate
detector. Restoring an operator-retired draft requires clearing its timestamp
and restoring its prior active flag; never reactivate its subscription or
change its owner as part of recovery.

## Hiram operation

Retain `626dc220-4152-4711-8862-a885534e1e0a` / `intellsecurity`.
Retire `bf4cd3d6-f96d-495c-aee9-308633da0524` only after deployed code is READY.
Preserve the shared Auth user, all content, the paid site's forwarding and its
single USD 39/month subscription. Before-state and guarded one-time SQL are
private operator artifacts in the main checkout's `.billing-audits/` directory.

Live Stripe audit: old customer has no subscriptions, schedules, invoices or
charges. Paid customer has one active USD 39/month subscription, one paid USD 39
invoice and one successful USD 39 charge; no schedules. Paid billing email was
corrected to `intellprotectionsec2023@gmail.com`, with all other customer fields
verified unchanged. Historical invoices and old customer were not rewritten.

Relevant security model: [Supabase RLS and grants](https://supabase.com/docs/guides/database/postgres/row-level-security).

Release and final retirement verification will be recorded in the session handoff.
Tests use isolated PostgreSQL, mocked identity/email/Stripe and HTTP/DOM checks;
they are not a real Hiram login or browser visual interaction test.
