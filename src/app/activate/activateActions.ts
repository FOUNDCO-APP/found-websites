"use server"

import Stripe from "stripe"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { sendSiteLiveEmailOnce } from "@/lib/activationEmails"

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function setupIntentIdFromSecret(secret: string): string | null {
  return secret.split("_secret_")[0] || null
}

// Stripe env vars still use their original names; product language is intro rate.
function priceIdForPlan(plan: string, intro: boolean): string | undefined {
  if (plan === "found_business") return intro ? process.env.STRIPE_PRICE_ID_FOUND_BUSINESS_FOUNDING : process.env.STRIPE_PRICE_ID_FOUND_BUSINESS
  if (plan === "found_pro") return intro ? process.env.STRIPE_PRICE_ID_FOUND_PRO_FOUNDING : process.env.STRIPE_PRICE_ID_FOUND_PRO
  return intro ? process.env.STRIPE_PRICE_ID_FOUND_FOUNDING : process.env.STRIPE_PRICE_ID_FOUND
}

type PromoSummary = {
  code: string
  promotionCodeId: string
  couponId: string
  couponName: string | null
  discountLabel: string
  originalAmount: number
  discountedAmount: number
  currency: string
  duration: string
}

type ActivationPriceSummary = {
  originalAmount: number
  discountedAmount: number
  currency: string
  promo: PromoSummary | null
}

type ActivationSetupResult = {
  clientSecret: string
  companyName: string
  plan: string | null
  price: ActivationPriceSummary | null
  promoError?: string
}

function normalizePromoCode(code?: string | null) {
  return code?.trim().toUpperCase() || ""
}

function discountLabelFor(coupon: Stripe.Coupon) {
  if (typeof coupon.percent_off === "number") return `${coupon.percent_off}% off`
  if (typeof coupon.amount_off === "number" && coupon.currency) {
    return `${formatCurrency(coupon.amount_off, coupon.currency)} off`
  }
  return coupon.name || "Discount applied"
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: amount % 100 === 0 ? 0 : 2,
  }).format(amount / 100)
}

function discountedAmountFor(amount: number, currency: string, coupon: Stripe.Coupon) {
  if (typeof coupon.percent_off === "number") {
    return Math.max(0, Math.round(amount * (100 - coupon.percent_off) / 100))
  }

  if (typeof coupon.amount_off === "number") {
    if (coupon.currency && coupon.currency.toLowerCase() !== currency.toLowerCase()) return null
    return Math.max(0, amount - coupon.amount_off)
  }

  return amount
}

async function priceSummaryFor(stripe: Stripe, priceId: string, promoCode?: string | null): Promise<{ price: ActivationPriceSummary | null; promoError?: string }> {
  const price = await stripe.prices.retrieve(priceId)
  const originalAmount = price.unit_amount ?? 0
  const currency = price.currency || "usd"
  const normalizedCode = normalizePromoCode(promoCode)

  if (!normalizedCode) {
    return {
      price: { originalAmount, discountedAmount: originalAmount, currency, promo: null },
    }
  }

  const promoCodes = await stripe.promotionCodes.list({
    code: normalizedCode,
    active: true,
    limit: 1,
    expand: ["data.promotion.coupon"],
  })

  const promotionCode = promoCodes.data[0]
  const couponRef = promotionCode?.promotion?.coupon
  const coupon = typeof couponRef === "string" ? await stripe.coupons.retrieve(couponRef) : couponRef

  if (!promotionCode || !coupon || coupon.valid === false) {
    return {
      price: { originalAmount, discountedAmount: originalAmount, currency, promo: null },
      promoError: "That promo code is not active.",
    }
  }

  const productId = typeof price.product === "string" ? price.product : price.product.id
  const allowedProducts = coupon.applies_to?.products ?? []
  if (allowedProducts.length > 0 && !allowedProducts.includes(productId)) {
    return {
      price: { originalAmount, discountedAmount: originalAmount, currency, promo: null },
      promoError: "That promo code is not valid for this plan.",
    }
  }

  const discountedAmount = discountedAmountFor(originalAmount, currency, coupon)
  if (discountedAmount === null) {
    return {
      price: { originalAmount, discountedAmount: originalAmount, currency, promo: null },
      promoError: "That promo code is not valid for this currency.",
    }
  }

  return {
    price: {
      originalAmount,
      discountedAmount,
      currency,
      promo: {
        code: promotionCode.code,
        promotionCodeId: promotionCode.id,
        couponId: coupon.id,
        couponName: coupon.name,
        discountLabel: discountLabelFor(coupon),
        originalAmount,
        discountedAmount,
        currency,
        duration: coupon.duration,
      },
    },
  }
}

export async function createActivationSetup(slug: string, targetPlan?: string | null, targetAddonSlug?: string | null, promoCode?: string | null): Promise<ActivationSetupResult | null> {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("[Activate] Missing STRIPE_SECRET_KEY")
    return null
  }

  const admin = getAdminClient()
  const { data: company } = await admin
    .from("companies")
    .select("id, name, email, stripe_customer_id, pending_setup_intent_secret, plan, subscription_status, is_founding_member")
    .eq("slug", slug)
    .single()

  if (!company) return null
  if ((company as Record<string, unknown>).subscription_status === "active") return null

  const requestedPlan = targetPlan || company.plan || "found"
  const useIntroPrice = !!company.is_founding_member || (company.subscription_status !== "active" && company.subscription_status !== "trialing")
  const priceId = priceIdForPlan(requestedPlan, useIntroPrice)
  if (!priceId) {
    console.error("[Activate] Missing Stripe price for plan", requestedPlan)
    return null
  }

  const normalizedPromoCode = normalizePromoCode(promoCode)
  const existingCustomerId = company.stripe_customer_id as string | null

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const { price, promoError } = await priceSummaryFor(stripe, priceId, normalizedPromoCode)
    const promotionCodeId = price?.promo?.promotionCodeId ?? ""

    // Reuse a pre-created setup intent only if Stripe metadata still matches this exact base plan and promo state.
    if (company.pending_setup_intent_secret && !targetAddonSlug && (!targetPlan || company.plan === requestedPlan) && !promoError) {
      const setupIntentId = setupIntentIdFromSecret(company.pending_setup_intent_secret)
      const existingIntent = setupIntentId ? await stripe.setupIntents.retrieve(setupIntentId) : null
      const matchesCompany = existingIntent?.metadata?.company_id === company.id && existingIntent?.metadata?.slug === slug
      const matchesPlan = existingIntent?.metadata?.plan === requestedPlan
      const matchesIntroPrice = existingIntent?.metadata?.intro_rate === String(useIntroPrice)
      const matchesPromo = (existingIntent?.metadata?.promotion_code_id ?? "") === promotionCodeId
      const hasNoAddon = !existingIntent?.metadata?.addon_slug
      if (existingIntent?.status === "requires_payment_method" && matchesCompany && matchesPlan && matchesIntroPrice && matchesPromo && hasNoAddon) {
        return { clientSecret: company.pending_setup_intent_secret, companyName: company.name, plan: requestedPlan, price, promoError }
      }
    }

    const customer = existingCustomerId
      ? { id: existingCustomerId }
      : await stripe.customers.create({
          name: company.name,
          email: company.email ?? undefined,
          metadata: { company_id: company.id, slug },
        })

    const promoMetadata = price?.promo ? {
      promotion_code_id: price.promo.promotionCodeId,
      promotion_code: price.promo.code,
      coupon_id: price.promo.couponId,
      discount_label: price.promo.discountLabel,
    } : {
      promotion_code_id: "",
      promotion_code: "",
      coupon_id: "",
      discount_label: "",
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ["card", "link"],
      usage: "off_session",
      metadata: {
        company_id: company.id,
        slug,
        plan: requestedPlan,
        price_id: priceId,
        intro_rate: String(useIntroPrice),
        addon_slug: targetAddonSlug ?? "",
        ...promoMetadata,
      },
    })

    if (!setupIntent.client_secret) {
      console.error("[Activate] SetupIntent created but no client_secret")
      return null
    }

    const companyUpdate: Record<string, string | null> = {
      stripe_customer_id: customer.id,
    }

    if (!targetAddonSlug) {
      companyUpdate.pending_setup_intent_secret = setupIntent.client_secret
      companyUpdate.plan = requestedPlan
    }

    await admin
      .from("companies")
      .update(companyUpdate)
      .eq("slug", slug)

    return { clientSecret: setupIntent.client_secret, companyName: company.name, plan: requestedPlan, price, promoError }
  } catch (err) {
    console.error("[Activate] createActivationSetup failed:", err)
    return null
  }
}

// Skips Stripe entirely - for Shawn activating a business as a comp (demos,
// networking, commercial recordings). Re-checks the admin cookie itself
// server-side rather than trusting a client-passed flag; the httpOnly
// admin_key cookie is sent automatically with this request even though
// client JS can never read its value.
export async function activateAsComp(slug: string, plan?: string | null): Promise<boolean> {
  const cookieStore = await cookies()
  const adminKey = cookieStore.get("admin_key")?.value
  if (!adminKey || !process.env.ADMIN_KEY || adminKey !== process.env.ADMIN_KEY) return false

  const admin = getAdminClient()
  const { data: company } = await admin.from("companies").select("id, plan").eq("slug", slug).single()
  if (!company) return false

  await admin
    .from("companies")
    .update({
      subscription_status: "active",
      is_comp: true,
      pending_setup_intent_secret: null,
      plan: plan || company.plan || "found",
    })
    .eq("slug", slug)

  return true
}

async function updateCompanyAfterActivation(admin: ReturnType<typeof getAdminClient>, slug: string, companyUpdate: Record<string, string | boolean | null>) {
  const { error } = await admin
    .from("companies")
    .update(companyUpdate)
    .eq("slug", slug)

  if (!error) return

  const fallbackUpdate = { ...companyUpdate }
  delete fallbackUpdate.applied_promotion_code_id
  delete fallbackUpdate.applied_promotion_code
  delete fallbackUpdate.applied_coupon_id
  delete fallbackUpdate.applied_discount_label

  const { error: fallbackError } = await admin
    .from("companies")
    .update(fallbackUpdate)
    .eq("slug", slug)

  if (fallbackError) throw fallbackError
  console.warn("[Activate] Promo audit columns missing; activation saved without local promo audit fields.", error.message)
}

export async function confirmActivation(slug: string, setupIntentId: string): Promise<{ ok: boolean; companyId?: string; authLink?: string | null }> {
  if (!process.env.STRIPE_SECRET_KEY) return { ok: false }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId)
    const admin = getAdminClient()
    const companyId = setupIntent.metadata?.company_id
    const intentSlug = setupIntent.metadata?.slug

    if (!companyId || !intentSlug || intentSlug !== slug) {
      console.error("[Activate] SetupIntent metadata does not match activation slug", { slug, intentSlug, companyId })
      return { ok: false }
    }

    const { data: company } = await admin
      .from("companies")
      .select("id, slug, user_id")
      .eq("id", companyId)
      .eq("slug", slug)
      .maybeSingle()

    if (!company) {
      console.error("[Activate] No company matches paid SetupIntent", { slug, companyId })
      return { ok: false }
    }

    const customerId = typeof setupIntent.customer === "string"
      ? setupIntent.customer
      : (setupIntent.customer as Stripe.Customer | null)?.id

    const paymentMethodId = typeof setupIntent.payment_method === "string"
      ? setupIntent.payment_method
      : (setupIntent.payment_method as Stripe.PaymentMethod | null)?.id

    if (!customerId || !paymentMethodId) return { ok: false }

    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    })

    const plan = setupIntent.metadata?.plan ?? "found"
    const priceId = setupIntent.metadata?.price_id ?? priceIdForPlan(plan, true)
    if (!priceId) return { ok: false }

    const subscriptionParams: Stripe.SubscriptionCreateParams = {
      customer: customerId,
      items: [{ price: priceId }],
      default_payment_method: paymentMethodId,
      metadata: { company_id: companyId, slug, plan },
    }

    if (setupIntent.metadata?.promotion_code_id) {
      subscriptionParams.discounts = [{ promotion_code: setupIntent.metadata.promotion_code_id }]
      subscriptionParams.metadata = {
        ...subscriptionParams.metadata,
        promotion_code_id: setupIntent.metadata.promotion_code_id,
        promotion_code: setupIntent.metadata.promotion_code ?? "",
        coupon_id: setupIntent.metadata.coupon_id ?? "",
      }
    }

    const subscription = await stripe.subscriptions.create(subscriptionParams)

    const addonSlug = setupIntent.metadata?.addon_slug

    if (addonSlug) {
      const { data: priceRow } = await admin
        .from("addon_stripe_prices")
        .select("stripe_price_id")
        .eq("addon_slug", addonSlug)
        .single()

      if (priceRow?.stripe_price_id) {
        const item = await stripe.subscriptionItems.create({
          subscription: subscription.id,
          price: priceRow.stripe_price_id,
          quantity: 1,
        })
        await admin.from("addon_subscriptions").upsert({
          company_id: companyId,
          addon_slug: addonSlug,
          stripe_subscription_item_id: item.id,
          active: true,
        }, { onConflict: "company_id,addon_slug" })
      }
    }

    const companyUpdate: Record<string, string | boolean | null> = {
      subscription_status: "active",
      pending_setup_intent_secret: null,
      plan,
    }
    if (setupIntent.metadata?.intro_rate === "true") companyUpdate.is_founding_member = true
    if (setupIntent.metadata?.promotion_code_id) {
      companyUpdate.applied_promotion_code_id = setupIntent.metadata.promotion_code_id
      companyUpdate.applied_promotion_code = setupIntent.metadata.promotion_code ?? null
      companyUpdate.applied_coupon_id = setupIntent.metadata.coupon_id ?? null
      companyUpdate.applied_discount_label = setupIntent.metadata.discount_label ?? null
    }

    await updateCompanyAfterActivation(admin, slug, companyUpdate)

    await sendSiteLiveEmailOnce(admin as any, companyId).catch((err) => {
      console.error("[Activate] site-live email failed:", err)
    })

    // A brand-new owner who just paid should land straight in their dashboard,
    // not a bare /login screen. Generate a one-time sign-in link the same way
    // the existing email-login flow does, and hand it back so the redirect
    // response can carry the owner's browser straight through it.
    let authLink: string | null = null
    if (company.user_id) {
      try {
        const { data: userData } = await admin.auth.admin.getUserById(company.user_id)
        const ownerEmail = userData?.user?.email
        if (ownerEmail) {
          const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"
          const next = `/api/select-company?id=${encodeURIComponent(companyId)}&activated=true`
          const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
            type: "magiclink",
            email: ownerEmail,
            options: { redirectTo: `https://my.${rootDomain}/auth/callback?next=${encodeURIComponent(next)}` },
          })
          if (linkError) {
            console.error("[Activate] generateLink error:", linkError.message)
          } else {
            authLink = linkData?.properties?.action_link ?? null
          }
        }
      } catch (err) {
        console.error("[Activate] auth link generation failed:", err)
      }
    }

    return { ok: true, companyId, authLink }
  } catch (err) {
    console.error("[Activate] confirmActivation failed:", err)
    return { ok: false }
  }
}
