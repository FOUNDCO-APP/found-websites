"use server"

import Stripe from "stripe"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null
  return new Stripe(process.env.STRIPE_SECRET_KEY)
}

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function priceIdForPlan(plan?: string): string | undefined {
  if (plan === "found_pro")      return process.env.STRIPE_PRICE_ID_FOUND_PRO
  if (plan === "found_business") return process.env.STRIPE_PRICE_ID_FOUND_BUSINESS
  return process.env.STRIPE_PRICE_ID_FOUND
}

export async function createSetupIntentForCompany({
  companyId,
  email,
  name,
  slug,
  plan,
}: {
  companyId: string
  email: string
  name: string
  slug: string
  plan?: string
}): Promise<void> {
  const stripe = getStripe()
  const priceId = priceIdForPlan(plan)
  if (!stripe || !priceId) return

  try {
    const supabase = getAdminClient()

    const { data: existing } = await supabase
      .from("companies")
      .select("stripe_customer_id, pending_setup_intent_secret")
      .eq("id", companyId)
      .single()

    // Already activated or already pre-created — nothing to do
    if (existing?.stripe_customer_id || existing?.pending_setup_intent_secret) return

    const customer = await stripe.customers.create({
      email,
      name,
      metadata: { company_id: companyId, slug },
    })

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      trial_period_days: 14,
      payment_behavior: "default_incomplete",
      payment_settings: {
        save_default_payment_method: "on_subscription",
        payment_method_types: ["card", "us_bank_account"],
      },
      expand: ["pending_setup_intent"],
      metadata: { company_id: companyId, slug },
    })

    const setupIntent = subscription.pending_setup_intent as Stripe.SetupIntent | null
    if (!setupIntent?.client_secret) return

    await supabase
      .from("companies")
      .update({ pending_setup_intent_secret: setupIntent.client_secret })
      .eq("id", companyId)

  } catch (err) {
    // Non-fatal — activate page has a fallback that creates on demand
    console.error("[Stripe] createSetupIntentForCompany:", err)
  }
}
