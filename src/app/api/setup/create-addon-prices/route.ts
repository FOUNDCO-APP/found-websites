import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createAdminClient } from "@/lib/supabase/admin"

const ADDONS = [
  { slug: "menu_display",         name: "Found — Online Menu",            price: 1000 },
  { slug: "online_ordering",      name: "Found — Online Ordering",        price: 2000 },
  { slug: "shopping_cart",        name: "Found — Shopping Cart",          price: 2000 },
  { slug: "quote_payments",       name: "Found — Quote & Estimate Payments", price: 1500 },
  { slug: "reservation_calendar", name: "Found — Reservation Calendar",   price: 1500 },
  { slug: "email_marketing",      name: "Found — Email Marketing",        price: 1500 },
  { slug: "second_location",      name: "Found — Second Location",        price: 1500 },
]

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  if (searchParams.get("secret") !== process.env.SETUP_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const admin = createAdminClient()
  const results: Record<string, string> = {}

  for (const addon of ADDONS) {
    const product = await stripe.products.create({
      name: addon.name,
      metadata: { addon_slug: addon.slug, platform: "foundco" },
    })
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: addon.price,
      currency: "usd",
      recurring: { interval: "month" },
      metadata: { addon_slug: addon.slug },
    })
    results[addon.slug] = price.id

    await admin.from("addon_stripe_prices").upsert({
      addon_slug: addon.slug,
      stripe_price_id: price.id,
      price_cents: addon.price,
    }, { onConflict: "addon_slug" })
  }

  return NextResponse.json({ created: results })
}
