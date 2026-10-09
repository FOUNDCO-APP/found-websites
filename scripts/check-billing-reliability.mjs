import assert from "node:assert/strict"
import fs from "node:fs"
import vm from "node:vm"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const ts = require("typescript")
const rows = []
let providerResult
let sendOptions
const admin = { from: () => ({ insert: async (row) => { rows.push(row); return { error: null } } }) }
class Resend {
  emails = { send: async (_message, options) => { sendOptions = options; return providerResult } }
}
const source = fs.readFileSync("src/lib/emailLog.ts", "utf8")
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const module = { exports: {} }
vm.runInNewContext(code, {
  exports: module.exports, module,
  require: (name) => name === "resend" ? { Resend } : name === "@supabase/supabase-js" ? { createClient: () => admin } : require(name),
  process: { env: {} }, console: { error() {} },
})
const message = { to: "owner@example.test", subject: "Payment needs attention", html: "<p>Update payment</p>",
  text: "Update payment", recipientType: "client_owner", emailType: "billing_payment_failed", source: "billing-test", admin }

providerResult = { data: null, error: { message: "Provider rejected email" } }
assert.equal(await module.exports.sendTrackedEmail(message), false)
assert.equal(rows.at(-1).success, false)
assert.match(rows.at(-1).error, /Provider rejected/)

providerResult = { data: null, error: null }
assert.equal(await module.exports.sendTrackedEmail(message), false)
assert.equal(rows.at(-1).success, false)

providerResult = { data: { id: "email_accepted" }, error: null }
assert.equal(await module.exports.sendTrackedEmail({ ...message, idempotencyKey: "billing-incident-1" }), true)
assert.equal(rows.at(-1).success, true)
assert.equal(rows.at(-1).resend_email_id, "email_accepted")
assert.equal(sendOptions.idempotencyKey, "billing-incident-1")

console.log("Billing email regression checks passed: provider errors are not recorded as sent; acceptance and idempotency are preserved.")

const React = require("react")
const { renderToStaticMarkup } = require("react-dom/server")
const billingFixture = {
  company: { id: "company_fixture", name: "Billing Fixture", plan: "found", stripe_customer_id: "cus_fixture", subscription_status: "trialing", is_comp: false },
  subscription: null,
  invoice: null,
  unavailable: false,
}

class FixtureStripe {
  customers = {
    retrieve: async () => {
      if (billingFixture.unavailable) throw new Error("Fixture billing unavailable")
      return { invoice_settings: { default_payment_method: { card: { brand: "visa", last4: "4242" } } } }
    },
  }
  subscriptions = { list: async () => ({ data: billingFixture.subscription ? [billingFixture.subscription] : [] }) }
  invoices = {
    list: async () => ({ data: [billingFixture.invoice] }),
    retrieve: async () => billingFixture.invoice,
  }
}

function loadBillingPage(path) {
  const pageCode = ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText
  const pageModule = { exports: {} }
  vm.runInNewContext(pageCode, {
    module: pageModule, exports: pageModule.exports,
    process: { env: { STRIPE_SECRET_KEY: "fixture_only" } }, console: { error() {} }, Intl, Date,
    require: (name) => {
      if (name === "stripe") return FixtureStripe
      if (name === "next/link") return (props) => React.createElement("a", props, props.children)
      if (name === "next/navigation") return {
        redirect: () => { throw new Error("Unexpected fixture redirect") },
        notFound: () => { throw new Error("Unexpected fixture notFound") },
      }
      if (name === "@/lib/auth/getAuthUser") return { requireDashboardAccess: async () => ({ id: "owner_fixture" }) }
      if (name === "@/lib/dashboard/getCompany") return {
        getCompany: async () => billingFixture.company,
        requireOwnerAccess: async () => true,
      }
      if (name === "@/lib/dashboard/typography") return {
        TYPE: {}, TEXT_OPACITY: { secondary: 0.7, tertiary: 0.5, disabled: 0.4 }, GREEN: "#00ff00", BLACK: "#000000", ICON: { action: 16 },
      }
      if (name === "@/lib/featureAccess") return { getEffectiveAddons: () => [], getAllAddonsRanked: () => [], ALL_ADDONS: [] }
      if (name === "@/lib/supabase/admin") return {
        createAdminClient: () => ({ from: () => ({ select: () => ({ eq: () => ({ eq: async () => ({ data: [] }) }) }) }) }),
      }
      if (name.startsWith("@/components/dashboard/")) return () => null
      if (name === "react/jsx-runtime") return require(name)
      throw new Error(`Unexpected billing fixture import: ${name}`)
    },
  }, { filename: path })
  return pageModule.exports.default
}

const billingPage = loadBillingPage("src/app/dashboard/(app)/billing/page.tsx")
const receiptPage = loadBillingPage("src/app/dashboard/(app)/billing/receipts/[invoiceId]/page.tsx")
const renewalAt = Date.UTC(2026, 9, 20, 12) / 1000
const trialEndAt = renewalAt + 86400
const createdAt = renewalAt - 86400
const shortDate = (value) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value * 1000))
const longDate = (value) => new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(value * 1000))
const fixtureSubscription = (status) => ({
  status, trial_end: trialEndAt, items: { data: [{ current_period_end: renewalAt }] },
  default_payment_method: null, cancel_at_period_end: false, pause_collection: null,
})
const fixtureInvoice = {
  id: "in_fixture", number: "FIXTURE", customer: "cus_fixture", created: createdAt, status: "open",
  amount_paid: 0, amount_due: 3900, amount_remaining: 3900, total: 3900, subtotal: 3900,
  currency: "usd", lines: { data: [] }, status_transitions: { paid_at: null },
}
async function renderBilling() {
  return renderToStaticMarkup(await billingPage({ searchParams: Promise.resolve({}) })).replace(/<[^>]*>/g, "|")
}
async function renderReceipt() {
  return renderToStaticMarkup(await receiptPage({ params: Promise.resolve({ invoiceId: "in_fixture" }) })).replace(/<[^>]*>/g, "|")
}

billingFixture.invoice = { ...fixtureInvoice }
billingFixture.subscription = fixtureSubscription("active")
let billingText = await renderBilling()
assert.match(billingText, /\|Active\|/)
assert.doesNotMatch(billingText, /Trial active|First bill/)
assert.ok(billingText.includes(`Renews ${shortDate(renewalAt)}`))
assert.match(billingText, /\|Open\|/)
assert.ok(billingText.includes(`Created ${shortDate(createdAt)}`))

billingFixture.company.subscription_status = "active"
billingFixture.subscription = fixtureSubscription("trialing")
billingText = await renderBilling()
assert.match(billingText, /Trial active/)
assert.match(billingText, /First bill/)
assert.ok(billingText.includes(`First bill||${shortDate(trialEndAt)}`))
assert.ok(billingText.includes(`Trial ends ${shortDate(trialEndAt)}`))
assert.doesNotMatch(billingText, /Your subscription is active/)

for (const [status, label] of [["past_due", "Past due"], ["unpaid", "Unpaid"], ["paused", "Paused"], ["incomplete", "Payment action needed"], ["incomplete_expired", "Activation expired"], ["canceled", "Canceled"]]) {
  billingFixture.subscription = fixtureSubscription(status)
  billingText = await renderBilling()
  assert.ok(billingText.includes(`|${label}|`), `Live ${status} must override stored active`)
  assert.doesNotMatch(billingText, /Renews |Trial active|Your subscription is active/)
}

billingFixture.subscription = null
billingText = await renderBilling()
assert.match(billingText, /Status unknown/)
assert.doesNotMatch(billingText, /Status unavailable|Trial active|Your subscription is active/)
billingFixture.unavailable = true
billingText = await renderBilling()
assert.match(billingText, /Status unavailable/)
assert.match(billingText, /Next bill\|+Unavailable\|/)
assert.doesNotMatch(billingText, /Status unknown|Trial active|Your subscription is active/)
billingFixture.unavailable = false

for (const field of ["cancel_at_period_end", "pause_collection"]) {
  billingFixture.subscription = fixtureSubscription("active")
  billingFixture.subscription[field] = field === "pause_collection" ? { behavior: "void" } : true
  billingText = await renderBilling()
  assert.doesNotMatch(billingText, /Renews /, `${field} must not promise a renewal`)
}
billingFixture.subscription = fixtureSubscription("active")
billingFixture.company.is_comp = true
billingText = await renderBilling()
assert.match(billingText, /Comped by Found/)
assert.doesNotMatch(billingText, /Renews /)
billingFixture.company.is_comp = false

for (const status of ["paid", "open", "void", "draft", "uncollectible", null]) {
  billingFixture.invoice = { ...fixtureInvoice, status }
  billingText = await renderBilling()
  const label = status ? status[0].toUpperCase() + status.slice(1) : "Status unknown"
  assert.ok(billingText.includes(`|${label}|`), `Invoice history must display ${status}`)
}

for (const [paid, remaining, status, paidAt] of [
  [0, 3900, "open", null], [1000, 2900, "open", null], [3900, 0, "paid", renewalAt],
  [0, 0, "paid", renewalAt], [0, 0, "void", null], [0, 3900, "uncollectible", null],
]) {
  billingFixture.invoice = { ...fixtureInvoice, amount_paid: paid, amount_remaining: remaining, status, status_transitions: { paid_at: paidAt } }
  const receiptText = await renderReceipt()
  assert.match(receiptText, new RegExp(`Total paid\\|+\\$${paid / 100}\\|`), `${status}: paid amount must not fall back to due or total`)
  assert.match(receiptText, new RegExp(`Amount remaining\\|+\\$${remaining / 100}\\|`), `${status}: remaining balance must be separate`)
  assert.ok(receiptText.includes(`Invoice created||${longDate(createdAt)}`))
  assert.ok(receiptText.includes(`Paid on||${paidAt ? longDate(paidAt) : "Not recorded"}`), "Payment date must not fall back to invoice creation")
}

console.log("Billing display regression checks passed: live status overrides stale state, unknown/unavailable are distinct, invoice status is visible, and exact paid/remaining amounts and dates are preserved.")
