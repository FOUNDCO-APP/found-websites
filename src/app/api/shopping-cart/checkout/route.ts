import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { hasAddonAccess } from "@/lib/featureAccess"
import { getStripe, getStripeConnectStatus } from "@/lib/stripe/connect"
import type { MenuCategory } from "@/types/company"

type CheckoutItemInput = { catIndex: number; itemIndex: number; quantity: number; selectedOptions?: Record<string, unknown> | null; variantId?: string | null }

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

type ShippingAddress = {
  line1: string
  line2: string
  city: string
  region: string
  postalCode: string
  country: string
}

function cleanShippingAddress(value: unknown): ShippingAddress {
  const row = value && typeof value === "object" ? value as Record<string, unknown> : {}
  return {
    line1: cleanText(row.line1, 160),
    line2: cleanText(row.line2, 120),
    city: cleanText(row.city, 90),
    region: cleanText(row.region, 40),
    postalCode: cleanText(row.postalCode, 30),
    country: cleanText(row.country, 80) || "United States",
  }
}

function formatShippingAddress(address: ShippingAddress) {
  const cityLine = [address.city, address.region, address.postalCode].filter(Boolean).join(", ").replace(/, ([^,]*)$/, " $1")
  return [address.line1, address.line2, cityLine, address.country].filter(Boolean).join("\n")
}

function isShippingAddressReady(address: ShippingAddress) {
  return Boolean(address.line1 && address.city && address.region && address.postalCode)
}


function cleanSelectedOptions(product: MenuCategory["items"][number], selectedOptions: Record<string, unknown> | null | undefined) {
  const productOptions = (product.options ?? [])
    .map((option) => ({
      label: cleanText(option.label, 80),
      choices: Array.from(new Set((option.choices ?? []).map(choice => cleanText(choice, 80)).filter(Boolean))),
    }))
    .filter((option) => option.label && option.choices.length)

  const selected: Record<string, string> = {}
  for (const option of productOptions) {
    const value = cleanText(selectedOptions?.[option.label], 80)
    if (!value || !option.choices.includes(value)) return null
    selected[option.label] = value
  }
  return Object.keys(selected).length ? selected : null
}

function variantId(options: Record<string, string>) {
  return Object.entries(options).map(([label, value]) => `${label}:${value}`).join("|")
}

function selectedVariant(product: MenuCategory["items"][number], selectedOptions: Record<string, string> | null | undefined) {
  if (!selectedOptions) return null
  const id = variantId(selectedOptions)
  return (product.variants ?? []).find((variant) => variant.id === id || variantId(variant.options) === id) ?? null
}
function optionText(selectedOptions: Record<string, string> | null | undefined) {
  return Object.entries(selectedOptions ?? {}).map(([label, value]) => `${label}: ${value}`).join(" - ")
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
  const fulfillment = cleanText(customer.fulfillment, 20) === "shipping" ? "shipping" : "pickup"
  const shippingAddress = cleanShippingAddress(customer.shippingAddress)
  const legacyAddress = cleanText(customer.address, 700)
  const address = formatShippingAddress(shippingAddress) || legacyAddress
  const notes = cleanText(customer.notes, 600)
  const requestedItems = Array.isArray(body?.items) ? body.items as CheckoutItemInput[] : []

  if (!companyId || !slug || !name || !phone || !email || requestedItems.length === 0) {
    return NextResponse.json({ error: "Please add products and enter your name, phone, and email." }, { status: 400 })
  }
  if (fulfillment === "shipping" && !isShippingAddressReady(shippingAddress) && address.length < 6) {
    return NextResponse.json({ error: "Please enter a shipping address." }, { status: 400 })
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
    .eq("addon_slug", "shopping_cart")
    .eq("active", true)
    .maybeSingle()

  if (!company || !hasAddonAccess(company.plan, "shopping_cart", addon ? ["shopping_cart"] : [])) {
    return NextResponse.json({ error: "Shopping cart is not active for this business." }, { status: 404 })
  }

  const connectAccountId = company.stripe_connect_account_id as string | null
  if (!connectAccountId) {
    return NextResponse.json({ error: "Online checkout is not ready yet. Please contact the business to order." }, { status: 409 })
  }

  const stripeConnect = await getStripeConnectStatus(connectAccountId)
  if (!stripeConnect.ready) {
    return NextResponse.json({ error: "Online checkout is not ready yet. Please contact the business to order." }, { status: 409 })
  }

  const productItems = ((company.website_config as { menu_items?: MenuCategory[] } | null)?.menu_items ?? [])
  const orderSummary: { cat_index: number; item_index: number; variant_id: string | null; name: string; quantity: number; unit_amount: number; price: string; selected_options: Record<string, string> | null }[] = []

  for (const input of requestedItems.slice(0, 30)) {
    const quantity = Math.max(1, Math.min(Number(input.quantity) || 0, 20))
    const product = productItems[input.catIndex]?.items?.[input.itemIndex]
    const unitAmount = parsePriceCents(product?.price)
    if (!product || !unitAmount || quantity <= 0) continue
    const selectedOptions = cleanSelectedOptions(product, input.selectedOptions)
    if ((product.options ?? []).length && !selectedOptions) {
      return NextResponse.json({ error: `Please choose options for ${product.name}.` }, { status: 400 })
    }
    const variant = selectedVariant(product, selectedOptions)
    if ((product.options ?? []).length && (product.variants ?? []).length && !variant) {
      return NextResponse.json({ error: `Please choose an available option for ${product.name}.` }, { status: 400 })
    }
    if (product.inventory_tracking && variant?.stock !== null && variant?.stock !== undefined && quantity > variant.stock) {
      return NextResponse.json({ error: variant.stock <= 0 ? `${product.name} is sold out.` : `Only ${variant.stock} left for ${product.name}.` }, { status: 409 })
    }
    orderSummary.push({
      cat_index: input.catIndex,
      item_index: input.itemIndex,
      variant_id: variant?.id ?? null,
      name: product.name,
      quantity,
      unit_amount: unitAmount,
      price: product.price || `$${(unitAmount / 100).toFixed(2)}`,
      selected_options: selectedOptions,
    })
  }

  if (orderSummary.length === 0) {
    return NextResponse.json({ error: "No priced products were selected." }, { status: 400 })
  }

  const subtotal = orderSummary.reduce((sum, item) => sum + item.unit_amount * item.quantity, 0)
  const leadId = crypto.randomUUID()
  const replyToken = crypto.randomUUID()
  const summaryText = orderSummary.map((item) => `${item.quantity}x ${item.name}${optionText(item.selected_options) ? ` (${optionText(item.selected_options)})` : ""}`).join(", ")
  const fulfillmentLine = fulfillment === "shipping" ? `Ship to: ${address}` : "Pickup order"

  const partialAnswers = {
    payment_status: "pending",
    fulfillment,
    shipping_address: fulfillment === "shipping" ? address : null,
    shipping_address_parts: fulfillment === "shipping" ? shippingAddress : null,
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

  const paymentIntent = await stripe.paymentIntents.create({
    amount: subtotal,
    currency: "usd",
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
