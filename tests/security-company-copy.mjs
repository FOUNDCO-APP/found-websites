import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import vm from "node:vm"
import ts from "typescript"

// Exercise real copy helpers with no database, credentials, or network access.
const cache = new Map()
function load(file) {
  const absolute = path.resolve(file.endsWith(".ts") ? file : `${file}.ts`)
  if (cache.has(absolute)) return cache.get(absolute).exports
  const module = { exports: {} }
  cache.set(absolute, module)
  const source = ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: absolute,
  }).outputText
  const require = id => {
    if (id.startsWith("@/")) return load(path.resolve("src", id.slice(2)))
    if (id.startsWith(".")) return load(path.resolve(path.dirname(absolute), id))
    throw new Error(`Unexpected dependency: ${id}`)
  }
  vm.runInNewContext(source, { module, exports: module.exports, require }, { filename: absolute })
  return module.exports
}

const { polishAboutCopy, polishWebsiteUpdates } = load("src/lib/copyPolish")
const { getLocationSection } = load("src/lib/locationSection")
const { getVocab } = load("src/lib/subIndustryVocabulary")
const { getSiteCopy } = load("src/lib/siteCopy")
const context = { industry: "professional_services", subIndustry: "Security Guard Services", businessName: "Fixture Guard Company", city: "Arizona" }
const narrative = "Fixture Guard Company provides armed and unarmed guard services.\n\nOur team brings investigation and instructor experience, with bilingual support. Contact us about 24/7 coverage needs."
let checks = 0
function check(label, run) { run(); checks++; console.log(`PASS ${label}`) }

check("reviewed guard narrative and paragraph breaks survive direct polishing", () => {
  assert.equal(polishAboutCopy(narrative, context), narrative)
  assert.equal(polishAboutCopy("  Owner wording without a full stop  ", context), "Owner wording without a full stop")
  assert.equal(polishAboutCopy(` \n${narrative}\n `, context), narrative)
  assert.equal(polishAboutCopy(" \n ", context), "")
  assert.equal(polishAboutCopy(null, context), "")
})
check("all saved guard About fields survive website update polishing", () => {
  const fields = { about_text: narrative, about_story: narrative, about_preview: "Armed and Unarmed Guard Services" }
  assert.equal(JSON.stringify(polishWebsiteUpdates(fields, context)), JSON.stringify(fields))
})
check("preservation requires explicit guard context", () => {
  for (const other of [undefined, { ...context, subIndustry: "Accountant" }, { ...context, subIndustry: "Security" }, { ...context, subIndustry: "Security camera installation" }, { ...context, industry: "retail" }]) {
    assert.notEqual(polishAboutCopy("we help you", other), "we help you")
  }
})
check("guard service area retains saved labels without adding city or inferred coverage", () => {
  for (const city of ["Arizona", "Tucson", null]) {
    for (const serviceAreas of [null, [], ["Tucson"], ["Tucson", "Phoenix", "Mesa"]]) {
      const section = getLocationSection({ ...context, primaryIntent: "contact", state: null, city, serviceAreas })
      assert.equal(section.overline, "Service Area")
      assert.equal(section.heading, "Confirm Availability")
      assert.equal(section.body, "Contact Fixture Guard Company to confirm availability for your location, schedule, and security needs.")
      assert.equal(JSON.stringify(section.areas), JSON.stringify(serviceAreas ?? []))
      assert.equal(section.display, serviceAreas?.length ? "chips" : "story")
    }
  }
})
check("guard service area preserves owner label spelling and case while removing empty duplicates", () => {
  const section = getLocationSection({ ...context, city: "Phoenix", serviceAreas: ["  northwest Tucson  ", "AZ foothills", "", "northwest Tucson"] })
  assert.equal(JSON.stringify(section.areas), JSON.stringify(["northwest Tucson", "AZ foothills"]))
  assert.equal(section.display, "chips")
  assert.doesNotMatch(JSON.stringify(section), /Phoenix/)
})
check("consultant and Barrio Builders location wording stays intact", () => {
  assert.equal(getLocationSection({ ...context, subIndustry: "Accountant" }).overline, "Local Guidance")
  const builder = getLocationSection({ ...context, businessName: "Barrio Builders", industry: "home_services", subIndustry: "remodeling", serviceAreas: ["Tucson", "Marana", "Oro Valley"], city: "Tucson" })
  assert.equal(builder.heading, "Service Areas")
  assert.equal(builder.areas.length, 2)
})
check("guard CTA supporting copy is distinct from its heading", () => {
  assert.equal(getVocab(context.subIndustry, context.industry).ctaBodyText, "Tell us about your location, schedule, and coverage needs")
  const copy = getSiteCopy("contact", { industryCategory: context.industry, subIndustry: context.subIndustry })
  assert.equal(copy.galleryCta, "Tell us about your location, schedule, and coverage needs")
  assert.notEqual(copy.galleryCta.toLowerCase(), copy.galleryCtaHeading.toLowerCase())
})
console.log(`${checks} security company copy scenarios passed; all checks use local fixtures.`)
