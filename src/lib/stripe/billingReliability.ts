import "server-only"
import Stripe from "stripe"
import type { SupabaseClient } from "@supabase/supabase-js"
import { sendTrackedEmail } from "@/lib/emailLog"
import { getClientBillingLedger } from "@/lib/stripe/billingLedger"
import { isAdminTestIdentity } from "@/app/admin/testIdentity"

type Company = { id: string; name: string; email: string | null; stripe_customer_id: string; account_kind?: string | null; is_test?: boolean | null }
type EventWork = { id: string; event_type: string; payload: Stripe.Event; livemode: boolean; attempts: number }
type Job = { id: string; company_id: string; incident_id: string; recipient_type: "admin" | "client_owner"; recipient: string; subject: string; text_body: string; dedupe_key: string }
const iso = (n: number | null | undefined) => n == null ? null : new Date(n * 1000).toISOString()
const ref = (value: string | { id: string } | null | undefined) => typeof value === "string" ? value : value?.id ?? null
export const billingFlag = (name: string) => process.env[name] === "true"

export function stripeBillingMode(): boolean | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim() ?? ""
  return /^(sk|rk)_live_/.test(key) ? true : /^(sk|rk)_test_/.test(key) ? false : null
}

export function isPlatformBillingEvent(event: Stripe.Event): boolean {
  if (event.account) return false
  if (event.type.startsWith("customer.subscription.")) return true
  if (["invoice.created", "invoice.finalized", "invoice.finalization_failed", "invoice.updated", "invoice.paid",
    "invoice.payment_succeeded", "invoice.payment_failed", "invoice.payment_action_required", "invoice.voided",
    "invoice.marked_uncollectible"].includes(event.type)) return true
  if (event.type === "checkout.session.completed") {
    return (event.data.object as Stripe.Checkout.Session).mode === "subscription"
  }
  return false
}

async function checked<T>(request: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await request
  if (error) throw new Error(error.message)
  return data
}

// Parent provisions object_id = company id; only an explicit manual release
// (preserve_access: false) ends protection. Never infer release from Stripe.
export async function preservesServiceAccess(admin: SupabaseClient, companyId: string, customerId: string, livemode: boolean): Promise<boolean> {
  const row = await checked(admin.from("billing_objects").select("facts")
    .eq("account_scope", "platform").eq("livemode", livemode)
    .eq("object_type", "service_access_override").eq("object_id", companyId)
    .eq("company_id", companyId).eq("customer_id", customerId).maybeSingle())
  if (!row) return false
  if (typeof row.facts?.preserve_access !== "boolean") throw new Error("Invalid service access override")
  return row.facts.preserve_access
}

export async function persistBillingEvent(admin: SupabaseClient, event: Stripe.Event) {
  if (!isPlatformBillingEvent(event)) return
  const object = event.data.object as unknown as { id: string; customer?: string | { id: string }; subscription?: string | { id: string }; mode?: string }
  // Store references needed for replay, never embedded payment/client secrets.
  const payload = { id: event.id, type: event.type, created: event.created, livemode: event.livemode,
    api_version: event.api_version, data: { object: { id: object.id, customer: ref(object.customer), subscription: ref(object.subscription), mode: object.mode } } }
  await checked(admin.from("billing_events").upsert({ event_id: event.id, event_type: event.type,
    account_scope: "platform", livemode: event.livemode, customer_id: ref(object.customer), payload,
  }, { onConflict: "account_scope,livemode,event_id", ignoreDuplicates: true }))
}

async function companyForCustomer(admin: SupabaseClient, customerId: string): Promise<Company> {
  const company = await checked(admin.from("companies").select("id,name,email,stripe_customer_id")
    .eq("stripe_customer_id", customerId).single())
  if (!company || company.stripe_customer_id !== customerId) throw new Error("Unmapped billing customer")
  return company as Company
}

export function invoiceFacts(invoice: Stripe.Invoice, event?: Stripe.Event, company?: Company, notify = false, observedFailure?: "payment_failed" | "action_required") {
  const subscription = ref(invoice.parent?.subscription_details?.subscription)
  const failed = invoice.status === "open" && invoice.amount_remaining > 0 && subscription &&
    observedFailure
  const kind = failed ? observedFailure : null
  const notifications: Array<{ recipient_type: string; recipient: string; subject: string; text_body: string }> = []
  if (kind && company && notify) {
    const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: invoice.currency })
    const amount = formatter.format(invoice.amount_remaining / 10 ** (formatter.resolvedOptions().maximumFractionDigits ?? 2))
    const text = `Found invoice ${invoice.number || invoice.id} needs payment attention. Remaining balance: ${amount}.\nReview billing: https://my.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"}/billing`
    if (process.env.ADMIN_ALERT_EMAIL) notifications.push({ recipient_type: "admin", recipient: process.env.ADMIN_ALERT_EMAIL,
      subject: `Billing attention: ${company.name}`, text_body: `${company.name}\n${text}` })
    if (company.email) notifications.push({ recipient_type: "client_owner", recipient: company.email,
      subject: "Your Found payment needs attention", text_body: text })
  }
  return { id: invoice.id, subscription_id: subscription, status: invoice.status, currency: invoice.currency,
    total: invoice.total, amount_due: invoice.amount_due, amount_paid: invoice.amount_paid, amount_remaining: invoice.amount_remaining,
    paid_at: iso(invoice.status_transitions.paid_at), created_at: iso(invoice.created), due_at: iso(invoice.due_date),
    next_payment_attempt: iso(invoice.next_payment_attempt), attempt_count: invoice.attempt_count,
    collection_method: invoice.collection_method, billing_reason: invoice.billing_reason, auto_advance: invoice.auto_advance,
    hosted_invoice_url: invoice.hosted_invoice_url, failure_kind: kind,
    attention: kind || (invoice.status === "open" && invoice.amount_remaining > 0 ? "unpaid_or_pending" : null),
    first_failure_at: failed && event && ["invoice.payment_failed", "invoice.payment_action_required"].includes(event.type) ? iso(event.created) : null, notifications }
}

const objectFact = (object_type: string, object_id: string, facts: unknown) => ({ object_type, object_id, facts })

export function currentInvoiceFailure(intents: Array<Pick<Stripe.PaymentIntent, "id" | "status" | "last_payment_error" | "latest_charge">>,
  charges: Array<Pick<Stripe.Charge, "id" | "status" | "payment_intent">> = []): "payment_failed" | "action_required" | undefined {
  if (intents.some(intent => intent.status === "processing" || intent.status === "requires_capture")) return undefined
  if (intents.some(intent => intent.status === "requires_action")) return "action_required"
  if (intents.some(intent => intent.status === "requires_payment_method" && (intent.last_payment_error ||
    charges.some(charge => charge.id === ref(intent.latest_charge) && ref(charge.payment_intent) === intent.id && charge.status === "failed")))) return "payment_failed"
  return undefined
}

async function invoiceFailure(stripe: Stripe, invoice: Stripe.Invoice) {
  const intents: Stripe.PaymentIntent[] = []
  for await (const payment of stripe.invoicePayments.list({ invoice: invoice.id, limit: 100 })) {
    const id = ref(payment.payment.payment_intent)
    if (!id || intents.some(intent => intent.id === id)) continue
    const intent = await stripe.paymentIntents.retrieve(id)
    if (intent.livemode !== invoice.livemode || ref(intent.customer) !== ref(invoice.customer)) throw new Error("Payment allocation scope mismatch")
    intents.push(intent)
  }
  return currentInvoiceFailure(intents)
}

export function billingObservationOrigin(baseline: string | null, eventCreated?: number): "historical" | "live" {
  if (!baseline) return "historical"
  return eventCreated !== undefined && eventCreated * 1000 <= Date.parse(baseline) ? "historical" : "live"
}

async function baselineForCustomer(admin: SupabaseClient, companyId: string): Promise<string | null> {
  const baseline = await checked(admin.from("billing_reconciliation_runs").select("finished_at")
    .eq("company_id", companyId).eq("livemode", true).eq("source", "daily").eq("state", "complete")
    .order("finished_at").limit(1).maybeSingle())
  return baseline?.finished_at ?? null
}

async function startRun(admin: SupabaseClient, company: Company, live: boolean, source: string, token: string): Promise<string | null> {
  return checked(admin.rpc("billing_start_run", { p_company: company.id, p_customer: company.stripe_customer_id,
    p_live: live, p_source: source, p_token: token }))
}

async function failRun(admin: SupabaseClient, run: string, token: string) {
  await checked(admin.from("billing_reconciliation_runs").update({ state: "failed", finished_at: new Date().toISOString(),
    error: "Billing verification or persistence failed; inspect worker configuration and permissions" })
    .eq("id", run).eq("lease_token", token).eq("state", "running").select("id").single())
}

export async function processBillingEvents(admin: SupabaseClient, stripe: Stripe, limit = 10) {
  let completed = 0
  let failed = 0
  let skipped = 0
  for (let i = 0; i < limit; i++) {
    const token = crypto.randomUUID()
    const work = await checked(admin.rpc("billing_claim_work", { p_kind: "event", p_token: token })) as EventWork | null
    if (!work) break
    let run: string | null = null
    try {
      const event = work.payload
      if (!isPlatformBillingEvent(event) || event.livemode !== work.livemode) throw new Error("Unexpected event scope")
      const mode = stripeBillingMode()
      if (mode === null) throw new Error("Billing key mode unavailable")
      if (work.livemode !== mode) {
        // Retire pre-guard intake without Stripe reads or company projections.
        await checked(admin.from("billing_events").update({ state: "complete", lease_until: null,
          error: "Skipped: event mode differs from billing worker key" })
          .eq("id", work.id).eq("lease_token", token).eq("state", "processing")
          .gt("lease_until", new Date().toISOString()).select("id").single())
        skipped++
        continue
      }
      const original = event.data.object as unknown as { id: string; customer?: string | { id: string }; subscription?: string | { id: string } }
      const customerId = ref(original.customer)
      if (!customerId) throw new Error("Missing billing customer")
      const company = await companyForCustomer(admin, customerId)
      run = await startRun(admin, company, work.livemode, "event", token)
      if (!run) throw new Error("Customer worker busy")
      const origin = billingObservationOrigin(await baselineForCustomer(admin, company.id), event.created)
      const invoices: ReturnType<typeof invoiceFacts>[] = []
      const objects: ReturnType<typeof objectFact>[] = []
      if (event.type.startsWith("invoice.")) {
        const invoice = await stripe.invoices.retrieve(original.id)
        if (invoice.livemode !== work.livemode || ref(invoice.customer) !== customerId) throw new Error("Invoice scope mismatch")
        invoices.push(invoiceFacts(invoice, event, company, origin === "live" && event.livemode, await invoiceFailure(stripe, invoice)))
        objects.push(objectFact("invoice", invoice.id, invoiceFacts(invoice)))
      } else {
        const subId = event.type.startsWith("customer.subscription.") ? original.id : ref(original.subscription)
        if (!subId) throw new Error("Missing subscription")
        const sub = await stripe.subscriptions.retrieve(subId)
        if (sub.livemode !== work.livemode || ref(sub.customer) !== customerId) throw new Error("Subscription scope mismatch")
        objects.push(objectFact("subscription", sub.id, { id: sub.id, status: sub.status, collection_method: sub.collection_method,
          trial_end: sub.trial_end, cancel_at_period_end: sub.cancel_at_period_end, pause_collection: sub.pause_collection,
          items: sub.items.data.map(item => ({ id: item.id, price: item.price.id, current_period_start: item.current_period_start, current_period_end: item.current_period_end })) }))
      }
      await checked(admin.rpc("billing_commit_facts", { p_run: run, p_token: token, p_event: work.id,
        p_event_token: token, p_facts: { origin, invoices, objects, completeness: { scope: "event_current_object", full_ledger: false } } }))
      completed++
    } catch {
      // Release the event even if marking the run failed also errors. A lost
      // lease remains recoverable by the durable worker after expiry.
      try {
        if (run) await failRun(admin, run, token)
      } finally {
        await checked(admin.from("billing_events").update({ state: "failed", lease_until: null,
          next_attempt_at: new Date(Date.now() + Math.min(3600, 2 ** Math.min(work.attempts, 12)) * 1000).toISOString(),
          error: "Billing processing failed; retry pending" }).eq("id", work.id).eq("lease_token", token).eq("state", "processing").select("id").single())
      }
      failed++
    }
  }
  return { completed, failed, skipped }
}

export async function reconcileBillingCustomer(admin: SupabaseClient, company: Company) {
  const token = crypto.randomUUID()
  const run = await startRun(admin, company, true, "daily", token)
  if (!run) return { skipped: true }
  try {
    const baseline = await baselineForCustomer(admin, company.id)
    const origin = billingObservationOrigin(baseline)
    const ledger = await getClientBillingLedger(company.stripe_customer_id)
    if (!ledger.complete || ledger.mode !== "live" || ledger.customer_id !== company.stripe_customer_id ||
      ledger.customer?.id !== company.stripe_customer_id || !ledger.verified_at || !Number.isFinite(Date.parse(ledger.verified_at))) {
      throw new Error("Incomplete or mismatched live ledger")
    }
    for (const row of ledger.invoices) {
      if (row.invoice.livemode !== true || ref(row.invoice.customer) !== company.stripe_customer_id) throw new Error("Invoice scope mismatch")
    }
    for (const row of ledger.subscriptions) {
      if (row.subscription.livemode !== true || ref(row.subscription.customer) !== company.stripe_customer_id) throw new Error("Subscription scope mismatch")
    }
    const objects: ReturnType<typeof objectFact>[] = []
    objects.push(objectFact("customer", ledger.customer.id, { ...ledger.customer,
      ledger_complete: true, source_verified_at: ledger.verified_at }))
    for (const sub of ledger.subscriptions) objects.push(objectFact("subscription", sub.id, { id: sub.id, status: sub.status,
      collection_method: sub.collection_method, pause_collection: sub.pause_collection, cancel_at_period_end: sub.cancel_at_period_end,
      cancel_at: sub.cancel_at, canceled_at: sub.canceled_at, ended_at: sub.ended_at, schedule: ref(sub.schedule),
      latest_invoice: ref(sub.latest_invoice), trial_end: sub.subscription.trial_end, items: sub.items }))
    for (const schedule of ledger.schedules) objects.push(objectFact("schedule", schedule.id, schedule))
    for (const invoice of ledger.invoices) objects.push(objectFact("invoice_detail", invoice.id, {
      lines: invoice.lines, payments: invoice.payments.map(payment => ({ id: payment.id, status: payment.status,
        amount_paid: payment.amount_paid, amount_requested: payment.amount_requested, payment_intent: ref(payment.payment.payment_intent),
        paid_at: iso(payment.status_transitions.paid_at) })), credit_notes: invoice.credit_notes }))
    for (const row of ledger.charges) objects.push(objectFact("charge", row.charge.id, { id: row.charge.id,
      status: row.charge.status, amount: row.charge.amount, amount_captured: row.charge.amount_captured,
      currency: row.charge.currency, payment_intent: ref(row.charge.payment_intent), failure_code: row.charge.failure_code,
      failure_message: row.charge.failure_message, refunds: row.refunds }))
    for (const row of ledger.balance_transactions) objects.push(objectFact("balance_transaction", row.id, row))
    for (const row of ledger.payment_intents) objects.push(objectFact("payment_intent", row.id, { id: row.id,status: row.status,
      latest_charge: ref(row.latest_charge),amount_received: row.amount_received,currency: row.currency,
      last_payment_error: row.last_payment_error ? { code: row.last_payment_error.code,decline_code: row.last_payment_error.decline_code,message: row.last_payment_error.message } : null }))
    await checked(admin.rpc("billing_commit_facts", { p_run: run, p_token: token, p_event: null, p_event_token: null,
      p_facts: { origin, invoices: ledger.invoices.map(row => {
        const intents = row.payments.map(payment => ref(payment.payment.payment_intent))
        const failure = currentInvoiceFailure(ledger.payment_intents.filter(intent => intents.includes(intent.id)), ledger.charges.map(row => row.charge))
        return invoiceFacts(row.invoice, undefined, company, origin === "live", failure)
      }), objects,
        completeness: { full_ledger: true, verified_at: ledger.verified_at } } }))
    return { complete: true }
  } catch {
    await failRun(admin, run, token)
    return { complete: false }
  }
}

export async function processBillingNotifications(admin: SupabaseClient, stripe: Stripe, limit = 10) {
  if (!billingFlag("BILLING_ADMIN_EMAIL_ENABLED") && !billingFlag("BILLING_CLIENT_EMAIL_ENABLED")) return { accepted: 0, failed: 0 }
  if (!process.env.RESEND_API_KEY) throw new Error("Billing email is not configured")
  let accepted = 0
  let failed = 0
  for (let i = 0; i < limit; i++) {
    const token = crypto.randomUUID()
    const job = await checked(admin.rpc("billing_claim_work", { p_kind: "notification", p_token: token })) as Job | null
    if (!job) break
    const update = async (values: Record<string, unknown>) => {
      const updated = await checked(admin.from("billing_notification_jobs").update(values)
        .eq("id", job.id).eq("state", "processing").eq("lease_token", token).gt("lease_until", new Date().toISOString()).select("id").single())
      if (!updated) throw new Error("Lost notification lease")
    }
    if (!billingFlag(job.recipient_type === "admin" ? "BILLING_ADMIN_EMAIL_ENABLED" : "BILLING_CLIENT_EMAIL_ENABLED")) {
      await update({ state: "pending", lease_until: null, next_attempt_at: new Date(Date.now() + 86400000).toISOString() })
      continue
    }
    try {
      const incident = await checked(admin.from("billing_incidents").select("invoice_id,livemode,resolved_at,origin").eq("id", job.incident_id).single())
      if (!incident || incident.resolved_at || incident.origin === "historical") {
        await update({ state: "suppressed", lease_until: null }); continue
      }
      const invoice = await stripe.invoices.retrieve(incident.invoice_id)
      const company = await companyForCustomer(admin, ref(invoice.customer) || "")
      if (company.id !== job.company_id || invoice.livemode !== incident.livemode) throw new Error("Notification scope mismatch")
      if (invoice.status !== "open" || invoice.amount_remaining <= 0) {
        await update({ state: "suppressed", lease_until: null }); continue
      }
      const stored = await checked(admin.from("billing_invoices").select("amount_remaining,company_id,customer_id")
        .eq("account_scope", "platform").eq("id", invoice.id).eq("livemode", invoice.livemode)
        .eq("company_id", company.id).eq("customer_id", company.stripe_customer_id).single())
      if (!stored || stored.company_id !== company.id || stored.customer_id !== company.stripe_customer_id ||
        Number(stored.amount_remaining) !== invoice.amount_remaining) throw new Error("Notification ownership or amount changed; review required")
      const source = `billing-notification/${job.id}`
      const prior = await checked(admin.from("email_log").select("id,resend_email_id").eq("source", source).eq("success", true).limit(1).maybeSingle())
      if (!prior) {
        if (!await invoiceFailure(stripe, invoice)) {
          await update({ state: "pending", lease_until: null, next_attempt_at: new Date(Date.now() + 3600000).toISOString(),
            error: "Current payment is not a verified failure; notification deferred" })
          continue
        }
        await checked(admin.from("billing_notification_jobs").select("id").eq("id", job.id)
          .eq("state", "processing").eq("lease_token", token).gt("lease_until", new Date().toISOString()).single())
        const ok = await sendTrackedEmail({ to: job.recipient, subject: job.subject, text: job.text_body,
          html: `<p>${job.text_body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</p>`,
          recipientType: job.recipient_type, companyId: job.company_id, emailType: "billing_payment_attention",
          emailScope: "found", source, admin, idempotencyKey: job.dedupe_key })
        if (!ok) throw new Error("Email not accepted")
      }
      const log = prior || await checked(admin.from("email_log").select("id,resend_email_id").eq("source", source).eq("success", true).limit(1).single())
      if (!log?.resend_email_id) throw new Error("Acceptance not durably logged")
      await update({ state: "accepted", resend_email_id: log.resend_email_id, email_log_id: log.id, lease_until: null, error: null })
      accepted++
    } catch {
      await update({ state: "failed", lease_until: null, next_attempt_at: new Date(Date.now() + 3600000).toISOString(), error: "Notification failed or acceptance uncertain; retry within provider deduplication window" })
      failed++
    }
  }
  return { accepted, failed }
}

export async function consumeBillingWork(admin: SupabaseClient, stripe: Stripe) {
  const events = billingFlag("BILLING_DURABLE_INTAKE_ENABLED") ? await processBillingEvents(admin, stripe, 5) : { completed: 0, failed: 0 }
  const notifications = await processBillingNotifications(admin, stripe, 5)
  return { events, notifications, ok: events.failed === 0 && notifications.failed === 0 }
}

export async function consumeBillingWorkImmediately(admin: SupabaseClient, stripe: Stripe) {
  // Three bounded passes cover initial 2s/4s event backoff and claim errors.
  // Later retries remain durable for cron or the next webhook invocation.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await consumeBillingWork(admin, stripe)
      if (result.ok) return result
    } catch {
      // The lease/backoff rows remain the source of retry state.
    }
    if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 2000 * 2 ** attempt))
  }
  console.error("[Billing] immediate consumer failed; durable work awaits cron recovery")
  return { ok: false }
}

export async function runBillingReconciliation(admin: SupabaseClient, stripe: Stripe) {
  // Daily backup is not an independent monitor or an immediate alert SLA.
  const events = billingFlag("BILLING_DURABLE_INTAKE_ENABLED") ? await processBillingEvents(admin, stripe) : { completed: 0, failed: 0 }
  const results: Array<{ complete?: boolean; skipped?: boolean }> = []
  if (billingFlag("BILLING_RECONCILIATION_ENABLED")) {
    // Bound each invocation; completed customers rotate behind unverified/stale customers.
    const companies: Company[] = []
    for (let offset = 0; ; offset += 500) {
      const rows = await checked(admin.from("companies").select("id,name,email,account_kind,is_test,stripe_customer_id")
        .eq("account_kind", "client").not("stripe_customer_id", "is", null).order("id").range(offset, offset + 499)) as Company[]
      companies.push(...rows.filter(row => !isAdminTestIdentity(row)))
      if (rows.length < 500) break
    }
    const runs = await checked(admin.from("billing_reconciliation_runs").select("company_id,started_at")
      .eq("source", "daily").order("started_at", { ascending: false }).limit(1000))
    const last = new Map<string, string>()
    for (const row of runs || []) if (!last.has(row.company_id)) last.set(row.company_id, row.started_at)
    companies.sort((a,b) => (last.get(a.id) || "").localeCompare(last.get(b.id) || ""))
    for (const company of companies.slice(0, 3)) results.push(await reconcileBillingCustomer(admin, company))
  }
  const notifications = await processBillingNotifications(admin, stripe)
  return { events, reconciliation: results, notifications,
    ok: events.failed === 0 && notifications.failed === 0 && results.every(row => row.complete !== false) }
}
