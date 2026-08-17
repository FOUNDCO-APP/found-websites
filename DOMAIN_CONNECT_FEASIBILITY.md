# Domain Connect Feasibility Plan

Last updated: 2026-08-16

## Product goal

Make custom-domain setup feel like this for a small business owner:

1. Type the domain.
2. Found recognizes the registrar when possible.
3. Owner signs into the registrar.
4. Owner approves Found adding the DNS records.
5. Found verifies both `domain.com` and `www.domain.com`.

No registrar passwords. No developer-token instructions. No guessing whether root or `www` works.

## Team decision

Domain Connect is the preferred automation track. Manual DNS stays live as the fallback until the automated path proves itself end to end.

Rejected as the normal customer path:

- asking owners for registrar passwords;
- asking owners to create GoDaddy Personal Access Tokens;
- asking owners to enable/whitelist Namecheap API access;
- switching nameservers to Found/Vercel by default, because that can break existing business email.

## DNS records Found needs

Found's current Vercel/manual DNS records are the source of truth:

| Host | Type | Value |
| --- | --- | --- |
| `@` | `A` | `76.76.21.21` |
| `www` | `CNAME` | `cname.vercel-dns.com` |

The automated path must create the same records and then use the existing root + `www` verification logic.

## Feasibility proof scope

Internal/admin-only until proven.

1. Draft a Domain Connect service template for Found's website-hosting records.
2. Confirm whether GoDaddy will accept/apply the template for a real GoDaddy-owned test domain.
3. Build a guarded admin-only button: “Try automatic GoDaddy connection.”
4. Flow:
   - normalize domain;
   - register root + `www` with Vercel;
   - discover whether Domain Connect is available;
   - send owner/admin through registrar approval;
   - return to Found;
   - check root + `www` status using the existing domain-status logic.
5. If any step fails, keep the current manual DNS instructions visible.

## Open questions before customer launch

- Does GoDaddy require a template submission/approval before Found's service template can be used?
- Can Found use the synchronous one-time flow only, or does GoDaddy require an OAuth/asynchronous flow for this use case?
- What exact success/failure callback does GoDaddy provide after the owner approves?
- Can we make the UX work from mobile Safari cleanly?
- Does the flow preserve existing email/MX records untouched?
- Can Namecheap support a similar Domain Connect flow? If not, Namecheap remains manual.

## Acceptance criteria

Before this can be exposed to real customers:

- A test GoDaddy domain connects without manually editing DNS.
- Root domain verifies live.
- `www` verifies live.
- Existing email-related records are not modified.
- Failed/unsupported registrar path cleanly falls back to manual DNS instructions.
- The UI does not mention developer tokens, APIs, DNS jargon, or registrar passwords.

