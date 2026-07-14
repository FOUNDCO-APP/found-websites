import fs from "node:fs"
import path from "node:path"
import vm from "node:vm"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const ts = require("typescript")

function loadTsModule(modulePath, cache = new Map()) {
  let sourcePath = path.resolve(modulePath)
  if (!fs.existsSync(sourcePath) && fs.existsSync(`${sourcePath}.ts`)) sourcePath = `${sourcePath}.ts`
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
  const context = { exports: module.exports, module, require, console, process }
  vm.runInNewContext(output, context, { filename: sourcePath })
  return module.exports
}

const { getLocationSection } = loadTsModule("src/lib/locationSection.ts")

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const cases = [
  {
    id: "retail-single-city",
    input: { businessName: "Shirts", industry: "retail", subIndustry: "apparel", primaryIntent: "shop", city: "Tucson", state: "AZ", serviceAreas: ["Tucson"] },
    expect: { overline: "Visit the Shop", heading: "Based in Tucson", display: "story", no: ["Service Areas", "Where We Work"] },
  },
  {
    id: "home-service-many-areas",
    input: { businessName: "Barrio Builders", industry: "home_services", subIndustry: "remodeling", primaryIntent: "quote", city: "Tucson", state: "AZ", serviceAreas: ["Tucson", "Oro Valley", "Marana"] },
    expect: { overline: "Where We Work", heading: "Service Areas", display: "chips", areaCount: 2 },
  },
  {
    id: "church-community-language",
    input: { businessName: "FRCC", industry: "nonprofit", subIndustry: "church", primaryIntent: "contact", city: "Tucson", state: "AZ", serviceAreas: ["Tucson"] },
    expect: { overline: "Rooted Here", heading: "Rooted in Tucson", display: "story", no: ["Service Areas", "Where We Work", "customers"] },
  },
  {
    id: "food-truck-language",
    input: { businessName: "Taco Truck", industry: "food", subIndustry: "food truck", primaryIntent: "menu", city: "Phoenix", state: "AZ", serviceAreas: ["Phoenix"] },
    expect: { overline: "Find Us Around Town", heading: "Serving Around Phoenix", display: "story", no: ["Service Areas"] },
  },
  {
    id: "online-no-location",
    input: { businessName: "Desert Goods", industry: "retail", subIndustry: "online shop", primaryIntent: "shop", city: null, state: null, serviceAreas: [] },
    expect: { overline: "Available Online", heading: "Built to Order Online", display: "story", no: ["Service Areas", "Where We Work"] },
  },
]

for (const fixture of cases) {
  const section = getLocationSection(fixture.input)
  assert(section.overline === fixture.expect.overline, `${fixture.id}: overline mismatch. Expected ${fixture.expect.overline}, got ${section.overline}`)
  assert(section.heading === fixture.expect.heading, `${fixture.id}: heading mismatch. Expected ${fixture.expect.heading}, got ${section.heading}`)
  assert(section.display === fixture.expect.display, `${fixture.id}: display mismatch. Expected ${fixture.expect.display}, got ${section.display}`)
  if (typeof fixture.expect.areaCount === "number") {
    assert(section.areas.length === fixture.expect.areaCount, `${fixture.id}: area count mismatch. Expected ${fixture.expect.areaCount}, got ${section.areas.length}`)
  }
  const combined = `${section.overline} ${section.heading} ${section.body} ${section.areas.join(" ")}`
  for (const forbidden of fixture.expect.no ?? []) {
    assert(!combined.includes(forbidden), `${fixture.id}: forbidden phrase leaked: ${forbidden}`)
  }
}

console.log(`location-section fixtures ok: ${cases.length} scenarios checked`)
