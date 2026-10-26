# Found Client Payment Report

Superseded by the complete live audit in `.billing-audits/client-payment-report-2026-10-09.md`. Verified RC arrears are $39; subscription canceled September 14 because of payment failure. The private report includes actual payment timestamps and all invoices.

**PARTIAL VERIFICATION: This report is not a complete Stripe account reconciliation. Invoice dates below are creation dates, not actual payment dates. Exact balances, complete invoice history, and transaction history remain pending live Stripe access.**

Verification date: October 8, 2026. All invoice dates and service periods below are in 2026.

Source: Found's deployed billing and receipt pages, which retrieve invoices directly from Stripe using Found's existing admin access. Paid status was checked on each receipt; the misleading Total paid label was not used to classify open invoices.

## Summary

| Business | Paid invoices verified | Paid invoice total verified | Issue requiring attention |
| --- | --- | --- | --- |
| MBJ Heating and Cooling | September 15 | $69 | Found incorrectly still says Trial active |
| Divine Remodel | September 5 and October 5 | $138 | Found incorrectly still says Trial active |
| RC Bicycles | July 31 | $39 | August 31 invoice remains open; no September renewal displayed |
| Total | 4 nonzero paid invoices | $246 | RC has a $39 open invoice |

Totals reflect the invoices accessible in this check, not a complete lifetime revenue, refund, Stripe fee, or bank payout reconciliation.

## MBJ Heating and Cooling

- Website: https://mbjheatingandcooling.com
- Found plan: Business. Displayed recurring rate: $69/month.
- Stripe customer: `cus_V5kGdLMwwn3lcv`.
- Verified nonzero paid invoices: $69 total.

| Invoice date | Invoice number | Amount | Verified Stripe status | Service period |
| --- | --- | --- | --- | --- |
| August 17 | MXHGRV8I-0001 | $0 | Paid - free trial | August 17 - September 15 |
| August 22 | MXHGRV8I-0002 | $0 | Paid - free trial | August 22 - September 15 |
| September 15 | MXHGRV8I-0003 | $69 | Paid | September 15 - October 15 |

September payment is verified. The paid service period runs through October 15, which is still in the future on the verification date. No unpaid invoice appeared among the three invoices returned.

Found's database and billing page still label this account trialing/Trial active. The billing page says First bill October 15 even though a September invoice is already paid. This is a confirmed display/data inconsistency, not evidence of nonpayment.

## Divine Remodel

- Website: https://divineremodelaz.com
- Found plan: Business. Displayed recurring rate: $69/month.
- Stripe customer: `cus_V7C6FroGH3rM9H`.
- Verified nonzero paid invoices: $138 total.

| Invoice date | Invoice number | Amount | Verified Stripe status | Service period |
| --- | --- | --- | --- | --- |
| August 22 | MZ02826V-0002 | $0 | Paid - free trial | August 22 - September 5 |
| September 5 | MZ02826V-0003 | $69 | Paid | September 5 - October 5 |
| October 5 | MZ02826V-0004 | $69 | Paid | October 5 - November 5 |

September and October payments are verified. The latest paid service period runs through November 5. No unpaid invoice appeared among the three invoices returned. An earlier invoice is outside the page's three-invoice limit and was not inspected.

Found's database and billing page still label this account trialing/Trial active. The page says First bill November 5 despite two paid monthly invoices. This is a confirmed display/data inconsistency.

## RC Bicycles

- Website: https://rcbicycles.com
- Found plan: Pro. Displayed recurring rate: $39/month.
- Stripe customer: `cus_UzHNx1GvBTzVrD`.
- Verified nonzero paid invoices: $39 total.

| Invoice date | Invoice number | Amount | Verified Stripe status | Service period |
| --- | --- | --- | --- | --- |
| July 31 | UG1AOYKM-0001 | $39 | Paid | July 31 - August 31 |
| August 31 | UG1AOYKM-0002 | $39 | Open - not paid | August 31 - September 30 |

July payment is verified. The August 31 invoice remains open. Its face value is $39; the exact remaining balance and any partial payments or credits were not independently retrieved. No September 30 renewal invoice was returned; the reason is unverified. Do not add another $39 to the unpaid total without confirming an invoice exists.

Found still says Active and Renews September 30, a date already past. The open invoice also incorrectly says Total paid $39: the receipt code substitutes amount due when amount paid is zero. That label does not prove payment.

RC requires investigation of subscription status, payment attempts, retry schedule, and the missing renewal before deciding any billing action.

## Verification Limits and Follow-up

- Billing pages return at most three recent invoices per customer; RC returned two.
- Invoice dates are creation dates, not independently verified card settlement dates.
- Paid invoice status is verified; charge transaction details, refunds, disputes, fees, and payouts to Found's bank were not audited.
- Actual live subscription statuses and future automatic charge schedules need further verification. Service-period end dates alone do not guarantee another charge.
- Team direction and Shawn approval are required before billing display fixes, reconciliation changes, payment retries, or subscription changes.

No payment was retried. No billing settings, subscriptions, or client data changed during this report.

Technical evidence and defects: [Monthly payment audit](monthly-payment-audit-2026-10-08.md).
