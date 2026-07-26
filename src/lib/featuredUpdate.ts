import type { Company, WebsiteConfig } from "@/types/company"

export type FeaturedUpdateDraft = {
  eyebrow: string
  title: string
  body: string
  label: string
  href: string
}

type DraftCompany = Pick<Company, "name" | "industry_category" | "sub_industry"> & {
  website_config?: WebsiteConfig | null
}

const GENERIC_PUBLIC_COPY = new Set([
  "new in the shop",
  "share a sale product drop or update customers should see first",
  "share a menu special seasonal item or ordering update customers should see first",
  "highlight an opening seasonal service or estimate request customers should act on",
  "share an event service drive or next step for the community",
  "share a current update offer event or next step for customers",
])

export function normalizeFeaturedText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function isGenericFeaturedCopy(value: unknown) {
  const normalized = normalizeFeaturedText(value)
  return !normalized || GENERIC_PUBLIC_COPY.has(normalized)
}

function itemNames(config?: WebsiteConfig | null) {
  return (config?.menu_items ?? [])
    .flatMap(category => (category.items ?? []).map(item => item.name?.trim()).filter(Boolean))
    .filter((name): name is string => Boolean(name))
}

function serviceNames(config?: WebsiteConfig | null) {
  return (config?.services ?? [])
    .map(service => service.name?.trim())
    .filter((name): name is string => Boolean(name))
}

function listPreview(items: string[], fallback: string) {
  const unique = Array.from(new Set(items)).slice(0, 3)
  if (unique.length === 0) return fallback
  if (unique.length === 1) return unique[0]
  if (unique.length === 2) return `${unique[0]} and ${unique[1]}`
  return `${unique[0]}, ${unique[1]}, and ${unique[2]}`
}

function defaultDraft(company: DraftCompany): FeaturedUpdateDraft {
  const industry = company.industry_category
  const sub = (company.sub_industry || "").toLowerCase()
  const config = company.website_config
  const items = itemNames(config)
  const services = serviceNames(config)

  if (industry === "food" || industry === "home_based_food") {
    return {
      eyebrow: "Today from the kitchen",
      title: items.length ? "Fresh favorites are ready." : "Order what sounds good today.",
      body: items.length
        ? `${listPreview(items, "Fresh favorites")} can be ordered right from the menu.`
        : "Guests can view the menu, choose a pickup time, and send the order straight to the kitchen.",
      label: "View menu",
      href: "/menu",
    }
  }

  if (sub.includes("bike")) {
    return {
      eyebrow: "Bike shop update",
      title: "Ready for the next ride.",
      body: "Tune-ups, gear, and local bike help are ready before the season gets busy.",
      label: "See what is ready",
      href: "/shop",
    }
  }

  if (industry === "retail" || industry === "makers_crafts") {
    return {
      eyebrow: "Featured from the shop",
      title: items.length ? "Fresh picks are ready." : "The shop is ready to browse.",
      body: items.length
        ? `Customers can explore ${listPreview(items, "the latest pieces")} and order directly from the site.`
        : "Customers can browse what is available and send an order directly from the site.",
      label: "Shop the selection",
      href: "/shop",
    }
  }

  if (industry === "home_services") {
    return {
      eyebrow: "Now booking",
      title: services.length ? "Turn the next project into a plan." : "Request the work you need.",
      body: services.length
        ? `${listPreview(services, "Common projects")} can start with a clear request and a real next step.`
        : "Customers can request the job, share details, and get a clear next step from the team.",
      label: "Request an estimate",
      href: "/estimate",
    }
  }

  if (industry === "nonprofit") {
    return {
      eyebrow: "This week",
      title: "A simple way to get involved.",
      body: "Visitors can see the next step to connect, serve, give, or reach out.",
      label: "Get involved",
      href: "/services",
    }
  }

  if (industry === "events") {
    return {
      eyebrow: "Dates are filling",
      title: "Plan the next date with confidence.",
      body: "Visitors can ask about availability, details, and the right package for the moment.",
      label: "Request a quote",
      href: "/contact",
    }
  }

  return {
    eyebrow: "Featured update",
    title: "A clear next step is ready.",
    body: "Visitors can see what matters now and move straight to the right action.",
    label: "Learn more",
    href: "/contact",
  }
}

function overlapsNearby(text: string, nearbyCopy: unknown[]) {
  const normalized = normalizeFeaturedText(text)
  if (!normalized) return false

  return nearbyCopy.some(value => {
    const nearby = normalizeFeaturedText(value)
    if (!nearby || nearby.length < 8) return false
    if (nearby === normalized) return true
    return nearby.includes(normalized) || normalized.includes(nearby)
  })
}

export function getFeaturedUpdateDraft(company: DraftCompany, nearbyCopy: unknown[] = []): FeaturedUpdateDraft | null {
  const draft = defaultDraft(company)
  if (overlapsNearby(draft.title, nearbyCopy) || overlapsNearby(draft.body, nearbyCopy)) {
    if (company.industry_category === "retail" || company.industry_category === "makers_crafts") {
      return {
        ...draft,
        eyebrow: "Shop highlight",
        title: "A few favorites are ready.",
      }
    }
    return null
  }
  return draft
}

export function getFeaturedUpdatePublicCopy(company: DraftCompany, nearbyCopy: unknown[] = []) {
  const config = company.website_config
  const draft = getFeaturedUpdateDraft(company, nearbyCopy)
  if (!draft) return null

  const title = isGenericFeaturedCopy(config?.announcement_title) ? draft.title : String(config?.announcement_title).trim()
  const body = isGenericFeaturedCopy(config?.announcement_body) ? draft.body : String(config?.announcement_body).trim()
  const label = isGenericFeaturedCopy(config?.announcement_cta_label) ? draft.label : String(config?.announcement_cta_label).trim()
  const href = String(config?.announcement_cta_href ?? "").trim() || draft.href

  if (overlapsNearby(title, nearbyCopy) || overlapsNearby(body, nearbyCopy)) return null

  return { eyebrow: draft.eyebrow, title, body, label, href }
}
