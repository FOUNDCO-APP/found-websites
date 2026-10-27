import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

// The real chooser and React run in Chromium. All server actions are synthetic;
// no Supabase, Stripe, email, real account or Next production server is used.
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.FOUND_PLAYWRIGHT_MODULE || 'playwright')
const root = fileURLToPath(new URL('../', import.meta.url))
const modules = [], seen = new Map()
const overrides = {
  'next/navigation': `exports.usePathname=()=>window.fixture.pathname;exports.useRouter=()=>({refresh(){window.fixture.refreshes++}});`,
  'next/link': `exports.__esModule=true;exports.default=({href,children,...props})=>window.fixtureReact.createElement('a',{href,...props},children);`,
  '@/app/dashboard/(app)/more/actions': `exports.switchIncludedAddon=async(...args)=>{window.fixture.calls.push(args);if(window.fixture.behavior==='throw')throw Error('synthetic failure');if(window.fixture.behavior==='pending')return new Promise(r=>window.fixture.resolve=r);return window.fixture.result;};`,
}
function bundle(file, name) {
  const key = name && overrides[name] ? name : file
  if (seen.has(key)) return seen.get(key)
  const id = modules.length; seen.set(key, id); modules.push(null)
  let code = name && overrides[name] ? overrides[name] : fs.readFileSync(file, 'utf8')
  if (/\.tsx?$/.test(file) && !(name && overrides[name])) code = ts.transpileModule(code, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText
  const deps = {}
  for (const match of code.matchAll(/require\(["']([^"']+)["']\)/g)) {
    const spec = match[1]
    const target = overrides[spec] ? spec : spec.startsWith('@/')
      ? path.join(root, 'src', `${spec.slice(2)}.ts`)
      : require.resolve(spec, { paths: [path.dirname(file), root] })
    deps[spec] = bundle(target, spec)
  }
  modules[id] = `${id}:[function(require,module,exports){${code}\n},${JSON.stringify(deps)}]`
  return id
}
const react = bundle(require.resolve('react'))
const client = bundle(require.resolve('react-dom/client'))
const component = bundle(path.join(root, 'src/components/dashboard/IncludedProTool.tsx'))
const script = `const process={env:{NODE_ENV:'development'}};const modules={${modules.join(',')}};const cache={};function load(id){if(cache[id])return cache[id].exports;const [fn,deps]=modules[id],m={exports:{}};cache[id]=m;fn(s=>load(deps[s]),m,m.exports);return m.exports}window.fixtureReact=load(${react});const root=load(${client}).createRoot(document.getElementById('root'));window.fixture={pathname:'/',refreshes:0,calls:[],result:{success:true},behavior:'success'};window.renderFixture=(props={})=>root.render(window.fixtureReact.createElement(load(${component}).default,{companyId:'synthetic-barrio',currentIncludedSlug:null,disabledAddonSlugs:['shopping_cart'],paidAddonSlugs:[],variant:'prompt',...props}));window.renderFixture();`
const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:20px;background:#101010;color:white;font-family:Arial,sans-serif}*{box-sizing:border-box}button,input{font:inherit}dialog::backdrop{background:#000b}</style></head><body><main id="root"></main><script>${script.replace(/<\/script/gi, '<\\/script')}</script></body></html>`
const server = http.createServer((req, res) => { res.setHeader('Content-Type', 'text/html'); res.end(html) })
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const browser = await chromium.launch({ headless: true,
  ...(process.env.FOUND_BROWSER_EXECUTABLE ? { executablePath: process.env.FOUND_BROWSER_EXECUTABLE } : {}),
})
const out = path.join(root, '.billing-audits/pro-included-choice')
fs.mkdirSync(out, { recursive: true })
let groups = 0
try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 640 }, { width: 1440, height: 900 }]) {
    const page = await browser.newPage({ viewport })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`http://127.0.0.1:${server.address().port}`)
    await page.getByRole('button', { name: 'Choose a tool', exact: true }).click()
    await page.getByRole('dialog').waitFor()
    assert.equal(await page.getByRole('radio').count(), 5)
    await page.getByRole('button', { name: 'Later', exact: true }).click()
    await page.getByRole('button', { name: 'Choose a tool', exact: true }).click()
    assert.equal(await page.evaluate(() => window.fixture.calls.length), 0)
    await page.getByRole('radio', { name: /Shopping Cart/ }).check()
    await page.getByRole('checkbox').waitFor()
    assert.equal(await page.getByRole('button', { name: 'Include and turn on', exact: true }).isDisabled(), true)
    await page.getByRole('checkbox').check()
    await page.screenshot({ path: path.join(out, `chooser-${viewport.width}.png`), fullPage: true })
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    assert.ok(await page.getByRole('dialog').evaluate(el => el.scrollWidth <= el.clientWidth + 1))
    await page.getByRole('button', { name: 'Include and turn on', exact: true }).click()
    await page.getByRole('heading', { name: 'Your choice is saved' }).waitFor()
    assert.equal(await page.getByRole('link', { name: 'Continue setup' }).getAttribute('href'), '/products')
    const calls = await page.evaluate(() => window.fixture.calls)
    assert.equal(calls.length, 1)
    assert.deepEqual(calls[0], ['synthetic-barrio', 'shopping_cart', { expectedIncludedAddonSlug: null, confirmTurnOn: true }])
    assert.deepEqual(errors, [])
    await page.close(); groups++
  }
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await page.goto(`http://127.0.0.1:${server.address().port}`)
  await page.getByRole('button', { name: 'Choose a tool', exact: true }).click()
  await page.getByRole('radio', { name: /Booking Calendar/ }).check()
  await page.evaluate(() => { window.fixture.behavior = 'pending' })
  await page.getByRole('button', { name: 'Save included tool', exact: true }).click()
  assert.equal(await page.getByRole('button', { name: /Saving choice/ }).isDisabled(), true)
  await page.evaluate(() => window.fixture.resolve({ success: false, error: 'Synthetic save rejected. Please try again.' }))
  await page.getByRole('alert').waitFor()
  assert.equal(await page.getByRole('button', { name: 'Save included tool', exact: true }).isEnabled(), true)
  assert.equal(await page.getByRole('heading', { name: 'Your choice is saved' }).count(), 0)
  groups++
  await page.evaluate(() => { window.fixture.behavior = 'throw' })
  await page.getByRole('button', { name: 'Save included tool', exact: true }).click()
  await page.getByRole('button', { name: 'Check saved choice' }).waitFor()
  assert.equal(await page.getByRole('heading', { name: 'Your choice is saved' }).count(), 0)
  groups++
  await page.close()
  const keyboard = await browser.newPage()
  await keyboard.goto(`http://127.0.0.1:${server.address().port}`)
  await keyboard.getByRole('button', { name: 'Choose a tool', exact: true }).click()
  await keyboard.keyboard.press('Escape')
  await keyboard.getByRole('dialog').waitFor({ state: 'detached' })
  assert.equal(await keyboard.getByRole('button', { name: 'Choose a tool', exact: true }).evaluate(el => document.activeElement === el), true)
  await keyboard.evaluate(() => window.renderFixture({ currentIncludedSlug: 'email_marketing' }))
  await keyboard.getByRole('button', { name: 'Choose a tool', exact: true }).waitFor({ state: 'detached' })
  groups++
  await keyboard.close()
  const manage = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await manage.goto(`http://127.0.0.1:${server.address().port}`)
  await manage.evaluate(() => {
    window.fixture.pathname = '/dashboard/billing'
    window.renderFixture({ variant: 'manage', currentIncludedSlug: 'email_marketing', paidAddonSlugs: ['shopping_cart'] })
  })
  await manage.getByRole('button', { name: 'Manage', exact: true }).click()
  assert.equal(await manage.getByRole('radio', { name: /Shopping Cart/ }).isDisabled(), true)
  await manage.getByRole('radio', { name: /Booking Calendar/ }).check()
  await manage.getByText('This replaces Email Marketing', { exact: false }).waitFor()
  await manage.getByRole('button', { name: 'Save included tool', exact: true }).click()
  await manage.getByRole('heading', { name: 'Your choice is saved' }).waitFor()
  assert.equal(await manage.getByRole('link', { name: 'Continue setup' }).getAttribute('href'), '/dashboard/schedule?tab=hours')
  const swap = await manage.evaluate(() => window.fixture.calls)
  assert.equal(swap[0][2].expectedIncludedAddonSlug, 'email_marketing')
  groups++
  await manage.close()
  const timeout = await browser.newPage()
  await timeout.goto(`http://127.0.0.1:${server.address().port}`)
  await timeout.evaluate(() => {
    window.fixture.behavior = 'pending'
    const original = window.setTimeout.bind(window)
    window.setTimeout = (fn, ms, ...args) => original(fn, ms === 20000 ? 20 : ms, ...args)
  })
  await timeout.getByRole('button', { name: 'Choose a tool', exact: true }).click()
  await timeout.getByRole('radio', { name: /Estimates and Payments/ }).check()
  await timeout.getByRole('button', { name: 'Save included tool', exact: true }).click()
  await timeout.getByRole('button', { name: 'Check saved choice' }).waitFor()
  assert.equal(await timeout.evaluate(() => window.fixture.calls.length), 1)
  await timeout.evaluate(() => window.fixture.resolve({ success: true }))
  await timeout.getByRole('heading', { name: 'Your choice is saved' }).waitFor()
  assert.equal(await timeout.evaluate(() => window.fixture.calls.length), 1)
  groups++
  await timeout.close()
  console.log(`${groups} real Chromium chooser groups passed; screenshots ${out}; synthetic server actions only.`)
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
