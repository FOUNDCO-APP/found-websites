import { Resend } from "resend"
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js"

export type EmailRecipientType = "client_owner" | "lead" | "admin" | "team_member" | "prospect"

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
 */
export async function sendTrackedEmail({
  to,
  subject,
  html,
  text,
  from = "Found <hello@foundco.app>",
  companyId = null,
  leadId = null,
  recipientType,
  emailType,
  source,
  admin,
}: {
  to: string
  subject: string
  html: string
  text: string
  from?: string
  companyId?: string | null
  leadId?: string | null
  recipientType: EmailRecipientType
  emailType: string
  source: string
  admin?: SupabaseClient
}): Promise<boolean> {
  const client = admin ?? getAdminClient()

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({ from, to, subject, html, text })
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
      })
    } catch (logErr) {
      console.error("[emailLog] failed to write failure row:", logErr)
    }
    return false
  }
}
