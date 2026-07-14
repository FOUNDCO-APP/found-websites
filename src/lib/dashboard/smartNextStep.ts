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

function isRestaurant(industry: string, subIndustry: string): boolean {
  return industry === "food" && ["restaurant", "bar", "cafe", "venue"].includes(subIndustry)
}

function isOrderFirstFood(industry: string, subIndustry: string): boolean {
  return industry === "home_based_food" || (industry === "food" && ["food_truck", "bakery", "catering", "meal_prep"].includes(subIndustry))
}

function isRetailShop(industry: string, subIndustry: string): boolean {
  return industry === "retail" || industry === "makers_crafts" || subIndustry === "apparel"
}

function isBookingBusiness(industry: string): boolean {
  return ["beauty", "wellness", "fitness", "pet_services", "education", "healthcare", "music_performance", "music"].includes(industry)
}

function isEstimateBusiness(industry: string): boolean {
  return [
    "home_services",
    "landscaping",
    "cleaning",
    "home_property",
    "automotive",
    "events",
    "creative_services",
    "professional_services",
  ].includes(industry)
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

  if (isRetailShop(n, sub)) {
    if (has(addons, "shopping_cart")) {
      return {
        eyebrow: "Shop ready",
        headline: "Start selling online.",
        body: "Your shop is ready. New purchases will appear in Orders.",
        action: "Open Orders",
        path: "/leads?view=orders",
      }
    }
    return {
      eyebrow: "Site ready",
      headline: "Turn visitors into customers.",
      body: "Questions from your site will stay organized in Inquiries.",
      action: "Open Inquiries",
      path: "/leads",
    }
  }

  if (isRestaurant(n, sub)) {
    if (has(addons, "reservation_calendar")) {
      return {
        eyebrow: "Reservations ready",
        headline: "Fill the next table.",
        body: "Reservation requests are ready to manage from your dashboard.",
        action: "Open Reservations",
        path: "/leads?view=reservations",
      }
    }
    return {
      eyebrow: "Reservations ready",
      headline: "Capture the next table.",
      body: "Reservation requests from your site will appear in Reservations.",
      action: "Open Reservations",
      path: "/leads",
    }
  }

  if (isOrderFirstFood(n, sub) || n === "food") {
    if (has(addons, "online_ordering")) {
      return {
        eyebrow: "Orders ready",
        headline: "Take the next order.",
        body: "Customers can order from your site. Paid orders will appear in Orders.",
        action: "Open Orders",
        path: "/leads?view=orders",
      }
    }
    return {
      eyebrow: "Requests ready",
      headline: "Keep food requests moving.",
      body: "New customer messages from your site will stay organized in Inquiries.",
      action: "Open Inquiries",
      path: "/leads",
    }
  }

  if (isBookingBusiness(n)) {
    if (has(addons, "reservation_calendar")) {
      return {
        eyebrow: n === "music_performance" || n === "music" ? "Bookings ready" : "Schedule ready",
        headline: n === "music_performance" || n === "music" ? "Book the next show." : "Fill your next appointment.",
        body: n === "music_performance" || n === "music"
          ? "Performance requests are ready to manage from Schedule."
          : "Booking requests are ready to manage from Schedule.",
        action: "Open Schedule",
        path: "/schedule",
      }
    }
    return {
      eyebrow: "Bookings ready",
      headline: n === "music_performance" || n === "music" ? "Catch the next booking." : "Catch the next appointment.",
      body: "New booking requests from your site will appear in Bookings.",
      action: "Open Bookings",
      path: "/leads",
    }
  }

  if (isEstimateBusiness(n)) {
    if (has(addons, "quote_payments")) {
      return {
        eyebrow: "Estimates ready",
        headline: "Turn requests into quotes.",
        body: "Project requests can become estimates from your dashboard.",
        action: "Open Estimates",
        path: "/estimates",
      }
    }
    return {
      eyebrow: "Requests ready",
      headline: "Catch the next job.",
      body: "New project requests from your site will appear in Requests.",
      action: "Open Requests",
      path: "/leads",
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

  if (has(addons, "reservation_calendar")) {
    return {
      eyebrow: "Schedule ready",
      headline: "Keep the next request moving.",
      body: "Booking requests are ready to manage from Schedule.",
      action: "Open Schedule",
      path: "/schedule",
    }
  }

  return {
    eyebrow: "Site ready",
    headline: "Keep every request together.",
    body: "New messages from your site will appear in your dashboard.",
    action: "Open Inquiries",
    path: "/leads",
  }
}
