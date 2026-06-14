import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"

function getResend() {
  return new Resend(process.env.RESEND_API_KEY!)
}

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization")
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = getAdminClient()
  const now = new Date()

  // Find leads with email that need day-3 or day-7 follow-up
  const { data: leads, error } = await supabase
    .from("leads")
    .select(`
      id, name, email, service, created_at,
      follow_up_3_sent_at, follow_up_7_sent_at,
      companies ( name, phone, plan, email )
    `)
    .not("email", "is", null)

  if (error) {
    console.error("[cron/lead-followup] query error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let sent = 0

  for (const lead of leads ?? []) {
    const companyRaw = lead.companies
    const company = (Array.isArray(companyRaw) ? companyRaw[0] : companyRaw) as
      { name: string; phone: string | null; plan: string; email: string | null } | null
    // Only run sequences for Pro and Business plans
    if (!company || !["found_pro", "found_business"].includes(company.plan)) continue
    if (!lead.email) continue

    const createdAt = new Date(lead.created_at)
    const daysSince = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    const firstName = lead.name.split(" ")[0]

    // Day 3 follow-up
    if (daysSince >= 3 && !lead.follow_up_3_sent_at) {
      await getResend().emails.send({
        from: `${company.name} <hello@foundco.app>`,
        to: lead.email,
        subject: `Still thinking about it, ${firstName}?`,
        html: buildFollowUpEmail({ company, name: lead.name, day: 3, service: lead.service }),
        text: `Hi ${firstName},\n\nJust following up to see if you're still looking for help${lead.service ? ` with ${lead.service}` : ""}. We'd love to work with you.\n\nGive us a call anytime${company.phone ? ` at ${company.phone}` : ""}.\n\n— ${company.name}`,
      }).catch(err => console.error("[Resend] Day-3 follow-up error:", err))

      await supabase.from("leads").update({ follow_up_3_sent_at: now.toISOString() }).eq("id", lead.id)
      sent++
    }

    // Day 7 follow-up
    if (daysSince >= 7 && !lead.follow_up_7_sent_at) {
      await getResend().emails.send({
        from: `${company.name} <hello@foundco.app>`,
        to: lead.email,
        subject: `We're here when you're ready, ${firstName}`,
        html: buildFollowUpEmail({ company, name: lead.name, day: 7, service: lead.service }),
        text: `Hi ${firstName},\n\nWe wanted to check in one last time. Whenever you're ready to move forward, ${company.name} is here.\n\n${company.phone ? `Call us at ${company.phone}.` : ""}\n\n— ${company.name}`,
      }).catch(err => console.error("[Resend] Day-7 follow-up error:", err))

      await supabase.from("leads").update({ follow_up_7_sent_at: now.toISOString() }).eq("id", lead.id)
      sent++
    }
  }

  return NextResponse.json({ ok: true, sent, checked: leads?.length ?? 0 })
}

function buildFollowUpEmail({
  company,
  name,
  day,
  service,
}: {
  company: { name: string; phone: string | null }
  name: string
  day: 3 | 7
  service: string | null
}) {
  const firstName = name.split(" ")[0]
  const isDay3 = day === 3

  const subject = isDay3
    ? `Still thinking about it?`
    : `We're here when you're ready`

  const body = isDay3
    ? `Just following up to see if you're still looking for help${service ? ` with <strong>${service}</strong>` : ""}. We'd love the opportunity to work with you.`
    : `We wanted to reach out one last time. No pressure — whenever you're ready to move forward, we're here for you.`

  const ctaText = isDay3 ? `Let's Talk` : `Get in Touch`

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">

        <tr>
          <td style="background:#111111;padding:32px;text-align:center;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#888888;">Following Up</p>
            <h1 style="margin:0;font-size:22px;font-weight:900;color:#ffffff;">${company.name}</h1>
          </td>
        </tr>

        <tr>
          <td style="padding:40px 32px;">
            <p style="margin:0 0 20px;font-size:17px;font-weight:800;color:#111111;">Hi ${firstName},</p>
            <p style="margin:0 0 32px;font-size:15px;color:#444444;line-height:1.7;">${body}</p>
            ${company.phone
              ? `<a href="tel:${company.phone.replace(/\D/g, "")}" style="display:inline-block;background:#111111;color:#ffffff;font-size:14px;font-weight:800;padding:16px 32px;border-radius:50px;text-decoration:none;letter-spacing:0.5px;">${ctaText}</a>`
              : ""
            }
          </td>
        </tr>

        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f0f0f0;text-align:center;">
            <p style="margin:0 0 4px;font-size:13px;font-weight:800;color:#888888;">${company.name}</p>
            ${company.phone ? `<p style="margin:0 0 4px;font-size:12px;color:#bbbbbb;">${company.phone}</p>` : ""}
            <p style="margin:8px 0 0;font-size:11px;color:#cccccc;">Powered by <a href="https://foundco.app" style="color:#cccccc;text-decoration:underline;">Found</a></p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
