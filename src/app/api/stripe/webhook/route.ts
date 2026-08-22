import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { ensureDefaultAvailability } from "@/lib/bookings/ensureDefaultAvailability"
import { captureFoundActivationCompleted } from "@/lib/foundFunnelServer"
import { sendTrackedEmail } from "@/lib/emailLog"
import { recordBillingPlanEvent } from "@/lib/billingPlanEvents"

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const PLAN_PRICE_IDS = new Set([
  process.env.STRIPE_PRICE_ID_FOUND,
  process.env.STRIPE_PRICE_ID_FOUND_FOUNDING,
  process.env.STRIPE_PRICE_ID_FOUND_PRO,
  process.env.STRIPE_PRICE_ID_FOUND_PRO_FOUNDING,
  process.env.STRIPE_PRICE_ID_FOUND_BUSINESS,
  process.env.STRIPE_PRICE_ID_FOUND_BUSINESS_FOUNDING,
].filter(Boolean) as string[])

const PLAN_SLUGS = new Set(["found", "found_pro", "found_business"])

function normalizePlanSlug(value: string | null | undefined): string | null {
  if (!value) return null
  const normalized = value.trim().toLowerCase().replace(/-/g, "_")
  if (normalized === "starter" || normalized === "found_starter" || normalized === "found_foundation") return "found"
  if (normalized === "pro") return "found_pro"
  if (normalized === "business") return "found_business"
  return PLAN_SLUGS.has(normalized) ? normalized : null
}

function planFromPriceId(priceId: string): string | null {
  const map: Record<string, string> = {
    [process.env.STRIPE_PRICE_ID_FOUND || ""]: "found",
    [process.env.STRIPE_PRICE_ID_FOUND_FOUNDING || ""]: "found",
    [process.env.STRIPE_PRICE_ID_FOUND_PRO || ""]: "found_pro",
    [process.env.STRIPE_PRICE_ID_FOUND_PRO_FOUNDING || ""]: "found_pro",
    [process.env.STRIPE_PRICE_ID_FOUND_BUSINESS || ""]: "found_business",
    [process.env.STRIPE_PRICE_ID_FOUND_BUSINESS_FOUNDING || ""]: "found_business",
  }
  return map[priceId] ?? null
}

function planFromSubscriptionItem(item: Stripe.SubscriptionItem): string | null {
  return (
    planFromPriceId(item.price.id) ||
    normalizePlanSlug(item.price.metadata?.plan) ||
    normalizePlanSlug(item.price.lookup_key) ||
    normalizePlanSlug(item.price.nickname)
  )
}

function planMonthlyValue(plan: string | null | undefined) {
  if (plan === "found_business") return 69
  if (plan === "found_pro") return 39
  return 29
}

function stripeUnixToIso(value: number | null | undefined): string | null {
  return typeof value === "number" ? new Date(value * 1000).toISOString() : null
}

function planLabelForAudit(value: string | null | undefined): string {
  if (value === "found_business") return "Found Business"
  if (value === "found_pro") return "Found Pro"
  if (value === "found") return "Found Starter"
  return value || "unknown"
}

function addonSlugForItem(item: Stripe.SubscriptionItem): string | null {
  return item.price.metadata?.addon_slug || item.plan?.metadata?.addon_slug || null
}

async function companyIdForSubscription(
  supabase: ReturnType<typeof getAdminClient>,
  sub: Stripe.Subscription,
  customerId: string,
): Promise<string | null> {
  if (sub.metadata?.company_id) return sub.metadata.company_id

  const { data } = await supabase
    .from("companies")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle()

  return data?.id ?? null
}

async function syncSubscriptionToSupabase(
  supabase: ReturnType<typeof getAdminClient>,
  sub: Stripe.Subscription,
) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id
  const companyId = await companyIdForSubscription(supabase, sub, customerId)
  const baseItem = sub.items.data.find((item) => PLAN_PRICE_IDS.has(item.price.id) || Boolean(planFromSubscriptionItem(item)))
  const plan = baseItem ? planFromSubscriptionItem(baseItem) : normalizePlanSlug(sub.metadata?.plan)
  const isActivatedStatus = sub.status === "active" || sub.status === "trialing"

  const update: Record<string, string> = { subscription_status: sub.status }
  if (plan) update.plan = plan

  // Auto-promote onboarding -> active the moment billing genuinely goes
  // live, instead of requiring Shawn to remember to flip this by hand -
  // the same manual-classification trap that left a real paying client
  // silently stuck reading "onboarding" indefinitely. Test accounts are
  // untouched; comp/past_due/cancelled states aren't overwritten - this
  // only ever moves a real client out of "onboarding," nothing else.
  let shouldCaptureActivation = false
  let activationSlug = sub.metadata?.slug ?? null
  let currentCompany: {
    slug: string | null
    plan: string | null
    subscription_status: string | null
    client_state: string | null
    account_kind: string | null
  } | null = null

  if (companyId) {
    const { data: current } = await supabase
      .from("companies")
      .select("slug, plan, subscription_status, client_state, account_kind")
      .eq("id", companyId)
      .maybeSingle()
    currentCompany = current ?? null
  }

  if (isActivatedStatus && companyId) {
    const current = currentCompany
    shouldCaptureActivation = !["active", "trialing"].includes(String(current?.subscription_status ?? ""))
    activationSlug = activationSlug ?? current?.slug ?? null
    if (current?.account_kind === "client" && current?.client_state === "onboarding") {
      update.client_state = "active"
    }
  }

  let companyQuery = supabase.from("companies").update(update)
  if (companyId) {
    companyQuery = companyQuery.eq("id", companyId)
  } else {
    companyQuery = companyQuery.eq("stripe_customer_id", customerId)
  }
  await companyQuery

  if (!companyId) return

  const oldPlan = currentCompany?.plan ?? null
  const newPlan = plan ?? oldPlan
  const oldStatus = currentCompany?.subscription_status ?? null
  const newStatus = sub.status
  if (oldPlan !== newPlan || oldStatus !== newStatus) {
    const price = baseItem?.price
    const currentPeriodEnd = (sub as Stripe.Subscription & { current_period_end?: number }).current_period_end
    await recordBillingPlanEvent(supabase, {
      company_id: companyId,
      event_type: "stripe_subscription_synced",
      source: "stripe_webhook",
      actor_type: "stripe",
      old_plan: oldPlan,
      new_plan: newPlan,
      old_subscription_status: oldStatus,
      new_subscription_status: newStatus,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      stripe_price_id: price?.id ?? null,
      amount_cents: price?.unit_amount ?? null,
      currency: price?.currency ?? "usd",
      effective_at: stripeUnixToIso(currentPeriodEnd) ?? stripeUnixToIso(sub.trial_end),
      note: `Stripe synced ${planLabelForAudit(oldPlan)} to ${planLabelForAudit(newPlan)}; status ${oldStatus || "unknown"} to ${newStatus}.`,
      metadata: {
        subscription_metadata_plan: sub.metadata?.plan ?? null,
        subscription_status: sub.status,
      },
    })
  }

  if (shouldCaptureActivation) {
    await captureFoundActivationCompleted({
      company_id: companyId,
      slug: activationSlug,
      plan_name: plan ?? sub.metadata?.plan ?? null,
      method: "stripe_webhook",
      value: planMonthlyValue(plan ?? sub.metadata?.plan),
      currency: "USD",
    })
  }

  const activeAddonRows = sub.items.data
    .map((item) => ({ item, addonSlug: addonSlugForItem(item) }))
    .filter((row): row is { item: Stripe.SubscriptionItem; addonSlug: string } => Boolean(row.addonSlug))

  if (activeAddonRows.length > 0) {
    await supabase.from("addon_subscriptions").upsert(
      activeAddonRows.map(({ item, addonSlug }) => ({
        company_id: companyId,
        addon_slug: addonSlug,
        stripe_subscription_item_id: item.id,
        active: true,
      })),
      { onConflict: "company_id,addon_slug" },
    )
    if (activeAddonRows.some(row => row.addonSlug === "reservation_calendar")) {
      await ensureDefaultAvailability(companyId)
    }
  }

  const { data: existingRows } = await supabase
    .from("addon_subscriptions")
    .select("addon_slug")
    .eq("company_id", companyId)
    .eq("active", true)

  const activeSlugs = new Set(activeAddonRows.map((row) => row.addonSlug))
  await Promise.all((existingRows ?? [])
    .filter((row: { addon_slug: string }) => !activeSlugs.has(row.addon_slug))
    .map((row: { addon_slug: string }) => supabase
      .from("addon_subscriptions")
      .update({ active: false })
      .eq("company_id", companyId)
      .eq("addon_slug", row.addon_slug)))
}

function formatOrderTotal(cents: unknown) {
  const amount = typeof cents === "number" ? cents : Number(cents || 0)
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount / 100)
}

async function handleOnlineOrderCheckout(
  supabase: ReturnType<typeof getAdminClient>,
  session: Stripe.Checkout.Session,
) {
  const companyId = session.metadata?.company_id
  const leadId = session.metadata?.lead_id
  if (!companyId || !leadId) return

  const { data: lead } = await supabase
    .from("leads")
    .select("id, name, email, phone, message, partial_answers")
    .eq("id", leadId)
    .eq("company_id", companyId)
    .maybeSingle()

  const existingAnswers = (lead?.partial_answers ?? {}) as Record<string, unknown>
  await supabase
    .from("leads")
    .update({
      partial_answers: {
        ...existingAnswers,
        payment_status: "paid",
        stripe_session_id: session.id,
        stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
        paid_at: new Date().toISOString(),
      },
    })
    .eq("id", leadId)

  const { data: company } = await supabase
    .from("companies")
    .select("name, email, lead_email, phone")
    .eq("id", companyId)
    .maybeSingle()

  const ownerEmail = company?.lead_email || company?.email
  if (!ownerEmail || !lead || !process.env.RESEND_API_KEY) return

  const total = formatOrderTotal(existingAnswers.subtotal_cents)
  await sendTrackedEmail({
    from: "Found <hello@foundco.app>",
    to: ownerEmail,
    subject: `Paid online order: ${lead.name || "Customer"} - ${total}`,
    html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;"><tr><td align="center"><table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;"><tr><td style="background:#111111;padding:32px;text-align:center;"><p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#888888;">Paid Online Order</p><h1 style="margin:0;font-size:22px;font-weight:900;color:#ffffff;">${company?.name || "Found"}</h1></td></tr><tr><td style="padding:36px 32px;"><p style="margin:0 0 20px;font-size:18px;font-weight:900;color:#111111;">${total} paid</p><p style="margin:0 0 14px;font-size:15px;color:#333333;line-height:1.6;white-space:pre-wrap;">${lead.message || "New online order"}</p><table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:12px;padding:20px;margin-top:20px;"><tr><td><p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999999;">Customer</p><p style="margin:0;font-size:16px;font-weight:800;color:#111111;">${lead.name || "Customer"}</p></td></tr><tr><td style="padding-top:14px;"><p style="margin:0;font-size:14px;color:#333333;">${lead.phone || ""}${lead.email ? ` &middot; ${lead.email}` : ""}</p></td></tr></table></td></tr></table></td></tr></table></body></html>`,
    text: `Paid online order: ${lead.name || "Customer"} - ${total}\n${lead.phone || ""}${lead.email ? ` / ${lead.email}` : ""}`,
    companyId,
    recipientType: "client_owner",
    emailType: "online_order_notification_webhook",
    source: "api/stripe/webhook/handleOnlineOrderCheckout",
    admin: supabase,
  })
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature")
  // Multiple Stripe event destinations point at this same URL: the platform's
  // own account (subscriptions/plan activation), Connected accounts in test
  // mode, and Connected accounts in live mode (estimate/order deposit
  // payments). Each Stripe endpoint signs with its own secret, so try all
  // rather than assuming one.
  const webhookSecrets = [
    process.env.STRIPE_WEBHOOK_SECRET,
    process.env.STRIPE_WEBHOOK_SECRET_CONNECT,
    process.env.STRIPE_WEBHOOK_SECRET_CONNECT_LIVE,
  ].filter((s): s is string => Boolean(s))

  if (!sig || webhookSecrets.length === 0 || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Not configured" }, { status: 400 })
  }

  const body = await req.text()
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  let event: Stripe.Event | null = null
  for (const secret of webhookSecrets) {
    try {
      event = stripe.webhooks.constructEvent(body, sig, secret)
      break
    } catch {
      // try the next secret
    }
  }
  if (!event) {
    console.error("[Stripe webhook] signature verification failed against all configured secrets")
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const supabase = getAdminClient()

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent
    if (pi.metadata?.kind === "estimate_deposit" && pi.metadata?.estimate_id) {
      const estimateId = pi.metadata.estimate_id
      const { data: estimate } = await supabase
        .from("estimates")
        .select("id, deposit_paid_at, company_id, total, deposit_amount, client_name, client_first_name, client_last_name, client_email, receipt_sent_at")
        .eq("id", estimateId)
        .maybeSingle()

      if (estimate && !estimate.deposit_paid_at) {
        const now = new Date().toISOString()
        const depositAmt = pi.amount_received ? pi.amount_received / 100 : (estimate.deposit_amount ?? 0)
        const total = estimate.total ?? 0
        const paymentStatus = total > 0 && depositAmt >= total ? "paid" : "deposit_paid"

        await supabase.from("estimates").update({
          deposit_paid_at: now,
          deposit_amount: depositAmt,
          status: "accepted",
          accepted_at: now,
          accepted_payment_choice: "pay_now",
          payment_status: paymentStatus,
          paid_at: paymentStatus === "paid" ? now : null,
          updated_at: now,
        }).eq("id", estimateId)

        const { data: company } = await supabase
          .from("companies")
          .select("name, email, lead_email, primary_color, slug")
          .eq("id", estimate.company_id)
          .maybeSingle()

        const ownerEmail = company?.lead_email || company?.email
        if (process.env.RESEND_API_KEY) {
          const clientName = estimate.client_first_name
            ? `${estimate.client_first_name} ${estimate.client_last_name ?? ""}`.trim()
            : (estimate.client_name ?? "Your client")
          const companyName = company?.name ?? "Found"
          const color = company?.primary_color ?? "#30D158"
          const depositFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(depositAmt)
          const totalFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(total)
          const remaining = Math.max(total - depositAmt, 0)
          const remainingFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(remaining)
          const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"
          const dashboardLink = `https://my.${rootDomain}/estimates?estimate=${estimateId}`
          const estimateLink = company?.slug ? `https://${company.slug}.${rootDomain}/q/${estimateId}` : dashboardLink

          if (ownerEmail) {
            await sendTrackedEmail({
              from: "Found <hello@foundco.app>",
              to: ownerEmail,
              subject: `${paymentStatus === "paid" ? "Payment" : "Deposit"} received: ${clientName} paid ${depositFmt}`,
              html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"><table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0"><tr><td align="center"><table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:white;border-radius:16px;overflow:hidden;border:1px solid #eee"><tr><td style="background:linear-gradient(135deg,${color}18 0%,${color}06 100%);padding:32px;border-bottom:1px solid #f0f0f0;text-align:center"><h1 style="margin:0 0 6px;color:#111;font-size:22px;font-weight:800;letter-spacing:-0.02em">${paymentStatus === "paid" ? "Payment received" : "Deposit received"}</h1><p style="margin:0;color:#666;font-size:15px">${clientName} paid ${depositFmt}</p></td></tr><tr><td style="padding:28px 32px"><div style="background:#f0f9f3;border-radius:12px;padding:18px 20px;margin-bottom:20px;border:1px solid #d0eeda"><div style="font-size:12px;color:#1A7A3C;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px">Confirmed</div><div style="font-size:24px;color:#1A7A3C;font-weight:800;letter-spacing:-0.02em">${depositFmt}</div>${total > 0 ? `<div style="font-size:13px;color:#4A8C5C;margin-top:4px">of ${totalFmt} total</div>` : ""}</div><p style="margin:0 0 20px;color:#444;font-size:15px;line-height:1.6">The customer has paid from the estimate page. Reach out while the decision is fresh.</p><a href="${dashboardLink}" style="display:inline-block;background:${color};color:white;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:12px">Open in Found</a></td></tr><tr><td style="padding:16px 32px;border-top:1px solid #f0f0f0;text-align:center"><p style="margin:0;color:#bbb;font-size:12px">Found - ${companyName}</p></td></tr></table></td></tr></table></body></html>`,
              text: `${paymentStatus === "paid" ? "Payment" : "Deposit"} received: ${clientName} paid ${depositFmt}${total > 0 ? ` of ${totalFmt} total` : ""}.`,
              companyId: estimate.company_id,
              recipientType: "client_owner",
              emailType: "estimate_deposit_owner",
              source: "api/stripe/webhook/payment_intent.succeeded",
              admin: supabase,
            })
          }

          if (estimate.client_email && !estimate.receipt_sent_at) {
            const ok = await sendTrackedEmail({
              from: `${companyName} <hello@foundco.app>`,
              to: estimate.client_email,
              subject: `Payment received by ${companyName}`,
              html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"><table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0"><tr><td align="center"><table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:white;border-radius:16px;overflow:hidden;border:1px solid #eee"><tr><td style="padding:32px;border-bottom:1px solid #f0f0f0;text-align:center"><h1 style="margin:0 0 8px;color:#111;font-size:24px;font-weight:800;letter-spacing:-0.02em">Payment received</h1><p style="margin:0;color:#666;font-size:15px">${companyName} has been notified.</p></td></tr><tr><td style="padding:28px 32px"><div style="background:#f0f9f3;border-radius:12px;padding:20px;margin-bottom:20px;border:1px solid #d0eeda;text-align:center"><div style="font-size:12px;color:#1A7A3C;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px">Paid Today</div><div style="font-size:30px;color:#1A7A3C;font-weight:800;letter-spacing:-0.03em">${depositFmt}</div>${remaining > 0 ? `<div style="font-size:13px;color:#4A8C5C;margin-top:6px">${remainingFmt} remaining later</div>` : ""}</div><p style="margin:0 0 20px;color:#444;font-size:15px;line-height:1.6">Thanks, ${clientName}. Your estimate is accepted and your payment is confirmed.</p><a href="${estimateLink}" style="display:inline-block;background:${color};color:white;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:12px">View Estimate</a></td></tr><tr><td style="padding:16px 32px;border-top:1px solid #f0f0f0;text-align:center"><p style="margin:0;color:#bbb;font-size:12px">Found - ${companyName}</p></td></tr></table></td></tr></table></body></html>`,
              text: `Payment received by ${companyName}. Thanks, ${clientName} - your estimate is accepted and your payment of ${depositFmt} is confirmed.`,
              companyId: estimate.company_id,
              recipientType: "lead",
              emailType: "estimate_deposit_receipt",
              source: "api/stripe/webhook/payment_intent.succeeded",
              admin: supabase,
            })
            if (ok) await supabase.from("estimates").update({ receipt_sent_at: now }).eq("id", estimateId)
          }
        }
      }
    }

    if (pi.metadata?.kind === "estimate_balance" && pi.metadata?.estimate_id) {
      const estimateId = pi.metadata.estimate_id
      const { data: estimate } = await supabase
        .from("estimates")
        .select("id, paid_at, company_id, total, deposit_amount, client_name, client_first_name, client_last_name, client_email, receipt_sent_at")
        .eq("id", estimateId)
        .maybeSingle()

      if (estimate && !estimate.paid_at) {
        const now = new Date().toISOString()
        const balancePaid = pi.amount_received ? pi.amount_received / 100 : 0
        const total = estimate.total ?? 0

        await supabase.from("estimates").update({
          payment_status: "paid",
          paid_at: now,
          updated_at: now,
        }).eq("id", estimateId)

        const { data: company } = await supabase
          .from("companies")
          .select("name, email, lead_email, primary_color, slug")
          .eq("id", estimate.company_id)
          .maybeSingle()

        const ownerEmail = company?.lead_email || company?.email
        if (process.env.RESEND_API_KEY) {
          const clientName = estimate.client_first_name
            ? `${estimate.client_first_name} ${estimate.client_last_name ?? ""}`.trim()
            : (estimate.client_name ?? "Your client")
          const companyName = company?.name ?? "Found"
          const color = company?.primary_color ?? "#30D158"
          const balanceFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(balancePaid)
          const totalFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(total)
          const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"
          const dashboardLink = `https://my.${rootDomain}/estimates?estimate=${estimateId}`
          const estimateLink = company?.slug ? `https://${company.slug}.${rootDomain}/q/${estimateId}` : dashboardLink

          if (ownerEmail) {
            await sendTrackedEmail({
              from: "Found <hello@foundco.app>",
              to: ownerEmail,
              subject: `Final payment received: ${clientName} paid ${balanceFmt}`,
              html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"><table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0"><tr><td align="center"><table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:white;border-radius:16px;overflow:hidden;border:1px solid #eee"><tr><td style="background:linear-gradient(135deg,${color}18 0%,${color}06 100%);padding:32px;border-bottom:1px solid #f0f0f0;text-align:center"><h1 style="margin:0 0 6px;color:#111;font-size:22px;font-weight:800;letter-spacing:-0.02em">Final payment received</h1><p style="margin:0;color:#666;font-size:15px">${clientName} paid the remaining ${balanceFmt}</p></td></tr><tr><td style="padding:28px 32px"><div style="background:#f0f9f3;border-radius:12px;padding:18px 20px;margin-bottom:20px;border:1px solid #d0eeda"><div style="font-size:12px;color:#1A7A3C;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px">Paid in full</div><div style="font-size:24px;color:#1A7A3C;font-weight:800;letter-spacing:-0.02em">${totalFmt}</div></div><p style="margin:0 0 20px;color:#444;font-size:15px;line-height:1.6">The customer has paid the balance from the estimate page.</p><a href="${dashboardLink}" style="display:inline-block;background:${color};color:white;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:12px">Open in Found</a></td></tr><tr><td style="padding:16px 32px;border-top:1px solid #f0f0f0;text-align:center"><p style="margin:0;color:#bbb;font-size:12px">Found - ${companyName}</p></td></tr></table></td></tr></table></body></html>`,
              text: `Final payment received: ${clientName} paid the remaining ${balanceFmt}. Estimate is now paid in full (${totalFmt}).`,
              companyId: estimate.company_id,
              recipientType: "client_owner",
              emailType: "estimate_balance_owner",
              source: "api/stripe/webhook/payment_intent.succeeded",
              admin: supabase,
            })
          }

          if (estimate.client_email && !estimate.receipt_sent_at) {
            const ok = await sendTrackedEmail({
              from: `${companyName} <hello@foundco.app>`,
              to: estimate.client_email,
              subject: `Payment received by ${companyName}`,
              html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"><table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0"><tr><td align="center"><table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:white;border-radius:16px;overflow:hidden;border:1px solid #eee"><tr><td style="padding:32px;border-bottom:1px solid #f0f0f0;text-align:center"><h1 style="margin:0 0 8px;color:#111;font-size:24px;font-weight:800;letter-spacing:-0.02em">Payment received</h1><p style="margin:0;color:#666;font-size:15px">${companyName} has been notified.</p></td></tr><tr><td style="padding:28px 32px"><div style="background:#f0f9f3;border-radius:12px;padding:20px;margin-bottom:20px;border:1px solid #d0eeda;text-align:center"><div style="font-size:12px;color:#1A7A3C;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px">Paid in full</div><div style="font-size:30px;color:#1A7A3C;font-weight:800;letter-spacing:-0.03em">${totalFmt}</div></div><p style="margin:0 0 20px;color:#444;font-size:15px;line-height:1.6">Thanks, ${clientName}. Your estimate is fully paid.</p><a href="${estimateLink}" style="display:inline-block;background:${color};color:white;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:12px">View Estimate</a></td></tr><tr><td style="padding:16px 32px;border-top:1px solid #f0f0f0;text-align:center"><p style="margin:0;color:#bbb;font-size:12px">Found - ${companyName}</p></td></tr></table></td></tr></table></body></html>`,
              text: `Payment received by ${companyName}. Thanks, ${clientName} - your estimate is now fully paid (${totalFmt}).`,
              companyId: estimate.company_id,
              recipientType: "lead",
              emailType: "estimate_balance_receipt",
              source: "api/stripe/webhook/payment_intent.succeeded",
              admin: supabase,
            })
            if (ok) await supabase.from("estimates").update({ receipt_sent_at: now }).eq("id", estimateId)
          }
        }
      }
    }

    return NextResponse.json({ received: true })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session

    if (session.metadata?.kind === "online_order") {
      await handleOnlineOrderCheckout(supabase, session)
      return NextResponse.json({ received: true })
    }

    const companyId = session.metadata?.company_id
    if (!companyId) return NextResponse.json({ received: true })

    // plan is deliberately NOT set here. checkout.session.completed and
    // customer.subscription.created both fire for a new subscription and
    // Stripe does not guarantee their order - this handler used to
    // hardcode plan: "found" (Starter) regardless of what was actually
    // purchased, which could silently overwrite the correct plan the
    // subscription-created handler below had just set correctly from the
    // real price id. customer.subscription.created/updated is the sole
    // source of truth for plan; this handler only owns customer id/status.
    // Found 2026-08-09: a real paying test account (Found Business) sat
    // reset to Starter in the database for weeks while Stripe kept
    // billing the correct plan.
    await supabase
      .from("companies")
      .update({
        stripe_customer_id: session.customer as string,
        subscription_status: "active",
      })
      .eq("id", companyId)

    console.log("[Stripe] checkout.session.completed - company:", companyId)
  }

  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
    await syncSubscriptionToSupabase(supabase, event.data.object as Stripe.Subscription)
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription
    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id
    const companyId = await companyIdForSubscription(supabase, sub, customerId)

    let companyQuery = supabase.from("companies").update({ subscription_status: sub.status })
    if (companyId) {
      companyQuery = companyQuery.eq("id", companyId)
    } else {
      companyQuery = companyQuery.eq("stripe_customer_id", customerId)
    }
    await companyQuery

    if (companyId) {
      await supabase
        .from("addon_subscriptions")
        .update({ active: false })
        .eq("company_id", companyId)
    }
  }

  return NextResponse.json({ received: true })
}
