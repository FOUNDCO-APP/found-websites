# GoDaddy Domain Connect Proof Runbook

Last updated: 2026-08-16

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

## Test checklist

- [ ] Template passes Domain Connect editor/schema validation.
- [ ] GoDaddy accepts or can apply the Found template for a test domain.
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

## Namecheap stance

Namecheap remains manual until a no-password, no-token approval flow is proven.

Do not advertise Namecheap as automatic yet.
