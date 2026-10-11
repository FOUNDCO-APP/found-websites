import "server-only"
import { getClientBillingLedger, type ClientBillingLedger } from "./billingLedger"

// Amounts are minor currency units; timestamps are UTC. No access decisions are made here.
export type ClientBillingFacts = {
  checkedAt: string
  subscriptionStatus: string | null
  completeness: "complete" | "partial" | "unknown"
  errors: string[]
  outstandingInvoices: {
    status: "known" | "unknown"
    invoices: { id: string; status: "open" | "uncollectible"; amountRemaining: number; currency: string; dueAt: string | null }[]
    balanceByCurrency: Record<string, number> | null
  }
  lastSuccessfulPayment: {
    status: "found" | "none" | "unknown"
    payment: { chargeId: string; amountCaptured: number; currency: string; timestamp: string; timestampBasis: "charge_created" } | null
  }
  latestFailedPayment: {
    status: "found" | "none" | "unknown"
    payment: { chargeId: string; timestamp: string; reason: string | null; code: string | null } | null
  }
  nextCharge: {
    status: "scheduled" | "renewal_expected" | "none" | "unknown"
    scheduledAttempt: { invoiceId: string; at: string; amountRemaining: number; currency: string } | null
    expectedRenewal: { subscriptionId: string; at: string } | null
  }
}

const iso = (seconds: number) => new Date(seconds * 1000).toISOString()

export function buildClientBillingFacts(ledger: ClientBillingLedger, checkedAt = new Date().toISOString()): ClientBillingFacts {
  const facts: ClientBillingFacts = {
    checkedAt,
    subscriptionStatus: null,
    completeness: ledger.complete ? "complete" : ledger.customer ? "partial" : "unknown",
    errors: [...ledger.errors],
    outstandingInvoices: { status: "unknown", invoices: [], balanceByCurrency: null },
    lastSuccessfulPayment: { status: "unknown", payment: null },
    latestFailedPayment: { status: "unknown", payment: null },
    nextCharge: { status: "unknown", scheduledAttempt: null, expectedRenewal: null },
  }
  // The ledger cannot guarantee which record is latest or an exact total after any failed read.
  if (!ledger.complete || ledger.mode !== "live" || !ledger.customer) return facts

  const subscriptions = [...ledger.subscriptions].sort((a, b) =>
    (b.subscription.created ?? 0) - (a.subscription.created ?? 0) || b.id.localeCompare(a.id))
  const currentSubscriptions = subscriptions.filter(row => row.status === "active" || row.status === "trialing")
  facts.subscriptionStatus = currentSubscriptions.length > 1 ? "multiple"
    : (currentSubscriptions[0] ?? subscriptions[0])?.status ?? null

  const now = Date.parse(checkedAt)
  const invoices = ledger.invoices.flatMap(row =>
    (row.status === "open" || row.status === "uncollectible") && row.amount_remaining > 0
      ? [{ id: row.id, status: row.status, amountRemaining: row.amount_remaining, currency: row.currency, dueAt: row.due_at }]
      : [])
  const balanceByCurrency: Record<string, number> = {}
  for (const row of invoices) balanceByCurrency[row.currency] = (balanceByCurrency[row.currency] ?? 0) + row.amountRemaining
  facts.outstandingInvoices = { status: "known", invoices, balanceByCurrency }

  const charges = ledger.charges.map(row => row.charge).sort((a, b) => b.created - a.created || b.id.localeCompare(a.id))
  const captured = charges.find(charge => charge.status === "succeeded" && charge.paid && charge.captured && charge.amount_captured > 0)
  facts.lastSuccessfulPayment = {
    status: captured ? "found" : "none",
    // Charge.created is not a separate capture timestamp, especially for delayed capture.
    payment: captured ? { chargeId: captured.id, amountCaptured: captured.amount_captured, currency: captured.currency,
      timestamp: iso(captured.created), timestampBasis: "charge_created" } : null,
  }
  const failed = charges.find(charge => charge.status === "failed")
  facts.latestFailedPayment = {
    status: failed ? "found" : "none",
    payment: failed ? { chargeId: failed.id, timestamp: iso(failed.created), reason: failed.failure_message,
      code: failed.failure_code } : null,
  }
  // Some failures never create a charge; the ledger's intent projection has no attempt timestamp.
  if (ledger.payment_intents.some(intent => intent.last_payment_error && !charges.some(charge =>
    charge.status === "failed" && charge.id === (typeof intent.latest_charge === "string" ? intent.latest_charge : intent.latest_charge?.id)))) {
    facts.latestFailedPayment = { status: "unknown", payment: null }
    facts.errors.push("A payment intent has an unranked failure; the ledger does not expose its attempt timestamp.")
  }

  const attempts = ledger.invoices.filter(row => row.status === "open" && row.amount_remaining > 0 &&
    row.collection_method === "charge_automatically" && row.next_payment_attempt && Date.parse(row.next_payment_attempt) > now)
    .sort((a, b) => Date.parse(a.next_payment_attempt!) - Date.parse(b.next_payment_attempt!))
  const attempt = attempts[0]
  const renewals = ledger.subscriptions.flatMap(row => {
    if (!["active", "trialing"].includes(row.status) || row.collection_method !== "charge_automatically" ||
      row.pause_collection || row.cancel_at_period_end || row.schedule) return []
    const ends = row.status === "trialing" && row.subscription.trial_end
      ? [row.subscription.trial_end] : row.items.map(item => item.current_period_end)
    return ends.filter(end => end * 1000 > now && (!row.cancel_at || end < row.cancel_at))
      .map(end => ({ subscriptionId: row.id, at: iso(end) }))
  }).sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
  facts.nextCharge.expectedRenewal = renewals[0] ?? null
  if (attempt) {
    facts.nextCharge.status = "scheduled"
    facts.nextCharge.scheduledAttempt = { invoiceId: attempt.id, at: attempt.next_payment_attempt!,
      amountRemaining: attempt.amount_remaining, currency: attempt.currency }
  } else {
    const unresolvedInvoice = ledger.invoices.some(row => ["draft", "open"].includes(row.status ?? "") &&
      row.amount_remaining > 0 && row.collection_method === "charge_automatically" && row.auto_advance)
    const unresolvedSubscription = ledger.subscriptions.some(row => !["canceled", "incomplete_expired", "paused"].includes(row.status) &&
      row.collection_method === "charge_automatically" && !row.pause_collection && !row.cancel_at_period_end &&
      !renewals.some(renewal => renewal.subscriptionId === row.id))
    const unresolvedSchedule = ledger.schedules.some(row => ["active", "not_started"].includes(row.status))
    if (unresolvedInvoice || unresolvedSubscription || unresolvedSchedule) {
      facts.errors.push("Future automatic billing exists without a confirmed next attempt in the ledger.")
    } else facts.nextCharge.status = renewals.length ? "renewal_expected" : "none"
  }
  if (facts.errors.length) facts.completeness = "partial"
  return facts
}

// The caller must authorize this company's customer ID before reading its ledger.
export async function getClientBillingFacts(customerId: string | null | undefined): Promise<ClientBillingFacts> {
  return buildClientBillingFacts(await getClientBillingLedger(customerId ?? ""))
}
