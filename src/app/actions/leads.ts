"use server"

import { createClient } from "@/lib/supabase/server"
import { Resend } from "resend"
import {
  buildLeadEmail,
  buildAutoReplyEmail,
  buildReservationEmail,
  buildReservationAutoReply,
} from "@/lib/emailBuilders"

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
    .select("name, email, phone, plan, primary_intent")
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

