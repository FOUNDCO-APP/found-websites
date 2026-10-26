# Announcement Page Or Photo Correction

Shawn approved this scope after a visible independent AI team-role discussion.
The previous image-first release was rejected after his phone screenshots showed
a second poster-sized section and a repeated cropped flyer beneath the hero.

## Approved Behavior

- Preserve existing announcement headline, supporting text, button and styles.
- Owner chooses Page or Photo; Photo opens the original in an onsite viewer.
- Do not automatically use a Photo destination as an announcement background.
  Light, Dark and Accent remain; Image/Artwork normalizes to Dark on Photo publish.
  Page destinations retain the existing Image-background option.
- Keep source photos, Gallery membership and other placements independent.
- Shared controls apply across industries; no automatic theme or photo changes.

For Hiram only: "Protection you can count on." / "Personal protection, security
services, training and risk management." / "Take a closer look" opens his flyer.
His original Gallery row loses Home eligibility only; Gallery membership and the
independent announcement placement remain. Account, billing, first signup, logo,
services, other photographs and theme are outside the correction's data scope.

## Implementation And Verification

Photo destinations use the exact internal `#announcement-photo` token and an
independently owned announcement photo. Generic field saves cannot bypass the
owner-checked Photo publishing action. Arbitrary image URLs remain ordinary links.

The service-role-only, SECURITY INVOKER `publish_announcement_photo` wrapper reuses
the existing atomic placement transaction, preserves text and supported styles,
and checks the final destination/style/enabled state. It adds no columns or RLS
changes. Applied migration: `20261026005748_announcement_photo_destination.sql`.
Live catalog confirms anon/authenticated cannot execute; service_role can.

Viewer supports a text trigger with no inline image, Fit/Enlarge controls, scroll,
Close/Escape/Back, focus trapping/restoration and original-image failure recovery.
Announcement labels wrap without changing global button styling.

Checks include SSR/ReactDOM/JSDOM, owner editor/action/link fixtures, actual
ephemeral PostgreSQL migrations and protected Hiram-operation fixtures. These do
not substitute for screenshots: CUA inventory was empty and the in-app browser
was unavailable. Do not claim actual mobile visual approval or multi-session
database lock scheduling based on these tests.

## Separate Design Preview

Main workspace `quality/hiram-design-preview/index.html` compares existing styling
with Modern typography and restrained gold/black/white. It is a standalone study,
not a production screenshot or deployed theme. Shawn must approve the visual
treatment before a live theme change. Existing shared security imagery remains
available through the owner picker; this release sources no additional photos.

## One-Time Data Operation

Main workspace `scripts/correct-hiram-announcement.mjs` snapshots protected state,
prepares guarded SQL only after exact production deployment verification, and
verifies public output and original image bytes. It has no automatic apply mode.
Never blindly replay an attempted SQL transaction or earlier flyer/activation
operators. Private snapshots and execution evidence must not be committed.
