import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import vm from "node:vm"
import { createRequire } from "node:module"
import ts from "typescript"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

const require = createRequire(import.meta.url)
const target = "626dc220-4152-4711-8862-a885534e1e0a"
const company = { id: target, slug: "intellsecurity", name: "Fixture Security", primary_color: "#b89b51",
  industry_category: "professional_services", sub_industry: "Security Guard Services", primary_intent: "contact",
  plan: "found_pro", subscription_status: "active", website_config: { stock_images: [], services: [] } }
const tables = { company_photos: [], photo_albums: [] }
const cache = new Map()
let albumReadFails = false, opened = false, calls = [], checks = 0
function check(value, label) { assert.ok(value, label); checks++ }
function query(table) {
  assert.ok(table in tables, `Unexpected table ${table}`)
  const filters = []
  let single = false, maximum = Infinity, ordering = []
  const q = new Proxy({}, { get(_, key) {
    if (key === "then") return resolve => {
      let rows = tables[table].filter(row => filters.every(filter => filter(row)))
      for (const [field, ascending] of [...ordering].reverse()) rows = [...rows].sort((a, b) => String(a[field] ?? "").localeCompare(String(b[field] ?? "")) * (ascending ? 1 : -1))
      rows = rows.slice(0, maximum)
      resolve({ data: single ? rows[0] ?? null : rows, error: table === "photo_albums" && albumReadFails ? { message: "Fixture failure" } : null })
    }
    if (key === "eq") return (field, value) => { filters.push(row => row[field] === value); return q }
    if (key === "in") return (field, values) => { filters.push(row => values.includes(row[field])); return q }
    if (key === "is") return (field, value) => { filters.push(row => row[field] == value); return q }
    if (key === "not") return (field, _operator, value) => { filters.push(row => row[field] != value); return q }
    if (key === "limit") return value => { maximum = value; return q }
    if (key === "single" || key === "maybeSingle") return () => { single = true; return q }
    if (key === "select") return () => q
    if (key === "order") return (field, options = {}) => { ordering.push([field, options.ascending !== false]); return q }
    throw Error(`Forbidden query operation: ${String(key)}`)
  } })
  return q
}
function load(file) {
  let absolute = path.resolve(file)
  if (!path.extname(absolute)) absolute += fs.existsSync(`${absolute}.ts`) ? ".ts" : ".tsx"
  if (cache.has(absolute)) return cache.get(absolute).exports
  const module = { exports: {} }
  cache.set(absolute, module)
  const output = ts.transpileModule(fs.readFileSync(absolute, "utf8"), { fileName: absolute,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  function localRequire(id) {
    if (id === "next/navigation") return { notFound() { throw Error("notFound") } }
    if (id === "next/link") return { __esModule: true, default: ({ href, children, ...rest }) => React.createElement("a", { href, ...rest }, children) }
    if (id === "@/lib/company") return { getCompanyBySlug: async () => company, getCompanyByDomain: async () => company }
    if (id === "@/lib/supabase/admin") return { createAdminClient: () => ({ from: query }) }
    if (id === "@/lib/stockImages") return { getStockImages: async () => [] }
    if (id === "@/components/InView") return { __esModule: true, default: ({ children, className }) => React.createElement("div", { className }, children) }
    if (id === "@/components/GalleryLightbox") {
      const Actual = load("src/components/GalleryLightbox").default
      return { __esModule: true, default: props => { calls.push(props.photos.map(photo => typeof photo === "string" ? photo : photo.url)); return React.createElement(Actual, props) } }
    }
    if (id === "react" && absolute.endsWith("GalleryLightbox.tsx")) return { ...React,
      useState: initial => [initial === null && opened ? 0 : initial, () => {}], useEffect() {},
      useCallback: fn => fn, useRef: initial => ({ current: initial }) }
    if (id === "react" || id === "react/jsx-runtime") return require(id)
    if (id.startsWith("@/")) return load(`src/${id.slice(2)}`)
    if (id.startsWith(".")) return load(path.resolve(path.dirname(absolute), id))
    throw Error(`Unexpected dependency: ${id}`)
  }
  vm.runInNewContext(output, { module, exports: module.exports, require: localRequire, URL, Date, process: { env: {} },
    fetch() { throw Error("Network prohibited") } }, { filename: absolute })
  return module.exports
}
const gallery = load("src/app/[slug]/gallery/page.tsx").default
const stock = load("src/lib/stockPhotoLibrary").STOCK_PHOTO_LIBRARY[0]
const ownerUrl = "https://fixture.invalid/owner-flyer.jpg"
const hiddenUrl = "https://fixture.invalid/private-job.jpg"
const foreignUrl = "https://fixture.invalid/other-tenant.jpg"
const photo = (id, url, extra = {}) => ({ id, url, company_id: company.id, for_website: false, in_gallery: true,
  website_section: null, album_id: null, created_at: "2026-10-25T00:00:00Z", ...extra })
async function page() { calls = []; return renderToStaticMarkup(await gallery({ params: Promise.resolve({ slug: company.slug }) })) }
const grids = html => (html.match(/class="masonry px-0\.5"/g) ?? []).length

for (const plan of ["found", "found_pro", "found_business"]) {
  company.plan = plan; company.id = target
  tables.photo_albums = []
  tables.company_photos = [photo("stock", stock.urls[0], { created_at: "2026-10-25T01:00:00Z" }), photo("flyer", ownerUrl)]
  const before = structuredClone(tables)
  let html = await page()
  check(grids(html) === 1 && calls.length === 1, `${plan}: Hiram has one actual lightbox grid`)
  check(JSON.stringify(calls[0]) === JSON.stringify([stock.urls[0], ownerUrl]), `${plan}: original membership and order retained`)
  check(!html.includes("Shared Photos") && !html.includes("Illustrative Security Photography"), `${plan}: no automatic group headings`)
  check(!html.includes("grouped separately") && html.includes(`A closer look at ${company.name}.`), `${plan}: intro matches continuous presentation`)
  check((html.match(/Some images are illustrative stock photography/g) ?? []).length === 1, `${plan}: one quiet stock explanation`)
  check(!html.includes('href="/gallery/'), `${plan}: current no-album fixture adds no album click`)
  opened = true; html = await page(); opened = false
  check(html.includes(stock.photographer) && html.includes(stock.license.url) && html.includes(stock.sourceUrl), `${plan}: actual lightbox retains provenance`)
  assert.deepEqual(tables, before); checks++

  company.id = "another-client"
  tables.company_photos = [photo("stock", stock.urls[0]), photo("owner", ownerUrl)]
  html = await page()
  check(grids(html) === 2 && html.includes("Shared Photos") && html.includes("Illustrative Security Photography"), `${plan}: non-Hiram mixed grouping unchanged even with same slug/name`)

  company.id = target
  tables.photo_albums = [{ id: "hidden", company_id: target, name: "Private job", slug: "private", show_on_website_gallery: false }]
  tables.company_photos = [photo("stock", stock.urls[0]), photo("owner", ownerUrl), photo("hidden", hiddenUrl, { album_id: "hidden" }),
    photo("foreign", foreignUrl, { company_id: "another-client" })]
  html = await page()
  check(grids(html) === 1 && !html.includes(hiddenUrl) && !html.includes(foreignUrl) && !html.includes("Private job"), `${plan}: hidden albums and other tenant photos excluded`)
  albumReadFails = true; html = await page(); albumReadFails = false
  check(!html.includes(hiddenUrl) && !html.includes(foreignUrl), `${plan}: album read failure remains closed`)
}

company.plan = "found_pro"
tables.photo_albums = [{ id: "published", company_id: target, name: "Owner collection", slug: "owner-collection", show_on_website_gallery: true }]
tables.company_photos = [photo("album", ownerUrl, { album_id: "published", in_gallery: false })]
const albumHtml = await page()
check(albumHtml.includes('href="/gallery/owner-collection"') && albumHtml.includes("Owner collection"), "existing published albums are not flattened or renamed by containment")
check(calls.length === 0, "published album membership is not silently copied into flat grid")
tables.company_photos = [photo("owner", ownerUrl)]
tables.photo_albums = []
check(!(await page()).includes("Some images are illustrative"), "no stock explanation fabricated for owner-only images")
console.log(`Hiram continuous Gallery: ${checks} assertions PASS; actual page/lightbox SSR, fixtures only, no network or writes.`)
