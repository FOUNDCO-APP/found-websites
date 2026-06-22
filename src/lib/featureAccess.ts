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
  // Add-ons (any plan, requires addon_subscriptions row)
  | "menu_display"
  | "online_ordering"
  | "shopping_cart"
  | "quote_payments"
  | "reservation_calendar"
  | "second_location"
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
  | "second_location"
  | "email_marketing"

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
      return true

    // Pro+
    case "custom_domain":
    case "worker_uploads":
    case "contact_database":
    case "lead_sequence":
    case "lead_tracking":
    case "lead_reply":
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
      return activeAddons.includes("online_ordering")
    case "shopping_cart":
      return activeAddons.includes("shopping_cart")
    case "quote_payments":
      return activeAddons.includes("quote_payments")
    case "reservation_calendar":
      return activeAddons.includes("reservation_calendar")
    case "second_location":
      return activeAddons.includes("second_location")

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
    slug: "menu_display",
    label: "Online Menu",
    description: "Show a beautiful, organized menu on your website — categories, descriptions, and prices.",
    price: 10,
    relevantIndustries: ["food", "home_based_food"],
  },
  {
    slug: "online_ordering",
    label: "Online Ordering",
    description: "Let customers order directly from your site. Payments processed securely through Stripe.",
    price: 20,
    relevantIndustries: ["food", "home_based_food", "retail"],
  },
  {
    slug: "reservation_calendar",
    label: "Reservation Calendar",
    description: "Manage reservations with a built-in calendar. Set available times, confirm requests, see your day at a glance.",
    price: 15,
    relevantIndustries: ["food", "wellness", "beauty", "fitness", "pet_services", "education", "automotive", "healthcare"],
  },
  {
    slug: "shopping_cart",
    label: "Shopping Cart",
    description: "Sell products directly from your website. Add items, set prices, collect payments through Stripe.",
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
  {
    slug: "second_location",
    label: "Second Location",
    description: "Add a second business location to your Found account — its own page, photos, and contact info.",
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
