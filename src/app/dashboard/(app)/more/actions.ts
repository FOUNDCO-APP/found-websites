"use server"

import Stripe from "stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"
const APP_BASE = `https://my.${ROOT_DOMAIN}`
async function markAddonActive(
  admin: ReturnType<typeof createAdminClient>,
  companyId: string,
  addonSlug: string,
  stripeSubscriptionItemId: string,
) {
  const { error } = await admin.from("addon_subscriptions").upsert({
    company_id: companyId,
    addon_slug: addonSlug,
    stripe_subscription_item_id: stripeSubscriptionItemId,
    active: true,
  }, { onConflict: "company_id,addon_slug" })
  if (error) throw new Error(`markAddonActive failed: ${error.message}`)
}
const PLAN_PRICE_IDS = new Set([
  process.env.STRIPE_PRICE_ID_FOUND,
  process.env.STRIPE_PRICE_ID_FOUND_FOUNDING,
  process.env.STRIPE_PRICE_ID_FOUND_PRO,
  process.env.STRIPE_PRICE_ID_FOUND_PRO_FOUNDING,
  process.env.STRIPE_PRICE_ID_FOUND_BUSINESS,
  process.env.STRIPE_PRICE_ID_FOUND_BUSINESS_FOUNDING,
].filter(Boolean) as string[])

async function getUpgradePortalConfiguration(stripe: Stripe) {
  const priceIds = Array.from(PLAN_PRICE_IDS)
  const signature = priceIds.sort().join(",")
  const existing = await stripe.billingPortal.configurations.list({ active: true, limit: 100 })
  const reusable = existing.data.find((config) =>
    config.metadata?.found_config === "plan_upgrade_v1" &&
    config.metadata?.price_signature === signature
  )
  if (reusable) return reusable.id

  const prices = await Promise.all(priceIds.map((priceId) => stripe.prices.retrieve(priceId)))
  const grouped = new Map<string, string[]>()
  for (const price of prices) {
    const productId = typeof price.product === "string" ? price.product : price.product.id
    grouped.set(productId, [...(grouped.get(productId) ?? []), price.id])
  }

  const configuration = await stripe.billingPortal.configurations.create({
    business_profile: {
      headline: "Manage your Found plan",
    },
    features: {
      customer_update: {
        enabled: true,
        allowed_updates: ["email", "address", "phone"],
      },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: false },
      subscription_update: {
        enabled: true,
        default_allowed_updates: ["price", "promotion_code"],
        proration_behavior: "create_prorations",
        products: Array.from(grouped.entries()).map(([product, pricesForProduct]) => ({
          product,
          prices: pricesForProduct,
        })),
      },
    },
    metadata: {
      found_config: "plan_upgrade_v1",
      price_signature: signature,
    },
  })

  return configuration.id
}

export async function purchaseAddon(companyId: string, addonSlug: string): Promise<{ success: boolean; error?: string }> {
  const stripe = getStripe()
  if (!stripe || !companyId || !addonSlug) return { success: false, error: "Missing required fields." }

  const admin = createAdminClient()
  const [{ data: company }, { data: priceRow }] = await Promise.all([
    admin.from("companies").select("stripe_customer_id, name, email").eq("id", companyId).single(),
    admin.from("addon_stripe_prices").select("stripe_price_id").eq("addon_slug", addonSlug).single(),
  ])

  if (!company || !priceRow?.stripe_price_id) return { success: false, error: "Add-on not available." }

  let customerId = company.stripe_customer_id as string | undefined
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: company.name ?? undefined,
      email: company.email ?? undefined,
      metadata: { company_id: companyId },
    })
    customerId = customer.id
    await admin.from("companies").update({ stripe_customer_id: customerId }).eq("id", companyId)
  }

  const subs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 10, expand: ["data.items.data.price"] })
  const sub = subs.data.find((s) => s.status === "active" || s.status === "trialing")
  if (!sub) return { success: false, error: "No active subscription found." }

  const existingItem = sub.items.data.find((item) => item.price.id === priceRow.stripe_price_id)

  let itemId: string
  if (existingItem) {
    itemId = existingItem.id
  } else {
    let newItemId: string | null = null
    let stripeError: string | null = null
    try {
      const item = await stripe.subscriptionItems.create({ subscription: sub.id, price: priceRow.stripe_price_id, quantity: 1 })
      newItemId = item.id
    } catch (err) {
      stripeError = String(err)
    }
    if (stripeError || !newItemId) return { success: false, error: "Could not add to subscription." }
    itemId = newItemId
  }

  try {
    await markAddonActive(admin, companyId, addonSlug, itemId)
    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function startAddonCheckout(formData: FormData) {
  const companyId = formData.get("companyId") as string
  const addonSlug = formData.get("addonSlug") as string
  const stripe = getStripe()
  if (!stripe || !companyId || !addonSlug) redirect("/more?addon_unavailable=1")

  const admin = createAdminClient()

  const [{ data: company }, { data: priceRow }] = await Promise.all([
    admin.from("companies").select("stripe_customer_id, name, email").eq("id", companyId).single(),
    admin.from("addon_stripe_prices").select("stripe_price_id").eq("addon_slug", addonSlug).single(),
  ])

  if (!company || !priceRow?.stripe_price_id) redirect("/more?addon_unavailable=1")

  let customerId = company.stripe_customer_id as string | undefined

  if (!customerId) {
    const customer = await stripe.customers.create({
      name: company.name ?? undefined,
      email: company.email ?? undefined,
      metadata: { company_id: companyId },
    })
    customerId = customer.id
    await admin.from("companies").update({ stripe_customer_id: customerId }).eq("id", companyId)
  }

  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 10,
    expand: ["data.items.data.price"],
  })
  const sub = subs.data.find((s) => s.status === "active" || s.status === "trialing")
  if (!sub) redirect("/more?activate_required=1")

  const existingItem = sub.items.data.find((item) =>
    item.price.id === priceRow.stripe_price_id ||
    item.price.metadata?.addon_slug === addonSlug ||
    item.plan?.metadata?.addon_slug === addonSlug
  )

  if (existingItem) {
    await markAddonActive(admin, companyId, addonSlug, existingItem.id)
    redirect(`/more?addon_added=${addonSlug}`)
  }

  // redirect() must live outside try/catch — it throws a special Next.js error
  // that gets swallowed if called inside a catch block
  let addedItemId: string | null = null
  let stripeError: string | null = null

  try {
    const item = await stripe.subscriptionItems.create({
      subscription: sub.id,
      price: priceRow.stripe_price_id,
      quantity: 1,
    })
    addedItemId = item.id
  } catch (err) {
    console.error("[more] add-on subscription item error:", err)
    stripeError = String(err)
  }

  if (stripeError || !addedItemId) redirect("/more?addon_unavailable=1")

  await markAddonActive(admin, companyId, addonSlug, addedItemId!)
  redirect(`/more?addon_added=${addonSlug}`)
}
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null
  return new Stripe(process.env.STRIPE_SECRET_KEY)
}

// Stripe env vars still use their original names; product language is intro rate.
function introPriceId(plan: string): string | undefined {
  if (plan === "found_pro")      return process.env.STRIPE_PRICE_ID_FOUND_PRO_FOUNDING
  if (plan === "found_business") return process.env.STRIPE_PRICE_ID_FOUND_BUSINESS_FOUNDING
  return process.env.STRIPE_PRICE_ID_FOUND_FOUNDING
}

function regularPriceId(plan: string): string | undefined {
  if (plan === "found_pro")      return process.env.STRIPE_PRICE_ID_FOUND_PRO
  if (plan === "found_business") return process.env.STRIPE_PRICE_ID_FOUND_BUSINESS
  return process.env.STRIPE_PRICE_ID_FOUND
}

// Opens Stripe Customer Portal — handles cancel, update payment method
export async function openBillingPortal(formData: FormData) {
  const companyId = formData.get("companyId") as string
  const stripe = getStripe()
  if (!stripe || !companyId) return

  const admin = createAdminClient()
  const { data } = await admin
    .from("companies")
    .select("stripe_customer_id")
    .eq("id", companyId)
    .single()

  if (!data?.stripe_customer_id) return

  const session = await stripe.billingPortal.sessions.create({
    customer: data.stripe_customer_id,
    return_url: `${APP_BASE}/more`,
  })

  redirect(session.url)
}

// Opens Stripe's hosted upgrade confirmation. Stripe must remain the source of
// truth for plan changes; Supabase is updated only by subscription webhooks.
export async function startUpgradeCheckout(formData: FormData) {
  const companyId = formData.get("companyId") as string
  const targetPlan = formData.get("targetPlan") as string
  const stripe = getStripe()
  if (!stripe || !companyId || !targetPlan) return

  const admin = createAdminClient()
  const { data: company } = await admin
    .from("companies")
    .select("stripe_customer_id, slug, is_founding_member, name, email")
    .eq("id", companyId)
    .single()

  if (!company) return

  const hasIntroRate = !!company.is_founding_member
  const priceId = hasIntroRate ? introPriceId(targetPlan) : regularPriceId(targetPlan)
  if (!priceId) return

  if (company.stripe_customer_id) {
    const subs = await stripe.subscriptions.list({
      customer: company.stripe_customer_id,
      status: "all",
      limit: 10,
      expand: ["data.items.data.price"],
    })

    const sub = subs.data.find((s) => s.status === "active" || s.status === "trialing")
    if (sub) {
      const baseItem = sub.items.data.find((item) => PLAN_PRICE_IDS.has(item.price.id))
      if (!baseItem) redirect("/more?billing_update=1")

      const hasAddonItems = sub.items.data.some((item) => item.id !== baseItem.id)
      const flowData = hasAddonItems ? undefined : {
        type: "subscription_update_confirm" as const,
        subscription_update_confirm: {
          subscription: sub.id,
          items: [{ id: baseItem.id, price: priceId }],
        },
        after_completion: {
          type: "redirect" as const,
          redirect: { return_url: `${APP_BASE}/more?billing_update=1` },
        },
      }

      let sessionUrl: string | null = null
      try {
        const configuration = await getUpgradePortalConfiguration(stripe)
        const session = await stripe.billingPortal.sessions.create({
          customer: company.stripe_customer_id,
          return_url: `${APP_BASE}/more`,
          configuration,
          ...(flowData ? { flow_data: flowData } : {}),
        })
        sessionUrl = session.url
      } catch (err) {
        console.error("[more] upgrade portal session error:", err)
      }

      if (!sessionUrl) redirect("/more?billing_update=1")
      redirect(sessionUrl)
    }
  }
  // No active subscription yet. Payment collection happens in Found's branded activation overlay, not Stripe Checkout.
  redirect("/more?activate_required=1")
}
