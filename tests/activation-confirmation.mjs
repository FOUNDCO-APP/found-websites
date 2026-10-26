import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

// Real action + guard, synthetic ledger/Stripe only. No process env, SDK,
// network, keys, users, outgoing messages, or production data enter the VM.
const sources = Object.fromEntries(['action', 'guard'].map((name, i) => [name,
  ts.transpileModule(fs.readFileSync(new URL(i ? '../src/lib/stripe/activationGuard.ts' : '../src/app/activate/activateActions.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText]))
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value))
const companyId = '11111111-1111-4111-a111-111111111111'
let groups = 0

function fixture() {
  let serial = 0
  const f = {
    now: Date.parse('2026-10-26T18:00:00Z'), attempts: [], subscriptions: [], items: [], addons: [], events: [],
    createCalls: [], itemCalls: [], receipts: new Map(), missingLedger: false, completeFailures: 0,
    timeout: null, pauseCreate: null, hideSubscriptions: false,
    company: { id: companyId, slug: 'fixture', user_id: null, retired_at: null, stripe_customer_id: 'cus_fixture',
      pending_setup_intent_secret: 'seti_fixture_secret_local', subscription_status: 'incomplete', plan: 'found_pro',
      trial_ends_at: null, is_founding_member: false },
  }
  const uuid = () => `00000000-0000-4000-a000-${String(++serial).padStart(12, '0')}`
  const intent = id => ({ id, status: 'succeeded', livemode: false, customer: 'cus_fixture', payment_method: 'pm_fixture',
    metadata: { company_id: companyId, slug: 'fixture', plan: 'found_pro', price_id: 'price_original', intro_rate: 'true' } })
  f.intents = { seti_fixture: intent('seti_fixture'), seti_other: intent('seti_other') }
  f.method = { id: 'pm_fixture', customer: 'cus_fixture', livemode: false }
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [f.now])) }
    static now() { return f.now }
  }
  const ok = data => ({ data: clone(data), error: null })
  const fail = message => ({ data: null, error: { message } })
  function query(table) {
    const filters = []; let operation = 'select', patch
    const q = {
      select() { return q }, eq(key, value) { filters.push(row => row[key] === value); return q },
      is(key, value) { filters.push(row => (row[key] ?? null) === value); return q },
      gt(key, value) { filters.push(row => row[key] != null && row[key] > value); return q },
      update(value) { operation = 'update'; patch = clone(value); return q },
      upsert(value, options) { assert.equal(table, 'addon_subscriptions'); assert.equal(options.onConflict, 'company_id,addon_slug'); operation = 'upsert'; patch = clone(value); return q },
      single() { return q }, maybeSingle() { return q },
      then(resolve, reject) {
        return Promise.resolve().then(() => {
          if (table === 'activation_attempts' && f.missingLedger) return fail('missing activation ledger')
          let rows
          if (table === 'companies') rows = f.company ? [f.company] : []
          else if (table === 'activation_attempts') rows = f.attempts
          else if (table === 'addon_stripe_prices') rows = [{ addon_slug: 'shared_gallery', stripe_price_id: 'price_addon' }]
          else if (table === 'addon_subscriptions') rows = f.addons
          else throw Error(`Blocked table ${table}`)
          if (operation === 'upsert') {
            const existing = rows.find(row => row.company_id === patch.company_id && row.addon_slug === patch.addon_slug)
            if (existing) Object.assign(existing, patch); else rows.push(patch)
            f.events.push('db:addon'); return ok(patch)
          }
          const matches = rows.filter(row => filters.every(test => test(row)))
          if (operation === 'update') { matches.forEach(row => Object.assign(row, patch)); f.events.push(`db:update:${table}`) }
          return ok(matches[0] ?? null)
        }).then(resolve, reject)
      },
    }
    return q
  }
  // Mirror ledger mapping, per-company pending lock, lease, immutable receipt,
  // and atomic completion. SQL column persistence is tested separately by
  // activation-guard-postgres.mjs; completion payload is asserted here.
  const admin = { from: query, async rpc(name, p) {
    f.events.push(`rpc:${name}`)
    if (f.missingLedger) return fail('missing activation ledger')
    const c = f.company
    if (name === 'claim_activation_attempt') {
      if (!c || c.retired_at || c.id !== p.p_company || c.stripe_customer_id !== p.p_customer) return fail('company mapping changed')
      let a = f.attempts.find(row => row.livemode === p.p_live && row.setup_intent_id === p.p_intent)
      if (a) {
        if (a.company_id !== p.p_company || a.customer_id !== p.p_customer) return fail('attempt mapping mismatch')
        if (a.lease_until && Date.parse(a.lease_until) > f.now) return ok(null)
      } else {
        if (f.attempts.some(row => row.company_id === p.p_company && row.livemode === p.p_live && row.state === 'pending')) return ok(null)
        if ((c.pending_setup_intent_secret ?? '').split('_secret_')[0] !== p.p_intent && !['active', 'trialing'].includes(c.subscription_status)) return fail('intent no longer current')
        a = { id: uuid(), company_id: p.p_company, customer_id: p.p_customer, setup_intent_id: p.p_intent,
          livemode: p.p_live, state: 'pending', request_params: null, first_dispatched_at: null, stripe_subscription_id: null,
          expected_company: { plan: c.plan }, company_result: null }
        f.attempts.push(a)
      }
      Object.assign(a, { lease_token: p.p_token, lease_until: new Clock(f.now + 600000).toISOString() }); return ok(a)
    }
    const a = f.attempts.find(row => row.id === p.p_attempt)
    if (name === 'note_activation_subscription') {
      if (!a || a.company_id !== p.p_company || a.customer_id !== p.p_customer || a.livemode !== p.p_live ||
        (a.stripe_subscription_id && a.stripe_subscription_id !== p.p_subscription)) return ok(false)
      a.stripe_subscription_id = p.p_subscription; return ok(true)
    }
    if (name === 'complete_activation_attempt') {
      if (f.completeFailures-- > 0) return fail('fixture completion interrupted')
      if (!a || !c || c.retired_at || c.stripe_customer_id !== a.customer_id || a.lease_token !== p.p_token ||
        !a.lease_until || Date.parse(a.lease_until) <= f.now || a.stripe_subscription_id !== p.p_subscription) return fail('completion mapping or lease changed')
      if (p.p_update) {
        if (c.plan !== a.expected_company.plan && c.plan !== p.p_update.plan) return fail('Company plan changed after activation began')
        assert.ok(['active', 'trialing'].includes(p.p_update.subscription_status))
        assert.ok(['found', 'found_pro', 'found_business'].includes(p.p_update.plan))
        f.completionPayload = clone(p.p_update); Object.assign(c, clone(p.p_update))
        a.company_result = clone(p.p_update)
      }
      Object.assign(a, { state: 'completed', lease_token: null, lease_until: null }); return ok(true)
    }
    throw Error(`Blocked RPC ${name}`)
  } }
  async function* listed(rows) { for (const row of rows) yield clone(row) }
  const stripe = {
    setupIntents: { async retrieve(id) { f.events.push('read:intent'); assert.ok(f.intents[id]); return clone(f.intents[id]) } },
    paymentMethods: { async retrieve(id) { f.events.push('read:method'); assert.equal(id, f.method.id); return clone(f.method) } },
    subscriptions: {
      list(p) { f.events.push('read:subscriptions'); assert.equal(p.customer, 'cus_fixture'); assert.equal(p.status, 'all'); return listed(f.hideSubscriptions ? [] : f.subscriptions) },
      async create(params, options) {
        f.events.push('stripe:create'); f.createCalls.push(clone({ params, options }))
        if (f.pauseCreate) await f.pauseCreate
        const cached = f.receipts.get(options.idempotencyKey)
        if (cached) { assert.deepEqual(params, cached.params); return clone(cached.sub) }
        const sub = { id: `sub_${f.receipts.size + 1}`, customer: params.customer, livemode: false,
          status: params.trial_end ? 'trialing' : 'active', metadata: clone(params.metadata),
          items: { has_more: false, data: params.items.map(item => ({ price: { id: item.price }, quantity: item.quantity ?? 1 })) } }
        if (f.timeout === 'before') { f.timeout = null; throw Error('fixture timeout before acceptance') }
        f.subscriptions.push(sub); f.receipts.set(options.idempotencyKey, { params: clone(params), sub })
        if (f.timeout === 'after') { f.timeout = null; throw Error('fixture response lost after acceptance') }
        return clone(sub)
      },
    },
    subscriptionItems: {
      list(p) { return listed(f.items.filter(item => item.subscription === p.subscription)) },
      async create(params, options) { f.itemCalls.push(clone({ params, options })); const item = { id: 'si_addon', subscription: params.subscription, price: { id: params.price } }; f.items.push(item); return clone(item) },
    },
  }
  function StripeMock(key) { assert.equal(key, 'sk_test_fixture_only'); return stripe }
  const modules = new Map()
  function load(name) {
    if (modules.has(name)) return modules.get(name).exports
    const module = { exports: {} }; modules.set(name, module)
    const require = id => {
      if (id === 'server-only') return {}
      if (id === 'stripe') return StripeMock
      if (id === '@supabase/supabase-js') return { createClient: () => admin }
      if (id === '@/lib/stripe/activationGuard') return load('guard')
      if (id === '@/lib/introRate') return { INTRO_RATE_CUTOFF: new Clock('2027-01-01') }
      if (id === '@/lib/activationEmails') return { async sendSiteLiveEmailOnce() { f.events.push('mock:email') } }
      if (id === '@/lib/foundFunnelServer') return { async captureFoundActivationCompleted() { f.events.push('mock:analytics') } }
      throw Error(`Blocked require: ${id}`)
    }
    vm.runInNewContext(sources[name], { module, exports: module.exports, require, Date: Clock,
      crypto: { randomUUID: uuid }, process: { env: { STRIPE_SECRET_KEY: 'sk_test_fixture_only', STRIPE_PRICE_ID_FOUND_PRO_FOUNDING: 'price_fallback' } },
      console: { error() {} }, fetch() { throw Error('Network forbidden') } }, { filename: name })
    return module.exports
  }
  f.confirm = (id = 'seti_fixture', slug = 'fixture') => load('action').confirmActivation(slug, id)
  f.existing = (id = 'sub_existing', status = 'active') => ({ id, status, customer: 'cus_fixture', livemode: false,
    metadata: { company_id: companyId }, items: { data: [{ price: { id: 'price_grandfathered' } }] } })
  return f
}
async function test(name, fn) { await fn(); groups++; console.log(`PASS ${name}`) }
function noMutation(f) {
  assert.equal(f.createCalls.length, 0); assert.equal(f.itemCalls.length, 0)
  assert.equal(f.events.filter(e => e.startsWith('rpc:') || e.startsWith('db:') || e.startsWith('mock:')).length, 0)
}

await test('Barrio Builders synthetic activation keeps its deferral and cannot duplicate a subscription', async () => {
  const f = fixture()
  f.company.slug = 'barriobuilders'
  f.company.trial_ends_at = '2026-11-25T12:00:00Z'
  f.intents.seti_fixture.metadata.slug = 'barriobuilders'
  assert.equal((await f.confirm('seti_fixture', 'barriobuilders')).ok, true)
  assert.equal((await f.confirm('seti_fixture', 'barriobuilders')).ok, true)
  assert.equal(f.createCalls.length, 1)
  assert.equal(f.createCalls[0].params.trial_end, Date.parse(f.company.trial_ends_at) / 1000)
  assert.equal(f.company.subscription_status, 'trialing')
})
await test('full confirmation then sequential repeat creates exactly one subscription', async () => {
  const f = fixture(); assert.equal((await f.confirm()).ok, true); assert.equal((await f.confirm()).ok, true)
  assert.equal(f.createCalls.length, 1); assert.equal(f.company.subscription_status, 'active')
  assert.equal(f.company.pending_setup_intent_secret, null); assert.equal(f.attempts[0].state, 'completed')
  assert.equal(f.events.filter(e => e === 'mock:email').length, 1)
  assert.equal(f.events.filter(e => e === 'mock:analytics').length, 1)
})
await test('same and different SetupIntent concurrent confirmations cannot create twice', async () => {
  const f = fixture(); let resume; f.pauseCreate = new Promise(resolve => { resume = resolve })
  const first = f.confirm()
  for (let n = 0; n < 100 && !f.createCalls.length; n++) await Promise.resolve()
  assert.equal(f.createCalls.length, 1)
  const other = await Promise.all([f.confirm(), f.confirm('seti_other')])
  assert.ok(other.every(result => !result.ok)); resume(); assert.equal((await first).ok, true)
  assert.equal((await f.confirm('seti_other')).ok, true); assert.equal(f.createCalls.length, 1)
})
for (const [name, alter] of [
  ['unfinished intent', f => { f.intents.seti_fixture.status = 'requires_payment_method' }],
  ['mode mismatch', f => { f.intents.seti_fixture.livemode = true }],
  ['slug mismatch', f => { f.intents.seti_fixture.metadata.slug = 'other' }],
  ['company mismatch', f => { f.intents.seti_fixture.metadata.company_id = 'other' }],
  ['customer mismatch', f => { f.intents.seti_fixture.customer = 'cus_other' }],
  ['missing payment method', f => { f.intents.seti_fixture.payment_method = null }],
  ['payment method owned by another customer', f => { f.method.customer = 'cus_other' }],
  ['payment method mode mismatch', f => { f.method.livemode = true }],
]) await test(`${name} rejected before any mutation`, async () => {
  const f = fixture(); alter(f); assert.equal((await f.confirm()).ok, false); noMutation(f)
})
await test('expanded customer and payment method mappings accepted', async () => {
  const f = fixture(); f.intents.seti_fixture.customer = { id: 'cus_fixture' }
  f.intents.seti_fixture.payment_method = { id: 'pm_fixture' }; f.method.customer = { id: 'cus_fixture' }
  assert.equal((await f.confirm()).ok, true)
})
await test('already-active existing subscription preserves original price and company plan', async () => {
  const f = fixture(); f.company.subscription_status = 'active'; f.company.plan = 'found_business'
  f.company.pending_setup_intent_secret = null; f.subscriptions.push(f.existing())
  const before = clone(f.subscriptions); assert.equal((await f.confirm()).ok, true)
  assert.deepEqual(f.subscriptions, before); assert.equal(f.company.plan, 'found_business'); assert.equal(f.createCalls.length, 0)
})
await test('multiple nonterminal subscriptions fail closed', async () => {
  const f = fixture(); f.subscriptions.push(f.existing('sub_a'), f.existing('sub_b'))
  assert.equal((await f.confirm()).ok, false); assert.equal(f.createCalls.length, 0); assert.equal(f.company.subscription_status, 'incomplete')
})
await test('existing past-due subscription is never replaced', async () => {
  const f = fixture(); f.subscriptions.push(f.existing('sub_due', 'past_due'))
  assert.equal((await f.confirm()).ok, false); assert.equal(f.createCalls.length, 0)
})
for (const timeout of ['before', 'after']) await test(`create timeout ${timeout} acceptance retries stable key and frozen parameters`, async () => {
  const f = fixture(); f.timeout = timeout; f.company.trial_ends_at = '2026-11-15T18:00:00Z'
  f.intents.seti_fixture.metadata.promotion_code_id = 'promo_fixture'
  assert.equal((await f.confirm()).ok, false)
  const original = clone(f.createCalls[0]); f.now += 3600000
  f.company.trial_ends_at = '2026-12-15T18:00:00Z'; f.intents.seti_fixture.metadata.price_id = 'price_changed'
  f.intents.seti_fixture.metadata.promotion_code_id = 'promo_changed'
  // Force a replay of the idempotent create even if the provider accepted the
  // first request but listing has not caught up yet.
  f.hideSubscriptions = true; assert.equal((await f.confirm()).ok, true)
  assert.equal(f.createCalls.length, 2); assert.deepEqual(f.createCalls[1], original)
  assert.equal(f.subscriptions.length, 1); assert.match(original.options.idempotencyKey, /^found-activation:/)
})
await test('accepted timed-out create is recovered through subscription listing without another create', async () => {
  const f = fixture(); f.timeout = 'after'; assert.equal((await f.confirm()).ok, false)
  assert.equal((await f.confirm()).ok, true); assert.equal(f.createCalls.length, 1)
})
for (const [name, change] of [
  ['base price', sub => { sub.items.data[0].price.id = 'price_upgraded' }],
  ['base quantity', sub => { sub.items.data[0].quantity = 2 }],
  ['metadata plan', sub => { sub.metadata.plan = 'found_business' }],
  ['incomplete item listing', sub => { sub.items.has_more = true }],
]) await test(`interrupted activation with changed ${name} cannot overwrite or charge again`, async () => {
  const f = fixture(); f.completeFailures = 1
  assert.equal((await f.confirm()).ok, false)
  assert.equal(f.attempts[0].state, 'pending'); assert.equal(f.subscriptions.length, 1)
  assert.equal(f.attempts[0].request_params.items[0].price, 'price_original')
  assert.equal(f.subscriptions[0].items.data[0].quantity, 1)
  change(f.subscriptions[0])
  // Model a later legitimate upgrade while the old browser confirmation was
  // interrupted. The retry must not restore its old plan or clear its setup.
  f.company.plan = 'found_business'; f.company.subscription_status = 'active'
  const companyBefore = clone(f.company), subscriptionBefore = clone(f.subscriptions)
  const completedBefore = f.events.filter(e => e === 'rpc:complete_activation_attempt').length
  assert.equal((await f.confirm()).ok, false)
  assert.deepEqual(f.company, companyBefore); assert.deepEqual(f.subscriptions, subscriptionBefore)
  assert.equal(f.createCalls.length, 1); assert.equal(f.itemCalls.length, 0)
  assert.equal(f.events.filter(e => e === 'rpc:complete_activation_attempt').length, completedBefore)
  assert.equal(f.attempts[0].state, 'pending'); assert.equal(f.attempts[0].company_result, null)
})
await test('23-hour cutoff blocks fresh dispatch of uncertain result', async () => {
  const f = fixture(); f.timeout = 'before'; assert.equal((await f.confirm()).ok, false)
  f.now += 23 * 3600000; assert.equal((await f.confirm()).ok, false); assert.equal(f.createCalls.length, 1)
})
await test('missing ledger causes no Stripe write', async () => {
  const f = fixture(); f.missingLedger = true; assert.equal((await f.confirm()).ok, false)
  assert.equal(f.createCalls.length, 0); assert.equal(f.itemCalls.length, 0)
})
await test('missing or retired company rejected before mutation', async () => {
  for (const retired of [false, true]) {
    const f = fixture(); if (retired) f.company.retired_at = '2026-10-25'; else f.company = null
    assert.equal((await f.confirm()).ok, false); noMutation(f); assert.ok(!f.events.includes('read:intent'))
  }
})
await test('deferred billing and promo reach Stripe and completion payload unchanged', async () => {
  const f = fixture(); f.company.trial_ends_at = '2026-11-15T18:00:00Z'
  Object.assign(f.intents.seti_fixture.metadata, { promotion_code_id: 'promo_fixture', promotion_code: 'SAVE', coupon_id: 'coupon_fixture', discount_label: '20% off' })
  assert.equal((await f.confirm()).ok, true)
  const p = f.createCalls[0].params
  assert.equal(p.trial_end, Date.parse(f.company.trial_ends_at) / 1000); assert.equal(p.proration_behavior, 'none')
  assert.deepEqual(p.discounts, [{ promotion_code: 'promo_fixture' }]); assert.equal(f.company.subscription_status, 'trialing')
  assert.equal(f.completionPayload.applied_promotion_code_id, 'promo_fixture')
  assert.equal(f.completionPayload.applied_promotion_code, 'SAVE'); assert.equal(f.completionPayload.applied_coupon_id, 'coupon_fixture')
  assert.equal(f.completionPayload.applied_discount_label, '20% off'); assert.equal(f.completionPayload.is_founding_member, true)
})
await test('headstart trial date takes precedence over stored billing date', async () => {
  const f = fixture(); f.company.trial_ends_at = '2026-11-01T18:00:00Z'
  Object.assign(f.intents.seti_fixture.metadata, { headstart_trial_end: '2026-11-25T18:00:00Z', headstart_days: '30', promotion_code: 'F0UND1130' })
  assert.equal((await f.confirm()).ok, true)
  assert.equal(f.createCalls[0].params.trial_end, Date.parse('2026-11-25T18:00:00Z') / 1000)
  assert.equal(f.completionPayload.trial_ends_at, '2026-11-25T18:00:00Z')
  assert.equal(f.completionPayload.applied_promotion_code, 'F0UND1130')
})
await test('add-on completion interrupted then repeated creates one item and one subscription', async () => {
  const f = fixture(); f.intents.seti_fixture.metadata.addon_slug = 'shared_gallery'; f.completeFailures = 1
  assert.equal((await f.confirm()).ok, false); assert.equal((await f.confirm()).ok, true)
  assert.equal((await f.confirm()).ok, true); assert.equal(f.createCalls.length, 1); assert.equal(f.itemCalls.length, 1)
  assert.equal(f.addons.length, 1); assert.equal(f.addons[0].active, true)
  assert.equal(f.itemCalls[0].params.price, 'price_addon'); assert.equal(f.itemCalls[0].params.quantity, 1)
  assert.equal(f.itemCalls[0].options.idempotencyKey, `found-activation-addon:${f.attempts[0].id}`)
})
console.log(`Activation confirmation passed: ${groups} groups; real VM-transpiled action/guard, mocked ledger and Stripe, no network or production writes.`)
