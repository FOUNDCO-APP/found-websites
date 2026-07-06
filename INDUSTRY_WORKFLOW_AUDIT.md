# INDUSTRY_WORKFLOW_AUDIT.md - Intake Vocabulary vs Business Tools
### Steve leads. Jony, Angela, Craig, Priya, Marcus, and Chris review. Shawn gives final approval before code.
*Created: July 5, 2026*

---

## Purpose

This audit separates two things the product had started to mix together:

1. **Customer intake vocabulary** - what an incoming customer action is called inside Found.
2. **Business tools** - the separate workflows the owner uses to run the business.

`Estimates` / `Quotes` are not the same as `Leads`, `Inquiries`, `Bookings`, `Reservations`, `Orders`, or `Appointments`. A customer may submit a lead, booking, inquiry, order, appointment request, reservation, or quote request first. The owner may then create an estimate/quote as a separate document with pricing, approval, deposit, payment link, invoice, and receipt.

Do not infer workflow from the business name or slug. Use `industry_category`, `sub_industry`, `primary_intent`, and explicitly saved owner choices.

---

## Repo Evidence Pulled

- `src/lib/industryManifests.ts` defines industry category, sub-industries, public CTA intent, and likely upgrades.
- `src/lib/dashboard/typography.ts` currently maps industry to dashboard vocabulary through `defaultFormIntentFor()`.
- `src/lib/featureAccess.ts` defines separate business tools/add-ons such as `quote_payments`, `reservation_calendar`, `online_ordering`, `shopping_cart`, and `email_marketing`.
- `src/lib/dashboard/toolPolicy.ts` currently uses the intake intent to route dock tabs, which can collapse quote-first businesses into `/estimates`.
- `src/types/company.ts` stores `industry_category`, `sub_industry`, `primary_intent`, and `secondary_intent`; dashboard data currently also has `form_intent`.

---

## Team Vocabulary

### Intake labels

| Label | Meaning | Example business types |
|---|---|---|
| Leads | A sales opportunity the owner needs to follow up and convert. | Real estate, professional services, event services, creative work when the next step is conversation. |
| Inquiries | A general question or info request, not necessarily ready to buy/book. | Nonprofit, childcare waitlist, broad contact forms, low-commitment info requests. |
| Quote Requests | A customer is asking for pricing, but no estimate document exists yet. | Contractors, cleaning, landscaping, balloon decor, home/property, project creative work. |
| Bookings | A customer is trying to reserve a service, session, provider, class, or event date. | Wellness, beauty, fitness, pet services, DJs, performers, some event services. |
| Reservations | A customer is trying to hold a table/time slot, usually food/venue style. | Restaurants, dining, venues. |
| Orders | A customer is choosing products/menu items and may pay. | Retail, home-based food, shopping cart, online ordering. |
| Appointments | A formal scheduled visit where the word appointment is expected. | Healthcare, clinical, professional appointment-based services. |

### Separate tools

| Tool | Meaning |
|---|---|
| Estimates / Quotes | Owner-created priced documents with line items, totals, approval, deposit/payment, invoice, and receipt. |
| Schedule / Calendar | Owner availability, appointments, bookings, reservations, time off, and calendar views. |
| Orders / Cart | Menu/product selection and checkout. |
| Contacts / People | Lightweight customer memory across leads, bookings, estimates, orders, invoices, and repeat customers. |
| Email Marketing | Broadcast/campaign workflow, separate from one-off intake follow-up. |

---

## Industry Audit Matrix

| Industry | Manifest public intent | Current dashboard mapping | Team intake recommendation | Separate tools/defaults | Notes |
|---|---:|---:|---|---|---|
| Home Services | quote | Estimates | Quote Requests or Leads | Estimates default; Contacts; Photos | Current code collapses intake into Estimates. Should separate request intake from actual estimate documents. |
| Food | reserve | Reservations | Reservations for restaurants; Orders for ordering-heavy businesses | Orders if online ordering/cart active; Schedule if reservations active | Catering and custom orders may need Quote Requests or Leads as subcategory overrides. |
| Wellness | book | Bookings | Bookings | Schedule default; Contacts | Works conceptually. Do not call these leads unless owner chooses. |
| Events | quote | Inquiries | Quote Requests or Leads, depending sub-industry | Estimates default; Schedule optional | Current mismatch: manifest says quote, dashboard says inquiry. Balloon decor should not be generic inquiry. |
| Retail | visit/shop | Orders | Orders when commerce is active; Leads for non-commerce retail requests | Shopping Cart/Orders; Contacts | Visit-only stores may not need Orders by default until cart/add-on active. |
| Fitness | book | Bookings | Bookings | Schedule default; Contacts | Works conceptually. |
| Beauty | book | Bookings | Bookings | Schedule default; Contacts | Works conceptually. |
| Automotive | book | Estimates | Appointments or Quote Requests | Schedule and Estimates both likely | Current code maps to Estimates, but many auto businesses first need service appointments. |
| Pet Services | book | Bookings | Bookings | Schedule default; Contacts | Works conceptually. |
| Cleaning | quote | Estimates | Quote Requests | Estimates default; Schedule optional for recurring jobs | Current code collapses request intake into Estimates. |
| Landscaping | quote | Estimates | Quote Requests | Estimates default; Photos; Contacts | Current code collapses request intake into Estimates. |
| Real Estate | call/contact | Inquiries | Leads | Contacts; Email follow-up | Manifest says capture leads; current dashboard says inquiries. Team recommends Leads. |
| Creative Services | contact | Inquiries | Leads or Quote Requests | Estimates optional/default for project pricing | Current dashboard says inquiries; many creative projects need quote request + estimate. |
| Home-Based Food | contact | Orders | Orders for menu/product businesses; Quote Requests for catering/custom cakes | Orders/cart; Schedule optional; Estimates optional for catering | Needs subcategory split. |
| Education | book | Inquiries | Bookings | Schedule default | Current dashboard says inquiries but manifest says book. Mismatch. |
| Music & Performance | contact | Bookings | Bookings | Schedule optional; Estimates/deposits optional | Current dashboard mapping is closer than manifest intent. |
| Professional Services | contact | Inquiries | Leads or Appointments depending subcategory | Contacts; Schedule optional; Estimates optional | Accountant/attorney may be consultation lead; notary may be appointment. |
| Healthcare | book | Appointments | Appointments | Schedule default; Contacts | Works conceptually. |
| Childcare & Family | contact | Inquiries | Inquiries or Waitlist Requests | Contacts; Schedule optional | Inquiries may be correct here because trust/waitlist comes first. |
| Makers & Crafts | contact/shop | Orders | Orders or Custom Requests | Shopping Cart; Contacts; Estimates optional for custom work | Needs subcategory split. |
| Home & Property | quote | Estimates | Quote Requests | Estimates default; Schedule optional | Current code collapses request intake into Estimates. |
| Nonprofit & Community | contact/visit | Inquiries | Inquiries | Email/contacts; events/calendar optional | Current inquiry language is likely acceptable. |

---

## Subcategory Decisions Needed

### Events family

| Subcategory | Recommended intake | Separate tools |
|---|---|---|
| Balloon decor / balloon garland | Quote Requests or Leads | Estimates default; Schedule optional for event date. |
| Weddings / event planning | Quote Requests or Leads | Estimates default; Schedule optional. |
| Party rentals | Quote Requests or Orders depending rental catalog maturity | Estimates or cart later. |
| Venue | Reservations or Bookings | Schedule/Reservations default; Estimates optional for packages. |
| DJ / performer | Bookings | Schedule optional; Estimates/deposits optional. |
| Photography | Leads or Bookings | Estimates optional; client gallery later. |

### Food family

| Subcategory | Recommended intake | Separate tools |
|---|---|---|
| Restaurant | Reservations | Orders optional/default if ordering active. |
| Food truck | Orders or Leads depending setup | Orders optional/default if menu active. |
| Catering | Quote Requests or Leads | Estimates optional/default. |
| Bakery / custom cakes | Orders for catalog items; Quote Requests for custom cakes | Cart + Estimates can both apply. |
| Meal prep | Orders | Subscription/recurring later. |

### Professional / service family

| Subcategory | Recommended intake | Separate tools |
|---|---|---|
| Accountant / attorney / consultant | Leads | Appointments optional; documents later. |
| Notary / healthcare-like visits | Appointments | Schedule default. |
| Home/property/cleaning/landscaping | Quote Requests | Estimates default. |

---

## Craig's Architecture Recommendation

Do not keep using one `defaultFormIntentFor(industry)` to decide both page vocabulary and dock routing.

Recommended model:

```ts
type IntakeKind = "lead" | "inquiry" | "quote_request" | "booking" | "reservation" | "order" | "appointment"
type ToolKind = "estimates" | "schedule" | "orders" | "reservations" | "contacts" | "photos" | "email"
```

Then resolve separately:

```ts
resolveIntakeKind(industryCategory, subIndustry, formIntentOverride)
resolveDefaultTools(industryCategory, subIndustry, plan, activeAddons)
```

This keeps `Estimates` as a real tool instead of making it the name of an inbox.

---

## Team Recommendation Before Code

1. Add/approve `Quote Requests` as an intake label distinct from `Estimates`.
2. Use industry + sub-industry for defaults.
3. Keep owner override via saved `form_intent`, but do not use the business name/slug.
4. Update dashboard routing so quote-first businesses can have both intake and Estimates tools.
5. Start with the highest-impact mismatches:
   - Events / balloon decor
   - Home services / construction
   - Cleaning
   - Landscaping
   - Home & property
   - Real estate
   - Education

No code should change until Shawn approves this audit direction.