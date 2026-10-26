# Found Platform Billing Listener - Reviewed Setup

Status: staged plan approved October 15; production installation/deployment access is blocked (saved Vercel login returned 403). Do not create the listener until its signing secret can be installed securely. Do not change the existing connected-account listener or rotate its secret.

## Verified Gap

On October 10, the live scope diagnostic returned one existing destination at Found's webhook URL with snapshot payload, events_from `@accounts`, and only `payment_intent.succeeded`. That is the connected-account commerce stream. No platform/self billing destination was returned.

This current configuration does not deliver Found's subscription updates or failed monthly invoice events to the new billing processor. Historical delivery settings have not been audited; do not infer that every prior failure had the same configuration.

## Team Direction

Create a separate platform/self snapshot destination for Found's own live Stripe account. Preserve the connected-account destination, its existing event list, URL, status and signing secret. No wildcard and no changes to customers, invoices, subscriptions or payment attempts.

Destination settings:

- Purpose/name: Found monthly subscription billing.
- Events from: Your account / platform / `@self`, NOT connected accounts / `@accounts`.
- Payload: Snapshot, not thin.
- Receiver: `https://foundco.app/api/stripe/webhook`.
- Snapshot API version: `2026-05-27.dahlia`, confirmed from the installed Stripe SDK before creation.
- Events: use the reviewed `REQUIRED_PLATFORM_BILLING_EVENTS` constant in `src/lib/stripe/billingReliability.ts` as the exact allowlist. October 15 code expands the original eight-event scope to invoice creation/finalization/success/void/uncollectible, refunds and credit-note lifecycle events required by the approved plan. Health checks must use the same constant; no wildcard.

October 15 read-only Stripe inventory also includes a separate Grok connector destination at grok.com. It is unrelated to Found's receiver. Preserve it unchanged along with Connect.

The existing `STRIPE_WEBHOOK_SECRET` is already configured, but its association is not proven and it may authenticate the connected-account destination. Do not overwrite it. The reviewer-confirmed safety design uses a separate production `STRIPE_WEBHOOK_SECRET_PLATFORM` variable, accepted by the receiver alongside every existing secret. Keep all current primary/Connect variables unchanged. Never paste signing/API secrets into chat, source code, reports or Git. The creation secret is returned once and must be handled securely.

## Activation Gates

1. Confirm owner approval for the separate destination and authenticated access to Vercel settings.
2. Create the destination and securely install its signing secret; redeploy.
3. Re-read destination scope, event coverage, signature configuration and per-client baseline freshness using the protected health endpoint.
4. Verify a real signed delivery safely and ensure processing/duplicate replay is correct without charges, messages or service changes. Test payment failures in sandbox, never by deliberately declining real clients.
5. Enable observation/reconciliation only after delivery and recovery checks. Mail and holds remain off until their lifecycle and monitoring are validated.
6. Ryan's access override stays enabled with no automatic expiry. No current notice, deadline, payment retry or new subscription is implied by listener setup.

Independent stale monitoring, scalable worker cadence, day-3/day-6 notices, automatic holds/restoration, app push and Twilio SMS are remaining rollout work. Do not claim the full automation plan is finished.
