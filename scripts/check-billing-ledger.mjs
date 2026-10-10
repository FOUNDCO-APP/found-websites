import assert from "node:assert/strict"
import fs from "node:fs"
import vm from "node:vm"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const ts = require("typescript")
const env = { STRIPE_SECRET_KEY: "sk_live_fixture", ADMIN_KEY: "fixture-admin" }
let cookieKey = env.ADMIN_KEY
let failCharges = false
let pagesRead = 0
const company = { id: "company_fixture", name: "Fixture Business", slug: "fixture", email: "owner@example.test",
  account_kind: "client", is_test: false, stripe_customer_id: "cus_fixture" }
const paid = { id: "in_paid", livemode: true, status: "paid", currency: "usd", total: 6900,
  amount_due: 6900, amount_paid: 6900, amount_remaining: 0, created: 100, status_transitions: { paid_at: 200 },
  attempt_count: 1, collection_method: "charge_automatically", billing_reason: "subscription_cycle", auto_advance: false,
  due_date: null, next_payment_attempt: null, parent: { subscription_details: { subscription: "sub_fixture" } } }
const open = { ...paid, id: "in_open", status: "open", total: 3900, amount_due: 3900,
  amount_paid: 1000, amount_remaining: 2900, status_transitions: { paid_at: null }, attempt_count: 3 }
const trial = { ...paid, id: "in_trial", total: 0, amount_due: 0, amount_paid: 0 }
const stream = (rows) => ({ async *[Symbol.asyncIterator]() { for (const row of rows) yield row } })
const charge = { id: "ch_paid", livemode: true, currency: "usd", status: "succeeded", paid: true,
  amount: 6900, amount_captured: 6900, payment_method_details: { type: "card" } }
const sdk = {
  customers: { retrieve: async () => ({ id: "cus_fixture", livemode: true, name: company.name, balance: -500, currency: "usd", delinquent: true }),
    listBalanceTransactions: () => stream([]) },
  invoices: {
    list: () => ({ async *[Symbol.asyncIterator]() { pagesRead++; yield paid; pagesRead++; yield open; yield trial } }),
    listLineItems: () => stream([]),
  },
  invoicePayments: { list: () => stream([]) },
  creditNotes: { list: () => stream([]), listLineItems: () => stream([]) },
  charges: { list: () => ({ async *[Symbol.asyncIterator]() { yield charge; if (failCharges) throw new Error("Second page failed") } }) },
  refunds: { list: () => stream([{ id: "re_ok", livemode: true, currency: "usd", amount: 1000, status: "succeeded" },
    { id: "re_failed", livemode: true, currency: "usd", amount: 500, status: "failed" }]) },
  subscriptions: { list: () => stream([{ id: "sub_fixture", livemode: true, status: "past_due", collection_method: "charge_automatically" }]) },
  subscriptionItems: { list: () => stream([]) },
  subscriptionSchedules: { list: () => stream([]) },
}
class Stripe {
  static errors = { StripeError: class StripeError extends Error {} }
  constructor() { Object.assign(this, sdk) }
}
const query = { select() { return this }, order() { return this }, range: async () => ({ data: [company], error: null }) }
const stubs = {
  "server-only": {}, stripe: Stripe,
  "next/headers": { cookies: async () => ({ get: () => cookieKey ? { value: cookieKey } : undefined }) },
  "@/app/admin/lib": { getAdminClient: () => ({ from: () => query }) },
  "@/app/admin/testIdentity": { isAdminTestIdentity: (row) => row.is_test === true || row.account_kind === "test" },
}
function load(file, additional = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } }).outputText
  const module = { exports: {} }
  vm.runInNewContext(code, { exports: module.exports, module, process: { env }, console, Date, URL,
    require: (name) => Object.hasOwn(additional, name) ? additional[name] : Object.hasOwn(stubs, name) ? stubs[name] : require(name) })
  return module.exports
}
const ledger = load("src/lib/stripe/billingLedger.ts")
const complete = await ledger.getClientBillingLedger("cus_fixture")
assert.equal(complete.complete, true)
assert.equal(complete.invoices.length, 3)
assert.equal(pagesRead, 2, "All invoice pages must be consumed")
assert.equal(complete.invoices[0].created_at, new Date(100000).toISOString())
assert.equal(complete.invoices[0].paid_at, new Date(200000).toISOString())
assert.equal(complete.totals_by_currency.usd.invoice_paid, 7900)
assert.equal(complete.totals_by_currency.usd.open_remaining, 2900, "Invoice face value is not the remaining balance")
assert.equal(complete.totals_by_currency.usd.captured_card_charges, 6900, "Paid invoice amounts must not be treated as card captures")
assert.equal(complete.totals_by_currency.usd.succeeded_refunds, 1000, "Failed refunds are not money returned")
const summary = ledger.summarizeBillingPortfolio([{ ...complete, company }], true)
assert.equal(summary.open_invoices.length, 1, "Automatic invoices with no due_date still need attention")
assert.equal(summary.overdue_invoices.length, 0, "Missing due_date must not invent an overdue deadline")

failCharges = true
const partial = await ledger.getClientBillingLedger("cus_fixture")
assert.equal(partial.complete, false)
assert.equal(partial.totals_by_currency, null)
assert.equal(partial.verified_at, null)
assert.ok(partial.errors.length > 0, "A later-page failure must be visible")
failCharges = false
env.STRIPE_SECRET_KEY = "sk_test_fixture"
const testMode = await ledger.getClientBillingLedger("cus_fixture")
assert.equal(testMode.mode, "test")
assert.equal(testMode.complete, false)
assert.equal(testMode.totals_by_currency, null)

cookieKey = null
await assert.rejects(ledger.authorizeBillingAdmin("wrong"), /Unauthorized/)
await ledger.authorizeBillingAdmin(env.ADMIN_KEY)
const route = load("src/app/api/admin/billing-audit/route.ts", {
  "@/lib/stripe/billingLedger": ledger,
  "next/server": { NextResponse: { json: (body, options = {}) => ({ body, ...options }) } },
})
const unauthorized = await route.GET(new Request("https://found.example/api/admin/billing-audit?key=fixture-admin"))
assert.equal(unauthorized.status, 401, "Credentials in the URL must not authorize financial exports")
assert.equal(unauthorized.headers["Cache-Control"], "private, no-store")
const exported = await route.GET(new Request("https://found.example/api/admin/billing-audit", { headers: { "x-admin-key": env.ADMIN_KEY } }))
assert.equal(exported.body.complete, false, "Test-mode exports cannot be labeled live verified")
assert.equal(exported.headers["Cache-Control"], "private, no-store")
assert.match(exported.headers["Content-Disposition"], /attachment/)
const routing = load("src/middleware.ts", {
  "next/server": { NextResponse: {
    next: () => ({ kind: "next" }), rewrite: (url) => ({ kind: "rewrite", pathname: url.pathname }),
    redirect: (url) => ({ kind: "redirect", pathname: url.pathname }),
  } },
})
function adminRequest(pathname) {
  return { headers: new Headers({ host: "admin.foundco.app" }), nextUrl: {
    pathname, clone: () => new URL(`https://admin.foundco.app${pathname}`),
  } }
}
assert.equal((await routing.middleware(adminRequest("/api/admin/billing-audit"))).kind, "next")
assert.equal((await routing.middleware(adminRequest("/clients"))).pathname, "/admin/clients")
const stored = load("src/lib/stripe/billingSummary.ts")
const verifiedAt = "2026-10-10T08:30:00.000Z"
const facts = [
  { company_id: company.id, object_type: "customer", verified_at: verifiedAt, facts: { ledger_complete: true } },
  { company_id: company.id, object_type: "subscription", verified_at: verifiedAt, facts: { status: "canceled" } },
  { company_id: company.id, object_type: "service_access_override", verified_at: verifiedAt, facts: { preserve_access: true } },
]
const debt = [{ company_id: company.id, status: "open", currency: "usd", amount_remaining: 3900, verified_at: verifiedAt, facts: { failure_kind: "payment_failed" } }]
const protectedSummary = stored.summarizeStoredBilling(facts, debt, Date.parse(verifiedAt) + 60000)
assert.equal(protectedSummary.status, "canceled")
assert.equal(protectedSummary.preserveAccess, true)
assert.equal(protectedSummary.needsAttention, true)
assert.equal(protectedSummary.balances.usd, 3900)
assert.match(protectedSummary.label, /canceled.*\$39\.00 unpaid/)
assert.equal(protectedSummary.stale, false)
assert.equal(stored.summarizeStoredBilling(facts, debt, Date.parse(verifiedAt) + 25 * 3600000).stale, true)
assert.equal(stored.summarizeStoredBilling([], []).status, null)
console.log("Billing ledger regression checks passed: complete pagination, real paid dates, exact balances, separate cash/refunds, incomplete/test mode, automatic invoice attention, and export authorization.")
