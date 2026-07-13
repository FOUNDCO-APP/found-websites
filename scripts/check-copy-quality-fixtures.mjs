import fs from "node:fs"
import path from "node:path"
import vm from "node:vm"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const ts = require("typescript")

const fixturePath = path.resolve("quality/copy-quality-fixtures.json")
const fixtures = JSON.parse(fs.readFileSync(fixturePath, "utf8"))

function loadTsModule(modulePath, cache = new Map()) {
  let sourcePath = path.resolve(modulePath)
  if (!fs.existsSync(sourcePath) && fs.existsSync(`${sourcePath}.ts`)) sourcePath = `${sourcePath}.ts`
  if (!fs.existsSync(sourcePath) && fs.existsSync(path.join(sourcePath, "index.ts"))) sourcePath = path.join(sourcePath, "index.ts")
  if (cache.has(sourcePath)) return cache.get(sourcePath).exports
  const source = fs.readFileSync(sourcePath, "utf8")
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: sourcePath,
  }).outputText

  const module = { exports: {} }
  cache.set(sourcePath, module)
  const localRequire = (specifier) => {
    if (specifier.startsWith("@/")) return loadTsModule(path.resolve("src", specifier.slice(2)), cache)
    if (specifier.startsWith(".")) return loadTsModule(path.resolve(path.dirname(sourcePath), specifier), cache)
    return require(specifier)
  }
  const context = {
    exports: module.exports,
    module,
    require: localRequire,
    console,
    process,
    URL,
  }
  vm.runInNewContext(output, context, { filename: sourcePath })
  return module.exports
}

const { getAboutHeroSubtitle, polishAboutCopy, polishBusinessName, polishHeroCopy, polishHeroTitle, polishServices } = loadTsModule("src/lib/copyPolish.ts")
const { buildFallbackWebsiteContent } = loadTsModule("src/lib/contentGeneration.ts")

const rawLabelPatterns = [
  /\bhome_services\b/i,
  /\bprofessional_services\b/i,
  /\bpet_services\b/i,
  /\breal_estate\b/i,
  /\b[a-z]+_[a-z_]+\b/i,
  /\blocally owned apparel\b(?! shop| store| business)/i,
  /\blocally owned food\b(?! business| truck| restaurant)/i,
  /\blocally owned events\b(?! business| studio| company)/i,
  /\blocally owned cleaning\b(?! business)/i,
  /\blocally owned beauty\b(?! studio| business)/i,
  /\blocally owned wellness\b(?! studio| business)/i,
  /\blocally owned photography\b(?! business)/i,
]

const fragmentListPattern = /(?:^|\.\s+)[A-Z]?[a-z][^.!?]{0,28},\s*[A-Z]?[a-z][^.!?]{0,28},\s*[A-Z]?[a-z][^.!?]{0,28}(?:\.|$)/
const randomBodyCapsPattern = /[,;:]\s+(Custom|Same-day|Wholesale|Weekly|Deep|Move|Haircuts|Color|Lashes|Massage|Facials|Balloons|Weddings|Birthdays|Taxes|Bookkeeping|Payroll)\b/
const repeatedHumanLabelPattern = /\b(apparel shop)(?:\s+shop)+\b/i

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function assertCleanPublicCopy(text, id) {
  assert(typeof text === "string" && text.trim().length > 0, `${id}: copy must be non-empty`)
  for (const pattern of rawLabelPatterns) {
    assert(!pattern.test(text), `${id}: copy contains raw or awkward industry language: ${text}`)
  }
  assert(!fragmentListPattern.test(text), `${id}: copy still reads like a fragment list: ${text}`)
  assert(!randomBodyCapsPattern.test(text), `${id}: copy has random body capitalization: ${text}`)
  assert((text.match(/,/g) || []).length <= 4, `${id}: copy is too comma-heavy for mobile: ${text}`)
  assert(!repeatedHumanLabelPattern.test(text), `${id}: copy repeats a human industry label: ${text}`)
}

function sentenceCount(text) {
  return text.split(/(?<=[.!?])\s+/).filter(Boolean).length
}

function copyContext(fixture) {
  return {
    businessName: fixture.businessName,
    industry: fixture.industry,
    subIndustry: fixture.subIndustry ?? null,
    city: fixture.city,
    state: fixture.state,
  }
}

let checks = 0

for (const fixture of fixtures.aboutFixtures) {
  assert(fixture.id, "about fixture missing id")
  assert(fixture.raw && fixture.expected, `${fixture.id}: missing raw or expected`)

  assert(fixture.expected.includes(fixture.businessName), `${fixture.id}: expected copy should include business name`)
  assert(fixture.expected.includes(fixture.city), `${fixture.id}: expected copy should preserve city`)
  assertCleanPublicCopy(fixture.expected, `${fixture.id}: expected`)
  assert(sentenceCount(fixture.expected) <= 3, `${fixture.id}: expected about copy should stay short on mobile`)

  const production = polishAboutCopy(fixture.raw, copyContext(fixture))
  assert(production !== fixture.raw, `${fixture.id}: production copy should improve the raw input`)
  assert(production.includes(fixture.businessName), `${fixture.id}: production copy should include business name: ${production}`)
  assert(production.includes(fixture.city), `${fixture.id}: production copy should preserve city: ${production}`)
  assertCleanPublicCopy(production, `${fixture.id}: production`)
  assert(sentenceCount(production) <= 3, `${fixture.id}: production about copy should stay short on mobile: ${production}`)
  checks++
}

for (const fixture of fixtures.redundancyFixtures ?? []) {
  assert(fixture.id && fixture.field === "about_text" && fixture.raw && fixture.expected, "redundancy fixture missing required fields")
  const production = polishAboutCopy(fixture.raw, copyContext(fixture))
  assert(production === fixture.expected, `${fixture.id}: redundant intro was not removed. Expected ${fixture.expected}, got ${production}`)
  assertCleanPublicCopy(production, `${fixture.id}: production`)
  assert(sentenceCount(production) <= 3, `${fixture.id}: production about copy should stay short on mobile: ${production}`)
  checks++
}
function polishFixtureField(fixture, value) {
  const context = copyContext(fixture)
  if (fixture.field === "hero_title") return polishHeroTitle(value, context)
  if (fixture.field === "hero_subtitle") return polishHeroCopy(value, context)
  if (fixture.field === "about_text") return polishAboutCopy(value, context)
  throw new Error(`${fixture.id}: unsupported idempotency field ${fixture.field}`)
}

for (const fixture of fixtures.idempotencyFixtures ?? []) {
  assert(fixture.id && fixture.field && fixture.raw && fixture.expected, "idempotency fixture missing required fields")
  const firstPass = polishFixtureField(fixture, fixture.raw)
  const secondPass = polishFixtureField(fixture, firstPass)
  assert(firstPass === fixture.expected, `${fixture.id}: first polish pass mismatch. Expected ${fixture.expected}, got ${firstPass}`)
  assert(secondPass === fixture.expected, `${fixture.id}: second polish pass should be idempotent. Expected ${fixture.expected}, got ${secondPass}`)
  assertCleanPublicCopy(firstPass, `${fixture.id}: production`)
  checks++
}
for (const fixture of fixtures.serviceFixtures) {
  assert(Array.isArray(fixture.raw) && Array.isArray(fixture.expected), `${fixture.id}: service fixture needs raw and expected arrays`)
  assert(fixture.raw.length === fixture.expected.length, `${fixture.id}: service raw/expected length mismatch`)

  const production = polishServices(fixture.raw)
  assert(production.length === fixture.expected.length, `${fixture.id}: production service length mismatch`)

  const descriptions = new Set()
  for (let index = 0; index < fixture.expected.length; index++) {
    const expected = fixture.expected[index]
    const actual = production[index]
    assert(expected.name && expected.description, `${fixture.id}: expected service item missing name/description`)
    assert(actual.name === expected.name, `${fixture.id}: service name mismatch. Expected ${expected.name}, got ${actual.name}`)
    assert(actual.description === expected.description, `${fixture.id}: service description mismatch for ${expected.name}. Expected ${expected.description}, got ${actual.description}`)
    assert(!/^.+ handled with clear communication/i.test(actual.description), `${fixture.id}: production service still has template smell`)
    assert(!descriptions.has(actual.description), `${fixture.id}: duplicate production service description: ${actual.description}`)
    descriptions.add(actual.description)
  }
  checks++
}

for (const fixture of fixtures.aboutPageFixtures ?? []) {
  assert(fixture.id && fixture.field, "about page fixture missing required fields")
  if (fixture.field === "about_text") {
    const production = polishAboutCopy(fixture.raw, copyContext(fixture))
    assert(production === fixture.expected, `${fixture.id}: semantic duplicate intro was not removed. Expected ${fixture.expected}, got ${production}`)
    assertCleanPublicCopy(production, `${fixture.id}: production`)
  } else if (fixture.field === "about_hero") {
    const title = `About ${polishBusinessName(fixture.businessName)}`
    const subtitle = getAboutHeroSubtitle(copyContext(fixture))
    assert(title === fixture.expectedTitle, `${fixture.id}: about title mismatch. Expected ${fixture.expectedTitle}, got ${title}`)
    assert(subtitle === fixture.expectedSubtitle, `${fixture.id}: about subtitle mismatch. Expected ${fixture.expectedSubtitle}, got ${subtitle}`)
    const combined = `${title} ${subtitle}`.toLowerCase()
    for (const phrase of fixture.forbidden) {
      assert(!combined.includes(String(phrase).toLowerCase()), `${fixture.id}: forbidden about hero phrase leaked: ${phrase}`)
    }
  } else {
    throw new Error(`${fixture.id}: unsupported about page fixture field ${fixture.field}`)
  }
  checks++
}
for (const fixture of fixtures.faithFixtures ?? []) {
  const result = buildFallbackWebsiteContent({
    name: fixture.name,
    description: "",
    industry: fixture.industry,
    subIndustry: fixture.subIndustry,
    city: fixture.city,
    state: fixture.state,
    different: "",
    services: [],
    vibe: "bold",
    manifest: { primaryJob: "", jonyNote: "", primaryIntent: "contact" },
  })
  assert(result.heroTitle === fixture.expectedHeroTitle, `${fixture.id}: hero title mismatch. Expected ${fixture.expectedHeroTitle}, got ${result.heroTitle}`)
  assert(result.heroSubtitle === fixture.expectedHeroSubtitle, `${fixture.id}: hero subtitle mismatch. Expected ${fixture.expectedHeroSubtitle}, got ${result.heroSubtitle}`)
  assert(result.aboutText === fixture.expectedAbout, `${fixture.id}: about copy mismatch. Expected ${fixture.expectedAbout}, got ${result.aboutText}`)
  const combined = `${result.heroTitle} ${result.heroSubtitle} ${result.aboutText}`.toLowerCase()
  for (const phrase of fixture.forbidden) {
    assert(!combined.includes(String(phrase).toLowerCase()), `${fixture.id}: forbidden phrase leaked into faith copy: ${phrase}`)
  }
  checks++
}
for (const fixture of fixtures.ctaFixtures) {
  assert(fixture.industry && fixture.expectedPrimary && fixture.expectedSecondary, `cta fixture missing required fields`)
  assert(fixture.bad.toLowerCase() !== fixture.expectedPrimary.toLowerCase(), `${fixture.industry}: bad CTA should not equal expected primary`)
  assert(fixture.bad.toLowerCase() !== fixture.expectedSecondary.toLowerCase(), `${fixture.industry}: bad CTA should not equal expected secondary`)
  checks++
}

console.log(`copy-quality fixtures ok: ${checks} fixture groups checked against production polish`)