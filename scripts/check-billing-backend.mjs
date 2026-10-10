import assert from "node:assert/strict"
import fs from "node:fs"
import vm from "node:vm"
import { webcrypto } from "node:crypto"
import ts from "typescript"

// Execute production TypeScript with isolated environment and inert dependencies.
// No env files, network, email provider, or database connections are accessed.
const env = { STRIPE_SECRET_KEY: "sk_live_stub_only" }
let sends = 0
const acceptedSources = new Set()
let sendResult = false
let ledger = null
let workerCalls = 0
function load(path, imports = {}) {
  const module = { exports: {} }
  const source = ts.transpileModule(fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  vm.runInNewContext(source, {
    module, exports: module.exports, require: name => imports[name] ?? {},
    process: { env }, crypto: webcrypto, Date, Intl, console, setTimeout: callback => { callback(); return 0 },
  }, { filename: path })
  return module.exports
}
const identities = load("src/app/admin/testIdentity.ts")
const billing = load("src/lib/stripe/billingReliability.ts", {
  "@/app/admin/testIdentity": identities,
  "@/lib/emailLog": { sendTrackedEmail: async message => {
    sends++
    if (sendResult) acceptedSources.add(message.source)
    return sendResult
  } },
  "@/lib/stripe/billingLedger": { getClientBillingLedger: async customer => typeof ledger === "function" ? ledger(customer) : ledger },
})
const response = { json: (body, options) => ({ body, status: options?.status ?? 200 }) }
const cron = load("src/app/api/cron/billing-reconcile/route.ts", {
  stripe: { default: class StripeStub {} }, "next/server": { NextResponse: response },
  "@/lib/supabase/admin": { createAdminClient: () => ({}) },
  "@/lib/stripe/billingReliability": { ...billing, runBillingReconciliation: async () => { workerCalls++; throw Error("Stub worker failure") } },
})
function query(result) {
  return new Proxy({ then: (resolve, reject) => Promise.resolve(result).then(resolve, reject) }, {
    get: (object, key) => key === "then" ? object.then : () => query(result),
  })
}
const company = { id: "co_1", name: "Fixture", email: "owner@example.invalid", stripe_customer_id: "cus_1", account_kind: "client", is_test: false }
const invoice = { id: "in_1", status: "open", currency: "usd", total: 3900, amount_due: 3900,
  amount_remaining: 3900, amount_paid: 0, attempt_count: 2, created: 100,
  parent: { subscription_details: { subscription: "sub_1" } }, status_transitions: { paid_at: null }, customer: "cus_1", livemode: true }
const intent = (status, error = null) => ({ id: "pi_1", status, last_payment_error: error, latest_charge: "ch_1", customer: "cus_1", livemode: true })
const stripe = status => ({ invoices: { retrieve: async () => invoice },
  invoicePayments: { list: () => ({ async *[Symbol.asyncIterator]() { yield { payment: { payment_intent: "pi_1" } } } }) },
  paymentIntents: { retrieve: async () => intent(status, { code: "declined" }) } })
const job = { id: "job_1", company_id: company.id, incident_id: "incident_1", recipient_type: "admin",
  recipient: "ops@example.invalid", subject: "Attention", text_body: "Attention", dedupe_key: "incident:failed:email:admin:ops@example.invalid" }
function queueAdmin({ lost = false, readError = false, prior = false, protectedCompany = false, incidentOrigin = "live", recipientType = "admin" } = {}) {
  let claimed = false
  const updates = []
  return { updates, rpc: async () => ({ data: claimed ? null : (claimed = true, { ...job, recipient_type: recipientType }), error: null }), from: table => {
    if (table === "billing_notification_jobs") return {
      select: () => query({ data: { id: job.id }, error: null }),
      update: values => { updates.push(values); return query({ data: lost ? null : { id: job.id }, error: lost ? { message: "No rows" } : null }) },
    }
    if (table === "billing_incidents") return query({ data: { invoice_id: invoice.id, livemode: true, origin: incidentOrigin, resolved_at: null }, error: readError ? { message: "Stub DB failure" } : null })
    if (table === "companies") return query({ data: company, error: null })
    if (table === "billing_objects") return query({ data: protectedCompany ? { facts: { preserve_access: true } } : null, error: null })
    if (table === "billing_invoices") return query({ data: { amount_remaining: 3900, company_id: company.id, customer_id: company.stripe_customer_id }, error: null })
    if (table === "email_log") return query({ data: prior || acceptedSources.has(`billing-notification/${job.id}`) ? { id: "log_1", resend_email_id: "mail_1" } : null, error: null })
    throw Error(`Unexpected table: ${table}`)
  } }
}
let passed = 0
async function test(name, work) { await work(); passed++; console.log(`PASS ${name}`) }
await test("flags default off", () => assert.equal(billing.billingFlag("BILLING_RECONCILIATION_ENABLED"), false))
await test("Connect billing excluded", () => assert.equal(billing.isPlatformBillingEvent({ account: "acct_1", type: "invoice.payment_failed" }), false))
await test("commerce checkout excluded", () => assert.equal(billing.isPlatformBillingEvent({ type: "checkout.session.completed", data: { object: { mode: "payment" } } }), false))
await test("event DB failure propagates", () => assert.rejects(billing.persistBillingEvent({ from: () => ({ upsert: () => query({ data: null, error: { message: "Stub failure" } }) }) }, { id: "evt_1", type: "invoice.payment_failed", data: { object: { id: invoice.id } } })))
await test("replay payload omits client secrets", async () => {
  let saved
  await billing.persistBillingEvent({ from: () => ({ upsert: row => { saved = row; return query({ data: null, error: null }) } }) },
    { id: "evt_1", type: "invoice.payment_failed", data: { object: { id: invoice.id, client_secret: "must-not-store" } } })
  assert.equal(JSON.stringify(saved).includes("must-not-store"), false)
})
await test("baseline and old replay remain historical", () => {
  assert.equal(billing.billingObservationOrigin(null), "historical")
  assert.equal(billing.billingObservationOrigin("2026-10-09T00:00:00Z", 100), "historical")
  assert.equal(billing.billingObservationOrigin("2026-10-09T00:00:00Z"), "live")
})
await test("processing suppresses old decline", () => assert.equal(billing.currentInvoiceFailure([intent("processing", { code: "declined" })]), undefined))
await test("action and declined payment classified", () => {
  assert.equal(billing.currentInvoiceFailure([intent("requires_action")]), "action_required")
  assert.equal(billing.currentInvoiceFailure([intent("requires_payment_method", { code: "declined" })]), "payment_failed")
})
await test("unlinked failed charge ignored", () => assert.equal(billing.currentInvoiceFailure([intent("requires_payment_method")], [{ id: "other", status: "failed", payment_intent: "pi_1" }]), undefined))
await test("attempt count alone is unpaid/pending", () => {
  assert.equal(billing.invoiceFacts(invoice).failure_kind, null)
  assert.equal(billing.invoiceFacts(invoice).attention, "unpaid_or_pending")
})
await test("historical facts have no notice", () => assert.equal(billing.invoiceFacts(invoice, undefined, company, false, "payment_failed").notifications.length, 0))
await test("disabled queue does not send", async () => {
  assert.equal((await billing.processBillingNotifications({}, {})).accepted, 0)
  assert.equal(sends, 0)
})
await test("cron rejects missing and incorrect secret", async () => {
  assert.equal((await cron.GET({ headers: { get: () => "Bearer undefined" } })).status, 401)
  env.CRON_SECRET = "stub-only"
  assert.equal((await cron.GET({ headers: { get: () => "Bearer wrong" } })).status, 401)
})
await test("authorized disabled cron performs no work", async () => {
  assert.equal((await cron.GET({ headers: { get: () => "Bearer stub-only" } })).body.enabled, false)
  assert.equal(workerCalls, 0)
})
env.BILLING_ADMIN_EMAIL_ENABLED = "true"
env.RESEND_API_KEY = "stub-only"
await test("send failure persists retry", async () => {
  const admin = queueAdmin()
  const result = await billing.processBillingNotifications(admin, stripe("requires_payment_method"), 1)
  assert.equal(result.failed, 1); assert.equal(result.accepted, 0); assert.equal(admin.updates[0].state, "failed")
})
await test("DB read failure persists retry without send", async () => {
  const before = sends, admin = queueAdmin({ readError: true })
  await billing.processBillingNotifications(admin, stripe("requires_payment_method"), 1)
  assert.equal(sends, before); assert.equal(admin.updates[0].state, "failed")
})
await test("processing defers queued email", async () => {
  const before = sends, admin = queueAdmin()
  await billing.processBillingNotifications(admin, stripe("processing"), 1)
  assert.equal(sends, before); assert.equal(admin.updates[0].state, "pending")
})
await test("lost lease cannot report acceptance", async () => {
  await assert.rejects(billing.processBillingNotifications(queueAdmin({ prior: true, lost: true }), stripe("requires_payment_method"), 1))
})
await test("logged acceptance recovers without resend", async () => {
  const before = sends, admin = queueAdmin({ prior: true })
  assert.equal((await billing.processBillingNotifications(admin, stripe("requires_payment_method"), 1)).accepted, 1)
  assert.equal(sends, before); assert.equal(admin.updates[0].state, "accepted")
})
env.STRIPE_SECRET_KEY = "sk_live_stub_only"
await test("enabled cron reports worker failure", async () => {
  assert.equal((await cron.GET({ headers: { get: () => "Bearer stub-only" } })).status, 503)
  assert.equal(workerCalls, 1)
})
delete env.BILLING_ADMIN_EMAIL_ENABLED
await test("incomplete ledger fails run without committing", async () => {
  ledger = { complete: false, mode: "live" }
  let committed = false, failed = false
  const admin = { rpc: async name => { if (name === "billing_start_run") return { data: "run", error: null }; committed = true; return { data: null, error: null } },
    from: () => ({ select: () => query({ data: null, error: null }), update: () => { failed = true; return query({ data: { id: "run" }, error: null }) } }) }
  assert.equal((await billing.reconcileBillingCustomer(admin, company)).complete, false)
  assert.equal(committed, false); assert.equal(failed, true)
})
await test("baseline suppresses notices; subsequent verification queues", async () => {
  ledger = { complete: true, mode: "live", customer_id: company.stripe_customer_id, customer: { id: company.stripe_customer_id },
    verified_at: "2026-10-10T08:30:00Z", subscriptions: [], schedules: [], charges: [], balance_transactions: [],
    payment_intents: [intent("requires_payment_method", { code: "declined" })],
    invoices: [{ invoice, lines: [], payments: [{ id: "allocation", payment: { payment_intent: "pi_1" }, status_transitions: { paid_at: null } }], credit_notes: [] }] }
  let facts, baseline = null
  const admin = { rpc: async (name, args) => { if (name === "billing_start_run") return { data: "run", error: null }; facts = args.p_facts; return { data: null, error: null } },
    from: table => ({ select: () => query({ data: table === "billing_objects" ? null : baseline, error: null }) }) }
  await billing.reconcileBillingCustomer(admin, company)
  assert.equal(facts.origin, "historical"); assert.equal(facts.invoices[0].notifications.length, 0)
  baseline = { finished_at: "2026-10-09T00:00:00Z" }
  await billing.reconcileBillingCustomer(admin, company)
  assert.equal(facts.origin, "live"); assert.equal(facts.invoices[0].notifications.length, 1)
})
env.BILLING_RECONCILIATION_ENABLED = "true"
await test("test/demo identities cannot consume real-client batch slots across pages", async () => {
  const rows = [
    { ...company, id: "demo", account_kind: "demo" },
    { ...company, id: "test", account_kind: "test" },
    ...Array.from({ length: 500 }, (_, index) => ({ ...company, id: `email-test-${index}`, email: "marketing@example.invalid" })),
    { ...company, id: "flagged", is_test: true },
    ...[1, 2, 3].map(index => ({ ...company, id: `real-${index}`, stripe_customer_id: `cus_real_${index}` })),
  ]
  const readCustomers = [], selected = [], filters = []
  ledger = customer => { readCustomers.push(customer); return { complete: true, mode: "live", customer_id: customer,
    customer: { id: customer }, verified_at: "2026-10-10T08:30:00Z", invoices: [], subscriptions: [], schedules: [], charges: [], balance_transactions: [], payment_intents: [] } }
  const admin = { rpc: async name => ({ data: name === "billing_start_run" ? "run" : null, error: null }), from: table => {
    if (table !== "companies") return { select: () => query({ data: table === "billing_objects" ? null : [], error: null }) }
    let filtered = rows
    const builder = {
      select: columns => { selected.push(columns); return builder },
      eq: (column, value) => { filters.push([column, value]); filtered = filtered.filter(row => row[column] === value); return builder },
      not: () => builder, order: () => builder,
      range: (start, end) => query({ data: filtered.slice(start, end + 1), error: null }),
    }
    return builder
  } }
  const result = await billing.runBillingReconciliation(admin, {})
  assert.deepEqual(readCustomers, ["cus_real_1", "cus_real_2", "cus_real_3"])
  assert.equal(result.ok, true)
  assert.ok(selected.every(columns => columns.includes("account_kind") && columns.includes("is_test") && columns.includes("email")))
  assert.ok(filters.some(([column, value]) => column === "account_kind" && value === "client"))
  assert.equal(result.reconciliation.length, 3)
})
for (const [recipientType, flag] of [["admin", "BILLING_ADMIN_EMAIL_ENABLED"], ["client_owner", "BILLING_CLIENT_EMAIL_ENABLED"]]) {
  await test(`protected access keeps future live ${recipientType} alerts eligible under its mail flag`, async () => {
    env[flag] = "true"
    sendResult = true
    const before = sends, admin = queueAdmin({ protectedCompany: true, recipientType })
    const result = await billing.processBillingNotifications(admin, stripe("requires_payment_method"), 1)
    assert.equal(result.accepted, 1)
    assert.equal(sends, before + 1)
    assert.equal(admin.updates[0].state, "accepted")
    assert.ok(admin.updates.every(row => !["preserve_access", "active", "subscription_status", "plan"].some(key => key in row)))
    delete env[flag]
    sendResult = false
    acceptedSources.clear()
  })
}
await test("protected historical incident remains suppressed even with admin alerts enabled", async () => {
  env.BILLING_ADMIN_EMAIL_ENABLED = "true"
  const before = sends, admin = queueAdmin({ protectedCompany: true, incidentOrigin: "historical" })
  await billing.processBillingNotifications(admin, stripe("requires_payment_method"), 1)
  assert.equal(sends, before)
  assert.equal(admin.updates[0].state, "suppressed")
  delete env.BILLING_ADMIN_EMAIL_ENABLED
})
await test("protected alerts do no work while runtime mail flags are off", async () => {
  const before = sends, admin = queueAdmin({ protectedCompany: true })
  await billing.processBillingNotifications(admin, stripe("requires_payment_method"), 1)
  assert.equal(sends, before)
  assert.equal(admin.updates.length, 0)
})

let webhookAdmin, webhookEvent
let customerSubscriptions = []
let customerSubscriptionItems = []
let subscriptionListError = false
const availabilityCalls = [], activationCalls = []
const afterTasks = []
const canceledSubscription = { id: "sub_1", customer: company.stripe_customer_id, livemode: true,
  status: "canceled", metadata: { company_id: company.id }, items: { data: [] } }
const webhook = load("src/app/api/stripe/webhook/route.ts", {
  "next/server": { NextResponse: response, after: callback => afterTasks.push(callback) },
  stripe: { default: class StripeStub {
    webhooks = { constructEvent: () => webhookEvent }
    subscriptions = {
      retrieve: async () => canceledSubscription,
      list: args => ({ async *[Symbol.asyncIterator]() {
        webhookAdmin.trace.push({ stripe: "subscriptions.list", args })
        assert.ok([...webhookAdmin.runs.values()].some(run => run.source === "legacy_projection" && run.state === "running"))
        for (const sub of customerSubscriptions) yield sub
        if (subscriptionListError) throw Error("Later subscription page unavailable")
      } }),
    }
    subscriptionItems = { list: args => ({ async *[Symbol.asyncIterator]() {
      webhookAdmin.trace.push({ stripe: "subscriptionItems.list", args })
      assert.ok([...webhookAdmin.runs.values()].some(run => run.source === "legacy_projection" && run.state === "running"))
      for (const item of customerSubscriptionItems) yield item
    } }) }
  } },
  "@supabase/supabase-js": { createClient: () => webhookAdmin },
  "@/lib/stripe/billingReliability": billing,
  "@/lib/bookings/ensureDefaultAvailability": { ensureDefaultAvailability: async companyId => {
    assert.ok([...webhookAdmin.runs.values()].some(run => run.source === "legacy_projection" && run.state === "complete" && run.checkpoint.applied))
    availabilityCalls.push(companyId)
  } },
  "@/lib/foundFunnelServer": { captureFoundActivationCompleted: async properties => {
    assert.ok([...webhookAdmin.runs.values()].some(run => run.source === "legacy_projection" && run.state === "complete" && run.checkpoint.applied))
    activationCalls.push(properties)
  } },
})
function eventAdmin({ preserve = true, overrideError = false, commitError = false, intakeError = false, baseline = null,
  projectionBusy = false, projectionLeaseLost = false, projectionSaveError = false, projectionApplyError = false,
  protectedAtApply = false, leaseLostAtApply = false, onboarding = false, malformedApplyResult = false } = {}) {
  const events = new Map(), mutations = [], commits = [], filters = []
  const runs = new Map(), trace = []
  const companyState = { ...company, plan: "found_pro", subscription_status: onboarding ? null : "active", client_state: onboarding ? "onboarding" : "active" }
  const addonState = [{ addon_slug: "reservation_calendar", active: true, stripe_subscription_item_id: "si_existing" }]
  return { events, mutations, commits, filters, runs, trace, companyState, addonState,
    rpc: async (name, args) => {
      trace.push({ rpc: name, args })
      if (name === "billing_claim_work") {
        const work = [...events.values()].find(row => row.state === "pending")
        if (!work) return { data: null, error: null }
        work.state = "processing"; work.lease_token = args.p_token; work.attempts++
        return { data: work, error: null }
      }
      if (name === "billing_start_run") {
        if (projectionBusy && args.p_source === "legacy_projection") return { data: null, error: null }
        const id = `run_${runs.size + 1}`
        runs.set(id, { id, state: "running", source: args.p_source, lease_token: args.p_token })
        return { data: id, error: null }
      }
      if (name === "billing_apply_projection") {
        const run = runs.get(args.p_run), projection = args.p_projection
        assert.equal(run.source, "legacy_projection")
        assert.equal(run.lease_token, args.p_token)
        assert.equal(run.state, "running")
        assert.ok(["active", "trialing"].includes(projection.status))
        assert.ok(["found", "found_pro", "found_business"].includes(projection.plan))
        if (projectionApplyError || leaseLostAtApply) return { data: null, error: { message: "Atomic projection rejected" } }
        if (protectedAtApply) {
          run.state = "complete"
          run.checkpoint = { ...run.checkpoint, applied: false, protected: true }
          return { data: { applied: false, protected: true, activated: false }, error: null }
        }
        const activated = !["active", "trialing"].includes(companyState.subscription_status)
        Object.assign(companyState, { plan: projection.plan, subscription_status: projection.status,
          ...(activated ? { client_state: "active" } : {}) })
        addonState.splice(0, addonState.length, ...projection.addon_items.map(item => ({ ...item, active: true })))
        mutations.push({ table: "companies", via: "rpc", values: projection })
        mutations.push({ table: "addon_subscriptions", via: "rpc", values: projection.addon_items })
        run.state = "complete"
        run.checkpoint = { ...run.checkpoint, applied: true, activated,
          after: { company: JSON.parse(JSON.stringify(companyState)), addons: JSON.parse(JSON.stringify(addonState)) } }
        return { data: malformedApplyResult ? { applied: "true" } : { applied: true, protected: false, activated }, error: null }
      }
      if (name === "billing_commit_facts") {
        if (commitError) return { data: null, error: { message: "Commit failed" } }
        commits.push(args.p_facts)
        if (runs.has(args.p_run)) runs.get(args.p_run).state = "complete"
        const work = [...events.values()].find(row => row.id === args.p_event)
        if (work) work.state = "complete"
        return { data: null, error: null }
      }
      throw Error(`Unexpected RPC ${name}`)
    },
    from: table => {
      let values, operation, columns, selectedFilters = []
      const builder = new Proxy({}, { get: (_, key) => {
        if (key === "then") return (resolve, reject) => {
          let result
          if (table === "billing_events" && operation === "upsert") {
            assert.equal(values.options.onConflict, "account_scope,livemode,event_id")
            assert.equal(values.options.ignoreDuplicates, true)
            if (!intakeError && !events.has(values.row.event_id)) events.set(values.row.event_id,
              { ...values.row, id: `work_${values.row.event_id}`, state: "pending", attempts: 0 })
            result = { data: null, error: intakeError ? { message: "Intake failed" } : null }
          } else if (operation === "update" || operation === "upsert") {
            if (table === "billing_reconciliation_runs") {
              const id = selectedFilters.find(([key]) => key === "id")?.[1]
              const row = runs.get(id)
              if (row && row.state !== "running") return Promise.resolve({ data: null, error: { message: "Run already complete" } }).then(resolve, reject)
              if (row?.source === "legacy_projection" && (projectionSaveError || projectionLeaseLost)) {
                return Promise.resolve({ data: null, error: { message: "Projection lease/save failed" } }).then(resolve, reject)
              }
              if (row) Object.assign(row, values)
            }
            mutations.push({ table, values })
            if (table === "billing_events") {
              const work = [...events.values()].find(row => row.id === selectedFilters.find(([key]) => key === "id")?.[1])
              if (work) Object.assign(work, values)
            }
            result = { data: table === "companies" ? [{ id: company.id }] : { id: "changed" }, error: null }
          } else if (table === "companies") result = { data: JSON.parse(JSON.stringify(companyState)), error: null }
          else if (table === "addon_subscriptions") result = { data: JSON.parse(JSON.stringify(addonState)), error: null }
          else if (table === "billing_objects") {
            filters.push(selectedFilters)
            result = { data: preserve === null ? null : { facts: { preserve_access: preserve } },
              error: overrideError ? { message: "Override unavailable" } : null }
          } else if (table === "billing_reconciliation_runs") {
            const id = selectedFilters.find(([key]) => key === "id")?.[1]
            const row = runs.get(id)
            result = { data: columns === "id" ? (projectionLeaseLost ? null : row) : baseline, error: null }
          }
          else throw Error(`Unexpected read ${table}`)
          return Promise.resolve(result).then(resolve, reject)
        }
        return (...args) => {
          if (key === "upsert") { operation = key; values = { row: args[0], options: args[1] } }
          if (key === "update") { operation = key; values = args[0] }
          if (key === "select") columns = args[0]
          if (key === "eq") selectedFilters.push(args)
          return builder
        }
      } })
      return builder
    },
  }
}
const request = { headers: { get: () => "stub-signature" }, text: async () => "stub-body" }
env.STRIPE_WEBHOOK_SECRET = "stub-only"
env.BILLING_DURABLE_INTAKE_ENABLED = "true"
function subscriptionEvent(type, id = "evt_canceled") {
  return { id, type, livemode: true, created: 100, data: { object: canceledSubscription } }
}
async function drainAfter() {
  while (afterTasks.length) await afterTasks.shift()()
}
for (const type of ["customer.subscription.updated", "customer.subscription.deleted"]) {
  await test(`protected ${type} canceled replay keeps all access projections; facts remain canceled`, async () => {
    webhookAdmin = eventAdmin()
    webhookEvent = subscriptionEvent(type)
    assert.equal((await webhook.POST(request)).status, 200)
    assert.equal(webhookAdmin.commits.length, 0)
    assert.equal(afterTasks.length, 1)
    await drainAfter()
    assert.equal(webhookAdmin.commits[0].objects[0].facts.status, "canceled")
    assert.equal((await webhook.POST(request)).status, 200)
    await drainAfter()
    assert.equal(webhookAdmin.events.size, 1)
    assert.equal(webhookAdmin.commits.length, 1)
    assert.equal(webhookAdmin.mutations.length, 0)
    assert.ok(webhookAdmin.filters.every(filter =>
      [["account_scope", "platform"], ["livemode", true], ["company_id", company.id],
        ["customer_id", company.stripe_customer_id], ["object_id", company.id],
        ["object_type", "service_access_override"]].every(([key, value]) =>
          filter.some(([actualKey, actualValue]) => actualKey === key && actualValue === value))))
  })
}
await test("protected checkout replay keeps status and customer projections unchanged", async () => {
  webhookAdmin = eventAdmin()
  webhookEvent = { id: "evt_checkout", type: "checkout.session.completed", livemode: true, created: 100,
    data: { object: { id: "cs_1", mode: "subscription", customer: company.stripe_customer_id,
      subscription: canceledSubscription.id, metadata: { company_id: company.id } } } }
  assert.equal((await webhook.POST(request)).status, 200)
  await drainAfter()
  assert.equal(webhookAdmin.mutations.length, 0)
  assert.equal(webhookAdmin.commits[0].objects[0].facts.status, "canceled")
})
await test("override read failure blocks access mutations while financial reporting proceeds independently", async () => {
  webhookAdmin = eventAdmin({ overrideError: true })
  webhookEvent = subscriptionEvent("customer.subscription.deleted")
  assert.equal((await webhook.POST(request)).status, 503)
  await drainAfter()
  assert.equal(webhookAdmin.commits.length, 1)
  assert.ok(webhookAdmin.mutations.every(row => row.table === "billing_events"))
  assert.equal([...webhookAdmin.events.values()][0].state, "complete")
})
await test("intake DB error never schedules work or changes access", async () => {
  webhookAdmin = eventAdmin({ intakeError: true })
  webhookEvent = subscriptionEvent("customer.subscription.updated")
  assert.equal((await webhook.POST(request)).status, 503)
  assert.equal(afterTasks.length, 0)
  assert.equal(webhookAdmin.mutations.length, 0)
})
await test("facts commit DB error leaves protected projections untouched and persists retry", async () => {
  webhookAdmin = eventAdmin({ commitError: true })
  webhookEvent = subscriptionEvent("customer.subscription.deleted")
  assert.equal((await webhook.POST(request)).status, 200)
  await drainAfter()
  assert.equal(webhookAdmin.commits.length, 0)
  assert.ok(webhookAdmin.mutations.every(row => ["billing_events", "billing_reconciliation_runs"].includes(row.table)))
  assert.equal([...webhookAdmin.events.values()][0].state, "failed")
  assert.ok([...webhookAdmin.events.values()][0].next_attempt_at)
})
await test("override is independent of rollout flags and ends only on explicit release", async () => {
  delete env.BILLING_DURABLE_INTAKE_ENABLED
  webhookAdmin = eventAdmin()
  webhookEvent = subscriptionEvent("customer.subscription.updated")
  assert.equal((await webhook.POST(request)).status, 200)
  assert.equal(webhookAdmin.mutations.length, 0)
  assert.equal(await billing.preservesServiceAccess(eventAdmin({ preserve: false }), company.id, company.stripe_customer_id, true), false)
  assert.equal(await billing.preservesServiceAccess(eventAdmin({ preserve: null }), company.id, company.stripe_customer_id, true), false)
  await assert.rejects(billing.preservesServiceAccess(eventAdmin({ preserve: "true" }), company.id, company.stripe_customer_id, true))
})
await test("explicit release does not activate financial-status-based service removal", async () => {
  webhookAdmin = eventAdmin({ preserve: false })
  webhookEvent = subscriptionEvent("customer.subscription.deleted")
  assert.equal((await webhook.POST(request)).status, 200)
  assert.ok(webhookAdmin.mutations.every(row => row.table === "billing_reconciliation_runs"))
  assert.equal(webhookAdmin.companyState.subscription_status, "active")
  assert.equal(webhookAdmin.addonState[0].active, true)
})
await test("protected full-ledger reconciliation keeps canceled facts and future alerts eligible without access writes", async () => {
  const admin = eventAdmin({ baseline: { finished_at: "2026-10-09T00:00:00Z" } })
  env.ADMIN_ALERT_EMAIL = "ops@example.invalid"
  ledger = { complete: true, mode: "live", customer_id: company.stripe_customer_id, customer: { id: company.stripe_customer_id }, verified_at: "2026-10-10T08:30:00Z",
    subscriptions: [{ ...canceledSubscription, subscription: canceledSubscription }],
    schedules: [], charges: [], balance_transactions: [], payment_intents: [intent("requires_payment_method", { code: "declined" })],
    invoices: [{ id: invoice.id, invoice, lines: [],
      payments: [{ id: "allocation", payment: { payment_intent: "pi_1" }, status_transitions: { paid_at: null } }], credit_notes: [] }] }
  assert.equal((await billing.reconcileBillingCustomer(admin, company)).complete, true)
  assert.equal(admin.commits[0].origin, "live")
  assert.equal(admin.commits[0].invoices[0].failure_kind, "payment_failed")
  assert.equal(admin.commits[0].invoices[0].notifications.length, 2)
  assert.deepEqual(Array.from(admin.commits[0].invoices[0].notifications, row => row.recipient_type), ["admin", "client_owner"])
  for (const notice of admin.commits[0].invoices[0].notifications) {
    assert.doesNotMatch(notice.text_body, /hold|deadline|suspend|shut.?off/i)
  }
  assert.equal(admin.commits[0].objects.find(row => row.object_type === "subscription").facts.status, "canceled")
  const snapshot = admin.commits[0].objects.find(row => row.object_type === "customer")
  assert.equal(snapshot.facts.ledger_complete, true)
  assert.equal(snapshot.facts.source_verified_at, ledger.verified_at)
  assert.equal(admin.mutations.length, 0)
  const historical = eventAdmin()
  assert.equal((await billing.reconcileBillingCustomer(historical, company)).complete, true)
  assert.equal(historical.commits[0].origin, "historical")
  assert.equal(historical.commits[0].invoices[0].notifications.length, 0)
  delete env.ADMIN_ALERT_EMAIL
})
await test("protected invoice worker keeps old replays quiet and future live admin/owner alerts eligible", async () => {
  env.ADMIN_ALERT_EMAIL = "ops@example.invalid"
  for (const historical of [true, false]) {
    const admin = eventAdmin({ baseline: { finished_at: "2026-10-09T00:00:00Z" } })
    const id = historical ? "evt_old_failure" : "evt_future_failure"
    admin.events.set(id, { id: `work_${id}`, payload: { id, type: "invoice.payment_failed", livemode: true,
      created: historical ? 100 : Date.parse("2026-10-10T08:30:00Z") / 1000, data: { object: invoice } },
      livemode: true, attempts: 0, state: "pending" })
    assert.equal((await billing.processBillingEvents(admin, stripe("requires_payment_method"), 1)).completed, 1)
    assert.equal(admin.commits[0].origin, historical ? "historical" : "live")
    const notices = admin.commits[0].invoices[0].notifications
    assert.equal(notices.length, historical ? 0 : 2)
    if (!historical) assert.deepEqual(Array.from(notices, notice => notice.recipient_type), ["admin", "client_owner"])
    assert.equal(admin.mutations.length, 0)
    assert.equal(admin.filters.length, 0)
  }
  delete env.ADMIN_ALERT_EMAIL
})
await test("event retry survives failure to mark its reconciliation run failed", async () => {
  const admin = eventAdmin({ commitError: true })
  admin.events.set("evt_failure", { id: "work_evt_failure", event_type: "customer.subscription.deleted",
    payload: subscriptionEvent("customer.subscription.deleted", "evt_failure"), livemode: true, attempts: 0, state: "pending" })
  const originalFrom = admin.from
  admin.from = table => table === "billing_reconciliation_runs"
    ? { select: () => query({ data: null, error: null }), update: () => query({ data: null, error: { message: "Run release failed" } }) }
    : originalFrom(table)
  await assert.rejects(billing.processBillingEvents(admin, { subscriptions: { retrieve: async () => canceledSubscription } }, 1))
  assert.equal(admin.events.get("evt_failure").state, "failed")
  assert.ok(admin.events.get("evt_failure").next_attempt_at)
})
await test("immediate worker bounds transient claim retries to three passes", async () => {
  env.BILLING_DURABLE_INTAKE_ENABLED = "true"
  let claims = 0
  const admin = { rpc: async () => { claims++; return { data: null, error: { message: "Claim unavailable" } } } }
  assert.equal((await billing.consumeBillingWorkImmediately(admin, {})).ok, false)
  assert.equal(claims, 3)
  claims = 0
  const recovers = { rpc: async () => { claims++; return { data: null, error: claims < 3 ? { message: "Transient" } : null } } }
  assert.equal((await billing.consumeBillingWorkImmediately(recovers, {})).ok, true)
  assert.equal(claims, 3)
})
await test("platform test events never enter a live queue or change protected projections", async () => {
  webhookAdmin = eventAdmin()
  for (const type of ["customer.subscription.updated", "customer.subscription.deleted", "invoice.payment_failed"]) {
    webhookEvent = { ...subscriptionEvent(type), livemode: false }
    const result = await webhook.POST(request)
    assert.equal(result.status, 200)
    assert.equal(result.body.ignored, "billing_mode_mismatch")
  }
  assert.equal(webhookAdmin.events.size, 0)
  assert.equal(webhookAdmin.mutations.length, 0)
  assert.equal(afterTasks.length, 0)
})
await test("mode guard applies to platform billing only; Connect commerce remains accepted", async () => {
  webhookAdmin = eventAdmin()
  webhookEvent = { id: "evt_connect", type: "payment_intent.succeeded", account: "acct_fixture", livemode: false,
    data: { object: { id: "pi_connect", metadata: {} } } }
  const result = await webhook.POST(request)
  assert.equal(result.status, 200)
  assert.equal(result.body.ignored, undefined)
  assert.equal(afterTasks.length, 0)
})
await test("unknown billing key mode stops platform projections before DB access", async () => {
  env.STRIPE_SECRET_KEY = "stub_unknown_mode"
  webhookAdmin = eventAdmin()
  webhookEvent = subscriptionEvent("customer.subscription.deleted")
  assert.equal((await webhook.POST(request)).status, 503)
  assert.equal(webhookAdmin.events.size, 0)
  assert.equal(webhookAdmin.mutations.length, 0)
  env.STRIPE_SECRET_KEY = "sk_live_stub_only"
  assert.equal(billing.stripeBillingMode(), true)
  env.STRIPE_SECRET_KEY = "rk_test_stub_only"
  assert.equal(billing.stripeBillingMode(), false)
  env.STRIPE_SECRET_KEY = "sk_live_stub_only"
})
await test("old mismatched queue entries retire without Stripe reads so live work proceeds", async () => {
  const admin = eventAdmin()
  for (const live of [false, true]) {
    const id = live ? "evt_live" : "evt_test"
    admin.events.set(id, { id: `work_${id}`, event_type: "customer.subscription.deleted",
      payload: { ...subscriptionEvent("customer.subscription.deleted", id), livemode: live }, livemode: live, attempts: 0, state: "pending" })
  }
  let reads = 0
  const result = await billing.processBillingEvents(admin, { subscriptions: { retrieve: async () => { reads++; return canceledSubscription } } }, 2)
  assert.equal(result.skipped, 1)
  assert.equal(result.completed, 1)
  assert.equal(result.failed, 0)
  assert.equal(reads, 1)
  assert.equal(admin.events.get("evt_test").state, "complete")
  assert.equal(admin.events.get("evt_live").state, "complete")
  assert.equal(admin.commits.length, 1)
  assert.ok(admin.mutations.every(row => row.table === "billing_events"))
})
await test("reconciliation rejects mismatched customer/invoice/subscription ownership and absent verification", async () => {
  const valid = { complete: true, mode: "live", customer_id: company.stripe_customer_id,
    customer: { id: company.stripe_customer_id }, verified_at: "2026-10-10T08:30:00Z",
    invoices: [], subscriptions: [], schedules: [], charges: [], balance_transactions: [], payment_intents: [] }
  for (const wrong of [
    { customer_id: "cus_other" }, { customer: { id: "cus_other" } }, { verified_at: null },
    { invoices: [{ invoice: { ...invoice, customer: "cus_other" } }] },
    { invoices: [{ invoice: { ...invoice, livemode: false } }] },
    { subscriptions: [{ subscription: { ...canceledSubscription, customer: "cus_other" } }] },
  ]) {
    ledger = { ...valid, ...wrong }
    const admin = eventAdmin()
    assert.equal((await billing.reconcileBillingCustomer(admin, company)).complete, false)
    assert.equal(admin.commits.length, 0)
    assert.ok(admin.mutations.every(row => row.table === "billing_reconciliation_runs"))
  }
})
await test("event invoice ownership mismatch never commits facts", async () => {
  const admin = eventAdmin()
  admin.events.set("evt_invoice", { id: "work_invoice", payload: { id: "evt_invoice", type: "invoice.payment_failed",
    livemode: true, created: 100, data: { object: invoice } }, livemode: true, attempts: 0, state: "pending" })
  const result = await billing.processBillingEvents(admin, { invoices: { retrieve: async () => ({ ...invoice, customer: "cus_other" }) } }, 1)
  assert.equal(result.failed, 1)
  assert.equal(admin.commits.length, 0)
  assert.equal(admin.events.get("evt_invoice").state, "failed")
  assert.ok(admin.mutations.every(row => ["billing_events", "billing_reconciliation_runs"].includes(row.table)))
})
await test("notification stored ownership mismatch cannot send", async () => {
  env.BILLING_ADMIN_EMAIL_ENABLED = "true"
  const admin = queueAdmin(), originalFrom = admin.from, before = sends
  admin.from = table => table === "billing_invoices"
    ? query({ data: { amount_remaining: 3900, company_id: "co_other", customer_id: "cus_other" }, error: null })
    : originalFrom(table)
  assert.equal((await billing.processBillingNotifications(admin, stripe("requires_payment_method"), 1)).failed, 1)
  assert.equal(sends, before)
  delete env.BILLING_ADMIN_EMAIL_ENABLED
})
const replacement = { ...canceledSubscription, id: "sub_replacement", status: "active",
  items: { has_more: false, data: [
    { id: "si_plan", price: { id: "price_business", metadata: { plan: "found_business" } } },
    { id: "si_addon", price: { id: "price_addon", metadata: { addon_slug: "reservation_calendar" } } },
  ] } }
await test("delayed canceled callback grants the customer's active replacement atomically under its lease", async () => {
  webhookAdmin = eventAdmin({ preserve: false })
  customerSubscriptions = [canceledSubscription, replacement]
  webhookEvent = subscriptionEvent("customer.subscription.deleted")
  const result = await webhook.POST(request)
  assert.equal(result.status, 200)
  assert.equal(result.body.legacy_projection, "applied")
  const run = [...webhookAdmin.runs.values()].find(row => row.source === "legacy_projection")
  assert.equal(run.state, "complete")
  assert.equal(run.completeness.full_ledger, false)
  assert.equal(run.checkpoint.canonical_subscription_id, replacement.id)
  assert.equal(run.checkpoint.proposed.plan, "found_business")
  assert.equal(run.checkpoint.proposed.status, "active")
  assert.equal(run.checkpoint.applied, true)
  assert.equal(run.checkpoint.after.company.plan, "found_business")
  assert.equal(run.checkpoint.before.company.plan, "found_pro")
  assert.equal(run.checkpoint.before.addons[0].active, true)
  assert.ok(webhookAdmin.mutations.every(row => row.table === "billing_reconciliation_runs" || row.via === "rpc"))
  const apply = webhookAdmin.trace.find(row => row.rpc === "billing_apply_projection")
  assert.deepEqual(Object.keys(apply.args.p_projection).sort(), ["addon_items", "plan", "status", "subscription_id"])
  assert.equal(apply.args.p_projection.subscription_id, replacement.id)
  assert.equal(apply.args.p_projection.addon_items[0].stripe_subscription_item_id, "si_addon")
  const start = webhookAdmin.trace.findIndex(row => row.rpc === "billing_start_run")
  const fetch = webhookAdmin.trace.findIndex(row => row.stripe === "subscriptions.list")
  assert.ok(start >= 0 && fetch > start)
  await drainAfter()
  assert.equal(webhookAdmin.commits[0].objects[0].facts.status, "canceled")
  assert.equal(webhookAdmin.companyState.plan, "found_business")
  assert.equal(webhookAdmin.addonState[0].active, true)
})
await test("multiple active recognized subscriptions complete manual observation without grants", async () => {
  webhookAdmin = eventAdmin({ preserve: false })
  customerSubscriptions = [replacement, { ...replacement, id: "sub_duplicate", status: "trialing" }]
  webhookEvent = subscriptionEvent("customer.subscription.updated")
  assert.equal((await webhook.POST(request)).status, 200)
  const run = [...webhookAdmin.runs.values()].find(row => row.source === "legacy_projection")
  assert.equal(run.state, "complete")
  assert.equal(run.checkpoint.reason, "ambiguous_active_found_subscriptions")
  assert.equal(run.checkpoint.applied, false)
  assert.equal(run.checkpoint.manual_projection_required, true)
  assert.ok(!webhookAdmin.trace.some(row => row.rpc === "billing_apply_projection"))
  assert.ok(webhookAdmin.mutations.every(row => row.table === "billing_reconciliation_runs"))
  await drainAfter()
})
await test("only nonactive subscriptions complete observation without removing access or addons", async () => {
  for (const status of ["canceled", "past_due", "unpaid", "incomplete_expired"]) {
    webhookAdmin = eventAdmin({ preserve: false })
    customerSubscriptions = [{ ...replacement, status }]
    webhookEvent = subscriptionEvent("customer.subscription.deleted")
    assert.equal((await webhook.POST(request)).status, 200)
    const run = [...webhookAdmin.runs.values()].find(row => row.source === "legacy_projection")
    assert.equal(run.state, "complete")
    assert.equal(run.checkpoint.reason, "no_active_found_subscription")
    assert.equal(run.checkpoint.proposed, null)
    assert.ok(webhookAdmin.mutations.every(row => row.table === "billing_reconciliation_runs"))
    assert.equal(webhookAdmin.companyState.subscription_status, "active")
    assert.equal(webhookAdmin.addonState[0].active, true)
    await drainAfter()
  }
})
await test("protected company bypasses projection leases and canonical fetch even with an active replacement", async () => {
  webhookAdmin = eventAdmin()
  customerSubscriptions = [replacement]
  webhookEvent = subscriptionEvent("customer.subscription.updated")
  const result = await webhook.POST(request)
  assert.equal(result.status, 200)
  assert.equal(result.body.legacy_projection, "protected")
  assert.equal(webhookAdmin.runs.size, 0)
  assert.equal(webhookAdmin.trace.filter(row => row.stripe).length, 0)
  assert.equal(webhookAdmin.mutations.length, 0)
  await drainAfter()
})
await test("busy/lost leases and checkpoint DB errors cannot write legacy projections", async () => {
  for (const options of [{ projectionBusy: true }, { projectionLeaseLost: true }, { projectionSaveError: true }]) {
    webhookAdmin = eventAdmin({ preserve: false, ...options })
    customerSubscriptions = [replacement]
    webhookEvent = subscriptionEvent("customer.subscription.updated")
    assert.equal((await webhook.POST(request)).status, 503)
    assert.equal(webhookAdmin.trace.filter(row => row.stripe).length, 0)
    assert.ok(webhookAdmin.mutations.every(row => row.table === "billing_reconciliation_runs"))
    assert.equal(webhookAdmin.companyState.plan, "found_pro")
    assert.equal(webhookAdmin.addonState[0].active, true)
    await drainAfter()
  }
})
await test("canonical observation rejects cross-customer subscriptions", async () => {
  webhookAdmin = eventAdmin({ preserve: false })
  customerSubscriptions = [{ ...replacement, customer: "cus_other" }]
  webhookEvent = subscriptionEvent("customer.subscription.updated")
  assert.equal((await webhook.POST(request)).status, 503)
  assert.equal([...webhookAdmin.runs.values()][0].state, "failed")
  assert.ok(webhookAdmin.mutations.every(row => row.table === "billing_reconciliation_runs"))
  await drainAfter()
})
await test("trialing canonical subscription includes paginated items under the customer lease", async () => {
  webhookAdmin = eventAdmin({ preserve: false })
  customerSubscriptions = [{ ...replacement, status: "trialing", items: { has_more: true, data: [] } }]
  customerSubscriptionItems = replacement.items.data
  webhookEvent = subscriptionEvent("customer.subscription.updated")
  assert.equal((await webhook.POST(request)).status, 200)
  const run = [...webhookAdmin.runs.values()][0]
  assert.equal(run.checkpoint.proposed.plan, "found_business")
  assert.equal(run.checkpoint.proposed.status, "trialing")
  assert.equal(run.checkpoint.proposed.addon_items[0].addon_slug, "reservation_calendar")
  assert.ok(webhookAdmin.trace.some(row => row.stripe === "subscriptionItems.list"))
  assert.ok(webhookAdmin.mutations.every(row => row.table === "billing_reconciliation_runs" || row.via === "rpc"))
  await drainAfter()
})
await test("later subscription page failure cannot complete a partial canonical projection", async () => {
  webhookAdmin = eventAdmin({ preserve: false })
  customerSubscriptions = [replacement]
  subscriptionListError = true
  webhookEvent = subscriptionEvent("customer.subscription.updated")
  assert.equal((await webhook.POST(request)).status, 503)
  subscriptionListError = false
  const run = [...webhookAdmin.runs.values()][0]
  assert.equal(run.state, "failed")
  assert.equal(run.checkpoint.proposed, undefined)
  assert.equal(run.checkpoint.applied, false)
  assert.ok(webhookAdmin.mutations.every(row => row.table === "billing_reconciliation_runs"))
  await drainAfter()
})
await test("paid activation invokes the atomic grant and side effects even with durable intake disabled", async () => {
  delete env.BILLING_DURABLE_INTAKE_ENABLED
  webhookAdmin = eventAdmin({ preserve: false, onboarding: true })
  customerSubscriptions = [replacement]
  const beforeAvailability = availabilityCalls.length, beforeActivation = activationCalls.length
  webhookEvent = subscriptionEvent("customer.subscription.created")
  const result = await webhook.POST(request)
  assert.equal(result.status, 200)
  assert.equal(result.body.legacy_projection, "applied")
  assert.equal(webhookAdmin.events.size, 0)
  assert.equal(afterTasks.length, 0)
  assert.equal(webhookAdmin.companyState.client_state, "active")
  assert.equal(webhookAdmin.companyState.plan, "found_business")
  assert.equal(availabilityCalls.length, beforeAvailability + 1)
  assert.equal(activationCalls.length, beforeActivation + 1)
  assert.equal(activationCalls.at(-1).plan_name, "found_business")
  assert.equal(activationCalls.at(-1).method, "stripe_webhook")
  assert.ok(webhookAdmin.trace.some(row => row.rpc === "billing_apply_projection"))
  env.BILLING_DURABLE_INTAKE_ENABLED = "true"
})
await test("atomic RPC rejection/lost lease cannot grant or trigger booking/analytics", async () => {
  for (const options of [{ projectionApplyError: true }, { leaseLostAtApply: true }]) {
    webhookAdmin = eventAdmin({ preserve: false, onboarding: true, ...options })
    customerSubscriptions = [replacement]
    webhookEvent = subscriptionEvent("customer.subscription.created")
    const beforeAvailability = availabilityCalls.length, beforeActivation = activationCalls.length
    assert.equal((await webhook.POST(request)).status, 503)
    assert.ok(webhookAdmin.trace.some(row => row.rpc === "billing_apply_projection"))
    assert.equal(webhookAdmin.companyState.client_state, "onboarding")
    assert.equal(webhookAdmin.companyState.plan, "found_pro")
    assert.equal(availabilityCalls.length, beforeAvailability)
    assert.equal(activationCalls.length, beforeActivation)
    assert.ok(webhookAdmin.mutations.every(row => row.table === "billing_reconciliation_runs"))
    await drainAfter()
  }
})
await test("active checkout and subscription replay preserve paid activation without duplicate activation analytics", async () => {
  delete env.BILLING_DURABLE_INTAKE_ENABLED
  webhookAdmin = eventAdmin({ preserve: false, onboarding: true })
  customerSubscriptions = [replacement]
  const beforeActivation = activationCalls.length
  webhookEvent = { id: "evt_active_checkout", type: "checkout.session.completed", livemode: true, created: 100,
    data: { object: { id: "cs_active", mode: "subscription", customer: company.stripe_customer_id,
      subscription: replacement.id, metadata: { company_id: company.id } } } }
  assert.equal((await webhook.POST(request)).body.legacy_projection, "applied")
  webhookEvent = subscriptionEvent("customer.subscription.updated")
  assert.equal((await webhook.POST(request)).body.legacy_projection, "applied")
  assert.equal(webhookAdmin.companyState.client_state, "active")
  assert.equal(activationCalls.length, beforeActivation + 1)
  assert.equal(webhookAdmin.trace.filter(row => row.rpc === "billing_apply_projection").length, 2)
  assert.equal(afterTasks.length, 0)
  env.BILLING_DURABLE_INTAKE_ENABLED = "true"
})
await test("SQL protection added during fetch prevents grants and all side effects", async () => {
  webhookAdmin = eventAdmin({ preserve: false, protectedAtApply: true, onboarding: true })
  customerSubscriptions = [replacement]
  webhookEvent = subscriptionEvent("customer.subscription.created")
  const beforeAvailability = availabilityCalls.length, beforeActivation = activationCalls.length
  const result = await webhook.POST(request)
  assert.equal(result.status, 200)
  assert.equal(result.body.legacy_projection, "protected")
  assert.equal(webhookAdmin.companyState.client_state, "onboarding")
  assert.equal(webhookAdmin.addonState[0].stripe_subscription_item_id, "si_existing")
  assert.equal(availabilityCalls.length, beforeAvailability)
  assert.equal(activationCalls.length, beforeActivation)
  assert.ok(webhookAdmin.mutations.every(row => row.table === "billing_reconciliation_runs"))
  await drainAfter()
})
await test("paid plan without reservation addon never forces booking availability", async () => {
  webhookAdmin = eventAdmin({ preserve: false, onboarding: true })
  customerSubscriptions = [{ ...replacement, items: { has_more: false, data: [replacement.items.data[0]] } }]
  webhookEvent = subscriptionEvent("customer.subscription.created")
  const beforeAvailability = availabilityCalls.length
  assert.equal((await webhook.POST(request)).status, 200)
  assert.equal(availabilityCalls.length, beforeAvailability)
  const payload = webhookAdmin.trace.find(row => row.rpc === "billing_apply_projection").args.p_projection
  assert.equal(payload.addon_items.length, 0)
  await drainAfter()
})
await test("malformed post-commit RPC result is retryable without overwriting completion or emitting side effects", async () => {
  webhookAdmin = eventAdmin({ preserve: false, onboarding: true, malformedApplyResult: true })
  customerSubscriptions = [replacement]
  webhookEvent = subscriptionEvent("customer.subscription.created")
  const beforeAvailability = availabilityCalls.length, beforeActivation = activationCalls.length
  assert.equal((await webhook.POST(request)).status, 503)
  const run = [...webhookAdmin.runs.values()][0]
  assert.equal(run.state, "complete")
  assert.equal(availabilityCalls.length, beforeAvailability)
  assert.equal(activationCalls.length, beforeActivation)
  await drainAfter()
})
console.log(`${passed} billing backend behavioral tests passed. PostgreSQL atomicity/concurrency is not exercised.`)
