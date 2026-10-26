# Monthly Payment Audit - October 8, 2026

Shawn requested confirmation that the three clients have paid monthly. Follow-up found an existing authorized path to Stripe: deployed owner billing and receipt pages accept Found's existing admin view access and retrieve invoices from Stripe server-side. Read-only invoice verification completed through those pages. Direct Stripe charge, refund, webhook delivery, and subscription-detail verification remains unavailable locally.

## Verified Stripe invoice results

| Client | Invoice date | Amount | Stripe invoice status | Service period |
| --- | --- | --- | --- | --- |
| MBJ Heating and Cooling | September 15 | $69 | Paid | September 15 - October 15 |
| Divine Remodel | September 5 | $69 | Paid | September 5 - October 5 |
| Divine Remodel | October 5 | $69 | Paid | October 5 - November 5 |
| RC Bicycles | July 31 | $39 | Paid | July 31 - August 31 |
| RC Bicycles | August 31 | $39 | Open | August 31 - September 30 |

MBJ's earlier two displayed invoices and Divine's August 22 invoice are $0 trial invoices marked paid; they are not collected monthly revenue. The deployed billing summary returns only the three most recent invoices per customer. RC returned only two invoices, with no September 30 invoice displayed. The reason for that missing renewal is not established.

Confirmed paid nonzero invoices displayed total $246. RC's $39 August 31 invoice is unpaid. These checks verify Stripe invoice status, not bank payout receipt or the absence of subsequent refunds.

| Client | Found subscription status | Found client state | Recorded trial end (UTC) | Payments verified |
| --- | --- | --- | --- | --- |
| MBJ Heating and Cooling | trialing | active | September 15, 2026 | September invoice paid |
| Divine Remodel | trialing | active | September 5, 2026 | September and October invoices paid |
| RC Bicycles | active | active | None recorded | July paid; August invoice open |

All three have Stripe customer IDs and are not marked comped. No billing-type client activity records were returned for these three clients. This does not prove missing payments.

The local Stripe key is a test key. The production environment file has empty Stripe/Supabase credential values. No live Stripe key was available in process environment, and the computer-use inventory contained no browser sessions. Existing local ADMIN_KEY allowed read-only requests to deployed billing pages, resolving the earlier invoice-access blocker. Credentials were not printed or written to this document. Test Stripe data was not used as evidence of revenue.

Code observations: the admin client detail checks for a saved payment method, not paid invoices. The client list payment issue is based on client_state= past_due. The webhook subscription sync updates subscription_status, but only automatically moves client_state from onboarding to active. These separate signals can disagree. No root cause for a payment or webhook failure has been established.

## Confirmed application defects

- Owner billing fetches live subscription status (`stripeStatus`) but renders stored `company.subscription_status`, so MBJ and Divine still say Trial active despite paid recurring invoices.
- The receipt amount uses `invoice.amount_paid || invoice.amount_due || invoice.total || 0` and labels the result Total paid. RC's open invoice therefore falsely displays Total paid $39. Open status is the reliable evidence here; the total-paid label is incorrect.
- Billing history retrieves invoice status but does not display it in the receipt list.
- Admin's payment issue indicator checks `client_state === past_due`; subscription sync updates subscription_status without moving active client_state to past_due. A payment problem can be absent from the admin indicator.
- The current webhook has no explicit invoice.payment_failed or invoice-paid event branch. This is a handling gap, but webhook delivery failure has not been established.

Next step requiring team direction and Shawn approval: correct billing displays to use live Stripe facts, separate amount paid from amount due, show invoice status, and define reliable admin overdue signals/reconciliation. Investigate RC's subscription status, August failed attempts, missing September renewal, and Stripe webhook delivery through live Stripe access before deciding recovery actions. Do not retry payments, cancel subscriptions, or manually overwrite statuses as part of this audit.

No billing settings, subscriptions, customer data, or application code changed.
