import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as jsxRuntime from 'react/jsx-runtime'

// Actual route and loader, no Next server, Stripe SDK, activation action, real
// browser storage, network, credentials, user accounts, or outgoing messages.
function source(relative) {
  return ts.transpileModule(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText
}
const routeSource = source('../src/app/activate/confirm/route.ts')
const loaderSource = source('../src/app/activate/ActivateLoader.tsx')
const secret = 'fixture_sensitive_value_never_forward'
const rawError = 'fixture internal provider error never shown'
let groups = 0
async function test(name, fn) { await fn(); groups++; console.log(`PASS ${name}`) }

function routeFixture(result = { ok: false }) {
  const calls = [], cookies = []
  const module = { exports: {} }
  vm.runInNewContext(routeSource, {
    module, exports: module.exports, URL,
    process: { env: { NEXT_PUBLIC_ROOT_DOMAIN: 'fixture.invalid' } },
    fetch() { throw Error('Network forbidden') },
    require(id) {
      if (id === 'next/server') return { NextResponse: { redirect(destination) {
        return { location: String(destination), cookies: { set(...args) { cookies.push(args) } } }
      } } }
      if (id === '../activateActions') return { async confirmActivation(...args) { calls.push(args); return result } }
      throw Error(`Blocked route require: ${id}`)
    },
  }, { filename: 'actual-confirm-route.ts' })
  return { calls, cookies, async get(params) {
    const url = new URL('https://fixture.invalid/activate/confirm')
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
    return module.exports.GET({ url: url.href, nextUrl: url })
  } }
}
const valid = { slug: 'fixture', setup_intent: 'seti_fixture', redirect_status: 'succeeded' }
function safeFailure(url) {
  assert.equal(url.origin, 'https://fixture.invalid'); assert.equal(url.pathname, '/activate')
  assert.ok(!url.href.includes(secret)); assert.ok(!url.href.includes('client_secret'))
  assert.ok(!decodeURIComponent(url.href).includes(rawError))
}

await test('missing slug, intent, or successful redirect status never calls confirmation', async () => {
  for (const patch of [{ slug: '' }, { setup_intent: '' }, { redirect_status: '' }, { redirect_status: 'failed' }]) {
    const f = routeFixture()
    const response = await f.get({ ...valid, ...patch, setup_intent_client_secret: secret, returnTo: 'dashboard' })
    const url = new URL(response.location); safeFailure(url)
    assert.equal(url.searchParams.get('error'), 'payment_failed')
    assert.equal(url.searchParams.has('setup_intent'), false)
    assert.equal(url.searchParams.has('returnTo'), false)
    assert.equal(f.calls.length, 0); assert.equal(f.cookies.length, 0)
  }
})
await test('incomplete confirmation preserves only intent ID and safe dashboard return', async () => {
  for (const result of [{ ok: false, error: rawError }, { ok: true, error: rawError }]) {
    const f = routeFixture(result)
    const response = await f.get({ ...valid, setup_intent_client_secret: secret, client_secret: secret,
      returnTo: 'dashboard', error: rawError })
    const url = new URL(response.location); safeFailure(url)
    assert.equal(url.searchParams.get('error'), 'activation_incomplete')
    assert.equal(url.searchParams.get('setup_intent'), valid.setup_intent)
    assert.equal(url.searchParams.get('returnTo'), 'dashboard')
    assert.deepEqual([...url.searchParams.keys()].sort(), ['error', 'returnTo', 'setup_intent', 'slug'])
    assert.deepEqual(f.calls, [['fixture', 'seti_fixture']]); assert.equal(f.cookies.length, 0)
  }
})
await test('returnTo only accepts the dashboard sentinel on incomplete or successful confirmation', async () => {
  for (const returnTo of ['', 'https://attacker.invalid', '//attacker.invalid', '/dashboard', 'Dashboard']) {
    const incomplete = routeFixture(); const failure = new URL((await incomplete.get({ ...valid, returnTo })).location)
    assert.equal(failure.searchParams.has('returnTo'), false)
    const success = routeFixture({ ok: true, companyId: 'company_fixture', authLink: 'https://my.fixture.invalid/auth/synthetic' })
    assert.equal((await success.get({ ...valid, returnTo })).location, 'https://fixture.fixture.invalid?activated=true')
  }
})
await test('successful dashboard confirmation preserves auth link and company cookie', async () => {
  const authLink = 'https://my.fixture.invalid/auth/callback?synthetic=1'
  const f = routeFixture({ ok: true, companyId: 'company_fixture', authLink })
  assert.equal((await f.get({ ...valid, returnTo: 'dashboard' })).location, authLink)
  assert.equal(f.calls.length, 1); assert.equal(f.cookies.length, 1)
  const [name, value, options] = f.cookies[0]
  assert.equal(name, 'found_company_id'); assert.equal(value, 'company_fixture')
  assert.equal(options.domain, '.fixture.invalid'); assert.equal(options.secure, true)
  assert.equal(options.sameSite, 'lax'); assert.equal(options.path, '/'); assert.equal(options.maxAge, 2592000)
})
await test('dashboard fallback selects the confirmed company; site success stays on tenant', async () => {
  const f = routeFixture({ ok: true, companyId: 'company fixture/?', authLink: null })
  const dashboard = new URL((await f.get({ ...valid, returnTo: 'dashboard' })).location)
  assert.equal(dashboard.origin, 'https://my.fixture.invalid'); assert.equal(dashboard.pathname, '/api/select-company')
  assert.equal(dashboard.searchParams.get('id'), 'company fixture/?'); assert.equal(dashboard.searchParams.get('activated'), 'true')
  assert.equal((await f.get(valid)).location, 'https://fixture.fixture.invalid?activated=true')
})

function loaderFixture(params, stored = {}) {
  let index = 0, flowRenders = 0
  const states = [], effects = [], removals = []
  const storage = new Map(Object.entries(stored))
  const window = { location: { search: `?${new URLSearchParams(params)}`, href: 'https://fixture.invalid/activate' } }
  const module = { exports: {} }
  vm.runInNewContext(loaderSource, {
    module, exports: module.exports, URLSearchParams, window,
    process: { env: { NEXT_PUBLIC_ROOT_DOMAIN: 'fixture.invalid' } },
    sessionStorage: { getItem: key => storage.get(key) ?? null, removeItem(key) { removals.push(key); storage.delete(key) } },
    fetch() { throw Error('Network forbidden') },
    require(id) {
      if (id === 'react/jsx-runtime') return jsxRuntime
      if (id === 'react') return { ...React,
        useState(initial) { const slot = index++; if (!(slot in states)) states[slot] = initial; return [states[slot], value => { states[slot] = value }] },
        useEffect(effect) { effects.push(effect) },
      }
      if (id === 'next/dynamic') return { __esModule: true, default: () => function Flow(props) {
        flowRenders++; return React.createElement('div', { 'data-activation-flow': true }, props.error ?? 'fixture flow')
      } }
      throw Error(`Blocked loader require: ${id}`)
    },
  }, { filename: 'actual-ActivateLoader.tsx' })
  function render() { index = 0; return renderToStaticMarkup(React.createElement(module.exports.default)) }
  const first = render(); effects.splice(0).forEach(effect => effect()); const html = render()
  return { first, html, flowRenders, removals, window }
}
await test('incomplete loader renders recovery only; Check again reuses the same intent without secrets', async () => {
  const f = loaderFixture({ slug: 'fixture', setup_intent: 'seti_fixture', error: 'activation_incomplete',
    returnTo: 'dashboard', setup_intent_client_secret: secret }, { activate_secret: secret, activate_slug: 'stale', activate_name: 'Fixture' })
  assert.equal(f.flowRenders, 0); assert.ok(!f.html.includes('data-activation-flow'))
  assert.ok(f.html.includes('Check again')); assert.ok(f.html.includes('enter your card again'))
  assert.ok(!f.html.includes(secret)); assert.ok(!f.html.includes('client_secret'))
  const match = f.html.match(/href="([^"]*\/activate\/confirm[^\"]*)"/)
  assert.ok(match)
  const retry = new URL(match[1].replaceAll('&amp;', '&'), 'https://fixture.invalid')
  assert.equal(retry.pathname, '/activate/confirm')
  assert.equal(retry.searchParams.get('slug'), 'fixture'); assert.equal(retry.searchParams.get('setup_intent'), 'seti_fixture')
  assert.equal(retry.searchParams.get('redirect_status'), 'succeeded'); assert.equal(retry.searchParams.get('returnTo'), 'dashboard')
  assert.deepEqual([...retry.searchParams.keys()].sort(), ['redirect_status', 'returnTo', 'setup_intent', 'slug'])
  assert.deepEqual(f.removals, ['activate_slug', 'activate_secret', 'activate_name'])
})
await test('incomplete loader never mounts new setup even without an intent ID', async () => {
  const f = loaderFixture({ slug: 'fixture', error: 'activation_incomplete' })
  assert.equal(f.flowRenders, 0); assert.ok(!f.html.includes('Check again'))
  assert.ok(f.html.includes('https://my.fixture.invalid/login'))
})
await test('loader retry link discards unapproved returnTo', async () => {
  const f = loaderFixture({ slug: 'fixture', setup_intent: 'seti_fixture', error: 'activation_incomplete', returnTo: 'https://attacker.invalid' })
  assert.equal(f.flowRenders, 0); assert.ok(f.html.includes('Check again'))
  assert.ok(!f.html.includes('attacker.invalid')); assert.ok(!f.html.includes('returnTo'))
})
await test('ordinary and failed setup still mount the flow, verifying the hook fixture exercises branching', async () => {
  const ordinary = loaderFixture({ slug: 'fixture' }); assert.equal(ordinary.flowRenders, 1)
  const failed = loaderFixture({ slug: 'fixture', error: 'payment_failed' })
  assert.equal(failed.flowRenders, 1); assert.ok(failed.html.includes('Please try again.'))
})
console.log(`Activation retry route passed: ${groups} groups; actual VM route and hook-rendered loader, no network or production writes.`)
