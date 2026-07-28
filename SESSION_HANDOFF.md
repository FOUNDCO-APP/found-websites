## 2026-07-28 - Page Switcher: Scrim Was Hiding the Header It Should Have Left Alone

Shawn's screenshot of the drop-down panel showed two real bugs, not taste: (1) the scrim was `inset: 0`, covering and dimming the persistent FOUND header and the trigger row above the panel too - defeating the entire point of keeping them visible - now starts at the panel's own top offset instead. (2) the panel's bottom edge was rounded; should be a flat line matching the persistent header's own flat top green bar - rounding removed. Build passed.

Shawn QA next: confirm the FOUND header and "Home ⌄" row stay fully visible (not dimmed) with the panel open, and the bottom edge reads as a flat green line, not a curve.

---

## 2026-07-28 - Page Switcher: Drop-Down Panel Instead of Full-Screen (4th iteration)

Shawn's core objection to the full-screen version, even after the stacking-context bug was fixed: this is the *admin* tool, not the customer's public website - taking over the whole screen made it feel like leaving the app entirely, with no context that you're still mid-edit. Held the Jony-led meeting he asked for before touching code, landed on:

- Persistent FOUND header **and** BackHeader's own back-chevron/title row both stay visible at all times - the panel drops down *under* them, never covers them.
- Full-width panel, ~60vh, with the real page dimmed (not hidden) behind it via a scrim - same convention the photo picker sheet already uses, just flipped to drop from the top instead of rise from the bottom.
- Green accent moved from the panel's left edge to its bottom edge - a left stripe sitting directly under the persistent header's own top green line read as two competing brand marks.
- The trigger itself (the page title + chevron) is now the open/close control - chevron rotates 180 on open - so the separate "Pages" label + X close button that used to live inside the panel is gone, it was redundant.
- Panel's vertical offset is measured live via `ResizeObserver` on the trigger row (same pattern as `--found-header-h`), not a guessed pixel constant.
- List content itself (numbered rows, big bold labels, checkmark on active) unchanged throughout every iteration - that part was never the complaint, only the container shape was.
- Build passed.

Shawn QA next: open the switcher and confirm the FOUND header and the page-title row both stay visible above it, the real page is visible (dimmed) below it, and it reads as "an overlay on this page" rather than "I left the app."

---

## 2026-07-28 - Page Switcher: Fixed a Real Stacking-Context Bug, Not Just Restyled

Shawn sent screenshots of the full-screen switcher with a large dead zone at the top and no visible close button - "not happy yet." This turned out to be a genuine bug, not a taste call:

- **Root cause (Craig):** the panel was rendering nested inside `BackHeader`'s own `position: sticky` wrapper. A fixed-position child nested inside a positioned+z-indexed ancestor has its z-index trapped within that ancestor's local stacking context - it can never out-rank a completely different element elsewhere in the tree (the persistent dashboard header, z-index 40) no matter how high its own z-index is set. The persistent header was rendering on top of the panel's own header row (the "Pages" label and close button), hiding them entirely - that's what looked like empty space.
- **Fix:** portaled the panel straight onto `document.body` via a `Portal` helper - the exact same pattern already used elsewhere in this codebase (`LeadContactSheet`, `ActivateOverlay`, etc.), so this wasn't a new technique, just one that should have been used here from the start.
- **Also (Jony):** switched the list from vertically centered to anchored at the top - centering looked accidental once the bug is fixed, since item count varies by industry (5 vs 6 sections) and there's no bottom CTA content to balance the composition the way the public site's version has.
- Build passed.

Shawn QA next: open the switcher and confirm the "Pages" label + close button are now visible at the top, and the list starts right below them instead of leaving dead space.

---

## 2026-07-28 - Page Switcher Rebuilt Again: Full-Screen, Matching the Public-Site Nav

Shawn rejected the bottom-sheet version outright ("completely horrible") and pointed to the exact reference he wanted: the public tenant site's own hamburger menu (`src/components/Navbar.tsx`, the bold/modern variant) - full-screen dark takeover, brand-accent left stripe, big bold numbered list (01/02/03...) with hairline dividers.

Held the team discussion Shawn asked for (Jony/Steve) before touching code:
- **Jony:** carry the visual language over directly - full-screen takeover, huge numbered list, dark panel - since that's the "modern, shows off" quality that was missing.
- **Steve:** flagged the public hamburger's slow 320ms slide + staggered per-item cascade is earned because it's a rare, one-time reveal for a first-time visitor. This switcher gets tapped constantly during an editing session - full cinematic motion every tap would read as friction, not polish.
- Landed on: same visual DNA, fast/snappy motion (190ms, no stagger) instead of cinematic. Confirmed with Shawn via explicit choice before building.

Built and shipped: `BackHeader`'s page switcher is now a `position:fixed inset:0` full-screen panel (`#111111`, 3px green left stripe), header row with "Pages" label + bordered X-close button, and the six sections as a big numbered list (12px green index, 28px/900-weight labels, hairline dividers, checkmark on the active one). Build passed.

Shawn QA next: open the switcher and confirm it actually reads as Found-quality this time, and that the faster motion still feels responsive rather than abrupt.

---

## 2026-07-28 - Page Switcher Rebuilt as a Bottom Sheet, Not a Bigger Dropdown

Shawn's follow-up on the dropdown elevation from earlier today: "you just made it bigger, that doesn't solve the issue... needs to look modern." Fair - the fix was cosmetic, not structural. Rebuilt the interaction itself:
- Trigger no longer looks like a button/pill - reads as a page title (20px/800 weight) with a small round chevron hint, not a UI control trying to look important.
- Tapping it opens a full bottom sheet (same scrim/shape/shadow as the existing photo picker sheet) with pages laid out as a 2-column grid of large tappable cards instead of a cramped anchored list - bigger touch targets, checkmark on the active page.
- Deliberately reused the photo picker's existing sheet pattern rather than inventing a third distinct control, so this reads as consistent with the rest of the app.
- Build passed (one transient Google Fonts fetch failure on first attempt, unrelated to the change - retry succeeded).

Shawn QA next: open the Pages switcher and judge whether this actually reads as modern/Found-quality now, not just bigger.

---

## 2026-07-28 - Video Thumbnails Fixed, Photo Sheet Extended, Dropdown Elevated

Shawn confirmed the design is "top notch... just needs some finessing" and flagged three specific things:

- **Blank video thumbnails "everywhere"** - root cause was `preload="metadata"` with no autoplay, the exact same bug already fixed in the Photos grid on July 19 (that fix never got applied to `SiteEditor.tsx`). Added a shared `VideoThumb` component (autoplay/loop/`preload="auto"`, fades in on `onLoadedData`/`onCanPlay`) and swapped it into all 4 spots that had the broken pattern: Home's small header-photo row, the "Photos around the site" slot covers, the Featured Update image, and the photo picker grid itself.
- **Photo picker sheet felt like a short bottom sheet** - was capped at `min(78dvh, 680px)`. Changed to anchor its top edge just under the safe-area inset (Dynamic Island) instead of capping height - now reads as a real full-page surface, same as the text editor sheet.
- **Pages dropdown switcher "felt weak, generic, not Found quality"** - fair complaint: 13px text, thin padding, flat panel. Elevated to Found's real type scale (15px/800 weight), added a green glow on the trigger when open, gradient panel background, bigger rows, and a checkmark on the active section instead of relying on color alone.
- Build passed clean.

Shawn QA next: assign a video to any photo slot and confirm a real frame shows, not blank. Open the photo picker and confirm it now reaches near the top of the screen. Open the Pages dropdown and judge if it now feels like it belongs to Found.

---

## 2026-07-27 - END OF SESSION WRAP - read this first, then the dated entries below for detail

Shawn is signing off for the night. Everything below is committed and pushed to `main` (last commit `b56bf2c`, verified clean working tree). This entry is the fast-read summary of the whole session; the dated entries below it (same day) have full detail on each piece if you need it.

### What shipped tonight, in order
1. Sticky section back-nav (was scrolling away, now pinned under the header).
2. Slimmed the "View live site" row from a card into a plain link.
3. Lateral nav between the 6 Pages sections - built as a horizontal pill row first, then **replaced** with a dropdown switcher (pill + chevron, same visual language as the company switcher) after Shawn found the pill row too big/redundant.
4. **Horizontal overflow bug on Home/About - fixed twice.** First attempt (`overflow-x: clip` + pill-row width guard) was wrong and shipped without real verification - Shawn caught it still broken. Second attempt was properly root-caused with an isolated iframe measurement at real mobile width: bare `display: "grid"` (no `gridTemplateColumns`) sizes its column to the max-content width of the longest unwrapped text, ignoring nowrap/ellipsis entirely. Converted 7 affected wrappers to `flex`/`column`. **Verified this time** - 5 overflowing elements before, 0 after, measured directly, not guessed. **Lesson for next session: don't claim a CSS fix works without measuring it.**
5. Contact page rebuilt as one flowing surface with hairline dividers (`EditRowGroup`/`EditRow`) instead of stacked bordered boxes, matching a precedent already set by the Estimate builder rebuild in July.
6. Removed confusing "Tap to edit" label on the hub.
7. Every tappable hub card (6 Pages tiles, Business Info, 2 Site-wide tiles) got a visible chevron - simplified per Shawn's feedback from a filled circle badge down to a bare chevron glyph.
8. Company switcher (top of every dashboard page, not just Edit My Site) de-buttoned into a plain text link, then given back a small caret next to the name after Shawn asked how other products (Slack/Notion/Stripe) signal "this is swappable" - underlined text alone doesn't carry that meaning, name+caret does.
9. **Real code audit** of `SiteEditor.tsx`/`actions.ts` (not a visual review) found: nearly every save path showed "Saved" without checking whether the write actually succeeded, and destructive Removes (service/category/menu item) had no confirm step. Both fixed - saves now roll back and show an error toast on failure; deletes now go through a shared confirm sheet.

### Decided and closed
- Pill-row nav → dropdown switcher (Shawn's call, built and confirmed working).
- Chevron badges simplified to bare glyphs, no circle (Shawn's direct feedback).
- Company switcher: text link + caret, not a button (Shawn's call, built).
- Contact's flowing-surface treatment approved as the pattern going forward *if* it holds up - not yet extended to About/Services/Shop/Gallery, pending Shawn's reaction.

### Explicitly deferred - real, not forgotten, needs its own scoped session
- **Shop/Services at scale** - no search, no category collapse. Will genuinely break with a real catalog (100+ products). This is a missing capability, not a style issue. Still unknown whether this is what's actually blocking Shawn's 3 pending clients - **that question was asked twice this session and never answered**, worth asking again first thing.
- **Instant company-switching** - the switcher is still a full-page navigation to `/select`, not a live inline dropdown. Making it instant is real architecture work touching every dashboard page; deliberately not risked right before a demo.
- **AI rewrite silently falls back to generic template copy on failure**, no disclosure to the owner that it happened. No rate limit on AI rewrite calls either.
- **No format validation** on email/phone/price fields - garbage can reach the public site.
- **No file-size check** before photo upload.
- **Zero accessibility labels** anywhere in `SiteEditor.tsx`.
- **Home's "Main Button" CTA picker** only exists for food/wellness-adjacent industries - silently absent for every other industry with no explanation.

### Pending Shawn's decision - do NOT proceed without explicit approval
**Error monitoring + alerting, requested this session, not yet built.** Shawn wants: email alerts the moment anything fails (onboarding, any page/action, any individual customer site), plus a monitoring view inside Found HQ admin. Team recommendation (Craig/Priya): don't build this from scratch - adopt Sentry (application error tracking) + an external uptime monitor (Better Uptime/UptimeRobot-class tool, must run outside our own infrastructure to be meaningful), both have free tiers sufficient for this scale, then build a lightweight Found HQ "Health" page that surfaces both in one place. **Open question Shawn has not answered yet: is he good signing up for two new third-party services under his accounts?** That's a real decision point, not a build detail - ask before doing anything here.

### Immediate next steps for whoever picks this up
1. Ask Shawn (a) what's actually blocking his 3 pending clients, and (b) whether he approves the Sentry + uptime-monitor sign-up.
2. Get his mobile QA on tonight's shipped changes (see individual entries below for exact test steps per feature).
3. Once scope is confirmed, the error-monitoring build is the next major piece of work.

---

## 2026-07-27 - Company Switcher: Added Back a Small Caret

Shawn asked how other products make "click here to switch entities" feel intuitive. Precedent: Slack/Notion/Stripe all pair the current entity name with a small caret directly next to it - that pairing is the actual signal, not underlined text alone (underline reads as "more info," not "swap this"). Added a 10px caret next to the company name; still no pill/background/button, still a plain link to `/select`. Build passed.

---

## 2026-07-27 - Simplified: Plain Chevrons, Company Switcher as Text Link

Shawn's direct follow-up on the chevron/switcher pass: drop the circular background (just wants a simple chevron), and make the company switcher a plain text link instead of a button. Both done - `TapChevronBadge` is now a bare 18px chevron, company switcher is an underlined text link (company name), no pill/background/icon. Navigation (`/select`) unchanged. Build passed.

---

## 2026-07-27 - Visible Chevron Badges + Company Switcher Restyled

Shawn liked the dropdown switcher but wanted every tappable card to look tappable, and flagged that the company switcher (top of dashboard) and the new section switcher now read as two stacked dropdowns. Team-approved split: ship the safe visual fixes now, hold "make the company switcher truly instant" (a real architecture change touching every dashboard page) for its own session rather than risk it right before Shawn shows this to 3 prospects.

- New shared `TapChevronBadge` (filled 28px circle, high-contrast chevron) replaces the previously-nonexistent affordance on the 6 Pages tiles + 2 Site-wide tiles, and the previously tiny/30%-opacity one on Business Info.
- Company switcher's down-chevron swapped for a switch/swap icon - it's a link to `/select` (full page), not an inline dropdown, so it shouldn't visually promise the same instant behavior as the new section switcher. Purely a glyph swap, zero change to its underlying navigation.
- Build passed.

**Explicitly deferred:** making the company switcher an actual instant inline dropdown (client-side company switching without a page reload) - real work across every dashboard page, not a styling pass. Also still deferred from earlier: Shop/Services search + category collapsing for scale.

Shawn QA next: confirm every hub card now has an obvious chevron, and that the top company switcher no longer looks like a copy of the new section dropdown.

---

## 2026-07-27 - Team Audit: Silent Save Failures + No-Confirm Deletes, Fixed

Full-code audit of Edit My Site (not a visual review - actual read of `SiteEditor.tsx`/`actions.ts`) found real gaps beyond polish. Steve's priority call: fix the two that lose real work or create false confidence, queue the rest.

**Fixed this pass:**
- Every save path except the menu/product editor showed an optimistic "Saved" pulse and discarded the server action's actual result. A failed write (RLS error, network blip) meant the owner believed their change was live when the site never updated. All save paths (`saveEdit`, `saveConfigField`, `toggleFeaturedUpdate`, services, business info, photo assignment, stock photo removal, menu photo upload) now check the result, roll optimistic state back on failure, and show a shared save-error toast.
- Removing a service, a whole product/menu category (with everything inside it), or a menu/product item was one instant tap next to Edit, no confirm, no undo - a mis-tap destroyed real content permanently. Added a shared confirm-before-delete sheet, wired into all three. Left low-stakes actions (stock photo removal, gallery photo unassignment - which just clears a section tag, doesn't delete the photo) without a confirm step deliberately, so as not to add friction to frequent low-risk taps.
- `cmd /c npm run build` passed.

**Explicitly still open from the audit, not forgotten:** AI rewrite silently falls back to generic template copy on failure with no disclosure to the owner; no rate limit on AI rewrite calls; no format validation on email/phone/price fields; no file-size check before photo upload; zero accessibility labels in this file; the "Main Button" CTA picker on Home only exists for food/wellness industries, silently absent for everyone else. None of these are launch-blocking per the team's read, but they're real and tracked.

Shawn QA next: trigger a save with the network off (or throttled) somewhere in Edit My Site and confirm the error toast appears instead of a false "Saved." Try removing a service/category/menu item and confirm the new confirm sheet appears before anything is actually deleted.

---

## 2026-07-27 - Section Nav Redesign + Tap-to-Edit Label Removed

Shawn approved the Steve-led team review (see prior entry below) and asked to move fast - he has 3 clients ready to go, currently blocked. Built the two ready-to-ship items same session:

- Removed the "Tap to edit" hint text next to Pages on the hub - Shawn (technical user) tapped it expecting a control; a fake-looking control teaches owners the UI is unreliable.
- `BackHeader`'s back-row + separate scrolling pill strip is now one row: back chevron left, dropdown switcher right (same pill+chevron visual language as the company switcher), opens a short list of the other 5 Pages sections. Half the vertical space, familiar pattern, same lateral-jump capability the pill row gave.
- Build passed clean.

**Deliberately NOT built yet:** Shop/Services search + collapsed categories for scale (Marcus/Steve's item from the team review). This is real, scoped feature work - not something to bolt on fast alongside everything else, especially with live clients about to depend on this. Needs its own session once Shawn confirms it's actually what's blocking his 3 pending clients (it may not be - worth asking before assuming).

Shawn QA next: reload Edit My Site, confirm the Pages hub no longer has the confusing label, and open any section to confirm the new dropdown switcher (chevron + section name, top right of the section header) opens a list and jumps correctly.

---

## 2026-07-27 - Horizontal Overflow: Actually Root-Caused and Verified This Time

Shawn correctly called out that the earlier "fix" (`overflow-x: clip` + pill-row width guard) did not work - Home and About were still cut off in his next round of screenshots. That earlier fix targeted the wrong thing. Root-caused properly this time with a real measurement, not another guess:

**Real cause:** every `display: "grid", gap: N }}` wrapper in `SiteEditor.tsx` that had no `gridTemplateColumns` was creating a single implicit grid column sized to `auto`. An `auto` grid track sizes to the **max-content** width of its widest child - and max-content sizing ignores `white-space: nowrap`, `overflow: hidden`, and `text-overflow: ellipsis` entirely, because those are rendering properties, not sizing properties. Any row holding a long unbroken string (Home's supporting line, About's full story paragraph, the Featured Update body) blew that column hundreds of pixels past its container. Since `overflow: hidden` sits on the *outer* card, the excess just gets silently clipped/cut off instead of scrolling - exactly what Shawn's screenshots showed.

**Why only Home and About, despite every section sharing the same new pills row:** the pills row is present on all six Pages sections, but only Home and About happen to have long enough unbroken text to trigger the bug. Contact/Shop/Services/Gallery never had it - Services in particular was already using `flex`/`column` instead of bare `grid`, which is why it was always fine. That's what the earlier fix missed.

**Fix:** converted the 7 affected bare-`grid` wrappers to `display: "flex", flexDirection: "column"` (Home's card, Home's photo-slot list, Home's Featured Update block x2, About's wrapper, Contact's wrapper, Business Info's wrapper) - same pattern Services already used successfully.

**Verified, not assumed this time:** built an isolated HTML reproduction of the exact markup at a real 390px width (Chrome DevTools window resize wasn't cooperating, used a same-origin iframe sized to 390x900 instead to force a true narrow viewport) and measured `element.getBoundingClientRect()` against `parent.getBoundingClientRect()` directly in the console. Before the fix: 5 elements overflowed their parent by up to 196px. After the fix: zero. `cmd /c npm run build` also passed.

---

## 2026-07-27 - Contact Page Mockup: Flowing Surface Instead of Stacked Bubbles

Shawn asked Jony to lead a team read on why Edit My Site "feels antiquated... a lot of wrappers and bubbles" even after the Home-matching pass. Jony's read: Home itself has this pattern (Live Preview card + 5 more separate bordered boxes below it) - matching Home spread the bubble-stack further instead of questioning it. Found real precedent already in this codebase: the Estimate builder had the identical complaint in July ("filling out a database... five bordered boxes") and the shipped, Shawn-approved fix was collapsing separate boxes into one continuous surface with hairline dividers.

Built as a **Contact-only mockup for review, not yet applied anywhere else**:
- Removed the "Live Preview" card - it duplicated the same copy already shown in the row below it, which is likely a real contributor to the "too many bubbles" feeling (same content rendered twice).
- Page label / Headline / Supporting line are now one `EditRowGroup` (single bordered surface, hairline divider between rows) instead of three separate bordered boxes.
- Tapping a row still opens the existing full-screen edit sheet - deliberately did not touch that, it was its own hard-fought, already-approved July iteration.
- Build passed clean.

Shawn: this is explicitly a pilot for your reaction, not a direction I've committed to everywhere. If it lands, About/Services/Shop/Gallery would get the same treatment next; if not, we regroup on what "less antiquated" actually means to you.

---

## 2026-07-27 - Edit My Site: Horizontal Overflow Fix

Shawn's screenshots after the lateral-nav ship showed Home and About fields cut off mid-line, and the page scrollable sideways revealing blank space. Fixed same session:

- Added `overflowX: "clip"` on the `SiteEditor` root (guards against any descendant stretching the page past the viewport, without turning the page into its own vertical scroll container - `clip` doesn't have the side effect `hidden` has of forcing `overflow-y: auto`, so the sticky `BackHeader` keeps tracking the shared document scroll).
- Added explicit `width: "100%"` / `boxSizing: "border-box"` to the new Pages pill row - the prime suspect, since it's the one thing common to every affected view and nests a `overflow-x: auto` scroller inside a `position: sticky` ancestor with no explicit width, a combination that can misbehave on real WebKit even though it's spec-correct.
- `cmd /c npm run build` passed. **Could not get live visual confirmation this session** - local browser tooling (Chrome extension connection) was unreliable and I wasn't able to reproduce/verify in an actual mobile viewport before pushing. Root cause is a reasoned best guess, not a confirmed repro.

Shawn QA next (important - this one isn't verified): reload Lucky's Home and About sections on iPhone, confirm nothing is cut off and the page no longer scrolls sideways. If it's still happening, screenshot again - the fix may not have hit the actual cause.

---

## 2026-07-27 - Edit My Site Sections: Lateral Nav + Home-Matched Visual Treatment

Shawn's follow-up mobile QA after the sticky-nav fix: sections still felt "robotic" next to Home, and jumping between sections meant going back to the hub every time. Team meeting (Jony/Steve leads, per Shawn's explicit ask), direction approved, built same session:

- **Jony's read:** Home got its full redesign (Live Preview hero card, plain-noun row labels, explicit green "Edit" pills). About/Contact/Services/Shop/Gallery never got that pass - they're still the older plain bordered-box form pattern with command-verb labels like "Change your story," "Change page label." That gap is the "robotic" feeling.
- **Steve's read:** Back always returned to the hub, forcing a hub detour to move between sections (About -> hub -> tap Contact).
- **Built, both approved directions:**
  1. **Lateral Pages nav** - the sticky `BackHeader` on Home/About/Contact/Shop-or-Menu/Services/Gallery now carries a horizontal pill row (`pagesNavItems` in `SiteEditor.tsx`) so owners jump directly between those six sections without detouring through the hub. Business Info and Domain are intentionally excluded (not part of "Pages").
  2. **About and Contact matched to Home's language/visual pattern** - added a shared `PreviewCard` (Contact) / inline live-preview block (About) showing the actual current copy above the edit controls, and a shared `EditRow` component (plain-noun label + value + explicit green "Edit" pill, same look as Home's rows) replacing the old "Change your story / Change page label / Change headline / Change supporting line" command-verb buttons.
  - **Scoped deliberately:** Services, Shop, and Gallery were left visually as-is this pass - they already render real content (service cards, product photos, gallery photos), not blank form fields, so they didn't have the same "robotic" gap as About/Contact. They did get the lateral nav.
- `cmd /c npm run build` passed. `git diff --check` passed.

Shawn QA next: on Lucky, use the new Pages pill row to jump About -> Contact -> Shop -> Services -> Gallery -> Home directly (no hub detour). Open About and Contact and confirm the live-preview block shows the real current copy above plain-labeled Edit rows ("Story," "Page label," "Headline," "Supporting line" - not "Change ___"). Confirm editing still saves correctly through the same sheet as before.

---

## 2026-07-27 - Edit My Site Hub: Sticky Back Nav + Slim Site Link

Shawn ran mobile QA on the new three-tier Edit My Site hub (Lucky) and flagged two things via screenshots. Team read (Jony/Steve/Craig) approved by Shawn same session, then built:

- **Sticky section back nav:** The green "< [Section]" back header on every drilled-in view (Home, About, Contact, Shop/Menu, Services, Gallery, Business Info, Domain) used to scroll away with the page content, so getting back to the hub meant scrolling all the way to the top - not practical on longer sections like Gallery or Services. `BackHeader` in `SiteEditor.tsx` is now `position: sticky`, pinned just below the main dashboard header at all times, iOS Settings-style. Offset is measured live off `.found-dashboard-header`'s real height via a `ResizeObserver` (`--found-header-h` CSS var, same pattern as the existing `--found-visual-height` var) so it stays correct across devices/safe areas and collapses to 0 on desktop where that header is hidden.
- **Site-link row de-emphasized:** The "Lucky / lucky.foundco.app" row at the top of the hub was a full card with a 46px thumbnail - same visual weight as the Pages tiles below it, for an action that just opens the live site. Replaced with a slim inline "View live site · lucky.foundco.app" text link, no card/thumbnail.
- `cmd /c npm run build` passed. `git diff --check` passed.

Shawn QA next: open Dashboard > More > Edit My Site on mobile (Lucky). Confirm the top site-link now reads as a light text link, not a card. Open Home/About/Contact/Shop/Services/Gallery, scroll down, and confirm the "< [Section]" back bar stays pinned under the FOUND header the whole time instead of scrolling away, with no gap or overlap against the header above it.

---

## 2026-07-26 - Current Handoff
- Site editor top/homepage slate rebuilt after team review: hidden tap zones were replaced with clear owner-facing controls for headline, supporting line, main button, short hook, header photo, and AI rewrite.
- Site photo assignment now sits in a separate "Photos around the site" section for Header, About, Visit/CTA, Gallery, Featured Update, and Contact imagery.
- Build passed with `npm run build`.
- Pending QA: mobile test Dashboard > More > Edit My Site, confirm the new homepage controls are understandable, edit sheets still lock correctly, photo picker opens, and live site reflects saved edits.
## SITE EDITOR OWNER FLOW - July 26, 2026

Steve/Jony/Craig-approved direction after Shawn said the Edit My Site slate looked confusing and cheap.

- Removed the top four readiness/status cards.
- Top now says Edit website / Edit your website / Change what customers see on your live site.
- Homepage preview now leads the editor flow.
- Lower areas now use plain owner-facing labels: Featured Update, About, Contact, Menu/Shop, Services, Photos, and Domain.
- QA: production build passed; diff check passed after doc formatting cleanup.
- Shawn QA next: open `my.foundco.app > More > Edit My Site` and confirm the page feels clearer before moving to the next launch item.

---

## FEATURED UPDATE SMART DRAFT GUARD - July 26, 2026

Jony/Steve/Craig direction after Shawn flagged the public Featured Update could still feel generic or duplicate nearby page copy.

- Added shared Featured Update copy logic in `src/lib/featuredUpdate.ts`.
- Dashboard editor and public tenant site now use the same industry-aware draft system.
- Drafts use business type, sub-industry, services, menu items, and products where available.
- Old generic filler like "New in the shop" or "Share a sale..." is replaced before preview/live render.
- Public site checks nearby hero/about/shop/menu copy and changes or hides the Featured Update if it would repeat the same thought.
- Owner-written copy still wins unless it is blank or generic filler.
- QA: production build passed.
- Shawn QA next: Lucky/Rosa's/Construction/FRCC, toggle Featured Update off/on if old copy is stuck, then confirm live copy is specific and not redundant.

---
## FEATURED UPDATE PUBLIC REDESIGN - July 26, 2026

Jony/Steve-led direction after Shawn flagged the public announcement as weak and cheap.

- Renamed the owner-facing feature from Announcement to Featured Update in the dashboard editor.
- Removed the public "Announcement" label from tenant sites.
- Changed the live section from a boxed card to a full-width premium feature band.
- Added industry-aware public eyebrow language: retail/shop, food, bike shop, home services, nonprofit, events, and fallback.
- Turning the feature on now seeds useful industry-aware starter copy/button/link if the owner has not written any yet.
- Public site hides the section if the feature is on but no owner content/image exists, avoiding empty placeholder copy.
- QA: production build passed.
- Shawn QA next: Lucky > Edit My Site > Featured Update, toggle off/on, refresh live site, and confirm the public section feels integrated instead of boxed.

---## LIVE ANNOUNCEMENT SCHEMA FIX - July 26, 2026

Craig found the launch blocker: the code and migration existed, but live Supabase was missing the announcement columns on `website_config`.

- Applied existing additive migration `database/migrations/048-site-announcements.sql` to live Supabase.
- Confirmed Lucky can now read `announcement_enabled`, title/body/button/style fields from the public company query.
- Set Lucky announcement back to on because Shawn had already toggled it before the schema existed.
- Verified `https://lucky.foundco.app` returns the announcement text in the live HTML.
- No app code changed in this fix.

---

## ANNOUNCEMENT EDITOR CLARITY - July 26, 2026

Team-approved pass completed for the dashboard announcement editor.

- Announcement editing now separates preview from controls: headline, message, button text, image, style, and destination are explicit.
- Cleaned visible corrupted labels in the site editor.
- QA: production build passed.
- Shawn QA next: Lucky > Edit My Site > Announcement. Toggle it on, edit headline/message/button text, switch Default/Light/Dark/Accent/Image, choose Shop/Products/Contact/Custom link, then View live site.

---
## PUBLIC WRITE RATE LIMITS - July 21, 2026

Team next step after the Safari Stripe popup fix: add the first bot/spam guard to anonymous write paths before launch traffic. Scope stayed narrow and launch-safe.

- Added `src/lib/security/rateLimit.ts`, an IP-aware in-process limiter with endpoint-specific keys and 429 responses.
- Covered public subscriber signup, booking create, shop checkout/complete, restaurant order checkout/complete, estimate pay/accept/decline, magic login, password login, website lead/reservation server actions, and reply links.
- Dashboard-authenticated CRUD was left alone for this pass.
- Caveat from Craig/Priya: this protects the current Node process. A distributed Supabase/edge ledger is the later upgrade if we need cross-instance abuse tracking.
- Test next: normal public form/order/payment actions should still work. Rapid repeated submits from the same browser/IP should get a clear "Too many attempts" response.

---
# SESSION_HANDOFF.md - Found Co. Current Truth
### Start here after `BRIEF.md`. Keep this short, current, and plain-English.
*Last updated: July 25, 2026*

---

## FINAL RECEIPT EMAIL CHECK - July 25, 2026

Shawn confirmed the final quick receipt/payment email check passed after the activation email polish.

Launch smoke checklist status:
- Safari shop/cart/payment-start smoke: passed.
- Fresh signup/payment and site-live email in Spark/Apple Mail: passed.
- Dashboard company switching: passed.
- Public lead/inquiry notification and clearing: passed.
- Final receipt/payment email check: passed.

Next: summarize launch readiness and decide whether to start driving traffic while continuing post-launch polish.

---
## LEAD NOTIFICATION CHECK - July 25, 2026

Shawn tested one public contact/lead path after dashboard switching.

- Public lead/inquiry submission worked.
- Dashboard red-dot notification appeared in the right place.
- The new lead was visible.
- The notification cleared after handling/viewing.
- Launch checklist item #4 is passed.
- Next test: final quick receipt/payment email check after the latest email polish.

---
## DASHBOARD SWITCHING CHECK - July 25, 2026

Shawn tested switching between businesses from the dashboard company picker after the activation email polish pass.

- Dashboard company switching works.
- Home/business context no longer appears stuck on the previous selected company during this check.
- Launch checklist item #3 is passed.
- Next test: one lead/inquiry notification path.

---
## ACTIVATION EMAIL POLISH - July 25, 2026

Shawn confirmed fresh signup/payment passed functionally, but the site-live email needed launch polish before continuing. Steve/Jony decision: activation is a paid trust moment, so the email must feel intentional and consistent in Spark and Apple Mail.

- Updated `src/lib/activationEmails.ts` so site-live and activation-reminder emails use one dark Found card instead of the fragile light header/card mix.
- Reused the existing `polishBusinessName` helper so lowercase test/business names render as display names in the subject and body.
- Cleaned the site-live copy: `Your site is now open for customers. You can view it, edit details, or manage new leads from your dashboard.`
- Primary/secondary buttons now read `Open Dashboard` and `View Site`.
- Build passes with `cmd /c npm run build`.
- Test next: trigger one new site-live email and inspect it in Spark and Apple Mail. Confirm the business name is title-cased, the card stays visually consistent, and both buttons work.

---
## PUBLIC SHOP/ORDER STRIPE LAZY LOAD - July 21, 2026

Shawn confirmed the Safari popup still appeared after Safari extensions and Hide IP Address were ruled out. Firefox and Safari Private still did not show it. Team read: the safest next code-side isolation is to keep Stripe completely out of public shop/order initial bundles until the customer intentionally starts payment.

- `ShopClient` now lazy-loads a new `ShopPaymentElement` only after the checkout API returns a Stripe client secret.
- `OnlineOrderClient` now lazy-loads a new `OrderPaymentElement` only after the order checkout API returns a Stripe client secret.
- Public shop/order browsing no longer imports `@stripe/stripe-js` or `@stripe/react-stripe-js` at module load.
- The already-related mobile order checkout sheet body-lock/visible-viewport fix remains in `OnlineOrderClient`.
- Build passes with `cmd /c npm run build`.
- Test next after deploy: normal Safari on Lucky/T-Shirts shop pages, browse/add/view details without starting checkout. Then start checkout separately.

---
## STRIPE ACTIVATION OVERLAY LAZY LOAD - July 21, 2026

Shawn confirmed the Safari popup still appeared in normal Safari after clearing data, while Firefox and Safari Private did not show it. Team read: normal Safari may still be triggering a preloaded activation chunk. Craig found `ActivateOverlay` still had a module-level `loadStripe(...)`.

- Removed module-level Stripe loading from `ActivateOverlay`.
- Stripe now loads from that overlay only after Found has a real activation client secret and is rendering the payment form.
- Build passes with `cmd /c npm run build`.
- Test next after deploy: normal Safari on Lucky/T-Shirts shop pages before checkout. If it still appears, investigate the public shop/order `PaymentElement` bundle next.

---
## STRIPE PREFETCH REMOVED FROM PUBLIC BROWSING - July 21, 2026

Shawn still saw iPhone Safari asking to download Stripe `inner.html` on Lucky and T-Shirts after the full header rollback. Team read: the headers were not the root cause. Craig found `PreviewBanner` was prefetching `ActivateOverlay`, and `ActivateOverlay` calls Stripe at module load.

- Removed the public preview banner's background `ActivateOverlay` import.
- Stripe should no longer be intentionally downloaded while customers are only browsing a public inactive/unactivated site.
- Activation still works; the overlay loads only after the owner taps the activate CTA.
- Test next after deploy: browse Lucky/T-Shirts shop pages on iPhone Safari without starting checkout. If the popup returns only after tapping payment, isolate the checkout `PaymentElement` path next.

---
## FULL SECURITY HEADER ROLLBACK - July 21, 2026

Shawn still saw iPhone Safari asking to download Stripe `inner.html` on Lucky and T-Shirts after the partial header hotfix. Team decision: remove all custom security headers and restore the exact pre-header `next.config.ts` behavior before continuing launch QA.

- Removed every custom global response header from `next.config.ts`.
- Build passes with `cmd /c npm run build`.
- Test next: after Vercel deploys this rollback, retry Lucky/T-Shirts checkout on iPhone Safari. If the download prompt remains, the issue is not the header change and the next investigation is the checkout/Stripe embed path itself.

---

## STRIPE SAFARI HEADER HOTFIX - July 21, 2026

After the launch security-header deploy, Shawn saw iPhone Safari ask to download Stripe `inner.html` on both T-Shirts and Lucky checkout screens. Team decision: rollback the risky header layer immediately.

- Removed CSP report-only, Permissions-Policy, and Cross-Origin-Opener-Policy from the launch header set.
- Kept only low-risk global headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and `Referrer-Policy: strict-origin-when-cross-origin`.
- Build passes with `cmd /c npm run build`.
- Test next: retry T-Shirts/Lucky checkout on iPhone Safari and confirm the Stripe `inner.html` download prompt is gone. After that, look at the 2-3 second Shop Online navigation delay.

---

## LAUNCH SECURITY HEADERS - July 21, 2026

Team next step after closing Found-side payment QA: add the first launch-safety browser header layer before more traffic. Implemented globally in `next.config.ts`.

- Enforced low-risk headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and `Cross-Origin-Opener-Policy: same-origin-allow-popups`.
- Added `Content-Security-Policy-Report-Only`, not enforced yet, so Stripe checkout/Connect, Supabase, Vercel analytics/live tooling, Google Places, media uploads, and blob previews are not blocked on launch day.
- Build passes with `cmd /c npm run build`.
- Next P1 after deploy smoke test: public write-route rate limiting / bot controls.

---

## DOC GAP BACKFILL - July 20, 2026

Docs (this file, `CHANGELOG.md`, `TASKS.md`) were not kept current from July 13 through July 20 - about 80 commits shipped with no matching entries. Reconstructed from `git log` and confirmed with Shawn. Full session-by-session detail is now in `CHANGELOG.md`; status changes are in `TASKS.md`. Headlines:

- **Full product catalog / online shop rebuild shipped July 16-17** - industry-aware catalog editor, variants/inventory, homepage showcase, cart-sheet checkout. Shawn confirmed live and tested. `TASKS.md` backlog previously said this "needs its own session, not built yet" - that line was stale.
- **Live-mode Stripe Connect webhook shipped July 19** - closes the P0 launch-payment gate that had been open since July 7 (webhook only existed in sandbox before). Ready for QA per Shawn.
- **Plan card savings display resolved July 15** via the new Stripe-portal plan upgrade flow - logged in `DECISIONS.md`.
- **Copy quality audit/repair system shipped July 13** and ran against real customer sites (confirmed by Shawn), not just test companies.
- Also undocumented: estimate payment fixes (July 15), Stripe Connect payout/audit tooling (July 15), mobile checkout stabilization (July 17), dashboard badge-clearing fix (July 18), payment receipt sender-name fix (July 19), black video thumbnail fix (July 19), and a new 3-option add-to-project photo picker (July 20).

**Fixed in this pass:** the "Current Status" section below previously had the same few July 19/July 10/July 9 paragraphs pasted 4-5 times with sentences cut mid-word (a paste bug from an earlier session). Deduplicated and reconstructed below; older July 6-8 Found HQ history was trimmed out since it's fully preserved in `CHANGELOG.md`/`CHANGELOG_ARCHIVE.md`.

---

## LAUNCH PAYMENT QA BACKFILL - July 21, 2026

Shawn clarified that several live payment QA items were already tested but were not recorded after a prior crash/context loss. Craig/Priya ran a read-only production Supabase audit to backfill evidence before changing the launch list.

- **Fresh onboarding / activation payment:** Shawn confirmed this passed live; production test-owner companies show active subscriptions and Stripe customer IDs.
- **Retail shop order:** verified Lucky (`lucky`) has a paid $1.00 `shopping_order` for Shawn Lopez from July 17, 2026, including selected option `Size: XL` and a recorded Stripe PaymentIntent.
- **Restaurant online order:** verified Rosa's Mexican Food (`rosas`) has paid $1.00 `online_order` records for Shawn Lopez, including the July 18, 2026 closed Carne Asada order with a recorded Stripe PaymentIntent.
- **Estimate deposit:** verified Blue Luna Events (`bluelunaevents`) has an accepted $1.00 estimate for Shawn Lopez, 50% deposit, `payment_status: deposit_paid`, `accepted_payment_choice: pay_now`, and a recorded Stripe PaymentIntent from July 20, 2026.
- **Estimate final balance:** verified Construction (`construction`) has a $1.09 estimate marked `payment_status: paid`; deposit paid July 16, 2026, final paid July 16, 2026, payment-link timestamp recorded.
- **Still unverified:** exact current pay-later estimate path (`accepted_payment_choice: pay_later` / `accepted_pay_later_at`). Older accepted-unpaid estimates exist but do not prove the current pay-later flow.
- **Stripe API note:** this machine's `.env.local` exposed only a test Stripe secret during Codex verification, so live connected-account PaymentIntent reads failed. Supabase production rows were verified; Stripe Dashboard can be used for a second ledger reconciliation if needed.

Process correction: after any meaningful code, QA, or note change, update `SESSION_HANDOFF.md`, `TASKS.md`, and `CHANGELOG.md` before ending the session, then commit/push those notes separately if app code is not part of the commit.

---

## PAY-LATER ESTIMATE QA VERIFIED - July 21, 2026

Shawn tested the exact current pay-later estimate path on Construction. The dashboard showed the accepted estimate as unpaid, with `Payment request sent` and the balance still due. This is the expected state: accepted/requested, not paid.

- Pay-later estimate path is now verified from Found-side UI evidence.
- Strict launch payment QA is complete unless Shawn wants a separate Stripe Dashboard reconciliation.

---

## FULFILLMENT DETAILS IN PAID ORDER RECEIPTS - July 21, 2026

Shawn completed the T-Shirts live shop checkout with Shipping and asked whether receipts should show where an order is being shipped or where pickup happens. Team decision: yes, the receipt has to answer that explicitly.

- Customer and owner receipts for retail/shop orders now show a clean receipt block: `Ship to` for shipping orders, `Pickup details` for pickup orders.
- Restaurant/menu paid-order receipts now use the same treatment and include pickup time when present.
- Pickup details use the first saved `company_locations` address when available. If no reliable pickup address exists, Found says the business will contact the customer with pickup instructions instead of inventing one.
- T-Shirts connected-account payment proof is now complete by Shawn's live shipping order test.
- Build passes with `cmd /c npm run build`.
- Still open for strictest launch payment QA: exact current pay-later estimate path unless Shawn waives it.

---

## NATIVE SHIPPING ADDRESS CHECKOUT FIELDS - July 21, 2026

Shawn found the T-Shirts shop checkout used one big Shipping Address textarea. Team decision: this is a customer-trust issue, not a cosmetic issue.

- Shop checkout now uses native shipping fields: street, unit, city, state, ZIP, country.
- Inputs include browser/mobile autofill tokens such as `shipping address-line1`, `shipping address-level2`, `shipping address-level1`, and `shipping postal-code`.
- Shopping cart checkout API now accepts structured `shippingAddress`, validates the required pieces for shipping, stores `shipping_address_parts`, and still stores/formats `shipping_address` for current lead/email display.
- Build passes with `cmd /c npm run build`.
- Test next: on `tshirts`, choose Shipping, tap Street address, use iPhone autofill, complete the $1 order, and confirm the owner/customer emails and dashboard lead show a readable shipping address.

---

## STRIPE CONNECT PROFILE LEDGER AUDIT - July 21, 2026

Shawn asked whether every profile with a Stripe account had been audited. Craig/Priya ran a read-only Found production database ledger audit across every company with a Stripe Connect account.

- Production totals: 37 companies; 28 have Stripe customer IDs for Found plan billing; 6 have Stripe Connect accounts for receiving customer payments.
- Connected profiles found: `bluelunaevents`, `construction`, `lucky`, `molcas-mexican`, `rosas`, and `tshirts`.
- Found DB payment evidence exists for 5 of 6 connected profiles: Blue Luna Events estimate deposit, Construction estimate payments/final-balance evidence, Lucky retail shop order, Molcas older online-order tests, and Rosa's restaurant online-order tests.
- `tshirts` has Stripe Connect set up but no completed paid order or estimate payment evidence in Found DB.
- This was not a direct Stripe Dashboard/API reconciliation. Live Stripe API access is still not available from this workspace without pulling a live secret from Vercel/Stripe.
- Open before the strictest launch sign-off: run one completed live shop-order payment on `tshirts` or verify its connected account directly in Stripe Dashboard; exact current pay-later estimate path is also still unverified.
- Reusable command added: `node scripts/audit-payment-ledger.mjs`.

---
## FULL TEAM AUDIT - July 20, 2026 - ALL 5 P0s FIXED SAME DAY

Shawn asked for a full team audit before launch. Result: **`LAUNCH_READINESS_AUDIT_2026-07-20.md`** - five parallel domain audits actually re-read the current code (a lot shipped since the July 9 audit that was never checked against). Shawn approved fixing every P0 immediately; all shipped this session. Full detail: `CHANGELOG.md`, "July 20, 2026 (part 2)."

- **Payment trust bug - FIXED.** The public estimate accept endpoint used to mark an estimate paid from unauthenticated client input with zero Stripe verification. Now requires and server-verifies the real Stripe PaymentIntent first.
- **Post-activation login - FIXED.** A brand-new paying owner used to hit a bare login screen with no session. Now signed in automatically via a real magic-link redirect on the way to their dashboard.
- **Catalog editor mobile bug - FIXED.** Ported SiteEditor's mobile keyboard/scroll-lock fix over to the catalog editor's Add/Edit Item sheet.
- **Sitemap/indexing - FIXED.** New per-business "Hide from search" toggle in `/admin/businesses`. Classified all 37 companies directly: 36 are Shawn's own practice accounts (now hidden + `noindex`), only Nereida's real salon stays indexable. Found's own marketing pages are now in the sitemap too (previously missing entirely).
- **"Review requests" claim - FIXED.** Changed to "coming soon" everywhere on the Business plan, per Shawn, instead of building the feature.
- 14 P1s from the audit remain open (no security headers, no rate limiting, no CI/tests, comp-link secret in a URL, checkout webhook fallback gaps, etc.) - full list in `LAUNCH_READINESS_AUDIT_2026-07-20.md`. Next priority list once Shawn's ready.

---

## Purpose

This is the shared handoff file for Codex, Claude Code, or any other AI working on Found.

Use this file to prevent lost context when Shawn switches tools, runs out of credits, or tests from his phone. This is not the full history. It is the current operational truth.

Current session history belongs in `CHANGELOG.md`.
Older detailed history belongs in `CHANGELOG_ARCHIVE.md`.
Active task backlog belongs in `TASKS.md`.
Locked decisions belong in `DECISIONS.md` and `DESIGN_DECISIONS.md`.

History policy: keep the current working window and anything still active in current docs. Move older completed history to archive so AI can read the current truth quickly without losing the old record.

---

## Current Status

- **New July 19 hero video loop blend:** Hero videos now use one shared playback layer for both app-recorded and uploaded videos. The player subtly fades near the loop point and still force-restarts on ended, making imperfect clips feel less abrupt instead of cutting to black or snapping hard.
- **New July 19 hero video loop fix:** Shawn found a selected home hero video played once and then went black. Public layouts now use a shared `HeroVideo` renderer with muted inline autoplay, loop, preload, and an explicit restart on ended; Editorial and Portrait layouts also now honor `hero_video_url`. Build passes. Test next: assign a short Header video and confirm the live home hero keeps replaying.
- **New July 19 video upload save fix:** Shawn found recorded videos did not appear in Photos/Unsorted. Read-only Supabase audit showed no video rows existed in `company_photos`, so the problem was upload/save, not the heart/star UI. Video uploads now use signed direct browser-to-Supabase storage, then Found records the row; failed uploads now show an error instead of silently disappearing. Build passes. Test next: record or upload a short video, confirm it appears in Photos -> Unsorted with a VIDEO badge, then heart/star it.
- **New July 19 contact editing + video media foundation:** Site Editor now exposes editable Contact Page copy, adds a Contact media slot, and supports video uploads/previews in Photos. Header media can now be a video hero through `hero_video_url`; public home/contact render selected videos safely with muted looping playback. Build passes. Test next: upload a short video in Photos, confirm the VIDEO badge/playback, assign Header or Contact media in Edit My Site, then open the public home/contact pages.
- **New July 18 named site photo slots:** Site Editor now has explicit Header, About, Visit / CTA, and Gallery photo slots instead of one confusing header-only photo picker. Public home/about/services layouts now use those owner-selected section photos before stock imagery. No slideshow was added yet; motion remains a later explicit owner setting. Build passes. Test next: More -> Edit My Site -> Site Photos, assign photos to each slot, then open the live home/about/services pages and confirm the correct section photos show.
- **New July 18 Site Editor escape fix:** Shawn confirmed the previous full-screen text editor still looked bad and trapped him with no obvious close. The copy editor is now a true full-screen editor with permanent top Close and Save controls; the fragile bottom button row was removed from the keyboard zone. Build passes. Test next: Edit My Site -> Supporting Line, confirm Close/Save stay visible and dragging does not expose the dashboard behind it.
- **New July 18 mobile Site Editor sheet lock:** The text-edit sheet now locks dashboard/body scroll while open, sizes itself to the mobile visual viewport, and uses a stronger scrim/contained overscroll so the page behind it does not show through or yo-yo under the keyboard. Build passes. Team next: add header photo motion as an explicit owner setting, not a surprise carousel.
- **New July 18 site header photo editing:** Site Editor now has an explicit Header Photo picker instead of mystery thumbnails. Selecting a header photo updates `website_config.hero_image_url` and `hero_images`, so the public home hero can actually use the owner-selected photo. Removing it clears those public config fields and falls back to stock/default imagery. The text-edit sheet now sits above mobile nav/keyboard with sticky Save/Cancel controls. Test next: More -> Edit My Site -> Header Photo -> Change, pick a photo, open the live site and confirm the hero updates; then remove it and confirm fallback returns.
- **New July 18 dashboard badge clearing:** Unread dashboard badges now clear once the owner actually views the item instead of persisting after it has been seen.
- **New July 17 mobile checkout stabilization:** Floated/hid the cart bar correctly during checkout and kept the checkout sheet above the cart bar instead of behind it. Online order receipts now send from Found under the business's own branding instead of a generic sender.
- **New July 16-17 product catalog / online shop rebuild:** Industry-aware catalog editor with dedicated menu and products managers, variants/inventory controls, sold-out product handling, homepage catalog showcase, and checkout moved into a cart sheet. Confirmed live and tested by Shawn July 20, 2026. Not yet confirmed whether Estimates line items pull from this same catalog table.
- **New July 15 plan upgrade + Stripe Connect payout tooling:** Plan upgrades now route through a Stripe portal config scoped to the target price (resolved the previously-unresolved plan-card savings display question, see `DECISIONS.md`). Added an admin Stripe Connect audit page and a Stripe payout handoff sheet with a timeout guard; repaired invalid Connect account setups found during the audit. Also fixed remaining-balance calculation and request/queue wording on estimate payments.
- **New July 15 Stripe Connect merchant responsibility fix:** Shawn finished live Connect setup but T-Shirts payout onboarding still failed because Found created Express accounts with `fees.payer = application` and `losses.payments = application`. Craig approved changing the responsibility model so the connected merchant/Stripe side carries the payment fee/loss controller model. New accounts now use `fees.payer = account` and `losses.payments = stripe`; owner-facing errors are sanitized. Build passes with cmd /c npm run build; production deploy is live at found-websites-38uz6ux12-foundco.vercel.app.
- **New July 19 live-mode Connect webhook:** Added the live-mode Stripe Connect webhook signing secret, closing the P0 launch-payment gate flagged since July 7 (webhook only existed in sandbox before). Ready for QA per Shawn.
- **New July 19 payment receipt sender fix:** Payment/deposit receipt emails now show the business's own name instead of "Found" - this was the one customer email that had missed the "show the business name" treatment already applied to leads, bookings, online orders, and sent estimates.
- **New July 13 copy quality audit/repair system:** Read-only audit across live company website copy, with fixes staged by risk (high-risk first, then medium-risk, dry-run plan, guarded apply). Confirmed by Shawn July 20, 2026 to have run against real customer sites, not just test companies. Also added faith-specific website copy and tightened apparel-specific copy rules.
- **New July 20 photo/project UX:** Added a 3-option add-to-project flow (Take Photo, Upload, Use Existing) so new projects no longer dead-end at an empty state; fixed a broken-encoding zoom label ("1x" was showing as garbled text) and matched the Photos page camera button to Home's camera button.
- **New July 14 public business name polish guard:** Shawn found `tshirts` still lowercase on `/shop`. Root cause: prior copy polish covered `website_config` fields, but public pages still received raw `company.name`. `src/lib/company.ts` now polishes `company.name` once in the shared public company loader, covering home/shop/order/menu/contact/reserve/gallery/subscribe/quote/nav/footer/custom-domain paths that use `getCompanyBySlug` or `getCompanyByDomain`. Build passes with `cmd /c npm run build`.
- **New July 14 public commerce fallback safety:** Shawn found the public shop page exposing internal setup language (`payout account`, `No products yet`, cart chrome) on an unfinished retail shop. Shared `/[slug]/shop` now shows a polished coming-soon/contact fallback until payments and products are both ready. Shared online ordering and both commerce checkout APIs now use customer-safe fallback wording instead of Stripe/setup language. Build passes with cmd /c npm run build.
- **New July 14 selected-company cookie selector fix:** Switching still stuck on the last business. Root cause is likely duplicate same-name cookies plus cookies().get() choosing a stale value. getCompany() now prefers a new found_selected_company_id cookie, falls back to legacy found_company_id, and reads all duplicates using the last value. The select-company route writes both names. Build passes. Test next: switch Tacos -> tshirts and back.
- **New July 14 selected-company cookie scope fix:** Hard navigation still stayed on tshirts, likely because old root-domain and new host-only found_company_id cookies could both exist. /dashboard/api/select-company now writes the selected company ID to both scopes on Found domains. Build passes. Test next: switch tshirts -> Tacos and confirm the dashboard leaves tshirts.
- **New July 14 hard business switch boundary:** Shawn still saw Tacos in the header but tshirts plan/name data in the More page after switching. Follow-up fix changes the company picker from a soft server-action transition to a hard browser navigation through /api/select-company, forcing a full document load after the selected-company cookie is set. Build passes. Test next: switch tshirts -> Tacos and confirm Home, Reservations, Guests, and More all show Tacos with no tshirts body data.
- **New July 14 dashboard integrity fix:** Shawn found mixed dashboard state across tshirts, Tacos, Taco Shop, Construction, and Musician. Read-only audit found core lead/customer queries are scoped by company_id, but selected-company rendering could go stale after switching because getCompany() was cached only by user ID/email. Also, Found Business granted every add-on globally and the dashboard exposed irrelevant tools by add-on instead of by industry. Fixed by removing cookie-insensitive getCompany() caching, forcing the dashboard shell dynamic, revalidating company selection, making Orders industry-aware, adding music to schedule-first routing, and making Home smart messages industry-aware for every active plan. Build passes. Test next: switch across tshirts, Tacos, Taco Shop, Construction, and Musician and verify greeting, picker, More plan, tabs, page titles, and Home message all match the selected business.
- **New July 14 additional routing fixes:** Added Found Business dollar promo setup, fixed leads title flicker on load, fixed dashboard request-routing taxonomy and lead-notification routing, fixed industry-aware location sections, and restored Express Connect controller settings.
- **Simple promo July 10:** Replaced the hard-to-type random live promo with F0UND1128 because Stripe does not allow ! in promotion codes. Production setup route created F0UND1128 in live mode, disabled the previous active Found $1 promo, and verified reruns reuse F0UND1128 without duplicates. F0UND1128 remains one-use and leaves $1.00 due on the Found Starter intro plan first invoice.
- **Live Stripe billing bootstrap July 10:** Vercel production now has live Stripe keys, the protected Stripe setup route was upgraded and run in live mode, live products/prices were created or reused, Vercel production price env vars were updated to the live price IDs, production was redeployed, and the one-use FOUND1 promo exists for the base Found intro plan. FOUND1 leaves $1.00 due on the first invoice and did not duplicate on verification.
- **Activation promo codes Phase 1 (July 9):** Added a Stripe-native promo-code field to the activation payment screen. Shawn creates coupons/promotion codes in Stripe Dashboard; Found validates active promotion codes, shows the discounted monthly price, stores promo metadata on the SetupIntent, applies the discount when creating the Stripe subscription, and records promo audit fields when migration database/migrations/046-activation-promo-audit.sql is applied. Build passes. Test next: create a live Stripe promotion code for a small charge (for example a fixed/percent discount that leaves $1 or $10 due), onboard a fresh test business, apply the code on /activate, and confirm Stripe invoice/subscription plus Found activation state.
- **Launch audit July 9:** Team verdict is no-go for open self-serve launch; controlled pilot only. Production health and build pass, but four P0 gates remain: live Stripe Connect destination/payment QA, a fresh onboarding-to-first-lead journey, sitemap exclusion of test/unready companies, and removal or completion of unverified paid-plan claims. Full findings: `LAUNCH_READINESS_AUDIT_2026-07-09.md`.
- **Phone QA follow-up:** Shawn's screenshots exposed question marks where Unicode chevrons, arrows, and separators should render. Replaced all affected admin UI glyphs with CSS-drawn indicators or ASCII-safe text, removed redundant Email previews from More, removed the explanatory Quality rule panel, and tightened Quality counts. Clean build passed. Commit `f3b3d4b`.

*Older Found HQ build history (July 6-8: admin dashboard build, comp activation, view-as tooling, payment reliability fixes, builder header gap) is preserved in full in `CHANGELOG.md` and `CHANGELOG_ARCHIVE.md` - trimmed from this file July 20, 2026 since it is no longer the current working window. This section was also deduplicated July 20, 2026: it previously contained the same few July 19/July 10/July 9 paragraphs pasted 4-5 times with sentences cut mid-word (a paste bug), which has been cleaned up here as a best-effort reconstruction of the original content.*

---

## Changed / Finished

- [x] Schedule now opens to `Calendar`, not the Hours editor.
- [x] Schedule has `Calendar`, `Bookings`, and `Hours` tabs.
- [x] Hours is now a readable weekly summary first, with editing made deliberate.
- [x] More page has grouped business-tool sections instead of a flat list.
- [x] Business plan accounts no longer repeat a redundant Included Business Tools sales list.
- [x] Dock and More now share icon language for Requests, Estimates, Schedule, and related tools.
- [x] Blue Luna / balloon decor uses `Estimate Requests` as intake and keeps `Estimates` as a separate tool.
- [x] `Estimate Requests` can hand off to `Create Estimate`.
- [x] Manual Estimate Request save now prompts: create an estimate now or not yet.
- [x] Incoming Estimate Request rows show `Create Estimate` directly on the row.
- [x] Lead temperature no longer silently defaults to Warm.
- [x] Add-lead form is a slide-up sheet instead of an inline card.
- [x] Company switching was parallelized for speed.
- [x] Company switch tap feedback now highlights/spins immediately.
- [x] Camera blocked-permission path now shows guidance instead of leaving the owner on a black screen.
- [x] Added `SESSION_HANDOFF.md` as the current source of truth for AI handoffs.
- [x] Cleaned `BRIEF.md` so every AI starts from the handoff and team approval rules.
- [x] Created `CHANGELOG_ARCHIVE.md` so older detailed history is preserved outside the current changelog.
- [x] Added a `git status` check to `BRIEF.md` Step 1 to close the uncommitted-handoff gap.
- [x] Rebuilt the post-payment confirmation on the public estimate page: client's own logo/name, bigger branded success moment, actual payment breakdown (amount paid + balance due), permanent instead of a 2.2s animation that decayed into a bare "Thank you."
- [x] Team decision: kept `automatic_payment_methods` enabled (Cash App, Klarna, etc. stay available) - Found clients' own customers may need those payment rails, so choice wasn't restricted to card/bank only.
- [x] Estimate builder header gap - first attempt (margin math) turned out not to be the real fix; root cause was `viewport-fit=cover` missing app-wide, fixed at the root in `src/app/layout.tsx`.
- [x] Payment confirmation reliability - `handlePay()` in `AcceptButton.tsx` now retries the "mark as paid" call 3x with backoff instead of firing once with a silently-swallowed error.
- [x] Removed the redundant "ESTIMATE" eyebrow above "New estimate" in the builder header - one clear title, not two lines saying the same thing.
- [x] Verified directly against Supabase: the "Construction" test company's `primary_color` really is `#1565C0` (blue) - the payment sheet's branding is correctly applying it. Not a bug, just a test company whose real brand color happens to resemble Stripe's own blue.
- [x] **Found HQ** - one admin dashboard (`/admin`) replaces four separate `/admin/*` login screens. Sidebar nav on desktop, bottom nav on mobile, home page shows live stats (total/active/comp/new-this-week) plus the 6 most recent signups. Businesses/Photos/Emails/Copy work exactly as before, just inside the shared shell. Pushed as `3ed70ae`.
- [x] Live-tested all 6 July 6 items directly on production - camera permission (blocked + granted), company switching, leads add-sheet, estimate request -> create estimate handoff, and Schedule (Calendar/Bookings/Hours) all confirmed working with screenshots.

---

- [x] Made Found HQ Copy regeneration recoverable: removed bulk regeneration, added explicit confirmation, durable version history, atomic publish/restore functions, server-side admin checks, View site, and Undo changes. Migration 044 applied; build and rollback-only database test passed. Commit `8825321`.

- [x] Rebuilt Found HQ around Steve and Jony's approved operator model: four-item navigation, actionable Overview, compact Businesses workspace, Quality hub, secondary More destination, and one shared responsive visual system. Commit `2bc4fd0`.

- [x] Fixed phone rendering defects from the first Found HQ redesign review: no visible question-mark glyphs, ASCII-safe metadata, CSS chevrons, and simplified Quality/More content. Commit `f3b3d4b`.

## Still Needs Work

- [x] **Stripe Connect webhook gap - CLOSED July 7.** Confirmed via screenshots: the only registered endpoint listened to "Your account" events, not Connected accounts. Shawn created a second event destination in the Stripe Dashboard (sandbox) scoped to Connected accounts, Snapshot payload style, including `payment_intent.succeeded`. `src/app/api/stripe/webhook/route.ts` now tries both `STRIPE_WEBHOOK_SECRET` (platform) and `STRIPE_WEBHOOK_SECRET_CONNECT` (new) when verifying signatures, since each Stripe endpoint signs independently. New secret added to Vercel (production + preview) via API and to `.env.local`. Pushed as `31d34c0`. **Still needs:** the same Connect-scoped destination created in Stripe's *live* mode before actual launch - everything done so far was in the sandbox. Also a stray `empowering-bliss-thin` destination (wrong payload style, unused) should get deleted from the Stripe Dashboard - cleanup only, not blocking.
- [x] **Live-tested July 8** on production: builder gap is gone, redundant header copy is gone (single "New estimate" title), estimate request -> create estimate handoff prefills correctly. Payment retry behavior and the webhook fallback specifically still need a real Stripe test-mode payment run through end to end - not yet done.
- [ ] QA Schedule across quote-first, restaurant, and booking-first profiles.
- [ ] Confirm whether sticky Schedule tabs are worth continuing. Shawn said it is okay if freeze/sticky tabs do not happen.
- [ ] QA payable estimates end to end with Stripe-connected account:
  - Accept and Pay.
  - Accept now, pay later.
  - Receipt email.
  - Owner email.
  - Dashboard states: `Paid`, `Deposit paid`, `Accepted, unpaid`.
  - Public paid state.
- [ ] **Sandbox test list for July 8 (Shawn confirmed "the list is good, keep it for tomorrow" - July 7):**
  - Full onboarding -> activation, start to finish, on a brand-new business: pick a plan, enter a test card, land on the dashboard for the first time. Hasn't been walked through since the plan-selector redesign.
  - Plan upgrades/downgrades and add-on purchases - confirm each transition re-gates the right tools correctly.
  - The "Accept now, pay later" email path specifically (separate from the direct-pay path already tested) - different email, different dashboard state.
  - All items above this one in this list (builder gap, payment retry, confirmation screen, header copy, webhook fallback, Schedule QA).
- [ ] Keep AI estimate builder gated until manual estimate + payment flow passes live QA.
- [ ] Invoice-now / POS-lite planning is still important, but behind live QA and More / Manage IA cleanup.
- [x] **Found-operator tooling (beginning-stage scope) - BUILT July 7-8, not yet tested live.** New `/admin/businesses` page (same shared `admin_key` gate as `/admin/photos` and `/admin/emails`): lists every company, search by name/slug/email, a "View as" button per row, a comp toggle, and a per-business notes field. `getCompany()` now has an admin override - when the selected-company cookie AND a server-verified `admin_key` cookie are both present, it fetches that company without the normal ownership check. Comping a business also sets `subscription_status: "active"`, which is what actually unblocks their dashboard. Dashboard shows a persistent orange "Viewing as [Business] (Admin)" banner with an Exit button whenever this is genuinely active. Pushed as `abe48a1`. Growth-stage needs (role permissions, audit log, churn dashboard) intentionally not built - backlog only.
  - **Must test:** log into `/admin/businesses` (uses the same admin key as `/admin/photos`), search for a real business, tap "View as," confirm the dashboard loads as that business with the orange banner showing, tap Exit and confirm it returns to Shawn's own account. Test the comp toggle on a real inactive test account and confirm the activation banner disappears immediately.

- [x] **Comp-before-the-card-prompt (both options) - BUILT July 8, not yet tested live.** Superseded the "mark comp after onboarding" answer above with two real paths, pushed as `04aaa3a`:
  1. **Comp link - zero card screen, ever.** Start onboarding at `https://foundco.app/onboarding?comp=<your admin key>` (the same key you use to log into `/admin/photos`). The company gets created already active. The final Reveal screen shows "Go to dashboard" instead of "Launch my site" - the business never sees a payment screen at all. Best for a clean demo, but only works if Shawn remembers to use that link.
  2. **In-flow fallback - works no matter how onboarding started.** As long as Shawn's browser already has the admin cookie (from logging into `/admin/photos` or `/admin/businesses` earlier in that session), the real "Launch my site" activation screen shows an extra dashed-orange button - "Activate as comp (Found team)" - right next to the normal plan/payment flow. Tap that instead of entering a card.
  - **Must test:** try the comp link end to end on a throwaway test business, confirm no card screen ever shows. Separately, go through normal onboarding *without* the comp link while logged into `/admin/photos` in the same browser, confirm the "Activate as comp" button appears on the real activation screen and works.

---

## Shawn Test Steps

### 0. Found HQ (new tonight)
1. Go to `foundco.app/admin` (not `/admin/photos` anymore - just `/admin`).
2. Log in with the same access key you've always used.
3. Confirm you land on a new home page with numbers at the top (total businesses, active, comp accounts, new this week) and a card for each tool below.
4. Tap Businesses, Photos, Emails, and Copy from the left menu (or bottom menu on your phone) and confirm each one opens and works like it always has.
5. On Photos, select a few pictures and confirm the "Approve" bar at the bottom is fully readable and tappable - both on your laptop and your phone.
6. On your phone, tap "Sign out" in the bottom bar and confirm you're dropped back to the login screen.

### 1. Camera Permission
1. On a device/browser where camera permission is blocked, open Camera in Found.
2. Confirm you see a clear message telling you how to allow camera access.
3. Confirm it does not stay on a black screen.
4. On a fresh browser/device, confirm the normal camera permission prompt still appears and camera works after Allow.

### 2. Company Switching
1. Open an account with 2+ businesses.
2. Switch from one business to another.
3. Confirm the tapped business highlights immediately and shows a spinner.
4. Confirm the switch feels faster than before.

### 3. Leads / Requests Add Sheet
1. Open a temperature-based business.
2. Tap Add lead/request.
3. Confirm Hot/Warm/Cold has no default selection.
4. Confirm Save is disabled until a temperature is picked.
5. Confirm the form opens as a sheet and the empty state does not show through under it.

### 4. Estimate Requests
1. Open Blue Luna Events or another quote-first business.
2. Confirm the dock says `Requests` or `Estimate Requests` as intended for the current mobile label, not generic `Leads`.
3. Add a new Estimate Request manually.
4. Confirm the prompt appears: create an estimate now or not yet.
5. Choose Create Estimate and confirm the estimate builder opens with customer info prefilled.
6. On an existing Estimate Request row, confirm `Create Estimate` appears without opening the detail sheet.

### 5. Schedule
1. Open Blue Luna Events and tap Schedule.
2. Confirm it opens to Calendar first.
3. Tap Bookings and confirm the empty or booked state is clear.
4. Tap Hours and confirm it shows a readable weekly summary first.
5. Tap Edit and confirm day toggles, time fields, booking settings, and time off still work.
6. Save and refresh to confirm changes persist.

### 6. Estimates / Payments
1. Use a Stripe-connected business.
2. Create and send a new estimate.
3. Open the public estimate link on mobile.
4. Test Accept and Pay with Stripe test mode.
5. Confirm the customer sees a clean success state.
6. Confirm customer receipt and owner notification emails arrive.
7. Repeat on a fresh estimate with Accept now, pay later.
8. Confirm the dashboard state is correct after each path.

---

### 0B. Copy safety pass
1. Use only a throwaway test business whose copy can safely change.
2. Go to `admin.foundco.app/copy`.
3. Confirm there is no `Regenerate All` button.
4. Tap `Regenerate` and confirm the warning lists the live content that will change.
5. Tap Cancel and confirm nothing changes.
6. Reopen the warning, choose `Save and regenerate`, and wait for completion.
7. Tap `View site` and confirm the test site shows the regenerated copy.
8. Tap `Undo changes`, then refresh the public site and confirm the previous copy returns.
9. Do not run this test on a real customer site.

---

### 0C. Found HQ redesign pass
1. Open `admin.foundco.app` on your phone.
2. Confirm the bottom navigation shows only Overview, Businesses, Quality, and More.
3. On Overview, confirm attention rows and new businesses are readable and useful.
4. Search for a business from Overview and confirm Businesses opens with that search.
5. On Businesses, test All, Attention, Setup, No logo, and Payments filters.
6. Confirm Site and View as still work. Open Manage and confirm notes and comp controls still work.
7. Open Quality, then Website copy, Photo library, and Email previews.
8. Open More and confirm Sign out is there, not in the mobile dock.
9. Check that no content is hidden behind the bottom navigation.

---

## Required End-Of-Session Update

Before ending any work session, update this file with:

1. What changed or shipped.
2. What still needs work.
3. Shawn's plain-English test steps.
4. Commit hash, if a commit was made.

If there was a product or design decision, also update `DECISIONS.md` or `DESIGN_DECISIONS.md`.
If there was meaningful code or QA work, also update `CHANGELOG.md`.
If priorities changed, also update `TASKS.md`.

---

## July 8, 2026 - Found HQ V2 Reset Audit

### What changed
- Audited the current Found HQ product, schema, onboarding capture, and production aggregates.
- Recorded the full recommendation in `FOUND_HQ_V2_AUDIT.md`.
- No production behavior, schema, or UI changed.

### Key findings
- The current HQ is a useful support console but not a Found Co sales/client operating system.
- All 10 abandoned-onboarding rows use one email and overlap an existing company; they are not a real prospect pipeline.
- Stripe customer presence and subscription status are insufficient to represent client health.
- The recommended primary navigation is Today, Sales, Clients, and More.

### Next approval
- Shawn reviews and approves the detailed V2 workflow and data model.
- After approval, start Phase 1 with a migration and backfill dry run before touching production records.

---

## July 8, 2026 - Found HQ V2 Foundation

### Shipped
- Production schema for Found Co prospects, sales activities, client activities, client state, and test-account classification.
- Primary navigation: Today, Sales, Clients, More.
- Functional prospect creation, contact links, stage changes, follow-up scheduling, loss reasons, and activity logging.
- Client filtering, relationship state, test classification, dated notes, Site, and View as.
- Quality tools moved under More.

### Important
- Existing companies were conservatively classified as Active or Onboarding from subscription state.
- Existing test companies are not guessed automatically. Mark them Test from Clients before trusting client totals.
- The old tenant `leads` table was not repurposed or changed.

### Shawn's test pass
1. Open Found HQ on iPhone and confirm the dock reads Today, Sales, Clients, More.
2. On Today, confirm setup blockers appear in priority order and each Resolve action opens the matching client.
3. Open Sales and add one throwaway prospect with your own contact information.
4. Confirm Call/Text/Email links appear for the information entered.
5. Open Update, change the stage, schedule a follow-up, and log a note.
6. Return to Today and confirm the prospect appears when it is new or due.
7. Open Clients, find one known test company, open Manage relationship, and classify it Test.
8. Add a dated note and confirm it appears as Latest after saving.
9. Confirm Site and View as still work.
10. Open More and confirm Website copy, Photo library, and Email previews still open.

---

## July 8, 2026 - Found HQ Brand Refinement

### Changed
- Applied Jony's Found HQ visual system across Today, Sales, Clients, More, and the shared shell.
- Green now signals identity, selection, and commitment instead of filling repeated controls.
- Primary operational content uses quiet separators and spacing instead of stacked cards.
- Added `FOUND_HQ_BRAND_SYSTEM.md` as the implementation standard.

### Test
1. Compare Today, Sales, Clients, and More on iPhone.
2. Confirm no filters scroll horizontally and no text overlaps.
3. Confirm Site, View as, Manage relationship, Add prospect, and quality links still work.

---

## July 8, 2026 - Native iPhone Typography

### Changed
- Found HQ mobile typography now follows a native iOS scale across every primary screen and form.
- Body and row titles are 17-18px; supporting information is 13-15px; page titles are 34px.

### Test
1. Open Today, Sales, Clients, and More on iPhone.
2. Confirm supporting text is comfortable without zooming.
3. Confirm longer client metadata wraps cleanly and no controls overlap.

---

## July 24, 2026 - Magic Login Email Raw Link Fix

### What changed
- Fixed the dashboard magic-login email so the Supabase one-time auth URL no longer appears as visible blue fallback text at the bottom of the email.
- Kept the actual one-time login URL inside the green Open Dashboard button.
- Removed the visible raw auth URL.
- Restored polished arrow/dash rendering through HTML entities and removed the footer location that iPhone Mail auto-linked in blue.

### Team read
- Steve: launch polish bug; owners should see one clear button, not a technical token URL.
- Jony: raw auth URLs do not belong in a Found email.
- Craig/Priya: the token remains in the button href only; the visible email body no longer exposes it as text.

### Verification
- `git diff --check` passed with only the repo's normal CRLF warning.
- `cmd /c npm run build` passed.

### Test next
1. Request a new Found dashboard login email.
2. Confirm the email shows the green Open Dashboard button with a clean arrow and the expiration text.
3. Confirm there is no long blue Supabase URL at the bottom and no blue auto-linked Tucson footer.
4. Tap Open Dashboard and confirm it still signs you in.

---

## July 25, 2026 - Launch Smoke Test #1 Passed

### What passed
- Shawn completed launch checklist #1 on normal iPhone Safari.
- Lucky/T-Shirts shop browsing, cart, product details, and payment-start path passed without the Stripe `inner.html` download prompt returning.

### Current plain-English launch checklist
1. Safari shop check - PASSED.
2. Fresh customer signup - NEXT.
3. Dashboard company switching.
4. One lead/inquiry notification test.
5. One payment receipt check.
6. Found login email - PASSED.

### Next test for Shawn
1. Go to `foundco.app` as a brand-new business owner.
2. Start onboarding and create a test business.
3. Pick a paid plan and use the promo code if needed.
4. Pay.
5. Confirm it lands in the correct dashboard for that new business.

---

## July 25, 2026 - Site Announcements / Promotions

### What changed
- Added one premium announcement block owners can turn on from Edit My Site.
- Announcement supports title, body, button text, target link, visual style, and an optional image/video background.
- Public websites render the announcement below the hero across Impact, Editorial, Portrait, and Cinematic layouts.
- Announcement photos now have their own Website Photos slot.
- Copy polishing now protects announcement headline, body, button, and link fields.
- Database migration added: `048-site-announcements.sql`.

### Team decision
- Steve/Jony direction: one elegant promotion moment, not a cluttered banner stack.
- Angela direction: defaults should work without training; owners can leave it alone or customize it quickly.
- Craig/Priya/Marcus direction: store this as website config, render it once through shared layout infrastructure, and make it available to every template.

### Verification
- `cmd /c npm run build` passed before handoff update.

### Test next
1. Open `my.foundco.app` > Edit My Site.
2. Turn Announcement on.
3. Edit headline/body/button or leave the default.
4. Pick a destination chip such as Shop, Menu, Contact, Services, Estimate, or Reservations.
5. Optional: choose Image style and assign an Announcement photo.
6. Open the live site and confirm the announcement appears below the hero and the button goes to the right page.
### July 26, 2026 - Announcement QA Correction
- Fixed announcement defaults so generic retail/apparel shops no longer show bike/back-to-school language unless the business is bike-specific.
- Fixed the announcement editor preview contrast so Light, Default, Dark, Accent, and Image controls stay readable.
- Editing announcement fields now opens with the visible default copy instead of a blank field.
- Verified with `git diff --check` and `cmd /c npm run build`.

Test next: Open Lucky > Edit My Site > Announcement. Confirm the default says `New in the shop.` and Light/Dark/Default controls are readable.
---

## July 26, 2026 - Current Handoff: Edit Site Slate Pass

### Latest completed work
- The approved team direction for the whole Edit My Site slate is implemented.
- The page now opens with Site Studio readiness signals and clearer section language instead of relying on "tap to edit" labels.
- Section hierarchy now guides the owner through first impression, current push, page copy, shopping/ordering, services, photos, and launch trust.

### Verification
- `cmd /c npm run build` passed.
- `git diff --check` passed with only the normal CRLF warning.

### Next human QA
1. Open `my.foundco.app` as an owner.
2. Go to More > Edit My Site.
3. Confirm the new Site Studio header and readiness cards feel natural on iPhone.
4. Check each major section for clarity: Home, Featured Update, About, Contact, Products/Menu, Services, Gallery, Custom Domain.
5. If the pass feels good, continue launch checklist; if not, bring screenshots back to the team before coding.
