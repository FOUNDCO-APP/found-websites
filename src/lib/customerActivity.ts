import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany, isAdminOverrideActive } from "@/lib/dashboard/getCompany"
import { createAdminClient } from "@/lib/supabase/admin"

type CustomerActivityInput = {
  eventType: string
  pathname: string
  metadata?: Record<string, unknown>
}

type SurfaceInfo = {
  surface: string
  feature: string | null
}

const SURFACE_BY_SEGMENT: Record<string, SurfaceInfo> = {
  "": { surface: "dashboard", feature: "home" },
  leads: { surface: "leads", feature: "inbox" },
  inbox: { surface: "leads", feature: "inbox" },
  contacts: { surface: "contacts", feature: "people" },
  people: { surface: "people", feature: "people" },
  photos: { surface: "photos", feature: "gallery" },
  site: { surface: "site", feature: "site_editor" },
  "business-info": { surface: "settings", feature: "business_info" },
  billing: { surface: "billing", feature: "billing" },
  estimates: { surface: "estimates", feature: "estimates" },
  schedule: { surface: "schedule", feature: "calendar" },
  marketing: { surface: "marketing", feature: "marketing" },
  products: { surface: "commerce", feature: "products" },
  menu: { surface: "commerce", feature: "menu" },
  locations: { surface: "locations", feature: "locations" },
  team: { surface: "team", feature: "team" },
  more: { surface: "addons", feature: "addons" },
}

function normalizePathname(pathname: string) {
  return pathname.split("?")[0]?.replace(/^\/+|\/+$/g, "") ?? ""
}

export function activitySurfaceForPath(pathname: string): SurfaceInfo {
  const normalized = normalizePathname(pathname)
  const segments = normalized.split("/")
  const dashboardIndex = segments.indexOf("dashboard")
  const key = dashboardIndex >= 0 ? segments[dashboardIndex + 1] ?? "" : segments[0] ?? ""
  return SURFACE_BY_SEGMENT[key] ?? { surface: "dashboard", feature: key || "unknown" }
}

export async function recordCustomerActivity(input: CustomerActivityInput) {
  if (await isAdminOverrideActive()) return { recorded: false, reason: "admin_view" }

  const user = await getAuthUser()
  if (!user) return { recorded: false, reason: "no_user" }

  const company = await getCompany(user.id, user.email ?? "")
  if (!company) return { recorded: false, reason: "no_company" }

  const surface = activitySurfaceForPath(input.pathname)
  const admin = createAdminClient()
  const { error } = await admin.from("customer_activity_events").insert({
    company_id: company.id,
    user_id: user.id,
    event_type: input.eventType,
    surface: surface.surface,
    feature: surface.feature,
    source: "customer_dashboard",
    is_admin_view: false,
    metadata: {
      pathname: input.pathname,
      ...input.metadata,
    },
  })

  if (error) {
    console.error("recordCustomerActivity failed", error.message)
    return { recorded: false, reason: "insert_failed" }
  }

  return { recorded: true, reason: null }
}
