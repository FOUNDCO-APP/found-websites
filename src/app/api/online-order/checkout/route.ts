import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { hasAddonAccess } from "@/lib/featureAccess"
import { getStripe, getStripeConnectStatus } from "@/lib/stripe/connect"
import type { MenuCategory } from "@/types/company"

type CheckoutItemInput = {
  catIndex: number
  itemIndex: number
  quantity: number
}

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
  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json({ error: "Payments are not configured yet." }, { status: 500 })
  }

  const body = await req.json().catch(() => null)
  const companyId = cleanText(body?.companyId, 80)
  const slug = cleanText(body?.slug, 120)
  const customer = body?.customer ?? {}
  const name = cleanText(customer.name, 120)
  const phone = cleanText(customer.phone, 40)
  const email = cleanText(customer.email, 160)
  const pickupTime = cleanText(customer.pickupTime, 120)
  const notes = cleanText(customer.notes, 600)
  const requestedItems = Array.isArray(body?.items) ? body.items as CheckoutItemInput[] : []

  if (!companyId || !slug || !name || !phone || !email || requestedItems.length === 0) {
    return NextResponse.json({ error: "Please add items and enter your name, phone, and email." }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: company } = await admin
    .from("companies")
    .select("id, name, email, phone, plan, stripe_connect_account_id, website_config(menu_items)")
    .eq("id", companyId)
    .single()

  const { data: addon } = await admin
    .from("addon_subscriptions")
    .select("id")
    .eq("company_id", companyId)
    .eq("addon_slug", "online_ordering")
    .eq("active", true)
    .maybeSingle()

  if (!company || !hasAddonAccess(company.plan, "online_ordering", addon ? ["online_ordering"] : [])) {
    return NextResponse.json({ error: "Online ordering is not active for this business." }, { status: 404 })
  }

  const connectAccountId = company.stripe_connect_account_id as string | null
  if (!connectAccountId) {
    return NextResponse.json({ error: "Online ordering is not ready yet. Please contact the business to order." }, { status: 409 })
  }

  const stripeConnect = await getStripeConnectStatus(connectAccountId)
  if (!stripeConnect.ready) {
    return NextResponse.json({ error: "Online ordering is not ready yet. Please contact the business to order." }, { status: 409 })
  }

  const menuItems = ((company.website_config as { menu_items?: MenuCategory[] } | null)?.menu_items ?? [])
  const orderSummary: { name: string; quantity: number; unit_amount: number; price: string }[] = []

  for (const input of requestedItems.slice(0, 30)) {
    const quantity = Math.max(1, Math.min(Number(input.quantity) || 0, 20))
    const menuItem = menuItems[input.catIndex]?.items?.[input.itemIndex]
    const unitAmount = parsePriceCents(menuItem?.price)
    if (!menuItem || !unitAmount || quantity <= 0) continue


    orderSummary.push({
      name: menuItem.name,
      quantity,
      unit_amount: unitAmount,
      price: menuItem.price || `$${(unitAmount / 100).toFixed(2)}`,
    })
  }

  if (orderSummary.length === 0) {
    return NextResponse.json({ error: "No priced menu items were selected." }, { status: 400 })
  }

  const subtotal = orderSummary.reduce((sum, item) => sum + item.unit_amount * item.quantity, 0)
  const leadId = crypto.randomUUID()
  const replyToken = crypto.randomUUID()
  const summaryText = orderSummary.map((item) => `${item.quantity}x ${item.name}`).join(", ")

  const partialAnswers = {
    payment_status: "pending",
    pickup_time: pickupTime || null,
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
    message: `${summaryText}${pickupTime ? `\nPickup: ${pickupTime}` : ""}${notes ? `\nNotes: ${notes}` : ""}`,
    type: "online_order",
    source: "online_ordering",
    temperature: "hot",
    status: "open",
    reply_token: replyToken,
    partial_answers: partialAnswers,
  })

  if (leadError) {
    console.error("[online-order] lead insert error:", leadError.message)
    return NextResponse.json({ error: "Unable to create the order. Please try again." }, { status: 500 })
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: subtotal,
    currency: "usd",
    receipt_email: email,
    description: `${company.name || "Found"} online order`,
    payment_method_types: ["card"],
    application_fee_amount: Math.round(subtotal * 0.03),
    metadata: {
      kind: "online_order",
      company_id: company.id,
      lead_id: leadId,
    },
  }, {
    stripeAccount: connectAccountId,
  })

  await admin
    .from("leads")
    .update({
      partial_answers: {
        ...partialAnswers,
        stripe_payment_intent_id: paymentIntent.id,
      },
    })
    .eq("id", leadId)

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
