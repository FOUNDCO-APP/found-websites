import fs from "node:fs"
import path from "node:path"
import vm from "node:vm"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const ts = require("typescript")

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
  vm.runInNewContext(output, { exports: module.exports, module, require: localRequire, console, process, URL }, { filename: sourcePath })
  return module.exports
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const { buildPublicSiteSchemas } = loadTsModule("src/lib/publicSiteSchema.ts")

const company = {
  id: "company_1",
  name: "Barrio Builders",
  slug: "barriobuilders",
  user_id: "user_1",
  industry_category: "home_services",
  primary_intent: "quote",
  secondary_intent: null,
  sub_industry: "remodeling",
  vibe: "clean",
  phone: "555-111-2222",
  email: "hidden@example.com",
  phone_visible: true,
  email_visible: false,
  is_test: false,
  lead_phone: null,
  lead_email: null,
  city: "Tucson",
  state: "AZ",
  address: "123 Private St",
  zip: "85701",
  address_visible: false,
  logo_url: "https://cdn.example.com/logo.png",
  logo_white_url: null,
  navbar_dark: false,
  stripe_customer_id: null,
  stripe_connect_account_id: null,
  plan: "found_business",
  subscription_status: "active",
  trial_ends_at: null,
  pending_setup_intent_secret: null,
  primary_color: "#111111",
  accent_color_1: "#222222",
  accent_color_2: "#333333",
  photo_keywords: null,
  website_config: {
    id: "config_1",
    hero_title: "Remodeling in Tucson",
    hero_subtitle: "Fast, honest estimates from Tucson's trusted remodeling team.",
    hero_video_url: null,
    hero_image_url: "https://cdn.example.com/hero.jpg",
    hero_images: null,
    stock_images: [],
    about_text: "Kitchen, bath, and home updates handled with clear communication.",
    about_preview: "Remodeling help for Tucson homeowners.",
    about_story: null,
    about_highlights: null,
    tagline: null,
    cta_headline: null,
    services: [
      { name: "Kitchen remodeling", description: "Planning, demo, and installation for kitchen updates." },
      { name: "Bathroom remodeling", description: "Practical bathroom updates with clean scheduling." },
      { name: "Kitchen remodeling", description: "Duplicate name should not create duplicate schema." },
    ],
    menu_items: null,
    testimonials: [],
    service_areas: ["Tucson", "Oro Valley", "Tucson"],
    social_links: {
      facebook: "https://facebook.com/barrio",
      empty: "",
      bad: "not-a-url",
    },
    custom_domain: null,
    published: true,
    copy_generated: true,
    faq_items: [
      { q: "Do you offer estimates?", a: "Yes. Barrio Builders offers remodeling estimates in Tucson." },
    ],
  },
}

const [schema] = buildPublicSiteSchemas(company)
assert(schema["@context"] === "https://schema.org", "schema should use schema.org context")
assert(Array.isArray(schema["@graph"]), "schema should emit one @graph array")

const graph = schema["@graph"]
const byType = (type) => graph.filter((item) => item["@type"] === type)
const business = byType("LocalBusiness")[0]
const website = byType("WebSite")[0]
const services = byType("Service")
const faq = byType("FAQPage")[0]
const serialized = JSON.stringify(schema)

assert(business, "LocalBusiness schema missing")
assert(website, "WebSite schema missing")
assert(faq, "FAQPage schema missing")
assert(services.length === 2, `expected duplicate service names to collapse to 2 services, got ${services.length}`)
assert(business["@id"] === "https://barriobuilders.foundco.app/#business", "business @id should be stable")
assert(website.publisher["@id"] === business["@id"], "website should point to business publisher")
assert(business.telephone === "555-111-2222", "visible phone should be included")
assert(!serialized.includes("hidden@example.com"), "hidden email should not be exposed in schema")
assert(!serialized.includes("123 Private St"), "hidden street address should not be exposed in schema")
assert(!serialized.includes("85701"), "hidden postal code should not be exposed in schema")
assert(serialized.includes("Kitchen remodeling"), "service names should be included")
assert(serialized.includes("Do you offer estimates?"), "FAQ items should be included")
assert(serialized.includes("https://facebook.com/barrio"), "valid social links should be included")
assert(!serialized.includes("not-a-url"), "invalid social links should be omitted")

console.log("Public site schema checks passed")
