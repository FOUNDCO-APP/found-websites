# Found Domain Connect Provider Onboarding Package

Last updated: 2026-08-17

## Purpose

Found wants a no-password, no-developer-token domain connection flow for small business owners.

Desired customer experience:

1. Owner enters their domain in Found.
2. Found detects whether the DNS provider supports Domain Connect.
3. Owner signs into the DNS provider.
4. Owner approves Found adding website DNS records.
5. Found verifies both the root domain and `www`.

## Found service template

Local draft:

- `docs/domain-connect/foundco.app.website.json`

Expected public/provider template name:

- `foundco.app.website.json`

Template purpose:

- connect a business domain to a Found-hosted website.

Records requested:

| Host | Type | Value | Purpose |
| --- | --- | --- | --- |
| `@` | `A` | `76.76.21.21` | root domain points to Found/Vercel |
| `www` | `CNAME` | `cname.vercel-dns.com` | `www` address points to Found/Vercel |

## Safety boundaries

Found must not request or modify:

- nameservers;
- MX records;
- SPF records;
- DKIM records;
- DMARC records;
- unrelated TXT verification records;
- customer registrar passwords;
- customer developer tokens;
- broad DNS/account credentials.

## Customer-facing launch rule

Do not show automatic DNS setup to normal customers until all of this is true:

- provider recognizes Found's template;
- approval URL works from mobile Safari;
- provider applies both records;
- Found verifies root as live;
- Found verifies `www` as live;
- unsupported providers fall back to manual DNS without confusion;
- email records are untouched.

## Current status

Proven:

- manual GoDaddy DNS setup works;
- Found shows the correct root + `www` records;
- Found verifies both hostnames;
- the admin-only Domain Connect probe stays hidden from customers;
- the probe correctly falls back when provider/template discovery is unavailable.

Not proven:

- GoDaddy recognizes Found's template;
- GoDaddy can apply the template without manual DNS edits;
- Namecheap supports a comparable owner-consent flow;
- production callback/return behavior.

## Provider outreach email draft

Subject: Domain Connect template request for Found website hosting

Hello GoDaddy Domain Connect team,

Found is a website and business-management platform for small business owners. We would like to onboard a Domain Connect service template so GoDaddy customers can connect their domains to Found without manually editing DNS records.

The template connects only website records:

- A record for `@` pointing to `76.76.21.21`
- CNAME record for `www` pointing to `cname.vercel-dns.com`

The template does not modify nameservers, MX, SPF, DKIM, DMARC, TXT verification, or other email-related records.

Template draft name:

- `foundco.app.website.json`

Service:

- Provider ID: `foundco.app`
- Provider name: `Found`
- Service ID: `website`
- Service name: `Found Website`

Could you confirm the correct onboarding path for GoDaddy to recognize and apply this template through Domain Connect?

Specifically, we need to confirm:

1. whether GoDaddy requires public template-repository PR approval, direct partner approval, or another onboarding path;
2. whether the synchronous owner-consent flow is supported for this use case;
3. the correct approval URL/callback requirements;
4. whether there are any provider-specific requirements before testing with a GoDaddy-owned domain.

Thank you,

Found Co.

## Internal next steps

1. Confirm whether `providerId: foundco.app` is acceptable or whether Domain Connect requires a different provider identifier format.
2. Run the official Domain Connect Go linter when Go is available.
3. Test the approval URL only after provider/template recognition is confirmed.
4. Keep manual DNS as the production path until the automatic test passes end to end.
