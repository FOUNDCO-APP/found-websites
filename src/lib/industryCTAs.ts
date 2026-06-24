import { intentLabel, intentHref } from "@/types/company"

export type CTA = { label: string; href: string }

// The scheduling action — upgradeable to full calendar add-on
export const SCHEDULING_CTA: Partial<Record<string, CTA>> = {
  food:                  { label: "Reserve a Table",     href: "/reserve" },
  wellness:              { label: "Book Now",             href: "/reserve" },
  beauty:                { label: "Book Now",             href: "/reserve" },
  fitness:               { label: "Book a Class",         href: "/reserve" },
  healthcare:            { label: "Book Appointment",     href: "/reserve" },
  home_services:         { label: "Get a Free Quote",     href: "/estimate" },
  cleaning:              { label: "Get a Free Quote",     href: "/estimate" },
  landscaping:           { label: "Get a Free Quote",     href: "/estimate" },
  events:                { label: "Book Your Date",       href: "/reserve" },
  pet_services:          { label: "Book Now",             href: "/reserve" },
  automotive:            { label: "Schedule Service",     href: "/reserve" },
  real_estate:           { label: "Schedule a Tour",      href: "/reserve" },
  creative_services:     { label: "Book a Consultation",  href: "/reserve" },
  home_based_food:       { label: "Place an Order",       href: "/reserve" },
  education:             { label: "Book a Session",       href: "/reserve" },
  music_performance:     { label: "Book Now",             href: "/reserve" },
  professional_services: { label: "Schedule a Call",      href: "/reserve" },
  childcare:             { label: "Schedule a Tour",      href: "/reserve" },
  home_property:         { label: "Schedule a Visit",     href: "/reserve" },
  // retail, makers_crafts, nonprofit → no scheduling CTA
}

// The content action — upgradeable via online_ordering or service add-ons
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
  retail:                { label: "Shop Now",        href: "/shop" },
  makers_crafts:         { label: "Shop Now",        href: "/shop" },
  nonprofit:             { label: "Get Involved",    href: "/services" },
}

// Intents that already cover the scheduling path
const SCHEDULING_INTENTS = new Set(["reserve", "book", "quote"])
// Intents that already cover the content path
const CONTENT_INTENTS = new Set(["menu", "shop"])

export function getIndustryCTAs(
  industry: string,
  activeAddons: string[],
  primaryIntent: string
): { supportingCTA: CTA | null } {
  let schedulingCTA = SCHEDULING_CTA[industry] ?? null
  let contentCTA = CONTENT_CTA[industry] ?? null

  // Upgrade content CTA when online_ordering add-on is active
  if ((industry === "food" || industry === "home_based_food") && activeAddons.includes("online_ordering")) {
    contentCTA = { label: "Order Online", href: "/order" }
  }

  let supportingCTA: CTA | null = null

  if (SCHEDULING_INTENTS.has(primaryIntent)) {
    // Primary covers scheduling — show content as the supporting action
    supportingCTA = contentCTA
  } else if (CONTENT_INTENTS.has(primaryIntent)) {
    // Primary covers content — show scheduling as the supporting action
    supportingCTA = schedulingCTA
  } else {
    // Primary is call / visit / contact — scheduling is the highest-value next action
    supportingCTA = schedulingCTA ?? contentCTA
  }

  // Deduplicate: drop supporting CTA if it resolves to the same path as primary
  if (supportingCTA) {
    const primaryPath = intentHref[primaryIntent] ?? "/contact"
    if (supportingCTA.href === primaryPath) supportingCTA = null
  }

  return { supportingCTA }
}

// Intents strong enough to anchor the sticky dock bar
const STRONG_INTENTS = new Set(["call", "book", "quote", "reserve", "menu", "shop"])

export function getStickyCTA(
  industry: string,
  primaryIntent: string,
  phone: string | null
): { label: string; href: string; matchPath: string | null } | null {
  if (STRONG_INTENTS.has(primaryIntent)) {
    return {
      label: intentLabel[primaryIntent] || "Contact Us",
      href: primaryIntent === "call"
        ? `tel:${phone?.replace(/\D/g, "") ?? ""}`
        : intentHref[primaryIntent] || "/contact",
      matchPath: primaryIntent === "call" ? null : intentHref[primaryIntent] || "/contact",
    }
  }

  // "visit" / "contact" — fall back to the industry scheduling CTA
  const fallback = SCHEDULING_CTA[industry]
  if (fallback) return { ...fallback, matchPath: fallback.href }

  return null
}
