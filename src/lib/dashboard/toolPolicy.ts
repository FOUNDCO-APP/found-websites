import { defaultFormIntentFor } from "@/lib/dashboard/typography"
import { getBusinessModel } from "@/lib/getBusinessModel"

export type DashboardTool = { id: string; path: string; label: string }

type DashboardToolPolicyInput = {
  industry?: string | null
  activeAddons?: string[]
}

const SCHEDULE_TOOL: DashboardTool = { id: "schedule", path: "/schedule", label: "Schedule" }
const EMAIL_TOOL: DashboardTool = { id: "email", path: "/marketing", label: "Email" }

const SCHEDULE_FIRST_INDUSTRIES = new Set([
  "wellness",
  "beauty",
  "fitness",
  "pet_services",
  "education",
  "healthcare",
])

const ESTIMATE_WORKFLOW_INDUSTRIES = new Set([
  "home_services",
  "landscaping",
  "cleaning",
  "home_property",
  "creative_services",
  "events",
  "professional_services",
  "automotive",
])

function has(activeAddons: string[], addon: string) {
  return activeAddons.includes(addon)
}

function peopleTool(industry: string | null | undefined): DashboardTool {
  const label = industry === "food" ? "Guests" : getBusinessModel(industry, null).tabLabel
  return { id: "people", path: "/people", label }
}

function inboxLabelFor(industry: string | null | undefined): string {
  switch (defaultFormIntentFor(industry)) {
    case "booking":
      return "Bookings"
    case "appointment":
      return "Appointments"
    case "estimate":
      return "Estimates"
    case "order":
      return "Orders"
    default:
      return "Leads"
  }
}

function inboxPathFor(industry: string | null | undefined): string {
  const intent = defaultFormIntentFor(industry)
  if (intent === "estimate") return "/estimates"
  if (intent === "order") return "/leads?view=orders"
  return "/leads"
}

function availableFoodTools(activeAddons: string[]): DashboardTool[] {
  const hasCalendar = has(activeAddons, "reservation_calendar")
  const hasOrders = has(activeAddons, "online_ordering") || has(activeAddons, "shopping_cart")
  const hasEmail = has(activeAddons, "email_marketing")
  const hasEstimates = has(activeAddons, "quote_payments")

  return [
    { id: "home", path: "/", label: "Home" },
    ...(hasOrders ? [{ id: "orders", path: "/leads?view=orders", label: "Orders" }] : []),
    hasCalendar
      ? { id: "reservations", path: "/leads?view=reservations", label: "Reservations" }
      : { id: "inbox", path: "/leads", label: "Reservations" },
    ...(hasEstimates ? [{ id: "estimates", path: "/estimates", label: "Estimates" }] : []),
    peopleTool("food"),
    ...(hasCalendar ? [SCHEDULE_TOOL] : []),
    { id: "photos", path: "/photos", label: "Photos" },
    { id: "contacts", path: "/contacts", label: "Contacts" },
    ...(hasEmail ? [EMAIL_TOOL] : []),
    { id: "more", path: "/more", label: "More" },
  ]
}

export function getAvailableDashboardTools({ industry = null, activeAddons = [] }: DashboardToolPolicyInput): DashboardTool[] {
  const hasCalendar = has(activeAddons, "reservation_calendar")
  const hasEmail = has(activeAddons, "email_marketing")
  const hasEstimates = has(activeAddons, "quote_payments")

  if (industry === "food") return availableFoodTools(activeAddons)

  const inboxPath = inboxPathFor(industry)
  return [
    { id: "home", path: "/", label: "Home" },
    { id: "inbox", path: inboxPath, label: inboxLabelFor(industry) },
    ...(hasEstimates && inboxPath !== "/estimates" ? [{ id: "estimates", path: "/estimates", label: "Estimates" }] : []),
    ...(hasCalendar ? [SCHEDULE_TOOL] : []),
    peopleTool(industry),
    { id: "photos", path: "/photos", label: "Photos" },
    { id: "contacts", path: "/contacts", label: "Contacts" },
    ...(hasEmail ? [EMAIL_TOOL] : []),
    { id: "more", path: "/more", label: "More" },
  ]
}

export function getDefaultDashboardTools(input: DashboardToolPolicyInput): DashboardTool[] {
  const available = getAvailableDashboardTools(input)
  const byId = new Map(available.map(tool => [tool.id, tool]))
  const industry = input.industry ?? null
  const activeAddons = input.activeAddons ?? []
  const hasCalendar = has(activeAddons, "reservation_calendar")
  const hasEmail = has(activeAddons, "email_marketing")
  const hasEstimates = has(activeAddons, "quote_payments")

  let middleIds: string[]

  if (industry === "food") {
    middleIds = [
      ...(has(activeAddons, "online_ordering") || has(activeAddons, "shopping_cart") ? ["orders"] : []),
      hasCalendar ? "reservations" : "inbox",
      "people",
      ...(hasCalendar ? ["schedule"] : []),
      ...(hasEstimates ? ["estimates"] : []),
      ...(hasEmail ? ["email"] : []),
      "photos",
      "contacts",
    ]
  } else if (industry && SCHEDULE_FIRST_INDUSTRIES.has(industry)) {
    middleIds = [
      "inbox",
      ...(hasCalendar ? ["schedule"] : []),
      ...(hasEstimates ? ["estimates"] : []),
      "people",
      ...(hasEmail ? ["email"] : []),
      "photos",
      "contacts",
    ]
  } else if (industry && ESTIMATE_WORKFLOW_INDUSTRIES.has(industry)) {
    middleIds = [
      "inbox",
      ...(hasEstimates && defaultFormIntentFor(industry) !== "estimate" ? ["estimates"] : []),
      ...(hasCalendar ? ["schedule"] : []),
      "people",
      ...(hasEmail ? ["email"] : []),
      "photos",
      "contacts",
    ]
  } else {
    middleIds = [
      "inbox",
      ...(hasEstimates && defaultFormIntentFor(industry) !== "estimate" ? ["estimates"] : []),
      ...(hasCalendar ? ["schedule"] : []),
      "people",
      ...(hasEmail ? ["email"] : []),
      "photos",
      "contacts",
    ]
  }

  const middle = middleIds.map(id => byId.get(id)).filter(Boolean).slice(0, 3) as DashboardTool[]
  return [
    byId.get("home") ?? { id: "home", path: "/", label: "Home" },
    ...middle,
    byId.get("more") ?? { id: "more", path: "/more", label: "More" },
  ]
}

export function getDefaultDashboardToolIds(input: DashboardToolPolicyInput): string[] {
  return getDefaultDashboardTools(input).map(tool => tool.id)
}

export function getDashboardToolStorageKey(companyName: string | null | undefined, industry: string | null | undefined, activeAddons: string[]) {
  const addonKey = activeAddons.join("|")
  return `found_dashboard_tabs_${companyName || "default"}_${industry || "general"}_${addonKey || "core"}`
}
