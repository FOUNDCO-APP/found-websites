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
