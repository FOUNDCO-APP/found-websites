import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import * as jsx from 'react/jsx-runtime'

// Exercise the actual server page with synthetic businesses and no network.
const source = fs.readFileSync(new URL('../src/app/dashboard/(app)/page.tsx', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
} }).outputText
let groups = 0
async function pageFixture(patch = {}, owner = true) {
  const company = { id: 'synthetic-barrio', name: 'Barrio Builders Fixture', slug: 'fixture',
    plan: 'found_pro', subscription_status: 'active', included_addon_slug: null,
    disabled_addons: ['shopping_cart'], industry_category: 'home_services', ...patch }
  const module = { exports: {} }
  const tableReads = []
  function query(table) {
    const q = { then(resolve) { resolve({ data: table === 'website_config' ? { custom_domain: null } : [] }) } }
    for (const name of ['select', 'eq', 'neq', 'order', 'limit', 'single', 'maybeSingle']) q[name] = () => q
    return q
  }
  vm.runInNewContext(compiled, {
    module, exports: module.exports, Date,
    fetch() { throw Error('Network forbidden') },
    require(id) {
      if (id === 'react/jsx-runtime') return jsx
      if (id === 'next/navigation') return { redirect(path) { throw Error(`redirect:${path}`) } }
      if (id === 'next/link') return { __esModule: true, default: 'a' }
      if (id === '@/lib/auth/getAuthUser') return { requireDashboardAccess: async () => ({ id: 'fixture-owner', email: 'fixture@example.invalid' }) }
      if (id === '@/lib/dashboard/getCompany') return { getCompany: async () => company, requireOwnerAccess: async () => owner }
      if (id === '@/lib/supabase/admin') return { createAdminClient: () => ({ from(table) { tableReads.push(table); return query(table) } }) }
      if (id === '@/lib/dashboard/entitlements') return { getCompanyActiveAddonSlugs: async () => ['email_marketing'] }
      if (id === '@/lib/featureAccess') return { getEffectiveAddons: () => [], getFeatureAccess: () => true }
      if (id === '@/lib/dashboard/smartNextStep') return { smartNextStepFor: () => null }
      if (id === '@/lib/dashboard/typography') return { TYPE: {}, TEXT_OPACITY: {}, albumLabelFor: () => ({ singular: 'Job', plural: 'Jobs' }) }
      if (id.startsWith('@/components/dashboard/')) return { __esModule: true, default: id }
      throw Error(`Unmocked import: ${id}`)
    },
  })
  return { result: await module.exports.default(), company, tableReads }
}
async function test(name, fn) { await fn(); groups++; console.log(`PASS ${name}`) }

await test('active Pro without a choice gets the included-only dashboard prompt', async () => {
  const { result } = await pageFixture()
  const prompt = result.props.includedToolPrompt
  assert.equal(prompt.type, '@/components/dashboard/IncludedProTool')
  assert.equal(prompt.props.companyId, 'synthetic-barrio')
  assert.equal(prompt.props.currentIncludedSlug, null)
  assert.equal(prompt.props.variant, 'prompt')
  assert.deepEqual(prompt.props.disabledAddonSlugs, ['shopping_cart'])
  assert.deepEqual(prompt.props.paidAddonSlugs, ['email_marketing'])
})
await test('trialing Pro also receives the optional choice', async () => {
  assert.ok((await pageFixture({ subscription_status: 'trialing' })).result.props.includedToolPrompt)
})
await test('existing Pro selection never gets the first-choice prompt', async () => {
  for (const pick of ['email_marketing', 'quote_payments', 'reservation_calendar', 'shopping_cart', 'online_ordering']) {
    const { result, company } = await pageFixture({ included_addon_slug: pick })
    assert.equal(result.props.includedToolPrompt, null)
    assert.equal(company.included_addon_slug, pick)
  }
})
await test('Starter and Business never receive Pro selection prompt', async () => {
  for (const plan of ['found', 'found_business', null]) assert.equal((await pageFixture({ plan })).result.props.includedToolPrompt, null)
})
await test('unpaid canceled and past-due Pro do not receive the active-owner prompt', async () => {
  for (const status of ['incomplete', 'past_due', 'unpaid', 'canceled', null]) {
    assert.equal((await pageFixture({ subscription_status: status })).result.props.includedToolPrompt, null)
  }
})
await test('worker path remains field photos rather than a Pro chooser', async () => {
  const { result } = await pageFixture({}, false)
  assert.equal(result.type, 'main')
  assert.equal(result.props.includedToolPrompt, undefined)
})
await test('prompt renders independently from new-lead activity', async () => {
  assert.match(source, /includedToolPrompt=\{isActive && company\.plan === "found_pro" && !company\.included_addon_slug/)
  const home = fs.readFileSync(new URL('../src/components/dashboard/HomeClient.tsx', import.meta.url), 'utf8')
  assert.match(home, /\{includedToolPrompt &&/)
  assert.ok(home.indexOf('{includedToolPrompt &&') < home.indexOf('{hasNewLead &&'))
})
console.log(`${groups} Pro dashboard journey groups passed; no real customer or provider writes.`)
