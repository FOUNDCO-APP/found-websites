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

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"

export async function createBillingSession({
  companyId,
  email,
  name,
  slug,
}: {
  companyId: string
  email: string
  name: string
  slug: string
}): Promise<{ url?: string }> {
  const stripe = getStripe()
  const priceId = process.env.STRIPE_PRICE_ID_FOUND
  if (!stripe || !priceId) return {}

  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: { company_id: companyId, slug },
    })

    // Persist customer ID immediately so webhook can find the company
    const supabase = getAdminClient()
    await supabase
      .from("companies")
      .update({ stripe_customer_id: customer.id })
      .eq("id", companyId)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${ROOT_DOMAIN}`
    const siteUrl = `https://${slug}.${ROOT_DOMAIN}`

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: { trial_period_days: 14 },
      payment_method_collection: "always",
      success_url: `${siteUrl}?trial=activated`,
      cancel_url: appUrl,
      metadata: { company_id: companyId, slug },
    })

    return { url: session.url ?? undefined }
  } catch (err) {
    console.error("[Stripe] createBillingSession:", err)
    return {}
  }
}
