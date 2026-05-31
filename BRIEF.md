# BRIEF.md — Found Co. / found-websites
### Say this to any AI at the start of any session: "Read BRIEF.md"
### This file is the entry point. Read everything before touching anything.

---

## STEP 1 — READ THESE FILES FIRST

Before you write a single line of code, make a single suggestion, or take any action:

1. Read `PROJECT.md` — what Found Co. is, tech stack, brand, database, current build status
2. Read `CHANGELOG.md` — what was done last session, what is still pending, what's next
3. Read `AGENTS.md` — the Apple team: Steve Jobs, Jony Ive, Phil, Craig, Eddy, Angela
4. Read `TASKS.md` — current phase, what is NOW, NEXT, BACKLOG
5. Read `PRODUCT_BRIEF.md` — the full Found Co. product vision, features, pricing, upgrades
6. Read `DECISIONS.md` — every approved product decision, locked unless Steve reopens it
7. Read `DESIGN_DECISIONS.md` — every approved visual/UX decision, locked unless Jony reopens it
8. Read `ONBOARDING.md` — the full onboarding question flow, exact wording, tone, branching logic

If any required file is missing — stop and tell Shawn before proceeding.

---

## STEP 2 — CHECK WHAT'S PENDING BEFORE MOVING FORWARD

After reading CHANGELOG.md, your first message must include:

**"Here's where we left off:"**
- ✅ What was completed last session
- ⏳ What is still pending or unfinished
- 🔜 What the next priority is

**Then ask:** "Would you like to continue where we left off, or is there something new?"

Never silently skip pending items.

---

## STEP 3 — UNDERSTAND WHO YOU'RE WORKING WITH

**Shawn Lopez** — Owner, Say It Marketing, Tucson AZ. In business since 1999.
Web design, branding, SEO, hosting, social media, print brokerage.

**How Shawn works:**
- Works from his iPhone while multitasking — often voice-to-text
- Direct and conversational — no jargon, no essays
- Wants clear options and copy-paste ready output
- Learns by doing — explain what you're doing and why in plain English
- Gets excited about new ideas — your job is to keep him focused AND share the excitement
- Does not waste time or money — every action must have a clear purpose

**Time = Money. Always.**

---

## STEP 4 — THE APPROVAL RULE (NON-NEGOTIABLE)

**No AI makes any decision without Shawn's approval first.**

This includes: pushing code, modifying files, creating files, deleting anything, changing pricing or copy, installing dependencies, changing configuration.

**The right pattern:**
1. Recommend what you think should be done
2. Explain why briefly
3. Ask for approval
4. Wait for a "yes" or "go ahead" before acting

You may strongly recommend. You may push back. You may NOT act first and explain later.

---

## STEP 5 — THE REPO

**Repo:** `found-websites` (local: `C:\Users\SuperShawn\Documents\GitHub\found-websites`)
**Hosting:** Vercel (NOT Netlify — switched May 29, 2026)
**Stack:** Next.js 16 + Tailwind + Supabase + TypeScript

This is a **multi-tenant platform**. One codebase. Every Found Co. client gets their own website at:
- `[slug].foundco.app` (subdomain)
- OR their own custom domain (e.g., barriobuilders.com)

**Barrio Builders = Instance #1** (the guinea pig that proves the platform works)

---

## STEP 6 — DESIGN RULES (NON-NEGOTIABLE)

Every decision goes through Jony Ive. Every site must look like Apple built it.

- Clean, minimal, nothing unnecessary
- Mobile first — always
- Typography logo as fallback (elegant, not cheap)
- Pill-shaped buttons
- Jony Ive color palettes as presets — custom hex option for existing brands
- If it needs instructions, it's too complicated

---

## STEP 7 — END OF SESSION RULES

When Shawn says **"Wrap up the session"** — do all of the following before closing:

1. **Update CHANGELOG.md** — what was completed, what's pending, what's next
2. **Update TASKS.md** — move tasks, add new ones to backlog
3. **Remind Shawn** of any open critical items
4. **Confirm** next steps are clear

**No session ends without updated CHANGELOG and TASKS. No exceptions.**

---

## THE MISSION

> Every small business owner deserves to look as big as Apple online.
> Found makes that possible — from their phone, in minutes, for less than $40/month.
> No developers. No drag-and-drop. No tech skills required.
> Answer questions. See your site. Get found.

---

## QUICK REFERENCE

| What | Where |
|---|---|
| Product vision + features + pricing | `PRODUCT_BRIEF.md` |
| Project context + tech stack + brand | `PROJECT.md` |
| Session history + pending + next steps | `CHANGELOG.md` |
| Agent team + roles | `AGENTS.md` |
| Active tasks + backlog | `TASKS.md` |
| Every approved product decision | `DECISIONS.md` |
| Every approved design/UX decision | `DESIGN_DECISIONS.md` |
| Onboarding question flow + wording | `ONBOARDING.md` |
| Supabase project | mmctzloztgkbqvofmkou.supabase.co |
| Domain | foundco.app |
| Guinea pig site | barriobuilders.com |
| GitHub repo | github.com/found-co/found-websites |
| Hosting | Vercel |
