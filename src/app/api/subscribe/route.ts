import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { checkPublicRateLimit, rateLimitResponse } from "@/lib/security/rateLimit"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      company_id, name, email, phone,
      birthday_month, birthday_day,
      anniversary_month, anniversary_day,
      pet_name, pet_birthday_month, pet_birthday_day,
    } = body

    if (!company_id || !name || (!email && !phone)) {
      return NextResponse.json({ error: "Name and at least one of email or phone are required." }, { status: 400 })
    }

    const limit = checkPublicRateLimit(req, { key: `subscribe:${company_id}`, limit: 8, windowMs: 10 * 60 * 1000 })
    if (!limit.allowed) return rateLimitResponse(limit)

    const admin = createAdminClient()

    // Check suppression list
    if (email) {
      const { data: suppressed } = await admin
        .from("contact_suppressions")
        .select("id")
        .eq("company_id", company_id)
        .eq("email", email.toLowerCase().trim())
        .maybeSingle()
      if (suppressed) {
        return NextResponse.json({ error: "This email has been unsubscribed." }, { status: 409 })
      }
    }

    // Upsert contact by email (or phone if no email)
    const contactData: Record<string, unknown> = {
      company_id,
      name: name.trim(),
      phone: phone?.trim() || null,
      email: email?.toLowerCase().trim() || null,
      source: "subscribe_page",
      email_subscribed: true,
      sms_subscribed: true,
      updated_at: new Date().toISOString(),
    }
    if (birthday_month) contactData.birthday_month = Number(birthday_month)
    if (birthday_day) contactData.birthday_day = Number(birthday_day)
    if (anniversary_month) contactData.anniversary_month = Number(anniversary_month)
    if (anniversary_day) contactData.anniversary_day = Number(anniversary_day)
    if (pet_name) contactData.pet_name = pet_name.trim()
    if (pet_birthday_month) contactData.pet_birthday_month = Number(pet_birthday_month)
    if (pet_birthday_day) contactData.pet_birthday_day = Number(pet_birthday_day)

    if (email) {
      await admin
        .from("contacts")
        .upsert(contactData, { onConflict: "company_id,email", ignoreDuplicates: false })
    } else {
      await admin.from("contacts").insert(contactData)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[subscribe] error:", err)
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 })
  }
}
