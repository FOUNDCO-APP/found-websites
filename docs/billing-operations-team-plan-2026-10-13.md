# Billing Operations Team Plan - October 13, 2026

Status: staged plan approved by Shawn October 15, 2026. Begin financial truth and
safe observation. Automatic messages and holds remain disabled; Ryan stays protected.
Unresolved policy, provider/cost or scope decisions return to the team and Shawn.

October 15 verification: MBJ's October 14 renewal succeeded ($69 paid, October 15
01:06:53 UTC / October 14 6:06:53 PM Phoenix). Its captured total is now $138;
all three clients still owe $0. The October 13 table below is historical evidence.
Vercel saved-login API access returned 403; do not create an undeliverable listener
before secure signing-secret installation/deployment access is restored.

Independent repository reviews: Locke (Craig/Priya engineering and data perspective)
and Wegener (Steve/Jony/Angela/Chris product, operations and mobile perspective).
These are AI reviews using the repository's team roles, not actual Apple executives.
Parent performed read-only production verification and checked Ryan's recovery chat.

## Verified Current Truth

Production billing-audit returned complete live ledgers for all three clients on
October 13. Captured totals are not bank payouts or net-of-fee revenue.

| Client | Captured total | Open remaining | Current automatic subscription | Next period boundary (Phoenix) |
| --- | --- | --- | --- | --- |
| Divine Remodel | $138 | $0 | One active, $69/month | Nov 5, 2026, 4:54:33 PM |
| MBJ Heating and Cooling | $69 | $0 | One active, $69/month | Oct 14, 2026, 5:00 PM |
| RC Bicycles | $117 | $0 | One active replacement, $39/month | Oct 31, 2026, 9:07:44 AM |

RC's $117 is the original $39 payment plus the paid $78 catch-up. Original August
invoice is void; original canceled subscription is history. Card setup charged $0.
An active automatic subscription and expected renewal are not proof of a future
successful charge. RC access remains protected until Shawn explicitly releases it.

Production billing-health: intake, reconciliation, owner email, client email and
automatic holds are disabled. Platform signing is absent; signed delivery is
unverified. All three stored baselines date to October 10 and are stale. Owner alert
recipient is missing. Deployed email provider configuration is present; local manual
receipt sending lacked usable credentials. Do not confuse those two findings.

Existing enabled Stripe destination listens to connected accounts (@accounts), only
payment_intent.succeeded. It does not cover Found's own subscription invoices.
Preserve it and every existing commerce signing secret.

## What Is Missing

- Clients reads stored financial projections; live detail/audit reads do not update
  them. RC therefore appears canceled/unpaid even after successful recovery.
- Durable events, leases, financial tables, baseline suppression, outbox and guards
  exist, but the production platform event path and workers are not activated.
- Backup reconciliation processes only three customers daily. At 1,000 customers,
  a nominal full sweep takes 334 days; the recent-run window also needs fair scheduling.
- Empty error queues are not evidence of health when producers/workers are off.
- Financial updates must not be blocked by service-access protection. Review legacy
  early-return paths and enforce separate financial and entitlement commits.
- Refund/credit/void/uncollectible lifecycle coverage, independent monitoring,
  reliable delivery evidence and scalable customer recovery remain incomplete.
- RC's Found receipt email has no recorded send. Stripe automatic receipt delivery
  is unknown. Do not assume a receipt was delivered or blindly resend.

## Proposed Implementation Order

### 1. Financial Truth and Safe Observation

Owners: Priya and Marcus; Craig accountable.

Unify all billing views on one versioned durable projection containing authoritative
invoice balances, canonical current subscription, effective payment method,
last actual payment, next expected renewal and evidence completeness/time.
Use targeted asynchronous refresh, not a portfolio-wide Stripe fetch per page load.
Unknown/stale/partial data must never become $0, paid or safe-to-hold.

Create the separate platform/self signed destination and dedicated production secret
after approval. Confirm actual signed delivery and complete event coverage, including
replacement/cancellation, invoice settlement/void, credits and refunds. Rebaseline all
three clients without generating historical messages. Keep all automatic messages and
holds off. Preserve existing Connect listener and Ryan's access.

Gate: list/detail agree at the same projection version; RC shows $0 owed, $78 paid,
$39/month active and Oct 31 expected renewal. All three complete/current. Signed
delivery and duplicate/out-of-order recovery proven. Verify MBJ's Oct 14 renewal
through Stripe whether or not this phase is deployed in time.

### 2. Scalable Recovery and Independent Monitoring

Owner: Craig; Priya reviews correctness and tenant isolation.

Replace three-per-day scheduling with indexed due-customer work, checkpoints,
bounded concurrency, rate-limit backoff, durable retries and fair coverage.
Re-read current Stripe state rather than applying stale callback transitions.
Keep idempotent event/incident/notification processing and atomic commits.
Monitor worker heartbeat, oldest pending work, incomplete facts, stale clients,
delivery failures and reconciliation coverage from a separate failure domain.

Proposed targets requiring approval: 99% of normal financial changes reflected within
five minutes; complete portfolio reconciliation within 24 hours; missing heartbeat or
excess backlog escalated within 15 minutes. Demonstrate these at 10x expected launch
load, with no live test charges. Choose a supported scheduler/monitor only after the
team evaluates current hosting constraints; new costs require Shawn approval.

### 3. Billing Operations Workspace

Owners: Jony and Angela define workflow; Marcus implements; Chris validates mobile.
Steve's product gate: identify who needs action, why, amount owed and next step in
five seconds.

First screen separates payment problems, upcoming renewals, missing autopay,
communication failures and synchronization failures. One system-sync warning should
not mislabel every client as delinquent. Show server-side counts and paginated queues,
each with reason, owner, due time and resolution evidence. Usage/plan text is secondary.

Client detail leads with outstanding amount, last actual payment and service periods,
next expected billing event, effective autopay and service access. Include paginated
invoice/payment/refund/credit history and incident timeline. Separate relationship,
billing, service and evidence states. Keep captured money, credit settlements, manual
collections, expected recurring revenue and payouts distinct.

Controls: refresh facts, inspect invoice, preview communication, assign follow-up and
resend only after duplicate checks. Financial/access changes require current-state
recheck, explicit preview, authorization, reason and durable audit evidence.

### 4. Customer Recovery and Communication

Owners: Angela and Phil for language; Priya/Craig for delivery guarantees; Chris/Marcus
for authenticated return flow.

Provide stable authenticated Found billing access. Generate/reuse the appropriate
hosted session after tenant authorization, fresh-state checks and explicit customer
action. Recover expired links; preserve complete Stripe URLs. Return pages must show
confirmed, processing, canceled or recoverable-error states, never a blank screen or
another subscription prompt after successful setup.

Track receipt and autopay-confirmation obligations separately, even when combined in
one email. Record required/queued/provider-accepted/delivered/bounced/failed/unknown,
recipient, content version, attempts and provider ID. Check email audit writes and
delivery callback writes; retain unmatched callbacks and uncertain acceptance without
blind retries. Missing required receipts need action items even with no existing log.

Previously approved policy remains day 0 failure notice, day 3 reminder, day 6 warning,
day 7 hold direction; retries do not reset the clock. This is not yet safe activation.
Stage owner alerts, receipts, customer notices, reminders and holds separately.
SMS waits for approved Twilio setup; push is supplementary where supported.

Return to Shawn for unresolved choices: undelivered-warning treatment, restoration
requirements, ambiguous partial/manual payments, new financial exceptions and provider
costs. No inferred missing invoice may become a charge without investigation/approval.
Ryan is excluded from holds until explicit release, regardless of other rollout gates.

## Release Gates

Validate Barrio first where applicable using safe fixtures/sandbox, then all three live
clients read-only. No production customer charges for tests.

- Duplicate/reordered callbacks, missed callbacks, worker crash and rate-limit recovery.
- Cancellation followed by replacement; old invoice void; partial payment, refund,
  credit, uncollectible and missing renewal; no invented debt or duplicate collection.
- Authentication/tenant denial, protected access with current financial updates,
  expired login/link and reliable checkout return.
- Missing/bounced/delayed receipts, callback ordering, uncertain provider acceptance,
  audit write failures and operator escalation.
- Phone widths 320-430px, tablet/desktop, enlarged text, keyboard and slow networks:
  no overlap, clipping, blank returns or duplicate actions.
- Bounded workers, accurate queue counts/pagination and measured load coverage.

Require seven days meeting observation targets before considering customer automation.
Present each activation gate and evidence to Shawn. Do not enable holds as part of a
code deployment, infer approval from plan discussion, or release Ryan's protection.

## Documentation Basis

- src/lib/stripe/billingSummary.ts: stored facts and 24-hour staleness.
- src/lib/stripe/billingReliability.ts: three-customer daily reconciliation and retry work.
- src/app/api/cron/billing-reconcile/route.ts and vercel.json: gated daily worker.
- Existing October 8/10 rollout and platform-listener setup documents.
- Stripe subscription event guidance: https://docs.stripe.com/billing/subscriptions/webhooks
- Stripe customer portal integration: https://docs.stripe.com/customer-management/integrate-customer-portal

Next action: implement and verify the approved first stage. Approval does not authorize
automatic collection of new arrears, customer messages or release of access protection.
