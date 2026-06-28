import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import type { MenuCategory } from "@/types/company"

type CheckoutItemInput = { catIndex: number; itemIndex: number; quantity: number }

function parsePriceCents(price: string | null | undefined) {
  if (!price) return null
  const match = price.replace(/,/g, "").match(/(\d+(?:\.\d{1,2})?)/)
  if (!match) return null
  const cents = Math.round(Number(match[1]) * 100)
  return Number.isFinite(cents) && cents > 0 ? cents : null
}

function cleanText(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : ""
}

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Payments are not configured yet." }, { status: 500 })
  }

  const body = await req.json().catch(() => null)
  const companyId = cleanText(body?.companyId, 80)
  const slug = cleanText(body?.slug, 120)
  const customer = body?.customer ?? {}
  const name = cleanText(customer.name, 120)
  const phone = cleanText(customer.phone, 40)
  const email = cleanText(customer.email, 160)
  const fulfillment = cleanText(customer.fulfillment, 20) === "shipping" ? "shipping" : "pickup"
  const address = cleanText(customer.address, 700)
  const notes = cleanText(customer.notes, 600)
  const requestedItems = Array.isArray(body?.items) ? body.items as CheckoutItemInput[] : []

  if (!companyId || !slug || !name || !phone || !email || requestedItems.length === 0) {
    return NextResponse.json({ error: "Please add products and enter your name, phone, and email." }, { status: 400 })
  }
  if (fulfillment === "shipping" && address.length < 6) {
    return NextResponse.json({ error: "Please enter a shipping address." }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: company } = await admin
    .from("companies")
    .select("id, name, email, phone, stripe_connect_account_id, website_config(menu_items), addon_subscriptions!inner(id)")
    .eq("id", companyId)
    .eq("addon_subscriptions.addon_slug", "shopping_cart")
    .eq("addon_subscriptions.active", true)
    .single()

  if (!company) {
    return NextResponse.json({ error: "Shopping cart is not active for this business." }, { status: 404 })
  }

  const connectAccountId = company.stripe_connect_account_id as string | null
  if (!connectAccountId) {
    return NextResponse.json({ error: "This business still needs its payout account connected before paid orders can be accepted." }, { status: 409 })
  }

  const productItems = ((company.website_config as { menu_items?: MenuCategory[] } | null)?.menu_items ?? [])
  const orderSummary: { name: string; quantity: number; unit_amount: number; price: string }[] = []

  for (const input of requestedItems.slice(0, 30)) {
    const quantity = Math.max(1, Math.min(Number(input.quantity) || 0, 20))
    const product = productItems[input.catIndex]?.items?.[input.itemIndex]
    const unitAmount = parsePriceCents(product?.price)
    if (!product || !unitAmount || quantity <= 0) continue
    orderSummary.push({
      name: product.name,
      quantity,
      unit_amount: unitAmount,
      price: product.price || `$${(unitAmount / 100).toFixed(2)}`,
    })
  }

  if (orderSummary.length === 0) {
    return NextResponse.json({ error: "No priced products were selected." }, { status: 400 })
  }

  const subtotal = orderSummary.reduce((sum, item) => sum + item.unit_amount * item.quantity, 0)
  const leadId = crypto.randomUUID()
  const replyToken = crypto.randomUUID()
  const summaryText = orderSummary.map((item) => `${item.quantity}x ${item.name}`).join(", ")
  const fulfillmentLine = fulfillment === "shipping" ? `Ship to: ${address}` : "Pickup order"

  const partialAnswers = {
    payment_status: "pending",
    fulfillment,
    shipping_address: fulfillment === "shipping" ? address : null,
    notes: notes || null,
    subtotal_cents: subtotal,
    items: orderSummary,
  }

  const { error: leadError } = await admin.from("leads").insert({
    id: leadId,
    company_id: company.id,
    name,
    phone,
    email,
    message: `${summaryText}\n${fulfillmentLine}${notes ? `\nNotes: ${notes}` : ""}`,
    type: "shopping_order",
    source: "shopping_cart",
    temperature: "hot",
    status: "open",
    reply_token: replyToken,
    partial_answers: partialAnswers,
  })

  if (leadError) {
    console.error("[shopping-cart] lead insert error:", leadError.message)
    return NextResponse.json({ error: "Unable to create the order. Please try again." }, { status: 500 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const paymentIntent = await stripe.paymentIntents.create({
    amount: subtotal,
    currency: "usd",
    receipt_email: email,
    description: `${company.name || "Found"} shop order`,
    payment_method_types: ["card"],
    application_fee_amount: Math.round(subtotal * 0.03),
    metadata: { kind: "shopping_cart_order", company_id: company.id, lead_id: leadId },
  }, { stripeAccount: connectAccountId })

  await admin.from("leads").update({
    partial_answers: { ...partialAnswers, stripe_payment_intent_id: paymentIntent.id },
  }).eq("id", leadId)

  if (!paymentIntent.client_secret) {
    return NextResponse.json({ error: "Unable to prepare the payment form. Please try again." }, { status: 500 })
  }

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    leadId,
    stripeAccountId: connectAccountId,
  })
}
