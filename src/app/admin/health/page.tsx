import Link from "next/link"
import { getUptimeMonitors } from "./uptimerobot"
import { getSentryIssues } from "./sentry"
import { getPostHogMarketingSummary } from "./posthog"
import { getAdminClient } from "../lib"

export const metadata = { title: "Health - Found HQ" }

const SENTRY_ISSUES_URL = "https://supershawn.sentry.io/issues/?project=4511817089744896"

function statusBadge(status: string) {
  if (status === "up") return { tone: "success", label: "Up" }
  if (status === "down") return { tone: "danger", label: "Down" }
  if (status === "paused") return { tone: "warning", label: "Paused" }
  return { tone: "info", label: "Checking" }
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function issueBadge(title: string) {
  const normalized = title.toLowerCase()
  if (normalized.includes("anthropic") || normalized.includes("sharp") || normalized.includes("no such customer")) {
    return { tone: "warning", label: "Review" }
  }
  if (normalized.includes("older or newer deployment") || normalized.includes("abort due to cancellation")) {
    return { tone: "info", label: "Likely noise" }
  }
  return { tone: "warning", label: "Watch" }
}

export default async function AdminHealthPage() {
  const admin = getAdminClient()
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
  const [monitors, issues, posthog, { data: clients }, { data: recentLeads }] = await Promise.all([
    getUptimeMonitors(),
    getSentryIssues(),
    getPostHogMarketingSummary(),
    admin.from("companies").select("id, name").eq("account_kind", "client"),
    admin.from("leads").select("company_id, created_at, type, status").gte("created_at", thirtyDaysAgo),
  ])
  const anyDown = (monitors ?? []).some((m) => m.status === "down")

  // Real leads only - matches the same exclusion the dashboard's own lead
  // counts use (onboarding retries and spam aren't a marketing signal).
  const realLeads = (recentLeads ?? []).filter((lead) => lead.type !== "onboarding_abandoned" && lead.status !== "spam")
  const clientIds = new Set((clients ?? []).map((c) => c.id))
  const clientLeads = realLeads.filter((lead) => clientIds.has(lead.company_id))
  const leads7d = clientLeads.filter((lead) => lead.created_at >= sevenDaysAgo).length
  const leads30d = clientLeads.length
  const leadsByCompany = new Map<string, number>()
  for (const lead of clientLeads) leadsByCompany.set(lead.company_id, (leadsByCompany.get(lead.company_id) ?? 0) + 1)
  const topByLeads = (clients ?? [])
    .map((c) => ({ name: c.name, count: leadsByCompany.get(c.id) ?? 0 }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
  const visibleIssues = (issues ?? []).slice(0, 5)

  return (
    <div className="hq-page hq-page-narrow">
      <Link href="/admin/more" className="hq-back-link"><span className="hq-back-chevron" />More</Link>
      <header className="hq-header">
        <div>
          <p className="hq-eyebrow">Monitoring</p>
          <h1 className="hq-title">Health</h1>
          <p className="hq-subtitle">Your founder dashboard: traffic, leads, uptime, errors, and the next funnel step that helps Found turn attention into revenue.</p>
        </div>
      </header>

      <section>
        <div className="hq-section-head">
          <h2 className="hq-section-title">Marketing funnel</h2>
          <span className="hq-badge hq-badge-info">{posthog ? "Traffic live" : "Traffic pending"}</span>
        </div>
        <div className="hq-stat-strip" style={{ marginBottom: 14 }}>
          <div className="hq-stat"><div className="hq-stat-value">{leads7d}</div><div className="hq-stat-label">Client leads, last 7 days</div></div>
          <div className="hq-stat"><div className="hq-stat-value">{leads30d}</div><div className="hq-stat-label">Client leads, last 30 days</div></div>
          <div className="hq-stat"><div className="hq-stat-value">{posthog ? posthog.visitors7d : "—"}</div><div className="hq-stat-label">Visitors, last 7 days</div></div>
          <div className="hq-stat"><div className="hq-stat-value">{posthog ? posthog.pageviews7d : "—"}</div><div className="hq-stat-label">Pageviews, last 7 days</div></div>
        </div>
        <div className="hq-panel">
          {posthog ? (
            <div className="hq-row" style={{ minHeight: 82 }}>
              <div>
                <p className="hq-row-title">Found traffic: {posthog.visitors30d} visitors · {posthog.pageviews30d} pageviews</p>
                <p className="hq-row-meta">This is attention on foundco.app. The next question is whether that attention turns into signups, plan picks, and paid activations.</p>
              </div>
              <span className="hq-badge hq-badge-success">Live</span>
            </div>
          ) : (
            <div className="hq-row"><p className="hq-row-meta">Traffic (PostHog) is not available yet. Check `POSTHOG_PERSONAL_API_KEY`, `POSTHOG_PROJECT_ID`, and `POSTHOG_HOST` in Vercel.</p></div>
          )}
          {topByLeads.length === 0 && (
            <div className="hq-row"><p className="hq-row-meta">No client leads in the last 30 days.</p></div>
          )}
          {topByLeads.map((c) => (
            <div key={c.name} className="hq-row"><p className="hq-row-title">{c.name}</p><span className="hq-badge hq-badge-success">{c.count} lead{c.count !== 1 ? "s" : ""}</span></div>
          ))}
          <div className="hq-row" style={{ minHeight: 104 }}>
            <div>
              <p className="hq-row-title">Next money step: instrument the signup funnel</p>
              <p className="hq-row-meta">Funnel means the path from stranger to paying customer. We can see visits now; next we track who starts onboarding, finishes onboarding, picks Starter/Business/Pro, starts checkout, and activates. That tells us where Found is losing money.</p>
            </div>
            <span className="hq-badge hq-badge-warning">Next</span>
          </div>
        </div>
      </section>

      <section className="hq-section">
        <div className="hq-section-head">
          <h2 className="hq-section-title">Uptime</h2>
          {monitors && <span className={`hq-badge hq-badge-${anyDown ? "danger" : "success"}`}>{anyDown ? "Issue detected" : "All up"}</span>}
        </div>
        <div className="hq-panel">
          {!monitors && (
            <div className="hq-row"><p className="hq-row-meta">UptimeRobot isn&apos;t configured (missing API key).</p></div>
          )}
          {monitors && monitors.length === 0 && (
            <div className="hq-row"><p className="hq-row-meta">No monitors set up yet.</p></div>
          )}
          {monitors?.map((m) => {
            const badge = statusBadge(m.status)
            return (
              <div key={m.id} className="hq-row" style={{ minHeight: 82 }}>
                <div>
                  <p className="hq-row-title">{m.name}</p>
                  <p className="hq-row-meta">
                    {m.uptime30d !== null ? `${m.uptime30d.toFixed(2)}% uptime (30d)` : "No history yet"}
                    {m.avgResponseMs !== null ? ` · ${Math.round(m.avgResponseMs)}ms avg response` : ""}
                  </p>
                </div>
                <span className={`hq-badge hq-badge-${badge.tone}`}>{badge.label}</span>
              </div>
            )
          })}
        </div>
      </section>

      <section className="hq-section">
        <div className="hq-section-head">
          <h2 className="hq-section-title">System issues</h2>
          {issues && <span className={`hq-badge hq-badge-${issues.length ? "warning" : "success"}`}>{issues.length ? `${issues.length} need review` : "Clear"}</span>}
        </div>
        <div className="hq-panel">
          {!issues && (
            <div className="hq-row"><p className="hq-row-meta">Sentry isn&apos;t configured (missing read token).</p></div>
          )}
          {issues && issues.length === 0 && (
            <div className="hq-row"><p className="hq-row-meta">No unresolved errors.</p></div>
          )}
          {issues && issues.length > 0 && (
            <div className="hq-row" style={{ minHeight: 92 }}>
              <div>
                <p className="hq-row-title">How to read this</p>
                <p className="hq-row-meta">These are developer alerts from Sentry. Some are testing or deployment noise. Repeated, recent, payment, image, and AI-credit issues get reviewed first because they can block signups or paid upgrades.</p>
              </div>
            </div>
          )}
          {visibleIssues.map((issue) => {
            const badge = issueBadge(issue.title)
            return (
              <a key={issue.id} href={issue.permalink} target="_blank" rel="noreferrer" className="hq-row hq-link-row" style={{ minHeight: 82 }}>
                <div>
                  <p className="hq-row-title">{issue.title}</p>
                  <p className="hq-row-meta">
                    {issue.count}× · last seen {timeAgo(issue.lastSeen)}
                    {issue.culprit ? ` · ${issue.culprit}` : ""}
                  </p>
                </div>
                <span className={`hq-badge hq-badge-${badge.tone}`}>{badge.label}</span>
              </a>
            )
          })}
          {issues && issues.length > visibleIssues.length && (
            <div className="hq-row"><p className="hq-row-meta">Showing the top {visibleIssues.length}. Open Sentry for the full list and cleanup history.</p></div>
          )}
          <a href={SENTRY_ISSUES_URL} target="_blank" rel="noreferrer" className="hq-row hq-link-row">
            <div><p className="hq-row-title">Open Sentry</p><p className="hq-row-meta">Full issue history, resolve, and assign</p></div>
            <span className="hq-chevron" aria-hidden="true" />
          </a>
        </div>
      </section>
    </div>
  )
}
