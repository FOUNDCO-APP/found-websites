export type Feature =
  | "custom_domain"
  | "worker_uploads"
  | "contact_database"
  | "lead_sequence"
  | "lead_tracking"
  | "lead_reply"
  | "booking"
  | "quotes"
  | "review_collection"
  | "email_marketing"
  // Add-ons (included with Business, or active on lower plans)
  | "menu_display"
  | "online_ordering"
  | "shopping_cart"
  | "quote_payments"
  | "reservation_calendar"
  // Always-on (all plans, no gate)
  | "dns_setup"
  | "industry_form"
  | "reservation_form"
  | "photo_pipeline"

export type AddonSlug =
  | "menu_display"
  | "online_ordering"
  | "shopping_cart"
  | "quote_payments"
  | "reservation_calendar"
  | "email_marketing"

export const BUSINESS_INCLUDED_ADDONS: AddonSlug[] = [
  "online_ordering",
  "shopping_cart",
  "quote_payments",
  "reservation_calendar",
  "email_marketing",
]

export function getEffectiveAddons(
  plan: string | null | undefined,
  activeAddons: string[] = [],
): AddonSlug[] {
  const merged = new Set(activeAddons as AddonSlug[])
  if ((plan ?? "found") === "found_business") {
    BUSINESS_INCLUDED_ADDONS.forEach(slug => merged.add(slug))
  }
  return Array.from(merged)
}

export function hasAddonAccess(
  plan: string | null | undefined,
  addonSlug: AddonSlug,
  activeAddons: string[] = [],
): boolean {
  return getEffectiveAddons(plan, activeAddons).includes(addonSlug)
}

export function getFeatureAccess(
  plan: string | null | undefined,
  feature: Feature,
  activeAddons: AddonSlug[] = [],
): boolean {
  const p = plan ?? "found"

  switch (feature) {
    // Always on — every plan
    case "dns_setup":
    case "industry_form":
    case "reservation_form":
    case "photo_pipeline":
    case "lead_reply":
    case "custom_domain":
      return true

    // Pro+
    case "worker_uploads":
    case "contact_database":
    case "lead_sequence":
    case "lead_tracking":
      return p === "found_pro" || p === "found_business"

    // Business only (plan-gated)
    case "booking":
    case "quotes":
    case "review_collection":
    case "email_marketing":
      return p === "found_business" || activeAddons.includes("email_marketing" as AddonSlug)

    // Add-ons — available on any plan with active subscription
    case "menu_display":
      return activeAddons.includes("menu_display")
    case "online_ordering":
      return hasAddonAccess(p, "online_ordering", activeAddons)
    case "shopping_cart":
      return hasAddonAccess(p, "shopping_cart", activeAddons)
    case "quote_payments":
      return hasAddonAccess(p, "quote_payments", activeAddons)
    case "reservation_calendar":
      return hasAddonAccess(p, "reservation_calendar", activeAddons)

    default:
      return false
  }
}

export type AddonDef = {
  slug: AddonSlug
  label: string
  description: string
  price: number
  relevantIndustries: string[]
}

export const ALL_ADDONS: AddonDef[] = [
  {
    slug: "online_ordering",
    label: "Online Ordering",
    description: "Turn your existing menu into a paid order flow. Customers choose items, pay online, and the order lands in your Inbox.",
    price: 20,
    relevantIndustries: ["food", "home_based_food"],
  },
  {
    slug: "reservation_calendar",
    label: "Booking Calendar",
    description: "Let customers request a time from your site. Restaurants can take reservations; service businesses can use it for appointments or classes.",
    price: 15,
    relevantIndustries: ["food", "wellness", "beauty", "fitness", "pet_services", "education", "automotive", "healthcare"],
  },
  {
    slug: "shopping_cart",
    label: "Shopping Cart",
    description: "Sell products like shirts, packaged goods, or merch from your site with a real cart and Stripe checkout.",
    price: 20,
    relevantIndustries: ["retail", "makers_crafts", "home_based_food"],
  },
  {
    slug: "quote_payments",
    label: "Quote & Estimate Payments",
    description: "Send professional quotes and collect deposits or full payments online. Clients approve and pay from their phone.",
    price: 15,
    relevantIndustries: ["home_services", "landscaping", "cleaning", "automotive", "home_property", "creative_services", "events", "professional_services"],
  },
  {
    slug: "email_marketing",
    label: "Email Marketing",
    description: "Send campaigns to your full contact list. Announce promotions, seasonal offers, and news.",
    price: 15,
    relevantIndustries: [],
  },
]

export function getRelevantAddons(industryCategory: string): AddonDef[] {
  const industry = ["food", "home_based_food", "retail", "wellness", "beauty",
    "fitness", "pet_services", "education", "automotive", "healthcare",
    "home_services", "landscaping", "cleaning", "home_property",
    "creative_services", "events", "professional_services",
    "makers_crafts"].includes(industryCategory) ? industryCategory : ""

  const relevant = ALL_ADDONS.filter(
    (a) => a.relevantIndustries.length === 0 || a.relevantIndustries.includes(industry)
  )
  const general = ALL_ADDONS.filter(
    (a) => a.relevantIndustries.length === 0 && !relevant.includes(a)
  )

  return [...relevant, ...general]
}
