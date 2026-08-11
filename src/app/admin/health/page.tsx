import { getUptimeMonitors } from "./uptimerobot"
import { getSentryIssues } from "./sentry"
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

export default async function AdminHealthPage() {
  const admin = getAdminClient()
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
  const [monitors, issues, { data: clients }, { data: recentLeads }] = await Promise.all([
    getUptimeMonitors(),
    getSentryIssues(),
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

  return (
    <div className="hq-page hq-page-narrow">
      <header className="hq-header">
        <div>
          <p className="hq-eyebrow">Monitoring</p>
          <h1 className="hq-title">Health</h1>
          <p className="hq-subtitle">Is Found up, is anything throwing errors, and is marketing actually working for clients.</p>
        </div>
      </header>

      <section>
        <div className="hq-section-head">
          <h2 className="hq-section-title">Marketing</h2>
          <span className="hq-badge hq-badge-info">{leads7d} leads this week</span>
        </div>
        <div className="hq-stat-strip" style={{ marginBottom: 14 }}>
          <div className="hq-stat"><div className="hq-stat-value">{leads7d}</div><div className="hq-stat-label">Leads, last 7 days</div></div>
          <div className="hq-stat"><div className="hq-stat-value">{leads30d}</div><div className="hq-stat-label">Leads, last 30 days</div></div>
        </div>
        <div className="hq-panel">
          {topByLeads.length === 0 && (
            <div className="hq-row"><p className="hq-row-meta">No client leads in the last 30 days.</p></div>
          )}
          {topByLeads.map((c) => (
            <div key={c.name} className="hq-row"><p className="hq-row-title">{c.name}</p><span className="hq-badge hq-badge-success">{c.count} lead{c.count !== 1 ? "s" : ""}</span></div>
          ))}
          <div className="hq-row"><p className="hq-row-meta">Traffic and conversion (PostHog) aren&apos;t wired in yet - needs a Personal API Key with read access from PostHog&apos;s settings, not just the public project key already in use for tracking.</p></div>
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
          <h2 className="hq-section-title">Errors (last 14 days)</h2>
          {issues && <span className={`hq-badge hq-badge-${issues.length ? "warning" : "success"}`}>{issues.length ? `${issues.length} open` : "Clear"}</span>}
        </div>
        <div className="hq-panel">
          {!issues && (
            <div className="hq-row"><p className="hq-row-meta">Sentry isn&apos;t configured (missing read token).</p></div>
          )}
          {issues && issues.length === 0 && (
            <div className="hq-row"><p className="hq-row-meta">No unresolved errors.</p></div>
          )}
          {issues?.map((issue) => (
            <a key={issue.id} href={issue.permalink} target="_blank" rel="noreferrer" className="hq-row hq-link-row" style={{ minHeight: 82 }}>
              <div>
                <p className="hq-row-title">{issue.title}</p>
                <p className="hq-row-meta">
                  {issue.count}× · last seen {timeAgo(issue.lastSeen)}
                  {issue.culprit ? ` · ${issue.culprit}` : ""}
                </p>
              </div>
              <span className="hq-chevron" aria-hidden="true" />
            </a>
          ))}
          <a href={SENTRY_ISSUES_URL} target="_blank" rel="noreferrer" className="hq-row hq-link-row">
            <div><p className="hq-row-title">Open Sentry</p><p className="hq-row-meta">Full issue history, resolve, and assign</p></div>
            <span className="hq-chevron" aria-hidden="true" />
          </a>
        </div>
      </section>
    </div>
  )
}
