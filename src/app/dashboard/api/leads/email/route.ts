import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany } from "@/lib/dashboard/getCompany"
import { createAdminClient } from "@/lib/supabase/admin"

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"

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
      A personal message from ${companyName}. &nbsp;·&nbsp;
      <a href="${unsubUrl}" style="color:#aaa">Unsubscribe</a>
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const company = await getCompany(user.id, user.email ?? "")
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 })

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return NextResponse.json({ error: "Email not configured" }, { status: 503 })

  const { recipientEmail, recipientName, subject, body } = await req.json()
  if (!recipientEmail || !subject || !body) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const firstName = (recipientName || "there").split(" ")[0]
  const personalBody = body
    .replace(/\{firstName\}/gi, firstName)
    .replace(/\{first_name\}/gi, firstName)
    .replace(/\{companyName\}/gi, company.name ?? "")

  const unsubUrl = `https://${company.slug}.${ROOT_DOMAIN}/unsubscribe?email=${encodeURIComponent(recipientEmail)}`
  const html = wrapEmail(personalBody, company.name ?? "", unsubUrl)

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `${company.name} <hello@foundco.app>`,
      to: [recipientEmail],
      subject,
      html,
      text: personalBody,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.error("[leads/email] Resend error:", err)
    return NextResponse.json({ error: "Failed to send email" }, { status: 502 })
  }

  // Log to a simple record (non-blocking)
  const admin = createAdminClient()
  void admin.from("email_sends").insert({
    company_id: company.id,
    email: recipientEmail,
    subject,
    status: "sent",
  })

  return NextResponse.json({ success: true })
}
