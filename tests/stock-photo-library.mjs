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
let selected = null
const body = { style: { overflow: "" } }
const listeners = new Map()
const cleanups = []

// Exercise real render branches and handlers without live clients or image requests.
function load(file) {
  const absolute = path.resolve(file)
  if (cache.has(absolute)) return cache.get(absolute)
  const module = { exports: {} }
  const source = ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
    fileName: absolute,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText
  function localRequire(id) {
    if (id === "react") return {
      ...React,
      useState: initial => [initial === null ? selected : initial, value => {
        if (initial === null) selected = typeof value === "function" ? value(selected) : value
      }],
      useEffect: fn => { const cleanup = fn(); if (cleanup) cleanups.push(cleanup) },
      useRef: initial => ({ current: initial }), useCallback: fn => fn,
    }
    if (id === "react/jsx-runtime") return require(id)
    if (id === "@/components/InView") return { __esModule: true, default: ({ children, className }) => React.createElement("div", { className }, children) }
    if (id.startsWith("@/")) return load(`src/${id.slice(2)}.ts`)
    if (id.startsWith(".")) return load(path.resolve(path.dirname(absolute), `${id}.ts`))
    throw Error(`Unexpected dependency: ${id}`)
  }
  vm.runInNewContext(source, {
    module, exports: module.exports, require: localRequire, URL,
    document: { body }, window: {
      addEventListener: (event, fn) => listeners.set(event, fn),
      removeEventListener: (event, fn) => { if (listeners.get(event) === fn) listeners.delete(event) },
    },
    fetch() { throw Error("Network access forbidden") },
  }, { filename: absolute })
  cache.set(absolute, module.exports)
  return module.exports
}

const { STOCK_PHOTO_LIBRARY: library, resolveStockPhoto: resolve, getAvailableStockPhotos } = load("src/lib/stockPhotoLibrary.ts")
const approved = {
  8591606: ["Ron Lach", "1922515e4690aed3ed9c5af34f8d0a00441e0a873a50c621d2c26c42a6fe8999"],
  164586: ["Pixabay", "69605069f761862361717140cb8e16823b9ed407c36cfe98e6887167c2531465"],
  34585117: ["Caleb Oquendo", "9d5e9488be0de1bc41d38e1b43565507d6447cf5e0a0a5772e7d6e6f417d4dd3"],
  2990765: ["energepic.com", "deb422137508edc62b9ec30e838efa473f74ed1449af5fa64a3c7b6eccd0375a"],
  18614840: ["Mason McCall", "3df1106b8a0bad7c8e0a5066c1738d9437b7a357982f01fbf1fd8ee1f03c7901"],
  5511130: ["Mike van Schoonderwalt", "a7144c6caefee9eca27bb9783fce024c70caf5a2b20b8af8fc0f09f1e271e9fa"],
  5869284: ["FROET", "9a600939a2ebec44c898e44bf45110a4443fcd28164ebcd423b20145818a554f"],
  8134817: ["Max Vakhtbovych", "85dec69ec59b6017ba373961716f9ff085911e6901fed50820767dbd50f06f68"],
  4913326: ["Maria Orlova", "67f46054b57b195606744f08219b2e8bc7ed31ac44c6da337c004dea5e006543"],
  28196476: ["Rakesh Mondal", "23199f996ad8d414eef5daa22c4978a0db81733fffbbadaa59f0d91b1accd7ad"],
  10349987: ["Ron Lach", "5d4b2c398995643bcfb0c726c2ef52636d88b5eab83b8903e640b35bd6bd5ac6"],
  5053988: ["Shivam", "2dcecc041842902c9932dc9b99088a0cc3e0b9e9d3308b0b8510615832c8894b"],
}
assert.equal(library.length, 12, "Only Shawn's exact approved twelve")
assert.deepEqual(Array.from(library, photo => photo.id).sort(), Object.keys(approved).map(id => `pexels:${id}`).sort())
for (const id of [69483, 4923382, 16859956]) assert.equal(resolve(`pexels:${id}`), null, "Held originals are not approved inventory")
for (const [category, subIndustry] of [
  ["professional_services", "Security Guard Services"], ["professional_services", "Armed Guards"],
  ["professional_services", "Accountant"], ["home_services", "Security Guard Services"], [null, null],
]) assert.equal(getAvailableStockPhotos(category, subIndustry).length,
  category === "professional_services" && ["Security Guard Services", "Armed Guards"].includes(subIndustry) ? 12 : 0,
  "Library eligibility remains industry-aware, not automatic placement")
const enabledFixture = { ...library[0], id: "fixture:enabled", availableInLibrary: true }
library.push(enabledFixture)
try {
  assert.equal(getAvailableStockPhotos("professional_services", "Security Guard Services").at(-1), enabledFixture)
  assert.equal(getAvailableStockPhotos("professional_services", "Security Guard Services").length, 13)
  assert.equal(getAvailableStockPhotos("professional_services", "Accountant").length, 0)
  assert.equal(getAvailableStockPhotos("home_services", "Security Guard Services").length, 0)
} finally { library.pop() }
for (const photo of library) {
  assert.equal(resolve(photo.id), photo)
  assert.equal(photo.includeInGallery, true, "Gallery permission never automatically enrolls a photo")
  assert.equal(photo.availableInLibrary, true)
  assert.equal(photo.enforcePlacementApproval, true)
  const id = photo.id.split(":")[1]
  assert.equal(photo.photographer, approved[id][0])
  assert.equal(new URL(photo.sourceUrl).hostname, "www.pexels.com")
  assert.ok(new URL(photo.sourceUrl).pathname.endsWith(`-${id}/`))
  assert.equal(photo.fullViewUrl, `https://mmctzloztgkbqvofmkou.supabase.co/storage/v1/object/public/company-assets/stock-library/security/pexels-${id}-${approved[id][1]}.jpeg`)
  assert.equal(photo.fullViewUrl, photo.urls[1], "Full view keeps the hash-pinned shared original")
  assert.equal(resolve(photo.thumbnailUrl), photo)
  assert.equal(new URL(photo.thumbnailUrl).searchParams.get("w"), "640")
  assert.equal(photo.sizes, "(min-width: 768px) 33vw, 50vw")
  for (const width of [320, 640, 960]) assert.ok(photo.thumbnailSrcSet.includes(`&w=${width} ${width}w`))
  assert.equal(photo.approvedOn, "2026-10-24")
  assert.equal(photo.license.url, "https://www.pexels.com/license/")
  for (const url of photo.urls) {
    assert.equal(resolve(url), photo)
    assert.equal(resolve(`${url}?width=400&quality=75`), photo, "CDN sizing retains provenance")
    const parsed = new URL(url)
    for (const spoof of [
      url.replace("https:", "http:"),
      `https://evil.invalid${parsed.pathname}`,
      `${parsed.origin}.evil.invalid${parsed.pathname}`,
      `${url}.unapproved.jpg`,
      `${parsed.origin}/other${parsed.pathname}`,
      `https://evil.invalid/?source=${encodeURIComponent(url)}`,
      url.replace("https://", "https://user@"),
    ]) assert.equal(resolve(spoof), null, `Reject spoof: ${spoof}`)
  }
  const stored = photo.urls[1]
  assert.equal(resolve(stored.replace(/-[a-f0-9]{64}\.jpeg$/, "-wrong.jpeg")), null, "Stored asset hash must match")
  assert.equal(resolve(stored.replace("stock-library/security", "other-company")), null)
}
assert.equal(resolve("8591606"), null, "Only exact manifest IDs are recognized")
assert.equal(resolve("pexels:unapproved"), null)
assert.equal(resolve("not a URL"), null)
assert.deepEqual(Array.from(library[0].approvedSections), ["hero"])
assert.deepEqual(Array.from(library[1].approvedSections), ["about", "services"])
assert.equal(resolve("https://mmctzloztgkbqvofmkou.supabase.co/storage/v1/object/public/company-assets/626dc220-4152-4711-8862-a885534e1e0a/approved-stock/pexels-8591606-34d4cf3494d2c3a5ea15825838b71abe0d04905b8b859e3306b8ec572cef7104.jpg"), library[0])
assert.equal(resolve("https://mmctzloztgkbqvofmkou.supabase.co/storage/v1/object/public/company-assets/626dc220-4152-4711-8862-a885534e1e0a/approved-stock/pexels-164586-1e3e1049158727d39a9794a8ea7c3e855c3d4ec6715d47317485531037d59d41.jpg"), library[1])
const { canPlaceStockPhoto } = load("src/lib/stockPhotoPlacement.ts")
for (const id of [18614840, 28196476, 10349987]) {
  const photo = resolve(`pexels:${id}`)
  assert.equal(photo.approvedSections.length, 0)
  assert.equal(canPlaceStockPhoto(photo.fullViewUrl, "gallery"), true)
  for (const slot of ["hero", "about", "services", "contact", "gallery_hero", "cta", "book", "estimate", "menu"]) assert.equal(canPlaceStockPhoto(photo.fullViewUrl, slot), false)
}
for (const [id, slot] of [[8591606, "hero"], [34585117, "services"], [5511130, "about"], [8134817, "contact"], [2990765, "gallery_hero"]]) {
  assert.equal(canPlaceStockPhoto(resolve(`pexels:${id}`).fullViewUrl, slot), true, "Explicit target headers remain permitted, not assigned")
}
assert.match(fs.readFileSync("src/lib/photoPool.ts", "utf8"), /approvedSecurityGuardPhotos[^=]*= Object\.freeze\(\[\]\)/, "Automatic guard pool stays empty")

const Gallery = load("src/components/GalleryLightbox.tsx").default
const stock = library[0]
const stockCaption = renderToStaticMarkup(React.createElement(React.Fragment, null, stock.caption))
const ownerUrl = "https://fixture.invalid/owner.jpg"
const stockMedia = {
  url: stock.urls[1], thumbnailUrl: "https://fixture.invalid/thumb.jpg",
  thumbnailSrcSet: "https://fixture.invalid/thumb.jpg 400w, https://fixture.invalid/thumb-large.jpg 800w",
  sizes: "(max-width: 767px) 50vw, 33vw", fullViewUrl: "https://fixture.invalid/full.jpg",
  alt: "Our actual employees", caption: "Unverified customer claim",
}
const props = { companyName: "Fixture Company", primary: "#147354", photos: [stockMedia, ownerUrl, { url: "https://fixture.invalid/clip.mp4", mimeType: "video/mp4" }] }
const render = () => renderToStaticMarkup(React.createElement(Gallery, props))
function elements(tree) {
  if (!tree || typeof tree !== "object") return []
  return [tree, ...React.Children.toArray(tree.props?.children).flatMap(elements)]
}
function click(label) {
  const button = elements(Gallery(props)).find(node => node.props?.["aria-label"] === label)
  assert.ok(button, `Button exists: ${label}`)
  button.props.onClick()
}
const grid = render()
assert.match(grid, /Illustrative stock/)
assert.ok(!grid.includes(stockCaption), "Stock thumbnails do not repeat collection disclaimers")
assert.ok(grid.includes(stock.alt))
assert.ok(!grid.includes("Ron Lach"), "Full credits belong in the lightbox")
assert.ok(!grid.includes(`href="${stock.sourceUrl}"`))
assert.ok(!grid.includes(`href="${stock.license.url}"`))
assert.ok(grid.includes('src="https://fixture.invalid/thumb.jpg"'))
assert.ok(grid.includes('srcSet="https://fixture.invalid/thumb.jpg 400w, https://fixture.invalid/thumb-large.jpg 800w"'))
assert.ok(grid.includes('sizes="(max-width: 767px) 50vw, 33vw"'))
assert.ok(!grid.includes(stockMedia.fullViewUrl), "Full-view file is not requested by the grid")
assert.doesNotMatch(grid, /Our actual employees|Unverified customer claim/)
assert.ok(grid.includes(`src="${ownerUrl}"`), "Legacy owner URL preserved")
assert.ok(grid.includes("Fixture Company — photo 2"))
assert.ok(grid.includes('src="https://fixture.invalid/clip.mp4"'))

click("View photo 1")
assert.equal(selected, 0)
assert.equal(body.style.overflow, "hidden")
const open = render()
assert.ok(open.includes(`src="${stockMedia.fullViewUrl}"`))
assert.equal(open.split(stockCaption).length - 1, 1, "Full caption appears only in the opened lightbox")
assert.ok(open.includes("Ron Lach"))
assert.equal(open.split(`href="${stock.sourceUrl}"`).length - 1, 1, "Opened lightbox retains source credit")
assert.equal(open.split(`href="${stock.license.url}"`).length - 1, 1, "Opened lightbox retains license")
assert.doesNotMatch(open, /Our actual employees|Unverified customer claim/)
click("Next photo")
assert.equal(selected, 1)
assert.ok(render().includes('alt="Fixture Company — photo 2"'))
listeners.get("keydown")({ key: "ArrowRight" })
assert.equal(selected, 2)
assert.match(render(), /controls=""/)
click("Next photo")
assert.equal(selected, 0, "Navigation wraps")
render()
listeners.get("keydown")({ key: "Escape" })
assert.equal(selected, null)
assert.equal(body.style.overflow, "")

props.photos = [library[1].urls[0], { url: ownerUrl, alt: "Owner-supplied project photo", caption: "Owner caption" }]
const mixed = render()
assert.ok(mixed.includes("Illustrative stock"))
assert.ok(!mixed.includes("Pixabay"))
assert.ok(mixed.includes(`src="${library[1].thumbnailUrl.replaceAll("&", "&amp;")}"`), "Legacy stock strings use reviewed thumbnails")
assert.ok(!mixed.includes(`src="${library[1].fullViewUrl}"`), "Grid does not fetch the stored full-view original")
assert.ok(mixed.includes("Owner-supplied project photo"))
assert.ok(mixed.includes("Owner caption"))
props.photos = [ownerUrl]
assert.ok(!render().includes("Illustrative stock"), "Unknown owner media is not called stock")
props.photos = [{ url: "https://fixture.invalid/legacy-stock.jpg", isStock: true, alt: "Our staff", caption: "Actual client job" }]
const legacyStock = render()
assert.ok(legacyStock.includes('alt="Illustrative stock photo"'))
assert.ok(legacyStock.includes("Illustrative stock"))
assert.ok(!legacyStock.includes("Illustrative stock; not the company"))
assert.doesNotMatch(legacyStock, /Fixture Company|Our staff|Actual client job|Photo:|Pexels License|<a\b/)
click("View photo 1")
const legacyOpen = render()
assert.equal((legacyOpen.match(/alt="Illustrative stock photo"/g) ?? []).length, 2, "Unknown stock is honest in grid and lightbox")
assert.ok(legacyOpen.includes("Illustrative stock; not the company"))
assert.doesNotMatch(legacyOpen, /Fixture Company|Photo:|Pexels License|<a\b/)
click("Close")
props.photos = []
assert.ok(!render().includes("<img"), "Empty input never pulls library inventory")
for (const cleanup of cleanups) cleanup()
console.log("Stock library/lightbox tests passed: pinned provenance, spoof rejection, explicit approvals, lean stock labels, full lightbox credits, honest alt, responsive sources, legacy inputs and navigation.")
