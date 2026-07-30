import { getUptimeMonitors } from "./uptimerobot"
import { getSentryIssues } from "./sentry"

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
  const [monitors, issues] = await Promise.all([getUptimeMonitors(), getSentryIssues()])
  const anyDown = (monitors ?? []).some((m) => m.status === "down")

  return (
    <div className="hq-page hq-page-narrow">
      <header className="hq-header">
        <div>
          <p className="hq-eyebrow">Monitoring</p>
          <h1 className="hq-title">Health</h1>
          <p className="hq-subtitle">Is Found up, and is anything throwing errors right now.</p>
        </div>
      </header>

      <section>
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
