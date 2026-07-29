# Found Co. Launch Readiness Audit — July 29, 2026
**Supersedes:** `LAUNCH_READINESS_AUDIT_2026-07-20.md`.
**Decision:** GO. Open self-serve launch is approved.

---

## Why This Audit Exists

The July 20 audit's verdict ("no-go, same as July 9") was written *before* that same day's P0 fixes landed. No one ever went back and recorded an updated verdict once those fixes shipped — the punch-list work kept moving (comp-link secret, CI, Shop/Services search, AI rewrite disclosure, field validation, CTA picker, photo resize) through July 28, but the launch gate itself stayed stuck on a stale "no-go" in writing. This entry closes that gap.

---

## P0 Launch Blockers from July 20 — Status

1. **Payment trust bug** — FIXED July 20. `accept-estimate` now requires and server-verifies the real Stripe PaymentIntent before marking anything paid; the webhook also handles `estimate_balance`, closing the companion bug in the same area.
2. **Post-activation login broken** — FIXED July 20. `confirmActivation` generates a real sign-in link; a brand-new paying owner lands signed in on `/api/select-company`, not a bare `/login` screen.
3. **"Automatic review requests" sold, not built** — FIXED July 20. Changed to "coming soon" everywhere it appeared instead of building the feature, per Shawn.
4. **Sitemap exposed test/comp businesses** — FIXED July 20. Per-business `is_test` toggle added; 36 of 37 companies (Shawn's own practice accounts) excluded and `noindex`ed. Found's own marketing pages added to the sitemap.
5. **Catalog editor mobile keyboard/scroll-lock bug** — FIXED July 20. Ported SiteEditor's `visualViewport`/body-lock fix into `CatalogManager.tsx`.

**All five confirmed closed.** No open P0s.

---

## P1 Items — Before Growth Traffic

Of the 14 P1s carried from July 9/July 20, 9 are shipped: rate limiting (July 21), homepage SEO metadata, homepage CTA delay, shop page metadata, shop/order checkout mobile keyboard fix, Resend module-level init cleanup, comp-link secret decoupled from `ADMIN_KEY` (July 28), CI build check running on every push (July 28, confirmed green), Shop/Services search + category collapse (July 28).

**Still open — none of these block launch:**
- No CSP/security headers. Deliberately deferred: an earlier attempt caused an iPhone Safari Stripe checkout `inner.html` download prompt and was rolled back same day. Root cause was later found to be unrelated (eager Stripe.js prefetch, since fixed) — but this area is flagged high-risk, low-and-slow, real-device-tested whenever it's revisited.
- No automated test suite (CI checks that the build compiles, not real tests).
- Hero images are full-res PNG, not WebP/AVIF (page-speed only).
- Shop/online-order checkout has no webhook fallback if the customer's tab closes right after a successful payment. The primary `/complete` path is solid and idempotent; this is a missing safety net for a rare edge case, not a broken payment path.
- Stripe subscriber price audit not run (read-only verification, no known incidents).
- RLS policy state for `estimates`/`addon_subscriptions`/`leads`/catalog fields not confirmed from source control (needs a live Supabase check, not urgent).

---

## Team Verdict

- **Steve, Product:** Both promises that were the actual blockers — the fake review-requests feature and the "trust the client's word on payment" bug — are gone. Nothing left standing that a paying customer would notice and feel misled by. Go.
- **Priya, Data:** The payment-trust fix is the one I'd have held launch for, and it's done and webhook-covered on both deposit and balance payments. RLS verification is real housekeeping, not a launch risk — Found's tenant isolation was never the thing in question.
- **Angela, Experience:** First-customer journey (signup → paid → landed in their own dashboard, signed in) is fixed and has since been walked end-to-end by Shawn with real test businesses across shop, restaurant, and estimate flows.
- **Craig, Engineering:** Rate limiting, CI, and the mobile keyboard bug class are done. Security headers stay off by design until they can be tested on a real device without touching Stripe's checkout path — that's a considered decision, not neglect.
- **Marcus, Web:** Sitemap and metadata gaps are closed. Every tenant page and Found's own marketing pages are covered now.
- **Phil, Growth:** Vercel Analytics is live on the marketing site. Full funnel attribution (PostHog) is still backlog, but that's a growth optimization, not a launch gate.

---

## Launch Gate

**GO for open self-serve launch**, approved 2026-07-29. Shawn confirmed the "3 pending clients" question that was the other open item on this list was resolved separately (Edit My Site design, now shipped) — no remaining blocker on that front either.

Remaining P1 items above stay on the backlog as real, tracked hardening work — not conditions for going live.
