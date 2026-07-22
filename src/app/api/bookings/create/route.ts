import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAvailableSlots } from "@/lib/bookings/getAvailableSlots"
import { buildBookingNotification, buildBookingConfirmation } from "@/lib/emailBuilders"
import { getBookingNoun } from "@/lib/bookings/bookingVocab"
import { checkPublicRateLimit, rateLimitResponse } from "@/lib/security/rateLimit"

function clean(v: unknown, max = 200): string {
  return typeof v === "string" ? v.trim().slice(0, max) : ""
}

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 })

  const companyId  = clean(body.companyId, 80)
  const date       = clean(body.date, 12)       // "2026-07-01"
  const startTime  = clean(body.startTime, 8)   // "09:00"
  const endTime    = clean(body.endTime, 8)      // "10:00"
  const name       = clean(body.name, 120)
  const phone      = clean(body.phone, 40)
  const email      = clean(body.email, 160)
  const service    = clean(body.service, 120)
  const notes      = clean(body.notes, 600)

  if (!companyId || !date || !startTime || !endTime || !name || !phone || !email) {
    return NextResponse.json({ error: "Name, phone, email, date, and time are required." }, { status: 400 })
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(startTime)) {
    return NextResponse.json({ error: "Invalid date or time format." }, { status: 400 })
  }

  const limit = checkPublicRateLimit(req, { key: `booking:${companyId}`, limit: 6, windowMs: 10 * 60 * 1000 })
  if (!limit.allowed) return rateLimitResponse(limit)

  // Re-verify slot is still available (race condition guard)
  const available = await getAvailableSlots(companyId, date)
  const slotExists = available.some(s => s.start === startTime && s.end === endTime)
  if (!slotExists) {
    return NextResponse.json({ error: "That time slot is no longer available. Please pick another." }, { status: 409 })
  }

  const admin = createAdminClient()

  // Fetch company for emails
  const { data: company } = await admin
    .from("companies")
    .select("name, email, phone, plan, industry_category")
    .eq("id", companyId)
    .single()

  if (!company) return NextResponse.json({ error: "Company not found." }, { status: 404 })

  // Duration in minutes
  const [sh, sm] = startTime.split(":").map(Number)
  const [eh, em] = endTime.split(":").map(Number)
  const durationMinutes = (eh * 60 + em) - (sh * 60 + sm)

  // Human-readable date + time
  const displayDate = new Date(date + "T12:00:00Z").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
  })
  const h = sh; const ampm = h < 12 ? "AM" : "PM"
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  const displayTime = `${h12}:${sm.toString().padStart(2, "0")} ${ampm}`

  // 1. Insert booking (source of truth for availability)
  const { data: booking, error: bookingErr } = await admin
    .from("bookings")
    .insert({
      company_id: companyId,
      customer_name: name,
      customer_email: email || null,
      customer_phone: phone,
      service_name: service || null,
      notes: notes || null,
      booking_date: date,
      start_time: startTime,
      end_time: endTime,
      duration_minutes: durationMinutes,
      status: "confirmed",
    })
    .select("id, confirmation_code")
    .single()

  if (bookingErr || !booking) {
    console.error("[bookings] insert error:", bookingErr?.message)
    return NextResponse.json({ error: "Could not save your booking. Please try again." }, { status: 500 })
  }

  const confirmationCode = booking.confirmation_code ?? ""

  // 2. Create a lead row so booking appears in Reservations view
  const replyToken = crypto.randomUUID()
  const { data: lead } = await admin
    .from("leads")
    .insert({
      company_id: companyId,
      name,
      phone,
      email: email || null,
      type: "reservation_request",
      source: "booking_calendar",
      reply_token: replyToken,
      partial_answers: {
        booking_id: booking.id,
        booking_date: date,
        booking_time: displayTime,
        booking_date_display: displayDate,
        start_time: startTime,
        end_time: endTime,
        service: service || null,
        confirmation_code: confirmationCode,
      },
    })
    .select("id")
    .single()

  // Link booking → lead
  if (lead?.id) {
    await admin.from("bookings").update({ lead_id: lead.id }).eq("id", booking.id)
  }

  // 3. Auto-save contact for Pro/Business plans
  if (company.plan && ["found_pro", "found_business"].includes(company.plan) && lead?.id) {
    const query = admin.from("contacts").select("id").eq("company_id", companyId)
    const { data: existing } = await (email
      ? query.eq("email", email)
      : query.eq("phone", phone)
    ).maybeSingle()
    if (!existing) {
      await admin.from("contacts").insert({
        company_id: companyId,
        name, phone, email: email || null,
        tags: ["Booking"],
        source: "booking_calendar",
        lead_id: lead.id,
      }).then(({ error: e }) => { if (e) console.error("[contacts] booking auto-create:", e.message) })
    }
  }

  const bookingNoun = getBookingNoun(company.industry_category)
  const nounCap = bookingNoun.noun.charAt(0).toUpperCase() + bookingNoun.noun.slice(1)

  // 4. Owner notification email
  if (company.email) {
    await resend.emails.send({
      from: "Found <hello@foundco.app>",
      to: company.email,
      subject: `New ${bookingNoun.noun}: ${name} — ${displayDate} at ${displayTime}`,
      html: buildBookingNotification({
        company, name, phone, email,
        displayDate, displayTime, service, notes, confirmationCode,
        replyUrl: `https://foundco.app/reply/${replyToken}`,
        bookingNoun: bookingNoun.noun,
      }),
    }).catch(err => console.error("[Resend] booking notification:", err))
  }

  // 5. Customer confirmation email
  if (email) {
    await resend.emails.send({
      from: `${company.name} <hello@foundco.app>`,
      to: email,
      subject: `${nounCap} ${bookingNoun.pastTense} — ${displayDate} at ${displayTime}`,
      html: buildBookingConfirmation({
        company, name, displayDate, displayTime, service, confirmationCode,
        bookingNoun: bookingNoun.noun,
        confirmMode: bookingNoun.confirmMode,
      }),
    }).catch(err => console.error("[Resend] booking confirmation:", err))
  }

  return NextResponse.json({ success: true, confirmationCode })
}
