**[2026-07-06] - Found will borrow Wix's grouped Manage structure, not Wix's admin design.**
Approved by: Shawn + Steve Jobs + Jony Ive + Angela Ahrendts + Craig Federighi + Priya Nair + Marcus Webb + Chris Lattner + Phil Schiller
Why: Wix shows useful breadth and grouped access to business tools, but the design feels like generic software. Found's Dock stays for daily work; More becomes an owner-focused operating map grouped by Website, Get Paid, Customers, Work & Schedule, Marketing, Insights, and Settings. See `WIX_COMPETITOR_REVIEW.md` and `MORE_MANAGE_IA_AUDIT.md`.

**[2026-07-06] - Quote-first intake is called Estimate Requests; priced documents remain Estimates.**
Approved by: Shawn + Steve Jobs + Jony Ive + Craig Federighi
Why: A customer asking for pricing is not the same object as a priced estimate document. Quote-first businesses need an intake queue for requests and a separate estimate workflow for line items, approval, deposits, payment links, invoices, and receipts. The owner path is: Estimate Request -> Create Estimate -> Send/Accept/Pay.
## Decision: Intake vocabulary and estimate workflow are separate systems
**Date:** July 5, 2026
**Status:** Locked principle before industry vocabulary audit
**Owner:** Steve leads; Jony, Angela, Craig, Priya, Marcus review

Shawn clarified that `Estimates` / `Quotes` are not the same thing as `Leads`, `Inquiries`, `Quote Requests`, `Bookings`, `Reservations`, `Orders`, or `Appointments`.

### Source-of-truth distinction
- `industry_category` and `sub_industry` describe what kind of business this is. Do not infer workflow from the business name or slug.
- `primary_intent` and `secondary_intent` describe the public website CTA, such as `quote`, `book`, `reserve`, `shop`, `contact`, `call`, or `visit`.
- `form_intent` / dashboard intake vocabulary describes what incoming customer activity is called inside Found.
- Paid tools/add-ons decide what workflows are available, such as `quote_payments`, `reservation_calendar`, `online_ordering`, `shopping_cart`, and `email_marketing`.

### Vocabulary meanings
- `Leads`: sales opportunities where the owner needs to follow up and convert the customer.
- `Inquiries`: general questions or info requests where the customer is not necessarily ready to buy/book yet.
- `Bookings`: requests to reserve a service, session, performer, provider, class, or appointment-style time.
- `Reservations`: restaurant/time-slot requests, primarily food/venue-style time holding.
- `Orders`: product, food, menu, cart, or purchase requests.
- `Appointments`: healthcare/professional scheduled visits where the expected mental model is a formal appointment.
- `Estimates` / `Quotes`: priced work documents with line items, totals, approval, deposits, payment links, invoices, and receipts. This is a separate tool/workflow, not just a label for intake.

### Product rule
A business can need both an intake pathway and an estimate pathway. Example: a balloon decor business may receive a lead, booking request, or quote request first, then send an estimate/quote with deposit payment. The dashboard must not collapse these into one tab or one data concept.

### Current repo conflict found
- `src/lib/industryManifests.ts` says the Events industry has `primaryIntent: "quote"` and includes sub-industries like `balloon decor` and `balloon garland`.
- `src/lib/featureAccess.ts` says `quote_payments` is relevant to `events`.
- `src/lib/dashboard/typography.ts` currently maps `events`, `event_planning`, and `balloon_decor` to dashboard `"inquiry"` language.

This does not mean the business name "Blue Luna Events" should drive the label. It means the industry/sub-industry vocabulary and tool routing need an audit so each business type gets the right intake label and the right separate tools. See `INDUSTRY_WORKFLOW_AUDIT.md` for the current team audit matrix.

---
# DECISIONS.md — Found Co. Product Decisions
### Every approved product decision lives here. Written the moment it's decided. Never deleted.
### New AI: read this before suggesting anything. These are locked unless Steve reopens them.

---

## How to use this file

- One entry per decision
- Format: **[Date] — [Decision] — Approved by: [Name]**
- Reason: one line explaining why
- Never delete entries — mark as REVISED if changed, add new entry below

---

**[2026-07-03] - Found's product app has one typeface: Inter. No per-page font drift, ever.**
Approved by: Shawn + Steve Jobs + Jony Ive
Why: `globals.css` had dead `create-next-app` boilerplate — a hardcoded `body { font-family: Arial, Helvetica, sans-serif }` and a `--font-sans` token pointed at an unloaded Geist font — silently overriding the real Inter font loaded in the root layout, sitewide. This is why the app read as inconsistent and "cheap" across pages, not just on the wordmark (which had independently drifted to hardcoded Arial in 12 places). Fixed at the root — one shared `FoundWordmark` component, dead CSS rules removed — instead of patching individual occurrences. Any new UI must inherit the body font; do not set a competing `fontFamily` unless it's an intentional per-client-website typography choice (see the industry font palette used on generated `/[slug]` sites, which is separate from the Found product chrome).

**[2026-07-02] - Estimator builder is a full-screen mobile work tool, not a database form.**
Approved by: Shawn + Steve Jobs + Jony Ive + Angela Ahrendts + Craig Federighi
Why: Business owners are trying to capture a customer decision on a job site. The builder must hide app chrome, guide the owner through Customer -> Job -> Work -> Price -> Review, and make work entry feel natural. Spreadsheet-like line-item entry is rejected for the primary mobile flow.

**[2026-07-02] - Customers never see owner payment setup problems.**
Approved by: Shawn + Steve Jobs + Angela Ahrendts + Priya Nair
Why: If Stripe/payment setup is missing, the public estimate still presents a clean accept path. Setup friction belongs in the owner dashboard, never on the customer's decision page.

## CONTENT ARCHITECTURE DECISIONS (APPROVED — June 10, 2026)

**[2026-06-10] — Website Job Framework: every Found industry has one primary website job.**
Approved by: Shawn + Steve Jobs + Jony Ive
The 7 jobs: Book me / Hire me / Quote me / Visit me / Order from me / Trust me / Find me.
Why: The website job determines layout, CTA, sections, copy tone, and onboarding questions. Two businesses in the same industry can have different jobs (food truck = Visit me, home baker = Order from me).

**[2026-06-10] — Found industry taxonomy expanded from 12 to 22 industries.**
Approved by: Shawn + Steve Jobs + Jony Ive
Full 22-industry list:
Tier 1 (already built): Home Services, Food, Beauty, Wellness, Fitness, Events, Retail, Cleaning, Landscaping, Automotive, Pet Services, Real Estate
Tier 2 — build now (4 priority): Creative Services, Home-Based Food, Education & Instruction, Music & Performance
Tier 2 — next sprint: Professional Services, Healthcare, Childcare & Family, Makers & Crafts
Tier 3 — later: Home & Property Specialists, Nonprofit & Community
Why: Found is for ALL small businesses. A musician, a home tortilla maker, a private tutor, a graphic designer — they all have the same problem. Found solves it for every one of them.

**[2026-06-10] — Sub-industry vocabulary table is the core of the copy architecture.**
Approved by: Shawn + Steve Jobs + Jony Ive + Craig Federighi
One entry per sub-industry (~120 rows). Each defines: appointmentWord, customerWord, workWord, galleryLabel, servicesLabel, aboutLabel, reviewsLabel, ctaVerb.
Examples: barber → {cut, client, fresh cuts, Fresh Cuts, Services & Pricing, About the Shop, What Clients Say, Book your cut}. food truck → {order, customer, food, The Food, What's Good, The Truck, What People Say, Place an order}.
Used everywhere: layout section labels, CTA buttons, nav links, Angela's affirmations, Claude prompt vocabulary. Write once, works everywhere.
Why: Structural copy (labels, buttons, nav) can be cross-referenced with vocabulary swaps. Emotional copy (hero subtitle, about text) cannot — that requires Claude or smart templates.

**[2026-06-10] — Fallback copy uses 7 job-family templates + vocabulary table. NOT 120 static entries.**
Approved by: Shawn + Steve Jobs + Angela Ahrendts + Craig Federighi
One template per website job. The vocabulary table makes each render sub-industry specific.
Why: 7 maintainable templates beat 120 static entries. If we update one template, it improves every industry in that job family. The static library would be expensive to write, expensive to maintain, and stale within months.

**[2026-06-10] — Claude API failure at onboarding is completely silent. Owner never sees an error.**
Approved by: Shawn + Steve Jobs + Craig Federighi
If Claude fails (outage, expired card, rate limit, bad response) → fallback templates run automatically → site still generates → owner sees the reveal screen → site goes live. No error state.
Why: The owner's experience cannot depend on a third-party API being healthy. Degrade gracefully, fix later, never show a broken state.

**[2026-06-10] — `copy_generated` flag added to website_config. Admin can see + fix fallback sites.**
Approved by: Shawn + Steve Jobs + Craig Federighi + Priya Nair
When fallback runs: `website_config.copy_generated = false`. Shawn's admin panel shows which sites used fallback. One-button Claude regeneration per site replaces fallback copy with custom copy after API is restored.
Why: Shawn's real concern — "what if my credit card expires?" This flag means nothing is lost. Every affected site gets upgraded the moment the API is back.

**[2026-06-10] — Photo wiring bug fixed. Homepage now uses getStockImages() — curated pools first.**
Approved by: Shawn + Craig Federighi + Marcus Webb
`[slug]/page.tsx` was calling Pexels directly, bypassing the curated industry photo pools entirely. Fixed: now calls `getStockImages(company)` which routes through curated pools → Pexels → gradient in correct priority. All 250+ curated photos are now actually used.
Why: We spent hours curating photo pools. They were being ignored by a direct Pexels call in the homepage.

**[2026-06-10] — Industry default copy approved at industry level (not sub-industry level) as a baseline.**
Approved by: Shawn + Angela Ahrendts + Jony Ive
12-industry baseline copy approved. Each industry has: heroSubtitle, aboutText template, ctaHeadline. Sub-industry vocabulary table makes these feel specific when rendered. Claude call at onboarding replaces all of this with truly custom copy 95%+ of the time.
The 12 industry baselines:
- Home Services: "Licensed, local, and honest. We show up, do the work, and back it up." / CTA: "Let's get started."
- Food: "Come hungry. Leave happy. Made fresh, right here in {city}." / CTA: "Come find us."
- Wellness: "A calm space to take care of yourself. Every session tailored to you." / CTA: "Book your first visit."
- Events: "We handle the details so you can be present for the moments that matter." / CTA: "Tell us about your event."
- Retail: "Everything here is chosen with care. Come in and find something you'll love." / CTA: "Come see what's new."
- Fitness: "Every body. Every level. Your first session starts here." / CTA: "Start your first session."
- Beauty: "Great work speaks for itself. Come see what we can do." / CTA: "Book your appointment."
- Automotive: "Straight answers, honest prices, quality work. Every time." / CTA: "Bring your car in."
- Pet Services: "Your pet deserves gentle hands and a familiar face." / CTA: "Book your pet's visit."
- Cleaning: "We handle it so you don't have to. Reliable, thorough, and on time." / CTA: "Get a free quote."
- Landscaping: "We turn outdoor space into something you're proud of." / CTA: "Get a free estimate."
- Real Estate: "The right agent makes all the difference. Let's talk." / CTA: "Let's connect."

**[2026-06-10] — Owner copy editing and Claude regeneration approved for Phase 3.**
Approved by: Shawn + Steve Jobs + Jony Ive + Angela Ahrendts
Phase 3 owner app includes: tap any section title to rename, tap any copy block to edit inline, "Regenerate" button per section triggers Claude using original onboarding answers + any updates. Cannot delete sections or break layout. Text editable, structure immutable.
Upgrade path: basic text editing free, Claude regeneration is a paid feature.
Why: When an owner can edit their own site, it stops being "a site Found made for me" and becomes "my site." Ownership drives retention.

---

## CORE PRODUCT DECISIONS

**[2026-05-28] — App name is "Found." Company is "Found Co." Domain is foundco.app. Tagline is "Get Found."**
Approved by: Steve Jobs
Why: Simple, clear, searchable. Tells the customer exactly what it does for them.

**[2026-06-06] — Found brand direction is Pure Studio with a Signal Green heartbeat.**
Approved by: Shawn + Jony Ive + Steve Jobs
Why: Found should be a quiet black/white product world so client websites can carry their own color. Signal Green is reserved for meaning: action, live state, reveal, success, and the "Found it" moment. Found should feel Apple-level, but not imitate Apple colors.

**[2026-06-06] — Found logo direction starts as a refined uppercase FOUND wordmark.**
Approved by: Shawn + Jony Ive + Steve Jobs
Why: The word itself is strong. Avoid generic discovery cliches like map pins, magnifying glasses, sparkles, or an overdesigned icon. Explore the O only if it stays subtle enough to work without explanation.

**[2026-05-28] — Found is for ALL small business types — not just contractors.**
Approved by: Steve Jobs
Why: Balloon artists, barbers, food carts, aestheticians, T-shirt sellers from home, restaurants, groomers — they all have the same problem. Found solves it for every single one of them. No vertical is excluded.

**[2026-05-28] — The core promise: answer questions → professional website generated automatically. Under 10 minutes. No tech skills required. Owner never sees the backend.**
Approved by: Steve Jobs
Why: This is the entire product in one sentence. Every feature must serve this promise or get cut.

**[2026-05-31] — Onboarding feels like talking to a best friend — not filling out a form.**
Approved by: Steve Jobs + Angela Ahrendts
Why: Shawn's exact words. The owner should answer with enthusiasm and excitement, as if telling someone who is genuinely interested about their business. If it feels like paperwork, we have failed.

**[2026-06-04] — Add a sub-industry question after "What do you do?" and save it as a real field.**
Approved by: Shawn + Jony Ive + Steve Jobs + Angela Ahrendts + Craig Federighi + Priya Nair
Why: This gives Found enough context to choose better sections, photos, copy, and CTAs without exposing complexity to the owner. The question stays human: "What kind of business is it?"

**[2026-06-04] — REVISED: All 12 industry section manifests are approved, including Real Estate.**
Approved by: Shawn + Jony Ive + Steve Jobs + Angela Ahrendts + Craig Federighi + Priya Nair + Marcus Webb
Why: Each industry now has its own homepage story, required onboarding fields, sub-industry choices, CTA intent, photo tag direction, and natural upgrade paths. Found should choose the right structure silently; the owner should never pick sections. Real Estate is scoped as personal brand, lead capture, contact memory, and simple follow-up without IDX/MLS in the first version.

**[2026-06-04] — Real Estate uses existing layouts first; no new visual template yet.**
Approved by: Shawn + Jony Ive + Steve Jobs + Craig Federighi + Marcus Webb
Why: Real Estate needs a distinct section manifest, not a fifth layout yet. Use Impact, Editorial, Portrait, or Cinematic first, then add a dedicated layout only if Coach John or future users prove it is needed.

**[2026-05-28] — Two-flag photo system: ❤️ Heart = website/gallery. ⭐ Star = social media prep. Independent flags — a photo can be both, one, or neither.**
Approved by: Steve Jobs
Why: One-tap decision. Owner curates their best work in seconds on a break. No complex workflow.

**[2026-05-28] — Worker role: upload only (photos + video). Admin/owner role: everything.**
Approved by: Steve Jobs + Craig Federighi
Why: Workers document. Owners decide. Field workers should never be able to touch the website, curate content, or access business settings.

**[2026-05-31] — The "5-minute break" view: a calm, simple screen showing top flagged photos from the week, ready to heart or star. One tap. Done. Back to work.**
Approved by: Steve Jobs + Angela Ahrendts
Why: These owners are exhausted. When they get a break, Found should be ready for them — not another thing to figure out.

**[2026-05-28] — Lead system: customer fills out form on website → owner gets email notification → email has a one-tap button to reply directly to the client.**
Approved by: Steve Jobs
Why: Speed of response wins jobs. Owner should be able to reply to a lead in one tap from their phone.

**[2026-06-04] — Found needs a lightweight contact database for leads, current clients, and previous clients.**
Approved by: Shawn + Steve Jobs + Angela Ahrendts + Priya Nair
Why: Every name, phone, email, lead, booking, estimate, invoice, and repeat customer should have a home. This is not a complicated CRM. It is the simple customer memory layer owners need to follow up, rebook, and stay connected.

**[2026-06-04] — Relationship automation is an upgrade path, not a CRM clone.**
Approved by: Shawn + Steve Jobs + Jony Ive + Angela Ahrendts + Craig Federighi + Priya Nair + Phil Schiller
Why: Real estate agents and many small businesses need simple automated email/text follow-up to stay in front of leads and clients. Found should make this feel as easy as using an iPhone, with consent, opt-out, and compliance handled by the system. It should not become GoHighLevel, Salesforce, or a complex automation builder.

**[2026-06-04] — Contact database foundation belongs in Phase 2; full contact dashboard belongs in Phase 3.**
Approved by: Shawn + Steve Jobs + Craig Federighi + Priya Nair
Why: Every lead should create or update a contact as soon as onboarding/leads are live, but a full CRM-style dashboard would delay the core product. Build the memory layer now; expand the management surface later.

**[2026-05-29] — Barrio Builders (Michael, Tucson AZ) is Instance #1. Every feature must work for Barrio Builders first before it ships.**
Approved by: Steve Jobs
Why: The Guinea Pig Rule. If it doesn't work for a real roofing business, it doesn't ship.

**[2026-05-29] — Hosting on Vercel, not Netlify.**
Approved by: Craig Federighi
Why: Better Next.js 16 support, cleaner wildcard subdomain configuration for *.foundco.app.

**[2026-05-31] — "Built with Found" badge in the footer is a growth engine, not fine print. It must feel like something the owner is proud to display — not a watermark they tolerate.**
Approved by: Steve Jobs + Phil Schiller
Why: Every client site is a billboard. The badge has to earn its place or it gets hidden.

**[2026-05-31] — The site reveal moment must be choreographed. Designed like an unboxing. Not a page load.**
Approved by: Steve Jobs + Angela Ahrendts + Jony Ive
Why: This is the moment that sells them forever. The owner finishes answering questions and sees their site for the first time. That moment cannot be accidental or generic.

**[2026-05-31] — The reveal message is personal: "[First name], [Business Name] is live." Not generic copy.**
Approved by: Jony Ive
Why: Personal. Direct. Like handing them the keys to their own business.

**[2026-05-31] — Gallery must feel like an editorial portfolio — NOT a uniform grid. Masonry layout. Full-bleed capability. Their work should look like it belongs in a magazine.**
Approved by: Jony Ive + Marcus Webb
Why: The gallery is the owner's resume. A roofer who just finished a beautiful job deserves a gallery that shows that pride.

**[2026-05-31] — Shopping cart upgrade is simplified and elegant — NOT Shopify. Add a product. Set a price. Done. Apple-quality UX only.**
Approved by: Steve Jobs
Why: Shopify is overwhelming. Found owners need simple. If it requires a tutorial, we've failed.

**[2026-05-31] — Dark mode per business: the vibe and layout system must support full-light sites AND full-dark sites. Not every brand lives in the dark.**
Approved by: Jony Ive
Why: A wellness spa and a nightclub should not feel the same. The template must disappear behind the brand.

**[2026-05-31] — Motion is subtle and intentional. Arrival animations only. Nothing dramatic. If it screams "developer added animations," it's wrong.**
Approved by: Jony Ive
Why: Premium products feel alive. But motion should feel inevitable, not decorative.

---

## IMAGE SYSTEM DECISIONS (APPROVED — May 31, 2026)

**[2026-05-31] — Three-tier image system. Priority order: owner photos first, stock second, gradient third. No tier is a failure — every tier produces something beautiful.**
Approved by: Steve Jobs + Jony Ive
Why: Owner photos are always best. But not every owner has photos on day one. The stock and gradient tiers ensure every generated site looks premium regardless.

**[2026-05-31] — Stock image library: Pexels API. Free, no attribution required, commercial use allowed.**
Approved by: Steve Jobs + Phil Schiller
Why: Pexels is free AND requires no attribution — cleaner client sites than Unsplash. When Shawn shoots his own industry photos eventually, we swap the source without changing anything else.

**[2026-05-31] — Stock images: 12–15 per industry category minimum. Organized by industry folder in Supabase assets bucket. Selection weighted by vibe.**
Approved by: Steve Jobs + Craig Federighi
Why: Enough variety that no two Found clients look alike even when using stock. The combination of industry + vibe weighting + layout type + color = thousands of distinguishable permutations.

**[2026-05-31] — Every Found client must look like they received a custom $1M website. The standard is Apple.com quality of look and feel — not necessarily volume of content, but precision of quality.**
Approved by: Steve Jobs + Jony Ive
Why: Shawn's exact vision. This is the bar against which every design decision is measured.

**[2026-05-31] — Photo upload question (Q7.5) added to onboarding between services and logo. Two targets: hero photo/video + gallery photos (up to 20). Skip is a first-class option.**
Approved by: Steve Jobs + Angela Ahrendts
Why: Owner's photos are the primary image source. We ask early so the site can be built around their best work from day one.

**[2026-05-31] — Color palette: 12 Jony-approved presets. Names and hex values locked.**
Approved by: Steve Jobs + Jony Ive

| Name | Hex | Feel |
|---|---|---|
| Forest | #2E7D32 | Strong, natural, trusted |
| Ocean | #1565C0 | Professional, calm, reliable |
| Slate | #455A64 | Modern, serious, premium |
| Crimson | #C62828 | Bold, energetic, confident |
| Amber | #E65100 | Warm, friendly, approachable |
| Gold | #F9A825 | Vibrant, optimistic, creative |
| Rose | #AD1457 | Elegant, feminine, refined |
| Plum | #6A1B9A | Luxurious, creative, distinctive |
| Teal | #6ECECE | Fresh, calm, elegant — works beautifully on white and dark backgrounds |
| Midnight | #212121 | Sophisticated, minimal, premium |
| Clay | #8D6E63 | Warm, earthy, approachable |
| Sky | #0277BD | Clean, open, professional |

Plus: "I have my own color" → hex input. Phase 2: extract from uploaded logo automatically.

**[2026-05-31] — Build order: Impact layout first (polish Barrio Builders to 100%), verify full pipeline, then Editorial → Portrait → Cinematic.**
Approved by: Steve Jobs + Jony Ive
Why: Design one thing perfectly before designing four. Impact is the baseline — everything else is a reinterpretation of the same design language.

**[2026-05-31] — Portrait layout confirmed for visual businesses (balloon artists, bakers, photographers). Impact confirmed for contractors and industrial businesses.**
Approved by: Steve Jobs + Jony Ive + Shawn
Why: Portrait leads with photography — the work is the proof. Impact leads with authority — the business commands attention immediately.

---

## BARRIO BUILDERS SEED DATA (CONFIRMED — May 31, 2026)

Run `scripts/seed-barrio.sql` in Supabase SQL Editor to insert.

| Field | Value |
|---|---|
| primary_color | #1EAB46 |
| accent_color_1 | #5F5F5F |
| accent_color_2 | #C0C0C0 |
| vibe | bold |
| layout | Impact |
| primary_intent | quote (Get a Free Estimate) |
| secondary_intent | call |
| hero_title | "Built for Tucson. Built to Last." |
| services | Remodeling, Renovations, Painting, Drywall, Framing, Flooring |
| testimonials | 3 (2 English, 1 Spanish) |

---

## INDUSTRY SECTION MANIFESTS (APPROVED — revised June 4, 2026)

**Concept approved by Steve + Jony on June 1. Full 12-industry manifest approved by Shawn + team on June 4.**

The insight: every Found client gets the same section order (Hero → Services → About → Testimonials → CTA). That's one story for every business type. It's not enough.

Different industries need different sections, different ordering, and different data fields:
- A restaurant needs hours + a menu preview
- A salon needs pricing visible on the services section
- A balloon artist needs a gallery-forward layout where the work sells itself
- A contractor needs a trust strip (licensed, insured, local)
- A spa needs a philosophy section, not just service cards

**Approved implementation direction:**
1. Found chooses the section manifest silently; the owner never picks sections.
2. Q2.5 asks the human sub-industry question: "What kind of business is it?"
3. `companies.sub_industry` stores the answer.
4. Craig and Marcus wire the approved manifest into onboarding and site generation.
5. Real Estate is the 12th industry, scoped to personal brand, lead capture, contact memory, and simple follow-up without IDX/MLS first.

---

## UPGRADE FEATURES (APPROVED)

**[2026-05-28] — Upgrade: Estimates & Quotes**
Approved by: Steve Jobs
Why: Contractors and service businesses live on quotes. This is their #1 admin task after getting a lead.

**[2026-06-04] — Estimates & Quotes upgrade includes deposits, conversion to invoice, final payment, and receipt.**
Approved by: Shawn + Steve Jobs + Craig Federighi + Priya Nair
Why: Service businesses do not just send estimates. They need the full flow: quote, client approval, deposit, work, final invoice, final payment, receipt. Stripe should handle payments; Found should make the workflow simple.


**[2026-07-02] - Estimator builder must be redesigned as a guided tool, not patched as a form.**
Approved by: Shawn + Steve Jobs + Jony Ive + Angela Ahrendts + Craig Federighi + Priya Nair
Why: Live testing showed the estimate builder feels like database entry. Found is supposed to make owners faster and more confident on a job site. The current builder exposes too much of the data model and does not guide the owner's eye or workflow.

Locked direction:
- `New Estimate` becomes a full-screen focused work surface, not a bottom sheet over Found branding.
- Workflow is Customer -> Job -> Work -> Price -> Review.
- Line items are built through an owner-friendly work composer, not spreadsheet-like rows.
- Units stay optional/contextual.
- Customer-facing pages never expose Stripe/setup/payment-configuration issues.
- Owner dashboard may show payment setup warnings; clients should only see clean accept/pay or accept flows.**[2026-07-02] - Payable estimates are the primary customer path; invoices are a fallback/sibling mode, not the default.**
Approved by: Shawn + Steve Jobs + Jony Ive + Angela Ahrendts + Craig Federighi + Priya Nair + Marcus Webb
Why: The customer's emotional decision happens when they read the estimate and decide "yes." Most estimating tools break that moment by sending a separate invoice later. Found should collapse that gap: the public estimate page must make the next step feel natural, immediate, and modern.

Locked product direction:
- The default customer CTA is **Accept & Pay** from the estimate page.
- If a deposit is configured, copy is **Accept & Pay Deposit**.
- If full payment is due, copy is **Accept & Pay Now**.
- Stripe Payment Element should stay embedded so Apple Pay, Google Pay, and cards can appear in the same organic flow where Stripe/account/domain settings allow.
- A quiet secondary text link, **Accept now, pay later**, exists for legitimate cases where the customer is ready to approve but cannot pay immediately.
- Pay-later must not become the default invoice detour. It marks the estimate accepted, keeps the same public page payable, and sends a payment-link email.
- Customer receives a clean receipt/payment confirmation after payment. Owner receives the "you got one" notification.

Implementation principle:
Build **payable estimates** first. Do not build a full invoice system before the estimate decision moment is solved.

**[2026-07-02] - Invoice mode belongs inside the same estimates/payments tool, after payable estimates are stable.**
Approved by: Shawn + Steve Jobs + Craig Federighi + Priya Nair
Why: Some owners do the work after a verbal on-site yes and only need to collect payment. That is real, but it should reuse the same client, line item, tax, payment, receipt, and email engine. A separate POS product would be too much too early.

Locked product direction:
- Add invoice mode as a sibling to estimates: **Estimates | Invoices** or **New Estimate / New Invoice**.
- Estimate means "approve this work."
- Invoice means "this was agreed/done; pay this amount."
- Invoice mode skips the accept step and sends or opens a payment page directly.
- Do not call this POS yet. Future simple language: **Send Invoice**, **Collect Payment**, **Take Payment Now**.
- POS-lite can come later for standing-at-the-counter payment, but the next product step is invoice mode sharing the estimate line-item/payment engine.
**[2026-05-28] — Upgrade: Shopping Cart (simplified, not Shopify)**
Approved by: Steve Jobs
Why: T-shirt sellers, product makers, food businesses need to sell. Keep it elegant and simple.

**[2026-06-04] — Online Menu is an upgrade path for restaurants and food businesses.**
Approved by: Shawn + Jony Ive + Phil Schiller
Why: Food businesses may need more than a static menu preview. The upgrade should support a clean online menu experience without turning Found into a complicated restaurant POS.

**[2026-06-04] — Real Estate is approved as the 12th Found industry.**
Approved by: Shawn + Steve Jobs + Jony Ive + Phil Schiller + Angela Ahrendts + Craig Federighi + Priya Nair + Marcus Webb
Why: Real estate agents and investors are network-heavy, referral-driven, and often stuck with overcomplicated systems like GoHighLevel. Found should give them a personal brand website, lead capture, contact memory, and simple follow-up automation without becoming an MLS/IDX or transaction-management platform. CoachJohnRealEstate.com is the reference customer.

**[2026-06-04] — Pricing questions are industry-specific, not global.**
Approved by: Shawn + Jony Ive + Steve Jobs + Angela Ahrendts
Why: Beauty and food often need visible pricing. Wellness and fitness may need optional starting prices. Home services, landscaping, cleaning, and automotive should not be forced into fixed prices because estimates depend on the job.

**[2026-06-04] — Wellness supports a multi-provider spa/studio branch.**
Approved by: Shawn + Jony Ive + Steve Jobs + Angela Ahrendts + Craig Federighi + Priya Nair
Why: Spa Mambo proves that some wellness businesses need visible pricing, provider/artist profiles, and booking with a specific person. Solo wellness providers should not be forced into that complexity.

**[2026-06-04] — Hours and location are required only for visit-based businesses.**
Approved by: Shawn + Jony Ive + Angela Ahrendts
Why: Food, retail, beauty, wellness, fitness, automotive, and pet services usually need hours/location. Home services, landscaping, cleaning, and events may be service-area or appointment-based, so forcing hours/location would feel like paperwork.

**[2026-06-04] — Testimonials stay optional for every industry.**
Approved by: Shawn + Steve Jobs + Angela Ahrendts
Why: A new business should never be blocked from launching because it lacks testimonials. Social proof helps, but it is not required for the magic moment.

**[2026-05-28] — Upgrade: Shared Gallery Link**
Approved by: Steve Jobs
Why: Show a client their project in progress. One shareable link. No login required for the client.

**[2026-05-28] — Upgrade: Custom Domain**
Approved by: Steve Jobs
Why: Owners who already have a domain deserve to use it. barriobuilders.com, not barriobuilders.foundco.app.

---

## PRICING (APPROVED)

**[2026-05-28] — Solo: $19/mo (1 admin). Owner: $39/mo (1 admin + 3 workers). Team: $59/mo (1 admin + 10 workers). Extra worker seat: $9/mo.**
Approved by: Steve Jobs + Phil Schiller
Why: Under $40/month for the Owner tier — accessible for a small business, profitable at scale. The goal is recurring revenue, not a one-time payment.

---

## PHASE DECISIONS

**[2026-05-28] — Phase 1: Build and perfect the Barrio Builders website. Prove the template works. This is the guinea pig phase.**
Approved by: Steve Jobs
Status: ✅ Complete as of May 29, 2026

**[2026-05-29] — Phase 2: Build the onboarding flow. Owner answers questions → site is generated automatically.**
Approved by: Steve Jobs
Status: 🔨 Current phase

**[2026-05-28] — Phase 3: PWA polish — in-app camera, two-flag curation UI, admin dashboard, worker app, gallery sync, social export.**
Approved by: Steve Jobs
Status: ⏳ Upcoming

**[2026-05-28] — Phase 4: Capacitor wrap → App Store (Apple) + Google Play.**
Approved by: Steve Jobs
Status: ⏳ Upcoming

**[2026-05-28] — Phase 5: Stripe billing, upgrade features, foundco.app marketing site.**
Approved by: Steve Jobs + Phil Schiller
Status: ⏳ Upcoming

---

## JUNE 12, 2026 DECISIONS

**[2026-06-12] — Slug strategy: preferred → preferred-city → preferred-4hex. No industry in slug. No -2 suffixes. CamelCase input is split at uppercase boundaries.**
Approved by: Shawn + Craig Federighi
Why: Industry segments create ugly URLs (barriobuilders-roofing). Numeric suffixes look auto-generated and cheap. CamelCase splitting (BarrioBuilders → barrio-builders) lets owners type naturally. The three-step fallback chain produces clean, human-readable URLs at every tier.
Implementation: `splitCamelCase()` normalizes input → preferred slug checked first → append `-{city}` → append `-{4 hex chars from nanoid}`.

**[2026-06-12] — Dark navbar flag: `navbar_dark boolean DEFAULT false` added to companies table (migration-028).**
Approved by: Shawn + Craig Federighi
Why: Some businesses (nightclubs, barbers, dark-vibe contractors) need a dark navbar on a light-bodied site without going full dark mode. The flag gives them that without building a separate vibe.
Implementation: `navbar_dark = true` → navbar background becomes `#111111`, logo always uses `logo_white_url`.

**[2026-06-12] — Two-logo system: `logo_url` for light backgrounds. `logo_white_url` for dark backgrounds. Owner uploads both during onboarding.**
Approved by: Shawn + Jony Ive
Why: A dark logo disappears on a dark navbar. Many owners already have a white version of their logo for merchandise or dark backgrounds. The system should use the right one automatically — the owner should never see their logo disappear.
Implementation: navbar dark → use `logo_white_url` (fallback to `logo_url` + drop-shadow). Footer always uses `logo_white_url`.

**[2026-06-12] — Custom domain: connect-domain page, Vercel API (not manual DNS instructions). No domain registrar — owner brings their own.**
Approved by: Shawn + Craig Federighi
Why: Telling an owner to log into their registrar and enter DNS records is too much friction. Found should handle the Vercel domain assignment automatically and tell the owner exactly which DNS record to add — one instruction, one field.
Implementation: `/connect-domain` page → owner types domain → Found calls Vercel API to add the domain to the project → instructions displayed.

**[2026-06-12] — Welcome email fires on site creation via Resend. Subject line: `[Name] is live.` (not a sentence, a statement). From: hello@foundco.app.**
Approved by: Shawn + Jony Ive + Angela Ahrendts
Why: The old subject (`Your site is live — [Name]`) sounded like a notification. `[Name] is live.` sounds like a headline. The email is a moment, not a system message. Period at the end — period. Not an exclamation mark.
Implementation: Server action in `onboarding/actions.ts` calls Resend after `createCompany()`. Fire-and-forget (does not block the reveal screen).

**[2026-06-12] — Pricing revised. Old tier structure ($19/$39/$59) is retired. New structure: Found $39/mo, Found Pro $69/mo, Found Business $99/mo. Founding Member rate: $29/mo locked forever for first 25 clients.**
Approved by: Shawn + Steve Jobs + Phil Schiller (Jony leads, Steve approves)
Why: The old $19 Solo tier left money on the table and undersold the product. $39 is still accessible for a small business owner and positions Found against Squarespace properly. Founding Member creates urgency and rewards early adopters without discounting the product permanently for the general market.
Billing model: 14-day free trial, card required at onboarding start, charged on day 15.

| Tier | Price | Workers | Custom Domain | Photo Pipeline | Notes |
|---|---|---|---|---|---|
| Found | $39/mo | None | ❌ | ✅ | Base plan |
| Found Pro | $69/mo | Unlimited upload-only | ✅ | ✅ | + contact DB, lead follow-up, copy regen |
| Found Business | $99/mo | Unlimited | ✅ | ✅ | + booking, quotes, reviews, social export |
| Founding Member | $29/mo | None | ❌ | ✅ | First 25 clients, locked forever |

**[2026-06-12] — Photo pipeline (❤️ heart + ⭐ star curation) is a base feature of ALL plans, not a Pro upgrade.**
Approved by: Shawn (decision made explicitly June 12)
Why (Shawn's words): "Even a single user will love to be able to mark photos for their website and for their social media." The photo pipeline is the daily habit that keeps owners subscribed. It is the differentiator that makes Found feel alive after launch — not just a website that sits there. SEO benefit: fresh photos on the website = Google sees active business = better local search ranking.
One photo → four uses: website gallery/hero sync + social exports (IG 1080×1350, FB 1080×1080) + quote/estimate attachments + shareable client gallery links.

**[2026-06-12] — Stripe for Found Co. is a separate account under the same login, not mixed with Say It Marketing.**
Approved by: Shawn
Why: Found Co. billing must be isolated — separate bank account, separate API keys, separate Stripe balance and payout schedule. Two businesses under one Stripe login is the correct approach; mixing keys would create a financial and operational mess.
Implementation: Stripe login → "New account" → named "Found Co." → own bank → sandbox API keys first → live keys after billing code is tested.
Vercel env vars: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (browser-safe, publishable key) + `STRIPE_SECRET_KEY` (server-only, secret key). Both added to Vercel project as of June 12, 2026.

---

## LEADS & INBOX SYSTEM (APPROVED — June 17, 2026)

**[2026-06-17] — Leads and Inbox are two views into one unified contact/conversation system.**
Approved by: Shawn
Why: They look like two separate features but they share one underlying data model. Leads = the list view (who, when, source, status). Inbox = the conversation view (the thread). Tapping any lead opens its conversation thread. Replying from either view writes to the same thread. Think iPhone Contacts + Messages — two entry points, one system.

**[2026-06-17] — Leads can enter the system from multiple sources. Each lead carries a source tag.**
Approved by: Shawn
Sources:
1. **Website form** — someone fills out the contact/estimate form on the client's Found site. Automatic. Always works.
2. **Manual entry** — owner is at a networking event, birthday party, family gathering. They open Found, tap "Add Lead", enter a name and number. That's it. Phone book simplicity. No required fields beyond name + one contact method.
3. **Business card scan** — owner takes a photo of a business card inside Found. System reads the card (OCR) and pre-fills name, phone, email. Owner confirms and saves. One tap to add to leads.
4. **Abandoned onboarding** — someone went through the Found onboarding flow, saw their site, but didn't activate (no credit card). These are warm leads for Found Co. itself, not for the client's business. They appear in the leads system with source = "onboarding" and status showing what's been sent and what hasn't.
5. **Future sources** — referral links, social DMs, QR code scans. Not in scope now but the source tag system must be extensible.

**[2026-06-17] — Lead temperature: Hot, Warm, Cold. Owner sets it manually. System suggests it based on recency and activity.**
Approved by: Shawn
Why: Owner needs a fast visual read of where to focus energy. Not a scoring algorithm — just a simple signal. Hot = act now. Warm = follow up soon. Cold = not urgent.

**[2026-06-17] — Each lead shows its communication status inline — what's been sent, when, and whether it's been opened or replied to.**
Approved by: Shawn
Examples: "Auto-reply sent · 2 hours ago", "Follow-up sent · Yesterday · No reply", "Replied · 3 days ago"
Why: Owner should never have to wonder "did they hear from me?" The status is right there on the lead card.

**[2026-06-17] — Tapping a lead opens its full conversation thread (Inbox view). The two tabs are UI organization, not separate systems.**
Approved by: Shawn
Why: Leads tab = organization and overview. Inbox tab = active working surface. Clean separation for UX, but one data model underneath. A lead without any messages still has a conversation thread — it's just empty, waiting for the owner to start it.

**[2026-06-17] — The lead system is a phone book, not a CRM. Name and one contact method is enough to create a lead.**
Approved by: Shawn
Why: Salesforce, HubSpot, GoHighLevel — all too heavy. A small business owner at a party should be able to save a lead in under 10 seconds. Required fields: name + (phone OR email). Everything else is optional. If it feels like paperwork, we've failed. This is the same standard as the onboarding flow — it should feel like talking to a friend, not filling out a form.

**[2026-06-17] — Abandoned onboarding leads (people who saw their site but didn't activate) are a special lead type for Found Co. internal use.**
Approved by: Shawn
These appear in the Found admin system (not the client dashboard). They show:
- What the site looks like
- What emails/messages have been sent to them
- A one-tap "Send them their site link again" action
- Their activation status
Why: These are warm leads who already saw the product. They need a gentle, automated nudge sequence — not a sales call. The system should handle the follow-up automatically with the owner's (Shawn's) approval.

**[2026-06-17] — Upgrade upsells appear contextually inside the dashboard based on industry.**
Approved by: Shawn
Examples:
- Restaurant owner → sees "Add Online Ordering" in the More/Upgrades section
- Service business → sees "Add Estimates & Quotes"
- Any owner → sees "Add Custom Domain", "Add Online Store"
Upgrades are surfaced based on `company.industry` and `company.sub_industry` — a tutor should never see "Add Online Menu." A food truck should never see "Add Estimates & Quotes."
Why: Relevant upgrades feel like helpful suggestions. Irrelevant ones feel like spam. The system should know who you are and show you only what makes sense for your business.

**[2026-06-17] — Approved upgrade paths (from prior decisions + this session):**
- Online Menu / To-Go Ordering (restaurants, food trucks, home bakers)
- Online Shopping Cart (retail, makers, product businesses)
- Estimates & Quotes with deposit → invoice → payment → receipt flow (contractors, home services, landscaping, cleaning, automotive)
- Custom Domain (all plans)
- Shared Gallery Link (show clients project progress)
- Booking / Appointments (wellness, beauty, fitness, tutors, pet services)
- Social Export (photo pipeline → formatted for IG/FB)
- Worker Seats (Pro and Business plans)
- Contact automation / follow-up sequences (Pro plan)


---

## DASHBOARD UX & NAVIGATION (APPROVED — June 17, 2026)

**[2026-06-17] — Mobile is the primary product. Desktop/tablet is the power view. Every feature ships mobile-first.**
Approved by: Shawn
Why: Small business owners are on their feet, in the truck, between jobs. The app must work perfectly in a 60-90 second session with one hand. Desktop is for when they have time — it gets more data density and a sidebar layout, but it is never the primary design target.

**[2026-06-17] — Bottom navigation: 5 items. Home · Leads · Camera · Contacts · More**
Approved by: Shawn
Why: Five is the Apple standard maximum for bottom nav. Each item represents a distinct daily intent. Site editing lives inside More because owners don't edit their site daily — they check leads, add photos, and talk to customers daily.

Nav item definitions:
- **Home** — pulse dashboard + quick action shortcuts
- **Leads** — all leads and conversations (list view + inbox view toggled at top of screen)
- **Camera** (center, prominent) — daily action button. Opens: Add Photo (→ staging area) or Scan Card (→ leads or contacts). The heartbeat of daily usage.
- **Contacts** — business phone book. Vendors, subs, suppliers. Tap to call/text/email.
- **More** — My Site (edit), Plan & Billing, Upgrades, Settings, Help

**[2026-06-17] — Leads and Inbox are one tab with a segmented control toggle, not two separate bottom nav items.**
Approved by: Shawn
Why: They are the same system. Splitting them into two nav items wastes a slot and confuses owners. A segmented control at the top of the Leads tab ("Leads · Inbox") gives clean access to both views. Tapping a lead from the list view opens its conversation (inbox view). One tab, two views, zero confusion.
Backup: If user research shows owners are confused by the toggle, split back into two nav items and move Camera into a floating action button. This is the documented fallback.

**[2026-06-17] — Home screen is a pulse dashboard + launchpad, not just a summary.**
Approved by: Shawn
Structure (top to bottom):
1. **Pulse number** — the one thing that matters most right now. New leads since last open, or site visitors this week if no new leads. One number. Large. Quiet.
2. **Top unactioned lead** — most recent lead that hasn't been replied to. Name, what they asked, two buttons: Reply and Call. If caught up: "You're caught up." in Signal Green.
3. **Quick action buttons** — Add Lead, Add Photo, Share My Site, View Site. These are shortcuts to actions, not navigation to tabs.
4. **Weekly snapshot** — site visitors, leads this week, photos approved. Small visible wins showing Found is working even when the owner isn't looking.

**[2026-06-17] — Camera button is center bottom nav, most prominent position.**
Approved by: Shawn
Why: Capturing photos and leads on the go is the daily habit that makes Found irreplaceable. Dead center = most important action. Tap it → two choices only: Add Photo or Scan Card. No other options at that moment.
Scan Card → one question: "Is this a customer lead or a business contact?" → routes to Leads or Contacts accordingly.

**[2026-06-17] — Three things drive daily habit. Every feature decision must serve at least one of these.**
Approved by: Shawn
1. **Notifications that feel personal** — not "You have a new lead" but "Sarah just asked about your pricing." Specificity pulls the owner back in.
2. **Something completable in under 3 taps** — reply to a lead, add a contact, approve a photo. The app rewards opening it because something always gets done fast.
3. **Visible progress** — pulse number going up, site visitors increasing, photos on the website updating. Small wins that prove Found is working for them.

**[2026-06-17] — Desktop/tablet layout is a sidebar nav with more data density. Not designed first.**
Approved by: Shawn
Desktop differences:
- Left sidebar replaces bottom nav
- Leads and Inbox become side-by-side columns (email client style)
- Home becomes a proper dashboard with more metrics visible
- Camera button becomes an "Add +" button in top right
- More whitespace, more information per screen
Built after mobile is complete and stable.

**[2026-06-17] — Site editing lives in More, not in the main nav.**
Approved by: Shawn
Why: Owners do not edit their site daily. It should be accessible but not prominent. More → My Site → tap to edit hero text, about text, services. Non-technical. No CSS, no design tools. Text and photos only. Structure is immutable.

**[2026-06-17] — Contacts tab: self-contained for launch. Tags/categories for filtering. Native OS for calls and texts.**
Approved by: Shawn
Features at launch:
- Name, phone, email, notes
- Tags: Vendor, Subcontractor, Laborer, Supplier — owner can add custom tags
- Filter by tag ("show me all my drywall guys")
- Tap phone → native OS dial
- Tap text → native OS Messages (pre-filled number)
- Tap email → native OS Mail (for contacts) / Found inbox (for leads)
- Business card scan → drops here or into Leads based on owner's one-tap choice at scan time
Not in launch: job assignment, payment tracking, referral partner tracking, subcontractor scheduling

**[2026-06-17] — Referral partners (realtors, insurance agents who send business) are sidelined for post-launch.**
Approved by: Shawn
Why: Important relationship type but adds complexity. For launch, owners can tag a contact as "Referral" using the custom tag system. A dedicated referral tracking feature (track who sent you which jobs, stay in front of them automatically) is a future Pro feature.


---

## PHOTO PIPELINE & REVISED NAVIGATION — INITIAL CONCEPT (June 17, 2026)
### ⚠️ STATUS: INITIAL CONCEPT — NOT FINAL. Document for discussion. Subject to change after testing.

**[2026-06-17] — CONCEPT: Photos is a core daily tab, not a secondary feature. Nav revised accordingly.**
Status: Initial concept — Shawn approved for exploration
Why: A business owner taking photos of their work and turning them into website and social content is a primary daily action equal to checking leads. It cannot live inside More or be a secondary action. It belongs in the main nav.

**[2026-06-17] — CONCEPT: Floating camera button replaces Camera as a bottom nav item.**
Status: Initial concept
Proposed: A floating action button (FAB) positioned above the center of the bottom nav — always visible on every screen. Tap it → two choices: Take Photo (→ Photos queue) or Scan Card (→ Leads or Contacts).
Why: Frees up a nav slot for Photos as a full tab while keeping camera capture always one tap away from anywhere in the app. Similar pattern to Instagram's camera.
Fallback if FAB feels cluttered: bring Camera back as center nav item and move Photos inside it.

**[2026-06-17] — CONCEPT: Revised bottom nav — Home · Leads · Photos · Contacts · More**
Status: Initial concept
Changes from previous nav decision:
- Camera removed as nav item → becomes floating action button
- Photos added as dedicated nav tab (was previously only accessible via Home quick action)
- Everything else unchanged

**[2026-06-17] — CONCEPT: Photos tab has three internal views toggled at top — Queue · Website · Social**
Status: Initial concept

**Queue view:**
- Every photo taken through Found's camera, unreviewed
- One photo at a time, card-style (think Tinder swipe or stacked cards)
- Three actions: ❤️ Heart (website), ⭐ Star (social), or dismiss
- Fast. Designed for a 60-second break between jobs.
- A photo can be both hearted AND starred — independent flags as per original decision

**Website view:**
- All hearted photos in one place
- Owner taps a photo → assigns it: Hero image, Gallery, About section, or "Let Found decide"
- Found auto-suggests placement based on photo composition (portrait vs landscape) and what sections need photos
- Changes queue to update the live site — owner sees it reflected immediately

**Social view:**
- All starred photos, already formatted with brand typography and colors
- Found auto-applies: business name, brand font, brand color overlay — matching their site vibe
- Owner sees a preview, edits caption if they want, then shares directly or saves to camera roll for posting
- Before & After: select two photos → Found creates a side-by-side branded graphic automatically. One tap. No design skills needed.

**[2026-06-17] — CONCEPT: Before & After is a one-tap social post type inside the Social view.**
Status: Initial concept
Why: Before/after is the highest-performing content type for service businesses (contractors, cleaners, landscapers, beauty, wellness). It would cost $50 on Canva and 30 minutes of work. Found does it in one tap because the owner already captured and starred the photos. This is a genuine differentiator — nothing in this market does this automatically with brand-matched typography.

**[2026-06-17] — CONCEPT: Photos stay inside Found, not in the device camera roll.**
Status: Initial concept — needs legal/privacy review before shipping
Why: Camera roll is chaos. Business photos mixed with personal photos. Found's camera captures directly to Found's staging area — the owner's creative content stays organized, branded, and ready to use without digging through hundreds of personal photos.
Open question: Should owners have the option to also save to camera roll? Probably yes as an opt-in. Needs Angela's input on the opt-in UX.
Privacy note: Photos stored in Supabase storage bucket per company. Owner owns their photos. Found does not use them for training or any purpose other than displaying on their site and social exports.

**[2026-06-17] — CONCEPT: Social export formats at launch — Instagram (1080×1350 portrait), Facebook (1080×1080 square).**
Status: Initial concept
Future formats: Instagram Story (1080×1920), LinkedIn (1200×628), Google Business post
Why: IG and FB cover the majority of small business social media. Ship those first, add formats based on what owners actually use.

---

### OPEN QUESTIONS FOR TEAM (Photos & Nav concept)
- Angela: What's the right opt-in UX for "also save to camera roll"?
- Jony: Does the FAB above the nav feel right or does it create visual clutter on the home screen?
- Craig/Marcus: Supabase storage bucket structure for per-company photo staging — what's the migration look like?
- Steve: Does Before & After belong at launch or Phase 2?
- Shawn: ✅ DECIDED — Found prepares the image and saves to camera roll. Owner posts manually. Direct social API integration (Instagram, Facebook OAuth) is a future Pro upgrade. Keeps launch clean and avoids API compliance overhead.

**[2026-06-18] — Leads never convert to a separate entity/table. Temperature (hot/warm/cold) is the permanent mechanism for tracking lead status, including closed/won customers.**
Approved by: Shawn
Why: Found has no invoicing/payments/job-tracking system, so there is no real event the system could ever detect automatically to know "this lead is now a paying customer" — it would always require manual input. Rather than build a conversion feature or a separate customers table, the simpler and more honest model: a lead record describes how someone found you, and that never changes. Temperature is already editable per-lead (via the Lead detail sheet built June 18) and is sufficient to represent where things stand — including marking someone effectively "closed" by setting them hot/however the owner wants to use it. No new status field, no customers table, no auto-detection logic. Revisit only if Found ever adds real invoicing/payments, which would create an actual signal worth automating against.

**[2026-06-18] — Avatar color in Leads/Contacts is identity-based (Apple Contacts style), never status-based.**
Approved by: Shawn
Why: Avatars were previously colored by lead temperature (hot/warm/cold). Since most leads default to "warm," nearly every avatar rendered the same orange — flagged by Shawn as a visual inconsistency, and also a design smell: status and identity were competing for the same visual slot. Apple's own system (Contacts, Messages) assigns avatar color by a deterministic hash of the person's name from a small fixed palette of muted/desaturated colors — same person, same color, everywhere, forever, with zero connection to any status field. Found now does the same via `avatarColorFor()` in `src/lib/dashboard/typography.ts`. Temperature keeps its own separate colored badge/pill — the two systems no longer overlap.

**[2026-06-18] — Typography/contrast fixes must preserve Found's existing light/heavy weight brand voice, never flatten it toward generic system-UI bolding.**
Approved by: Shawn
Why: An early draft of the shared typography system made all large page titles bold (700 weight) in the name of "matching Apple's contrast." Shawn caught this immediately — Found's large titles being light-weight (300) paired with heavy-weight (800-900) uppercase tracked-out labels is an already-approved, deliberate brand signature (see DESIGN_DECISIONS.md), not a readability bug. The actual problems were font SIZE (too small, e.g. 8-13px in places that should be 15-20px) and OPACITY (too faint, e.g. 0.2-0.45 on body text that should never go below ~0.55), not font weight. Going forward: any contrast/legibility pass should fix size and opacity floors while explicitly preserving Found's existing weight personality, never bolding things "for contrast" as a substitute.
