import { getUptimeMonitors } from "./uptimerobot"

export const metadata = { title: "Health - Found HQ" }

const SENTRY_ISSUES_URL = "https://supershawn.sentry.io/issues/?project=4511817089744896"

function statusBadge(status: string) {
  if (status === "up") return { tone: "success", label: "Up" }
  if (status === "down") return { tone: "danger", label: "Down" }
  if (status === "paused") return { tone: "warning", label: "Paused" }
  return { tone: "info", label: "Checking" }
}

export default async function AdminHealthPage() {
  const monitors = await getUptimeMonitors()
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
        <div className="hq-section-head"><h2 className="hq-section-title">Errors</h2></div>
        <div className="hq-panel">
          <a href={SENTRY_ISSUES_URL} target="_blank" rel="noreferrer" className="hq-row hq-link-row">
            <div>
              <p className="hq-row-title">Sentry issues</p>
              <p className="hq-row-meta">Errors from the dashboard, every client site, and all API routes</p>
            </div>
            <span className="hq-chevron" aria-hidden="true" />
          </a>
        </div>
      </section>
    </div>
  )
}
