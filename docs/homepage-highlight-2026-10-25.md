# Image-First Homepage Highlight

## Approved Scope

Shawn approved the independently reviewed image-first direction: complete artwork
below the hero, tap to open full size, discreet expand icon, no generic flyer label,
repeated headline or large public button. Owners can upload directly or choose an
existing photo, preview privately and explicitly publish. Existing text/background
highlights retain their appearance unless an owner deliberately replaces them.

## Implementation

- `HomepageHighlightImage`: uncropped, stable responsive frame; full-size dialog,
  close/Escape/backdrop, keyboard focus trap/return, inert background, restored
  scrolling and image-load failure/retry states.
- `HomepageHighlightEditor`: upload/choose, private draft, cancel, explicit publish,
  busy/error states and turn off without deleting files. Images remain available
  after refresh. Explicit text-mode switching preserves copy/photos and leaves
  publication off until the owner turns it on.
- `highlightActions`: verified owner context, image byte/MIME/dimension validation,
  immutable tenant-owned uploads, no automatic Gallery publication or movement.
- `highlightLinks`: shared editor/persistence/public validation, preserving valid
  Gallery/About/Home, telephone and HTTP(S) links. Existing feature gates remain;
  unsafe and malformed destinations are rejected.
- `publish_homepage_highlight`: one PostgreSQL transaction locks the company config
  and source, validates expected timestamp/URL, creates an independent placement,
  clears only previous announcement slots, and updates highlight settings. Errors
  roll back the entire publication. No nontransactional fallback or blind retry.

Migrations `20261025233743_homepage_highlight_publish.sql` and
`20261025235018_homepage_highlight_publish_guards.sql` match the actual production
migration history after application via Supabase. The original local filenames
were CLI-generated; they were aligned to returned applied versions, not reapplied.
The follow-up rejects silently suppressed row updates, insertions and placement
clears. Both migrations were independently reviewed and live catalog permissions
rechecked. The function is SECURITY INVOKER with empty search_path, executable only
by service_role. Anonymous/authenticated execution is revoked. Live catalog checks
confirmed those permissions. No new columns, RLS disablement or billing changes.

## Review And Tests

Independent design, customer-experience and engineering reviews completed. Review
caught and fixed draft-photo refresh visibility, text-mode return, competing
publication and mode-switch-during-publish issues.

- 34 actual owner-editor assertions.
- 19 upload/action/link fixture groups.
- 11 actual ephemeral PostgreSQL transaction/rollback/privilege groups.
- 6 actual page/action/integration groups.
- Public SSR and ReactDOM/JSDOM viewer interactions, including accessibility,
  failure/retry, focus restoration, modal exit and full-image presentation.
- Full production build passed TypeScript and 86 static pages.

No actual browser viewport/screenshots were available: CUA inventory returned no
browsers. DOM/SSR checks are not browser visual approval. PostgreSQL tests exercise
competing expected timestamps but do not simulate multi-session lock scheduling.

## Operator Gate

Hiram's one-time activation is separately guarded by a fresh private full snapshot,
exact ready production SHA, fixed durable attempt claim and protected read-back.
Original Gallery flyer and all existing services/media remain unchanged; only a
new announcement clone and enabled/artwork fields are expected to change.
Operator evidence stays in ignored `.billing-audits/hiram-highlight-20261025-*`.

## Separate Security Follow-Ups

`npm audit` reports nine advisory entries in existing dependencies, including Next,
Sentry, DOMPurify and Sharp. The added Lucide package has no reported advisory.
No forced unrelated dependency upgrades were performed in this feature release.
Supabase advisories show server-only RLS-without-policy information and an existing
leaked-password-protection warning, with no finding targeting the new function.
These need a separate scoped security review, not an assertion that all Found
security work is complete.
