# WIX_COMPETITOR_REVIEW.md - July 6, 2026
### Team review of Wix mobile onboarding, dashboard, analytics, AI, and manage screens

---

## Context

Shawn loaded Wix screenshots as competitor reference. The goal is not to copy Wix. The goal is to identify useful product mechanics Found can learn from while keeping Found simpler, more premium, mobile-first, and owner-focused.

Screens reviewed:
- Wix setup choice: Chat with AI vs setup without chat.
- Wix business-type setup and add-on selection.
- Wix domain suggestion flow.
- Wix mobile dashboard home, analytics, AI agent, inbox, and manage menu.
- Wix Manage category structure: Getting Paid, Booking Calendar, Sales, Booking Services, Customers & Leads, Marketing, AI Agents, Analytics, Settings, Manage Apps.

---

## Team Meeting

### Steve Jobs - Product

Wix feels like software. It exposes its internal product catalog instead of guiding the owner to the next right action. The useful lesson is breadth, not design: one mobile place to run the business. Found should do that with fewer choices and more confidence.

Decision from Steve: Found should not become a generic admin console. More/Manage should be an owner operating system, not a feature warehouse.

### Jony Ive - Design

Wix is functional but visually ordinary: too many blue buttons, generic white rows, and admin-style lists. The grouped accordion pattern is useful, but Found must make it quieter, darker, more intentional, and more premium.

Decision from Jony: borrow structure, not style. Found should use restrained sections, Found icons, clear hierarchy, and fewer competing surfaces.

### Angela Ahrendts - Customer Experience

The onboarding lesson is valuable: Wix asks what kind of site and what capabilities the owner wants. Found should ask it in a more natural way: what do customers need to do with you?

Decision from Angela: Found onboarding and More should ask in plain business outcomes: request a quote, book a time, order, message, subscribe, or pay.

### Craig Federighi - Engineering

Wix shows the risk of a tool catalog without a strong policy layer. Found needs one source of truth for every tool: id, label, icon, plan access, industry fit, default dock behavior, More group, upgrade path, and route.

Decision from Craig: the next build should strengthen the tool registry instead of hardcoding sections page by page.

### Priya Nair - Data

Industry awareness must come from saved business type, sub-industry, owner choices, plan, and add-ons. It must not come from business name or slug. Blue Luna Events was a test profile name; the deciding field is balloon decor.

Decision from Priya: every default tool and label must be explainable from structured data.

### Marcus Webb - Website / Integration

Wix separates website management from business operations. Found can beat that by keeping them connected: services, estimates, bookings, orders, photos, and public site content should stay in sync.

Decision from Marcus: More should not just list tools; it should connect the owner to the parts of the business and site those tools affect.

### Chris Lattner - Mobile / PWA

Wix uses familiar mobile patterns: bottom nav, business switcher, quick add, notifications, and a Manage menu. Found already has a better mobile tone, but More needs to stay thumb-friendly and not become a dumping ground.

Decision from Chris: the Dock is daily work. More is secondary access and setup. Do not overload the Dock.

### Phil Schiller - Marketing

Wix names categories like software features. Found should name them by owner outcomes. Owners do not buy analytics; they want to know what is working. They do not buy AI agents; they want help replying, writing, and following up.

Decision from Phil: Found language should sell outcomes: Get paid, get booked, get more work, keep customers warm, know what is working.

---

## Locked Product Takeaways

1. Do not copy Wix's visual design.
2. Borrow the grouped Manage/Menu idea.
3. Found's More page should use business-owner language, not internal SaaS feature labels.
4. The Dock should stay limited to daily tools.
5. More should organize the rest by business jobs.
6. AI should live inside workflows, not only as a separate destination.
7. Analytics should be owner-readable insights before charts.
8. Tool defaults must come from structured industry/sub-industry/add-on data.

---

## Candidate More / Manage Groups

| Found group | Purpose | Example tools |
|---|---|---|
| Get Paid | Money workflows | Estimates, invoices later, deposits, payment setup, orders, receipts |
| Customers | Customer memory and intake | Requests, leads, contacts, clients, guests, follow-up |
| Work & Schedule | Time and job operations | Schedule, reservations, bookings, availability, services |
| Website | Public site controls | Edit My Site, photos, services/menu, domain, share site |
| Marketing | Outreach and growth | Email marketing, social posts later, review requests |
| Insights | Owner-readable performance | Opened estimates, traffic, requests, top service interest |
| Settings | Account and business setup | Plan, payments, team, business info, dock organization |

---

## Next Practical Step

Create a Found More/Manage information architecture audit that maps every current tool to:
- Group
- Label
- Icon
- Route
- Plan/add-on access
- Industry default
- Dock default or More-only
- Owner-facing reason it exists

Then build the More page from that structured map.
