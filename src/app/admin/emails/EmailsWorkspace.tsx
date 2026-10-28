import Link from "next/link"
import { emailDeliveryLabel } from "@/lib/admin/emailHistory"
import type { getAdminEmailHistory } from "@/lib/admin/emailHistory"

type History = Awaited<ReturnType<typeof getAdminEmailHistory>>
type Filters = { category: string; clientId: string; q: string; status: string; page: number }
const categories = [
  ["found_clients", "Found to our clients"], ["business", "Business email"],
  ["admin_alerts", "Admin alerts"], ["unclassified", "Unclassified"], ["all", "All email"],
] as const

function dateLabel(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Phoenix" })
}

function href(filters: Filters, overrides: Partial<Filters> = {}) {
  const next = { ...filters, ...overrides }
  const query = new URLSearchParams({ category: next.category, status: next.status })
  if (next.clientId) query.set("client", next.clientId)
  if (next.q) query.set("q", next.q)
  if (next.page > 1) query.set("page", String(next.page))
  return `/admin/emails?${query}`
}

export default function EmailsWorkspace({ data, filters }: { data: History; filters: Filters }) {
  const overview = filters.category === "found_clients" && !filters.clientId && !filters.q && filters.status === "all"
  const selectedClient = data.clients.find(client => client.id === filters.clientId)
  const pageCount = data.total === null ? null : Math.max(1, Math.ceil(data.total / data.pageSize))
  return <>
    <form action="/admin/emails" method="get" style={{ marginBottom: 16 }}>
      <div className="hq-email-category-controls" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", alignItems: "end", gap: 8 }}>
        <label style={{ minWidth: 0 }}>Email category
          <select className="hq-input" name="category" defaultValue={filters.category}>
            {categories.map(([value, label]) => <option key={value} value={value}>{label}{data.categoryCounts && value !== "all" ? ` (${data.categoryCounts[value]})` : ""}</option>)}
          </select>
        </label>
        <button className="hq-button hq-button-secondary" type="submit" style={{ minHeight: 44 }}>Apply</button>
      </div>
      {filters.clientId && <input type="hidden" name="client" value={filters.clientId} />}
      <details open={!overview || !!filters.q || filters.status !== "all"} style={{ marginTop: 8 }}>
        <summary style={{ minHeight: 44, alignContent: "center", cursor: "pointer", color: "var(--hq-muted)" }}>Search and filters</summary>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "end", gap: 12, paddingBottom: 8 }}>
        <label style={{ minWidth: 0, flex: "1 1 180px" }}>Search
          <input className="hq-input" type="search" name="q" defaultValue={filters.q} placeholder="Client, recipient or subject" />
        </label>
        <label style={{ minWidth: 0, maxWidth: "100%" }}>Review filter
          <select className="hq-input" name="status" defaultValue={filters.status}>
            <option value="all">All handling and delivery states</option>
            <option value="issues">Delivery issues, including handled</option>
            <option value="flagged">Staff-flagged leads</option>
            <option value="handled">Marked handled</option>
          </select>
        </label>
        <Link href="/admin/emails" className="hq-button hq-button-quiet">Reset</Link>
        </div>
      </details>
    </form>
    {data.categoryCounts && <p className="hq-row-meta" style={{ marginBottom: 12 }}>Counts: all recorded email. <Link href={href(filters, { category: "unclassified", clientId: "", q: "", status: "all", page: 1 })}>Unclassified: {data.categoryCounts.unclassified}</Link></p>}
    {data.error && <p role="alert" className="hq-subtitle">Email history could not be fully loaded. Please refresh before relying on these results.</p>}
    {!data.handlingReady && <p className="hq-page-footnote">Handling status is unavailable. Delivery records are shown separately.</p>}
    {overview ? <section aria-label="Client email overview">
      <div className="hq-section-head"><h2 className="hq-section-title">Our clients</h2><span className="hq-section-meta">{data.clients.length} clients</span></div>
      <div className="hq-panel">
        {data.clients.length === 0 && <div className="hq-empty-state"><strong>{data.error ? "Clients could not be loaded." : "No current clients found."}</strong></div>}
        {data.clients.map(client => <Link key={client.id} href={href(filters, { clientId: client.id, page: 1 })} className="hq-row hq-link-row" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", alignItems: "center", gap: 12, textDecoration: "none" }}>
          <div style={{ minWidth: 0, overflowWrap: "anywhere" }}>
            <h3 className="hq-row-title">{client.name}</h3>
            <p className="hq-row-meta">Stored relationship: {client.client_state ?? "Not recorded"} / Subscription: {client.subscription_status ?? "Not recorded"}</p>
            {client.latest ? <>
              <p className="hq-client-activity" style={{ color: "var(--hq-text)" }}>{client.latest.subject || "Untitled email"}</p>
              <p className="hq-row-meta">{dateLabel(client.latest.created_at)} / Delivery: {emailDeliveryLabel(client.latest)}</p>
            </> : <p className="hq-client-activity" style={{ color: "var(--hq-text)" }}>No classified Found emails recorded.</p>}
            <p className="hq-row-meta">{client.messageCount} emails / {client.issueCount} recorded delivery issues</p>
          </div>
          <span className="hq-chevron" aria-hidden="true" />
        </Link>)}
      </div>
      <p className="hq-page-footnote">Relationship and subscription: stored status, not verified billing.</p>
      <p className="hq-page-footnote">Unknown email types remain in <Link href={href(filters, { category: "unclassified", page: 1 })}>Unclassified</Link>.</p>
      {data.unlinkedFoundCount !== null && data.unlinkedFoundCount > 0 && <p className="hq-page-footnote">{data.unlinkedFoundCount} Found emails have no linked client{data.unlinkedLoginCount !== null ? `, including ${data.unlinkedLoginCount} login emails` : ""}. <Link href={href(filters, { category: "found_clients", clientId: "unlinked", page: 1 })}>View unlinked Found email</Link>. No client association has been guessed.</p>}
    </section> : <section aria-label="Email history">
      <div className="hq-section-head"><h2 className="hq-section-title">{filters.clientId === "unlinked" ? "Unlinked Found email" : selectedClient ? `${selectedClient.name} - email history` : "Recorded email"}</h2><span className="hq-section-meta">{data.total === null ? "Count unavailable" : `${data.total} matching`}</span></div>
      {filters.clientId && <p><Link href={href(filters, { clientId: "", page: 1 })}>Back to clients</Link>{filters.clientId !== "unlinked" && <> / <Link href={`/admin/clients/${encodeURIComponent(filters.clientId)}`}>Client details</Link></>}</p>}
      {filters.clientId && filters.clientId !== "unlinked" && filters.category !== "unclassified" && <p className="hq-page-footnote"><Link href={href(filters, { category: "unclassified", status: "all", q: "", page: 1 })}>View this client's unclassified emails</Link></p>}
      <p className="hq-page-footnote">Most recent first. Handling records staff review; it does not change delivery.</p>
      <div className="hq-panel hq-email-list">
        {data.rows.length === 0 && <div className="hq-empty-state"><strong>{data.error ? "History unavailable." : "No recorded emails match."}</strong><span>Try a different search or review filter.</span></div>}
        {data.rows.map(row => <div key={row.id} className="hq-email-row">
          <Link href={`/admin/emails/${row.id}`} className="hq-email-row-main" style={{ minWidth: 0, overflowWrap: "anywhere" }}>
            <div className="hq-email-row-top"><p className="hq-row-title">{row.subject || "Untitled email"}</p></div>
            <p className="hq-row-meta">{row.company_name ?? "No linked client"} / To {row.recipient_email ?? "Recipient not recorded"}</p>
            <p className="hq-row-meta">{dateLabel(row.created_at)} / {row.email_type}</p>
            <p className="hq-client-summary"><span>Delivery: {emailDeliveryLabel(row)}</span><span>Handling: {data.handlingReady ? row.handled_at ? "Marked handled" : "Not marked handled" : "Unavailable"}</span></p>
            {row.staff_flagged && <p className="hq-client-activity">Staff review: flagged lead</p>}
            {row.handled_note && <p className="hq-client-activity">Handling note: {row.handled_note}</p>}
          </Link>
          <div className="hq-email-row-actions">
            <Link href={`/admin/emails/${row.id}`}>Open details</Link>
          </div>
        </div>)}
      </div>
      <nav aria-label="Email history pages" style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", marginTop: 20 }}>
        {data.page > 1 && <Link className="hq-button hq-button-secondary" href={href(filters, { page: data.page - 1 })}>Previous</Link>}
        <span className="hq-section-meta">{pageCount === null ? "Pagination unavailable" : `Page ${data.page} of ${pageCount}`}</span>
        {pageCount !== null && data.page < pageCount && <Link className="hq-button hq-button-secondary" href={href(filters, { page: data.page + 1 })}>Next</Link>}
      </nav>
    </section>}
    <p className="hq-page-footnote">Delivery confirms provider receipt, not that the client read it.</p>
    <style>{`
      @media (max-width: 360px) {
        .hq-email-category-controls { grid-template-columns: minmax(0, 1fr) !important; }
        .hq-email-category-controls > button { justify-self: end; }
      }
    `}</style>
  </>
}
