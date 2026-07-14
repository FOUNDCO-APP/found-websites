import { defaultFormIntentFor } from "@/lib/dashboard/typography"
import { getBusinessModel } from "@/lib/getBusinessModel"

export type DashboardToolGroup = "website" | "get_paid" | "customers" | "work_schedule" | "marketing" | "insights" | "settings"

export type DashboardTool = {
  id: string
  path: string
  label: string
  group: DashboardToolGroup
  description?: string
}

type DashboardToolPolicyInput = {
  industry?: string | null
  subIndustry?: string | null
  activeAddons?: string[]
}

const SCHEDULE_TOOL: DashboardTool = { id: "schedule", path: "/schedule", label: "Schedule", group: "work_schedule", description: "Calendar, availability, and booked work" }
const EMAIL_TOOL: DashboardTool = { id: "email", path: "/marketing", label: "Email", group: "marketing", description: "Send updates and bring customers back" }
const CAMERA_TOOL: DashboardTool = { id: "camera", path: "/photos?camera=1", label: "Camera", group: "website", description: "Shoot and sort later" }

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

function hasOrderWorkflow(activeAddons: string[]) {
  return has(activeAddons, "online_ordering") || has(activeAddons, "shopping_cart")
}

function peopleTool(industry: string | null | undefined): DashboardTool {
  const label = industry === "food" ? "Guests" : getBusinessModel(industry, null).tabLabel
  return { id: "people", path: "/people", label, group: "customers", description: "Customer memory across work and requests" }
}

function inboxLabelFor(industry: string | null | undefined, subIndustry?: string | null): string {
  switch (defaultFormIntentFor(industry, subIndustry)) {
    case "booking":
      return "Bookings"
    case "appointment":
      return "Appointments"
    case "estimate_request":
    case "estimate":
      return "Estimate Requests"
    case "order":
      return "Inquiries"
    default:
      return "Leads"
  }
}

function availableFoodTools(activeAddons: string[]): DashboardTool[] {
  const hasCalendar = has(activeAddons, "reservation_calendar")
  const hasOrders = hasOrderWorkflow(activeAddons)
  const hasEmail = has(activeAddons, "email_marketing")
  const hasEstimates = has(activeAddons, "quote_payments")

  return [
    { id: "home", path: "/", label: "Home", group: "website", description: "Your daily starting point" },
    ...(hasOrders ? ([{ id: "orders", path: "/leads?view=orders", label: "Orders", group: "get_paid", description: "Paid food, product, or cart requests" }] as DashboardTool[]) : []),
    hasCalendar
      ? { id: "reservations", path: "/leads?view=reservations", label: "Reservations", group: "work_schedule", description: "Customers asking to reserve a time" }
      : { id: "inbox", path: "/leads", label: "Reservations", group: "work_schedule", description: "Customers asking to reserve a time" },
    ...(hasEstimates ? ([{ id: "estimates", path: "/estimates", label: "Estimates", group: "get_paid", description: "Price work, get approval, and collect deposits" }] as DashboardTool[]) : []),
    peopleTool("food"),
    ...(hasCalendar ? [SCHEDULE_TOOL] : []),
    CAMERA_TOOL,
    { id: "photos", path: "/photos", label: "Photos", group: "website", description: "Photos for your site and finished work" },
    { id: "contacts", path: "/contacts", label: "Contacts", group: "customers", description: "People, vendors, staff, and suppliers" },
    ...(hasEmail ? [EMAIL_TOOL] : []),
    { id: "more", path: "/more", label: "More", group: "settings", description: "Settings and secondary tools" },
  ]
}

export function getAvailableDashboardTools({ industry = null, subIndustry = null, activeAddons = [] }: DashboardToolPolicyInput): DashboardTool[] {
  const hasCalendar = has(activeAddons, "reservation_calendar")
  const hasEmail = has(activeAddons, "email_marketing")
  const hasEstimates = has(activeAddons, "quote_payments")
  const hasOrders = hasOrderWorkflow(activeAddons)

  if (industry === "food") return availableFoodTools(activeAddons)

  return [
    { id: "home", path: "/", label: "Home", group: "website", description: "Your daily starting point" },
    { id: "inbox", path: "/leads", label: inboxLabelFor(industry, subIndustry), group: "customers", description: "Incoming customer requests" },
    ...(hasOrders ? ([{ id: "orders", path: "/leads?view=orders", label: "Orders", group: "get_paid", description: "Paid product and cart requests" }] as DashboardTool[]) : []),
    ...(hasEstimates ? ([{ id: "estimates", path: "/estimates", label: "Estimates", group: "get_paid", description: "Price work, get approval, and collect deposits" }] as DashboardTool[]) : []),
    ...(hasCalendar ? [SCHEDULE_TOOL] : []),
    peopleTool(industry),
    CAMERA_TOOL,
    { id: "photos", path: "/photos", label: "Photos", group: "website", description: "Photos for your site and finished work" },
    { id: "contacts", path: "/contacts", label: "Contacts", group: "customers", description: "People, vendors, staff, and suppliers" },
    ...(hasEmail ? [EMAIL_TOOL] : []),
    { id: "more", path: "/more", label: "More", group: "settings", description: "Settings and secondary tools" },
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
  const hasOrders = hasOrderWorkflow(activeAddons)

  let middleIds: string[]

  if (industry === "food") {
    middleIds = [
      ...(hasOrders ? ["orders"] : []),
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
      ...(hasEstimates ? ["estimates"] : []),
      ...(hasCalendar ? ["schedule"] : []),
      "people",
      ...(hasEmail ? ["email"] : []),
      "photos",
      "contacts",
    ]
  } else {
    middleIds = [
      "inbox",
      ...(hasOrders ? ["orders"] : []),
      ...(hasEstimates ? ["estimates"] : []),
      ...(hasCalendar ? ["schedule"] : []),
      "people",
      ...(hasEmail ? ["email"] : []),
      "photos",
      "contacts",
    ]
  }

  const middle = middleIds.map(id => byId.get(id)).filter(Boolean).slice(0, 3) as DashboardTool[]
  return [
    byId.get("home") ?? { id: "home", path: "/", label: "Home", group: "website", description: "Your daily starting point" },
    ...middle,
    byId.get("more") ?? { id: "more", path: "/more", label: "More", group: "settings", description: "Settings and secondary tools" },
  ]
}

export function getDefaultDashboardToolIds(input: DashboardToolPolicyInput): string[] {
  return getDefaultDashboardTools(input).map(tool => tool.id)
}

export function getDashboardToolStorageKey(companyName: string | null | undefined, industry: string | null | undefined, activeAddons: string[], subIndustry?: string | null) {
  const addonKey = activeAddons.join("|")
  return `found_dashboard_tabs_${companyName || "default"}_${industry || "general"}_${subIndustry || "general"}_${addonKey || "core"}`
}

export const DASHBOARD_TOOL_GROUP_LABELS: Record<DashboardToolGroup, string> = {
  website: "Website",
  get_paid: "Get Paid",
  customers: "Customers",
  work_schedule: "Work & Schedule",
  marketing: "Marketing",
  insights: "Insights",
  settings: "Settings",
}

export const DASHBOARD_TOOL_GROUP_ORDER: DashboardToolGroup[] = [
  "website",
  "get_paid",
  "customers",
  "work_schedule",
  "marketing",
  "insights",
  "settings",
]
