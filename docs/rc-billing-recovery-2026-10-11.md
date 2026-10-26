# RC Bicycles Billing Recovery

## October 13 — Independent payment/card verification and receipt delivery blocker

- Rechecked invoice paid $78/zero balance, PaymentIntent pi_3UPXk1IA6YgoJYxs0Au6BBpU succeeded/amount_received=7800, and charge ch_3UPXk1IA6YgoJYxs0a8sylg2 paid/captured/succeeded, zero refunded/no dispute. Payment timestamp October 13, 3:11:44 PM Arizona. No October $39 payment exists or is due before October 31.
- Rechecked exactly one active replacement at $39 USD/month, automatic collection, next anchor October 31. Retrieved its actual default PaymentMethod, mapped to RC customer, Visa ending 1444. Do not conflate subscription active with $39 already paid.
- Found email_log has no recovery receipt/setup confirmation since October 11. Stripe charge receipt_email=null; this does not independently establish whether Stripe's automatic account-level receipt email was sent.
- Prepared one combined actual $78 receipt link plus clearly labeled future-autopay confirmation to rhino@rcbicycles.com. Private copy at `.billing-audits/rc-receipt-confirmation-2026-10-13.txt`.
- Send attempt via existing sendTrackedEmail stopped before provider call: production env export contains empty credentials; local env lacks RESEND_API_KEY. Browser inventory empty, so authenticated live send form unavailable. Nothing sent and no new email_log record claimed. Do not blindly run the private sender without checking dedup/history and current credentials first.
- Broader team repair remains required: admin screenshot shows stale stored billing warnings, backend financial facts/event synchronization need separate reviewed work. No access protection/global settings changed during this verification.

## October 13 — Restart completed despite blank redirect

- Shawn reported black screen after submitting. Read-only live checks confirm Checkout `cs_live_a1gTpnikeh8ScAssh9XshoXNPjihlf1Z9XD4udgNIe4vM895tgmfosHTJj` status=complete, payment_status=no_payment_required, amount_total=0, subscription=`sub_1UQE0JIA6YgoJYxsS0bZG21L`. Do not resubmit or create another restart session.
- Complete subscription list contains exactly one active replacement and canceled original. Replacement is USD $39/month, quantity 1, collection_method=charge_automatically, default_payment_method present, no cancellation or pause, billing_cycle_anchor/current_period_end=1793462864 (October 31, 9:07:44 AM Arizona). Company/plan/slug metadata matches RC. Card brand/last four not independently retrieved in this check.
- Catch-up UG1AOYKM-0003 remains paid $78/zero remaining, July paid unchanged, August superseded invoice void. No new immediate invoice or setup charge.
- Blank post-submit page did not prevent Stripe completion. Found backend reconciliation/signing-listener gap remains to verify separately; no access override released or backend/configuration write made by this check.

## October 13 — Catch-up paid; expired restart replaced

- Shawn reported paying on Ryan's behalf with permission. Live Stripe confirms invoice UG1AOYKM-0003 paid $78, zero remaining. Original $39 remains void; July paid unchanged.
- Complete live subscription list still contains only canceled original; old Checkout session expired, subscription=null.
- At Shawn's request created replacement Checkout `cs_live_a1gTpnikeh8ScAssh9XshoXNPjihlf1Z9XD4udgNIe4vM895tgmfosHTJj`, retrieved open/$0 today/subscription=null. Same customer, $39 monthly price, October 31 anchor 1793462864, proration none and required payment method collection. Copy acknowledges catch-up paid.
- Full required URL fragment preserved. Exact request/session saved privately in `.billing-audits/rc-recovery-restart-2026-10-13.json`; expiry timestamp 1792016092. Previous Found shortlinks remain expired; supply new full Stripe URL.
- No saved-card charge, card details collected, access change, listener/configuration change or client message. After completion verify chosen card/new subscription/anchor and safely reconcile Found; backend synchronization gap remains open.

## SMS Shortlinks / Requested Memo Update - October 11, 2026

- Shawn requested actual Found-branded links that copy cleanly into SMS, plus a catch-up-only invoice memo referencing Aug 31 and Sep 30 payments.
- Fresh Stripe connector verified Found Co live account and same open $78 invoice; July paid and original August void record remain unchanged. Restart session remains open, $0 today, same existing approved subscription setup.
- Complete Checkout URL includes required `#` fragment. Earlier bare path was incomplete; preserving fragment is mandatory.
- Two temporary service-only billing_link_redirect records bind RC to original invoice/session URLs, with random 128-bit codes and expiry October 12 at 5:45 PM Phoenix. No financial, access or global configuration write.
- Team-authorized description-only update was rejected by Stripe because the invoice is finalized. No memo/amount/status/date/line changed. A revised/replacement invoice now needs separate explicit approval; do not void or replace on current shortlink approval.
- `ae3ab41` shortlink routes deployed. Build, 42 tests, private table permissions and stored-record integration passed. Live exact Location headers (including setup fragment), fail-closed errors, phone-sized $78 pay page and $0 today/$39 monthly Oct 31 setup verified. No payment submitted. Memo stays unchanged pending explicit revised/replacement approval.

## Autopay / Found integration verification — October 11, 2026

- Restart Checkout uses subscription mode, same customer, original $39 recurring price and company/plan/slug metadata. It is intended to create recurring autopay only after Ryan authorizes; fresh subscription list still shows only canceled original subscription.
- Found owner Billing queries subscriptions/invoices by stripe_customer_id, so the replacement is compatible with its live read path.
- Automatic backend synchronization is not proven complete: reviewed platform/self event listener remains pending; current documented Connect-only destination does not supply Found subscription callbacks. Additionally applyCustomerProjection exits protected for Ryan, deliberately preserving legacy access fields. Do not promise complete automatic backend recovery or release access override.
- After Ryan completes both links, verify resulting subscription chosen default card/amount/anchor/collection method and paid catch-up invoice; separately reconcile billing state safely while retaining protection. Event listener/configuration work remains a separate approved-scope decision.

## Checkout URL correction — October 11, 2026

- Shawn reported screenshot error "This link is incomplete." The prior text omitted Stripe's required URL fragment after `#`. Never shorten or remove any part of the API-returned Checkout URL.
- Re-retrieved original session: still open, subscription=null, same expiry. No new session/subscription/charge created. Supply the complete unmodified URL, including the entire fragment, for copying to Ryan.

## Completed link preparation — October 11, 2026

- Shawn explicitly approved replacing the original $39 invoice with the $78 catch-up invoice and completing both links.
- Fresh read confirmed original was still open/$39 unpaid and replacement draft exactly $78 with both agreed periods.
- Voided original `in_1UAXl0IA6YgoJYxsjjmRhgV7` (UG1AOYKM-0002), preserving its historical paper trail. Its debt is represented in the replacement; do not count void invoice amount_remaining as collectable debt.
- Finalized replacement `in_1UPXRvIA6YgoJYxsczGxdm00` (UG1AOYKM-0003). Re-read verifies open, $78 total, $0 paid, manual send_invoice collection, auto_advance=false. Hosted payment URL obtained without sending or charging. July paid invoice remains unchanged; only one open collectible invoice remains, $78.
- Restart Checkout reverified open/$0/subscription=null, same approved October 31 anchor. Ryan completes it to authorize chosen card and create replacement subscription. Expiry remains October 12, 2026, 5:45:32 PM Arizona.
- Exact invoice/restart links and final API proofs stored privately in `.billing-audits/rc-recovery-final-links-2026-10-11.json`; links delivered to Shawn, not messaged to Ryan.
- No saved-card charge, retry, automatic invoice send, access write or global config change. Await Ryan payment/authorization; afterward verify catch-up paid and resulting subscription $39/month/October 31 anchor, reconcile Found billing without releasing protection.
- All earlier draft/approval-blocker statements below are historical and superseded.

## Two-link preparation — October 11, 2026

- Shawn requested a general amount-owed invoice link plus a separate restart/card-entry link.
- Created live replacement draft `in_1UPXRvIA6YgoJYxsczGxdm00`, verified total $78 USD, collection_method=send_invoice, auto_advance=false. Two $39 lines explicitly cover Aug 31–Sep 30 and Sep 30–Oct 31. Original July payment/history untouched.
- Draft is not finalized, payable, or sent; no hosted payment URL exists yet. Original August invoice remains open at $39. Do not finalize the replacement while leaving original debt collectable.
- Concrete approval needed: supersede/void `in_1UAXl0IA6YgoJYxsjjmRhgV7` as replaced by this draft, then finalize the $78 manual invoice with auto_advance=false; retrieve payment URL without sending or charging. Voiding here replaces debt; it does not forgive the $39, which remains in the replacement total. Re-read original balance before mutation; if it has been paid/changed, stop and adjust the plan.
- Existing restart Checkout re-retrieved: open, $0 total, no completed replacement subscription. Still expires October 12 at 5:45:32 PM Arizona. Do not expose either link to Ryan until the approved invoice arrangement is complete. Ryan enters/authorizes the card himself.
- No saved-card charge, invoice retry, message or access/configuration change.

## Verified Financial History

- July 31: $39 paid, covering July 31-August 31.
- August 31: $39 invoice remains open, covering August 31-September 30.
- September 14: Stripe subscription canceled for payment failure.
- September 30 renewal: no invoice was generated. Do not describe it as a declined payment.
- Public site and legacy service access remain protected at Shawn's explicit request.

## Shawn's Approval

Shawn authorized catching up two $39 periods ($78 total) and restarting $39/month billing.
Following the independent team review, Shawn explicitly approved October 31, 2026 as the next renewal.
Preserve the original 31st/end-of-month anniversary rather than resetting billing to card-entry day.

- Existing $39 debt: August 31-September 30.
- Separately agreed $39 unbilled service: September 30-October 31.
- Next recurring $39: October 31-November 30.
- No additional immediate recurring/proration charge for the already covered current period.
- Ryan supplies and authorizes his card via a secure payment/setup page; do not collect card details in messages.
- Saving a card or paying debt alone does not restore a canceled subscription.
- Keep the original site start date and actual payment timestamps intact; neither is the replacement subscription creation date.
- Verify the live customer, prices, existing unpaid invoice, other subscriptions, service coverage, and next charge before finalizing recovery.
- Do not create a new $78 debt while leaving the old $39 debt open for duplicate collection.

## Access Blocker / Execution State

No new invoice, payment session, subscription, card update, charge, or client message has been created by this recovery work.
An existing hosted payment URL for the open $39 invoice was retrieved and checked; it is not a $78 catch-up or restart link.
Local Stripe credentials use test mode. The authenticated deployed ledger supplies live read-only verification, not write access.
Computer-use inventory returned no connected browser/app surfaces.
Update after Shawn installed Stripe: plugin discovery confirms installed=true and Stripe skills are loaded.
No Stripe account-management tools are exposed in this conversation yet; live account identity/authorization is not verified.
Official plugin instructions call for a new chat after installation and allow explicit invocation with @Stripe.
Continue once live Stripe access is confirmed. Never paste credentials into chat or equate installed status with live account access.
If the available Stripe flow requires a different debt-consolidation or subscription setup decision, return it to the team and Shawn.

## Boundaries

## Live execution update — October 11, 2026

- Stripe connector verified Found Co live account `acct_1ThgqzIA6YgoJYxs`; live invoices independently return Found Co as issuer.
- Customer `cus_UzHNx1GvBTzVrD` is RC Bicycles, `rhino@rcbicycles.com`, matched company/slug metadata. Customer balance is zero.
- Full live reads confirm only the original canceled subscription `sub_1TzIyKIA6YgoJYxsSfxybDYd`, the July paid $39 invoice, and August open invoice `in_1UAXl0IA6YgoJYxsjjmRhgV7` with exactly $39 remaining, auto_advance=false and no next payment attempt.
- Original live active price `price_1TrggPIA6YgoJYxswwtg2EJM` is $39 USD/month. The separate $69 price is not used.
- Live subscription schedules and pending invoice items both returned empty complete lists; no competing scheduled subscription or pending debt found.
- Created and retrieved live subscription Checkout session `cs_live_a1GzZFiu1MHCHkbNlv37vDfop00JBe1ZYE5afvd9FJqRyUGEAizN8EqycW`. Verified $0 total today, quantity 1 at the $39 monthly price, status open, subscription=null. Request sets billing_cycle_anchor=1793462864 (October 31, 2026, 9:07:44 AM Arizona, preserving original UTC billing time), proration_behavior=none and payment_method_collection=always. Subscription is not restarted until Ryan completes Checkout; verify resulting subscription anchor and renewal afterward.
- Checkout expires October 12, 2026, 5:45:32 PM Arizona. Exact request/response and secure URL saved privately in `.billing-audits/rc-recovery-restart-2026-10-11.json`. Recheck expiry/state before reuse; do not create duplicate sessions.
- Catch-up remains uncreated. Standard Stripe invoice revisions exclude finalized subscription invoices (private preview exists but account eligibility is unverified). Do not attempt a $78 duplicate invoice or void historical debt without a new approved arrangement.
- Team recommendation awaiting Shawn: keep original $39 invoice payable and create a second manual $39 invoice specifically for September 30–October 31, auto_advance=false, no stored-card charge or automatic sending; total catch-up remains $78. Alternative single $78 replacement requires approval to supersede/void original debt safely.
- No card charge, invoice retry, new debt, client message, site/access write, listener/configuration change, or other-client mutation performed. Earlier access-blocker state above is historical and superseded by this update.

This approval is for RC recovery terms, not a blanket authorization to activate global notices/holds,
modify other clients, release Ryan's access override, or change existing Connect/platform signing configuration.
Do not trigger a stored-card charge while merely preparing links. Ryan should review and authorize payment himself.
