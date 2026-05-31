"use server"

import { createClient } from "@/lib/supabase/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function submitLead(_: unknown, formData: FormData) {
  const companyId = formData.get("company_id") as string
  const name = (formData.get("name") as string)?.trim()
  const phone = (formData.get("phone") as string)?.trim()
  const email = (formData.get("email") as string)?.trim()
  const service = (formData.get("service") as string)?.trim()
  const message = (formData.get("message") as string)?.trim()

  if (!companyId || !name || !phone) {
    return { success: false, error: "Name and phone number are required." }
  }

  const supabase = await createClient()

  const { error } = await supabase.from("leads").insert({
    company_id: companyId,
    name,
    phone,
    email: email || null,
    service: service || null,
    message: message || null,
  })

  if (error) {
    console.error("Lead insert error:", error.message)
    return { success: false, error: "Something went wrong. Please call us directly." }
  }

  // Look up company to get owner email and name
  const { data: company } = await supabase
    .from("companies")
    .select("name, email, phone")
    .eq("id", companyId)
    .single()

  if (company?.email) {
    await resend.emails.send({
      from: `Found <hello@foundco.app>`,
      to: company.email,
      subject: `New lead: ${name}${service ? ` — ${service}` : ""}`,
      html: buildLeadEmail({ company, name, phone, email, service, message }),
    }).catch((err) => console.error("Resend error:", err))
  }

  return { success: true }
}

function buildLeadEmail({
  company,
  name,
  phone,
  email,
  service,
  message,
}: {
  company: { name: string; email: string; phone: string | null }
  name: string
  phone: string
  email: string
  service: string
  message: string
}) {
  const cleanPhone = phone.replace(/\D/g, "")
  const firstName = name.split(" ")[0]
  const receivedAt = new Date().toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  })
  const mailtoSubject = encodeURIComponent(`Re: Your estimate request — ${company.name}`)
  const mailtoBody = encodeURIComponent(
    `Hi ${firstName},\n\nThank you for reaching out to ${company.name}! I'd love to help${service ? ` with your ${service.toLowerCase()} project` : ""} and will be in touch soon.\n\n${company.name}${company.phone ? `\n${company.phone}` : ""}`
  )

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
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#888888;">New Lead</p>
            <h1 style="margin:0;font-size:22px;font-weight:900;color:#ffffff;">${company.name}</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 32px;">
            <p style="margin:0 0 24px;font-size:16px;color:#444444;">Someone submitted an estimate request on your website.</p>

            <!-- Lead details -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:12px;padding:24px;margin-bottom:28px;">
              <tr><td style="padding-bottom:16px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999999;">Received</p>
                <p style="margin:0;font-size:14px;font-weight:600;color:#555555;">${receivedAt}</p>
              </td></tr>
              <tr><td style="padding-bottom:16px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999999;">Name</p>
                <p style="margin:0;font-size:17px;font-weight:800;color:#111111;">${name}</p>
              </td></tr>
              <tr><td style="padding-bottom:16px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999999;">Phone</p>
                <p style="margin:0;font-size:17px;font-weight:800;color:#111111;">${phone}</p>
              </td></tr>
              ${email ? `<tr><td style="padding-bottom:16px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999999;">Email</p>
                <p style="margin:0;font-size:17px;font-weight:800;color:#111111;">${email}</p>
              </td></tr>` : ""}
              ${service ? `<tr><td style="padding-bottom:16px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999999;">Service Requested</p>
                <p style="margin:0;font-size:17px;font-weight:800;color:#111111;">${service}</p>
              </td></tr>` : ""}
              ${message ? `<tr><td>
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999999;">Message</p>
                <p style="margin:0;font-size:15px;color:#333333;line-height:1.6;">${message}</p>
              </td></tr>` : ""}
            </table>

            <!-- Response nudge -->
            <p style="margin:0 0 20px;font-size:13px;color:#888888;font-style:italic;">Responding within the hour increases your chance of winning this job by 3x.</p>

            <!-- CTA buttons -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:8px;">
                  <a href="tel:${cleanPhone}" style="display:block;text-align:center;background:#111111;color:#ffffff;font-size:14px;font-weight:800;padding:16px;border-radius:50px;text-decoration:none;">Call ${name.split(" ")[0]}</a>
                </td>
                ${email ? `<td style="padding-left:8px;">
                  <a href="mailto:${email}?subject=${mailtoSubject}&body=${mailtoBody}" style="display:block;text-align:center;background:#f0f0f0;color:#111111;font-size:14px;font-weight:800;padding:16px;border-radius:50px;text-decoration:none;">Email ${firstName}</a>
                </td>` : ""}
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
