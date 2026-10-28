import Link from "next/link"
import type { getReceivedMail } from "@/lib/admin/mailStore"

type Inbox = Awaited<ReturnType<typeof getReceivedMail>>
export default function InboxWorkspace({ data, folder, page }: { data: Inbox; folder: "inbox" | "spam"; page: number }) {
  return <>
    <form action="/admin/emails/received" method="get" style={{ display: "flex", alignItems: "end", gap: 12, marginBottom: 20 }}>
      <label style={{ flex: 1, minWidth: 0 }}>Folder<select className="hq-input" name="folder" defaultValue={folder}><option value="inbox">Received</option><option value="spam">Spam</option></select></label>
      <button type="submit" className="hq-button hq-button-secondary" style={{ minHeight: 44 }}>Apply</button>
    </form>
    {folder === "spam" && <p className="hq-row-meta">Spam stays separate from unread inbox counts. Open a message to move it back.</p>}
    {data.error && <p role="alert" className="hq-subtitle">Received mail is unavailable. Inbox storage or processing may not be enabled yet. Refresh to check again.</p>}
    <div className="hq-panel">
      {!data.error && data.rows.length === 0 && <div className="hq-empty-state"><strong>{folder === "spam" ? "No messages in Spam." : "No received messages recorded."}</strong><span>This view shows mail received by Found, not your personal inbox.</span></div>}
      {data.rows.map(row => <Link className="hq-row hq-link-row" key={row.id} href={`/admin/emails/received/${encodeURIComponent(row.id)}`} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 12, textDecoration: "none" }}>
        <div style={{ minWidth: 0, overflowWrap: "anywhere" }}>
          <p className="hq-row-title" style={{ fontWeight: row.read_at ? 500 : 750 }}>{!row.read_at && <span aria-label="Unread" style={{ color: "var(--hq-green)", marginRight: 8 }}>●</span>}{row.from_name || row.from_address || "Sender unavailable"}</p>
          <p className="hq-client-activity" style={{ color: "var(--hq-text)" }}>{row.subject || "No subject"}</p>
          <p className="hq-row-meta" style={{ overflowWrap: "anywhere" }}>To: {row.to_addresses.join(", ") || "Recipient unavailable"}</p>
          {row.spam_reasons.some(reason => /unsupported Found address|unknown recipient/i.test(reason)) && <p className="hq-row-meta">Unknown catch-all recipient / Explicit sender choice required after rescue</p>}
          <p className="hq-row-meta">{row.received_at ? new Date(row.received_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Phoenix" }) : "Date unavailable"} / {row.processing_state === "ready" ? "Ready to read" : row.processing_state === "pending" ? "Waiting for message content" : row.processing_state === "processing" ? "Retrieving message content" : row.processing_state === "failed" ? "Retrieval needs attention" : "Processing state unknown"}</p>
          {row.last_error && <p className="hq-row-meta">Processing needs review. Open details.</p>}
        </div><span className="hq-chevron" aria-hidden="true" />
      </Link>)}
    </div>
    {!data.error && <nav aria-label="Received mail pages" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginTop: 20 }}>
      {page > 1 && <Link className="hq-button hq-button-secondary" href={`/admin/emails/received?folder=${folder}&page=${page - 1}`}>Previous</Link>}
      <span className="hq-section-meta">Page {page}{data.total === null ? " / Count unavailable" : ` / ${data.total} messages`}</span>
      {data.total !== null && page * 25 < data.total && <Link className="hq-button hq-button-secondary" href={`/admin/emails/received?folder=${folder}&page=${page + 1}`}>Next</Link>}
    </nav>}
  </>
}
