# MORE_MANAGE_IA_AUDIT.md - Found More / Manage Information Architecture
### Steve leads. Jony and Angela shape the experience. Craig owns the registry. Priya owns data rules.

---

## Why this exists

After reviewing Wix's mobile Manage and onboarding screens, the team agreed that Found should not copy Wix's design, but should improve the structure of More. Wix has too many generic software categories, but it does show one useful pattern: grouped access to the parts of the business.

Found's current More page is doing several jobs at once:
- My Site
- My Dock
- Install PWA
- Payment setup
- Included business tools
- Plan/upgrade cards
- Add-ons
- Account actions

That is too much for one flat page. The next practical step is to define a structured More/Manage model before redesigning the UI.

---

## Product Principle

The Dock is for daily work. More is for secondary tools, setup, plan access, and business operations that do not deserve a permanent tab.

More should answer: "What part of my business do I need to manage?"

---

## Proposed Group Model

### 1. Website

Purpose: manage the public site and how customers find it.

Tools/actions:
- Edit My Site
- Photos
- Share My Site
- Domain setup
- Services/menu shown on site
- Add to Home Screen

Default for: all businesses.

### 2. Get Paid

Purpose: money movement and payment readiness.

Tools/actions:
- Estimates
- Payment setup
- Orders when commerce is active
- Receipts / invoice history later
- POS / invoice-now later

Default for: Business plan and any account with quote payments, online ordering, shopping cart, or payment setup available.

### 3. Customers

Purpose: customer intake and memory.

Tools/actions:
- Requests / Leads / Bookings / Reservations / Orders intake label
- Contacts / Clients / Guests / People
- Follow-up / lead sequence where Pro+ applies

Default for: all businesses, with vocabulary from industry/sub-industry.

### 4. Work & Schedule

Purpose: time, bookings, availability, and work operations.

Tools/actions:
- Schedule
- Reservations
- Booking calendar
- Services
- Availability

Default for: booking/reservation/appointment-first industries and anyone with reservation_calendar active or included.

### 5. Marketing

Purpose: bring customers back and create growth.

Tools/actions:
- Email marketing
- Review requests later
- Social posts later
- Campaigns later

Default for: Business plan, email_marketing add-on, and owners with enough customer history to make it useful.

### 6. Insights

Purpose: owner-readable performance, not analytics dashboards first.

Tools/actions:
- Estimate opened / accepted / paid signals
- Request source summary later
- Top services / most requested work later
- Website traffic later

Default for: Pro+ when lead tracking exists; Business when payments/estimates/orders create signals.

### 7. Settings

Purpose: account and business configuration.

Tools/actions:
- Business info
- Plan / billing
- Team / workers later
- Payments account status
- Organize Dock
- Sign out

Default for: all businesses.

---

## Current Tool Mapping Audit

| Current tool/action | Proposed group | Keep in Dock? | Notes |
|---|---|---:|---|
| Home | Dock only | Yes | Always first. Not repeated as a More row unless in dock organizer. |
| Requests / Leads / Bookings / Reservations / Orders intake | Customers | Yes for most | Label comes from structured industry/sub-industry, not business name. |
| Estimates | Get Paid | Yes for quote-first Business profiles | Separate from Estimate Requests intake. |
| Schedule | Work & Schedule | Yes for time-based businesses | Needs future calendar-first redesign. |
| People / Clients / Guests | Customers | Often | Label varies by industry. |
| Photos | Website | Maybe | Daily for photo-heavy businesses; More-only for others. |
| Contacts | Customers | More-only unless owner pins it | Contacts and People need future product cleanup. |
| Email | Marketing | More-only unless active daily | Business plan includes it; do not force into Dock by default. |
| Payment setup | Get Paid / Settings | More-only | Contextual CTA, not a tab. |
| Install PWA | Website / Settings | More-only | Keep, but lower priority after initial setup. |
| Plan / upgrade cards | Settings | More-only | Should not interrupt daily work once active. |
| Sign out | Settings | More-only | Bottom of page. |

---

## Build Order Recommendation

### Step 1 - Registry extension

Add a More group concept to the existing dashboard tool policy.

Each tool should know:
- `id`
- `path`
- `label`
- `group`
- `icon`
- `dockDefaultPriority`
- `moreOnly` when appropriate
- plan/add-on access rule

Do not hardcode More groups directly inside the page.

### Step 2 - More page grouping

Replace the flat My Dock-first layout with grouped sections:
- Website
- Get Paid
- Customers
- Work & Schedule
- Marketing
- Insights
- Settings

Keep `Organize my Dock`, but move it to Settings or a small Dock section after primary groups.

### Step 3 - Industry default QA

Test group visibility and dock defaults for:
- Construction/remodeler
- Blue Luna Events / balloon decor
- Food/restaurant
- Beauty/wellness booking business
- Retail/product business
- Professional service

### Step 4 - Copy polish

Replace software names with outcome language where appropriate:
- Analytics -> Insights / Know what's working
- AI Agents -> AI help where it belongs, unless explicitly using an AI destination
- Leads -> Requests / Leads / Bookings / Reservations based on business model
- Getting Paid -> Get Paid

### Step 5 - Visual polish

Jony direction:
- Keep Found dark, quiet, and premium.
- Use icons consistently.
- Avoid nested cards inside cards.
- Avoid a Wix-style white admin page.
- Give each group enough breathing room, but do not create a long junk drawer.

---

## Team Decision

Proceed with a More/Manage IA redesign only after the registry map is defined. Do not start by moving pixels. Start by making every tool's role, group, and default behavior explicit.

---

## Test Plan After Build

1. Open a construction profile and confirm Dock prioritizes Requests, Estimates, Schedule or Clients, and More.
2. Open Blue Luna Events and confirm Requests + Estimates stay separate.
3. Open a restaurant profile and confirm Orders/Reservations/Guests logic still makes sense.
4. Open More and verify tools are grouped by business outcome, not a flat list.
5. Confirm each row uses the same icon language as the Dock.
6. Confirm unpinned tools remain available without crowding the Dock.

---
## July 6 Build Update - Business Cleanup Slice

Implemented the first cleanup slice from the team review:
- Business plan accounts no longer show a redundant `Included Business Tools` list.
- Missing tools still appear as `Add Features` for non-Business plans.
- `Camera` is now a Website tool alongside Photos.
- Business plan status is quieter and no longer repeats the full sales checklist.

Next queued slice: Schedule should become a real schedule surface with `Calendar`, `Bookings`, and `Hours` instead of opening directly into working-hour setup.

---

## Implemented Slice: Schedule As Work Calendar (July 6, 2026)

Team decision: Dock `Schedule` should open to a calendar-style work surface first. The owner wants to know what is booked before they adjust setup.

Implemented:
- `Schedule` opens to `Calendar`.
- `Bookings` remains the detailed booking list.
- `Hours` contains weekly availability and time-off blocking.

Next QA: confirm this holds across Blue Luna Events, Molcas/restaurant, and any booking-first service profile.

---

## Implemented Slice: Schedule Hours Polish (July 6, 2026)

Team decision: Hours should not expose a technical settings form by default.

Implemented:
- Shared Found typography on the Schedule page header.
- Quieter tab treatment.
- Weekly hours summary first.
- Explicit Edit mode for day toggles and open/close times.
- Booking settings collapsed into one row for appointment length and buffer.
- Time off remains available as a secondary Hours section.

Next QA: test Schedule on profiles with no bookings, active bookings, restaurants, quote-first businesses, and appointment-first businesses.
