import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import vm from "node:vm"
import ts from "typescript"

const cache = new Map()
function load(file) {
  const absolute = path.resolve(file.endsWith(".ts") ? file : `${file}.ts`)
  if (cache.has(absolute)) return cache.get(absolute).exports
  const module = { exports: {} }
  cache.set(absolute, module)
  const output = ts.transpileModule(fs.readFileSync(absolute, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const require = id => {
    if (id.startsWith("@/")) return load(`src/${id.slice(2)}`)
    if (id.startsWith(".")) return load(path.resolve(path.dirname(absolute), id))
    throw Error(`Unexpected dependency ${id}`)
  }
  vm.runInNewContext(output, { module, exports: module.exports, require, URL, Error }, { filename: absolute })
  return module.exports
}
const manifest = load("src/lib/stockPhotoLibrary")
const rules = load("src/lib/stockPhotoPlacement")
const publication = load("src/lib/stockPhotoPublication")
const placement = load("src/lib/photoPlacement")
let tables, writes, readError = false
const company = { id: "owner-company", slug: "fixture" }
const original = { ...manifest.STOCK_PHOTO_LIBRARY[0], id: "fixture:recognition-only", availableInLibrary: false, enforcePlacementApproval: false,
  urls: ["https://fixture.test/legacy.jpg"], fullViewUrl: "https://fixture.test/legacy.jpg" }
const stock = { ...original, id: "fixture:active", availableInLibrary: true, enforcePlacementApproval: true, approvedSections: ["services"], includeInGallery: false,
  urls: ["https://fixture.test/shared/security.jpg"], fullViewUrl: "https://fixture.test/shared/security.jpg" }
manifest.STOCK_PHOTO_LIBRARY.push(original, stock)
function reset() {
  writes = []
  readError = false
  tables = {
    company_photos: [{ id: "photo", company_id: company.id, url: stock.fullViewUrl, storage_path: "shared/security.jpg", website_section: null, for_website: false, in_gallery: false, album_id: null }],
    photo_albums: [{ id: "public", company_id: company.id, show_on_website_gallery: true }, { id: "private", company_id: company.id, show_on_website_gallery: false }],
    website_config: [], media: [],
  }
}
function query(table) {
  const filters = []
  let one = false, mutation, payload
  const q = new Proxy({}, { get(_, key) {
    if (key === "then") return resolve => {
      if (readError && !mutation) return resolve({ data: null, error: { message: "fixture read failure" } })
      let rows = tables[table].filter(row => filters.every(test => test(row)))
      if (mutation) {
        writes.push({ table, mutation, payload })
        if (mutation === "update") for (const row of rows) Object.assign(row, payload)
        if (mutation === "insert") { rows = [{ id: "new", ...payload }]; tables[table].push(...rows) }
      }
      resolve({ data: one ? rows[0] ?? null : rows, error: null })
    }
    if (key === "eq") return (field, value) => { filters.push(row => row[field] === value); return q }
    if (key === "in") return (field, values) => { filters.push(row => values.includes(row[field])); return q }
    if (key === "select") return () => q
    if (key === "single") return () => { one = true; return q }
    if (key === "insert" || key === "update") return value => { mutation = key; payload = value; return q }
    throw Error(`Unexpected ${String(key)}`)
  } })
  return q
}
const admin = { from: query }
const globals = {
  ...rules, ...publication, ...placement,
  getContext: async () => ({ company, admin }),
  resolveDashboardIdentity: async () => ({ userId: "owner", userEmail: "owner@example.test" }),
  getCompany: async () => company, requireOwnerAccess: async () => true, createAdminClient: () => admin,
  NextResponse: { json: (body, options) => ({ ...body, status: options?.status ?? 200 }) },
  recordCustomerActivity: async () => {}, revalidatePath() {},
  mediaKindFromUrl: () => "photo", photoPayload: photo => photo,
  polishWebsiteField: (_field, value) => value,
}
function action(file, name, extra = {}) {
  const source = fs.readFileSync(file, "utf8")
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name)
  assert.ok(declaration)
  const output = ts.transpileModule(declaration.getText(ast), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const module = { exports: {} }
  vm.runInNewContext(output, { module, exports: module.exports, Error, ...globals, ...extra })
  return module.exports[name]
}
const toggle = action("src/app/dashboard/(app)/site/actions.ts", "toggleGalleryPhoto")
const updateSiteField = action("src/app/dashboard/(app)/site/actions.ts", "updateSiteField")
const assign = action("src/app/dashboard/(app)/site/actions.ts", "assignPhotoToSection", {
  isSitePhotoSlot: () => true, toggleGalleryPhoto: toggle,
})
const place = action("src/app/dashboard/(app)/photos/placementActions.ts", "placePhoto", { assignPhotoToSection: assign, toggleGalleryPhoto: toggle })
const patch = action("src/app/dashboard/api/photos/route.ts", "PATCH")
const albumPatch = action("src/app/dashboard/api/albums/route.ts", "PATCH")
const post = action("src/app/dashboard/api/photos/route.ts", "POST")
const request = body => ({ json: async () => body, headers: { get: () => "application/json" } })
let checks = 0
async function check(label, run) { reset(); await run(); checks++; console.log(`PASS ${label}`) }
try {
  await check("active stock obeys section approval and independent gallery approval", () => {
    for (const section of ["hero", "about", "cta", "gallery_hero", "contact", "book", "estimate", "menu", "announcement", "shop", "order"]) assert.equal(rules.canPlaceStockPhoto(stock.fullViewUrl, section), false)
    assert.equal(rules.canPlaceStockPhoto(stock.fullViewUrl, "services"), true)
    assert.equal(rules.canPlaceStockPhoto(`${stock.fullViewUrl}?w=200`, "hero"), false)
    assert.equal(rules.canPlaceStockPhoto(stock.fullViewUrl, "gallery"), false)
    stock.includeInGallery = true
    assert.equal(rules.canPlaceStockPhoto(stock.fullViewUrl, "gallery"), true)
    assert.equal(rules.canPlaceStockPhoto(stock.fullViewUrl, "gallery_hero"), false)
    stock.includeInGallery = false
  })
  await check("recognition-only fixtures and owner uploads stay unchanged", () => {
    for (const section of ["hero", "gallery", "services"]) assert.equal(rules.canPlaceStockPhoto(original.fullViewUrl, section), true)
    assert.equal(rules.canPlaceStockPhoto("https://fixture.test/owner.jpg", "hero"), true)
  })
  await check("withdrawn stock keeps section and gallery restrictions", async () => {
    stock.availableInLibrary = false
    try {
      assert.equal(rules.canPlaceStockPhoto(stock.fullViewUrl, "services"), true)
      assert.equal(rules.canPlaceStockPhoto(stock.fullViewUrl, "hero"), false)
      assert.equal(rules.canPlaceStockPhoto(stock.fullViewUrl, "gallery"), false)
      await assert.rejects(placement.assignIndependentPhoto(admin, company.id, "photo", "hero"), /not approved/)
      assert.match((await toggle("photo", true)).error, /not approved/)
      assert.equal((await patch(request({ id: "photo", website_section: "hero" }))).status, 403)
      assert.match((await updateSiteField("hero_images", [stock.fullViewUrl])).error, /not approved/)
      assert.equal(writes.length, 0)
    } finally { stock.availableInLibrary = true }
  })
  await check("legacy image field updates cannot bypass header or gallery approvals", async () => {
    for (const field of ["hero_image_url", "hero_video_url", "hero_images", "stock_images"]) {
      for (const value of [stock.fullViewUrl, ["https://fixture.test/owner.jpg", stock.fullViewUrl], [[stock.fullViewUrl]]]) {
        assert.match((await updateSiteField(field, value)).error, /not approved/)
        assert.equal(writes.length, 0)
      }
    }
    stock.includeInGallery = true
    try {
      assert.equal((await updateSiteField("stock_images", [stock.fullViewUrl])).success, true)
      assert.match((await updateSiteField("hero_images", [stock.fullViewUrl])).error, /not approved/)
    } finally { stock.includeInGallery = false }
  })
  await check("legacy image fields still permit clearing and recognition-only owners' choices", async () => {
    for (const field of ["hero_image_url", "hero_video_url", "hero_images", "stock_images"]) {
      for (const value of [null, "", [], original.fullViewUrl, [original.fullViewUrl], "https://fixture.test/owner.jpg"]) {
        assert.equal((await updateSiteField(field, value)).success, true)
      }
    }
    assert.equal((await updateSiteField("hero_title", "Owner's existing headline")).success, true)
  })
  await check("central placement rejects before occupant or photo writes", async () => {
    await assert.rejects(placement.assignIndependentPhoto(admin, company.id, "photo", "hero"), /not approved/)
    assert.equal(writes.length, 0)
    await placement.assignIndependentPhoto(admin, company.id, "photo", "services")
    assert.equal(tables.company_photos[0].website_section, "services")
  })
  await check("detail-only stock is allowed in Gallery but never a header", async () => {
    stock.approvedSections = []; stock.includeInGallery = true
    try {
      assert.ok((await place("photo", "hero")).error)
      assert.equal(writes.length, 0)
      assert.equal((await place("photo", "gallery")).success, true)
      assert.equal(tables.company_photos[0].in_gallery, true)
    } finally { stock.approvedSections = ["services"]; stock.includeInGallery = false }
  })
  await check("Site and Photos gallery actions reject forbidden gallery use", async () => {
    assert.match((await toggle("photo", true)).error, /not approved/)
    assert.match((await place("photo", "gallery")).error, /not approved/)
    assert.equal(writes.length, 0)
    assert.equal((await toggle("photo", false)).success, true)
  })
  await check("direct PATCH cannot bypass section or legacy gallery checks", async () => {
    for (const body of [{ website_section: "hero" }, { for_website: true }, { website_section: "gallery" }]) {
      const response = await patch(request({ id: "photo", ...body }))
      assert.equal(response.status, 403)
      assert.match(response.error, /not approved/)
      assert.equal(writes.length, 0)
    }
    assert.equal((await patch(request({ id: "photo", website_section: "services", for_website: true }))).status, 200)
  })
  await check("direct PATCH allows removal and unrelated metadata updates", async () => {
    Object.assign(tables.company_photos[0], { website_section: "hero", for_website: true })
    assert.equal((await patch(request({ id: "photo", website_section: null, for_website: false }))).status, 200)
    assert.equal((await patch(request({ id: "photo", note: "Owner note", for_social: false }))).status, 200)
  })
  await check("moving to published albums validates Gallery approval", async () => {
    assert.equal((await patch(request({ id: "photo", album_id: "public" }))).status, 403)
    assert.equal(writes.length, 0)
    assert.equal((await patch(request({ id: "photo", album_id: "private" }))).status, 200)
    assert.equal((await patch(request({ id: "photo", album_id: null }))).status, 200)
  })
  await check("publishing an album cannot bypass its existing stock restrictions", async () => {
    tables.company_photos[0].album_id = "private"
    assert.equal((await albumPatch(request({ id: "private", show_on_website_gallery: true }))).status, 403)
    assert.equal(writes.length, 0)
    assert.equal((await albumPatch(request({ id: "private", show_on_website_gallery: false }))).status, 200)
  })
  await check("signed-upload completion cannot add restricted stock to a public album", async () => {
    const response = await post(request({ storage_path: "shared/security.jpg", url: stock.fullViewUrl, album_id: "public" }))
    assert.equal(response.status, 403)
    assert.equal(writes.length, 0)
  })
  await check("unknown photo/album reads fail closed without writes", async () => {
    assert.equal((await patch(request({ id: "other-company-photo", website_section: "services" }))).status, 500)
    readError = true
    assert.equal((await patch(request({ id: "photo", for_website: true }))).status, 500)
    assert.equal((await albumPatch(request({ id: "private", show_on_website_gallery: true }))).status, 500)
    assert.equal(writes.length, 0)
  })
} finally { manifest.STOCK_PHOTO_LIBRARY.pop(); manifest.STOCK_PHOTO_LIBRARY.pop() }
console.log(`${checks} stock placement/publication scenarios passed; no network or live persistence.`)
