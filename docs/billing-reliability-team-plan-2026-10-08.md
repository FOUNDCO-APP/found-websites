# Billing Reliability Team Review - October 8, 2026

## October 10 Approval and Safe Rollout

Shawn approved the presented team direction and explicitly instructed that Ryan's site must not be affected yet. The seven-day future notice/hold policy, truthful separate client/billing/site indicators, email and in-app notices, optional supported push, and SMS after Twilio setup are approved directions. Ryan has no automatic hold deadline; his access remains protected until Shawn explicitly releases that exception. No current notice, retry, or new charge is authorized by an unfilled message/deadline placeholder.

The first safety release is `190fae3`. Supabase connector access was restored; billing logging, restricted durable storage, and atomic projection-guard migrations were applied after real PostgreSQL rollback tests. Current financial baselines for all three clients were stored with historical origin and zero queued notifications. A service-access override for RC preserves legacy access without forgiving its $39 balance or changing Stripe's canceled status.

Outbound mail and holds remain disabled during staged verification. Worker cadence, signed delivery, independent monitoring, reminder/hold lifecycle implementation and SMS/push configuration require validation before automatic-action rollout. This release is not a claim of large-scale readiness.

---

Status: Proposed for Shawn approval. This is a role-based review using the Found team defined in AGENTS.md, not independent messages from real people or separate AI reviewers. No implementation or billing action is authorized by this document alone.

## Evidence

See client-payment-report-2026-10-08.md and monthly-payment-audit-2026-10-08.md. RC July invoice is paid; August 31 invoice is open with $39 face value. No September renewal was displayed. Exact remaining balance, failure reason, actual subscription status, and retry configuration need direct Stripe verification. Do not tell Ryan $78 is due until that is proven.

Confirmed application defects: stale trial/active labels, amount-due fallback falsely labeled Total paid, invoice status omitted from history, admin attention flags using a separate client relationship state, no explicit failed-subscription-invoice alert handling, and no billing reconciliation cron in vercel.json. Existing public-site pause logic covers deferred billing and depends on stored subscription status plus trial_ends_at; it is not a complete recurring-payment hold policy.

No assertion is made that Stripe's own failure emails were disabled or that no email reached Ryan. Stripe settings, delivery history, and retries have not been audited.

## Team Perspectives

- Priya, data lead: verify all invoices, remaining balances, credits, refunds, subscription schedules, retries, and webhook delivery before recovery. Persist invoice-level facts and distinguish paid revenue from trial invoices, expected monthly revenue, and bank payouts.
- Craig, engineering: verify signed Stripe events, record events durably, handle duplicate/out-of-order deliveries, and retry failures. Re-fetch current Stripe facts when processing events. A daily reconciliation must recover missed events and report its own failures. Acknowledge events only after durable recording; notification delivery can retry separately.
- Angela, customer experience: a first failure should produce a clear Found email and dashboard notice with amount, invoice period, secure card/payment action, and the deadline before a hold. Do not surprise existing clients with retroactive suspension or catch-up charges.
- Phil, billing communication: state what is actually owed, separate arrears from the next renewal, and verify existing payment authorization before recovery. Stripe owns collection and retry scheduling; Found must avoid competing or duplicate charging.
- Marcus, public websites: one shared hold policy for all templates, custom domains, public routes, and transactional endpoints. Visitors see a neutral unavailable message rather than the client's debt. Preserve data and prevent new paid-service transactions during a hold.
- Chris, mobile: persistent Found HQ alerts plus Shawn email and SMS on the first failure. Device push, where supported and permission is granted, is supplementary. Alert delivery failures must be visible and retried.
- Jony, design: show Paid, Payment failed, Payment action needed, Past due, or On hold distinctly; show last paid invoice, paid-through period, remaining balance, next retry/renewal, last verified time, and unresolved alerts. Never label an unpaid amount Total paid or call a trial customer Paying.
- Steve, product: one platform-wide billing workflow, automatic even when Shawn never logs in. Require evidence from failure through recovery before release. No promise that payment can never fail; the goal is that failures cannot remain silently unreported.

## Proposed Workflow

1. Verify and repair reporting first. Backfill all three clients from actual Stripe records; verify RC before any recovery action. Backfill must not send historical duplicate notices or abruptly suspend a client.
2. First verified failed renewal: mark billing attention immediately, create a persistent HQ alert, notify Shawn by email and SMS, notify the client by Found email and dashboard banner. Include supported device push for Shawn after permission/configuration is verified. Keep email delivery state, SMS delivery callbacks, push failures, and alert acknowledgment recorded. Acknowledgment does not clear debt.
3. Proposed grace policy: seven days from the first failed renewal, without restarting the clock on each retry. Client reminders on day 3 and day 6; day 6 explicitly warns of next-day hold. Notify Shawn when a hold occurs, on recovery, and when alerts or reconciliation fail. Suppress duplicate messages for the same incident; materially changed failures can update the alert. Stripe handles approved retries.
4. At the grace deadline, apply the shared site/service hold only after rechecking authoritative billing facts. Preserve website, domain mapping, leads, photos, and records. Keep owner login, invoices, payment correction, and support available. Block new public leads/bookings/orders and other paid-service actions consistently; assess estimate/payment/share routes explicitly. Show a neutral public message without financial details. Comped accounts and valid unpaid-free trials are exempt. Failure to reach Stripe alone must not suspend a paid client.
5. Restore automatically once approved arrears requirements are satisfied and Stripe confirms a valid subscription/service entitlement. Paying one newer invoice must not silently forgive older debt. Clear the billing incident, reconcile status, notify the client and Shawn, and record the transition. Preserve notification/audit history.
6. Daily reconciliation checks invoices, subscriptions, remaining balances, paid-through coverage, missing renewals, stale trials, and local differences. Correct safe derived billing facts; surface ambiguous cases for review. If a renewal invoice is absent, raise an investigation alert rather than inventing debt. Escalate reconciliation failure/staleness independently so a broken checker is not silent.
7. Keep subscription state, invoice/debt state, relationship state, and service-access state distinct. Report expected recurring revenue, paid invoices, refunds/credits, unpaid balances, and payouts separately. Never present projected subscription revenue as money collected.

## RC Transition Proposal

Investigate Ryan's August invoice and September schedule first. Verify whether Stripe already attempted recovery and whether another charge is scheduled. Present the exact verified balance to Shawn before contacting or charging Ryan. Proposed handling: send a fresh accurate notice and allow seven days from that notice before any new Found hold, because the existing system failed to surface the issue. Shawn must approve the recovery amount, communication, and transition treatment separately.

## Required Verification Before Release

Test successful renewal; declined card; action-required payment; duplicate and out-of-order events; processing crash/retry; missed webhook recovered by reconciliation; failed email/SMS/push delivery; grace deadline; all-template/all-route hold; comp/trial exemption; preserved owner payment access; older debt plus newer paid invoice; automatic recovery. Use Stripe sandbox/test clocks and a test tenant such as Barrio Builders; do not deliberately fail real clients' cards or charge them for testing. Verify production event subscriptions, delivery logs, recovery-email settings, retry settings, scheduled job operation, and actual alert destinations. SMS/push configuration and cost require Shawn approval before external changes.

## Approval Requested

### Shawn's Additional Requirement: Full Verification and a Stronger Admin System

The recent-invoice report is explicitly partial. Complete verification must paginate every invoice for all three customers, retrieve actual paid timestamps, invoice payment allocations, failed charge attempts, refunds, credit notes, customer balance transactions, all subscriptions and their collection/pause/cancellation settings. A missing invoice must be investigated, not counted as another month owed. An invoice marked paid does not alone prove a successful card transaction; identify credits or manual/out-of-band payment when present.

Read-only audit prepared at `scripts/audit-client-subscriptions.mjs`. It accepts a securely configured live key (including restricted live keys), rejects test keys, paginates records, and marks permission/API failures incomplete. It does not charge, retry, update, or cancel anything. Direct live Stripe access remains required; browser access was attempted and unavailable in this session. The deployed three-invoice billing page cannot provide the complete audit.

Expanded admin proposal for team/Shawn review:
- Portfolio billing workspace showing exact open balances, aging, payment failures, missing renewals, held sites, and stale/failed synchronization, with filters and links to each client.
- Per-client ledger containing all invoices, billing periods, amount billed/paid/remaining, actual payment dates, credits/refunds, failed attempts and reasons, next retry, and subscription/service status.
- Incident timeline covering Stripe events, processing outcomes, notification attempts/delivery, grace deadlines, holds/restoration, and operator actions.
- Separate expected recurring revenue, paid invoice amounts, successful charge amounts, refunds, and net receipts; bank payouts only if independently reconciled.
- Last successful verification and reconciliation health always visible. Unknown facts display Unknown, never Paid or zero balance.
- Historical exports and operator-controlled support actions. Charging/retrying/waiving debt or overriding a hold require explicit authorized actions and an audit record.

The seven-day policy and architecture remain proposed, not approved. Complete verification is authorized read-only work; deployment, schema, billing recovery, messages and holds are not authorized by the audit request.

Approve or revise: the platform-wide plan; seven-day grace with day-3/day-6 notices; hold scope and automatic restoration policy; Shawn email/SMS/HQ alerts with optional supported device push; and the separate courtesy transition for RC. Live Stripe access is still needed for subscription/retry/charge details and recovery settings. New architectural or policy obstacles return to the team and Shawn before implementation.
