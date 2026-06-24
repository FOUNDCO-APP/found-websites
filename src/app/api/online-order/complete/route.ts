import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { Resend } from "resend"
import { createAdminClient } from "@/lib/supabase/admin"

function cleanText(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : ""
}

function formatOrderTotal(cents: unknown) {
  const amount = typeof cents === "number" ? cents : Number(cents || 0)
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount / 100)
}

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Payments are not configured yet." }, { status: 500 })
  }

  const body = await req.json().catch(() => null)
  const companyId = cleanText(body?.companyId, 80)
  const leadId = cleanText(body?.leadId, 80)
  const paymentIntentId = cleanText(body?.paymentIntentId, 120)

  if (!companyId || !leadId || !paymentIntentId) {
    return NextResponse.json({ error: "Missing order payment details." }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: company } = await admin
    .from("companies")
    .select("id, name, email, lead_email, phone, stripe_connect_account_id")
    .eq("id", companyId)
    .maybeSingle()

  if (!company?.stripe_connect_account_id) {
    return NextResponse.json({ error: "Payment account is not connected." }, { status: 409 })
  }

  const { data: lead } = await admin
    .from("leads")
    .select("id, name, email, phone, message, partial_answers")
    .eq("id", leadId)
    .eq("company_id", companyId)
    .maybeSingle()

  if (!lead) {
    return NextResponse.json({ error: "Order was not found." }, { status: 404 })
  }

  const existingAnswers = (lead.partial_answers ?? {}) as Record<string, unknown>
  if (existingAnswers.payment_status === "paid") {
    return NextResponse.json({ ok: true })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {}, {
    stripeAccount: company.stripe_connect_account_id,
  })

  if (paymentIntent.metadata?.kind !== "online_order" || paymentIntent.metadata?.company_id !== companyId || paymentIntent.metadata?.lead_id !== leadId) {
    return NextResponse.json({ error: "Payment does not match this order." }, { status: 400 })
  }

  if (paymentIntent.status !== "succeeded") {
    return NextResponse.json({ error: "Payment has not completed yet." }, { status: 409 })
  }

  const nextAnswers = {
    ...existingAnswers,
    payment_status: "paid",
    stripe_payment_intent_id: paymentIntent.id,
    paid_at: new Date().toISOString(),
  }

  await admin
    .from("leads")
    .update({ partial_answers: nextAnswers })
    .eq("id", leadId)
    .eq("company_id", companyId)

  const ownerEmail = company.lead_email || company.email
  if (ownerEmail && process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const total = formatOrderTotal(existingAnswers.subtotal_cents)
    await resend.emails.send({
      from: "Found <hello@foundco.app>",
      to: ownerEmail,
      subject: `Paid online order: ${lead.name || "Customer"} - ${total}`,
      html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;"><tr><td align="center"><table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;"><tr><td style="background:#111111;padding:32px;text-align:center;"><p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#888888;">Paid Online Order</p><h1 style="margin:0;font-size:22px;font-weight:900;color:#ffffff;">${company.name || "Found"}</h1></td></tr><tr><td style="padding:36px 32px;"><p style="margin:0 0 20px;font-size:18px;font-weight:900;color:#111111;">${total} paid</p><p style="margin:0 0 14px;font-size:15px;color:#333333;line-height:1.6;white-space:pre-wrap;">${lead.message || "New online order"}</p><table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:12px;padding:20px;margin-top:20px;"><tr><td><p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999999;">Customer</p><p style="margin:0;font-size:16px;font-weight:800;color:#111111;">${lead.name || "Customer"}</p></td></tr><tr><td style="padding-top:14px;"><p style="margin:0;font-size:14px;color:#333333;">${lead.phone || ""}${lead.email ? ` &middot; ${lead.email}` : ""}</p></td></tr></table></td></tr></table></td></tr></table></body></html>`,
    }).catch((err) => console.error("[Resend] Online order notification error:", err))
  }

  return NextResponse.json({ ok: true })
}