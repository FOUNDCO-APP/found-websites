import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

function wrapEmail(body: string, companyName: string, unsubUrl: string): string {
  const htmlBody = body
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>")
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden">
  <tr><td style="padding:32px 36px 28px">
    <p style="margin:0 0 6px;font-size:11px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:#999">${companyName}</p>
    <div style="font-size:15px;line-height:1.75;color:#333">${htmlBody}</div>
  </td></tr>
  <tr><td style="padding:20px 36px 24px;border-top:1px solid #eeeeee">
    <p style="margin:0;font-size:11px;color:#aaa">
      You received this because you subscribed to updates from ${companyName}. &nbsp;·&nbsp;
      <a href="${unsubUrl}" style="color:#aaa">Unsubscribe</a>
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`
}

export async function POST(req: NextRequest) {
  try {
    const { companyId, templateSlug, subject, body, companySlug, rootDomain, filter } = await req.json()
    if (!companyId || !subject || !body) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 })
    }

    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) return NextResponse.json({ error: "Email service not configured." }, { status: 503 })

    const admin = createAdminClient()

    const { data: company } = await admin
      .from("companies")
      .select("name, email")
      .eq("id", companyId)
      .single()
    if (!company) return NextResponse.json({ error: "Company not found." }, { status: 404 })

    let contactQuery = admin
      .from("contacts")
      .select("id, name, email, birthday_month, created_at")
      .eq("company_id", companyId)
      .eq("email_subscribed", true)
      .not("email", "is", null)

    if (filter === "birthday_month") {
      const currentMonth = new Date().getMonth() + 1
      contactQuery = contactQuery.eq("birthday_month", currentMonth)
    } else if (filter === "new_30") {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      contactQuery = contactQuery.gte("created_at", cutoff)
    } else if (filter === "reengage") {
      const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
      contactQuery = contactQuery.lt("created_at", cutoff)
    }

    const { data: contacts } = await contactQuery

    if (!contacts?.length) return NextResponse.json({ error: "No subscribers to send to." }, { status: 400 })

    const { data: campaign } = await admin
      .from("email_campaigns")
      .insert({
        company_id: companyId,
        template_slug: templateSlug,
        subject,
        body,
        status: "sending",
        recipient_count: contacts.length,
      })
      .select("id")
      .single()

    const fromAddress = `${company.name} <hello@mail.foundco.app>`
    let sent = 0
    let failed = 0

    for (let i = 0; i < contacts.length; i += 10) {
      const batch = contacts.slice(i, i + 10)
      await Promise.allSettled(batch.map(async (contact) => {
        const firstName = (contact.name || "there").split(" ")[0]
        const personalBody = body
          .replace(/\{firstName\}/gi, firstName)
          .replace(/\{first_name\}/gi, firstName)
        const unsubUrl = `https://${companySlug}.${rootDomain}/unsubscribe?email=${encodeURIComponent(contact.email)}`
        const html = wrapEmail(personalBody, company.name, unsubUrl)

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: fromAddress, to: [contact.email], subject, html, text: personalBody }),
        })

        if (res.ok) {
          sent++
          if (campaign?.id) {
            void admin.from("email_sends").insert({
              company_id: companyId,
              campaign_id: campaign.id,
              contact_id: contact.id,
              email: contact.email,
              subject,
              status: "sent",
            })
          }
        } else {
          failed++
        }
      }))
    }

    if (campaign?.id) {
      await admin.from("email_campaigns")
        .update({ status: "sent", sent_at: new Date().toISOString(), recipient_count: sent })
        .eq("id", campaign.id)
    }

    return NextResponse.json({ success: true, sent, failed })
  } catch (err) {
    console.error("[marketing/send] error:", err)
    return NextResponse.json({ error: "Send failed." }, { status: 500 })
  }
}
