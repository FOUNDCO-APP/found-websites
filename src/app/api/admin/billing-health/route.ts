import { NextResponse } from "next/server"
import { authorizeBillingAdmin } from "@/lib/stripe/billingLedger"
import { getAdminClient } from "@/app/admin/lib"
import { billingFlag } from "@/lib/stripe/billingReliability"
import { getStoredBillingSummaries } from "@/lib/stripe/billingSummary"
import { isAdminTestIdentity } from "@/app/admin/testIdentity"
import { getStripe } from "@/lib/stripe/connect"

export const dynamic = "force-dynamic"
const headers = { "Cache-Control": "private, no-store" }

export async function GET(request: Request) {
  try { await authorizeBillingAdmin(request.headers.get("x-admin-key")) }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers }) }
  const config = {
    liveStripe: /^(sk|rk)_live_/.test(process.env.STRIPE_SECRET_KEY ?? ""),
    cronConfigured: Boolean(process.env.CRON_SECRET),
    emailConfigured: Boolean(process.env.RESEND_API_KEY),
    ownerEmailConfigured: Boolean(process.env.ADMIN_ALERT_EMAIL),
    webhookSigningConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    intakeEnabled: billingFlag("BILLING_DURABLE_INTAKE_ENABLED"),
    reconciliationEnabled: billingFlag("BILLING_RECONCILIATION_ENABLED"),
    ownerEmailEnabled: billingFlag("BILLING_ADMIN_EMAIL_ENABLED"),
    clientEmailEnabled: billingFlag("BILLING_CLIENT_EMAIL_ENABLED"),
    automaticHoldsEnabled: false,
  }
  const admin = getAdminClient()
  const [events, notices, failedRuns, expiredEvents, expiredCustomerRuns] = await Promise.all([
    admin.from("billing_events").select("id", { count: "exact", head: true }).neq("state", "complete"),
    admin.from("billing_notification_jobs").select("id", { count: "exact", head: true }).in("state", ["pending", "processing", "failed", "unknown"]),
    admin.from("billing_reconciliation_runs").select("id", { count: "exact", head: true }).eq("state", "failed"),
    admin.from("billing_events").select("id", { count: "exact", head: true }).eq("state", "processing").lt("lease_until", new Date().toISOString()),
    admin.from("billing_reconciliation_runs").select("id", { count: "exact", head: true }).eq("state", "running").lt("lease_until", new Date().toISOString()),
  ])
  if (events.error || notices.error || failedRuns.error || expiredEvents.error || expiredCustomerRuns.error) {
    return NextResponse.json({ config, healthRead: false, readyForObservation: false, error: "Billing health unavailable" }, { status: 503, headers })
  }
  const companies: { id: string; name: string; email: string | null; account_kind: string | null; is_test: boolean | null }[] = []
  for (let offset = 0; ; offset += 500) {
    const result = await admin.from("companies").select("id,name,email,account_kind,is_test").eq("account_kind", "client")
      .order("id").range(offset, offset + 499)
    if (result.error) return NextResponse.json({ config, healthRead: false, readyForObservation: false, error: "Client verification scope unavailable" }, { status: 503, headers })
    companies.push(...(result.data ?? []))
    if ((result.data?.length ?? 0) < 500) break
  }
  const eligible = companies.filter(row => !isAdminTestIdentity(row))
  const snapshots = await getStoredBillingSummaries(eligible.map(row => row.id))
  const staleClients = eligible.filter(row => !snapshots.get(row.id)?.verifiedAt || snapshots.get(row.id)?.stale)
  const requiredEvents = ["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted",
    "checkout.session.completed", "invoice.payment_failed", "invoice.payment_action_required", "invoice.paid", "invoice.updated"]
  const destinations: { id: string; status: string; url: string; events: string[] }[] = []
  const scopeDestinations: { id: string; status: string; url: string; payload: string; eventsFrom: string[]; events: string[] }[] = []
  let scopeRead = false
  let endpointRead = false
  try {
    const stripe = getStripe()
    if (stripe && config.liveStripe) {
      const domain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"
      for await (const endpoint of stripe.webhookEndpoints.list({ limit: 100 })) {
        const url = new URL(endpoint.url)
        if (endpoint.livemode && url.protocol === "https:" && [domain, `www.${domain}`].includes(url.hostname) && url.pathname === "/api/stripe/webhook") {
          destinations.push({ id: endpoint.id, status: endpoint.status, url: `${url.origin}${url.pathname}`, events: endpoint.enabled_events })
        }
      }
      endpointRead = true
    }
  } catch { /* Readiness stays unknown when Stripe endpoint access is unavailable. */ }
  try {
    const stripe = getStripe()
    if (stripe && config.liveStripe) {
      const domain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"
      for await (const destination of stripe.v2.core.eventDestinations.list({ limit: 100, include: ["webhook_endpoint.url"] })) {
        if (!destination.webhook_endpoint?.url) continue
        const url = new URL(destination.webhook_endpoint.url)
        if (destination.livemode && url.protocol === "https:" && [domain, `www.${domain}`].includes(url.hostname) && url.pathname === "/api/stripe/webhook") {
          scopeDestinations.push({ id: destination.id, status: destination.status, url: `${url.origin}${url.pathname}`,
            payload: destination.event_payload, eventsFrom: destination.events_from ?? [], events: destination.enabled_events })
        }
      }
      scopeRead = true
    }
  } catch { /* Unknown scope must not authorize changes to a Connect destination. */ }
  const missingEvents = requiredEvents.filter(type => !destinations.some(endpoint => endpoint.status === "enabled" &&
    (endpoint.events.includes("*") || endpoint.events.includes(type))))
  const readinessReasons = [
    ...(!config.liveStripe ? ["Live Stripe is not configured"] : []),
    ...(!config.cronConfigured ? ["Recovery cron authentication is not configured"] : []),
    ...(!config.webhookSigningConfigured ? ["Platform webhook signature verification is not configured"] : []),
    ...(!eligible.length ? ["No client baselines were verified"] : []),
    ...(staleClients.length ? [`${staleClients.length} client baselines are missing or stale`] : []),
    ...((expiredEvents.count ?? 0) > 0 ? ["Expired event leases need recovery"] : []),
    ...((expiredCustomerRuns.count ?? 0) > 0 ? ["Expired customer leases need recovery"] : []),
    ...((failedRuns.count ?? 0) > 0 ? ["Failed runs need review"] : []),
    ...(!endpointRead ? ["Stripe event-destination configuration is unverified"] : missingEvents.length ? ["Required Stripe events are not covered by an enabled Found endpoint"] : []),
  ]
  return NextResponse.json({ config, healthRead: true, readyForObservation: readinessReasons.length === 0,
    readinessReasons, pendingEvents: events.count, unresolvedNotifications: notices.count,
    failedRuns: failedRuns.count, expiredEvents: expiredEvents.count,
    expiredCustomerRuns: expiredCustomerRuns.count,
    eventDestinations: { configurationRead: endpointRead, destinations, missingEvents,
      scopeRead, scopeDestinations, signedDeliveryVerified: false },
    clients: eligible.map(row => ({ name: row.name, verifiedAt: snapshots.get(row.id)?.verifiedAt ?? null,
      stale: snapshots.get(row.id)?.stale ?? true })),
    automaticActionsReady: false }, { headers })
}
