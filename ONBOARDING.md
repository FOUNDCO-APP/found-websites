# ONBOARDING.md — Found Co. Question Flow
### Angela Ahrendts owns this file.
### Every question, exact wording, order, tone guidelines, and branching logic lives here.
### Update this file every time a question is refined. Never let this fall behind the live product.

---

## THE FEELING

This is not a form. This is a conversation.

The owner should feel like they are talking to someone who is genuinely excited about their business. Someone who said "hey, tell me about what you do" and actually wants to hear the answer.

Every question should feel like the natural next thing a curious, interested friend would ask — not a required field, not a step in a process. Just: *I'm listening. Tell me more.*

The owner should answer with enthusiasm. They should feel seen. By the time they finish, they should think — "wow, someone really cared about my business." And then they should see a website that proves it.

---

## TONE GUIDELINES

- Conversational. First person. Warm but never cheesy.
- No corporate language. Never "please enter your." Never asterisks for required fields.
- Short questions. One idea per screen.
- Affirmations between answers — but make them specific, not generic.
  - Bad: "Nice!" / "Great!" / "Awesome!"
  - Good: "A balloon artist in Tucson — people love that." / "Twenty years is serious credibility."
- Never make the owner feel like they are doing paperwork.
- Skip is always a first-class option — never make them feel bad for not having something.

---

## THE QUESTION FLOW

### WELCOME SCREEN
*Before any questions. Sets the entire tone.*

**Headline:** "Let's build your website."
**Subtext:** "I'm going to ask you a few questions. Answer however feels natural — like you're telling a friend about your business."
**CTA button:** "Let's go →"

No logo. No progress bar. Just that message and one button.

---

### Q1 — Business Name
**Question text:** "What's the name of your business?"
**Input type:** Single line text, large font
**Placeholder text:** "e.g. Barrio Builders, Bloom & Co., Maria's Kitchen"
**Why it's first:** Everything that follows is built on the name. It's their identity. Starting here feels right.
**Transition after:** Show their business name back to them warmly. "Love it. Tell me more."

---

### Q2 — What They Do
**Question text:** "What do you do? Tell me in your own words."
**Input type:** Multi-line text. Relaxed. No character counter shown.
**Placeholder text:** "I do roofing and remodeling in Tucson... / I'm a balloon artist for parties and events... / I make custom T-shirts from home..."
**Why:** This is the most important data collection moment in the entire onboarding. Natural language tells us industry, services, tone, and personality all at once. Never replace this with a dropdown.
**Backend use:** Fed to Claude API for content generation. Also used for industry_category detection.

---

### Q2.5 — Sub-Industry
**Question text:** "What kind of business is it?"
**Input type:** Friendly choice cards based on the industry detected from Q2.
**Examples:**
- Food: Smoothie shop, Food truck, Restaurant, Bakery, Catering
- Beauty: Barber, Nail salon, Hair salon, Esthetician, Beauty store
- Events: Weddings, Balloon decor, Party rentals, Venue, Photography
- Wellness: Solo provider, Multi-provider spa, Massage, Yoga studio, Therapy, Wellness coaching
- Home services: Roofing, Painting, Remodeling, Handyman, TV install, Camera install
**Why:** This lets Found choose better photos, sections, copy, and CTAs without making the owner understand the system.
**Critical tone note:** Never show internal labels like `home_services`, `pet_services`, or `sub_industry`.
**Backend use:** Saves `sub_industry` as a real company field. Drives industry manifests, preferred photo tags, and Claude prompt context.

---

### Q3 — Where They Work
**Question text:** "Where are you based, and where do you work?"
**Input type:** Single line text
**Placeholder text:** "Tucson, AZ — I serve Tucson and surrounding areas"
**Why:** Location drives SEO, the "Tucson's Own" overline energy, and service area schema.
**Backend use:** Sets city, state, and service_areas fields.

---

### Q4 — Phone Number
**Question text:** "What's the best number for your customers to reach you?"
**Input type:** Phone number input (auto-formatted as they type)
**Why:** This becomes the primary CTA on their entire website. Every "Call Us" button uses this number.
**Required:** Yes — this is the most important field after the business name.

---

### Q5 — Email Address
**Question text:** "And your email? This is where leads from your website will go."
**Input type:** Email input
**Subtext under field:** "We won't share it or show it publicly unless you want us to."
**Why:** Lead notifications go here. Also used for the owner's Found account.
**Backend use:** Sets email field. Used in lead notification system.

---

### Q6 — What Makes Them Different
**Question text:** "What makes you different? Why do your customers choose you over everyone else?"
**Input type:** Multi-line text
**Placeholder text:** "We're a family business and we treat every home like our own... / I've been doing this for 20 years and I stand behind every job... / We're the only ones in Tucson who do this..."
**Why:** This is the soul of their website. This answer becomes their hero subtitle, their about section, their brand voice. Do not rush this question.
**Transition after:** Specific affirmation based on what they wrote. This is Angela's moment.
**Backend use:** Hero subtitle, about_text, brand voice input for Claude API.

---

### Q7 — Services
**Question text:** "List your main services — just the names is fine."
**Input type:** Tag/chip input. Type a service name, press enter or comma, it becomes a tag. Add as many as they want.
**Example chips shown before they type:** "Roofing" · "Painting" · "Free Estimates" · "Balloon Décor"
**Why:** Services become cards on the website, each auto-matched to an icon and auto-described by Claude.
**Backend use:** services array in website_config. Each service name → ServiceIcon lookup → Claude generates description.

---

### Q7.5 — Photos & Video
**Question text:** "Got any photos or videos of your work? Even a few from your phone makes a big difference."
**Input type:** Two upload targets with clear labels:
- 📷 **Hero photo or video** — "Your best single shot. This fills the entire top of your site." (1 file, image or video)
- 🖼 **Gallery photos** — "Show off your work. Upload up to 20 photos." (multi-file, images)
- **"Skip for now →"** — "We'll pick great photos for your industry automatically."

**Critical tone note:** Skip is a first-class choice. Never make the owner feel bad for not having photos ready. The stock image system produces beautiful results. They can add real photos anytime after launch.
**Backend use:** hero_image_url (first upload slot), media table (gallery uploads, auto-hearted ❤️)
**Stock fallback:** Pexels API query built from industry_category + vibe when skipped.

---

### Q8 — Logo
**Question text:** "Do you have a logo?"
**Options:**
- "Yes, upload it" → file upload (jpg, png, svg, max 10MB)
- "Not yet — that's okay" → BrandMark generated from business name

**Critical tone note:** "Not yet — that's okay" must feel like a first-class choice.
The BrandMark is premium. Never make the owner feel like they are getting a lesser product by not having a logo. They are not.
**Backend use:** logo_url (if uploaded) or null (BrandMark renders from company name).

---

### Q9 — Color Palette
**Question text:** "Pick a color that feels like your brand."
**Options:**
- 10–12 visual color swatches (Jony Ive-approved palettes) — each labeled with a feel word
  - e.g. "Bold Green" / "Slate Blue" / "Warm Clay" / "Deep Navy" / "Pure Black" / "Crimson" / etc.
- "I have my own color →" → hex input field
**Why:** Color is the fastest way to make the site feel like theirs. The swatches do the design work for owners who don't know hex codes. The custom hex option exists for owners who already have brand colors (like Barrio Builders #2E7D32).
**Backend use:** primary_color field in companies table.

---

### Q10 — Vibe
**Question text:** "Which of these feels most like your business?"
**Options (visual — show a small design preview for each):**
- **Bold** — "Strong and confident" (sample: heavy type, sharp edges)
- **Calm** — "Soft and elevated" (sample: serif type, rounded corners)
- **Modern** — "Clean and sharp" (sample: geometric type, minimal)
- **Warm** — "Friendly and approachable" (sample: warm serif, soft curves)
**Why:** Vibe drives the entire design system — fonts, card radius, button style, shadow weight. This one answer shapes how the whole site feels.
**Backend use:** vibe field in companies table → drives vibeMap → CSS variables throughout.

---

### Q11 — Hero Photo
**Question text:** "Got a photo that shows off your work? (You can always add more later.)"
**Options:**
- "Upload a photo" → file upload
- "Skip for now" → industry-appropriate stock photo selected automatically

**Critical tone note:** Skip must feel completely fine. Many owners won't have a photo ready.
Auto-selected stock photo should be high quality and industry-specific — not generic.
**Backend use:** hero_image_url (if uploaded) or stock photo by industry_category.

---

### Q12 — Testimonials (Optional)
**Question text:** "Any happy customers you'd like to shout out?"
**Input type:** Add a testimonial → name field + quote field + optional role/title
**Multiple allowed.** Can skip entirely.
**Tone note:** "Shout out" not "testimonial." Friendlier, more natural, more owner-appropriate.
**Backend use:** testimonials array in website_config.

---

## INDUSTRY-SPECIFIC QUESTIONS

These appear only when the selected industry needs them. The owner should never feel like they are answering every possible business question.

### Pricing
- Beauty: ask for starting prices.
- Food: ask for menu prices if they have them.
- Wellness: optional for solo providers; visible pricing for multi-provider spa/studio businesses.
- Fitness: optional class/session/membership prices only.
- Home services, landscaping, cleaning, automotive: do not ask for fixed pricing during onboarding.

### Hours & Location
- Required for visit-based businesses: food, retail, beauty, wellness, fitness, automotive, pet services.
- Optional for service-area or appointment-first businesses: home services, landscaping, cleaning, events.

### Testimonials
Always optional. Never block launch.

### Contacts
Every new lead should create or update a lightweight contact record. The full contact dashboard comes later.

---

### FINAL SCREEN — The Reveal

*After all answers are submitted and the site is generated.*

**The moment:**
1. Brief pause — generating animation. Something beautiful, not a spinner.
2. Personal message appears: "[First name], [Business Name] is live."
3. Transition to site preview — shown on a phone or screen mockup
4. Two buttons:
   - Primary: "See your site →" (opens site in new tab)
   - Secondary: "Make changes" (returns to edit mode)

**The feeling this must produce:** Unboxing an iPhone.
The owner should gasp, feel proud, want to show someone immediately.
This moment is designed with the same care as a product launch reveal.
If it does not produce that reaction, we have failed and we go back.

---

## BRANCHING LOGIC

| Answer | Sets | Used for |
|---|---|---|
| Q1 (business name) | companies.name | BrandMark, site title, reveal message |
| Q2 (what they do) | industry_category (auto-detected) | Layout matrix, stock photo selection, Claude content prompt |
| Q2.5 (sub-industry) | companies.sub_industry | Section manifest, photo tag matching, Claude prompt context |
| Q3 (location) | city, state, service_areas | Overline text, SEO schema, address |
| Q4 (phone) | phone | CTA buttons, navbar, footer, lead email |
| Q5 (email) | email | Lead notifications, account |
| Q6 (differentiator) | → Claude API | hero_subtitle, about_text |
| Q7 (services) | website_config.services | Service cards, icons, Claude descriptions |
| Q8 (logo) | logo_url or null | Navbar, footer — BrandMark if null |
| Q9 (color) | primary_color | Entire site accent system |
| Q10 (vibe) | vibe | Font pairing, radius, shadow via vibeMap |
| Q11 (hero photo) | hero_image_url or stock | Hero section background |
| Q12 (testimonials) | website_config.testimonials | Testimonials section (hidden if empty) |

---

## WHAT CLAUDE API GENERATES FROM ANSWERS

After onboarding is complete, Claude API receives: business name, what they do (Q2), differentiator (Q6), city, services list, and industry. It generates:

- **hero_title** — punchy, confident, 4–8 words. Not generic. Not "Welcome to [name]."
- **hero_subtitle** — 1–2 sentences. Their voice. Their differentiator. Talks directly to their customer.
- **about_text** — 2–3 sentences. Warm, personal, proud. Sounds like the owner wrote it on a good day.
- **service descriptions** — 1–2 sentences each. Professional but human. Not marketing fluff.
- **SEO meta description** — under 160 characters. Location + services + call to action.

**Tone instruction to Claude API:**
"Write like the owner wrote this themselves on a great day — proud of their work, clear about what they do, talking directly to their customer. Not corporate. Not generic. Not template copy. If a roofer reads this, it should sound like a roofer who loves their job wrote it."

---

## IMPLEMENTATION NOTE

The first content generation pass is wired in `src/lib/contentGeneration.ts`. Claude runs once during onboarding site creation when `ANTHROPIC_API_KEY` is configured, and the generated copy is saved into `website_config`. If Claude is unavailable, Found saves fallback copy from the same onboarding answers so launch is never blocked.

The first reveal screen is wired in `src/app/onboarding/OnboardingFlow.tsx`. After site creation, Found moves into a Pure Studio / Signal Green reveal: "Found it.", "[Business Name] is live.", device-style website preview, and two actions: "See your site" and "Make changes."

---

## OPEN QUESTIONS (TEAM DISCUSSION NEEDED)

- [ ] Progress indicator — yes or no? If yes, what form? (Steve: "if it needs a step counter, the flow is too long")
- [ ] Do we ask for social media handles during onboarding, or add them later in settings?
- [ ] Source and licensing for industry stock photos when hero photo is skipped
- [ ] Do we ask for service areas (other cities covered) separately, or derive from Q3?
- [ ] What is the minimum viable onboarding — which questions could be skipped for a "fast track" option?
- [ ] What specific affirmations does Angela write between each question? (Needs a full session)
- [ ] Exact color palette presets — Jony to approve all 10–12 swatches with names
