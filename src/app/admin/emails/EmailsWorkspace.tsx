"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

export type EmailRow = {
  id: string
  companyName: string | null
  recipient_email: string
  recipient_type: string
  email_type: string
  subject: string
  success: boolean
  flagged: boolean
  emailScope: "client" | "found"
  deliveryStatus: string | null
  created_at: string
}

const RECIPIENT_LABELS: Record<string, string> = {
  client_owner: "Owner",
  lead: "Lead/customer",
  admin: "Admin",
  team_member: "Team",
  prospect: "Prospect",
}

const DELIVERY_BADGE: Record<string, { label: string; tone: "warning" | "quiet" }> = {
  bounced: { label: "Bounced", tone: "warning" },
  complained: { label: "Marked spam", tone: "warning" },
  delayed: { label: "Delayed", tone: "warning" },
  delivered: { label: "Delivered", tone: "quiet" },
  sent: { label: "Sent", tone: "quiet" },
}

export default function EmailsWorkspace({ rows }: { rows: EmailRow[] }) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<"all" | "failed" | "flagged">("all")
  const [scope, setScope] = useState<"all" | "found" | "client">("all")

  const failedCount = rows.filter((r) => !r.success).length
  const flaggedCount = rows.filter((r) => r.flagged).length
  const foundCount = rows.filter((r) => r.emailScope === "found").length

  const filtered = useMemo(() => rows.filter((row) => {
    const q = query.trim().toLowerCase()
    if (q && !`${row.companyName ?? ""} ${row.recipient_email} ${row.subject} ${row.email_type}`.toLowerCase().includes(q)) return false
    if (filter === "failed" && row.success) return false
    if (filter === "flagged" && !row.flagged) return false
    if (scope !== "all" && row.emailScope !== scope) return false
    return true
  }), [rows, query, filter, scope])

  return (
    <>
      <div className="hq-business-toolbar">
        <input
          className="hq-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search company, recipient, subject, or type"
        />
        <div className="hq-filter-row">
          <button type="button" data-active={filter === "all"} onClick={() => setFilter("all")}>All</button>
          <button type="button" data-active={filter === "failed"} onClick={() => setFilter("failed")}>Failed ({failedCount})</button>
          <button type="button" data-active={filter === "flagged"} onClick={() => setFilter("flagged")}>Flagged ({flaggedCount})</button>
        </div>
      </div>

      <div className="hq-filter-row" style={{ marginTop: 4 }}>
        <button type="button" data-active={scope === "all"} onClick={() => setScope("all")}>All senders</button>
        <button type="button" data-active={scope === "client"} onClick={() => setScope("client")}>Client emails</button>
        <button type="button" data-active={scope === "found"} onClick={() => setScope("found")}>Found emails ({foundCount})</button>
      </div>

      <div className="hq-panel">
        {filtered.length === 0 ? (
          <div className="hq-empty-state"><strong>No emails found.</strong><span>Try a different search or filter.</span></div>
        ) : (
          filtered.map((row) => {
            const delivery = row.deliveryStatus ? DELIVERY_BADGE[row.deliveryStatus] : null
            return (
              <Link key={row.id} href={`/admin/emails/${row.id}`} className="hq-row hq-link-row">
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p className="hq-row-title">
                    {row.subject}
                    {!row.success && <span className="hq-badge hq-badge-warning" style={{ marginLeft: 8 }}>Failed</span>}
                    {row.flagged && <span className="hq-badge hq-badge-warning" style={{ marginLeft: 8 }}>Flagged</span>}
                    {delivery && <span className={`hq-badge ${delivery.tone === "warning" ? "hq-badge-warning" : "hq-badge-quiet"}`} style={{ marginLeft: 8 }}>{delivery.label}</span>}
                  </p>
                  <p className="hq-row-meta">
                    {row.emailScope === "found" ? "Found · " : row.companyName ? `${row.companyName} · ` : ""}
                    To {row.recipient_email} ({RECIPIENT_LABELS[row.recipient_type] ?? row.recipient_type}) · {row.email_type}
                  </p>
                </div>
                <span className="hq-row-meta" style={{ whiteSpace: "nowrap" }}>
                  {new Date(row.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </span>
                <span className="hq-chevron" aria-hidden="true" />
              </Link>
            )
          })
        )}
      </div>

      <p className="hq-page-footnote">Template previews are in <Link href="/admin/emails/templates">Templates</Link>.</p>
    </>
  )
}
