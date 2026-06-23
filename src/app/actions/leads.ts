"use server"

import { createClient } from "@/lib/supabase/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function submitReservation(_: unknown, formData: FormData) {
  const companyId = formData.get("company_id") as string
  const name = (formData.get("name") as string)?.trim()
  const phone = (formData.get("phone") as string)?.trim()
  const email = (formData.get("email") as string)?.trim()
  const date = (formData.get("date") as string)?.trim()
  const time = (formData.get("time") as string)?.trim()
  const partySize = (formData.get("party_size") as string)?.trim()
  const notes = (formData.get("notes") as string)?.trim()

  if (!companyId || !name || !phone || !date || !time) {
    return { success: false, error: "Name, phone, date, and time are required." }
  }

  const supabase = await createClient()
  const leadId = crypto.randomUUID()
  const replyToken = crypto.randomUUID()

  const { error } = await supabase
    .from("leads")
    .insert({
      id: leadId,
      company_id: companyId,
      name,
      phone,
      email: email || null,
      message: notes || null,
      type: "reservation_request",
      reply_token: replyToken,
      partial_answers: { date, time, party_size: partySize || null },
    })

  if (error) {
    console.error("Reservation insert error:", error.message)
    return { success: false, error: "Something went wrong. Please call us directly." }
  }

  const { data: company } = await supabase
    .from("companies")
    .select("name, email, phone, plan")
    .eq("id", companyId)
    .single()

  const replyUrl = `https://foundco.app/reply/${replyToken}`
  const [hour, minute] = time.split(":")
  const h = parseInt(hour)
  const ampm = h >= 12 ? "PM" : "AM"
  const displayTime = `${h > 12 ? h - 12 : h || 12}:${minute} ${ampm}`
  const displayDate = new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })

  if (company?.email) {
    await resend.emails.send({
      from: `Found <hello@foundco.app>`,
      to: company.email,
      subject: `Reservation request: ${name} — ${displayDate} at ${displayTime}`,
      html: buildReservationEmail({ company, name, phone, email, date: displayDate, time: displayTime, partySize, notes, replyUrl }),
    }).catch((err) => console.error("[Resend] Reservation notification error:", err))
  }

  if (email && company) {
    const firstName = name.split(" ")[0]
    await resend.emails.send({
      from: `${company.name} <hello@foundco.app>`,
      to: email,
      subject: `Reservation request received, ${firstName}`,
      html: buildReservationAutoReply({ company, name, date: displayDate, time: displayTime, partySize, phone: company.phone }),
    }).catch((err) => console.error("[Resend] Reservation auto-reply error:", err))
  }

  // Pro/Business: auto-save reservation as contact
  if (leadId && company && ["found_pro", "found_business"].includes(company.plan ?? "")) {
    const query = supabase.from("contacts").select("id").eq("company_id", companyId)
    const { data: existing } = await (email ? query.eq("email", email) : query.eq("phone", phone)).maybeSingle()
    if (!existing) {
      await supabase.from("contacts").insert({
        company_id: companyId,
        name,
        phone: phone || null,
        email: email || null,
        notes: notes || null,
        tags: ["Lead"],
        source: "reservation",
        lead_id: leadId,
      }).then(({ error: e }) => { if (e) console.error("[contacts] auto-create reservation contact error:", e.message) })
    }
  }

  return { success: true }
}

function buildReservationEmail({
  company, name, phone, email, date, time, partySize, notes, replyUrl,
}: {
  company: { name: string; email: string; phone: string | null }
  name: string; phone: string; email: string; date: string; time: string
  partySize: string | null; notes: string; replyUrl: string
}) {
  const cleanPhone = phone.replace(/\D/g, "")
  const firstName = name.split(" ")[0]
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="background:#111111;padding:32px;text-align:center;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#888888;">New Reservation Request</p>
            <h1 style="margin:0;font-size:22px;font-weight:900;color:#ffffff;">${company.name}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:12px;padding:24px;margin-bottom:28px;">
              <tr><td style="padding-bottom:16px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999999;">Guest</p>
                <p style="margin:0;font-size:17px;font-weight:800;color:#111111;">${name}</p>
              </td></tr>
              <tr><td style="padding-bottom:16px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999999;">Date</p>
                <p style="margin:0;font-size:17px;font-weight:800;color:#111111;">${date}</p>
              </td></tr>
              <tr><td style="padding-bottom:16px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999999;">Time</p>
                <p style="margin:0;font-size:17px;font-weight:800;color:#111111;">${time}</p>
              </td></tr>
              ${partySize ? `<tr><td style="padding-bottom:16px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999999;">Party Size</p>
                <p style="margin:0;font-size:17px;font-weight:800;color:#111111;">${partySize} ${partySize === "1" ? "guest" : "guests"}</p>
              </td></tr>` : ""}
              <tr><td style="padding-bottom:${notes ? "16px" : "0"};">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999999;">Phone</p>
                <p style="margin:0;font-size:17px;font-weight:800;color:#111111;">${phone}</p>
              </td></tr>
              ${email ? `<tr><td style="padding-bottom:${notes ? "16px" : "0"};">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999999;">Email</p>
                <p style="margin:0;font-size:17px;font-weight:800;color:#111111;">${email}</p>
              </td></tr>` : ""}
              ${notes ? `<tr><td>
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999999;">Notes</p>
                <p style="margin:0;font-size:15px;color:#333333;line-height:1.6;">${notes}</p>
              </td></tr>` : ""}
            </table>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:6px;">
                  <a href="tel:${cleanPhone}" style="display:block;text-align:center;background:#111111;color:#ffffff;font-size:13px;font-weight:800;padding:14px 10px;border-radius:50px;text-decoration:none;">Call ${firstName}</a>
                </td>
                <td style="padding-left:6px;padding-right:6px;">
                  <a href="sms:${cleanPhone}" style="display:block;text-align:center;background:#f0f0f0;color:#111111;font-size:13px;font-weight:800;padding:14px 10px;border-radius:50px;text-decoration:none;">Text ${firstName}</a>
                </td>
                ${email ? `<td style="padding-left:6px;">
                  <a href="${replyUrl}" style="display:block;text-align:center;background:#f0f0f0;color:#111111;font-size:13px;font-weight:800;padding:14px 10px;border-radius:50px;text-decoration:none;">Email ${firstName}</a>
                </td>` : ""}
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f0f0f0;text-align:center;">
            <p style="margin:0;font-size:11px;color:#bbbbbb;">Powered by <a href="https://foundco.app" style="color:#bbbbbb;text-decoration:underline;">Found</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function buildReservationAutoReply({
  company, name, date, time, partySize, phone,
}: {
  company: { name: string; phone: string | null }
  name: string; date: string; time: string; partySize: string | null; phone: string | null
}) {
  const firstName = name.split(" ")[0]
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="background:#111111;padding:32px;text-align:center;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#888888;">Reservation Request Received</p>
            <h1 style="margin:0;font-size:22px;font-weight:900;color:#ffffff;">${company.name}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 32px;">
            <p style="margin:0 0 20px;font-size:17px;font-weight:800;color:#111111;">Hi ${firstName},</p>
            <p style="margin:0 0 16px;font-size:15px;color:#444444;line-height:1.7;">
              We received your reservation request for <strong>${date} at ${time}</strong>${partySize ? ` for ${partySize} ${partySize === "1" ? "guest" : "guests"}` : ""}.
            </p>
            <p style="margin:0 0 32px;font-size:15px;color:#444444;line-height:1.7;">
              Someone from <strong>${company.name}</strong> will confirm your reservation as soon as possible. If you need to reach us right away, please call.
            </p>
            ${phone ? `<a href="tel:${phone.replace(/\D/g, "")}" style="display:inline-block;background:#111111;color:#ffffff;font-size:14px;font-weight:800;padding:16px 32px;border-radius:50px;text-decoration:none;">Call ${company.name}</a>` : ""}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f0f0f0;text-align:center;">
            <p style="margin:0;font-size:11px;color:#cccccc;">Powered by <a href="https://foundco.app" style="color:#cccccc;text-decoration:underline;">Found</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

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
  if (!email) {
    return { success: false, error: "Email is required so we can send you a confirmation." }
  }

  // Collect industry-specific fields into partial_answers
  const extraKeys = ["job_address", "timeline", "budget", "home_type", "sq_footage", "frequency", "event_date", "guest_count", "project_type", "vehicle_info", "urgency"]
  const partialAnswers: Record<string, string> = {}
  for (const key of extraKeys) {
    const val = (formData.get(key) as string)?.trim()
    if (val) partialAnswers[key] = val
  }

  const supabase = await createClient()
  const leadId = crypto.randomUUID()
  const replyToken = crypto.randomUUID()

  const { error } = await supabase
    .from("leads")
    .insert({
      id: leadId,
      company_id: companyId,
      name,
      phone,
      email: email || null,
      service: service || null,
      message: message || null,
      reply_token: replyToken,
      partial_answers: Object.keys(partialAnswers).length > 0 ? partialAnswers : null,
    })

  if (error) {
    console.error("Lead insert error:", error.message)
    return { success: false, error: "Something went wrong. Please call us directly." }
  }

  // Look up company to get owner email, name, and plan
  const { data: company } = await supabase
    .from("companies")
    .select("name, email, phone, plan")
    .eq("id", companyId)
    .single()

  const replyUrl = `https://foundco.app/reply/${replyToken}`

  // Notify the owner
  if (company?.email) {
    await resend.emails.send({
      from: `Found <hello@foundco.app>`,
      to: company.email,
      subject: `New lead: ${name}${service ? ` — ${service}` : ""}`,
      html: buildLeadEmail({ company, name, phone, email, service, message, replyUrl }),
    }).catch((err) => console.error("[Resend] Owner notification error:", err))
  }

  // Auto-reply to the customer
  if (email && company) {
    const firstName = name.split(" ")[0]
    await resend.emails.send({
      from: `${company.name} <hello@foundco.app>`,
      to: email,
      subject: `We got your message, ${firstName}`,
      html: buildAutoReplyEmail({ company, name, phone: company.phone }),
      text: `Hi ${firstName},\n\nThank you for reaching out to ${company.name}. We received your message and someone will be in touch with you as soon as possible.\n\nIf you need to reach us right away, call us at ${company.phone || "the number on our website"}.\n\n— ${company.name}`,
    }).catch((err) => console.error("[Resend] Auto-reply error:", err))
  }

  // Pro/Business: auto-save lead as contact (skip if phone/email already exists)
  if (leadId && company && ["found_pro", "found_business"].includes(company.plan ?? "")) {
    const query = supabase.from("contacts").select("id").eq("company_id", companyId)
    const { data: existing } = await (email ? query.eq("email", email) : query.eq("phone", phone)).maybeSingle()
    if (!existing) {
      await supabase.from("contacts").insert({
        company_id: companyId,
        name,
        phone: phone || null,
        email: email || null,
        notes: message || null,
        tags: ["Lead"],
        source: "website",
        lead_id: leadId,
      }).then(({ error: e }) => { if (e) console.error("[contacts] auto-create error:", e.message) })
    }
  }

  return { success: true }
}

function buildAutoReplyEmail({
  company,
  name,
  phone,
}: {
  company: { name: string; phone: string | null }
  name: string
  phone: string | null
}) {
  const firstName = name.split(" ")[0]

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
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#888888;">Message Received</p>
            <h1 style="margin:0;font-size:22px;font-weight:900;color:#ffffff;">${company.name}</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 32px;">
            <p style="margin:0 0 20px;font-size:17px;font-weight:800;color:#111111;">Hi ${firstName},</p>
            <p style="margin:0 0 16px;font-size:15px;color:#444444;line-height:1.7;">
              Thank you for reaching out to <strong>${company.name}</strong>. We received your message and someone will be in touch with you as soon as possible.
            </p>
            <p style="margin:0 0 32px;font-size:15px;color:#444444;line-height:1.7;">
              If you need to reach us right away, don't hesitate to call.
            </p>
            ${phone ? `<a href="tel:${phone.replace(/\D/g, "")}" style="display:inline-block;background:#111111;color:#ffffff;font-size:14px;font-weight:800;padding:16px 32px;border-radius:50px;text-decoration:none;letter-spacing:0.5px;">Call ${company.name}</a>` : ""}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f0f0f0;text-align:center;">
            <p style="margin:0 0 4px;font-size:13px;font-weight:800;color:#888888;">${company.name}</p>
            ${phone ? `<p style="margin:0 0 4px;font-size:12px;color:#bbbbbb;">${phone}</p>` : ""}
            <p style="margin:8px 0 0;font-size:11px;color:#cccccc;">Powered by <a href="https://foundco.app" style="color:#cccccc;text-decoration:underline;">Found</a></p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function buildLeadEmail({
  company,
  name,
  phone,
  email,
  service,
  message,
  replyUrl,
}: {
  company: { name: string; email: string; phone: string | null }
  name: string
  phone: string
  email: string
  service: string
  message: string
  replyUrl: string
}) {
  const cleanPhone = phone.replace(/\D/g, "")
  const firstName = name.split(" ")[0]
  const receivedAt = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  })

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
                <td style="padding-right:6px;">
                  <a href="tel:${cleanPhone}" style="display:block;text-align:center;background:#111111;color:#ffffff;font-size:13px;font-weight:800;padding:14px 10px;border-radius:50px;text-decoration:none;">Call ${firstName}</a>
                </td>
                <td style="padding-right:6px;padding-left:2px;">
                  <a href="sms:${cleanPhone}" style="display:block;text-align:center;background:#f0f0f0;color:#111111;font-size:13px;font-weight:800;padding:14px 10px;border-radius:50px;text-decoration:none;">Text ${firstName}</a>
                </td>
                ${email ? `<td style="padding-left:2px;">
                  <a href="${replyUrl}" style="display:block;text-align:center;background:#f0f0f0;color:#111111;font-size:13px;font-weight:800;padding:14px 10px;border-radius:50px;text-decoration:none;">Email ${firstName}</a>
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
