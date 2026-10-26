import { after, NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { sendTrackedEmail } from "@/lib/emailLog"
import { ensureDefaultAvailability } from "@/lib/bookings/ensureDefaultAvailability"
import { captureFoundActivationCompleted } from "@/lib/foundFunnelServer"
import { billingFlag, consumeBillingWorkImmediately, isPlatformBillingEvent, persistBillingEvent, preservesServiceAccess, stripeBillingMode } from "@/lib/stripe/billingReliability"
import { noteActivationSubscription } from "@/lib/stripe/activationGuard"

export const maxDuration = 300

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

function addonSlugForItem(item: Stripe.SubscriptionItem): string | null {
  return item.price.metadata?.addon_slug || item.plan?.metadata?.addon_slug || null
}

async function projectionChecked<T>(request: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await request
  if (error) throw new Error(error.message)
  return data
}

async function applyCustomerProjection(
  supabase: ReturnType<typeof getAdminClient>, stripe: Stripe,
  customerId: string, livemode: boolean, expectedCompanyId?: string,
) {
  const company = await projectionChecked(supabase.from("companies")
    .select("id,stripe_customer_id,plan,subscription_status,client_state,account_kind,slug")
    .eq("stripe_customer_id", customerId).single())
  if (!company || company.stripe_customer_id !== customerId ||
    (expectedCompanyId && expectedCompanyId !== company.id)) throw new Error("Projection company mapping mismatch")
  if (await preservesServiceAccess(supabase, company.id, customerId, livemode)) return "protected"

  const token = crypto.randomUUID()
  const run = await projectionChecked(supabase.rpc("billing_start_run", {
    p_company: company.id, p_customer: customerId, p_live: livemode, p_source: "legacy_projection", p_token: token,
  }))
  if (!run) throw new Error("Customer projection lease busy")
  let checkpoint: Record<string, unknown> = { applied: false, manual_projection_required: true }
  const leaseQuery = () => supabase.from("billing_reconciliation_runs")
    .select("id").eq("id", run).eq("lease_token", token).eq("state", "running")
    .gt("lease_until", new Date().toISOString()).single()
  const save = async (state: "running" | "complete" | "failed", error: string | null = null) => {
    const row = await projectionChecked(supabase.from("billing_reconciliation_runs").update({
      state, checkpoint, error,
      ...(state === "running" ? {} : { finished_at: new Date().toISOString() }),
      completeness: { scope: "legacy_projection_observation", full_ledger: false },
    }).eq("id", run).eq("lease_token", token).eq("state", "running")
      .gt("lease_until", new Date().toISOString()).select("id").single())
    if (!row) throw new Error("Lost projection lease")
  }
  try {
    if (!await projectionChecked(leaseQuery())) throw new Error("Lost projection lease")
    const current = await projectionChecked(supabase.from("companies")
      .select("id,stripe_customer_id,plan,subscription_status,client_state,account_kind,slug")
      .eq("id", company.id).eq("stripe_customer_id", customerId).single())
    if (!current || current.stripe_customer_id !== customerId) throw new Error("Projection mapping changed")
    const addons = await projectionChecked(supabase.from("addon_subscriptions")
      .select("addon_slug,active,stripe_subscription_item_id").eq("company_id", company.id))
    checkpoint = { ...checkpoint, before: { company: current, addons }, after: { company: current, addons } }
    await save("running")
    if (await preservesServiceAccess(supabase, company.id, customerId, livemode)) {
      checkpoint = { ...checkpoint, reason: "protected" }
      await save("complete")
      return "protected"
    }

    const candidates: Array<{ subscription: Stripe.Subscription; plan: string }> = []
    for await (const sub of stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 })) {
      if (!await projectionChecked(leaseQuery())) throw new Error("Lost projection lease")
      const owner = typeof sub.customer === "string" ? sub.customer : sub.customer.id
      if (sub.livemode !== livemode || owner !== customerId ||
        (sub.metadata.company_id && sub.metadata.company_id !== company.id)) throw new Error("Projection subscription scope mismatch")
      if (sub.status !== "active" && sub.status !== "trialing") continue
      if (sub.items.has_more) {
        const items: Stripe.SubscriptionItem[] = []
        for await (const item of stripe.subscriptionItems.list({ subscription: sub.id, limit: 100 })) {
          if (!await projectionChecked(leaseQuery())) throw new Error("Lost projection lease")
          items.push(item)
        }
        sub.items.data = items
      }
      const base = sub.items.data.find(item => PLAN_PRICE_IDS.has(item.price.id) || Boolean(planFromSubscriptionItem(item)))
      const plan = base ? planFromSubscriptionItem(base) : normalizePlanSlug(sub.metadata.plan)
      if (plan) candidates.push({ subscription: sub, plan })
    }
    if (candidates.length > 1) {
      checkpoint = { ...checkpoint, reason: "ambiguous_active_found_subscriptions", candidate_ids: candidates.map(row => row.subscription.id) }
      await save("complete")
      return "manual"
    }
    const canonical = candidates[0]
    const projection = canonical ? {
      plan: canonical.plan, status: canonical.subscription.status, subscription_id: canonical.subscription.id,
      addon_items: canonical.subscription.items.data.flatMap(item => {
        const addon_slug = addonSlugForItem(item)
        return addon_slug ? [{ addon_slug, stripe_subscription_item_id: item.id }] : []
      }),
    } : null
    checkpoint = { ...checkpoint, reason: canonical ? "canonical_active_subscription" : "no_active_found_subscription",
      canonical_subscription_id: canonical?.subscription.id ?? null,
      proposed: projection }
    if (!projection) {
      await save("complete")
      return "manual"
    }
    // SQL rechecks the lease, customer link, and override in the same
    // transaction as company/addon writes, audit, and run completion.
    checkpoint = { ...checkpoint, manual_projection_required: false }
    await save("running")
    const result = await projectionChecked(supabase.rpc("billing_apply_projection", {
      p_run: run, p_token: token, p_projection: projection,
    })) as { applied: boolean; protected: boolean; activated: boolean } | null
    if (!result || typeof result.applied !== "boolean" || typeof result.protected !== "boolean" ||
      typeof result.activated !== "boolean" || (result.applied && result.protected) ||
      (result.activated && !result.applied)) throw new Error("Invalid projection RPC result")
    if (result.applied && canonical) {
      if (projection.addon_items.some(item => item.addon_slug === "reservation_calendar")) {
        try {
          await ensureDefaultAvailability(company.id)
        } catch {
          console.error("[Billing] Applied booking grant needs availability backfill", company.id)
        }
      }
      if (result.activated) {
        await captureFoundActivationCompleted({ company_id: company.id,
          slug: canonical.subscription.metadata.slug || current.slug,
          plan_name: projection.plan, method: "stripe_webhook",
          value: projection.plan === "found_business" ? 69 : projection.plan === "found_pro" ? 39 : 29, currency: "USD" })
      }
    }
    return result.protected ? "protected" : result.applied ? "applied" : "unchanged"
  } catch {
    // A transport failure can follow a committed RPC. Never claim rollback or
    // overwrite a completed run; replay refetches current state under a new lease.
    await save("failed", "Customer projection failed or acceptance uncertain; retry required")
    throw new Error("Customer projection observation failed")
  }
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
    process.env.STRIPE_WEBHOOK_SECRET_PLATFORM,
    process.env.STRIPE_WEBHOOK_SECRET,
    process.env.STRIPE_WEBHOOK_SECRET_CONNECT,
    process.env.STRIPE_WEBHOOK_SECRET_CONNECT_LIVE,
  ].filter((s): s is string => Boolean(s))

  if (!sig || webhookSecrets.length === 0 || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Not configured" }, { status: 400 })
  }

  const body = await req.text()
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { timeout: 15000, maxNetworkRetries: 1 })

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

  if (isPlatformBillingEvent(event)) {
    const mode = stripeBillingMode()
    if (mode === null) return NextResponse.json({ error: "Billing key mode unavailable" }, { status: 503 })
    if (event.livemode !== mode) return NextResponse.json({ received: true, ignored: "billing_mode_mismatch" })
  }

  const supabase = getAdminClient()

  if (event.type.startsWith("customer.subscription.") && !event.account) {
    try {
      await noteActivationSubscription(supabase, event.data.object as Stripe.Subscription)
    } catch {
      return NextResponse.json({ error: "Activation receipt persistence failed; retry required" }, { status: 503 })
    }
  }

  // Connect commerce continues through its existing handlers. Billing intake
  // stores replay work before scheduling the immediate consumer.
  if (isPlatformBillingEvent(event) && billingFlag("BILLING_DURABLE_INTAKE_ENABLED")) {
    try {
      await persistBillingEvent(supabase, event)
      after(() => consumeBillingWorkImmediately(supabase, stripe).then(() => undefined))
    } catch {
      return NextResponse.json({ error: "Billing event persistence failed" }, { status: 503 })
    }
    // Invoice events have no legacy handler. Subscription callbacks below
    // apply customer-authoritative grants through the leased SQL transaction.
    if (event.type.startsWith("invoice.")) return NextResponse.json({ received: true })
  }

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

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session

      if (session.metadata?.kind === "online_order") {
        await handleOnlineOrderCheckout(supabase, session)
        return NextResponse.json({ received: true })
      }

      if (event.account || session.mode !== "subscription") return NextResponse.json({ received: true })
      const companyId = session.metadata?.company_id
      if (!companyId) return NextResponse.json({ received: true })

      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id
      if (!customerId) throw new Error("Missing projection customer")
      const boundary = await applyCustomerProjection(supabase, stripe, customerId, event.livemode, companyId)
      return NextResponse.json({ received: true, legacy_projection: boundary })
    }

    if (event.type.startsWith("customer.subscription.") && !event.account) {
      const sub = event.data.object as Stripe.Subscription
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id
      if (!customerId) throw new Error("Missing projection customer")
      const boundary = await applyCustomerProjection(supabase, stripe, customerId, event.livemode, sub.metadata?.company_id)
      return NextResponse.json({ received: true, legacy_projection: boundary })
    }

    return NextResponse.json({ received: true })
  } catch {
    return NextResponse.json({ error: "Billing projection failed; retry required" }, { status: 503 })
  }
}
