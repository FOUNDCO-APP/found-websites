import { cookies } from "next/headers"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@supabase/supabase-js"
import { setLeadFlag } from "../actions"

function getAdminClient() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) }

const RECIPIENT_LABELS: Record<string, string> = {
  client_owner: "Owner",
  lead: "Lead/customer",
  admin: "Admin",
  team_member: "Team",
  prospect: "Prospect",
}

const DELIVERY_LABELS: Record<string, string> = {
  sent: "Sent",
  delivered: "Delivered",
  delayed: "Delayed",
  bounced: "Bounced",
  complained: "Marked as spam",
}

export const metadata = { title: "Email - Found HQ" }

export default async function AdminEmailDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  if (cookieStore.get("admin_key")?.value !== process.env.ADMIN_KEY) redirect("/admin")

  const admin = getAdminClient()
  const { data: row } = await admin
    .from("email_log")
    .select("id, company_id, lead_id, recipient_email, recipient_type, email_type, subject, html, text_body, success, error, source, email_scope, delivery_status, delivery_status_at, created_at")
    .eq("id", id)
    .maybeSingle()

  if (!row) notFound()

  const [{ data: company }, { data: lead }] = await Promise.all([
    row.company_id ? admin.from("companies").select("name, slug").eq("id", row.company_id).maybeSingle() : Promise.resolve({ data: null }),
    row.lead_id ? admin.from("leads").select("id, name, email, phone, message, status, flagged, flag_note").eq("id", row.lead_id).maybeSingle() : Promise.resolve({ data: null }),
  ])

  return (
    <div className="hq-page hq-page-narrow">
      <Link href="/admin/emails" className="hq-back-link"><span className="hq-back-chevron" />Emails</Link>
      <header className="hq-header">
        <div>
          <p className="hq-eyebrow">{row.email_scope === "found" ? "Found" : company?.name ?? "No company"}</p>
          <h1 className="hq-title" style={{ fontSize: 22 }}>{row.subject}</h1>
          <p className="hq-subtitle">
            To {row.recipient_email} ({RECIPIENT_LABELS[row.recipient_type] ?? row.recipient_type}) · {row.email_type}
            {!row.success && <span className="hq-badge hq-badge-warning" style={{ marginLeft: 8 }}>Failed</span>}
            {row.delivery_status && (
              <span className={`hq-badge ${row.delivery_status === "bounced" || row.delivery_status === "complained" || row.delivery_status === "delayed" ? "hq-badge-warning" : "hq-badge-quiet"}`} style={{ marginLeft: 8 }}>
                {DELIVERY_LABELS[row.delivery_status] ?? row.delivery_status}
              </span>
            )}
          </p>
          <p className="hq-subtitle">{new Date(row.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</p>
        </div>
      </header>

      {row.error && (
        <section className="hq-section">
          <div className="hq-panel" style={{ padding: 16 }}>
            <p className="hq-row-title">Send failed</p>
            <p className="hq-row-meta">{row.error}</p>
          </div>
        </section>
      )}

      {lead && (
        <section className="hq-section">
          <div className="hq-section-head"><h2 className="hq-section-title">Lead</h2></div>
          <div className="hq-panel" style={{ padding: 16 }}>
            <p className="hq-row-title">{lead.name}</p>
            <p className="hq-row-meta">{lead.email ?? "No email"}{lead.phone ? ` · ${lead.phone}` : ""} · {lead.status}</p>
            {lead.message && <p className="hq-row-meta" style={{ marginTop: 8 }}>&ldquo;{lead.message}&rdquo;</p>}
            {lead.flagged && lead.flag_note && (
              <p className="hq-row-meta" style={{ marginTop: 8, color: "var(--hq-danger, #F43F5E)" }}>Flagged: {lead.flag_note}</p>
            )}
            <form action={setLeadFlag} className="hq-inline-form" style={{ marginTop: 12 }}>
              <input type="hidden" name="leadId" value={lead.id} />
              <input type="hidden" name="emailId" value={row.id} />
              {lead.flagged ? (
                <>
                  <input type="hidden" name="flagged" value="0" />
                  <button className="hq-button hq-button-secondary" type="submit">Clear flag</button>
                </>
              ) : (
                <>
                  <input type="hidden" name="flagged" value="1" />
                  <label className="hq-form-grow">Flag for review (spam? worth a second look?)
                    <input name="note" placeholder="e.g. looks like a VA-outsourcing spam domain, filter missed it" />
                  </label>
                  <button className="hq-button hq-button-primary" type="submit">Flag this lead</button>
                </>
              )}
            </form>
          </div>
        </section>
      )}

      <section className="hq-section">
        <div className="hq-section-head"><h2 className="hq-section-title">Email</h2></div>
        <div style={{ borderRadius: 4, overflow: "hidden", border: "1px solid var(--hq-border)", backgroundColor: "#f5f5f5" }}>
          {row.html ? (
            <iframe
              srcDoc={row.html}
              style={{ width: "100%", height: 700, border: "none", display: "block" }}
              sandbox="allow-same-origin"
              title={row.subject}
            />
          ) : (
            <div style={{ padding: 24 }}>
              <p style={{ color: "#555555", fontSize: 13, margin: 0 }}>No stored copy of this email&apos;s content (sent before this page tracked it).</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
