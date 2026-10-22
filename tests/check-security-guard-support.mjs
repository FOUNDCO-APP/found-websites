import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import vm from "node:vm"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const ts = require("typescript")
const cache = new Map()
const moduleMocks = new Map()
const env = { ANTHROPIC_API_KEY: "fixture-only", PEXELS_API_KEY: "fixture-only" }
let networkCalls = 0
let databaseCalls = 0
let poolPhotos = []

// Isolate every external boundary: this script never reads credentials or uses the network.
function loadTsModule(modulePath) {
  let sourcePath = path.resolve(modulePath)
  if (!fs.existsSync(sourcePath)) sourcePath += ".ts"
  if (cache.has(sourcePath)) return cache.get(sourcePath).exports
  const source = fs.readFileSync(sourcePath, "utf8")
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: sourcePath,
  }).outputText
  const module = { exports: {} }
  cache.set(sourcePath, module)
  const localRequire = specifier => {
    if (moduleMocks.has(specifier)) return moduleMocks.get(specifier)
    if (specifier === "@supabase/supabase-js") return {
      createClient() { databaseCalls++; throw new Error("Unexpected database access") },
    }
    if (specifier.startsWith("@/")) return loadTsModule(path.resolve("src", specifier.slice(2)))
    if (specifier.startsWith(".")) return loadTsModule(path.resolve(path.dirname(sourcePath), specifier))
    throw new Error(`Unexpected dependency: ${specifier}`)
  }
  vm.runInNewContext(output, {
    exports: module.exports, module, require: localRequire, process: { env }, console,
    URL, AbortController, setTimeout, clearTimeout,
    fetch: async url => {
      networkCalls++
      assert.match(String(url), /photo-pools\//, "Only fixture pool reads are allowed")
      return { ok: true, json: async () => ({ photos: poolPhotos }) }
    },
  }, { filename: sourcePath })
  return module.exports
}

const detection = loadTsModule("src/lib/industryDetection.ts")
const manifests = loadTsModule("src/lib/industryManifests.ts")
const defaults = loadTsModule("src/lib/industryDefaults.ts")
const vocab = loadTsModule("src/lib/subIndustryVocabulary.ts")
const content = loadTsModule("src/lib/contentGeneration.ts")
const photos = loadTsModule("src/lib/photoPool.ts")
const stock = loadTsModule("src/lib/stockImages.ts")
const normalization = loadTsModule("src/lib/serviceNormalization.ts")
const similarity = loadTsModule("src/lib/copySimilarity.ts")
const polish = loadTsModule("src/lib/copyPolish.ts")
const plain = value => JSON.parse(JSON.stringify(value))
let passed = 0
async function check(name, run) {
  await run()
  passed++
  console.log(`PASS ${name}`)
}

for (const text of ["Security Guard Services", "event security guards for weddings and parties", "SECURITY-OFFICER", "security personnel", "guarding services", "armed guard", "unarmed guards"]) {
  await check(`explicit guard detection: ${text}`, () => {
    assert.equal(detection.isSecurityGuardIndustry(text), true)
    assert.equal(detection.detectIndustry(text), "professional_services")
  })
}
for (const text of ["security", "alarm installation", "CCTV installation", "security camera install", "on-site security camera installation", "cybersecurity", "party rentals"]) {
  await check(`not guard personnel: ${text}`, () => assert.equal(detection.isSecurityGuardIndustry(text), false))
}
await check("party rentals remain events", () => assert.equal(detection.detectIndustry("party rentals"), "events"))
await check("camera installation remains home services", () => assert.equal(detection.detectIndustry("security camera install"), "home_services"))
await check("accounting remains professional services", () => assert.equal(detection.detectIndustry("accountant"), "professional_services"))

const subtype = "security guard services"
const manifest = manifests.getIndustryManifest("professional_services", subtype)
await check("guard subtype belongs to existing root", () => {
  assert.ok(manifests.getSubIndustryOptions("professional_services").includes(subtype))
  assert.equal(manifests.industryManifests.security, undefined)
  assert.equal(manifest.label, "Security Guard Services")
  assert.deepEqual(plain(manifest.requiredFields), ["services_offered", "service_areas"])
  assert.ok(!manifest.sections.includes("reviews"))
})
await check("guard photo tags exclude generic office tags", () => {
  assert.ok(manifests.getPreferredPhotoTags("professional_services", subtype).every(tag => tag === subtype))
})
await check("root manifest remains unchanged", () => {
  assert.equal(manifests.getIndustryManifest("professional_services").label, "Professional Services")
  assert.equal(manifests.getIndustryManifest("unknown"), null)
})
const guardDefaults = defaults.getIndustryDefaults("professional_services", subtype)
await check("guard defaults avoid generic credentials and free consultations", () => {
  assert.equal(guardDefaults.ctaHeadline, "Discuss Your Security Needs")
  assert.deepEqual(plain(guardDefaults.values), [])
  assert.doesNotMatch(JSON.stringify(guardDefaults), /licensed|certified|credential|free|guarantee|24.hour/i)
})
await check("guard vocabulary overrides consultation defaults", () => {
  const words = vocab.getVocab("Event security guards", "professional_services")
  assert.equal(words.servicesLabel, "Security Guard Services")
  assert.equal(words.appointmentWord, "inquiry")
  assert.doesNotMatch(words.ctaBodyText, /free|consultation/i)
})
await check("bare security and camera install do not get guard vocabulary", () => {
  assert.notEqual(vocab.getVocab("security", "professional_services").servicesLabel, "Security Guard Services")
  assert.equal(vocab.getVocab("camera install", "home_services").servicesOverline, "What We Install")
})

const input = {
  name: "Intelligence Protection Security LLC", description: "24-hour armed guards",
  industry: "professional_services", subIndustry: subtype, city: "Tucson", state: "AZ",
  different: "Licensed and insured", proofPoint: "Guaranteed safety", idealCustomer: "nightclubs",
  services: [], vibe: "bold", manifest,
}
const copy = content.buildFallbackWebsiteContent(input)
await check("literal business H1 and neutral local supporting copy", () => {
  assert.equal(copy.heroTitle, input.name)
  assert.equal(copy.heroSubtitle, "Security guard services in Tucson.")
  assert.equal(copy.ctaHeadline, "Discuss Your Security Needs")
  assert.equal(copy.aboutStory.split("\n\n").length, 2)
})
await check("unconfirmed claims are not promoted from intake", () => {
  assert.doesNotMatch(JSON.stringify(copy), /armed|licensed|insured|guarantee|24.hour|nightclubs|testimonial/i)
  assert.equal(copy.aboutHighlights, null)
  assert.equal(copy.faq_items, null)
})
await check("no invented services when none supplied", () => assert.deepEqual(plain(copy.services), []))
await check("supplied service names preserved without embellishing descriptions", () => {
  const result = content.buildFallbackWebsiteContent({ ...input, services: [{ name: "Owner supplied service", description: "24-hour licensed coverage" }] })
  assert.equal(result.services.length, 1)
  assert.equal(result.services[0].name, "Owner supplied service")
  assert.doesNotMatch(result.services[0].description, /24|licensed/i)
})
await check("missing city does not invent a location", () => {
  assert.equal(content.buildFallbackWebsiteContent({ ...input, city: null }).heroSubtitle, "Security guard services.")
})
await check("AI-enabled guard generation remains conservative without a provider call", async () => {
  assert.deepEqual(plain(await content.generateWebsiteContent(input)), plain(copy))
  assert.equal(networkCalls, 0)
})
await check("unrelated industry generation retains its existing fallback", () => {
  const other = content.buildFallbackWebsiteContent({ ...input, industry: "home_services", subIndustry: "roofing" })
  assert.match(other.heroSubtitle, /roof/i)
})

const company = {
  id: "fixture", industry_category: "professional_services", sub_industry: subtype,
  vibe: "bold", city: "Tucson", photo_keywords: "party balloons",
  website_config: { stock_images: ["unreviewed-1", "unreviewed-2", "unreviewed-3"] },
}
await check("approved guard inventory is honestly empty", () => {
  assert.deepEqual(plain(photos.approvedSecurityGuardPhotos), [])
  assert.ok(Object.isFrozen(photos.approvedSecurityGuardPhotos))
})
await check("guard stock refuses cached unrelated URLs and keyword search", async () => {
  assert.deepEqual(plain(await stock.getStockImages(company)), [])
  assert.equal(networkCalls, 0)
  assert.equal(databaseCalls, 0)
})
poolPhotos = [
  { url: "general", tag: null, desc: "Office" },
  { url: "unreviewed-tagged", tag: subtype, desc: "Unreviewed candidate" },
]
await check("remote guard tags alone do not establish approval", async () => {
  assert.deepEqual(plain(await photos.getPhotoPool("professional_services", "bold", subtype)), { urls: [], matchedTag: false })
  assert.deepEqual(plain(await photos.getPhotoPoolWithDesc("professional_services", "bold", subtype)), [])
  assert.equal(networkCalls, 0)
})
await check("non-guard cached stock behavior preserved", async () => {
  const urls = await stock.getStockImages({ ...company, sub_industry: "accountant" })
  assert.deepEqual(plain(urls).sort(), [...company.website_config.stock_images].sort())
})
await check("non-guard pool behavior preserved", async () => {
  poolPhotos = [{ url: "bike", tag: "bike shop", desc: "Bicycle" }, { url: "general", tag: null, desc: "Shop" }]
  assert.deepEqual(plain(await photos.getPhotoPool("retail", "bold", "bike shop")), { urls: ["bike", "general"], matchedTag: true })
  assert.equal(networkCalls, 1)
  assert.equal(databaseCalls, 0)
})

await check("numeric slashes remain intact while service separators split", () => {
  assert.deepEqual(plain(normalization.normalizeServiceNames("Patrol/24/7 Security / Dispatch;Fire Watch\nResidential")), ["Patrol", "24/7 Security", "Dispatch", "Fire Watch", "Residential"])
  assert.deepEqual(plain(normalization.normalizeServiceNames("24 / 7 Security/1/2 day service")), ["24/7 Security", "1/2 day service"])
})
await check("normalization preserves empty, repeated and more than eight entries without grouping", () => {
  assert.deepEqual(plain(normalization.normalizeServiceNames(" / ; \n")), [])
  assert.deepEqual(plain(normalization.normalizeServiceNames(["Patrol", "Patrol"])), ["Patrol", "Patrol"])
  const names = Array.from({ length: 25 }, (_, index) => `Owner service ${index}`)
  assert.deepEqual(plain(normalization.normalizeServiceNames(names.join("/"))), names)
})
const rawNames = [
  "Security Service/ Armed Guard/ Unarmed Guard",
  "Patrol Services/ Events Security/ 24/7 Security/ Dispatch/ Standing Guar/ Apartments Security/ Construction Site Security/Fire Watch /Residential Security",
  "Commercial Security",
]
await check("all thirteen source entries survive normalization without correcting claims", () => {
  const names = normalization.normalizeServiceNames(rawNames)
  assert.equal(names.length, 13)
  assert.equal(names[2], "Unarmed Guard")
  assert.equal(names[5], "24/7 Security")
  assert.equal(names[7], "Standing Guar")
  assert.equal(names[12], "Commercial Security")
})
await check("arbitrary owner-named services survive neutral guard generation", () => {
  const result = content.buildFallbackWebsiteContent({ ...input, name: "Another Guard Company", city: "Arizona", state: null, services: rawNames.map(name => ({ name, description: "Licensed 24-hour coverage guaranteed" })) })
  assert.equal(result.heroTitle, "Another Guard Company")
  assert.equal(result.heroSubtitle, "Security guard services in Arizona.")
  assert.deepEqual(plain(result.services.map(service => service.name)), plain(normalization.normalizeServiceNames(rawNames)))
  assert.ok(result.services.every(service => !/licensed|24.hour|guarantee/i.test(service.description)))
})
await check("copy uniqueness cannot restore unconfirmed intake claims", () => {
  const refs = [{ slug: "similar", name: input.name, heroTitle: copy.heroTitle, heroSubtitle: copy.heroSubtitle, aboutPreview: copy.aboutPreview, aboutStory: copy.aboutStory }]
  assert.ok(similarity.findClosestCopyMatch(copy, refs))
  assert.deepEqual(plain(similarity.guardGeneratedCopyUniqueness(copy, input, refs).content), plain(copy))
  const unsafe = { ...copy, aboutPreview: "Licensed and insured. Guaranteed safety." }
  const guarded = similarity.guardGeneratedCopyUniqueness(unsafe, input, [])
  assert.equal(guarded.changed, true)
  assert.deepEqual(plain(guarded.content), plain(copy))
})

// Exercise the actual server handlers with in-memory dependencies, never a live client.
const manifestCalls = []
moduleMocks.set("@/lib/industryManifests", {
  ...manifests,
  getIndustryManifest: (...args) => { manifestCalls.push(args); return manifests.getIndustryManifest(...args) },
})
moduleMocks.set("@/lib/copySimilaritySupabase", { loadCopySimilarityReferences: async () => [] })
moduleMocks.set("@/lib/adminAlerts", { sendNewSignupAlert: async () => {} })
moduleMocks.set("@/lib/foundFunnelServer", { captureFoundOnboardingCompleted: async () => {} })
moduleMocks.set("@/lib/emailLog", { sendTrackedEmail: async () => {} })
moduleMocks.set("@/lib/featureAccess", { defaultDisabledAddonsForIndustry: () => [] })
env.ADMIN_KEY = "fixture-only"
moduleMocks.set("next/headers", { cookies: async () => ({ get: () => ({ value: env.ADMIN_KEY }) }) })
const inserted = new Map()
let publishedCopy
const fixtureDb = {
  from: table => ({
    select() { return this }, eq() { return this },
    maybeSingle: async () => ({ data: table === "companies" ? null : null, error: null }),
    insert: async row => { inserted.set(table, row); return { error: null } },
  }),
  auth: { admin: { generateLink: async () => ({ data: null, error: null }) } },
}
moduleMocks.set("@supabase/supabase-js", { createClient: () => fixtureDb })
const onboarding = loadTsModule("src/app/onboarding/actions.ts")
await check("real onboarding action forwards guard subtype and retains all normalized services", async () => {
  const result = await onboarding.createOnboardingSite({
    ...input, companyId: "fixture-company", location: "Arizona", phone: "5550000000", email: "owner@example.invalid",
    services: rawNames.join(","), testimonials: "", primaryColor: "#123456", photoChoice: "stock", logoChoice: "text",
  })
  assert.equal(result.success, true)
  assert.deepEqual(plain(manifestCalls.at(-1)), ["professional_services", subtype])
  const saved = inserted.get("website_config")
  assert.equal(saved.services.length, 13)
  assert.equal(saved.hero_title, input.name)
  assert.equal(saved.hero_subtitle, "Security guard services in Arizona.")
  assert.doesNotMatch(saved.about_text, /licensed|insured|guarantee|24.hour/i)
  assert.equal(saved.services[5].name, "24/7 Security")
})
await check("real non-guard onboarding preserves A/C Repair and the existing eight-entry limit", async () => {
  const oldKey = env.ANTHROPIC_API_KEY
  delete env.ANTHROPIC_API_KEY
  try {
    const result = await onboarding.createOnboardingSite({
      ...input, name: "Fixture HVAC", industry: "home_services", subIndustry: "hvac",
      companyId: "fixture-hvac", location: "Arizona", phone: "5550000000", email: "owner@example.invalid",
      services: "A/C Repair;Heating\nDuct Cleaning,Service Four,Service Five,Service Six,Service Seven,Service Eight,Service Nine",
      testimonials: "", primaryColor: "#123456", photoChoice: "stock", logoChoice: "text",
    })
    assert.equal(result.success, true)
    const names = inserted.get("website_config").services.map(service => service.name)
    assert.equal(names.length, 8)
    assert.equal(names[0], "A/C Repair")
    assert.ok(!names.includes("A"))
    assert.ok(!names.includes("C Repair"))
    assert.ok(!names.includes("Service Nine"))
  } finally {
    env.ANTHROPIC_API_KEY = oldKey
  }
})
fixtureDb.from = table => ({
  select() { return this }, eq() { return this },
  maybeSingle: async () => ({ data: table === "companies"
    ? { name: "Fixture Guard Company", industry_category: "professional_services", sub_industry: subtype, city: "Arizona", state: null, vibe: "bold" }
    : { about_text: "Unverified licensed claims", services: rawNames.map(name => ({ name, description: "Guaranteed safety" })) }, error: null }),
})
fixtureDb.rpc = async (_name, args) => { publishedCopy = args.p_new_copy; return { data: "fixture-version", error: null } }
const admin = loadTsModule("src/app/admin/copy/actions.ts")
await check("real admin regeneration forwards subtype and preserves services through final polish", async () => {
  const result = await admin.regenerateSiteCopy("fixture-company")
  assert.equal(result.success, true)
  assert.deepEqual(plain(manifestCalls.at(-1)), ["professional_services", subtype])
  assert.equal(publishedCopy.services.length, 13)
  assert.equal(publishedCopy.services[5].name, "24/7 Security")
  assert.doesNotMatch(publishedCopy.about_text, /licensed|insured|guarantee/i)
  assert.equal(publishedCopy.cta_headline, "Discuss Your Security Needs")
})

let identity = { userId: "fixture-owner", userEmail: "owner@example.invalid" }
let ownerAccess = true
let routeCompany = company
let providerCalls = 0
let routeWrites = 0
let providerArgs
moduleMocks.set("next/server", { NextResponse: { json: (body, init = {}) => ({ body, status: init.status ?? 200 }) } })
moduleMocks.set("@/lib/auth/getAuthUser", { resolveDashboardIdentity: async () => identity })
moduleMocks.set("@/lib/dashboard/getCompany", { getCompany: async () => routeCompany, requireOwnerAccess: async () => ownerAccess })
moduleMocks.set("@/lib/security/rateLimit", { checkPublicRateLimit: () => ({ allowed: true }), rateLimitResponse: () => { throw new Error("Unexpected limit") } })
moduleMocks.set("@/lib/supabase/server", { createClient: async () => ({ from: () => ({ update: () => { routeWrites++; return { eq: async () => ({ error: null }) } } }) }) })
moduleMocks.set("@/lib/pexels", { fetchStockPhoto: async (...args) => { providerCalls++; providerArgs = args; return "fixture-photo" } })
const route = loadTsModule("src/app/api/stock-photo/route.ts")
const request = body => ({ json: async () => body })
await check("stock API ignores spoofed category and refuses unapproved guard inventory", async () => {
  const response = await route.POST(request({ companyId: company.id, industryCategory: "events", vibe: "warm", city: "Elsewhere" }))
  assert.equal(response.status, 404)
  assert.equal(providerCalls, 0)
  assert.equal(routeWrites, 0)
})
await check("stock API retains identity and owner authorization checks", async () => {
  identity = null
  assert.equal((await route.POST(request({ companyId: company.id }))).status, 401)
  identity = { userId: "fixture-owner", userEmail: "owner@example.invalid" }
  assert.equal((await route.POST(request({ companyId: "another-company" }))).status, 403)
  ownerAccess = false
  assert.equal((await route.POST(request({ companyId: company.id }))).status, 403)
  ownerAccess = true
  assert.equal((await route.POST(request({}))).status, 400)
  assert.equal(routeWrites, 0)
})
await check("non-guard stock API uses saved company fields", async () => {
  routeCompany = { ...company, sub_industry: "accountant" }
  assert.equal((await route.POST(request({ companyId: company.id, industryCategory: "events" }))).status, 200)
  assert.deepEqual(plain(providerArgs), ["professional_services", "bold", "Tucson"])
  assert.equal(routeWrites, 1)
})

const flowSource = fs.readFileSync("src/app/onboarding/OnboardingFlow.tsx", "utf8")
const flowAst = ts.createSourceFile("OnboardingFlow.tsx", flowSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const flowFunctions = flowAst.statements.filter(node => ts.isFunctionDeclaration(node))
await check("actual non-guard service chip input keeps A/C Repair as one name", () => {
  const component = flowFunctions.find(node => node.name?.text === "ServiceChipInput")
  const module = { exports: {} }
  let selected
  vm.runInNewContext(ts.transpileModule(`${component.getText(flowAst)}\nmodule.exports = ServiceChipInput`, {
    fileName: "fixture.tsx",
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React },
  }).outputText, {
    module,
    React: { createElement: (type, props, ...children) => ({ type, props, children }) },
    useState: () => ["A/C Repair", () => {}],
    getTokens: () => ({ border: () => "", chipBorder: () => "" }),
    getIndustryManifest: manifests.getIndustryManifest,
    isSecurityGuardIndustry: detection.isSecurityGuardIndustry,
    SIGNAL_GREEN: "#32D074",
  })
  const tree = module.exports({ value: [], onChange: value => { selected = value }, isLight: false, primaryColor: "#123456", industry: "home_services", subIndustry: "hvac" })
  tree.children.find(node => node?.type === "input").props.onKeyDown({ key: "Enter", preventDefault() {} })
  assert.deepEqual(plain(selected), ["A/C Repair"])
})
await check("actual onboarding subtype inference recognizes guard phrases before unrelated events", () => {
  const names = ["normalizeBusinessPhrase", "phraseMatches", "detectSubIndustry"]
  const code = names.map(name => flowFunctions.find(node => node.name?.text === name).getText(flowAst)).join("\n")
  const module = { exports: {} }
  vm.runInNewContext(ts.transpileModule(`${code}\nmodule.exports = detectSubIndustry`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, {
    module, getIndustryManifest: manifests.getIndustryManifest,
    isSecurityGuardIndustry: detection.isSecurityGuardIndustry, SUB_INDUSTRY_ALIASES: {},
  })
  assert.equal(module.exports("Event security guards for weddings and parties", "professional_services"), subtype)
  assert.equal(module.exports("Armed guard", "professional_services"), subtype)
  assert.equal(module.exports("camera install", "home_services"), "camera install")
})
await check("onboarding render and service input forward saved subtype", () => {
  const calls = []
  const chipProps = []
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(flowAst) === "getIndustryManifest") {
      calls.push(node.arguments.map(arg => arg.getText(flowAst)))
    }
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(flowAst) === "ServiceChipInput") {
      chipProps.push(...node.attributes.properties.map(prop => prop.getText(flowAst)))
    }
    ts.forEachChild(node, visit)
  }
  visit(flowAst)
  assert.ok(calls.some(args => args[0] === "answers.industry" && args[1] === "answers.subIndustry"))
  assert.ok(calls.some(args => args[0] === "industry" && args[1] === "subIndustry"))
  assert.ok(chipProps.includes("subIndustry={answers.subIndustry}"))
})

const guardContext = { industry: "professional_services", subIndustry: subtype, businessName: "Fixture Guard Company", city: "Arizona", state: null }
const reviewedGroups = [
  { name: "Armed and Unarmed", description: "Armed and Unarmed service scope is discussed before arrangements are confirmed." },
  { name: "Standing Guard and Patrol", description: "Standing Guard and Patrol requirements are discussed for the location." },
  { name: "Residential and Apartment", description: "Residential and Apartment service details are confirmed for each property." },
  { name: "Commercial Security", description: "Commercial Security requirements are discussed for the property." },
  { name: "Construction Site Security", description: "Construction Site Security requirements depend on the location." },
  { name: "Event Security", description: "Event Security details are discussed for the planned event." },
  { name: "Fire Watch", description: "Fire Watch scope must be confirmed before arrangements are made." },
  { name: "24/7 Security and Dispatch", description: "24/7 Security and Dispatch availability must be confirmed." },
]
await check("guard polishing preserves eight reviewed groups and service-leading descriptions", () => {
  assert.deepEqual(plain(polish.polishServices(reviewedGroups, guardContext)), reviewedGroups)
  assert.deepEqual(plain(polish.polishWebsiteUpdates({ services: reviewedGroups }, guardContext).services), reviewedGroups)
})
await check("missing guard descriptions stay empty without invented service or generic fallback", () => {
  const result = polish.polishServices([{ name: "Standing Guard and Patrol", description: "" }, { name: "Event Security" }, { name: "Dispatch", description: null }, { name: " " }, null], guardContext)
  assert.deepEqual(plain(result), [
    { name: "Standing Guard and Patrol", description: "" },
    { name: "Event Security", description: "" },
    { name: "Dispatch", description: "" },
  ])
})
await check("guard polishing does not replace repeated or short provided descriptions", () => {
  const rows = [{ name: "Standing Guard and Patrol", description: "Ask us." }, { name: "Event Security", description: "Ask us." }]
  assert.deepEqual(plain(polish.polishServices(rows, guardContext)), rows)
})
await check("non-guard compound splitting and description improvement remain unchanged", () => {
  const result = polish.polishServices([{ name: "Painting and Cleaning", description: "" }], { industry: "home_services", subIndustry: "painting" })
  assert.deepEqual(plain(result.map(service => service.name)), ["Painting", "Cleaning"])
  assert.ok(result.every(service => service.description.length > 0))
  assert.equal(polish.polishServices([{ name: "A/C Repair", description: "Repair work for the existing equipment." }], { industry: "home_services", subIndustry: "hvac" })[0].name, "A/C Repair")
})

// Load the actual public slug/domain readers to verify their context reaches polishing.
let publicCompany = { id: "fixture-public", slug: "fixture-guard", name: "Fixture Guard Company", industry_category: "professional_services", sub_industry: subtype, city: "Arizona", state: null, website_config: { services: reviewedGroups } }
let publicReads = 0
moduleMocks.set("react", { cache: fn => fn })
moduleMocks.set("@sentry/nextjs", { setTag() {}, captureException() {} })
moduleMocks.set("./supabase/server", { createClient: async () => ({ from: () => ({
  select() { return this }, eq() { return this },
  single: async () => { publicReads++; return { data: publicCompany, error: null } },
  maybeSingle: async () => { publicReads++; return { data: publicCompany, error: null } },
}) }) })
const publicReader = loadTsModule("src/lib/company.ts")
await check("actual public slug reader preserves guard service groups through polishWebsiteUpdates", async () => {
  const result = await publicReader.getCompanyBySlug("fixture-guard")
  assert.deepEqual(plain(result.website_config.services), reviewedGroups)
  assert.equal(publicReads, 1)
})
await check("actual custom-domain reader preserves guard groups and clean descriptions", async () => {
  const result = await publicReader.getCompanyByDomain("fixture.example.invalid")
  assert.deepEqual(plain(result.website_config.services), reviewedGroups)
  assert.equal(publicReads, 2)
})
await check("actual public non-guard reader retains compound splitting", async () => {
  publicCompany = { ...publicCompany, industry_category: "home_services", sub_industry: "painting", website_config: { services: [{ name: "Painting and Cleaning", description: "" }] } }
  const result = await publicReader.getCompanyBySlug("fixture-home-service")
  assert.deepEqual(plain(result.website_config.services.map(service => service.name)), ["Painting", "Cleaning"])
})

console.log(`${passed} security guard checks passed. All external calls and persistence were mocked.`)
