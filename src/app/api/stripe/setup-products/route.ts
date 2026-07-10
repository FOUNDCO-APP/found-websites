import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

// Protected setup route for live Stripe billing bootstrap. It creates/reuses
// Found products, regular prices, intro prices, and a one-use $1 activation
// promotion code for the base Found Starter intro plan. Returns IDs only,
// never keys.

const ONE_DOLLAR_PROMO_METADATA = "found_1_first_invoice"
const ONE_DOLLAR_PROMO_CODE = "F0UND1128"

const PLANS = [
  {
    key: "FOUND",
    plan: "found",
    name: "Found Starter",
    legacyNames: ["Found"],
    description: "Professional website, photo pipeline, contact form, and mobile dashboard for a small business.",
    regularAmount: 3900,
    introAmount: 2900,
    regularLookupKey: "found_monthly",
    introLookupKey: "found_founding",
  },
  {
    key: "FOUND_PRO",
    plan: "found_pro",
    name: "Found Pro",
    legacyNames: [],
    description: "Found website plus custom domain, expanded customer tools, and professional growth features.",
    regularAmount: 6900,
    introAmount: 3900,
    regularLookupKey: "found_pro_monthly",
    introLookupKey: "found_pro_founding",
  },
  {
    key: "FOUND_BUSINESS",
    plan: "found_business",
    name: "Found Business",
    legacyNames: [],
    description: "Found Pro plus bookings, estimates, review tools, and business operations features.",
    regularAmount: 9900,
    introAmount: 6900,
    regularLookupKey: "found_business_monthly",
    introLookupKey: "found_business_founding",
  },
]

async function getOrCreateProduct(stripe: Stripe, plan: (typeof PLANS)[number]) {
  const products = await stripe.products.search({
    query: `metadata['found_plan']:'${plan.plan}' AND active:'true'`,
    limit: 1,
  })

  const byMetadata = products.data[0]
  if (byMetadata) {
    if (byMetadata.name !== plan.name || byMetadata.description !== plan.description) {
      return stripe.products.update(byMetadata.id, {
        name: plan.name,
        description: plan.description,
        metadata: { ...byMetadata.metadata, found_plan: plan.plan },
      })
    }
    return byMetadata
  }

  const byName = await stripe.products.list({ active: true, limit: 100 })
  const existing = byName.data.find((product) => product.name === plan.name || plan.legacyNames.includes(product.name))
  if (existing) {
    return stripe.products.update(existing.id, {
      name: plan.name,
      description: plan.description,
      metadata: { ...existing.metadata, found_plan: plan.plan },
    })
  }

  return stripe.products.create({
    name: plan.name,
    description: plan.description,
    metadata: { found_plan: plan.plan },
  })
}

async function getOrCreateMonthlyPrice(stripe: Stripe, productId: string, amount: number, nickname: string, lookupKey: string) {
  const existing = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 })
  if (existing.data[0]) return existing.data[0]

  return stripe.prices.create({
    product: productId,
    unit_amount: amount,
    currency: "usd",
    recurring: { interval: "month" },
    nickname,
    lookup_key: lookupKey,
  })
}

async function deactivateOtherFoundPromos(stripe: Stripe) {
  const activeCodes = await stripe.promotionCodes.list({ active: true, limit: 100 })
  const promosToDisable = activeCodes.data.filter((promo) =>
    promo.metadata?.found_promo === ONE_DOLLAR_PROMO_METADATA &&
    promo.metadata?.plan === "found" &&
    promo.code !== ONE_DOLLAR_PROMO_CODE
  )

  for (const promo of promosToDisable) {
    await stripe.promotionCodes.update(promo.id, { active: false })
  }

  return promosToDisable.length
}

async function getOrCreateFoundOneDollarPromo(stripe: Stripe) {
  const disabledGuessableCount = await deactivateOtherFoundPromos(stripe)

  let coupon: Stripe.Coupon
  try {
    coupon = await stripe.coupons.retrieve("found_1_first_invoice")
    if (coupon.deleted) throw new Error("Coupon was deleted")
  } catch {
    coupon = await stripe.coupons.create({
      id: "found_1_first_invoice",
      name: "Found Starter $1 first invoice",
      amount_off: 2800,
      currency: "usd",
      duration: "once",
      metadata: { found_promo: ONE_DOLLAR_PROMO_METADATA, leaves_due: "100" },
    })
  }

  const existingCode = await stripe.promotionCodes.list({ code: ONE_DOLLAR_PROMO_CODE, active: true, limit: 1 })
  const existingSecure = existingCode.data[0]

  if (existingSecure) {
    return { promotionCode: existingSecure, created: false, disabledGuessableCount }
  }

  const promotionCode = await stripe.promotionCodes.create({
    code: ONE_DOLLAR_PROMO_CODE,
    promotion: { type: "coupon", coupon: coupon.id },
    max_redemptions: 1,
    metadata: { found_promo: ONE_DOLLAR_PROMO_METADATA, plan: "found" },
  })

  return { promotionCode, created: true, disabledGuessableCount }
}

export async function GET(req: NextRequest) {
  const provided = req.nextUrl.searchParams.get("key")
  if (!process.env.ADMIN_KEY || provided !== process.env.ADMIN_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "STRIPE_SECRET_KEY not set" }, { status: 500 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const results: Record<string, {
    productId: string
    productName: string
    regularPriceId: string
    introPriceId: string
  }> = {}

  for (const plan of PLANS) {
    const product = await getOrCreateProduct(stripe, plan)
    const regular = await getOrCreateMonthlyPrice(stripe, product.id, plan.regularAmount, `${plan.name} Monthly`, plan.regularLookupKey)
    const intro = await getOrCreateMonthlyPrice(stripe, product.id, plan.introAmount, `${plan.name} Intro`, plan.introLookupKey)

    results[plan.key] = {
      productId: product.id,
      productName: product.name,
      regularPriceId: regular.id,
      introPriceId: intro.id,
    }
  }

  const promo = await getOrCreateFoundOneDollarPromo(stripe)

  return NextResponse.json({
    message: "Stripe billing setup complete.",
    mode: process.env.STRIPE_SECRET_KEY.startsWith("sk_live_") ? "live" : "test_or_unknown",
    vercel_env_vars: {
      STRIPE_PRICE_ID_FOUND: results.FOUND.regularPriceId,
      STRIPE_PRICE_ID_FOUND_FOUNDING: results.FOUND.introPriceId,
      STRIPE_PRICE_ID_FOUND_PRO: results.FOUND_PRO.regularPriceId,
      STRIPE_PRICE_ID_FOUND_PRO_FOUNDING: results.FOUND_PRO.introPriceId,
      STRIPE_PRICE_ID_FOUND_BUSINESS: results.FOUND_BUSINESS.regularPriceId,
      STRIPE_PRICE_ID_FOUND_BUSINESS_FOUNDING: results.FOUND_BUSINESS.introPriceId,
    },
    promo: {
      code: promo.promotionCode.code,
      id: promo.promotionCode.id,
      created: promo.created,
      disabledGuessableCount: promo.disabledGuessableCount,
      leavesDue: "$1.00 on the Found Starter intro plan first invoice",
    },
    full: results,
  })
}