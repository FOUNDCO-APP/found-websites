"use server"

import Stripe from "stripe"
import { createClient as createAdminClient } from "@supabase/supabase-js"

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function priceIdForPlan(plan: string, founding: boolean): string | undefined {
  if (plan === "found_business") return founding ? process.env.STRIPE_PRICE_ID_FOUND_BUSINESS_FOUNDING : process.env.STRIPE_PRICE_ID_FOUND_BUSINESS
  if (plan === "found_pro") return founding ? process.env.STRIPE_PRICE_ID_FOUND_PRO_FOUNDING : process.env.STRIPE_PRICE_ID_FOUND_PRO
  return founding ? process.env.STRIPE_PRICE_ID_FOUND_FOUNDING : process.env.STRIPE_PRICE_ID_FOUND
}

export async function createActivationSetup(slug: string, targetPlan?: string | null, targetAddonSlug?: string | null): Promise<{
  clientSecret: string
  companyName: string
  plan: string | null
} | null> {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("[Activate] Missing STRIPE_SECRET_KEY")
    return null
  }

  const admin = getAdminClient()
  const { data: company } = await admin
    .from("companies")
    .select("id, name, email, stripe_customer_id, pending_setup_intent_secret, plan, subscription_status, is_founding_member")
    .eq("slug", slug)
    .single()

  if (!company) return null
  if ((company as Record<string, unknown>).subscription_status === "active") return null

  const requestedPlan = targetPlan || company.plan || "found"
  const priceId = priceIdForPlan(requestedPlan, !!company.is_founding_member)
  if (!priceId) {
    console.error("[Activate] Missing Stripe price for plan", requestedPlan)
    return null
  }

  // Reuse a pre-created setup intent only if it already belongs to the requested plan.
  if (company.pending_setup_intent_secret && !targetAddonSlug && (!targetPlan || company.plan === requestedPlan)) {
    return { clientSecret: company.pending_setup_intent_secret, companyName: company.name, plan: requestedPlan }
  }

  const existingCustomerId = company.stripe_customer_id as string | null

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

    const customer = existingCustomerId
      ? { id: existingCustomerId }
      : await stripe.customers.create({
          name: company.name,
          email: company.email ?? undefined,
          metadata: { company_id: company.id, slug },
        })

    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ["card"],
      usage: "off_session",
      metadata: { company_id: company.id, slug, plan: requestedPlan, price_id: priceId, addon_slug: targetAddonSlug ?? "" },
    })

    if (!setupIntent.client_secret) {
      console.error("[Activate] SetupIntent created but no client_secret")
      return null
    }

    await admin
      .from("companies")
      .update({
        stripe_customer_id: customer.id,
        pending_setup_intent_secret: setupIntent.client_secret,
        plan: requestedPlan,
      })
      .eq("slug", slug)

    return { clientSecret: setupIntent.client_secret, companyName: company.name, plan: requestedPlan }
  } catch (err) {
    console.error("[Activate] createActivationSetup failed:", err)
    return null
  }
}

export async function confirmActivation(slug: string, setupIntentId: string): Promise<boolean> {
  if (!process.env.STRIPE_SECRET_KEY) return false

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId)

    const customerId = typeof setupIntent.customer === "string"
      ? setupIntent.customer
      : (setupIntent.customer as Stripe.Customer | null)?.id

    const paymentMethodId = typeof setupIntent.payment_method === "string"
      ? setupIntent.payment_method
      : (setupIntent.payment_method as Stripe.PaymentMethod | null)?.id

    if (!customerId || !paymentMethodId) return false

    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    })

    const plan = setupIntent.metadata?.plan ?? "found"
    const priceId = setupIntent.metadata?.price_id ?? priceIdForPlan(plan, true)
    if (!priceId) return false

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      default_payment_method: paymentMethodId,
      metadata: { slug, plan },
    })

    const admin = getAdminClient()
    const addonSlug = setupIntent.metadata?.addon_slug
    const companyId = setupIntent.metadata?.company_id

    if (addonSlug && companyId) {
      const { data: priceRow } = await admin
        .from("addon_stripe_prices")
        .select("stripe_price_id")
        .eq("addon_slug", addonSlug)
        .single()

      if (priceRow?.stripe_price_id) {
        const item = await stripe.subscriptionItems.create({
          subscription: subscription.id,
          price: priceRow.stripe_price_id,
          quantity: 1,
        })
        await admin.from("addon_subscriptions").upsert({
          company_id: companyId,
          addon_slug: addonSlug,
          stripe_subscription_item_id: item.id,
          active: true,
        }, { onConflict: "company_id,addon_slug" })
      }
    }

    await admin
      .from("companies")
      .update({
        subscription_status: "active",
        pending_setup_intent_secret: null,
        plan,
      })
      .eq("slug", slug)

    return true
  } catch (err) {
    console.error("[Activate] confirmActivation failed:", err)
    return false
  }
}