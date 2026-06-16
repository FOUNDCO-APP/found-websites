import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function planFromPriceId(priceId: string): string | null {
  const map: Record<string, string> = {
    [process.env.STRIPE_PRICE_ID_FOUND || ""]:                "found",
    [process.env.STRIPE_PRICE_ID_FOUND_FOUNDING || ""]:       "found",
    [process.env.STRIPE_PRICE_ID_FOUND_PRO || ""]:            "found_pro",
    [process.env.STRIPE_PRICE_ID_FOUND_PRO_FOUNDING || ""]:   "found_pro",
    [process.env.STRIPE_PRICE_ID_FOUND_BUSINESS || ""]:       "found_business",
    [process.env.STRIPE_PRICE_ID_FOUND_BUSINESS_FOUNDING || ""]: "found_business",
  }
  return map[priceId] ?? null
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature")
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!sig || !webhookSecret || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Not configured" }, { status: 400 })
  }

  const body = await req.text()
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error("[Stripe webhook] signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const supabase = getAdminClient()

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    const companyId = session.metadata?.company_id
    if (!companyId) return NextResponse.json({ received: true })

    await supabase
      .from("companies")
      .update({
        stripe_customer_id: session.customer as string,
        subscription_status: "trialing",
        plan: "found",
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq("id", companyId)

    console.log("[Stripe] checkout.session.completed — company:", companyId)
  }

  if (event.type === "customer.subscription.updated") {
    const sub = event.data.object as Stripe.Subscription
    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id
    const priceId = sub.items.data[0]?.price?.id
    const plan = priceId ? planFromPriceId(priceId) : null

    const update: Record<string, string> = { subscription_status: sub.status }
    if (plan) update.plan = plan

    await supabase
      .from("companies")
      .update(update)
      .eq("stripe_customer_id", customerId)
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription
    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id

    await supabase
      .from("companies")
      .update({ subscription_status: sub.status })
      .eq("stripe_customer_id", customerId)
  }

  return NextResponse.json({ received: true })
}
