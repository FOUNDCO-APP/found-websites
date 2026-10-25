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
let identity = { userId: "owner", userEmail: "owner@example.test" }
let owner = true
const company = { id: "11111111-1111-4111-8111-111111111111", industry_category: "professional_services", sub_industry: "Security Guard Services" }
const base = "https://mmctzloztgkbqvofmkou.supabase.co/storage/v1/object/public/company-assets/"
const rows = []
let writes = 0
let removes = 0
let readFailure = false
const admin = {
  storage: { from(bucket) {
    assert.equal(bucket, "company-assets")
    return { getPublicUrl: key => ({ data: { publicUrl: base + key } }), remove() { removes++; throw Error("Shared bytes must not be removed") } }
  } },
  from(table) {
    assert.ok(["company_photos", "media", "companies", "website_config", "photo_albums"].includes(table))
    let filters = [], deleting = false
    const query = {
      upsert(row, options) {
        assert.equal(table, "company_photos")
        assert.equal(options.onConflict, "id")
        assert.equal(options.ignoreDuplicates, true)
        writes++
        if (!rows.some(item => item.id === row.id)) rows.push({ ...row, album_id: null })
        return Promise.resolve({ error: null })
      },
      select() { return query },
      eq(key, value) { filters.push(row => row[key] === value); return query },
      neq(key, value) { filters.push(row => row[key] !== value); return query },
      is(key, value) { filters.push(row => row[key] == null && value === null); return query },
      in(key, values) { filters.push(row => values.includes(row[key])); return query },
      delete() { deleting = true; return query },
      result() {
        if (readFailure) return { error: { code: "test", message: "read failed" }, data: null }
        const selected = table === "company_photos" ? rows.filter(row => filters.every(filter => filter(row))) : []
        if (deleting) for (const row of selected) rows.splice(rows.indexOf(row), 1)
        return { data: selected, error: null }
      },
      single() { const result = query.result(); return Promise.resolve({ ...result, data: result.data?.[0] ?? null }) },
      then(resolve, reject) { return Promise.resolve(query.result()).then(resolve, reject) },
    }
    return query
  },
}
let uiStates = null, effects = [], stateIndex = 0, callbackPhoto = null
function load(file) {
  const absolute = path.resolve(file)
  if (cache.has(absolute)) return cache.get(absolute)
  const module = { exports: {} }
  const source = ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
    fileName: absolute, compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
  }).outputText
  function localRequire(id) {
    if (id === "@/lib/auth/getAuthUser") return { resolveDashboardIdentity: async () => identity }
    if (id === "@/lib/dashboard/getCompany") return {
      getCompany: async (userId, email) => { assert.equal(userId, identity.userId); assert.equal(email, identity.userEmail); return company },
      requireOwnerAccess: async () => owner,
    }
    if (id === "@/lib/supabase/admin") return { createAdminClient: () => admin }
    if (id === "next/cache") return { revalidatePath: url => assert.ok(["/dashboard/site", "/dashboard/photos"].includes(url)) }
    if (id === "react") return { ...React,
      useState: initial => { const index = stateIndex++; if (!(index in uiStates)) uiStates[index] = initial; return [uiStates[index], value => { uiStates[index] = typeof value === "function" ? value(uiStates[index]) : value }] },
      useEffect: effect => { effects.push(effect) }, useRef: initial => ({ current: initial }),
    }
    if (id.startsWith("@/")) return load(`src/${id.slice(2)}.ts`)
    if (id.startsWith(".")) return load(path.resolve(path.dirname(absolute), `${id}.ts`))
    return require(id)
  }
  vm.runInNewContext(source, { module, exports: module.exports, require: localRequire, URL, console, Buffer, Error }, { filename: absolute })
  cache.set(absolute, module.exports)
  return module.exports
}

const manifest = load("src/lib/stockPhotoLibrary.ts")
const helper = load("src/lib/ownerStockLibrary.ts")
const actions = load("src/app/dashboard/(app)/site/libraryActions.ts")
const { deletePhotoPlacement } = load("src/lib/deletePhotoPlacement.ts")
assert.equal((await actions.getOwnerStockLibrary()).photos.length, 12, "Only the approved collection is offered")
assert.equal(rows.length, 0, "Offering inventory never imports or places a photo")
const fixture = { ...manifest.STOCK_PHOTO_LIBRARY[0], id: "fixture:approved", availableInLibrary: true, enforcePlacementApproval: true,
  fullViewUrl: base + "stock-library/security/approved-hash.jpg", urls: [base + "stock-library/security/approved-hash.jpg"] }
manifest.STOCK_PHOTO_LIBRARY.push(fixture)
try {
  identity = null
  assert.match((await actions.importStockLibraryPhoto(fixture.id)).error, /Owner/)
  assert.equal((await actions.getOwnerStockLibrary()).photos.length, 0)
  identity = { userId: "worker", userEmail: "worker@example.test" }; owner = false
  assert.match((await actions.importStockLibraryPhoto(fixture.id)).error, /Owner/)
  identity = { userId: "verified-admin-view", userEmail: "admin@example.test" }; owner = true
  assert.equal((await actions.getOwnerStockLibrary()).photos.at(-1).id, fixture.id, "Existing admin view context supported")
  for (const id of [fixture.fullViewUrl, "pexels:unknown", "pexels:4923382", null, {}]) {
    assert.ok((await actions.importStockLibraryPhoto(id)).error)
  }
  company.sub_industry = "Accountant"
  assert.ok((await actions.importStockLibraryPhoto(fixture.id)).error)
  company.sub_industry = "Security Guard Services"; company.industry_category = "home_services"
  assert.ok((await actions.importStockLibraryPhoto(fixture.id)).error)
  company.industry_category = "professional_services"
  assert.equal(writes, 0, "Rejected inputs never write")
  for (const flag of [undefined, false]) {
    fixture.enforcePlacementApproval = flag
    assert.match((await actions.importStockLibraryPhoto(fixture.id)).error, /placement approvals/)
    assert.equal(writes, 0, "Available stock cannot import without durable placement enforcement")
  }
  fixture.enforcePlacementApproval = true
  for (const url of [base + company.id + "/photo.jpg", base + "626dc220-4152-4711-8862-a885534e1e0a/photo.jpg", "https://evil.test/photo.jpg", "https://images.pexels.com/photo.jpg", base + "shared/%2e%2e%2fother.jpg", base + "shared/photo.jpg?x=1"]) {
    assert.throws(() => helper.sharedStockAsset(admin, { ...fixture, fullViewUrl: url, urls: [url] }))
  }
  const first = await actions.importStockLibraryPhoto(fixture.id)
  assert.ok(first.photo)
  for (const flag of ["for_website", "for_social", "in_gallery"]) assert.equal(first.photo[flag], false)
  assert.equal(first.photo.website_section, null)
  assert.equal(first.photo.storage_path, "stock-library/security/approved-hash.jpg")
  assert.match(first.photo.id, /^[a-f0-9]{8}-[a-f0-9]{4}-8[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/)
  Object.assign(rows[0], { website_section: "about", for_website: true, in_gallery: true, for_social: true })
  const repeated = await actions.importStockLibraryPhoto(fixture.id)
  assert.equal(repeated.photo.website_section, "about")
  for (const flag of ["for_website", "for_social", "in_gallery"]) assert.equal(repeated.photo[flag], true)
  await Promise.all(Array.from({ length: 8 }, () => actions.importStockLibraryPhoto(fixture.id)))
  assert.equal(rows.length, 1, "Concurrent repeat imports retain one row")
  assert.equal(rows[0].website_section, "about")
  fixture.availableInLibrary = false
  assert.equal((await helper.getImportedStockPhotos(admin, company.id)).length, 1, "Owner keeps access if offering withdrawn")
  assert.ok((await actions.importStockLibraryPhoto(fixture.id)).error)
  fixture.availableInLibrary = true
  const originalCompany = company.id
  company.id = "22222222-2222-4222-8222-222222222222"
  const second = await actions.importStockLibraryPhoto(fixture.id)
  assert.notEqual(second.photo.id, first.photo.id)
  assert.equal(second.photo.website_section, null)
  assert.equal((await helper.getImportedStockPhotos(admin, company.id)).length, 1)
  await assert.rejects(deletePhotoPlacement(admin, originalCompany, first.photo.id), /still used/)
  Object.assign(rows[0], { website_section: null, for_website: false, in_gallery: false })
  assert.equal((await deletePhotoPlacement(admin, originalCompany, first.photo.id)).storageRetained, true)
  assert.equal(rows.length, 1, "Other company import survives")
  assert.equal((await deletePhotoPlacement(admin, company.id, second.photo.id)).storageRetained, true, "Last import still never deletes shared original")
  assert.equal(removes, 0)
  readFailure = true
  assert.equal((await helper.getImportedStockPhotos(admin, company.id)).length, 0)
  assert.ok((await actions.importStockLibraryPhoto(fixture.id)).error)
  readFailure = false

  const Picker = load("src/components/dashboard/StockPhotoLibraryPicker.tsx").default
  function render(states, destination) { uiStates = states; stateIndex = 0; effects = []; return Picker({ destination, onAdded: photo => { callbackPhoto = photo } }) }
  const empty = render([[], true, false, null, [], ""])
  const emptyHtml = renderToStaticMarkup(empty)
  assert.match(emptyHtml, /No stock photos available yet/)
  const tree = render([[fixture], true, false, null, [], ""])
  const html = renderToStaticMarkup(tree)
  assert.match(html, /Illustrative stock/)
  assert.match(html, /Pexels License/)
  assert.match(html, /text-white/)
  assert.match(html, /grid-cols-2/)
  const buttons = []
  function visit(node) { if (!node || typeof node !== "object") return; if (node.type === "button") buttons.push(node); for (const child of [node.props?.children].flat(Infinity)) visit(child) }
  visit(tree)
  assert.equal(buttons.length, 1)
  await buttons[0].props.onClick()
  assert.ok(callbackPhoto)
  assert.equal(callbackPhoto.website_section, null)
  assert.equal(callbackPhoto.in_gallery, false)
  assert.equal(callbackPhoto.for_website, false)
  assert.equal(callbackPhoto.for_social, false)
  const unsupported = renderToStaticMarkup(render([[fixture], true, false, null, [], ""], "services"))
  assert.doesNotMatch(unsupported, /Add to library/)
  assert.match(unsupported, /No stock photos available yet/)
  const supported = renderToStaticMarkup(render([[fixture], true, false, null, [], ""], "hero"))
  assert.match(supported, /Add to library/)
  assert.equal(render([[], false, false, null, [], ""]), null)
} finally { manifest.STOCK_PHOTO_LIBRARY.pop() }
console.log("PASS owner stock library: authorization, approved inventory, shared storage, independent imports, concurrency, deletion safety, picker")
