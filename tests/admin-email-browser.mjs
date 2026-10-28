import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import http from 'node:http'
import { createRequire } from 'node:module'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// Real page/workspace/history code; synthetic database, no credentials or sends.
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.FOUND_PLAYWRIGHT_MODULE || 'playwright')
const root = process.cwd(), cache = new Map()
let reads = 0, denied = false, broken = false
const companies = ['Security Example LLC', 'Bike Shop Example', 'Remodel Example', 'Heating Example'].map((name, i) => ({
  id: `client-${i}`, name, slug: `example-${i}`, email: `owner${i}@example.invalid`, account_kind: 'client', is_test: false,
  retired_at: null, client_state: 'active', subscription_status: i === 1 ? 'canceled' : 'active',
}))
const makeEmail = (i, extra = {}) => ({ id: `email-${String(i).padStart(4, '0')}`, company_id: 'client-0', lead_id: null,
  recipient_email: 'owner0@example.invalid', recipient_type: 'client_owner', email_type: 'site_live',
  source: 'activationEmails/sendSiteLiveEmailOnce', email_scope: 'client', subject: `Your website is live ${i}`,
  success: true, delivery_status: 'delivered', handled_at: null, handled_note: null,
  created_at: new Date(Date.UTC(2026, 9, 20, 12, i)).toISOString(), ...extra })
const emails = Array.from({ length: 31 }, (_, i) => makeEmail(i))
emails.push(makeEmail(40, { company_id: null, email_type: 'magic_link_login', source: 'dashboard/api/send-login', subject: 'Your Found login link' }))
emails.push(makeEmail(41, { company_id: 'client-1', email_type: 'lead_followup_day1', source: 'api/cron/lead-followup', recipient_type: 'lead', lead_id: 'lead-1', subject: 'Business customer follow-up' }))
emails.push(makeEmail(42, { email_type: 'new_signup_alert', source: 'adminAlerts/sendNewSignupAlert', recipient_type: 'admin', subject: 'Internal signup alert' }))
emails.push(makeEmail(43, { email_type: 'unfamiliar_message', source: 'unknown', subject: 'Unclassified example' }))
const db = { from(table) {
  reads++
  let order = []
  return { select() { return this }, order(column, options) { order.push([column, options]); return this },
    async range(start, end) {
      if (broken) return { data: null, count: null, error: { message: 'Synthetic outage' } }
      const values = [...(table === 'companies' ? companies : table === 'leads' ? [{ id: 'lead-1', flagged: true }] : emails)]
      values.sort((a, b) => { for (const [key, options] of order) { const n = String(a[key]).localeCompare(String(b[key])); if (n) return options.ascending ? n : -n } return 0 })
      return { data: values.slice(start, end + 1), count: values.length, error: null }
    },
  }
} }
function load(file) {
  let absolute = path.resolve(file)
  if (!path.extname(absolute)) absolute += fs.existsSync(`${absolute}.ts`) ? '.ts' : '.tsx'
  if (cache.has(absolute)) return cache.get(absolute).exports
  const module = { exports: {} }; cache.set(absolute, module)
  const code = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022,
  }, fileName: absolute }).outputText
  const localRequire = id => {
    if (id === 'react' || id === 'react/jsx-runtime') return require(id)
    if (id === 'server-only') return {}
    if (id === 'next/link') return { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) }
    if (id === '../lib' && absolute.endsWith(`${path.sep}emails${path.sep}page.tsx`)) return { getAdminClient: () => db, requireAdmin: async () => { if (denied) throw Error('Not authorized') } }
    if (id === './actions') return { markEmailHandled: () => { throw Error('No writes in fixture') } }
    if (id.startsWith('@/')) return load(path.join(root, 'src', id.slice(2)))
    if (id.startsWith('.')) return load(path.resolve(path.dirname(absolute), id))
    throw Error(`Unexpected runtime dependency: ${id}`)
  }
  vm.runInNewContext(code, { module, exports: module.exports, require: localRequire, URLSearchParams, URL, Date, console }, { filename: absolute })
  return module.exports
}
const Page = load('src/app/admin/emails/page.tsx').default
const before = reads; denied = true
await assert.rejects(() => Page({ searchParams: Promise.resolve({}) }), /Not authorized/)
assert.equal(reads, before, 'unauthorized history request reads no database')
denied = false
const css = ['admin.css', 'v2.css', 'refined.css'].map(name => fs.readFileSync(path.join(root, 'src/app/admin', name), 'utf8')).join('\n')
const server = http.createServer(async (req, res) => {
  if (req.method !== 'GET') { res.writeHead(405); res.end('Writes disabled'); return }
  const url = new URL(req.url, 'http://fixture.invalid')
  broken = url.searchParams.get('fixture') === 'error'
  try {
    const params = Object.fromEntries(url.searchParams)
    const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve(params) }))
    res.setHeader('Content-Type', 'text/html')
    res.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif}${css}</style></head><body><div class="found-hq-root"><main class="found-hq-main">${html}</main></div></body></html>`)
  } catch (error) { res.writeHead(500); res.end(String(error)) }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const browser = await chromium.launch({ headless: true, ...(process.env.FOUND_BROWSER_EXECUTABLE ? { executablePath: process.env.FOUND_BROWSER_EXECUTABLE } : {}) })
const base = `http://127.0.0.1:${server.address().port}/admin/emails`
const out = path.join(root, '.billing-audits/admin-email-history'); fs.mkdirSync(out, { recursive: true })
let checks = 0
try {
  for (const width of [320, 390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    await page.goto(base)
    await page.getByRole('region', { name: 'Client email overview' }).waitFor()
    for (const company of companies) await page.getByRole('heading', { name: company.name, exact: true }).waitFor()
    assert.equal(await page.getByRole('link', { name: /Business customer follow-up/ }).count(), 0)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overview fits ${width}`)
    await page.screenshot({ path: path.join(out, `overview-${width}.png`), fullPage: true })
    await page.getByRole('link', { name: /Security Example LLC/ }).click()
    await page.getByRole('region', { name: 'Email history', exact: true }).waitFor()
    assert.ok(new URL(page.url()).searchParams.get('client') === 'client-0')
    await page.screenshot({ path: path.join(out, `client-timeline-${width}.png`), fullPage: true })
    const next = page.getByRole('link', { name: 'Next', exact: true })
    await next.click()
    assert.equal(new URL(page.url()).searchParams.get('page'), '2')
    await page.getByRole('link', { name: 'Previous', exact: true }).waitFor()
    await page.getByLabel('Email category').selectOption('business')
    await page.getByRole('button', { name: /Apply|Show|Update/ }).click()
    assert.equal(new URL(page.url()).searchParams.get('category'), 'business')
    assert.equal(new URL(page.url()).searchParams.has('page'), false, 'filter changes reset pagination')
    await page.goto(`${base}?category=all`)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `history fits ${width}`)
    await page.screenshot({ path: path.join(out, `history-${width}.png`), fullPage: true })
    await page.close(); checks++
  }
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await page.goto(`${base}?category=business&status=flagged`)
  await page.getByText('Staff review: flagged lead', { exact: true }).waitFor()
  assert.equal(await page.getByRole('link', { name: /Business customer follow-up/ }).count(), 1, 'flagged lead remains discoverable separately from delivery')
  await page.goto(`${base}?category=found_clients&client=unlinked`)
  await page.getByRole('link', { name: /Your Found login link/ }).waitFor()
  assert.equal(await page.getByRole('link', { name: 'Client details', exact: true }).count(), 0, 'unlinked history never invents a client detail link')
  await page.goto(`${base}?fixture=error`)
  await page.getByRole('alert').waitFor()
  assert.equal(await page.getByText('No current clients found.', { exact: true }).count(), 0, 'outage does not pretend empty history')
  await page.close(); checks++
  console.log(`${checks} Chromium admin-email groups passed; real components, synthetic records, no emails or account writes. Pre-read admin authorization assertion passed. Screenshots: ${out}`)
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)) }
