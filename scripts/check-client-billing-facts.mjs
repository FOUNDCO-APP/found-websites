import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import vm from "node:vm"
import ts from "typescript"

// Exercise the real pure builder without loading server-only or making network requests.
const source = readFileSync(new URL("../src/lib/stripe/clientBillingFacts.ts", import.meta.url), "utf8")
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
const sandbox = {
  exports: {},
  require(name) {
    if (name === "server-only") return {}
    if (name === "./billingLedger") return { getClientBillingLedger() { throw new Error("Unexpected ledger retrieval") } }
    throw new Error(`Unexpected import: ${name}`)
  },
  Date,
}
vm.runInNewContext(compiled, sandbox)
const build = sandbox.exports.buildClientBillingFacts
const checkedAt = "2026-10-11T12:00:00.000Z"
const future = Date.parse("2026-11-01T12:00:00Z") / 1000
const base = {
  complete: true, mode: "live", errors: [], customer: { id: "cus_fixture" },
  invoices: [], charges: [], subscriptions: [], schedules: [], payment_intents: [],
}
const invoice = {
  id: "in_open", status: "open", currency: "usd", amount_remaining: 1234, amount_paid: 500,
  due_at: null, collection_method: "charge_automatically", auto_advance: true,
  next_payment_attempt: new Date(future * 1000).toISOString(),
}
const subscription = {
  id: "sub_fixture", status: "active", collection_method: "charge_automatically",
  pause_collection: null, cancel_at_period_end: false, cancel_at: null, schedule: null,
  subscription: { created: 100, trial_end: null }, items: [{ current_period_end: future }],
}
let checks = 0
function check(name, run) {
  run()
  checks++
  console.log(`PASS ${name}`)
}

check("empty complete ledger has known empty balance and no scheduled charge", () => {
  const facts = build(base, checkedAt)
  assert.equal(facts.checkedAt, checkedAt)
  assert.equal(facts.nextCharge.status, "none")
  assert.equal(facts.outstandingInvoices.status, "known")
  assert.equal(Object.keys(facts.outstandingInvoices.balanceByCurrency).length, 0)
  assert.equal(facts.subscriptionStatus, null)
})
check("test mode remains unknown", () => {
  const facts = build({ ...base, mode: "test", complete: false, customer: null, subscriptions: [subscription] }, checkedAt)
  assert.equal(facts.completeness, "unknown")
  assert.equal(facts.nextCharge.status, "unknown")
  assert.equal(facts.outstandingInvoices.balanceByCurrency, null)
  assert.equal(facts.subscriptionStatus, null)
})
check("partial reads cannot assert zero, latest payment, or subscription status", () => {
  const facts = build({ ...base, complete: false, subscriptions: [subscription], errors: ["Charges: read_failed"] }, checkedAt)
  assert.equal(facts.completeness, "partial")
  assert.equal(facts.lastSuccessfulPayment.status, "unknown")
  assert.equal(facts.outstandingInvoices.status, "unknown")
  assert.equal(facts.subscriptionStatus, null)
})
check("exact remaining balances separate currencies and exclude draft/paid/void", () => {
  const facts = build({ ...base, invoices: [invoice,
    { ...invoice, id: "in_bad", status: "uncollectible", currency: "eur", amount_remaining: 800 },
    ...["draft", "paid", "void"].map(status => ({ ...invoice, status })),
  ] }, checkedAt)
  assert.equal(facts.outstandingInvoices.balanceByCurrency.usd, 1234)
  assert.equal(facts.outstandingInvoices.balanceByCurrency.eur, 800)
  assert.equal(facts.outstandingInvoices.invoices.length, 2)
})
check("only an explicit invoice attempt is scheduled", () => {
  const facts = build({ ...base, invoices: [invoice] }, checkedAt)
  assert.equal(facts.nextCharge.status, "scheduled")
  assert.equal(facts.nextCharge.scheduledAttempt.amountRemaining, 1234)
})
check("period end is expected renewal only", () => {
  const facts = build({ ...base, subscriptions: [subscription] }, checkedAt)
  assert.equal(facts.nextCharge.status, "renewal_expected")
  assert.equal(facts.nextCharge.scheduledAttempt, null)
  assert.equal(facts.nextCharge.expectedRenewal.subscriptionId, "sub_fixture")
})
check("missing retry and future schedule do not imply none", () => {
  assert.equal(build({ ...base, invoices: [{ ...invoice, next_payment_attempt: null }] }, checkedAt).nextCharge.status, "unknown")
  assert.equal(build({ ...base, schedules: [{ status: "not_started" }] }, checkedAt).nextCharge.status, "unknown")
})
check("captured amount excludes authorization and labels charge creation time", () => {
  const captured = { id: "ch_capture", status: "succeeded", paid: true, captured: true,
    amount_captured: 700, currency: "usd", created: 100 }
  const facts = build({ ...base, charges: [{ charge: captured },
    { charge: { ...captured, id: "ch_auth", captured: false, created: 200 } }],
  }, checkedAt)
  assert.equal(facts.lastSuccessfulPayment.payment.chargeId, "ch_capture")
  assert.equal(facts.lastSuccessfulPayment.payment.amountCaptured, 700)
  assert.equal(facts.lastSuccessfulPayment.payment.timestamp, new Date(100000).toISOString())
  assert.equal(facts.lastSuccessfulPayment.payment.timestampBasis, "charge_created")
})
check("failed charge reason and unrankable intent failure", () => {
  const failed = { id: "ch_failed", status: "failed", created: 100,
    failure_message: "Declined", failure_code: "card_declined" }
  assert.equal(build({ ...base, charges: [{ charge: failed }] }, checkedAt).latestFailedPayment.payment.reason, "Declined")
  assert.equal(build({ ...base, payment_intents: [{ id: "pi_fixture",
    last_payment_error: { message: "Authentication needed" }, latest_charge: null }],
  }, checkedAt).latestFailedPayment.status, "unknown")
})
check("unique active/trialing subscription takes precedence over newer historical rows", () => {
  for (const status of ["active", "trialing"]) {
    const facts = build({ ...base, subscriptions: [
      { ...subscription, status },
      { ...subscription, id: "sub_newer", status: "canceled", subscription: { created: 200 } },
    ] }, checkedAt)
    assert.equal(facts.subscriptionStatus, status)
  }
})
check("multiple active/trialing subscriptions are explicit", () => {
  assert.equal(build({ ...base, subscriptions: [subscription,
    { ...subscription, id: "sub_trial", status: "trialing" }],
  }, checkedAt).subscriptionStatus, "multiple")
})
check("historical status uses subscription creation time with deterministic fallback", () => {
  const older = { ...subscription, id: "sub_z", status: "canceled", subscription: { created: 100 } }
  const newer = { ...subscription, id: "sub_a", status: "unpaid", subscription: { created: 200 } }
  for (const rows of [[older, newer], [newer, older]]) {
    assert.equal(build({ ...base, subscriptions: rows }, checkedAt).subscriptionStatus, "unpaid")
  }
  assert.equal(build({ ...base, subscriptions: [
    { ...older, subscription: {} }, { ...newer, subscription: {} },
  ] }, checkedAt).subscriptionStatus, "canceled")
})

console.log(`${checks} client billing facts checks passed`)
