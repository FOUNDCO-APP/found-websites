"use server"

import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"
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
} | null> {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_ID_FOUND) return null

  const supabase = await createClient()
  const { data: company } = await supabase
    .from("companies")
    .select("id, name, email, stripe_customer_id")
    .eq("slug", slug)
    .single()

  if (!company) return null
  if (company.stripe_customer_id) return null // already activated

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  const customer = await stripe.customers.create({
    name: company.name,
    email: company.email ?? undefined,
    metadata: { company_id: company.id, slug },
  })

  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: process.env.STRIPE_PRICE_ID_FOUND }],
    trial_period_days: 14,
    payment_behavior: "default_incomplete",
    payment_settings: { save_default_payment_method: "on_subscription" },
    expand: ["pending_setup_intent"],
    metadata: { company_id: company.id, slug },
  })

  const setupIntent = subscription.pending_setup_intent as Stripe.SetupIntent | null
  if (!setupIntent?.client_secret) return null

  return { clientSecret: setupIntent.client_secret, companyName: company.name }
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
        subscription_status: "trialing",
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        plan: "found",
      })
      .eq("slug", slug)

    return true
  } catch {
    return false
  }
}
