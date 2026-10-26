# Hiram Security Site - Team Review, October 20, 2026

## Follow-up: Expired Promotion and Price Mismatch

Hiram texted that he wanted about $40/month but kept seeing $69; Shawn suspects the
promo expired. Source review confirms intro pricing ended after October 15
(`INTRO_RATE_CUTOFF = 2026-10-16T07:00:00Z`), before both October 20 signups.
Pro's configured prices are $39 intro and $69 regular. Onboarding and activation plan
pickers still show intro prices independent of the cutoff, while activation chooses
the regular Stripe price unless the account has founding eligibility. Activation copy
also retains intro-rate/12-month language. This provides a concrete mismatch pathway;
Hiram's exact screen sequence has not been reproduced end to end.

Both current company records save `plan=found_pro`, not Business. Authenticated
production billing-audit returned complete live ledgers for both linked customers:
no charges, invoices or subscriptions. Do not describe his message as proof he paid
$69 or was switched to Business. Direct Stripe connector reauthentication did not
complete after two attempts; verification used Found's existing live read-only audit.

Independent pricing/signup reviewer Hubble recommends consistent eligibility-aware
prices and copy across pickers/activation, explicit actual recurring amount before
confirmation, and entry/resume continuity tests. Honoring $39 for Hiram or extending
the promotion is Shawn's pricing decision; neither was authorized or applied here.
No source, customer, Stripe, promotion or billing changes made.

Status: read-only investigation and proposed direction; await Shawn's site screenshot,
canonical-site/artwork selection and repair approval. No customer data, assets, code,
billing, access, subscriptions or messages changed. Prior billing work remains local.

## Evidence

Two records created today have the same company name and contact name Hiram Martinez.
Matching names do not establish authentication/ownership or authorize merging records.

| Slug | Created UTC | Classification | Logo |
| --- | --- | --- | --- |
| intelligence-protection-security-llc | 22:21:16 | events / party rentals | 1284x2778 PNG |
| intelligence-protection-security-llc-arizona | 22:37:26 | professional_services / Professional Services | 822x1000 JPEG |

Original logo files were downloaded to temporary storage for visual inspection only.
First file contains the full phone browser screenshot of a badge-maker page, including
status/navigation bars, controls, options and the badge. Second is a different black/
white shield/fan-shaped logo on an opaque gray background. First has an auto-white
variant; second has none. The source images themselves contain the surrounding content.

First site's hero is not owner-uploaded; it has ten saved stock images. Second has
three uploaded hero files plus ten saved stock images. Inspected second hero-1 is a
text-heavy company promotional flyer, not an ordinary scene photograph. Do not assume
all saved stock photos are unsuitable without inspecting them; catalogue suitability
and the user's actual current rendered screenshot remain unverified.

Both saved service lists include security terms, but some descriptions are generic
filler. Second list has slash-packed service names. Armed/24-hour/dispatch and other
service claims have unverified origin; do not assume AI invented them or that Hiram
offers them. Building work location supplied by Shawn is not automatically an approved
public business address, customer endorsement or permission to publish building photos.

## Independent Team Findings

Carver reviewed Craig/Marcus upload/display concerns. Sagan reviewed
Jony/Angela/Marcus industry, imagery and onboarding concerns. These are independent
AI reviews using Found's team roles, not participation by actual Apple employees.

- Upload validation in `src/app/onboarding/uploadActions.ts` accepts supported filename
  extensions under 5MB without screenshot/artwork-bounds screening. Shared background
  cleanup in `src/lib/logoVariants.ts` retains canvas dimensions. Variant generation
  cannot distinguish a logo from browser controls embedded in the file.
- `src/components/Navbar.tsx` contains the entire image, generally within a 48px-high
  area. The first screenshot would be about 22px wide at that height; the badge occupies
  only part of it. A larger upload alone does not fix artwork-to-canvas ratio.
- Header branches use different size constraints; unify them against the existing
  documented max-dimension/object-contain convention, not by stretching the artwork.
- `src/lib/industryManifests.ts` has no explicit guard/security-guard support. Events
  and generic Professional Services do not describe this business accurately enough.
  The exact choices/actions producing the two signups are not established.
- `stockImages.ts` and `photoPool.ts` allow broad fallback pools and cached stock without
  guard-specific suitability checks. Alarm/camera installation must remain distinct
  from security personnel. Actual relevant inventory is not yet visually audited.
- Intake parsing in onboarding actions splits comma/semicolon/newline lists, not
  slash-packed services. Generated service acceptance does not establish service truth.

## Proposed Customer Repair

1. Shawn confirms which signup/site and which artwork Hiram wants. Preserve both records;
   do not merge, delete, reclassify or change access automatically.
2. Prefer an exported original logo. Otherwise prepare an exact-artwork crop preview
   for approval: badge without the browser UI, or shield with excess margins trimmed.
   Do not redraw, invent details or remove the gray background without approval.
3. Propose Security Guard Services classification, correct business name, confirmed
   service area/contact and individually confirmed service names/descriptions.
4. Review existing uploaded images first; select approved guard/building-security
   photography or owner photos. A text-heavy flyer should not be treated blindly as
   a full-bleed cover photo. No invented credentials, testimonials or service claims.
5. Verify approved site changes on phone/tablet/desktop before release. No card,
   subscription, comp/trial extension or billing change is implied by customer care.

## Proposed System Prevention

- Reversible logo crop plus actual-size light/dark header preview before saving variants.
- Successful decode and safe pixel limits; retain original independently of derivatives.
- Consistent maximum-dimension header sizing without stretching or cropping artwork.
- Explicit Security Guard Services detection, manifest, vocabulary and matched imagery;
  reject unrelated fallback rather than substituting party/advisory/security-equipment photos.
- Revalidate cached image choices after classification changes; confirm sensitive claims.
- Clarify/resume an existing signup after authenticated ownership checks; never deduplicate
  solely by business/contact name. Audit why Hiram appears to have started twice.

Next: obtain screenshot/site selection, then present the concrete customer repair and
separate reusable changes to Shawn for approval. No implementation authorized yet.

## Follow-up: Automated Logo Quality - Team Recommendation Only

Shawn asks whether automation/AI can prevent these issues before future staff review.
Independent reviewers recommend preserving the original, validating decoded image and
pixel dimensions, flagging likely screenshot UI and proposing reversible artwork crops.
Screenshot signals should request review/adjustment rather than reject uploads outright.

Use deterministic edge-connected removal for simple backgrounds where safe. Existing
near-white cleanup is limited; it is not general gray/gradient segmentation. Hiram's
second logo may be treatable, but no processing has been performed and success is not
established. White lettering, shadows and fine edges must remain intact. AI segmentation
may propose a foreground mask; do not generatively redraw or invent logo details.

Present original/candidate at actual header size on light and dark backgrounds. Owner
chooses cleaned candidate or original; do not silently replace branding. Uncertain
results go to an internal review queue with original, candidate/mask and concern reason.
Proposed launch fallback: owner-approved text business name or original logo on a
compatible background while review is pending. This policy requires Shawn approval;
no service/provider chosen, cost incurred, image edited or upload behavior changed.
