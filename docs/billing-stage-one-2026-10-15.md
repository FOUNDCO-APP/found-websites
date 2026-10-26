# Billing Stage One - October 15, 2026

Shawn approved the staged operations plan. This session implements financial truth
and safe observation only. Messages/holds stay disabled; Ryan remains protected.

## Fresh Production Verification

Authenticated production ledger read completed with live mode and complete all-client
ledgers. Open and uncollectible balances are $0 for every client. Captured totals:
Divine $138, MBJ $138, RC $117. MBJ's Oct 14 $69 invoice was paid at Oct 15
01:06:53 UTC (Oct 14 6:06:53 PM Phoenix). RC still has one active replacement
$39/month subscription; original canceled subscription and void invoice are history.
No financial mutations were performed to verify this.

Health still reports stale October 10 baselines, missing platform signing/coverage,
disabled intake/reconciliation/mail, and no owner-alert email recipient. Those are
not fixed by local code changes. Existing Connect and Grok destinations are unchanged.

## Local Implementation

- Complete financial event processing builds invoice facts, financial objects and
  versioned client snapshot from ONE complete ledger under the customer lease and
  existing atomic RPC. Added refund/credit/void/uncollectible routing with current
  Stripe ownership checks, not metadata-based customer guesses.
- List and client detail read the same versioned private snapshot, including effective
  default payment-method evidence. Neither performs per-page Stripe calls. Missing,
  partial, stale, malformed, relinked or superseded snapshots remain unknown, never $0.
- Effective subscription default takes precedence over customer default. A random saved
  card is not evidence of automatic collection. No payment-method or subscription writes.
- Manual admin POST `/api/admin/billing-refresh` refreshes one mapped real client with
  historical suppression, no messages/jobs or service access action. Cookie requests
  require same origin; test/unknown Stripe mode and invalid mappings fail closed.
- Reconciliation and events share the complete-facts builder; explicit manual baseline
  suppression applies even when an older baseline exists. No schema migration yet.
- No SDK/API version upgrade, provider replacement, flags, commerce changes or unrelated
  send-login/typography changes included.

## Team Release Blockers and Approval Requests

1. Vercel saved CLI login exists, but authenticated environment-metadata GET returns
   403. Craig/Priya recommend Shawn restore Vercel login/project access before listener
   creation, signing-secret installation, deployment and actual signed-delivery proof.
   No alternative credentials or new provider/cost path selected. Asked Shawn approval
   to reconnect. Do not export or paste raw secrets into chat.
2. Independent reviewer found a preexisting customer-mapping race exposed by refresh:
   billing_commit_facts checks the worker lease but does not recheck/lock the current
   company-to-Stripe-customer mapping after slow Stripe reads. Recommendation: lock and
   validate that mapping inside the commit transaction before any fact writes, with
   rollback/race tests. This database-function change requires Shawn approval. Asked;
   do not silently migrate or release without resolving this gate.
3. All-client baseline rollout waits for the deployed live-key path verifying effective
   payment defaults. Local Stripe key is test mode; the production audit omits those
   defaults. Do not manufacture complete snapshots by injecting guessed card facts.

## Verification

Completed: 88 backend behavior checks; 10 refresh-route safety checks; 17 stored
projection checks; 12 existing client-fact checks; full-ledger regression; email/display
regression; 42 shortlink checks. Fixture client layout: 20 screenshots at 320, 390,
430, 768 and 1280px, no tested overflow/collision. Screenshots are fixtures, not proof
of recovered live customer display. Existing unrelated work remains intact.

Windows sandbox could not launch Edge; same existing screenshot test completed outside
the sandbox after tool approval. Production build and final TypeScript passed. Build
retains existing middleware-convention and Sentry Edge-runtime warnings. Independent
release review found the company/customer commit guard blocker above; no other finding
in the refresh-route/reconciliation review. These checks do not replace live signed delivery,
real DB rollback/concurrency testing, all-client convergence or scale/load testing.

## Deployment Sequence After Gates Clear

Team review the ownership-guard patch and tests; obtain any outstanding owner approval.
Deploy only scoped reviewed files with automation disabled. Create the separate self
snapshot listener using the current SDK API version and reviewed constant, securely
install the dedicated platform secret and redeploy while preserving existing secrets.
Refresh/re-read all three clients, confirm identical projection versions in list/detail
and unchanged protected access; verify signed delivery and replay without payments.
Do not claim observation is active until these checks pass. Stage two scheduler/monitor
choice and costs, later communications and holds retain their separate gates.
