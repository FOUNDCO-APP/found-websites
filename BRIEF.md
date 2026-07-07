# BRIEF.md - Found Co. / found-websites
### Say this to any AI at the start of any session: "Read BRIEF.md"
### This file is the entry point. Read this before touching anything.

---

## STEP 1 - READ THESE FILES FIRST

Before you write code, make a product suggestion, or take action, read these files in order:

1. `SESSION_HANDOFF.md` - current truth: what changed, what is open, and Shawn's test steps.
2. `TASKS.md` - active task board: NOW, NEXT, BACKLOG.
3. `CHANGELOG.md` - current session history only.
4. `CHANGELOG_ARCHIVE.md` - older detailed history when needed.
5. `AGENTS.md` - the Found team and approval rules.
6. `PROJECT.md` - what Found is, stack, brand, database, build status.
7. `PRODUCT_BRIEF.md` - product vision, features, pricing, upgrades.
8. `DECISIONS.md` - approved product decisions, locked unless Steve reopens them.
9. `DESIGN_DECISIONS.md` - approved visual/UX decisions, locked unless Jony reopens them.
10. `ONBOARDING.md` - onboarding question flow, wording, tone, branching logic.
11. `INDUSTRY_MANIFESTS.md` - industry section manifests.
12. `INDUSTRY_WORKFLOW_AUDIT.md` - intake vocabulary vs business tools audit.
13. `MORE_MANAGE_IA_AUDIT.md` - More / Manage IA decisions.
14. `WIX_COMPETITOR_REVIEW.md` - Wix review and what Found should/should not borrow.

If a required file is missing, stop and tell Shawn before proceeding.

**Also run `git status` before trusting any of the above as fully current.** `SESSION_HANDOFF.md` only reflects reality if it was actually committed. A prior session can end mid-work (a credit cutoff, a crash, Shawn closing the tab) before its doc updates ever reach git — the files on disk can be ahead of, or different from, the last commit. If `git status` shows uncommitted changes, read those first; they may be more current than `SESSION_HANDOFF.md` itself. This happened once already: a full documentation reorg sat uncommitted through a session cutoff and was almost lost.

---

## STEP 2 - START EVERY SESSION WITH CURRENT STATUS

After reading `SESSION_HANDOFF.md`, your first useful response must include:

**Here's where we left off:**
- What changed / finished.
- What is still pending or unfinished.
- What Shawn needs to test next.

Then ask whether to continue where we left off or start something new.

Never silently skip pending items.

---

## STEP 3 - UNDERSTAND WHO YOU'RE WORKING WITH

**Shawn Lopez** - Owner, Say It Marketing, Tucson AZ. In business since 1999.
Web design, branding, SEO, hosting, social media, print brokerage.

**How Shawn works:**
- Works from his iPhone while multitasking, often using voice-to-text.
- Direct and conversational.
- Wants clear options and copy-paste ready output.
- Learns by doing; explain what you are doing and why in plain English.
- Gets excited about new ideas; help keep the work focused without killing momentum.
- Does not waste time or money; every action must have a clear purpose.

Time equals money. Always.

---

## STEP 4 - TEAM AND APPROVAL RULE

No AI makes product, design, process, pricing, copy, data, or architecture decisions alone.

For product/design/process decisions, hold a visible team meeting before changing anything:

- Steve leads product judgment and final product approval.
- Jony leads visual/UX design.
- Angela leads customer journey, onboarding, empty/error states, and test clarity.
- Craig leads architecture and technical process.
- Priya leads data, schema, RLS, and payment data safety.
- Marcus leads website/template/integration behavior.
- Chris leads PWA/mobile behavior.
- Phil leads marketing, pricing, and upgrade copy.

The pattern:

1. Let the right team lead speak first.
2. Let the rest of the team add concerns.
3. Summarize the recommended direction.
4. Wait for Shawn's approval.
5. Only then implement.

You may strongly recommend. You may push back. You may not act first and explain later.

---

## STEP 5 - THE REPO

**Repo:** `found-websites`
**Local path:** `C:\Users\SuperShawn\Documents\GitHub\found-websites`
**Hosting:** Vercel, not Netlify.
**Stack:** Next.js 16 + Tailwind + Supabase + TypeScript.

This is a multi-tenant platform. One codebase. Every Found client gets a website at:

- `[slug].foundco.app`
- or their own custom domain, such as `barriobuilders.com`

Barrio Builders is Instance #1, the guinea pig that proves the platform works.

---

## STEP 6 - DESIGN RULES

Every design decision goes through Jony. Every product decision goes through Steve.

- Mobile first, always.
- Clean, minimal, and direct.
- The owner never sees the backend.
- If a business owner needs instructions, the flow is too complicated.
- Found should feel like one system, not many stitched-together tools.
- Use the global Found visual language: spacing, typography, color, cards, controls, and motion.
- Business owners need tools that make money and save time, not database screens.

---

## STEP 7 - DOCUMENTATION RULES

`SESSION_HANDOFF.md` is the current source of truth. Keep it short.

`TASKS.md` is the active work board. Keep it focused on what is now, next, and backlog.

`CHANGELOG.md` is current session history. Keep a rolling current window plus anything still active.

`CHANGELOG_ARCHIVE.md` is older detailed history. Move old completed history there so the current files stay readable.

`DECISIONS.md` and `DESIGN_DECISIONS.md` are locked decision records. Do not bury final decisions only in a chat log.

---

## STEP 8 - END OF SESSION RULES

Before ending meaningful work, update the docs:

1. Update `SESSION_HANDOFF.md` with what changed, what is open, and Shawn's plain-English test steps.
2. Update `TASKS.md` if priorities changed.
3. Update `CHANGELOG.md` if code, QA, product, or process work changed.
4. Move old completed history to `CHANGELOG_ARCHIVE.md` when current files get too heavy.
5. Update `DECISIONS.md` or `DESIGN_DECISIONS.md` if a decision was approved.
6. Tell Shawn exactly what changed and what to test next.

No meaningful work session ends without the current handoff being updated.

---

## THE MISSION

Every small business owner deserves to look as big as Apple online.

Found makes that possible from their phone, in minutes, without developers, drag-and-drop, or technical skills.

Answer questions. See your site. Get found.

---

## QUICK REFERENCE

| What | Where |
|---|---|
| Current handoff: changed, open, tests | `SESSION_HANDOFF.md` |
| Active tasks and backlog | `TASKS.md` |
| Current session history | `CHANGELOG.md` |
| Older detailed history | `CHANGELOG_ARCHIVE.md` |
| Team and approval rules | `AGENTS.md` |
| Project context and stack | `PROJECT.md` |
| Product vision, features, pricing | `PRODUCT_BRIEF.md` |
| Approved product decisions | `DECISIONS.md` |
| Approved design/UX decisions | `DESIGN_DECISIONS.md` |
| Onboarding flow and wording | `ONBOARDING.md` |
| Industry manifests | `INDUSTRY_MANIFESTS.md` |
| Industry workflow audit | `INDUSTRY_WORKFLOW_AUDIT.md` |
| More / Manage IA audit | `MORE_MANAGE_IA_AUDIT.md` |
| Wix competitor review | `WIX_COMPETITOR_REVIEW.md` |
| Supabase project | `mmctzloztgkbqvofmkou.supabase.co` |
| Domain | `foundco.app` |
| Guinea pig site | `barriobuilders.com` |
| GitHub repo | `github.com/found-co/found-websites` |
| Hosting | Vercel |