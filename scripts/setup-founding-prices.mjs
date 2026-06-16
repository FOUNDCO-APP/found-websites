/**
 * Creates founding-member Stripe prices for all three plan tiers.
 * Run once: node scripts/setup-founding-prices.mjs
 * Prints env vars to paste into Vercel.
 */
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const FOUNDING_PRICES = [
  { nickname: "Found Founding", amount: 2900, lookupKey: "found_founding" },
  { nickname: "Found Pro Founding", amount: 3900, lookupKey: "found_pro_founding" },
  { nickname: "Found Business Founding", amount: 6900, lookupKey: "found_business_founding" },
]

const PRODUCT_NAMES = {
  found_founding: "Found",
  found_pro_founding: "Found Pro",
  found_business_founding: "Found Business",
}

async function main() {
  // Find existing products by name
  const products = await stripe.products.list({ limit: 20, active: true })
  const productMap = Object.fromEntries(products.data.map(p => [p.name, p.id]))

  const results = []

  for (const { nickname, amount, lookupKey } of FOUNDING_PRICES) {
    const productName = PRODUCT_NAMES[lookupKey]
    const productId = productMap[productName]

    if (!productId) {
      console.error(`Product "${productName}" not found in Stripe. Run setup-products first.`)
      process.exit(1)
    }

    // Check if founding price already exists
    const existing = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 })
    if (existing.data.length > 0) {
      console.log(`✅ ${nickname} already exists: ${existing.data[0].id}`)
      results.push({ lookupKey, id: existing.data[0].id })
      continue
    }

    const price = await stripe.prices.create({
      product: productId,
      currency: "usd",
      unit_amount: amount,
      recurring: { interval: "month" },
      nickname,
      lookup_key: lookupKey,
    })

    console.log(`✅ Created ${nickname}: ${price.id}`)
    results.push({ lookupKey, id: price.id })
  }

  console.log("\n— Add these to Vercel env vars —")
  for (const { lookupKey, id } of results) {
    const envKey = "STRIPE_PRICE_ID_" + lookupKey.toUpperCase().replace(/-/g, "_")
    console.log(`${envKey}=${id}`)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
