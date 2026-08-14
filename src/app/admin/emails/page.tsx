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

  const admin = getAdminClient()
  const { data: rows } = await admin
    .from("email_log")
    .select("id, company_id, recipient_email, recipient_type, email_type, subject, success, error, source, created_at")
    .order("created_at", { ascending: false })
    .limit(300)

  const companyIds = [...new Set((rows ?? []).map((r) => r.company_id).filter((id): id is string => !!id))]
  const companyNames = new Map<string, string>()
  if (companyIds.length > 0) {
    const { data: companies } = await admin.from("companies").select("id, name").in("id", companyIds)
    for (const c of companies ?? []) companyNames.set(c.id, c.name)
  }

  let filtered = rows ?? []
  if (failedOnly) filtered = filtered.filter((r) => !r.success)
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

      <div className="hq-filter-row" style={{ marginBottom: 16 }}>
        <form method="get" style={{ display: "flex", gap: 8, flex: 1 }}>
          <input type="text" name="q" defaultValue={q} placeholder="Search by company, recipient, subject, or type" style={{ flex: 1 }} />
          {failedOnly && <input type="hidden" name="failed" value="1" />}
          <button type="submit" className="hq-button hq-button-secondary">Search</button>
        </form>
        <Link href={failedOnly ? "/admin/emails" : `/admin/emails?failed=1${q ? `&q=${encodeURIComponent(q)}` : ""}`} className="hq-button hq-button-secondary" data-active={failedOnly}>
          {failedOnly ? "Show all" : `Failed only (${failedCount})`}
        </Link>
        <Link href="/admin/emails/templates" className="hq-button hq-button-secondary">Preview templates</Link>
      </div>

      <div className="hq-panel">
        {filtered.length === 0 ? (
          <div className="hq-empty-state"><strong>No emails found.</strong><span>Try a different search, or check back after Found sends more.</span></div>
        ) : (
          filtered.map((row) => (
            <div key={row.id} className="hq-row">
              <div style={{ minWidth: 0, flex: 1 }}>
                <p className="hq-row-title">
                  {row.subject}
                  {!row.success && <span className="hq-badge hq-badge-warning" style={{ marginLeft: 8 }}>Failed</span>}
                </p>
                <p className="hq-row-meta">
                  {row.company_id && companyNames.get(row.company_id) ? `${companyNames.get(row.company_id)} · ` : ""}
                  To {row.recipient_email} ({RECIPIENT_LABELS[row.recipient_type] ?? row.recipient_type}) · {row.email_type}
                </p>
                {row.error && <p className="hq-row-meta" style={{ color: "var(--hq-danger, #F43F5E)" }}>{row.error}</p>}
              </div>
              <span className="hq-row-meta" style={{ whiteSpace: "nowrap" }}>
                {new Date(row.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
