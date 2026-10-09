import "server-only"
import Stripe from "stripe"
import { cookies } from "next/headers"
import { getAdminClient } from "@/app/admin/lib"
import { isAdminTestIdentity } from "@/app/admin/testIdentity"

type Company = { id: string; name: string; slug: string; email: string | null; account_kind: string | null; is_test: boolean | null; stripe_customer_id: string | null }
export type BillingInvoice = Pick<Stripe.Invoice, "id" | "status" | "currency" | "amount_paid" | "amount_remaining" | "amount_due" | "total" | "attempt_count" | "collection_method" | "billing_reason" | "auto_advance"> & {
  created_at: string; paid_at: string | null; due_at: string | null; next_payment_attempt: string | null; subscription: string | null
  invoice: Stripe.Invoice; lines: Stripe.InvoiceLineItem[]; payments: Stripe.InvoicePayment[]; credit_notes: { note: Stripe.CreditNote; lines: Stripe.CreditNoteLineItem[] }[]
}
export type BillingSubscription = Pick<Stripe.Subscription, "id" | "status" | "collection_method" | "pause_collection" | "cancel_at_period_end" | "cancel_at" | "canceled_at" | "ended_at" | "schedule" | "latest_invoice"> & {
  subscription: Stripe.Subscription; items: Stripe.SubscriptionItem[]
}
type Totals = { invoice_paid: number; open_remaining: number; uncollectible_remaining: number; captured_charges: number; captured_card_charges: number; succeeded_refunds: number }
export type ClientBillingLedger = {
  customer_id: string; mode: "live" | "test" | "unavailable"; complete: boolean; errors: string[]; verified_at: string | null
  customer: Pick<Stripe.Customer, "id" | "name" | "currency" | "balance" | "delinquent" | "invoice_credit_balance"> | null
  invoices: BillingInvoice[]; charges: { charge: Stripe.Charge; refunds: Stripe.Refund[] }[]
  balance_transactions: Stripe.CustomerBalanceTransaction[]
  subscriptions: BillingSubscription[]
  schedules: Stripe.SubscriptionSchedule[]
  payment_intents: Pick<Stripe.PaymentIntent, "id" | "status" | "latest_charge" | "last_payment_error" | "amount_received" | "currency">[]
  totals_by_currency: Record<string, Totals> | null
}
export type CompanyLedger = ClientBillingLedger & { company: Company }
const iso = (value: number | null | undefined) => value == null ? null : new Date(value * 1000).toISOString()

function liveStripe() {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  const mode = key && /^(sk|rk)_live_/.test(key) ? "live" as const : key && /^(sk|rk)_test_/.test(key) ? "test" as const : "unavailable" as const
  return { mode, stripe: mode === "live" ? new Stripe(key!, { maxNetworkRetries: 2, timeout: 30000 }) : null }
}

export async function authorizeBillingAdmin(headerKey?: string | null) {
  const expected = process.env.ADMIN_KEY
  if (!expected) throw new Error("Unauthorized")
  const cookieKey = (await cookies()).get("admin_key")?.value
  if (headerKey !== expected && cookieKey !== expected) throw new Error("Unauthorized")
}

// Iterate every page; an API failure never returns a truncated list as complete.
async function all<T>(request: AsyncIterable<T>): Promise<T[]> {
  const rows: T[] = []
  for await (const row of request) {
    if (row && typeof row === "object" && "livemode" in row && row.livemode !== true) {
      throw new Error("Non-live Stripe record")
    }
    rows.push(row)
  }
  return rows
}

async function companies(): Promise<Company[]> {
  const admin = getAdminClient()
  const rows: Company[] = []
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await admin.from("companies")
      .select("id,name,slug,email,account_kind,is_test,stripe_customer_id")
      .order("id").range(offset, offset + 499)
    if (error || !data) throw new Error("Company query failed; portfolio completeness is unknown.")
    rows.push(...data)
    if (data.length < 500) break
  }
  return rows.filter((row) => row.account_kind === "client" && !isAdminTestIdentity(row))
}

// Server-side callers must authorize ownership before supplying a customer ID.
export async function getClientBillingLedger(customerId: string): Promise<ClientBillingLedger> {
  const { stripe, mode } = liveStripe()
  const result: ClientBillingLedger = { customer_id: customerId, mode, complete: false, errors: [], verified_at: null, customer: null,
    invoices: [], charges: [], balance_transactions: [], subscriptions: [], schedules: [], payment_intents: [], totals_by_currency: null }
  if (!stripe || !customerId) {
    result.errors.push(!stripe ? `Live billing unknown: Stripe mode is ${mode}.` : "Live billing unknown: no Stripe customer is linked.")
    return result
  }
  async function read<T>(label: string, work: () => Promise<T>): Promise<T | null> {
    try { return await work() }
    catch (error) {
      const code = error instanceof Stripe.errors.StripeError ? error.code ?? error.type : "read_failed"
      result.errors.push(`${label}: ${code}. Completeness unknown; check live account and read permissions.`)
      return null
    }
  }
  const customer = await read("Customer", () => stripe!.customers.retrieve(customerId))
  if (!customer || customer.deleted || !customer.livemode) {
    result.errors.push("Customer is unavailable, deleted, or not live. Billing unknown.")
    return result
  }
  result.customer = { id: customer.id, name: customer.name, currency: customer.currency, balance: customer.balance,
    delinquent: customer.delinquent, invoice_credit_balance: customer.invoice_credit_balance }
  const invoices = await read("Invoices", () => all(stripe!.invoices.list({ customer: customerId, limit: 100 })))
  for (const invoice of invoices ?? []) {
    const lines = await read(`${invoice.id} lines`, () => all(stripe!.invoices.listLineItems(invoice.id, { limit: 100 })))
    const payments = await read(`${invoice.id} allocations`, () => all(stripe!.invoicePayments.list({ invoice: invoice.id, limit: 100 })))
    const notes = await read(`${invoice.id} credits`, () => all(stripe!.creditNotes.list({ invoice: invoice.id, limit: 100 })))
    const credit_notes: BillingInvoice["credit_notes"] = []
    for (const note of notes ?? []) {
      const noteLines = await read(`${note.id} lines`, () => all(stripe!.creditNotes.listLineItems(note.id, { limit: 100 })))
      credit_notes.push({ note, lines: noteLines ?? [] })
    }
    for (const payment of payments ?? []) {
      const reference = payment.payment.payment_intent
      const intentId = typeof reference === "string" ? reference : reference?.id
      if (!intentId || result.payment_intents.some((intent) => intent.id === intentId)) continue
      const intent = await read(`${intentId} payment intent`, () => stripe!.paymentIntents.retrieve(intentId))
      if (intent && intent.livemode) result.payment_intents.push({ id: intent.id, status: intent.status, latest_charge: intent.latest_charge,
        last_payment_error: intent.last_payment_error, amount_received: intent.amount_received, currency: intent.currency })
      else if (intent) result.errors.push(`${intentId}: non-live payment intent.`)
    }
    const subscriptionRef = invoice.parent?.subscription_details?.subscription
    result.invoices.push({ id: invoice.id, status: invoice.status, currency: invoice.currency,
      amount_paid: invoice.amount_paid, amount_remaining: invoice.amount_remaining, amount_due: invoice.amount_due,
      total: invoice.total, attempt_count: invoice.attempt_count, collection_method: invoice.collection_method,
      billing_reason: invoice.billing_reason, auto_advance: invoice.auto_advance,
      created_at: iso(invoice.created)!, paid_at: iso(invoice.status_transitions.paid_at), due_at: iso(invoice.due_date),
      next_payment_attempt: iso(invoice.next_payment_attempt), subscription: typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef?.id ?? null,
      invoice, lines: lines ?? [], payments: payments ?? [], credit_notes })
  }
  const charges = await read("Charges", () => all(stripe!.charges.list({ customer: customerId, limit: 100 })))
  for (const charge of charges ?? []) {
    const refunds = await read(`${charge.id} refunds`, () => all(stripe!.refunds.list({ charge: charge.id, limit: 100 })))
    result.charges.push({ charge, refunds: refunds ?? [] })
  }
  result.balance_transactions = await read("Balance transactions", () => all(stripe!.customers.listBalanceTransactions(customerId, { limit: 100 }))) ?? []
  const subscriptions = await read("Subscriptions", () => all(stripe!.subscriptions.list({ customer: customerId, status: "all", limit: 100 })))
  for (const subscription of subscriptions ?? []) {
    const items = await read(`${subscription.id} items`, () => all(stripe!.subscriptionItems.list({ subscription: subscription.id, limit: 100 })))
    result.subscriptions.push({ id: subscription.id, status: subscription.status, collection_method: subscription.collection_method,
      pause_collection: subscription.pause_collection, cancel_at_period_end: subscription.cancel_at_period_end,
      cancel_at: subscription.cancel_at, canceled_at: subscription.canceled_at, ended_at: subscription.ended_at,
      schedule: subscription.schedule, latest_invoice: subscription.latest_invoice, subscription, items: items ?? [] })
  }
  result.schedules = await read("Subscription schedules", () => all(stripe!.subscriptionSchedules.list({ customer: customerId, limit: 100 }))) ?? []
  // Referenced schedules may no longer appear in the customer's list.
  for (const { subscription } of result.subscriptions) {
    const scheduleId = typeof subscription.schedule === "string" ? subscription.schedule : subscription.schedule?.id
    if (!scheduleId || result.schedules.some((schedule) => schedule.id === scheduleId)) continue
    const schedule = await read(`${scheduleId} schedule`, () => stripe!.subscriptionSchedules.retrieve(scheduleId))
    if (schedule?.livemode) result.schedules.push(schedule)
    else if (schedule) result.errors.push(`${scheduleId}: non-live schedule.`)
  }
  result.complete = result.errors.length === 0
  if (result.complete) {
    const totals: Record<string, Totals> = {}
    const currencyTotals = (currency: string) => totals[currency] ??= { invoice_paid: 0, open_remaining: 0, uncollectible_remaining: 0,
      captured_charges: 0, captured_card_charges: 0, succeeded_refunds: 0 }
    for (const { invoice } of result.invoices) {
      const total = currencyTotals(invoice.currency)
      total.invoice_paid += invoice.amount_paid
      if (invoice.status === "open") total.open_remaining += invoice.amount_remaining
      if (invoice.status === "uncollectible") total.uncollectible_remaining += invoice.amount_remaining
    }
    for (const { charge, refunds } of result.charges) {
      const total = currencyTotals(charge.currency)
      if (charge.status === "succeeded" && charge.paid) {
        total.captured_charges += charge.amount_captured
        if (charge.payment_method_details?.type === "card") total.captured_card_charges += charge.amount_captured
      }
      for (const refund of refunds) if (refund.status === "succeeded") currencyTotals(refund.currency).succeeded_refunds += refund.amount
    }
    result.totals_by_currency = totals
    result.verified_at = new Date().toISOString()
  }
  return result
}

export async function getAdminBillingLedger(headerKey?: string | null) {
  await authorizeBillingAdmin(headerKey)
  const started_at = new Date().toISOString()
  const { mode } = liveStripe()
  const errors: string[] = []
  let authorizedCompanies: Company[] = []
  try { authorizedCompanies = await companies() }
  catch { errors.push("Company query failed; portfolio completeness is unknown.") }
  const clients: CompanyLedger[] = []
  for (const company of authorizedCompanies) clients.push({ company, ...await getClientBillingLedger(company.stripe_customer_id ?? "") })
  const complete = mode === "live" && errors.length === 0 && clients.every((client) => client.complete)
  return { started_at, finished_at: new Date().toISOString(), mode, complete, errors,
    summary: summarizeBillingPortfolio(clients, complete),
    amount_units: "Minor currency units", timestamp_timezone: "UTC",
    limits: "Invoice paid amounts can include credits or out-of-band payments. Captured charges are not bank payouts. Reads are current but not an atomic snapshot. No debt is inferred from missing renewals.", clients }
}

export function summarizeBillingPortfolio(clients: CompanyLedger[], complete: boolean, now = Date.now()) {
  const totals: Record<string, Totals> = {}
  if (complete) for (const client of clients) for (const [currency, values] of Object.entries(client.totals_by_currency ?? {})) {
    const total = totals[currency] ??= { invoice_paid: 0, open_remaining: 0, uncollectible_remaining: 0,
      captured_charges: 0, captured_card_charges: 0, succeeded_refunds: 0 }
    for (const key of Object.keys(total) as (keyof Totals)[]) total[key] += values[key]
  }
  return {
    companies: clients.length, verified: clients.filter((client) => client.complete).length,
    unknown: clients.filter((client) => !client.complete).length,
    totals_by_currency: complete ? totals : null,
    open_invoices: clients.flatMap((client) => client.invoices.filter((row) => row.status === "open" && row.amount_remaining > 0)
      .map((row) => ({ company_id: client.company.id, company_name: client.company.name, invoice_id: row.id,
        currency: row.currency, amount_remaining: row.amount_remaining, due_at: row.due_at,
        attempt_count: row.attempt_count, next_payment_attempt: row.next_payment_attempt,
        collection_method: row.collection_method, company_complete: client.complete }))),
    // A missing due date or renewal is not evidence of overdue debt.
    overdue_invoices: clients.flatMap((client) => client.invoices.filter((row) => row.status === "open" && row.amount_remaining > 0 && row.due_at !== null && Date.parse(row.due_at) < now)
      .map((row) => ({ company_id: client.company.id, company_name: client.company.name, invoice_id: row.id,
        currency: row.currency, amount_remaining: row.amount_remaining, due_at: row.due_at, company_complete: client.complete }))),
  }
}
