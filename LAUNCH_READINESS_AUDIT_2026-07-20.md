# Found Co. Launch Readiness Audit — July 20, 2026
**Supersedes:** `LAUNCH_READINESS_AUDIT_2026-07-09.md` (kept for history — most of its P1 list is still open, quoted below).
**Decision:** Not ready to launch. One item below is a live production security/trust bug and should not wait for a full launch push — see "Urgent, don't wait" below.

---

## Team Verdict

- **Steve, Product:** Two paying-customer promises don't hold up — a Business-plan feature that doesn't exist, and a payment flow that can be told it got paid without any money moving. Neither is acceptable to ship on.
- **Priya, Data:** Found the most serious item this pass — the public estimate accept page will mark any estimate `paid` on a bare `{paid: true}` POST, no Stripe check, no auth. This needs fixing this week, not at "launch."
- **Angela, Experience:** The activation → dashboard handoff is still broken. A brand-new owner who just paid lands on a bare login screen with no way in — this is the exact "first-customer journey" gap flagged July 9, now confirmed by reading the code, not assumed.
- **Marcus, Web:** Sitemap and homepage-metadata gaps from July 9 are untouched. New shop pages ship with weaker metadata than every other tenant page.
- **Craig, Engineering:** All four July 9 P1s (comp-link secret, no security headers, no rate limiting, no CI/tests) are still open — zero movement in 11 days of otherwise heavy shipping.
- **Jony / Chris, Design & Mobile:** The July 16 catalog editor shipped two days before the mobile sheet-lock fix (July 18) and never got it — same keyboard/scroll bug the team already fixed once elsewhere, reintroduced in new code.
- **Phil, Growth:** Still zero analytics of any kind (confirmed: no tracking package in `package.json`, no tracking code anywhere in `src/`) — can't answer "is anyone visiting" today. See the separate proposal below.

---

## Urgent — don't wait for the full launch punch list

**Accept-estimate endpoint trusts client-asserted payment.**
`src/app/[slug]/api/accept-estimate/[id]/route.ts:151-196` — takes `{ paid: true }` directly from the request body on a public, unauthenticated route and immediately sets `payment_status: "paid"`, sends the business a "you got paid $X" email, and sends the customer a receipt. **No server-side Stripe confirmation happens at all.** Anyone who can guess or find an estimate ID can POST to this URL and convince a Found business owner they were paid when they weren't. Compare to the shop/online-order `complete` routes, which correctly call `stripe.paymentIntents.retrieve()` and check `status === "succeeded"` before marking anything paid — this route is the one place that pattern was skipped.

**Companion bug, same area:** `src/app/[slug]/api/pay-estimate/[id]/route.ts:61` tags remaining-balance payments `metadata.kind: "estimate_balance"`, but the webhook (`src/app/api/stripe/webhook/route.ts:199`) only ever matches `"estimate_deposit"`. A real, Stripe-confirmed balance payment currently has no server-side path to actually mark the estimate paid — it silently does nothing unless the (unsafe) client call above happens to fire.

Recommend: fix both together — verify the PaymentIntent server-side in `accept-estimate` the same way the shop/order routes do, and add the missing `estimate_balance` branch to the webhook. This is a scoped, well-understood fix, not a redesign.

---

## P0 Launch Blockers

1. **Payment trust bug above** — see "Urgent."
2. **Post-activation login is broken.** `src/app/onboarding/actions.ts:369-380` generates a Supabase magic link via `supabase.auth.admin.generateLink()` but never sends or uses it — the link is discarded. `src/app/dashboard/api/select-company/route.ts:28-36` requires an existing auth session, so a brand-new paying owner following the "site is live" flow is bounced to a bare `/login` screen and has to request access from scratch. This is the July 9 "prove the first-customer journey" P0, now confirmed broken by code, not just untested.
3. **"Automatic review requests" is sold, not built.** `src/app/plans/found-business/page.tsx:29,37` and `more/page.tsx:46,86` promise post-job review requests on the Business plan. No trigger, no email builder, no cron job exists anywhere for it (`review_collection` is defined in `featureAccess.ts` but never checked/used). Same unresolved claim flagged July 9.
4. **Sitemap still exposes test/comp businesses and omits Found's own pages.** `src/app/sitemap.ts:9-12` — no filter on `is_comp` (which already exists and is live), and the root marketing domain's own pages (`/`, `/plans`, `/privacy`, `/terms`) are still absent from any sitemap. Unchanged since July 9.
5. **New catalog editor has no mobile keyboard/scroll lock.** `src/components/dashboard/CatalogManager.tsx:516` — visually copies SiteEditor's bottom-sheet chrome but has none of the `visualViewport`/body-lock code SiteEditor got on July 18, two days *after* this shipped. On Shawn's iPhone: background scrolls behind the sheet, price/description fields can end up under the keyboard.

## P1 — Before Growth Traffic

Carried forward, still open (from July 9, re-verified July 20 — zero movement):
1. `?comp=<ADMIN_KEY>` is still a raw shared secret in a URL query param (`OnboardingFlow.tsx:1215`), not a scoped/expiring token.
2. No CSP, referrer, permissions, frame, or content-type headers anywhere (`next.config.ts`, `middleware.ts` checked — routing/auth only).
3. No rate limiting or bot controls on any public write route (onboarding, leads, checkout).
4. No automated tests, no CI — `package.json` has hand-rolled node scripts only; no `.github/workflows/`.
5. Homepage metadata is still bare (`layout.tsx:28-35` — no OG/Twitter/canonical), while every *customer* site now has full metadata — Found's own homepage is the worst-covered page in the app.
6. 3.3s forced CTA delay unchanged (`page.tsx:45-56`).
7. Priority hero images are still full-res PNGs (~1.7MB each), not WebP/AVIF (`page.tsx:66-81`).

New this pass:
8. Shop/online-order checkout has no webhook safety net — both use raw PaymentIntents, not Checkout Sessions, so the webhook's `checkout.session.completed`/`payment_intent.succeeded` branches never fire for them. Order completion depends entirely on the client calling `/complete` after payment; if the tab closes right after a successful charge, the order is stuck `pending` forever with the money already captured. (The `/complete` routes themselves are solid — proper verification and idempotency — this is a missing fallback, not a broken primary path.)
9. Shop pages (`[slug]/shop/page.tsx:9-15`) have weaker metadata (`{title}` only) than the rest of the tenant site, which otherwise inherits rich canonical/OG/Twitter/JSON-LD from the shared layout.
10. Checkout sheet on Shop/Online Order uses an older, cruder mobile keyboard-avoidance pattern than the one SiteEditor now uses — same bug class as item 5 above, in the one place actual money changes hands.
11. Resend still initialized at module scope in 3 files (`app/actions/leads.ts`, `app/actions/reply.ts`, `onboarding/actions.ts`) — the exact pattern that already broke the bookings route once.
12. "One catalog, three systems" is not real yet — Estimates, the new Shop/Menu catalog, and legacy online ordering are three separate data stores with no shared read path (confirmed: no `company_catalog` table exists; catalog data lives in each company's `website_config` JSON blob). Not a blocker, but marketing/sales copy should not imply price unification across estimates and shop.
13. `Stripe subscriber audit` (verify no Pro/Business subscribers were charged wrong price before the `activateActions.ts` fix) is still listed open in `TASKS.md` with no resolution noted — should be explicitly closed or deferred, not left ambiguous.
14. RLS policy state for `estimates`, `addon_subscriptions`, `leads`, and the catalog `website_config` fields can't be confirmed from source control — only 3 migration files (045-047) exist in the repo despite far more tables existing live. Needs a live Supabase check, not a code-review assumption.

## Passing Checks

- Webhook correctly tries all three signing secrets (platform / Connect sandbox / Connect live) and routes Connect vs. platform events distinctly.
- `getCompany()`'s admin "View As" override correctly requires both a cookie *and* a server-verified `admin_key` match — no cross-tenant leak found in normal (non-admin) company selection, which stays scoped to `user_id`/`email`.
- Shop/online-order `/complete` routes (as opposed to the checkout-creation routes above) verify the PaymentIntent server-side and are idempotent — the pattern exists in the codebase, it's just inconsistently applied.
- New catalog/shop code is a clean, shared module (`CatalogManager.tsx` drives both Menu and Products via a `mode` prop, no forked duplicate logic) and correctly imports the shared typography/color tokens — it's a design *lock-jump* bug (item 5), not a wholesale rebuild-outside-the-system problem.
- Shop's empty/not-ready state is handled well — branded "coming soon" fallback, no internal setup language leaks to customers, consistent with the existing pattern elsewhere in the app.
- Custom-domain vs. subdomain routing treats the new shop pages identically to every other tenant page — no special-casing gap.

## Launch Gate

No-go, same as July 9 — and one new item (the payment-trust bug) should be treated as urgent independent of the launch timeline, since it's live in production today regardless of whether Found is in open self-serve mode or controlled pilot.
