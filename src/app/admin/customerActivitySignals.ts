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
  const topSurfaces = Object.entries(surfaceCounts).sort((a, b) => b[1] - a[1])
  const topToolSurfaces = Object.entries(toolSurfaceCounts).sort((a, b) => b[1] - a[1])
  const topSurface = topSurfaces[0] ?? null
  const topToolSurface = topToolSurfaces[0] ?? null
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
    topSurfaces,
    topToolSurface,
    topToolSurfaces,
    missingCoreTools,
    onlyDashboard,
    level,
    bucket,
    label,
    reachOutReason,
    summary,
  }
}

export function clientActivityOutreachCopy(input: { businessName: string; signal: ReturnType<typeof buildClientActivitySignal> }) {
  const dashboardUrl = "https://my.foundco.app"
  const intro = `Hey ${input.businessName}, this is Super Shawn with Found.`
  const missingTools = input.signal.missingCoreTools.slice(0, 2).map(activitySurfaceLabel)
  const missingToolLine = missingTools.length > 0 ? ` I also noticed ${missingTools.join(" and ")} ${missingTools.length === 1 ? "has" : "have"} not been used yet, and those are usually where Found starts becoming more useful.` : ""

  if (input.signal.bucket === "trialing_inactive") {
    return `${intro} I noticed your Found account has been quiet while it is still in trial. I want to help you get one useful thing done before the trial fades, whether that is updating your site, adding photos, checking leads, or setting up estimates.${missingToolLine} Want me to help you take the next step? ${dashboardUrl}`
  }

  if (input.signal.bucket === "no_activity") {
    return `${intro} I wanted to help you get your first useful action done in Found. A good next step is adding a photo, checking leads, or updating one section of your site so the system starts working for your business.${missingToolLine} ${dashboardUrl}`
  }

  if (input.signal.onlyDashboard) {
    return `${intro} I saw the dashboard was opened, but it does not look like any of the working tools have been used yet. That usually means something is unclear or the next step is not obvious. Want me to help you use one real tool, like Photos, Leads, Site updates, or Estimates? ${dashboardUrl}`
  }

  if (input.signal.level === "stagnant") {
    return `${intro} I noticed there has not been client-side activity in a bit. If Found has not been useful lately, I want to know what is blocking you so we can tighten it up.${missingToolLine} Want me to help you get it moving again? ${dashboardUrl}`
  }

  if (input.signal.level === "quiet") {
    return `${intro} Quick check-in. I noticed activity has slowed down a little. Anything feeling confusing, missing, or worth improving so Found keeps helping day to day?${missingToolLine} ${dashboardUrl}`
  }

  if (missingTools.length > 0) {
    return `${intro} I noticed Found is getting some use, but ${missingTools.join(" and ")} ${missingTools.length === 1 ? "has" : "have"} not been used yet. Those tools can help the system do more of the work for you. Want me to help you get one of them set up? ${dashboardUrl}`
  }

  return `${intro} Quick check-in. I want to make sure Found is still helping and that nothing feels confusing, missing, or harder than it should be. ${dashboardUrl}`
}
