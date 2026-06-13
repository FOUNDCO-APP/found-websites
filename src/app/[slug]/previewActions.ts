"use server"

import { createClient } from "@/lib/supabase/server"
import Stripe from "stripe"

export async function getPreviewCheckout(slug: string): Promise<{ url: string } | null> {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_ID_FOUND) return null

  const supabase = await createClient()
  const { data: company } = await supabase
    .from("companies")
    .select("id, name, stripe_customer_id, subscription_status")
    .eq("slug", slug)
    .single()

  if (!company) return null

  const active = company.subscription_status === "active" || company.subscription_status === "trialing"
  if (active) return null

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  let customerId = company.stripe_customer_id as string | undefined
  if (!customerId) {
    const customer = await stripe.customers.create({ name: company.name, metadata: { company_id: company.id } })
    customerId = customer.id
    await supabase.from("companies").update({ stripe_customer_id: customerId }).eq("id", company.id)
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: process.env.STRIPE_PRICE_ID_FOUND, quantity: 1 }],
    subscription_data: { trial_period_days: 14 },
    payment_method_collection: "always",
    success_url: `https://${slug}.foundco.app?trial=activated`,
    cancel_url: `https://${slug}.foundco.app?preview=true`,
  })

  return session.url ? { url: session.url } : null
}
