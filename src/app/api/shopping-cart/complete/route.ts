import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { Resend } from "resend"
import { createAdminClient } from "@/lib/supabase/admin"
import type { MenuCategory } from "@/types/company"

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

function decrementInventory(menuItems: MenuCategory[], items: unknown) {
  if (!Array.isArray(items)) return { changed: false, menuItems }
  const next = JSON.parse(JSON.stringify(menuItems ?? [])) as MenuCategory[]
  let changed = false
  for (const item of items) {
    const row = item as { cat_index?: unknown; item_index?: unknown; variant_id?: unknown; quantity?: unknown }
    const catIndex = Number(row.cat_index)
    const itemIndex = Number(row.item_index)
    const quantity = Math.max(1, Math.floor(Number(row.quantity || 0)))
    const variantId = typeof row.variant_id === "string" ? row.variant_id : ""
    const product = next[catIndex]?.items?.[itemIndex]
    if (!product?.inventory_tracking || !variantId || !Array.isArray(product.variants) || quantity <= 0) continue
    product.variants = product.variants.map((variant) => {
      if (variant.id !== variantId || variant.stock === null || variant.stock === undefined) return variant
      changed = true
      return { ...variant, stock: Math.max(0, Number(variant.stock) - quantity) }
    })
  }
  return { changed, menuItems: next }
}
function textLinesHtml(value: string) {
  return escapeHtml(value)
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .join("<br />")
}

function detailBlockHtml(label: string, body: string, tone: "light" | "warm" = "light") {
  const background = tone === "warm" ? "#fff8e8" : "#f9f9f9"
  const eyebrow = tone === "warm" ? "#8a6d1f" : "#888888"
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:${background};border-radius:12px;margin:0 0 20px;"><tr><td style="padding:16px 18px;"><p style="margin:0 0 6px;font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:${eyebrow};">${escapeHtml(label)}</p><p style="margin:0;font-size:15px;line-height:1.55;color:#222222;">${textLinesHtml(body)}</p></td></tr></table>`
}

function pickupDetailsText(businessName: string, pickupLocation?: { name?: string | null; address?: string | null } | null) {
  const name = cleanText(pickupLocation?.name, 120)
  const address = cleanText(pickupLocation?.address, 300)
  if (address) return [name || businessName, address].filter(Boolean).join("\n")
  return `${businessName} will contact you with pickup instructions.`
}

function fulfillmentDetails(existingAnswers: Record<string, unknown>, businessName: string, pickupLocation?: { name?: string | null; address?: string | null } | null) {
  const fulfillment = typeof existingAnswers.fulfillment === "string" ? existingAnswers.fulfillment : "pickup"
  const address = typeof existingAnswers.shipping_address === "string" ? existingAnswers.shipping_address.trim() : ""
  if (fulfillment === "shipping") {
    return {
      label: "Ship to",
      body: address || `${businessName} will contact you if shipping details are needed.`,
    }
  }
  return {
    label: "Pickup details",
    body: pickupDetailsText(businessName, pickupLocation),
  }
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
    .select("id, name, email, lead_email, phone, stripe_connect_account_id, website_config(menu_items)")
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

  if (paymentIntent.metadata?.kind !== "shopping_cart_order" || paymentIntent.metadata?.company_id !== companyId || paymentIntent.metadata?.lead_id !== leadId) {
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

  const currentMenuItems = ((company as { website_config?: { menu_items?: MenuCategory[] } | null }).website_config?.menu_items ?? [])
  const inventory = decrementInventory(currentMenuItems, existingAnswers.items)
  if (inventory.changed) {
    await admin.from("website_config").update({ menu_items: inventory.menuItems, updated_at: new Date().toISOString() }).eq("company_id", companyId)
  }

  await admin.from("leads").update({ partial_answers: nextAnswers }).eq("id", leadId).eq("company_id", companyId)

  const total = formatOrderTotal(existingAnswers.subtotal_cents)
  const businessName = company.name || "the business"
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
  const ownerEmail = company.lead_email || company.email
  const rows = orderItemsHtml(existingAnswers.items)
  const { data: pickupLocation } = await admin
    .from("company_locations")
    .select("name, address")
    .eq("company_id", companyId)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle()
  const fulfillment = fulfillmentDetails(existingAnswers, businessName, pickupLocation)
  const fulfillmentHtml = detailBlockHtml(fulfillment.label, fulfillment.body)
  const orderNotes = typeof existingAnswers.notes === "string" ? existingAnswers.notes : ""

  if (ownerEmail && resend) {
    await resend.emails.send({
      from: "Found Orders <hello@foundco.app>",
      to: ownerEmail,
      subject: `Paid shop order: ${lead.name || "Customer"} - ${total}`,
      html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f6f6f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f6;padding:32px 16px;"><tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;"><tr><td style="background:#111111;padding:28px 28px 24px;"><p style="margin:0 0 6px;font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#cccccc;">Paid shop order</p><h1 style="margin:0;font-size:24px;line-height:1.15;color:#ffffff;">${escapeHtml(businessName)}</h1></td></tr><tr><td style="padding:30px 28px;"><table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;"><tr><td><p style="margin:0 0 4px;font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#888888;">Customer</p><p style="margin:0;font-size:22px;font-weight:900;color:#111111;">${escapeHtml(lead.name || "Customer")}</p></td><td align="right"><p style="margin:0;font-size:22px;font-weight:900;color:#111111;">${total}</p><p style="margin:4px 0 0;font-size:13px;color:#555555;">paid</p></td></tr></table>${fulfillmentHtml}<table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eeeeee;border-bottom:1px solid #eeeeee;padding:10px 0;margin:0 0 20px;">${rows}</table>${orderNotes ? `<table width="100%" cellpadding="0" cellspacing="0" style="background:#fff8e8;border-radius:12px;margin:0 0 20px;"><tr><td style="padding:16px;"><p style="margin:0 0 6px;font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#8a6d1f;">Notes</p><p style="margin:0;font-size:15px;line-height:1.5;color:#222222;white-space:pre-wrap;">${escapeHtml(orderNotes)}</p></td></tr></table>` : ""}<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:12px;"><tr><td style="padding:18px;"><p style="margin:0 0 4px;font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#999999;">Contact</p><p style="margin:0;font-size:16px;font-weight:800;color:#111111;">${escapeHtml(lead.phone || "No phone")}${lead.email ? ` &middot; ${escapeHtml(lead.email)}` : ""}</p></td></tr></table></td></tr></table></td></tr></table></body></html>`,
    }).catch((err) => console.error("[Resend] Shop order notification error:", err))
  }

  if (lead.email && resend) {
    await resend.emails.send({
      from: `${businessName} <hello@foundco.app>`,
      to: lead.email,
      subject: `Your ${businessName} order receipt`,
      html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f6f6f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f6;padding:32px 16px;"><tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;"><tr><td style="background:#111111;padding:28px 28px 24px;"><p style="margin:0 0 6px;font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#cccccc;">Order receipt</p><h1 style="margin:0;font-size:24px;line-height:1.15;color:#ffffff;">${escapeHtml(businessName)}</h1></td></tr><tr><td style="padding:30px 28px;"><p style="margin:0 0 10px;font-size:18px;font-weight:900;color:#111111;">Thanks, ${escapeHtml(lead.name || "there")}.</p><p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#444444;">Your payment was received and your order was sent to ${escapeHtml(businessName)}.</p><table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eeeeee;border-bottom:1px solid #eeeeee;padding:10px 0;margin:0 0 20px;">${rows}</table><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-size:16px;font-weight:900;color:#111111;">Total paid</td><td align="right" style="font-size:16px;font-weight:900;color:#111111;">${total}</td></tr></table>${fulfillmentHtml}${orderNotes ? `<p style="margin:8px 0 0;font-size:14px;color:#444444;"><strong>Notes:</strong> ${escapeHtml(orderNotes)}</p>` : ""}</td></tr></table></td></tr></table></body></html>`,
    }).catch((err) => console.error("[Resend] Customer shop confirmation error:", err))
  }

  return NextResponse.json({ ok: true })
}
