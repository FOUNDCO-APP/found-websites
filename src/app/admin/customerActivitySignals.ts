export type CustomerActivitySignalRow = {
  event_type?: string | null
  surface: string | null
  feature: string | null
  created_at: string
}

export type ClientActivityLevel = "using" | "quiet" | "stagnant" | "no_activity"
export type ClientActivityBucket = "active_week" | "quiet" | "stagnant" | "no_activity" | "trialing_inactive"

const TOOL_SURFACES = new Set(["leads", "photos", "site", "estimates", "marketing", "settings", "commerce", "schedule", "contacts", "people", "billing", "locations", "team", "addons"])
const CORE_TOOLS = ["site", "photos", "leads", "estimates", "marketing"]

export function activityDayAge(value: string | null | undefined) {
  if (!value) return null
  return Math.floor((Date.now() - new Date(value).getTime()) / 86400000)
}

export function activitySurfaceLabel(value: string | null | undefined) {
  if (!value) return "No tracked area"
  if (value === "site") return "Site"
  if (value === "leads") return "Leads"
  if (value === "photos") return "Photos"
  if (value === "estimates") return "Estimates"
  if (value === "marketing") return "Marketing"
  if (value === "settings") return "Settings"
  if (value === "dashboard") return "Dashboard"
  if (value === "commerce") return "Commerce"
  return value.replace(/_/g, " ").replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
}

export function activityEventLabel(value: string | null | undefined) {
  if (!value) return "Activity"
  return value.replace(/_/g, " ")
}

function isToolActivity(activity: CustomerActivitySignalRow) {
  return TOOL_SURFACES.has(activity.surface ?? "")
}

export function buildClientActivitySignal(activities: CustomerActivitySignalRow[], subscriptionStatus?: string | null) {
  const latest = activities[0] ?? null
  const days = activityDayAge(latest?.created_at)
  const toolActivities = activities.filter(isToolActivity)
  const surfaceCounts = activities.reduce<Record<string, number>>((counts, activity) => {
    const surface = activity.surface || "unknown"
    counts[surface] = (counts[surface] ?? 0) + 1
    return counts
  }, {})
  const toolSurfaceCounts = toolActivities.reduce<Record<string, number>>((counts, activity) => {
    const surface = activity.surface || "unknown"
    counts[surface] = (counts[surface] ?? 0) + 1
    return counts
  }, {})
  const topSurface = Object.entries(surfaceCounts).sort((a, b) => b[1] - a[1])[0] ?? null
  const topToolSurface = Object.entries(toolSurfaceCounts).sort((a, b) => b[1] - a[1])[0] ?? null
  const usedTools = new Set(toolActivities.map((activity) => activity.surface).filter((surface): surface is string => Boolean(surface)))
  const missingCoreTools = CORE_TOOLS.filter((surface) => !usedTools.has(surface))
  const onlyDashboard = activities.length > 0 && toolActivities.length === 0
  const level: ClientActivityLevel =
    days === null ? "no_activity"
    : days <= 7 ? "using"
    : days <= 14 ? "quiet"
    : "stagnant"
  const bucket: ClientActivityBucket =
    subscriptionStatus === "trialing" && (days === null || days >= 7) ? "trialing_inactive"
    : days === null ? "no_activity"
    : days <= 7 ? "active_week"
    : days <= 14 ? "quiet"
    : "stagnant"
  const label =
    days === null ? "No client use yet"
    : days <= 0 ? "Used today"
    : days === 1 ? "Used yesterday"
    : level === "quiet" ? `Quiet ${days}d`
    : level === "stagnant" ? `Stagnant ${days}d`
    : `Used ${days}d ago`
  const reachOutReason =
    bucket === "trialing_inactive" && days === null ? "Trialing and no customer activity yet"
    : bucket === "trialing_inactive" ? `Trialing and quiet for ${days}d`
    : days === null ? "No client-side activity yet"
    : onlyDashboard ? "Only opened dashboard, no tools used yet"
    : level === "stagnant" ? `No client-side use in ${days}d`
    : level === "quiet" ? `Client activity slowing down: ${days}d`
    : "Healthy customer-side usage"
  const summary =
    days === null ? "Waiting for first client action"
    : onlyDashboard ? `${label}; dashboard only`
    : topToolSurface ? `${label}; top tool ${activitySurfaceLabel(topToolSurface[0])}`
    : label

  return {
    latest,
    count90d: activities.length,
    toolCount90d: toolActivities.length,
    topSurface,
    topToolSurface,
    missingCoreTools,
    onlyDashboard,
    level,
    bucket,
    label,
    reachOutReason,
    summary,
  }
}
