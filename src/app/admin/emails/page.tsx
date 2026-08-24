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
  const emailResult = await admin
    .from("email_log")
    .select("id, company_id, lead_id, recipient_email, recipient_type, email_type, subject, success, email_scope, delivery_status, handled_at, handled_note, created_at")
    .order("created_at", { ascending: false })
    .limit(300)
  const handlingReady = !emailResult.error
  const fallbackResult = handlingReady
    ? null
    : await admin
      .from("email_log")
      .select("id, company_id, lead_id, recipient_email, recipient_type, email_type, subject, success, email_scope, delivery_status, created_at")
      .order("created_at", { ascending: false })
      .limit(300)
  const rows = handlingReady ? emailResult.data : fallbackResult?.data

  const companyIds = [...new Set((rows ?? []).map((r) => r.company_id).filter((id): id is string => !!id))]
  const leadIds = [...new Set((rows ?? []).map((r) => r.lead_id).filter((id): id is string => !!id))]
  const companies = new Map<string, { name: string; slug: string }>()
  const leads = new Map<string, { name: string; status: string; flagged: boolean }>()
  const flaggedLeads = new Set<string>()
  await Promise.all([
    companyIds.length > 0
      ? admin.from("companies").select("id, name, slug").in("id", companyIds).then(({ data }) => {
          for (const c of data ?? []) companies.set(c.id, { name: c.name, slug: c.slug })
        })
      : Promise.resolve(),
    leadIds.length > 0
      ? admin.from("leads").select("id, name, status, flagged").in("id", leadIds).then(({ data }) => {
          for (const l of data ?? []) {
            leads.set(l.id, { name: l.name, status: l.status, flagged: l.flagged })
            if (l.flagged) flaggedLeads.add(l.id)
          }
        })
      : Promise.resolve(),
  ])

  const emailRows: EmailRow[] = (rows ?? []).map((row) => {
    const handledAtValue = "handled_at" in row ? row.handled_at : null
    const handledNoteValue = "handled_note" in row ? row.handled_note : null
    return {
      id: row.id,
      companyId: row.company_id,
      companyName: row.company_id ? companies.get(row.company_id)?.name ?? null : null,
      companySlug: row.company_id ? companies.get(row.company_id)?.slug ?? null : null,
      leadId: row.lead_id,
      leadName: row.lead_id ? leads.get(row.lead_id)?.name ?? null : null,
      leadStatus: row.lead_id ? leads.get(row.lead_id)?.status ?? null : null,
      recipient_email: row.recipient_email,
      recipient_type: row.recipient_type,
      email_type: row.email_type,
      subject: row.subject,
      success: row.success,
      flagged: !!(row.lead_id && flaggedLeads.has(row.lead_id)),
      emailScope: row.email_scope,
      deliveryStatus: row.delivery_status,
      handledAt: typeof handledAtValue === "string" ? handledAtValue : null,
      handledNote: typeof handledNoteValue === "string" ? handledNoteValue : null,
      created_at: row.created_at,
    }
  })

  return (
    <div className="hq-page">
      <header className="hq-header">
        <div>
          <p className="hq-eyebrow">Found HQ</p>
          <h1 className="hq-title">Emails</h1>
          <p className="hq-subtitle">Operations inbox for sent email, delivery problems, flagged leads, and follow-up handling. Most recent 300.</p>
        </div>
        <span className="hq-count">{emailRows.length}</span>
      </header>
      <EmailsWorkspace rows={emailRows} handlingReady={handlingReady} />
    </div>
  )
}
