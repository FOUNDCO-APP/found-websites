"use server"

import Stripe from "stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import { ensureDefaultAvailability } from "@/lib/bookings/ensureDefaultAvailability"
import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany, requireOwnerAccess } from "@/lib/dashboard/getCompany"
import { recordCustomerActivity } from "@/lib/customerActivity"
import { ALL_ADDONS } from "@/lib/featureAccess"
import { recordBillingPlanEvent } from "@/lib/billingPlanEvents"

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"
const APP_BASE = `https://my.${ROOT_DOMAIN}`
const KNOWN_ADDON_SLUGS = new Set<string>(ALL_ADDONS.map(a => a.slug))

// Every action below mutates billing/subscription state for a companyId
// the caller supplies directly - without this, any authenticated user
// (owner of a different company, or a camera-only worker) could act on a
// company that isn't theirs just by knowing or guessing its id. Found
// 2026-08-09 during the worker-role security audit; this gap predates
// the worker feature entirely - it's a general cross-tenant hole that
// happened to surface while auditing worker boundaries.
async function requireCompanyOwner(companyId: string): Promise<boolean> {
  if (!companyId) return false
  const user = await getAuthUser()
  if (!user) return false
  const company = await getCompany(user.id, user.email ?? "")
  if (!company || company.id !== companyId) return false
  return requireOwnerAccess(user.id, user.email ?? "", company)
}
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
  if (!error && addonSlug === "reservation_calendar") await ensureDefaultAvailability(companyId)
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

async function getFoundBillingPortalConfiguration(stripe: Stripe) {
  const existing = await stripe.billingPortal.configurations.list({ active: true, limit: 100 })
  const reusable = existing.data.find((config) =>
    config.metadata?.found_config === "billing_secure_tasks_v1"
  )
  if (reusable) return reusable.id

  const configuration = await stripe.billingPortal.configurations.create({
    business_profile: {
      headline: "Secure Found billing",
    },
    features: {
      customer_update: {
        enabled: true,
        allowed_updates: ["email", "address", "phone"],
      },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: false },
      subscription_update: { enabled: false },
    },
    metadata: {
      found_config: "billing_secure_tasks_v1",
    },
  })

  return configuration.id
}

export async function purchaseAddon(companyId: string, addonSlug: string): Promise<{ success: boolean; error?: string }> {
  if (!(await requireCompanyOwner(companyId))) return { success: false, error: "Not authorized." }
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
    await recordCustomerActivity({
      eventType: existingItem ? "addon_reactivated" : "addon_purchased",
      pathname: "/dashboard/more",
      metadata: { addon_slug: addonSlug, stripe_subscription_item_id: itemId },
    })
    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// The Found Pro plan's one free/included pick - a plain column, not a
// Stripe subscription item, so switching it is instant and never touches
// billing. Picking a new one always replaces the old one; that's the
// data shape's job, not extra logic here.
export async function switchIncludedAddon(companyId: string, addonSlug: string | null): Promise<{ success: boolean; error?: string }> {
  if (!companyId) return { success: false, error: "Missing company." }
  if (!(await requireCompanyOwner(companyId))) return { success: false, error: "Not authorized." }
  const admin = createAdminClient()
  const { data: company } = await admin.from("companies").select("plan").eq("id", companyId).single()
  if (!company || company.plan !== "found_pro") return { success: false, error: "Not available on this plan." }
  const { error } = await admin.from("companies").update({ included_addon_slug: addonSlug }).eq("id", companyId)
  if (error) return { success: false, error: error.message }
  if (addonSlug === "reservation_calendar") await ensureDefaultAvailability(companyId)
  await recordCustomerActivity({
    eventType: "included_addon_switched",
    pathname: "/dashboard/more",
    metadata: { addon_slug: addonSlug },
  })
  return { success: true }
}

// A pure site-visibility toggle, separate from billing - lives in Edit
// Website, not Billing, because it answers "does this show on my site,"
// not "am I paying for this." Works the same way regardless of why an
// add-on is active (bundled free with Business, Pro's one free pick, or a
// real paid purchase): disabled_addons is the existing column that already
// gates every access check (getEffectiveAddons and everything downstream
// of it), but until 2026-08-16 nothing ever wrote to it. Confirmed live
// that day: MBJ Heating and Cooling (HVAC, Found Business) had a dead
// "Shop" link in its public nav with no way to remove it. Hiding a PAID
// add-on here does not cancel the charge - the panel that calls this shows
// a warning and a link to Billing for that, kept as a deliberately
// separate action so "hide from my site" never silently changes what
// someone is being billed for.
export async function toggleAddonVisibility(companyId: string, addonSlug: string, hide: boolean): Promise<{ success: boolean; error?: string }> {
  if (!companyId || !addonSlug) return { success: false, error: "Missing required fields." }
  if (!(await requireCompanyOwner(companyId))) return { success: false, error: "Not authorized." }
  if (!KNOWN_ADDON_SLUGS.has(addonSlug)) return { success: false, error: "Not a recognized feature." }

  const admin = createAdminClient()
  const { data: company } = await admin.from("companies").select("disabled_addons").eq("id", companyId).single()
  if (!company) return { success: false, error: "Company not found." }

  const current = new Set((company.disabled_addons ?? []) as string[])
  if (hide) current.add(addonSlug); else current.delete(addonSlug)

  const { error } = await admin.from("companies").update({ disabled_addons: Array.from(current) }).eq("id", companyId)
  if (error) return { success: false, error: error.message }
  await recordCustomerActivity({
    eventType: hide ? "addon_hidden_from_site" : "addon_shown_on_site",
    pathname: "/dashboard/more",
    metadata: { addon_slug: addonSlug },
  })
  return { success: true }
}

export async function startAddonCheckout(formData: FormData) {
  const companyId = formData.get("companyId") as string
  const addonSlug = formData.get("addonSlug") as string
  if (!(await requireCompanyOwner(companyId))) redirect("/billing?addon_unavailable=1")
  const stripe = getStripe()
  if (!stripe || !companyId || !addonSlug) redirect("/billing?addon_unavailable=1")

  const admin = createAdminClient()

  const [{ data: company }, { data: priceRow }] = await Promise.all([
    admin.from("companies").select("stripe_customer_id, name, email").eq("id", companyId).single(),
    admin.from("addon_stripe_prices").select("stripe_price_id").eq("addon_slug", addonSlug).single(),
  ])

  if (!company || !priceRow?.stripe_price_id) redirect("/billing?addon_unavailable=1")

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
  if (!sub) redirect("/billing?activate_required=1")

  const existingItem = sub.items.data.find((item) =>
    item.price.id === priceRow.stripe_price_id ||
    item.price.metadata?.addon_slug === addonSlug ||
    item.plan?.metadata?.addon_slug === addonSlug
  )

  if (existingItem) {
    await markAddonActive(admin, companyId, addonSlug, existingItem.id)
    await recordCustomerActivity({
      eventType: "addon_reactivated",
      pathname: "/dashboard/more",
      metadata: { addon_slug: addonSlug, stripe_subscription_item_id: existingItem.id },
    })
    redirect(`/billing?addon_added=${addonSlug}`)
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

  if (stripeError || !addedItemId) redirect("/billing?addon_unavailable=1")

  await markAddonActive(admin, companyId, addonSlug, addedItemId!)
  await recordCustomerActivity({
    eventType: "addon_purchased",
    pathname: "/dashboard/more",
    metadata: { addon_slug: addonSlug, stripe_subscription_item_id: addedItemId },
  })
  redirect(`/billing?addon_added=${addonSlug}`)
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
  if (!(await requireCompanyOwner(companyId))) return { error: "Not authorized." as const }
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

    const subscriptionWithPeriod = subscription as Stripe.Subscription & { current_period_end?: number }
    const effectiveAt = new Date(((subscriptionWithPeriod.current_period_end ?? Math.floor(Date.now() / 1000)) * 1000)).toISOString()
    await recordBillingPlanEvent(ctx.admin, {
      company_id: ctx.company.id,
      event_type: "customer_plan_change_requested",
      source: "dashboard_billing",
      actor_type: "customer",
      actor_email: ctx.company.email ?? null,
      old_plan: ctx.company.plan ?? null,
      new_plan: targetPlan,
      old_subscription_status: ctx.sub.status,
      new_subscription_status: subscription.status,
      stripe_customer_id: ctx.company.stripe_customer_id ?? null,
      stripe_subscription_id: subscription.id,
      stripe_price_id: ctx.priceId,
      amount_cents: ctx.price.unit_amount ?? null,
      currency: ctx.price.currency ?? "usd",
      effective_at: effectiveAt,
      note: `Customer requested plan change from ${ctx.company.plan ?? "unknown"} to ${targetPlan}. Stripe webhook remains source of truth for final sync.`,
      metadata: {
        promotion_code: promo.promoCode ?? null,
        discount_label: promo.discountLabel ?? null,
        proration_behavior: updateParams.proration_behavior,
        stripe_subscription_status: subscription.status,
        current_period_end: effectiveAt,
      },
    })

    if (paymentIntent && ["requires_action", "requires_payment_method", "requires_confirmation"].includes(paymentIntent.status)) {
      return { ok: false, requiresAction: true, hostedInvoiceUrl: latestInvoice?.hosted_invoice_url ?? null, error: "Stripe needs one more payment step." }
    }

    const companyUpdate: Record<string, string> = {
      plan: targetPlan,
      subscription_status: subscription.status,
    }
    if (subscription.status === "active" || subscription.status === "trialing") {
      companyUpdate.client_state = "active"
    }
    const { error: companyUpdateError } = await ctx.admin
      .from("companies")
      .update(companyUpdate)
      .eq("id", ctx.company.id)
    if (companyUpdateError) {
      console.error("[more] immediate plan sync failed:", companyUpdateError.message)
    }

    await recordCustomerActivity({
      eventType: "plan_upgrade_confirmed",
      pathname: "/dashboard/billing",
      metadata: {
        old_plan: ctx.company.plan ?? null,
        new_plan: targetPlan,
        stripe_subscription_status: subscription.status,
        promotion_code: promo.promoCode ?? null,
      },
    })
    return { ok: true }
  } catch (err) {
    console.error("[more] custom plan upgrade error:", err)
    return { ok: false, error: "Plan upgrade could not be completed." }
  }
}

// Opens a restricted Stripe-hosted page for secure billing tasks only. Found
// owns the billing experience; Stripe still handles card entry and invoices.
export async function openBillingPortal(formData: FormData) {
  const companyId = formData.get("companyId") as string
  const task = formData.get("task") as string | null
  if (!(await requireCompanyOwner(companyId))) return
  const stripe = getStripe()
  if (!stripe || !companyId) return

  const admin = createAdminClient()
  const { data } = await admin
    .from("companies")
    .select("stripe_customer_id")
    .eq("id", companyId)
    .single()

  if (!data?.stripe_customer_id) return

  const configuration = await getFoundBillingPortalConfiguration(stripe)
  const flowData = task === "payment_method"
    ? {
        type: "payment_method_update" as const,
        after_completion: {
          type: "redirect" as const,
          redirect: { return_url: `${APP_BASE}/billing?billing_task=card` },
        },
      }
    : undefined

  const session = await stripe.billingPortal.sessions.create({
    customer: data.stripe_customer_id,
    return_url: `${APP_BASE}/billing`,
    configuration,
    ...(flowData ? { flow_data: flowData } : {}),
  })

  await recordCustomerActivity({
    eventType: task === "payment_method" ? "billing_card_update_opened" : "billing_invoices_opened",
    pathname: "/dashboard/billing",
    metadata: { task: task ?? "billing_tasks" },
  })
  redirect(session.url)
}

// Opens Stripe's hosted upgrade confirmation. Stripe must remain the source of
// truth for plan changes; Supabase is updated only by subscription webhooks.
export async function startUpgradeCheckout(formData: FormData) {
  const companyId = formData.get("companyId") as string
  const targetPlan = formData.get("targetPlan") as string
  if (!(await requireCompanyOwner(companyId))) return
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
      if (!baseItem) redirect("/billing?billing_update=1")

      const hasAddonItems = sub.items.data.some((item) => item.id !== baseItem.id)
      const flowData = hasAddonItems ? undefined : {
        type: "subscription_update_confirm" as const,
        subscription_update_confirm: {
          subscription: sub.id,
          items: [{ id: baseItem.id, price: priceId }],
        },
        after_completion: {
          type: "redirect" as const,
          redirect: { return_url: `${APP_BASE}/billing?billing_update=1` },
        },
      }

      let sessionUrl: string | null = null
      try {
        const configuration = await getUpgradePortalConfiguration(stripe, priceId)
        const session = await stripe.billingPortal.sessions.create({
          customer: company.stripe_customer_id,
          return_url: `${APP_BASE}/billing`,
          configuration,
          ...(flowData ? { flow_data: flowData } : {}),
        })
        sessionUrl = session.url
      } catch (err) {
        console.error("[more] upgrade portal session error:", err)
      }

      if (!sessionUrl) redirect("/billing?billing_update=1")
      await recordCustomerActivity({
        eventType: "plan_upgrade_started",
        pathname: "/dashboard/billing",
        metadata: { target_plan: targetPlan },
      })
      redirect(sessionUrl)
    }
  }
  // No active subscription yet. Payment collection happens in Found's branded activation overlay, not Stripe Checkout.
  redirect("/billing?activate_required=1")
}
