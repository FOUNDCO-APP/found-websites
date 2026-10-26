import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import vm from "node:vm"
import { createRequire } from "node:module"
import ts from "typescript"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

const require = createRequire(import.meta.url)
const cache = new Map()
let now = "2026-11-16T06:59:59.999Z"
class Clock extends Date {
  constructor(...args) { super(...(args.length ? args : [now])) }
  static now() { return new Date(now).getTime() }
}

function compile(file, source, extras = {}) {
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    fileName: file,
  }).outputText
  const module = { exports: {} }
  const localRequire = (id) => {
    if (/OnboardingDrawer|SiteNav|SiteFooter/.test(id)) return { default: () => null, __esModule: true }
    if (id === "next/image") return { default: () => null, __esModule: true }
    if (id.startsWith("@/")) return load(`src/${id.slice(2)}`)
    if (id.startsWith(".")) return load(path.resolve(path.dirname(file), id))
    return require(id)
  }
  vm.runInNewContext(output, { module, exports: module.exports, require: localRequire, Date: Clock, ...extras }, { filename: file })
  return module.exports
}

function load(file) {
  let absolute = path.resolve(file)
  if (!path.extname(absolute)) absolute += fs.existsSync(`${absolute}.ts`) ? ".ts" : ".tsx"
  if (!cache.has(absolute)) cache.set(absolute, compile(absolute, fs.readFileSync(absolute, "utf8")))
  return cache.get(absolute)
}

// Render the actual local price screens without importing server actions or loading Stripe.
function localScreen(file, name, declarations, extras = {}) {
  const source = fs.readFileSync(file, "utf8")
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const selected = ast.statements.filter((node) => {
    if (ts.isFunctionDeclaration(node)) return node.name?.text === name || declarations.includes(node.name?.text)
    return ts.isVariableStatement(node) && node.declarationList.declarations.some((d) => declarations.includes(d.name.getText(ast)))
  }).map((node) => node.getText(ast)).join("\n")
  assert.ok(selected.includes(`function ${name}`))
  return compile(file, `import { useState } from "react";\n${selected}\nexports.Screen = ${name}`, extras).Screen
}

const intro = load("src/lib/introRate")
const pricing = load("src/lib/pricingDisplay")
const { FOUND_PLAN_OPTIONS } = load("src/lib/foundPlans")
const Selector = load("src/components/FoundPlanSelector").default
const Home = load("src/app/HomeClient").default
const Plans = load("src/app/plans/page").default
const PlanPage = load("src/components/PlanPage").default
const shared = { ...pricing, SIGNAL_GREEN: "#32D074", FOUND_BLACK: "#080A09", useStripe: () => null, useElements: () => null }
const Onboarding = localScreen("src/app/onboarding/OnboardingFlow.tsx", "PlanChoiceScreen", ["PLAN_CHOICES"], shared)
const stripeElement = () => React.createElement("div")
const forms = ["src/components/ActivateOverlay.tsx", "src/app/activate/ActivateFlow.tsx"].map((file) =>
  localScreen(file, "CardForm", [], { ...shared, PaymentElement: stripeElement, ExpressCheckoutElement: stripeElement, ROOT_DOMAIN: "foundco.app", process: { env: {} } }))

let checks = 0
function check(condition, message) { assert.ok(condition, message); checks++ }
function render(Screen, props = {}) {
  return renderToStaticMarkup(React.createElement(Screen, { onSelect() {}, onContinue() {}, onSetupUpdated() {}, ...props }))
}
function firstAmountForPlan(html, plan) {
  html = html.replace(/<([a-z]+)[^>]*class="[^"]*line-through[^"]*"[^>]*>[\s\S]*?<\/\1>/g, "")
  const start = html.indexOf(plan.name)
  assert.ok(start >= 0, `missing ${plan.name}`)
  return Number(html.slice(start).match(/\$(\d+)/)?.[1])
}

check(intro.INTRO_RATE_CUTOFF.toISOString() === "2026-11-16T07:00:00.000Z", "Arizona Nov 15 inclusive cutoff")
check(intro.INTRO_RATE_CUTOFF_LABEL === "November 15", "deadline label")
for (const [time, active] of [
  ["2026-10-16T07:00:00Z", true],
  ["2026-11-15T23:59:59-07:00", true],
  ["2026-11-16T06:59:59.999Z", true],
  ["2026-11-16T07:00:00.000Z", false],
  ["2026-11-16T07:00:00.001Z", false],
  ["2027-01-01T00:00:00Z", false],
]) {
  now = time
  check(intro.isIntroRatePeriod(new Date(time)) === active, `explicit boundary ${time}`)
  for (const Screen of [Selector, Onboarding]) {
    const html = render(Screen, { selectedPlan: "found_pro", isFoundingMember: false })
    for (const plan of FOUND_PLAN_OPTIONS) {
      check(firstAmountForPlan(html, plan) === (active ? plan.price : plan.normalPrice), `picker ${plan.key} actual price ${time}`)
      if (active) check(html.includes(`line-through decoration-white/45 decoration-2">$${plan.normalPrice}/mo</span>`), `picker ${plan.key} regular-price comparison`)
    }
    check(!html.includes("12 months") && !html.includes("then $"), `picker does not expand transition terms ${time}`)
    check(html.includes("regular ") === active && html.includes("line-through") === active, "regular-price comparison only during intro eligibility")
  }
  for (const Screen of [Home, Plans]) {
    const html = render(Screen)
    for (const plan of FOUND_PLAN_OPTIONS) {
      check(firstAmountForPlan(html, plan) === (active ? plan.price : plan.normalPrice), `marketing ${plan.key} current amount`)
    }
    check(html.includes("Intro rates expire") === active, "marketing expiry copy")
    check(html.includes("line-through") === active, "marketing regular price never crossed out after expiry")
  }
  for (const plan of FOUND_PLAN_OPTIONS) {
    const html = render(PlanPage, { plan: plan.key, name: plan.name, price: plan.price, normalPrice: plan.normalPrice, features: [], faqs: [] })
    check(html.includes(`"price":${active ? plan.price : plan.normalPrice}`), "product schema current price")
    check(html.includes("Intro rate locked for 12 months") === active, "plan detail duration copy")
  }
}

now = "2027-01-01T00:00:00Z"
const founding = render(Selector, { selectedPlan: "found_pro", isFoundingMember: true })
check(firstAmountForPlan(founding, FOUND_PLAN_OPTIONS[1]) === 39 && founding.includes('line-through decoration-white/45 decoration-2">$69/mo</span>'), "founding picker retains intro eligibility and regular-price comparison")
check(!founding.includes("12 months") && !founding.includes("then $"), "founding picker adds no transition promise")
const unknownEligibility = render(Selector, { selectedPlan: "found_pro" })
check(unknownEligibility.includes("Price shown at checkout") && !/\$\d/.test(unknownEligibility), "unknown founding eligibility never guesses a rate after expiry")
for (const plan of FOUND_PLAN_OPTIONS) {
  for (const amount of [plan.price * 100, plan.normalPrice * 100]) {
    const isIntro = amount === plan.price * 100
    const summary = { originalAmount: amount, discountedAmount: amount, currency: "usd", promo: null }
    for (const Form of forms) {
      const html = render(Form, { plan: plan.key, priceSummary: summary })
      check(html.includes(`$${amount / 100}/month`), `activation ${plan.key} returned price`)
      check(html.includes(isIntro ? "Intro rate" : "Regular rate"), "returned price determines rate label, including founding after cutoff")
      check(html.includes("Locked in for 12 months") === isIntro, "regular never promises intro duration")
      for (const duration of ["once", "repeating", "forever"]) {
        const discounted = { ...summary, discountedAmount: 0, promo: { discountLabel: "100% off", duration, code: "TEST" } }
        const promoHtml = render(Form, { plan: plan.key, priceSummary: discounted })
        const expectedHeadline = duration === "once" ? "$0 for your first invoice" : duration === "repeating" ? "$0/month during the promo period" : "$0/month"
        check(promoHtml.includes(expectedHeadline) && promoHtml.includes("Promo applied"), "actual promo amount and duration in headline")
        const basis = duration === "once" ? "after first invoice" : "before promo"
        check(promoHtml.includes(`${isIntro ? "Intro rate" : "Regular rate"} ${basis}: $${amount / 100}/month`), "promo base correctly labeled")
        check(!promoHtml.includes("Regular intro rate"), "no contradictory rate label")
        check(!promoHtml.includes("Locked in for 12 months"), "promo copy does not expand transition guarantees")
      }
    }
  }
}

for (const Form of forms) {
  for (const summary of [null, { originalAmount: NaN, discountedAmount: 3900, currency: "usd", promo: null }]) {
    const html = render(Form, { plan: "found_pro", priceSummary: summary })
    check(html.includes("Price unavailable"), "missing or invalid amount stays unknown")
    check(!/\$\d/.test(html) && !html.includes("12 months"), "no fake fallback price or intro promise")
  }
  const custom = render(Form, { plan: "unknown", priceSummary: { originalAmount: 4575, discountedAmount: 4575, currency: "usd", promo: null } })
  check(custom.includes("$45.75/month") && !custom.includes("12 months"), "unknown plan preserves actual amount without invented terms")
}

const deferred = render(forms[1], { plan: "found_pro", priceSummary: null, deferredUntilLabel: "December 1" })
check(!/\$\d/.test(deferred) && deferred.includes("could not be confirmed"), "deferred flow never guesses price")
const addon = render(forms[0], { addonLabel: "Booking", addonPrice: 15, priceSummary: null })
check(addon.includes("$15/month added") && !addon.includes("12 months"), "addon copy preserved")
for (const Form of forms) {
  const summary = { originalAmount: 3900, discountedAmount: 1950, currency: "usd", promo: { discountLabel: "50% off", duration: "once" } }
  const html = render(Form, { plan: "found_pro", priceSummary: summary })
  check(html.includes("$19.50 for your first invoice") && !html.includes("$19.50/month"), "partial one-time discount never presented as recurring")
}
const deferredPromo = render(forms[1], { plan: "found_pro", deferredUntilLabel: "December 1", priceSummary: { originalAmount: 3900, discountedAmount: 0, currency: "usd", promo: { discountLabel: "100% off", duration: "once" } } })
check(deferredPromo.includes("$0 for your first invoice") && deferredPromo.includes("after first invoice: $39/month"), "deferred one-time offer discloses recurring amount")
for (const file of ["src/app/plans/page.tsx", "src/app/plans/found/page.tsx", "src/app/plans/found-pro/page.tsx", "src/app/plans/found-business/page.tsx"]) {
  const metadata = load(file).metadata
  check(!/\$\d|Intro rates expire/.test(JSON.stringify(metadata)), `${file} metadata cannot retain expired price claims`)
}
const activationServer = fs.readFileSync("src/app/activate/activateActions.ts", "utf8")
check(activationServer.includes('currentStatus === "active" || currentStatus === "trialing"'), "active subscribers still guarded by server")
check(activationServer.includes("!!company.is_founding_member || isIntroRatePeriod"), "existing founding eligibility preserved")
for (const file of ["src/app/[slug]/layout.tsx", "src/app/dashboard/(app)/layout.tsx"]) {
  check(fs.readFileSync(file, "utf8").includes("isFoundingMember={!!company.is_founding_member}"), "server caller passes stored company eligibility")
}
for (const file of ["src/components/PreviewBanner.tsx", "src/components/dashboard/ActivationBanner.tsx"]) {
  check(fs.readFileSync(file, "utf8").includes("isFoundingMember={isFoundingMember}"), "banner forwards eligibility to overlay")
}

async function cachedSetupCase({ time = "2026-10-20T12:00:00Z", founding = false, storedIntro = true, storedPrice = "price_intro", status = "requires_payment_method", subscriptionStatus = "incomplete" } = {}) {
  now = time
  const calls = { created: 0, retrieved: 0, companyUpdates: 0 }
  const company = { id: "company_fixture", slug: "fixture", name: "Fixture", plan: "found_pro", stripe_customer_id: "customer_fixture", pending_setup_intent_secret: "seti_old_secret_fixture", is_founding_member: founding, subscription_status: subscriptionStatus }
  const existing = { status, payment_method_types: ["card"], metadata: { company_id: company.id, slug: company.slug, plan: company.plan, intro_rate: String(storedIntro), price_id: storedPrice } }
  const original = JSON.stringify(existing)
  const stripe = {
    setupIntents: {
      async retrieve() { calls.retrieved++; return existing },
      async create(input) { calls.created++; calls.createdPrice = input.metadata.price_id; return { client_secret: "seti_new_secret_fixture" } },
    },
  }
  const query = { select() { return this }, eq() { return this }, is() { return this }, async single() { return { data: company } }, update() { calls.companyUpdates++; return this } }
  const action = localScreen("src/app/activate/activateActions.ts", "createActivationSetup", ["setupIntentIdFromSecret", "priceIdForPlan"], {
    process: { env: { STRIPE_SECRET_KEY: "fixture_only", STRIPE_PRICE_ID_FOUND_PRO: "price_regular", STRIPE_PRICE_ID_FOUND_PRO_FOUNDING: "price_intro" } },
    INTRO_RATE_CUTOFF: intro.INTRO_RATE_CUTOFF,
    getAdminClient: () => ({ from: () => query, rpc: async (name) => {
      assert.equal(name, "save_activation_setup"); calls.companyUpdates++; return { data: true, error: null }
    } }),
    Stripe: function FixtureStripe() { return stripe },
    deferredUntilLabelFor: () => null,
    normalizePromoCode: () => "",
    headstartPromoFor: () => null,
    priceSummaryFor: async (_, priceId) => ({ price: { originalAmount: priceId === "price_intro" ? 3900 : 6900, discountedAmount: priceId === "price_intro" ? 3900 : 6900, currency: "usd", promo: null } }),
  })
  const result = await action("fixture")
  check(JSON.stringify(existing) === original, "cached intent unchanged; no update/cancel API exists in fixture")
  return { result, calls }
}
for (const [options, expectedPrice] of [
  [{ storedIntro: false, storedPrice: "price_regular" }, "price_intro"],
  [{ storedPrice: "price_wrong" }, "price_intro"],
  [{ storedPrice: undefined }, "price_intro"],
  [{ time: "2026-11-16T07:00:00Z" }, "price_regular"],
  [{ status: "succeeded" }, "price_intro"],
  [{ status: "processing" }, "price_intro"],
]) {
  if ("storedPrice" in options && options.storedPrice === undefined) options.storedPrice = null
  const { result, calls } = await cachedSetupCase(options)
  check(calls.created === 1 && calls.createdPrice === expectedPrice, "mismatch or confirmed status uses fresh setup with current Price ID")
  check(result.clientSecret === "seti_new_secret_fixture", "fresh setup returned")
}
for (const options of [{}, { founding: true, time: "2026-11-16T07:00:00Z" }, { storedIntro: false, storedPrice: "price_regular", time: "2026-11-16T07:00:00Z" }]) {
  const { result, calls } = await cachedSetupCase(options)
  check(calls.created === 0 && calls.companyUpdates === 0 && result.clientSecret === "seti_old_secret_fixture", "exact eligible cached intent reused without writes")
}
for (const subscriptionStatus of ["active", "trialing"]) {
  const { result, calls } = await cachedSetupCase({ subscriptionStatus })
  check(result === null && calls.created === 0 && calls.retrieved === 0 && calls.companyUpdates === 0, "active subscribers never enter setup")
}
let effect
let cleanup
let scheduled
let updatedIntro
let focus
const hookModule = compile("src/lib/pricingDisplay.ts", fs.readFileSync("src/lib/pricingDisplay.ts", "utf8"), {
  require(id) {
    if (id === "react") return { useState: (initial) => [initial(), (value) => { updatedIntro = value }], useEffect: (run) => { effect = run } }
    return id === "./introRate" ? intro : { FOUND_PLAN_OPTIONS }
  },
  setTimeout(run, delay) { scheduled = { run, delay }; return 1 },
  clearTimeout() { scheduled = null },
  window: { addEventListener(event, run) { focus = run }, removeEventListener() { focus = null } },
})
now = "2026-11-16T06:59:59.999Z"
check(hookModule.useIntroRatePeriod(), "open picker initially intro")
cleanup = effect()
check(scheduled.delay === 1, "picker schedules exact cutoff refresh")
now = "2026-11-16T07:00:00.000Z"
scheduled.run()
check(updatedIntro === false, "open picker automatically switches at cutoff")
focus()
check(updatedIntro === false, "resumed tab rechecks expiry")
cleanup()
check(focus === null && scheduled === null, "picker cleans timer and focus listener")
now = "2026-10-20T12:00:00Z"
hookModule.useIntroRatePeriod()
cleanup = effect()
check(scheduled.delay === 86_400_000, "future cutoff timer cannot overflow")
cleanup()
for (const file of ["src/components/ActivateOverlay.tsx", "src/app/activate/ActivateFlow.tsx"]) {
  const source = fs.readFileSync(file, "utf8")
  check(source.includes("setPriceSummary(result.price)") && !source.includes("if (result.price) setPriceSummary"), "missing new response clears stale price")
}
console.log(`Promo pricing passed: ${checks} boundary and rendered-copy checks`)
