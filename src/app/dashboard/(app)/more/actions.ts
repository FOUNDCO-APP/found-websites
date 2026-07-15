"use server"

import Stripe from "stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"
const APP_BASE = `https://my.${ROOT_DOMAIN}`
async function markAddonActive(
  admin: ReturnType<typeof createAdminClient>,
  companyId: string,
  addonSlug: string,
  stripeSubscriptionItemId: string,
) {
  const { error } = await admin.from("addon_subscriptions").upsert({
    company_id: companyId,
    addon_slug: addonSlug,
    stripe_subscription_item_id: stripeSubscriptionItemId,
    active: true,
  }, { onConflict: "company_id,addon_slug" })
  if (error) throw new Error(`markAddonActive failed: ${error.message}`)
}
const PLAN_PRICE_IDS = new Set([
  process.env.STRIPE_PRICE_ID_FOUND,
  process.env.STRIPE_PRICE_ID_FOUND_FOUNDING,
  process.env.STRIPE_PRICE_ID_FOUND_PRO,
  process.env.STRIPE_PRICE_ID_FOUND_PRO_FOUNDING,
  process.env.STRIPE_PRICE_ID_FOUND_BUSINESS,
  process.env.STRIPE_PRICE_ID_FOUND_BUSINESS_FOUNDING,
].filter(Boolean) as string[])

async function getUpgradePortalConfiguration(stripe: Stripe, targetPriceId: string) {
  const signature = targetPriceId
  const existing = await stripe.billingPortal.configurations.list({ active: true, limit: 100 })
  const reusable = existing.data.find((config) =>
    config.metadata?.found_config === "plan_upgrade_v1" &&
    config.metadata?.price_signature === signature
  )
  if (reusable) return reusable.id

  const price = await stripe.prices.retrieve(targetPriceId)
  const productId = typeof price.product === "string" ? price.product : price.product.id

  const configuration = await stripe.billingPortal.configurations.create({
    business_profile: {
      headline: "Manage your Found plan",
    },
    features: {
      customer_update: {
        enabled: true,
        allowed_updates: ["email", "address", "phone"],
      },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: false },
      subscription_update: {
        enabled: true,
        default_allowed_updates: ["price", "promotion_code"],
        proration_behavior: "create_prorations",
        products: [{
          product: productId,
          prices: [targetPriceId],
        }],
      },
    },
    metadata: {
      found_config: "plan_upgrade_v1",
      price_signature: signature,
    },
  })

  return configuration.id
}

export async function purchaseAddon(companyId: string, addonSlug: string): Promise<{ success: boolean; error?: string }> {
  const stripe = getStripe()
  if (!stripe || !companyId || !addonSlug) return { success: false, error: "Missing required fields." }

  const admin = createAdminClient()
  const [{ data: company }, { data: priceRow }] = await Promise.all([
    admin.from("companies").select("stripe_customer_id, name, email").eq("id", companyId).single(),
    admin.from("addon_stripe_prices").select("stripe_price_id").eq("addon_slug", addonSlug).single(),
  ])

  if (!company || !priceRow?.stripe_price_id) return { success: false, error: "Add-on not available." }

  let customerId = company.stripe_customer_id as string | undefined
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: company.name ?? undefined,
      email: company.email ?? undefined,
      metadata: { company_id: companyId },
    })
    customerId = customer.id
    await admin.from("companies").update({ stripe_customer_id: customerId }).eq("id", companyId)
  }

  const subs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 10, expand: ["data.items.data.price"] })
  const sub = subs.data.find((s) => s.status === "active" || s.status === "trialing")
  if (!sub) return { success: false, error: "No active subscription found." }

  const existingItem = sub.items.data.find((item) => item.price.id === priceRow.stripe_price_id)

  let itemId: string
  if (existingItem) {
    itemId = existingItem.id
  } else {
    let newItemId: string | null = null
    let stripeError: string | null = null
    try {
      const item = await stripe.subscriptionItems.create({ subscription: sub.id, price: priceRow.stripe_price_id, quantity: 1 })
      newItemId = item.id
    } catch (err) {
      stripeError = String(err)
    }
    if (stripeError || !newItemId) return { success: false, error: "Could not add to subscription." }
    itemId = newItemId
  }

  try {
    await markAddonActive(admin, companyId, addonSlug, itemId)
    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function startAddonCheckout(formData: FormData) {
  const companyId = formData.get("companyId") as string
  const addonSlug = formData.get("addonSlug") as string
  const stripe = getStripe()
  if (!stripe || !companyId || !addonSlug) redirect("/more?addon_unavailable=1")

  const admin = createAdminClient()

  const [{ data: company }, { data: priceRow }] = await Promise.all([
    admin.from("companies").select("stripe_customer_id, name, email").eq("id", companyId).single(),
    admin.from("addon_stripe_prices").select("stripe_price_id").eq("addon_slug", addonSlug).single(),
  ])

  if (!company || !priceRow?.stripe_price_id) redirect("/more?addon_unavailable=1")

  let customerId = company.stripe_customer_id as string | undefined

  if (!customerId) {
    const customer = await stripe.customers.create({
      name: company.name ?? undefined,
      email: company.email ?? undefined,
      metadata: { company_id: companyId },
    })
    customerId = customer.id
    await admin.from("companies").update({ stripe_customer_id: customerId }).eq("id", companyId)
  }

  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 10,
    expand: ["data.items.data.price"],
  })
  const sub = subs.data.find((s) => s.status === "active" || s.status === "trialing")
  if (!sub) redirect("/more?activate_required=1")

  const existingItem = sub.items.data.find((item) =>
    item.price.id === priceRow.stripe_price_id ||
    item.price.metadata?.addon_slug === addonSlug ||
    item.plan?.metadata?.addon_slug === addonSlug
  )

  if (existingItem) {
    await markAddonActive(admin, companyId, addonSlug, existingItem.id)
    redirect(`/more?addon_added=${addonSlug}`)
  }

  // redirect() must live outside try/catch — it throws a special Next.js error
  // that gets swallowed if called inside a catch block
  let addedItemId: string | null = null
  let stripeError: string | null = null

  try {
    const item = await stripe.subscriptionItems.create({
      subscription: sub.id,
      price: priceRow.stripe_price_id,
      quantity: 1,
    })
    addedItemId = item.id
  } catch (err) {
    console.error("[more] add-on subscription item error:", err)
    stripeError = String(err)
  }

  if (stripeError || !addedItemId) redirect("/more?addon_unavailable=1")

  await markAddonActive(admin, companyId, addonSlug, addedItemId!)
  redirect(`/more?addon_added=${addonSlug}`)
}
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null
  return new Stripe(process.env.STRIPE_SECRET_KEY)
}

// Stripe env vars still use their original names; product language is intro rate.
function introPriceId(plan: string): string | undefined {
  if (plan === "found_pro")      return process.env.STRIPE_PRICE_ID_FOUND_PRO_FOUNDING
  if (plan === "found_business") return process.env.STRIPE_PRICE_ID_FOUND_BUSINESS_FOUNDING
  return process.env.STRIPE_PRICE_ID_FOUND_FOUNDING
}

function regularPriceId(plan: string): string | undefined {
  if (plan === "found_pro")      return process.env.STRIPE_PRICE_ID_FOUND_PRO
  if (plan === "found_business") return process.env.STRIPE_PRICE_ID_FOUND_BUSINESS
  return process.env.STRIPE_PRICE_ID_FOUND
}

function normalizePromoCode(code?: string | null) {
  return code?.trim().toUpperCase() || ""
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: amount % 100 === 0 ? 0 : 2,
  }).format(amount / 100)
}

function discountLabelFor(coupon: Stripe.Coupon) {
  if (typeof coupon.percent_off === "number") return `${coupon.percent_off}% off`
  if (typeof coupon.amount_off === "number" && coupon.currency) return `${formatCurrency(coupon.amount_off, coupon.currency)} off`
  return coupon.name || "Discount applied"
}

function discountedAmountFor(amount: number, currency: string, coupon: Stripe.Coupon) {
  if (typeof coupon.percent_off === "number") return Math.max(0, Math.round(amount * (100 - coupon.percent_off) / 100))
  if (typeof coupon.amount_off === "number") {
    if (coupon.currency && coupon.currency.toLowerCase() !== currency.toLowerCase()) return null
    return Math.max(0, amount - coupon.amount_off)
  }
  return amount
}

type UpgradePreview = {
  ok: boolean
  error?: string
  companyName?: string
  currentPlan?: string
  targetPlan?: string
  currency?: string
  originalAmount?: number
  discountedAmount?: number
  discountLabel?: string | null
  promotionCodeId?: string | null
  promoCode?: string | null
  nextBillingDate?: string | null
  paymentMethodLabel?: string | null
}

type UpgradeResult = {
  ok: boolean
  error?: string
  requiresAction?: boolean
  hostedInvoiceUrl?: string | null
}

async function promotionCodeFor(stripe: Stripe, price: Stripe.Price, promoCode?: string | null) {
  const normalizedCode = normalizePromoCode(promoCode)
  if (!normalizedCode) return { promotionCodeId: null, promoCode: null, discountLabel: null, discountedAmount: price.unit_amount ?? 0, promoError: null }

  const promoCodes = await stripe.promotionCodes.list({
    code: normalizedCode,
    active: true,
    limit: 1,
    expand: ["data.promotion.coupon"],
  })

  const promotionCode = promoCodes.data[0]
  const couponRef = promotionCode?.promotion?.coupon
  const coupon = typeof couponRef === "string" ? await stripe.coupons.retrieve(couponRef) : couponRef
  const originalAmount = price.unit_amount ?? 0
  const currency = price.currency || "usd"

  if (!promotionCode || !coupon || coupon.valid === false) {
    return { promotionCodeId: null, promoCode: null, discountLabel: null, discountedAmount: originalAmount, promoError: "That promo code is not active." }
  }

  const productId = typeof price.product === "string" ? price.product : price.product.id
  const allowedProducts = coupon.applies_to?.products ?? []
  if (allowedProducts.length > 0 && !allowedProducts.includes(productId)) {
    return { promotionCodeId: null, promoCode: null, discountLabel: null, discountedAmount: originalAmount, promoError: "That promo code is not valid for this plan." }
  }

  const discountedAmount = discountedAmountFor(originalAmount, currency, coupon)
  if (discountedAmount === null) {
    return { promotionCodeId: null, promoCode: null, discountLabel: null, discountedAmount: originalAmount, promoError: "That promo code is not valid for this currency." }
  }

  return {
    promotionCodeId: promotionCode.id,
    promoCode: promotionCode.code,
    discountLabel: discountLabelFor(coupon),
    discountedAmount,
    promoError: null,
  }
}

function paymentMethodLabel(paymentMethod: Stripe.PaymentMethod | null | undefined) {
  const card = paymentMethod?.card
  if (!card) return null
  const brand = card.brand ? card.brand.charAt(0).toUpperCase() + card.brand.slice(1) : "Card"
  return `${brand} ending ${card.last4}`
}

async function getActiveSubscription(stripe: Stripe, customerId: string) {
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 10,
    expand: ["data.items.data.price", "data.default_payment_method"],
  })
  return subs.data.find((s) => s.status === "active" || s.status === "trialing") ?? null
}

async function resolveUpgradeContext(companyId: string, targetPlan: string) {
  const stripe = getStripe()
  if (!stripe || !companyId || !targetPlan) return { error: "Payments are not ready yet." as const }

  const admin = createAdminClient()
  const { data: company } = await admin
    .from("companies")
    .select("id, stripe_customer_id, slug, is_founding_member, name, email, plan")
    .eq("id", companyId)
    .single()

  if (!company?.stripe_customer_id) return { error: "No active billing account was found." as const }

  const hasIntroRate = !!company.is_founding_member
  const priceId = hasIntroRate ? introPriceId(targetPlan) : regularPriceId(targetPlan)
  if (!priceId) return { error: "That plan is not available yet." as const }

  const [price, sub] = await Promise.all([
    stripe.prices.retrieve(priceId),
    getActiveSubscription(stripe, company.stripe_customer_id),
  ])

  if (!sub) return { error: "No active subscription was found." as const }
  const baseItem = sub.items.data.find((item) => PLAN_PRICE_IDS.has(item.price.id))
  if (!baseItem) return { error: "This subscription needs Found support before it can change plans." as const }

  return { stripe, admin, company, price, sub, baseItem, priceId }
}

export async function previewPlanUpgrade(companyId: string, targetPlan: string, promoCode?: string | null): Promise<UpgradePreview> {
  try {
    const ctx = await resolveUpgradeContext(companyId, targetPlan)
    if ("error" in ctx) return { ok: false, error: ctx.error }

    const promo = await promotionCodeFor(ctx.stripe, ctx.price, promoCode)
    if (promo.promoError) return { ok: false, error: promo.promoError }

    return {
      ok: true,
      companyName: ctx.company.name ?? "Found",
      currentPlan: ctx.company.plan ?? "found",
      targetPlan,
      currency: ctx.price.currency || "usd",
      originalAmount: ctx.price.unit_amount ?? 0,
      discountedAmount: promo.discountedAmount,
      discountLabel: promo.discountLabel,
      promotionCodeId: promo.promotionCodeId,
      promoCode: promo.promoCode,
      nextBillingDate: new Date(ctx.baseItem.current_period_end * 1000).toISOString(),
      paymentMethodLabel: paymentMethodLabel(ctx.sub.default_payment_method as Stripe.PaymentMethod | null),
    }
  } catch (err) {
    console.error("[more] upgrade preview error:", err)
    return { ok: false, error: "Plan upgrade could not be prepared." }
  }
}

export async function confirmPlanUpgrade(companyId: string, targetPlan: string, promoCode?: string | null): Promise<UpgradeResult> {
  try {
    const ctx = await resolveUpgradeContext(companyId, targetPlan)
    if ("error" in ctx) return { ok: false, error: ctx.error }

    const promo = await promotionCodeFor(ctx.stripe, ctx.price, promoCode)
    if (promo.promoError) return { ok: false, error: promo.promoError }

    const updateParams: Stripe.SubscriptionUpdateParams = {
      items: [{ id: ctx.baseItem.id, price: ctx.priceId }],
      proration_behavior: ctx.sub.status === "trialing" ? "none" : "always_invoice",
      payment_behavior: "pending_if_incomplete",
      metadata: {
        ...ctx.sub.metadata,
        company_id: ctx.company.id,
        slug: ctx.company.slug ?? "",
        plan: targetPlan,
      },
      expand: ["latest_invoice.payment_intent"],
    }

    if (promo.promotionCodeId) updateParams.discounts = [{ promotion_code: promo.promotionCodeId }]

    const subscription = await ctx.stripe.subscriptions.update(ctx.sub.id, updateParams)
    const latestInvoice = typeof subscription.latest_invoice === "string" ? null : subscription.latest_invoice
    const invoiceWithPaymentIntent = latestInvoice as (Stripe.Invoice & { payment_intent?: string | Stripe.PaymentIntent | null }) | null
    const paymentIntent: Stripe.PaymentIntent | null = invoiceWithPaymentIntent && typeof invoiceWithPaymentIntent.payment_intent !== "string" ? invoiceWithPaymentIntent.payment_intent ?? null : null

    if (paymentIntent && ["requires_action", "requires_payment_method", "requires_confirmation"].includes(paymentIntent.status)) {
      return { ok: false, requiresAction: true, hostedInvoiceUrl: latestInvoice?.hosted_invoice_url ?? null, error: "Stripe needs one more payment step." }
    }

    return { ok: true }
  } catch (err) {
    console.error("[more] custom plan upgrade error:", err)
    return { ok: false, error: "Plan upgrade could not be completed." }
  }
}

// Opens Stripe Customer Portal — handles cancel, update payment method
export async function openBillingPortal(formData: FormData) {
  const companyId = formData.get("companyId") as string
  const stripe = getStripe()
  if (!stripe || !companyId) return

  const admin = createAdminClient()
  const { data } = await admin
    .from("companies")
    .select("stripe_customer_id")
    .eq("id", companyId)
    .single()

  if (!data?.stripe_customer_id) return

  const session = await stripe.billingPortal.sessions.create({
    customer: data.stripe_customer_id,
    return_url: `${APP_BASE}/more`,
  })

  redirect(session.url)
}

// Opens Stripe's hosted upgrade confirmation. Stripe must remain the source of
// truth for plan changes; Supabase is updated only by subscription webhooks.
export async function startUpgradeCheckout(formData: FormData) {
  const companyId = formData.get("companyId") as string
  const targetPlan = formData.get("targetPlan") as string
  const stripe = getStripe()
  if (!stripe || !companyId || !targetPlan) return

  const admin = createAdminClient()
  const { data: company } = await admin
    .from("companies")
    .select("stripe_customer_id, slug, is_founding_member, name, email")
    .eq("id", companyId)
    .single()

  if (!company) return

  const hasIntroRate = !!company.is_founding_member
  const priceId = hasIntroRate ? introPriceId(targetPlan) : regularPriceId(targetPlan)
  if (!priceId) return

  if (company.stripe_customer_id) {
    const subs = await stripe.subscriptions.list({
      customer: company.stripe_customer_id,
      status: "all",
      limit: 10,
      expand: ["data.items.data.price"],
    })

    const sub = subs.data.find((s) => s.status === "active" || s.status === "trialing")
    if (sub) {
      const baseItem = sub.items.data.find((item) => PLAN_PRICE_IDS.has(item.price.id))
      if (!baseItem) redirect("/more?billing_update=1")

      const hasAddonItems = sub.items.data.some((item) => item.id !== baseItem.id)
      const flowData = hasAddonItems ? undefined : {
        type: "subscription_update_confirm" as const,
        subscription_update_confirm: {
          subscription: sub.id,
          items: [{ id: baseItem.id, price: priceId }],
        },
        after_completion: {
          type: "redirect" as const,
          redirect: { return_url: `${APP_BASE}/more?billing_update=1` },
        },
      }

      let sessionUrl: string | null = null
      try {
        const configuration = await getUpgradePortalConfiguration(stripe, priceId)
        const session = await stripe.billingPortal.sessions.create({
          customer: company.stripe_customer_id,
          return_url: `${APP_BASE}/more`,
          configuration,
          ...(flowData ? { flow_data: flowData } : {}),
        })
        sessionUrl = session.url
      } catch (err) {
        console.error("[more] upgrade portal session error:", err)
      }

      if (!sessionUrl) redirect("/more?billing_update=1")
      redirect(sessionUrl)
    }
  }
  // No active subscription yet. Payment collection happens in Found's branded activation overlay, not Stripe Checkout.
  redirect("/more?activate_required=1")
}
