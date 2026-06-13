import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

// One-time setup route — creates Found Co. products + prices in Stripe.
// Hit once, copy the price IDs into Vercel env vars, then ignore this route.
// Protected by ADMIN_KEY.

export async function GET(req: NextRequest) {
  const provided = req.nextUrl.searchParams.get("key")
  if (!process.env.ADMIN_KEY || provided !== process.env.ADMIN_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "STRIPE_SECRET_KEY not set" }, { status: 500 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  const plans = [
    { name: "Found",          description: "1 professional website, photo pipeline, contact form",   monthly: 3900, yearly: 35000 },
    { name: "Found Pro",      description: "Custom domain, unlimited workers, contact database",      monthly: 6900, yearly: 62000 },
    { name: "Found Business", description: "Booking, quotes, reviews, unlimited team",               monthly: 9900, yearly: 89000 },
  ]

  const results: Record<string, { productId: string; monthlyPriceId: string; yearlyPriceId: string }> = {}

  for (const plan of plans) {
    const product = await stripe.products.create({
      name: plan.name,
      description: plan.description,
      metadata: { found_plan: plan.name.toLowerCase().replace(/\s+/g, "_") },
    })

    const monthly = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.monthly,
      currency: "usd",
      recurring: { interval: "month" },
      nickname: `${plan.name} — Monthly`,
    })

    const yearly = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.yearly,
      currency: "usd",
      recurring: { interval: "year" },
      nickname: `${plan.name} — Yearly`,
    })

    const key = plan.name.toUpperCase().replace(/\s+/g, "_")
    results[key] = {
      productId: product.id,
      monthlyPriceId: monthly.id,
      yearlyPriceId: yearly.id,
    }
  }

  return NextResponse.json({
    message: "Products created. Add these to Vercel env vars and redeploy.",
    vercel_env_vars: {
      STRIPE_PRICE_ID_FOUND:          results["FOUND"]?.monthlyPriceId,
      STRIPE_PRICE_ID_FOUND_PRO:      results["FOUND_PRO"]?.monthlyPriceId,
      STRIPE_PRICE_ID_FOUND_BUSINESS: results["FOUND_BUSINESS"]?.monthlyPriceId,
    },
    full: results,
  })
}
