import { getAdminClient } from "../lib"
import { isAdminTestIdentity } from "../testIdentity"
import { resolveChannel } from "@/lib/channel"

export type TrafficWindow = "month" | "quarter" | "all"

const DAY = 86400000
const WINDOW_DAYS: Record<Exclude<TrafficWindow, "all">, number> = { month: 30, quarter: 90 }

export type ChannelRow = {
  channel: string
  count: number
  prevCount: number | null
  trend: "up" | "down" | "flat" | null
  share: number
}

export type PageRow = { path: string; count: number }

export type TrafficReport = {
  window: TrafficWindow
  windowLabel: string
  totalVisits: number
  uniqueSessions: number
  prevUniqueSessions: number | null
  totalSignups: number
  prevSignups: number | null
  visitsByChannel: ChannelRow[]
  signupsByChannel: ChannelRow[]
  topPages: PageRow[]
  topLandingPages: PageRow[]
  hasData: boolean
}

const WINDOW_LABEL: Record<TrafficWindow, string> = {
  month: "Last 30 days",
  quarter: "Last 90 days",
  all: "All time",
}

function trendFor(count: number, prev: number | null): ChannelRow["trend"] {
  if (prev === null) return null
  if (count > prev * 1.1) return "up"
  if (count < prev * 0.9) return "down"
  return "flat"
}

function rankChannels(
  current: Map<string, number>,
  previous: Map<string, number> | null,
  total: number,
): ChannelRow[] {
  return [...current.entries()]
    .map(([channel, count]) => {
      const prevCount = previous ? previous.get(channel) ?? 0 : null
      return {
        channel,
        count,
        prevCount,
        trend: trendFor(count, prevCount),
        share: total > 0 ? Math.round((count / total) * 100) : 0,
      }
    })
    .sort((a, b) => b.count - a.count)
}

export async function getTrafficReport(window: TrafficWindow): Promise<TrafficReport> {
  const admin = getAdminClient()
  const now = Date.now()

  const days = window === "all" ? null : WINDOW_DAYS[window]
  const windowStart = days ? new Date(now - days * DAY).toISOString() : "1970-01-01"
  const prevStart = days ? new Date(now - days * 2 * DAY).toISOString() : null
  const prevEnd = windowStart

  // --- Visits (Found's own marketing site: company_id is null) ---
  const { data: visitRows } = await admin
    .from("site_visits")
    .select("session_id, path, landing_path, referrer, entry_channel, utm_source, utm_medium, created_at")
    .is("company_id", null)
    .gte("created_at", days ? new Date(now - (days as number) * 2 * DAY).toISOString() : "1970-01-01")

  const allVisits = visitRows ?? []
  const inWindow = allVisits.filter(v => v.created_at >= windowStart)
  const inPrev = prevStart
    ? allVisits.filter(v => v.created_at >= prevStart && v.created_at < prevEnd)
    : null

  const visitChannelCounts = new Map<string, number>()
  const pageCounts = new Map<string, number>()
  const sessions = new Set<string>()
  const landingBySession = new Map<string, string>()
  for (const v of inWindow) {
    sessions.add(v.session_id)
    const ch = v.entry_channel || resolveChannel(v.utm_source, v.utm_medium, v.referrer)
    visitChannelCounts.set(ch, (visitChannelCounts.get(ch) ?? 0) + 1)
    if (v.path) pageCounts.set(v.path, (pageCounts.get(v.path) ?? 0) + 1)
    if (v.landing_path && !landingBySession.has(v.session_id)) {
      landingBySession.set(v.session_id, v.landing_path)
    }
  }

  const prevVisitChannelCounts = inPrev ? new Map<string, number>() : null
  const prevSessions = inPrev ? new Set<string>() : null
  if (inPrev && prevVisitChannelCounts && prevSessions) {
    for (const v of inPrev) {
      prevSessions.add(v.session_id)
      const ch = v.entry_channel || resolveChannel(v.utm_source, v.utm_medium, v.referrer)
      prevVisitChannelCounts.set(ch, (prevVisitChannelCounts.get(ch) ?? 0) + 1)
    }
  }

  const landingCounts = new Map<string, number>()
  for (const path of landingBySession.values()) {
    landingCounts.set(path, (landingCounts.get(path) ?? 0) + 1)
  }

  // --- Signups (paying Found customers, by attributed channel) ---
  const { data: companyRows } = await admin
    .from("companies")
    .select("signup_channel, account_kind, email, created_at")
    .not("signup_channel", "is", null)
    .gte("created_at", days ? new Date(now - (days as number) * 2 * DAY).toISOString() : "1970-01-01")

  const realCompanies = (companyRows ?? []).filter(
    c => !isAdminTestIdentity({ account_kind: c.account_kind, email: c.email }),
  )
  const signupsInWindow = realCompanies.filter(c => c.created_at >= windowStart)
  const signupsInPrev = prevStart
    ? realCompanies.filter(c => c.created_at >= prevStart && c.created_at < prevEnd)
    : null

  const signupChannelCounts = new Map<string, number>()
  for (const c of signupsInWindow) {
    signupChannelCounts.set(c.signup_channel!, (signupChannelCounts.get(c.signup_channel!) ?? 0) + 1)
  }
  const prevSignupChannelCounts = signupsInPrev ? new Map<string, number>() : null
  if (signupsInPrev && prevSignupChannelCounts) {
    for (const c of signupsInPrev) {
      prevSignupChannelCounts.set(c.signup_channel!, (prevSignupChannelCounts.get(c.signup_channel!) ?? 0) + 1)
    }
  }

  const topPages = [...pageCounts.entries()]
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  const topLandingPages = [...landingCounts.entries()]
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  return {
    window,
    windowLabel: WINDOW_LABEL[window],
    totalVisits: inWindow.length,
    uniqueSessions: sessions.size,
    prevUniqueSessions: prevSessions ? prevSessions.size : null,
    totalSignups: signupsInWindow.length,
    prevSignups: signupsInPrev ? signupsInPrev.length : null,
    visitsByChannel: rankChannels(visitChannelCounts, prevVisitChannelCounts, inWindow.length),
    signupsByChannel: rankChannels(signupChannelCounts, prevSignupChannelCounts, signupsInWindow.length),
    topPages,
    topLandingPages,
    hasData: allVisits.length > 0,
  }
}
