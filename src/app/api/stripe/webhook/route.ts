import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { Resend } from "resend"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

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
  const baseItem = sub.items.data.find((item) => PLAN_PRICE_IDS.has(item.price.id))
  const plan = baseItem ? planFromPriceId(baseItem.price.id) : null

  const update: Record<string, string> = { subscription_status: sub.status }
  if (plan) update.plan = plan

  let companyQuery = supabase.from("companies").update(update)
  if (companyId) {
    companyQuery = companyQuery.eq("id", companyId)
  } else {
    companyQuery = companyQuery.eq("stripe_customer_id", customerId)
  }
  await companyQuery

  if (!companyId) return

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

  const resend = new Resend(process.env.RESEND_API_KEY)
  const total = formatOrderTotal(existingAnswers.subtotal_cents)
  await resend.emails.send({
    from: "Found <hello@foundco.app>",
    to: ownerEmail,
    subject: `Paid online order: ${lead.name || "Customer"} - ${total}`,
    html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;"><tr><td align="center"><table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;"><tr><td style="background:#111111;padding:32px;text-align:center;"><p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#888888;">Paid Online Order</p><h1 style="margin:0;font-size:22px;font-weight:900;color:#ffffff;">${company?.name || "Found"}</h1></td></tr><tr><td style="padding:36px 32px;"><p style="margin:0 0 20px;font-size:18px;font-weight:900;color:#111111;">${total} paid</p><p style="margin:0 0 14px;font-size:15px;color:#333333;line-height:1.6;white-space:pre-wrap;">${lead.message || "New online order"}</p><table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:12px;padding:20px;margin-top:20px;"><tr><td><p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999999;">Customer</p><p style="margin:0;font-size:16px;font-weight:800;color:#111111;">${lead.name || "Customer"}</p></td></tr><tr><td style="padding-top:14px;"><p style="margin:0;font-size:14px;color:#333333;">${lead.phone || ""}${lead.email ? ` &middot; ${lead.email}` : ""}</p></td></tr></table></td></tr></table></td></tr></table></body></html>`,
  }).catch((err) => console.error("[Resend] Online order notification error:", err))
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
          const resend = new Resend(process.env.RESEND_API_KEY)
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
            await resend.emails.send({
              from: "Found <hello@foundco.app>",
              to: ownerEmail,
              subject: `${paymentStatus === "paid" ? "Payment" : "Deposit"} received: ${clientName} paid ${depositFmt}`,
              html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"><table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0"><tr><td align="center"><table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:white;border-radius:16px;overflow:hidden;border:1px solid #eee"><tr><td style="background:linear-gradient(135deg,${color}18 0%,${color}06 100%);padding:32px;border-bottom:1px solid #f0f0f0;text-align:center"><h1 style="margin:0 0 6px;color:#111;font-size:22px;font-weight:800;letter-spacing:-0.02em">${paymentStatus === "paid" ? "Payment received" : "Deposit received"}</h1><p style="margin:0;color:#666;font-size:15px">${clientName} paid ${depositFmt}</p></td></tr><tr><td style="padding:28px 32px"><div style="background:#f0f9f3;border-radius:12px;padding:18px 20px;margin-bottom:20px;border:1px solid #d0eeda"><div style="font-size:12px;color:#1A7A3C;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px">Confirmed</div><div style="font-size:24px;color:#1A7A3C;font-weight:800;letter-spacing:-0.02em">${depositFmt}</div>${total > 0 ? `<div style="font-size:13px;color:#4A8C5C;margin-top:4px">of ${totalFmt} total</div>` : ""}</div><p style="margin:0 0 20px;color:#444;font-size:15px;line-height:1.6">The customer has paid from the estimate page. Reach out while the decision is fresh.</p><a href="${dashboardLink}" style="display:inline-block;background:${color};color:white;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:12px">Open in Found</a></td></tr><tr><td style="padding:16px 32px;border-top:1px solid #f0f0f0;text-align:center"><p style="margin:0;color:#bbb;font-size:12px">Found - ${companyName}</p></td></tr></table></td></tr></table></body></html>`,
            }).catch((err) => console.error("[Resend] Estimate deposit webhook owner email error:", err))
          }

          if (estimate.client_email && !estimate.receipt_sent_at) {
            const sent = await resend.emails.send({
              from: "Found <hello@foundco.app>",
              to: estimate.client_email,
              subject: `Payment received by ${companyName}`,
              html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"><table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0"><tr><td align="center"><table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:white;border-radius:16px;overflow:hidden;border:1px solid #eee"><tr><td style="padding:32px;border-bottom:1px solid #f0f0f0;text-align:center"><h1 style="margin:0 0 8px;color:#111;font-size:24px;font-weight:800;letter-spacing:-0.02em">Payment received</h1><p style="margin:0;color:#666;font-size:15px">${companyName} has been notified.</p></td></tr><tr><td style="padding:28px 32px"><div style="background:#f0f9f3;border-radius:12px;padding:20px;margin-bottom:20px;border:1px solid #d0eeda;text-align:center"><div style="font-size:12px;color:#1A7A3C;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px">Paid Today</div><div style="font-size:30px;color:#1A7A3C;font-weight:800;letter-spacing:-0.03em">${depositFmt}</div>${remaining > 0 ? `<div style="font-size:13px;color:#4A8C5C;margin-top:6px">${remainingFmt} remaining later</div>` : ""}</div><p style="margin:0 0 20px;color:#444;font-size:15px;line-height:1.6">Thanks, ${clientName}. Your estimate is accepted and your payment is confirmed.</p><a href="${estimateLink}" style="display:inline-block;background:${color};color:white;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:12px">View Estimate</a></td></tr><tr><td style="padding:16px 32px;border-top:1px solid #f0f0f0;text-align:center"><p style="margin:0;color:#bbb;font-size:12px">Found - ${companyName}</p></td></tr></table></td></tr></table></body></html>`,
            }).catch((err) => {
              console.error("[Resend] Estimate deposit webhook receipt email error:", err)
              return null
            })
            if (sent?.data?.id) await supabase.from("estimates").update({ receipt_sent_at: now }).eq("id", estimateId)
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

    await supabase
      .from("companies")
      .update({
        stripe_customer_id: session.customer as string,
        subscription_status: "active",
        plan: "found",
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
