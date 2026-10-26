# Hiram duplicate signup and access-control audit

Initial read-only audit on October 25, 2026. Shawn subsequently approved all
recommendations after visible independent team review. Remediation completed:
membership boundary secured, paid Stripe email corrected, unused draft retired
without deletion. Release `d4f97106e3e2f6306a998c157779d51abead787c` is READY.
Exact execution/verification and limitations are recorded in SESSION_HANDOFF.md.
The findings and recommendations below preserve the initial audit context.

## Billing verified in Found Co live Stripe

- Retain company `626dc220-4152-4711-8862-a885534e1e0a`, slug `intellsecurity`.
- Old company `bf4cd3d6-f96d-495c-aee9-308633da0524` is the earlier signup.
- Both belong to the same Auth user. Do not delete the shared Auth user.
- Old customer: zero subscriptions (all statuses), invoices, or charges.
- Retained customer: one active subscription, one item, quantity one, USD 39/month;
  one paid USD 39 invoice and one successful USD 39 charge. Lists exhausted.
- Customer search by both known emails and business name returned those two
  customers only. No duplicate charge found in this scope.
- Both Stripe customer emails retain the typo. Retained company and Auth email
  are corrected. Propose correcting retained customer's billing email separately.

## Critical independent security finding

Parent and independent Priya/Craig reviewer confirmed `public.company_members`
has RLS enabled but an unrestricted ALL policy TO PUBLIC named
`service role full access`. Browser roles have table privileges. Reviewer also
confirmed DELETE privileges and anonymous zero-row REST GET returning 200.

Dashboard company selection trusts active membership rows. Unauthorized worker
membership modification could therefore grant cross-company worker access.
Worker-only role constraint does not eliminate this risk. No exploit/mutation
was attempted; no evidence of past exploitation established. Historical audit
is separate work. Hiram's companies have no membership rows.

Priority proposal: inspect legitimate invitation/team flows, restrict table
access to trusted server/service-role operations, and test anonymous denial,
unauthorized changes, and legitimate owner/worker flows. Do not silently deploy
unreviewed permission changes or call this a completed security audit.

## Duplicate retirement proposal

No supported archive mechanism found in inspected code. Inactive flag does not
remove company-picker entries; cancelled is not retirement. Do not misclassify
as test or hard-delete. Implement reversible retirement across admin, owner
picker, and selection/access checks, preserving live site, shared Auth, history,
forwarding and subscription. Requires explicit scope approval and tests.

Independent reviews: Priya/Craig and Steve/Marcus AI roles. Findings and scope
were presented to Shawn in chat. Gallery/photo work is paused, not approved by
this billing/security request.
