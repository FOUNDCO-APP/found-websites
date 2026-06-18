"use server"

import Stripe from "stripe"
import { createClient as createAdminClient } from "@supabase/supabase-js"

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function createActivationSetup(slug: string): Promise<{
  clientSecret: string
  companyName: string
  plan: string | null
} | null> {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_ID_FOUND) {
    console.error("[Activate] Missing env vars")
    return null
  }

  const admin = getAdminClient()
  const { data: company, error: dbError } = await admin
    .from("companies")
    .select("id, name, email, stripe_customer_id, pending_setup_intent_secret, plan, subscription_status")
    .eq("slug", slug)
    .single()

  console.log(`[Activate] slug="${slug}" company=${company?.id ?? "NOT FOUND"} stripe_customer_id=${company?.stripe_customer_id ?? "null"} pending_secret=${company?.pending_setup_intent_secret ? "SET" : "null"} dbError=${dbError?.message ?? "none"}`)

  if (!company) return null
  // Only block if truly active — customer_id alone doesn't mean they completed payment
  if ((company as Record<string,unknown>).subscription_status === "active") {
    console.error(`[Activate] Already activated for slug="${slug}"`)
    return null
  }

  // Fast path — setup intent was pre-created during onboarding
  if (company.pending_setup_intent_secret) {
    return { clientSecret: company.pending_setup_intent_secret, companyName: company.name, plan: company.plan ?? null }
  }

  // If they already have a Stripe customer but no active sub, reuse the customer
  const existingCustomerId = company.stripe_customer_id as string | null

  // Fallback — create SetupIntent directly (collect card first, subscribe after confirmation)
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
      metadata: { company_id: company.id, slug, price_id: process.env.STRIPE_PRICE_ID_FOUND! },
    })

    if (!setupIntent.client_secret) {
      console.error("[Activate] SetupIntent created but no client_secret")
      return null
    }

    await admin
      .from("companies")
      .update({ stripe_customer_id: customer.id, pending_setup_intent_secret: setupIntent.client_secret })
      .eq("slug", slug)

    return { clientSecret: setupIntent.client_secret, companyName: company.name, plan: company.plan ?? null }
  } catch (err) {
    console.error("[Activate] createActivationSetup failed:", err)
    return null
  }
}

export async function confirmActivation(slug: string, setupIntentId: string): Promise<boolean> {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_ID_FOUND) return false

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

    // Set as default payment method on customer
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    })

    // Now create the subscription — customer has a payment method so it charges immediately
    await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: process.env.STRIPE_PRICE_ID_FOUND }],
      default_payment_method: paymentMethodId,
      metadata: { slug },
    })

    const admin = getAdminClient()
    await admin
      .from("companies")
      .update({
        subscription_status: "active",
        pending_setup_intent_secret: null,
      })
      .eq("slug", slug)

    return true
  } catch (err) {
    console.error("[Activate] confirmActivation failed:", err)
    return false
  }
}
