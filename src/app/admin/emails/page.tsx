import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import EmailsWorkspace, { type EmailRow } from "./EmailsWorkspace"

function getAdminClient() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) }

export const metadata = { title: "Emails - Found HQ" }

export default async function AdminEmailsPage() {
  const cookieStore = await cookies()
  if (cookieStore.get("admin_key")?.value !== process.env.ADMIN_KEY) redirect("/admin")

  const admin = getAdminClient()
  const { data: rows } = await admin
    .from("email_log")
    .select("id, company_id, lead_id, recipient_email, recipient_type, email_type, subject, success, email_scope, delivery_status, created_at")
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

  const emailRows: EmailRow[] = (rows ?? []).map((row) => ({
    id: row.id,
    companyName: row.company_id ? companyNames.get(row.company_id) ?? null : null,
    recipient_email: row.recipient_email,
    recipient_type: row.recipient_type,
    email_type: row.email_type,
    subject: row.subject,
    success: row.success,
    flagged: !!(row.lead_id && flaggedLeads.has(row.lead_id)),
    emailScope: row.email_scope,
    deliveryStatus: row.delivery_status,
    created_at: row.created_at,
  }))

  return (
    <div className="hq-page">
      <header className="hq-header">
        <div>
          <p className="hq-eyebrow">Found HQ</p>
          <h1 className="hq-title">Emails</h1>
          <p className="hq-subtitle">Every email Found has sent - client business emails and Found's own. Most recent 300.</p>
        </div>
        <span className="hq-count">{emailRows.length}</span>
      </header>
      <EmailsWorkspace rows={emailRows} />
    </div>
  )
}
