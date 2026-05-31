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
    .select("*, companies(name, phone, email, logo_url, primary_color, slug, website_config(*))")
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
    from: `${company.name} <hello@foundco.app>`,
    to: lead.email,
    subject,
    html: buildCustomerReplyEmail({ company, message, customerFirstName: lead.name.split(" ")[0] }),
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

function buildCustomerReplyEmail({
  company,
  message,
  customerFirstName,
}: {
  company: { name: string; phone: string | null; logo_url: string | null; primary_color: string; slug: string }
  message: string
  customerFirstName: string
}) {
  const websiteUrl = `https://${company.slug}.foundco.app`
  const primary = company.primary_color || "#111111"
  const paragraphs = message
    .split("\n")
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 16px;font-size:15px;color:#333333;line-height:1.7;">${p}</p>`)
    .join("")

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:#111111;padding:32px;text-align:center;">
            ${company.logo_url
              ? `<img src="${company.logo_url}" alt="${company.name}" style="height:48px;width:auto;display:block;margin:0 auto;" />`
              : `<div style="width:52px;height:52px;border-radius:50%;background:${primary};display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
                   <span style="font-size:22px;font-weight:900;color:#ffffff;">${company.name.charAt(0)}</span>
                 </div>
                 <p style="margin:0;font-size:20px;font-weight:900;color:#ffffff;">${company.name}</p>`
            }
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 32px;">
            <p style="margin:0 0 28px;font-size:15px;color:#888888;">Hi ${customerFirstName},</p>
            ${paragraphs}
          </td>
        </tr>

        <!-- Signature -->
        <tr>
          <td style="padding:0 32px 32px;">
            <table cellpadding="0" cellspacing="0" style="border-top:2px solid ${primary};padding-top:20px;width:100%;">
              <tr>
                <td>
                  <p style="margin:0 0 4px;font-size:15px;font-weight:800;color:#111111;">${company.name}</p>
                  ${company.phone ? `<p style="margin:0 0 4px;font-size:13px;color:#666666;">${company.phone}</p>` : ""}
                  <a href="${websiteUrl}" style="font-size:13px;color:${primary};text-decoration:none;">${websiteUrl}</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f0f0f0;text-align:center;">
            <p style="margin:0 0 4px;font-size:13px;font-weight:800;color:#888888;">You've been Found.</p>
            <p style="margin:0;font-size:11px;color:#bbbbbb;">Powered by <a href="https://foundco.app" style="color:#bbbbbb;text-decoration:underline;">Found</a></p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
