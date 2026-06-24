import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { Resend } from "resend"
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

function formatOrderTotal(cents: unknown) {
  const amount = typeof cents === "number" ? cents : Number(cents || 0)
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount / 100)
}

async function handleOnlineOrderCheckout(
  supabase: ReturnType<typeof getAdminClient>,
  session: Stripe.Checkout.Session,
) {
  const companyId = session.metadata?.company_id
  const leadId = session.metadata?.lead_id
  if (!companyId || !leadId) return

  const { data: lead } = await supabase
    .from("leads")
    .select("id, name, email, phone, message, partial_answers")
    .eq("id", leadId)
    .eq("company_id", companyId)
    .maybeSingle()

  const existingAnswers = (lead?.partial_answers ?? {}) as Record<string, unknown>
  await supabase
    .from("leads")
    .update({
      partial_answers: {
        ...existingAnswers,
        payment_status: "paid",
        stripe_session_id: session.id,
        stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
        paid_at: new Date().toISOString(),
      },
    })
    .eq("id", leadId)

  const { data: company } = await supabase
    .from("companies")
    .select("name, email, lead_email, phone")
    .eq("id", companyId)
    .maybeSingle()

  const ownerEmail = company?.lead_email || company?.email
  if (!ownerEmail || !lead || !process.env.RESEND_API_KEY) return

  const resend = new Resend(process.env.RESEND_API_KEY)
  const total = formatOrderTotal(existingAnswers.subtotal_cents)
  await resend.emails.send({
    from: "Found <hello@foundco.app>",
    to: ownerEmail,
    subject: `Paid online order: ${lead.name || "Customer"} - ${total}`,
    html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;"><tr><td align="center"><table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;"><tr><td style="background:#111111;padding:32px;text-align:center;"><p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#888888;">Paid Online Order</p><h1 style="margin:0;font-size:22px;font-weight:900;color:#ffffff;">${company?.name || "Found"}</h1></td></tr><tr><td style="padding:36px 32px;"><p style="margin:0 0 20px;font-size:18px;font-weight:900;color:#111111;">${total} paid</p><p style="margin:0 0 14px;font-size:15px;color:#333333;line-height:1.6;white-space:pre-wrap;">${lead.message || "New online order"}</p><table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:12px;padding:20px;margin-top:20px;"><tr><td><p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999999;">Customer</p><p style="margin:0;font-size:16px;font-weight:800;color:#111111;">${lead.name || "Customer"}</p></td></tr><tr><td style="padding-top:14px;"><p style="margin:0;font-size:14px;color:#333333;">${lead.phone || ""}${lead.email ? ` &middot; ${lead.email}` : ""}</p></td></tr></table></td></tr></table></td></tr></table></body></html>`,
  }).catch((err) => console.error("[Resend] Online order notification error:", err))
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

    if (session.metadata?.kind === "online_order") {
      await handleOnlineOrderCheckout(supabase, session)
      return NextResponse.json({ received: true })
    }

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