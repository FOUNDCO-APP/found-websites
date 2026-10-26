# Hiram Second Site: Live Cleanup Review

Read-only review October 21, 2026. Shawn prefers the second signup but has not
authorized deleting/merging records, publishing artwork/copy, or choosing it on
Hiram's behalf. Promo repair in another session is reported complete by Shawn;
this review does not reopen that billing task.

## Live Evidence

Site: https://intelligence-protection-security-llc-arizona.foundco.app/
Company: `626dc220-4152-4711-8862-a885534e1e0a`.

Browser screenshot: `quality/hiram-review/second-site-before-cleanup.png`.
Hero still says 'Professional Service Business in Arizona'. Subtitle and About
repeat slash-separated intake. Three service cards contain long slash lists.
Generic 'How I Help', 'About Me', 'free consultation' and 'Expert advice. Clear
results.' remain. The hero image is a text-heavy promotional flyer, not a clean
background photo. Existing stored copy has not been cleaned by this review;
changing generation code alone does not rewrite it.

Original logo inspected at its public company-assets path: 822x1000 JPEG. Parent
and independent design reviewer saw a black shield, white lettering/scales, gray
perimeter/shadow and a gray gradient canvas with large top/bottom margins. No
image processing, uploads or edits performed.

## Independent Team Recommendations

Design/upload review: create an exact-artwork transparent PNG candidate; remove
outer gradient canvas, trim empty margins, preserve the black shield/white details
and proportions. Retain ambiguous gray perimeter in the first candidate; ask before
removing it. Show light/dark previews before publishing. Tiny curved lettering will
not become reliably readable in a small header merely by cropping. Rebuilding or
simplifying the mark is separate branding work requiring approval/original source.

Content/intake review: `parseServices` in `src/app/onboarding/actions.ts` splits
only commas/semicolons/newlines, then keeps eight entries. Current three-card output
matches this behavior. Do not split every slash: `24/7` must remain intact. Preserve
raw input, propose service groups and ask Hiram to confirm them. No truncation of
extra services; agree on up to eight groups, or return the limit for a decision.

Review About separately: languages, twelve years' experience versus three years
in business, private-investigator and armed/unarmed instructor background must be
clarified before turning them into claims. Do not invent credentials or guarantees.
Use neutral guard wording in place of generic Professional Services boilerplate.

Both reviewers recommend preview-first cleanup, not automatic publication. The
previous three system integration bypasses remain a separate pending approval:
subtype manifest callers, copySimilarity rewrite behavior, and stock-photo API.
No suitable guard hero is approved; do not insert unrelated office/event stock.

## Pending Owner Approval

Prepare a cleaned-logo candidate and rewritten copy preview using the second site
as the working draft, without changing either live signup. Confirm services with
Hiram, obtain publication approval and intended site choice before applying changes.
