import Link from "next/link"
import { getTrafficReport, type TrafficWindow, type ChannelRow } from "./data"
import { channelDisplayLabel } from "@/lib/channel"
import { UtmLinkBuilder } from "./UtmLinkBuilder"

export const metadata = { title: "Traffic Report - Found HQ" }
export const dynamic = "force-dynamic"

const WINDOWS: { id: TrafficWindow; label: string }[] = [
  { id: "month", label: "30 days" },
  { id: "quarter", label: "90 days" },
  { id: "all", label: "All time" },
]

const PAGE_LABELS: Record<string, string> = {
  "/": "Home",
  "/how-it-works": "How it works",
  "/compare": "Compare (vs Wix/Squarespace)",
  "/plans": "Plans",
  "/plans/found": "Plan — Starter",
  "/plans/found-pro": "Plan — Pro",
  "/plans/found-business": "Plan — Business",
  "/industries": "Industries hub",
  "/onboarding": "Onboarding",
}

function pageLabel(path: string) {
  const clean = path.split("?")[0]
  if (PAGE_LABELS[clean]) return PAGE_LABELS[clean]
  if (clean.startsWith("/industries/")) return `Industry — ${clean.replace("/industries/", "")}`
  return clean
}

function TrendMark({ trend }: { trend: ChannelRow["trend"] }) {
  if (trend === "up") return <span className="hq-badge hq-badge-success">up</span>
  if (trend === "down") return <span className="hq-badge hq-badge-warning">down</span>
  if (trend === "flat") return <span className="hq-badge hq-badge-quiet">flat</span>
  return null
}

function ChannelTable({ rows, unit }: { rows: ChannelRow[]; unit: string }) {
  if (rows.length === 0) {
    return <p className="hq-row-meta" style={{ padding: "12px 0" }}>No {unit} in this window yet.</p>
  }
  const max = rows[0].count || 1
  return (
    <div className="hq-panel">
      {rows.map(row => (
        <div key={row.channel} className="hq-row" style={{ display: "block" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
            <span className="hq-row-title">{channelDisplayLabel(row.channel)}</span>
            <span className="hq-row-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <TrendMark trend={row.trend} />
              {row.count}
              <span className="hq-row-meta">({row.share}%)</span>
            </span>
          </div>
          <div style={{ marginTop: 6, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)" }}>
            <div style={{ width: `${Math.round((row.count / max) * 100)}%`, height: "100%", borderRadius: 2, background: "#32D074" }} />
          </div>
          {row.prevCount !== null && (
            <p className="hq-row-meta" style={{ marginTop: 4 }}>was {row.prevCount} last period</p>
          )}
        </div>
      ))}
    </div>
  )
}

function summarize(
  window: string,
  signups: number,
  topSignup: ChannelRow | undefined,
  topVisit: ChannelRow | undefined,
): string {
  if (signups > 0 && topSignup) {
    return `${signups} paid signup${signups === 1 ? "" : "s"} in the ${window.toLowerCase()}. Most came from ${channelDisplayLabel(topSignup.channel)}. Put your effort there.`
  }
  if (topVisit) {
    return `No attributed signups yet in this window. Most traffic is coming from ${channelDisplayLabel(topVisit.channel)}. Signup attribution starts once onboarding stamps the visit session.`
  }
  return "No traffic recorded yet. Once foundco.app gets visits they'll show up here within a minute."
}

export default async function TrafficReportPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string }>
}) {
  const { window: windowParam } = await searchParams
  const window: TrafficWindow =
    windowParam === "quarter" || windowParam === "all" ? windowParam : "month"

  const report = await getTrafficReport(window)
  const topSignup = report.signupsByChannel[0]
  const topVisit = report.visitsByChannel[0]

  return (
    <div className="hq-page hq-page-narrow">
      <header className="hq-header">
        <div>
          <p className="hq-eyebrow">Found HQ</p>
          <h1 className="hq-title">Traffic Report</h1>
          <p className="hq-subtitle">Where foundco.app visitors and paid signups actually come from — ranked by what converts, not raw views.</p>
        </div>
      </header>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {WINDOWS.map(w => (
          <Link
            key={w.id}
            href={`/admin/traffic?window=${w.id}`}
            className={`hq-badge ${window === w.id ? "hq-badge-success" : "hq-badge-quiet"}`}
            style={{ textDecoration: "none", padding: "6px 12px" }}
          >
            {w.label}
          </Link>
        ))}
      </div>

      <section className="hq-section">
        <div className="hq-panel" style={{ padding: "16px 18px" }}>
          <p className="hq-row-title" style={{ lineHeight: 1.5 }}>
            {summarize(report.windowLabel, report.totalSignups, topSignup, topVisit)}
          </p>
          <p className="hq-row-meta" style={{ marginTop: 8 }}>
            {report.uniqueSessions} visitor{report.uniqueSessions === 1 ? "" : "s"} · {report.totalVisits} pageview{report.totalVisits === 1 ? "" : "s"}
            {report.prevUniqueSessions !== null && ` · was ${report.prevUniqueSessions} visitors last period`}
          </p>
        </div>
      </section>

      <section className="hq-section">
        <div className="hq-section-head">
          <h2 className="hq-section-title">Paid signups by channel</h2>
          <span className="hq-section-meta">{report.totalSignups} total</span>
        </div>
        <ChannelTable rows={report.signupsByChannel} unit="signups" />
      </section>

      <section className="hq-section">
        <div className="hq-section-head">
          <h2 className="hq-section-title">Visitors by channel</h2>
          <span className="hq-section-meta">{report.uniqueSessions} total</span>
        </div>
        <ChannelTable rows={report.visitsByChannel} unit="visits" />
      </section>

      <section className="hq-section">
        <div className="hq-section-head">
          <h2 className="hq-section-title">Where people land</h2>
          <span className="hq-section-meta">first page of the visit</span>
        </div>
        {report.topLandingPages.length === 0 ? (
          <p className="hq-row-meta">No data yet.</p>
        ) : (
          <div className="hq-panel">
            {report.topLandingPages.map(p => (
              <div key={p.path} className="hq-row">
                <span className="hq-row-title">{pageLabel(p.path)}</span>
                <span className="hq-row-title">{p.count}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="hq-section">
        <div className="hq-section-head">
          <h2 className="hq-section-title">Most-viewed pages</h2>
        </div>
        {report.topPages.length === 0 ? (
          <p className="hq-row-meta">No data yet.</p>
        ) : (
          <div className="hq-panel">
            {report.topPages.map(p => (
              <div key={p.path} className="hq-row">
                <span className="hq-row-title">{pageLabel(p.path)}</span>
                <span className="hq-row-title">{p.count}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="hq-section">
        <div className="hq-section-head">
          <h2 className="hq-section-title">Tagged links</h2>
          <span className="hq-section-meta">so every channel is measurable</span>
        </div>
        <UtmLinkBuilder />
      </section>
    </div>
  )
}
