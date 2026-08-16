import { Resend } from "resend"
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js"

export type EmailRecipientType = "client_owner" | "lead" | "admin" | "team_member" | "prospect"
export type EmailScope = "client" | "found"

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

/**
 * Every outbound email Found sends should go through this - it's the one
 * place that both sends (via Resend) and logs to email_log, so /admin/emails
 * can show a real history instead of nothing. Never throws: a failed send is
 * logged and returned as false rather than blowing up the caller's flow (a
 * failed notification email should never break the underlying action, like
 * a lead being saved or a booking being confirmed). The html/text are stored
 * so Shawn can click into a row and see exactly what was sent, and leadId
 * (where known) links the email back to the lead it came from, so a
 * suspicious email can be flagged at the lead level in one click.
 *
 * emailScope marks whose voice the email speaks in: "client" (default) for
 * anything happening inside a tenant's own business - their leads, bookings,
 * orders, receipts, account access. "found" is reserved for Found Co.'s own
 * internal/operational correspondence (e.g. the new-signup alert to Shawn),
 * not a tenant's business talking to its customers.
 *
 * resend_email_id captures Resend's own message id so the Resend delivery
 * webhook (src/app/api/resend/webhook/route.ts) can match a bounce/delivered
 * event back to this exact row.
 */
export async function sendTrackedEmail({
  to,
  bcc,
  subject,
  html,
  text,
  from = "Found <hello@foundco.app>",
  companyId = null,
  leadId = null,
  recipientType,
  emailType,
  source,
  emailScope = "client",
  admin,
}: {
  to: string
  bcc?: string | string[]
  subject: string
  html: string
  text: string
  from?: string
  companyId?: string | null
  leadId?: string | null
  recipientType: EmailRecipientType
  emailType: string
  source: string
  emailScope?: EmailScope
  admin?: SupabaseClient
}): Promise<boolean> {
  const client = admin ?? getAdminClient()

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { data } = await resend.emails.send({ from, to, bcc, subject, html, text })
    await client.from("email_log").insert({
      company_id: companyId,
      lead_id: leadId,
      recipient_email: to,
      recipient_type: recipientType,
      email_type: emailType,
      subject,
      html,
      text_body: text,
      success: true,
      source,
      email_scope: emailScope,
      resend_email_id: data?.id ?? null,
    })
    return true
  } catch (err) {
    console.error(`[emailLog] send failed (${emailType} from ${source}):`, err)
    try {
      await client.from("email_log").insert({
        company_id: companyId,
        lead_id: leadId,
        recipient_email: to,
        recipient_type: recipientType,
        email_type: emailType,
        subject,
        html,
        text_body: text,
        success: false,
        error: err instanceof Error ? err.message : String(err),
        source,
        email_scope: emailScope,
      })
    } catch (logErr) {
      console.error("[emailLog] failed to write failure row:", logErr)
    }
    return false
  }
}
