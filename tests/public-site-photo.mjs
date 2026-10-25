import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import vm from "node:vm"
import { createRequire } from "node:module"
import ts from "typescript"
import React from "react"
import { renderToStaticMarkup as render } from "react-dom/server"

const require = createRequire(import.meta.url)
const cache = new Map()
const company = { id: "fixture-company", slug: "fixture", name: "Fixture Security", primary_color: "#147354",
  industry_category: "professional_services", sub_industry: "Security Guard Services", primary_intent: "contact",
  phone: null, email: "owner@example.test", city: "Hiram", state: "GA", plan: "found", subscription_status: "active",
  website_config: { services: [], service_areas: [], stock_images: [], hero_title: "Fixture Security" } }
let rows = []
const queries = []
function query(table) {
  const filters = []
  const q = new Proxy({}, { get(_, key) {
    if (key === "then") return resolve => resolve({ data: table === "company_photos" ? rows.filter(row => filters.every(test => test(row))) : [], error: null })
    if (key === "eq") return (field, value) => { queries.push([table, field, value]); filters.push(row => row[field] === value); return q }
    if (key === "in") return (field, values) => { filters.push(row => values.includes(row[field])); return q }
    if (["select", "order", "limit"].includes(key)) return () => q
    throw Error(`Unexpected query ${String(key)}`)
  } })
  return q
}
function load(file) {
  let absolute = path.resolve(file)
  if (!path.extname(absolute)) absolute += fs.existsSync(`${absolute}.ts`) ? ".ts" : ".tsx"
  if (cache.has(absolute)) return cache.get(absolute).exports
  const module = { exports: {} }
  cache.set(absolute, module)
  const source = ts.transpileModule(fs.readFileSync(absolute, "utf8"), { fileName: absolute,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2020 } }).outputText
  function localRequire(id) {
    if (id === "react" || id === "react/jsx-runtime") return require(id)
    if (id === "next/navigation") return { notFound() { throw Error("not found") } }
    if (id === "next/link") return { __esModule: true, default: ({ children, ...props }) => React.createElement("a", props, children) }
    if (id === "@/lib/company") return { getCompanyBySlug: async () => company, getCompanyByDomain: async () => company }
    if (id === "@/lib/supabase/admin") return { createAdminClient: () => ({ from: query }) }
    if (id === "./ContactForm") return { __esModule: true, default: () => null }
    if (id === "@/components/InView") return { __esModule: true, default: ({ children, ...props }) => React.createElement("div", props, children) }
    if (id.startsWith("@/components/layouts/")) return { __esModule: true, default: () => null }
    if (id.startsWith("@/")) return load(`src/${id.slice(2)}`)
    if (id.startsWith(".")) return load(path.resolve(path.dirname(absolute), id))
    throw Error(`Unexpected dependency ${id}`)
  }
  vm.runInNewContext(source, { module, exports: module.exports, require: localRequire, URL, console,
    process: { env: {} }, fetch() { throw Error("No network allowed") } }, { filename: absolute })
  return module.exports
}

const { STOCK_PHOTO_LIBRARY: library, resolveStockPhoto } = load("src/lib/stockPhotoLibrary")
const photoModule = load("src/components/PublicSitePhoto")
const Photo = photoModule.default
assert.equal(photoModule.PublicSitePhotoLabel, undefined, "Removed public badge abstraction is not retained")
const Hero = load("src/components/PublicPageHeroMedia").default
const stock = id => resolveStockPhoto(`pexels:${id}`)
const owner = { src: "https://fixture.test/owner.jpg", alt: "Owner's photo", className: "absolute inset-0 object-cover",
  style: { objectPosition: "71% 42%", opacity: 0.8 }, sizes: "50vw", srcSet: "https://fixture.test/owner-large.jpg 1200w", loading: "lazy" }
assert.deepEqual({ ...Photo({ ...owner, hero: true }).props }, owner, "Owner element, alt, source, style and loading remain unchanged")

for (const photo of library) {
  const html = render(React.createElement(Photo, { src: photo.fullViewUrl, alt: "Our employees", hero: true, className: "object-cover", style: { opacity: 0.7 } }))
  assert.ok(html.includes(photo.alt))
  assert.doesNotMatch(html, /Our employees/)
  assert.ok(html.includes("2560w"))
  assert.match(html, /sizes="100vw"/)
  assert.match(html, /opacity:0.7/)
  if (photo.id === "pexels:8134817") assert.match(html, /object-position:23% 50%/)
  else assert.doesNotMatch(html, /object-position/)
}
const gate = stock(8134817)
assert.equal(library.filter(photo => photo.heroObjectPosition).length, 1, "Only the approved gate focal changes")
assert.doesNotMatch(render(React.createElement(Photo, { src: gate.fullViewUrl, alt: "", hero: false })), /object-position/, "Gallery thumbnails keep their crop")
assert.match(render(React.createElement(Hero, { src: gate.fullViewUrl, alt: "Actual staff", background: "#123456" })), /object-position:23% 50%/)
assert.match(render(React.createElement(Hero, { src: gate.fullViewUrl, alt: "", background: "#123456" })), /bg-black\/70/, "Shared hero overlay remains unchanged")
assert.doesNotMatch(render(React.createElement(Hero, { src: null, alt: "", background: "#123456" })), /<img/)
assert.match(render(React.createElement(Hero, { src: "https://fixture.test/owner.mp4", alt: "", background: "#123456" })), /<video/)

for (const [section, id, overlay] of [["about", 5511130, "68"], ["services", 34585117, "70"], ["contact", 8134817, "70"]]) {
  const page = load(`src/app/[slug]/${section}/page.tsx`).default
  rows = [
    { company_id: company.id, url: stock(id).fullViewUrl, website_section: section, for_website: true },
    { company_id: "other-company", url: "https://fixture.test/other.jpg", website_section: section, for_website: true },
  ]
  const html = render(await page({ params: Promise.resolve({ slug: "fixture" }) }))
  assert.ok(html.includes(stock(id).alt), `${section}: real route uses stock alt`)
  assert.match(html, /2560w/)
  assert.doesNotMatch(html, />Illustrative stock<\/p>/, `${section}: no repeated public header badge`)
  assert.ok(html.includes(`bg-black/${overlay}`), `${section}: overlay unchanged`)
  assert.doesNotMatch(html, /other\.jpg/)
  if (section === "contact") assert.match(html, /object-position:23% 50%/)
  rows = [{ company_id: company.id, url: owner.src, website_section: section, for_website: true }]
  const ownerHtml = render(await page({ params: Promise.resolve({ slug: "fixture" }) }))
  assert.doesNotMatch(ownerHtml, /Illustrative stock<\/p>|srcSet=|object-position:23%/)
  rows = []
  assert.doesNotMatch(render(await page({ params: Promise.resolve({ slug: "fixture" }) })), /<img|Illustrative stock<\/p>/, `${section}: no image fallback introduced`)
}
assert.ok(queries.some(([, key, value]) => key === "company_id" && value === company.id))
const Impact = load("src/components/layouts/ImpactLayout.tsx").default
const impactProps = { company, activeAddons: [], primaryCTA: { href: "/contact", label: "Contact" }, secondaryCTA: null,
  imgs: [], gradient: "#123456", heroImage: stock(8591606).urls[2], heroVideo: null, sectionImages: { gallery: [] } }
const home = render(React.createElement(Impact, impactProps))
assert.ok(home.includes(stock(8591606).alt), "Existing legacy Home alias gets honest stock alt")
assert.match(home, /2560w/)
assert.doesNotMatch(home, />Illustrative stock<\/p>/, "Home has no stock badge")
assert.match(home, /bg-black\/62/, "Home overlay unchanged")
const ownerHome = render(React.createElement(Impact, { ...impactProps, heroImage: owner.src }))
assert.doesNotMatch(ownerHome, /Illustrative stock<\/p>|srcSet=/)
function elements(node) {
  if (!node || typeof node !== "object") return []
  return [node, ...React.Children.toArray(node.props?.children).flatMap(elements)]
}
for (const gallery of [
  [owner.src, stock(34585117).fullViewUrl],
  [owner.src, stock(34585117).fullViewUrl, stock(8591606).urls[2], "https://fixture.test/other-owner.jpg"],
  [owner.src],
]) {
  const tree = Impact({ ...impactProps, heroImage: owner.src, sectionImages: { gallery } })
  const tiles = elements(tree).filter(node => node.props?.className?.includes("relative flex-none overflow-hidden"))
  assert.equal(tiles.length, gallery.length >= 4 ? gallery.length * 2 : gallery.length)
  for (const tile of tiles) {
    const photo = elements(tile).find(node => node.type === Photo)
    assert.ok(photo)
    const html = render(tile)
    if (resolveStockPhoto(photo.props.src)) {
      assert.ok(html.includes(resolveStockPhoto(photo.props.src).alt), "Stock tiles retain truthful alt")
      assert.doesNotMatch(html, /Illustrative stock<\/p>|bg-black\/75/, "Stock tiles, including animation copies, have no repeated badge or backing")
    } else {
      assert.doesNotMatch(html, /Illustrative stock<\/p>|bg-black\/75/, "Owner thumbnails have no label or empty backing")
    }
    assert.equal(tile.props.style.height, "260px", "Strip dimensions stay unchanged")
  }
}
console.log("PASS public stock images: no repeated header/strip badges, responsive sources, truthful alt, gate focal only, owner images/video/plain states and overlays preserved; no live clients")
