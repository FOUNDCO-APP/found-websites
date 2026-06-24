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

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function orderItemsHtml(items: unknown) {
  if (!Array.isArray(items)) return ""
  return items.map((item) => {
    const row = item as { name?: unknown; quantity?: unknown; unit_amount?: unknown }
    const quantity = Number(row.quantity || 0)
    const amount = Number(row.unit_amount || 0) * quantity
    if (!row.name || quantity <= 0) return ""
    return `<tr><td style="padding:8px 0;color:#333333;font-size:14px;">${quantity}x ${escapeHtml(row.name)}</td><td align="right" style="padding:8px 0;color:#111111;font-size:14px;font-weight:700;">${formatOrderTotal(amount)}</td></tr>`
  }).join("")
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

  const total = formatOrderTotal(existingAnswers.subtotal_cents)
  const businessName = company.name || "the business"
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
  const ownerEmail = company.lead_email || company.email

  if (ownerEmail && resend) {
    await resend.emails.send({
      from: "Found <hello@foundco.app>",
      to: ownerEmail,
      subject: `Paid online order: ${lead.name || "Customer"} - ${total}`,
      html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;"><tr><td align="center"><table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;"><tr><td style="background:#111111;padding:32px;text-align:center;"><p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#888888;">Paid Online Order</p><h1 style="margin:0;font-size:22px;font-weight:900;color:#ffffff;">${escapeHtml(businessName)}</h1></td></tr><tr><td style="padding:36px 32px;"><p style="margin:0 0 20px;font-size:18px;font-weight:900;color:#111111;">${total} paid</p><p style="margin:0 0 14px;font-size:15px;color:#333333;line-height:1.6;white-space:pre-wrap;">${escapeHtml(lead.message || "New online order")}</p><table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:12px;padding:20px;margin-top:20px;"><tr><td><p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999999;">Customer</p><p style="margin:0;font-size:16px;font-weight:800;color:#111111;">${escapeHtml(lead.name || "Customer")}</p></td></tr><tr><td style="padding-top:14px;"><p style="margin:0;font-size:14px;color:#333333;">${escapeHtml(lead.phone || "")}${lead.email ? ` &middot; ${escapeHtml(lead.email)}` : ""}</p></td></tr></table></td></tr></table></td></tr></table></body></html>`,
    }).catch((err) => console.error("[Resend] Online order notification error:", err))
  }

  if (lead.email && resend) {
    const rows = orderItemsHtml(existingAnswers.items)
    await resend.emails.send({
      from: `${businessName} <hello@foundco.app>`,
      to: lead.email,
      subject: `Your order from ${businessName}`,
      html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f6f6f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f6;padding:32px 16px;"><tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;"><tr><td style="background:#111111;padding:28px 28px 24px;"><p style="margin:0 0 6px;font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#cccccc;">Order confirmed</p><h1 style="margin:0;font-size:24px;line-height:1.15;color:#ffffff;">${escapeHtml(businessName)}</h1></td></tr><tr><td style="padding:30px 28px;"><p style="margin:0 0 10px;font-size:18px;font-weight:900;color:#111111;">Thanks, ${escapeHtml(lead.name || "there")}.</p><p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#444444;">Your payment was received and your order was sent to ${escapeHtml(businessName)}.</p><table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eeeeee;border-bottom:1px solid #eeeeee;padding:10px 0;margin:0 0 20px;">${rows}</table><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-size:16px;font-weight:900;color:#111111;">Total paid</td><td align="right" style="font-size:16px;font-weight:900;color:#111111;">${total}</td></tr></table>${existingAnswers.pickup_time ? `<p style="margin:20px 0 0;font-size:14px;color:#444444;"><strong>Pickup:</strong> ${escapeHtml(existingAnswers.pickup_time)}</p>` : ""}${existingAnswers.notes ? `<p style="margin:8px 0 0;font-size:14px;color:#444444;"><strong>Notes:</strong> ${escapeHtml(existingAnswers.notes)}</p>` : ""}</td></tr></table></td></tr></table></body></html>`,
    }).catch((err) => console.error("[Resend] Customer order confirmation error:", err))
  }
  return NextResponse.json({ ok: true })
}