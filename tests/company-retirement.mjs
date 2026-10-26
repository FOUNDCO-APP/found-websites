import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import vm from "node:vm"
import { createRequire } from "node:module"
import ts from "typescript"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

const require = createRequire(import.meta.url)
const OLD = "bf4cd3d6-f96d-495c-aee9-308633da0524"
const PAID = "626dc220-4152-4711-8862-a885534e1e0a"
const OWNER = "shared-owner"
const EMAIL = "owner@example.test"
let tables, cookieValues, cookieWrites, mutations, stripeCalls, sends, readError, lastClientRows
const env = { ADMIN_KEY: "fixture-admin", STRIPE_SECRET_KEY: "fixture-never-used", RESEND_API_KEY: "fixture-never-used", NEXT_PUBLIC_ROOT_DOMAIN: "foundco.app" }
function reset() {
  tables = {
    companies: [
      { id: OLD, user_id: OWNER, email: EMAIL, name: "Retired duplicate", slug: "intelligence-protection-security-llc", active: true,
        retired_at: "2026-10-26T02:00:00Z", created_at: "2026-10-26T02:00:00Z", subscription_status: null, website_config: { custom_domain: "old.example.test" } },
      { id: PAID, user_id: OWNER, email: EMAIL, name: "Paid retained", slug: "intellsecurity", active: true,
        retired_at: null, created_at: "2026-10-25T01:00:00Z", subscription_status: "active", plan: "found_pro", website_config: { custom_domain: "paid.example.test" } },
    ],
    company_members: [], website_config: [], client_activities: [], email_log: [], customer_activity_events: [],
  }
  cookieValues = new Map(); cookieWrites = []; mutations = []; stripeCalls = []; sends = []
  readError = false; lastClientRows = null
}
const cookieStore = {
  get(name) { const values = cookieValues.get(name) ?? []; return values.at(-1) ? { value: values.at(-1) } : undefined },
  getAll(name) { return (cookieValues.get(name) ?? []).map(value => ({ name, value })) },
  set(name, value) { cookieWrites.push({ name, value }); cookieValues.set(name, [value]) },
}
function field(row, key) { return key.split(".").reduce((value, part) => value?.[part], row) }
function from(table) {
  assert.ok(Object.hasOwn(tables, table), `Unexpected table ${table}`)
  let filters = [], one = false, limit, order, payload
  const q = {
    select() { return q },
    eq(key, value) { filters.push(row => field(row, key) === value); return q },
    is(key, value) { filters.push(row => (field(row, key) ?? null) === value); return q },
    not(key, operator, value) { assert.equal(operator, "is"); filters.push(row => (field(row, key) ?? null) !== value); return q },
    in(key, values) { filters.push(row => values.includes(field(row, key))); return q },
    or(expression) {
      const alternatives = expression.split(",").map(part => { const [key, operator, ...value] = part.split("."); assert.equal(operator, "eq"); return row => field(row, key) === value.join(".") })
      filters.push(row => alternatives.some(test => test(row))); return q
    },
    order(key, options = {}) { order = { key, ascending: options.ascending !== false }; return q },
    limit(value) { limit = value; return q },
    gte() { return q },
    single() { one = true; return q },
    maybeSingle() { one = true; return q },
    update(value) { payload = value; return q },
    then(resolve, reject) {
      return Promise.resolve().then(() => {
        if (readError) return { data: null, error: { message: "Fixture read/schema failure" } }
        let rows = tables[table].filter(row => filters.every(test => test(row)))
        if (order) rows.sort((a, b) => String(field(a, order.key)).localeCompare(String(field(b, order.key))) * (order.ascending ? 1 : -1))
        if (limit !== undefined) rows = rows.slice(0, limit)
        if (payload && rows.length) { mutations.push({ table, payload, ids: rows.map(row => row.id) }); rows.forEach(row => Object.assign(row, payload)) }
        return { data: structuredClone(one ? rows[0] ?? null : rows), error: null }
      }).then(resolve, reject)
    },
  }
  return q
}
const admin = { from }
const auth = { getUser: async () => ({ data: { user: { id: OWNER, email: EMAIL } } }) }
class Stripe {
  constructor() {
    stripeCalls.push("constructed")
    this.setupIntents = { retrieve: async () => { stripeCalls.push("retrieve"); return { metadata: { company_id: PAID, slug: "intellsecurity" } } } }
  }
}
const redirect = url => ({ kind: "redirect", url: String(url), headers: { set() {} }, cookies: { set(name, value) { cookieWrites.push({ name, value }) } } })
const overrides = {
  "next/headers": { cookies: async () => cookieStore },
  "next/cache": { revalidatePath() {} },
  "next/server": { NextResponse: { redirect, json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
  "next/navigation": { notFound() { throw Error("Not found") }, redirect(url) { throw Object.assign(new Error("Redirect"), { redirectUrl: url }) } },
  "next/link": { __esModule: true, default: ({ children, ...props }) => React.createElement("a", props, children) },
  "@sentry/nextjs": { setTag() {}, captureException() {} },
  "@/lib/supabase/admin": { createAdminClient: () => admin },
  "@/lib/supabase/server": { createClient: async () => ({ ...admin, auth }) },
  "./supabase/server": { createClient: async () => ({ ...admin, auth }) },
  "@supabase/supabase-js": { createClient: () => admin },
  "@supabase/ssr": { createServerClient: () => ({ auth }) },
  "@/lib/copyPolish": { polishBusinessName: name => name, polishWebsiteUpdates: value => value, polishSentence: value => value },
  "./copyPolish": { polishBusinessName: name => name, polishWebsiteUpdates: value => value },
  "@/lib/emailLog": { sendTrackedEmail: async value => { sends.push(value); return true } },
  "stripe": { __esModule: true, default: Stripe },
  "@/lib/stripe/connect": { getStripe() { throw Error("Retired history must not enter operational billing") } },
  "@/lib/stripe/billingSummary": { getStoredBillingSummaries: async () => new Map() },
  "@/lib/stripe/clientBillingFacts": { getClientBillingFacts() { throw Error("Retired history must not enter operational billing") } },
  "@/lib/foundFunnelServer": {},
  "@/lib/industryDetection": {},
}
const cache = new Map()
function load(file) {
  const absolute = path.resolve(file)
  if (cache.has(absolute)) return cache.get(absolute).exports
  const module = { exports: {} }; cache.set(absolute, module)
  const source = fs.readFileSync(absolute, "utf8")
  const output = ts.transpileModule(source, { fileName: absolute, compilerOptions: { module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText
  vm.runInNewContext(output, { module, exports: module.exports, process: { env }, console: { error() {}, warn() {} }, URL, Date, Map, Set, require(id) {
    if (Object.hasOwn(overrides, id)) return overrides[id]
    if (id === "react") return { ...React, cache: fn => fn }
    if (id === "../lib" || id === "../../lib") return { getAdminClient: () => admin, requireAdmin: async () => {} }
    if (id === "./ClientsWorkspace") return { __esModule: true, default: ({ rows }) => { lastClientRows = rows; return React.createElement("div", {}, rows.map(row => row.name).join(" | ")) } }
    if (id === "./ClientDetailWorkspace") return { __esModule: true, default: () => React.createElement("div", {}, "Operational workspace") }
    if (id === "../customerActivitySignals") return { buildClientActivitySignal: () => ({ toolCount90d: 0, latest: null, level: "no_activity", label: "No activity" }) }
    if (id === "../testIdentity") return { isAdminTestIdentity: () => false, adminTestIdentityReason: () => null }
    const alias = id.startsWith("@/") ? path.resolve("src", id.slice(2)) : id.startsWith(".") ? path.resolve(path.dirname(absolute), id) : null
    if (alias) {
      if (fs.existsSync(`${alias}.ts`)) return load(`${alias}.ts`)
      if (fs.existsSync(`${alias}.tsx`)) return load(`${alias}.tsx`)
      return {}
    }
    if (id === "server-only") return {}
    return require(id)
  } }, { filename: absolute })
  return module.exports
}
const access = load("src/lib/dashboard/getCompany.ts")
const publicLookup = load("src/lib/company.ts")
const selectCompany = load("src/app/dashboard/api/select-company/route.ts")
const activation = load("src/app/activate/activateActions.ts")
const preview = load("src/app/[slug]/previewActions.ts")
const emails = load("src/lib/activationEmails.ts")
const viewAs = load("src/app/admin/businesses/actions.ts")
const clients = load("src/app/admin/clients/page.tsx")
const detail = load("src/app/admin/clients/[id]/page.tsx")
const selectPage = load("src/app/dashboard/(auth)/select/page.tsx")
let groups = 0
async function test(name, fn) { reset(); await fn(); groups++; console.log(`PASS ${name}`) }
await test("owner picker excludes the retired duplicate without changing shared ownership", async () => {
  assert.deepEqual(Array.from(await access.getAllCompanies(OWNER, EMAIL), row => row.id), [PAID])
  assert.equal(await access.hasMultipleCompanies(OWNER, EMAIL), false)
  assert.equal(tables.companies[0].user_id, tables.companies[1].user_id)
  assert.equal(mutations.length, 0)
})
await test("stale selections cannot retarget an old form to the paid company; explicit reselection restores access", async () => {
  for (const name of ["found_company_id", "found_selected_company_id"]) {
    cookieValues.set(name, [OLD])
    assert.equal(await access.getCompany(OWNER, EMAIL), null)
  }
  cookieValues.set("found_selected_company_id", [PAID])
  assert.equal((await access.getCompany(OWNER, EMAIL)).id, PAID)
  assert.equal(mutations.length, 0)
})
await test("retired worker memberships are skipped without blocking another active membership", async () => {
  tables.company_members = [OLD, PAID].map((id, index) => ({ id: `member-${index}`, company_id: id, user_id: "worker", email: "worker@example.test", status: "active", role: "worker" }))
  cookieValues.set("found_selected_company_id", [OLD])
  assert.equal(await access.getCompany("worker", "worker@example.test"), null)
  cookieValues.clear()
  assert.equal((await access.getCompany("worker", "worker@example.test")).id, PAID)
  assert.deepEqual(Array.from(await access.getAllCompanies("worker", "worker@example.test"), row => row.id), [PAID])
  assert.equal(await access.getCompanyRole("worker", "worker@example.test", tables.companies[0]), null)
  assert.equal(await access.getCompanyRole("worker", "worker@example.test", tables.companies[1]), "worker")
  assert.equal(await access.requireOwnerAccess("worker", "worker@example.test", tables.companies[1]), false)
})
await test("owner/worker/admin role checks cannot reopen a retired company", async () => {
  assert.equal(await access.requireOwnerAccess(OWNER, EMAIL, tables.companies[0]), false)
  assert.equal(await access.requireOwnerAccess(OWNER, EMAIL, tables.companies[1]), true)
  cookieValues.set("admin_key", [env.ADMIN_KEY]); cookieValues.set("found_admin_view", ["1"]); cookieValues.set("found_admin_company_id", [OLD])
  assert.equal(await access.getCompany("", ""), null)
  assert.equal(await access.getCompanyRole("", "", tables.companies[0]), null)
})
await test("only-retired access and schema/read errors fail closed", async () => {
  tables.companies = [tables.companies[0]]
  assert.equal(await access.getCompany(OWNER, EMAIL), null)
  assert.equal((await access.getAllCompanies(OWNER, EMAIL)).length, 0)
  reset(); readError = true
  assert.equal(await access.getCompany(OWNER, EMAIL), null)
  assert.equal(await access.requireOwnerAccess(OWNER, EMAIL, tables.companies[1]), false)
})
await test("public slug and custom-domain lookup hide the draft and retain the paid site", async () => {
  assert.equal(await publicLookup.getCompanyBySlug("intelligence-protection-security-llc"), null)
  assert.equal(await publicLookup.getCompanyByDomain("old.example.test"), null)
  assert.equal((await publicLookup.getCompanyBySlug("intellsecurity")).id, PAID)
  assert.equal((await publicLookup.getCompanyByDomain("paid.example.test")).id, PAID)
})
await test("public access requires both an active site and no retirement timestamp", async () => {
  const old = tables.companies[0]
  old.retired_at = null; old.active = false
  assert.equal(await publicLookup.getCompanyBySlug(old.slug), null)
  assert.equal(await publicLookup.getCompanyByDomain("old.example.test"), null)
  old.retired_at = "2026-10-26T02:00:00Z"; old.active = true
  assert.equal(await publicLookup.getCompanyBySlug(old.slug), null)
  assert.equal(await publicLookup.getCompanyByDomain("old.example.test"), null)
  assert.equal((await publicLookup.getCompanyBySlug("intellsecurity")).id, PAID)
})
await test("company-selection endpoint never sets a retired selection cookie, even with membership", async () => {
  tables.company_members.push({ id: "member", company_id: OLD, user_id: OWNER, email: EMAIL, status: "active" })
  const request = id => ({ url: `https://my.foundco.app/api/select-company?id=${id}`, nextUrl: new URL(`https://my.foundco.app/api/select-company?id=${id}`), cookies: cookieStore })
  const rejected = await selectCompany.GET(request(OLD)); assert.equal(cookieWrites.length, 0)
  assert.equal(new URL(rejected.url).pathname, "/select")
  await selectCompany.GET(request(PAID)); assert.ok(cookieWrites.some(cookie => cookie.name === "found_selected_company_id" && cookie.value === PAID))
})
await test("single-company recovery uses the picker endpoint without retargeting stale form access", async () => {
  cookieValues.set("found_selected_company_id", [OLD])
  assert.equal(await access.getCompany(OWNER, EMAIL), null)
  await assert.rejects(selectPage.default(), error => error.redirectUrl === `/api/select-company?id=${encodeURIComponent(PAID)}`)
  assert.equal(cookieWrites.length, 0)
  assert.equal(mutations.length, 0)
  assert.equal(await access.getCompany(OWNER, EMAIL), null)
  const picker = fs.readFileSync("src/components/dashboard/CompanyPicker.tsx", "utf8")
  assert.ok(picker.includes("`/api/select-company?id=${encodeURIComponent(company.id)}`"))
  tables.companies[0].retired_at = null
  assert.ok(await selectPage.default(), "Multiple eligible companies retain the picker")
  tables.companies = []
  await assert.rejects(selectPage.default(), error => error.redirectUrl === "/login?error=no_company")
})
await test("dashboard GET page guards recover selection while unauthenticated and API guards stay closed", async () => {
  const pages = ["page.tsx", "billing/page.tsx", "billing/receipts/[invoiceId]/page.tsx", "business-info/page.tsx", "menu/page.tsx", "marketing/page.tsx", "locations/page.tsx", "people/page.tsx", "team/page.tsx", "products/page.tsx", "site/page.tsx"]
  for (const page of pages) {
    const source = fs.readFileSync(`src/app/dashboard/(app)/${page}`, "utf8")
    assert.ok(source.includes('if (!company) redirect(user ? "/select" : "/admin")'), page)
  }
  const authHelpers = load("src/lib/auth/getAuthUser.ts")
  const originalGetUser = auth.getUser
  try {
    auth.getUser = async () => ({ data: { user: null } })
    await assert.rejects(authHelpers.requireDashboardAccess(), error => error.redirectUrl === "/login")
  } finally { auth.getUser = originalGetUser }
  cookieValues.set("found_selected_company_id", [OLD])
  const gates = load("src/lib/dashboard/entitlements.ts")
  await assert.rejects(gates.requireDashboardAddonPage("scheduling"), error => error.redirectUrl === "/select")
  await assert.rejects(gates.requireDashboardFeaturePage("contact_database"), error => error.redirectUrl === "/select")
  const leadsLayout = load("src/app/dashboard/(app)/leads/layout.tsx")
  await assert.rejects(leadsLayout.default({ children: null }), error => error.redirectUrl === "/select")
  const layouts = fs.readdirSync("src/app/dashboard/(app)", { recursive: true }).filter(file => path.basename(file) === "layout.tsx")
  for (const layout of layouts) {
    const source = fs.readFileSync(path.join("src/app/dashboard/(app)", layout), "utf8")
    assert.ok(!/if \(!company\)[^\n]*"\/login"/.test(source), layout)
  }
  assert.equal((await gates.requireDashboardAddonAccess("scheduling")).ok, false)
  assert.equal(mutations.length, 0)
  assert.equal(cookieWrites.length, 0)
})
await test("retired activation/preview reject before any Stripe construction or data mutation", async () => {
  assert.equal(await activation.createActivationSetup("intelligence-protection-security-llc"), null)
  assert.equal((await activation.confirmActivation("intelligence-protection-security-llc", "fixture-setup")).ok, false)
  assert.equal(await preview.getPreviewCheckout("intelligence-protection-security-llc"), null)
  assert.equal(stripeCalls.length, 0); assert.equal(mutations.length, 0)
  assert.equal(await activation.createActivationSetup("intellsecurity"), null, "Paid active account keeps its existing activation short-circuit")
  assert.equal(stripeCalls.length, 0)
})
await test("retired reminder and site-live reservation cannot send or mark the old draft", async () => {
  await emails.sendSiteLiveEmailOnce(admin, OLD)
  await emails.sendActivationReminderEmailOnce(admin, { ...tables.companies[0], email: EMAIL })
  assert.equal(sends.length, 0); assert.equal(mutations.length, 0)
})
await test("admin View As rejects retired records without setting any cookies", async () => {
  cookieValues.set("admin_key", [env.ADMIN_KEY])
  assert.equal((await viewAs.setViewAsCookie(OLD)).success, false)
  assert.equal(cookieWrites.length, 0)
  assert.equal((await viewAs.setViewAsCookie(PAID)).success, true)
})
await test("HQ current list excludes retired; archive and historical detail remain readable without operational actions", async () => {
  const current = renderToStaticMarkup(await clients.default({ searchParams: Promise.resolve({}) }))
  assert.equal(lastClientRows.length, 1); assert.equal(lastClientRows[0].id, PAID)
  assert.ok(current.includes("Paid retained")); assert.ok(!current.includes("Retired duplicate"))
  const retired = renderToStaticMarkup(await clients.default({ searchParams: Promise.resolve({ retired: "1" }) }))
  assert.ok(retired.includes("Retired duplicate")); assert.ok(!retired.includes("Paid retained"))
  const history = renderToStaticMarkup(await detail.default({ params: Promise.resolve({ id: OLD }) }))
  assert.ok(history.includes("Historical Record") && history.includes("Retired duplicate"))
  assert.ok(!history.includes("Operational workspace") && !history.includes("View as"))
})
await test("clearing the timestamp restores selection and public visibility without changing identity or billing", async () => {
  const original = structuredClone(tables.companies[0])
  tables.companies[0].retired_at = null
  cookieValues.set("found_selected_company_id", [OLD])
  assert.equal((await access.getCompany(OWNER, EMAIL)).id, OLD)
  assert.equal((await publicLookup.getCompanyBySlug(original.slug)).id, OLD)
  assert.equal((await access.getAllCompanies(OWNER, EMAIL)).length, 2)
  assert.deepEqual(tables.companies[0], { ...original, retired_at: null })
  assert.equal(mutations.length, 0)
})
console.log(`${groups} retirement fixture groups passed; no remote calls, Stripe calls, sends or database writes.`)
