"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { markEmailHandled } from "./actions"

export type EmailRow = {
  id: string
  companyId: string | null
  companyName: string | null
  companySlug: string | null
  leadId: string | null
  leadName: string | null
  leadStatus: string | null
  recipient_email: string
  recipient_type: string
  email_type: string
  subject: string
  success: boolean
  flagged: boolean
  emailScope: "client" | "found"
  deliveryStatus: string | null
  handledAt: string | null
  handledNote: string | null
  created_at: string
}

type InboxView = "needs_response" | "handled" | "all"

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

function needsResponse(row: EmailRow) {
  return !row.handledAt && (!row.success || row.flagged || ["bounced", "complained", "delayed"].includes(row.deliveryStatus ?? ""))
}

function statusLabel(row: EmailRow) {
  if (row.handledAt) return "Handled"
  if (!row.success) return "Failed"
  if (row.flagged) return "Flagged"
  if (row.deliveryStatus === "bounced") return "Bounced"
  if (row.deliveryStatus === "complained") return "Spam complaint"
  if (row.deliveryStatus === "delayed") return "Delayed"
  return DELIVERY_BADGE[row.deliveryStatus ?? ""]?.label ?? "Sent"
}

function nextAction(row: EmailRow) {
  if (row.handledAt) return "Handled"
  if (!row.success) return "Fix send"
  if (row.flagged) return "Review lead"
  if (row.deliveryStatus === "bounced") return "Fix email"
  if (row.deliveryStatus === "complained") return "Stop sending"
  if (row.deliveryStatus === "delayed") return "Check later"
  return "Open"
}

function relatedLabel(row: EmailRow) {
  if (row.companyName) return row.companyName
  if (row.leadName) return row.leadName
  if (row.emailScope === "found") return "Found"
  return "Unlinked"
}

function relatedHref(row: EmailRow) {
  if (row.companyId) return `/admin/clients/${row.companyId}`
  return null
}

export default function EmailsWorkspace({ rows, handlingReady }: { rows: EmailRow[]; handlingReady: boolean }) {
  const [query, setQuery] = useState("")
  const [view, setView] = useState<InboxView>("needs_response")
  const [scope, setScope] = useState<"all" | "found" | "client">("all")

  const needsResponseCount = rows.filter(needsResponse).length
  const handledCount = rows.filter((r) => r.handledAt).length
  const foundCount = rows.filter((r) => r.emailScope === "found").length

  const filtered = useMemo(() => rows.filter((row) => {
    const q = query.trim().toLowerCase()
    if (q && !`${row.companyName ?? ""} ${row.leadName ?? ""} ${row.recipient_email} ${row.subject} ${row.email_type}`.toLowerCase().includes(q)) return false
    if (view === "needs_response" && !needsResponse(row)) return false
    if (view === "handled" && !row.handledAt) return false
    if (scope !== "all" && row.emailScope !== scope) return false
    return true
  }), [rows, query, view, scope])

  return (
    <>
      <section className="hq-command-status hq-email-command">
        <div>
          <span>Email issues</span>
          <strong>{needsResponseCount}</strong>
          <p>{!handlingReady ? "Email handling fields are not live in Supabase yet; apply the migration to enable handled/reopen." : needsResponseCount === 0 ? "No failed, delayed, bounced, or flagged email needs review right now." : `${needsResponseCount} email${needsResponseCount === 1 ? "" : "s"} need review because delivery failed, bounced, was delayed, got a spam complaint, or a lead was flagged.`}</p>
        </div>
        <Link href="/admin/emails/templates">Templates<span className="hq-chevron" /></Link>
      </section>

      <div className="hq-detail-snapshot hq-email-snapshot">
        <button type="button" data-active={view === "needs_response"} onClick={() => setView("needs_response")}><span>Needs review</span><strong>{needsResponseCount}</strong></button>
        <button type="button" data-active={view === "handled"} onClick={() => setView("handled")}><span>Handled</span><strong>{handledCount}</strong></button>
        <button type="button" data-active={view === "all"} onClick={() => setView("all")}><span>Tracked emails</span><strong>{rows.length}</strong></button>
      </div>

      <div className="hq-business-toolbar">
        <input
          className="hq-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search company, recipient, subject, or type"
        />
        <div className="hq-filter-row">
          <button type="button" data-active={scope === "all"} onClick={() => setScope("all")}>All senders</button>
          <button type="button" data-active={scope === "client"} onClick={() => setScope("client")}>Client</button>
          <button type="button" data-active={scope === "found"} onClick={() => setScope("found")}>Found ({foundCount})</button>
        </div>
      </div>

      <div className="hq-panel hq-email-list">
        {filtered.length === 0 ? (
          <div className="hq-empty-state"><strong>No emails found.</strong><span>Try a different search or filter.</span></div>
        ) : (
          filtered.map((row) => {
            const delivery = row.deliveryStatus ? DELIVERY_BADGE[row.deliveryStatus] : null
            return (
              <div key={row.id} className="hq-email-row">
                <Link href={`/admin/emails/${row.id}`} className="hq-email-row-main">
                  <div className="hq-email-row-top">
                    <p className="hq-row-title">{row.subject}</p>
                    <span className={`hq-badge ${needsResponse(row) ? "hq-badge-warning" : row.handledAt ? "hq-badge-success" : "hq-badge-quiet"}`}>{statusLabel(row)}</span>
                  </div>
                  <p className="hq-row-meta">
                    {row.emailScope === "found" ? "Found" : "Client"} / To {row.recipient_email} ({RECIPIENT_LABELS[row.recipient_type] ?? row.recipient_type}) / {row.email_type}
                  </p>
                  <p className="hq-client-summary">
                    <span>{relatedLabel(row)}</span>
                    <span><i aria-hidden="true" />{row.leadStatus ? `Lead ${row.leadStatus}` : row.companySlug ? row.companySlug : "No link"}</span>
                    <span><i aria-hidden="true" />{new Date(row.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                    <span><i aria-hidden="true" />{nextAction(row)}</span>
                  </p>
                  {delivery && delivery.tone === "warning" && <p className="hq-client-activity">{delivery.label} delivery status from Resend.</p>}
                  {row.handledNote && <p className="hq-client-activity">Handled: {row.handledNote}</p>}
                </Link>
                <div className="hq-email-row-actions">
                  <Link href={`/admin/emails/${row.id}`}>Open</Link>
                  {relatedHref(row) && <Link href={relatedHref(row)!}>Client</Link>}
                  {handlingReady && !row.handledAt && (
                    <form action={markEmailHandled}>
                      <input type="hidden" name="emailId" value={row.id} />
                      <input type="hidden" name="handled" value="1" />
                      <button type="submit">Mark handled</button>
                    </form>
                  )}
                  {handlingReady && row.handledAt && (
                    <form action={markEmailHandled}>
                      <input type="hidden" name="emailId" value={row.id} />
                      <input type="hidden" name="handled" value="0" />
                      <button type="submit">Reopen</button>
                    </form>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      <p className="hq-page-footnote">This is sent-email operations. True inbound replies need a reply inbox/webhook later.</p>
    </>
  )
}
