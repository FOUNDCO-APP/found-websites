# Found HQ V2 Audit
*Prepared July 8, 2026*

## Executive Conclusion

Found HQ currently monitors the Found product. It does not yet operate Found Co.

The existing admin can open a customer site, impersonate a customer, review generated content, and resolve setup defects. It cannot reliably acquire customers, follow up with prospects, show client health, or tell Shawn what to do next.

The recommended reset is:

1. **Today** - the short, prioritized work list.
2. **Sales** - Found Co prospects and follow-up.
3. **Clients** - paying and managed business relationships.
4. **More** - quality tools, destinations, and account controls.

Quality remains useful, but it belongs under More rather than being a primary business outcome.

## Evidence

### Production data snapshot

- 31 company records.
- 15 have an active subscription status.
- 16 have no subscription status.
- 22 have a Stripe customer ID.
- 0 are marked as comp.
- Plans: 17 Starter, 3 Pro, 11 Business.
- 10 abandoned-onboarding lead records exist.
- All 10 use the same email address.
- All 10 overlap an existing company.
- None of the 10 has a phone number.

Conclusion: abandoned onboarding currently contains test/retry activity, not ten usable prospects. A Stripe customer ID also does not prove a business is active or healthy.

### Current strengths

- Customer site and View as actions work.
- Notes and comp controls exist.
- Subscription status is synchronized from Stripe.
- Website copy has snapshot and undo protection.
- Photo and email inspection tools are available.
- Business setup defects can be detected.

### Current weaknesses

- No canonical Found Co prospect record.
- No sales stage, owner, next action, follow-up date, loss reason, or activity history.
- No distinction between a prospect, onboarding business, active client, test account, and cancelled client.
- No reliable recurring-revenue or account-health view.
- Admin notes are a single unstructured field.
- Customer leads and Found Co sales leads share the `leads` conceptually.
- Overview counts defects but does not rank work.
- Equal-weight cards and rows make urgent work feel no more important than reference information.
- Generic counts describe the database rather than tell Shawn what to do.

## Team Review

### Steve Jobs - Product

Found HQ must answer one question in five seconds: **What should I do next to grow or protect the business?**

Anything that does not help close a prospect, activate a client, retain revenue, or resolve a customer-blocking issue is secondary.

### Jony Ive - Design

The interface needs hierarchy, not more decoration: one dominant next action, quiet supporting information, fewer borders, and clear state changes. Color communicates status only. Counts without an action are removed.

### Angela Ahrendts - Customer Experience

Prospects and clients need a relationship history. Every follow-up must have context, and every client problem must lead to a clear resolution path.

### Phil Schiller - Growth

Sales must show pipeline movement and expected value. Source and loss reason are required so Found can learn which acquisition work produces customers.

### Craig Federighi and Priya Nair - Engineering and Data

Do not repurpose tenant customer leads. Add a small, separate Found Co operating model with auditable activities and constrained states. Derive summaries from source records instead of storing duplicate totals.

## V2 Product Specification

### Today

Purpose: a finite list of work that protects revenue or advances a sale.

Priority:

1. Overdue prospect follow-ups.
2. New prospects that have not been contacted.
3. Proposals awaiting a response.
4. Client payment or activation problems.
5. Client setup issues blocking launch.

Each row contains the person or business, why it matters, age or due time, and one primary action. Completing or rescheduling an item removes it from Today.

General quality warnings do not appear here unless they block launch or affect a live client.

### Sales

Purpose: move Found Co prospects toward a paid plan.

Stages: New, Contacted, Demo scheduled, Proposal sent, Won, and Lost.

Required fields:

- Person name
- Business name
- Email and/or phone
- Source
- Stage
- Next follow-up date
- Estimated plan
- Notes
- Created date
- Won/lost date and loss reason when applicable

Required actions:

- Call, text, or email from the record.
- Log an interaction.
- Set or reschedule the next follow-up.
- Move stage.
- Convert Won to a client/company without retyping identity data.
- Mark Lost with a reason.

The first release uses a focused list grouped by urgency, not a drag-and-drop board.

### Clients

Purpose: operate the relationship after a prospect becomes a customer.

States: Onboarding, Active, Comp, Past due, and Cancelled.

Each client summary shows state, plan, subscription/payment status, start date, last meaningful activity, open blocking issues, and monthly plan value.

Client actions include opening the site, viewing as the client, contacting the client, adding a dated note, resolving setup issues, opening billing management, and marking comp with an explicit reason.

Test businesses must be explicitly tagged and excluded from revenue and operational totals.

### More

- Website copy review
- Photo library
- Email previews
- Found website
- Customer dashboard
- Account and sign out

These are important tools, but they are not top-level daily business outcomes.

## Data Model Recommendation

Add separate tables rather than expanding tenant `leads`:

### `sales_prospects`

Identity, contact details, source, stage, next follow-up, estimated plan, loss reason, linked company ID, and timestamps.

### `sales_activities`

Append-only calls, texts, emails, notes, stage changes, and follow-up changes linked to a prospect.

### `client_activities`

Append-only dated operational notes and resolved issues linked to a company. Keep `admin_notes` temporarily for compatibility, then migrate it.

### Company additions

- `account_kind`: client, test
- `client_state`: onboarding, active, comp, past_due, cancelled
- `client_started_at`
- `comp_reason`

Subscription status remains Stripe's billing fact. Client state is Found Co's relationship fact. They must not be treated as the same field.

## Safety Rules

- Never expose Found Co sales records to tenant/customer RLS paths.
- Service-role/admin access only for V2 sales and client operations.
- Append activities instead of overwriting history.
- Require confirmation for Lost, Cancelled, comp changes, and destructive merges.
- Keep prospect-to-client conversion idempotent.
- Deduplicate by normalized email and phone, but require review before merging.
- Exclude test accounts from revenue and growth metrics.
- Do not automate outbound sales messages in the first release.

## Build Sequence

### Phase 1 - Foundation

Create the sales/activity schema, test-account classification, client-state rules, and migration/backfill preview. No production records change without a reviewed dry run.

### Phase 2 - Sales and Today

Build prospect capture, stages, follow-up scheduling, activity history, conversion, and the prioritized Today queue.

### Phase 3 - Clients

Replace Businesses with Clients, preserve working support actions, and add client health and dated activity.

### Phase 4 - Visual refinement

Apply the final hierarchy and interaction system after real workflows are testable.

## Final Team Recommendation

Approve the four-destination V2 structure and data model before implementation. Build Sales and Today first because the current database has no usable prospect pipeline. Preserve the working support and quality tools, but stop treating them as the center of Found HQ.
