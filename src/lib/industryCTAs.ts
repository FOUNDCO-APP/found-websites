import { intentLabel, intentHref } from "@/types/company"

export type CTA = { label: string; href: string }

// The scheduling action — upgradeable to full calendar add-on
export const SCHEDULING_CTA: Partial<Record<string, CTA>> = {
  food:                  { label: "Reserve a Table",     href: "/book" },
  wellness:              { label: "Book Now",             href: "/book" },
  beauty:                { label: "Book Now",             href: "/book" },
  fitness:               { label: "Book a Class",         href: "/book" },
  healthcare:            { label: "Book Appointment",     href: "/book" },
  home_services:         { label: "Get a Free Estimate",  href: "/estimate" },
  cleaning:              { label: "Get a Free Estimate",  href: "/estimate" },
  landscaping:           { label: "Get a Free Estimate",  href: "/estimate" },
  events:                { label: "Book Your Date",       href: "/book" },
  pet_services:          { label: "Book Now",             href: "/book" },
  automotive:            { label: "Schedule Service",     href: "/book" },
  real_estate:           { label: "Schedule a Tour",      href: "/book" },
  creative_services:     { label: "Book a Consultation",  href: "/book" },
  home_based_food:       { label: "Place an Order",       href: "/book" },
  education:             { label: "Book a Session",       href: "/book" },
  music_performance:     { label: "Book Now",             href: "/book" },
  professional_services: { label: "Schedule a Call",      href: "/book" },
  childcare:             { label: "Schedule a Tour",      href: "/book" },
  home_property:         { label: "Schedule a Visit",     href: "/book" },
  audio_visual:          { label: "Get a Free Estimate",  href: "/estimate" },
  // Team-approved 2026-08-06 - these 3 were the only industries genuinely
  // missing a scheduling CTA (confirmed against this file directly, after
  // an earlier draft wrongly assumed 4 more were also missing).
  retail:                { label: "Book an Appointment",  href: "/book" },
  makers_crafts:         { label: "Request a Commission", href: "/book" },
  nonprofit:             { label: "Plan Your Visit",      href: "/book" },
}

// The content action — upgradeable via online_ordering or shopping_cart add-ons
const CONTENT_CTA: Partial<Record<string, CTA>> = {
  food:                  { label: "View Our Menu",   href: "/menu" },
  wellness:              { label: "Our Services",    href: "/services" },
  beauty:                { label: "Our Services",    href: "/services" },
  fitness:               { label: "Our Programs",    href: "/services" },
  healthcare:            { label: "Our Services",    href: "/services" },
  home_services:         { label: "Our Services",    href: "/services" },
  cleaning:              { label: "Our Services",    href: "/services" },
  landscaping:           { label: "Our Services",    href: "/services" },
  events:                { label: "Our Packages",    href: "/services" },
  pet_services:          { label: "Our Services",    href: "/services" },
  automotive:            { label: "Our Services",    href: "/services" },
  real_estate:           { label: "Our Listings",    href: "/services" },
  creative_services:     { label: "Our Work",        href: "/services" },
  home_based_food:       { label: "View Our Menu",   href: "/menu" },
  education:             { label: "Our Programs",    href: "/services" },
  music_performance:     { label: "Our Services",    href: "/services" },
  professional_services: { label: "Our Services",    href: "/services" },
  childcare:             { label: "Our Programs",    href: "/services" },
  home_property:         { label: "Our Services",    href: "/services" },
  audio_visual:          { label: "Our Services",    href: "/services" },
  // NOT "Shop Now"/"/shop" - that page only exists when the shopping_cart
  // addon is active (see contentCTAFor/resolveActionKey, which route there
  // instead when it genuinely works). This is the fallback for when it
  // doesn't, so it must point somewhere real.
  retail:                { label: "Our Products",    href: "/services" },
  makers_crafts:         { label: "Our Products",    href: "/services" },
  nonprofit:             { label: "Get Involved",    href: "/services" },
}

const ORDERING_INDUSTRIES = new Set(["food", "home_based_food"])
const SHOPPING_INDUSTRIES = new Set(["retail", "makers_crafts"])

// Intents that resolve through the scheduling path
const SCHEDULING_INTENTS = new Set(["reserve", "book", "quote"])
// Intents that resolve through the content path
const CONTENT_INTENTS = new Set(["menu", "shop"])

function orderingCTA(): CTA {
  return { label: "Order Online", href: "/order" }
}
function shoppingCTA(): CTA {
  return { label: "Shop Online", href: "/shop" }
}
function callCTA(phone: string): CTA {
  return { label: "Call Us", href: `tel:${phone.replace(/\D/g, "")}` }
}

// The content CTA, upgraded when a paid ordering/cart add-on is actually
// active — same upgrade previously only applied to the hero's secondary
// button; now used everywhere a "content" action is resolved, primary
// included, so a food business with online ordering on gets "Order
// Online" instead of a plain "View Our Menu" wherever content wins.
function contentCTAFor(industry: string, activeAddons: string[]): CTA | null {
  if (ORDERING_INDUSTRIES.has(industry) && activeAddons.includes("online_ordering")) return orderingCTA()
  if (SHOPPING_INDUSTRIES.has(industry) && activeAddons.includes("shopping_cart")) return shoppingCTA()
  return CONTENT_CTA[industry] ?? null
}

function fallbackCTA(primaryIntent: string, phone: string | null): CTA {
  return {
    label: intentLabel[primaryIntent] || "Contact Us",
    href: primaryIntent === "call"
      ? `tel:${phone?.replace(/\D/g, "") ?? ""}`
      : intentHref[primaryIntent] || "/contact",
  }
}

// Stable keys an owner can manually pick from - resolved back to a real CTA
// at render time (not a frozen label/href), so a manual choice stays
// correct even if the business's setup changes later (e.g. picking
// "reserve" today still works fine if they add online ordering next month).
export type PrimaryActionKey = "order" | "shop" | "reserve" | "content" | "call"

function schedulingCTAFor(industry: string, bookingCtaLabel?: string | null): CTA | null {
  const base = SCHEDULING_CTA[industry]
  if (!base) return null
  return bookingCtaLabel ? { ...base, label: bookingCtaLabel } : base
}

function resolveActionKey(key: PrimaryActionKey, industry: string, activeAddons: string[], phone: string | null, bookingCtaLabel?: string | null): CTA | null {
  switch (key) {
    case "order": return ORDERING_INDUSTRIES.has(industry) && activeAddons.includes("online_ordering") ? orderingCTA() : null
    case "shop": return SHOPPING_INDUSTRIES.has(industry) && activeAddons.includes("shopping_cart") ? shoppingCTA() : null
    case "reserve": return schedulingCTAFor(industry, bookingCtaLabel)
    case "content": return CONTENT_CTA[industry] ?? null
    case "call": return phone ? callCTA(phone) : null
    default: return null
  }
}

// Every real option actually available to this business right now, in a
// fixed priority order - used both to resolve a manual override safely and
// to find a genuine "other" option for the secondary/sticky-bar slot.
function availableOptions(industry: string, activeAddons: string[], phone: string | null, bookingCtaLabel?: string | null): { key: PrimaryActionKey; cta: CTA }[] {
  const keys: PrimaryActionKey[] = ["order", "shop", "reserve", "content", "call"]
  return keys
    .map(key => ({ key, cta: resolveActionKey(key, industry, activeAddons, phone, bookingCtaLabel) }))
    .filter((o): o is { key: PrimaryActionKey; cta: CTA } => o.cta !== null)
}

// What the dashboard's "primary action" picker should actually offer -
// only real, currently-working options, never something that doesn't
// function for this business's current setup.
export function getAvailablePrimaryActions(industry: string, activeAddons: string[], phone: string | null, bookingCtaLabel?: string | null): { key: PrimaryActionKey; label: string }[] {
  return availableOptions(industry, activeAddons, phone, bookingCtaLabel).map(o => ({ key: o.key, label: o.cta.label }))
}

// Auto-mode primary: same intent-driven logic every layout already used
// directly, just centralized and now addon-aware for content intents too.
function autoPrimaryCTA(company: { industry_category: string; primary_intent: string; phone: string | null; booking_cta_label?: string | null }, activeAddons: string[]): CTA {
  const intent = company.primary_intent
  if (SCHEDULING_INTENTS.has(intent)) {
    return schedulingCTAFor(company.industry_category, company.booking_cta_label) ?? fallbackCTA(intent, company.phone)
  }
  if (CONTENT_INTENTS.has(intent)) {
    return contentCTAFor(company.industry_category, activeAddons) ?? fallbackCTA(intent, company.phone)
  }
  return fallbackCTA(intent, company.phone)
}

// The single source of truth for a business's site-wide call-to-action.
// Everywhere a CTA is shown - hero primary, hero secondary, the mobile
// sticky bar - reads from this one computation instead of each computing
// its own answer independently. That's what guarantees the hero and the
// sticky bar can never repeat each other by accident: the sticky bar is
// defined as "whichever real option isn't already the primary," not as
// its own separate guess.
export function getSiteCTAs(
  company: { industry_category: string; primary_intent: string; phone: string | null; primary_action_override?: string | null; booking_cta_label?: string | null },
  activeAddons: string[]
): { primary: CTA; secondary: CTA | null; isAuto: boolean } {
  const options = availableOptions(company.industry_category, activeAddons, company.phone, company.booking_cta_label)
  const overrideKey = (company.primary_action_override ?? null) as PrimaryActionKey | null
  const overrideOption = overrideKey ? options.find(o => o.key === overrideKey) ?? null : null

  const primary = overrideOption?.cta ?? autoPrimaryCTA(company, activeAddons)
  const secondary = options.find(o => o.cta.href !== primary.href)?.cta ?? null

  return { primary, secondary, isAuto: !overrideOption }
}
