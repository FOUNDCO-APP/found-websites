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
  await admin.from("addon_subscriptions").upsert({
    company_id: companyId,
    addon_slug: addonSlug,
    stripe_subscription_item_id: stripeSubscriptionItemId,
    active: true,
  }, { onConflict: "company_id,addon_slug" })
}
const PLAN_PRICE_IDS = new Set([
  process.env.STRIPE_PRICE_ID_FOUND,
  process.env.STRIPE_PRICE_ID_FOUND_FOUNDING,
  process.env.STRIPE_PRICE_ID_FOUND_PRO,
  process.env.STRIPE_PRICE_ID_FOUND_PRO_FOUNDING,
  process.env.STRIPE_PRICE_ID_FOUND_BUSINESS,
  process.env.STRIPE_PRICE_ID_FOUND_BUSINESS_FOUNDING,
].filter(Boolean) as string[])

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

function foundingPriceId(plan: string): string | undefined {
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

// Upgrades an existing subscription or creates a new checkout for the target plan
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

  const isFoundingMember = !!company.is_founding_member
  const priceId = isFoundingMember ? foundingPriceId(targetPlan) : regularPriceId(targetPlan)
  if (!priceId) return

  // Already has a Stripe subscription — update the price directly
  if (company.stripe_customer_id) {
    const subs = await stripe.subscriptions.list({
      customer: company.stripe_customer_id,
      limit: 1,
    })

    if (subs.data.length > 0) {
      const sub = subs.data[0]
      const baseItem = sub.items.data.find((item) => PLAN_PRICE_IDS.has(item.price.id))
      if (!baseItem) return

      await stripe.subscriptions.update(sub.id, {
        items: [{ id: baseItem.id, price: priceId }],
        proration_behavior: sub.status === "trialing" ? "none" : "create_prorations",
        metadata: { company_id: companyId, plan: targetPlan },
      })
      await admin.from("companies").update({ plan: targetPlan }).eq("id", companyId)
      redirect("/more?upgraded=1")
      return
    }
  }
  // No active subscription yet. Payment collection happens in Found's branded activation overlay, not Stripe Checkout.
  redirect("/more?activate_required=1")
}
