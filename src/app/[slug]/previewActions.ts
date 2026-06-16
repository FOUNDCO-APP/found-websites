"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import Stripe from "stripe"

const FOUNDING_MEMBER_LIMIT = 25

async function getFoundingMemberCount(): Promise<number> {
  const admin = createAdminClient()
  const { count } = await admin
    .from("companies")
    .select("id", { count: "exact", head: true })
    .eq("is_founding_member", true)
  return count ?? 0
}

export async function getPreviewCheckout(slug: string): Promise<{ url: string } | null> {
  if (!process.env.STRIPE_SECRET_KEY) return null

  const supabase = await createClient()
  const { data: company } = await supabase
    .from("companies")
    .select("id, name, email, stripe_customer_id")
    .eq("slug", slug)
    .single()

  if (!company) return null
  if (company.stripe_customer_id) return null

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  // Determine if this is a founding member slot
  const foundingCount = await getFoundingMemberCount()
  const isFoundingMember = foundingCount < FOUNDING_MEMBER_LIMIT

  const priceId = isFoundingMember
    ? (process.env.STRIPE_PRICE_ID_FOUND_FOUNDING ?? process.env.STRIPE_PRICE_ID_FOUND)
    : process.env.STRIPE_PRICE_ID_FOUND

  if (!priceId) return null

  const customer = await stripe.customers.create({
    name: company.name ?? undefined,
    email: company.email ?? undefined,
    metadata: { company_id: company.id },
  })

  await supabase.from("companies").update({ stripe_customer_id: customer.id }).eq("id", company.id)

  if (isFoundingMember) {
    await supabase.from("companies").update({ is_founding_member: true }).eq("id", company.id)
  }

  const session = await stripe.checkout.sessions.create({
    customer: customer.id,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,
      metadata: { company_id: company.id, is_founding_member: isFoundingMember ? "true" : "false" },
    },
    payment_method_collection: "always",
    success_url: `https://${slug}.foundco.app?trial=activated`,
    cancel_url: `https://${slug}.foundco.app?preview=true`,
  })

  return session.url ? { url: session.url } : null
}
