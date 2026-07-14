import type { AddonSlug } from "@/lib/featureAccess"

export type SmartNextStep = {
  eyebrow: string
  headline: string
  body: string
  action: string
  path: string
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().trim().replace(/[\s-]+/g, "_")
}

function has(addons: string[], addon: AddonSlug): boolean {
  return addons.includes(addon)
}

export function smartNextStepFor({
  industry,
  subIndustry,
  activeAddons,
}: {
  industry?: string | null
  subIndustry?: string | null
  activeAddons?: string[]
}): SmartNextStep | null {
  const n = normalize(industry)
  const sub = normalize(subIndustry)
  const addons = activeAddons ?? []

  if ((n === "retail" || n === "makers_crafts" || sub === "apparel") && has(addons, "shopping_cart")) {
    return {
      eyebrow: "Shop ready",
      headline: "Start selling online.",
      body: "Your shop is ready. New purchases will appear in Orders.",
      action: "Open Orders",
      path: "/leads?view=orders",
    }
  }

  if ((n === "food" || n === "home_based_food") && has(addons, "online_ordering")) {
    return {
      eyebrow: "Orders ready",
      headline: "Take the next order.",
      body: "Customers can order from your site. Paid orders will appear in Orders.",
      action: "Open Orders",
      path: "/leads?view=orders",
    }
  }

  if (n === "food" && has(addons, "reservation_calendar")) {
    return {
      eyebrow: "Reservations ready",
      headline: "Fill the next table.",
      body: "Reservation requests are ready to manage from your dashboard.",
      action: "Open Reservations",
      path: "/leads?view=reservations",
    }
  }

  if (["beauty", "wellness", "fitness", "pet_services", "education", "healthcare"].includes(n) && has(addons, "reservation_calendar")) {
    return {
      eyebrow: "Bookings ready",
      headline: "Fill your next appointment.",
      body: "Booking requests are ready to manage from Schedule.",
      action: "Open Schedule",
      path: "/schedule",
    }
  }

  if ([
    "home_services",
    "landscaping",
    "cleaning",
    "home_property",
    "automotive",
    "events",
    "creative_services",
    "professional_services",
  ].includes(n) && has(addons, "quote_payments")) {
    return {
      eyebrow: "Estimates ready",
      headline: "Turn requests into quotes.",
      body: "Project requests can become estimates from your dashboard.",
      action: "Open Estimates",
      path: "/estimates",
    }
  }

  if (n === "nonprofit") {
    return {
      eyebrow: "Inquiries ready",
      headline: "Respond to supporters.",
      body: "New messages and supporter requests will appear in Inquiries.",
      action: "Open Inquiries",
      path: "/leads",
    }
  }

  if (has(addons, "quote_payments")) {
    return {
      eyebrow: "Estimates ready",
      headline: "Turn interest into next steps.",
      body: "New requests can become estimates from your dashboard.",
      action: "Open Estimates",
      path: "/estimates",
    }
  }

  if (has(addons, "reservation_calendar")) {
    return {
      eyebrow: "Schedule ready",
      headline: "Keep the next request moving.",
      body: "Booking requests are ready to manage from Schedule.",
      action: "Open Schedule",
      path: "/schedule",
    }
  }

  return null
}
