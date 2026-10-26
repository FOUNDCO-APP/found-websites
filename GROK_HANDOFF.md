# Grok Handoff — Found Co.
*Prepared October 3, 2026 for Shawn Lopez*

**October 25 update:** Follow `BRIEF.md`, then `SESSION_HANDOFF.md` for live state, pending
approvals and plan of attack. This older introduction is background context,
not the current deployment or authorization record. Follow the visible team
discussion and Shawn-approval process in `AGENTS.md`.

This document is the fast-start briefing for bringing Grok into Found Co. work. It should be read together with:

1. `BRIEF.md`
2. `SESSION_HANDOFF.md`
3. `TASKS.md`
4. `CHANGELOG.md`
5. `AGENTS.md`
6. `PROJECT.md`
7. `PRODUCT_BRIEF.md`
8. `DECISIONS.md`
9. `DESIGN_DECISIONS.md`
10. `docs/social-media-content-brief.md`

If anything here conflicts with the repo docs, treat the repo docs as the source of truth.

---

## Who Shawn Is

Shawn Lopez owns Say It Marketing in Tucson, Arizona. He has been in business since 1999 doing web design, branding, SEO, hosting, social media, and print brokerage.

He works fast, often from an iPhone, often by voice-to-text, while multitasking. He wants direct answers, practical tradeoffs, and copy/paste-ready output. He does not want vague encouragement, generic strategy, or AI guessing. If something is a product, design, pricing, process, architecture, or data decision, bring it to the team first.

Shawn values:

- clear plain-English explanations;
- blunt practical recommendations;
- no wasted money;
- no overbuilding;
- mobile-first thinking;
- preserving context across Codex, Claude Code, Grok, and future AIs.

---

## How Found Uses AI

Found has been built mostly by Shawn working with Codex and Claude Code. A third AI, Grok, is being added as another pair of eyes, especially for strategy, audits, troubleshooting, copy, launch thinking, and possibly second-opinion product review.

Do not assume Grok is replacing Codex or Claude Code. Treat this as a team handoff. Grok should avoid repeating old paths and should read the saved docs before making recommendations.

The key working rule:

**No AI makes major decisions alone.**

For product/design/process/pricing/copy/data/architecture decisions, run the Found team meeting pattern:

1. Let the right lead speak first.
2. Let the rest of the team add concerns.
3. Summarize the recommended direction.
4. Wait for Shawn's approval.
5. Only then implement.

Do not act first and explain later.

---

## The Found Team

Found uses an internal decision team modeled after Apple-style product discipline:

- **Steve Jobs — Product Lead / Final Approval**
  - Keeps the product simple.
  - Kills confusing, ugly, or unnecessary ideas.
  - Asks: would a small business owner understand this in 5 seconds?

- **Jony Ive — Design Lead**
  - Owns visual quality, spacing, typography, restraint, and removing clutter.
  - Every screen should feel inevitable.

- **Angela Ahrendts — Customer Experience**
  - Owns onboarding, first 10 minutes, empty/error states, owner confidence, and plain-language flows.

- **Craig Federighi — Engineering**
  - Owns architecture, performance, Next.js/PWA quality, technical debt, and deployment pipeline.

- **Priya Nair — Backend/Data**
  - Owns Supabase, RLS, schema, storage, billing data, tenant isolation, and data safety.

- **Marcus Webb — Website/Integration**
  - Owns multi-tenant routing, website template rendering, custom domains, and photo/gallery sync.

- **Chris Lattner — iOS/PWA**
  - Owns mobile, PWA, offline, App Store/Capacitor, and iOS quirks.

- **Phil Schiller — Marketing/Growth**
  - Owns positioning, pricing copy, App Store listing, promotions, and growth.

Shawn may approve, reject, or modify the team's recommendation. A timeout is not consent.

---

## What Found Is

Found Co. is a mobile-first SaaS product for small business owners.

The one-line pitch:

**Answer a few questions. See your website. Get found online from your phone.**

Found is not meant to be another Wix, Squarespace, GoDaddy Website Builder, or drag-and-drop editor. The owner does not design a website. They answer business questions, Found generates the website, and they manage the business from their phone.

Core promise:

- Owner answers onboarding questions.
- Found generates a professional website automatically.
- Owner can capture job/business photos inside the app.
- Photos can be organized by job/project.
- Photos can be used for website/gallery/social.
- Leads, estimates, contacts, billing, team access, domains, and marketing tools connect into one small-business operating system.

Shawn's mission statement:

**Every small business owner deserves to look as big as Apple online.**

---

## The Problem Found Solves

Small businesses have the same recurring problems:

1. Their website is embarrassing, outdated, or does not exist.
2. Wix/Squarespace still make them become designer, writer, and web developer.
3. Job photos are trapped in personal camera rolls.
4. Social media never happens because the owner is tired and busy.
5. Leads, estimates, follow-up, domains, payments, and customer info are scattered across tools.

CompanyCam helps with photos but not the website or lead path. Wix/Squarespace help with websites but not the job-site workflow. GoHighLevel is too heavy. Found's gap is: professional presence + job photos + customer action tools in one mobile-first app.

---

## Current Product Shape

### Public Marketing Site

Domain: `foundco.app`

Key pages:

- `/`
- `/plans`
- `/compare`
- `/how-it-works`
- `/industries`
- individual industry pages

Current promo:

- Intro-rate promotion currently ends **October 15, 2026**.
- Code commit: `070f944 Extend intro rate deadline to October 15`.
- Live check on October 3, 2026 confirmed production serves release `070f944` and shows October 15, not September 15.

### Tenant Websites

Found is multi-tenant. One Next.js app powers many business sites:

- `[slug].foundco.app`
- custom domains such as `barriobuilders.com`, `divineremodelaz.com`, `mbjheatingandcooling.com`, `rcbicycles.com`

Tenant websites support:

- Home
- About
- Services
- Gallery
- Contact
- Estimate/request forms
- Booking/order/menu/shop variations depending on industry/features
- site icons/favicons per business
- custom domains

### Owner Dashboard

Dashboard supports:

- Home
- Leads
- Contacts
- Photos
- Jobs/projects
- Site editor
- Estimates
- Schedule/booking tools
- Team/member access
- Plan & Billing
- More/Manage hub
- business info
- domain setup
- logo/site icon editing

### Found HQ Admin

Admin side supports:

- Today / operational signals
- clients/businesses
- client detail command center
- emails / review states
- growth / traffic report
- test center
- photo curation
- copy review
- billing and Stripe-related checks
- View As client

---

## Current Pricing / Promo Reality

Found's public plan structure has evolved from older brief pricing. Always verify against live code and `/plans`.

Recent known public plan labels:

- Found Starter
- Found Pro
- Found Business

The intro-rate system is app-side copy/gating in `src/lib/introRate.ts`.

Stripe promo codes are separate live billing objects. Do not confuse the public October 15 deadline with Stripe promotion codes.

Known promo-code facts from the repo:

- Found already validates any active Stripe promotion code during activation/upgrade.
- Existing code-managed Stripe constants:
  - `F0UND1128` — Found Starter $1 first invoice
  - `F0UND1168` — Found Business $1 first invoice
- Internal headstart codes:
  - `F0UND1115`
  - `F0UND1130`
- Do not create/change live Stripe codes without Shawn approving:
  - exact code text;
  - discount behavior;
  - plan scope;
  - max redemptions;
  - whether old codes stay active or are disabled.

---

## Tech Stack

Repo:

- Local path: `C:\Users\SuperShawn\Documents\GitHub\found-websites`
- GitHub: `github.com/FOUNDCO-APP/found-websites`
- Hosting: Vercel

Stack:

- Next.js 16
- TypeScript
- Tailwind CSS
- Supabase Auth/Database/Storage
- Stripe
- Resend
- Vercel
- PWA now; Capacitor/App Store path later

Supabase project:

- `mmctzloztgkbqvofmkou.supabase.co`

Important tables/concepts:

- `companies`
- `website_config`
- `profiles`
- `projects`
- `media`
- `leads`
- `contacts`
- estimates/invoices/payments/subscriptions-related tables
- `site_visits` and attribution columns for Traffic Report

Important buckets:

- `media`
- `logos`
- `assets`
- `config`

---

## Major Timeline

### May 2026

- Found project established as a Vercel-hosted Next.js/Supabase app.
- Core idea locked: small-business websites generated from onboarding, mobile-first, Apple-quality.
- Multi-tenant routing established.

### June 2026

- Product architecture expanded:
  - industry taxonomy;
  - website jobs;
  - sub-industry vocabulary;
  - fallback copy rules;
  - Claude-generated copy during onboarding with silent fallback;
  - curated photo pools.
- Dashboard work matured:
  - Leads;
  - Contacts;
  - Site editor;
  - Photos;
  - billing/activation pieces.

### July 2026

- Launch readiness work.
- Stripe billing and activation flow matured.
- Promo-code validation added.
- Found HQ/operator tools started.
- Domain connection issues surfaced and were corrected.
- Decision: GO for open self-serve launch after P0 blockers fixed.
- Major product rules locked:
  - Found owns billing experience, Stripe is processor.
  - Intake vocabulary is separate from estimate documents.
  - More/Manage grouped structure borrows from Wix breadth but not Wix design.
  - Admin View As and comp activation paths exist.

### August 2026

- Found HQ admin operating system expanded:
  - Today;
  - Growth;
  - Clients;
  - Emails;
  - Client Health;
  - Test Center;
  - outreach memory and test sends.
- Owner dashboard Manage/Billing refined.
- Job/project albums made private by default.
- Worker/team access security tightened after Shawn found worker-role leakage.
- Guided job notes / estimate notes improved.
- Customer site icon/favicons went through many rounds and were root-caused:
  - iOS Safari could not decode PNG-in-ICO;
  - fixed with real BMP ICO generation, tenant-domain icon routes, version hashes, and no-store for unversioned icon paths.
- Growth audit and Traffic Report Phase 1 shipped:
  - channel bucketing;
  - UTM builder;
  - root-site visit tracking;
  - Found HQ traffic view.

### September 2026

- Intro-rate deadline moved to September 15.
- Found social media system documented.
- Metricool chosen as scheduler.
- Week 1 social strategy drafted.
- Shawn approved video with guidance, paid ads, 3-7 posts/day range, and Codex -> Shawn redline -> Metricool workflow.
- Magic-link send failure fixed in code so email delivery failure does not falsely report success.
- Promo deadline later moved to October 15.
- Apple Developer Program prep started.

### October 2026

- Shawn is evaluating business phone/VoIP setup and Apple Developer Program steps.
- Shawn wants to bring Grok in as a third AI collaborator with full context.

---

## Current Open Items

Read `TASKS.md` for full current list. Important open items as of this handoff:

1. **Stripe promo-code decision**
   - Need exact approved billing behavior before changing live Stripe promo codes.

2. **Apple Developer Program**
   - Choose Individual vs Organization enrollment.
   - Confirm Apple ID with two-factor authentication.
   - Check D-U-N-S Number if enrolling as organization.
   - Pay Apple Developer Program fee.
   - Prepare App Store Connect listing material.

3. **Magic link live QA**
   - Code fix exists for send failure visibility.
   - Still needs live deploy/QA depending on current production state.

4. **Found social media**
   - Metricool chosen.
   - Need continued asset production.
   - Shawn on-camera decision still open.

5. **Traffic Report**
   - Phase 1 code exists.
   - Supabase migration may still need applying if not already done.
   - Needs QA with real root-site visit/sign-up flow.

6. **Favicons**
   - Servers were verified correct.
   - Shawn's own Apple devices may still show stale cached icons.
   - Future Jony item: simplified small favicon marks for better 16-32px readability.

7. **Admin / owner QA**
   - Several flows have been fixed but rely on Shawn QA on real devices:
     - View As;
     - plan/billing;
     - estimates;
     - jobs/gallery privacy;
     - worker dashboard restrictions.

---

## Current Known Dirty Worktree Warning

Before this Grok handoff was created, `git status` showed existing uncommitted changes:

```text
 M CHANGELOG.md
 M SESSION_HANDOFF.md
 M TASKS.md
 M src/app/dashboard/api/send-login/route.ts
 M src/lib/dashboard/typography.ts
?? .claude/
?? .tmp-edge-card-shot/
?? found-business-card-concept.html
?? found-business-card-preview.png
```

These should not be reverted casually. They may be intentional prior work from Codex/Claude/Shawn. Always inspect before staging, committing, or changing related files.

---

## How Grok Should Help

Good uses for Grok:

- second-opinion product audits;
- launch readiness critique;
- marketing positioning review;
- pricing/promo thinking;
- social/content ideas after reading `docs/social-media-content-brief.md`;
- App Store listing review;
- onboarding clarity review;
- customer journey friction spotting;
- competitor comparison;
- bug triage from screenshots;
- fresh eyes on confusing flows.

Bad uses for Grok unless Shawn explicitly approves:

- making product decisions alone;
- rewriting the product direction without reading decisions;
- changing pricing unilaterally;
- suggesting enterprise/CRM bloat;
- pushing Found toward Wix/Squarespace builder language;
- ignoring mobile-first reality;
- assuming technical correctness without checking repo/docs;
- telling Shawn to start over.

---

## Voice and Positioning

Found should not sound like:

- "AI website builder";
- "drag and drop";
- "all-in-one CRM";
- "marketing automation platform";
- "GoHighLevel for small businesses";
- "build your website yourself."

Found should sound like:

- "Your business, ready online from your phone."
- "Found helps customers find, trust, and choose you."
- "Answer questions. See your site. Get found."
- "Take the photo once; use it on your site and social."
- "Built for owners doing real work, not sitting at a desk."

The emotional promise:

**The owner feels proud when they see their business online.**

The practical promise:

**The owner gets calls, messages, estimates, bookings, orders, and leads without becoming a web designer.**

---

## App Store Direction

Found is currently a PWA/web app. The App Store path is intended through Capacitor later.

Before App Store submission, Found needs:

- Apple Developer Program membership;
- account type decision: Individual vs Organization;
- app name;
- app icon;
- screenshots;
- support URL;
- privacy policy URL;
- demo/test login;
- age rating;
- privacy answers;
- review notes;
- stable core flows on mobile.

Organization enrollment is likely better long term so the seller name is Found Co. rather than Shawn personally, but that requires proper company verification and likely D-U-N-S.

---

## Current Launch Readiness Read

Found is already live in the sense that it has real deployed product paths, real customer/client sites, Stripe activation, dashboard tools, and a marketing site.

It is not "done." Shawn is not completely satisfied, and there are rough edges. But the platform is likely in an early launch-ready state if handled honestly:

- sell carefully;
- avoid overpromising;
- use intro promo urgency through October 15;
- keep onboarding and support hands-on;
- use real customer feedback to prioritize;
- do not add complexity just to feel more complete.

Steve's likely read: launch is not about perfection; it is about whether a real owner can understand it, pay, get online, and get value.

Craig/Priya's likely warning: do not scale paid promotion faster than support, billing, auth, domains, and dashboard QA can carry.

Phil's likely angle: Found should sell relief and action, not "website builder features."

Angela's likely angle: the first 10 minutes must feel calm, guided, and trustworthy.

Jony's likely angle: remove anything that feels like generic SaaS clutter.

---

## First Assignment for Grok

Historical optional audit prompt, not an instruction to restart completed work:

> Read `BRIEF.md`, `SESSION_HANDOFF.md`, `GROK_HANDOFF.md`, `TASKS.md`, `PROJECT.md`, `PRODUCT_BRIEF.md`, `DECISIONS.md`, and `docs/social-media-content-brief.md`. If Shawn requests a fresh audit, distinguish verified current outcomes from historical findings, team recommendations and implementation approvals.

That will let Shawn compare Grok's fresh-eye read against Codex and Claude Code without losing context.
