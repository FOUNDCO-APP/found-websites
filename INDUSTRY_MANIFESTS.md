# INDUSTRY_MANIFESTS.md - Found Co.
### Jony Ive leads this document. Steve approves. Angela, Craig, Priya, Marcus, and Chris translate it into product.
*Draft created: June 4, 2026*
*Sub-industry field approved: June 4, 2026*

---

## Purpose

Found should not generate one generic site with different colors.

Each business type needs a different story, different proof, and different questions. This document defines the section manifest for each industry before onboarding is built.

Jony's standard: every generated site should feel inevitable for that kind of business. If a section does not help the owner get trusted, booked, visited, called, or paid, remove it.

Steve's standard: the owner should understand the result in five seconds.

---

## Manifest Shape

Each industry needs:

- **Primary job:** What the website must prove first.
- **Section order:** The homepage story.
- **Required onboarding fields:** Extra answers needed beyond the core flow.
- **Sub-industry choices:** Q2.5 options after "What do you do?"
- **Preferred photo tags:** Used to match curated photo pools.
- **Primary intent:** Main CTA: `call`, `quote`, `book`, `visit`, or `shop`.
- **Secondary intent:** Optional backup CTA.
- **Likely upgrades:** Which paid add-ons naturally fit the industry.
- **Jony note:** What to remove or protect.

Implementation note from Craig: start as a TypeScript config after approval. Do not add database complexity until a real need appears.

Upgrade note from Phil: manifests should identify natural upgrade paths, but the base site must still feel complete. Upgrades are useful extensions, not missing pieces.

Contact note from Priya: leads, customers, guests, estimate recipients, invoice recipients, and repeat clients should all connect back to one lightweight contact record. This is not a full CRM.

---

## Global Sections

These are reusable section concepts. Each industry chooses only what it needs.

| Section | Purpose |
|---|---|
| `hero` | Immediate promise and primary CTA |
| `trust_strip` | Licenses, insured, local, certified, years in business |
| `services` | What the business does |
| `services_pricing` | Service list with visible pricing or starting prices |
| `menu_preview` | Food/product menu highlights |
| `featured_collection` | Retail products or curated categories |
| `gallery` | Proof through real work or atmosphere |
| `portfolio` | Higher-end gallery for events, beauty, landscaping, visual work |
| `process` | How it works, from first contact to result |
| `hours_location` | Visit-focused practical details |
| `philosophy` | Wellness/beauty care approach |
| `team_expertise` | Practitioners, stylists, coaches, mechanics, specialists |
| `comfort_promise` | Safety, calm, pet care, cleanliness, customer care |
| `reviews` | Testimonials and social proof |
| `service_areas` | Cities/neighborhoods served |
| `final_cta` | One clear next action |

---

## 1. Home Services

**Primary job:** Prove trust, quality, local accountability, and make the estimate feel easy.

**Section order:** `hero` -> `trust_strip` -> `services` -> `process` -> `gallery` -> `reviews` -> `service_areas` -> `final_cta`

**Required onboarding fields:**
- Licensed/insured? yes/no
- Years in business
- Free estimates? yes/no
- Service areas

**Sub-industry choices:** roofing, remodeling, painting, drywall, flooring, HVAC, plumbing, electrical, TV install, camera install, general handyman

**Preferred photo tags:** general, painting, tv install, camera install

**Primary intent:** `quote`

**Secondary intent:** `call`

**Likely upgrades:** Estimates & Quotes, deposits, invoices, custom domain, shared gallery link

**Jony note:** No decorative softness. This site should feel sturdy, direct, and clean. Trust before flourish.

**Approval status:** Approved by Jony + Steve as the baseline manifest for Barrio Builders and home service businesses.

---

## 2. Food

**Primary job:** Make people hungry, show what to order, and make location/hours obvious.

**Section order:** `hero` -> `menu_preview` -> `featured_collection` -> `hours_location` -> `gallery` -> `reviews` -> `final_cta`

**Required onboarding fields:**
- Menu categories
- Best sellers
- Hours
- Address or service area
- Dine-in, pickup, delivery, catering, or food truck schedule

**Sub-industry choices:** smoothie shop, restaurant, bakery, food truck, coffee shop, meal prep, catering

**Preferred photo tags:** general, food truck

**Primary intent:** `visit`

**Secondary intent:** `call`

**Likely upgrades:** Online menu, simple ordering path, shopping cart, catering inquiry, custom domain

**Jony note:** Do not bury the menu. For food, the product is the proof.

**Approval status:** Approved by Jony + Steve + Shawn. Base site shows a clean menu preview; full online menu and ordering are upgrade paths.

---

## 3. Wellness

**Primary job:** Create calm trust and make booking feel safe.

**Section order:** `hero` -> `philosophy` -> `services` -> `team_expertise` -> `gallery` -> `reviews` -> `final_cta`

**Required onboarding fields:**
- Service types
- Practitioner credentials
- Appointment style: in-person, mobile, virtual
- First-visit expectations
- Provider model: just me, small team, or clients choose a specific provider

**Sub-industry choices:** spa, multi-provider spa, massage, yoga studio, meditation, therapy, acupuncture, wellness coaching

**Preferred photo tags:** general, yoga studio

**Primary intent:** `book`

**Secondary intent:** `call`

**Likely upgrades:** Online booking, provider/artist profiles, service menu with pricing, memberships/packages, intake forms, gift cards

**Branch: Solo wellness provider**
- Pricing is optional.
- One general booking CTA is enough.
- Provider profile is not required because the owner is the provider.

**Branch: Multi-provider spa/studio**
- Pricing should be visible.
- Provider/artist profiles matter.
- Booking should support choosing a specific person.
- Guest/contact memory matters, Spa Mambo style.

**Jony note:** Remove pressure. The page should breathe. No hard-selling language.

**Approval status:** Approved by Jony + Steve + Shawn with a multi-provider spa/studio branch inspired by Spa Mambo.

---

## 4. Events

**Primary job:** Show taste, creativity, and the ability to handle important moments.

**Section order:** `hero` -> `portfolio` -> `services` -> `process` -> `reviews` -> `final_cta`

**Required onboarding fields:**
- Event types served
- Guest count range
- Planning/setup included? yes/no
- Booking lead time

**Sub-industry choices:** weddings, balloon decor, balloon garland, party rentals, event planning, venue, DJ, photography

**Preferred photo tags:** wedding, balloon decor, balloon garland

**Primary intent:** `quote`

**Secondary intent:** `call`

**Likely upgrades:** Event quote/deposit, shared gallery link, packages, client preview gallery, custom domain

**Jony note:** Portfolio comes early. Event clients buy taste before logistics.

**Approval status:** Approved by Jony + Steve + Shawn. Photos/portfolio come before process; pricing is not required during onboarding.

---

## 5. Retail

**Primary job:** Show product quality, curation, and why visiting or shopping here is worth it.

**Section order:** `hero` -> `featured_collection` -> `services` -> `hours_location` -> `gallery` -> `reviews` -> `final_cta`

**Required onboarding fields:**
- Product categories
- Best sellers
- Store hours
- Address
- Online ordering? yes/no
- Optional product/category pricing

**Sub-industry choices:** bike shop, boutique, beauty store, gift shop, home goods, apparel, specialty retail

**Preferred photo tags:** general, beauty store

**Primary intent:** `visit`

**Secondary intent:** `shop`

**Likely upgrades:** Shopping cart, featured products, inventory-lite collection, gift cards, online ordering, custom domain

**Jony note:** Retail must feel curated, not cluttered. Fewer products shown beautifully beats a wall of inventory.

**Approval status:** Approved by Jony + Steve + Shawn. Base site drives visits and shows featured categories; full shopping cart is an upgrade.

---

## 6. Fitness

**Primary job:** Create energy, prove results, and make the first class/session less intimidating.

**Section order:** `hero` -> `services` -> `team_expertise` -> `gallery` -> `reviews` -> `process` -> `final_cta`

**Required onboarding fields:**
- Class/program types
- First class offer
- Coach credentials
- Schedule or booking method
- Optional class/session/membership prices

**Sub-industry choices:** gym, personal training, yoga studio, pilates, boxing, martial arts, group fitness

**Preferred photo tags:** general, yoga studio

**Primary intent:** `book`

**Secondary intent:** `call`

**Likely upgrades:** Online booking, memberships/packages, class schedule, intake forms, saved payment methods

**Jony note:** Energy without intimidation. The owner should look capable, not loud.

**Approval status:** Approved by Jony + Steve + Shawn. Fitness should create energy and make the first visit feel possible, not intimidating.

---

## 7. Beauty

**Primary job:** Show transformation, taste, pricing clarity, and easy booking.

**Section order:** `hero` -> `portfolio` -> `services_pricing` -> `team_expertise` -> `reviews` -> `final_cta`

**Required onboarding fields:**
- Services and starting prices
- Booking method
- Hours and location
- Provider model: solo artist, small team, or clients choose a specific provider
- Stylist/barber/specialist names, optional
- Products used, optional

**Sub-industry choices:** barber, hair salon, nail salon, manicure, pedicure, esthetician, lashes, makeup, beauty store

**Preferred photo tags:** general, barber, manicure, pedicure, beauty store

**Primary intent:** `book`

**Secondary intent:** `call`

**Likely upgrades:** Online booking, provider/artist profiles, deposits, service menu, gift cards, client contact history

**Branch: Solo artist/provider**
- Starting prices should be visible.
- Portfolio comes before services.
- One booking CTA is enough.

**Branch: Multi-provider salon/studio**
- Provider/artist profiles matter.
- Booking should support choosing a specific person.
- Guest/contact memory matters.

**Jony note:** The work sells the service. Put proof before explanation.

**Approval status:** Approved by Jony + Steve + Shawn. Beauty shows proof first, starting prices clearly, and supports solo or multi-provider booking.

---

## 8. Automotive

**Primary job:** Prove honesty, competence, and fast turnaround.

**Section order:** `hero` -> `trust_strip` -> `services` -> `process` -> `reviews` -> `hours_location` -> `final_cta`

**Required onboarding fields:**
- Certifications
- Services offered
- Makes/models served, optional
- Warranty or guarantee
- Drop-off or appointment process
- Hours and location

**Sub-industry choices:** auto repair, detailing, tires, oil change, body shop, mobile mechanic, car audio

**Preferred photo tags:** general

**Primary intent:** `book`

**Secondary intent:** `call`

**Likely upgrades:** Service booking, estimate approval, deposits, invoices/receipts, customer vehicle history

**Jony note:** No gimmicks. Clear beats clever. The customer wants to know they will not get taken advantage of.

**Approval status:** Approved by Jony + Steve + Shawn. Automotive should feel honest, competent, and calm under pressure; fixed pricing is not required during onboarding.

---

## 9. Pet Services

**Primary job:** Prove gentle care, safety, and affection.

**Section order:** `hero` -> `comfort_promise` -> `services` -> `gallery` -> `reviews` -> `process` -> `final_cta`

**Required onboarding fields:**
- Animal types served
- Services offered
- Appointment/drop-off process
- Safety or comfort practices
- Hours and location if appointment-based
- Optional pricing

**Sub-industry choices:** pet groomer, dog walker, pet sitter, boarding, trainer, mobile grooming

**Preferred photo tags:** general, pet groomer

**Primary intent:** `book`

**Secondary intent:** `call`

**Likely upgrades:** Online booking, pet profiles, vaccine records, reminders, client contact history

**Jony note:** Warm, not childish. Owners trust people who respect their pets.

**Approval status:** Approved by Jony + Steve + Shawn. Pet services should feel gentle and professional; the owner is caring for a family member.

---

## 10. Cleaning

**Primary job:** Show reliability, clarity, and relief.

**Section order:** `hero` -> `services` -> `process` -> `trust_strip` -> `reviews` -> `service_areas` -> `final_cta`

**Required onboarding fields:**
- Residential, commercial, or both
- Cleaning types
- Supplies included? yes/no
- Recurring service available? yes/no
- Service areas

**Sub-industry choices:** home cleaner, commercial cleaner, move-out cleaning, deep cleaning, window cleaning, carpet cleaning

**Preferred photo tags:** general, home cleaner, commercial cleaner

**Primary intent:** `quote`

**Secondary intent:** `call`

**Likely upgrades:** Recurring plans, quote approval, deposits, invoices/receipts, client contact history

**Jony note:** Keep it precise. The feeling is relief: "they will handle it."

**Approval status:** Approved by Jony + Steve + Shawn. Cleaning should feel reliable, clear, and efficient; fixed pricing is not required during onboarding.

---

## 11. Landscaping

**Primary job:** Show transformation and local outdoor expertise.

**Section order:** `hero` -> `portfolio` -> `services` -> `process` -> `service_areas` -> `reviews` -> `final_cta`

**Required onboarding fields:**
- Services offered
- Design/install/maintenance split
- Service areas
- Free estimates? yes/no
- Local plant/material expertise, optional

**Sub-industry choices:** landscaping, lawn care, hardscaping, pavers, tree trimming, irrigation, outdoor lighting

**Preferred photo tags:** general, hardscaping, paver, tree trimmer, tree grooming

**Primary intent:** `quote`

**Secondary intent:** `call`

**Likely upgrades:** Project quote/deposit, shared project gallery, invoices/receipts, maintenance plans, client contact history

**Jony note:** Lead with visual transformation. The customer should imagine their own yard improved.

**Approval status:** Approved by Jony + Steve + Shawn. Landscaping leads with transformation, then makes the estimate path obvious; fixed pricing is not required during onboarding.

---

## 12. Real Estate

**Primary job:** Build personal trust, capture leads, and help the agent/investor stay in front of contacts.

**Section order:** `hero` -> `trust_strip` -> `services` -> `featured_collection` -> `process` -> `reviews` -> `final_cta`

**Required onboarding fields:**
- Role: agent, investor, property manager, team, or brokerage
- Brokerage/agency name if applicable
- License/compliance info if applicable
- Markets served
- Buyer, seller, investor, property management, or commercial focus
- Preferred lead type

**Sub-industry choices:** residential agent, real estate investor, property manager, commercial agent, land/lots agent, new agent/personal brand, team/brokerage office

**Preferred photo tags:** general, professional, home, neighborhood, property, agent

**Primary intent:** `call`

**Secondary intent:** `contact`

**Likely upgrades:** Relationship automation, buyer/seller lead forms, investor deal intake, featured property showcase, email/text follow-up, custom domain, compliance fields

**Jony note:** This is personal brand and relationship memory, not Zillow, IDX, MLS, transaction management, or GoHighLevel.

**Template decision:** No new visual template yet. Use the existing layout system first; Real Estate gets a distinct section manifest.

**Approval status:** Approved by Jony + Steve + Shawn as the 12th industry. CoachJohnRealEstate.com is the reference customer. No IDX/MLS in the first version.

---

## Angela's Onboarding Change

Add Q2.5 after Q2:

**Question text:** "What kind of [business] is it?"

The choices should be friendly and industry-specific. Do not expose internal category names like `home_services` or `pet_services` to the owner.

Examples:

- Food: Smoothie shop, Food truck, Restaurant, Bakery, Catering
- Beauty: Barber, Nail salon, Hair salon, Esthetician, Beauty store
- Events: Weddings, Balloon decor, Party rentals, Venue, Photography

This one answer is saved as `companies.sub_industry` and sets:

- sub-industry
- preferred photo tags
- section manifest
- Claude prompt context
- possible extra questions

---

## Craig's Implementation Plan

After approval:

1. Create `src/lib/industryManifests.ts`.
2. Define strongly typed section IDs, intent values, and manifest objects.
3. Add `companies.sub_industry` as a real stored field.
4. Update onboarding to ask Q2.5 after Q2.
5. Use manifest data to choose sections, preferred photo tags, and generated copy context.

Do not build a visual section builder. Found is not drag-and-drop.

---

## Open Decisions

- Which extra fields belong in `website_config` versus a future `industry_details` object?
- Which contact fields are required for the lightweight contact database?
- Which upgrades are one-time setup fees versus monthly add-ons?

---

## Approved Meeting Decisions - June 4, 2026

**Pricing during onboarding**
- Beauty: ask for starting prices.
- Food: ask for menu prices if they have them.
- Wellness: optional for solo providers; visible pricing for multi-provider spa/studio businesses.
- Fitness: optional class/session/membership prices only.
- Home services, landscaping, cleaning, automotive: do not ask for fixed pricing during onboarding.

**Hours and location**
- Required for visit-based businesses: food, retail, beauty, wellness, fitness, automotive, pet services.
- Optional for service-area or appointment-first businesses: home services, landscaping, cleaning, events.

**Testimonials**
- Optional for every industry. Never block launch.

**Contacts**
- Phase 2: create/update contact records from leads and onboarding flows.
- Phase 3: build fuller contact dashboard and follow-up tools.

---

## Approval Status

Draft status: 12 industry manifests approved by Shawn on June 4, 2026.

Approved: Q2.5 sub-industry question and real `companies.sub_industry` field.

Jony leads. Steve approves. Craig builds only after the manifest is accepted.
