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

## CORE PRODUCT DECISIONS

**[2026-05-28] — App name is "Found." Company is "Found Co." Domain is foundco.app. Tagline is "Get Found."**
Approved by: Steve Jobs
Why: Simple, clear, searchable. Tells the customer exactly what it does for them.

**[2026-05-28] — Found is for ALL small business types — not just contractors.**
Approved by: Steve Jobs
Why: Balloon artists, barbers, food carts, aestheticians, T-shirt sellers from home, restaurants, groomers — they all have the same problem. Found solves it for every single one of them. No vertical is excluded.

**[2026-05-28] — The core promise: answer questions → professional website generated automatically. Under 10 minutes. No tech skills required. Owner never sees the backend.**
Approved by: Steve Jobs
Why: This is the entire product in one sentence. Every feature must serve this promise or get cut.

**[2026-05-31] — Onboarding feels like talking to a best friend — not filling out a form.**
Approved by: Steve Jobs + Angela Ahrendts
Why: Shawn's exact words. The owner should answer with enthusiasm and excitement, as if telling someone who is genuinely interested about their business. If it feels like paperwork, we have failed.

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

## UPGRADE FEATURES (APPROVED)

**[2026-05-28] — Upgrade: Estimates & Quotes**
Approved by: Steve Jobs
Why: Contractors and service businesses live on quotes. This is their #1 admin task after getting a lead.

**[2026-05-28] — Upgrade: Shopping Cart (simplified, not Shopify)**
Approved by: Steve Jobs
Why: T-shirt sellers, product makers, food businesses need to sell. Keep it elegant and simple.

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
