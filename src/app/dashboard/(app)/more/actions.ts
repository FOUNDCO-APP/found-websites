"use server"

import Stripe from "stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"

const ROOT = "https://foundco.app"

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
    return_url: `${ROOT}/dashboard/more`,
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
      await stripe.subscriptions.update(sub.id, {
        items: [{ id: sub.items.data[0].id, price: priceId }],
        proration_behavior: sub.status === "trialing" ? "none" : "create_prorations",
        metadata: { company_id: companyId, plan: targetPlan },
      })
      await admin.from("companies").update({ plan: targetPlan }).eq("id", companyId)
      redirect(`${ROOT}/dashboard/more?upgraded=1`)
      return
    }
  }

  // No subscription yet — create checkout
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

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,
      metadata: { company_id: companyId, plan: targetPlan },
    },
    payment_method_collection: "always",
    success_url: `${ROOT}/dashboard/more?upgraded=1`,
    cancel_url: `${ROOT}/dashboard/more`,
  })

  redirect(session.url!)
}
