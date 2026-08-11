# FOUND Systems - Content Uniqueness Before Schema

Last updated: August 11, 2026  
Owner: Shawn + Found Co team  
Status: Planned, not yet coded

## Why this document exists

This records the team decision made during FOUND Systems work after Shawn noticed that some generated tenant sites can share too much wording or visual behavior.

The immediate trigger was not that HVAC and remodeling were conceptually the same. The issue was that the wording patterns could be the same or too close across sites. Shawn also noticed typography problems that would become expensive if Found had thousands of sites:

- similar hero/about/service phrasing across different tenant sites;
- one-word or two-word hero line orphans, such as a final word sitting alone on its own line;
- display fonts with tight line-height causing overlapping wrapped lines, especially Impact-style fonts;
- concern that schema/AEO/GEO work would amplify weak or repeated content if done too early.

This plan exists so another AI or developer can resume without reconstructing the conversation.

## Current FOUND Systems state

Completed:

- Google Search Console verified for `foundco.app`.
- Sitemap submitted to Google.
- Bing Webmaster Tools imported/verified and sitemap submitted.
- Microsoft Clarity installed and QA-confirmed with live iPad/phone sessions.
- PostHog Personal API Key added for Found HQ Health reporting.
- Found HQ Health shows traffic and funnel data.
- Funnel tracking added and verified:
  - `onboarding_started`
  - `plan_selected`
  - `onboarding_completed`
  - `checkout_started`
  - `activation_completed`
- `onboarding_completed` moved server-side.
- `activation_completed` hardened through Stripe webhook fallback.
- Paid test activation for `dj.foundco.app` confirmed: Health reached `8 Started / 2 Site built / 2 Checkout / 1 Activated`.

Still open and intentionally delayed:

- Tenant schema markup.
- Supabase security reminders:
  - smoke-test estimates/public quotes/email/add-ons after RLS changes;
  - fix `public.update_updated_at` mutable `search_path`;
  - Shawn to enable leaked-password protection in Supabase Auth settings.

## Core decision

Do not build tenant schema markup yet.

Reason: schema helps search engines and AI search systems understand content. If the content is generic, duplicated, or visually unpolished, schema only makes weak content easier to understand and index. Found should first make generated sites meaningfully unique and visually safe at scale.

Team principle:

> Same design system is fine. Same voice is not.

Apple has consistent layouts. Found can too. The problem is not shared structure. The problem is repeated language that makes businesses sound stamped out.

## Team meeting summary

### Steve Jobs - Product

Do not build a product that prints thousands of nearly identical sites. Found should feel like it understood the owner, not like it filled in blanks.

Decision:

- Found must generate a good site even when AI is unavailable.
- AI should make the product better, not be the only thing preventing generic output.
- Schema waits until content quality is stronger.

### Jony Ive - Design

Consistency is not the enemy. Repetition without care is. The visual system can share spacing, rhythm, and layout, but type must not collide or look careless.

Decision:

- Add system-level typography safeguards.
- Avoid manual one-off fixes.
- Prevent display font overlap, hero line orphans, and bad wrapping at the component/system layer.

### Phil Schiller - Marketing/Growth

Unique copy is revenue. Generic local-business copy does not sell. The copy must reflect the customer’s actual services, location, differentiator, and best-fit jobs.

Decision:

- Copy should be specific before it is “SEO optimized.”
- Avoid vague claims like “trusted team” when a more specific claim can be built from the owner’s answers.
- Business plan growth depends on owners seeing a site that sounds worth paying for.

### Angela Ahrendts - Customer Experience

Do not make onboarding feel like a long form. Add smarter questions, not many more questions.

Decision:

- Add one primary uniqueness question.
- Use helper chips so the owner can answer quickly.
- Save optional deeper detail for later/profile editing, not initial onboarding.

Recommended primary question:

> What makes your work different from others in your area?

Suggested helper chips:

- Faster turnaround
- Cleaner job sites
- Better communication
- Family owned
- Licensed and insured
- Custom work
- Fair pricing
- More experience

Additional future questions if needed:

- What jobs do you want more of?
- What do customers usually thank you for?
- What kind of jobs do you not want?
- Which neighborhoods or service areas matter most?

### Craig Federighi - Engineering

Build the system in layers. Do not make AI the foundation.

Decision:

1. Audit current generator.
2. Improve deterministic non-AI fallback output.
3. Add similarity checking before save.
4. Add AI as a rewrite/polish layer after the baseline is strong.
5. Run all output through the same similarity and quality checks.

Preferred pipeline:

```text
Owner answers
  -> non-AI unique draft
  -> similarity check against existing tenant copy
  -> AI polish if available
  -> final similarity/quality check
  -> save site
```

### Priya Nair - Backend/Data

Track provenance and quality state. Found HQ should know whether a site used AI, fallback, or similarity rewrite.

Decision:

- Store whether copy was:
  - fallback-generated;
  - AI-generated;
  - similarity-rewritten;
  - manually edited later.
- Store enough metadata to monitor copy quality at scale.
- Do not expose this to customers unless useful.

## Explicit implementation order

### 1. Audit the current generator

Owners: Craig + Phil

Goal: identify exactly where repeated copy comes from.

Inspect:

- `src/lib/contentGeneration.ts`
- `src/lib/industryDefaults.ts`
- `src/lib/subIndustryVocabulary.ts`
- `src/lib/copyPolish.ts`
- onboarding save path in `src/app/onboarding/actions.ts`
- tenant homepage render path in `src/app/[slug]/page.tsx`

Audit these copy surfaces:

- hero title;
- hero subtitle;
- about preview;
- about story;
- about highlights;
- service descriptions;
- CTA headline/body;
- FAQ copy;
- industry default values/process sections;
- AI fallback behavior.

Deliverable:

- list of repeated phrases/patterns;
- list of template families that are too broad;
- exact functions/files that need refactor.

### 2. Build the non-AI uniqueness baseline

Owners: Craig + Phil

Goal: Found should create sufficiently unique copy even with no AI.

Required changes:

- Add more copy patterns per job family and sub-industry.
- Make HVAC, remodeling, plumbing, electrical, landscaping, cleaning, etc. use distinct vocabulary.
- Inject real owner details:
  - business name;
  - city/state;
  - service areas;
  - selected services;
  - differentiator;
  - preferred jobs if captured;
  - uploaded-photo context if available later.
- Avoid solving uniqueness by synonym swapping only. Sentence structure should differ too.

Bad repeated pattern:

```text
Fast, honest estimates from Tucson's trusted [trade] team.
```

Better examples:

HVAC:

```text
Heating and cooling help built for Tucson homes, from quick repairs to full system installs.
```

Remodeling:

```text
Kitchen, bath, and home remodeling in Tucson with clear scopes and clean job sites.
```

Bike shop:

```text
Repairs, tune-ups, and bikes from people who ride and know what keeps customers moving.
```

Pass condition:

- Two different trades in the same broad industry should not share the same hero subtitle shape unless the owner’s answers strongly justify it.

### 3. Improve onboarding without making it feel longer

Owner: Angela

Goal: collect enough unique detail without creating friction.

Recommended first change:

- Keep current onboarding length mostly intact.
- Add or strengthen one uniqueness question:

```text
What makes your work different from others in your area?
```

Use helper chips and allow free text.

The answer should feed:

- hero subtitle;
- about text;
- service descriptions;
- CTA or trust/value blocks;
- future schema fields only after content quality passes.

### 4. Add similarity detection

Owners: Craig + Priya

Goal: before saving a generated site, Found should detect whether new copy is too close to existing generated tenant copy.

Compare:

- hero subtitle;
- about text/about story;
- service descriptions;
- CTA headline/body;
- FAQ answers.

Suggested simple baseline:

- Normalize copy:
  - lowercase;
  - remove punctuation;
  - collapse whitespace;
  - remove business name/city tokens if needed;
  - compare phrase overlap and n-gram similarity.

If similarity is too high:

- choose a different deterministic pattern;
- rewrite the specific section;
- if AI is available later, ask AI to rewrite with the owner’s details;
- run similarity check again.

Pass condition:

- Found should not save a new generated site that is materially close to an existing tenant’s hero/about/service copy unless the owner manually edited it that way.

### 5. Add typography safety rules

Owners: Jony + Craig

Goal: prevent visual defects at scale without manually editing each site.

Problems Shawn observed:

- A single word such as “team” landing alone on a second hero line.
- Impact-style heavy display font causing wrapped lines to touch/overlap.
- Desktop and mobile wrap differently, so both need protection.

Required safeguards:

- Safer line-height for heavy/display fonts.
- Font-specific `line-height`, `letter-spacing`, and max-width rules.
- Clamp hero headline sizes more defensively.
- Avoid one-word/two-word orphan lines when possible.
- Test mobile and desktop breakpoints.
- Consider inserting non-breaking phrase groups for known hero phrases if needed.

Pass condition:

- Hero text never overlaps on desktop or mobile.
- Hero text does not produce obviously awkward one-word lines in common viewport widths.
- The solution is component/system-level, not manual per-site editing.

### 6. QA sample-site set

Owner: whole team

Use these sites/categories:

- Barrio Builders / remodeling-construction example.
- HVAC test site.
- RC Bicycles.
- One restaurant/food site.
- One beauty/wellness site.
- One professional-services site.

QA each for:

- unique hero copy;
- unique about copy;
- service descriptions not reused;
- visual hero type wrapping;
- desktop and mobile;
- whether the copy sounds like the actual business.

Pass condition:

- They can share a design system, but they cannot sound copied.

### 7. Add AI as an enhancement layer

Owners: Craig + Phil

Only after the non-AI baseline works.

AI should:

- rewrite around the owner’s exact details;
- avoid generic filler;
- avoid repeated Found phrases;
- improve specificity;
- preserve truthfulness;
- never invent proof, credentials, years of experience, licenses, guarantees, testimonials, or locations.

AI output must still pass:

- similarity checker;
- copy quality rules;
- truthfulness guardrails.

If AI fails:

- fallback copy still ships;
- site generation does not fail;
- Found records that fallback copy was used.

### 8. Schema markup

Owners: Steve + Priya

Do this after uniqueness and typography are safe.

Schema should use clean site data:

- business name;
- URL;
- phone/email if public;
- address/service area if public;
- industry/sub-industry;
- services;
- FAQ if generated and truthful;
- image/logo where available.

Do not use schema to exaggerate or invent:

- reviews;
- ratings;
- credentials;
- awards;
- service areas;
- prices;
- business hours unless known.

## AI setup decision

Do not start by setting up more AI.

Reason:

- If Found only works with AI, the product is fragile.
- AI credits can run out.
- APIs can fail.
- Output still needs quality checks.

Decision:

1. Build/test the deterministic non-AI uniqueness baseline first.
2. Then add AI as a polish/rewrite layer.
3. Keep similarity checks active for both AI and non-AI output.

## What not to do

- Do not start schema markup before content uniqueness.
- Do not rely on AI alone to solve duplication.
- Do not add many onboarding questions at once.
- Do not solve copy uniqueness by random synonym swapping.
- Do not manually patch individual sites as the primary solution.
- Do not create fake SEO/AEO claims in copy or schema.

## Next coding task

Start with implementation step 1:

> Audit and refactor the non-AI fallback copy system.

Concrete first actions:

1. Inspect `contentGeneration.ts`, `industryDefaults.ts`, `subIndustryVocabulary.ts`, and `copyPolish.ts`.
2. Generate/read current output for several test inputs:
   - HVAC in Tucson;
   - remodeling in Tucson;
   - bike shop;
   - restaurant;
   - beauty/wellness;
   - professional services.
3. Identify repeated phrases.
4. Add sub-industry-specific copy families.
5. Add a first-pass similarity checker before save.

