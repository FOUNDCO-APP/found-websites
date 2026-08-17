# GoDaddy Domain Connect Proof Runbook

Last updated: 2026-08-17

## Goal

Prove that a GoDaddy-owned domain can connect to Found without the owner manually editing DNS records.

This is internal/admin-only until the full proof passes.

## What must happen

1. Owner/admin enters a domain in Found.
2. Found registers both hostnames with Vercel:
   - `domain.com`
   - `www.domain.com`
3. GoDaddy shows an approval screen for Found's DNS changes.
4. Owner/admin approves.
5. GoDaddy adds only these website records:
   - `A @ 76.76.21.21`
   - `CNAME www cname.vercel-dns.com`
6. Found checks both root and `www`.
7. Found shows the domain as live only when both work.

## Test domain requirements

Use a disposable GoDaddy domain.

Do not use:

- Richard's MBJ domain;
- any client domain;
- any domain with important email already running, unless the test specifically confirms email records are untouched.

## Safety rules

- Do not ask for a GoDaddy password.
- Do not ask for a GoDaddy developer token.
- Do not store registrar credentials.
- Do not change nameservers.
- Do not change MX, SPF, DKIM, DMARC, TXT verification, or email records.

## Template under test

Local draft:

- `docs/domain-connect/foundco.app.website.json`

The draft must pass Domain Connect template validation/editor testing before any production UI is built.

## Manual fallback proof result

2026-08-17: Shawn tested `supershawn.me` in GoDaddy.

Result:

- Manual `A @ 76.76.21.21` worked.
- Manual `CNAME www cname.vercel-dns.com` worked.
- Found verified both root and `www`.
- The domain loaded through the Found Visit Site button after propagation.

This proves the fallback and verification system. It does not prove the automatic Domain Connect approval path.

## Internal probe result

2026-08-17: Shawn tested the internal-only Domain Connect probe from the Found admin/view-as domain screen.

Result:

- Domain Connect: not detected.
- Template: unavailable.
- Message shown: no Domain Connect provider record was found; use manual DNS.

Meaning:

- The admin-only probe is working and stays hidden from normal customer view.
- `supershawn.me` did not expose a Domain Connect provider record through the current discovery method.
- Manual DNS remains the only proven GoDaddy path today.
- Automatic setup remains a research/proof task, not a launch-ready customer feature.

## Official requirement check

2026-08-17: Team reviewed the official Domain Connect spec and public template-repository process.

Conclusion:

- Domain Connect works only when the DNS provider recognizes the service provider's template.
- Found's local template is necessary, but not enough by itself.
- A DNS provider can require public-template submission, private onboarding, a contract, or a fee before applying a template.
- Therefore, the current internal probe result is a valid stop sign: if no provider/template route is detected, the product must stay on manual DNS.

Team decision:

- Do not ship an automatic GoDaddy button to customers yet.
- Keep the probe internal/admin-only.
- Continue using manual DNS as the production-safe path.
- Next automation work is provider/template onboarding research, not more customer UI.

## Test checklist

- [x] Template passes Domain Connect editor/schema validation.
- [x] Manual GoDaddy fallback proof works on a fresh GoDaddy domain.
- [x] Internal-only probe can identify whether a domain exposes Domain Connect.
- [x] Internal-only probe correctly keeps unsupported domains on manual DNS.
- [x] Official requirement check completed: Found needs provider/template recognition before a one-click flow can work.
- [ ] Internal-only probe can identify whether the Found template is available/recognized.
- [ ] Found provider/template package is submitted, accepted, or otherwise recognized by GoDaddy/a supported DNS provider.
- [ ] GoDaddy accepts or can apply the Found template for a test domain without manual DNS edits.
- [ ] Found registers root with Vercel.
- [ ] Found registers `www` with Vercel.
- [ ] GoDaddy applies `A @ 76.76.21.21`.
- [ ] GoDaddy applies `CNAME www cname.vercel-dns.com`.
- [ ] Root domain loads the Found site.
- [ ] `www` domain loads the Found site.
- [ ] Found dashboard shows root as Live.
- [ ] Found dashboard shows `www` as Live.
- [ ] Existing email-related records remain untouched.
- [ ] If the flow fails, manual DNS instructions remain visible.

## Customer wording after proof

If GoDaddy proof passes:

> Connect with GoDaddy. Sign in, approve the setup, and Found will check when your site is live.

If registrar is not supported:

> This registrar still works, but needs manual DNS setup. Found will show exactly what to copy.

Current customer-safe wording before automatic proof:

> Connect your domain by adding two records where you bought it. Found checks both your main domain and www address, then tells you when the site is live.

## Namecheap stance

Namecheap remains manual until a no-password, no-token approval flow is proven.

Do not advertise Namecheap as automatic yet.
