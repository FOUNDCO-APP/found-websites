# DESIGN_DECISIONS.md — Found Co. Visual & UX Decisions
### Jony Ive's approved design system. Every decision with the reasoning.
### New AI: do not override these without Jony explicitly reopening the decision. These are locked.

---

## THE STANDARD

Every Found website must look like Apple built it.
Clean. Minimal. Intentional. Nothing unnecessary.
If it needs a tutorial, it is too complicated.
If it would embarrass Apple, it does not ship.

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

### Mobile Menu
- Full-screen overlay — not a drawer, not a dropdown
- Background: #111111
- Left border: 3px solid primary color (signature detail)
- Animation: slides in from right using translateX, 320ms cubic-bezier(0.4, 0, 0.2, 1)
- Nav items numbered: 01, 02, 03, 04, 05 (xs, font-black, primary color)
- Item text: text-3xl, font-black, white, heading font
- Items separated by border-b border-white/10
- Hover: item indents slightly (hover:pl-2, transition-all 200ms)
- Phone number anchored to bottom, primary color, text-xl font-black
- CTA button anchored to bottom, full width

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
