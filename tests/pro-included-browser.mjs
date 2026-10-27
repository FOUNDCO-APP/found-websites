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
    const local = spec.startsWith('@/') ? ['.ts', '.tsx'].map(ext => path.join(root, 'src', `${spec.slice(2)}${ext}`)).find(fs.existsSync) : null
    const target = overrides[spec] ? spec : local
      ? local
      : require.resolve(spec, { paths: [path.dirname(file), root] })
    deps[spec] = bundle(target, spec)
  }
  modules[id] = `${id}:[function(require,module,exports){${code}\n},${JSON.stringify(deps)}]`
  return id
}
const react = bundle(require.resolve('react'))
const client = bundle(require.resolve('react-dom/client'))
const component = bundle(path.join(root, 'src/components/dashboard/IncludedProTool.tsx'))
const homeComponent = bundle(path.join(root, 'src/components/dashboard/HomeClient.tsx'))
const wordmarkComponent = bundle(path.join(root, 'src/components/FoundWordmark.tsx'))
const script = `const process={env:{NODE_ENV:'development'}};const modules={${modules.join(',')}};const cache={};function load(id){if(cache[id])return cache[id].exports;const [fn,deps]=modules[id],m={exports:{}};cache[id]=m;fn(s=>load(deps[s]),m,m.exports);return m.exports}window.fixtureReact=load(${react});const root=load(${client}).createRoot(document.getElementById('root'));window.fixture={pathname:'/',refreshes:0,calls:[],result:{success:true},behavior:'success'};window.renderFixture=(props={})=>root.render(window.fixtureReact.createElement(load(${component}).default,{companyId:'synthetic-barrio',currentIncludedSlug:null,disabledAddonSlugs:['shopping_cart'],paidAddonSlugs:[],variant:'prompt',...props}));window.renderFixture();`
const homeScript = `${script};window.renderBrandFixture=()=>root.render(window.fixtureReact.createElement(load(${wordmarkComponent}).default,{height:18,color:'white'}));window.renderHomeFixture=(options={})=>{
  document.body.style.padding='0';document.getElementById('root').style.maxWidth='760px';document.getElementById('root').style.margin='0 auto';
  const R=window.fixtureReact,e=R.createElement,{plan='found_pro',currentIncludedSlug=null,...rest}=options;
  const prompt=plan==='found_pro'&&!currentIncludedSlug?e(load(${component}).default,{companyId:'synthetic-barrio',currentIncludedSlug:null,disabledAddonSlugs:[],paidAddonSlugs:[],variant:'prompt'}):null;
  root.render(e(R.Fragment,null,options.admin?e('div',{'data-fixture-admin':true,style:{padding:'10px 20px',background:'#FF9500',color:'#080A09',fontSize:12,fontWeight:800}},'Viewing as '+(options.businessName||'Test business')+' (Admin)'):null,
    e(load(${homeComponent}).default,{businessName:'Intelligence protection security llc',greeting:'morning',newCount:0,totalCount:0,topName:null,topCreatedAt:null,siteSlug:'synthetic-barrio',customDomain:null,isActive:true,recentLeads:[],lastPhotoAt:null,industry:'professional_services',smartNextStep:null,hasContacts:true,...rest,includedToolPrompt:prompt})));
};if(new URLSearchParams(location.search).has('home')||location.protocol==='file:')window.renderHomeFixture();if(location.protocol==='file:'){document.title='Found dashboard design preview';const notice=document.createElement('p');notice.textContent='Design preview - test data only. No account changes.';notice.style.cssText='margin:0;padding:12px 24px;background:#202521;color:#d2d9d4;font:13px/1.5 Arial,sans-serif';document.body.prepend(notice);}`
const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:20px;background:#101010;color:white;font-family:Arial,sans-serif}*{box-sizing:border-box}button,input{font:inherit}dialog::backdrop{background:#000b}</style></head><body><div id="root"></div><script>${homeScript.replace(/<\/script/gi, '<\\/script')}</script></body></html>`
const server = http.createServer((req, res) => {
  if (req.url === '/brand/found-wordmark-black.png') {
    res.setHeader('Content-Type', 'image/png'); res.end(fs.readFileSync(path.join(root, 'public/brand/found-wordmark-black.png'))); return
  }
  res.setHeader('Content-Type', 'text/html'); res.end(html)
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const browser = await chromium.launch({ headless: true,
  ...(process.env.FOUND_BROWSER_EXECUTABLE ? { executablePath: process.env.FOUND_BROWSER_EXECUTABLE } : {}),
})
const out = path.join(root, '.billing-audits/pro-included-choice')
fs.mkdirSync(out, { recursive: true })
fs.writeFileSync(path.join(out, 'dashboard-preview.html'), html)
let groups = 0
try {
  const branding = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await branding.goto(`http://127.0.0.1:${server.address().port}`)
  const asset = await branding.request.get(`http://127.0.0.1:${server.address().port}/brand/found-wordmark-black.png`)
  assert.equal(asset.headers()['content-type'], 'image/png')
  await branding.evaluate(() => window.renderBrandFixture())
  await branding.getByRole('img', { name: 'Found', exact: true }).waitFor()
  await branding.screenshot({ path: path.join(out, 'found-wordmark-preview.png') })
  await branding.close(); groups++
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 640 }, { width: 1440, height: 900 }]) {
    const page = await browser.newPage({ viewport })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`http://127.0.0.1:${server.address().port}`)
    await page.getByRole('button', { name: /^Choose your Pro tool/ }).click()
    await page.getByRole('dialog').waitFor()
    assert.equal(await page.getByRole('radio').count(), 5)
    await page.screenshot({ path: path.join(out, `chooser-initial-${viewport.width}.png`), fullPage: true })
    // Header and actions stay in view while only the choices scroll.
    const title = page.getByRole('heading', { name: 'Choose your Pro tool', exact: true })
    const closeButton = page.getByRole('button', { name: 'Close chooser', exact: true })
    const titleBefore = await title.boundingBox()
    const hierarchy = await page.getByRole('dialog').evaluate(el => {
      const size = node => parseFloat(getComputedStyle(node).fontSize)
      const name = el.querySelector('label strong')
      return { title: size(el.querySelector('h2')), name: size(name), description: size(name.nextElementSibling), weight: getComputedStyle(el.querySelector('h2')).fontWeight }
    })
    assert.ok(hierarchy.title > hierarchy.name && hierarchy.name > hierarchy.description, 'shared title/name/description type hierarchy')
    assert.equal(hierarchy.weight, '700')
    assert.equal(await page.getByRole('group', { name: 'Choose one tool', exact: true }).count(), 1, 'hidden legend retains accessible group name')
    assert.equal(await title.evaluate(el => document.activeElement === el), true, 'sheet opens with title focus, not highlighted Close')
    assert.equal(await closeButton.evaluate(el => el.matches(':focus-visible')), false)
    await page.keyboard.press('Tab')
    assert.equal(await closeButton.evaluate(el => document.activeElement === el && el.matches(':focus-visible')), true, 'keyboard Close focus remains visible')
    await page.locator('.included-pro-body').evaluate(el => { el.scrollTop = el.scrollHeight })
    const titleAfter = await title.boundingBox()
    assert.ok(Math.abs(titleBefore.y - titleAfter.y) < 1)
    for (const control of [closeButton, page.getByRole('button', { name: 'Later', exact: true }), page.getByRole('button', { name: 'Save included tool', exact: true })]) {
      const box = await control.boundingBox()
      assert.ok(box.y >= 0 && box.y + box.height <= viewport.height + 1, 'persistent control remains in viewport')
      assert.ok(box.height >= 44, '44px control target')
    }
    await closeButton.click()
    await page.getByRole('button', { name: /^Choose your Pro tool/ }).click()
    await page.getByRole('button', { name: 'Later', exact: true }).click()
    await page.getByRole('button', { name: /^Choose your Pro tool/ }).click()
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
  const large = await browser.newPage({ viewport: { width: 320, height: 480 } })
  await large.goto(`http://127.0.0.1:${server.address().port}`)
  await large.evaluate(() => { document.documentElement.style.fontSize = '32px' })
  await large.getByRole('button', { name: /^Choose your Pro tool/ }).click()
  assert.equal(await large.getByRole('radio').count(), 5)
  for (const control of [large.getByRole('button', { name: 'Close chooser', exact: true }), large.getByRole('button', { name: 'Later', exact: true }), large.getByRole('button', { name: 'Save included tool', exact: true })]) {
    const box = await control.boundingBox()
    assert.ok(box.y >= 0 && box.y + box.height <= 481, 'enlarged-text controls remain reachable')
  }
  assert.ok(await large.locator('.included-pro-body').evaluate(el => el.clientHeight > 40 && el.scrollHeight > el.clientHeight), 'choices retain scrollable space')
  await large.getByRole('radio', { name: /Email Marketing/ }).check()
  await large.screenshot({ path: path.join(out, 'chooser-enlarged-320.png'), fullPage: true })
  await large.close(); groups++
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await page.goto(`http://127.0.0.1:${server.address().port}`)
  await page.getByRole('button', { name: /^Choose your Pro tool/ }).click()
  await page.getByRole('radio', { name: /Booking Calendar/ }).check()
  await page.evaluate(() => { window.fixture.behavior = 'pending' })
  await page.getByRole('button', { name: 'Save included tool', exact: true }).click()
  assert.equal(await page.getByRole('button', { name: /Saving choice/ }).isDisabled(), true)
  await page.getByRole('button', { name: 'Close chooser', exact: true }).click()
  await page.getByRole('button', { name: /^Choose your Pro tool/ }).click()
  assert.equal(await page.evaluate(() => window.fixture.calls.length), 1, 'close/reopen never repeats pending save')
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
  await keyboard.getByRole('button', { name: /^Choose your Pro tool/ }).click()
  await keyboard.keyboard.press('Escape')
  await keyboard.getByRole('dialog').waitFor({ state: 'detached' })
  assert.equal(await keyboard.getByRole('button', { name: /^Choose your Pro tool/ }).evaluate(el => document.activeElement === el), true)
  await keyboard.evaluate(() => window.renderFixture({ currentIncludedSlug: 'email_marketing' }))
  await keyboard.getByRole('button', { name: /^Choose your Pro tool/ }).waitFor({ state: 'detached' })
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
  await timeout.getByRole('button', { name: /^Choose your Pro tool/ }).click()
  await timeout.getByRole('radio', { name: /Estimates and Payments/ }).check()
  await timeout.getByRole('button', { name: 'Save included tool', exact: true }).click()
  await timeout.getByRole('button', { name: 'Check saved choice' }).waitFor()
  assert.equal(await timeout.evaluate(() => window.fixture.calls.length), 1)
  await timeout.evaluate(() => window.fixture.resolve({ success: true }))
  await timeout.getByRole('heading', { name: 'Your choice is saved' }).waitFor()
  assert.equal(await timeout.evaluate(() => window.fixture.calls.length), 1)
  groups++
  await timeout.close()
  const manifestSource = ts.createSourceFile('industryManifests.ts', fs.readFileSync(path.join(root, 'src/lib/industryManifests.ts'), 'utf8'), ts.ScriptTarget.Latest, true)
  let industries = []
  function findIndustries(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(manifestSource) === 'industryManifests' && ts.isObjectLiteralExpression(node.initializer)) {
      industries = node.initializer.properties.filter(ts.isPropertyAssignment).map(property => {
        assert.ok(ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))
        return property.name.text
      })
    }
    ts.forEachChild(node, findIndustries)
  }
  findIndustries(manifestSource)
  assert.ok(industries.length >= 20, 'use the actual industry registry, not only security')
  let layouts = 0
  for (const width of [320, 390, 768, 1440]) {
    const dashboard = await browser.newPage({ viewport: { width, height: 844 } })
    const errors = []
    dashboard.on('pageerror', error => errors.push(error.message))
    await dashboard.goto(`http://127.0.0.1:${server.address().port}?home=1`)
    await dashboard.getByRole('button', { name: /^Choose your Pro tool/ }).waitFor()
    for (const industry of industries) {
      await dashboard.evaluate(industry => window.renderHomeFixture({ industry, businessName: 'A Long Community Business Name for ' + industry.replaceAll('_', ' ') }), industry)
      assert.ok(await dashboard.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${industry}/${width}: no horizontal overflow`)
      const greeting = dashboard.getByRole('heading', { name: 'Good morning.', exact: true })
      assert.equal(await greeting.count(), 1)
      const prompt = dashboard.getByRole('button', { name: /^Choose your Pro tool/ })
      const box = await prompt.boundingBox()
      assert.ok(box.height >= 44 && box.height <= 112, `${industry}/${width}: compact whole-row target`)
      assert.equal(await dashboard.getByRole('button', { name: /Camera/ }).count(), 1)
      layouts++
    }
    await dashboard.evaluate(() => window.renderHomeFixture())
    await dashboard.getByText('Intelligence protection security llc', { exact: true }).waitFor()
    await dashboard.waitForTimeout(650)
    const camera = await dashboard.getByRole('button', { name: /Camera/ }).boundingBox()
    assert.ok(camera.y + camera.height < 640, `${width}: core actions remain reachable`)
    await dashboard.evaluate(() => {
      window.fixture.cameraOpens = 0
      window.addEventListener('found:open-camera', () => window.fixture.cameraOpens++)
      Object.defineProperty(navigator, 'share', { configurable: true, value: async data => { window.fixture.shared = data } })
    })
    await dashboard.getByRole('button', { name: /Camera/ }).click()
    assert.equal(await dashboard.evaluate(() => window.fixture.cameraOpens), 1)
    await dashboard.getByRole('button', { name: /Share My Site/ }).click()
    assert.equal(await dashboard.evaluate(() => window.fixture.shared.url), 'https://synthetic-barrio.foundco.app')
    assert.equal(await dashboard.getByRole('link', { name: /My Contacts/ }).getAttribute('href'), '/contacts')
    assert.equal(await dashboard.getByRole('link', { name: /Edit My Site/ }).getAttribute('href'), '/site')
    await dashboard.screenshot({ path: path.join(out, `dashboard-customer-${width}.png`), fullPage: false })
    await dashboard.evaluate(() => window.renderHomeFixture({ admin: true }))
    await dashboard.locator('[data-fixture-admin]').waitFor()
    await dashboard.screenshot({ path: path.join(out, `dashboard-admin-${width}.png`), fullPage: false })
    for (const plan of ['found', 'found_business']) {
      await dashboard.evaluate(plan => window.renderHomeFixture({ plan }), plan)
      await dashboard.getByRole('button', { name: /^Choose your Pro tool/ }).waitFor({ state: 'detached' })
      assert.equal(await dashboard.getByRole('button', { name: /Camera/ }).count(), 1)
      assert.ok(await dashboard.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    }
    await dashboard.evaluate(() => {
      document.documentElement.style.fontSize='32px'
      window.renderHomeFixture({ businessName: 'AnExtremelyLongUnbrokenCompanyNameThatMustNeverOverflowTheDashboard' })
    })
    await dashboard.getByRole('button', { name: /^Choose your Pro tool/ }).waitFor()
    const overflow = await dashboard.evaluate(() => [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1).map(el => ({ tag: el.tagName, text: el.textContent?.slice(0, 70), width: el.getBoundingClientRect().width, right: el.getBoundingClientRect().right })).slice(0, 8))
    assert.ok(await dashboard.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}: enlarged text and unbroken name fit ${JSON.stringify(overflow)}`)
    assert.deepEqual(errors, [])
    await dashboard.close()
  }
  groups++
  console.log(`${layouts} shared Home layouts across ${industries.length} industries passed; customer/admin, Starter/Business, enlarged text and long-name cases also passed.`)
  console.log(`${groups} real Chromium chooser groups passed; screenshots ${out}; synthetic server actions only.`)
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
