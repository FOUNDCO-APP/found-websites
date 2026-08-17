# Domain Connect Feasibility Plan

Last updated: 2026-08-17

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

## Team execution plan

### Step 1 - Template draft

Craig and Marcus own the technical proof.

The draft template lives at:

- `docs/domain-connect/foundco.app.website.json`

Plain-English meaning: this is the DNS "recipe" that a supported registrar can apply after the domain owner approves it.

The template only creates the records Found already asks owners to add manually:

- root domain -> Found/Vercel;
- `www` -> Found/Vercel.

It must not touch MX, TXT, SPF, DKIM, DMARC, or other email-related records.

Per Domain Connect's current template quality guidance, the template must include `syncPubKeyDomain` unless Found intentionally uses an async-only flow. Found's first proof keeps the synchronous owner-approval path, so the draft sets `syncPubKeyDomain` to `foundco.app`. The template intentionally does not set `warnPhishing`; the official validator rejects using `warnPhishing` and `syncPubKeyDomain` together.

Validation status as of 2026-08-17:

- JSON syntax passes.
- Official Domain Connect `template.schema` validation passes with AJV in draft-07 mode and strict mode disabled for Domain Connect's custom `qt-*` schema keywords.
- Manual quality checks pass for the current proof:
  - includes `syncPubKeyDomain`;
  - does not combine `syncPubKeyDomain` with `warnPhishing`;
  - only adds the two website records Found already asks for manually;
  - does not include email/MX/TXT/SPF/DKIM/DMARC records.
- Not yet run: official Go-based Domain Connect linter, because Go is not installed in this workspace.
- Not yet proven: whether GoDaddy will accept/apply this template before Found submits or hosts it through the required Domain Connect provider process.

Manual GoDaddy fallback proof as of 2026-08-17:

- Shawn tested `supershawn.me` from GoDaddy.
- Found showed the correct manual records:
  - `A @ 76.76.21.21`;
  - `CNAME www cname.vercel-dns.com`.
- After Shawn added the records in GoDaddy and clicked the Found confirmation/check step, Found reported both root and `www` live and the Visit Site button loaded the site.
- Meaning: the current manual DNS fallback, Vercel project-domain registration, and root + `www` verification path are proven on a fresh GoDaddy domain.
- Not proven yet: automatic Domain Connect registrar approval. The next proof must connect a domain without manually editing DNS records.

Internal Domain Connect probe result as of 2026-08-17:

- Shawn removed/retested `supershawn.me` through the admin-only Found domain screen.
- The internal probe was visible only in admin/view-as mode, not regular customer mode. That is intentional.
- Probe result shown in Found:
  - Domain Connect: not detected.
  - Template: unavailable.
  - Message: no Domain Connect provider record was found; use manual DNS.
- Meaning: Found's detection guard works, and this domain/registrar path does not currently expose an automatic Domain Connect route through DNS discovery.
- Product implication: do not advertise automatic GoDaddy setup yet. Manual DNS remains the production-safe path while Domain Connect/provider requirements stay in research.

Official-source requirement check as of 2026-08-17:

- Domain Connect is template-based. Found cannot safely manufacture DNS changes directly from the browser; the DNS provider must recognize a Found service template and apply it after owner consent.
- The official spec says service templates are defined by the service provider and manually onboarded with the DNS provider, either through the public template repository or an out-of-band agreement between the service provider and DNS provider.
- The official spec also says DNS providers may be selective, may require a contractual relationship, or may charge a fee for onboarding a template.
- The official template repository requires template editor testing and a pull request using the required naming format `providerId.serviceId.json`.
- Product implication: the current probe result is not just a UI failure. Until GoDaddy/provider recognition exists for Found's template, Found cannot promise one-click GoDaddy setup. Manual DNS remains the shippable path.

### Step 2 - GoDaddy test domain

Use a disposable GoDaddy-owned test domain first, not a real client domain.

The manual DNS fallback has already passed with `supershawn.me`. Do not count that as the automatic proof. The automatic proof only passes if the registrar approval flow applies the DNS records without Shawn manually creating them in GoDaddy.

Automatic test goal, still unproven:

1. Add the test domain inside Found.
2. Register both root and `www` with Vercel.
3. Run the Domain Connect approval flow.
4. Confirm GoDaddy applies the two records.
5. Confirm Found reports:
   - root domain: Live;
   - `www` address: Live.

Internal-only probe, current status:

- [x] reports whether registrar exposes Domain Connect for this domain;
- [x] keeps manual DNS fallback visible when automatic setup is unavailable;
- [x] stays hidden from regular customer view;
- [ ] does not yet confirm Found's provider/service template is recognized;
- [ ] does not yet produce an automatic approval URL;
- [ ] does not yet apply DNS without manual edits.

Official requirement check, current status:

- [x] Confirmed Domain Connect requires provider/template recognition before DNS can be applied automatically.
- [x] Confirmed public-template submission has a formal PR/testing path.
- [x] Confirmed DNS providers can reject, gate, contract, or charge for template onboarding.
- [ ] Submit or otherwise onboard Found's `foundco.app.website` template with a DNS provider.
- [ ] Receive confirmation that GoDaddy can recognize and apply Found's template.

### Step 3 - Customer-facing copy

Angela and Phil's approved plain-English positioning:

> For easiest setup, use GoDaddy. Namecheap and other registrars still work, but may require manual DNS setup.

Do not promise one-click setup for Namecheap until it is proven.

### Step 4 - UI gate

The first UI must be admin/internal only:

- label: `Try automatic GoDaddy connection`;
- fallback: keep manual DNS visible;
- no customer launch until the GoDaddy test passes root + `www`.

### Step 5 - Launch rule

Steve's launch bar:

If the owner has to understand DNS records, the automated flow is not ready. If the automated path fails, the manual fallback must still be clear enough to finish the job.

## Open questions before customer launch

- Does GoDaddy require public-template PR acceptance, direct provider approval, or a separate partner/onboarding process before Found's service template can be used?
- What is the expected GoDaddy review timeline, if any?
- Can Found use the synchronous one-time flow only, or does GoDaddy require an OAuth/asynchronous flow for this use case?
- What exact success/failure callback does GoDaddy provide after the owner approves?
- Can we make the UX work from mobile Safari cleanly?
- Does the flow preserve existing email/MX records untouched?
- Can Namecheap support a similar Domain Connect flow? If not, Namecheap remains manual.

## Current registrar stance

- GoDaddy: manual DNS proven; automatic Domain Connect not proven and was not detected for `supershawn.me` through the current probe.
- Namecheap: supported manually for now; automation not promised.
- Cloudflare: technically strong, but not the recommended first-owner registrar because many local business owners do not know it.
- Other registrars: manual DNS fallback.

## Team next move

Steve/Craig/Marcus recommendation:

1. Do not add another customer-facing automation button yet.
2. Keep the internal probe as proof tooling only.
3. Prepare Found's Domain Connect provider package:
   - validated template;
   - plain explanation of the two records;
   - confirmation that email records are untouched;
   - return/callback URL plan;
   - mobile Safari approval-flow expectations.
4. In parallel, make the manual DNS flow strong enough for launch:
   - detect root and `www` separately;
   - keep GoDaddy and Namecheap direct DNS links;
   - state "replace existing record, do not duplicate";
   - provide a simple "send these instructions to my domain person" option in a future pass.

## Acceptance criteria

Before this can be exposed to real customers:

- A test GoDaddy domain connects without manually editing DNS.
- Root domain verifies live.
- `www` verifies live.
- Existing email-related records are not modified.
- Failed/unsupported registrar path cleanly falls back to manual DNS instructions.
- The UI does not mention developer tokens, APIs, DNS jargon, or registrar passwords.
