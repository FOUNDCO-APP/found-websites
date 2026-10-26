# November Promo and Hiram Content: Release Status

Date: October 20, 2026
Status: Promo Release A pushed; production verification pending. Security changes local only.

## Release A: October 21

Independent reviewer read the exact isolated 22-file diff and both new files,
found no actionable issues and approved the scoped code release. The preexisting
lifecycle gap does not block this repair; existing commitments remain unchanged.

Committed on `codex/november-promo` and pushed to remote `main`:
`e10b46452ab73e350d1b4324545c450ce52b498c`.
Existing Vercel Git integration is expected to deploy it; initial GitHub status
was empty, so this is not yet evidence of successful deployment. No security or
unfinished billing patch was included. No live Stripe mutation was performed.

Follow-up production check: the public `/plans` browser still shows regular
$39/$69/$99 and the old price-bearing page title, not the locally verified
November 15 offer. Three GitHub status reads for the new commit returned no
deployment statuses. Production deployment is UNCONFIRMED; do not tell Shawn it
is live. Saved Vercel API login remains403. Next session must verify or repair the
existing project's deployment integration/access, not create a new hosting project
or push another redundant commit as an unreviewed workaround.

Main working checkout remains at its original HEAD with dirty work preserved;
the release commit is in the attached isolated worktree and remote main. Do not
reset or casually cherry-pick over the main checkout's changes. Compare file
contents and original dirty work carefully when reconciling its local branch.

## October 21 Follow-Up: Approved Implementation

Shawn replied 'Approved. Make it happen.' Targeted first-invoice/cached-Price
consistency repairs and the guard subtype are now in implementation. Authoritative
existing founding eligibility is forwarded to both activation overlay entry points
without a new query or policy. A concrete new-subscriber 12-month transition plan
is being prepared independently; no existing subscription is authorized to change.
The questions below describe the prior approval request, not continuing silence.

Stripe account-list and connection-management calls still return authentication
requests without account data. Shawn asked for a connection walkthrough; supplied
Plugins -> Installed -> Stripe and asked for its screen if no connect control is
visible. Do not request raw API keys. Existing Vercel login remains 403, but Git
remote access succeeds and GitHub reports the existing Vercel deployment check as
successful for main `ae3ab413a6ddfefdbca653a2e09e042e94ad4a9a`. No new release yet.
The isolated worktree's locked dependency install completed successfully.

### Completed Local Verification

- Targeted promo repair now passes 426 boundary/rendered-copy checks both in main
  and in the isolated 22-file release checkout. TypeScript passed.
- Isolated production build passed after the final fixes. Existing Next middleware
  deprecation and Sentry Edge Runtime warnings remain, not new build failures.
- Browser inspected built `/plans`: November 15, Starter $29, Pro $39, Business
  $69; no visible desktop pricing overlap. Screenshot saved at
  `quality/november-promo/plans-desktop.png`. No mobile browser verification claimed.
  Temporary local QA server was stopped after inspection.
- First-invoice promo headlines now state first invoice, not a permanent monthly
  price. Cached SetupIntent reuse requires exact selected Price ID. Both existing
  overlay paths pass stored founding eligibility. Newly expanded picker transition
  promises were restored to preexisting regular-price comparisons; existing
  advertised terms elsewhere were not silently changed.
- Guard subtype implementation passes 33 mocked focused checks, 54 existing
  copy-quality fixture groups, TypeScript and whitespace checks. Only seven library
  files and `scripts/check-security-guard-support.mjs` were changed by its worker.
  No new guard photos are approved; curated inventory is intentionally empty.

### New Blockers and Owner Questions

- Shawn reports connecting Found Co. in Stripe. Subsequent account-list calls now
  fail with `Unknown tool (stripe.list_available_accounts_or_orgs)` twice, rather
  than authentication prompts. Plugin discovery confirms installed/enabled. Do not
  tell him to reconnect repeatedly or claim live account verification. A fresh
  Codex chat/tool session may be needed; preserve this handoff and the worktree.
- Security worker identified three integration bypasses outside its file scope:
  onboarding/admin manifest calls omit subtype; `copySimilarity.ts` can rewrite
  conservative copy with unconfirmed intake claims; `/api/stock-photo` can bypass
  the guard selector and save generic hero stock. Asked Shawn explicit approval
  for those three integration repairs; no answer recorded. Do not release partial
  guard support as end-to-end complete.
- Independent reviewer was asked for the concrete new-subscriber transition plan
  and final promo release verdict. Do not treat local tests as reviewer approval.
- No commits, push, deployment, live Stripe reads/writes, Hiram customer/asset
  edits, messages, charges, subscription schedules or site holds this follow-up.

### Next Session

1. Read this packet and AGENTS.md; keep approved scope and independent review.
2. Verify newly connected Stripe account via available account-list tool before
   any account operation. User selected Found Co.; previously known live account
   `acct_1ThgqzIA6YgoJYxs` is a cross-check, not permission to skip verification.
3. Read live regular/intro Prices and relevant promo expiration restrictions.
   Distinguish app-cutoff prices from separate first-invoice/headstart offers.
4. Obtain the remaining integration approval and concrete transition decision,
   complete tests/review, then release only scoped files from the isolated checkout.
   Git remote and GitHub Vercel status reads work despite saved Vercel login403.
5. Confirm canonical Hiram site, services and acceptable photos before publishing.

## Independent Lifecycle Plan and Release Separation

Reviewer Hegel concluded that the preexisting lifecycle gap need not block the
November 15/display repair. Release A can be scoped to that repair; Release B is
the separately reviewed and sandbox-proven lifecycle. This is not a claim that
Release A's final 22-file source review or live Stripe verification has passed.

Proposed Release B, not implemented or authorized for live writes:

- Only new customers accepting versioned terms after lifecycle launch are enrolled.
  Existing subscriptions, historic founding commitments and older pending
  activations remain unchanged. Never infer consent from a flag or dollar amount.
- Lock actual intro/regular Price IDs, currency, plan, deferral, promotion and terms
  version; disclose actual transition date and regular amount before confirmation.
  Team recommends 12 monthly paid billing periods after any promised free deferral.
- Create subscription with stable idempotency and durable concurrency-protected
  enrollment, then attach/verify a Stripe schedule for intro -> regular continuity.
  Partial failures retain a schedule-pending state; retry only unfinished work,
  alert on failure and do not duplicate charges or backcharge the customer.
- Handle upgrades/add-ons, quantities, cancellation and existing discount expiry
  without resetting the original intro or coupon periods.
- Integrate `confirmActivation`, resolve unused hosted `getPreviewCheckout` bypass,
  and make dashboard/portal plan changes schedule-aware for this cohort only.
- Before enabling: authenticated sandbox/test-clock proof for all plans, deferrals,
  month-end/leap-year boundaries, invoice12/13, zero/once/repeating/forever discounts,
  payment failures, cancellation, concurrent confirms, operation timeouts, replayed
  webhooks and unchanged existing subscriptions. No Stripe Tax change is included;
  tax registration/collection would need separate review.

Primary implementation references:
https://docs.stripe.com/billing/subscriptions/subscription-schedules
https://docs.stripe.com/api/idempotent_requests

Reviewer explicitly did not claim live inventory, schedules, discounts, webhooks
or authenticated end-to-end evidence. Final source review of Release A requested
as a separate bounded follow-up; do not conflate the lifecycle design verdict with
completed code review.

## Approved Scope

Shawn requested extending the existing promotion on marketing and Stripe to
November 15, 2026, and appropriate security-guard photos and copy for Hiram.
The deadline is inclusive through November 15 in Arizona: exclusive cutoff
`2026-11-16T07:00:00.000Z`. No price amounts, existing subscription terms,
customer charges, site holds, or messages are authorized by this extension.

## Actual Independent Team Work

- Implementation agent prepared the deadline, date-sensitive marketing rendering,
  shared pricing display, and server-returned activation price display.
- Independent reviewer requested changes before release: unsupported expanded
  12-month transition copy, one-time discount headlines presented as monthly
  prices, and a preexisting cached SetupIntent reuse check missing Price ID.
- Content agent drafted Hiram copy and documented the parent's visual photo
  inspection. No independent visual inspection or publication is claimed.
- These are AI reviews using Found team responsibilities, not participation by
  the real people named in AGENTS.md.

## Verification and Isolation

- 354 focused date-boundary and rendered-copy checks passed; TypeScript passed.
- Production build passed before the final eligibility-display refinement;
  no final isolated-worktree build or production verification has occurred.
- Passing tests do not override independent review findings.
- Optional founding-member eligibility props are not wired by existing callers.
  After cutoff, unknown eligibility displays 'Price shown at checkout' rather
  than an invented regular or intro rate. Authoritative wiring remains proposed.
- Scoped copy of 14 modified and 2 new promo files is saved in the attached
  worktree `C:/Users/SuperShawn/.codex/worktrees/november-promo/found-websites`.
  No dependencies installed there, commit, push, or deployment. Keep unrelated
  billing and dashboard work out of this release.

## Stripe and Deployment Access

- Stripe connector repeatedly requests authentication without returning account
  data. Await Shawn reconnecting Stripe; do not loop or expose production keys.
- Saved Vercel login returns 403. No deployment was attempted with a new identity.
- No live promotion inventory verified and no live Stripe writes made this turn.
- Existing intro offer uses separate recurring prices selected by app cutoff;
  it is not necessarily a Stripe promotion-code expiration. Separate first-invoice
  codes must not be changed just because the intro deadline moved.
- Never call `/api/stripe/setup-products` for an audit: its GET mutates pricing
  and promotion configuration.

## Decisions Awaiting Shawn

Questions were presented through the approval UI; no answer is recorded.

1. Approve a plan for automatic regular-price transition for new subscribers,
   preserving the advertised 12-month terms and leaving current clients alone.
   Existing creation code uses an intro recurring Price without a scheduled switch.
2. Approve targeted first-invoice headline and cached Price-ID consistency repairs.
3. Approve Security Guard Services as a subtype under Professional Services,
   with exact guard detection and reviewed matching photos, not generic fallback.

Do not treat silence or a preselected option as approval. Do not silently widen
server, customer, category, or financial behavior. Return obstacles to review.

## Hiram Content

See `docs/hiram-security-copy-and-photos-2026-10-20.md` for the actual draft.
The existing 38-photo professional/events catalogue has zero guard-tagged photos.
Seven Pexels candidates were visually inspected. Two are possible generic
secondary images only; no clean hero was approved. No photo pool, uploaded asset,
logo, customer category, or site content was changed.

Confirm which of Hiram's two signups is intended before customer edits. Confirm
services before publishing descriptions. Do not invent licensing, armed service,
24-hour availability, staff identity, endorsements, or a public business address.
Ryan's site remains protected and unrelated billing rollout remains on hold.

## October 21 Fresh Session Verification

- Stripe connector now works. Account-list returned Found Co, live mode,
  `acct_1ThgqzIA6YgoJYxs`, matching the previously selected account.
- Authenticated read-only inventory confirmed all six active USD monthly Prices:
  Starter intro $29 / regular $39; Pro intro $39 / regular $69;
  Business intro $69 / regular $99. Lookup keys match setup source.
- All three active separate $1 promotion codes have no `expires_at`, a maximum
  of 25 redemptions each, and no first-time-transaction restriction. Their
  referenced coupons (`found_1_forever_starter`, `found_1_forever_pro`,
  `found_1_forever_business`) have `duration=forever`, no `redeem_by`, and
  $28/$38/$68 USD amount-off respectively. These are not first-invoice coupons.
  Do not rewrite these existing offers as part of the November cutoff extension.
  No live Stripe mutation, charge, subscription or schedule change was made.
- Exact commit e10b46452ab73e350d1b4324545c450ce52b498c has a successful GitHub
  Actions build (completed 2026-10-21T16:33:05Z). Its Vercel commit status is
  pending, description "Vercel is deploying your app", timestamp
  2026-10-21T16:38:24Z. GitHub deployments endpoint returned no records for it.
  Deployment detail: https://vercel.com/foundco/found-websites/BkLxRNDeExiW6wKYYrLKvdiZsZZy
- Public https://foundco.app/plans returned HTTP 200. Browser inspection still
  shows regular $39/$69/$99 with no November 15 offer. Page title still reads
  "Compare Plans | Found — $29, $39, $69/month — Found". Release A production
  verification remains incomplete; a passing GitHub build is not proof of release.
- Vercel deployment detail redirects to login in this session. Existing authenticated
  Vercel access is needed to inspect build logs/queue and repair the deployment if
  pending persists. No new hosting project, redundant commit or redeploy was created.
- Main checkout's unrelated dirty work and isolated release checkout were preserved.
  Security integration repairs and lifecycle rollout remain subject to the previously
  recorded approval/review boundaries. No new independent review is claimed here.
