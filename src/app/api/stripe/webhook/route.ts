import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const PLAN_PRICE_IDS = new Set([
  process.env.STRIPE_PRICE_ID_FOUND,
  process.env.STRIPE_PRICE_ID_FOUND_FOUNDING,
  process.env.STRIPE_PRICE_ID_FOUND_PRO,
  process.env.STRIPE_PRICE_ID_FOUND_PRO_FOUNDING,
  process.env.STRIPE_PRICE_ID_FOUND_BUSINESS,
  process.env.STRIPE_PRICE_ID_FOUND_BUSINESS_FOUNDING,
].filter(Boolean) as string[])

function planFromPriceId(priceId: string): string | null {
  const map: Record<string, string> = {
    [process.env.STRIPE_PRICE_ID_FOUND || ""]: "found",
    [process.env.STRIPE_PRICE_ID_FOUND_FOUNDING || ""]: "found",
    [process.env.STRIPE_PRICE_ID_FOUND_PRO || ""]: "found_pro",
    [process.env.STRIPE_PRICE_ID_FOUND_PRO_FOUNDING || ""]: "found_pro",
    [process.env.STRIPE_PRICE_ID_FOUND_BUSINESS || ""]: "found_business",
    [process.env.STRIPE_PRICE_ID_FOUND_BUSINESS_FOUNDING || ""]: "found_business",
  }
  return map[priceId] ?? null
}

function addonSlugForItem(item: Stripe.SubscriptionItem): string | null {
  return item.price.metadata?.addon_slug || item.plan?.metadata?.addon_slug || null
}

async function companyIdForSubscription(
  supabase: ReturnType<typeof getAdminClient>,
  sub: Stripe.Subscription,
  customerId: string,
): Promise<string | null> {
  if (sub.metadata?.company_id) return sub.metadata.company_id

  const { data } = await supabase
    .from("companies")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle()

  return data?.id ?? null
}

async function syncSubscriptionToSupabase(
  supabase: ReturnType<typeof getAdminClient>,
  sub: Stripe.Subscription,
) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id
  const companyId = await companyIdForSubscription(supabase, sub, customerId)
  const baseItem = sub.items.data.find((item) => PLAN_PRICE_IDS.has(item.price.id))
  const plan = baseItem ? planFromPriceId(baseItem.price.id) : null

  const update: Record<string, string> = { subscription_status: sub.status }
  if (plan) update.plan = plan

  let companyQuery = supabase.from("companies").update(update)
  if (companyId) {
    companyQuery = companyQuery.eq("id", companyId)
  } else {
    companyQuery = companyQuery.eq("stripe_customer_id", customerId)
  }
  await companyQuery

  if (!companyId) return

  const activeAddonRows = sub.items.data
    .map((item) => ({ item, addonSlug: addonSlugForItem(item) }))
    .filter((row): row is { item: Stripe.SubscriptionItem; addonSlug: string } => Boolean(row.addonSlug))

  if (activeAddonRows.length > 0) {
    await supabase.from("addon_subscriptions").upsert(
      activeAddonRows.map(({ item, addonSlug }) => ({
        company_id: companyId,
        addon_slug: addonSlug,
        stripe_subscription_item_id: item.id,
        active: true,
      })),
      { onConflict: "company_id,addon_slug" },
    )
  }

  const { data: existingRows } = await supabase
    .from("addon_subscriptions")
    .select("addon_slug")
    .eq("company_id", companyId)
    .eq("active", true)

  const activeSlugs = new Set(activeAddonRows.map((row) => row.addonSlug))
  await Promise.all((existingRows ?? [])
    .filter((row: { addon_slug: string }) => !activeSlugs.has(row.addon_slug))
    .map((row: { addon_slug: string }) => supabase
      .from("addon_subscriptions")
      .update({ active: false })
      .eq("company_id", companyId)
      .eq("addon_slug", row.addon_slug)))
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
        subscription_status: "active",
        plan: "found",
      })
      .eq("id", companyId)

    console.log("[Stripe] checkout.session.completed - company:", companyId)
  }

  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
    await syncSubscriptionToSupabase(supabase, event.data.object as Stripe.Subscription)
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription
    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id
    const companyId = await companyIdForSubscription(supabase, sub, customerId)

    let companyQuery = supabase.from("companies").update({ subscription_status: sub.status })
    if (companyId) {
      companyQuery = companyQuery.eq("id", companyId)
    } else {
      companyQuery = companyQuery.eq("stripe_customer_id", customerId)
    }
    await companyQuery

    if (companyId) {
      await supabase
        .from("addon_subscriptions")
        .update({ active: false })
        .eq("company_id", companyId)
    }
  }

  return NextResponse.json({ received: true })
}
