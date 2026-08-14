import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@supabase/supabase-js"

function getAdminClient() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) }

export const metadata = { title: "Emails - Found HQ" }

const RECIPIENT_LABELS: Record<string, string> = {
  client_owner: "Owner",
  lead: "Lead/customer",
  admin: "Admin",
  team_member: "Team",
  prospect: "Prospect",
}

export default async function AdminEmailsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const cookieStore = await cookies()
  if (cookieStore.get("admin_key")?.value !== process.env.ADMIN_KEY) redirect("/admin")

  const params = await searchParams
  const q = (typeof params.q === "string" ? params.q : "").trim().toLowerCase()
  const failedOnly = params.failed === "1"
  const flaggedOnly = params.flagged === "1"

  const admin = getAdminClient()
  const { data: rows } = await admin
    .from("email_log")
    .select("id, company_id, lead_id, recipient_email, recipient_type, email_type, subject, success, error, created_at")
    .order("created_at", { ascending: false })
    .limit(300)

  const companyIds = [...new Set((rows ?? []).map((r) => r.company_id).filter((id): id is string => !!id))]
  const leadIds = [...new Set((rows ?? []).map((r) => r.lead_id).filter((id): id is string => !!id))]
  const companyNames = new Map<string, string>()
  const flaggedLeads = new Set<string>()
  await Promise.all([
    companyIds.length > 0
      ? admin.from("companies").select("id, name").in("id", companyIds).then(({ data }) => {
          for (const c of data ?? []) companyNames.set(c.id, c.name)
        })
      : Promise.resolve(),
    leadIds.length > 0
      ? admin.from("leads").select("id, flagged").in("id", leadIds).then(({ data }) => {
          for (const l of data ?? []) if (l.flagged) flaggedLeads.add(l.id)
        })
      : Promise.resolve(),
  ])

  let filtered = rows ?? []
  if (failedOnly) filtered = filtered.filter((r) => !r.success)
  if (flaggedOnly) filtered = filtered.filter((r) => r.lead_id && flaggedLeads.has(r.lead_id))
  if (q) {
    filtered = filtered.filter((r) => {
      const companyName = (r.company_id ? companyNames.get(r.company_id) : "") ?? ""
      return (
        r.recipient_email.toLowerCase().includes(q) ||
        r.subject.toLowerCase().includes(q) ||
        r.email_type.toLowerCase().includes(q) ||
        companyName.toLowerCase().includes(q)
      )
    })
  }

  const failedCount = (rows ?? []).filter((r) => !r.success).length
  const flaggedCount = (rows ?? []).filter((r) => r.lead_id && flaggedLeads.has(r.lead_id)).length

  const buildLink = (overrides: Record<string, string | undefined>) => {
    const next = new URLSearchParams()
    if (q) next.set("q", q)
    if (failedOnly) next.set("failed", "1")
    if (flaggedOnly) next.set("flagged", "1")
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined) next.delete(key)
      else next.set(key, value)
    }
    const qs = next.toString()
    return `/admin/emails${qs ? `?${qs}` : ""}`
  }

  return (
    <div className="hq-page">
      <header className="hq-header">
        <div>
          <p className="hq-eyebrow">Found HQ</p>
          <h1 className="hq-title">Emails</h1>
          <p className="hq-subtitle">Every email Found has sent - owners, leads, team, admin alerts. Most recent 300.</p>
        </div>
        <span className="hq-count">{filtered.length}</span>
      </header>

      <form method="get" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        <input type="text" name="q" defaultValue={q} placeholder="Search company, recipient, subject, or type" style={{ flex: "1 1 240px", minWidth: 0 }} />
        {failedOnly && <input type="hidden" name="failed" value="1" />}
        {flaggedOnly && <input type="hidden" name="flagged" value="1" />}
        <button type="submit" className="hq-button hq-button-secondary">Search</button>
      </form>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        <Link href={buildLink({ failed: failedOnly ? undefined : "1" })} className="hq-button hq-button-secondary" data-active={failedOnly}>
          {failedOnly ? "Show all" : `Failed only (${failedCount})`}
        </Link>
        <Link href={buildLink({ flagged: flaggedOnly ? undefined : "1" })} className="hq-button hq-button-secondary" data-active={flaggedOnly}>
          {flaggedOnly ? "Show all" : `Flagged only (${flaggedCount})`}
        </Link>
        <Link href="/admin/emails/templates" className="hq-button hq-button-secondary">Preview templates</Link>
      </div>

      <div className="hq-panel">
        {filtered.length === 0 ? (
          <div className="hq-empty-state"><strong>No emails found.</strong><span>Try a different search, or check back after Found sends more.</span></div>
        ) : (
          filtered.map((row) => (
            <Link key={row.id} href={`/admin/emails/${row.id}`} className="hq-row hq-link-row">
              <div style={{ minWidth: 0, flex: 1 }}>
                <p className="hq-row-title">
                  {row.subject}
                  {!row.success && <span className="hq-badge hq-badge-warning" style={{ marginLeft: 8 }}>Failed</span>}
                  {row.lead_id && flaggedLeads.has(row.lead_id) && <span className="hq-badge hq-badge-warning" style={{ marginLeft: 8 }}>Flagged</span>}
                </p>
                <p className="hq-row-meta">
                  {row.company_id && companyNames.get(row.company_id) ? `${companyNames.get(row.company_id)} · ` : ""}
                  To {row.recipient_email} ({RECIPIENT_LABELS[row.recipient_type] ?? row.recipient_type}) · {row.email_type}
                </p>
              </div>
              <span className="hq-row-meta" style={{ whiteSpace: "nowrap" }}>
                {new Date(row.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </span>
              <span className="hq-chevron" aria-hidden="true" />
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
