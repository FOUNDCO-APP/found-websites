"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendReply(_: unknown, formData: FormData) {
  const token = formData.get("token") as string
  const subject = (formData.get("subject") as string)?.trim()
  const message = (formData.get("message") as string)?.trim()

  if (!token || !subject || !message) {
    return { success: false, error: "All fields are required." }
  }

  const supabase = createAdminClient()

  const { data: lead } = await supabase
    .from("leads")
    .select("*, companies(name, phone, email, logo_url, primary_color, slug)")
    .eq("reply_token", token)
    .single()

  if (!lead) return { success: false, error: "This reply link is invalid or has expired." }
  if (!lead.email) return { success: false, error: "This customer did not provide an email address." }
  if (lead.replied_at) return { success: false, error: "You have already replied to this request." }

  const company = lead.companies as {
    name: string
    phone: string | null
    logo_url: string | null
    primary_color: string
    slug: string
  }

  const { error } = await resend.emails.send({
    from: `${company.name} via Found <hello@foundco.app>`,
    to: lead.email,
    subject,
    html: buildCustomerReplyHtml({ company, message }),
    text: buildCustomerReplyText({ company, message }),
  })

  if (error) {
    console.error("Resend reply error:", error)
    return { success: false, error: "Failed to send. Please try again." }
  }

  await supabase
    .from("leads")
    .update({ replied_at: new Date().toISOString() })
    .eq("reply_token", token)

  return { success: true }
}

function buildCustomerReplyText({
  company,
  message,
}: {
  company: { name: string; phone: string | null; slug: string }
  message: string
}) {
  const websiteUrl = `https://${company.slug}.foundco.app`
  const sig = [
    company.name,
    company.phone,
    websiteUrl,
  ].filter(Boolean).join("\n")

  return `${message}\n\n--\n${sig}`
}

function buildCustomerReplyHtml({
  company,
  message,
}: {
  company: { name: string; phone: string | null; logo_url: string | null; primary_color: string; slug: string }
  message: string
}) {
  const websiteUrl = `https://${company.slug}.foundco.app`
  const primary = company.primary_color || "#111111"
  const initial = company.name.charAt(0).toUpperCase()

  const paragraphs = message
    .split("\n")
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 18px;font-size:15px;color:#222222;line-height:1.7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">${p}</p>`)
    .join("")

  const logoBlock = company.logo_url
    ? `<img src="${company.logo_url}" alt="${company.name}" style="height:36px;width:auto;display:block;margin-bottom:10px;" />`
    : `<table cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
        <tr>
          <td style="width:32px;height:32px;border-radius:50%;background:${primary};text-align:center;vertical-align:middle;">
            <span style="font-size:15px;font-weight:900;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">${initial}</span>
          </td>
        </tr>
      </table>`

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:40px 32px;max-width:560px;margin:0 auto;display:block;">

      <!-- Message -->
      ${paragraphs}

      <!-- Signature -->
      <table cellpadding="0" cellspacing="0" style="margin-top:32px;padding-top:20px;border-top:1px solid #e5e5e5;width:100%;">
        <tr>
          <td>
            ${logoBlock}
            <p style="margin:0;font-size:14px;font-weight:700;color:#111111;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">${company.name}</p>
            ${company.phone ? `<p style="margin:4px 0 0;font-size:13px;color:#555555;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">${company.phone}</p>` : ""}
            <p style="margin:4px 0 0;font-size:13px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
              <a href="${websiteUrl}" style="color:#555555;text-decoration:none;">${websiteUrl}</a>
            </p>
          </td>
        </tr>
      </table>

    </td></tr>
  </table>
</body>
</html>`
}
