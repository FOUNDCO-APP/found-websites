# DESIGN_DECISIONS.md — Found Co. Visual & UX Decisions
### Jony Ive's approved design system. Every decision with the reasoning.
### New AI: do not override these without Jony explicitly reopening the decision. These are locked.

---

## July 8, 2026 - Found HQ Visual System

**Status:** APPROVED by Shawn. Jony led visual direction.

- Found HQ uses a quiet neutral charcoal foundation; green is reserved for primary actions and success.
- Amber communicates warnings, blue communicates setup information, and red is reserved for errors.
- Mobile navigation is limited to four stable destinations.
- Operator screens favor compact rows, restrained panels, and information density over oversized cards.
- Shared controls use consistent 7-8px radii, spacing, typography, badges, and interaction states.
- Detail views retain an obvious close or return action.
- Specialist tools inherit the shared Found HQ shell without changing their working behavior.

---

## PUBLIC ESTIMATE PAYMENT: BRANDED TO THE FOUND CLIENT, NOT TO FOUND (APPROVED — July 7, 2026)

**The post-payment confirmation on a public estimate must feel custom to the Found client's own business — their logo, their color, their customer — not a generic Stripe or generic Found moment.**
Approved by: Shawn + Steve Jobs + Jony Ive + Craig Federighi

Shawn tested a real payment end-to-end and found two things: the payment step felt generic, and the confirmation afterward was a thin "Estimate Accepted / Thank you" that didn't match the quality of the moment. Team ruled on both:

**Payment method choice stays open.** `automatic_payment_methods` stays enabled — Cash App, Klarna, and similar rails are not restricted to card/bank only. Reasoning: it's the Found client's *own customer* paying, and that customer may only have Cash App, or may prefer a buy-now-pay-later option for a large job. Removing payment methods to make our UI look cleaner would cost a real client a real payment. This is a deliberate reversal of an earlier draft recommendation to restrict to card + bank only — do not re-propose that without new information.

**The confirmation must be permanent and rich, not transient and thin.** Payment breakdown (amount paid, balance due at completion) previously only existed in a 2.2-second animated state before decaying into a bare "Thank you, we'll be in touch" — meaning anyone who left the page (including via an external payment redirect like Klarna) and came back saw the weaker version. The confirmation state is now the same rich content permanently: the client's own logo/name, a bigger branded success moment using their actual brand color, and the real payment numbers. Implemented in `src/app/[slug]/q/[id]/AcceptButton.tsx`.

Why: every Found client's public-facing moments — including the ones Found itself builds, like this payment flow — should look like *their* business built it, not like a shared SaaS tool with their color swapped in. That's the same principle behind why generated client websites use each business's own branding throughout.

---

## ESTIMATE REQUEST: THE NEXT ACTION IS NEVER MORE THAN ONE TAP AWAY (APPROVED — July 6, 2026)

**An Estimate Request is a task, not a passive contact record. "Create Estimate" must never require more effort to find than the record itself.**
Approved by: Shawn + Steve Jobs + Jony Ive + Angela Ahrendts + Craig Federighi

Shawn manually added himself as a test Estimate Request and described feeling lost afterward — no guidance toward the obvious next step. Separately, even an incoming (website-submitted) Estimate Request required opening the full detail sheet just to find the "Create Estimate" button buried among other info.

**The rule:**
- **Manual entry** — the moment an owner finishes typing in a new Estimate Request, that's peak intent. Don't return them to a flat list silently. Ask directly: "[Name] added. Create an estimate for them now?" with a clear CTA and a quiet "Not yet" to dismiss.
- **Incoming leads** — do not force-interrupt the owner the moment a request arrives; they may want to review or call first. Instead, surface "Create Estimate" directly on the list row itself (not only inside the detail sheet), so it's visible without an extra click, but doesn't demand immediate action.
- **Temperature question** — reworded from a form-field label ("Temperature") to an actual question ("How hot is this lead?"), and moved to the last question before Save, not the first thing the owner sees.

Why: the owner shouldn't have to hunt for the one thing a given record exists to do. Manual entry and incoming leads get different treatment because they represent different owner intent at that moment — self-directed action vs. something that just arrived. Implemented in `src/app/dashboard/(app)/leads/page.tsx`.

---

## DASHBOARD HOME: BUTTONS OUTRANK INFORMATIONAL CARDS (APPROVED — July 5, 2026)

**The four core action tiles (Camera, Share My Site, My Contacts, Edit My Site) sit near the top of Home, right after the greeting/status line. Only genuinely urgent content (the new-lead alert) is allowed to appear above them.**
Approved by: Shawn + Steve Jobs + Jony Ive + Craig Federighi + Angela Ahrendts

**What changed:**
- The welcome-state hero card ("You're Live" + "Share your site." headline + full paragraph + big button) duplicated the "Share My Site" quick-action tile directly below it — same action, twice, on one screen. Shrunk to a quiet status line (pill + one sentence), matching the same restrained treatment the "All caught up" state already used. No button — the one real Share action lives in the tile grid.
- The "Business Tools Ready" nudge card moved from *above* the buttons to *below* them. It's an informational one-time announcement, not a tool the owner needs to act on — it should never outrank the actual tools.
- The Share tile's subtitle changed from "Send your link" to "Get more leads" — benefit-first, not mechanical.

**The rule going forward:** on Home (and any dashboard screen that composes a status area + action tiles + optional informational cards), action tiles are the anchor near the top. New informational/nudge cards get added *below* the tiles, never above, unless the content is genuinely urgent (a new lead, not a feature announcement). If a screen ever overflows one viewport, it should be the informational content that requires scrolling — never the core actions.

Why: Shawn's own framing — "our buttons should always be closer to the top unless there's something very important that needs to be at the top." A business owner opens Found to do something (shoot a photo, share the site, check a contact, edit the site); a one-time nudge about a feature being turned on is not that. Related: see the July 5 scroll-as-safety-net decision above, which this builds on directly. Implemented in `src/components/dashboard/HomeClient.tsx`.

---

## DASHBOARD HOME: SCROLL IS A SAFETY NET, NOT A REDESIGN (APPROVED — July 5, 2026)

**Home may scroll when content overflows one screen. It must not hard-clip content.**
Approved by: Shawn + Steve Jobs + Jony Ive + Craig Federighi

Home was originally built as a fixed-height, `overflow: hidden` container with a flexible spacer, so a fixed set of content (greeting + one alert state + quick actions + row 2 tiles) always filled exactly one screen with no scroll. That broke the first time additive content (the Business Tools nudge card) didn't fit the fixed budget — Row 2 got pushed off-screen with nothing to scroll to, and touch just rubber-banded back to hiding it.

**The rule going forward:** Home's container uses `minHeight`, not a fixed `height`, and never `overflow: hidden`. When content is short (the common case today), it still fills exactly one screen with no visible scroll — same feel as before. When a legitimate card pushes past one viewport, the page flows and scrolls instead of silently clipping content. Do not re-add a fixed-height/no-scroll trap to Home or any other dashboard screen that composes optional cards — the content set will keep growing, and a hard-clipped layout breaks every time a new card doesn't fit.

Why: Shawn found this live on a new Business-plan account — could only see half the "My Contacts" row, and scrolling bounced back instead of revealing the rest. The single-screen goal for Home is still right; the *enforcement mechanism* (hard clipping) was wrong. Implemented in `src/components/dashboard/HomeClient.tsx`.

---

## ESTIMATE BUILDER SHELL: FLOWING SURFACE, NOT CARD-STACK (APPROVED — July 3, 2026)

**The five estimate builder steps (Customer, Job, Work, Price, Review) do not each live in their own bordered/tinted box.**
Approved by: Shawn + Steve Jobs + Jony Ive

Boxes-within-a-page reads as tight and cheap, not Apple-quality. Sections flow as one continuous surface, separated by hairline dividers and generous vertical spacing — the quiet step number + title is the section anchor, not a card wrapper. Line-item rows and the "Add work" composer keep their own contained treatment (that's normal list/modal affordance, not clutter) — the ban is specifically on wrapping whole primary sections in their own card.

**The top progress indicator must be real, not decorative.** It reflects actual scroll position via scroll-spy (`IntersectionObserver`), and tapping one jumps to that section. A progress indicator that doesn't move is worse than no progress indicator — don't ship a static/hardcoded "active step" again.

Why: Shawn's exact words on the previous version — "wrappers inside wrappers... losing white space... it doesn't even move through the top pills." Verified as literal code bugs (hardcoded `index === 0`, non-interactive `<div>`s, five separate `sectionStyle` card wrappers) and a compositional choice, not subjective taste. Implemented in `src/app/dashboard/(app)/estimates/page.tsx`.

Related: see `DECISIONS.md` [2026-07-03] for the sitewide font fix that shipped alongside this.

---


## ESTIMATE BUILDER JONY REMODEL: QUIET PROGRESS RAIL (APPROVED - July 3, 2026)

**The estimate builder should not use large top step pills or a heavy sticky title block.**
Approved by: Shawn + Jony Ive

The previous flowing-surface pass fixed real bugs, but the composition still felt like software: too much chrome, too many bordered controls, and a title block that consumed the screen. Jony's approved direction is a calmer full-screen workspace: a small `New estimate` header, one quiet current-step label, a five-segment progress rail, flowing sections, and the work composer as the only intentionally contained area.

**Rules:**
- Keep the Customer -> Job -> Work -> Price -> Review flow.
- Progress must remain real: scroll-spy plus tap-to-jump.
- Use a rail/line treatment for progress, not pill buttons.
- Section anchors use quiet step numbers (`01`, `02`) plus clear titles, not green numbered bubbles.
- The sticky header must stay compact enough that it does not dominate the mobile screen.
- Builder visual changes must not touch estimate persistence, public payment, receipt, or Stripe behavior.

Why: Shawn approved Jony's recommendation to stop patching individual borders and remodel the estimator shell. The owner should feel like they are moving through one calm work surface, not managing a database UI.

---

## SUB-INDUSTRY SECTION LABEL SYSTEM (APPROVED — June 10, 2026)

**Hardcoded section labels are banned. Every section header reads from the sub-industry vocabulary table.**
Approved by: Shawn + Jony Ive + Steve Jobs

"What We Do", "Our Services", "Who We Are", "What Clients Say" are generic and unacceptable. Every sub-industry has its own vocabulary. The templates must use it.

**The banned hardcoded strings (never use these again):**
- "What We Do" — replaced by sub-industry servicesLabel
- "Our Services" — replaced by sub-industry servicesLabel
- "Who We Are" — replaced by sub-industry aboutLabel
- "What Clients Say" — replaced by sub-industry reviewsLabel
- "Our Gallery" — replaced by sub-industry galleryLabel
- "Client Stories" — replaced by sub-industry reviewsLabel

**Sub-industry section label examples — what replaces them:**

| Sub-Industry | Services label | Gallery label | About label | Reviews label |
|---|---|---|---|---|
| Barber | Services & Pricing | Fresh Cuts | About the Shop | What Clients Say |
| Lash Tech | Lash Services | The Work | About Me | Client Reviews |
| Spa | Our Treatments | The Space | Our Philosophy | Client Stories |
| Nail Salon | Services & Pricing | The Work | About the Studio | Client Reviews |
| Restaurant | The Menu | The Food | Our Story | What People Say |
| Food Truck | What's Good | The Food | The Truck | What People Say |
| Home Baker | What We Make | The Goods | Our Story | What Customers Say |
| Private Tutor | Subjects & Rates | Student Results | About Me | Parent Reviews |
| Musician / Band | Sets & Packages | Listen | About the Band | What People Say |
| Landscaper | What We Do | Recent Projects | About Us | Client Stories |
| Pet Groomer | Grooming Services | Happy Clients | About the Shop | Pet Parent Reviews |
| Real Estate Agent | How I Help | Featured Properties | About Me | Client Stories |
| Graphic Designer | Services | The Work | About Me | Client Stories |
| Personal Trainer | Programs & Rates | Client Results | My Approach | Client Stories |
| Contractor | What We Build | Our Work | Who We Are | What Clients Say |
| Cleaner | What We Clean | Before & After | How We Work | Client Stories |

Full vocabulary table covers all ~120 sub-industries. New sub-industries added as industries expand.

**Implementation rule for Craig and Marcus:**
Every layout template reads section labels from `company.sub_industry → vocabularyTable[subIndustry]`. If no match, fall back to the industry-level default. If no industry default, use the safe generic. The templates should have zero hardcoded section header strings.

**Tone rule for Jony:**
Section labels should match the business personality. A spa says "Our Treatments" — not clinical, not cute. A barber says "Fresh Cuts" — direct, confident. A tutor says "Subjects & Rates" — practical, parent-focused. Every label should feel like the owner chose it themselves.

---

## OWNER COPY EDITING UX (APPROVED CONCEPT — Phase 3)

Tap-to-edit must feel like texting, not like using a website builder.
Approved by: Shawn + Jony Ive + Angela Ahrendts + Steve Jobs

**Rules:**
- Tap any text → inline edit field appears in place. No modal. No drawer. No settings menu.
- Type new text → tap away or press Enter → saved immediately.
- Section titles, hero headline, hero subtitle, about text, service names, service descriptions — all editable.
- Section order, page structure, layout type — NOT editable. Owner edits words, not architecture.
- "Regenerate with AI" appears as a subtle option per section — tapping it sends that section to Claude for a rewrite using the owner's original onboarding answers.
- Changes save to `website_config` in Supabase in real time. Site reflects instantly.

**What it is NOT:**
- Not a drag-and-drop builder.
- Not a CMS dashboard.
- Not a settings panel.
- Not a way to delete sections.
- Not a way to add new section types.

---

## THE STANDARD

Every Found website must look like Apple built it.
Clean. Minimal. Intentional. Nothing unnecessary.
If it needs a tutorial, it is too complicated.
If it would embarrass Apple, it does not ship.

---

## FOUND BRAND IDENTITY (APPROVED — June 6, 2026)

Found is **Pure Studio with a Signal Green heartbeat**.

The Found product experience should feel like a quiet black-and-white product stage. The generated client website is the product being revealed, so Found must not compete with client colors. Signal Green is used only when something becomes active, live, found, or ready.

**Core palette:**

| Role | Hex | Usage |
|---|---|---|
| Found Black | #080A09 | Primary product background, cinematic reveal surface |
| Found White | #FFFFFF | Primary type and clean surfaces |
| Soft Surface | #F5F7F4 | Light studio surfaces and device interiors |
| Quiet Gray | #8A918B | Muted supporting text and secondary UI |
| Signal Green | #32D074 | CTA, live indicator, success, reveal, "Found it" |
| Deep Green | #0E3B24 | Dark green depth, never as broad decoration |

**Rules:**
- Do not make Found a green brand. Found is black, white, and quiet.
- Signal Green means action or reveal. It is not a background theme.
- Client site colors belong to the client. Found UI should not fight them.
- Do not imitate Apple's palette. Imitate Apple's restraint.

**Logo direction:**
- Primary mark: refined uppercase `FOUND` wordmark.
- Avoid map pins, magnifying glasses, sparkles, and generic SaaS icons.
- The `O` may be explored as a subtle discovery/reveal detail, but the plain wordmark remains the baseline.

---

## VIBE SYSTEM (APPROVED — May 29, 2026)

Four vibes. Each is a complete, self-contained design language.
The owner selects their vibe during onboarding. It drives fonts, radius, shadows sitewide.

### BOLD
- Heading font: Oswald
- Body font: Inter
- Card radius: 10px
- Button radius: 6px
- Card shadow: 0 4px 14px rgba(0,0,0,0.12)
- Best for: contractors, roofers, construction, automotive, fitness
- Feel: strong, confident, no-nonsense. This business gets the job done.

### CALM
- Heading font: Playfair Display
- Body font: Lato
- Card radius: 24px
- Button radius: 50px (pill-shaped)
- Card shadow: 0 2px 8px rgba(0,0,0,0.06)
- Best for: wellness, beauty, spa, aestheticians, meditation, therapy
- Feel: soft, elevated, unhurried. Trust is built through refinement.

### MODERN
- Heading font: Space Grotesk
- Body font: DM Sans
- Card radius: 6px
- Button radius: 4px (near-flat)
- Card shadow: 0 1px 4px rgba(0,0,0,0.08)
- Best for: creative businesses, events, retail, tech-adjacent services
- Feel: sharp, contemporary, editorial. Forward-thinking.

### WARM
- Heading font: Merriweather
- Body font: Source Sans
- Card radius: 20px
- Button radius: 50px (pill-shaped)
- Card shadow: 0 2px 10px rgba(0,0,0,0.08)
- Best for: food, restaurants, family businesses, friendly home services
- Feel: approachable, trustworthy, community-rooted. You know these people.

---

## LAYOUT MATRIX (APPROVED — May 29, 2026)

Industry × Vibe = Layout type. Every combination is a deliberate decision.

| Industry | Bold | Calm | Modern | Warm |
|---|---|---|---|---|
| Home Services | Impact | Impact | Cinematic | Portrait |
| Wellness | Cinematic | Editorial | Editorial | Portrait |
| Food | Portrait | Portrait | Cinematic | Portrait |
| Events | Cinematic | Editorial | Cinematic | Cinematic |
| Retail | Portrait | Editorial | Cinematic | Portrait |
| Fitness | Impact | Cinematic | Cinematic | Impact |
| Beauty | Cinematic | Editorial | Editorial | Portrait |
| Automotive | Impact | Impact | Cinematic | Portrait |
| Pet Services | Portrait | Editorial | Editorial | Portrait |
| Cleaning | Impact | Editorial | Cinematic | Impact |
| Landscaping | Impact | Portrait | Cinematic | Portrait |

### Layout Type Definitions

**IMPACT**
Full-bleed hero. Bold type dominates. Heavy contrast. Commands attention immediately.
For businesses that need to say "we are here" before anything else.
Barrio Builders = Home Services + Bold = Impact.

**EDITORIAL**
Generous white space. Refined typography. Quieter hero — the words carry the weight.
For businesses that sell trust, expertise, and calm authority.

**PORTRAIT**
Photography-forward. Large imagery leads. Work is shown before words.
For businesses whose best argument is a photo of what they've done.

**CINEMATIC**
Video-ready hero. Dramatic scale. Immersive. Designed to hold still photos at full bleed
or video with the same grandeur.
For businesses with strong visual identity and atmosphere to sell.

---

## COLOR SYSTEM (APPROVED — May 29, 2026)

**Primary color** drives everything: CTA buttons, overlines, icon strokes, card borders, section accents, active nav states, link hover states, section divider bars.

**Fixed palette (never changes between clients):**
- Dark sections background: #111111 (near-black — NOT pure #000000)
- Light sections background: #f7f7f7 (off-white — NOT pure #ffffff for section bg)
- Card backgrounds: #ffffff (pure white — contrast against #f7f7f7 sections)
- Hero subtitle / body text on dark: #cccccc
- Muted body text on dark: #888888
- Section label subtext on dark: #555555
- Body text on light (primary readable): #333333
- Body text on light (secondary/captions): #776F6F

**Hero gradient (when no photo is provided):**
Generated dynamically from the company's primary color.
- Angle: 155 degrees
- Stop 1 (0%): primary color darkened 88% → near-black tinted with brand color
- Stop 2 (35%): primary color darkened 70% → deep mid-tone
- Stop 3 (70%): #0f0f0f → near pure dark
- Result: every brand gets a dark hero that still feels like *their* brand color

**Dark mode per business (approved concept — not yet built):**
Some businesses live in light. A wellness spa should feel airy, white, open.
A nightclub should feel full dark. The vibe/color system must support both.
Default is dark hero + light body. Full-light and full-dark are upcoming options.

---

## TYPOGRAPHY (APPROVED — May 29, 2026)

### BrandMark — the typography logo
When the owner has no logo, their business name IS the logo.
This is not a placeholder. It is a deliberate, premium design choice.
- Weight: font-black (900)
- Transform: uppercase
- Letter spacing: 0.12em
- On light backgrounds: primary color
- On dark backgrounds: white
- Must look premium at all sizes — navbar (h-9 equivalent), footer, mobile menu

### Overline labels (section eyebrows above headlines)
The detail that separates premium from generic.
- Size: xs (0.75rem)
- Weight: font-black (900)
- Transform: uppercase
- Letter spacing: tracking-widest
- Color: primary color
- Examples: "WHAT WE DO" / "CLIENT STORIES" / "TUCSON'S OWN" / "LOCAL & INDEPENDENT"

### Hero headline
- Size: text-5xl mobile → text-7xl → text-8xl desktop
- Weight: font-black (900)
- Color: white
- Leading: none (tight — intentional, confident)
- Max width: max-w-4xl (it must breathe but not sprawl)
- Font: controlled by vibe (--font-heading CSS var)

### Section headlines
- Size: text-4xl → text-5xl desktop
- Weight: font-black (900)
- Color: #111111 on light sections, white on dark sections
- Font: controlled by vibe

---

## BUTTON SYSTEM (APPROVED — May 29, 2026)

**Global .btn class — applied to every button sitewide:**
- Weight: 900 (font-black)
- Text: uppercase, letter-spacing 0.1em
- Font size: 0.75rem
- Padding: 14px 28px
- Border: 2px solid (always — even filled buttons have a border for structure)
- Border radius: controlled by vibe (--button-radius CSS var)
- Hover: opacity drops to 0.85, 0.15s ease transition
- No box-shadow on buttons (the border carries the weight)

**Primary CTA:** background = primary color, border = primary color, text = white
**Ghost / secondary:** background = transparent, border = rgba(255,255,255,0.35) on dark, text = white

---

## SECTION LAYOUT (APPROVED — May 29, 2026)

**Vertical rhythm:**
- Dark sections: py-28 (112px top/bottom)
- Light and white sections: py-24 (96px top/bottom)
- Hero section: min-h-[96vh] (nearly full viewport)

**Horizontal container:**
- Max width: max-w-6xl
- Horizontal padding: px-8
- Centered: mx-auto

**Section divider accent bar:**
- Width: 3rem (48px) — not too thin, not too thick
- Height: 4px — 1px is invisible, 4px is just right
- Color: primary color
- Placement: above headline on dark sections, replaces the overline when used

---

## COMPONENT DECISIONS (APPROVED — May 29, 2026)

### Service Cards
- Background: white
- Left border: 4px solid, primary color
- Border radius: right corners only — `0 [cardRadius] [cardRadius] 0`
- Shadow: vibe cardShadow
- Padding: p-8
- Service icon: 24px SVG, stroke style (not filled), primary color, strokeWidth 1.75
- Service name: font-black, #111111, heading font
- Description: text-sm, leading-relaxed, #776F6F

### Testimonial Cards
- Background: #f7f7f7
- Top border: 4px solid, primary color
- Border radius: bottom corners only — `0 0 [cardRadius] [cardRadius]`
- Padding: p-10
- Quote: italic, text-lg, #333333
- Name: font-black, text-sm, uppercase, tracking-wide, #111111
- Role: text-xs, #776F6F

### Service Icon Library
Custom SVG icon system — stroke style, 1.75 strokeWidth, primary color.
Covers: roofing, painting, electrical, plumbing, remodeling, hvac, construction,
windows, flooring, insulation, landscaping, cleaning, wellness, beauty, events,
retail, food, fitness, pet services.
Fallback: star/sparkle icon for anything unmatched.
Icons are matched by keyword detection in the service name — not manual assignment.

---

## NAVIGATION (APPROVED — May 29, 2026)

### Desktop Navbar
- Position: sticky top-0, z-50
- Background: white
- Border: 1px solid #f0f0f0 (bottom only — barely visible, just enough)
- Structure: logo left | nav center | phone + CTA right
- Nav links: text-xs, font-medium, uppercase, tracking-wide
- Active link color: primary color. Inactive: #999999
- Phone number: shown with phone SVG icon in primary color, font-black
- CTA button: primary color background

### Mobile Menu — TWO VERSIONS (APPROVED — June 1, 2026)

The mobile menu is vibe-aware. Bold/Modern get the dark overlay. Calm/Warm get the white panel. These are completely different experiences.

**Bold / Modern vibe (e.g. Barrio Builders):**
- Full-screen dark overlay (#111111)
- Left border: 3px solid primary color
- Animation: slides in from right, 320ms cubic-bezier(0.4, 0, 0.2, 1)
- Nav items numbered: 01, 02, 03... (xs, font-black, primary color)
- Item text: text-3xl, font-black, white, heading font
- Items separated by border-b border-white/10
- Hover: item indents slightly (hover:pl-2)
- Phone + CTA button anchored to bottom

**Calm / Warm vibe (e.g. Blue Luna Events):**
- Full-screen white panel
- Left border: 2px solid primary color
- Same slide-in animation
- Nav items: text-2xl, font-bold, italic heading font, dark (#333333)
- Active item: primary color
- Items separated by border-b in #f5f5f5
- Header has subtle bottom border
- Phone + CTA button anchored to bottom with top border separator

### Logo Sizing System (APPROVED — June 1, 2026)

Logos come in all shapes — wide, tall, square. A fixed height breaks wide logos.
The correct system uses `maxHeight + maxWidth + object-contain` so any logo fits correctly.

| Location | Max height | Max width |
|---|---|---|
| Desktop navbar | 48px | 180px |
| Calm/warm mobile menu | 64px | 220px |
| Bold/modern mobile menu | 56px | 200px |

`object-contain` always preserves aspect ratio. Never crop. Never distort.
`w-auto` lets the image fill to maxWidth naturally.

### BrandMark Name Length System (APPROVED — June 1, 2026)

When there is no logo, the business name renders as the BrandMark.
Long names must scale down automatically — never overflow the navbar.

| Name length | Font size | Letter spacing | Weight |
|---|---|---|---|
| > 20 chars | text-base | tracking-wide | Bold for calm, Black for bold |
| 15–20 chars | text-lg / text-xl | tracking-wider | Same |
| < 15 chars | text-2xl / text-3xl | tracking-[0.12em] | Same |

Calm/warm vibes use font-bold (700). Bold/modern use font-black (900).

---

## FOOTER (APPROVED — May 29, 2026)

- Background: #111111
- Three-column grid: Brand | Quick Links | Contact
- Brand column: logo or BrandMark, city/state tagline, social icons
- Accent divider (3rem × 2px) at top of footer content
- Social icons: Instagram, Facebook, TikTok, LinkedIn — 18×18px SVG fills, #888888
- Bottom bar: copyright left, "Built with Found" link right

**"Built with Found" badge — pending Jony redesign:**
Current: small gray text. This is not acceptable long-term.
Every client site is a billboard for Found Co. The badge must be something owners
are proud to display — not something they want to remove.
Redesign required before public launch.

---

## SEO (APPROVED — May 29, 2026)

Auto-generated from company data on every page load. Owner never touches this.

- JSON-LD LocalBusiness schema (name, phone, email, address, services, service areas)
- JSON-LD FAQPage schema (auto-generated questions from business data)
- OG tags: title, description, image (logo if available)
- Twitter card summary
- Canonical URL: [slug].foundco.app or custom domain
- Page title template: `[Company] — [City] — [Services]`
- Meta description: hero subtitle or auto-generated from city + services

---

## SECTION RHYTHM RULE (APPROVED — May 31, 2026)
### This is foolproof. It applies to every Found client. No exceptions.

**The rule: photos get exactly two reserved slots per page — the header and the final CTA. Every section in between uses a solid background (white, light gray, or solid dark #111111). Never a photo.**

This prevents any two photo sections from sitting adjacent to each other and competing.

**Per-page rhythm:**

| Page | Section order |
|---|---|
| **All inner pages** | Photo header → White/Light content sections → Solid dark mid-sections → Photo CTA |
| **Homepage only** | Photo hero → Light (services) → Photo (about strip) → White (testimonials) → Photo (CTA) |

The homepage earns a third photo slot (about strip) because two clean sections separate it from the next photo. This is the only exception and it is locked.

**Implementation rules for Craig and Marcus:**
- `img()` calls are only permitted in: page headers and final CTA sections
- Mid-page dark sections use `backgroundColor: "#111111"` — never a photo background
- Mid-page light sections use `backgroundColor: "#f7f7f7"` — never a photo background
- If you are tempted to add a photo to a mid-page section, don't. Bring it to Jony first.

**Why:** Contrast creates impact. A photo section hits harder after a clean section. Two photo sections in a row cancel each other out — the eye stops reading either as special.

---

## EDITORIAL LAYOUT (APPROVED — June 1, 2026)
*For: wellness + calm, beauty + calm, beauty + modern, events + calm, pet services + calm/editorial*

Editorial must feel like opening a different magazine from Impact. Same platform — nobody should be able to tell.

**Section order (different from Impact):**
Hero → About statement → Services (luxury menu) → Testimonials (pull quotes) → CTA

**Hero — magazine cover split:**
- Full viewport height (min-h-screen)
- Left 45%: pure white, italic Playfair headline (text-4xl–6xl), overline, accent line, subtitle, pill buttons
- Right 55%: full-height image bleeds to the edge — NO overlay (the white left side provides contrast)
- Mobile: full-width image (h-72) above the text panel — not hidden

**About — centered statement (comes BEFORE services):**
- White background
- About text rendered as a large italic quote in quotation marks (not a paragraph)
- Centered, max-w-3xl
- Primary color divider line + "Meet the Team" CTA below

**Services — luxury menu rows:**
- Warm off-white background (#F9F8F6)
- Each service: icon + italic Playfair name on left, description on right
- Rows separated by thin lines (#E8E6E3), first row has primary color top border (2px)
- No cards. No grid. A menu.
- Shows up to 6 services (not 3 like Impact)

**Testimonials — oversized pull quotes:**
- Warm off-white background (#F9F8F6)
- Oversized decorative quotation mark in primary color (text-8xl, opacity 0.4)
- Quote in italic Playfair, text-2xl–3xl
- Line + name attribution below
- Shows 2 testimonials max — curated, not a grid

**CTA — photo (rhythm rule honored):**
- Photo background (img index 1 from stock pool)
- Custom copy written per layout type: *"Let's Make Something Unforgettable"*
- Same pill button as rest of site

**What Editorial is NOT:**
- Not full-bleed hero
- Not a grid of cards
- Not a dark about section
- Not a numbered mobile menu
- Not Impact with different fonts

---

## MOTION SYSTEM (APPROVED CONCEPT — Not Yet Built)

Subtle arrival animations. Nothing dramatic. Nothing that screams "developer added animations."

- Hero content: fade up on load (opacity 0→1, translateY 16px→0, 400ms ease-out)
- Service cards: stagger in on scroll (50ms delay between each card)
- Section headlines: fade in on scroll (opacity 0→1, 300ms ease-out)
- Page transitions: none (page loads are instant — motion within pages only)

Rule: if you notice the animation, it is too much. The goal is that the site feels alive, not that it performs for you.

---

## GALLERY (APPROVED CONCEPT — Not Yet Built)

- Editorial / masonry layout — NOT a uniform grid
- Full-bleed option for standout images
- Hearted photos (❤️) auto-appear here — no second upload step, no manual refresh
- Portfolio quality — their work should look like it belongs in a design magazine
- Owner's best work at the top (most recently hearted, or manually pinned)

---

## SITE REVEAL MOMENT (APPROVED CONCEPT — Not Yet Built)

After the owner completes onboarding and the site is generated:

- Personal message displayed: "[First name], [Business Name] is live."
- Choreographed transition — not a page load. A moment.
- Full preview of their site shown on a phone/screen mockup
- Primary CTA: "See your site →" (opens actual site in new tab)
- Secondary: "Make changes" (returns to edit mode)

Designed with the same care as an Apple product reveal. This is the moment that sells them forever. It cannot be accidental, generic, or rushed.

---

## JUNE 12, 2026 DESIGN DECISIONS

**[2026-06-12] — Slug availability indicator lives INSIDE the input field (right side), not below it.**
Approved by: Shawn + Jony Ive + Craig Federighi
Why: On iPhone, the virtual keyboard pushes everything below the focused input off screen. A status indicator below the input is invisible on any phone smaller than a Pro Max. The icon must sit inside the input container at the right edge — it scrolls and resizes with the input, sits above the keyboard, and is always visible regardless of screen size.
Implementation: `position: absolute; right: 0; bottom: 0.75rem` inside a `position: relative` wrapper. Icon is 14px. Green checkmark (Signal Green `#32D074`) for available; red ✗ for taken; spinner for in-progress.

**[2026-06-12] — Slug taken state triggers a SlugSheet bottom sheet, not a red message below the input.**
Approved by: Shawn + Jony Ive
Why: Showing "that's taken" with no path forward is a dead end. The sheet presents three pre-verified available alternatives as chips plus a custom text field. Owner taps a chip → advances immediately. Feels like the app is helping, not blocking.
Implementation: `position: fixed; bottom: 0; left: 0; right: 0` — fixed elements sit above the iOS virtual keyboard in Mobile Safari. Scrim is `rgba(0,0,0,0.4)`. Sheet is white with `border-radius: 24px 24px 0 0`. Confirm button is Signal Green full-width. Pre-verified suggestions skip the debounce check; custom typed slugs re-trigger debounce on close.

**[2026-06-12] — Logo on dark backgrounds uses drop-shadow instead of mix-blend-mode:multiply.**
Approved by: Jony Ive
Why: `mix-blend-mode:multiply` flattens light logos against dark backgrounds, turning white logos gray or invisible. Drop-shadow (`0 2px 8px rgba(0,0,0,0.35)`) lifts the logo off the dark surface and makes any logo color legible on dark navbar or dark footer. Multiply is banned on dark surfaces.
Implementation: `filter: drop-shadow(0 2px 8px rgba(0,0,0,0.35))` applied to `<img>` tag when navbar is dark or in footer.

**[2026-06-12] — Dark navbar is always `#111111`. Logo in dark navbar always uses `logo_white_url`. The two-logo system is required for dark nav to work correctly.**
Approved by: Jony Ive + Shawn
Why: A dark business logo disappears on a #111111 navbar. Requiring the white logo variant ensures every dark-navbar site looks intentional. The fallback (dark logo + drop-shadow) is available but inferior — owners should upload the white version.
Implementation: onboarding shows dual logo upload side by side (dark bg preview + light bg preview). Copy: "Upload your logo on dark" / "Upload your logo on light." Both fields optional — the system degrades gracefully to BrandMark if neither is provided.

**[2026-06-12] — Dual-logo preview in onboarding: two live preview tiles side by side — dark background (left) + light background (right).**
Approved by: Jony Ive + Shawn
Why: Owners do not think in terms of "logo for dark" and "logo for light." They need to see both contexts simultaneously to understand why two versions matter. Showing it is faster than explaining it.
Implementation: Two `64px × 180px` preview cards inside the logo upload step. Left card: `#111111` background, uses `logo_white_url` upload target. Right card: `#f5f5f5` background, uses `logo_url` upload target. Each card has its own upload trigger and drag/drop.

**[2026-06-12] — Vibe step in onboarding uses mini navbar mockup tiles, not abstract swatches.**
Approved by: Jony Ive
Why: Abstract tiles (color + name) don't show the owner what their site will actually feel like. A mini navbar chip showing the actual font, weight, and shape of each vibe lets them make a real decision. They see Bold = Oswald, square buttons. Calm = Playfair, pill buttons. Modern = Space Grotesk, flat corners. Warm = Merriweather, pill buttons.
Implementation: 4 tile grid. Each tile: 140×72px card with the vibe's heading font, a one-word sample ("Bold" / "Calm" / "Modern" / "Warm"), and a micro CTA button showing the button radius. Selected tile gets a 2px Signal Green border.

**[2026-06-12] — Welcome email full design system approved. Replaces the previous "YOUR SITE IS LIVE" design entirely.**
Approved by: Shawn + Jony Ive + Angela Ahrendts
Why: The old email had three problems: (1) Heavy uppercase made it look like a system notification, not a premium product. (2) No preheader — email clients showed "FOUND Live now [Name] is live." as preview text, which is garbled and confusing. (3) The three-step section was passive — low contrast, low urgency.

**New design system:**

*Preheader (hidden):*
`display:none` div immediately after `<body>`. Text: `[Name] is live. Your next steps are waiting — open to see them.` Padded with `&nbsp;&zwnj;` repeats to prevent email clients from appending body text to the preview.

*Header:*
`#080A09` (Found Black) background, 48px tall. FOUND wordmark only in white, centered. No "Live now" label. No business name in the header. Clean.

*Hero:*
White background. Business name as large headline (`[Name] is live.`). Period — not an exclamation mark. One green CTA button: `Open [name].foundco.app →`. Signal Green background, font-black, uppercase, no border-radius drama.

*Three steps:*
Numbered 01 / 02 / 03. Each step has a `4px Signal Green left border` accent. Steps: Pin it (add to Home Screen) → Connect your domain → Send it to one person. Each step has a one-line description below the title.

*Footer:*
FOUND wordmark. `hello@foundco.app`. Unsubscribe link. No decorative elements.

*Plain text version:* Updated to match — no all-caps, no garbled structure.

*Subject line:* `[Name] is live.`

**[2026-06-12] — Reveal screen email nudge: a P.S. moment that appears 0.9 seconds after the site URL fades in.**
Approved by: Shawn + Jony Ive + Angela Ahrendts
Why: The reveal moment is about the site — the URL is the climax. The email nudge should not compete with it. Delaying it 0.9s makes it feel like a postscript, not a system message. It acknowledges that email can go to spam without panicking the owner.
Copy: `We sent your next steps to [email]` (white/70, small) + `Don't see it? Check your spam — just this once.` (white/25, smaller).
Implementation: `animation: fade-up 0.6s 0.9s ease-out both; opacity: 0` — starts invisible, plays at 0.9s delay. Envelope icon (white/30) left-aligned with the text block. `email` prop passed from `answers.email` at the call site.

**[2026-06-18] — Dashboard typography system: rem-based, Dynamic-Type-style scale. Preserves Found's existing light/heavy voice. Never goes below 13px / 0.55 opacity for anything meant to be read.**
Approved by: Shawn
Why: Shawn compared the dashboard directly against native iOS system screenshots (Settings, Messages, Calls, Contacts, Clock) and found Found's text sizes, chevron sizes, and contrast dramatically smaller/fainter across the board — worst offender was the bottom tab bar at 8px / 0.25 opacity, smaller than anything else in the app. Root cause wasn't a single bad value, it was that every screen had been hand-tuned with its own one-off pixel guesses with no shared scale.

Solution: one shared file, `src/lib/dashboard/typography.ts`, modeled on Apple's Dynamic Type — a small named set of text styles (largeTitle/title/headline/body/subhead/footnote/caption) that every screen pulls from instead of inventing new pixel values. Built in `rem`, not `px`, specifically so it respects browser zoom and OS-level accessibility text-size settings across iOS/Android/desktop — `rem` is relative to root font-size (confirmed nowhere overridden in this codebase, so it resolves to the standard 16px and scales correctly with accessibility settings); `px` is frozen forever regardless of user settings.

Critically, this is a contrast/size fix, NOT a restyle. `largeTitle` stays light-300 weight, `caption` stays heavy-800 uppercase tracked-out — Found's existing signature voice is untouched. An early draft mistakenly bolded all titles "to match Apple's contrast" and was corrected immediately; weight personality and legibility are separate problems and should be solved separately (see DECISIONS.md June 18 entry).

Scale: largeTitle 2.125rem/300, title 1.5rem/700, headline 1.0625rem/700, body 1.0625rem/400, subhead 0.9375rem/500, footnote 0.8125rem/700, caption 0.8125rem/800-uppercase. Opacity tiers: primary 1 (true white), secondary 0.78, tertiary 0.55 (floor for anything readable), disabled 0.3. Chevrons fixed at 20px (were 14px — visibly smaller than iOS's ~17-20pt list disclosure indicators).

Applied to: Leads, Contacts, Home, DashboardNav (bottom tab bar). NOT yet applied: Site editor, More tab, Photos tab — still have original hardcoded values, next typography task.

**[2026-06-18] — Avatar identity color: deterministic hash-based palette, Apple Contacts/Messages style. Never tied to status fields.**
Approved by: Shawn
Why: see DECISIONS.md June 18 entry for full reasoning. Design rule going forward: avatar/identity color and status color (temperature, in this case) are two separate visual systems and must never share the same UI element. Identity color lives in `avatarColorFor(name)` in typography.ts — 8-color muted/desaturated palette, hashed per name, used consistently across Leads and Contacts avatar circles.

**[2026-07-08] — Found HQ: one admin shell replaces four scattered /admin/* pages. Sticky sidebar (desktop) / bottom nav (mobile), stats home page, no per-tool login screens.**
Approved by: Shawn
Why: Businesses, Photos, Emails, and Copy each had their own copy-pasted login gate and their own "← Admin" breadcrumb pointing at whichever tool happened to be first (`/admin/photos`), with no shared home, no stats, and no single place that felt like "the back end." Shawn asked directly for one official back end with a dashboard and menu to everything.
Implementation: `src/app/admin/layout.tsx` is now the single auth gate for every `/admin/*` route — checks the `admin_key` cookie once, renders the shared `AdminLogin` screen bare if absent, otherwise wraps `children` in `AdminShell` (sidebar nav: Home/Businesses/Photos/Emails/Copy/Sign out). The four existing tool pages were untouched functionally — same components, same server actions — only their now-redundant `redirect("/admin/photos")` and `← Admin` links were repointed at `/admin`. New home page (`src/app/admin/page.tsx`) shows total/active/comp/new-this-week counts, tool cards, and the 6 most recent signups, pulled directly from the same `companies` table other admin tools already read.
Gotcha worth remembering: nesting page content inside a persistent sidebar breaks any assumption a page makes about owning the full viewport. PhotoCurator's own `position:fixed` bottom action bar collided with the new sidebar on both breakpoints — fixed on desktop by giving the sidebar a higher z-index (paints over the bar's left edge instead of the bar painting over the nav), and on mobile by adding a `found-hq-bottom-bar` class the sidebar's media query lifts clear of the bottom nav. A second, more serious bug: the mobile sidebar's `height: 100dvh` (needed for the desktop sticky sidebar) leaked into the mobile breakpoint and silently covered the entire screen with an invisible hit-box, blocking every tap except the nav itself — caught only because a scripted click-through test threw a Playwright "element intercepts pointer events" error; a purely visual check would have missed it since the background color matched the page underneath. Any future full-bleed persistent chrome in this app should assume the same risk and verify with real clicks, not just screenshots.
