import fs from "node:fs"
import path from "node:path"
import vm from "node:vm"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const ts = require("typescript")

const fixturePath = path.resolve("quality/copy-quality-fixtures.json")
const fixtures = JSON.parse(fs.readFileSync(fixturePath, "utf8"))

function loadCopyPolish() {
  const sourcePath = path.resolve("src/lib/copyPolish.ts")
  const source = fs.readFileSync(sourcePath, "utf8")
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: sourcePath,
  }).outputText

  const exportsObject = {}
  const context = {
    exports: exportsObject,
    module: { exports: exportsObject },
    require,
    console,
  }
  vm.runInNewContext(output, context, { filename: sourcePath })
  return context.module.exports
}

const { polishAboutCopy, polishHeroCopy, polishHeroTitle, polishServices } = loadCopyPolish()

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

for (const fixture of fixtures.ctaFixtures) {
  assert(fixture.industry && fixture.expectedPrimary && fixture.expectedSecondary, `cta fixture missing required fields`)
  assert(fixture.bad.toLowerCase() !== fixture.expectedPrimary.toLowerCase(), `${fixture.industry}: bad CTA should not equal expected primary`)
  assert(fixture.bad.toLowerCase() !== fixture.expectedSecondary.toLowerCase(), `${fixture.industry}: bad CTA should not equal expected secondary`)
  checks++
}

console.log(`copy-quality fixtures ok: ${checks} fixture groups checked against production polish`)