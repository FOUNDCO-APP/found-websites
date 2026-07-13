import fs from "node:fs"
import path from "node:path"

const fixturePath = path.resolve("quality/copy-quality-fixtures.json")
const fixtures = JSON.parse(fs.readFileSync(fixturePath, "utf8"))

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

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function assertCleanPublicCopy(text, id) {
  assert(typeof text === "string" && text.trim().length > 0, `${id}: expected copy must be non-empty`)
  for (const pattern of rawLabelPatterns) {
    assert(!pattern.test(text), `${id}: expected copy contains raw or awkward industry language: ${text}`)
  }
  assert(!fragmentListPattern.test(text), `${id}: expected copy still reads like a fragment list: ${text}`)
  assert(!randomBodyCapsPattern.test(text), `${id}: expected copy has random body capitalization: ${text}`)
  assert((text.match(/,/g) || []).length <= 4, `${id}: expected copy is too comma-heavy for mobile: ${text}`)
}

function sentenceCount(text) {
  return text.split(/(?<=[.!?])\s+/).filter(Boolean).length
}

let checks = 0

for (const fixture of fixtures.aboutFixtures) {
  assert(fixture.id, "about fixture missing id")
  assert(fixture.raw && fixture.expected, `${fixture.id}: missing raw or expected`)
  assert(fixture.expected.includes(fixture.businessName), `${fixture.id}: expected copy should include business name`)
  assert(fixture.expected.includes(fixture.city), `${fixture.id}: expected copy should preserve city`)
  assertCleanPublicCopy(fixture.expected, fixture.id)
  assert(sentenceCount(fixture.expected) <= 3, `${fixture.id}: expected about copy should stay short on mobile`)
  checks++
}

for (const fixture of fixtures.serviceFixtures) {
  assert(Array.isArray(fixture.raw) && Array.isArray(fixture.expected), `${fixture.id}: service fixture needs raw and expected arrays`)
  assert(fixture.raw.length === fixture.expected.length, `${fixture.id}: service raw/expected length mismatch`)
  const descriptions = new Set()
  for (const item of fixture.expected) {
    assert(item.name && item.description, `${fixture.id}: expected service item missing name/description`)
    assert(!/^.+ handled with clear communication/i.test(item.description), `${fixture.id}: expected service still has template smell`)
    assert(!descriptions.has(item.description), `${fixture.id}: duplicate expected service description: ${item.description}`)
    descriptions.add(item.description)
  }
  checks++
}

for (const fixture of fixtures.ctaFixtures) {
  assert(fixture.industry && fixture.expectedPrimary && fixture.expectedSecondary, `cta fixture missing required fields`)
  assert(fixture.bad !== fixture.expectedPrimary, `${fixture.industry}: bad CTA should not equal expected primary`)
  assert(fixture.bad !== fixture.expectedSecondary, `${fixture.industry}: bad CTA should not equal expected secondary`)
  checks++
}

console.log(`copy-quality fixtures ok: ${checks} fixture groups checked`)