import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import vm from "node:vm"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const ts = require("typescript")
const React = require("react")
const { renderToStaticMarkup } = require("react-dom/server")
const noop = async () => ({ success: true })
const actions = new Proxy({}, { get: () => noop })
function load(file) {
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } }).outputText
  const module = { exports: {} }
  vm.runInNewContext(output, { module, exports: module.exports, process: { env: {} }, console, Date, Intl,
    require: name => {
      if (name === "next/link") return { __esModule: true, default: ({ children, ...props }) => React.createElement("a", props, children) }
      if (name.includes("actions")) return actions
      if (name.includes("featureAccess")) return { getAllAddonsRanked: () => [{ slug: "quotes", label: "Quote & Estimate Payments" }], ALL_ADDONS: [], BUSINESS_INCLUDED_ADDONS: [] }
      if (name.includes("customerActivitySignals")) return { activityEventLabel: value => value.replace(/_/g, " "), activitySurfaceLabel: value => value }
      if (name.includes("testIdentity")) return { isAdminTestIdentity: row => row.account_kind === "test", adminTestIdentityReason: () => "Fixture" }
      return require(name)
    },
  })
  return module.exports.default
}
const List = load("src/app/admin/clients/ClientsWorkspace.tsx")
const Detail = load("src/app/admin/clients/[id]/ClientDetailWorkspace.tsx")
const names = ["Divine Remodel", "MBJ Heating and Cooling", "RC Bicycles"]
const billing = { status: "canceled", label: "Billing canceled - $39.00 unpaid - verification needed", needsAttention: true,
  verifiedAt: "2026-10-10T12:00:00Z", stale: true, preserveAccess: true, balances: { usd: 3900 } }
const rows = names.map((name, index) => ({ id: `fixture-${index}`, name, slug: `fixture-${index}`, email: "owner@example.test",
  plan: index === 2 ? "found_pro" : "found_business", client_state: "active", account_kind: "client", test_identity: false,
  created_at: "2026-07-01T12:00:00Z", issues: ["Verify billing"], last_customer_activity_at: null,
  customer_activity_status: { level: "stagnant" }, billing: index === 2 ? billing : { ...billing, status: "active", label: "Billing active - verification needed", preserveAccess: false },
}))
const facts = { checkedAt: "2026-10-11T18:00:00Z", completeness: "complete", subscriptionStatus: "canceled", errors: [],
  outstandingInvoices: { status: "known", balanceByCurrency: { usd: 3900 }, invoices: [{ id: "in_fixture", status: "open", currency: "usd", amountRemaining: 3900, dueAt: null }] },
  lastSuccessfulPayment: { status: "found", payment: { amountCaptured: 3900, currency: "usd", timestamp: "2026-07-31T18:00:00Z", timestampBasis: "charge_created" } },
  latestFailedPayment: { status: "found", payment: { timestamp: "2026-08-31T18:00:00Z", reason: "Invalid account", code: "invalid_account" } },
  nextCharge: { status: "none", scheduledAttempt: null, expectedRenewal: null },
}
function client(index, overrides = {}) {
  return { ...rows[index], billing, billing_facts: facts, contact_name: null, phone: "5205550100", address: "428 N. Fremont Ave",
    city: "Tucson", state: "AZ", zip: null, address_visible: true, subscription_status: "active", is_comp: false,
    trial_ends_at: null, billing_cycle_day: null, deferred_payment_amount: null, deferred_payment_method: null, deferred_payment_note: null,
    included_addon_slug: null, disabled_addons: [], stripe_customer_id: "cus_fixture", stripe_connect_account_id: null,
    billing_payment_signal: { status: "lookup_failed", label: "Could not check saved method", detail: null },
    activities: [], customer_activities: [], customer_activity_ready: true, email_history_ready: true,
    emails: [
      { subject: "Payment needs attention", email_type: "billing_payment_attention", recipient_email: "owner@example.test", success: true, delivery_status: "delivered", created_at: facts.checkedAt, history_category: "owner_account" },
      { subject: "Following up on your inquiry", email_type: "lead_followup_day1", recipient_email: "customer@example.test", success: true, delivery_status: null, created_at: facts.checkedAt, history_category: "lead_automation" },
    ], ...overrides }
}
const listHtml = renderToStaticMarkup(React.createElement(List, { rows, initialSearch: "" }))
const detailHtml = renderToStaticMarkup(React.createElement(Detail, { client: client(2) }))
assert(!listHtml.includes("Client active"))
assert(detailHtml.includes("No charge scheduled"))
assert(detailHtml.includes("Invalid account"))
assert(detailHtml.includes("Charge dated"))
assert(detailHtml.includes("Delivered"))
assert(detailHtml.includes("Accepted - delivery unconfirmed"))
assert(!detailHtml.includes("Activate now"), "Unknown payment method must not expose no-card operations")
assert(!detailHtml.includes("Tool actions, 90d"))
assert(detailHtml.includes("Review billing"))
assert(detailHtml.includes("Protected - no billing hold"))
const unknownHtml = renderToStaticMarkup(React.createElement(Detail, { client: client(0, { billing_facts: {
  ...facts, completeness: "unknown", subscriptionStatus: null, errors: ["Unavailable"],
  outstandingInvoices: { status: "unknown", balanceByCurrency: null, invoices: [] },
  lastSuccessfulPayment: { status: "unknown", payment: null }, latestFailedPayment: { status: "unknown", payment: null },
  nextCharge: { status: "unknown", scheduledAttempt: null, expectedRenewal: null },
}, customer_activity_ready: false }) }))
assert(unknownHtml.includes("Unknown - review live billing"))
assert(!unknownHtml.includes("No charge scheduled"))
assert(unknownHtml.includes("Activity unavailable"))
const historyFailureHtml = renderToStaticMarkup(React.createElement(Detail, { client: client(0, { emails: [], activities: [], email_history_ready: false }) }))
assert(historyFailureHtml.includes("Email history unavailable"), "History failures remain visible without any records")

if (process.argv.includes("--screenshots")) {
  let chromium
  try { ({ chromium } = require("playwright")) }
  catch { ({ chromium } = require(path.join(process.env.USERPROFILE, ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"))) }
  const browser = await chromium.launch({ channel: "msedge", headless: true })
  const css = ["admin.css", "v2.css", "refined.css"].map(file => fs.readFileSync(`src/app/admin/${file}`, "utf8")).join("\n")
  fs.mkdirSync(".billing-audits/client-layout", { recursive: true })
  try {
    for (const width of [320, 390, 430, 768, 1280]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } })
      for (const [name, content] of [["clients", listHtml], ...names.map((_, index) => [`client-${index}`, renderToStaticMarkup(React.createElement(Detail, { client: client(index) }))])]) {
        await page.setContent(`<html><head><style>body{margin:0;background:#080d0b;font-family:Arial,sans-serif}*{box-sizing:border-box}${css}</style></head><body><main class="hq-main"><div class="hq-page hq-page-narrow">${content}</div></main></body></html>`)
        await page.evaluate(() => document.querySelectorAll("details").forEach(el => { el.open = true }))
        const errors = await page.evaluate(() => {
          const problems = []
          if (document.documentElement.scrollWidth > innerWidth + 1) problems.push("Page overflow")
          for (const parent of document.querySelectorAll(".hq-client-billing,.hq-client-activity,.hq-business-name-line,.hq-client-facts > div,.hq-client-command-actions,.hq-client-contact-actions")) {
            const boxes = [...parent.children].map(el => ({ text: el.textContent, box: el.getBoundingClientRect() })).filter(row => row.box.width && row.box.height)
            for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
              const a = boxes[i].box, b = boxes[j].box
              if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) problems.push(`Collision: ${boxes[i].text} / ${boxes[j].text}`)
            }
          }
          for (const el of document.querySelectorAll(".hq-client-list-row,.hq-client-facts dd,.hq-client-detail button,.hq-client-detail select,.hq-client-detail li")) {
            if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth) problems.push(`Element overflow: ${el.textContent?.slice(0, 80)}`)
          }
          return problems
        })
        assert.deepEqual(errors, [], `${name} at ${width}px`)
        await page.screenshot({ path: `.billing-audits/client-layout/${name}-${width}.png`, fullPage: true })
      }
      await page.close()
    }
  } finally { await browser.close() }
  console.log("20 client layout screenshots: no tested collisions or overflow.")
}
if (process.argv.includes("--local")) {
  require("@next/env").loadEnvConfig(process.cwd(), true)
  const { createClient } = require("@supabase/supabase-js")
  const { data, error } = await createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    .from("companies").select("id,name").in("name", names)
  assert(!error, "Could not read client IDs for integration verification")
  assert.equal(data.length, 3)
  const { chromium } = require(path.join(process.env.USERPROFILE, ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"))
  const browser = await chromium.launch({ channel: "msedge", headless: true })
  try {
    const context = await browser.newContext()
    await context.addCookies([{ name: "admin_key", value: process.env.ADMIN_KEY, domain: "127.0.0.1", path: "/", httpOnly: true }])
    const page = await context.newPage()
    for (const width of [390, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 })
      for (const [name, route] of [["clients", "/admin/clients"], ...data.map(row => [row.name, `/admin/clients/${row.id}`])]) {
        await page.goto(`http://127.0.0.1:3018${route}`, { waitUntil: "networkidle", timeout: 120000 })
        assert.equal(await page.locator("h1").count(), 1, "Expected authenticated admin page")
        assert(await page.locator("h1").innerText(), "Expected page title")
        if (name !== "clients") {
          assert.equal(await page.getByRole("link", { name: "Review billing", exact: true }).first().count(), 1)
          assert(!(await page.locator(".hq-client-detail").innerText()).includes("Tool actions, 90d"))
        }
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${name} page overflow ${width}`)
        await page.screenshot({ path: `.billing-audits/client-layout/local-${name.replace(/\W/g, "-")}-${width}.png`, fullPage: true })
      }
    }
    await context.close()
  } finally { await browser.close() }
  console.log("Authenticated local Clients and all three details verified at phone/tablet/desktop widths.")
}
console.log("Client detail display and safety checks passed.")
