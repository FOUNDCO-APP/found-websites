# Found Co. Launch Readiness Audit
**Date:** July 9, 2026
**Decision:** Not ready for an open self-serve launch. Ready only for a controlled pilot.

## Team Verdict

- **Steve, Product:** No open launch until the full customer path is proven.
- **Jony, Design:** The direction is Found, but launch quality requires faster, lighter interactions.
- **Phil, Growth:** No funnel analytics exist, and some paid-plan promises are unverified.
- **Angela, Experience:** Fresh onboarding-to-activation and real iPhone QA remain incomplete.
- **Craig, Engineering:** Build and health checks pass; automated tests, CI, and baseline security controls do not.
- **Priya, Data:** Live Stripe Connect webhooks and end-to-end payment state remain unproven.
- **Marcus, Web:** The sitemap exposes test/unready companies and omits Found's own pages.
- **Chris, Mobile:** A fresh device walkthrough remains a launch gate.

## P0 Launch Blockers

1. **Prove live payments.**
   Create the Stripe Connect webhook destination in live mode and verify Accept & Pay, pay later, receipts, owner email, dashboard state, and public paid state. Separate webhook secrets are supported at `src/app/api/stripe/webhook/route.ts:167`.

2. **Prove the first-customer journey.**
   Run a brand-new onboarding through plan choice, activation, publication, owner login, and first lead on a real iPhone.

3. **Stop indexing test businesses.**
   `src/app/sitemap.ts:12` includes every active company. The live sitemap exposes test-like subdomains such as `spamambo` and `landscaping`, while Found's own marketing and legal pages are omitted.

4. **Make plan promises match the product.**
   Business pricing promises automatic review requests and finished-job galleries at `src/app/plans/found-business/page.tsx:29` and `:32`. Remove or complete any feature that cannot be bought and used today.

## P1 Before Growth Traffic

1. Add funnel analytics and campaign attribution.
2. Add server-side rate limiting and bot controls to public write routes.
3. Replace `?comp=<ADMIN_KEY>` at `src/app/onboarding/OnboardingFlow.tsx:1215` with a short-lived signed or one-time token.
4. Add CSP, content-type, referrer, permissions, and frame-protection headers.
5. Add canonical, Open Graph, Twitter, and stronger homepage metadata; root metadata is currently only `FOUND` / `Get Found.` at `src/app/layout.tsx:28`.
6. Remove or shorten the 3.3-second CTA delay at `src/app/page.tsx:45`.
7. Optimize hero delivery. Both source images are priority-loaded at `src/app/page.tsx:67` and `:75` and total about 3.5 MB.
8. Add automated release tests for onboarding, login, lead capture, activation, and payments.

## Passing Checks

- `npm.cmd run build` passes TypeScript and all 89 generated pages.
- Production onboarding health reports required services and the company schema healthy.
- Homepage, plans, onboarding, privacy, terms, robots, sitemap, and favicon return HTTP 200.
- HSTS is enabled, and privacy and terms are published.

## Launch Gate

Steve's final approval is **no-go for open self-serve launch**. A small, manually supervised pilot may continue. Open launch requires all four P0 items, a clean iPhone journey, and one real end-to-end payment run.
