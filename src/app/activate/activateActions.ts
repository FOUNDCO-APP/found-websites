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
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_ID_FOUND) return null

  // Use admin client — owner visiting their own site is not logged into Supabase auth,
  // so the user session client would get null from RLS even on a valid slug.
  const admin = getAdminClient()
  const { data: company } = await admin
    .from("companies")
    .select("id, name, email, stripe_customer_id, pending_setup_intent_secret, plan")
    .eq("slug", slug)
    .single()

  if (!company) return null
  if (company.stripe_customer_id) return null // already activated

  // Fast path — setup intent was pre-created during onboarding, zero Stripe API calls
  if (company.pending_setup_intent_secret) {
    return { clientSecret: company.pending_setup_intent_secret, companyName: company.name, plan: company.plan ?? null }
  }

  // Fallback for companies onboarded before this change — create on demand
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  const customer = await stripe.customers.create({
    name: company.name,
    email: company.email ?? undefined,
    metadata: { company_id: company.id, slug },
  })

  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: process.env.STRIPE_PRICE_ID_FOUND }],
    payment_behavior: "default_incomplete",
    payment_settings: {
      save_default_payment_method: "on_subscription",
      payment_method_types: ["card", "us_bank_account"],
    },
    expand: ["pending_setup_intent"],
    metadata: { company_id: company.id, slug },
  })

  const setupIntent = subscription.pending_setup_intent as Stripe.SetupIntent | null
  if (!setupIntent?.client_secret) return null

  // Store it so any future visit to /activate is instant
  await getAdminClient()
    .from("companies")
    .update({ pending_setup_intent_secret: setupIntent.client_secret })
    .eq("slug", slug)

  return { clientSecret: setupIntent.client_secret, companyName: company.name, plan: company.plan ?? null }
}

export async function confirmActivation(slug: string, setupIntentId: string): Promise<boolean> {
  if (!process.env.STRIPE_SECRET_KEY) return false

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId)
    const customerId = typeof setupIntent.customer === "string"
      ? setupIntent.customer
      : (setupIntent.customer as Stripe.Customer | null)?.id

    if (!customerId) return false

    const admin = getAdminClient()
    await admin
      .from("companies")
      .update({
        stripe_customer_id: customerId,
        subscription_status: "active",
        pending_setup_intent_secret: null,
      })
      .eq("slug", slug)

    return true
  } catch {
    return false
  }
}
